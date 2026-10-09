"use client";

import { useState, useMemo, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  AcademicYearView,
  ClassView,
  ClassInput,
  ClassPatchInput,
} from "@/contracts/school-master";
import { classInputSchema, classPatchSchema } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { SwitchField } from "@/components/switch-field";
import { Button } from "@/components/button";
import { FormSection } from "@/components/form-section";
import { FormActions } from "@/components/form-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMutation } from "@/components/use-mutation";
import { useFormGuard } from "@/components/use-form-guard";
import { MutationFeedback } from "@/components/mutation-feedback";
import { useZodForm, type ZodLikeSchema } from "@/components/use-zod-form";
import { FormErrorSummary } from "@/components/form-error-summary";

type ClassFormValues = {
  name: string;
  grade: number;
  yearId: string;
  expectedVersion?: number;
  archived?: boolean;
};

export function ClassForm({
  years,
  current,
  redirect = false,
}: {
  years: AcademicYearView[];
  current?: ClassView;
  redirect?: boolean;
}) {
  const router = useRouter();
  const mutation = useMutation(
    current ? `/api/classes/${current.id}` : "/api/classes",
    current ? "PATCH" : "POST",
    undefined,
    { refresh: !redirect, successMessage: "Data kelas tersimpan" },
  );
  const { markDirty, markSaved } = useFormGuard(mutation.errors);
  const [intent, setIntent] = useState<unknown>(null);

  async function save(input: unknown) {
    const result = await mutation.mutate(input);
    if (result) {
      markSaved();
      setIntent(null);
      if (redirect) router.push(`/classes/${result.id}`);
      else if (!current) form.reset();
    }
  }

  const defaultYearId = useMemo(
    () => years.find((item) => item.isCurrent && !item.archivedAt)?.id ?? years[0]?.id ?? "",
    [years],
  );

  const schema = (current ? classPatchSchema : classInputSchema) as ZodLikeSchema<
    ClassPatchInput | ClassInput
  >;

  const form = useZodForm<ClassPatchInput | ClassInput, ClassFormValues>(schema, {
    defaultValues: current
      ? {
          name: current.name,
          grade: current.grade,
          yearId: current.yearId,
          expectedVersion: current.version,
          archived: Boolean(current.archivedAt),
        }
      : {
          name: "",
          grade: 1,
          yearId: defaultYearId,
        },
    serverErrors: mutation.errors,
    onSubmit: async (data) => {
      const input = {
        name: data.name,
        grade: current?.hasEnrollment ? current.grade : Number(data.grade),
        yearId: current?.hasEnrollment ? current.yearId : data.yearId,
        ...(current
          ? {
              expectedVersion: current.version,
              archived: "archived" in data ? Boolean(data.archived) : false,
            }
          : {}),
      };

      if (current && !current.archivedAt && "archived" in data && data.archived) {
        setIntent(input);
        return;
      }
      await save(input);
    },
  });

  function close() {
    setIntent(null);
  }

  async function confirmArchive() {
    if (intent) await save(intent);
  }

  function handleArchivedChange(checked: boolean) {
    form.setValue("archived", checked);
  }

  function handleGradeChange(e: ChangeEvent<HTMLSelectElement>) {
    form.setValue("grade", Number(e.target.value));
  }

  function handleYearIdChange(e: ChangeEvent<HTMLSelectElement>) {
    form.setValue("yearId", e.target.value);
  }

  return (
    <form
      className="resource-form redesigned-form"
      {...form.formProps}
      onChange={markDirty}
      data-testid={current ? `class-edit-${current.id}` : "class-create"}
    >
      <FormErrorSummary errors={form.errorSummary} />
      <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
        <FormSection
          title="Data kelas"
          actions={
            redirect ? (
              <FormActions
                cancelHref={current ? `/classes/${current.id}` : "/classes"}
                pending={mutation.pending}
                label={current ? "Simpan kelas" : "Tambah kelas"}
              />
            ) : (
              <Button type="submit" pending={mutation.pending}>
                {current ? "Simpan kelas" : "Tambah kelas"}
              </Button>
            )
          }
        >
          <Field label="Nama kelas" required maxLength={100} {...form.register("name")} />
          <SelectField
            label="Tingkat kelas"
            required
            disabled={current?.hasEnrollment}
            value={form.values.grade ?? 1}
            onChange={handleGradeChange}
            error={form.errors.grade}
          >
            {[1, 2, 3, 4, 5, 6].map((grade) => (
              <option key={grade} value={grade}>
                Kelas {grade}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Tahun ajaran"
            required
            disabled={current?.hasEnrollment}
            value={form.values.yearId ?? defaultYearId}
            onChange={handleYearIdChange}
            error={form.errors.yearId}
          >
            {years
              .filter((item) => (current ? true : !item.archivedAt))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {item.isCurrent ? " (aktif)" : ""}
                </option>
              ))}
          </SelectField>
          {current?.hasEnrollment && (
            <p>
              Tingkat dan tahun ajaran dikunci karena kelas sudah memiliki riwayat penempatan siswa.
            </p>
          )}
          {current && (
            <SwitchField
              label="Arsipkan kelas"
              checked={Boolean(form.values.archived)}
              onCheckedChange={handleArchivedChange}
              name="archived"
            />
          )}
        </FormSection>
      </fieldset>
      <MutationFeedback mutation={mutation} />
      <ConfirmDialog
        open={intent !== null}
        onClose={close}
        title="Arsipkan kelas ini?"
        onConfirm={confirmArchive}
        pending={mutation.pending}
        destructive
        label="Arsipkan kelas"
      >
        <p>
          Kelas yang diarsipkan tidak dapat menerima penempatan siswa baru atau pencatatan absensi
          baru. Riwayat dan rekap tetap dapat dibaca.
        </p>
      </ConfirmDialog>
    </form>
  );
}
