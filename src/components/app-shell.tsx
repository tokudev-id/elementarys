import Link from "next/link";
import type { ReactNode } from "react";
import { Logout } from "@/app/login/form";
import { availableNavigation } from "./navigation";
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="page-container" tabIndex={-1}>
      {children}
    </main>
  );
}
export function AppShell({
  school,
  actor,
  currentPath = "/",
  children,
}: {
  school: { name: string; date: string; timezone: string } | null;
  actor: { name: string; role: "admin" | "teacher" };
  currentPath?: string;
  children: ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Langsung ke isi halaman
      </a>
      <header className="app-header">
        <div className="app-header__identity">
          <strong>{school?.name ?? "Identitas sekolah belum diatur"}</strong>
          {school && (
            <div>
              <time dateTime={school.date}>
                {new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "UTC" }).format(
                  new Date(`${school.date}T12:00:00Z`),
                )}
              </time>
              <small>Zona waktu sekolah: {school.timezone}</small>
            </div>
          )}
        </div>
        <div className="app-header__account">
          <span>
            {actor.name} · {actor.role === "admin" ? "Admin" : "Guru"}
          </span>
          <Logout />
        </div>
      </header>
      <nav className="app-nav" aria-label="Navigasi sekolah">
        {availableNavigation(actor.role).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={currentPath === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <PageContainer>{children}</PageContainer>
    </>
  );
}
