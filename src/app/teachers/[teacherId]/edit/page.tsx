import { requireAdminPageActor } from "@/server/auth/page-actor";
import { getTeacher } from "@/server/services/teachers";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { TeacherProfileForm } from "../../forms";
export default async function EditTeacher({ params }: { params: Promise<{ teacherId: string }> }) {
  const actor = await requireAdminPageActor();
  const [teacher, settings] = await Promise.all([
    getTeacher((await params).teacherId, actor),
    getSchoolSettings(),
  ]);
  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/teachers"
      breadcrumbs={[
        { label: "Guru", href: "/teachers" },
        { label: teacher.fullName, href: `/teachers/${teacher.id}` },
        { label: "Ubah" },
      ]}
    >
      <div className="form-page">
        <PageHeader title="Ubah guru" description={teacher.fullName} />
        <TeacherProfileForm teacher={teacher} redirect />
      </div>
    </AppShell>
  );
}
