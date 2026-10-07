"use client";
import { useState, type FormEvent } from "react";
import type { AttendanceView } from "@/contracts/attendance-view";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { Dialog } from "@/components/dialog";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";

export function VoidAttendanceForm({ view }: { view: AttendanceView }) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation(
    `/api/classes/${view.classId}/attendance/${view.date}/void`,
    "POST",
    closeConfirmation,
  );
  function closeConfirmation() {
    setConfirm(false);
  }
  function openConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setReason(String(data.get("reason")).trim());
    setConfirm(true);
  }
  async function confirmVoid() {
    await mutation.mutate({ expectedVersion: view.sessionVersion, reason });
    closeConfirmation();
  }
  return (
    <section className="resource-section" aria-labelledby="void-heading">
      <h2 id="void-heading">Batalkan satu sesi</h2>
      <p>
        Seluruh status kelas pada tanggal ini akan dikosongkan. Isi sebelumnya tetap tercatat di
        riwayat.
      </p>
      <form className="form-stack" onSubmit={openConfirmation}>
        <Field
          label="Alasan pembatalan"
          name="reason"
          required
          pattern=".*\S.*"
          maxLength={1000}
          disabled={mutation.pending}
          error={mutation.errors.reason?.[0]}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={
            mutation.pending ||
            mutation.notice?.state === "conflict" ||
            mutation.notice?.state === "session-expired"
          }
        >
          Batalkan sesi
        </Button>
      </form>
      <MutationFeedback mutation={mutation} />
      <Dialog
        open={confirm}
        title="Konfirmasi pembatalan sesi"
        onClose={closeConfirmation}
        closeDisabled={mutation.pending}
        actions={
          <>
            <Button variant="secondary" disabled={mutation.pending} onClick={closeConfirmation}>
              Batal
            </Button>
            <Button pending={mutation.pending} onClick={confirmVoid}>
              Konfirmasi pembatalan
            </Button>
          </>
        }
      >
        <p>
          {view.className} · {view.date}
        </p>
        <p>Alasan: {reason}</p>
        <p>Setelah pembatalan, tanggal ini ditampilkan sebagai belum dicatat pada rekap.</p>
      </Dialog>
    </section>
  );
}
