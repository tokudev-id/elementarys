import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import {
  placeStudent,
  endEnrollment,
  archiveStudent,
  previewPromotion,
  promoteStudents,
} from "../../src/server/services/enrollments";
import { getStudent, listStudents } from "../../src/server/services/students";
import { getAttendance } from "../../src/server/queries/attendance";
import { saveAttendance } from "../../src/server/services/attendance/save";
import { buildMonthlyAttendanceReport } from "../../src/server/reports/monthly";
import type { Actor } from "../../src/server/auth/guards";

let source: Pool;
let actor: Actor;
let classId: string;
let target: string;
let future: string;
let yearId: string;
let studentId: string;
let enrollmentId: string;
const clock = () => new Date("2026-10-07T04:00:00Z");
const options = () => ({ source, clock });
beforeAll(async () => {
  source = (await createTestDatabase("enrollments")).pool;
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
  classId = seed.classId;
  actor = {
    id: seed.adminId,
    name: "Admin saat perubahan",
    role: "admin",
    teacherId: null,
    mustChangePassword: false,
  };
  yearId = (await source.query("SELECT academic_year_id id FROM classes WHERE id=$1", [classId]))
    .rows[0].id;
  target = (
    await source.query(
      "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,2,'Kelas Tujuan') RETURNING id",
      [yearId],
    )
  ).rows[0].id;
  const futureYear = (
    await source.query(
      "INSERT INTO academic_years(label,starts_on,ends_on_exclusive) VALUES('2027','2027-01-01','2028-01-01') RETURNING id",
    )
  ).rows[0].id;
  future = (
    await source.query(
      "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,2,'Tahun Baru') RETURNING id",
      [futureYear],
    )
  ).rows[0].id;
  const first = (
    await source.query(
      "SELECT id,student_id FROM enrollments WHERE class_id=$1 ORDER BY id LIMIT 1",
      [classId],
    )
  ).rows[0];
  studentId = first.student_id;
  enrollmentId = first.id;
});
async function submit(date = "2026-10-06") {
  const view = await getAttendance(classId, date, source, clock);
  return saveAttendance(
    classId,
    date,
    {
      expectedVersion: view.sessionVersion,
      entries: view.students.map((student) => ({
        enrollmentId: student.enrollmentId,
        status: "H",
      })),
      reason: null,
    },
    actor,
    randomUUID(),
    options(),
  );
}
const transfer = (startsOn = "2026-10-07", version = 1) =>
  placeStudent(
    studentId,
    {
      mode: "transfer",
      fromEnrollmentId: enrollmentId,
      classId: target,
      startsOn,
      expectedVersion: version,
      reason: "Pindah kelas",
    },
    actor,
    randomUUID(),
    options(),
  );
const nextPlacement = (version = 1) => ({
  mode: "placement",
  classId: future,
  startsOn: "2027-01-01",
  expectedVersion: version,
  reason: "Naik kelas",
});

it("transfer and exit keep date boundaries in both rosters and reports without changing old records", async () => {
  await submit();
  await expect(transfer("2026-10-06")).rejects.toMatchObject({
    code: "HISTORICAL_ROSTER_CHANGE",
    fieldErrors: { startsOn: ["Tanggal aman berikutnya: 2026-10-07"] },
  });
  const moved = await transfer();
  expect(moved.version).toBe(2);
  expect(
    (await getAttendance(classId, "2026-10-06", source, clock)).students.some(
      (student) => student.studentId === studentId,
    ),
  ).toBe(true);
  expect(
    (await getAttendance(classId, "2026-10-07", source, clock)).students.some(
      (student) => student.studentId === studentId,
    ),
  ).toBe(false);
  expect(
    (await getAttendance(target, "2026-10-07", source, clock)).students.map(
      (student) => student.studentId,
    ),
  ).toEqual([studentId]);
  await endEnrollment(
    moved.id,
    { expectedVersion: 2, endsOnExclusive: "2026-10-08", reason: "Keluar sekolah" },
    actor,
    randomUUID(),
    options(),
  );
  const report = await buildMonthlyAttendanceReport(
    { yearId, month: "2026-10" },
    source,
    () => new Date("2026-10-12T04:00:00Z"),
  );
  const origin = report.classes
    .find((item) => item.classId === classId)!
    .students.find((student) => student.studentId === studentId)!;
  const destination = report.classes.find((item) => item.classId === target)!.students[0];
  expect(origin.cells.slice(5, 8)).toEqual(["H", "-", "-"]);
  expect(destination.cells.slice(5, 10)).toEqual(["-", "?", "-", "-", "-"]);
  expect(origin.totals.H).toBe(1);
  expect(destination.totals).toEqual({ H: 0, S: 0, I: 0, A: 0 });
  const exitAudit = (
    await source.query("SELECT changes_json FROM audit_events WHERE action='enrollment.end'")
  ).rows[0].changes_json;
  expect(exitAudit).toMatchObject({
    before: { exitReason: null },
    after: { exitReason: "Keluar sekolah", endsOnExclusive: "2026-10-08" },
  });
  expect((await source.query("SELECT count(*)::int n FROM attendance_records")).rows[0].n).toBe(10);
});
it("rejects overlapping placement and stale transfer; old enrollment does not block the next year", async () => {
  await expect(
    placeStudent(
      studentId,
      { ...nextPlacement(), classId: target, startsOn: "2026-10-07" },
      actor,
      randomUUID(),
      options(),
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  const saved = await placeStudent(studentId, nextPlacement(), actor, randomUUID(), options());
  expect(saved.version).toBe(2);
  await expect(transfer()).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  expect(
    (await getStudent(studentId, source)).enrollments.map((item) => [
      item.startsOn,
      item.endsOnExclusive,
    ]),
  ).toEqual([
    ["2026-01-01", "2027-01-01"],
    ["2027-01-01", "2028-01-01"],
  ]);
});
it("archive requires closed active enrollment and cancelled future placement, preserving cancellation history and reports", async () => {
  await submit();
  const saved = await placeStudent(studentId, nextPlacement(), actor, randomUUID(), options());
  await expect(
    archiveStudent(
      studentId,
      { expectedVersion: 2, archived: true, reason: "Arsip" },
      actor,
      randomUUID(),
      options(),
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await endEnrollment(
    saved.id,
    { expectedVersion: 2, endsOnExclusive: "2027-01-01", reason: "Rencana dibatalkan" },
    actor,
    randomUUID(),
    options(),
  );
  const afterCancel = await getStudent(studentId, source);
  expect(afterCancel.enrollments.find((item) => item.id === saved.id)?.cancelled).toBe(true);
  await endEnrollment(
    enrollmentId,
    { expectedVersion: 3, endsOnExclusive: "2026-10-07", reason: "Siswa keluar" },
    actor,
    randomUUID(),
    options(),
  );
  await archiveStudent(
    studentId,
    { expectedVersion: 4, archived: true, reason: "Arsip setelah keluar" },
    actor,
    randomUUID(),
    options(),
  );
  expect((await listStudents({}, source)).some((student) => student.id === studentId)).toBe(false);
  expect(
    (await listStudents({ includeArchived: true }, source)).find(
      (student) => student.id === studentId,
    )?.archivedAt,
  ).toBeTruthy();
  expect(
    (await getAttendance(classId, "2026-10-06", source, clock)).students.some(
      (student) => student.studentId === studentId,
    ),
  ).toBe(true);
  expect(
    (await getAttendance(classId, "2026-10-07", source, clock)).students.some(
      (student) => student.studentId === studentId,
    ),
  ).toBe(false);
  expect((await source.query("SELECT count(*)::int n FROM attendance_records")).rows[0].n).toBe(10);
  await archiveStudent(
    studentId,
    { expectedVersion: 5, archived: false, reason: "Aktif kembali" },
    actor,
    randomUUID(),
    options(),
  );
  expect((await getStudent(studentId, source)).version).toBe(6);
});
it("preview reports each student and batch applies all or none under fresh versions", async () => {
  const ids = (
    await source.query("SELECT student_id FROM enrollments WHERE class_id=$1 ORDER BY id LIMIT 2", [
      classId,
    ])
  ).rows.map((row) => row.student_id as string);
  const body = {
    entries: ids.map((id, index) => ({
      studentId: id,
      classId: future,
      startsOn: "2027-01-01",
      expectedVersion: index === 0 ? 1 : 2,
      reason: "Batch naik kelas",
    })),
  };
  const preview = await previewPromotion(body, actor, source);
  expect(preview.items.map((item) => item.ready)).toEqual([true, false]);
  await expect(promoteStudents(body, actor, randomUUID(), source)).rejects.toMatchObject({
    code: "VERSION_CONFLICT",
  });
  expect(
    (await source.query("SELECT count(*)::int n FROM enrollments WHERE class_id=$1", [future]))
      .rows[0].n,
  ).toBe(0);
  expect((await getStudent(ids[0], source)).version).toBe(1);
  body.entries[1].expectedVersion = 1;
  expect((await previewPromotion(body, actor, source)).items.every((item) => item.ready)).toBe(
    true,
  );
  expect((await promoteStudents(body, actor, randomUUID(), source)).results).toHaveLength(2);
  expect(
    (await source.query("SELECT count(*)::int n FROM enrollments WHERE class_id=$1", [future]))
      .rows[0].n,
  ).toBe(2);
  expect(
    (
      await source.query(
        "SELECT count(*)::int n FROM audit_events WHERE action='enrollment.create'",
      )
    ).rows[0].n,
  ).toBe(2);
  await expect(promoteStudents(body, actor, randomUUID(), source)).rejects.toMatchObject({
    code: "VERSION_CONFLICT",
  });
});
it("transfer genuinely waits for submit's class lock, then rejects its newly historical roster change", async () => {
  let release!: () => void;
  let entered!: () => void;
  const enteredPromise = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const view = await getAttendance(classId, "2026-10-07", source, clock);
  const saving = saveAttendance(
    classId,
    "2026-10-07",
    {
      expectedVersion: null,
      entries: view.students.map((student) => ({
        enrollmentId: student.enrollmentId,
        status: "H",
      })),
      reason: null,
    },
    actor,
    randomUUID(),
    {
      source,
      clock,
      afterRecords: async () => {
        entered();
        await gate;
      },
    },
  );
  await enteredPromise;
  const moving = transfer().then(
    () => "unexpected",
    (error: unknown) => error,
  );
  try {
    let waited = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      waited = (
        await source.query<{ waiting: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE '%classes%FOR UPDATE%') waiting",
        )
      ).rows[0].waiting;
      if (waited) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(waited).toBe(true);
  } finally {
    release();
    await Promise.allSettled([saving, moving]);
  }
  await saving;
  expect(await moving).toMatchObject({ code: "HISTORICAL_ROSTER_CHANGE" });
  expect((await getStudent(studentId, source)).enrollments).toHaveLength(1);
});
it("SQL failure during transfer rolls back the shortened interval, version and audit", async () => {
  const before = await getStudent(studentId, source);
  await source.query(
    "CREATE FUNCTION reject_placement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic placement failure'; END $$; CREATE TRIGGER reject_placement BEFORE INSERT ON enrollments FOR EACH ROW EXECUTE FUNCTION reject_placement()",
  );
  try {
    await expect(transfer()).rejects.toMatchObject({ code: "P0001" });
    expect(await getStudent(studentId, source)).toEqual(before);
    expect((await source.query("SELECT count(*)::int n FROM audit_events")).rows[0].n).toBe(0);
  } finally {
    await source.query(
      "DROP TRIGGER reject_placement ON enrollments; DROP FUNCTION reject_placement()",
    );
  }
});
it("teacher cannot transfer, end, archive, preview or apply promotion", async () => {
  const teacher = { ...actor, role: "teacher" as const };
  for (const operation of [
    () => placeStudent(studentId, {}, teacher, randomUUID(), options()),
    () => endEnrollment(enrollmentId, {}, teacher, randomUUID(), options()),
    () => archiveStudent(studentId, {}, teacher, randomUUID(), options()),
    () => previewPromotion({}, teacher, source),
    () => promoteStudents({}, teacher, randomUUID(), source),
  ])
    await expect(operation()).rejects.toMatchObject({ code: "ACCESS_DENIED" });
});
