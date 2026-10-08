# Pelaksanaan redesign

Acuan: [brief](../REDESIGN_BRIEF.md) dan [DESIGN.md](../../DESIGN.md). Data screenshot dan pengujian sintetis. Arah panel operasi sekolah, ENERGY 1 / RHYTHM 1 / MOTION 1.

| Fase | Status | Bukti |
|---|---|---|
| UI-R0 | done | 58baf15 + 5b15661, main11f3f5b; domain18/integration105/e2e51, build dan kontras19 pasangan lulus |
| UI-R1 | teknis done, needs_human | c947c06/a38906d, mainbe8fb09; domain18/integration105/e2e52; lima ketukan, H-03 pending |
| UI-R2 | done | b26c76f; dilanjutkan oleh UI-F1–F4; baseline600siswa128.07ms |
| UI-F1 | in_progress | Shell sticky, DataCard, kit tabel & pagination |
| UI-F2 | not_started | Fondasi validasi form (useZodForm, error inline, zod contracts) |
| UI-F3 | not_started | Daftar dan pagination halaman tersisa |
| UI-F4 | not_started | Form inline → dialog/page dan perbaikan absensi |
| UI-R3 | not_started | Beranda dan rekap |
| UI-R4 | not_started | Polish redesign, audit CSS, penerimaan akhir |

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

## Absensi UI-R1

- Card kelas, progress, tanggal bertahap/kalender libur, default H yang belum tersimpan, search kelas besar, filter tidak hadir/semua hadir, badge mode baca, shortcut panah/H/S/I/A/Ctrl+Enter, toolbar sticky dan konfirmasi nama S/I/A. Pembatalan admin dipindahkan ke Aksi catatan → dialog; reason/version/Origin/auth/audit tetap.
- Skenario nyata Playwright touch390×844: 30 siswa dengan status awal null di DB; H terpilih pada UI, tiga pilihan S/I/A + buka konfirmasi + Simpan = lima pointerup. DB sesudahnya27H/1S/1I/1A. Bounds halaman≤1688px, baris≤96px, roster bergulir sendiri. Keyboard/filter/reset/date picker dan future disabled diuji. Ini bukan waktu guru atau bukti HP nyata.
- Receipt simpan sudah authoritative. Refresh setelah simpan dihapus agar respons RSC tidak me-remount halaman dan menutup menu yang baru dibuka. Void/master tetap refresh. Konflik/reload/no-op/unknown ACK/sesi habis/rotasi/date dirty/history/print lulus; main52e2e3.6menit.
- Toast memakai posisi responsif Sonner, bukan transform CSS tambahan; teks/tombol notifikasi Indonesia dan bounds HP diuji. Source private runtime disimpan di .local agar build/test tidak mengganti artefak preview manual. Alias eksternal pnpm dipertahankan sebagai junction menuju package aslinya. .local diabaikan lint/typecheck selain Git.
- Baseline sebelum pagination: 600 siswa sintetis pada DB ukur tersendiri, render600baris; sampel respons SSR179.31/125.09/128.07/151.83/97.90ms, median128.07ms pada2026-10-08T07:59:29.039Z. Pengukuran Node/Playwright lokal, tanpa klaim provider/perangkat guru. Data demo manual60siswa tidak direset.

- Hard Gate PASS: batas halaman/roster,5tap,nama konfirmasi,52regresi dan API guard lulus.
- Purpose Gate PASS: compact roster untuk pencatatan, warna hanya status, tombol secondary/risiko dibedakan.
- Liveliness PASS: dials1/1/1, nama/kode/status sebagai motif, aksi simpan dan ringkasan sebagai fokus.
- Craftsmanship PASS: receipt/protokol tetap, tests105PostgreSQL dan52browser lulus; H-03 tetap pending.

## Data master UI-R2

- Daftar siswa/guru/kelas memakai pagination SQL dalam snapshot read-only, urutan stabil dengan ID, pencarian/filter allowlist, serta opsi penuh terpisah untuk penempatan/promosi. Kelas aktif siswa memakai tanggal sekolah dan rentang penempatan eksklusif. Akun guru tetap hanya terlihat oleh admin; endpoint mutasi tidak berubah.
- Halaman new/detail/edit menggantikan form pada daftar. Detail siswa memiliki ringkasan, timeline dan ringkasan kehadiran dari proyeksi rekap. Pindah/tutup/arsip memakai dialog. Detail guru memisahkan profil, kelas utama dan akun; reset password serta penonaktifan akses/profil memerlukan dialog. Kelas menggunakan select tingkat dan read-only tahun/tingkat setelah ada penempatan.
- Wizard promosi tiga langkah mempertahankan versi tiap siswa, pratinjau authoritative dan transaksi seluruh batch. Siswa dipilih secara default; pengecualian dapat dilepas sebelum konfirmasi. Form menjaga perubahan sebelum meninggalkan halaman melalui link atau penutupan tab.
- Uji browser 600 siswa membuktikan25baris, halaman berikutnya tanpa pengulangan, filter/NIS, navigasi kembali dan pembatalan keluar dari draft. Empat tes PostgreSQL tambahan mencakup pagination600, penempatan efektif, arsip/filter invalid dan pembatasan rincian akun.
- Pengukuran pertama sesudah redesign berlangsung bersamaan dengan regresi browser:25baris, median133.12ms; belum memenuhi pembanding128.07ms. Pengukuran ulang saat regresi menunggu locator wizard lama:25baris, median118.39ms. Pengukuran final setelah build main harus berjalan tanpa build atau test lain. Cleanup backup Windows sempat melewati timeout10detik dan meninggalkan DB restore fixture; hook cleanup diberi30detik tanpa mengubah perilaku restore yang menolak target yang sudah ada.
