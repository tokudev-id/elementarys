import type { Metadata } from "next";
import { requireAdminPageActor } from "@/server/auth/page-actor";
import { listAcademicYears, listClassOptions } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StudentForm } from "../form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tambah siswa",
  description: "Daftarkan siswa baru dan penempatan awalnya.",
};

export default async function NewStudent() {
  const actor = await requireAdminPageActor();
  const [settings, years, classes] = await Promise.all([
    getSchoolSettings(),
    listAcademicYears(),
    listClassOptions(),
  ]);
  const school = schoolIdentity(settings);
  return (
    <AppShell
      school={school}
      actor={actor}
      currentPath="/students"
      breadcrumbs={[{ label: "Siswa", href: "/students" }, { label: "Tambah siswa" }]}
    >
      <div className="form-page">
        <PageHeader
          title="Tambah siswa"
          description="Isi identitas dan penempatan awal yang sudah diverifikasi."
        />
        {classes.some((item) => !item.archivedAt) ? (
          <StudentForm classes={classes} years={years} today={school?.date ?? ""} redirect />
        ) : (
          <EmptyState
            title="Belum ada kelas"
            description="Tambahkan tahun ajaran dan kelas terlebih dahulu."
            action={<Link href="/classes/new">Tambah kelas</Link>}
          />
        )}
      </div>
    </AppShell>
  );
}
