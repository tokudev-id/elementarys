import "server-only";
import type { Pool, PoolClient } from "pg";
import type { Actor } from "@/server/auth/guards";
import { DomainError } from "@/domain/errors";
import { attendanceTotals, type AttendanceStatus } from "@/domain/attendance";
import { systemClock, type Clock } from "@/domain/calendar";
import {
  attendanceInputSchema,
  attendancePathSchema,
  parseInput,
  type AttendanceInput,
} from "@/contracts/attendance";
import { audit, pool, transaction } from "@/server/db/pool";
import { roster, session, sessionMetadata } from "@/server/queries/attendance";
import { calendarDay, classYear, schoolContext } from "./context";
export type SaveOptions = {
  source?: Pool;
  clock?: Clock;
  afterRecords?: (client: PoolClient) => Promise<void>;
};
export async function saveAttendance(
  classId: string,
  date: string,
  input: AttendanceInput,
  actor: Actor,
  requestId: string,
  options: SaveOptions = {},
) {
  parseInput(attendancePathSchema, { classId, date });
  const data = parseInput(attendanceInputSchema, input);
  const execute = () =>
    transaction(async (client) => {
      const context = await schoolContext(client, options.clock ?? systemClock);
      const year = await classYear(client, classId, true);
      const current = await session(client, classId, date, true);
      const day = await calendarDay(client, year, date);
      if (!day.inYear)
        throw new DomainError("OUTSIDE_ACADEMIC_YEAR", "Tanggal di luar tahun ajaran kelas.", 422);
      if (!year.is_current && actor.role !== "admin")
        throw new DomainError("ACCESS_DENIED", "Tahun ajaran lama hanya dapat dicatat admin.", 403);
      if (!year.is_current && !data.reason)
        throw new DomainError("INVALID_INPUT", "Alasan wajib untuk tahun ajaran lama.", 400, {
          reason: ["Isi alasan."],
        });
      if (!day.ready)
        throw new DomainError("SETUP_INCOMPLETE", "Lengkapi hari belajar sekolah.", 422);
      if (!day.isSchoolDay)
        throw new DomainError("HOLIDAY", "Tanggal ini bukan hari belajar.", 422);
      if (date > context.schoolToday)
        throw new DomainError("FUTURE_DATE", "Tanggal mendatang belum dapat dicatat.", 422);
      const students = await roster(client, classId, date);
      if (!students.length)
        throw new DomainError("EMPTY_ROSTER", "Kelas belum memiliki siswa pada tanggal ini.", 422);
      const incoming = new Map(data.entries.map((e) => [e.enrollmentId, e.status]));
      if (incoming.size !== students.length || students.some((s) => !incoming.has(s.enrollmentId)))
        throw new DomainError(
          "ROSTER_CHANGED",
          "Daftar siswa berubah. Muat ulang sebelum menyimpan.",
          409,
        );
      const totals = attendanceTotals(data.entries);
      if (
        current?.state === "submitted" &&
        students.every((s) => s.status === incoming.get(s.enrollmentId))
      )
        return { ...sessionMetadata(current), totals, changed: false };
      if ((current?.version ?? null) !== data.expectedVersion)
        throw new DomainError(
          "VERSION_CONFLICT",
          "Catatan berubah. Muat ulang sebelum menyimpan.",
          409,
        );
      if (current && !data.reason)
        throw new DomainError("INVALID_INPUT", "Alasan wajib untuk koreksi.", 400, {
          reason: ["Isi alasan."],
        });
      const before = students.map((s) => ({
        enrollmentId: s.enrollmentId,
        studentId: s.studentId,
        status: s.status,
      }));
      const saved = (
        await client.query<{ id: string }>(
          `INSERT INTO attendance_sessions(class_id,date,state,version,submitted_by,submitted_at) VALUES($1,$2,'submitted',1,$3,$4)
      ON CONFLICT(class_id,date) DO UPDATE SET state='submitted',version=attendance_sessions.version+1,submitted_by=excluded.submitted_by,submitted_at=excluded.submitted_at,void_reason=NULL RETURNING id`,
          [classId, date, actor.id, (options.clock ?? systemClock)()],
        )
      ).rows[0];
      await client.query("DELETE FROM attendance_records WHERE session_id=$1", [saved.id]);
      const after = students.map((s) => ({
        enrollmentId: s.enrollmentId,
        studentId: s.studentId,
        status: incoming.get(s.enrollmentId)! as AttendanceStatus,
      }));
      await client.query(
        `INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status)
      SELECT $1,x."enrollmentId",x."studentId",$2,x.status FROM jsonb_to_recordset($3::jsonb) AS x("enrollmentId" uuid,"studentId" uuid,status text)`,
        [saved.id, date, JSON.stringify(after)],
      );
      await options.afterRecords?.(client);
      await audit(
        client,
        actor.id,
        current ? "attendance.correct" : "attendance.submit",
        "attendance_session",
        saved.id,
        requestId,
        {
          actorId: actor.id,
          actorName: actor.name,
          classId,
          date,
          before: {
            state: current?.state ?? "not_recorded",
            version: current?.version ?? null,
            entries: before,
          },
          after: { state: "submitted", version: (current?.version ?? 0) + 1, entries: after },
        },
        data.reason ?? null,
      );
      return { ...sessionMetadata(await session(client, classId, date)), totals, changed: true };
    }, options.source ?? pool);
  for (let attempt = 0; ; attempt++) {
    try {
      return await execute();
    } catch (error) {
      if (
        attempt >= 2 ||
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "40P01"
      )
        throw error;
    }
  }
}
