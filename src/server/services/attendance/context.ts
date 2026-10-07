import "server-only";
import type { PoolClient } from "pg";
import { DomainError } from "@/domain/errors";
import {
  isTimezone,
  resolveSchoolDay,
  schoolToday,
  systemClock,
  type Clock,
} from "@/domain/calendar";
export async function schoolContext(client: PoolClient, clock: Clock = systemClock) {
  const config = (
    await client.query<{ name: string; timezone: string; configured_at: Date | null }>(
      "SELECT name,timezone,configured_at FROM school_config WHERE id=1",
    )
  ).rows[0];
  if (!config || !config.configured_at || !config.name.trim() || !isTimezone(config.timezone))
    throw new DomainError("SETUP_INCOMPLETE", "Lengkapi identitas dan kalender sekolah.", 422);
  return {
    schoolName: config.name,
    timezone: config.timezone,
    schoolToday: schoolToday(config.timezone, clock),
  };
}
export type ClassYear = {
  id: string;
  name: string;
  academic_year_id: string;
  starts_on: string;
  ends_on_exclusive: string;
  is_current: boolean;
};
export async function classYear(
  client: PoolClient,
  classId: string,
  lock = false,
): Promise<ClassYear> {
  const row = (
    await client.query<ClassYear>(
      "SELECT c.id,c.name,c.academic_year_id,y.starts_on::text,y.ends_on_exclusive::text,y.is_current FROM classes c JOIN academic_years y ON y.id=c.academic_year_id WHERE c.id=$1",
      [classId],
    )
  ).rows[0];
  if (!row) throw new DomainError("RESOURCE_NOT_FOUND", "Kelas tidak ditemukan.", 404);
  if (lock) {
    await client.query("SELECT id FROM academic_years WHERE id=$1 FOR SHARE", [
      row.academic_year_id,
    ]);
    await client.query("SELECT id FROM classes WHERE id=$1 FOR UPDATE", [classId]);
    return classYear(client, classId);
  }
  return row;
}
export async function calendarDay(client: PoolClient, year: ClassYear, date: string) {
  const weekdays = (
    await client.query<{ weekday: number }>(
      "SELECT weekday FROM school_weekdays WHERE academic_year_id=$1",
      [year.academic_year_id],
    )
  ).rows.map((r) => r.weekday);
  const overrides = (
    await client.query<{ date: string; isSchoolDay: boolean; reason: string }>(
      'SELECT date::text,"is_school_day" AS "isSchoolDay",reason FROM school_day_overrides WHERE academic_year_id=$1 AND date=$2',
      [year.academic_year_id, date],
    )
  ).rows;
  return {
    ...resolveSchoolDay(date, {
      startsOn: year.starts_on,
      endsOnExclusive: year.ends_on_exclusive,
      weekdays,
      overrides,
    }),
    ready: weekdays.length > 0,
  };
}
