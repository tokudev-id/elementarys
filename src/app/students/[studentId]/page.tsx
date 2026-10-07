import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getStudent } from "@/server/services/students";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StudentForm } from "../form";
export default async function Student({ params }: { params: Promise<{ studentId: string }> }) {
  const actor = await requirePageActor();
  const student = await getStudent((await params).studentId);
  const settings = await getSchoolSettings();
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/students">
      <Link href="/students">Kembali ke siswa</Link>
      <h1>{student.fullName}</h1>
      <p>
        {student.studentCode} · NIS {student.nis ?? "belum diisi"} · NISN{" "}
        {student.nisn ?? "belum diisi"}
      </p>
      {actor.role === "admin" && <StudentForm current={student} today="" />}
      <h2>Riwayat penempatan</h2>
      <ul className="resource-list">
        {student.enrollments.map((item) => (
          <li key={item.id}>
            <strong>
              {item.className} · {item.yearLabel}
            </strong>
            <p>
              {item.startsOn} sampai sebelum {item.endsOnExclusive}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
