import { requirePageActor } from "@/server/auth/page-actor";
import { getStudent } from "@/server/services/students";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { listAcademicYears, listClassOptions } from "@/server/services/school-master";
import { buildMonthlyAttendanceReport } from "@/server/reports/monthly";
import { StudentDetailView } from "./detail";

export default async function Student({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const actor = await requirePageActor();
  const [student, settings, years, selected] = await Promise.all([
    getStudent((await params).studentId),
    getSchoolSettings(),
    listAcademicYears(),
    searchParams,
  ]);
  const school = schoolIdentity(settings);
  const classes = actor.role === "admin" ? await listClassOptions() : [];
  const current = student.enrollments.find(
    (item) =>
      !item.cancelled &&
      item.startsOn <= (school?.date ?? "") &&
      item.endsOnExclusive > (school?.date ?? ""),
  );
  const year = years.find((item) => item.isCurrent);
  const month = school?.date.slice(0, 7);
  const report =
    year && month
      ? await buildMonthlyAttendanceReport({
          yearId: year.id,
          month,
        }).catch(() => undefined)
      : undefined;
  const summaries =
    report?.classes.flatMap((item) =>
      item.students.filter((entry) => entry.studentId === student.id),
    ) ?? [];
  const attendance =
    report && summaries.length
      ? {
          totals: summaries.reduce(
            (totals, item) => ({
              H: totals.H + item.totals.H,
              S: totals.S + item.totals.S,
              I: totals.I + item.totals.I,
              A: totals.A + item.totals.A,
            }),
            { H: 0, S: 0, I: 0, A: 0 },
          ),
          month: report.input.month,
          href: `/reports?yearId=${report.input.yearId}&month=${report.input.month}${current ? "&classId=" + current.classId : ""}`,
        }
      : undefined;
  return (
    <AppShell
      school={school}
      actor={actor}
      currentPath="/students"
      breadcrumbs={[{ label: "Siswa", href: "/students" }, { label: student.fullName }]}
    >
      <StudentDetailView
        student={student}
        classes={classes}
        years={years}
        today={school?.date ?? ""}
        admin={actor.role === "admin"}
        requestedAction={selected.action}
        attendance={attendance}
      />
    </AppShell>
  );
}
