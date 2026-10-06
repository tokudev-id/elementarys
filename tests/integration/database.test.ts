import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestDatabase, resetDatabase } from "./harness";
import { migrateDatabase } from "../../src/server/db/migrate";
import { transaction } from "../../src/server/db/pool";
import { seedTestDatabase } from "../../src/server/db/seed";

let source: Pool; let url: string;
let year: string; let classId: string; let student: string; let enrollment: string; let session: string;
beforeAll(async () => { const db=await createTestDatabase(); source=db.pool; url=db.url; }, 30000);
afterAll(async () => { await source?.end(); });
beforeEach(async () => {
  await resetDatabase(source);
  await source.query('INSERT INTO "user"(id,name,email) VALUES(\'actor\',\'Guru Contoh\',\'actor@example.test\')');
  await source.query("INSERT INTO school_config(name) VALUES('Sekolah Uji')");
  year=(await source.query("INSERT INTO academic_years(label,starts_on,ends_on_exclusive,is_current) VALUES('2026','2026-01-01','2027-01-01',true) RETURNING id")).rows[0].id;
  classId=(await source.query("INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,'Kelas 1') RETURNING id",[year])).rows[0].id;
  student=(await source.query("INSERT INTO students(student_code,full_name) VALUES('S-1','Siswa Contoh') RETURNING id")).rows[0].id;
  enrollment=(await source.query("INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2026-01-01','2027-01-01') RETURNING id",[student,classId])).rows[0].id;
  session=(await source.query("INSERT INTO attendance_sessions(class_id,date,state,submitted_by,submitted_at) VALUES($1,'2026-10-06','submitted','actor',now()) RETURNING id",[classId])).rows[0].id;
});

describe("integritas PostgreSQL 18", () => {
  it("migrasi dapat diulang tanpa drift", async () => {
    await migrateDatabase(url);
    expect((await source.query("SELECT count(*)::int n FROM drizzle.__drizzle_migrations")).rows[0].n).toBe(2);
    expect((await source.query("SHOW server_version")).rows[0].server_version).toMatch(/^18\./);
  });
  it("menolak overlap enrollment", async () => {
    await expect(source.query("INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2026-10-01','2027-01-01')",[student,classId])).rejects.toMatchObject({ code:"23P01" });
  });
  it("menolak sesi class/date ganda", async () => {
    await expect(source.query("INSERT INTO attendance_sessions(class_id,date,state,submitted_by,submitted_at) VALUES($1,'2026-10-06','submitted','actor',now())",[classId])).rejects.toMatchObject({code:"23505"});
  });
  it("menolak student/date ganda", async () => {
    await source.query("INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status) VALUES($1,$2,$3,'2026-10-06','H')",[session,enrollment,student]);
    await expect(source.query("INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status) VALUES($1,$2,$3,'2026-10-06','A')",[session,enrollment,student])).rejects.toMatchObject({code:"23505"});
  });
  it("menolak relasi student/date/class tidak cocok", async () => {
    const other=(await source.query("INSERT INTO students(student_code,full_name) VALUES('S-2','Siswa Lain') RETURNING id")).rows[0].id;
    await expect(source.query("INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status) VALUES($1,$2,$3,'2026-10-06','H')",[session,enrollment,other])).rejects.toMatchObject({code:"23514"});
    await expect(source.query("INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status) VALUES($1,$2,$3,'2026-10-07','H')",[session,enrollment,student])).rejects.toMatchObject({code:"23514"});
    const otherClass=(await source.query("INSERT INTO classes(academic_year_id,grade,name) VALUES($1,2,'Kelas 2') RETURNING id",[year])).rows[0].id;
    const otherSession=(await source.query("INSERT INTO attendance_sessions(class_id,date,state,submitted_by,submitted_at) VALUES($1,'2026-10-06','submitted','actor',now()) RETURNING id",[otherClass])).rows[0].id;
    await expect(source.query("INSERT INTO attendance_records(session_id,enrollment_id,student_id,date,status) VALUES($1,$2,$3,'2026-10-06','H')",[otherSession,enrollment,student])).rejects.toMatchObject({code:"23514"});
  });
  it("menolak config kedua dan dua current year", async () => {
    await expect(source.query("INSERT INTO school_config(id,name) VALUES(2,'Tidak Sah')")).rejects.toMatchObject({code:"23514"});
    await expect(source.query("INSERT INTO academic_years(label,starts_on,ends_on_exclusive,is_current) VALUES('2027','2027-01-01','2028-01-01',true)")).rejects.toMatchObject({code:"23505"});
  });
  it("client kembali dan rollback penuh saat error", async () => {
    await transaction(async client => { await client.query("UPDATE school_config SET version=2"); },source);
    await expect(transaction(async client => { await client.query("UPDATE school_config SET version=3"); throw new Error("gagal uji"); },source)).rejects.toThrow("gagal uji");
    expect((await source.query("SELECT version FROM school_config")).rows[0].version).toBe(2);
    expect(source.waitingCount).toBe(0); expect(source.idleCount).toBe(source.totalCount);
  });
  it("reset ditolak pada environment produksi tanpa menyentuh data", async () => {
    process.env.APP_ENV = "production";
    try { await expect(resetDatabase(source)).rejects.toThrow("database uji lokal"); }
    finally { process.env.APP_ENV = "test"; }
    expect((await source.query("SELECT count(*)::int n FROM students")).rows[0].n).toBe(1);
  });
  it("dua suffix berjalan bersamaan tanpa tercampur", async () => {
    const a=await createTestDatabase("isolasi_a"); const b=await createTestDatabase("isolasi_b");
    try {
      await a.pool.query("INSERT INTO school_config(name) VALUES('A')");
      expect((await b.pool.query("SELECT count(*)::int n FROM school_config")).rows[0].n).toBe(0);
      await Promise.all([a.pool.query("SELECT pg_sleep(0.02)"),b.pool.query("SELECT pg_sleep(0.02)")]);
    } finally { await a.pool.end(); await b.pool.end(); }
  },30000);
  it("seed library membuat 10 siswa, dua akun tertaut dan dua nama sama", async () => {
    await resetDatabase(source);
    await seedTestDatabase(url,"SyntheticTest123!","test");
    expect((await source.query("SELECT count(*)::int n FROM students")).rows[0].n).toBe(10);
    expect((await source.query("SELECT count(*)::int n FROM teachers WHERE user_id IS NOT NULL")).rows[0].n).toBe(2);
    expect((await source.query("SELECT count(*)::int n FROM students WHERE full_name='Siswa Contoh Nama Sama'")).rows[0].n).toBe(2);
    expect((await source.query("SELECT count(*)::int n FROM account WHERE password IS NOT NULL")).rows[0].n).toBe(2);
    await expect(seedTestDatabase(url,"unused","production")).rejects.toThrow();
  },30000);
});
