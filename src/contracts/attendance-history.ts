import { z } from "zod";
import { statuses } from "@/domain/attendance";
import { isDateOnly, isTimezone } from "@/domain/calendar";

export const voidAttendanceSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().min(1, "Isi alasan pembatalan.").max(1000),
  })
  .strict();

const snapshotSchema = z.object({
  state: z.enum(["not_recorded", "submitted", "voided"]),
  version: z.number().int().positive().nullable(),
  entries: z.array(
    z.object({
      enrollmentId: z.uuid(),
      studentId: z.uuid(),
      status: z.enum(statuses).nullable(),
    }),
  ),
});

export const attendanceHistoryEventSchema = z.object({
  id: z.uuid(),
  action: z.enum(["attendance.submit", "attendance.correct", "attendance.void"]),
  actor: z.object({ id: z.string(), name: z.string() }),
  occurredAt: z.iso.datetime(),
  reason: z.string().nullable(),
  before: snapshotSchema,
  after: snapshotSchema,
});

export const attendanceHistorySchema = z.object({
  classId: z.uuid(),
  className: z.string(),
  date: z.string().refine(isDateOnly),
  schoolName: z.string(),
  schoolToday: z.string().refine(isDateOnly),
  timezone: z.string().refine(isTimezone),
  students: z.array(z.object({ id: z.uuid(), name: z.string(), code: z.string() })),
  events: z.array(attendanceHistoryEventSchema),
});
export type AttendanceHistory = z.infer<typeof attendanceHistorySchema>;
