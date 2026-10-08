import Link from "next/link";
import { requireAdminPageActor } from "@/server/auth/page-actor";
import { listAcademicYears } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ClassForm } from "../form";
export default async function NewClass() {
  const actor = await requireAdminPageActor();
  const [settings, years] = await Promise.all([getSchoolSettings(), listAcademicYears()]);
  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/classes"
      breadcrumbs={[{ label: "Kelas", href: "/classes" }, { label: "Tambah kelas" }]}
    >
      <div className="form-page">
        <PageHeader title="Tambah kelas" />
        {years.some((year) => !year.archivedAt) ? (
          <ClassForm years={years} redirect />
        ) : (
          <EmptyState
            title="Belum ada tahun ajaran"
            action={<Link href="/academic-years">Tambah tahun ajaran</Link>}
          />
        )}
      </div>
    </AppShell>
  );
}
