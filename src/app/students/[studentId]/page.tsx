import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getStudent } from "@/server/services/students";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StudentForm } from "../form";
import { listAcademicYears, listClasses } from "@/server/services/school-master";
import { PlacementForm, EndEnrollmentForm, StudentArchiveForm } from "../lifecycle-forms";
export default async function Student({ params }: { params: Promise<{ studentId: string }> }) {
  const actor = await requirePageActor();
  const student = await getStudent((await params).studentId);
  const settings = await getSchoolSettings();
  const school = schoolIdentity(settings);
  const classes = actor.role === "admin" ? await listClasses() : [];
  const years = actor.role === "admin" ? await listAcademicYears() : [];
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/students">
      <Link href="/students">Kembali ke siswa</Link>
      <h1>{student.fullName}</h1>
      {student.archivedAt && <p>Siswa diarsipkan. Riwayat tetap tersedia.</p>}
      <p>
        {student.studentCode} · NIS {student.nis ?? "belum diisi"} · NISN{" "}
        {student.nisn ?? "belum diisi"}
      </p>
      {actor.role === "admin" && <StudentForm current={student} today="" />}
      {actor.role === "admin" && !student.archivedAt && (
        <PlacementForm
          student={student}
          classes={classes}
          years={years}
          today={school?.date ?? ""}
        />
      )}
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
            {item.cancelled && <p>Dibatalkan sebelum penempatan dimulai.</p>}
            {actor.role === "admin" &&
              !item.cancelled &&
              item.endsOnExclusive > (school?.date ?? "") && (
                <EndEnrollmentForm student={student} enrollment={item} today={school?.date ?? ""} />
              )}
          </li>
        ))}
      </ul>
      {actor.role === "admin" && <StudentArchiveForm student={student} />}
    </AppShell>
  );
}
