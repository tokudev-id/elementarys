import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { chmod, copyFile, mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { assertLocalTestDatabase } from "../../src/server/db/safety";

export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} wajib diisi.`);
  return value;
}
function child(binary: string, args: string[], env = process.env) {
  const processChild = spawn(binary, args, { env, stdio: ["pipe", "pipe", "ignore"] });
  const done = new Promise<void>((resolve, reject) => {
    processChild.on("error", () => reject(new Error(`${binary}: tidak dapat dijalankan.`)));
    processChild.on("close", code => code === 0 ? resolve() : reject(new Error(`${binary}: proses gagal.`)));
  });
  // Attach immediately so a failed subprocess never causes an unhandled rejection.
  void done.catch(() => {});
  return { processChild, done };
}
export async function command(binary: string, args: string[]) {
  const { processChild, done } = child(binary, args);
  processChild.stdin.end();
  let result = "";
  processChild.stdout.setEncoding("utf8");
  processChild.stdout.on("data", chunk => { result += chunk; });
  await done;
  return result;
}
function postgresEnv(url: string) {
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("URL PostgreSQL tidak valid.");
  return { ...process.env, PGHOST: parsed.hostname, PGPORT: parsed.port || "5432", PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)), PGUSER: decodeURIComponent(parsed.username), PGPASSWORD: decodeURIComponent(parsed.password), ...(parsed.searchParams.get("sslmode") ? { PGSSLMODE: parsed.searchParams.get("sslmode")! } : {}) };
}
function pgTool(name: string) { return process.env.PG_TOOL_DIR ? join(process.env.PG_TOOL_DIR, name) : name; }
const backupName = /^school-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9-]{36}\.dump\.age$/;
export interface BackupStore {
  upload(file: string, name: string): Promise<void>;
  list(): Promise<string[]>;
  remove(name: string): Promise<void>;
}
export function backupStore(): BackupStore {
  const target = required("BACKUP_TARGET");
  if (process.env.BACKUP_ADAPTER === "local") {
    return {
      async upload(file, name) {
        await mkdir(target, { recursive: true, mode: 0o700 });
        const pending = join(target, `.${name}.pending`);
        try { await copyFile(file, pending); await chmod(pending, 0o600); await rename(pending, join(target, name)); }
        finally { await rm(pending, { force: true }); }
      },
      async list() { return readdir(target); },
      async remove(name) { if (!backupName.test(name)) throw new Error("Nama backup tidak valid."); await rm(join(target, name)); },
    };
  }
  if (process.env.BACKUP_ADAPTER !== "rclone") throw new Error("BACKUP_ADAPTER harus local atau rclone.");
  const remote = (name: string) => `${target.replace(/\/$/, "")}/${name}`;
  return {
    async upload(file, name) { await command("rclone", ["copyto", file, remote(name)]); },
    async list() { return (await command("rclone", ["lsf", target, "--files-only", "--max-depth", "1"])).trim().split("\n"); },
    async remove(name) { if (!backupName.test(name)) throw new Error("Nama backup tidak valid."); await command("rclone", ["deletefile", remote(name)]); },
  };
}
export async function retainThirty(store: BackupStore) {
  const names = (await store.list()).filter(name => backupName.test(name)).sort().reverse();
  for (const name of names.slice(30)) await store.remove(name);
}
export async function backup(url: string, recipient: string, store: BackupStore) {
  const directory = await mkdtemp(join(tmpdir(), "school-backup-"));
  const name = `school-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.dump.age`;
  const file = join(directory, name);
  try {
    const dump = child(pgTool("pg_dump"), ["--format=custom", "--no-owner", "--no-acl"], postgresEnv(url));
    const encryption = child(process.env.AGE_BIN ?? "age", ["--encrypt", "--recipient", recipient]);
    await Promise.all([pipeline(dump.processChild.stdout, encryption.processChild.stdin), pipeline(encryption.processChild.stdout, createWriteStream(file, { mode: 0o600 })), dump.done, encryption.done]).catch(error => {
      dump.processChild.kill(); encryption.processChild.kill(); throw error;
    });
    await store.upload(file, name);
    await retainThirty(store);
    return name;
  } finally { await rm(directory, { recursive: true, force: true }); }
}
export async function databaseEvidence(pool: Pool) {
  const tables = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows as { tablename: string }[];
  const counts: Record<string, number> = {};
  const hashes: Record<string, string> = {};
  for (const { tablename } of tables) {
    const quoted = '"' + tablename.replaceAll('"', '""') + '"';
    const rows = (await pool.query(`SELECT row_to_json(t)::text AS row FROM ${quoted} t ORDER BY row_to_json(t)::text COLLATE "C"`)).rows;
    counts[tablename] = rows.length;
    hashes[tablename] = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  }
  const report = (await pool.query("SELECT student_id,date_trunc('month',date)::date::text AS month,status,count(*)::int AS total FROM attendance_records GROUP BY student_id,date_trunc('month',date),status ORDER BY student_id,month,status")).rows;
  return { counts, hashes, report };
}
export async function restore(file: string, identity: string, targetUrl: string) {
  const name = assertLocalTestDatabase(targetUrl, process.env.APP_ENV);
  const adminUrl = new URL(targetUrl); adminUrl.pathname = "/postgres";
  const admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
  const directory = await mkdtemp(join(tmpdir(), "school-restore-"));
  const dumpFile = join(directory, "restore.dump");
  try {
    const decryption = child(process.env.AGE_BIN ?? "age", ["--decrypt", "--identity", identity, file]);
    decryption.processChild.stdin.end();
    await Promise.all([pipeline(decryption.processChild.stdout, createWriteStream(dumpFile, { mode: 0o600 })), decryption.done]);
    // CREATE DATABASE fails when the target exists; never replace an existing database.
    await admin.query(`CREATE DATABASE "${name}"`);
    const restoration = child(pgTool("pg_restore"), ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "--dbname", name], postgresEnv(targetUrl));
    await Promise.all([pipeline(createReadStream(dumpFile), restoration.processChild.stdin), restoration.done]);
    const pool = new Pool({ connectionString: targetUrl, max: 1 });
    try {
      const evidence = await databaseEvidence(pool);
      const revoked = await pool.query('DELETE FROM "session"');
      return { evidence, revokedSessions: revoked.rowCount };
    } finally { await pool.end(); }
  } finally { await admin.end(); await rm(directory, { recursive: true, force: true }); }
}
