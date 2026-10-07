"use client";
import type { FormEvent } from "react";
import type { AcademicYearView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";

export function AcademicYearForm({ current }: { current?: AcademicYearView }) {
  const mutation = useMutation(
    current ? `/api/academic-years/${current.id}` : "/api/academic-years",
    current ? "PATCH" : "POST",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      label: data.get("label"),
      startsOn: data.get("startsOn"),
      endsOnExclusive: data.get("endsOnExclusive"),
      isCurrent: data.has("isCurrent"),
      ...(current ? { expectedVersion: current.version, archived: data.has("archived") } : {}),
    };
    if ((await mutation.mutate(input)) && !current) form.reset();
  }
  return (
    <form
      className="resource-form"
      onSubmit={submit}
      data-testid={current ? `year-edit-${current.id}` : "year-create"}
    >
      <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
        <Field
          label="Nama tahun ajaran"
          name="label"
          required
          maxLength={100}
          defaultValue={current?.label}
        />
        <Field
          label="Tanggal mulai"
          name="startsOn"
          type="date"
          required
          defaultValue={current?.startsOn}
        />
        <Field
          label="Berakhir sebelum tanggal"
          name="endsOnExclusive"
          type="date"
          required
          defaultValue={current?.endsOnExclusive}
          hint="Pilih sehari setelah hari terakhir tahun ajaran."
        />
        <label className="checkbox-field">
          <input type="checkbox" name="isCurrent" defaultChecked={current?.isCurrent ?? false} />
          Jadikan tahun ajaran aktif
        </label>
        {current && (
          <label className="checkbox-field">
            <input type="checkbox" name="archived" defaultChecked={Boolean(current.archivedAt)} />
            Diarsipkan
          </label>
        )}
        <Button type="submit" pending={mutation.pending}>
          {current ? "Simpan tahun ajaran" : "Tambah tahun ajaran"}
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
