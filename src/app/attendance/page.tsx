import Link from "next/link";
import { Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { StateBanner } from "@/components/state-banner";
import {
  DataCard,
  DataCardHeader,
  DataCardToolbar,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { requirePageActor } from "@/server/auth/page-actor";
import { DomainError } from "@/domain/errors";
import { getDashboard } from "@/server/queries/dashboard";
import { getCalendar } from "@/server/services/school-master";
import { AttendanceDatePicker } from "./date-picker";

export default async function Today({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; page?: string }>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  let data;
  try {
    data = await getDashboard(actor, selected.date);
  } catch (error) {
    return (
      <AppShell school={null} actor={actor} currentPath="/attendance">
        <PageHeader title="Absensi" />
        <StateBanner
          state={
            error instanceof DomainError && error.code === "SETUP_INCOMPLETE" ? "empty" : "error"
          }
        >
          {error instanceof DomainError
            ? error.message
            : "Belum dapat memuat kelas. Coba muat ulang halaman."}
        </StateBanner>
      </AppShell>
    );
  }
  const recorded = data.classes.filter((item) => item.state === "submitted").length;
  const calendar = await getCalendar(data.academicYearId, data.date.slice(0, 7)).catch(
    () => undefined,
  );

  const totalClasses = data.classes.length;
  const pageSize = 24;
  const page = Math.max(1, Math.min(Number(selected.page ?? 1) || 1, Math.ceil(totalClasses / pageSize) || 1));
  const paginatedClasses =
    totalClasses > pageSize
      ? data.classes.slice((page - 1) * pageSize, page * pageSize)
      : data.classes;

  const query: Record<string, string> = {};
  if (selected.date) query.date = selected.date;

  return (
    <AppShell
      school={{ name: data.schoolName, date: data.schoolToday, timezone: data.timezone }}
      actor={actor}
      currentPath="/attendance"
    >
      <PageHeader title="Absensi" description="Kelas utama Anda tampil lebih dahulu." />
      <AttendanceDatePicker date={data.date} max={data.schoolToday} calendar={calendar} />
      {!data.setupReady && (
        <StateBanner state="error">
          Kalender sekolah belum siap. Hubungi admin untuk melengkapinya.
        </StateBanner>
      )}
      {data.setupReady && !data.isSchoolDay && (
        <StateBanner state="empty">
          Hari ini libur: {data.calendarReason ?? "Bukan hari belajar rutin."}
        </StateBanner>
      )}
      {!data.classes.length && (
        <StateBanner state="empty">
          Belum ada kelas. Hubungi admin untuk melengkapi data sekolah.
        </StateBanner>
      )}

      {data.classes.length > 0 && (
        <DataCard id="daftar-kelas-absensi">
          <DataCardHeader title="Daftar kelas" count={totalClasses} />
          {data.isSchoolDay && (
            <DataCardToolbar>
              <div className="class-progress class-progress--toolbar">
                {recorded} dari {data.classes.length} kelas sudah dicatat
                <progress
                  value={recorded}
                  max={Math.max(1, data.classes.length)}
                  aria-label="Kelas sudah dicatat"
                />
              </div>
            </DataCardToolbar>
          )}
          <DataCardContent>
            <div className="attendance-class-grid">
              {paginatedClasses.map((item) => {
                const submitted = item.state === "submitted";
                const recordable = data.setupReady && item.state === "not_recorded";
                const state = !data.setupReady
                  ? "Kalender belum siap"
                  : item.state === "holiday"
                    ? "Libur"
                    : item.state === "empty"
                      ? "Kelas kosong"
                      : submitted
                        ? "Sudah dicatat"
                        : "Belum dicatat";
                return (
                  <section
                    className="attendance-class-card"
                    key={item.classId}
                    data-testid="class-row"
                  >
                    <h2>{item.name}</h2>
                    <StatusBadge tone={submitted ? "success" : "neutral"}>{state}</StatusBadge>
                    <p>
                      {item.studentCount} siswa
                      {item.isPrimary && (
                        <span className="primary-class-label">
                          <Star aria-hidden="true" size={14} strokeWidth={1.75} />
                          Kelas utama
                        </span>
                      )}
                    </p>
                    {item.totals && (
                      <p>
                        {item.totals.H} Hadir · {item.totals.S} Sakit · {item.totals.I} Izin ·{" "}
                        {item.totals.A} Alpa
                      </p>
                    )}
                    <Link
                      className={`button-link${recordable ? "" : " button-link--secondary"}`}
                      prefetch={false}
                      href={`/attendance/${item.classId}?date=${data.date}`}
                    >
                      {recordable ? "Catat absensi" : "Lihat"}
                    </Link>
                  </section>
                );
              })}
            </div>
          </DataCardContent>
          {totalClasses > pageSize && (
            <DataCardFooter>
              <DataTablePagination
                total={totalClasses}
                page={page}
                pageSize={pageSize}
                pathname="/attendance"
                query={query}
              />
            </DataCardFooter>
          )}
        </DataCard>
      )}
    </AppShell>
  );
}
