import type { Metadata } from "next";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { listAcademicYears, listClasses } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { ListFilters } from "@/components/list-filters";
import { SelectField } from "@/components/select-field";
import { MasterList, type MasterRow } from "@/components/master-list";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import {
  DataCard,
  DataCardHeader,
  DataCardToolbar,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import { classListSchema } from "@/contracts/lists";
import { Plus, School, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { parseInput } from "@/contracts/attendance";

export const metadata: Metadata = {
  title: "Kelas",
  description: "Daftar kelas per tahun ajaran.",
};

export default async function Classes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  const [years, settings] = await Promise.all([listAcademicYears(), getSchoolSettings()]);
  const filter = parseInput(classListSchema, {
    page: selected.page,
    pageSize: selected.pageSize,
    q: selected.q,
    yearId: selected.yearId || years.find((year) => year.isCurrent)?.id || years[0]?.id,
    grade: selected.grade || undefined,
    status: selected.status,
    sort: selected.sort,
  });
  const result = await listClasses(filter);
  const query = Object.fromEntries(
    Object.entries(filter)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const rows: MasterRow[] = result.items.map((item) => ({
    id: item.id,
    title: item.name,
    href: `/classes/${item.id}`,
    meta: `Tingkat ${item.grade} · ${item.yearLabel} · ${item.studentCount} siswa`,
    status: {
      label: item.archivedAt ? "Diarsipkan" : "Aktif",
      tone: item.archivedAt ? "neutral" : "success",
    },
    cells: {
      grade: String(item.grade),
      year: item.yearLabel,
      teachers: item.primaryTeachers.map((teacher) => teacher.name).join(", ") || "—",
      count: String(item.studentCount),
    },
    actions: [
      { label: "Lihat", href: `/classes/${item.id}` },
      ...(actor.role === "admin" ? [{ label: "Ubah", href: `/classes/${item.id}/edit` }] : []),
    ],
  }));

  const activeFilterCount =
    (filter.grade ? 1 : 0) + (filter.status && filter.status !== "all" ? 1 : 0);

  return (
    <AppShell actor={actor} school={schoolIdentity(settings)} currentPath="/classes">
      <PageHeader
        icon={School}
        title="Kelas"
        description="Daftar kelas per tahun ajaran."
        primaryAction={
          actor.role === "admin" ? (
            <ButtonLink variant="primary" href="/classes/new">
              <Plus aria-hidden="true" />
              Tambah kelas
            </ButtonLink>
          ) : undefined
        }
      />
      <DataCard id="daftar">
        <DataCardHeader title="Kelas" count={result.total} />
        <DataCardToolbar>
          <ListFilters
            q={filter.q}
            query={query}
            searchLabel="Cari kelas"
            activeFilterCount={activeFilterCount}
          >
            <SelectField label="Tahun ajaran" name="yearId" defaultValue={filter.yearId}>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Tingkat" name="grade" defaultValue={filter.grade ?? ""}>
              <option value="">Semua tingkat</option>
              {[1, 2, 3, 4, 5, 6].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </SelectField>
            <SelectField label="Status kelas" name="status" defaultValue={filter.status}>
              <option value="all">Semua</option>
              <option value="active">Aktif</option>
              <option value="archived">Diarsipkan</option>
            </SelectField>
          </ListFilters>
        </DataCardToolbar>
        <DataCardContent>
          {rows.length ? (
            <MasterList
              items={rows}
              label="Daftar kelas"
              currentSort={filter.sort}
              sortableColumns={{ grade: "grade", name: "name", year: "year" }}
              query={query}
              columns={[
                { key: "grade", label: "Tingkat" },
                { key: "year", label: "Tahun ajaran", desktopOnly: true },
                { key: "teachers", label: "Guru utama" },
                { key: "count", label: "Siswa" },
              ]}
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="Belum ada kelas yang cocok"
              description="Periksa filter atau tambahkan kelas."
              action={<Link href="/classes">Reset filter</Link>}
            />
          )}
        </DataCardContent>
        <DataCardFooter>
          <DataTablePagination {...result} pathname="/classes" query={query} />
        </DataCardFooter>
      </DataCard>
    </AppShell>
  );
}
