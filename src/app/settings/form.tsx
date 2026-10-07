"use client";
import { useState, type FormEvent, type ChangeEvent } from "react";
import type { SchoolSettings } from "@/contracts/settings";
import { isTimezone } from "@/domain/calendar";
import { formatSchoolTime } from "@/domain/format";
import { Field } from "@/components/field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";

export function SettingsForm({ initial }: { initial: SchoolSettings }) {
  const [timezone, setTimezone] = useState<string | null>(null);
  const selectedTimezone = timezone ?? initial.timezone;
  function resetDraft() {
    setTimezone(null);
  }
  const mutation = useMutation("/api/settings", "PATCH", resetDraft);
  function changeTimezone(event: ChangeEvent<HTMLInputElement>) {
    setTimezone(event.currentTarget.value);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.mutate({
      expectedVersion: initial.version,
      name: data.get("name"),
      location: data.get("location") || null,
      timezone: data.get("timezone"),
      reason: data.get("reason") || null,
    });
  }
  return (
    <form className="resource-form" onSubmit={submit}>
      <fieldset disabled={mutation.pending}>
        <Field
          key={`name:${initial.version}`}
          label="Nama sekolah"
          name="name"
          defaultValue={initial.name}
          required
          maxLength={200}
        />
        <Field
          key={`location:${initial.version}`}
          label="Lokasi sekolah"
          name="location"
          defaultValue={initial.location ?? ""}
          maxLength={300}
        />
        <Field
          label="Zona waktu"
          name="timezone"
          value={selectedTimezone}
          onChange={changeTimezone}
          required
          hint="Contoh: Asia/Jakarta atau Asia/Kuala_Lumpur."
          error={mutation.errors.timezone?.join(" ")}
        />
        <p>
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
        <Field
          label="Alasan perubahan zona waktu"
          key={`reason:${initial.version}`}
          name="reason"
          error={mutation.errors.reason?.join(" ")}
          maxLength={1000}
          hint={
            initial.hasAttendance
              ? "Wajib bila zona waktu berubah. Tanggal absensi lama tetap sama."
              : "Isi bila perlu menjelaskan perubahan."
          }
        />
        <Button type="submit" pending={mutation.pending}>
          Simpan identitas sekolah
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
