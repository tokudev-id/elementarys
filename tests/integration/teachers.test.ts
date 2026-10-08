import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { createAuth } from "../../src/server/auth/factory";
import { createManagedAccount } from "../../src/server/auth/accounts";
import { requireActor, type Actor } from "../../src/server/auth/guards";
import {
  createTeacher,
  updateTeacher,
  listTeacherOptions,
  linkTeacherAccount,
  assignTeacherClasses,
  updateAccountAccess,
  resetAccountPassword,
  type TeacherOptions,
} from "../../src/server/services/teachers";
import { getAttendance } from "../../src/server/queries/attendance";
import { saveAttendance } from "../../src/server/services/attendance/save";

let source: Pool;
let actor: Actor;
let auth: ReturnType<typeof createAuth>;
let options: TeacherOptions;
let adminHeaders: Headers;
let teacherHeaders: Headers;
let teacherProfile: string;
let adminProfile: string;
let teacherId: string;
let classId: string;
const password = randomUUID();
function cookieHeaders(response: Response) {
  return new Headers({
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
    origin: "http://localhost:3101",
  });
}
beforeAll(async () => {
  source = (await createTestDatabase("teachers")).pool;
}, 30000);
afterAll(async () => {
  await source?.end();
});
beforeEach(async () => {
  await resetDatabase(source);
  const seed = await seedTestDatabase(String(source.options.connectionString), password, "test");
  teacherId = seed.teacherId;
  classId = seed.classId;
  options = { source, authConfig: { secret: randomUUID(), baseURL: "http://localhost:3101" } };
  auth = createAuth(source, options.authConfig!.secret, options.authConfig!.baseURL);
  adminHeaders = cookieHeaders(
    await auth.api.signInEmail({
      body: { email: "admin@example.test", password },
      asResponse: true,
    }),
  );
  teacherHeaders = cookieHeaders(
    await auth.api.signInEmail({
      body: { email: "guru@example.test", password },
      asResponse: true,
    }),
  );
  actor = await requireActor(adminHeaders, { admin: true }, source, auth);
  adminProfile = (await source.query("SELECT id FROM teachers WHERE user_id=$1", [actor.id]))
    .rows[0].id;
  teacherProfile = (await source.query("SELECT id FROM teachers WHERE user_id=$1", [teacherId]))
    .rows[0].id;
});
it("permits profiles without accounts, links an existing account once, and hides account fields from teacher readers", async () => {
  const profile = await createTeacher(
    { fullName: "Guru Tanpa Akun", active: true },
    actor,
    randomUUID(),
    source,
  );
  expect(
    (await listTeacherOptions(actor, source)).find((item) => item.id === profile.id)?.hasAccount,
  ).toBe(false);
  const account = await createManagedAccount(auth, {
    email: "linked@example.test",
    name: "Guru Akun",
    password,
    role: "teacher",
    mustChangePassword: false,
  });
  const headers = cookieHeaders(
    await auth.api.signInEmail({
      body: { email: "linked@example.test", password },
      asResponse: true,
    }),
  );
  await expect(requireActor(headers, {}, source, auth)).rejects.toMatchObject({
    code: "ACCESS_DENIED",
  });
  await linkTeacherAccount(
    profile.id,
    { mode: "existing", expectedVersion: 1, userId: account.user.id },
    actor,
    randomUUID(),
    options,
  );
  expect((await requireActor(headers, {}, source, auth)).teacherId).toBe(profile.id);
  const other = await createTeacher(
    { fullName: "Guru Lain", active: true },
    actor,
    randomUUID(),
    source,
  );
  await expect(
    linkTeacherAccount(
      other.id,
      { mode: "existing", expectedVersion: 1, userId: account.user.id },
      actor,
      randomUUID(),
      options,
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  const reader = await requireActor(teacherHeaders, {}, source, auth);
  expect((await listTeacherOptions(reader, source)).every((item) => item.account === null)).toBe(
    true,
  );
});
it("account creation and linking use one transaction; a real SQL failure leaves no user or credential account", async () => {
  const profile = await createTeacher(
    { fullName: "Guru Gagal Taut", active: true },
    actor,
    randomUUID(),
    source,
  );
  const before = (await source.query('SELECT count(*)::int n FROM "user"')).rows[0].n;
  await source.query(
    "CREATE FUNCTION reject_teacher_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic link failure' USING ERRCODE='23514'; END $$",
  );
  await source.query(
    "CREATE TRIGGER reject_teacher_link BEFORE UPDATE OF user_id ON teachers FOR EACH ROW EXECUTE FUNCTION reject_teacher_link()",
  );
  try {
    await expect(
      linkTeacherAccount(
        profile.id,
        {
          mode: "create",
          expectedVersion: 1,
          email: "failed@example.test",
          password,
          role: "teacher",
        },
        actor,
        randomUUID(),
        options,
      ),
    ).rejects.toThrow();
    expect((await source.query('SELECT count(*)::int n FROM "user"')).rows[0].n).toBe(before);
    expect(
      (
        await source.query(
          'SELECT count(*)::int n FROM account WHERE user_id NOT IN (SELECT id FROM "user")',
        )
      ).rows[0].n,
    ).toBe(0);
  } finally {
    await source.query("DROP TRIGGER reject_teacher_link ON teachers");
    await source.query("DROP FUNCTION reject_teacher_link()");
  }
});
it("reset uses the library, revokes old sessions, requires password change and never audits the password", async () => {
  const temporary = randomUUID();
  await resetAccountPassword(
    teacherId,
    { expectedVersion: 1, newPassword: temporary },
    actor,
    adminHeaders,
    randomUUID(),
    options,
  );
  await expect(requireActor(teacherHeaders, {}, source, auth)).rejects.toMatchObject({
    code: "SESSION_EXPIRED",
  });
  const updated = cookieHeaders(
    await auth.api.signInEmail({
      body: { email: "guru@example.test", password: temporary },
      asResponse: true,
    }),
  );
  await expect(requireActor(updated, {}, source, auth)).rejects.toMatchObject({
    code: "PASSWORD_CHANGE_REQUIRED",
  });
  expect(
    (await requireActor(updated, { allowPasswordChange: true }, source, auth)).mustChangePassword,
  ).toBe(true);
  expect(
    JSON.stringify((await source.query("SELECT changes_json FROM audit_events")).rows),
  ).not.toContain(temporary);
});
it("all archive, demotion and disable paths protect the last operational admin", async () => {
  await expect(
    updateTeacher(
      adminProfile,
      { fullName: actor.name, active: false, expectedVersion: 1 },
      actor,
      randomUUID(),
      source,
    ),
  ).rejects.toMatchObject({ code: "LAST_ACTIVE_ADMIN" });
  for (const value of [
    { role: "teacher", banned: false },
    { role: "admin", banned: true },
  ])
    await expect(
      updateAccountAccess(
        actor.id,
        { expectedVersion: 1, expectedRole: "admin", expectedBanned: false, ...value },
        actor,
        randomUUID(),
        source,
      ),
    ).rejects.toMatchObject({ code: "LAST_ACTIVE_ADMIN" });
  expect((await requireActor(adminHeaders, { admin: true }, source, auth)).role).toBe("admin");
});
it("concurrent admin archival leaves one active admin and profile archival immediately denies the teacher's old session", async () => {
  const profile = await createTeacher(
    { fullName: "Admin Kedua", active: true },
    actor,
    randomUUID(),
    source,
  );
  await linkTeacherAccount(
    profile.id,
    {
      mode: "create",
      expectedVersion: 1,
      email: "second-admin@example.test",
      password,
      role: "admin",
    },
    actor,
    randomUUID(),
    options,
  );
  await source.query(
    "UPDATE \"user\" SET must_change_password=false WHERE email='second-admin@example.test'",
  );
  const outcomes = await Promise.allSettled([
    updateTeacher(
      adminProfile,
      { expectedVersion: 1, fullName: actor.name, active: false },
      actor,
      randomUUID(),
      source,
    ),
    updateTeacher(
      profile.id,
      { expectedVersion: 2, fullName: "Admin Kedua", active: false },
      actor,
      randomUUID(),
      source,
    ),
  ]);
  expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  expect(
    (
      await source.query(
        "SELECT count(*)::int n FROM \"user\" u JOIN teachers t ON t.user_id=u.id WHERE u.role='admin' AND NOT u.banned AND t.active",
      )
    ).rows[0].n,
  ).toBe(1);
});
it("teacher can submit a non-primary class and recorder name survives profile rename; archive revokes access", async () => {
  await assignTeacherClasses(
    teacherProfile,
    { expectedVersion: 1, classIds: [] },
    actor,
    randomUUID(),
    source,
  );
  const recorder = await requireActor(teacherHeaders, {}, source, auth);
  const clock = () => new Date("2026-10-07T04:00:00Z");
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
    recorder,
    randomUUID(),
    { source, clock },
  );
  await updateTeacher(
    teacherProfile,
    { expectedVersion: 2, fullName: "Nama Baru Guru", active: true },
    actor,
    randomUUID(),
    source,
  );
  expect((await getAttendance(classId, view.date, source, clock)).submittedBy?.name).toBe(
    recorder.name,
  );
  await updateTeacher(
    teacherProfile,
    { expectedVersion: 3, fullName: "Nama Baru Guru", active: false },
    actor,
    randomUUID(),
    source,
  );
  await expect(requireActor(teacherHeaders, {}, source, auth)).rejects.toMatchObject({
    code: "SESSION_EXPIRED",
  });
});

it("access changes revoke sessions, can restore access or promote another admin, and reject stale forms", async () => {
  const input = {
    expectedVersion: 1,
    expectedRole: "teacher",
    expectedBanned: false,
    role: "teacher",
    banned: true,
  };
  await updateAccountAccess(teacherId, input, actor, randomUUID(), source);
  await expect(requireActor(teacherHeaders, {}, source, auth)).rejects.toMatchObject({
    code: "SESSION_EXPIRED",
  });
  await expect(
    updateAccountAccess(teacherId, input, actor, randomUUID(), source),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await updateAccountAccess(
    teacherId,
    { ...input, expectedVersion: 2, expectedBanned: true, banned: false },
    actor,
    randomUUID(),
    source,
  );
  await updateAccountAccess(
    teacherId,
    { ...input, expectedVersion: 3, role: "admin", banned: false },
    actor,
    randomUUID(),
    source,
  );
  const headers = cookieHeaders(
    await auth.api.signInEmail({
      body: { email: "guru@example.test", password },
      asResponse: true,
    }),
  );
  expect((await requireActor(headers, { admin: true }, source, auth)).role).toBe("admin");
});
