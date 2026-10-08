import { z } from "zod";

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Isi email.")
      .email("Format email belum benar.")
      .max(254, "Format email belum benar."),
    password: z.string().min(1, "Isi password."),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Isi password saat ini."),
    newPassword: z
      .string()
      .min(12, "Password minimal 12 karakter.")
      .max(128, "Password maksimal 128 karakter."),
    confirmNewPassword: z.string().min(1, "Password belum sama."),
  })
  .strict()
  .refine(
    (data) => data.newPassword !== data.currentPassword,
    {
      message: "Gunakan password yang berbeda.",
      path: ["newPassword"],
    },
  )
  .refine(
    (data) => data.confirmNewPassword === data.newPassword,
    {
      message: "Password belum sama.",
      path: ["confirmNewPassword"],
    },
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
