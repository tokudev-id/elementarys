import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";
import { reportInputSchema } from "./reports";

const dateSchema = z.string().refine(isDateOnly, "Tanggal tidak valid.");
const yearFields = z.object({
  label: z.string().trim().min(1).max(100),
  startsOn: dateSchema,
  endsOnExclusive: dateSchema,
  isCurrent: z.boolean(),
});
export const yearInputSchema = yearFields
  .strict()
  .refine(
    (value) => value.endsOnExclusive > value.startsOn,
    "Tanggal akhir harus sesudah tanggal awal.",
  );
export const yearPatchSchema = yearFields
  .partial()
  .extend({
    expectedVersion: z.number().int().positive(),
    archived: z.boolean().optional(),
    expectedCurrentYearId: z.uuid().nullable().optional(),
  })
  .strict();
export const classInputSchema = z
  .object({
    yearId: z.uuid(),
    name: z.string().trim().min(1).max(100),
    grade: z.number().int().min(1).max(6),
  })
  .strict();
export const classPatchSchema = classInputSchema
  .partial()
  .extend({ expectedVersion: z.number().int().positive(), archived: z.boolean().optional() })
  .strict();
export const calendarInputSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    overrides: z
      .array(
        z
          .object({
            date: dateSchema,
            isSchoolDay: z.boolean(),
            reason: z.string().trim().min(1).max(300),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.weekdays).size === value.weekdays.length &&
      new Set(value.overrides.map((item) => item.date)).size === value.overrides.length,
    "Hari/tanggal pengecualian tidak boleh ganda.",
  );
export const calendarQuerySchema = reportInputSchema.pick({ yearId: true, month: true });
export type AcademicYearView = {
  id: string;
  label: string;
  startsOn: string;
  endsOnExclusive: string;
  isCurrent: boolean;
  version: number;
  archivedAt: string | null;
};
export type ClassView = {
  id: string;
  yearId: string;
  name: string;
  grade: number;
  version: number;
  archivedAt: string | null;
  hasEnrollment: boolean;
};
export type CalendarView = {
  year: AcademicYearView;
  month: string;
  weekdays: number[];
  overrides: { date: string; isSchoolDay: boolean; reason: string }[];
  days: { date: string; inYear: boolean; isSchoolDay: boolean; reason: string | null }[];
};
