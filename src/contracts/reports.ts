import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";
import type { AttendanceTotals } from "@/domain/attendance";
import type { ReportCell } from "@/domain/report";

export const reportInputSchema = z
  .object({
    yearId: z.uuid(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .refine((value) => isDateOnly(`${value}-01`)),
    classId: z.uuid().optional(),
  })
  .strict();
export type ReportInput = z.infer<typeof reportInputSchema>;
export type ReportStudent = {
  studentId: string;
  studentCode: string;
  fullName: string;
  cells: ReportCell[];
  totals: AttendanceTotals;
  missingDays: number;
  recordedDays: number;
  expectedDaysToDate: number;
};
export type ClassReport = {
  classId: string;
  name: string;
  grade: number;
  students: ReportStudent[];
  totals: AttendanceTotals;
  missingDays: number;
  complete: boolean;
  exportReference: { exportedAt: string; exportedBy: string; changedDates: string[] } | null;
};
export type MonthlyReport = {
  input: ReportInput;
  schoolName: string;
  timezone: string;
  schoolToday: string;
  academicYearLabel: string;
  generatedAt: string;
  dates: string[];
  classes: ClassReport[];
  sessionVersions: Record<string, number>;
  complete: boolean;
};
