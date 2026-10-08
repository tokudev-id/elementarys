import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageActor } from "@/server/auth/page-actor";
import { auditActors, auditQuery, getAuditPage } from "@/server/queries/audit";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { PageHeader } from "@/components/page-header";
import {
  DataCard,
  DataCardHeader,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import { AuditClient } from "./audit-client";

export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePageActor();
  if (actor.role !== "admin") redirect("/attendance");

  const values = await searchParams;
  const query = new URLSearchParams(
    Object.entries(values).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  const result = await getAuditPage(auditQuery(new URL(`http://localhost/audit?${query}`)), actor);
  const actors = await auditActors(actor);
  const settings = await getSchoolSettings();

  const prevQuery = new URLSearchParams(query);
  prevQuery.delete("cursor");
  if (result.prevCursor) prevQuery.set("before", result.prevCursor);

  const nextQuery = new URLSearchParams(query);
  nextQuery.delete("before");
  if (result.nextCursor) nextQuery.set("cursor", result.nextCursor);

  const resetQuery = new URLSearchParams(query);
  resetQuery.delete("cursor");
  resetQuery.delete("before");

  return (
    <AppShell actor={actor} school={schoolIdentity(settings)} currentPath="/audit">
      <PageHeader
        title="Audit administratif"
        description="Perubahan dan ekspor yang tercatat. Waktu mengikuti zona waktu sekolah."
      />
      <DataCard id="daftar">
        <DataCardHeader title="Catatan audit" count={result.events.length} />
        <DataCardContent>
          <AuditClient
            events={result.events}
            timezone={result.timezone}
            actors={actors}
            values={values}
          />
        </DataCardContent>
        <DataCardFooter>
          <nav className="data-table-pagination" aria-label="Navigasi audit">
            <div className="data-table-pagination__info">
              {values.cursor || values.before ? (
                <Link
                  href={`/audit?${resetQuery}`}
                  className="data-table-pagination__reset"
                >
                  Kembali ke awal
                </Link>
              ) : (
                <span>Menampilkan {result.events.length} catatan</span>
              )}
            </div>
            <div className="data-table-pagination__nav">
              {result.prevCursor ? (
                <Link
                  href={`/audit?${prevQuery}`}
                  className="pagination-btn pagination-btn--prev"
                  aria-label="Halaman sebelumnya"
                >
                  ‹ Sebelumnya
                </Link>
              ) : (
                <span className="pagination-btn pagination-btn--disabled" aria-disabled="true">
                  ‹ Sebelumnya
                </span>
              )}
              {result.nextCursor ? (
                <Link
                  href={`/audit?${nextQuery}`}
                  className="pagination-btn pagination-btn--next"
                  aria-label="Halaman berikutnya"
                >
                  Berikutnya ›
                </Link>
              ) : (
                <span className="pagination-btn pagination-btn--disabled" aria-disabled="true">
                  Berikutnya ›
                </span>
              )}
            </div>
          </nav>
        </DataCardFooter>
      </DataCard>
    </AppShell>
  );
}
