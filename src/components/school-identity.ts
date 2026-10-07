import type { SchoolSettings } from "@/contracts/settings";
import { isTimezone, schoolToday } from "@/domain/calendar";

export function schoolIdentity(settings: Pick<SchoolSettings, "name" | "timezone" | "serverNow">) {
  if (!settings.name.trim() || !isTimezone(settings.timezone)) return null;
  return {
    name: settings.name,
    timezone: settings.timezone,
    date: schoolToday(settings.timezone, () => new Date(settings.serverNow)),
  };
}
