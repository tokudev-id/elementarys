"use client";
import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { StatusChoices, type AttendanceChoice } from "@/components/status-choices";
import { StateBanner, type BannerState } from "@/components/state-banner";
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
      <h1>Contoh komponen</h1>
      <p>Halaman pengembangan. Isian hanya tersimpan selama halaman ini terbuka.</p>
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
