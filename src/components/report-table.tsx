"use client";

import type { ClassReport } from "@/contracts/reports";

const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function ReportLegend() {
  const items = [
    { code: "H", label: "Hadir", tone: "h" },
    { code: "S", label: "Sakit", tone: "s" },
    { code: "I", label: "Izin", tone: "i" },
    { code: "A", label: "Alpa", tone: "a" },
    { code: "?", label: "Belum dicatat", tone: "none" },
    { code: "L", label: "Libur", tone: "none" },
    { code: "-", label: "Di luar penempatan", tone: "none" },
    { code: ".", label: "Hari mendatang", tone: "none" },
  ];

  return (
    <div className="report-legend-chips" role="region" aria-label="Keterangan status rekap">
      {items.map((item) => (
        <span key={item.code} className={`legend-chip legend-chip--${item.tone}`}>
          <span className="legend-chip__dot">{item.code}</span>
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function ReportChangeNotice({ report }: { report: ClassReport }) {
  const reference = report.exportReference;
  if (!reference?.changedDates.length) return null;
  return (
    <div role="status" className="state-banner state-banner--empty mb-4">
      Berubah setelah ekspor terakhir oleh {reference.exportedBy} pada {reference.exportedAt}.
      Tanggal berubah: {reference.changedDates.join(", ")}.
    </div>
  );
}

export function ReportTable({
  report,
  dates,
  className = "",
}: {
  report: ClassReport;
  dates: string[];
  className?: string;
}) {
  return (
    <div
      className={`report-table-scroll ${className}`}
      role="region"
      aria-label={`Tabel tanggal ${report.name}`}
      tabIndex={0}
    >
      <table className="report-table report-sticky-table">
        <caption>Catatan harian {report.name}</caption>
        <thead>
          <tr>
            <th scope="col" className="col-student">
              Siswa
            </th>
            <th scope="col" className="col-total" title="Total Hadir">
              H
            </th>
            <th scope="col" className="col-total" title="Total Sakit">
              S
            </th>
            <th scope="col" className="col-total" title="Total Izin">
              I
            </th>
            <th scope="col" className="col-total" title="Total Alpa">
              A
            </th>
            {dates.map((date) => {
              const d = new Date(`${date}T12:00:00Z`);
              const dayInitial = dayNames[d.getUTCDay()];
              return (
                <th key={date} scope="col" className="col-date">
                  <span className="text-muted block text-xs">{dayInitial}</span>
                  <span>{Number(date.slice(-2))}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {report.students.map((student) => (
            <tr key={student.studentId}>
              <th scope="row" className="col-student">
                {student.fullName}
                <small className="text-muted">{student.studentCode}</small>
              </th>
              <td className="col-total cell-status-h">{student.totals.H}</td>
              <td className="col-total cell-status-s">{student.totals.S}</td>
              <td className="col-total cell-status-i">{student.totals.I}</td>
              <td className="col-total cell-status-a">{student.totals.A}</td>
              {student.cells.map((cell, index) => {
                let cellClass = "";
                if (cell === "H") cellClass = "cell-status-h";
                else if (cell === "S") cellClass = "cell-status-s";
                else if (cell === "I") cellClass = "cell-status-i";
                else if (cell === "A") cellClass = "cell-status-a";
                else if (cell === "L") cellClass = "cell-status-holiday";

                return (
                  <td key={dates[index]} className={cellClass}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportClassView({
  report,
  dates,
}: {
  report: ClassReport;
  dates: string[];
}) {
  return (
    <div className="report-class-view">
      {/* Mobile totals card list */}
      <div className="report-mobile-totals mb-4">
        <ul className="report-totals-list">
            {report.students.map((student) => (
              <li key={student.studentId}>
                <div className="report-mobile-card">
                  <div className="report-mobile-card__header">
                    <strong>{student.fullName}</strong>
                    <small className="text-muted">{student.studentCode}</small>
                  </div>
                  <div className="report-mobile-card__totals">
                    <span className="report-mobile-badge bg-emerald-100 text-emerald-800">
                      {student.totals.H} Hadir
                    </span>
                    <span className="report-mobile-badge bg-amber-100 text-amber-800">
                      {student.totals.S} Sakit
                    </span>
                    <span className="report-mobile-badge bg-sky-100 text-sky-800">
                      {student.totals.I} Izin
                    </span>
                    <span className="report-mobile-badge bg-rose-100 text-rose-800">
                      {student.totals.A} Alpa
                    </span>
                  </div>
                  {student.missingDays > 0 ? (
                    <small className="text-destructive">
                      {student.missingDays} belum dicatat dari {student.expectedDaysToDate} hari wajib.
                    </small>
                  ) : (
                    <small className="text-muted">Semua hari wajib tercatat lengkap.</small>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

      {/* Grid table (horizontal scrollable on mobile, sticky columns on desktop) */}
      <ReportTable report={report} dates={dates} />
    </div>
  );
}
