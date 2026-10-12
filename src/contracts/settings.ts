import { z } from "zod";
import { isTimezone } from "@/domain/calendar";

export const settingsInputSchema = z
  .object({
    expectedVersion: z.number().int().positive().nullable(),
    name: z
      .string()
      .trim()
      .min(1, "Isi nama sekolah.")
      .max(200, "Nama sekolah maksimal 200 karakter."),
    location: z.string().trim().max(300, "Lokasi maksimal 300 karakter.").nullable().default(null),
    timezone: z.string().trim().min(1, "Pilih zona waktu.").refine(isTimezone, "Pilih zona waktu."),
    reason: z
      .string()
      .trim()
      .max(1000, "Isi alasan perubahan zona waktu.")
      .nullable()
      .default(null),
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
