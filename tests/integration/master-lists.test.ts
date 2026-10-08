import { afterAll, beforeAll, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { listStudents, listTeachers, listClasses } from "../../src/server/queries/master-lists";
import { listStudentOptions } from "../../src/server/services/students";
import { listClassOptions } from "../../src/server/services/school-master";
import { schoolToday } from "../../src/domain/calendar";
import type { Actor } from "../../src/server/auth/guards";

let source: Pool;
let seed: Awaited<ReturnType<typeof seedTestDatabase>>;
let actor: Actor;
beforeAll(async () => {
  const db = await createTestDatabase("ui_r2_lists");
  source = db.pool;
  seed = await seedTestDatabase(db.url, "SyntheticTest123!", "test", { pilot: true });
  const teacherId = (await source.query("SELECT id FROM teachers WHERE user_id=$1", [seed.adminId]))
    .rows[0].id;
  actor = {
    id: seed.adminId,
    name: "Guru Admin Contoh",
    role: "admin",
    teacherId,
    mustChangePassword: false,
  };
  await source.query(
    `WITH inserted AS (INSERT INTO students(student_code,full_name,nis) SELECT 'L-'||nextval('student_code_seq'),'Nama halaman '||lpad(n::text,4,'0'),'NIS-'||n FROM generate_series(1,540) n RETURNING id)
    INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) SELECT id,$1,'2026-01-01','2027-01-01' FROM inserted`,
    [seed.classIds[0]],
  );
});
afterAll(async () => {
  await source?.end();
});

it("600 pupils are paginated deterministically with full options separate and NIS search", async () => {
  const first = await listStudents({}, source);
  expect(first.total).toBe(600);
  expect(first.items).toHaveLength(25);
  expect(first.items.every((item) => item.activeClass !== null)).toBe(true);
  const next = await listStudents({ page: 2 }, source);
  expect(new Set([...first.items, ...next.items].map((item) => item.id)).size).toBe(50);
  expect((await listStudents({ pageSize: 50 }, source)).items).toHaveLength(50);
  expect((await listStudents({ page: 999, pageSize: 10 }, source)).page).toBe(60);
  expect((await listStudentOptions({}, source)).length).toBe(600);
  expect((await listStudents({ q: "NIS-539" }, source)).items.map((item) => item.nis)).toEqual([
    "NIS-539",
  ]);
});
it("class filtering and sorting use the placement effective on school date, not historical placement", async () => {
  const today = schoolToday("Asia/Kuala_Lumpur");
  const student = (
    await source.query("SELECT student_id FROM enrollments WHERE class_id=$1 LIMIT 1", [
      seed.classIds[0],
    ])
  ).rows[0].student_id;
  await source.query("UPDATE enrollments SET ends_on_exclusive=$2 WHERE student_id=$1", [
    student,
    today,
  ]);
  await source.query(
    "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,$3,'2027-01-01')",
    [student, seed.classIds[1], today],
  );
  const target = await listStudents({ classId: seed.classIds[1], sort: "class" }, source);
  expect(target.items.some((item) => item.id === student)).toBe(true);
  const previous = await listStudents(
    {
      classId: seed.classIds[0],
      q: (await source.query("SELECT student_code FROM students WHERE id=$1", [student])).rows[0]
        .student_code,
    },
    source,
  );
  expect(previous.total).toBe(0);
  expect(
    (await listStudentOptions({ classId: seed.classIds[0] }, source)).some(
      (item) => item.id === student,
    ),
  ).toBe(true);
});
it("archive/all, empty filters and invalid pagination do not silently broaden a request", async () => {
  const id = (await source.query("SELECT id FROM students ORDER BY id LIMIT 1")).rows[0].id;
  await source.query("UPDATE students SET archived_at=now() WHERE id=$1", [id]);
  expect((await listStudents({ status: "active" }, source)).total).toBe(599);
  expect((await listStudents({ status: "archived" }, source)).items.map((item) => item.id)).toEqual(
    [id],
  );
  expect((await listStudents({ status: "all" }, source)).total).toBe(600);
  expect(await listStudents({ q: "tidak-cocok" }, source)).toMatchObject({
    items: [],
    total: 0,
    page: 1,
  });
  for (const input of [
    { page: 0 },
    { pageSize: 600 },
    { q: "x".repeat(201) },
    { sort: "name; DROP TABLE students" },
    { classId: "invalid" },
  ])
    await expect(listStudents(input, source)).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
it("teacher pages preserve private account details for admins and class options stay complete", async () => {
  const result = await listTeachers(actor, {}, source);
  expect(result.total).toBe(2);
  expect(result.items.every((item) => item.account?.email && item.classes.length === 3)).toBe(true);
  const reader = { ...actor, role: "teacher" as const };
  expect(
    (await listTeachers(reader, {}, source)).items.every((item) => item.account === null),
  ).toBe(true);
  await expect(listTeachers(reader, { role: "admin" }, source)).rejects.toMatchObject({
    code: "ACCESS_DENIED",
  });
  const classes = await listClasses({ yearId: seed.yearId, grade: 1 }, source);
  expect(classes.total).toBe(1);
  expect(classes.items[0].studentCount).toBeGreaterThan(500);
  expect(classes.items[0].primaryTeachers[0].name).toBe("Guru Admin Contoh");
  expect((await listClassOptions(source)).length).toBe(6);
});
