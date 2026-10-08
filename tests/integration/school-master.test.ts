import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import {
  createAcademicYear,
  updateAcademicYear,
  createClass,
  updateClass,
  getCalendar,
  updateCalendar,
} from "../../src/server/services/school-master";
import { getAttendance } from "../../src/server/queries/attendance";
import { saveAttendance } from "../../src/server/services/attendance/save";
import { buildMonthlyAttendanceReport } from "../../src/server/reports/monthly";
import type { Actor } from "../../src/server/auth/guards";

let source: Pool;
let actor: Actor;
let yearId: string;
let classId: string;
const clock = () => new Date("2026-10-07T04:00:00Z");
beforeAll(async () => {
  source = (await createTestDatabase("school_master")).pool;
}, 30000);
afterAll(async () => {
  await source?.end();
});
beforeEach(async () => {
  await resetDatabase(source);
  const seed = await seedTestDatabase(
    String(source.options.connectionString),
    randomUUID(),
    "test",
  );
  yearId = seed.yearId;
  classId = seed.classId;
  actor = {
    id: seed.adminId,
    name: "Guru Admin Contoh",
    role: "admin",
    teacherId: null,
    mustChangePassword: false,
  };
});
const calendarInput = (version = 1) => ({
  expectedVersion: version,
  weekdays: [1, 2, 3, 4, 5],
  overrides: [] as { date: string; isSchoolDay: boolean; reason: string }[],
});
it("validates year ranges, uniqueness and grades, rejects teacher writes and stale updates", async () => {
  await expect(
    createAcademicYear(
      { label: "Overlap", startsOn: "2026-06-01", endsOnExclusive: "2027-06-01", isCurrent: false },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    createAcademicYear(
      { label: "Invalid", startsOn: "2028-06-01", endsOnExclusive: "2028-01-01", isCurrent: false },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    createClass({ yearId, grade: 7, name: "Kelas Invalid" }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    createClass({ yearId, grade: 1, name: "Kelas 1 Contoh" }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    updateCalendar(yearId, calendarInput(), { ...actor, role: "teacher" }, randomUUID(), source),
  ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  await updateClass(
    classId,
    { expectedVersion: 1, name: "Kelas Diubah" },
    actor,
    randomUUID(),
    source,
  );
  await expect(
    updateClass(classId, { expectedVersion: 1, name: "Stale" }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await expect(
    updateClass(classId, { expectedVersion: 2, grade: 2 }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
it("moves the current year with one active row and versions the previously current year", async () => {
  const created = await createAcademicYear(
    { label: "2027/2028", startsOn: "2027-01-01", endsOnExclusive: "2028-01-01", isCurrent: true },
    actor,
    randomUUID(),
    source,
  );
  expect((await source.query("SELECT id FROM academic_years WHERE is_current")).rows).toEqual([
    { id: created.id },
  ]);
  expect(
    (await source.query("SELECT version FROM academic_years WHERE id=$1", [yearId])).rows[0]
      .version,
  ).toBe(2);
  await expect(
    updateAcademicYear(
      yearId,
      { expectedVersion: 1, isCurrent: true },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await updateAcademicYear(
    yearId,
    { expectedVersion: 2, isCurrent: true },
    actor,
    randomUUID(),
    source,
  );
  expect(
    (await source.query("SELECT count(*)::int n FROM academic_years WHERE is_current")).rows[0].n,
  ).toBe(1);
});
it("calendar, attendance and report use the same weekdays and overrides; historical ranges cannot be reinterpreted", async () => {
  const changed = {
    ...calendarInput(),
    weekdays: [2, 4],
    overrides: [
      { date: "2026-10-07", isSchoolDay: true, reason: "Hari tambahan" },
      { date: "2026-10-06", isSchoolDay: false, reason: "Libur" },
    ],
  };
  await updateCalendar(yearId, changed, actor, randomUUID(), source);
  const calendar = await getCalendar(yearId, "2026-10", source);
  expect(calendar.days.find((day) => day.date === "2026-10-06")?.isSchoolDay).toBe(false);
  expect((await getAttendance(classId, "2026-10-06", source, clock)).isSchoolDay).toBe(false);
  const report = await buildMonthlyAttendanceReport(
    { yearId, month: "2026-10", classId },
    source,
    clock,
  );
  expect(report.classes[0].students[0].cells[5]).toBe("L");
  const view = await getAttendance(classId, "2026-10-07", source, clock);
  await saveAttendance(
    classId,
    view.date,
    {
      expectedVersion: null,
      entries: view.students.map((student) => ({
        enrollmentId: student.enrollmentId,
        status: "H",
      })),
    },
    actor,
    randomUUID(),
    { source, clock },
  );
  await expect(
    updateCalendar(yearId, { ...calendarInput(2), weekdays: [2] }, actor, randomUUID(), source),
  ).rejects.toMatchObject({
    code: "CALENDAR_HAS_ATTENDANCE",
    fieldErrors: { sessions: expect.arrayContaining([expect.any(String)]) },
  });
  await expect(
    updateAcademicYear(
      yearId,
      { expectedVersion: 2, endsOnExclusive: "2027-02-01" },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
it("calendar update waits for submission and cannot turn its submitted day into a holiday", async () => {
  const view = await getAttendance(classId, "2026-10-07", source, clock);
  let release: () => void = () => {};
  let reached: () => void = () => {};
  const started = new Promise<void>((resolve) => {
    reached = resolve;
  });
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const saving = saveAttendance(
    classId,
    view.date,
    {
      expectedVersion: null,
      entries: view.students.map((student) => ({
        enrollmentId: student.enrollmentId,
        status: "H",
      })),
    },
    actor,
    randomUUID(),
    {
      source,
      clock,
      afterRecords: async () => {
        reached();
        await barrier;
      },
    },
  );
  await started;
  const changing = updateCalendar(
    yearId,
    { ...calendarInput(), weekdays: [1, 2, 4, 5] },
    actor,
    randomUUID(),
    source,
  ).catch((error) => error);
  try {
    await expect
      .poll(
        async () =>
          (
            await source.query(
              "SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%academic_years%'",
            )
          ).rows[0].n,
      )
      .toBeGreaterThan(0);
  } finally {
    release();
  }
  await saving;
  expect((await changing).code).toBe("CALENDAR_HAS_ATTENDANCE");
  expect((await getAttendance(classId, view.date, source, clock)).sessionState).toBe("submitted");
  expect((await getCalendar(yearId, "2026-10", source)).weekdays).toContain(3);
});
it("enforces new year validation rules: YYYY/YYYY format and 400 days limit", async () => {
  // Invalid format
  await expect(
    createAcademicYear(
      { label: "2028-2029", startsOn: "2028-01-01", endsOnExclusive: "2029-01-01", isCurrent: false },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({
    code: "INVALID_INPUT",
    fieldErrors: { label: ["Gunakan format 2026/2027."] },
  });
  // Non-consecutive years in label
  await expect(
    createAcademicYear(
      { label: "2028/2030", startsOn: "2028-01-01", endsOnExclusive: "2029-01-01", isCurrent: false },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({
    code: "INVALID_INPUT",
    fieldErrors: { label: ["Gunakan format 2026/2027."] },
  });
  // Exceeds 400 days
  await expect(
    createAcademicYear(
      { label: "2028/2029", startsOn: "2028-01-01", endsOnExclusive: "2029-04-01", isCurrent: false },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
});

