import type { Metadata } from "next";
import { ClipboardCheck, House, MapPinOff } from "lucide-react";
import { ButtonLink } from "@/components/button";
import { StatusPage } from "@/components/status-page";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  description: "Alamat yang dibuka tidak tersedia di Absensi Sekolah.",
};

export default function NotFound() {
  return (
    <StatusPage
      icon={MapPinOff}
      code="404"
      title="Halaman tidak ditemukan"
      description={
        <p>
          Alamatnya mungkin salah ketik, atau datanya sudah dipindahkan. Periksa kembali tautan,
          atau lanjutkan dari halaman utama.
        </p>
      }
      actions={
        <>
          <ButtonLink variant="primary" href="/">
            <House aria-hidden="true" />
            Kembali ke beranda
          </ButtonLink>
          <ButtonLink href="/attendance">
            <ClipboardCheck aria-hidden="true" />
            Buka absensi
          </ButtonLink>
        </>
      }
    />
  );
}
