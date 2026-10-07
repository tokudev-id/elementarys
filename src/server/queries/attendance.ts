import "server-only";
import type { Pool, PoolClient } from "pg";
import type { AttendanceStatus } from "@/domain/attendance";
import type { AttendanceView } from "@/contracts/attendance-view";
import { attendanceTotals } from "@/domain/attendance";
import { systemClock, type Clock } from "@/domain/calendar";
import { parseInput, attendanceQuerySchema } from "@/contracts/attendance";
import { pool, transaction } from "@/server/db/pool";
import { calendarDay, classYear, schoolContext } from "@/server/services/attendance/context";
export type RosterStudent = {
  enrollmentId: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  status: AttendanceStatus | null;
};
export async function roster(
  client: PoolClient,
  classId: string,
  date: string,
): Promise<RosterStudent[]> {
  return (
    await client.query<RosterStudent>(
      `SELECT e.id "enrollmentId",s.id "studentId",s.student_code "studentCode",s.full_name "fullName",r.status
    FROM enrollments e JOIN students s ON s.id=e.student_id
    LEFT JOIN attendance_sessions a ON a.class_id=e.class_id AND a.date=$2 AND a.state='submitted'
    LEFT JOIN attendance_records r ON r.session_id=a.id AND r.enrollment_id=e.id
    WHERE e.class_id=$1 AND e.starts_on <= $2 AND e.ends_on_exclusive > $2 ORDER BY s.full_name,s.student_code,e.id`,
      [classId, date],
    )
  ).rows;
}
export type Session = {
  id: string;
  state: "submitted" | "voided";
  version: number;
  submitted_by: string;
  submitted_name: string;
  submitted_at: Date;
};
export async function session(client: PoolClient, classId: string, date: string, lock = false) {
  return (
    await client.query<Session>(
      `SELECT a.*,u.name submitted_name FROM attendance_sessions a JOIN "user" u ON u.id=a.submitted_by WHERE a.class_id=$1 AND a.date=$2 ${lock ? "FOR UPDATE OF a" : ""}`,
      [classId, date],
    )
  ).rows[0];
}
export function sessionMetadata(
  value: Session | undefined,
): Pick<AttendanceView, "sessionState" | "sessionVersion" | "submittedBy" | "submittedAt"> {
  return {
    sessionState: value?.state ?? "not_recorded",
    sessionVersion: value?.version ?? null,
    submittedBy: value ? { id: value.submitted_by, name: value.submitted_name } : null,
    submittedAt: value?.submitted_at.toISOString() ?? null,
  };
}
export async function getAttendance(
  classId: string,
  selectedDate: string | undefined,
  source: Pool = pool,
  clock: Clock = systemClock,
): Promise<AttendanceView> {
  parseInput(attendanceQuerySchema, { classId, date: selectedDate });
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const context = await schoolContext(client, clock);
    const date = selectedDate ?? context.schoolToday;
    const year = await classYear(client, classId);
    const day = await calendarDay(client, year, date);
    const current = await session(client, classId, date);
    const students = await roster(client, classId, date);
    return {
      classId,
      className: year.name,
      academicYearId: year.academic_year_id,
      isCurrentYear: year.is_current,
      date,
      ...context,
      isSchoolDay: day.isSchoolDay,
      calendarReason: day.reason,
      setupReady: day.ready,
      inAcademicYear: day.inYear,
      ...sessionMetadata(current),
      students,
      totals:
        current?.state === "submitted"
          ? attendanceTotals(
              students.filter(
                (s): s is RosterStudent & { status: AttendanceStatus } => s.status !== null,
              ),
            )
          : null,
    };
  }, source);
}
