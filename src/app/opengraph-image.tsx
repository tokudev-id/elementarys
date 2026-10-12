import { ImageResponse } from "next/og";
import { AppGlyph, imageColors } from "@/components/app-glyph";

export const alt = "Absensi Sekolah: pencatatan kehadiran kelas dan rekap sekolah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: imageColors.primaryStrong,
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 112,
          height: 112,
          borderRadius: 28,
          background: imageColors.primary,
        }}
      >
        <AppGlyph size={68} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>Absensi Sekolah</div>
        <div style={{ fontSize: 36, color: imageColors.tint }}>
          Pencatatan kehadiran kelas dan rekap sekolah.
        </div>
      </div>
      <div style={{ display: "flex", width: 160, height: 8, background: imageColors.amber }} />
    </div>,
    size,
  );
}
