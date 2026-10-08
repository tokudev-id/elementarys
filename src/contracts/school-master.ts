import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";
import { reportInputSchema } from "./reports";

const dateSchema = z.string().refine(isDateOnly, "Tanggal tidak valid.");

export const yearLabelSchema = z
  .string()
  .trim()
  .min(1, "Gunakan format 2026/2027.")
  .refine((val) => {
    const match = /^(\d{4})\/(\d{4})$/.exec(val);
    if (!match) return false;
    const y1 = Number(match[1]);
    const y2 = Number(match[2]);
    return y2 === y1 + 1;
  }, "Gunakan format 2026/2027.");

const yearFields = z.object({
  label: yearLabelSchema,
  startsOn: z.string().refine(isDateOnly, "Isi tanggal mulai."),
  endsOnExclusive: z.string().refine(isDateOnly, "Isi tanggal akhir."),
  isCurrent: z.boolean(),
});

export const yearInputSchema = yearFields
  .strict()
  .refine(
    (value) => value.endsOnExclusive > value.startsOn,
    "Tanggal akhir harus setelah tanggal mulai.",
  )
  .refine((value) => {
    const start = new Date(value.startsOn).getTime();
    const end = new Date(value.endsOnExclusive).getTime();
    const days = (end - start) / (1000 * 60 * 60 * 24);
    return days <= 400;
  }, "Satu tahun ajaran maksimal 400 hari.");

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
    yearId: z.uuid("Pilih tahun ajaran."),
    name: z
      .string()
      .trim()
      .min(1, "Isi nama kelas.")
      .max(100, "Nama kelas maksimal 100 karakter."),
    grade: z
      .number({ message: "Pilih tingkat 1 sampai 6." })
      .int("Pilih tingkat 1 sampai 6.")
      .min(1, "Pilih tingkat 1 sampai 6.")
      .max(6, "Pilih tingkat 1 sampai 6."),
  })
  .strict();

export const classPatchSchema = classInputSchema
  .partial()
  .extend({
    expectedVersion: z.number().int().positive(),
    archived: z.boolean().optional(),
  })
  .strict();

export const calendarInputSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Pilih minimal satu hari belajar.")
      .max(7),
    overrides: z
      .array(
        z
          .object({
            date: dateSchema,
            isSchoolDay: z.boolean(),
            reason: z
              .string()
              .trim()
              .min(1, "Isi alasan, misalnya Libur Maulid Nabi.")
              .max(300, "Alasan maksimal 300 karakter."),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.weekdays).size === value.weekdays.length &&
      new Set(value.overrides.map((item) => item.date)).size ===
        value.overrides.length,
    "Hari/tanggal pengecualian tidak boleh ganda.",
  );

export const calendarQuerySchema = reportInputSchema.pick({
  yearId: true,
  month: true,
});

export type ClassInput = z.infer<typeof classInputSchema>;
export type ClassPatchInput = z.infer<typeof classPatchSchema>;

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
  days: {
    date: string;
    inYear: boolean;
    isSchoolDay: boolean;
    reason: string | null;
  }[];
};
