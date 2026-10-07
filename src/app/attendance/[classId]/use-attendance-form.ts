"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceView } from "@/contracts/attendance-view";
import type { AttendanceStatus } from "@/domain/attendance";
import type { BannerState } from "@/components/state-banner";
import {
  attendanceClient,
  AttendanceRequestError,
  type AttendanceClient,
} from "@/lib/attendance-client";
import { buildEntries, canRecordAttendance, createDraft } from "./attendance-state";

export type AttendanceNotice = { state: BannerState; message: string };

function requestNotice(error: unknown, fallback: string): AttendanceNotice {
  if (error instanceof AttendanceRequestError && error.status === 401) {
    return {
      state: "session-expired",
      message: "Pilihan belum tersimpan. Masuk kembali, lalu buka kelas dan isi ulang.",
    };
  }
  return {
    state: "error",
    message: error instanceof AttendanceRequestError ? error.message : fallback,
  };
}

export function useAttendanceForm(
  initial: AttendanceView,
  client: AttendanceClient = attendanceClient,
) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [view, setView] = useState(initial);
  const [draft, setDraft] = useState(() => createDraft(initial));
  const [date, setDate] = useState(initial.date);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<AttendanceNotice | null>(null);
  const [conflictNeedsReload, setConflictNeedsReload] = useState(false);
  const canRecord = canRecordAttendance(view);
  const entries = buildEntries(view, draft);
  const blocked = pending || loading || notice?.state === "session-expired" || conflictNeedsReload;

  async function load(nextDate: string, conflict = false) {
    setLoading(true);
    if (conflict) setConflictNeedsReload(true);
    try {
      const latest = await client.load(view.classId, nextDate);
      setView(latest);
      setDraft(createDraft(latest));
      setDate(latest.date);
      setConflictNeedsReload(false);
      window.history.replaceState(
        null,
        "",
        `/attendance/${latest.classId}?date=${encodeURIComponent(latest.date)}`,
      );
      setNotice(
        conflict
          ? {
              state: "conflict",
              message: "Catatan terbaru sudah dimuat. Periksa status dan nama pencatat.",
            }
          : null,
      );
    } catch (error) {
      setDate(view.date);
      const failure = requestNotice(
        error,
        "Belum dapat memuat daftar siswa. Coba kembali; pilihan tetap di halaman ini.",
      );
      setNotice(
        conflict && failure.state !== "session-expired"
          ? {
              state: "conflict",
              message:
                "Catatan berubah dan data terbaru belum dapat dimuat. Muat data terbaru sebelum melanjutkan.",
            }
          : failure,
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeDate(event: ChangeEvent<HTMLInputElement>) {
    const nextDate = event.currentTarget.value;
    if (!nextDate || busyRef.current) return;
    const dirty = view.students.some((student) => draft[student.enrollmentId] !== student.status);
    if (dirty && !window.confirm("Pilihan belum tersimpan. Ganti tanggal dan mulai isian baru?"))
      return;
    busyRef.current = true;
    setDate(nextDate);
    try {
      await load(nextDate);
    } finally {
      busyRef.current = false;
    }
  }

  function changeStatus(enrollmentId: string, status: AttendanceStatus) {
    if (!canRecord || blocked || busyRef.current) return;
    setDraft((current) => ({ ...current, [enrollmentId]: status }));
    setNotice(null);
  }

  function openConfirmation() {
    if (canRecord && !blocked && !busyRef.current) setConfirm(true);
  }

  function closeConfirmation() {
    if (!busyRef.current) setConfirm(false);
  }

  async function reloadLatest() {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await load(view.date, true);
    } finally {
      busyRef.current = false;
    }
  }

  async function save() {
    if (!canRecord || blocked || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    try {
      const saved = await client.save(view.classId, view.date, {
        expectedVersion: view.sessionVersion,
        entries,
        reason: null,
      });
      const statuses = new Map(entries.map((entry) => [entry.enrollmentId, entry.status]));
      const updated: AttendanceView = {
        ...view,
        ...saved,
        students: view.students.map((student) => ({
          ...student,
          status: statuses.get(student.enrollmentId) ?? null,
        })),
      };
      setView(updated);
      setDraft(createDraft(updated));
      setNotice(null);
      router.refresh();
    } catch (error) {
      if (error instanceof AttendanceRequestError && error.status === 409) {
        await load(view.date, true);
      } else {
        setNotice(
          requestNotice(
            error,
            "Belum mendapat konfirmasi penyimpanan. Periksa internet lalu coba kembali; pilihan tetap di halaman ini.",
          ),
        );
      }
    } finally {
      setConfirm(false);
      setPending(false);
      busyRef.current = false;
    }
  }

  return {
    view,
    draft,
    date,
    pending,
    loading,
    confirm,
    notice,
    canRecord,
    entries,
    blocked,
    changeDate,
    changeStatus,
    openConfirmation,
    closeConfirmation,
    reloadLatest,
    save,
  };
}
