import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileSpreadsheet,
  ClipboardCheck,
  CalendarDays,
  UserPlus,
  Settings,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { AttendanceTrendChart } from "@/components/attendance-trend-chart";
import { KpiCard } from "@/components/kpi-card";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StateBanner } from "@/components/state-banner";
import { StatusBadge } from "@/components/status-badge";
import { SetupChecklist } from "@/components/setup-checklist";
import { DataCard, DataCardHeader, DataCardContent, DataCardFooter } from "@/components/data-card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { getDashboard } from "@/server/queries/dashboard";
import { ButtonLink } from "@/components/button";
import { schoolIdentity } from "@/components/school-identity";

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await requirePageActor();
  if (actor.role === "teacher") {
    redirect("/attendance");
  }
  const selectedParams = await searchParams;
  const settings = await getSchoolSettings();
  const dashboard = await getDashboard(actor);

  const totalClasses = dashboard.classes.length;
  const recordedClasses = dashboard.classes.filter((c) => c.state === "submitted").length;
  const unrecordedClasses = dashboard.classes.filter((c) => c.state === "not_recorded");
  const totalActiveStudents = dashboard.classes.reduce((sum, c) => sum + c.studentCount, 0);

  const totalHadir = dashboard.classes.reduce((sum, c) => sum + (c.totals?.H ?? 0), 0);
  const totalSakit = dashboard.classes.reduce((sum, c) => sum + (c.totals?.S ?? 0), 0);
  const totalIzin = dashboard.classes.reduce((sum, c) => sum + (c.totals?.I ?? 0), 0);
  const totalAlpa = dashboard.classes.reduce((sum, c) => sum + (c.totals?.A ?? 0), 0);
  const totalRecordedStudents = totalHadir + totalSakit + totalIzin + totalAlpa;

  const attendanceRate =
    totalRecordedStudents > 0 ? Math.round((totalHadir / totalRecordedStudents) * 100) : null;

  const composition = [
    { key: "H", label: "Hadir", value: totalHadir },
    { key: "S", label: "Sakit", value: totalSakit },
    { key: "I", label: "Izin", value: totalIzin },
    { key: "A", label: "Alpa", value: totalAlpa },
  ] as const;
  // cumulative x offsets (percent) for the stacked composition bar
  const compositionSegments = composition
    .filter((item) => item.value > 0)
    .reduce<{ key: string; x: number; width: number }[]>((segments, item) => {
      const last = segments.at(-1);
      const x = last ? last.x + last.width : 0;
      return [
        ...segments,
        { key: item.key, x, width: (item.value / (totalRecordedStudents || 1)) * 100 },
      ];
    }, []);

  // Pagination for unrecorded classes (page size 10)
  const pageSize = 10;
  const currentPage = Math.max(
    1,
    Math.min(
      Number(selectedParams.page ?? 1) || 1,
      Math.ceil(unrecordedClasses.length / pageSize) || 1,
    ),
  );
  const paginatedUnrecorded = unrecordedClasses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <AppShell
      school={schoolIdentity(settings)}
      actor={actor}
      currentPath="/"
      breadcrumbs={[{ label: "Beranda" }]}
    >
      <PageHeader
        icon={LayoutDashboard}
        title="Beranda"
        description={`Panel operasional sekolah untuk ${dashboard.schoolToday}.`}
        actions={
          <ButtonLink href="/reports">
            <FileSpreadsheet aria-hidden="true" />
            Rekap bulan ini
          </ButtonLink>
        }
      />

      <div className="page-stack">
        {/* Setup checklist if setup is incomplete */}
        {!settings.setup.ready && (
          <>
            <SetupChecklist state={settings.setup} />
            <StateBanner state="empty">
              Lengkapi persiapan sekolah: {settings.setup.missing.join(", ")}.
            </StateBanner>
          </>
        )}

        {/* Synthetic data alert */}
        {settings.setup.synthetic && (
          <StateBanner state="info" title="Data uji">
            Konfigurasi memakai data sintetis dan belum siap untuk produksi.
          </StateBanner>
        )}

        {/* Holiday alert */}
        {!dashboard.isSchoolDay && (
          <StateBanner state="empty">
            Hari ini libur: {dashboard.calendarReason ?? "Bukan hari belajar rutin."}
          </StateBanner>
        )}

        <section aria-label="Ringkasan indikator kinerja" className="dashboard-kpi-grid">
          <KpiCard
            label="Kehadiran hari ini"
            icon={UserCheck}
            accent="teal"
            value={
              !dashboard.isSchoolDay ? "—" : attendanceRate !== null ? `${attendanceRate}%` : "—"
            }
            progress={
              dashboard.isSchoolDay && attendanceRate !== null ? attendanceRate / 100 : null
            }
            context={
              !dashboard.isSchoolDay
                ? "Hari libur sekolah"
                : attendanceRate !== null
                  ? `${totalHadir} dari ${totalRecordedStudents} siswa hadir`
                  : "Belum ada catatan hari ini"
            }
          />
          <KpiCard
            label="Kelas sudah dicatat"
            icon={ClipboardCheck}
            accent="sky"
            value={`${recordedClasses} / ${totalClasses}`}
            progress={totalClasses ? recordedClasses / totalClasses : null}
            context={`${totalClasses - recordedClasses} kelas belum dicatat`}
          />
          <KpiCard
            label="Siswa aktif"
            icon={Users}
            accent="amber"
            value={totalActiveStudents}
            context={`Terdaftar di ${totalClasses} kelas`}
          />
          <KpiCard
            label="Tidak hadir hari ini"
            icon={UserX}
            accent="rose"
            value={!dashboard.isSchoolDay ? "—" : totalSakit + totalIzin + totalAlpa}
            context={
              !dashboard.isSchoolDay
                ? "Hari libur sekolah"
                : `${totalSakit} Sakit · ${totalIzin} Izin · ${totalAlpa} Alpa`
            }
          />
        </section>

        <div className="dashboard-bento">
          <DataCard className="dashboard-bento__main">
            <DataCardHeader
              title="Tren kehadiran"
              description={`${dashboard.trend.length} hari sekolah terakhir`}
            />
            <DataCardContent className="data-card__content--padded">
              <AttendanceTrendChart points={dashboard.trend} />
            </DataCardContent>
          </DataCard>

          <DataCard className="dashboard-bento__side">
            <DataCardHeader title="Komposisi hari ini" description={dashboard.schoolToday} />
            <DataCardContent className="data-card__content--padded">
              {!dashboard.isSchoolDay || totalRecordedStudents === 0 ? (
                <p className="empty-text">
                  {!dashboard.isSchoolDay
                    ? "Hari ini libur sekolah."
                    : "Komposisi tampil setelah absensi pertama hari ini disimpan."}
                </p>
              ) : (
                <>
                  <svg
                    className="composition-bar"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={`Hadir ${totalHadir}, Sakit ${totalSakit}, Izin ${totalIzin}, Alpa ${totalAlpa}`}
                  >
                    {compositionSegments.map((item) => (
                      <rect
                        key={item.key}
                        className={`composition-bar__segment--${item.key}`}
                        x={item.x}
                        width={item.width}
                        height={10}
                      />
                    ))}
                  </svg>
                  <ul className="composition-legend">
                    {composition.map((item) => (
                      <li key={item.key}>
                        <span
                          className={`composition-legend__dot composition-bar__segment--${item.key}`}
                          aria-hidden="true"
                        >
                          {item.key}
                        </span>
                        <span className="composition-legend__label">{item.label}</span>
                        <strong>{item.value}</strong>
                        <small>{Math.round((item.value / totalRecordedStudents) * 100)}%</small>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </DataCardContent>
          </DataCard>
        </div>

        <DataCard id="card-belum-dicatat">
          <DataCardHeader
            title="Belum dicatat hari ini"
            count={dashboard.isSchoolDay ? unrecordedClasses.length : 0}
          />

          <DataCardContent>
            {!dashboard.isSchoolDay ? (
              <p className="empty-text empty-text--padded">
                Hari ini libur sekolah. Tidak ada pencatatan kehadiran yang diperlukan.
              </p>
            ) : unrecordedClasses.length === 0 ? (
              <div className="dashboard-all-recorded">
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>Semua kelas sudah dicatat hari ini.</span>
              </div>
            ) : (
              <div className="data-table" data-slot="table-container">
                <table className="data-table-element">
                  <thead>
                    <tr>
                      <th data-slot="table-head">Kelas</th>
                      <th data-slot="table-head" className="hide-mobile">
                        Tingkat
                      </th>
                      <th data-slot="table-head" className="hide-mobile">
                        Siswa
                      </th>
                      <th data-slot="table-head">Status</th>
                      <th data-slot="table-head" className="cell-actions-header">
                        <span className="sr-only">Aksi</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUnrecorded.map((item) => (
                      <tr key={item.classId} data-slot="table-row">
                        <td data-slot="table-cell">
                          <span className="class-name-cell">
                            <strong>{item.name}</strong>
                            {item.isPrimary && <StatusBadge tone="info">Kelas utama</StatusBadge>}
                          </span>
                        </td>
                        <td data-slot="table-cell" className="hide-mobile">
                          Tingkat {item.grade}
                        </td>
                        <td data-slot="table-cell" className="hide-mobile">
                          {item.studentCount} siswa
                        </td>
                        <td data-slot="table-cell">
                          <StatusBadge tone="neutral">Belum dicatat</StatusBadge>
                        </td>
                        <td data-slot="table-cell" className="cell-actions">
                          <ButtonLink
                            variant="soft"
                            size="sm"
                            href={`/attendance/${item.classId}`}
                            aria-label={`Catat absensi ${item.name}`}
                          >
                            Catat
                          </ButtonLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataCardContent>

          {dashboard.isSchoolDay && unrecordedClasses.length > pageSize && (
            <DataCardFooter>
              <DataTablePagination
                pathname="/"
                page={currentPage}
                pageSize={pageSize}
                total={unrecordedClasses.length}
              />
            </DataCardFooter>
          )}
        </DataCard>

        {/* Quick Actions Card */}
        <DataCard id="card-pintasan">
          <DataCardHeader title="Pintasan cepat" />
          <DataCardContent className="data-card__content--padded">
            <div className="dashboard-quick-actions">
              <Link href="/reports" className="quick-action-card quick-action-card--highlight">
                <span className="quick-action-icon">
                  <FileSpreadsheet size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Rekap bulan ini</span>
                  <span className="quick-action-desc">Laporan kehadiran dan unduh Excel</span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground ml-auto"
                  aria-hidden="true"
                />
              </Link>

              <Link href="/attendance" className="quick-action-card">
                <span className="quick-action-icon">
                  <ClipboardCheck size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Presensi harian</span>
                  <span className="quick-action-desc">Daftar kelas dan input absensi</span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground ml-auto"
                  aria-hidden="true"
                />
              </Link>

              <Link href="/calendar" className="quick-action-card">
                <span className="quick-action-icon">
                  <CalendarDays size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Kalender sekolah</span>
                  <span className="quick-action-desc">Jadwal belajar dan hari libur</span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground ml-auto"
                  aria-hidden="true"
                />
              </Link>

              <Link href="/students/new" className="quick-action-card">
                <span className="quick-action-icon">
                  <UserPlus size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Tambah siswa</span>
                  <span className="quick-action-desc">Daftarkan siswa baru</span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground ml-auto"
                  aria-hidden="true"
                />
              </Link>

              <Link href="/settings" className="quick-action-card">
                <span className="quick-action-icon">
                  <Settings size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Pengaturan sekolah</span>
                  <span className="quick-action-desc">Identitas dan zona waktu</span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground ml-auto"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </DataCardContent>
        </DataCard>
      </div>
    </AppShell>
  );
}
