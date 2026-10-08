import { requireAdminPageActor } from "@/server/auth/page-actor";
import { getStudent } from "@/server/services/students";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { StudentForm } from "../../form";

export default async function EditStudent({ params }: { params: Promise<{ studentId: string }> }) {
  const actor = await requireAdminPageActor();
  const [student, settings] = await Promise.all([
    getStudent((await params).studentId),
    getSchoolSettings(),
  ]);
  return (
    <AppShell
      school={schoolIdentity(settings)}
      actor={actor}
      currentPath="/students"
      breadcrumbs={[
        { label: "Siswa", href: "/students" },
        { label: student.fullName, href: `/students/${student.id}` },
        { label: "Ubah" },
      ]}
    >
      <div className="form-page">
        <PageHeader title="Ubah siswa" description={student.fullName} />
        <StudentForm current={student} today="" redirect />
      </div>
    </AppShell>
  );
}
