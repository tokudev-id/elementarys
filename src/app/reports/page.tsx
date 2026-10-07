import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { ReportTable, ReportLegend, ReportChangeNotice } from "@/components/report-table";
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
  if (!options)
    return (
      <AppShell school={null} actor={actor} currentPath="/reports">
        <h1>Rekap bulanan</h1>
        <StateBanner state="error">
          Belum dapat memuat pilihan rekap. Coba muat ulang halaman.
        </StateBanner>
      </AppShell>
    );
  const year = options.years.find((item) => item.id === selected.yearId) ?? options.years[0];
  if (!year)
    return (
      <AppShell school={null} actor={actor} currentPath="/reports">
        <h1>Rekap bulanan</h1>
        <StateBanner state="empty">
          Belum ada tahun ajaran. Hubungi admin untuk melengkapinya.
        </StateBanner>
      </AppShell>
    );
  const currentMonth = options.today.slice(0, 7);
  const month =
    typeof selected.month === "string"
      ? selected.month
      : currentMonth >= year.startsOn.slice(0, 7) && `${currentMonth}-01` < year.endsOnExclusive
        ? currentMonth
        : year.startsOn.slice(0, 7);
  const classId =
    typeof selected.classId === "string" && selected.classId ? selected.classId : undefined;
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
  return (
    <AppShell
      school={
        report
          ? { name: report.schoolName, date: report.schoolToday, timezone: report.timezone }
          : null
      }
      actor={actor}
      currentPath="/reports"
    >
      <h1>Rekap bulanan</h1>
      <form action="/reports" method="get" className="filter-form">
        <div className="ui-field">
          <label htmlFor="report-year">Tahun ajaran</label>
          <select id="report-year" name="yearId" defaultValue={year.id}>
            {options.years.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Field label="Bulan" name="month" type="month" defaultValue={month} required />
        <div className="ui-field">
          <label htmlFor="report-class">Kelas</label>
          <select id="report-class" name="classId" defaultValue={classId ?? ""}>
            <option value="">Seluruh kelas</option>
            {options.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {options.years.find((option) => option.id === item.yearId)?.label} / {item.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Tampilkan rekap</Button>
      </form>
      {message && <StateBanner state="error">{message}</StateBanner>}
      {report && (
        <>
          <p>
            {report.academicYearLabel} · {report.input.month}
          </p>
          <ReportLegend />
          <ReportDownload input={report.input} />
          {!report.classes.length && (
            <StateBanner state="empty">Belum ada kelas pada tahun ajaran ini.</StateBanner>
          )}
          {report.classes.map((item) => (
            <section className="report-class" key={item.classId}>
              <h2>{item.name}</h2>
              <p>
                {item.complete
                  ? "Lengkap"
                  : `Belum lengkap: ${item.missingDays} catatan siswa belum dicatat`}
              </p>
              <ReportChangeNotice report={item} />
              {!item.students.length ? (
                <StateBanner state="empty">
                  Tidak ada siswa yang ditempatkan pada kelas ini dalam bulan tersebut.
                </StateBanner>
              ) : (
                <>
                  <ul className="report-totals-list">
                    {item.students.map((student) => (
                      <li key={student.studentId}>
                        <strong>{student.fullName}</strong> <small>{student.studentCode}</small>
                        <p>
                          {student.totals.H} Hadir · {student.totals.S} Sakit · {student.totals.I}{" "}
                          Izin · {student.totals.A} Alpa
                        </p>
                        <small>
                          {student.missingDays} belum dicatat dari {student.expectedDaysToDate} hari
                          yang wajib dicatat.
                        </small>
                      </li>
                    ))}
                  </ul>
                  <ReportTable report={item} dates={report.dates} />
                </>
              )}
            </section>
          ))}
        </>
      )}
    </AppShell>
  );
}
