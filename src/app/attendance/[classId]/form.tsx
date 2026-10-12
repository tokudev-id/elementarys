"use client";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { MoreHorizontal, History, Info } from "lucide-react";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { DateStepper } from "@/components/date-stepper";
import { StateBanner } from "@/components/state-banner";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { AttendanceView } from "@/contracts/attendance-view";
import type { CalendarView } from "@/contracts/school-master";
import { attendanceTotals, type AttendanceStatus } from "@/domain/attendance";
import { formatAttendanceDate, statusLabels } from "./attendance-state";
import { AttendanceSummary, AttendanceAvailability } from "./attendance-feedback";
import { StudentAttendanceRow } from "./student-attendance-row";
import { useAttendanceForm } from "./use-attendance-form";
import { VoidAttendanceForm } from "./void-form";

export function AttendanceForm({
  initial,
  role,
  calendar,
  nextClassHref,
}: {
  initial: AttendanceView;
  role: "teacher" | "admin";
  calendar?: CalendarView;
  nextClassHref?: string;
}) {
  const form = useAttendanceForm(initial, role);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const rosterRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [absentOnly, setAbsentOnly] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const { view, notice, pending, loading } = form;
  const totals = attendanceTotals(form.entries);
  const absences = view.students.filter(
    (student) => (form.draft[student.enrollmentId] ?? "H") !== "H",
  );
  const visibleStudents = view.students.filter(
    (student) =>
      (!absentOnly || (form.draft[student.enrollmentId] ?? "H") !== "H") &&
      (student.fullName + " " + student.studentCode)
        .toLocaleLowerCase("id")
        .includes(query.trim().toLocaleLowerCase("id")),
  );
  useEffect(() => {
    if (notice || view.sessionState !== "not_recorded") {
      feedbackRef.current?.focus({ preventScroll: true });
      feedbackRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [notice, view.sessionState]);
  function search(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.currentTarget.value);
  }
  function showAll() {
    setAbsentOnly(false);
  }
  function showAbsent() {
    setAbsentOnly(true);
  }
  function openVoid() {
    setVoidOpen(true);
  }
  function closeVoid() {
    setVoidOpen(false);
  }
  function selectDate(date: string) {
    void form.selectDate(date);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey && event.key === "Enter") {
      event.preventDefault();
      form.openConfirmation();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.matches('input:not([type="radio"]), textarea, select')) return;
    const row = target.closest<HTMLElement>('[data-testid="student-row"]');
    if (!row) return;
    const rows = Array.from(
      rosterRef.current?.querySelectorAll<HTMLElement>('[data-testid="student-row"]') ?? [],
    );
    const index = rows.indexOf(row);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      rows[
        Math.max(0, Math.min(rows.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))
      ]?.focus();
    } else if (["H", "S", "I", "A"].includes(event.key.toUpperCase())) {
      event.preventDefault();
      const enrollmentId = row.dataset.enrollmentId;
      if (enrollmentId)
        form.changeStatus(enrollmentId, event.key.toUpperCase() as AttendanceStatus);
    }
  }
  const state = !view.isSchoolDay
    ? "Libur"
    : view.sessionState === "submitted"
      ? "Sudah dicatat"
      : view.sessionState === "voided"
        ? "Dibatalkan"
        : "Belum dicatat";
  return (
    <div className="attendance-form attendance-compact" onKeyDown={keyboard}>
      <PageHeader
        title={view.className}
        meta={
          <StatusBadge tone={view.sessionState === "submitted" ? "success" : "neutral"}>
            {state}
          </StatusBadge>
        }
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/attendance/${view.classId}/history?date=${view.date}`}
                  prefetch={false}
                  className="button-link button-link--secondary icon-btn"
                  aria-label="Riwayat absensi"
                >
                  <History aria-hidden="true" size={18} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Riwayat absensi</TooltipContent>
            </Tooltip>
            {form.canEdit && !form.editing && (
              <Button variant="secondary" disabled={form.blocked} onClick={form.startEditing}>
                {view.sessionState === "voided" ? "Isi ulang catatan" : "Koreksi catatan"}
              </Button>
            )}
            {form.editing && (
              <Button variant="secondary" disabled={form.blocked} onClick={form.cancelEditing}>
                Batal koreksi
              </Button>
            )}
            {role === "admin" && view.sessionState === "submitted" && !form.editing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label="Aksi catatan">
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={openVoid}>
                    Batalkan catatan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />
      <DateStepper
        date={form.date}
        max={view.schoolToday}
        disabled={pending || loading}
        onChange={form.changeDate}
        onSelect={selectDate}
        calendar={calendar}
      />
      {notice && (
        <div ref={feedbackRef} tabIndex={-1}>
          <StateBanner
            state={notice.state}
            action={
              notice.state === "session-expired" ? (
                <Link href="/login">Masuk kembali</Link>
              ) : notice.state === "conflict" ? (
                <Button
                  variant="secondary"
                  disabled={pending || loading}
                  onClick={form.reloadLatest}
                >
                  Muat data terbaru
                </Button>
              ) : undefined
            }
          >
            {notice.message}
          </StateBanner>
        </div>
      )}
      {loading ? (
        <StateBanner state="loading">
          Sedang mengambil catatan untuk tanggal yang dipilih.
        </StateBanner>
      ) : (
        <>
          {view.sessionState === "submitted" && (
            <div ref={notice ? undefined : feedbackRef} tabIndex={-1}>
              <StateBanner state="saved">
                <AttendanceSummary view={view} />
              </StateBanner>
              <div className="button-row">
                <Link
                  href="/attendance"
                  className="button-link button-link--secondary"
                  aria-label="Kembali ke hari ini"
                >
                  Kembali ke daftar kelas
                </Link>
                {nextClassHref && (
                  <Link href={nextClassHref} className="button-link">
                    Kelas berikutnya
                  </Link>
                )}
              </div>
            </div>
          )}
          <div
            ref={!notice && view.sessionState === "voided" ? feedbackRef : undefined}
            tabIndex={view.sessionState === "voided" ? -1 : undefined}
          >
            <AttendanceAvailability view={view} />
          </div>
          {form.canRecord && form.requiresReason && (
            <Field
              label="Alasan koreksi"
              aria-label="Alasan koreksi atau isi ulang"
              value={form.reason}
              onChange={form.changeReason}
              required
              maxLength={1000}
              disabled={form.blocked}
              error={form.reasonError}
              hint="Catatan sebelumnya tetap tersedia di riwayat."
            />
          )}
          <div className="roster-toolbar">
            {view.students.length > 15 && (
              <Field label="Cari nama siswa" type="search" value={query} onChange={search} />
            )}
            <div className="roster-filters">
              <Button variant="ghost" aria-pressed={!absentOnly} onClick={showAll}>
                Semua ({view.students.length})
              </Button>
              <Button variant="ghost" aria-pressed={absentOnly} onClick={showAbsent}>
                Tidak hadir ({absences.length})
              </Button>
            </div>
            {form.canRecord && (
              <div className="roster-actions-group">
                <Button variant="secondary" onClick={form.markAllPresent} disabled={form.blocked}>
                  Semua hadir
                </Button>
                {view.sessionState === "not_recorded" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Petunjuk absensi"
                        className="roster-info-btn"
                      >
                        <Info size={16} aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Hadir disiapkan untuk siswa lain. Catatan dibuat setelah konfirmasi.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          <div
            className="roster-scroll"
            ref={rosterRef}
            role="region"
            aria-label="Daftar siswa dan status kehadiran"
            tabIndex={0}
          >
            {!visibleStudents.length && (
              <p className="roster-empty">Tidak ada siswa yang cocok dengan filter ini.</p>
            )}
            {visibleStudents.map((student) => (
              <StudentAttendanceRow
                key={student.enrollmentId}
                student={student}
                number={view.students.indexOf(student) + 1}
                value={form.draft[student.enrollmentId] ?? null}
                editable={form.canRecord}
                disabled={form.blocked}
                onChange={form.changeStatus}
              />
            ))}
          </div>
        </>
      )}
      {form.canRecord && (
        <div className="attendance-actions attendance-action-bar">
          <p className="live-totals">
            <span className="status-text--H">{totals.H} Hadir</span> ·{" "}
            <span className="status-text--S">{totals.S} Sakit</span> ·{" "}
            <span className="status-text--I">{totals.I} Izin</span> ·{" "}
            <span className="status-text--A">{totals.A} Alpa</span>
          </p>
          <Button pending={pending} disabled={form.blocked} onClick={form.openConfirmation}>
            {pending ? "Sedang menyimpan…" : "Simpan absensi"}
          </Button>
        </div>
      )}
      <Dialog
        open={form.confirm}
        closeDisabled={pending}
        onClose={form.closeConfirmation}
        title={`Simpan absensi ${view.className}?`}
        variant="sheet"
        actions={
          <>
            <Button variant="secondary" disabled={pending} onClick={form.closeConfirmation}>
              Batal
            </Button>
            <Button pending={pending} onClick={form.save}>
              {pending ? "Sedang menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        <p>{formatAttendanceDate(view.date)}</p>
        <div className="attendance-totals">
          {(["H", "S", "I", "A"] as const).map((status) => (
            <p key={status} className={`status-text--${status}`}>
              <strong>{totals[status]}</strong> {statusLabels[status]}
            </p>
          ))}
        </div>
        {(["S", "I", "A"] as const).map((status) => {
          const students = absences.filter(
            (student) => form.draft[student.enrollmentId] === status,
          );
          return students.length ? (
            <section className="confirmation-absence" key={status}>
              <h3>
                <StatusBadge tone={status}>{statusLabels[status]}</StatusBadge>
              </h3>
              <ul>
                {students.map((student) => (
                  <li key={student.enrollmentId}>
                    <strong>{student.fullName}</strong> <small>{student.studentCode}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null;
        })}
        <p>Siswa lain dicatat Hadir.</p>
        {form.requiresReason && <p>Alasan: {form.reason.trim()}</p>}
      </Dialog>
      <Dialog open={voidOpen} onClose={closeVoid} title="Batalkan catatan?" variant="sheet">
        <VoidAttendanceForm key={`${view.date}:${view.sessionVersion}`} view={view} />
      </Dialog>
    </div>
  );
}
