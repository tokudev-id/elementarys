"use client";

import { useRouter } from "next/navigation";
import type { AcademicYearView } from "@/contracts/school-master";
import { yearLabelSchema } from "@/contracts/school-master";
import { isDateOnly } from "@/domain/calendar";
import { z } from "zod";
import { Field } from "@/components/field";
import { SwitchField } from "@/components/switch-field";
import { FormSection } from "@/components/form-section";
import { FormActions } from "@/components/form-actions";
import { useMutation } from "@/components/use-mutation";
import { useFormGuard } from "@/components/use-form-guard";
import { MutationFeedback } from "@/components/mutation-feedback";
import { useZodForm, type ZodLikeSchema } from "@/components/use-zod-form";
import { FormErrorSummary } from "@/components/form-error-summary";

const academicYearFormSchema = z
  .object({
    label: yearLabelSchema,
    startsOn: z.string().refine(isDateOnly, "Isi tanggal mulai."),
    endsOnExclusive: z.string().refine(isDateOnly, "Tanggal akhir harus setelah tanggal mulai."),
    isCurrent: z.boolean(),
    archived: z.boolean().optional(),
  })
  .refine(
    (value) => value.endsOnExclusive > value.startsOn,
    "Tanggal akhir harus setelah tanggal mulai.",
  )
  .refine((value) => {
    const start = new Date(value.startsOn).getTime();
    const end = new Date(value.endsOnExclusive).getTime();
    const days = (end - start) / (1000 * 60 * 60 * 24);
    return days <= 400;
  }, "Satu tahun ajaran maksimal 400 hari.");

type AcademicYearFormData = z.infer<typeof academicYearFormSchema>;

export function AcademicYearForm({
  current,
  redirect = true,
}: {
  current?: AcademicYearView;
  redirect?: boolean;
}) {
  const router = useRouter();
  const mutation = useMutation(
    current ? `/api/academic-years/${current.id}` : "/api/academic-years",
    current ? "PATCH" : "POST",
    undefined,
    { refresh: !redirect, successMessage: "Tahun ajaran berhasil disimpan." },
  );
  const { markDirty, markSaved } = useFormGuard(mutation.errors);

  const form = useZodForm<AcademicYearFormData, AcademicYearFormData>(
    academicYearFormSchema as ZodLikeSchema<AcademicYearFormData>,
    {
      defaultValues: current
        ? {
            label: current.label,
            startsOn: current.startsOn,
            endsOnExclusive: current.endsOnExclusive,
            isCurrent: current.isCurrent,
            archived: Boolean(current.archivedAt),
          }
        : {
            label: "",
            startsOn: "",
            endsOnExclusive: "",
            isCurrent: false,
            archived: false,
          },
      serverErrors: mutation.errors,
      onSubmit: async (data) => {
        const input = {
          label: data.label,
          startsOn: data.startsOn,
          endsOnExclusive: data.endsOnExclusive,
          isCurrent: data.isCurrent,
          ...(current
            ? {
                expectedVersion: current.version,
                archived: data.archived,
              }
            : {}),
        };
        const result = await mutation.mutate(input);
        if (result) {
          markSaved();
          if (redirect) {
            router.push("/academic-years");
            router.refresh();
          } else if (!current) {
            form.reset();
          }
        }
      },
    },
  );

  function handleCurrentChange(checked: boolean) {
    form.setValue("isCurrent", checked);
  }

  function handleArchivedChange(checked: boolean) {
    form.setValue("archived", checked);
  }

  return (
    <form
      className="resource-form redesigned-form"
      {...form.formProps}
      onChange={markDirty}
      data-testid={current ? `year-edit-${current.id}` : "year-create"}
    >
      <FormErrorSummary errors={form.errorSummary} />
      <fieldset disabled={mutation.pending} key={current?.version ?? "create"}>
        <FormSection
          title="Periode tahun ajaran"
          actions={
            <FormActions
              cancelHref="/academic-years"
              pending={mutation.pending}
              label={current ? "Simpan tahun ajaran" : "Tambah tahun ajaran"}
            />
          }
        >
          <Field
            label="Nama tahun ajaran"
            required
            maxLength={100}
            placeholder="contoh: 2026/2027"
            {...form.register("label")}
          />
          <Field label="Tanggal mulai" type="date" required {...form.register("startsOn")} />
          <Field
            label="Berakhir sebelum tanggal"
            type="date"
            required
            hint="Pilih sehari setelah hari terakhir tahun ajaran."
            {...form.register("endsOnExclusive")}
          />
          <SwitchField
            label="Jadikan tahun ajaran aktif"
            checked={Boolean(form.values.isCurrent)}
            onCheckedChange={handleCurrentChange}
            name="isCurrent"
          />
          {current && (
            <SwitchField
              label="Diarsipkan"
              checked={Boolean(form.values.archived)}
              onCheckedChange={handleArchivedChange}
              name="archived"
            />
          )}
        </FormSection>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
