import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { SetupChecklist } from "@/components/setup-checklist";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./form";
import { schoolIdentity } from "@/components/school-identity";

export default async function Settings() {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  return (
    <AppShell
      school={schoolIdentity(settings)}
      actor={actor}
      currentPath="/settings"
      breadcrumbs={[{ label: "Sekolah", href: "/settings" }]}
    >
      <PageHeader
        title="Konfigurasi sekolah"
        description="Identitas sekolah, lokasi, dan zona waktu acuan operasional absensi."
      />

      <div className="page-stack">
        <SetupChecklist state={settings.setup} />

        {settings.setup.synthetic && (
          <StateBanner state="info" title="Data uji">
            Data sintetis untuk pengujian. Identitas ini belum siap digunakan di produksi.
          </StateBanner>
        )}

        {!settings.setup.ready && (
          <StateBanner state="empty">
            Lengkapi: {settings.setup.missing.join(", ")}.
          </StateBanner>
        )}

        {actor.role === "admin" ? (
          <SettingsForm initial={settings} />
        ) : (
          <div className="card-box">
            <p>
              Nama sekolah: <strong>{settings.name || "Belum diisi"}</strong>. Zona waktu:{" "}
              <strong>{settings.timezone}</strong>. Hubungi admin untuk mengubah konfigurasi.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
