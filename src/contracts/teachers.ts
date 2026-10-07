import { z } from "zod";
export const teacherInputSchema = z
  .object({ fullName: z.string().trim().min(1).max(200), active: z.boolean() })
  .strict();
export const teacherPatchSchema = teacherInputSchema.extend({
  expectedVersion: z.number().int().positive(),
});
export const teacherAccountSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("create"),
      expectedVersion: z.number().int().positive(),
      email: z.email().max(254),
      password: z.string().min(12).max(128),
      role: z.enum(["teacher", "admin"]),
    })
    .strict(),
  z
    .object({
      mode: z.literal("existing"),
      expectedVersion: z.number().int().positive(),
      userId: z.string().min(1).max(128),
    })
    .strict(),
]);
export const teacherClassesSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    classIds: z.array(z.uuid().transform((value) => value.toLowerCase())).max(1000),
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
    role: z.enum(["admin", "teacher"]),
    banned: z.boolean(),
  })
  .strict();
export const resetPasswordSchema = z
  .object({
    expectedVersion: z.number().int().positive().nullable(),
    newPassword: z.string().min(12).max(128),
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
