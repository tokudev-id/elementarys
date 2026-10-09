import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { listAcademicYears, listClassOptions } from "@/server/services/school-master";
import { getYearPreparation } from "@/server/queries/year-preparation";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { StatusBadge } from "@/components/status-badge";
import {
  DataCard,
  DataCardHeader,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ActivateYearForm } from "./activate-form";
export default async function Rollover({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string; page?: string }>;
}) {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  const years = await listAcademicYears();
  const selected = (await searchParams).yearId ?? years.find((year) => !year.archivedAt)?.id;
  const preparation =
    actor.role === "admin" && selected ? await getYearPreparation(selected) : null;
  const classes = preparation ? await listClassOptions() : [];
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
              <DataCard className="mb-6">
                <DataCardHeader>
                  <div className="data-card__title-group">
                    <h2 className="data-card__title">
                      {`Langkah persiapan ${preparation.year.label}`}
                    </h2>
                    <p className="data-card-subtitle text-muted-foreground text-sm">
                      {`${preparation.year.startsOn} sampai sebelum ${preparation.year.endsOnExclusive}`}
                    </p>
                  </div>
                </DataCardHeader>
                <DataCardContent>
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
                </DataCardContent>
              </DataCard>
              <DataCard id="daftar-kelas-persiapan">
                <DataCardHeader
                  title="Penempatan pada tahun yang disiapkan"
                  count={preparation.classes.length}
                />
                <DataCardContent>
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Nama kelas</th>
                          <th scope="col">Siswa dalam riwayat</th>
                          <th scope="col">
                            Penempatan efektif (&gt; {preparation.schoolToday})
                          </th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preparation.classes
                          .slice(
                            (Math.max(1, Number((await searchParams).page ?? 1) || 1) - 1) * 25,
                            Math.max(1, Number((await searchParams).page ?? 1) || 1) * 25,
                          )
                          .map((item) => (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td>{item.assigned} siswa</td>
                              <td>{item.openEnrollments} penempatan</td>
                              <td>
                                <StatusBadge tone={item.archivedAt ? "neutral" : "success"}>
                                  {item.archivedAt ? "Diarsipkan" : "Aktif"}
                                </StatusBadge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </DataCardContent>
                {preparation.classes.length > 25 && (
                  <DataCardFooter>
                    <DataTablePagination
                      total={preparation.classes.length}
                      page={Math.max(1, Number((await searchParams).page ?? 1) || 1)}
                      pageSize={25}
                      pathname="/academic-years/rollover"
                      query={{ yearId: selected ?? "" }}
                    />
                  </DataCardFooter>
                )}
              </DataCard>
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
