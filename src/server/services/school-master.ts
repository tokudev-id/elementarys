import "server-only";
import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import {
  yearInputSchema,
  yearPatchSchema,
  classInputSchema,
  classPatchSchema,
  calendarInputSchema,
  calendarQuerySchema,
  type AcademicYearView,
  type ClassView,
  type CalendarView,
} from "@/contracts/school-master";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import { monthDates } from "@/domain/report";
import { resolveSchoolDay, schoolToday } from "@/domain/calendar";
import type { Actor } from "@/server/auth/guards";
import { assertAdmin, assertVersion, mutationTransaction } from "@/server/mutations";
import { audit, pool, transaction, lockRows } from "@/server/db/pool";

const yearColumns =
  'id,label,starts_on::text "startsOn",ends_on_exclusive::text "endsOnExclusive",is_current "isCurrent",version,archived_at::text "archivedAt"';
async function yearRow(client: PoolClient, id: string, lock = false): Promise<AcademicYearView> {
  parseInput(z.uuid(), id);
  const row = (
    await client.query<AcademicYearView>(
      `SELECT ${yearColumns} FROM academic_years WHERE id=$1 ${lock ? "FOR UPDATE" : ""}`,
      [id],
    )
  ).rows[0];
  if (!row) throw new DomainError("RESOURCE_NOT_FOUND", "Tahun ajaran tidak ditemukan.", 404);
  return row;
}
export async function listAcademicYears(source: Pool = pool) {
  return (
    await source.query<AcademicYearView>(
      `SELECT ${yearColumns} FROM academic_years ORDER BY is_current DESC,starts_on DESC,id`,
    )
  ).rows;
}
export async function listClasses(source: Pool = pool, yearId?: string): Promise<ClassView[]> {
  if (yearId) parseInput(z.uuid(), yearId);
  return (
    await source.query<ClassView>(
      `SELECT c.id,c.academic_year_id "yearId",c.name,c.grade,c.version,c.archived_at::text "archivedAt",EXISTS(SELECT 1 FROM enrollments e WHERE e.class_id=c.id) "hasEnrollment" FROM classes c WHERE ($1::uuid IS NULL OR c.academic_year_id=$1) ORDER BY c.grade,c.name,c.id`,
      [yearId ?? null],
    )
  ).rows;
}
async function deactivateOtherYears(
  client: PoolClient,
  target: string,
  actor: Actor,
  requestId: string,
) {
  const before = (
    await client.query<AcademicYearView>(
      `SELECT ${yearColumns} FROM academic_years WHERE is_current AND id<>$1`,
      [target],
    )
  ).rows;
  await client.query(
    "UPDATE academic_years SET is_current=false,version=version+1 WHERE is_current AND id<>$1",
    [target],
  );
  for (const row of before)
    await audit(client, actor.id, "academic-year.current", "academic_year", row.id, requestId, {
      actorName: actor.name,
      before: row,
      after: { ...row, isCurrent: false, version: row.version + 1 },
    });
}
export async function createAcademicYear(
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(yearInputSchema, body);
  return mutationTransaction(async (client) => {
    await client.query("SELECT id FROM academic_years ORDER BY id FOR UPDATE");
    const row = (
      await client.query<{ id: string }>(
        "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES($1,$2,$3) RETURNING id",
        [input.label, input.startsOn, input.endsOnExclusive],
      )
    ).rows[0];
    if (input.isCurrent) {
      await deactivateOtherYears(client, row.id, actor, requestId);
      await client.query("UPDATE academic_years SET is_current=true WHERE id=$1", [row.id]);
    }
    await audit(client, actor.id, "academic-year.create", "academic_year", row.id, requestId, {
      actorName: actor.name,
      before: null,
      after: input,
    });
    return { saved: true as const, id: row.id, version: 1 };
  }, source);
}
export async function updateAcademicYear(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const data = parseInput(yearPatchSchema, body);
  return mutationTransaction(async (client) => {
    await client.query("SELECT id FROM academic_years ORDER BY id FOR UPDATE");
    const before = await yearRow(client, id);
    assertVersion(before.version, data.expectedVersion);
    const input = parseInput(yearInputSchema, {
      label: data.label ?? before.label,
      startsOn: data.startsOn ?? before.startsOn,
      endsOnExclusive: data.endsOnExclusive ?? before.endsOnExclusive,
      isCurrent: data.isCurrent ?? before.isCurrent,
    });
    if (input.startsOn !== before.startsOn || input.endsOnExclusive !== before.endsOnExclusive) {
      const used = (
        await client.query<{ exists: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM attendance_sessions a JOIN classes c ON c.id=a.class_id WHERE c.academic_year_id=$1) exists",
          [id],
        )
      ).rows[0].exists;
      if (used)
        throw new DomainError(
          "INVALID_INPUT",
          "Rentang tahun ajaran yang sudah memiliki absensi tidak dapat diubah.",
        );
      const outside = (
        await client.query<{ exists: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE c.academic_year_id=$1 AND (e.starts_on<$2 OR e.ends_on_exclusive>$3)) exists",
          [id, input.startsOn, input.endsOnExclusive],
        )
      ).rows[0].exists;
      if (outside)
        throw new DomainError("INVALID_INPUT", "Rentang baru memotong penempatan siswa.");
      const invalidOverrides = (
        await client.query<{ exists: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM school_day_overrides WHERE academic_year_id=$1 AND (date<$2 OR date>=$3)) exists",
          [id, input.startsOn, input.endsOnExclusive],
        )
      ).rows[0].exists;
      if (invalidOverrides)
        throw new DomainError("INVALID_INPUT", "Tanggal kalender berada di luar rentang baru.");
    }
    let archivedAt = before.archivedAt;
    if (data.archived) {
      if (input.isCurrent)
        throw new DomainError(
          "INVALID_INPUT",
          "Pilih tahun ajaran aktif lain sebelum mengarsipkan tahun ini.",
        );
      const timezone =
        (await client.query<{ timezone: string }>("SELECT timezone FROM school_config WHERE id=1"))
          .rows[0]?.timezone ?? "Asia/Kuala_Lumpur";
      const effective = (
        await client.query<{ exists: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE c.academic_year_id=$1 AND e.ends_on_exclusive>$2) exists",
          [id, schoolToday(timezone)],
        )
      ).rows[0].exists;
      if (effective)
        throw new DomainError(
          "INVALID_INPUT",
          "Masih ada penempatan siswa yang perlu ditutup sebelum arsip.",
        );
      archivedAt = new Date().toISOString();
    } else if (data.archived === false) archivedAt = null;
    if (input.isCurrent && archivedAt)
      throw new DomainError(
        "INVALID_INPUT",
        "Tahun ajaran yang diarsipkan tidak dapat diaktifkan.",
      );
    if (input.isCurrent) await deactivateOtherYears(client, id, actor, requestId);
    await client.query(
      "UPDATE academic_years SET label=$2,starts_on=$3,ends_on_exclusive=$4,is_current=$5,archived_at=$6,version=version+1 WHERE id=$1",
      [id, input.label, input.startsOn, input.endsOnExclusive, input.isCurrent, archivedAt],
    );
    await audit(client, actor.id, "academic-year.update", "academic_year", id, requestId, {
      actorName: actor.name,
      before,
      after: { ...input, archivedAt, version: before.version + 1 },
    });
    return { saved: true as const, id, version: before.version + 1 };
  }, source);
}
export async function createClass(
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(classInputSchema, body);
  return mutationTransaction(async (client) => {
    const year = await yearRow(client, input.yearId, true);
    if (year.archivedAt) throw new DomainError("INVALID_INPUT", "Tahun ajaran telah diarsipkan.");
    const row = (
      await client.query<{ id: string }>(
        "INSERT INTO classes(academic_year_id,name,grade) VALUES($1,$2,$3) RETURNING id",
        [input.yearId, input.name, input.grade],
      )
    ).rows[0];
    await audit(client, actor.id, "class.create", "class", row.id, requestId, {
      actorName: actor.name,
      before: null,
      after: input,
    });
    return { saved: true as const, id: row.id, version: 1 };
  }, source);
}
export async function updateClass(
  id: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  parseInput(z.uuid(), id);
  const data = parseInput(classPatchSchema, body);
  return mutationTransaction(async (client) => {
    const initial = (
      await client.query<{ yearId: string }>(
        'SELECT academic_year_id "yearId" FROM classes WHERE id=$1',
        [id],
      )
    ).rows[0];
    if (!initial) throw new DomainError("RESOURCE_NOT_FOUND", "Kelas tidak ditemukan.", 404);
    await lockRows(client, "academic_years", [initial.yearId, data.yearId ?? initial.yearId]);
    const before = (
      await client.query<ClassView>(
        'SELECT id,academic_year_id "yearId",name,grade,version,archived_at::text "archivedAt" FROM classes WHERE id=$1 FOR UPDATE',
        [id],
      )
    ).rows[0];
    if (before.yearId !== initial.yearId)
      throw new DomainError("VERSION_CONFLICT", "Kelas telah berubah. Muat data terbaru.", 409);
    assertVersion(before.version, data.expectedVersion);
    const input = parseInput(classInputSchema, {
      yearId: data.yearId ?? before.yearId,
      name: data.name ?? before.name,
      grade: data.grade ?? before.grade,
    });
    const target = await yearRow(client, input.yearId);
    if (target.archivedAt) throw new DomainError("INVALID_INPUT", "Tahun ajaran telah diarsipkan.");
    const used = (
      await client.query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM enrollments WHERE class_id=$1) exists",
        [id],
      )
    ).rows[0].exists;
    if (used && (input.grade !== before.grade || input.yearId !== before.yearId))
      throw new DomainError(
        "INVALID_INPUT",
        "Tingkat dan tahun kelas tidak dapat diubah setelah siswa ditempatkan.",
      );
    let archivedAt = before.archivedAt;
    if (data.archived) {
      const timezone =
        (await client.query<{ timezone: string }>("SELECT timezone FROM school_config WHERE id=1"))
          .rows[0]?.timezone ?? "Asia/Kuala_Lumpur";
      const active = (
        await client.query<{ exists: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM enrollments WHERE class_id=$1 AND ends_on_exclusive>$2) exists",
          [id, schoolToday(timezone)],
        )
      ).rows[0].exists;
      if (active)
        throw new DomainError(
          "INVALID_INPUT",
          "Masih ada penempatan siswa yang perlu ditutup sebelum kelas diarsipkan.",
        );
      archivedAt = new Date().toISOString();
    } else if (data.archived === false) archivedAt = null;
    await client.query(
      "UPDATE classes SET academic_year_id=$2,name=$3,grade=$4,archived_at=$5,version=version+1 WHERE id=$1",
      [id, input.yearId, input.name, input.grade, archivedAt],
    );
    await audit(client, actor.id, "class.update", "class", id, requestId, {
      actorName: actor.name,
      before,
      after: { ...input, archivedAt, version: before.version + 1 },
    });
    return { saved: true as const, id, version: before.version + 1 };
  }, source);
}
export async function getCalendar(
  yearId: string,
  month: string,
  source: Pool = pool,
): Promise<CalendarView> {
  parseInput(calendarQuerySchema, { yearId, month });
  return transaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const year = await yearRow(client, yearId);
    const dates = monthDates(month);
    if (dates.at(-1)! < year.startsOn || dates[0] >= year.endsOnExclusive)
      throw new DomainError("OUTSIDE_ACADEMIC_YEAR", "Bulan di luar tahun ajaran.", 422);
    const weekdays = (
      await client.query<{ weekday: number }>(
        "SELECT weekday FROM school_weekdays WHERE academic_year_id=$1",
        [yearId],
      )
    ).rows.map((item) => item.weekday);
    const overrides = (
      await client.query<{ date: string; isSchoolDay: boolean; reason: string }>(
        'SELECT date::text,is_school_day "isSchoolDay",reason FROM school_day_overrides WHERE academic_year_id=$1 ORDER BY date',
        [yearId],
      )
    ).rows;
    const calendar = {
      startsOn: year.startsOn,
      endsOnExclusive: year.endsOnExclusive,
      weekdays,
      overrides,
    };
    return {
      year,
      month,
      weekdays,
      overrides,
      days: dates.map((date) => ({ date, ...resolveSchoolDay(date, calendar) })),
    };
  }, source);
}
export async function updateCalendar(
  yearId: string,
  body: unknown,
  actor: Actor,
  requestId: string,
  source: Pool = pool,
) {
  assertAdmin(actor);
  const input = parseInput(calendarInputSchema, body);
  return mutationTransaction(async (client) => {
    const year = await yearRow(client, yearId, true);
    assertVersion(year.version, input.expectedVersion);
    if (
      input.overrides.some((item) => item.date < year.startsOn || item.date >= year.endsOnExclusive)
    )
      throw new DomainError(
        "OUTSIDE_ACADEMIC_YEAR",
        "Tanggal pengecualian di luar tahun ajaran.",
        422,
      );
    const calendar = {
      startsOn: year.startsOn,
      endsOnExclusive: year.endsOnExclusive,
      weekdays: input.weekdays,
      overrides: input.overrides,
    };
    const sessions = (
      await client.query<{ id: string; date: string; name: string }>(
        "SELECT a.id,a.date::text,c.name FROM attendance_sessions a JOIN classes c ON c.id=a.class_id WHERE c.academic_year_id=$1 AND a.state='submitted'",
        [yearId],
      )
    ).rows;
    const blocked = sessions.filter((item) => !resolveSchoolDay(item.date, calendar).isSchoolDay);
    if (blocked.length)
      throw new DomainError(
        "CALENDAR_HAS_ATTENDANCE",
        `Batalkan catatan berikut sebelum menjadikannya libur: ${blocked.map((item) => `${item.name} (${item.date})`).join(", ")}.`,
        409,
        { sessions: blocked.map((item) => item.id) },
      );
    const before = {
      weekdays: (
        await client.query<{ weekday: number }>(
          "SELECT weekday FROM school_weekdays WHERE academic_year_id=$1",
          [yearId],
        )
      ).rows.map((item) => item.weekday),
      overrides: (
        await client.query(
          "SELECT date::text,is_school_day,reason FROM school_day_overrides WHERE academic_year_id=$1 ORDER BY date",
          [yearId],
        )
      ).rows,
    };
    await client.query("DELETE FROM school_weekdays WHERE academic_year_id=$1", [yearId]);
    await client.query(
      "INSERT INTO school_weekdays(academic_year_id,weekday) SELECT $1,unnest($2::int[])",
      [yearId, input.weekdays],
    );
    await client.query("DELETE FROM school_day_overrides WHERE academic_year_id=$1", [yearId]);
    await client.query(
      'INSERT INTO school_day_overrides(academic_year_id,date,is_school_day,reason) SELECT $1,x.date,x."isSchoolDay",x.reason FROM jsonb_to_recordset($2::jsonb) AS x(date date,"isSchoolDay" boolean,reason text)',
      [yearId, JSON.stringify(input.overrides)],
    );
    await client.query("UPDATE academic_years SET version=version+1 WHERE id=$1", [yearId]);
    await audit(client, actor.id, "calendar.update", "academic_year", yearId, requestId, {
      actorName: actor.name,
      before,
      after: { weekdays: input.weekdays, overrides: input.overrides },
    });
    return { saved: true as const, id: yearId, version: year.version + 1 };
  }, source);
}
