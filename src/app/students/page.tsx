import type { Metadata } from "next";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { listStudents } from "@/server/services/students";
import { listClassOptions } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListFilters } from "@/components/list-filters";
import { SelectField } from "@/components/select-field";
import { MasterList, type MasterRow } from "@/components/master-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import {
  DataCard,
  DataCardHeader,
  DataCardToolbar,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import { studentListSchema } from "@/contracts/lists";
import { Plus, Users } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { parseInput } from "@/contracts/attendance";

export const metadata: Metadata = {
  title: "Siswa",
  description: "Daftar siswa beserta kelas aktif.",
};

export default async function Students({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  const filter = parseInput(studentListSchema, {
    page: selected.page,
    pageSize: selected.pageSize,
    q: selected.q ?? selected.search,
    classId: selected.classId || undefined,
    status: selected.status ?? (selected.includeArchived === "true" ? "all" : undefined),
    sort: selected.sort,
  });
  const [settings, classes, students] = await Promise.all([
    getSchoolSettings(),
    listClassOptions(),
    listStudents(filter),
  ]);
  const query = Object.fromEntries(
    Object.entries(filter)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const rows: MasterRow[] = students.items.map((student) => ({
    id: student.id,
    title: student.fullName,
    href: `/students/${student.id}`,
    meta: `${student.studentCode} · ${student.activeClass?.name ?? "Belum ditempatkan"}`,
    status: {
      label: student.archivedAt ? "Diarsipkan" : "Aktif",
      tone: student.archivedAt ? "neutral" : "success",
    },
    cells: {
      code: student.studentCode,
      nis: student.nis ?? "",
      nisn: student.nisn ?? "",
      class: student.activeClass?.name ?? "Belum ditempatkan",
    },
    actions: [
      { label: "Lihat", href: `/students/${student.id}` },
      ...(actor.role === "admin"
        ? [
            { label: "Ubah", href: `/students/${student.id}/edit` },
            { label: "Pindah kelas", href: `/students/${student.id}?action=placement` },
            {
              label: student.archivedAt ? "Aktifkan kembali" : "Arsipkan",
              href: `/students/${student.id}?action=archive`,
              destructive: true,
            },
          ]
        : []),
    ],
  }));

  const activeFilterCount =
    (filter.classId ? 1 : 0) + (filter.status && filter.status !== "active" ? 1 : 0);

  return (
    <AppShell school={schoolIdentity(settings)} actor={actor} currentPath="/students">
      <PageHeader
        icon={Users}
        title="Siswa"
        description={`${students.total} siswa sesuai filter`}
        primaryAction={
          actor.role === "admin" ? (
            <ButtonLink variant="primary" href="/students/new">
              <Plus aria-hidden="true" />
              Tambah siswa
            </ButtonLink>
          ) : undefined
        }
        secondaryActions={
          actor.role === "admin"
            ? [{ label: "Naik kelas / penempatan", href: "/students/promote" }]
            : undefined
        }
      />
      <DataCard id="daftar">
        <DataCardHeader title="Siswa" count={students.total} />
        <DataCardToolbar>
          <ListFilters
            q={filter.q}
            query={query}
            searchLabel="Cari nama atau kode siswa"
            activeFilterCount={activeFilterCount}
          >
            <SelectField label="Filter kelas" name="classId" defaultValue={filter.classId ?? ""}>
              <option value="">Semua kelas</option>
              {classes.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Status siswa" name="status" defaultValue={filter.status}>
              <option value="active">Aktif</option>
              <option value="archived">Diarsipkan</option>
              <option value="all">Semua</option>
            </SelectField>
          </ListFilters>
        </DataCardToolbar>
        <DataCardContent>
          {rows.length ? (
            <MasterList
              avatars
              items={rows}
              label="Daftar siswa"
              currentSort={filter.sort}
              sortableColumns={{ name: "name", code: "code", class: "class" }}
              query={query}
              columns={[
                { key: "code", label: "Kode" },
                { key: "nis", label: "NIS", desktopOnly: true },
                { key: "nisn", label: "NISN", desktopOnly: true },
                { key: "class", label: "Kelas aktif" },
              ]}
            />
          ) : (
            <EmptyState
              icon={Users}
              title={filter.q || filter.classId ? "Tidak ada siswa yang cocok" : "Belum ada siswa"}
              description="Periksa filter atau tambahkan siswa yang sudah diverifikasi."
              action={<Link href="/students">Reset filter</Link>}
            />
          )}
        </DataCardContent>
        <DataCardFooter>
          <DataTablePagination {...students} pathname="/students" query={query} />
        </DataCardFooter>
      </DataCard>
    </AppShell>
  );
}
