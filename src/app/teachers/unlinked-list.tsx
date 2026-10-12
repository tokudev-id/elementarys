"use client";
import { UserCog } from "lucide-react";

import { useState, type MouseEvent } from "react";
import type { SchoolAccount } from "@/contracts/teachers";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
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

  if (!accounts.length) {
    return (
      <EmptyState
        icon={UserCog}
        title="Tidak ada akun tanpa profil"
        description="Semua akun sekolah sudah tertaut ke profil guru atau belum ada akun terdaftar."
      />
    );
  }

  return (
    <>
      <div className="master-desktop">
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Nama akun</th>
                <th scope="col">Email</th>
                <th scope="col">Peran</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.name}</strong>
                  </td>
                  <td>{account.email}</td>
                  <td>{account.role === "admin" ? "Admin" : "Guru"}</td>
                  <td>
                    <StatusBadge tone={account.banned ? "danger" : "info"}>
                      {account.banned ? "Akses nonaktif" : "Belum tertaut profil"}
                    </StatusBadge>
                  </td>
                  <td>
                    <Button variant="secondary" data-id={account.id} onClick={open}>
                      Kelola akun
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="master-mobile">
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
      </div>

      <Dialog open={Boolean(selected)} onClose={close} title="Kelola akun tanpa profil">
        {selected && <AccountPanel account={selected} expectedVersion={null} />}
      </Dialog>
    </>
  );
}
