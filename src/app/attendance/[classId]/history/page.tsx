import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { requirePageActor } from "@/server/auth/page-actor";
import { getAttendanceHistory } from "@/server/queries/attendance-history";
import { DomainError } from "@/domain/errors";
import { formatSchoolTime } from "@/domain/format";
import { statusLabels, formatAttendanceDate } from "../attendance-state";
import type { AttendanceHistory } from "@/contracts/attendance-history";

const actionLabels = {
  "attendance.submit": "Pencatatan awal",
  "attendance.correct": "Koreksi atau isi ulang",
  "attendance.void": "Pembatalan sesi",
};
const stateLabels = { not_recorded: "Belum dicatat", submitted: "Tercatat", voided: "Dibatalkan" };

function HistoryEvent({
  event,
  students,
  timezone,
}: {
  event: AttendanceHistory["events"][number];
  students: Map<string, AttendanceHistory["students"][number]>;
  timezone: string;
}) {
  const before = new Map(event.before.entries.map((entry) => [entry.enrollmentId, entry]));
  const after = new Map(event.after.entries.map((entry) => [entry.enrollmentId, entry]));
  const entries = [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
    before: before.get(id),
    after: after.get(id),
  }));
  return (
    <li>
      <h2>
        {actionLabels[event.action]} · versi {event.after.version}
      </h2>
      <p>
        {event.actor.name} ·{" "}
        <time dateTime={event.occurredAt}>{formatSchoolTime(event.occurredAt, timezone)}</time>
      </p>
      <p>
        {stateLabels[event.before.state]} → {stateLabels[event.after.state]}
      </p>
      <p>Alasan: {event.reason ?? "Pencatatan awal tanpa alasan koreksi."}</p>
      <ul className="history-statuses">
        {entries.map((entry) => {
          const value = entry.after ?? entry.before;
          if (!value) return null;
          const student = students.get(value.studentId);
          return (
            <li key={value.enrollmentId}>
              <strong>{student?.name ?? "Siswa"}</strong> · {student?.code ?? value.studentId}
              <span>
                {entry.before?.status ? statusLabels[entry.before.status] : "Belum dicatat"} →{" "}
                {entry.after?.status ? statusLabels[entry.after.status] : "Belum dicatat"}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export default async function AttendanceHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const actor = await requirePageActor();
  const { classId } = await params;
  const { date } = await searchParams;
  let history;
  let failure;
  try {
    history = await getAttendanceHistory(classId, date ?? "");
  } catch (error) {
    failure =
      error instanceof DomainError
        ? error.message
        : "Belum dapat memuat riwayat. Muat ulang untuk mencoba kembali.";
  }
  if (!history)
    return (
      <AppShell actor={actor} school={null} currentPath="/attendance">
        <h1>Riwayat absensi</h1>
        <StateBanner state="error">{failure}</StateBanner>
        <Link href="/attendance">Kembali ke hari ini</Link>
      </AppShell>
    );
  const students = new Map(history.students.map((student) => [student.id, student]));
  return (
    <AppShell
      actor={actor}
      school={{ name: history.schoolName, date: history.schoolToday, timezone: history.timezone }}
      currentPath="/attendance"
    >
      <h1>Riwayat absensi</h1>
      <p>
        {history.className} · {formatAttendanceDate(history.date)}
      </p>
      <Link href={`/attendance/${classId}?date=${history.date}`}>Kembali ke catatan kelas</Link>
      {!history.events.length ? (
        <StateBanner state="empty">Belum ada perubahan tercatat pada tanggal ini.</StateBanner>
      ) : (
        <ol className="resource-list history-list">
          {history.events.map((event) => (
            <HistoryEvent
              key={event.id}
              event={event}
              students={students}
              timezone={history.timezone}
            />
          ))}
        </ol>
      )}
    </AppShell>
  );
}
