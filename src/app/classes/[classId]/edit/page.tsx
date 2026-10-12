import type { Metadata } from "next";
import { orNotFound } from "@/server/not-found";
import { requireAdminPageActor } from "@/server/auth/page-actor";
import { getClass, listAcademicYears } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { ClassForm } from "../../form";

export const metadata: Metadata = {
  title: "Ubah kelas",
  description: "Ubah data kelas.",
};
export default async function EditClass({ params }: { params: Promise<{ classId: string }> }) {
  const actor = await requireAdminPageActor();
  const [current, years, settings] = await Promise.all([
    orNotFound(getClass((await params).classId)),
    listAcademicYears(),
    getSchoolSettings(),
  ]);
  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/classes"
      breadcrumbs={[
        { label: "Kelas", href: "/classes" },
        { label: current.name, href: `/classes/${current.id}` },
        { label: "Ubah" },
      ]}
    >
      <div className="form-page">
        <PageHeader title="Ubah kelas" description={current.name} />
        <ClassForm years={years} current={current} redirect />
      </div>
    </AppShell>
  );
}
