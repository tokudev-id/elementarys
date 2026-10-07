import type { ClassReport } from "@/contracts/reports";

export function ReportLegend() {
  return (
    <p className="report-legend">
      H: Hadir · S: Sakit · I: Izin · A: Alpa · ?: Belum dicatat · L: Libur · -: Di luar penempatan
      · .: Hari mendatang
    </p>
  );
}

export function ReportChangeNotice({ report }: { report: ClassReport }) {
  const reference = report.exportReference;
  if (!reference?.changedDates.length) return null;
  return (
    <p role="status">
      Berubah setelah ekspor terakhir oleh {reference.exportedBy} pada {reference.exportedAt}.
      Tanggal berubah: {reference.changedDates.join(", ")}.
    </p>
  );
}

export function ReportTable({ report, dates }: { report: ClassReport; dates: string[] }) {
  return (
    <div
      className="report-table-scroll"
      role="region"
      aria-label={`Tabel tanggal ${report.name}`}
      tabIndex={0}
    >
      <table className="report-table">
        <caption>Catatan harian {report.name}</caption>
        <thead>
          <tr>
            <th scope="col">Siswa</th>
            {dates.map((date) => (
              <th key={date} scope="col">
                {Number(date.slice(-2))}
              </th>
            ))}
            <th scope="col">H</th>
            <th scope="col">S</th>
            <th scope="col">I</th>
            <th scope="col">A</th>
          </tr>
        </thead>
        <tbody>
          {report.students.map((student) => (
            <tr key={student.studentId}>
              <th scope="row">
                {student.fullName}
                <small>{student.studentCode}</small>
              </th>
              {student.cells.map((cell, index) => (
                <td key={dates[index]}>{cell}</td>
              ))}
              <td>{student.totals.H}</td>
              <td>{student.totals.S}</td>
              <td>{student.totals.I}</td>
              <td>{student.totals.A}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
