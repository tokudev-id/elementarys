"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AcademicYearView, ClassView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { FormSection } from "@/components/form-section";
import { FormActions } from "@/components/form-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@/components/use-mutation";
import { useFormGuard } from "@/components/use-form-guard";
import { MutationFeedback } from "@/components/mutation-feedback";

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
  const { ref: formRef, markDirty, markSaved } = useFormGuard(mutation.errors);
  const [intent, setIntent] = useState<unknown>(null);
  async function save(input: unknown) {
    const result = await mutation.mutate(input);
    if (result) {
      markSaved();
      setIntent(null);
      if (redirect) router.push(`/classes/${result.id}`);
      else if (!current) formRef.current?.reset();
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      name: data.get("name"),
      grade: current?.hasEnrollment ? current.grade : Number(data.get("grade")),
      yearId: current?.hasEnrollment ? current.yearId : data.get("yearId"),
      ...(current ? { expectedVersion: current.version, archived: data.has("archived") } : {}),
    };
    if (current && !current.archivedAt && data.has("archived")) {
      setIntent(input);
      return;
    }
    await save(input);
  }
  function close() {
    setIntent(null);
  }
  function confirmArchive() {
    void save(intent);
  }
  return (
    <>
      <form
        className="resource-form redesigned-form"
        ref={formRef}
        onChange={markDirty}
        onSubmit={submit}
        data-testid={current ? `class-edit-${current.id}` : "class-create"}
      >
        <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
          <FormSection title="Identitas kelas">
            <Field
              label="Nama kelas"
              name="name"
              required
              maxLength={100}
              defaultValue={current?.name}
              error={mutation.errors.name?.[0]}
            />
            <SelectField
              label="Tingkat kelas"
              name="grade"
              required
              defaultValue={current?.grade ?? 1}
              disabled={current?.hasEnrollment}
            >
              {[1, 2, 3, 4, 5, 6].map((grade) => (
                <option value={grade} key={grade}>
                  {grade}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Tahun ajaran"
              name="yearId"
              required
              defaultValue={
                current?.yearId ?? years.find((year) => year.isCurrent)?.id ?? years[0]?.id
              }
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
                <Switch
                  className="form-switch"
                  name="archived"
                  defaultChecked={Boolean(current.archivedAt)}
                />
                Diarsipkan
              </label>
            )}
          </FormSection>
          {redirect ? (
            <FormActions
              cancelHref={current ? `/classes/${current.id}` : "/classes"}
              pending={mutation.pending}
              label={current ? "Simpan kelas" : "Tambah kelas"}
            />
          ) : (
            <Button type="submit" pending={mutation.pending}>
              {current ? "Simpan kelas" : "Tambah kelas"}
            </Button>
          )}
        </fieldset>
        <MutationFeedback mutation={mutation} />
      </form>
      <ConfirmDialog
        open={intent !== null}
        onClose={close}
        onConfirm={confirmArchive}
        title="Arsipkan kelas?"
        label="Arsipkan kelas"
        destructive
        pending={mutation.pending}
      >
        <p>
          Kelas tidak digunakan untuk penempatan baru. Riwayat dan laporan tetap tersedia;
          penempatan berjalan harus ditutup terlebih dahulu.
        </p>
      </ConfirmDialog>
    </>
  );
}
