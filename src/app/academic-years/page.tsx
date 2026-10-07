import { requirePageActor } from "@/server/auth/page-actor";
import { listAcademicYears } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { AcademicYearForm } from "./form";
export default async function AcademicYears() {
  const actor = await requirePageActor();
  const years = await listAcademicYears();
  const settings = await getSchoolSettings();
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/academic-years">
      <h1>Tahun ajaran</h1>
      {actor.role === "admin" && (
        <section>
          <h2>Tambah periode</h2>
          <AcademicYearForm />
        </section>
      )}
      {!years.length && (
        <StateBanner state="empty">
          Belum ada tahun ajaran. Admin perlu menambahkan periode belajar.
        </StateBanner>
      )}
      {years.map((year) => (
        <section className="resource-section" key={year.id}>
          <h2>{year.label}</h2>
          <p>
            {year.startsOn} sampai sebelum {year.endsOnExclusive} ·{" "}
            {year.isCurrent ? "Aktif" : "Tidak aktif"}
            {year.archivedAt ? " · Diarsipkan" : ""}
          </p>
          {actor.role === "admin" && <AcademicYearForm current={year} />}
        </section>
      ))}
    </AppShell>
  );
}
