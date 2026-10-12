import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";

export const studentNameSchema = z
  .string()
  .trim()
  .min(1, "Isi nama siswa.")
  .max(200, "Nama maksimal 200 karakter.")
  .refine((val) => val.length >= 2 && /\p{L}/u.test(val), "Nama minimal 2 huruf.");

export const studentNisSchema = z
  .string()
  .trim()
  .max(30, "NIS maksimal 30 karakter.")
  .refine(
    (val) => val === "" || /^[0-9./-]+$/.test(val),
    "NIS hanya boleh angka, titik, garis miring, atau strip.",
  )
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .optional();

export const studentNisnSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || /^[0-9]{10}$/.test(val), "NISN harus 10 digit angka.")
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .optional();

export const studentCodeSchema = z
  .string()
  .trim()
  .min(1, "Kode hanya boleh huruf, angka, dan strip.")
  .max(64, "Kode hanya boleh huruf, angka, dan strip.")
  .regex(/^[a-zA-Z0-9-]+$/, "Kode hanya boleh huruf, angka, dan strip.");

const identityFields = {
  fullName: studentNameSchema,
  nis: studentNisSchema,
  nisn: studentNisnSchema,
};

export const studentInputSchema = z
  .object({
    ...identityFields,
    classId: z.uuid("Pilih kelas awal."),
    startsOn: z.string().refine(isDateOnly, "Tanggal mulai tidak valid."),
  })
  .strict();

export const studentPatchSchema = z
  .object({
    ...identityFields,
    studentCode: studentCodeSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export type StudentInput = z.infer<typeof studentInputSchema>;
export type StudentPatchInput = z.infer<typeof studentPatchSchema>;

export type StudentView = {
  id: string;
  studentCode: string;
  fullName: string;
  nis: string | null;
  nisn: string | null;
  version: number;
  archivedAt: string | null;
};

export type StudentDetail = StudentView & {
  enrollments: {
    id: string;
    classId: string;
    className: string;
    yearLabel: string;
    startsOn: string;
    endsOnExclusive: string;
    cancelled: boolean;
    /** ended early through "Tutup penempatan" or a transfer (has an exit reason) */
    closed: boolean;
  }[];
};
