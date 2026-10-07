export type Clock = () => Date;
export const systemClock: Clock = () => new Date();
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
export function isTimezone(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+\/-]*$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
export function schoolToday(timezone: string, clock: Clock = systemClock): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(clock());
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export type Calendar = {
  startsOn: string;
  endsOnExclusive: string;
  weekdays: number[];
  overrides: { date: string; isSchoolDay: boolean; reason: string }[];
};
export function resolveSchoolDay(date: string, calendar: Calendar) {
  const inYear = date >= calendar.startsOn && date < calendar.endsOnExclusive;
  const override = calendar.overrides.find((item) => item.date === date);
  return {
    inYear,
    isSchoolDay:
      inYear &&
      (override?.isSchoolDay ??
        calendar.weekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay())),
    reason: override?.reason ?? null,
  };
}
