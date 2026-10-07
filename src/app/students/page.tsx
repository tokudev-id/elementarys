import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { listStudents } from "@/server/services/students";
import { listAcademicYears, listClasses } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { StudentForm } from "./form";
export default async function Students({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; classId?: string }>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  const settings = await getSchoolSettings();
  const years = await listAcademicYears();
  const classes = await listClasses();
  const students = await listStudents({
    search: selected.search,
    classId: selected.classId || undefined,
  });
  const school = schoolIdentity(settings);
  return (
    <AppShell school={school} actor={actor} currentPath="/students">
      <h1>Siswa</h1>
      <form className="filter-form" action="/students">
        <Field
          label="Cari nama atau kode siswa"
          name="search"
          defaultValue={selected.search}
          maxLength={200}
        />
        <SelectField label="Filter kelas" name="classId" defaultValue={selected.classId ?? ""}>
          <option value="">Semua kelas</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <Button type="submit">Cari siswa</Button>
      </form>
      {actor.role === "admin" &&
        (classes.some((item) => !item.archivedAt) ? (
          <section>
            <h2>Tambah siswa</h2>
            <StudentForm classes={classes} years={years} today={school?.date ?? ""} />
          </section>
        ) : (
          <StateBanner state="empty">Tambahkan kelas sebelum memasukkan siswa.</StateBanner>
        ))}
      {!students.length && (
        <StateBanner state="empty">Tidak ada siswa yang cocok dengan filter ini.</StateBanner>
      )}
      <ul className="resource-list">
        {students.map((student) => (
          <li key={student.id}>
            <Link href={`/students/${student.id}`}>{student.fullName}</Link>
            <small>{student.studentCode}</small>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
