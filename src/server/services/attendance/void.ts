import "server-only";
import type { Pool } from "pg";
import type { Actor } from "@/server/auth/guards";
import { attendancePathSchema, parseInput } from "@/contracts/attendance";
import { voidAttendanceSchema, type AttendanceHistory } from "@/contracts/attendance-history";
import type { MutationResult } from "@/contracts/mutations";
import { DomainError } from "@/domain/errors";
import { systemClock, type Clock } from "@/domain/calendar";
import { audit, pool } from "@/server/db/pool";
import { assertAdmin, assertVersion, mutationTransaction } from "@/server/mutations";
import { session } from "@/server/queries/attendance";
import { classYear, schoolContext } from "./context";

export async function voidAttendance(
  classId: string,
  date: string,
  input: unknown,
  actor: Actor,
  requestId: string,
  options: { source?: Pool; clock?: Clock } = {},
): Promise<MutationResult> {
  assertAdmin(actor);
  parseInput(attendancePathSchema, { classId, date });
  const data = parseInput(voidAttendanceSchema, input);
  return mutationTransaction(async (client) => {
    const context = await schoolContext(client, options.clock ?? systemClock);
    const year = await classYear(client, classId, true);
    if (date < year.starts_on || date >= year.ends_on_exclusive)
      throw new DomainError("OUTSIDE_ACADEMIC_YEAR", "Tanggal di luar tahun ajaran kelas.", 422);
    if (date > context.schoolToday)
      throw new DomainError("FUTURE_DATE", "Tanggal mendatang belum dapat dibatalkan.", 422);
    const current = await session(client, classId, date, true);
    if (!current)
      throw new DomainError("RESOURCE_NOT_FOUND", "Belum ada catatan untuk dibatalkan.", 404);
    assertVersion(current.version, data.expectedVersion);
    if (current.state !== "submitted")
      throw new DomainError(
        "VERSION_CONFLICT",
        "Catatan sudah dibatalkan. Muat data terbaru.",
        409,
      );
    const before = (
      await client.query<AttendanceHistory["events"][number]["before"]["entries"][number]>(
        'SELECT enrollment_id "enrollmentId",student_id "studentId",status FROM attendance_records WHERE session_id=$1 ORDER BY enrollment_id',
        [current.id],
      )
    ).rows;
    const version = current.version + 1;
    await audit(
      client,
      actor.id,
      "attendance.void",
      "attendance_session",
      current.id,
      requestId,
      {
        actorId: actor.id,
        actorName: actor.name,
        classId,
        date,
        before: { state: current.state, version: current.version, entries: before },
        after: { state: "voided", version, entries: [] },
      },
      data.reason,
    );
    await client.query("DELETE FROM attendance_records WHERE session_id=$1", [current.id]);
    await client.query(
      "UPDATE attendance_sessions SET state='voided',version=$2,void_reason=$3 WHERE id=$1",
      [current.id, version, data.reason],
    );
    return { saved: true as const, id: current.id, version };
  }, options.source ?? pool);
}
