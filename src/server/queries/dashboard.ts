import "server-only";
import type { Pool, PoolClient } from "pg";
import type { Actor } from "@/server/auth/guards";
import { DomainError } from "@/domain/errors";
import { resolveSchoolDay, systemClock, type Clock } from "@/domain/calendar";
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
    const trend = await attendanceTrend(client, year, date);
    return {
      date,
      ...context,
      trend,
      academicYearId: year.id,
      academicYearLabel: year.label,
      isSchoolDay: day.isSchoolDay,
      calendarReason: day.reason,
      setupReady: day.ready,
      classes,
    };
  }, source);
}

const TREND_DAYS = 14;

function shiftDate(date: string, days: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// last school days up to `date` with submitted attendance totals, oldest first
async function attendanceTrend(
  client: PoolClient,
  year: { id: string; starts_on: string; ends_on_exclusive: string },
  date: string,
) {
  const lookback = shiftDate(date, -TREND_DAYS * 3);
  const from = lookback < year.starts_on ? year.starts_on : lookback;
  const weekdays = (
    await client.query<{ weekday: number }>(
      "SELECT weekday FROM school_weekdays WHERE academic_year_id=$1",
      [year.id],
    )
  ).rows.map((row) => row.weekday);
  const overrides = (
    await client.query<{ date: string; isSchoolDay: boolean; reason: string }>(
      'SELECT date::text,"is_school_day" AS "isSchoolDay",reason FROM school_day_overrides WHERE academic_year_id=$1 AND date >= $2 AND date <= $3',
      [year.id, from, date],
    )
  ).rows;
  const calendar = {
    startsOn: year.starts_on,
    endsOnExclusive: year.ends_on_exclusive,
    weekdays,
    overrides,
  };
  const days: string[] = [];
  for (let day = date; day >= from && days.length < TREND_DAYS; day = shiftDate(day, -1)) {
    if (resolveSchoolDay(day, calendar).isSchoolDay) days.unshift(day);
  }
  if (!days.length) return [];
  const counts = (
    await client.query<{ date: string; status: AttendanceStatus; count: number }>(
      `SELECT a.date::text date,r.status,count(*)::int count
      FROM attendance_sessions a
      JOIN attendance_records r ON r.session_id=a.id
      JOIN classes c ON c.id=a.class_id
      WHERE c.academic_year_id=$1 AND a.state='submitted' AND a.date >= $2 AND a.date <= $3
      GROUP BY 1,2`,
      [year.id, days[0], date],
    )
  ).rows;
  return days.map((day) => {
    const totals = { H: 0, S: 0, I: 0, A: 0 };
    for (const row of counts) if (row.date === day) totals[row.status] = row.count;
    const recorded = totals.H + totals.S + totals.I + totals.A;
    return {
      date: day,
      ...totals,
      rate: recorded ? Math.round((totals.H / recorded) * 1000) / 10 : null,
    };
  });
}
