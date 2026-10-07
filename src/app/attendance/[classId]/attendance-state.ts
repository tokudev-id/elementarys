import type { AttendanceInput } from "@/contracts/attendance";
import type { AttendanceView } from "@/contracts/attendance-view";
import type { AttendanceStatus } from "@/domain/attendance";

export type AttendanceDraft = Record<string, AttendanceStatus | null>;

export const statusLabels: Record<AttendanceStatus, string> = {
  H: "Hadir",
  S: "Sakit",
  I: "Izin",
  A: "Alpa",
};

export function createDraft(view: AttendanceView): AttendanceDraft {
  return Object.fromEntries(view.students.map((student) => [student.enrollmentId, student.status]));
}

export function buildEntries(
  view: AttendanceView,
  draft: AttendanceDraft,
): AttendanceInput["entries"] {
  return view.students.map((student) => ({
    enrollmentId: student.enrollmentId,
    status: draft[student.enrollmentId] ?? "H",
  }));
}

export function canRecordAttendance(view: AttendanceView): boolean {
  return (
    view.sessionState === "not_recorded" &&
    view.isCurrentYear &&
    view.inAcademicYear &&
    view.isSchoolDay &&
    view.setupReady &&
    view.date <= view.schoolToday &&
    view.students.length > 0
  );
}

export function formatAttendanceDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}
