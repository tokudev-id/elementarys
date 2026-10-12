import type { Metadata } from "next";
import { orNotFound } from "@/server/not-found";
import { requireAdminPageActor } from "@/server/auth/page-actor";
import { getAcademicYear } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { AcademicYearForm } from "../../form";

export const metadata: Metadata = {
  title: "Ubah tahun ajaran",
  description: "Ubah periode tahun ajaran.",
};

export default async function EditAcademicYear({
  params,
}: {
  params: Promise<{ yearId: string }>;
}) {
  const actor = await requireAdminPageActor();
  const { yearId } = await params;
  const [current, settings] = await Promise.all([
    orNotFound(getAcademicYear(yearId)),
    getSchoolSettings(),
  ]);

  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/academic-years"
      breadcrumbs={[
        { label: "Tahun ajaran", href: "/academic-years" },
        { label: current.label },
        { label: "Ubah" },
      ]}
    >
      <div className="form-page">
        <PageHeader title="Ubah tahun ajaran" description={current.label} />
        <AcademicYearForm current={current} redirect />
      </div>
    </AppShell>
  );
}
