import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { getClass, listAcademicYears } from "@/server/services/school-master";
import { listStudents } from "@/server/services/students";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { MasterList, type MasterRow } from "@/components/master-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
export default async function ClassDetail({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const actor = await requirePageActor();
  const id = (await params).classId;
  const selected = await searchParams;
  const [current, years, settings, students] = await Promise.all([
    getClass(id),
    listAcademicYears(),
    getSchoolSettings(),
    listStudents({ classId: id, page: selected.page, pageSize: selected.pageSize }),
  ]);
  const school = schoolIdentity(settings);
  const year = years.find((item) => item.id === current.yearId);
  const rows: MasterRow[] = students.items.map((student) => ({
    id: student.id,
    title: student.fullName,
    href: `/students/${student.id}`,
    meta: student.studentCode,
    cells: { code: student.studentCode },
    status: { label: "Aktif", tone: "success" },
    actions: [{ label: "Lihat siswa", href: `/students/${student.id}` }],
  }));
  return (
    <AppShell
      actor={actor}
      school={school}
      currentPath="/classes"
      breadcrumbs={[{ label: "Kelas", href: "/classes" }, { label: current.name }]}
    >
      <Link href="/classes">Kembali ke kelas</Link>
      <PageHeader
        title={current.name}
        meta={
          <StatusBadge tone={current.archivedAt ? "neutral" : "success"}>
            {current.archivedAt ? "Diarsipkan" : "Aktif"}
          </StatusBadge>
        }
        description={`Tingkat ${current.grade} · ${year?.label ?? ""}`}
        actions={
          actor.role === "admin" ? (
            <Link className="button-link" href={`/classes/${id}/edit`}>
              Ubah
            </Link>
          ) : undefined
        }
      />
      <section className="form-section">
        <h2>Ringkasan kelas</h2>
        <dl className="record-summary">
          <div>
            <dt>Tingkat</dt>
            <dd>{current.grade}</dd>
          </div>
          <div>
            <dt>Tahun ajaran</dt>
            <dd>{year?.label}</dd>
          </div>
          <div>
            <dt>Siswa aktif saat ini</dt>
            <dd>{students.total}</dd>
          </div>
        </dl>
        <div className="button-row">
          <Link className="button-link" href={`/attendance/${id}?date=${school?.date ?? ""}`}>
            Catat absensi
          </Link>
          <Link
            className="button-link button-link--secondary"
            href={`/reports?yearId=${current.yearId}&classId=${id}&month=${school?.date.slice(0, 7) ?? ""}`}
          >
            Rekap kelas
          </Link>
        </div>
      </section>
      <h2>Siswa aktif</h2>
      {rows.length ? (
        <MasterList
          items={rows}
          columns={[{ key: "code", label: "Kode" }]}
          label="Siswa aktif kelas"
        />
      ) : (
        <EmptyState title="Tidak ada siswa aktif pada tanggal sekolah" />
      )}
      <DataTablePagination {...students} pathname={`/classes/${id}`} />
    </AppShell>
  );
}
