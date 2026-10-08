import { z } from "zod";

export const teacherNameSchema = z
  .string()
  .trim()
  .min(1, "Isi nama guru.")
  .max(200, "Nama maksimal 200 karakter.")
  .refine(
    (val) => val.length >= 2 && /\p{L}/u.test(val),
    "Nama minimal 2 huruf.",
  );

export const teacherInputSchema = z
  .object({
    fullName: teacherNameSchema,
    active: z.boolean(),
  })
  .strict();

export const teacherPatchSchema = teacherInputSchema.extend({
  expectedVersion: z.number().int().positive(),
});

export const teacherAccountSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("create"),
      expectedVersion: z.number().int().positive(),
      email: z
        .string()
        .trim()
        .min(1, "Format email belum benar.")
        .email("Format email belum benar.")
        .max(254, "Format email belum benar."),
      password: z
        .string()
        .min(12, "Password minimal 12 karakter.")
        .max(128, "Password maksimal 128 karakter."),
      role: z.enum(["teacher", "admin"], {
        message: "Pilih peran akun.",
      }),
    })
    .strict(),
  z
    .object({
      mode: z.literal("existing"),
      expectedVersion: z.number().int().positive(),
      userId: z
        .string()
        .min(1, "Pilih akun yang akan ditautkan.")
        .max(128),
    })
    .strict(),
]);

export const teacherClassesSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    classIds: z
      .array(z.uuid().transform((value) => value.toLowerCase()))
      .max(1000),
  })
  .strict()
  .refine(
    (value) => new Set(value.classIds).size === value.classIds.length,
    "Kelas tidak boleh ganda.",
  );

export const accessInputSchema = z
  .object({
    expectedVersion: z.number().int().positive().nullable(),
    expectedRole: z.enum(["admin", "teacher"]),
    expectedBanned: z.boolean(),
    role: z.enum(["admin", "teacher"], {
      message: "Pilih peran akun.",
    }),
    banned: z.boolean(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    expectedVersion: z.number().int().positive().nullable(),
    newPassword: z
      .string()
      .min(12, "Password minimal 12 karakter.")
      .max(128, "Password maksimal 128 karakter."),
  })
  .strict();

export type SchoolAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  mustChangePassword: boolean;
};

export type TeacherView = {
  id: string;
  fullName: string;
  active: boolean;
  version: number;
  hasAccount: boolean;
  account: SchoolAccount | null;
  classes: { id: string; name: string }[];
};
