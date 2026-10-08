"use client";
import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { StatusChoices, type AttendanceChoice } from "@/components/status-choices";
import { StateBanner, type BannerState } from "@/components/state-banner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
const exampleRows = [
  { id: "1", name: "Ahmad Fauzan", code: "S-0001" },
  { id: "2", name: "Aisyah Putri", code: "S-0002" },
];
const exampleColumns: ColumnDef<(typeof exampleRows)[number]>[] = [
  { accessorKey: "name", header: "Nama" },
  { accessorKey: "code", header: "Kode" },
];
export function ComponentPreview() {
  const [choice, setChoice] = useState<AttendanceChoice>();
  const [dialog, setDialog] = useState<"dialog" | "sheet" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
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
      />
      <section className="preview-section">
        <h2>Ringkasan dan tabel sintetis</h2>
        <div className="kpi-grid">
          <KpiCard
            label="Siswa contoh"
            value={exampleRows.length}
            context="Fixture komponen, bukan data sekolah"
          />
        </div>
        <div className="button-row">
          {["H", "S", "I", "A"].map((status) => (
            <StatusBadge key={status} tone={status as "H" | "S" | "I" | "A"}>
              {status}
            </StatusBadge>
          ))}
        </div>
        <DataTable items={exampleRows} columns={exampleColumns} label="Siswa sintetis" />
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
