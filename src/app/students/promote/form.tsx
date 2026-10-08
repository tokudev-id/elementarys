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
import {
  DataCard,
  DataCardHeader,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";

function CandidateRowItem({
  student,
  isChecked,
  onToggle,
}: {
  student: StudentView;
  isChecked: boolean;
  onToggle: (id: string) => void;
}) {
  function handleChange() {
    onToggle(student.id);
  }
  return (
    <tr>
      <td>
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="studentId"
            value={student.id}
            checked={isChecked}
            onChange={handleChange}
          />
          <span className="sr-only">
            {student.fullName} · {student.studentCode}
          </span>
        </label>
      </td>
      <td>{student.fullName}</td>
      <td>{student.studentCode}</td>
    </tr>
  );
}

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
  const [step, setStep] = useState(1);
  const [yearId, setYearId] = useState("");
  const [refreshing, startRefresh] = useTransition();
  const [input, setInput] = useState<PromotionInput | null>(null);
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [results, setResults] = useState<PromotionResult | null>(null);
  const [notice, setNotice] = useState<{ state: BannerState; message: string } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id)),
  );
  const [candidatePage, setCandidatePage] = useState(1);
  const candidatePageSize = 25;
  const paginatedCandidates = students.slice(
    (candidatePage - 1) * candidatePageSize,
    candidatePage * candidatePageSize,
  );

  function handlePrevCandidatePage() {
    setCandidatePage((p) => Math.max(1, p - 1));
  }

  function handleNextCandidatePage() {
    setCandidatePage((p) => p + 1);
  }

  function selectAllAcrossPages() {
    setSelectedStudentIds(new Set(students.map((s) => s.id)));
  }

  function deselectAll() {
    setSelectedStudentIds(new Set());
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function invalidatePreview() {
    setInput(null);
    setPreview(null);
    setResults(null);
    setNotice(null);
  }
  function reloadLatest() {
    invalidatePreview();
    setStep(1);
    startRefresh(() => router.refresh());
  }
  function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep(2);
  }
  function previousStep() {
    invalidatePreview();
    setStep(step - 1);
  }
  function selectYear(event: React.ChangeEvent<HTMLSelectElement>) {
    setYearId(event.currentTarget.value);
    invalidatePreview();
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
    const parsed = promotionInputSchema.safeParse({
      entries: students
        .filter((student) => selectedStudentIds.has(student.id))
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
      setStep(3);
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
      <ol className="wizard-steps" aria-label="Langkah naik kelas">
        {["Pilih kelas", "Pilih siswa", "Konfirmasi"].map((label, index) => (
          <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
            <span>{index + 1}</span> {label}
          </li>
        ))}
      </ol>
      <form
        className="resource-form"
        onSubmit={step === 1 ? nextStep : prepare}
        onChange={invalidatePreview}
        aria-label="Preview naik kelas"
      >
        <fieldset disabled={blocked}>
          <div hidden={step !== 1}>
            <SelectField label="Tahun ajaran tujuan" value={yearId} onChange={selectYear}>
              <option value="">Semua tahun tersedia</option>
              {years
                .filter((year) => !year.archivedAt)
                .map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
            </SelectField>
            <SelectField label="Kelas tujuan batch" name="classId" required>
              {classes
                .filter(
                  (item) =>
                    !item.archivedAt &&
                    (!yearId || item.yearId === yearId) &&
                    !years.find((year) => year.id === item.yearId)?.archivedAt,
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
            <Button type="submit">Lanjut: pilih siswa</Button>
          </div>
          <div hidden={step !== 2}>
            <p>
              Pilih siswa yang akan ditempatkan. Satu masalah membatalkan seluruh batch; riwayat
              lama tetap tersedia.
            </p>
            <DataCard id="pilih-siswa-promosi">
              <DataCardHeader
                title="Pilih siswa"
                count={selectedStudentIds.size}
                actions={
                  <div className="button-row">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={selectAllAcrossPages}
                    >
                      Pilih semua di semua halaman
                    </Button>
                    <Button type="button" variant="ghost" onClick={deselectAll}>
                      Batal pilih semua
                    </Button>
                  </div>
                }
              />
              <DataCardContent>
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Pilih</th>
                        <th scope="col">Nama siswa</th>
                        <th scope="col">Kode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCandidates.map((student) => (
                        <CandidateRowItem
                          key={student.id}
                          student={student}
                          isChecked={selectedStudentIds.has(student.id)}
                          onToggle={toggleStudent}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataCardContent>
              {students.length > candidatePageSize && (
                <DataCardFooter>
                  <nav className="data-table-pagination" aria-label="Navigasi daftar siswa">
                    <div className="data-table-pagination__info">
                      <span>
                        {(candidatePage - 1) * candidatePageSize + 1}–
                        {Math.min(candidatePage * candidatePageSize, students.length)} dari{" "}
                        {students.length}
                      </span>
                    </div>
                    <div className="data-table-pagination__nav">
                      <button
                        type="button"
                        className={`pagination-btn pagination-btn--prev${candidatePage <= 1 ? " pagination-btn--disabled" : ""}`}
                        disabled={candidatePage <= 1}
                        onClick={handlePrevCandidatePage}
                        aria-label="Halaman sebelumnya"
                      >
                        ‹ Sebelumnya
                      </button>
                      <button
                        type="button"
                        className={`pagination-btn pagination-btn--next${candidatePage * candidatePageSize >= students.length ? " pagination-btn--disabled" : ""}`}
                        disabled={candidatePage * candidatePageSize >= students.length}
                        onClick={handleNextCandidatePage}
                        aria-label="Halaman berikutnya"
                      >
                        Berikutnya ›
                      </button>
                    </div>
                  </nav>
                </DataCardFooter>
              )}
            </DataCard>
            <div className="button-row">
              <Button type="button" variant="secondary" onClick={previousStep}>
                Kembali
              </Button>
              <Button type="submit" pending={pending}>
                Periksa preview
              </Button>
            </div>
          </div>
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
          <Button variant="secondary" onClick={previousStep} disabled={blocked}>
            Ubah pilihan
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
