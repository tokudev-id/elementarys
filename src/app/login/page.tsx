import type { Metadata } from "next";
import { School } from "lucide-react";
import { AccountForm } from "./form";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke Absensi Sekolah dengan akun dari admin sekolah.",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <div className="auth-card__icon-wrap">
            <School className="auth-card__icon" size={28} aria-hidden="true" />
          </div>
          <span className="auth-card__brand-name">Absensi Sekolah</span>
        </div>
        <div className="auth-card__header">
          <h1 className="auth-card__title">Masuk ke Absensi Sekolah</h1>
          <p className="auth-card__subtitle">Gunakan akun yang diberikan admin sekolah.</p>
        </div>
        <AccountForm />
      </div>
    </main>
  );
}
