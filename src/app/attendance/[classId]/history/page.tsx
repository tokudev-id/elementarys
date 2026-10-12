import { History } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StateBanner } from "@/components/state-banner";
import { EmptyState } from "@/components/empty-state";
import { DataCard, DataCardHeader, DataCardContent, DataCardFooter } from "@/components/data-card";
import { DataTablePagination } from "@/components/data-table-pagination";
import { requirePageActor } from "@/server/auth/page-actor";
import { getAttendanceHistory } from "@/server/queries/attendance-history";
import { DomainError } from "@/domain/errors";
import { formatSchoolTime } from "@/domain/format";
import { statusLabels, formatAttendanceDate } from "../attendance-state";
import { ButtonLink } from "@/components/button";
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
    <li className="history-event-item">
      <div className="history-event-header">
        <strong>
          {actionLabels[event.action]} · versi {event.after.version}
        </strong>
        <time dateTime={event.occurredAt}>{formatSchoolTime(event.occurredAt, timezone)}</time>
      </div>
      <p className="history-event-meta">
        {event.actor.name} · {stateLabels[event.before.state]} → {stateLabels[event.after.state]}
      </p>
      {event.reason && <p className="history-event-reason">Alasan: {event.reason}</p>}
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
  searchParams: Promise<{ date?: string; page?: string }>;
}) {
  const actor = await requirePageActor();
  const { classId } = await params;
  const { date, page: rawPage } = await searchParams;
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
        <PageHeader title="Riwayat absensi" />
        <StateBanner state="error">{failure}</StateBanner>
        <Link href="/attendance">Kembali ke hari ini</Link>
      </AppShell>
    );

  const students = new Map(history.students.map((student) => [student.id, student]));
  const pageSize = 10;
  const total = history.events.length;
  const currentPage = Math.max(
    1,
    Math.min(Number(rawPage ?? 1) || 1, Math.ceil(total / pageSize) || 1),
  );
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = history.events.slice(startIndex, startIndex + pageSize);

  const query: Record<string, string> = {};
  if (history.date) query.date = history.date;

  return (
    <AppShell
      actor={actor}
      school={{ name: history.schoolName, date: history.schoolToday, timezone: history.timezone }}
      currentPath="/attendance"
      breadcrumbs={[
        { label: "Absensi", href: "/attendance" },
        { label: history.className, href: `/attendance/${classId}?date=${history.date}` },
        { label: "Riwayat" },
      ]}
    >
      <PageHeader
        icon={History}
        title="Riwayat absensi"
        description={`${history.className} · ${formatAttendanceDate(history.date)}`}
        primaryAction={
          <ButtonLink
            href={`/attendance/${classId}?date=${history.date}`}
            aria-label="Kembali ke catatan kelas"
          >
            Kembali ke catatan kelas
          </ButtonLink>
        }
      />
      <DataCard id="daftar">
        <DataCardHeader title="Riwayat sesi" count={total} />
        <DataCardContent>
          {!total ? (
            <EmptyState
              icon={History}
              title="Belum ada riwayat"
              description="Belum ada perubahan tercatat pada tanggal ini."
            />
          ) : (
            <ol className="resource-list history-list">
              {paginatedEvents.map((event) => (
                <HistoryEvent
                  key={event.id}
                  event={event}
                  students={students}
                  timezone={history.timezone}
                />
              ))}
            </ol>
          )}
        </DataCardContent>
        {total > pageSize && (
          <DataCardFooter>
            <DataTablePagination
              total={total}
              page={currentPage}
              pageSize={pageSize}
              pathname={`/attendance/${classId}/history`}
              query={query}
            />
          </DataCardFooter>
        )}
      </DataCard>
    </AppShell>
  );
}
