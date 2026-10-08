import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, expect, it } from "vitest";
import { Pool } from "pg";
import {
  backup,
  backupStore,
  command,
  databaseEvidence,
  restore,
  retainThirty,
} from "../../scripts/backup/core";
import { createTestDatabase } from "./harness";
import { seedTestDatabase } from "../../src/server/db/seed";
import { createAuth } from "../../src/server/auth/factory";

let directory: string;
let source: Pool;
let url: string;
let identity: string;
let recipient: string;
const password = randomBytes(24).toString("base64url");
const suffix = `${process.env.TEST_DB_SUFFIX ?? "s2_e1"}_backup`;
const restoreUrl = `postgresql://school_test@127.0.0.1:55433/elementary_test_${suffix}_restored`;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "backup-drill-"));
  identity = join(directory, "identity.key");
  const keygen = process.env.AGE_KEYGEN_BIN ?? "age-keygen";
  await command(keygen, ["-o", identity]);
  recipient = (await command(keygen, ["-y", identity])).trim();
  process.env.BACKUP_ADAPTER = "local";
  process.env.BACKUP_TARGET = join(directory, "store");
  const database = await createTestDatabase(suffix);
  source = database.pool;
  url = database.url;
  await seedTestDatabase(url, password, "test");
  const user = (await source.query('SELECT id FROM "user" ORDER BY email LIMIT 1')).rows[0].id;
  const classId = (await source.query("SELECT id FROM classes LIMIT 1")).rows[0].id;
  const yearId = (await source.query("SELECT id FROM academic_years LIMIT 1")).rows[0].id;
  const session = (
    await source.query(
      "INSERT INTO attendance_sessions(class_id,date,state,submitted_by,submitted_at) VALUES($1,'2026-10-06','submitted',$2,now()) RETURNING id",
      [classId, user],
    )
  ).rows[0].id;
  await source.query(
    "INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status) SELECT $1,id,student_id,'2026-10-06',CASE WHEN row_number() OVER (ORDER BY id)=1 THEN 'A' ELSE 'H' END FROM enrollments",
    [session],
  );
  await source.query(
    "INSERT INTO audit_events(actor_id,action,entity_type,entity_id,request_id,changes_json) VALUES($1,'submit','attendance_session',$2,$3,'{\"synthetic\":true}')",
    [user, session, randomUUID()],
  );
  await source.query(
    "INSERT INTO report_exports(academic_year_id,month,class_id,format,session_versions,exported_by) VALUES($1,'2026-10-01',$2,'print','{}',$3)",
    [yearId, classId, user],
  );
  const auth = createAuth(source, randomBytes(32).toString("hex"), "http://localhost:3102");
  await auth.api.signInEmail({ body: { email: "admin@example.test", password } });
}, 30000);
afterAll(async () => {
  await source?.end();
  const admin = new Pool({ connectionString: "postgresql://school_test@127.0.0.1:55433/postgres" });
  try {
    for (const name of [`elementary_test_${suffix}`, `elementary_test_${suffix}_restored`])
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await admin.end();
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
it("encrypted full-database restore preserves domain/auth/audit/report, revokes sessions and permits fresh login", async () => {
  const before = await databaseEvidence(source);
  expect(before.counts.session).toBeGreaterThan(0);
  await rename(identity, `${identity}.offline`);
  let name: string;
  try {
    name = await backup(url, recipient, backupStore());
  } finally {
    await rename(`${identity}.offline`, identity);
  }
  const file = join(process.env.BACKUP_TARGET!, name);
  expect((await readFile(file)).subarray(0, 22).toString()).toContain("age-encryption.org/v1");
  expect(await readdir(process.env.BACKUP_TARGET!)).toEqual([name]);
  const result = await restore(file, identity, restoreUrl);
  expect(result.evidence).toEqual(before);
  expect(result.evidence.counts.students).toBe(10);
  expect(result.evidence.counts.audit_events).toBe(1);
  expect(result.evidence.counts.report_exports).toBe(1);
  expect(result.evidence.report).toHaveLength(10);
  expect(result.revokedSessions).toBe(before.counts.session);
  const restored = new Pool({ connectionString: restoreUrl });
  try {
    expect((await restored.query('SELECT count(*)::int AS n FROM "session"')).rows[0].n).toBe(0);
    const auth = createAuth(restored, randomBytes(32).toString("hex"), "http://localhost:3102");
    const login = await auth.api.signInEmail({ body: { email: "admin@example.test", password } });
    expect(login.user.email).toBe("admin@example.test");
    await expect(restore(file, identity, restoreUrl)).rejects.toThrow();
  } finally {
    await restored.end();
  }
}, 30000);
it("retention removes copy 31, preserves unrelated files and does not delete on upload failure", async () => {
  const names = Array.from(
    { length: 31 },
    (_, i) =>
      `school-2026-10-${String(i + 1).padStart(2, "0")}T00-00-00-000Z-${randomUUID()}.dump.age`,
  );
  const removed: string[] = [];
  await retainThirty({
    upload: async () => {},
    list: async () => [...names, "keep.txt"],
    remove: async (name) => {
      removed.push(name);
    },
  });
  expect(removed).toEqual([names[0]]);
  const store = backupStore();
  const existing = (await store.list())[0];
  const encrypted = await readFile(join(process.env.BACKUP_TARGET!, existing));
  await rm(join(process.env.BACKUP_TARGET!, existing));
  for (const name of names) await writeFile(join(process.env.BACKUP_TARGET!, name), encrypted);
  await writeFile(join(process.env.BACKUP_TARGET!, "keep.txt"), "unrelated");
  await retainThirty(store);
  const kept = await store.list();
  expect(kept).toHaveLength(31);
  expect(kept).not.toContain(names[0]);
  expect(kept).toContain("keep.txt");
  let listed = false;
  await expect(
    backup(url, recipient, {
      upload: async () => {
        throw new Error("upload failed");
      },
      list: async () => {
        listed = true;
        return names;
      },
      remove: async () => {},
    }),
  ).rejects.toThrow("upload failed");
  expect(listed).toBe(false);
});
it("CLI exits nonzero on backup, encryption, decryption and unsafe restore failure", async () => {
  await expect(backup(url, "invalid-recipient", backupStore())).rejects.toThrow();
  await expect(
    backup("postgresql://school_test@127.0.0.1:1/absent", recipient, backupStore()),
  ).rejects.toThrow();
  const broken = join(directory, "broken.age");
  await writeFile(broken, "invalid");
  await expect(restore(broken, identity, restoreUrl)).rejects.toThrow();
  await expect(
    restore(broken, identity, "postgresql://school_test@production.example/postgres"),
  ).rejects.toThrow();
  await expect(
    command(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/backup/backup.ts"]),
  ).rejects.toThrow();
  await expect(
    command(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/backup/restore.ts"]),
  ).rejects.toThrow();
}, 30000);
