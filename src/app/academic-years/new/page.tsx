import { requireAdminPageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { AcademicYearForm } from "../form";

export default async function NewAcademicYear() {
  const actor = await requireAdminPageActor();
  const settings = await getSchoolSettings();

  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/academic-years"
      breadcrumbs={[
        { label: "Tahun ajaran", href: "/academic-years" },
        { label: "Tambah tahun ajaran" },
      ]}
    >
      <div className="form-page">
        <PageHeader
          title="Tambah tahun ajaran"
          description="Buat periode kalender baru untuk sekolah."
        />
        <AcademicYearForm redirect />
      </div>
    </AppShell>
  );
}
