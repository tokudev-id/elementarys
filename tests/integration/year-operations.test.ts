import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import ExcelJS from "exceljs";
import { createTestDatabase, resetDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { getYearPreparation } from "../../src/server/queries/year-preparation";
import { updateAcademicYear, updateClass } from "../../src/server/services/school-master";
import { getAttendance } from "../../src/server/queries/attendance";
import { saveAttendance } from "../../src/server/services/attendance/save";
import { placeStudent } from "../../src/server/services/enrollments";
import { buildMonthlyAttendanceReport } from "../../src/server/reports/monthly";
import { exportAttendanceWorkbook } from "../../src/server/reports/workbook";
import type { Actor } from "../../src/server/auth/guards";
let source: Pool;
let actor: Actor;
let current: string;
let next: string;
let nextClass: string;
beforeAll(async () => {
  source = (await createTestDatabase("year_operations")).pool;
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
  actor = {
    id: seed.adminId,
    name: "Admin Uji",
    role: "admin",
    teacherId: null,
    mustChangePassword: false,
  };
  current = (await source.query("SELECT id FROM academic_years WHERE is_current")).rows[0].id;
  next = (
    await source.query(
      "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES('2027','2027-01-01','2028-01-01') RETURNING id",
    )
  ).rows[0].id;
  nextClass = (
    await source.query(
      "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,2,'Kelas Baru') RETURNING id",
      [next],
    )
  ).rows[0].id;
});
it("year preparation reflects classes/calendar/identity without writes and rejects stale current-year intent", async () => {
  const before = (await source.query("SELECT count(*)::int n FROM audit_events")).rows[0].n;
  expect(await getYearPreparation(next, source)).toMatchObject({
    ready: false,
    weekdays: 0,
    currentYear: { id: current },
    classes: [{ assigned: 0, openEnrollments: 0 }],
  });
  await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [next]);
  expect((await getYearPreparation(next, source)).ready).toBe(true);
  expect((await source.query("SELECT count(*)::int n FROM audit_events")).rows[0].n).toBe(before);
  await expect(
    updateAcademicYear(
      next,
      { expectedVersion: 1, isCurrent: true, expectedCurrentYearId: randomUUID() },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  expect((await getYearPreparation(next, source)).year.isCurrent).toBe(false);
  await updateAcademicYear(
    next,
    { expectedVersion: 1, isCurrent: true, expectedCurrentYearId: current },
    actor,
    randomUUID(),
    source,
  );
  expect((await getYearPreparation(next, source)).currentYear?.id).toBe(next);
  expect(
    (await source.query("SELECT version FROM academic_years WHERE id=$1", [current])).rows[0]
      .version,
  ).toBe(2);
});
it("archiving classes/year is blocked by effective enrollments including future placements", async () => {
  const student = (await source.query("SELECT id FROM students LIMIT 1")).rows[0].id;
  await placeStudent(
    student,
    {
      mode: "placement",
      classId: nextClass,
      startsOn: "2027-01-01",
      expectedVersion: 1,
      reason: "Tahun baru",
    },
    actor,
    randomUUID(),
    { source },
  );
  expect((await getYearPreparation(next, source)).classes[0]).toMatchObject({
    assigned: 1,
    openEnrollments: 1,
  });
  await expect(
    updateClass(nextClass, { expectedVersion: 1, archived: true }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    updateAcademicYear(next, { expectedVersion: 1, archived: true }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
it("old report cells, totals, records and Excel row remain identical after new placement, current switch and archival", async () => {
  const oldYear = (
    await source.query(
      "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES('2018','2018-01-01','2019-01-01') RETURNING id",
    )
  ).rows[0].id;
  const oldClass = (
    await source.query(
      "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,'Kelas Lama') RETURNING id",
      [oldYear],
    )
  ).rows[0].id;
  await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [oldYear]);
  const student = (
    await source.query(
      "INSERT INTO students(student_code,full_name) VALUES('OPS-1','Siswa Operasi') RETURNING id",
    )
  ).rows[0].id;
  await source.query(
    "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2018-01-01','2019-01-01')",
    [student, oldClass],
  );
  const view = await getAttendance(oldClass, "2018-01-01", source);
  await saveAttendance(
    oldClass,
    "2018-01-01",
    {
      expectedVersion: null,
      entries: view.students.map((row) => ({ enrollmentId: row.enrollmentId, status: "H" })),
      reason: "Melengkapi tahun lama",
    },
    actor,
    randomUUID(),
    { source },
  );
  const input = { yearId: oldYear, month: "2018-01", classId: oldClass };
  const before = await buildMonthlyAttendanceReport(input, source);
  const first = await exportAttendanceWorkbook(input, actor, source);
  await placeStudent(
    student,
    {
      mode: "placement",
      classId: nextClass,
      startsOn: "2027-01-01",
      expectedVersion: 1,
      reason: "Penempatan baru",
    },
    actor,
    randomUUID(),
    { source },
  );
  await updateAcademicYear(
    next,
    { expectedVersion: 1, isCurrent: true, expectedCurrentYearId: current },
    actor,
    randomUUID(),
    source,
  );
  await updateClass(oldClass, { expectedVersion: 1, archived: true }, actor, randomUUID(), source);
  await updateAcademicYear(
    oldYear,
    { expectedVersion: 1, archived: true },
    actor,
    randomUUID(),
    source,
  );
  const after = await buildMonthlyAttendanceReport(input, source);
  expect(after.dates).toEqual(before.dates);
  expect(after.classes[0].students).toEqual(before.classes[0].students);
  expect(after.classes[0].totals).toEqual(before.classes[0].totals);
  expect(after.sessionVersions).toEqual(before.sessionVersions);
  const second = await exportAttendanceWorkbook(input, actor, source);
  const workbooks = [new ExcelJS.Workbook(), new ExcelJS.Workbook()];
  await workbooks[0].xlsx.load(first.content.buffer);
  await workbooks[1].xlsx.load(second.content.buffer);
  expect(workbooks[1].worksheets[0].getRow(10).values).toEqual(
    workbooks[0].worksheets[0].getRow(10).values,
  );
  expect((await getAttendance(oldClass, "2018-01-01", source)).totals).toEqual({
    H: 1,
    S: 0,
    I: 0,
    A: 0,
  });
});
