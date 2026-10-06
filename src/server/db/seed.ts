import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { createAuth } from "../auth/factory";
import { assertLocalTestDatabase } from "./safety";

export async function seedTestDatabase(url: string, password: string, env = process.env.APP_ENV) {
  assertLocalTestDatabase(url, env);
  const source = new Pool({ connectionString: url, max: 3 });
  const auth = createAuth(source, randomBytes(32).toString("hex"), "http://localhost:3101");
  try {
    const existing = await source.query('SELECT id FROM "user" LIMIT 1');
    if (existing.rowCount) throw new Error("Seed hanya untuk database kosong yang sudah dimigrasi.");
    const first = await auth.api.createUser({ body: { email: "admin@example.test", password, name: "Guru Admin Contoh", role: "admin" } });
    const second = await auth.api.createUser({ body: { email: "guru@example.test", password, name: "Guru Contoh", role: "teacher" } });
    const client = await source.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO school_config(name,location,configured_at) VALUES('Sekolah Contoh (data sintetis)','Lingkungan uji',now())");
      const year = (await client.query("INSERT INTO academic_years(label,starts_on,ends_on_exclusive,is_current) VALUES('2026/2027','2026-01-01','2027-01-01',true) RETURNING id")).rows[0].id;
      await client.query("INSERT INTO school_weekdays SELECT $1,generate_series(1,5)", [year]);
      const classId = (await client.query("INSERT INTO classes(academic_year_id,grade,name) VALUES($1,1,'Kelas 1 Contoh') RETURNING id", [year])).rows[0].id;
      for (let i=1; i<=10; i++) {
        const student = (await client.query("INSERT INTO students(student_code,full_name) VALUES('S-' || lpad(nextval('student_code_seq')::text,4,'0'),$1) RETURNING id", [i <= 2 ? "Siswa Contoh Nama Sama" : `Siswa Contoh ${i}`])).rows[0].id;
        await client.query("INSERT INTO enrollments(student_id,class_id,starts_on,ends_on_exclusive) VALUES($1,$2,'2026-01-01','2027-01-01')", [student,classId]);
      }
      for (const account of [first.user, second.user]) {
        const teacher = (await client.query("INSERT INTO teachers(user_id,full_name) VALUES($1,$2) RETURNING id", [account.id,account.name])).rows[0].id;
        await client.query("INSERT INTO teacher_classes(teacher_id,class_id) VALUES($1,$2)", [teacher,classId]);
      }
      await client.query("COMMIT");
      return { classId, yearId: year, adminId: first.user.id, teacherId: second.user.id };
    } catch(error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { await source.end(); }
}
