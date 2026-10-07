"use client";
import type { FormEvent } from "react";
import type { StudentView } from "@/contracts/students";
import type { ClassView, AcademicYearView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
export function StudentForm({
  classes = [],
  years = [],
  current,
  today,
}: {
  classes?: ClassView[];
  years?: AcademicYearView[];
  current?: StudentView;
  today: string;
}) {
  const mutation = useMutation(
    current ? `/api/students/${current.id}` : "/api/students",
    current ? "PATCH" : "POST",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const identity = {
      fullName: data.get("fullName"),
      nis: data.get("nis") || null,
      nisn: data.get("nisn") || null,
    };
    const input = current
      ? { ...identity, expectedVersion: current.version, studentCode: data.get("studentCode") }
      : { ...identity, classId: data.get("classId"), startsOn: data.get("startsOn") };
    if ((await mutation.mutate(input)) && !current) form.reset();
  }
  return (
    <form
      className="resource-form"
      onSubmit={submit}
      data-testid={current ? "student-edit" : "student-create"}
    >
      <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
        <Field
          label="Nama lengkap siswa"
          name="fullName"
          required
          maxLength={200}
          defaultValue={current?.fullName}
        />
        {current && (
          <Field
            label="Kode siswa"
            name="studentCode"
            required
            maxLength={64}
            defaultValue={current.studentCode}
          />
        )}
        <Field label="NIS (opsional)" name="nis" maxLength={64} defaultValue={current?.nis ?? ""} />
        <Field
          label="NISN (opsional)"
          name="nisn"
          maxLength={64}
          defaultValue={current?.nisn ?? ""}
        />
        {!current && (
          <>
            <SelectField label="Kelas awal" name="classId" required>
              {classes
                .filter(
                  (item) =>
                    !item.archivedAt && !years.find((year) => year.id === item.yearId)?.archivedAt,
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {years.find((year) => year.id === item.yearId)?.label} / {item.name}
                  </option>
                ))}
            </SelectField>
            <Field
              label="Tanggal mulai penempatan"
              name="startsOn"
              type="date"
              defaultValue={today}
              required
            />
            <p>Kode siswa dibuat otomatis. Penempatan berakhir pada akhir tahun ajaran kelas.</p>
          </>
        )}
        <Button type="submit" pending={mutation.pending}>
          {current ? "Simpan identitas siswa" : "Tambah siswa"}
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
