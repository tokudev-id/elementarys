"use client";

import { useState, type ChangeEvent } from "react";
import type { z } from "zod";
import type { StudentDetail } from "@/contracts/students";
import {
  enrollmentInputSchema,
  enrollmentEndSchema,
  studentArchiveSchema,
} from "@/contracts/enrollments";
import type { ClassView, AcademicYearView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { TextareaField } from "@/components/textarea-field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
import { useZodForm } from "@/components/use-zod-form";
import { FormErrorSummary } from "@/components/form-error-summary";

type PlacementFormData =
  | {
      mode: "placement";
      expectedVersion: number;
      classId: string;
      startsOn: string;
      reason: string;
    }
  | {
      mode: "transfer";
      expectedVersion: number;
      classId: string;
      startsOn: string;
      reason: string;
      fromEnrollmentId: string;
    };

export function PlacementForm({
  student,
  classes,
  years,
  today,
  onSuccess,
}: {
  student: StudentDetail;
  classes: ClassView[];
  years: AcademicYearView[];
  today: string;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<"transfer" | "placement">("transfer");
  const mutation = useMutation(`/api/students/${student.id}/enrollments`, "POST");

  const availableClasses = classes.filter(
    (item) => !item.archivedAt && !years.find((year) => year.id === item.yearId)?.archivedAt,
  );
  const activeEnrollments = student.enrollments.filter((item) => !item.cancelled);

  const form = useZodForm(enrollmentInputSchema as unknown as z.ZodType<PlacementFormData>, {
    defaultValues: {
      mode: "transfer",
      expectedVersion: student.version,
      fromEnrollmentId: activeEnrollments[0]?.id ?? "",
      classId: availableClasses[0]?.id ?? "",
      startsOn: today,
      reason: "",
    },
    serverErrors: mutation.errors,
    onSubmit: async (data: PlacementFormData) => {
      const res = await mutation.mutate({
        ...data,
        expectedVersion: student.version,
      });
      if (res) {
        onSuccess?.();
      }
    },
  });

  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.currentTarget.value as "transfer" | "placement";
    setMode(nextMode);
    form.setValue("mode", nextMode);
    if (nextMode === "placement") {
      form.unsetValue("fromEnrollmentId");
    } else {
      form.setValue("fromEnrollmentId", activeEnrollments[0]?.id ?? "");
    }
  }

  return (
    <section className="resource-section">
      <h2>Ubah penempatan</h2>
      <form className="resource-form" {...form.formProps} aria-label="Ubah penempatan siswa">
        <FormErrorSummary errors={form.errorSummary} />
        <fieldset
          key={student.version}
          disabled={mutation.pending || mutation.notice?.state === "conflict"}
        >
          <SelectField label="Jenis perubahan" value={mode} onChange={changeMode}>
            <option value="transfer">Transfer dalam tahun yang sama</option>
            <option value="placement">Penempatan baru atau tahun berikutnya</option>
          </SelectField>
          {mode === "transfer" && (
            <SelectField label="Penempatan asal" required {...form.register("fromEnrollmentId")}>
              {activeEnrollments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.className} / {item.yearLabel} / {item.startsOn} sampai sebelum{" "}
                  {item.endsOnExclusive}
                </option>
              ))}
            </SelectField>
          )}
          <SelectField label="Kelas tujuan" required {...form.register("classId")}>
            {availableClasses.map((item) => (
              <option key={item.id} value={item.id}>
                {years.find((year) => year.id === item.yearId)?.label} / {item.name}
              </option>
            ))}
          </SelectField>
          <Field
            label="Mulai di kelas tujuan"
            type="date"
            required
            {...form.register("startsOn")}
          />
          <TextareaField
            label="Alasan penempatan"
            required
            maxLength={1000}
            {...form.register("reason")}
          />
          <p>
            Tanggal ini menjadi hari pertama di kelas tujuan dan, untuk transfer, hari pertama tidak
            berada di kelas asal.
          </p>
          <Button type="submit" pending={mutation.pending}>
            Simpan penempatan
          </Button>
        </fieldset>
        <MutationFeedback mutation={mutation} />
      </form>
    </section>
  );
}

type EndFormData = {
  expectedVersion: number;
  endsOnExclusive: string;
  reason: string;
};

export function EndEnrollmentForm({
  student,
  enrollment,
  today,
  onSuccess,
}: {
  student: StudentDetail;
  enrollment: StudentDetail["enrollments"][number];
  today: string;
  onSuccess?: () => void;
}) {
  const future = enrollment.startsOn > today;
  const mutation = useMutation(`/api/enrollments/${enrollment.id}/end`, "PATCH");

  const form = useZodForm(enrollmentEndSchema as unknown as z.ZodType<EndFormData>, {
    defaultValues: {
      expectedVersion: student.version,
      endsOnExclusive: future ? enrollment.startsOn : today,
      reason: "",
    },
    serverErrors: mutation.errors,
    onSubmit: async (data: EndFormData) => {
      const res = await mutation.mutate({
        expectedVersion: student.version,
        endsOnExclusive: future ? enrollment.startsOn : data.endsOnExclusive,
        reason: data.reason,
      });
      if (res) {
        onSuccess?.();
      }
    },
  });

  return (
    <form
      className="resource-form"
      {...form.formProps}
      aria-label={`Tutup penempatan ${enrollment.className}`}
    >
      <FormErrorSummary errors={form.errorSummary} />
      <fieldset
        key={student.version}
        disabled={mutation.pending || mutation.notice?.state === "conflict"}
      >
        {future ? (
          <p>Penempatan ini belum dimulai. Pembatalan tetap disimpan pada riwayat.</p>
        ) : (
          <Field
            label="Tidak bersekolah mulai tanggal"
            type="date"
            max={enrollment.endsOnExclusive}
            required
            {...form.register("endsOnExclusive")}
          />
        )}
        <TextareaField
          label={future ? "Alasan pembatalan penempatan" : "Alasan siswa keluar"}
          required
          maxLength={1000}
          {...form.register("reason")}
        />
        <Button type="submit" variant="destructive" pending={mutation.pending}>
          {future ? "Batalkan penempatan mendatang" : "Tutup penempatan"}
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}

type ArchiveFormData = {
  expectedVersion: number;
  archived: boolean;
  reason: string;
};

export function StudentArchiveForm({
  student,
  onSuccess,
}: {
  student: StudentDetail;
  onSuccess?: () => void;
}) {
  const mutation = useMutation(`/api/students/${student.id}`, "PATCH");

  const form = useZodForm(studentArchiveSchema as unknown as z.ZodType<ArchiveFormData>, {
    defaultValues: {
      expectedVersion: student.version,
      archived: !student.archivedAt,
      reason: "",
    },
    serverErrors: mutation.errors,
    onSubmit: async (data: ArchiveFormData) => {
      const res = await mutation.mutate(data);
      if (res) {
        onSuccess?.();
      }
    },
  });

  return (
    <section className="resource-section">
      <h2>{student.archivedAt ? "Aktifkan kembali siswa" : "Arsip siswa"}</h2>
      <p>
        Riwayat dan laporan lama tetap tersedia. Tutup penempatan berjalan dan batalkan penempatan
        mendatang sebelum arsip.
      </p>
      <form className="resource-form" {...form.formProps} aria-label="Status arsip siswa">
        <FormErrorSummary errors={form.errorSummary} />
        <fieldset disabled={mutation.pending || mutation.notice?.state === "conflict"}>
          <TextareaField
            label="Alasan status siswa"
            required
            maxLength={1000}
            {...form.register("reason")}
          />
          <Button type="submit" variant="destructive" pending={mutation.pending}>
            {student.archivedAt ? "Aktifkan kembali siswa" : "Arsipkan siswa"}
          </Button>
        </fieldset>
        <MutationFeedback mutation={mutation} />
      </form>
    </section>
  );
}
