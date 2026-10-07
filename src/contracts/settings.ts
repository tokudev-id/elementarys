import { z } from "zod";
import { isTimezone } from "@/domain/calendar";

export const settingsInputSchema = z
  .object({
    expectedVersion: z.number().int().positive().nullable(),
    name: z.string().trim().min(1, "Isi nama sekolah.").max(200),
    location: z.string().trim().max(300).nullable(),
    timezone: z
      .string()
      .refine(isTimezone, "Zona waktu tidak dikenali. Gunakan contoh Asia/Jakarta."),
    reason: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();
export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type SchoolSettings = {
  name: string;
  location: string | null;
  timezone: string;
  version: number | null;
  configuredAt: string | null;
  hasAttendance: boolean;
  serverNow: string;
  setup: SetupState;
};
export type SetupState = {
  identity: boolean;
  currentYear: boolean;
  weekdays: boolean;
  classes: boolean;
  ready: boolean;
  productionReady: boolean;
  synthetic: boolean;
  missing: string[];
};
