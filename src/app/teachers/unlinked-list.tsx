"use client";
import { useState, type MouseEvent } from "react";
import type { SchoolAccount } from "@/contracts/teachers";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { StatusBadge } from "@/components/status-badge";
import { AccountPanel } from "./account-panel";

export function UnlinkedAccountList({ accounts }: { accounts: SchoolAccount[] }) {
  const [id, setId] = useState<string | null>(null);
  function open(event: MouseEvent<HTMLButtonElement>) {
    setId(event.currentTarget.dataset.id ?? null);
  }
  function close() {
    setId(null);
  }
  const selected = accounts.find((account) => account.id === id);
  return (
    <>
      <ul className="mobile-card-list">
        {accounts.map((account) => (
          <li key={account.id}>
            <div className="master-mobile-card">
              <div>
                <strong>{account.name}</strong>
                <p>{account.email}</p>
                <StatusBadge tone={account.banned ? "danger" : "info"}>
                  {account.banned ? "Akses nonaktif" : "Belum tertaut profil"}
                </StatusBadge>
              </div>
              <Button variant="secondary" data-id={account.id} onClick={open}>
                Kelola akun
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!accounts.length && <p>Tidak ada akun tanpa profil.</p>}
      <Dialog open={Boolean(selected)} onClose={close} title="Kelola akun tanpa profil">
        {selected && <AccountPanel account={selected} expectedVersion={null} />}
      </Dialog>
    </>
  );
}
