import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { listAcademicYears, listClasses } from "@/server/services/school-master";
import { getYearPreparation } from "@/server/queries/year-preparation";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { ActivateYearForm } from "./activate-form";
export default async function Rollover({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string }>;
}) {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  const years = await listAcademicYears();
  const selected = (await searchParams).yearId ?? years.find((year) => !year.archivedAt)?.id;
  const preparation =
    actor.role === "admin" && selected ? await getYearPreparation(selected) : null;
  const classes = preparation ? await listClasses() : [];
  return (
    <AppShell actor={actor} school={schoolIdentity(settings)} currentPath="/academic-years">
      <Link href="/academic-years">Kembali ke tahun ajaran</Link>
      <h1>Persiapan tahun ajaran</h1>
      {actor.role !== "admin" ? (
        <StateBanner state="error">Persiapan tahun ajaran dikelola admin.</StateBanner>
      ) : (
        <>
          <form className="filter-form" action="/academic-years/rollover">
            <SelectField label="Tahun yang disiapkan" name="yearId" defaultValue={selected}>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                  {year.archivedAt ? " / Arsip" : ""}
                </option>
              ))}
            </SelectField>
            <Button type="submit">Tampilkan persiapan</Button>
          </form>
          {!preparation ? (
            <StateBanner state="empty">
              Tambahkan tahun ajaran sebelum menyiapkan kelas dan kalender.
            </StateBanner>
          ) : (
            <>
              <h2>{preparation.year.label}</h2>
              <p>
                {preparation.year.startsOn} sampai sebelum {preparation.year.endsOnExclusive}
              </p>
              <ol className="resource-list">
                <li>
                  <h3>Identitas dan periode</h3>
                  <p>
                    {preparation.identityReady
                      ? "Identitas sekolah tersedia."
                      : "Lengkapi nama dan zona waktu sekolah."}
                  </p>
                  <Link href="/settings">Konfigurasi sekolah</Link> ·{" "}
                  <Link href="/academic-years">Buat atau edit periode</Link>
                </li>
                <li>
                  <h3>Kelas tahun ini</h3>
                  <p>
                    {preparation.classes.filter((item) => !item.archivedAt).length} kelas tersedia.
                  </p>
                  <Link href={`/classes?yearId=${selected}`}>Atur kelas</Link>
                </li>
                <li>
                  <h3>Kalender belajar</h3>
                  <p>
                    {preparation.weekdays
                      ? `${preparation.weekdays} hari rutin per minggu.`
                      : "Hari belajar belum diatur."}
                  </p>
                  <Link
                    href={`/calendar?yearId=${selected}&month=${preparation.year.startsOn.slice(0, 7)}`}
                  >
                    Atur kalender
                  </Link>
                </li>
                <li>
                  <h3>Penempatan siswa</h3>
                  <p>
                    Periksa tiap siswa lewat preview sebelum menyimpan batch ke tahun yang
                    disiapkan.
                  </p>
                  <form className="filter-form" action="/students/promote">
                    <input type="hidden" name="targetYearId" value={selected} />
                    <SelectField label="Kelas asal naik kelas" name="classId" required>
                      {classes
                        .filter((item) => item.yearId !== selected)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {years.find((year) => year.id === item.yearId)?.label} / {item.name}
                          </option>
                        ))}
                    </SelectField>
                    <Button type="submit">Buka preview naik kelas</Button>
                  </form>
                </li>
                <li>
                  <h3>Pindahkan tahun aktif</h3>
                  {!preparation.ready && (
                    <StateBanner state="empty">
                      Lengkapi identitas, kelas dan kalender sebelum mengaktifkan lewat alur ini.
                    </StateBanner>
                  )}
                  <ActivateYearForm preparation={preparation} />
                </li>
                <li>
                  <h3>Arsip setelah penempatan ditutup</h3>
                  <p>
                    Arsip kelas dan tahun lama ditolak selama masih ada penempatan efektif setelah
                    tanggal sekolah. Laporan lama tetap dapat dibaca dan diekspor.
                  </p>
                  <Link href="/classes">Periksa arsip kelas</Link> ·{" "}
                  <Link href="/academic-years">Periksa arsip tahun</Link>
                </li>
              </ol>
              <h2>Penempatan pada tahun yang disiapkan</h2>
              <ul className="resource-list">
                {preparation.classes.map((item) => (
                  <li key={item.id}>
                    {item.name} · {item.assigned} siswa dalam riwayat · {item.openEnrollments}{" "}
                    penempatan berakhir setelah {preparation.schoolToday}
                    {item.archivedAt ? " · Kelas diarsipkan" : ""}
                  </li>
                ))}
              </ul>
              <Link
                href={`/reports?yearId=${selected}&month=${preparation.year.startsOn.slice(0, 7)}`}
              >
                Baca atau ekspor rekap tahun ini
              </Link>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
