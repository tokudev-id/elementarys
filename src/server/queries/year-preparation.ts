import "server-only";
import { z } from "zod";
import type { Pool } from "pg";
import { parseInput } from "@/contracts/attendance";
import type { AcademicYearView } from "@/contracts/school-master";
import { DomainError } from "@/domain/errors";
import { schoolToday, isTimezone, systemClock, type Clock } from "@/domain/calendar";
import { pool, transaction } from "@/server/db/pool";
export type YearPreparation = {
  year: AcademicYearView;
  currentYear: { id: string; label: string } | null;
  schoolToday: string;
  identityReady: boolean;
  weekdays: number;
  ready: boolean;
  classes: {
    id: string;
    name: string;
    assigned: number;
    openEnrollments: number;
    archivedAt: string | null;
  }[];
};
export async function getYearPreparation(
  id: string,
  source: Pool = pool,
  clock: Clock = systemClock,
): Promise<YearPreparation> {
  parseInput(z.uuid(), id);
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const config = (
      await client.query<{ name: string; timezone: string }>(
        "SELECT name,timezone FROM school_config WHERE id=1",
      )
    ).rows[0];
    const date = schoolToday(
      config && isTimezone(config.timezone) ? config.timezone : "Asia/Kuala_Lumpur",
      clock,
    );
    const year = (
      await client.query<AcademicYearView>(
        'SELECT id,label,starts_on::text "startsOn",ends_on_exclusive::text "endsOnExclusive",is_current "isCurrent",version,archived_at::text "archivedAt" FROM academic_years WHERE id=$1',
        [id],
      )
    ).rows[0];
    if (!year) throw new DomainError("RESOURCE_NOT_FOUND", "Tahun ajaran tidak ditemukan.", 404);
    const currentYear =
      (
        await client.query<{ id: string; label: string }>(
          "SELECT id,label FROM academic_years WHERE is_current",
        )
      ).rows[0] ?? null;
    const classes = (
      await client.query<YearPreparation["classes"][number]>(
        'SELECT c.id,c.name,c.archived_at::text "archivedAt",count(DISTINCT e.student_id)::int assigned,count(e.id) FILTER(WHERE e.ends_on_exclusive>$2)::int "openEnrollments" FROM classes c LEFT JOIN enrollments e ON e.class_id=c.id WHERE c.academic_year_id=$1 GROUP BY c.id ORDER BY c.grade,c.name,c.id',
        [id, date],
      )
    ).rows;
    const weekdays = (
      await client.query<{ n: number }>(
        "SELECT count(*)::int n FROM school_weekdays WHERE academic_year_id=$1",
        [id],
      )
    ).rows[0].n;
    const identityReady = Boolean(config?.name.trim() && isTimezone(config.timezone));
    return {
      year,
      currentYear,
      schoolToday: date,
      identityReady,
      weekdays,
      classes,
      ready:
        identityReady &&
        !year.archivedAt &&
        weekdays > 0 &&
        classes.some((item) => !item.archivedAt),
    };
  }, source);
}
