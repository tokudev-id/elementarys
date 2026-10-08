import { beforeAll, afterAll, it, expect } from "vitest";
import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
let source: Pool;
let url: string;
beforeAll(async () => {
  const database = await createTestDatabase("pilot_seed");
  source = database.pool;
  url = database.url;
}, 30000);
afterAll(async () => {
  await source?.end();
});
it("pilot fixture creates six ten-student classes and three primary classes per teacher without truncating sequence digits", async () => {
  await source.query("SELECT setval('student_code_seq',10000,false)");
  const seeded = await seedTestDatabase(url, randomUUID(), "test", { pilot: true });
  expect(seeded.classIds).toHaveLength(6);
  expect((await source.query("SELECT count(*)::int n FROM students")).rows[0].n).toBe(60);
  expect(
    (
      await source.query("SELECT class_id,count(*)::int n FROM enrollments GROUP BY class_id")
    ).rows.every((row) => row.n === 10),
  ).toBe(true);
  expect(
    (
      await source.query(
        "SELECT teacher_id,count(*)::int n FROM teacher_classes GROUP BY teacher_id",
      )
    ).rows.map((row) => row.n),
  ).toEqual([3, 3]);
  expect(
    (await source.query("SELECT student_code FROM students ORDER BY student_code LIMIT 1")).rows[0]
      .student_code,
  ).toBe("S-10000");
});
