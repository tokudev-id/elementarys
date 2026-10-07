import { requirePageActor } from "@/server/auth/page-actor";
import { listAcademicYears, listClasses } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { ClassForm } from "./form";
export default async function Classes() {
  const actor = await requirePageActor();
  const years = await listAcademicYears();
  const classes = await listClasses();
  const settings = await getSchoolSettings();
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/classes">
      <h1>Kelas</h1>
      {actor.role === "admin" && years.some((year) => !year.archivedAt) && (
        <section>
          <h2>Tambah kelas</h2>
          <ClassForm years={years} />
        </section>
      )}
      {!classes.length && (
        <StateBanner state="empty">
          Belum ada kelas. Lengkapi tahun ajaran, lalu tambahkan kelas.
        </StateBanner>
      )}
      {classes.map((item) => (
        <section className="resource-section" key={item.id}>
          <h2>{item.name}</h2>
          <p>
            Tingkat {item.grade} · {years.find((year) => year.id === item.yearId)?.label}
            {item.archivedAt ? " · Diarsipkan" : ""}
          </p>
          {actor.role === "admin" && <ClassForm years={years} current={item} />}
        </section>
      ))}
    </AppShell>
  );
}
