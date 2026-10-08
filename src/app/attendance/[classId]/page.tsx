import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { requirePageActor } from "@/server/auth/page-actor";
import { DomainError } from "@/domain/errors";
import { getAttendance } from "@/server/queries/attendance";
import { AttendanceForm } from "./form";
import { getDashboard } from "@/server/queries/dashboard";
import { getCalendar } from "@/server/services/school-master";

export default async function ClassAttendance({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const actor = await requirePageActor();
  const { classId } = await params;
  const { date } = await searchParams;
  let data;
  try {
    data = await getAttendance(classId, date);
  } catch (error) {
    return (
      <AppShell school={null} actor={actor}>
        <h1>Absensi kelas</h1>
        <StateBanner state="error">
          {error instanceof DomainError
            ? error.message
            : "Belum dapat memuat daftar siswa. Muat ulang untuk mencoba kembali."}
        </StateBanner>
        <Link href="/attendance">Kembali ke hari ini</Link>
      </AppShell>
    );
  }
  const [calendar, dashboard] = await Promise.all([
    getCalendar(data.academicYearId, data.date.slice(0, 7)).catch(() => undefined),
    getDashboard(actor, data.date).catch(() => undefined),
  ]);
  const next = dashboard?.classes.find(
    (item) => item.classId !== classId && item.state === "not_recorded" && item.studentCount > 0,
  );
  return (
    <AppShell
      school={{ name: data.schoolName, date: data.schoolToday, timezone: data.timezone }}
      actor={actor}
      currentPath="/attendance"
      breadcrumbs={[{ label: "Absensi", href: "/attendance" }, { label: data.className }]}
    >
      <AttendanceForm
        key={`${data.classId}:${data.date}:${data.timezone}:${data.sessionVersion}`}
        initial={data}
        role={actor.role}
        calendar={calendar}
        nextClassHref={next ? `/attendance/${next.classId}?date=${data.date}` : undefined}
      />
    </AppShell>
  );
}
