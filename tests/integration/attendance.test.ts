import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { saveAttendance } from "../../src/server/services/attendance/save";
import { getAttendance } from "../../src/server/queries/attendance";
import { getDashboard } from "../../src/server/queries/dashboard";
import { getAttendanceHistory } from "../../src/server/queries/attendance-history";
import { voidAttendance } from "../../src/server/services/attendance/void";
import { buildMonthlyAttendanceReport } from "../../src/server/reports/monthly";
import { exportAttendanceWorkbook } from "../../src/server/reports/workbook";
import type { Actor } from "../../src/server/auth/guards";
import type { AttendanceInput } from "../../src/contracts/attendance";
let source: Pool;
let classId: string, yearId: string, enrollments: string[];
const actor: Actor = {
  id: "actor",
  name: "Nama saat simpan",
  role: "teacher",
  teacherId: null,
  mustChangePassword: false,
};
const clock = () => new Date("2026-10-07T04:00:00Z");
const input = (
  status: "H" | "A" | "S" | "I" = "H",
  version: number | null = null,
  reason: string | null = null,
): AttendanceInput => ({
  expectedVersion: version,
  entries: enrollments.map((enrollmentId) => ({ enrollmentId, status })),
  reason,
});
const save = (data = input(), date = "2026-10-06", chosenActor = actor) =>
  saveAttendance(classId, date, data, chosenActor, randomUUID(), { source, clock });
const counts = async () =>
  (
    await source.query(
      "SELECT (SELECT count(*)::int FROM attendance_sessions) sessions,(SELECT count(*)::int FROM attendance_records) records,(SELECT count(*)::int FROM audit_events) audits",
    )
  ).rows[0];
beforeAll(async () => {
  source = (await createTestDatabase("attendance")).pool;
}, 30000);
afterAll(async () => {
  await source?.end();
});
beforeEach(async () => {
  await resetDatabase(source);
  await source.query(
    `INSERT INTO "user"(id,name,email,role) VALUES('actor','Nama saat simpan','actor@example.test','teacher')`,
  );
  await source.query("INSERT INTO school_config(name,configured_at) VALUES('Sekolah Uji',now())");
  yearId = (
    await source.query(
      "INSERT INTO academic_years(label,starts_on,ends_on_exclusive,is_current) VALUES('2026','2026-01-01','2027-01-01',true) RETURNING id",
    )
  ).rows[0].id;
  await source.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [yearId]);
  classId = (
    await source.query(
      "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,'Kelas 1') RETURNING id",
      [yearId],
    )
  ).rows[0].id;
  enrollments = [];
  for (let i = 1; i <= 2; i++) {
    const student = (
      await source.query(
        "INSERT INTO students(student_code,full_name) VALUES($1,'Nama Sama') RETURNING id",
        [`S-${i}`],
      )
    ).rows[0].id;
    enrollments.push(
      (
        await source.query(
          "INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2026-01-01','2027-01-01') RETURNING id",
          [student, classId],
        )
      ).rows[0].id,
    );
  }
});
describe("attendance on PostgreSQL 18", () => {
  it("keeps initial, late arrival correction, void and refill history with final totals and export changes", async () => {
    const admin = { ...actor, role: "admin" as const };
    const date = "2026-10-06";
    expect((await getAttendanceHistory(classId, date, source, clock)).events).toEqual([]);
    await save(input("A"));
    await save(input("H", 1, "Siswa datang belakangan"));
    const exported = await exportAttendanceWorkbook(
      { yearId, month: "2026-10", classId },
      actor,
      source,
    );
    const id = Object.keys(exported.report.sessionVersions)[0];
    const report = () =>
      buildMonthlyAttendanceReport({ yearId, month: "2026-10", classId }, source, clock);
    await voidAttendance(
      classId,
      date,
      { expectedVersion: 2, reason: "Periksa ulang seluruh kelas" },
      admin,
      randomUUID(),
      { source, clock },
    );
    expect(await counts()).toEqual({ sessions: 1, records: 0, audits: 3 });
    expect((await report()).classes[0]).toMatchObject({
      totals: { H: 0, S: 0, I: 0, A: 0 },
      exportReference: { changedDates: [date] },
    });
    await expect(
      voidAttendance(classId, date, { expectedVersion: 2, reason: "Retry" }, admin, randomUUID(), {
        source,
        clock,
      }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    await expect(save(input("S", 3))).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await save(input("S", 3, "Isi ulang sesudah verifikasi"));
    expect((await report()).sessionVersions[id]).toBe(4);
    expect((await report()).classes[0]).toMatchObject({
      totals: { H: 0, S: 2, I: 0, A: 0 },
      exportReference: { changedDates: [date] },
    });
    const history = await getAttendanceHistory(classId, date, source, clock);
    expect(history.events.map((event) => event.after.version)).toEqual([1, 2, 3, 4]);
    expect(history.events.map((event) => event.action)).toEqual([
      "attendance.submit",
      "attendance.correct",
      "attendance.void",
      "attendance.correct",
    ]);
    expect(history.events[1].before.entries.every((entry) => entry.status === "A")).toBe(true);
    expect(history.events[1].after.entries.every((entry) => entry.status === "H")).toBe(true);
    expect(history.events[2].before.entries).toHaveLength(2);
    expect(history.events[2].after.entries).toEqual([]);
    expect(history.events[3].before.state).toBe("voided");
    expect(history.events[3].after.entries.every((entry) => entry.status === "S")).toBe(true);
    expect(history.events.map((event) => event.reason)).toEqual([
      null,
      "Siswa datang belakangan",
      "Periksa ulang seluruh kelas",
      "Isi ulang sesudah verifikasi",
    ]);
    await source.query("UPDATE \"user\" SET name='Nama baru' WHERE id='actor'");
    expect(
      (await getAttendanceHistory(classId, date, source, clock)).events.every(
        (event) => event.actor.name === actor.name,
      ),
    ).toBe(true);
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 4 });
  });
  it("denies teacher void and historical corrections, requires void reason and preserves a no-op audit", async () => {
    await save();
    const admin = { ...actor, role: "admin" as const };
    await expect(
      voidAttendance(
        classId,
        "2026-10-06",
        { expectedVersion: 1, reason: "Batal" },
        actor,
        randomUUID(),
        { source, clock },
      ),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(
      voidAttendance(
        classId,
        "2026-10-06",
        { expectedVersion: 1, reason: " " },
        admin,
        randomUUID(),
        { source, clock },
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(await save(input("H", 1, "Tidak ada perubahan"))).toMatchObject({
      changed: false,
      sessionVersion: 1,
    });
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 1 });
    await source.query("UPDATE academic_years SET is_current=false");
    await expect(save(input("S", 1, "Tahun lama"))).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await save(input("S", 1, "Perbaikan admin tahun lama"), "2026-10-06", admin);
    expect((await getAttendanceHistory(classId, "2026-10-06", source, clock)).events).toHaveLength(
      2,
    );
    await voidAttendance(
      classId,
      "2026-10-06",
      { expectedVersion: 2, reason: "Batal tahun lama" },
      admin,
      randomUUID(),
      { source, clock },
    );
  });
  it("serializes correction against void and rolls back deletion plus audit on SQL failure", async () => {
    await save();
    const admin = { ...actor, role: "admin" as const };
    const attempts = await Promise.allSettled([
      save(input("I", 1, "Koreksi bersamaan")),
      voidAttendance(
        classId,
        "2026-10-06",
        { expectedVersion: 1, reason: "Batal bersamaan" },
        admin,
        randomUUID(),
        { source, clock },
      ),
    ]);
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attempts.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
    const view = await getAttendance(classId, "2026-10-06", source, clock);
    if (view.sessionState === "voided") await save(input("I", view.sessionVersion, "Isi ulang"));
    const before = await getAttendance(classId, "2026-10-06", source, clock);
    const beforeCounts = await counts();
    await source.query(
      "CREATE FUNCTION reject_void() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='voided' THEN RAISE EXCEPTION 'synthetic rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_void BEFORE UPDATE ON attendance_sessions FOR EACH ROW EXECUTE FUNCTION reject_void()",
    );
    try {
      await expect(
        voidAttendance(
          classId,
          "2026-10-06",
          { expectedVersion: before.sessionVersion, reason: "Uji rollback" },
          admin,
          randomUUID(),
          { source, clock },
        ),
      ).rejects.toMatchObject({ code: "P0001" });
      expect(await getAttendance(classId, "2026-10-06", source, clock)).toEqual(before);
      expect(await counts()).toEqual(beforeCounts);
    } finally {
      await source.query(
        "DROP TRIGGER reject_void ON attendance_sessions; DROP FUNCTION reject_void()",
      );
    }
  });
  it("reads historical enrollments without writes or default H and reads saved metadata", async () => {
    await source.query("UPDATE students SET archived_at=now()");
    const initial = await getAttendance(classId, "2026-10-06", source, clock);
    expect(initial.students.map((s) => s.status)).toEqual([null, null]);
    expect(initial.students).toHaveLength(2);
    expect(initial.sessionVersion).toBeNull();
    await getDashboard(actor, "2026-10-06", source, clock);
    expect(await counts()).toEqual({ sessions: 0, records: 0, audits: 0 });
    await save();
    expect(await getAttendance(classId, "2026-10-06", source, clock)).toMatchObject({
      sessionVersion: 1,
      sessionState: "submitted",
      submittedBy: { id: actor.id, name: actor.name },
      totals: { H: 2, S: 0, I: 0, A: 0 },
    });
  });
  it.each([
    ["future", "2026-10-08", "FUTURE_DATE"],
    ["holiday", "2026-10-10", "HOLIDAY"],
    ["outside", "2025-12-31", "OUTSIDE_ACADEMIC_YEAR"],
    ["invalid", "2026-02-31", "INVALID_INPUT"],
  ])("rejects %s dates", async (_, date, code) => {
    await expect(save(input(), date)).rejects.toMatchObject({ code });
    expect(await counts()).toEqual({ sessions: 0, records: 0, audits: 0 });
  });
  it.each(["config", "weekdays", "timezone", "empty"])(
    "rejects incomplete %s setup/roster",
    async (kind) => {
      if (kind === "config") await source.query("UPDATE school_config SET configured_at=NULL");
      if (kind === "weekdays") await source.query("DELETE FROM school_weekdays");
      if (kind === "timezone")
        await source.query("UPDATE school_config SET timezone='Unknown/School'");
      if (kind === "empty") await source.query("DELETE FROM enrollments");
      await expect(save()).rejects.toMatchObject({
        code: kind === "empty" ? "EMPTY_ROSTER" : "SETUP_INCOMPLETE",
      });
      expect(await counts()).toEqual({ sessions: 0, records: 0, audits: 0 });
    },
  );
  it.each(["missing", "extra", "duplicate", "invalidstatus"])(
    "requires exact explicit roster: %s",
    async (kind) => {
      const data = input();
      if (kind === "missing") data.entries.pop();
      if (kind === "extra") data.entries.push({ enrollmentId: randomUUID(), status: "H" });
      if (kind === "duplicate") data.entries.push(data.entries[0]);
      if (kind === "invalidstatus") Object.assign(data.entries[0], { status: null });
      await expect(save(data)).rejects.toMatchObject({
        code: ["duplicate", "invalidstatus"].includes(kind) ? "INVALID_INPUT" : "ROSTER_CHANGED",
      });
      expect(await counts()).toEqual({ sessions: 0, records: 0, audits: 0 });
    },
  );
  it("detects roster change between draft and save", async () => {
    const draft = input();
    await source.query("UPDATE enrollments SET ends_on_exclusive='2026-10-06' WHERE id=$1", [
      enrollments[0],
    ]);
    await expect(save(draft)).rejects.toMatchObject({ code: "ROSTER_CHANGED" });
  });
  it("serializes two simultaneous initial writers with different content", async () => {
    const results = await Promise.allSettled([save(input("H")), save(input("A"))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 1 });
  });
  it("serializes two simultaneous corrections and retains audit actor snapshot", async () => {
    await save();
    const results = await Promise.allSettled([
      save(input("A", 1, "Koreksi A")),
      save(input("S", 1, "Koreksi S")),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "VERSION_CONFLICT" },
    });
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 2 });
    await source.query(`UPDATE "user" SET name='Nama baru' WHERE id='actor'`);
    const audits = (await source.query("SELECT changes_json FROM audit_events")).rows;
    expect(audits.every((a) => a.changes_json.actorName === "Nama saat simpan")).toBe(true);
  });
  it("allows retry with stale version and no reason before conflict/reason checks", async () => {
    const first = await save();
    const retry = await save();
    expect(retry).toEqual({ ...first, changed: false });
    const corrected = await save(input("A", 1, "Perbaikan"));
    expect(await save(input("A", null))).toEqual({ ...corrected, changed: false });
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 2 });
    await expect(save(input("S", 2))).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("rolls back both initial save and changed correction after injected SQL failure", async () => {
    const fail = () =>
      saveAttendance(classId, "2026-10-06", input("A", null), actor, randomUUID(), {
        source,
        clock,
        afterRecords: async (client) => {
          await client.query("SELECT missing_column FROM attendance_records");
        },
      });
    await expect(fail()).rejects.toMatchObject({ code: "42703" });
    expect(await counts()).toEqual({ sessions: 0, records: 0, audits: 0 });
    await save();
    const before = await getAttendance(classId, "2026-10-06", source, clock);
    await expect(
      saveAttendance(classId, "2026-10-06", input("A", 1, "Koreksi"), actor, randomUUID(), {
        source,
        clock,
        afterRecords: async (client) => {
          await client.query("SELECT missing_column FROM attendance_records");
        },
      }),
    ).rejects.toMatchObject({ code: "42703" });
    expect(await getAttendance(classId, "2026-10-06", source, clock)).toEqual(before);
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 1 });
  });
  it("requires admin and reason for historical year; reason for voided resubmission", async () => {
    await source.query("UPDATE academic_years SET is_current=false");
    await expect(save()).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    const admin = { ...actor, role: "admin" as const };
    await expect(save(input(), "2026-10-06", admin)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await save(input("H", null, "Tahun lama"), "2026-10-06", admin);
    await source.query("DELETE FROM attendance_records");
    await source.query(
      "UPDATE attendance_sessions SET state='voided',version=2,void_reason='Batal'",
    );
    await expect(save(input("H", 2), "2026-10-06", admin)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(await save(input("H", 2, "Isi ulang"), "2026-10-06", admin)).toMatchObject({
      sessionVersion: 3,
      changed: true,
    });
  });
  it("dashboard sorts primary classes first and distinguishes holiday/empty/missing counts", async () => {
    const second = (
      await source.query(
        "INSERT INTO classes(academic_year_id,grade,name) VALUES($1,2,'Kelas 2') RETURNING id",
        [yearId],
      )
    ).rows[0].id;
    const teacher = (
      await source.query(
        "INSERT INTO teachers(user_id,full_name) VALUES('actor','Guru') RETURNING id",
      )
    ).rows[0].id;
    await source.query("INSERT INTO teacher_classes VALUES($1,$2)", [teacher, second]);
    const dashboard = await getDashboard(
      { ...actor, teacherId: teacher },
      "2026-10-06",
      source,
      clock,
    );
    expect(dashboard.classes.map((c) => c.classId)).toEqual([second, classId]);
    expect(dashboard.classes.map((c) => c.state)).toEqual(["empty", "not_recorded"]);
    expect(dashboard.classes.map((c) => c.presentCount)).toEqual([null, null]);
    await save(input("S"));
    expect((await getDashboard(actor, "2026-10-06", source, clock)).classes[0]).toMatchObject({
      state: "submitted",
      presentCount: 0,
      totals: { H: 0, S: 2, I: 0, A: 0 },
    });
    const holiday = await getDashboard(actor, "2026-10-10", source, clock);
    expect(
      holiday.classes.every(
        (c) => c.state === "holiday" && c.totals === null && c.presentCount === null,
      ),
    ).toBe(true);
  });
  it.each([
    ["Asia/Kuala_Lumpur", "2026-10-06T15:59:59Z", "2026-10-06T16:00:00Z"],
    ["America/New_York", "2026-10-07T03:59:59Z", "2026-10-07T04:00:00Z"],
  ])(
    "reads PostgreSQL school timezone %s at midnight before validating date",
    async (timezone, before, after) => {
      await source.query("UPDATE school_config SET timezone=$1", [timezone]);
      await expect(
        saveAttendance(classId, "2026-10-07", input(), actor, randomUUID(), {
          source,
          clock: () => new Date(before),
        }),
      ).rejects.toMatchObject({ code: "FUTURE_DATE" });
      expect(await counts()).toEqual({ sessions: 0, records: 0, audits: 0 });
      expect(
        await saveAttendance(classId, "2026-10-07", input(), actor, randomUUID(), {
          source,
          clock: () => new Date(after),
        }),
      ).toMatchObject({ changed: true, sessionVersion: 1 });
    },
  );
  it("same concurrent content returns actual writer metadata with one audit", async () => {
    await source.query(
      `INSERT INTO "user"(id,name,email,role) VALUES('actor2','Guru lain','actor2@example.test','teacher')`,
    );
    const other = { ...actor, id: "actor2", name: "Guru lain" };
    const results = await Promise.all([
      save(input(), "2026-10-06", actor),
      save(input(), "2026-10-06", other),
    ]);
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect(results[0].submittedBy).toEqual(results[1].submittedBy);
    expect(results[0].submittedAt).toEqual(results[1].submittedAt);
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 1 });
  });
  it("retries deadlocks after rollback and bounds repeated failure", async () => {
    let attempts = 0;
    const retried = await saveAttendance(classId, "2026-10-06", input(), actor, randomUUID(), {
      source,
      clock,
      afterRecords: async (client) => {
        if (++attempts === 1)
          await client.query(
            `DO $$ BEGIN RAISE EXCEPTION 'synthetic deadlock' USING ERRCODE='40P01'; END $$`,
          );
      },
    });
    expect(retried.changed).toBe(true);
    expect(attempts).toBe(2);
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 1 });
    attempts = 0;
    await expect(
      saveAttendance(classId, "2026-10-06", input("S", 1, "Perbaikan"), actor, randomUUID(), {
        source,
        clock,
        afterRecords: async (client) => {
          attempts++;
          await client.query(
            `DO $$ BEGIN RAISE EXCEPTION 'synthetic deadlock' USING ERRCODE='40P01'; END $$`,
          );
        },
      }),
    ).rejects.toMatchObject({ code: "40P01" });
    expect(attempts).toBe(3);
    expect(await counts()).toEqual({ sessions: 1, records: 2, audits: 1 });
  });
  it("enforces holiday overrides and extra school days with shared resolver", async () => {
    await source.query("INSERT INTO school_day_overrides VALUES($1,'2026-10-06',false,'Libur')", [
      yearId,
    ]);
    expect((await getAttendance(classId, "2026-10-06", source, clock)).calendarReason).toBe(
      "Libur",
    );
    await expect(save()).rejects.toMatchObject({ code: "HOLIDAY" });
    await source.query("INSERT INTO school_day_overrides VALUES($1,'2026-10-03',true,'Tambahan')", [
      yearId,
    ]);
    expect(await save(input(), "2026-10-03")).toMatchObject({ changed: true });
  });
});
