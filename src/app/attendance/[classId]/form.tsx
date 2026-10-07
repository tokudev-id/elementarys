"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { StateBanner } from "@/components/state-banner";
import type { AttendanceView } from "@/contracts/attendance-view";
import { attendanceTotals } from "@/domain/attendance";
import { formatAttendanceDate } from "./attendance-state";
import { AttendanceSummary, AttendanceAvailability } from "./attendance-feedback";
import { StudentAttendanceRow } from "./student-attendance-row";
import { useAttendanceForm } from "./use-attendance-form";

export function AttendanceForm({ initial }: { initial: AttendanceView }) {
  const form = useAttendanceForm(initial);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const { view, notice, pending, loading } = form;
  const totals = attendanceTotals(form.entries);

  useEffect(() => {
    if (notice || view.sessionState === "submitted") {
      feedbackRef.current?.focus({ preventScroll: true });
      feedbackRef.current?.scrollIntoView({ block: "center" });
    }
  }, [notice, view.sessionState]);

  return (
    <div className="attendance-form">
      <header className="attendance-toolbar">
        <div>
          <h1>{view.className}</h1>
          <p>
            {view.students.length} siswa · {formatAttendanceDate(view.date)}
          </p>
        </div>
        <Field
          label="Tanggal absensi"
          type="date"
          value={form.date}
          max={view.schoolToday}
          disabled={pending || loading}
          onChange={form.changeDate}
        />
      </header>
      <Link href="/attendance" prefetch={false}>
        Kembali ke hari ini
      </Link>
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
            </div>
          )}
          <AttendanceAvailability view={view} />
          {form.canRecord && (
            <p>Periksa kehadiran siswa. Tandai yang tidak hadir, lalu simpan kehadiran kelas.</p>
          )}
          <div>
            {view.students.map((student) => (
              <StudentAttendanceRow
                key={student.enrollmentId}
                student={student}
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
        <div className="attendance-actions">
          <Button pending={pending} disabled={form.blocked} onClick={form.openConfirmation}>
            {pending ? "Sedang menyimpan…" : "Simpan, siswa lainnya hadir"}
          </Button>
        </div>
      )}
      <Dialog
        open={form.confirm}
        closeDisabled={pending}
        onClose={form.closeConfirmation}
        title={`Konfirmasi absensi ${view.className}`}
        variant="sheet"
        actions={
          <>
            <Button variant="secondary" disabled={pending} onClick={form.closeConfirmation}>
              Batal
            </Button>
            <Button pending={pending} onClick={form.save}>
              {pending ? "Sedang menyimpan…" : "Konfirmasi simpan"}
            </Button>
          </>
        }
      >
        <p>{formatAttendanceDate(view.date)}</p>
        <div className="attendance-totals">
          <p>
            <strong>{totals.H}</strong> Hadir
          </p>
          <p>
            <strong>{totals.S}</strong> Sakit
          </p>
          <p>
            <strong>{totals.I}</strong> Izin
          </p>
          <p>
            <strong>{totals.A}</strong> Alpa
          </p>
        </div>
        <p>
          Anda memastikan siswa yang belum ditandai hadir. Setelah dikonfirmasi, seluruh kelas
          disimpan bersama.
        </p>
      </Dialog>
    </div>
  );
}
