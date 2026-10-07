import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { SetupChecklist } from "@/components/setup-checklist";
import { StateBanner } from "@/components/state-banner";
import { schoolIdentity } from "@/components/school-identity";
export default async function Setup() {
  const actor = await requirePageActor();
  const settings = await getSchoolSettings();
  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/setup">
      <h1>Persiapan sekolah</h1>
      <SetupChecklist state={settings.setup} />
      <StateBanner state={settings.setup.ready && settings.configuredAt ? "saved" : "empty"}>
        {settings.setup.ready && settings.configuredAt
          ? "Persiapan minimum lengkap."
          : settings.setup.ready
            ? "Persiapan minimum lengkap. Simpan identitas sekolah untuk mengonfirmasi kesiapan."
            : `Lengkapi: ${settings.setup.missing.join(", ")}.`}
      </StateBanner>
      {settings.setup.synthetic && (
        <p>Konfigurasi memakai data sintetis dan belum siap untuk produksi.</p>
      )}
      {actor.role === "admin" ? (
        <Link className="button-link" href="/settings">
          Atur identitas sekolah
        </Link>
      ) : (
        <p>Hubungi admin untuk melengkapi persiapan sekolah.</p>
      )}
    </AppShell>
  );
}
