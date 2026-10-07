import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { SetupChecklist } from "@/components/setup-checklist";
import { SettingsForm } from "./form";
import { schoolIdentity } from "@/components/school-identity";
export default async function Settings() {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/settings">
      <h1>Konfigurasi sekolah</h1>
      <SetupChecklist state={settings.setup} />
      {settings.setup.synthetic && (
        <StateBanner state="empty">
          Data sintetis untuk pengujian. Identitas ini belum siap digunakan di produksi.
        </StateBanner>
      )}
      {!settings.setup.ready && (
        <StateBanner state="empty">Lengkapi: {settings.setup.missing.join(", ")}.</StateBanner>
      )}
      {actor.role === "admin" ? (
        <SettingsForm initial={settings} />
      ) : (
        <p>
          Nama sekolah: {settings.name || "Belum diisi"}. Zona waktu: {settings.timezone}. Hubungi
          admin untuk mengubah konfigurasi.
        </p>
      )}
    </AppShell>
  );
}
