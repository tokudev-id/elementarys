import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/guards";
import { DomainError } from "@/domain/errors";
import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { pool } from "@/server/db/pool";
export default async function Home() {
  let actor;
  try { actor = await requireActor(await headers()); }
  catch(error) { redirect(error instanceof DomainError && error.code === "PASSWORD_CHANGE_REQUIRED" ? "/change-password" : "/login"); }
  const config = (await pool.query("SELECT name,timezone FROM school_config WHERE id=1")).rows[0];
  if (!config) return <AppShell actor={actor} school={null}><h1>Absensi Sekolah</h1><StateBanner state="empty">Identitas sekolah belum diatur. Hubungi admin.</StateBanner></AppShell>;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  return <AppShell actor={actor} school={{ name: config.name, timezone: config.timezone, date }}>
    <h1>Absensi Sekolah</h1>
    <p>Masuk sebagai {actor.name}. Pencatatan kehadiran sedang disiapkan.</p>
    <StateBanner state="empty">Pencatatan kelas akan tersedia setelah alur absensi siap.</StateBanner>
  </AppShell>;
}
