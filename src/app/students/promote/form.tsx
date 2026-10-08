"use client";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { StudentView } from "@/contracts/students";
import type { ClassView, AcademicYearView } from "@/contracts/school-master";
import {
  promotionInputSchema,
  promotionPreviewSchema,
  promotionResultSchema,
  type PromotionInput,
  type PromotionPreview,
  type PromotionResult,
} from "@/contracts/enrollments";
import { HttpError, requestJson } from "@/lib/http-client";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { StateBanner, type BannerState } from "@/components/state-banner";

export function PromotionForm({
  students,
  classes,
  years,
  startsOn,
}: {
  students: StudentView[];
  classes: ClassView[];
  years: AcademicYearView[];
  startsOn?: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [input, setInput] = useState<PromotionInput | null>(null);
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [results, setResults] = useState<PromotionResult | null>(null);
  const [notice, setNotice] = useState<{ state: BannerState; message: string } | null>(null);
  function invalidatePreview() {
    setInput(null);
    setPreview(null);
    setResults(null);
    setNotice(null);
  }
  function reloadLatest() {
    invalidatePreview();
    startRefresh(() => router.refresh());
  }
  function showFailure(error: unknown) {
    setNotice({
      state:
        error instanceof HttpError && error.status === 409
          ? "conflict"
          : error instanceof HttpError && error.status === 401
            ? "session-expired"
            : "error",
      message:
        error instanceof HttpError
          ? error.message
          : "Belum mendapat konfirmasi. Periksa koneksi dan muat data terbaru sebelum mencoba kembali.",
    });
  }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const ids = new Set(data.getAll("studentId"));
    const parsed = promotionInputSchema.safeParse({
      entries: students
        .filter((student) => ids.has(student.id))
        .map((student) => ({
          studentId: student.id,
          expectedVersion: student.version,
          classId: data.get("classId"),
          startsOn: data.get("startsOn"),
          reason: data.get("reason"),
        })),
    });
    if (!parsed.success) {
      setNotice({
        state: "error",
        message: "Pilih minimal satu siswa, kelas tujuan, tanggal dan alasan yang valid.",
      });
      return;
    }
    busy.current = true;
    setPending(true);
    setNotice(null);
    setResults(null);
    try {
      const value = await requestJson(
        "/api/enrollments/promote/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
        promotionPreviewSchema,
      );
      const returned = new Set(value.items.map((item) => item.studentId));
      if (
        returned.size !== parsed.data.entries.length ||
        parsed.data.entries.some((item) => !returned.has(item.studentId))
      )
        throw new Error("Incomplete preview receipt");
      setInput(parsed.data);
      setPreview(value);
    } catch (error) {
      showFailure(error);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function save() {
    if (busy.current || !input || !preview?.items.every((item) => item.ready)) return;
    busy.current = true;
    setPending(true);
    setNotice(null);
    try {
      const result = await requestJson(
        "/api/enrollments/promote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
        promotionResultSchema,
      );
      const returned = new Set(result.results.map((item) => item.studentId));
      if (
        returned.size !== input.entries.length ||
        input.entries.some((item) => !returned.has(item.studentId))
      )
        throw new Error("Incomplete batch receipt");
      setResults(result);
      setInput(null);
      setPreview(null);
      setNotice({
        state: "saved",
        message: `Seluruh ${result.results.length} siswa berhasil ditempatkan.`,
      });
      startRefresh(() => router.refresh());
    } catch (error) {
      showFailure(error);
      setInput(null);
      setPreview(null);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const blocked =
    pending || refreshing || notice?.state === "conflict" || notice?.state === "session-expired";
  return (
    <>
      <form
        className="resource-form"
        onSubmit={prepare}
        onChange={invalidatePreview}
        aria-label="Preview naik kelas"
      >
        <fieldset disabled={blocked}>
          <SelectField label="Kelas tujuan batch" name="classId" required>
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
            label="Tanggal mulai tahun berikutnya"
            name="startsOn"
            type="date"
            defaultValue={startsOn}
            required
          />
          <Field label="Alasan batch penempatan" name="reason" required maxLength={1000} />
          <p>
            Pilih siswa yang akan ditempatkan. Satu masalah membatalkan seluruh batch; riwayat lama
            tetap tersedia.
          </p>
          {students.map((student) => (
            <label className="checkbox-field" key={student.id}>
              <input type="checkbox" name="studentId" value={student.id} />
              {student.fullName} · {student.studentCode}
            </label>
          ))}
          <Button type="submit" pending={pending}>
            Periksa preview
          </Button>
        </fieldset>
      </form>
      {(pending || refreshing) && (
        <StateBanner state="loading">Menunggu hasil penempatan.</StateBanner>
      )}
      {notice && (
        <StateBanner
          state={notice.state}
          action={
            notice.state === "conflict" || notice.state === "error" ? (
              <Button variant="secondary" onClick={reloadLatest}>
                Muat data terbaru
              </Button>
            ) : notice.state === "session-expired" ? (
              <Link href="/login">Masuk kembali</Link>
            ) : undefined
          }
        >
          {notice.message}
        </StateBanner>
      )}
      {preview && (
        <section>
          <h2>Hasil preview per siswa</h2>
          <ul className="resource-list">
            {preview.items.map((item) => (
              <li key={item.studentId}>
                <strong>
                  {item.name} · {item.code}
                </strong>
                <p>
                  {item.ready ? "Siap" : "Perlu diperbaiki"}: {item.message}
                </p>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            pending={pending}
            disabled={blocked || !preview.items.every((item) => item.ready)}
            onClick={save}
          >
            Simpan seluruh batch
          </Button>
        </section>
      )}
      {results && (
        <ul className="resource-list" aria-label="Hasil batch">
          {results.results.map((item) => (
            <li key={item.studentId}>
              {students.find((student) => student.id === item.studentId)?.fullName} · Tersimpan
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
