"use client";
import type { FormEvent } from "react";
import type { AcademicYearView, ClassView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
export function ClassForm({ years, current }: { years: AcademicYearView[]; current?: ClassView }) {
  const mutation = useMutation(
    current ? `/api/classes/${current.id}` : "/api/classes",
    current ? "PATCH" : "POST",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      name: data.get("name"),
      grade: current?.hasEnrollment ? current.grade : Number(data.get("grade")),
      yearId: current?.hasEnrollment ? current.yearId : data.get("yearId"),
      ...(current ? { expectedVersion: current.version, archived: data.has("archived") } : {}),
    };
    if ((await mutation.mutate(input)) && !current) form.reset();
  }
  return (
    <form
      className="resource-form"
      onSubmit={submit}
      data-testid={current ? `class-edit-${current.id}` : "class-create"}
    >
      <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
        <Field
          label="Nama kelas"
          name="name"
          required
          maxLength={100}
          defaultValue={current?.name}
        />
        <Field
          label="Tingkat kelas"
          name="grade"
          type="number"
          required
          min={1}
          max={6}
          defaultValue={current?.grade ?? 1}
          readOnly={current?.hasEnrollment}
        />
        <SelectField
          label="Tahun ajaran"
          name="yearId"
          required
          defaultValue={current?.yearId ?? years.find((year) => year.isCurrent)?.id ?? years[0]?.id}
          disabled={current?.hasEnrollment}
        >
          {years
            .filter((year) => !year.archivedAt || year.id === current?.yearId)
            .map((year) => (
              <option key={year.id} value={year.id}>
                {year.label}
              </option>
            ))}
        </SelectField>
        {current?.hasEnrollment && (
          <p>Tingkat dan tahun kelas tetap karena siswa sudah ditempatkan.</p>
        )}
        {current && (
          <label className="checkbox-field">
            <input type="checkbox" name="archived" defaultChecked={Boolean(current.archivedAt)} />
            Diarsipkan
          </label>
        )}
        <Button type="submit" pending={mutation.pending}>
          {current ? "Simpan kelas" : "Tambah kelas"}
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
