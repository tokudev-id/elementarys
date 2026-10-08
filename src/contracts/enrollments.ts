import { z } from "zod";
import { isDateOnly } from "@/domain/calendar";

const date = z.string().refine(isDateOnly, "Tanggal tidak valid.");
const reason = z
  .string()
  .trim()
  .min(1, "Isi alasan perubahan.")
  .max(1000, "Alasan maksimal 1000 karakter.");

const placementFields = {
  expectedVersion: z.number().int().positive(),
  classId: z.uuid("Pilih kelas tujuan.").transform((value) => value.toLowerCase()),
  startsOn: date,
  reason,
};

export const enrollmentInputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("placement"), ...placementFields }).strict(),
  z
    .object({
      mode: z.literal("transfer"),
      ...placementFields,
      fromEnrollmentId: z.uuid().transform((value) => value.toLowerCase()),
    })
    .strict(),
]);

export const enrollmentEndSchema = z
  .object({
    expectedVersion: placementFields.expectedVersion,
    endsOnExclusive: date,
    reason: z
      .string()
      .trim()
      .min(1, "Isi alasan siswa keluar.")
      .max(1000, "Alasan maksimal 1000 karakter."),
  })
  .strict();

export const studentArchiveSchema = z
  .object({
    expectedVersion: placementFields.expectedVersion,
    archived: z.boolean(),
    reason: z
      .string()
      .trim()
      .min(1, "Isi alasan arsip.")
      .max(1000, "Alasan maksimal 1000 karakter."),
  })
  .strict();

export const promotionInputSchema = z
  .object({
    entries: z
      .array(
        z
          .object({
            studentId: z.uuid().transform((value) => value.toLowerCase()),
            ...placementFields,
          })
          .strict(),
      )
      .min(1, "Pilih minimal satu siswa.")
      .max(100),
  })
  .strict()
  .refine(
    (data) =>
      new Set(data.entries.map((entry) => entry.studentId)).size ===
      data.entries.length,
    "Siswa tidak boleh duplikat.",
  );

export const promotionPreviewSchema = z.object({
  items: z.array(
    z.object({
      studentId: z.uuid(),
      name: z.string(),
      code: z.string(),
      ready: z.boolean(),
      message: z.string(),
    }),
  ),
});

export const promotionResultSchema = z.object({
  saved: z.literal(true),
  id: z.string(),
  results: z.array(
    z.object({ studentId: z.uuid(), version: z.number().int().positive() }),
  ),
});

export type PlacementInput = z.infer<typeof enrollmentInputSchema>;
export type PromotionInput = z.infer<typeof promotionInputSchema>;
export type PromotionPreview = z.infer<typeof promotionPreviewSchema>;
export type PromotionResult = z.infer<typeof promotionResultSchema>;
