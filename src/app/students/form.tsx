"use client";
import type { FormEvent } from "react";
import type { StudentView } from "@/contracts/students";
import type { ClassView, AcademicYearView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
import { useRouter } from "next/navigation";
import { FormSection } from "@/components/form-section";
import { FormActions } from "@/components/form-actions";
import { useFormGuard } from "@/components/use-form-guard";
export function StudentForm({
  classes = [],
  years = [],
  current,
  today,
  redirect = false,
}: {
  classes?: ClassView[];
  years?: AcademicYearView[];
  current?: StudentView;
  today: string;
  redirect?: boolean;
}) {
  const router = useRouter();
  const mutation = useMutation(
    current ? `/api/students/${current.id}` : "/api/students",
    current ? "PATCH" : "POST",
    undefined,
    { refresh: !redirect, successMessage: "Data siswa tersimpan" },
  );
  const { ref: formRef, markDirty, markSaved } = useFormGuard(mutation.errors);
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
    const saved = await mutation.mutate(input);
    if (saved) {
      markSaved();
      if (redirect) router.push(`/students/${saved.id}`);
      else if (!current) form.reset();
    }
  }
  return (
    <form
      className="resource-form redesigned-form"
      onSubmit={submit}
      ref={formRef}
      onChange={markDirty}
      data-testid={current ? "student-edit" : "student-create"}
    >
      <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
        <FormSection title="Identitas">
          <Field
            label="Nama lengkap siswa"
            name="fullName"
            required
            maxLength={200}
            defaultValue={current?.fullName}
            error={mutation.errors.fullName?.[0]}
          />
          {current && (
            <Field
              label="Kode siswa"
              name="studentCode"
              required
              maxLength={64}
              defaultValue={current.studentCode}
              error={mutation.errors.studentCode?.[0]}
            />
          )}
          <Field
            label="NIS (opsional)"
            name="nis"
            maxLength={64}
            defaultValue={current?.nis ?? ""}
            error={mutation.errors.nis?.[0]}
          />
          <Field
            label="NISN (opsional)"
            name="nisn"
            maxLength={64}
            defaultValue={current?.nisn ?? ""}
            error={mutation.errors.nisn?.[0]}
          />
        </FormSection>
        {!current && (
          <FormSection
            title="Penempatan awal"
            description="Kode siswa dibuat otomatis. Tanggal akhir penempatan mengikuti tahun ajaran kelas."
          >
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
              error={mutation.errors.startsOn?.[0]}
            />
          </FormSection>
        )}
        {redirect ? (
          <FormActions
            cancelHref={current ? `/students/${current.id}` : "/students"}
            pending={mutation.pending}
            label={current ? "Simpan identitas siswa" : "Tambah siswa"}
          />
        ) : (
          <Button type="submit" pending={mutation.pending}>
            {current ? "Simpan identitas siswa" : "Tambah siswa"}
          </Button>
        )}
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
