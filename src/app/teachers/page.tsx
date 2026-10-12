import type { Metadata } from "next";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page-actor";
import { listTeachers } from "@/server/services/teachers";
import { listUnlinkedAccounts } from "@/server/queries/master-lists";
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
import { teacherListSchema } from "@/contracts/lists";
import { Plus, GraduationCap, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { UnlinkedAccountList } from "./unlinked-list";

export const metadata: Metadata = {
  title: "Guru",
  description: "Profil guru, kelas utama, dan akun sekolah.",
};

export default async function Teachers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePageActor();
  const selected = await searchParams;
  const filter = parseInput(teacherListSchema, {
    page: selected.page,
    pageSize: selected.pageSize,
    q: selected.q,
    status: selected.status,
    role: selected.role || undefined,
    sort: selected.sort,
  });
  const [settings, teachers] = await Promise.all([
    getSchoolSettings(),
    listTeachers(actor, filter),
  ]);
  const query = Object.fromEntries(
    Object.entries(filter)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const accounts =
    actor.role === "admin" && selected.tab === "accounts"
      ? await listUnlinkedAccounts(actor, filter)
      : null;
  const rows: MasterRow[] = teachers.items.map((teacher) => ({
    id: teacher.id,
    title: teacher.fullName,
    href: `/teachers/${teacher.id}`,
    meta:
      teacher.classes
        .map((item) => item.name)
        .slice(0, 2)
        .join(" · ") || "Kelas utama belum dipilih",
    status: {
      label: !teacher.active
        ? "Nonaktif"
        : !teacher.hasAccount
          ? "Belum punya akun"
          : teacher.account?.banned
            ? "Akses nonaktif"
            : teacher.account?.mustChangePassword
              ? "Wajib ganti password"
              : "Aktif",
      tone:
        !teacher.active || teacher.account?.banned
          ? "danger"
          : teacher.account?.mustChangePassword
            ? "warning"
            : teacher.hasAccount
              ? "success"
              : "neutral",
    },
    cells: {
      email: teacher.account?.email ?? "—",
      role: teacher.account?.role === "admin" ? "Admin" : "Guru",
    },
    classNames: teacher.classes.map((item) => item.name),
    actions: [
      { label: "Lihat", href: `/teachers/${teacher.id}` },
      ...(actor.role === "admin" ? [{ label: "Ubah", href: `/teachers/${teacher.id}/edit` }] : []),
    ],
  }));

  const activeFilterCount =
    (filter.status && filter.status !== "all" ? 1 : 0) + (filter.role ? 1 : 0);

  return (
    <AppShell actor={actor} school={schoolIdentity(settings)} currentPath="/teachers">
      <PageHeader
        icon={GraduationCap}
        title="Guru"
        description="Profil, kelas utama dan akun sekolah."
        primaryAction={
          actor.role === "admin" ? (
            <ButtonLink variant="primary" href="/teachers/new">
              <Plus aria-hidden="true" />
              Tambah guru
            </ButtonLink>
          ) : undefined
        }
      />
      {actor.role === "admin" && (
        <nav className="list-tabs" aria-label="Kelompok guru">
          <Link href="/teachers" aria-current={selected.tab !== "accounts" ? "page" : undefined}>
            Profil guru
          </Link>
          <Link
            href="/teachers?tab=accounts"
            aria-current={selected.tab === "accounts" ? "page" : undefined}
          >
            Akun tanpa profil
          </Link>
        </nav>
      )}
      {accounts ? (
        <DataCard id="daftar">
          <DataCardHeader title="Akun tanpa profil" count={accounts.total} />
          <DataCardContent>
            <UnlinkedAccountList accounts={accounts.items} />
          </DataCardContent>
          <DataCardFooter>
            <DataTablePagination
              total={accounts.total}
              page={accounts.page}
              pageSize={accounts.pageSize}
              pathname="/teachers"
              query={{ ...query, tab: "accounts" }}
            />
          </DataCardFooter>
        </DataCard>
      ) : (
        <DataCard id="daftar">
          <DataCardHeader title="Profil guru" count={teachers.total} />
          <DataCardToolbar>
            <ListFilters
              q={filter.q}
              query={query}
              searchLabel="Cari guru"
              activeFilterCount={activeFilterCount}
            >
              <SelectField label="Status guru" name="status" defaultValue={filter.status}>
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
                <option value="unlinked">Belum punya akun</option>
                {actor.role === "admin" && (
                  <option value="password_change">Wajib ganti password</option>
                )}
              </SelectField>
              {actor.role === "admin" && (
                <SelectField label="Peran akun" name="role" defaultValue={filter.role ?? ""}>
                  <option value="">Semua peran</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Guru</option>
                </SelectField>
              )}
            </ListFilters>
          </DataCardToolbar>
          <DataCardContent>
            {rows.length ? (
              <MasterList
                avatars
                items={rows}
                label="Daftar guru"
                currentSort={filter.sort}
                sortableColumns={{ name: "name", email: "email" }}
                query={query}
                columns={[
                  ...(actor.role === "admin"
                    ? [
                        { key: "email", label: "Email akun", desktopOnly: true },
                        { key: "role", label: "Peran" },
                      ]
                    : []),
                  { key: "classes", label: "Kelas utama" },
                ]}
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="Tidak ada guru yang cocok"
                description="Periksa filter atau tambahkan profil guru."
                action={<Link href="/teachers">Reset filter</Link>}
              />
            )}
          </DataCardContent>
          <DataCardFooter>
            <DataTablePagination {...teachers} pathname="/teachers" query={query} />
          </DataCardFooter>
        </DataCard>
      )}
    </AppShell>
  );
}
