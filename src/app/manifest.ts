import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Absensi Sekolah",
    short_name: "Absensi",
    description: "Pencatatan kehadiran kelas dan rekap sekolah.",
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: "#f5faf9",
    theme_color: "#0d857b",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
