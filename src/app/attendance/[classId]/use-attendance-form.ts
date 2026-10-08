"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { AttendanceView } from "@/contracts/attendance-view";
import type { AttendanceStatus } from "@/domain/attendance";
import type { BannerState } from "@/components/state-banner";
import { toast } from "sonner";
import {
  attendanceClient,
  AttendanceRequestError,
  type AttendanceClient,
} from "@/lib/attendance-client";
import {
  buildEntries,
  canEditAttendance,
  canRecordAttendance,
  createDraft,
} from "./attendance-state";

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
  role: "teacher" | "admin",
  client: AttendanceClient = attendanceClient,
) {
  const busyRef = useRef(false);
  const [view, setView] = useState(initial);
  const [draft, setDraft] = useState(() => createDraft(initial));
  const [date, setDate] = useState(initial.date);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<AttendanceNotice | null>(null);
  const [conflictNeedsReload, setConflictNeedsReload] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const canRecord = canRecordAttendance(view, role, editing);
  const canEdit = canEditAttendance(view, role);
  const requiresReason = view.sessionState !== "not_recorded" || !view.isCurrentYear;
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
      setEditing(false);
      setReason("");
      setReasonError(undefined);
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
    await selectDate(nextDate);
  }
  async function selectDate(nextDate: string) {
    if (!nextDate || busyRef.current) return;
    const dirty =
      reason.length > 0 ||
      view.students.some((student) => draft[student.enrollmentId] !== student.status);
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
  function markAllPresent() {
    if (!canRecord || blocked || busyRef.current) return;
    setDraft(
      Object.fromEntries(view.students.map((student) => [student.enrollmentId, "H" as const])),
    );
    setNotice(null);
  }

  function openConfirmation() {
    if (requiresReason && !reason.trim()) {
      setReasonError("Isi alasan koreksi atau pengisian ulang.");
      return;
    }
    if (canRecord && !blocked && !busyRef.current) setConfirm(true);
  }

  function startEditing() {
    if (canEdit && !blocked && !busyRef.current) {
      setEditing(true);
      setNotice(null);
    }
  }

  function cancelEditing() {
    if (blocked || busyRef.current) return;
    setDraft(createDraft(view));
    setEditing(false);
    setReason("");
    setReasonError(undefined);
  }

  function changeReason(event: ChangeEvent<HTMLInputElement>) {
    setReason(event.currentTarget.value);
    setReasonError(undefined);
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
        reason: requiresReason ? reason.trim() : null,
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
      setEditing(false);
      setReason("");
      setReasonError(undefined);
      setNotice(null);
      // The receipt is authoritative; a refresh would remount the page and close newly opened menus.
      toast.success(`Absensi ${view.className} tersimpan`);
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
    canEdit,
    editing,
    reason,
    reasonError,
    requiresReason,
    entries,
    blocked,
    changeDate,
    selectDate,
    markAllPresent,
    changeStatus,
    changeReason,
    startEditing,
    cancelEditing,
    openConfirmation,
    closeConfirmation,
    reloadLatest,
    save,
  };
}
