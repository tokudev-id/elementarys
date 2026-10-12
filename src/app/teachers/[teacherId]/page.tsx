import { requirePageActor } from "@/server/auth/page-actor";
import { getTeacher, unlinkedAccounts } from "@/server/services/teachers";
import { getSchoolSettings } from "@/server/services/settings";
import { listAcademicYears, listClassOptions } from "@/server/services/school-master";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Pencil } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ButtonLink } from "@/components/button";
import { TeacherDetailView } from "./detail";

export default async function Teacher({ params }: { params: Promise<{ teacherId: string }> }) {
  const actor = await requirePageActor();
  const [teacher, settings, years] = await Promise.all([
    getTeacher((await params).teacherId, actor),
    getSchoolSettings(),
    listAcademicYears(),
  ]);
  const currentYear = years.find((year) => year.isCurrent);
  const [classes, accounts] =
    actor.role === "admin"
      ? await Promise.all([listClassOptions(undefined, currentYear?.id), unlinkedAccounts(actor)])
      : [[], []];
  return (
    <AppShell
      actor={actor}
      school={schoolIdentity(settings)}
      currentPath="/teachers"
      breadcrumbs={[{ label: "Guru", href: "/teachers" }, { label: teacher.fullName }]}
    >
      <PageHeader
        leading={<Avatar name={teacher.fullName} size="lg" />}
        title={teacher.fullName}
        meta={
          <StatusBadge tone={teacher.active ? "success" : "neutral"}>
            {teacher.active ? "Aktif" : "Nonaktif"}
          </StatusBadge>
        }
        actions={
          actor.role === "admin" ? (
            <ButtonLink href={`/teachers/${teacher.id}/edit`}>
              <Pencil aria-hidden="true" />
              Ubah
            </ButtonLink>
          ) : undefined
        }
      />
      <TeacherDetailView
        teacher={teacher}
        admin={actor.role === "admin"}
        classes={classes}
        accounts={accounts}
      />
    </AppShell>
  );
}
