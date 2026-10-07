import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";
const identityFields = {
  fullName: z.string().trim().min(1, "Isi nama siswa.").max(200),
  nis: z.string().trim().max(64).nullable(),
  nisn: z.string().trim().max(64).nullable(),
};
export const studentInputSchema = z
  .object({
    ...identityFields,
    classId: z.uuid(),
    startsOn: z.string().refine(isDateOnly, "Tanggal mulai tidak valid."),
  })
  .strict();
export const studentPatchSchema = z
  .object({
    ...identityFields,
    studentCode: z.string().trim().min(1).max(64),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
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
  }[];
};
