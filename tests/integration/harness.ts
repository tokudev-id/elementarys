import { Pool } from "pg";
import { migrateDatabase } from "../../src/server/db/migrate";
import { assertLocalTestDatabase } from "../../src/server/db/safety";

export async function createTestDatabase(suffix = process.env.TEST_DB_SUFFIX ?? "s1_02") {
  const worker = process.env.TEST_DB_SUFFIX;
  if(worker && suffix !== worker && !suffix.startsWith(worker+"_")) suffix = worker+"_"+suffix;
  if (!/^[a-z0-9_]+$/.test(suffix)) throw new Error("Suffix database tidak valid.");
  const url = new URL(process.env.TEST_DATABASE_ADMIN_URL ?? "postgresql://school_test@127.0.0.1:55433/postgres");
  url.pathname = `/elementary_test_${suffix}`;
  const name = assertLocalTestDatabase(url.toString(), process.env.APP_ENV ?? "test");
  const adminUrl = new URL(url); adminUrl.pathname = "/postgres";
  const admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally { await admin.end(); }
  await migrateDatabase(url.toString());
  return { url: url.toString(), pool: new Pool({ connectionString: url.toString(), max: 3 }) };
}

export async function resetDatabase(pool: Pool) {
  assertLocalTestDatabase(String(pool.options.connectionString), process.env.APP_ENV);
  await pool.query('TRUNCATE attendance_records,attendance_sessions,audit_events,report_exports,teacher_classes,teachers,enrollments,students,school_day_overrides,school_weekdays,classes,academic_years,school_config,"session",account,"verification","user",rate_limit CASCADE');
}
