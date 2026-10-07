import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { listAcademicYears, listClasses } from "@/server/services/school-master";
import { promotionCandidates } from "@/server/services/enrollments";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { PromotionForm } from "./form";
export default async function Promote({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  const classes = await listClasses();
  const years = await listAcademicYears();
  const selected = (await searchParams).classId ?? classes[0]?.id;
  const students = actor.role === "admin" && selected ? await promotionCandidates(selected) : [];
  return (
    <AppShell actor={actor} school={schoolIdentity(settings)} currentPath="/students">
      <Link href="/students">Kembali ke siswa</Link>
      <h1>Naik kelas atau penempatan tahun berikutnya</h1>
      {actor.role !== "admin" ? (
        <StateBanner state="error">Penempatan siswa hanya dapat diubah admin.</StateBanner>
      ) : (
        <>
          <form className="filter-form" action="/students/promote">
            <SelectField label="Kelas asal batch" name="classId" defaultValue={selected} required>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {years.find((year) => year.id === item.yearId)?.label} / {item.name}
                </option>
              ))}
            </SelectField>
            <Button type="submit">Pilih kelas asal</Button>
          </form>
          <p>Daftar memuat siswa yang penempatannya mencapai akhir tahun kelas asal.</p>
          {students.length ? (
            <PromotionForm key={selected} students={students} classes={classes} years={years} />
          ) : (
            <StateBanner state="empty">
              Tidak ada siswa yang dapat dipilih dari kelas asal ini.
            </StateBanner>
          )}
        </>
      )}
    </AppShell>
  );
}
