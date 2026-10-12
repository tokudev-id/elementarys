import { ListChecks } from "lucide-react";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { SetupChecklist } from "@/components/setup-checklist";
import { StateBanner } from "@/components/state-banner";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/button";
import { schoolIdentity } from "@/components/school-identity";

export default async function Setup() {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  return (
    <AppShell
      school={schoolIdentity(settings)}
      actor={actor}
      currentPath="/setup"
      breadcrumbs={[{ label: "Persiapan sekolah" }]}
    >
      <PageHeader
        icon={ListChecks}
        title="Persiapan sekolah"
        description="Kelengkapan data master dan konfigurasi awal sebelum operasional dimulai."
        actions={
          actor.role === "admin" ? (
            <ButtonLink variant="primary" href="/settings">
              Atur identitas sekolah
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="page-stack">
        <SetupChecklist state={settings.setup} />

        {settings.setup.synthetic && (
          <StateBanner state="info" title="Data uji">
            Konfigurasi memakai data sintetis dan belum siap untuk produksi.
          </StateBanner>
        )}

        <StateBanner state={settings.setup.ready && settings.configuredAt ? "saved" : "empty"}>
          {settings.setup.ready && settings.configuredAt
            ? "Persiapan minimum lengkap."
            : settings.setup.ready
              ? "Persiapan minimum lengkap. Simpan identitas sekolah untuk mengonfirmasi kesiapan."
              : `Lengkapi: ${settings.setup.missing.join(", ")}.`}
        </StateBanner>

        {actor.role !== "admin" && (
          <p className="empty-text">Hubungi admin untuk melengkapi persiapan sekolah.</p>
        )}
      </div>
    </AppShell>
  );
}
