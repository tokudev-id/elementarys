import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { listAcademicYearsPage } from "@/server/services/school-master";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import { MasterList, type MasterRow } from "@/components/master-list";
import { ListFilters } from "@/components/list-filters";
import { SelectField } from "@/components/select-field";
import { EmptyState } from "@/components/empty-state";
import { DataTablePagination } from "@/components/data-table-pagination";
import {
  DataCard,
  DataCardHeader,
  DataCardToolbar,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import { parseInput } from "@/contracts/attendance";
import { Plus, CalendarRange, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { academicYearListSchema } from "@/contracts/lists";

export default async function AcademicYears({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  const filter = parseInput(academicYearListSchema, {
    page: selected.page,
    pageSize: selected.pageSize,
    q: selected.q,
    status: selected.status,
    sort: selected.sort,
  });

  const [settings, years] = await Promise.all([getSchoolSettings(), listAcademicYearsPage(filter)]);

  const query = Object.fromEntries(
    Object.entries(filter)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );

  const rows: MasterRow[] = years.items.map((year) => ({
    id: year.id,
    title: year.label,
    href: actor.role === "admin" ? `/academic-years/${year.id}/edit` : "/academic-years",
    meta: `${year.startsOn} – ${year.endsOnExclusive}`,
    status: {
      label: year.isCurrent ? "Aktif" : year.archivedAt ? "Diarsipkan" : "Tidak aktif",
      tone: year.isCurrent ? "success" : year.archivedAt ? "neutral" : "neutral",
    },
    cells: {
      startsOn: year.startsOn,
      endsOnExclusive: year.endsOnExclusive,
    },
    actions: [
      ...(actor.role === "admin"
        ? [{ label: "Ubah", href: `/academic-years/${year.id}/edit` }]
        : []),
    ],
  }));

  const activeFilterCount = filter.status && filter.status !== "all" ? 1 : 0;

  return (
    <AppShell actor={actor} school={schoolIdentity(settings)} currentPath="/academic-years">
      <PageHeader
        icon={CalendarRange}
        title="Tahun ajaran"
        description="Periode kalender dan tahun ajaran sekolah."
        primaryAction={
          actor.role === "admin" ? (
            <ButtonLink variant="primary" href="/academic-years/new">
              <Plus aria-hidden="true" />
              Tambah tahun ajaran
            </ButtonLink>
          ) : undefined
        }
        secondaryActions={
          actor.role === "admin"
            ? [{ label: "Persiapan tahun berikutnya", href: "/academic-years/rollover" }]
            : undefined
        }
      />
      <DataCard id="daftar">
        <DataCardHeader title="Daftar tahun ajaran" count={years.total} />
        <DataCardToolbar>
          <ListFilters
            q={filter.q}
            query={query}
            searchLabel="Cari tahun ajaran"
            activeFilterCount={activeFilterCount}
          >
            <SelectField label="Status" name="status" defaultValue={filter.status}>
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
              label="Daftar tahun ajaran"
              nameHeader="Label"
              currentSort={filter.sort}
              sortableColumns={{ label: "label", startsOn: "startsOn" }}
              query={query}
              columns={[
                { key: "startsOn", label: "Mulai" },
                { key: "endsOnExclusive", label: "Selesai" },
              ]}
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="Tidak ada tahun ajaran yang cocok"
              description="Periksa filter atau tambahkan tahun ajaran baru."
              action={
                actor.role === "admin" ? (
                  <Link href="/academic-years/new">Tambah tahun ajaran</Link>
                ) : (
                  <Link href="/academic-years">Reset filter</Link>
                )
              }
            />
          )}
        </DataCardContent>
        <DataCardFooter>
          <DataTablePagination {...years} pathname="/academic-years" query={query} />
        </DataCardFooter>
      </DataCard>
    </AppShell>
  );
}
