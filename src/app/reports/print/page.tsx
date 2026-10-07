import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { buildMonthlyAttendanceReport } from "@/server/reports/monthly";
import { printSnapshot } from "@/server/reports/print";
import { reportInputSchema, type MonthlyReport } from "@/contracts/reports";
import { parseInput } from "@/contracts/attendance";
import { DomainError } from "@/domain/errors";
import { formatSchoolTime } from "@/domain/format";
import { ReportTable, ReportLegend, ReportChangeNotice } from "@/components/report-table";
import { StateBanner } from "@/components/state-banner";
import { PrintReportButton } from "@/components/print-report-button";

export default async function PrintReport({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePageActor();
  let report: MonthlyReport | undefined;
  let message = "";
  try {
    const input = parseInput(reportInputSchema, await searchParams);
    report = await buildMonthlyAttendanceReport(input);
  } catch (error) {
    message =
      error instanceof DomainError
        ? error.message
        : "Belum dapat menyiapkan halaman cetak. Coba kembali.";
  }
  if (!report)
    return (
      <main>
        <h1>Cetak rekap</h1>
        <StateBanner state="error">{message}</StateBanner>
        <Link href="/reports">Kembali ke rekap</Link>
      </main>
    );
  const input = report.input;
  const query = new URLSearchParams({ yearId: input.yearId, month: input.month });
  if (input.classId) query.set("classId", input.classId);
  return (
    <main className="print-page">
      <div className="print-controls">
        <Link href={`/reports?${query}`}>Kembali ke rekap</Link>
        <PrintReportButton snapshot={printSnapshot(report, actor)} />
      </div>
      {!report.classes.length && (
        <StateBanner state="empty">
          Belum ada kelas yang dapat dicetak pada tahun ajaran ini.
        </StateBanner>
      )}
      {report.classes.map((item) => (
        <section key={item.classId} className="print-class">
          <h1>{report.schoolName}</h1>
          <h2>Rekap absensi {item.name}</h2>
          <p>
            {report.academicYearLabel} · {report.input.month} · Dibuat oleh {actor.name} pada{" "}
            {formatSchoolTime(report.generatedAt, report.timezone)} ({report.timezone})
          </p>
          <p>
            {item.complete ? "Lengkap" : "Belum lengkap"} · {item.missingDays} catatan siswa belum
            dicatat
          </p>
          <ReportChangeNotice report={item} />
          <ReportLegend />
          <ReportTable report={item} dates={report.dates} />
          <div className="print-signature">
            <p>Mengetahui,</p>
            <p>________________________</p>
          </div>
        </section>
      ))}
    </main>
  );
}
