import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requireActor } from "@/server/auth/guards";
import { AccountForm, Logout } from "../login/form";

export const metadata: Metadata = {
  title: "Ganti password",
  description: "Ganti password akun sekolah.",
};

export default async function ChangePassword() {
  try {
    await requireActor(await headers(), { allowPasswordChange: true });
  } catch {
    redirect("/login");
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <div className="auth-card__icon-wrap">
            <KeyRound className="auth-card__icon" size={28} aria-hidden="true" />
          </div>
          <span className="auth-card__brand-name">Absensi Sekolah</span>
        </div>
        <div className="auth-card__header">
          <h1 className="auth-card__title">Ganti password</h1>
          <p className="auth-card__subtitle">
            Ganti password sementara sebelum membuka data sekolah.
          </p>
        </div>
        <AccountForm change />
        <div className="auth-card__footer">
          <Logout />
        </div>
      </div>
    </main>
  );
}
