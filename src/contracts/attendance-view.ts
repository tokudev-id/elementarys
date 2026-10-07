import { z } from "zod";
import { isDateOnly, isTimezone } from "@/domain/calendar";
import { statuses } from "@/domain/attendance";

const dateSchema = z.string().refine(isDateOnly);
const totalsSchema = z.object({
  H: z.number().int().nonnegative(),
  S: z.number().int().nonnegative(),
  I: z.number().int().nonnegative(),
  A: z.number().int().nonnegative(),
});
const sessionFields = {
  sessionState: z.enum(["not_recorded", "submitted", "voided"]),
  sessionVersion: z.number().int().positive().nullable(),
  submittedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
  submittedAt: z.iso.datetime().nullable(),
};

export const attendanceViewSchema = z.object({
  classId: z.uuid(),
  className: z.string(),
  academicYearId: z.uuid(),
  isCurrentYear: z.boolean(),
  date: dateSchema,
  schoolToday: dateSchema,
  schoolName: z.string(),
  timezone: z.string().refine(isTimezone),
  isSchoolDay: z.boolean(),
  calendarReason: z.string().nullable(),
  setupReady: z.boolean(),
  inAcademicYear: z.boolean(),
  ...sessionFields,
  students: z.array(
    z.object({
      enrollmentId: z.uuid(),
      studentId: z.uuid(),
      studentCode: z.string(),
      fullName: z.string(),
      status: z.enum(statuses).nullable(),
    }),
  ),
  totals: totalsSchema.nullable(),
});

export const attendanceSaveSchema = z.object({
  sessionState: z.literal("submitted"),
  sessionVersion: z.number().int().positive(),
  submittedBy: z.object({ id: z.string(), name: z.string() }),
  submittedAt: z.iso.datetime(),
  totals: totalsSchema,
  changed: z.boolean(),
});

export type AttendanceView = z.infer<typeof attendanceViewSchema>;
export type AttendanceSave = z.infer<typeof attendanceSaveSchema>;
export type RosterStudent = AttendanceView["students"][number];
