import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { AppProviders } from "@/components/app-providers";
import { AppShell } from "@/components/app-shell";
import { requireActor } from "@/server/auth/guards";
import { getSchoolSettings } from "@/server/services/settings";
import { schoolIdentity } from "@/components/school-identity";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Absensi Sekolah",
  description: "Pencatatan kehadiran kelas dan rekap sekolah.",
};

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let actor = null;
  let settings = null;
  try {
    const head = await headers();
    actor = await requireActor(head);
    settings = await getSchoolSettings();
  } catch {
    // Unauthenticated or password change required
  }

  return (
    <html lang="id" className={inter.variable}>
      <body>
        <AppProviders>
          {actor && settings ? (
            <AppShell actor={actor} school={schoolIdentity(settings)}>
              {children}
            </AppShell>
          ) : (
            children
          )}
        </AppProviders>
      </body>
    </html>
  );
}
