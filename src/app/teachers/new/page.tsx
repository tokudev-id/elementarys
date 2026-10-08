import { requireAdminPageActor } from "@/server/auth/page-actor";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { TeacherProfileForm } from "../forms";
export default async function NewTeacher() {
  const actor = await requireAdminPageActor();
  const settings = await getSchoolSettings();
  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/teachers"
      breadcrumbs={[{ label: "Guru", href: "/teachers" }, { label: "Tambah guru" }]}
    >
      <div className="form-page">
        <PageHeader
          title="Tambah guru"
          description="Profil dapat dibuat sebelum akun dihubungkan."
        />
        <TeacherProfileForm redirect />
      </div>
    </AppShell>
  );
}
