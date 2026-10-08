# Pelaksanaan redesign

Acuan: [brief](../REDESIGN_BRIEF.md) dan [DESIGN.md](../../DESIGN.md). Data screenshot dan pengujian sintetis. Arah panel operasi sekolah, ENERGY 1 / RHYTHM 1 / MOTION 1.

| Fase | Status | Bukti |
|---|---|---|
| UI-R0 | done | 58baf15 + 5b15661, main11f3f5b; domain18/integration105/e2e51, build dan kontras19 pasangan lulus |
| UI-R1 | in_progress | Absensi compact, roster internal dan lima ketukan; perangkat nyata H-03 tetap pending |
| UI-R2 | not_started | Pagination dan halaman master |
| UI-R3 | not_started | Beranda dan rekap |
| UI-R4 | not_started | Kalender/audit/auth/settings dan penerimaan akhir |

## Fondasi UI-R0

- shadcn/Radix dengan Tailwind v4, Inter self-host melalui next/font, lucide untuk ikon menu/tugas, Sonner untuk sukses, TanStack v8 untuk manual pagination/sorting. v8.21.3 memakai API useReactTable yang sesuai kebutuhan; v9 sudah memiliki API berbeda. DataTable secara eksplisit tidak memakai React Compiler untuk API tabel mutable, dengan pengecualian lint hanya pada berkas tersebut.
- Sidebar desktop 248px yang bisa diciutkan, rail tablet72px yang membuka menu, dan bottom navigation HP dengan Lainnya. Menu user memuat nama/peran/Ganti password/Keluar; Data uji dipisahkan dari nama sekolah. Tujuan Beranda tetap memakai redirect lama sampai UI-R3 mengisi dashboard.
- Dialog Radix mempertahankan focus trap/restore, Escape, scroll body, header/footer yang terjangkau serta keyboard360×340. Utility translate bawaan dinetralkan agar tidak menggandakan transform CSS. ResizeObserver membaca ukuran setelah layout berubah sehingga isian fokus tetap terlihat. Screenshot dan tes mengukur bounds dialog serta seluruh isian terakhir.
- [38 screenshot sebelum](before) mencakup19halaman ×360/1440. [Kontras](CONTRAST.md) dihitung dari token CSS; teks/control dipisahkan dari border/aksen dekoratif. Turunan gelap dipakai untuk Hadir/Sakit terpilih dan Libur agar memenuhi AA. Semua19 pasangan yang digunakan lulus.
- Label/testid lama dipertahankan untuk halaman yang belum dimigrasi. Spec shell/auth memakai alur menu baru; helper membaca menu berstatus open, karena menu modal menyembunyikan trigger dari accessibility tree. Snapshot aturan/protokol/audit tetap lulus105 integration.

- Hard Gate PASS: 51e2e, overflow/touch, permission matrix dan keyboard/bounds lulus.
- Purpose Gate PASS: keputusan komponen/font/warna/ikon sesuai brief.
- Liveliness PASS: dials1/1/1, data sekolah sebagai fokus.
- Craftsmanship PASS: build,19 kontras dan regression main lulus, bukti sintetis diberi label.

## Klarifikasi dan batas bukti

Toku mengonfirmasi batas dua layar berlaku pada scroll halaman; roster boleh bergulir di area sendiri. Langkah/tap automation akan diukur pada UI-R1. Uji guru di HP nyata, printer/Excel sekolah, provider, pilot dan handover tetap checkpoint manusia. Lighthouse dan screenshot setelah seluruh fase belum dijalankan pada UI-R0.
