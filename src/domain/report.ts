import { type AttendanceStatus, type AttendanceTotals, statuses } from "./attendance";
import { isDateOnly } from "./calendar";

export type ReportCell = AttendanceStatus | "-" | "L" | "." | "?";
export function monthDates(month: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(month) || !isDateOnly(`${month}-01`))
    throw new Error("Bulan tidak valid.");
  const current = new Date(`${month}-01T12:00:00Z`);
  const dates: string[] = [];
  while (current.toISOString().slice(0, 7) === month) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}
export function reportCell(
  date: string,
  enrolled: boolean,
  schoolDay: boolean,
  today: string,
  status: AttendanceStatus | undefined,
): ReportCell {
  if (!enrolled) return "-";
  if (!schoolDay) return "L";
  if (date > today) return ".";
  return status ?? "?";
}
export function summarizeCells(cells: ReportCell[]) {
  const totals: AttendanceTotals = { H: 0, S: 0, I: 0, A: 0 };
  let missingDays = 0;
  for (const cell of cells) {
    if (cell === "?") missingDays++;
    else if (statuses.includes(cell as AttendanceStatus)) totals[cell as AttendanceStatus]++;
  }
  const recordedDays = totals.H + totals.S + totals.I + totals.A;
  return { totals, missingDays, recordedDays, expectedDaysToDate: recordedDays + missingDays };
}
