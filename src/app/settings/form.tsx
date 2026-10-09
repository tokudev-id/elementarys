"use client";

import { useMemo, useEffect } from "react";
import type { SchoolSettings, SettingsInput } from "@/contracts/settings";
import { settingsInputSchema } from "@/contracts/settings";
import { isTimezone } from "@/domain/calendar";
import { formatSchoolTime } from "@/domain/format";
import { Field } from "@/components/field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
import { useZodForm } from "@/components/use-zod-form";
import { FormErrorSummary } from "@/components/form-error-summary";
import { DataCard, DataCardHeader, DataCardContent, DataCardFooter } from "@/components/data-card";

const primaryIndonesianZones = [
  { value: "Asia/Jakarta", label: "WIB (Asia/Jakarta · UTC+7)" },
  { value: "Asia/Makassar", label: "WITA (Asia/Makassar · UTC+8)" },
  { value: "Asia/Jayapura", label: "WIT (Asia/Jayapura · UTC+9)" },
];

export function SettingsForm({ initial }: { initial: SchoolSettings }) {
  const mutation = useMutation("/api/settings", "PATCH");

  const form = useZodForm<SettingsInput>(settingsInputSchema, {
    defaultValues: {
      expectedVersion: initial.version,
      name: initial.name,
      location: initial.location ?? "",
      timezone: initial.timezone,
      reason: "",
    },
    serverErrors: mutation.errors,
    onSubmit: async (data: SettingsInput) => {
      const isTimezoneChanged = data.timezone !== initial.timezone;
      await mutation.mutate({
        expectedVersion: initial.version,
        name: data.name,
        location: data.location || null,
        timezone: data.timezone,
        reason: isTimezoneChanged ? data.reason || null : null,
      });
    },
  });

  const selectedTimezone =
    typeof form.values.timezone === "string" ? form.values.timezone : initial.timezone;
  const isTimezoneChanged = selectedTimezone !== initial.timezone;

  const resetForm = form.reset;
  useEffect(() => {
    resetForm({
      expectedVersion: initial.version,
      name: initial.name,
      location: initial.location ?? "",
      timezone: initial.timezone,
      reason: "",
    });
  }, [resetForm, initial.version, initial.name, initial.location, initial.timezone]);

  // Build complete list of IANA timezones
  const ianaTimezones = useMemo(() => {
    try {
      if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        return (
          Intl as unknown as { supportedValuesOf: (key: string) => string[] }
        ).supportedValuesOf("timeZone");
      }
    } catch {
      // fallback
    }
    return [
      "Asia/Jakarta",
      "Asia/Makassar",
      "Asia/Jayapura",
      "Asia/Kuala_Lumpur",
      "Asia/Singapore",
      "Asia/Bangkok",
      "UTC",
    ];
  }, []);

  function handleSelectZone(event: React.MouseEvent<HTMLButtonElement>) {
    const zone = event.currentTarget.getAttribute("data-zone");
    if (zone) {
      form.setValue("timezone", zone);
    }
  }

  return (
    <form className="resource-form redesigned-form" {...form.formProps}>
      <DataCard className="settings-form-card">
        <DataCardHeader title="Identitas sekolah" />
        <DataCardContent className="data-card__content--padded">
          <FormErrorSummary errors={form.errorSummary} />
          <fieldset disabled={mutation.pending} key={initial.version ?? "initial"}>
            <Field label="Nama sekolah" required maxLength={200} {...form.register("name")} />
            <Field label="Lokasi sekolah" maxLength={300} {...form.register("location")} />

            <div className="timezone-selection-group">
              <div className="timezone-quick-buttons">
                {primaryIndonesianZones.map((z) => (
                  <Button
                    key={z.value}
                    type="button"
                    variant={selectedTimezone === z.value ? "secondary" : "ghost"}
                    data-zone={z.value}
                    onClick={handleSelectZone}
                  >
                    {z.label}
                  </Button>
                ))}
              </div>

              <Field
                label="Zona waktu"
                required
                list="iana-timezones"
                hint="Pilih salah satu zona waktu Indonesia di atas atau cari zona IANA lainnya."
                {...form.register("timezone")}
              />
              <datalist id="iana-timezones">
                {primaryIndonesianZones.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
                {ianaTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </datalist>
            </div>

            <p className="timezone-preview-note">
              Waktu sekolah saat ini:{" "}
              {isTimezone(initial.timezone)
                ? formatSchoolTime(initial.serverNow, initial.timezone)
                : "Zona waktu belum valid"}
              . Setelah perubahan:{" "}
              {isTimezone(selectedTimezone)
                ? formatSchoolTime(initial.serverNow, selectedTimezone)
                : "Zona waktu belum valid"}
              .
            </p>

            {isTimezoneChanged && (
              <Field
                label="Alasan perubahan zona waktu"
                required={initial.hasAttendance}
                maxLength={1000}
                hint={
                  initial.hasAttendance
                    ? "Wajib bila zona waktu berubah. Tanggal absensi lama tetap sama."
                    : "Isi bila perlu menjelaskan perubahan."
                }
                {...form.register("reason")}
              />
            )}
          </fieldset>
        </DataCardContent>
        <DataCardFooter>
          <div className="form-actions">
            <Button type="submit" pending={mutation.pending}>
              Simpan identitas sekolah
            </Button>
          </div>
        </DataCardFooter>
      </DataCard>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
