import { requirePageActor } from "@/server/auth/page-actor";
import { listAcademicYears, getCalendar } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { schoolToday, isTimezone } from "@/domain/calendar";
import { DomainError } from "@/domain/errors";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { PageHeader } from "@/components/page-header";
import type { CalendarView } from "@/contracts/school-master";
import { getMonthStudentAbsences } from "@/server/queries/calendar-absences";
import { CalendarClient } from "./calendar-client";

export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string; month?: string }>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  const years = await listAcademicYears();
  const settings = await getSchoolSettings();
  const year = years.find((item) => item.id === selected.yearId) ?? years[0];

  if (!year) {
    return (
      <AppShell
        school={schoolIdentity(settings)}
        actor={actor}
        currentPath="/calendar"
        breadcrumbs={[{ label: "Kalender" }]}
      >
        <PageHeader title="Kalender akademik" />
        <StateBanner state="empty">Tambahkan tahun ajaran sebelum mengatur kalender.</StateBanner>
      </AppShell>
    );
  }

  const todayDate = schoolToday(
    isTimezone(settings.timezone) ? settings.timezone : "Asia/Kuala_Lumpur",
  );
  const todayMonth = todayDate.slice(0, 7);

  const month =
    selected.month ??
    (todayMonth >= year.startsOn.slice(0, 7) && `${todayMonth}-01` < year.endsOnExclusive
      ? todayMonth
      : year.startsOn.slice(0, 7));

  let calendar: CalendarView | undefined;
  let message = "";
  try {
    calendar = await getCalendar(selected.yearId ?? year.id, month);
  } catch (error) {
    message =
      error instanceof DomainError ? error.message : "Belum dapat memuat kalender. Coba kembali.";
  }

  const absences = await getMonthStudentAbsences(selected.yearId ?? year.id, month);

  return (
    <AppShell
      school={schoolIdentity(settings)}
      actor={actor}
      currentPath="/calendar"
      breadcrumbs={[{ label: "Kalender" }]}
    >
      <PageHeader
        title="Kalender akademik"
        description={`${year.label} · ${year.startsOn} s/d ${year.endsOnExclusive}`}
      />

      {message && <StateBanner state="error">{message}</StateBanner>}

      {calendar && (
        <CalendarClient
          calendar={calendar}
          isAdmin={actor.role === "admin"}
          years={years}
          selectedYearId={selected.yearId ?? year.id}
          absences={absences}
          todayDate={todayDate}
        />
      )}
    </AppShell>
  );
}
