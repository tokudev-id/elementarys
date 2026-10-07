export const statuses = ["H", "S", "I", "A"] as const;
export type AttendanceStatus = (typeof statuses)[number];
export type AttendanceTotals = Record<AttendanceStatus, number>;
export function attendanceTotals(entries: { status: AttendanceStatus }[]): AttendanceTotals {
  const totals: AttendanceTotals = { H: 0, S: 0, I: 0, A: 0 };
  for (const entry of entries) totals[entry.status]++;
  return totals;
}
