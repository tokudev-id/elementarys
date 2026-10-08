"use client";
import Link from "next/link";
import { PageContainer } from "@/components/app-shell";
import { StateBanner } from "@/components/state-banner";
import { Button } from "@/components/button";
export default function PageError({ reset }: { reset: () => void }) {
  return (
    <PageContainer>
      <h1>Halaman belum dapat dimuat</h1>
      <StateBanner state="error" action={<Button onClick={reset}>Muat ulang halaman</Button>}>
        Periksa koneksi dan coba kembali. Jika tetap gagal, hubungi admin untuk memeriksa halaman
        yang dibuka.
      </StateBanner>
      <Link href="/attendance">Kembali ke hari ini</Link>
    </PageContainer>
  );
}
