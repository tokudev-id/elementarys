"use client";
import { useState } from "react";
import type { SchoolAccount } from "@/contracts/teachers";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { useMutation } from "@/components/use-mutation";
import { MutationFeedback } from "@/components/mutation-feedback";
import { AccountAccessForm, PasswordResetForm } from "./forms";

export function AccountPanel({
  account,
  expectedVersion,
}: {
  account: SchoolAccount;
  expectedVersion: number | null;
}) {
  const [accessOpen, setAccessOpen] = useState(false);
  const [reset, setReset] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation(`/api/users/${encodeURIComponent(account.id)}/access`, "PATCH");
  function openAccess() {
    setAccessOpen(true);
  }
  function closeAccess() {
    setAccessOpen(false);
  }
  function openReset() {
    setReset(true);
  }
  function closeReset() {
    setReset(false);
  }
  function openConfirm() {
    setConfirm(true);
  }
  function closeConfirm() {
    setConfirm(false);
  }
  async function toggleAccess() {
    if (
      await mutation.mutate({
        expectedVersion,
        expectedRole: account.role,
        expectedBanned: account.banned,
        role: account.role,
        banned: !account.banned,
      })
    )
      closeConfirm();
  }
  return (
    <section className="form-section">
      <h2>Akun & akses</h2>
      <dl className="record-summary">
        <div>
          <dt>Email akun</dt>
          <dd>{account.email}</dd>
        </div>
        <div>
          <dt>Peran</dt>
          <dd>{account.role === "admin" ? "Admin" : "Guru"}</dd>
        </div>
        <div>
          <dt>Status akses</dt>
          <dd>
            <StatusBadge tone={account.banned ? "danger" : "success"}>
              {account.banned ? "Nonaktif" : "Aktif"}
            </StatusBadge>
          </dd>
        </div>
        <div>
          <dt>Password</dt>
          <dd>{account.mustChangePassword ? "Wajib ganti password" : "Sudah diganti"}</dd>
        </div>
      </dl>
      <div className="button-row">
        <Button variant="secondary" onClick={openAccess}>
          Ubah akses
        </Button>
        <Button variant="secondary" onClick={openReset}>
          Reset password akun
        </Button>
        <Button variant={account.banned ? "secondary" : "destructive"} onClick={openConfirm}>
          {account.banned ? "Aktifkan akses" : "Nonaktifkan akses"}
        </Button>
      </div>
      <MutationFeedback mutation={mutation} />
      <Dialog open={accessOpen} onClose={closeAccess} title="Ubah akses akun" variant="sheet">
        <AccountAccessForm account={account} expectedVersion={expectedVersion} onSuccess={closeAccess} />
      </Dialog>
      <Dialog open={reset} onClose={closeReset} title="Reset password akun?" variant="sheet">
        <p>Sesi akun akan dicabut. Password sementara wajib diganti saat masuk.</p>
        <PasswordResetForm account={account} expectedVersion={expectedVersion} onSuccess={closeReset} />
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onClose={closeConfirm}
        title={account.banned ? "Aktifkan akses akun?" : "Nonaktifkan akses akun?"}
        onConfirm={toggleAccess}
        pending={mutation.pending}
        destructive={!account.banned}
        label={account.banned ? "Aktifkan akses" : "Nonaktifkan akses"}
      >
        <p>
          {account.banned
            ? "Akun dapat digunakan kembali bila profil guru aktif."
            : "Sesi akun akan berakhir. Catatan sebelumnya tetap tersedia."}
        </p>
      </ConfirmDialog>
    </section>
  );
}
