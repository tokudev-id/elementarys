import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { schoolToday } from "../../domain/calendar";
import type { AttendanceStatus } from "../../domain/attendance";
import type { Actor } from "../auth/guards";
import { saveAttendance } from "../services/attendance/save";
import { audit, transaction } from "./pool";
import { assertLocalTestDatabase } from "./safety";
import { seedTestDatabase } from "./seed";

const studentNames = [
  "Ahmad Fauzan",
  "Aisyah Putri",
  "Alif Ramadhan",
  "Anindya Salsabila",
  "Arga Pratama",
  "Aulia Rahma",
  "Bagas Saputra",
  "Citra Maharani",
  "Daffa Maulana",
  "Dinda Amelia",
  "Fajar Hidayat",
  "Farah Nabila",
  "Fikri Firmansyah",
  "Gita Permatasari",
  "Hafiz Ibrahim",
  "Hana Safitri",
  "Ilham Akbar",
  "Intan Puspita",
  "Iqbal Setiawan",
  "Jihan Zahra",
  "Kirana Ayu",
  "Luthfi Hakim",
  "Maya Kartika",
  "Muhammad Rizky",
  "Nadia Azzahra",
  "Naufal Aditya",
  "Nayla Khairunnisa",
  "Nisa Fitriani",
  "Rafi Alfarizi",
  "Rara Anggraini",
  "Reza Kurniawan",
  "Rina Wulandari",
  "Rizwan Saputra",
  "Salma Hanifah",
  "Satria Mahendra",
  "Shafa Azzahra",
  "Syifa Humaira",
  "Taufik Hidayat",
  "Tiara Anjani",
  "Umar Faruq",
  "Vania Maharani",
  "Wahyu Nugroho",
  "Yasmin Aulia",
  "Yusuf Maulana",
  "Zahra Amalia",
  "Zaki Prasetyo",
  "Adelia Putri",
  "Akmal Fadhilah",
  "Amanda Larasati",
  "Arya Wibowo",
  "Bima Prakoso",
  "Dea Anggraini",
  "Eka Saputri",
  "Farhan Rasyid",
  "Felicia Andini",
  "Galih Pamungkas",
  "Keisha Ramadhani",
  "Kevin Adiputra",
  "Nadira Salshabila",
  "Putra Wijaya",
];

export const demoAccounts = {
  admin: { name: "Dewi Lestari", email: "dewi.lestari@sdharapan.example" },
  teacher: { name: "Budi Santoso", email: "budi.santoso@sdharapan.example" },
} as const;

function previousSchoolDays(today: string, startsOn: string) {
  const dates: string[] = [];
  const cursor = new Date(`${today}T00:00:00Z`);
  while (dates.length < 10) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const date = cursor.toISOString().slice(0, 10);
    if (date < startsOn) break;
    if (cursor.getUTCDay() >= 1 && cursor.getUTCDay() <= 5) dates.push(date);
  }
  return dates.reverse();
}

function demoStatus(studentIndex: number, dayIndex: number): AttendanceStatus {
  const offset = (studentIndex + dayIndex) % 13;
  if (offset === 0) return "S";
  if (offset === 1) return "I";
  if (offset === 2) return "A";
  return "H";
}

export async function seedDemoDatabase(url: string, password: string) {
  assertLocalTestDatabase(url);
  const seed = await seedTestDatabase(url, password, "test", { pilot: true });
  const source = new Pool({ connectionString: url, max: 3 });
  const today = schoolToday("Asia/Jakarta");
  const startYear = Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 7 ? 1 : 0);
  const startsOn = `${startYear}-07-01`;
  const endsOn = `${startYear + 1}-07-01`;
  try {
    await transaction(async (client) => {
      await client.query(
        "UPDATE school_config SET name='SD Harapan Bangsa (data sintetis)',location='Jakarta',timezone='Asia/Jakarta',configured_at=now()",
      );
      await client.query(
        "UPDATE academic_years SET label=$1,starts_on=$2,ends_on_exclusive=$3 WHERE id=$4",
        [`${startYear}/${startYear + 1}`, startsOn, endsOn, seed.yearId],
      );
      await client.query("UPDATE enrollments SET starts_on=$1,ends_on_exclusive=$2", [
        startsOn,
        endsOn,
      ]);
      await client.query("UPDATE classes SET name='Kelas '||grade||' A'");
      const students = await client.query<{ id: string }>(
        "SELECT id FROM students ORDER BY student_code",
      );
      if (students.rows.length !== studentNames.length)
        throw new Error("Jumlah siswa seed simulasi tidak sesuai.");
      for (const [index, student] of students.rows.entries()) {
        await client.query("UPDATE students SET full_name=$2,nis=$3 WHERE id=$1", [
          student.id,
          studentNames[index],
          `${startYear}${String(index + 1).padStart(3, "0")}`,
        ]);
      }
      for (const [id, account] of [
        [seed.adminId, demoAccounts.admin],
        [seed.teacherId, demoAccounts.teacher],
      ] as const) {
        await client.query('UPDATE "user" SET name=$2,email=$3 WHERE id=$1', [
          id,
          account.name,
          account.email,
        ]);
        await client.query("UPDATE teachers SET full_name=$2 WHERE user_id=$1", [id, account.name]);
      }
      await audit(
        client,
        seed.adminId,
        "school.demo_seed",
        "school_config",
        "1",
        randomUUID(),
        {
          actorName: demoAccounts.admin.name,
          before: null,
          after: { synthetic: true, classes: 6, students: studentNames.length },
        },
        "Data simulasi untuk uji manual lokal, bukan data sekolah nyata.",
      );
    }, source);

    const teachers = await source.query<{
      id: string;
      userId: string;
      name: string;
      role: Actor["role"];
    }>('SELECT t.id,u.id "userId",u.name,u.role FROM teachers t JOIN "user" u ON u.id=t.user_id');
    const dates = previousSchoolDays(today, startsOn);
    for (const [classIndex, classId] of seed.classIds.entries()) {
      const teacher = teachers.rows.find(
        (item) => item.role === (classIndex < 3 ? "admin" : "teacher"),
      );
      if (!teacher) throw new Error("Akun pencatat simulasi tidak tersedia.");
      const actor: Actor = {
        id: teacher.userId,
        name: teacher.name,
        role: teacher.role,
        teacherId: teacher.id,
        mustChangePassword: false,
      };
      const enrollments = await source.query<{ id: string }>(
        "SELECT e.id FROM enrollments e JOIN students s ON s.id=e.student_id WHERE e.class_id=$1 ORDER BY s.student_code",
        [classId],
      );
      for (const [dayIndex, date] of dates.entries()) {
        await saveAttendance(
          classId,
          date,
          {
            expectedVersion: null,
            entries: enrollments.rows.map((item, index) => ({
              enrollmentId: item.id,
              status: demoStatus(index, dayIndex),
            })),
            reason: "Riwayat simulasi untuk uji manual lokal.",
          },
          actor,
          randomUUID(),
          { source },
        );
      }
    }
    return {
      classes: seed.classIds.length,
      students: studentNames.length,
      recordedDays: dates.length,
    };
  } finally {
    await source.end();
  }
}
