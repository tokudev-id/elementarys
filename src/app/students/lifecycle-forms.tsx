"use client";
import { useState, type FormEvent, type ChangeEvent } from "react";
import type { StudentDetail } from "@/contracts/students";
import type { ClassView, AcademicYearView } from "@/contracts/school-master";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";

export function PlacementForm({
  student,
  classes,
  years,
  today,
}: {
  student: StudentDetail;
  classes: ClassView[];
  years: AcademicYearView[];
  today: string;
}) {
  const [mode, setMode] = useState("transfer");
  const mutation = useMutation(`/api/students/${student.id}/enrollments`, "POST");
  function changeMode(event: ChangeEvent<HTMLSelectElement>) {
    setMode(event.currentTarget.value);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.mutate({
      mode,
      expectedVersion: student.version,
      classId: data.get("classId"),
      startsOn: data.get("startsOn"),
      reason: data.get("reason"),
      ...(mode === "transfer" ? { fromEnrollmentId: data.get("fromEnrollmentId") } : {}),
    });
  }
  return (
    <section className="resource-section">
      <h2>Ubah penempatan</h2>
      <form className="resource-form" onSubmit={submit} aria-label="Ubah penempatan siswa">
        <fieldset
          key={student.version}
          disabled={mutation.pending || mutation.notice?.state === "conflict"}
        >
          <SelectField label="Jenis perubahan" value={mode} onChange={changeMode}>
            <option value="transfer">Transfer dalam tahun yang sama</option>
            <option value="placement">Penempatan baru atau tahun berikutnya</option>
          </SelectField>
          {mode === "transfer" && (
            <SelectField label="Penempatan asal" name="fromEnrollmentId" required>
              {student.enrollments
                .filter((item) => !item.cancelled)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.className} / {item.yearLabel} / {item.startsOn} sampai sebelum{" "}
                    {item.endsOnExclusive}
                  </option>
                ))}
            </SelectField>
          )}
          <SelectField label="Kelas tujuan" name="classId" required>
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
            label="Mulai di kelas tujuan"
            name="startsOn"
            type="date"
            defaultValue={today}
            required
            error={mutation.errors.startsOn?.[0]}
          />
          <Field label="Alasan penempatan" name="reason" required maxLength={1000} />
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
export function EndEnrollmentForm({
  student,
  enrollment,
  today,
}: {
  student: StudentDetail;
  enrollment: StudentDetail["enrollments"][number];
  today: string;
}) {
  const future = enrollment.startsOn > today;
  const mutation = useMutation(`/api/enrollments/${enrollment.id}/end`, "PATCH");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.mutate({
      expectedVersion: student.version,
      endsOnExclusive: future ? enrollment.startsOn : data.get("endsOnExclusive"),
      reason: data.get("reason"),
    });
  }
  return (
    <form
      className="resource-form"
      onSubmit={submit}
      aria-label={`Tutup penempatan ${enrollment.className}`}
    >
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
            name="endsOnExclusive"
            defaultValue={today}
            max={enrollment.endsOnExclusive}
            required
            error={mutation.errors.endsOnExclusive?.[0]}
          />
        )}
        <Field
          label={future ? "Alasan pembatalan penempatan" : "Alasan siswa keluar"}
          name="reason"
          required
          maxLength={1000}
        />
        <Button type="submit" variant="secondary" pending={mutation.pending}>
          {future ? "Batalkan penempatan mendatang" : "Tutup penempatan"}
        </Button>
      </fieldset>
      <MutationFeedback mutation={mutation} />
    </form>
  );
}
export function StudentArchiveForm({ student }: { student: StudentDetail }) {
  const mutation = useMutation(`/api/students/${student.id}`, "PATCH");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.mutate({
      expectedVersion: student.version,
      archived: !student.archivedAt,
      reason: data.get("reason"),
    });
  }
  return (
    <section className="resource-section">
      <h2>{student.archivedAt ? "Aktifkan kembali siswa" : "Arsip siswa"}</h2>
      <p>
        Riwayat dan laporan lama tetap tersedia. Tutup penempatan berjalan dan batalkan penempatan
        mendatang sebelum arsip.
      </p>
      <form className="resource-form" onSubmit={submit} aria-label="Status arsip siswa">
        <fieldset disabled={mutation.pending || mutation.notice?.state === "conflict"}>
          <Field label="Alasan status siswa" name="reason" required maxLength={1000} />
          <Button type="submit" variant="secondary" pending={mutation.pending}>
            {student.archivedAt ? "Aktifkan kembali siswa" : "Arsipkan siswa"}
          </Button>
        </fieldset>
        <MutationFeedback mutation={mutation} />
      </form>
    </section>
  );
}
