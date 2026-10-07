import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { createStudent, getStudent, updateStudent } from "../../src/server/services/students";
import { getAttendance } from "../../src/server/queries/attendance";
import { saveAttendance } from "../../src/server/services/attendance/save";
import type { Actor } from "../../src/server/auth/guards";

let source: Pool;
let actor: Actor;
let classId: string;
const clock = () => new Date("2026-10-07T04:00:00Z");
beforeAll(async () => {
  source = (await createTestDatabase("students")).pool;
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
    name: "Guru Admin Contoh",
    role: "admin",
    teacherId: null,
    mustChangePassword: false,
  };
});
const input = () => ({
  fullName: "Nama Sama",
  nis: "00123",
  nisn: null,
  classId,
  startsOn: "2026-10-07",
});
it("concurrent creation gives unique sequence codes, permits equal names and starts roster only on the effective date", async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () => createStudent(input(), actor, randomUUID(), source)),
  );
  const students = await Promise.all(results.map((result) => getStudent(result.id, source)));
  expect(new Set(students.map((student) => student.studentCode)).size).toBe(5);
  expect(
    students.every((student) => student.fullName === "Nama Sama" && student.nis === "00123"),
  ).toBe(true);
  expect(students.every((student) => student.enrollments[0].endsOnExclusive === "2027-01-01")).toBe(
    true,
  );
  expect((await getAttendance(classId, "2026-10-06", source, clock)).students).toHaveLength(10);
  expect((await getAttendance(classId, "2026-10-07", source, clock)).students).toHaveLength(15);
});
it("enrollment failures rollback the student; historical roster changes give a safe date", async () => {
  const before = (await source.query("SELECT count(*)::int n FROM students")).rows[0].n;
  await expect(
    createStudent({ ...input(), startsOn: "2025-12-01" }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "OUTSIDE_ACADEMIC_YEAR" });
  expect((await source.query("SELECT count(*)::int n FROM students")).rows[0].n).toBe(before);
  const view = await getAttendance(classId, "2026-10-06", source, clock);
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
    createStudent({ ...input(), startsOn: "2026-10-01" }, actor, randomUUID(), source),
  ).rejects.toMatchObject({
    code: "HISTORICAL_ROSTER_CHANGE",
    message: expect.stringContaining("2026-10-07"),
  });
  expect((await source.query("SELECT count(*)::int n FROM students")).rows[0].n).toBe(before);
});
it("rejects stale and duplicate code edits, guards teacher writes and keeps sequence codes unique beyond four digits", async () => {
  await source.query("SELECT setval('student_code_seq',9999,true)");
  const created = await createStudent(input(), actor, randomUUID(), source);
  const current = await getStudent(created.id, source);
  expect(current.studentCode).toBe("S-10000");
  const update = {
    expectedVersion: 1,
    fullName: "Nama Diperbaiki",
    nis: null,
    nisn: "00045",
    studentCode: current.studentCode,
  };
  await expect(
    updateStudent(current.id, update, { ...actor, role: "teacher" }, randomUUID(), source),
  ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  await updateStudent(current.id, update, actor, randomUUID(), source);
  await expect(
    updateStudent(current.id, update, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  const duplicateCode = (
    await source.query("SELECT student_code FROM students WHERE id<>$1 LIMIT 1", [current.id])
  ).rows[0].student_code;
  await expect(
    updateStudent(
      current.id,
      { ...update, expectedVersion: 2, studentCode: duplicateCode },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  expect((await getStudent(current.id, source)).studentCode).toBe("S-10000");
});
