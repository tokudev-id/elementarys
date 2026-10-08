import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageActor } from "@/server/auth/page-actor";
import { auditActors, auditQuery, getAuditPage } from "@/server/queries/audit";
import { auditEntities, type AuditEvent } from "@/contracts/audit";
import { getSchoolSettings } from "@/server/services/settings";
import { AppShell } from "@/components/app-shell";
import { schoolIdentity } from "@/components/school-identity";
import { StateBanner } from "@/components/state-banner";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/button";
import { formatSchoolTime } from "@/domain/format";
const labels: Record<(typeof auditEntities)[number], string> = {
  school_config: "Sekolah",
  academic_year: "Tahun/kalender",
  class: "Kelas",
  student: "Siswa/penempatan",
  teacher: "Guru",
  user: "Akun/akses",
  attendance_session: "Absensi",
  report_export: "Ekspor laporan",
};
function EventDetails({ event, timezone }: { event: AuditEvent; timezone: string }) {
  return (
    <li>
      <h2>{event.action}</h2>
      <p>
        {event.actor.name} ·{" "}
        <time dateTime={event.occurredAt}>{formatSchoolTime(event.occurredAt, timezone)}</time>
      </p>
      <p>
        {labels[event.entityType as keyof typeof labels] ?? event.entityType} · {event.entityId}
      </p>
      {event.reason && <p>Alasan: {event.reason}</p>}
      <details>
        <summary>Nilai sebelum dan sesudah</summary>
        <h3>Sebelum</h3>
        <pre className="audit-json">{JSON.stringify(event.before, null, 2)}</pre>
        <h3>Sesudah</h3>
        <pre className="audit-json">{JSON.stringify(event.after, null, 2)}</pre>
        {event.requestId && <p>ID pemeriksaan: {event.requestId}</p>}
      </details>
    </li>
  );
}
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
  const next = new URLSearchParams(query);
  if (result.nextCursor) next.set("cursor", result.nextCursor);
  return (
    <AppShell actor={actor} school={schoolIdentity(settings)} currentPath="/audit">
      <h1>Audit administratif</h1>
      <p>
        Perubahan dan ekspor yang tercatat. Waktu mengikuti zona sekolah; tanggal akhir filter ikut
        dihitung.
      </p>
      <form className="filter-form" action="/audit">
        <SelectField label="Jenis entitas" name="entityType" defaultValue={values.entityType ?? ""}>
          <option value="">Semua entitas</option>
          {auditEntities.map((entity) => (
            <option key={entity} value={entity}>
              {labels[entity]}
            </option>
          ))}
        </SelectField>
        <Field
          label="ID entitas (opsional)"
          name="entityId"
          defaultValue={values.entityId}
          maxLength={128}
        />
        <SelectField label="Pelaku perubahan" name="actorId" defaultValue={values.actorId ?? ""}>
          <option value="">Semua pelaku</option>
          {actors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <Field label="Dari tanggal" name="from" type="date" defaultValue={values.from} />
        <Field label="Sampai tanggal" name="to" type="date" defaultValue={values.to} />
        <SelectField label="Catatan per halaman" name="limit" defaultValue={values.limit ?? "20"}>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </SelectField>
        <Button type="submit">Tampilkan audit</Button>
      </form>
      {!result.events.length ? (
        <StateBanner state="empty">Tidak ada catatan yang cocok dengan filter ini.</StateBanner>
      ) : (
        <ul className="resource-list audit-list">
          {result.events.map((event) => (
            <EventDetails key={event.id} event={event} timezone={result.timezone} />
          ))}
        </ul>
      )}
      <nav className="attendance-links" aria-label="Halaman audit">
        {values.cursor && (
          <Link
            href={`/audit?${new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[0] !== "cursor"))}`}
          >
            Kembali ke halaman pertama
          </Link>
        )}
        {result.nextCursor && <Link href={`/audit?${next}`}>Catatan berikutnya</Link>}
      </nav>
    </AppShell>
  );
}
