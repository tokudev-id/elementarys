import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import {
  getSchoolSettings,
  setupState,
  updateSchoolSettings,
} from "../../src/server/services/settings";
import { getAttendance } from "../../src/server/queries/attendance";
import { saveAttendance } from "../../src/server/services/attendance/save";
import { transaction } from "../../src/server/db/pool";
import type { Actor } from "../../src/server/auth/guards";

let source: Pool;
let actor: Actor;
let classId: string;
const clock = () => new Date("2026-10-07T17:00:00Z");
beforeAll(async () => {
  source = (await createTestDatabase("settings")).pool;
}, 30000);
afterAll(async () => {
  await source?.end();
});
beforeEach(async () => {
  await resetDatabase(source);
  const seeded = await seedTestDatabase(
    String(source.options.connectionString),
    randomUUID(),
    "test",
  );
  classId = seeded.classId;
  actor = {
    id: seeded.adminId,
    name: "Guru Admin Contoh",
    role: "admin",
    teacherId: null,
    mustChangePassword: false,
  };
});
const input = (version: number | null = 1) => ({
  expectedVersion: version,
  name: "Sekolah Uji",
  location: "Lingkungan uji",
  timezone: "Asia/Kuala_Lumpur",
  reason: null,
});
it("rejects invalid timezone, teacher writes and stale concurrent updates; audits the one successful change", async () => {
  await expect(
    updateSchoolSettings({ ...input(), timezone: "Invalid/School" }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    updateSchoolSettings(input(), { ...actor, role: "teacher" }, randomUUID(), source),
  ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  const results = await Promise.allSettled([
    updateSchoolSettings({ ...input(), location: "A" }, actor, randomUUID(), source),
    updateSchoolSettings({ ...input(), location: "B" }, actor, randomUUID(), source),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(
    (results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason.code,
  ).toBe("VERSION_CONFLICT");
  expect(
    (await source.query("SELECT count(*)::int n FROM audit_events WHERE action='settings.update'"))
      .rows[0].n,
  ).toBe(1);
});
it("requires a reason after attendance and preserves old date-only records while enforcing the new timezone on subsequent saves", async () => {
  const view = await getAttendance(classId, "2026-10-06", source, clock);
  const entries = view.students.map((student) => ({
    enrollmentId: student.enrollmentId,
    status: "H" as const,
  }));
  await saveAttendance(
    classId,
    "2026-10-06",
    { expectedVersion: null, entries },
    actor,
    randomUUID(),
    { source, clock },
  );
  await expect(
    updateSchoolSettings({ ...input(), timezone: "America/New_York" }, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await updateSchoolSettings(
    { ...input(), timezone: "America/New_York", reason: "Perubahan zona waktu pengujian" },
    actor,
    randomUUID(),
    source,
  );
  expect((await source.query("SELECT DISTINCT date::text FROM attendance_records")).rows).toEqual([
    { date: "2026-10-06" },
  ]);
  expect((await getAttendance(classId, "2026-10-06", source, clock)).schoolToday).toBe(
    "2026-10-07",
  );
  await expect(
    saveAttendance(classId, "2026-10-08", { expectedVersion: null, entries }, actor, randomUUID(), {
      source,
      clock,
    }),
  ).rejects.toMatchObject({ code: "FUTURE_DATE" });
});
it("lists missing setup sections, does not certify synthetic production config and only stamps valid minimum setup", async () => {
  const config = await getSchoolSettings(source);
  expect(config.setup.ready).toBe(true);
  expect(config.setup.productionReady).toBe(false);
  const production = await transaction((client) => setupState(client, config, true), source);
  expect(production.identity).toBe(false);
  await source.query("DELETE FROM school_weekdays");
  await updateSchoolSettings(input(), actor, randomUUID(), source);
  const incomplete = await getSchoolSettings(source);
  expect(incomplete.configuredAt).toBeNull();
  expect(incomplete.setup.missing).toContain("Hari belajar");
  await expect(getAttendance(classId, "2026-10-06", source)).rejects.toMatchObject({
    code: "SETUP_INCOMPLETE",
    message: expect.stringContaining("Hari belajar"),
  });
});

it("serializes first-time configuration so two empty-state forms cannot both create the singleton", async () => {
  await source.query("DELETE FROM school_config");
  const outcomes = await Promise.allSettled([
    updateSchoolSettings(input(null), actor, randomUUID(), source),
    updateSchoolSettings(input(null), actor, randomUUID(), source),
  ]);
  expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(
    (outcomes.find((result) => result.status === "rejected") as PromiseRejectedResult).reason.code,
  ).toBe("VERSION_CONFLICT");
  expect((await getSchoolSettings(source)).version).toBe(1);
});
