import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { createAuth } from "../../src/server/auth/factory";
import { requireActor } from "../../src/server/auth/guards";
import { dispatchAuth } from "../../src/server/auth/dispatch";
import { changeAccountPassword } from "../../src/server/auth/password";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

let source: Pool;
let auth: ReturnType<typeof createAuth>;
let fixture: { adminId: string; teacherId: string };
const secret = "SyntheticAuthTestSecret-32CharactersOnly";
const baseURL = "http://localhost:3101";
beforeAll(async () => {
  const db = await createTestDatabase("s1_03");
  source = db.pool;
  fixture = await seedTestDatabase(db.url, "SyntheticTest123!", "test");
  auth = createAuth(source, secret, baseURL);
}, 30000);
afterAll(async () => {
  await source?.end();
});
beforeEach(async () => {
  await source.query('DELETE FROM "session"');
  await source.query("TRUNCATE rate_limit");
  await source.query('UPDATE "user" SET banned=false,must_change_password=false');
  await source.query("UPDATE teachers SET active=true");
});
function request(path: string, body: unknown = {}, origin = baseURL) {
  return new Request(baseURL + "/api/auth" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, "X-Forwarded-For": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}
async function login(email = "guru@example.test", password = "SyntheticTest123!") {
  const response = await dispatchAuth(
    request("/sign-in/email", { email, password }),
    auth,
    source,
    secret,
    baseURL,
  );
  const cookie = response.headers
    .getSetCookie()
    .map((s) => s.split(";")[0])
    .join("; ");
  return { response, headers: new Headers({ cookie, origin: baseURL }) };
}

it("login guru dan admin membaca role aktual", async () => {
  const guru = await login();
  expect(guru.response.status).toBe(200);
  expect((await requireActor(guru.headers, {}, source, auth)).role).toBe("teacher");
  const admin = await login("admin@example.test");
  expect(admin.response.status).toBe(200);
  expect((await requireActor(admin.headers, { admin: true }, source, auth)).role).toBe("admin");
});
it("sign-up dan seluruh jalur admin plugin publik ditolak", async () => {
  for (const path of [
    "/sign-up/email",
    "/admin/create-user",
    "/admin/ban-user",
    "/admin/set-role",
    "/admin/remove-user",
    "/admin/impersonate-user",
  ]) {
    expect(
      (
        await dispatchAuth(
          request(path, { email: "new@example.test", password: "SyntheticTest123!" }),
          auth,
          source,
          secret,
          baseURL,
        )
      ).status,
    ).toBe(403);
  }
});
it("guru tidak dapat memakai guard admin", async () => {
  const signed = await login();
  await expect(requireActor(signed.headers, { admin: true }, source, auth)).rejects.toMatchObject({
    code: "ACCESS_DENIED",
  });
});
it("role asing dan guru tanpa profil tidak memperoleh akses", async () => {
  const signed = await login();
  await source.query("UPDATE \"user\" SET role='user' WHERE id=$1", [fixture.teacherId]);
  await expect(requireActor(signed.headers, {}, source, auth)).rejects.toMatchObject({
    code: "ACCESS_DENIED",
  });
  await source.query("UPDATE \"user\" SET role='teacher' WHERE id=$1", [fixture.teacherId]);
  await source.query("UPDATE teachers SET user_id=NULL WHERE user_id=$1", [fixture.teacherId]);
  try {
    await expect(requireActor(signed.headers, {}, source, auth)).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
  } finally {
    await source.query("UPDATE teachers SET user_id=$1 WHERE full_name='Guru Contoh'", [
      fixture.teacherId,
    ]);
  }
});
it("sesi lama ditolak sesudah banned atau profil nonaktif", async () => {
  const signed = await login();
  await source.query('UPDATE "user" SET banned=true WHERE id=$1', [fixture.teacherId]);
  await expect(requireActor(signed.headers, {}, source, auth)).rejects.toThrow();
  await source.query('UPDATE "user" SET banned=false WHERE id=$1', [fixture.teacherId]);
  await source.query("UPDATE teachers SET active=false WHERE user_id=$1", [fixture.teacherId]);
  await expect(requireActor(signed.headers, {}, source, auth)).rejects.toThrow();
});
it("password sementara hanya mengizinkan guard perubahan password", async () => {
  const signed = await login();
  await source.query('UPDATE "user" SET must_change_password=true WHERE id=$1', [
    fixture.teacherId,
  ]);
  await expect(requireActor(signed.headers, {}, source, auth)).rejects.toMatchObject({
    code: "PASSWORD_CHANGE_REQUIRED",
  });
  expect(
    (await requireActor(signed.headers, { allowPasswordChange: true }, source, auth))
      .mustChangePassword,
  ).toBe(true);
});
it("rate limit login berulang tidak mengunci akun lain pada IP sama", async () => {
  for (let i = 0; i < 5; i++)
    expect((await login("guru@example.test", "WrongPassword123!")).response.status).toBe(401);
  expect((await login()).response.status).toBe(429);
  expect((await login("admin@example.test")).response.status).toBe(200);
  expect((await source.query("SELECT count(*)::int n FROM rate_limit")).rows[0].n).toBeGreaterThan(
    0,
  );
});
it("Origin asing ditolak sebelum autentikasi", async () => {
  expect(
    (
      await dispatchAuth(
        request(
          "/sign-in/email",
          { email: "guru@example.test", password: "SyntheticTest123!" },
          "https://untrusted.example",
        ),
        auth,
        source,
        secret,
        baseURL,
      )
    ).status,
  ).toBe(403);
});
it("perubahan password membersihkan flag hanya setelah credential berhasil", async () => {
  const signed = await login();
  await source.query('UPDATE "user" SET must_change_password=true WHERE id=$1', [
    fixture.teacherId,
  ]);
  await expect(
    changeAccountPassword(
      signed.headers,
      { currentPassword: "WrongPassword123!", newPassword: "FreshSynthetic123!" },
      source,
      auth,
    ),
  ).rejects.toThrow();
  expect(
    (await source.query('SELECT must_change_password FROM "user" WHERE id=$1', [fixture.teacherId]))
      .rows[0].must_change_password,
  ).toBe(true);
  const changed = await changeAccountPassword(
    signed.headers,
    { currentPassword: "SyntheticTest123!", newPassword: "FreshSynthetic123!" },
    source,
    auth,
  );
  expect(
    (await source.query('SELECT must_change_password FROM "user" WHERE id=$1', [fixture.teacherId]))
      .rows[0].must_change_password,
  ).toBe(false);
  signed.headers.set(
    "cookie",
    changed.headers
      .getSetCookie()
      .map((s) => s.split(";")[0])
      .join("; "),
  );
  await changeAccountPassword(
    signed.headers,
    { currentPassword: "FreshSynthetic123!", newPassword: "SyntheticTest123!" },
    source,
    auth,
  );
});
it("bootstrap memakai environment tanpa mencetak password dan menolak bootstrap kedua", async () => {
  const db = await createTestDatabase("bootstrap");
  const password = "BootstrapSynthetic123!";
  const run = promisify(execFile);
  const env = {
    ...process.env,
    APP_ENV: "test",
    DATABASE_URL: db.url,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: baseURL,
    BOOTSTRAP_EMAIL: "bootstrap@example.test",
    BOOTSTRAP_NAME: "Operator Contoh",
    BOOTSTRAP_PASSWORD: password,
  };
  try {
    const result = await run(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", "scripts/bootstrap-admin.ts"],
      { env },
    );
    expect(result.stdout + result.stderr).not.toContain(password);
    expect((await db.pool.query('SELECT role,must_change_password FROM "user"')).rows[0]).toEqual({
      role: "admin",
      must_change_password: true,
    });
    const bootstrapAudit = (
      await db.pool.query("SELECT changes_json FROM audit_events WHERE action='user.bootstrap'")
    ).rows[0].changes_json;
    expect(bootstrapAudit).toMatchObject({
      before: null,
      after: { role: "admin", mustChangePassword: true },
    });
    expect(JSON.stringify(bootstrapAudit)).not.toContain(password);
    await expect(
      run(
        process.execPath,
        ["--conditions=react-server", "--import", "tsx", "scripts/bootstrap-admin.ts"],
        {
          env,
        },
      ),
    ).rejects.toThrow();
  } finally {
    await db.pool.end();
  }
}, 30000);

it("password change rolls back credential, session revocation and flag if audit SQL fails", async () => {
  const signed = await login();
  await source.query('UPDATE "user" SET must_change_password=true WHERE id=$1', [
    fixture.teacherId,
  ]);
  await source.query(
    "CREATE FUNCTION reject_password_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='user.password-change' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_password_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_password_audit()",
  );
  try {
    await expect(
      changeAccountPassword(
        signed.headers,
        { currentPassword: "SyntheticTest123!", newPassword: "NeverCommitted123!" },
        source,
        auth,
      ),
    ).rejects.toMatchObject({ code: "P0001" });
    expect(
      (await requireActor(signed.headers, { allowPasswordChange: true }, source, auth))
        .mustChangePassword,
    ).toBe(true);
    expect((await login()).response.status).toBe(200);
    expect((await login("guru@example.test", "NeverCommitted123!")).response.status).toBe(401);
  } finally {
    await source.query(
      "DROP TRIGGER reject_password_audit ON audit_events; DROP FUNCTION reject_password_audit()",
    );
  }
});
