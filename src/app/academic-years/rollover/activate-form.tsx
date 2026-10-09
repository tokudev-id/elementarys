"use client";
import { useState } from "react";
import type { YearPreparation } from "@/server/queries/year-preparation";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
export function ActivateYearForm({ preparation }: { preparation: YearPreparation }) {
  const [confirm, setConfirm] = useState(false);
  const [isCurrent, setIsCurrent] = useState(preparation.year.isCurrent);
  const mutation = useMutation(
    `/api/academic-years/${preparation.year.id}`,
    "PATCH",
    closeConfirmation,
  );
  function openConfirmation() {
    setConfirm(true);
  }
  function closeConfirmation() {
    setConfirm(false);
  }
  async function activate() {
    const res = await mutation.mutate({
      expectedVersion: preparation.year.version,
      isCurrent: true,
      expectedCurrentYearId: preparation.currentYear?.id ?? null,
    });
    if (res) {
      setIsCurrent(true);
    }
    closeConfirmation();
  }
  return (
    <div className="activate-year-box">
      <p>
        Tahun aktif saat ini: <strong>{preparation.currentYear?.label ?? "Belum dipilih"}</strong>.
      </p>
      {isCurrent || preparation.year.isCurrent ? (
        <p className="font-semibold text-emerald-600">Tahun ini sudah aktif.</p>
      ) : (
        <Button
          type="button"
          disabled={!preparation.ready || mutation.pending || mutation.notice?.state === "conflict"}
          onClick={openConfirmation}
        >
          Aktifkan tahun ini
        </Button>
      )}
      <MutationFeedback mutation={mutation} />
      <Dialog
        open={confirm}
        title="Konfirmasi tahun aktif"
        onClose={closeConfirmation}
        closeDisabled={mutation.pending}
        actions={
          <>
            <Button variant="secondary" disabled={mutation.pending} onClick={closeConfirmation}>
              Batal
            </Button>
            <Button pending={mutation.pending} onClick={activate}>
              Konfirmasi pindah tahun
            </Button>
          </>
        }
      >
        <p>
          {preparation.currentYear?.label ?? "Belum ada tahun aktif"} menjadi{" "}
          {preparation.year.label}.
        </p>
        <p>Guru akan mencatat tahun yang dipilih. Riwayat dan ekspor tahun lama tetap tersedia.</p>
        {(preparation.schoolToday < preparation.year.startsOn ||
          preparation.schoolToday >= preparation.year.endsOnExclusive) && (
          <p>
            Tanggal sekolah {preparation.schoolToday} berada di luar rentang tahun ini. Periksa
            tanggal periode sebelum memindahkan tahun aktif.
          </p>
        )}
      </Dialog>
    </div>
  );
}
