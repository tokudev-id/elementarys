import "server-only";
import type { Pool } from "pg";
import { attendancePathSchema, parseInput } from "@/contracts/attendance";
import {
  attendanceHistoryEventSchema,
  attendanceHistorySchema,
  type AttendanceHistory,
} from "@/contracts/attendance-history";
import { systemClock, type Clock } from "@/domain/calendar";
import { pool, transaction } from "@/server/db/pool";
import { classYear, schoolContext } from "@/server/services/attendance/context";
import { session } from "./attendance";

export async function getAttendanceHistory(
  classId: string,
  date: string,
  source: Pool = pool,
  clock: Clock = systemClock,
): Promise<AttendanceHistory> {
  parseInput(attendancePathSchema, { classId, date });
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const context = await schoolContext(client, clock);
    const year = await classYear(client, classId);
    const current = await session(client, classId, date);
    const rows = current
      ? (
          await client.query<{
            id: string;
            action: string;
            actorId: string;
            actorName: string;
            occurredAt: Date;
            reason: string | null;
            changes: Record<string, unknown>;
          }>(
            `SELECT h.id,h.action,h.actor_id "actorId",COALESCE(h.changes_json->>'actorName',u.name) "actorName",h.occurred_at "occurredAt",h.reason,h.changes_json changes
      FROM audit_events h JOIN "user" u ON u.id=h.actor_id
      WHERE h.entity_type='attendance_session' AND h.entity_id=$1 AND h.action IN ('attendance.submit','attendance.correct','attendance.void')
      ORDER BY (h.changes_json->'after'->>'version')::int,h.occurred_at,h.id`,
            [current.id],
          )
        ).rows
      : [];
    const events = rows.map((row) =>
      attendanceHistoryEventSchema.parse({
        id: row.id,
        action: row.action,
        actor: { id: row.actorId, name: row.actorName },
        occurredAt: row.occurredAt.toISOString(),
        reason: row.reason,
        before: row.changes.before,
        after: row.changes.after,
      }),
    );
    const studentIds = [
      ...new Set(
        events.flatMap((event) => {
          return [...event.before.entries, ...event.after.entries].map((entry) => entry.studentId);
        }),
      ),
    ];
    const students = (
      await client.query<AttendanceHistory["students"][number]>(
        "SELECT id,full_name name,student_code code FROM students WHERE id=ANY($1::uuid[])",
        [studentIds],
      )
    ).rows;
    return attendanceHistorySchema.parse({
      classId,
      className: year.name,
      date,
      ...context,
      students,
      events,
    });
  }, source);
}
