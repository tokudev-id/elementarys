"use client";

import { useMemo } from "react";
import type { StudentView, StudentInput, StudentPatchInput } from "@/contracts/students";
import { studentInputSchema, studentPatchSchema } from "@/contracts/students";
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
import { useZodForm, type ZodLikeSchema } from "@/components/use-zod-form";
import { FormErrorSummary } from "@/components/form-error-summary";

type StudentFormValues = {
  fullName: string;
  nis: string;
  nisn: string;
  classId?: string;
  startsOn?: string;
  expectedVersion?: number;
};

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
  const { markDirty, markSaved } = useFormGuard(mutation.errors);

  const availableClasses = useMemo(
    () =>
      classes.filter(
        (item) => !item.archivedAt && !years.find((year) => year.id === item.yearId)?.archivedAt,
      ),
    [classes, years],
  );

  const initialClassId = availableClasses[0]?.id ?? "";

  const defaultValues = useMemo(
    () =>
      current
        ? {
            fullName: current.fullName,
            studentCode: current.studentCode,
            nis: current.nis ?? "",
            nisn: current.nisn ?? "",
            expectedVersion: current.version,
          }
        : {
            fullName: "",
            nis: "",
            nisn: "",
            classId: initialClassId,
            startsOn: today,
          },
    [current, initialClassId, today],
  );

  const schema = (current ? studentPatchSchema : studentInputSchema) as ZodLikeSchema<
    StudentPatchInput | StudentInput
  >;
  const form = useZodForm<StudentPatchInput | StudentInput, StudentFormValues>(schema, {
    defaultValues,
    serverErrors: mutation.errors,
    onSubmit: async (validatedData) => {
      const saved = await mutation.mutate(validatedData);
      if (saved) {
        markSaved();
        if (redirect) router.push(`/students/${saved.id}`);
        else if (!current) form.reset();
      }
    },
  });

  return (
    <form
      className="resource-form redesigned-form"
      {...form.formProps}
      onChange={markDirty}
      data-testid={current ? "student-edit" : "student-create"}
    >
      <FormErrorSummary errors={form.errorSummary} />
      <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
        <FormSection
          title="Identitas siswa"
          actions={
            current ? (
              redirect ? (
                <FormActions
                  cancelHref={`/students/${current.id}`}
                  pending={mutation.pending}
                  label="Simpan identitas siswa"
                />
              ) : (
                <Button type="submit" pending={mutation.pending}>
                  Simpan identitas siswa
                </Button>
              )
            ) : undefined
          }
        >
          <Field
            label="Nama lengkap siswa"
            required
            maxLength={200}
            {...form.register("fullName")}
          />
          {current && (
            <Field label="Kode siswa" required maxLength={64} {...form.register("studentCode")} />
          )}
          <Field label="NIS" maxLength={30} {...form.register("nis")} />
          <Field label="NISN" maxLength={10} {...form.register("nisn")} />
        </FormSection>
        {!current && (
          <FormSection
            title="Penempatan awal"
            description="Kode siswa dibuat otomatis. Tanggal akhir penempatan mengikuti tahun ajaran kelas."
            actions={
              redirect ? (
                <FormActions
                  cancelHref="/students"
                  pending={mutation.pending}
                  label="Tambah siswa"
                />
              ) : (
                <Button type="submit" pending={mutation.pending}>
                  Tambah siswa
                </Button>
              )
            }
          >
            <SelectField label="Kelas awal" required {...form.register("classId")}>
              {availableClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {years.find((year) => year.id === item.yearId)?.label} / {item.name}
                </option>
              ))}
            </SelectField>
            <Field
              label="Tanggal mulai penempatan"
              type="date"
              required
              {...form.register("startsOn")}
            />
          </FormSection>
        )}
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
