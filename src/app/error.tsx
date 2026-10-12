"use client";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/button";
import { StatusPage } from "@/components/status-page";

export default function PageError({ reset }: { reset: () => void }) {
  return (
    <StatusPage
      icon={TriangleAlert}
      tone="error"
      title="Halaman belum dapat dimuat"
      description={
        <p role="alert">
          Periksa koneksi dan coba kembali. Jika tetap gagal, hubungi admin untuk memeriksa halaman
          yang dibuka.
        </p>
      }
      actions={
        <>
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Muat ulang halaman
          </Button>
          <ButtonLink href="/attendance">Kembali ke hari ini</ButtonLink>
        </>
      }
    />
  );
}
