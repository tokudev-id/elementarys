import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { listAcademicYears, listClassOptions } from "@/server/services/school-master";
import { getYearPreparation } from "@/server/queries/year-preparation";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { StateBanner } from "@/components/state-banner";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { StatusBadge } from "@/components/status-badge";
import { DataCard, DataCardHeader, DataCardContent, DataCardFooter } from "@/components/data-card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { ActivateYearForm } from "./activate-form";

export default async function Rollover({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string; page?: string }>;
}) {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  const years = await listAcademicYears();
  const params = await searchParams;
  const selected = params.yearId ?? years.find((year) => !year.archivedAt)?.id;
  const preparation =
    actor.role === "admin" && selected ? await getYearPreparation(selected) : null;
  const classes = preparation ? await listClassOptions() : [];
  const currentPage = Math.max(1, Number(params.page ?? 1) || 1);

  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/academic-years"
      breadcrumbs={[
        { label: "Tahun ajaran", href: "/academic-years" },
        { label: "Persiapan tahun ajaran" },
      ]}
    >
      <PageHeader
        title="Persiapan tahun ajaran"
        description="Langkah transisi periode, penataan kelas, kalender belajar, dan aktivasi tahun ajaran baru."
        actions={
          selected && preparation ? (
            <Link
              className="button-link button-link--secondary"
              href={`/reports?yearId=${selected}&month=${preparation.year.startsOn.slice(0, 7)}`}
            >
              Rekap tahun ini
            </Link>
          ) : undefined
        }
      />

      <div className="page-stack">
        {actor.role !== "admin" ? (
          <StateBanner state="error">Persiapan tahun ajaran dikelola admin.</StateBanner>
        ) : (
          <>
            {/* Filter Card */}
            <DataCard id="card-filter-rollover">
              <DataCardHeader title="Pilih tahun ajaran yang disiapkan" />
              <DataCardContent className="data-card__content--padded">
                <form className="list-filter-form" action="/academic-years/rollover" method="get">
                  <div className="list-filter-search-group">
                    <SelectField label="Tahun yang disiapkan" name="yearId" defaultValue={selected}>
                      {years.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.label}
                          {year.isCurrent ? " (aktif saat ini)" : ""}
                          {year.archivedAt ? " / Arsip" : ""}
                        </option>
                      ))}
                    </SelectField>
                    <Button type="submit">Tampilkan persiapan</Button>
                  </div>
                </form>
              </DataCardContent>
            </DataCard>

            {!preparation ? (
              <StateBanner state="empty">
                Tambahkan tahun ajaran sebelum menyiapkan kelas dan kalender.
              </StateBanner>
            ) : (
              <>
                {/* Langkah Persiapan */}
                <DataCard id="card-langkah-persiapan">
                  <DataCardHeader
                    title={`Langkah persiapan ${preparation.year.label}`}
                    description={`${preparation.year.startsOn} sampai sebelum ${preparation.year.endsOnExclusive}`}
                    actions={
                      <StatusBadge tone={preparation.year.isCurrent ? "success" : "neutral"}>
                        {preparation.year.isCurrent ? "Tahun aktif saat ini" : "Belum aktif"}
                      </StatusBadge>
                    }
                  />
                  <DataCardContent className="data-card__content--padded">
                    <div className="rollover-steps">
                      {/* Step 1 */}
                      <div className="rollover-step-item">
                        <div className="rollover-step-num">1</div>
                        <div className="rollover-step-body">
                          <h3>Identitas dan periode</h3>
                          <p>
                            {preparation.identityReady
                              ? "Identitas sekolah tersedia."
                              : "Lengkapi nama dan zona waktu sekolah."}
                          </p>
                          <div className="rollover-step-actions">
                            <Link className="button-link button-link--secondary" href="/settings">
                              Konfigurasi sekolah
                            </Link>
                            <Link
                              className="button-link button-link--secondary"
                              href="/academic-years"
                            >
                              Buat atau edit periode
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="rollover-step-item">
                        <div className="rollover-step-num">2</div>
                        <div className="rollover-step-body">
                          <h3>Kelas tahun ini</h3>
                          <p>
                            {preparation.classes.filter((item) => !item.archivedAt).length} kelas
                            tersedia.
                          </p>
                          <div className="rollover-step-actions">
                            <Link
                              className="button-link button-link--secondary"
                              href={`/classes?yearId=${selected}`}
                            >
                              Atur kelas
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="rollover-step-item">
                        <div className="rollover-step-num">3</div>
                        <div className="rollover-step-body">
                          <h3>Kalender belajar</h3>
                          <p>
                            {preparation.weekdays
                              ? `${preparation.weekdays} hari rutin per minggu.`
                              : "Hari belajar belum diatur."}
                          </p>
                          <div className="rollover-step-actions">
                            <Link
                              className="button-link button-link--secondary"
                              href={`/calendar?yearId=${selected}&month=${preparation.year.startsOn.slice(0, 7)}`}
                            >
                              Atur kalender
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="rollover-step-item">
                        <div className="rollover-step-num">4</div>
                        <div className="rollover-step-body">
                          <h3>Penempatan siswa</h3>
                          <p>
                            Periksa tiap siswa lewat preview sebelum menyimpan batch ke tahun yang
                            disiapkan.
                          </p>
                          <form
                            className="list-filter-form"
                            action="/students/promote"
                            method="get"
                          >
                            <input type="hidden" name="targetYearId" value={selected} />
                            <div className="list-filter-search-group">
                              <SelectField label="Kelas asal naik kelas" name="classId" required>
                                {classes
                                  .filter((item) => item.yearId !== selected)
                                  .map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {years.find((year) => year.id === item.yearId)?.label} /{" "}
                                      {item.name}
                                    </option>
                                  ))}
                              </SelectField>
                              <Button type="submit">Buka preview naik kelas</Button>
                            </div>
                          </form>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="rollover-step-item">
                        <div className="rollover-step-num">5</div>
                        <div className="rollover-step-body">
                          <h3>Pindahkan tahun aktif</h3>
                          {!preparation.ready && (
                            <StateBanner state="empty">
                              Lengkapi identitas, kelas dan kalender sebelum mengaktifkan lewat alur
                              ini.
                            </StateBanner>
                          )}
                          <ActivateYearForm preparation={preparation} />
                        </div>
                      </div>

                      {/* Step 6 */}
                      <div className="rollover-step-item">
                        <div className="rollover-step-num">6</div>
                        <div className="rollover-step-body">
                          <h3>Arsip setelah penempatan ditutup</h3>
                          <p>
                            Arsip kelas dan tahun lama ditolak selama masih ada penempatan efektif
                            setelah tanggal sekolah. Laporan lama tetap dapat dibaca dan diekspor.
                          </p>
                          <div className="rollover-step-actions">
                            <Link className="button-link button-link--secondary" href="/classes">
                              Periksa arsip kelas
                            </Link>
                            <Link
                              className="button-link button-link--secondary"
                              href="/academic-years"
                            >
                              Periksa arsip tahun
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DataCardContent>
                </DataCard>

                {/* Daftar Kelas Persiapan */}
                <DataCard id="daftar-kelas-persiapan">
                  <DataCardHeader
                    title="Penempatan pada tahun yang disiapkan"
                    count={preparation.classes.length}
                  />
                  <DataCardContent>
                    {preparation.classes.length === 0 ? (
                      <EmptyState
                        title="Belum ada kelas"
                        description="Tambahkan kelas untuk tahun ajaran ini terlebih dahulu."
                      />
                    ) : (
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
                              .slice((currentPage - 1) * 25, currentPage * 25)
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
                    )}
                  </DataCardContent>
                  {preparation.classes.length > 25 && (
                    <DataCardFooter>
                      <DataTablePagination
                        total={preparation.classes.length}
                        page={currentPage}
                        pageSize={25}
                        pathname="/academic-years/rollover"
                        query={{ yearId: selected ?? "" }}
                      />
                    </DataCardFooter>
                  )}
                </DataCard>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
