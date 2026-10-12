import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { AppProviders } from "@/components/app-providers";
import { AppShell } from "@/components/app-shell";
import { requireActor } from "@/server/auth/guards";
import { getSchoolSettings } from "@/server/services/settings";
import { schoolIdentity } from "@/components/school-identity";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
});

// absolute base for share-image urls; falls back to next's default when unset
function siteUrl() {
  const raw =
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  try {
    return raw ? new URL(raw) : undefined;
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: "Absensi Sekolah", template: "%s · Absensi Sekolah" },
  description: "Pencatatan kehadiran kelas dan rekap sekolah.",
  applicationName: "Absensi Sekolah",
  // every page sits behind a login; keep it out of search results (see robots.ts)
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Absensi Sekolah",
    title: "Absensi Sekolah",
    description: "Pencatatan kehadiran kelas dan rekap sekolah.",
  },
};

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
  themeColor: "#0d857b",
};

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
    <html lang="id" className={jakarta.variable}>
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
