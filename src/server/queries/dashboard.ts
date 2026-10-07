import "server-only";
import type { Pool } from "pg";
import type { Actor } from "@/server/auth/guards";
import { DomainError } from "@/domain/errors";
import { systemClock, type Clock } from "@/domain/calendar";
import { attendanceTotals, type AttendanceStatus } from "@/domain/attendance";
import { dashboardInputSchema, parseInput } from "@/contracts/attendance";
import { pool, transaction } from "@/server/db/pool";
import { calendarDay, schoolContext, type ClassYear } from "@/server/services/attendance/context";
import { roster, session, sessionMetadata } from "./attendance";
export async function getDashboard(
  actor: Actor,
  selectedDate?: string,
  source: Pool = pool,
  clock: Clock = systemClock,
) {
  parseInput(dashboardInputSchema, { date: selectedDate });
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const context = await schoolContext(client, clock);
    const date = selectedDate ?? context.schoolToday;
    const year = (
      await client.query<{
        id: string;
        label: string;
        starts_on: string;
        ends_on_exclusive: string;
        is_current: boolean;
      }>(
        "SELECT id,label,starts_on::text,ends_on_exclusive::text,is_current FROM academic_years WHERE starts_on <= $1 AND ends_on_exclusive > $1",
        [date],
      )
    ).rows[0];
    if (!year) throw new DomainError("OUTSIDE_ACADEMIC_YEAR", "Tanggal di luar tahun ajaran.", 422);
    const day = await calendarDay(
      client,
      { ...year, name: "", academic_year_id: year.id } as ClassYear,
      date,
    );
    const rows = (
      await client.query<{ id: string; name: string; grade: number; isPrimary: boolean }>(
        `SELECT c.id,c.name,c.grade,EXISTS(SELECT 1 FROM teacher_classes tc WHERE tc.class_id=c.id AND tc.teacher_id=$2) "isPrimary" FROM classes c WHERE academic_year_id=$1 ORDER BY "isPrimary" DESC,c.grade,c.name,c.id`,
        [year.id, actor.teacherId],
      )
    ).rows;
    const classes = [];
    for (const row of rows) {
      const students = await roster(client, row.id, date);
      const current = await session(client, row.id, date);
      const state = !day.isSchoolDay
        ? "holiday"
        : !students.length
          ? "empty"
          : current?.state === "submitted"
            ? "submitted"
            : "not_recorded";
      const totals =
        state === "submitted"
          ? attendanceTotals(
              students.filter(
                (s): s is typeof s & { status: AttendanceStatus } => s.status !== null,
              ),
            )
          : null;
      classes.push({
        classId: row.id,
        name: row.name,
        grade: row.grade,
        isPrimary: row.isPrimary,
        studentCount: students.length,
        state,
        ...sessionMetadata(current),
        totals,
        presentCount: totals?.H ?? null,
      });
    }
    return {
      date,
      ...context,
      academicYearId: year.id,
      academicYearLabel: year.label,
      isSchoolDay: day.isSchoolDay,
      calendarReason: day.reason,
      setupReady: day.ready,
      classes,
    };
  }, source);
}
