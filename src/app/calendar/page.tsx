import { requirePageActor } from "@/server/auth/page-actor";
import { listAcademicYears, getCalendar } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { schoolToday, isTimezone } from "@/domain/calendar";
import { DomainError } from "@/domain/errors";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { SelectField } from "@/components/select-field";
import { Field } from "@/components/field";
import { Button } from "@/components/button";
import type { CalendarView } from "@/contracts/school-master";
import { CalendarEditor } from "./editor";
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
  if (!year)
    return (
      <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/calendar">
        <h1>Kalender akademik</h1>
        <StateBanner state="empty">Tambahkan tahun ajaran sebelum mengatur kalender.</StateBanner>
      </AppShell>
    );
  const todayMonth = schoolToday(
    isTimezone(settings.timezone) ? settings.timezone : "Asia/Kuala_Lumpur",
  ).slice(0, 7);
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
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/calendar">
      <h1>Kalender akademik</h1>
      <form className="filter-form" action="/calendar">
        <SelectField label="Tahun ajaran" name="yearId" defaultValue={year.id}>
          {years.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>
        <Field label="Bulan kalender" name="month" type="month" defaultValue={month} required />
        <Button type="submit">Tampilkan kalender</Button>
      </form>
      {message && <StateBanner state="error">{message}</StateBanner>}
      {calendar && (
        <>
          <h2>
            {calendar.year.label} · {calendar.month}
          </h2>
          {!calendar.weekdays.length && (
            <StateBanner state="empty">
              Hari belajar rutin belum diatur. Admin perlu melengkapinya.
            </StateBanner>
          )}
          <ol className="calendar-grid">
            {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day) => (
              <li key={day} className="calendar-weekday">
                {day}
              </li>
            ))}
            {Array.from(
              { length: new Date(`${calendar.days[0].date}T12:00:00Z`).getUTCDay() },
              (_, index) => (
                <li key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />
              ),
            )}
            {calendar.days.map((day) => (
              <li key={day.date}>
                <time dateTime={day.date}>{Number(day.date.slice(-2))}</time>
                <strong>
                  {!day.inYear ? "Di luar tahun" : day.isSchoolDay ? "Hari belajar" : "Libur"}
                </strong>
                {day.reason && <small>{day.reason}</small>}
              </li>
            ))}
          </ol>
          {actor.role === "admin" && <CalendarEditor calendar={calendar} />}
        </>
      )}
    </AppShell>
  );
}
