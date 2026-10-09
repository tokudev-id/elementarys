import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StateBanner } from "@/components/state-banner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import {
  DataCard,
  DataCardHeader,
  DataCardContent,
} from "@/components/data-card";
import {
  ReportLegend,
  ReportChangeNotice,
  ReportClassView,
} from "@/components/report-table";
import { ReportDownload } from "@/components/report-download";
import { requirePageActor } from "@/server/auth/page-actor";
import { reportFilters, buildMonthlyAttendanceReport } from "@/server/reports/monthly";
import { DomainError } from "@/domain/errors";
import { parseInput } from "@/contracts/attendance";
import { reportInputSchema } from "@/contracts/reports";
import type { MonthlyReport } from "@/contracts/reports";

export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  const options = await reportFilters().catch(() => null);

  if (!options) {
    return (
      <AppShell school={null} actor={actor} currentPath="/reports">
        <PageHeader title="Rekap bulanan" />
        <StateBanner state="error">
          Belum dapat memuat pilihan rekap. Coba muat ulang halaman.
        </StateBanner>
      </AppShell>
    );
  }

  const year = options.years.find((item) => item.id === selected.yearId) ?? options.years[0];

  if (!year) {
    return (
      <AppShell school={null} actor={actor} currentPath="/reports">
        <PageHeader title="Rekap bulanan" />
        <StateBanner state="empty">
          Belum ada tahun ajaran. Hubungi admin untuk melengkapinya.
        </StateBanner>
      </AppShell>
    );
  }

  const currentMonth = options.today.slice(0, 7);
  const month =
    typeof selected.month === "string"
      ? selected.month
      : currentMonth >= year.startsOn.slice(0, 7) && `${currentMonth}-01` < year.endsOnExclusive
        ? currentMonth
        : year.startsOn.slice(0, 7);

  // Single-class default unless explicitly chosen
  const defaultClassId = options.classes[0]?.id;
  const classParam = typeof selected.classId === "string" ? selected.classId : undefined;
  const classId =
    classParam === "all"
      ? undefined
      : classParam !== undefined
        ? classParam
        : defaultClassId;

  let report: MonthlyReport | undefined;
  let message = "";

  try {
    const input = parseInput(reportInputSchema, {
      yearId: selected.yearId ?? year.id,
      month,
      classId,
    });
    report = await buildMonthlyAttendanceReport(input);
  } catch (error) {
    message =
      error instanceof DomainError
        ? error.message
        : "Belum dapat memuat rekap. Coba muat ulang halaman.";
  }

  const printParams = new URLSearchParams({
    yearId: report?.input.yearId ?? year.id,
    month: report?.input.month ?? month,
    ...(report?.input.classId ? { classId: report.input.classId } : {}),
  });

  return (
    <AppShell
      school={
        report
          ? { name: report.schoolName, date: report.schoolToday, timezone: report.timezone }
          : null
      }
      actor={actor}
      currentPath="/reports"
      breadcrumbs={[{ label: "Rekap bulanan" }]}
    >
      <PageHeader
        title="Rekap bulanan"
        description={
          report
            ? `${report.academicYearLabel} · Bulan ${report.input.month}`
            : "Laporan presensi bulanan per kelas."
        }
        actions={
          report && (
            <div className="flex flex-wrap gap-2 items-center">
              <ReportDownload input={report.input} />
              <Link
                className="button-link"
                href={`/reports/print?${printParams.toString()}`}
              >
                Buka halaman cetak
              </Link>
            </div>
          )
        }
      />

      <div className="page-stack">
        {/* Filter Card */}
        <DataCard id="card-filter-rekap">
          <DataCardHeader title="Filter laporan" />
          <DataCardContent>
            <form action="/reports" method="get" noValidate className="report-filter-bar">
              <div className="ui-field report-filter-item">
                <label htmlFor="report-year">Tahun ajaran</label>
                <select id="report-year" name="yearId" defaultValue={year.id}>
                  {options.years.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="report-filter-item">
                <Field
                  label="Bulan"
                  name="month"
                  type="month"
                  defaultValue={month}
                  required
                />
              </div>

              <div className="ui-field report-filter-item">
                <label htmlFor="report-class">Kelas</label>
                <select
                  id="report-class"
                  name="classId"
                  defaultValue={classParam ?? defaultClassId ?? ""}
                >
                  <option value="all">Seluruh kelas</option>
                  {options.classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {options.years.find((o) => o.id === item.yearId)?.label} / {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="report-filter-actions">
                <Button type="submit">Tampilkan rekap</Button>
              </div>
            </form>
          </DataCardContent>
        </DataCard>

        {message && <StateBanner state="error">{message}</StateBanner>}

        {report && (
          <>
            {!report.classes.length && (
              <StateBanner state="empty">
                Belum ada kelas pada tahun ajaran ini.
              </StateBanner>
            )}

            {report.classes.map((item) => {
              const totalPresent = item.totals.H;
              const totalTracked =
                item.totals.H + item.totals.S + item.totals.I + item.totals.A;
              const attendanceRate =
                totalTracked > 0 ? Math.round((totalPresent / totalTracked) * 100) : 0;

              return (
                <DataCard key={item.classId} id={`rekap-kelas-${item.classId}`}>
                  <DataCardHeader
                    title={`Rekap ${item.name}`}
                    count={item.students.length}
                    actions={
                      item.complete ? (
                        <StatusBadge tone="success">Catatan lengkap</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">
                          Belum lengkap: {item.missingDays} catatan
                        </StatusBadge>
                      )
                    }
                  />

                  <DataCardContent>
                    {/* Class KPIs */}
                    <div className="report-kpi-grid">
                      <div className="kpi-card">
                        <span className="kpi-card__label">Rata-rata kehadiran</span>
                        <span className="kpi-card__value">{attendanceRate}%</span>
                        <span className="kpi-card__sub">
                          {totalPresent} dari {totalTracked} kehadiran siswa
                        </span>
                      </div>

                      <div className="kpi-card">
                        <span className="kpi-card__label">Total Sakit (S)</span>
                        <span className="kpi-card__value">{item.totals.S}</span>
                        <span className="kpi-card__sub">Akumulasi izin sakit</span>
                      </div>

                      <div className="kpi-card">
                        <span className="kpi-card__label">Total Izin (I)</span>
                        <span className="kpi-card__value">{item.totals.I}</span>
                        <span className="kpi-card__sub">Akumulasi izin keperluan</span>
                      </div>

                      <div className="kpi-card">
                        <span className="kpi-card__label">Total Alpa (A)</span>
                        <span className="kpi-card__value">{item.totals.A}</span>
                        <span className="kpi-card__sub">Tanpa keterangan</span>
                      </div>
                    </div>

                    {/* Incomplete warning banner */}
                    {!item.complete && (
                      <StateBanner state="empty">
                        Belum lengkap: {item.missingDays} catatan siswa belum dicatat pada bulan ini.
                      </StateBanner>
                    )}

                    {/* Change notice if modified after last export */}
                    <ReportChangeNotice report={item} />

                    {/* Legend Chips */}
                    <ReportLegend />

                    {/* Student List & Grid Table */}
                    {!item.students.length ? (
                      <StateBanner state="empty">
                        Tidak ada siswa yang ditempatkan pada kelas ini dalam bulan tersebut.
                      </StateBanner>
                    ) : (
                      <ReportClassView report={item} dates={report.dates} />
                    )}
                  </DataCardContent>
                </DataCard>
              );
            })}
          </>
        )}
      </div>
    </AppShell>
  );
}
