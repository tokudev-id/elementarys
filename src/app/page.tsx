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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StateBanner } from "@/components/state-banner";
import { StatusBadge } from "@/components/status-badge";
import { SetupChecklist } from "@/components/setup-checklist";
import {
  DataCard,
  DataCardHeader,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { getDashboard } from "@/server/queries/dashboard";
import { schoolIdentity } from "@/components/school-identity";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
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
    totalRecordedStudents > 0
      ? Math.round((totalHadir / totalRecordedStudents) * 100)
      : null;

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
        title="Beranda"
        description={`Panel operasional sekolah untuk ${dashboard.schoolToday}.`}
        actions={
          <Link className="button-link" href="/reports">
            Rekap bulan ini
          </Link>
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

        {/* KPI Grid */}
        <section aria-label="Ringkasan indikator kinerja" className="dashboard-kpi-grid">
          <div className="kpi-card">
            <span className="kpi-card__label">Kehadiran hari ini</span>
            <span className="kpi-card__value">
              {!dashboard.isSchoolDay
                ? "—"
                : attendanceRate !== null
                  ? `${attendanceRate}%`
                  : "—"}
            </span>
            <span className="kpi-card__sub">
              {!dashboard.isSchoolDay
                ? "Hari libur sekolah"
                : attendanceRate !== null
                  ? `${totalHadir} dari ${totalRecordedStudents} siswa hadir`
                  : "Belum ada catatan hari ini"}
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-card__label">Kelas sudah dicatat</span>
            <span className="kpi-card__value">
              {recordedClasses} / {totalClasses}
            </span>
            <span className="kpi-card__sub">
              {totalClasses - recordedClasses} kelas belum dicatat
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-card__label">Siswa aktif</span>
            <span className="kpi-card__value">{totalActiveStudents}</span>
            <span className="kpi-card__sub">Terdaftar di {totalClasses} kelas</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-card__label">Tidak hadir hari ini</span>
            <span className="kpi-card__value">
              {!dashboard.isSchoolDay ? "—" : totalSakit + totalIzin + totalAlpa}
            </span>
            <span className="kpi-card__sub">
              {!dashboard.isSchoolDay
                ? "Hari libur sekolah"
                : `${totalSakit} Sakit · ${totalIzin} Izin · ${totalAlpa} Alpa`}
            </span>
          </div>
        </section>

        {/* Card Belum dicatat hari ini */}
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
                      <th data-slot="table-head">Tingkat</th>
                      <th data-slot="table-head">Siswa</th>
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
                          <strong>{item.name}</strong>
                          {item.isPrimary && (
                            <span className="badge badge--primary ml-2">Kelas utama</span>
                          )}
                        </td>
                        <td data-slot="table-cell">Tingkat {item.grade}</td>
                        <td data-slot="table-cell">{item.studentCount} siswa</td>
                        <td data-slot="table-cell">
                          <StatusBadge tone="neutral">Belum dicatat</StatusBadge>
                        </td>
                        <td data-slot="table-cell" className="cell-actions">
                          <Link
                            className="button-link"
                            href={`/attendance/${item.classId}`}
                          >
                            Catat
                          </Link>
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
          <DataCardContent>
            <div className="dashboard-quick-actions">
              <Link
                href="/reports"
                className="quick-action-card quick-action-card--highlight"
              >
                <span className="quick-action-icon">
                  <FileSpreadsheet size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Rekap bulan ini</span>
                  <span className="quick-action-desc">
                    Laporan kehadiran dan unduh Excel
                  </span>
                </div>
                <ChevronRight size={16} className="text-muted ml-auto" aria-hidden="true" />
              </Link>

              <Link href="/attendance" className="quick-action-card">
                <span className="quick-action-icon">
                  <ClipboardCheck size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Presensi harian</span>
                  <span className="quick-action-desc">Daftar kelas dan input absensi</span>
                </div>
                <ChevronRight size={16} className="text-muted ml-auto" aria-hidden="true" />
              </Link>

              <Link href="/calendar" className="quick-action-card">
                <span className="quick-action-icon">
                  <CalendarDays size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Kalender sekolah</span>
                  <span className="quick-action-desc">Jadwal belajar dan hari libur</span>
                </div>
                <ChevronRight size={16} className="text-muted ml-auto" aria-hidden="true" />
              </Link>

              <Link href="/students/new" className="quick-action-card">
                <span className="quick-action-icon">
                  <UserPlus size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Tambah siswa</span>
                  <span className="quick-action-desc">Daftarkan siswa baru</span>
                </div>
                <ChevronRight size={16} className="text-muted ml-auto" aria-hidden="true" />
              </Link>

              <Link href="/settings" className="quick-action-card">
                <span className="quick-action-icon">
                  <Settings size={20} aria-hidden="true" />
                </span>
                <div className="quick-action-content">
                  <span className="quick-action-title">Pengaturan sekolah</span>
                  <span className="quick-action-desc">Identitas dan zona waktu</span>
                </div>
                <ChevronRight size={16} className="text-muted ml-auto" aria-hidden="true" />
              </Link>
            </div>
          </DataCardContent>
        </DataCard>
      </div>
    </AppShell>
  );
}
