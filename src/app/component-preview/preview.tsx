"use client";
import { useState, type ChangeEvent } from "react";
import { ClipboardCheck, Plus, Star, TriangleAlert, Users } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button, IconButton } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { SelectField } from "@/components/select-field";
import { StatusChoices, type AttendanceChoice } from "@/components/status-choices";
import { StateBanner, type BannerState } from "@/components/state-banner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ListFilters } from "@/components/list-filters";
import {
  DataCard,
  DataCardHeader,
  DataCardToolbar,
  DataCardContent,
  DataCardFooter,
} from "@/components/data-card";
import type { ColumnDef } from "@tanstack/react-table";

const exampleRows = [
  { id: "1", name: "Ahmad Fauzan", code: "S-0001", status: "Aktif" },
  { id: "2", name: "Aisyah Putri", code: "S-0002", status: "Aktif" },
  { id: "3", name: "Budi Santoso", code: "S-0003", status: "Nonaktif" },
];
const exampleColumns: ColumnDef<(typeof exampleRows)[number]>[] = [
  { accessorKey: "name", header: "Nama" },
  { accessorKey: "code", header: "Kode" },
  {
    accessorKey: "status",
    header: "Status",
    cell: (ctx) => (
      <StatusBadge tone={ctx.getValue() === "Aktif" ? "success" : "neutral"}>
        {ctx.getValue() as string}
      </StatusBadge>
    ),
  },
];

export function ComponentPreview() {
  const [choice, setChoice] = useState<AttendanceChoice>();
  const [dialog, setDialog] = useState<"dialog" | "sheet" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const page = 1;
  const pageSize = 10;
  const [filterClass, setFilterClass] = useState("");

  function openDialog() {
    setDialog("dialog");
  }
  function openSheet() {
    setDialog("sheet");
  }
  function closeDialog() {
    setDialog(null);
  }
  function changeName(event: ChangeEvent<HTMLInputElement>) {
    setName(event.currentTarget.value);
    setError("");
  }
  function changeFilterClass(event: ChangeEvent<HTMLSelectElement>) {
    setFilterClass(event.currentTarget.value);
  }
  function confirm() {
    if (!name.trim()) {
      setError("Isi nama sebelum mengonfirmasi.");
      document.getElementById("preview-name")?.focus();
      return;
    }
    setSaved(true);
    setDialog(null);
  }

  return (
    <>
      <PageHeader
        title="Contoh komponen"
        description="Data sintetis. Isian hanya tersimpan selama halaman ini terbuka."
        primaryAction={<Button onClick={openDialog}>Aksi utama</Button>}
        secondaryActions={[
          { label: "Buka sheet filter", href: "#" },
          { label: "Aksi sekunder", href: "#" },
        ]}
      />

      <section className="preview-section">
        <h2>Tombol dan avatar</h2>
        <div className="button-row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <IconButton label="Tambah contoh" variant="secondary">
            <Plus aria-hidden="true" />
          </IconButton>
        </div>
        <div className="button-row">
          {[
            "Ahmad Fauzan",
            "Siti Nurhaliza",
            "Budi Santoso",
            "Dewi Lestari",
            "Rina Wati",
            "Joko",
          ].map((name) => (
            <Avatar key={name} name={name} />
          ))}
        </div>
      </section>

      <section className="preview-section">
        <h2>DataCard dan tabel paginasi</h2>
        <DataCard id="daftar">
          <DataCardHeader title="Contoh DataCard" count={exampleRows.length} />
          <DataCardToolbar>
            <ListFilters
              q=""
              query={{}}
              searchLabel="Cari contoh"
              activeFilterCount={filterClass ? 1 : 0}
            >
              <SelectField
                label="Filter kelas"
                name="classId"
                value={filterClass}
                onChange={changeFilterClass}
              >
                <option value="">Semua kelas</option>
                <option value="1">Kelas 1 A</option>
                <option value="2">Kelas 2 A</option>
              </SelectField>
            </ListFilters>
          </DataCardToolbar>
          <DataCardContent>
            <DataTable items={exampleRows} columns={exampleColumns} label="Siswa sintetis" />
          </DataCardContent>
          <DataCardFooter>
            <DataTablePagination
              total={42}
              page={page}
              pageSize={pageSize}
              pathname="/component-preview"
            />
          </DataCardFooter>
        </DataCard>
      </section>

      <section className="preview-section">
        <h2>Ringkasan dan KPI</h2>
        <div className="dashboard-kpi-grid">
          <KpiCard
            label="Siswa contoh"
            icon={Users}
            value={exampleRows.length}
            context="Fixture komponen, bukan data sekolah"
          />
          <KpiCard
            label="Progres"
            icon={ClipboardCheck}
            accent="sky"
            value="3 / 4"
            progress={0.75}
          />
          <KpiCard label="Sorotan" icon={Star} accent="amber" value={12} />
          <KpiCard label="Perlu tindakan" icon={TriangleAlert} accent="rose" value={2} />
        </div>
        <div className="button-row">
          {["H", "S", "I", "A"].map((status) => (
            <StatusBadge key={status} tone={status as "H" | "S" | "I" | "A"}>
              {status}
            </StatusBadge>
          ))}
        </div>
        <EmptyState
          title="Belum ada catatan contoh"
          description="Isi form di bawah untuk memeriksa konfirmasi."
        />
      </section>

      <section className="preview-section">
        <h2>Pilihan kehadiran</h2>
        <StatusChoices
          name="preview-status"
          legend="Status contoh"
          value={choice}
          onChange={setChoice}
        />
        <p>Pilihan: {choice ?? "belum dipilih"}</p>
      </section>

      <section className="preview-section">
        <h2>Form dan konfirmasi</h2>
        <div className="button-row">
          <Button onClick={openDialog}>Buka dialog</Button>
          <Button variant="secondary" onClick={openSheet}>
            Buka bottom sheet
          </Button>
          <Button disabled>Tombol nonaktif</Button>
          <Button pending>Sedang menyimpan…</Button>
        </div>
        {saved && <StateBanner state="saved">Isian contoh dikonfirmasi.</StateBanner>}
      </section>

      <section className="preview-section">
        <h2>Status halaman</h2>
        {(
          ["loading", "empty", "error", "conflict", "session-expired", "saved"] as BannerState[]
        ).map((state) => (
          <StateBanner key={state} state={state}>
            Contoh pesan status pengembangan.
          </StateBanner>
        ))}
      </section>

      <Dialog
        open={dialog !== null}
        variant={dialog ?? "dialog"}
        onClose={closeDialog}
        title="Konfirmasi isian contoh"
        actions={<Button onClick={confirm}>Konfirmasi</Button>}
      >
        <p>Gunakan isian ini untuk memeriksa fokus, validasi, dan keyboard.</p>
        <Field
          id="preview-name"
          label="Nama contoh"
          value={name}
          onChange={changeName}
          error={error}
          hint="Isian pengembangan; tidak dikirim ke server."
        />
        {Array.from({ length: 8 }, (_, index) => (
          <p key={index}>
            Bagian contoh {index + 1}: isi dialog dapat digulir saat tinggi layar berkurang.
          </p>
        ))}
        <Field label="Catatan contoh" />
      </Dialog>
    </>
  );
}
