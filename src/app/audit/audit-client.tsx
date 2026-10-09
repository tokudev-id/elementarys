"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
import type { AuditEvent } from "@/contracts/audit";
import { auditEntities } from "@/contracts/audit";
import { formatSchoolTime } from "@/domain/format";
import { Button } from "@/components/button";
import { SelectField } from "@/components/select-field";
import { Field } from "@/components/field";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/empty-state";

export const auditActionLabels: Record<string, string> = {
  "user.bootstrap": "Inisialisasi akun",
  "user.password-change": "Ganti password",
  "user.access": "Ubah akses akun",
  "user.password-reset": "Reset password",
  "attendance.submit": "Pencatatan absensi",
  "attendance.save": "Pencatatan absensi",
  "attendance.create": "Pencatatan absensi",
  "attendance.update": "Koreksi absensi",
  "attendance.correct": "Koreksi absensi",
  "attendance.void": "Pembatalan absensi",
  "enrollment.place": "Penempatan siswa",
  "enrollment.transfer": "Pindah kelas",
  "enrollment.end": "Tutup penempatan",
  "enrollment.archive": "Arsip penempatan",
  "enrollment.batch": "Naik kelas massal",
  "academic-year.create": "Tambah tahun ajaran",
  "academic-year.update": "Ubah tahun ajaran",
  "academic-year.current": "Ubah tahun aktif",
  "class.create": "Tambah kelas",
  "class.update": "Ubah kelas",
  "calendar.update": "Ubah kalender",
  "settings.update": "Ubah pengaturan",
  "school_config.update": "Ubah pengaturan",
  "student.create": "Tambah siswa",
  "student.update": "Ubah siswa",
  "teacher.create": "Tambah guru",
  "teacher.update": "Ubah guru",
  "teacher.account-link": "Tautkan akun guru",
  "teacher.classes": "Ubah kelas guru",
  "report.export.xlsx": "Ekspor Excel",
  "report.export.pdf": "Ekspor PDF",
  "report.export.csv": "Ekspor CSV",
};

export const auditEntityLabels: Record<string, string> = {
  school_config: "Sekolah",
  academic_year: "Tahun/kalender",
  class: "Kelas",
  student: "Siswa/penempatan",
  teacher: "Guru",
  user: "Akun/akses",
  attendance_session: "Absensi",
  report_export: "Ekspor laporan",
};

function formatVal(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Ya" : "Tidak";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function DiffView({ before, after }: { before: unknown; after: unknown }) {
  if (before === null && after === null) {
    return <p className="text-muted-foreground text-sm">Tidak ada perubahan data.</p>;
  }
  if (before === null && after !== null && typeof after === "object") {
    return (
      <div className="diff-section">
        <p className="diff-badge diff-badge--added">Data baru dibuat</p>
        <table className="diff-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(after as Record<string, unknown>).map(([k, v]) => (
              <tr key={k}>
                <td className="diff-key">{k}</td>
                <td className="diff-val diff-val--added">{formatVal(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (after === null && before !== null && typeof before === "object") {
    return (
      <div className="diff-section">
        <p className="diff-badge diff-badge--removed">Data dihapus</p>
        <table className="diff-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Nilai sebelumnya</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(before as Record<string, unknown>).map(([k, v]) => (
              <tr key={k}>
                <td className="diff-key">{k}</td>
                <td className="diff-val diff-val--removed">{formatVal(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (typeof before === "object" && typeof after === "object" && before && after) {
    const bObj = before as Record<string, unknown>;
    const aObj = after as Record<string, unknown>;
    const allKeys = Array.from(new Set([...Object.keys(bObj), ...Object.keys(aObj)]));
    const changed = allKeys.filter(
      (k) => JSON.stringify(bObj[k]) !== JSON.stringify(aObj[k]),
    );
    if (changed.length === 0) {
      return <p className="text-muted-foreground text-sm">Tidak ada perbedaan field.</p>;
    }
    return (
      <div className="diff-section">
        <table className="diff-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Sebelum</th>
              <th scope="col">Sesudah</th>
            </tr>
          </thead>
          <tbody>
            {changed.map((k) => (
              <tr key={k}>
                <td className="diff-key">{k}</td>
                <td className="diff-val diff-val--removed">{formatVal(bObj[k])}</td>
                <td className="diff-val diff-val--added">{formatVal(aObj[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="diff-section">
      <p>Sebelum: {formatVal(before)}</p>
      <p>Sesudah: {formatVal(after)}</p>
    </div>
  );
}

function AuditRowItem({
  event,
  timezone,
  onSelect,
}: {
  event: AuditEvent;
  timezone: string;
  onSelect: (e: AuditEvent) => void;
}) {
  function handleClick() {
    onSelect(event);
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(event);
    }
  }
  const actionLabel = auditActionLabels[event.action] ?? event.action;
  const entityLabel = auditEntityLabels[event.entityType] ?? event.entityType;

  return (
    <tr
      className="audit-row"
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`Rincian audit ${actionLabel}`}
      onKeyDown={handleKeyDown}
    >
      <td className="audit-col--time">
        <time dateTime={event.occurredAt}>
          {formatSchoolTime(event.occurredAt, timezone)}
        </time>
      </td>
      <td className="audit-col--actor">{event.actor.name}</td>
      <td className="audit-col--action">
        <span className="audit-action-chip">{actionLabel}</span>
      </td>
      <td className="audit-col--entity">
        <span>{entityLabel}</span>
        <span className="audit-entity-id" title={event.entityId}>
          {event.entityId.length > 8 ? `${event.entityId.slice(0, 8)}…` : event.entityId}
        </span>
      </td>
      <td className="audit-col--reason">{event.reason || "—"}</td>
    </tr>
  );
}

export function AuditClient({
  events,
  timezone,
  actors,
  values,
}: {
  events: AuditEvent[];
  timezone: string;
  actors: { id: string; name: string }[];
  values: Record<string, string | undefined>;
}) {
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function openEvent(event: AuditEvent) {
    setSelected(event);
  }

  function closeEvent() {
    setSelected(null);
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) closeEvent();
  }

  function openMobileFilter() {
    setMobileFilterOpen(true);
  }

  function closeMobileFilter() {
    setMobileFilterOpen(false);
  }

  const activeFilterCount =
    (values.entityType ? 1 : 0) +
    (values.actorId ? 1 : 0) +
    (values.from ? 1 : 0) +
    (values.to ? 1 : 0);

  function renderFilterFields(disabled = false) {
    return (
      <>
        <SelectField
          label="Jenis entitas"
          name="entityType"
          defaultValue={values.entityType ?? ""}
          disabled={disabled}
        >
          <option value="">Semua entitas</option>
          {auditEntities.map((entity) => (
            <option key={entity} value={entity}>
              {auditEntityLabels[entity] ?? entity}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Pelaku perubahan"
          name="actorId"
          defaultValue={values.actorId ?? ""}
          disabled={disabled}
        >
          <option value="">Semua pelaku</option>
          {actors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Dari tanggal"
          name="from"
          type="date"
          defaultValue={values.from}
          disabled={disabled}
        />
        <Field
          label="Sampai tanggal"
          name="to"
          type="date"
          defaultValue={values.to}
          disabled={disabled}
        />
        <SelectField
          label="Per halaman"
          name="limit"
          defaultValue={values.limit ?? "20"}
          disabled={disabled}
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </SelectField>
      </>
    );
  }

  return (
    <>
      <div className="audit-toolbar-wrapper">
        <form className="audit-desktop-filters" action="/audit">
          {renderFilterFields(isMobile)}
          <Button type="submit" variant="secondary" disabled={isMobile}>
            Terapkan filter
          </Button>
          {activeFilterCount > 0 && (
            <Link href="/audit" className="button button--ghost">
              Reset filter
            </Link>
          )}
        </form>
        <div className="audit-mobile-filters-trigger">
          <Button type="button" variant="secondary" onClick={openMobileFilter}>
            <Filter size={16} aria-hidden="true" />
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
      </div>

      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="mobile-filter-sheet">
          <SheetHeader>
            <SheetTitle>Filter audit</SheetTitle>
            <SheetDescription>Saring catatan perubahan sekolah</SheetDescription>
          </SheetHeader>
          <form className="mobile-filter-form" action="/audit" onSubmit={closeMobileFilter}>
            {renderFilterFields(false)}
            <div className="mobile-filter-actions">
              <Button type="submit">Terapkan filter</Button>
              {activeFilterCount > 0 && (
                <Link href="/audit" className="button button--secondary" onClick={closeMobileFilter}>
                  Reset filter
                </Link>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {!events.length ? (
        <EmptyState
          title="Tidak ada catatan audit"
          description="Tidak ada aktivitas yang cocok dengan kriteria filter saat ini."
          action={<Link href="/audit">Reset filter</Link>}
        />
      ) : (
        <div className="data-table">
          <table className="audit-table">
            <thead>
              <tr>
                <th scope="col">Waktu</th>
                <th scope="col">Pelaku</th>
                <th scope="col">Aksi</th>
                <th scope="col">Entitas</th>
                <th scope="col">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <AuditRowItem
                  key={event.id}
                  event={event}
                  timezone={timezone}
                  onSelect={openEvent}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="audit-diff-sheet">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {auditActionLabels[selected.action] ?? selected.action}
                </SheetTitle>
                <SheetDescription>
                  {formatSchoolTime(selected.occurredAt, timezone)} · {selected.actor.name}
                </SheetDescription>
              </SheetHeader>
              <div className="audit-diff-body">
                <div className="audit-meta-card">
                  <dl className="audit-meta-list">
                    <div>
                      <dt>Entitas</dt>
                      <dd>
                        {auditEntityLabels[selected.entityType] ?? selected.entityType} (
                        <code title={selected.entityId}>{selected.entityId}</code>)
                      </dd>
                    </div>
                    {selected.reason && (
                      <div>
                        <dt>Alasan</dt>
                        <dd>{selected.reason}</dd>
                      </div>
                    )}
                    {selected.requestId && (
                      <div>
                        <dt>ID pemeriksaan</dt>
                        <dd>
                          <code>{selected.requestId}</code>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <h3>Perubahan data</h3>
                <DiffView before={selected.before} after={selected.after} />

                <details className="audit-raw-details">
                  <summary>Lihat data mentah</summary>
                  <div className="audit-raw-json">
                    <h4>Nilai sebelum</h4>
                    <pre>{JSON.stringify(selected.before, null, 2)}</pre>
                    <h4>Nilai sesudah</h4>
                    <pre>{JSON.stringify(selected.after, null, 2)}</pre>
                  </div>
                </details>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
