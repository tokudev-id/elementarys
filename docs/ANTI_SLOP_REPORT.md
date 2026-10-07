# Pemeriksaan anti-slop, 7 Oktober 2026

Scope: Slice 2 A1-A3, B1-B3, C1, D1 dan verifikasi E1, beserta regresi alur absensi S1 dan konvensi kode. Mode during sesuai instruksi sesi. Arah visual mengikuti DESIGN.md: operasi sekolah, ENERGY 1 / RHYTHM 1 / MOTION 1. H-03, H-06 dan H-07 operasional tetap pending; laporan ini tidak menyatakan rilis selesai.

Bukti akhir pada main a4676c3: frozen install, format:check, lint, typecheck, domain 8, integration PostgreSQL 18 sebanyak 81, build/start dan seluruh e2e 44 lulus. APP_ENV=production pada server lokal dengan koneksi database uji menolak component-preview404 (satu test lulus). Capture tambahan guru/kalender/siswa/settings/setup pada 360/768/1024 (15 capture) tidak overflow; lima capture360 diperiksa langsung. Capture rekap, print, dialog absensi dan history juga diperiksa selama implementasi. Komponen diuji enam viewport/orientasi serta resize keyboard360x340. Palette teks tetap dari S1: teks12.36:1, tombol7.46:1, muted5.87:1, error9.36:1, border4.63:1; print memakai hitam/putih21:1.

Hard Gate PASS; Purpose Gate PASS; Liveliness PASS; Craftsmanship & Quality Locks PASS. Bukti tiap aturan ada pada tabel berikut dan log implementasi.

## Hard Gate

| Aturan | Status dan bukti |
|---|---|
| R-02 | PASS: pencarian source tidak menemukan em dash pada teks antarmuka. |
| R-03 | PASS: assertion overflow dan screenshot pada360/768/1024, portrait/landscape serta keyboard resize. |
| R-17 | PASS: jumlah siswa dan H/S/I/A berasal dari roster/respons server; tidak ada statistik pemasaran. |
| R-18 | PASS: tidak ada testimonial atau avatar buatan. |
| R-23 | PASS: identitas sekolah dibaca dari config; seed diberi label data sintetis; tidak membuat logo/aset baru. |
| R-24 | PASS: delapan tujuan guru dan sepuluh tujuan admin aktif tersedia; Beranda/Audit yang belum siap tetap tidak ditampilkan. Navigasi dan role diperiksa domain, shell dan browser fitur. |
| R-25 | PASS: semua pasangan teks utama yang digunakan melebihi4.5:1; rasio tercatat di atas. |
| R-26 | PASS: navigasi, filter, form master, akun, radios, tanggal, koreksi, void, history, download, print, konfirmasi dan reload memiliki handler/tujuan nyata; interaksinya tercatat di bawah. |
| R-27 | PASS: banner memuat, kosong, gagal, konflik, sesi habis dan tersimpan tersedia; kegagalan/retry diuji pada browser. |
| R-28 | PASS: aplikasi tidak menambahkan FAQ. |
| R-32 | PASS: Tab/Shift+Tab, Enter, panah radio, Escape, focus trap, focus restore dan indikator3px diuji. |
| R-33 | PASS: fitur ditulis langsung pada source melalui patch; Prettier hanya merapikan format kode. |
| R-34 | PASS: tema terang mengikuti DESIGN.md; tidak ada toggle atau tema kedua yang belum bekerja. |
| R-35 | PASS: build/start dan seluruh e2e44 dijalankan pada main, termasuk flow S2 dan regresi S1; pageerror diperiksa pada simpan/rekap/koreksi dan capture tambahan. PDF dan workbook dibaca ulang. |
| R-36 | PASS: tidak ada klaim keamanan, kepatuhan, performa provider atau pelanggan buatan. |
| R-37 | PASS: arah dari DESIGN.md, daftar siswa vertikal, permukaan terang, aksen hijau dan dials1/1/1 dipakai. |
| R-38 | PASS: nama/status/waktu berasal dari database; data pengujian diberi label sintetis. |

## Purpose Gate

| Aturan | Status dan bukti |
|---|---|
| R-01 | PASS: aksen hijau membedakan tindakan dan fokus sesuai DESIGN.md; tidak ada gradient/glow. |
| R-04 | PASS: pilihan dan navigasi memakai label sekolah; tidak ada ikon dekoratif. |
| R-06 | PASS: font sistem dipilih untuk keterbacaan label dan menghindari unduhan font harian. |
| R-07 | PASS: grid hanya untuk kalender bertanggal dan tabel rekap nyata; tidak ada grid/dot/blueprint dekoratif. |
| R-08 | PASS: tidak ada panah dekoratif pada tombol. |
| R-09 | PASS: tidak ada badge kapsul atau eyebrow yang mengulang judul. |
| R-10 | PASS: tidak ada glassmorphism. |
| R-12 | PASS: shadow hanya pada dialog untuk memisahkan konfirmasi dari daftar. |
| R-13 | PASS: tidak ada glow. |
| R-14 | PASS: baris siswa seragam agar pencatatan cepat dan dapat dibandingkan; tidak ada kartu fitur pemasaran. |
| R-19 | PASS: transisi hanya feedback pilihan status120ms dan menghormati reduced motion. |
| R-22 | PASS: tidak ada ilustrasi dekoratif. |

## Liveliness

| Butir | Status dan bukti |
|---|---|
| Dials eksplisit | PASS: ENERGY1/RHYTHM1/MOTION1 pada DESIGN.md dan pengumuman sesi. |
| Konsistensi dials | PASS: daftar operasi seragam; tidak ada animasi masuk atau susunan landing page. |
| Fokus per layar | PASS: kelas/status pada absensi, periode/totals pada rekap, identitas/version pada master dan urutan perubahan pada history. Judul dan tindakan utama membedakan tugas tiap halaman. |
| Whitespace | PASS: jarak memisahkan identitas siswa, pilihan dan tindakan; screenshot360px diperiksa. |
| Aksen | PASS: hijau menandai tindakan/fokus; label status tetap berupa teks. |
| Motif identitas | PASS: nama/kode/status berulang sebagai struktur daftar sekolah, tanpa identitas visual buatan. |
| Design Read | PASS: arah operasi sekolah, audiens guru/admin dan dials1/1/1 dinyatakan sebelum perubahan. |

## Craftsmanship dan Quality Locks

| Aturan | Status dan bukti |
|---|---|
| C-1 | PASS: tujuan font, warna, daftar, spacing dan dialog tercatat pada DESIGN.md/log. |
| C-2 | PASS: kontrol aktif memiliki tindakan yang diuji; contoh pending/nonaktif diberi label pada halaman pengembangan. |
| C-3 | PASS: bagian halaman berisi identitas sekolah, kelas, siswa, status dan tindakan pencatatan. |
| C-4 | PASS: jaringan/retry/konflik/sesi habis, role, mobile, rotasi, keyboard dan refresh sebelum koreksi diuji; H-03/H-06 tetap pending untuk perangkat nyata. |
| C-5 | PASS: tidak ada testimonial/statistik/klaim buatan. |
| R-05 | PASS: susunan daftar mengikuti pekerjaan absensi dan RHYTHM1, tanpa hero/bento/pricing/footer template. |
| R-11 | PASS: radius6px pada kontrol dan12px pada dialog; tidak semua elemen berbentuk pill. |
| R-15 | PASS: tindakan spesifik: Simpan identitas sekolah, Tambah siswa, Reset password akun, Koreksi catatan, Batalkan sesi, Unduh Excel, Cetak dan Muat data terbaru. |
| R-16 | PASS: tidak ada buzzword pemasaran pada antarmuka. |
| R-20 | PASS: susunan kelas/siswa/tanggal/H/S/I/A mengikuti pencatatan sekolah. |
| R-21 | PASS: tema terang merupakan arah eksplisit DESIGN.md. |
| R-29 | PASS: neutral/surface dan hijau sebagai aksen, merah untuk pesan kesalahan yang perlu dibedakan. |
| R-30 | PASS: mengikuti arah operasi sekolah yang tersedia, tanpa menyalin layout produk referensi. |
| R-31 | PASS: alasan tiap keputusan utama tercatat dan sesuai tugas guru. |

## Interaksi yang dijalankan

- Login dan logout: halaman tujuan dan sesi sesuai; ganti password memberi sesi baru.
- Navigasi Hari ini/Ganti password serta skip link: tujuan/fokus sesuai.
- Pilihan H/S/I/A: status dan radio berubah; rotasi mempertahankan pilihan.
- Simpan: membuka ringkasan8/1/1/0; Konfirmasi simpan menyimpan seluruh kelas dan memperbarui dashboard.
- Batal, Tutup dan Escape: menutup dialog tanpa menulis; fokus kembali ke pemicu.
- Tanggal: membatalkan pergantian mempertahankan draft; menerima pergantian memuat hari terlewat.
- Gagal jaringan/respons hilang: tidak mengklaim tersimpan; retry berhasil tanpa duplikasi.
- Konflik dua akun: membaca status serta pencatat terbaru. Konflik roster dengan reload gagal mengunci simpan; Muat data terbaru membuka form11siswa setelah berhasil.
- Sesi habis: draft di halaman tetap terlihat, tidak mengklaim tersimpan; Masuk kembali menunjuk halaman login yang diuji.
- Halaman component-preview: dialog, bottom sheet, validasi isian dan konfirmasi bekerja; produksi mengembalikan404.
- Rekap: tahun/bulan/kelas memfilter proyeksi; totals mendahului tabel pada HP, tabel bergulir lewat keyboard. Unduh Excel berhasil dan gagal/retry; respons memakai snapshot dan acuan ekspor terbaru. ExcelJS roundtrip sembilan kelas ditambah ringkasan memeriksa History, variasi case, apostrof, pemotongan31, collision, string formula-like/kode00123 serta totals numerik. LibreOffice dan Excel sekolah belum menjadi bukti H-06.
- Cetak: membuka halaman tetap read-only, tombol mencatat receipt snapshot sebelum window.print. Token/actor/filter/map tamper ditolak. PDF A4 landscape dua kelas ×10siswa ×31tanggal memiliki dua halaman. OS print dialog distub dalam automation; printer fisik tetap H-06.
- Sekolah/setup: preview timezone, validasi invalid IANA, simpan, checklist, konfigurasi sintetis dan konflik dua editor/reload. Integration membuktikan singleton race, alasan perubahan timezone dan tanggal lama tetap date-only.
- Tahun/kelas/kalender: buat/edit tahun dan kelas, weekday serta tambah/hapus override; guru membaca tanpa kontrol tulis. Integration memeriksa archive/grade/range/current/version dan lock kalender terhadap submit PostgreSQL nyata.
- Siswa: sepuluh input pada360px, filter nama/kode/kelas, detail/edit, role dan sapuan viewport. Integration memeriksa kode unik bersamaan, duplicate/stale, tanggal roster serta rollback enrollment tanpa siswa yatim.
- Guru/akun: profil tanpa akun, pembuatan akun/password sementara, kelas utama, reset, disable/enable, ganti password dan archive. Integration memeriksa existing link/tautan ganda, rollback credential lewat trigger SQL, revoke, admin terakhir, archive race, kelas non-utama, detail akun hanya admin dan nama pencatat tetap sesudah rename.
- Koreksi/history: alasan kosong, Alpa→Hadir, Batal/Escape, gagal jaringan/retry mempertahankan status dan alasan, no-op, dua editor berbeda/409/reload, admin void, guru isi ulang dan history lengkap. Guru ditolak pada void/tahun lama; admin melengkapi dan mengoreksi tahun lama. Banner pembatalan berada di viewport. Integration membuktikan totals akhir, audit snapshot, versi ekspor, correction-versus-void race dan rollback audit/records/version pada SQL failure.
- Backup: tiga integration test memverifikasi pg_dump→age→dekripsi→pg_restore ke DB baru, evidence domain/auth/audit/export, revoke sesi/login baru, retensi30, upload failure dan exit nonzero. Runner/storage/identity/pemilik/notifikasi nyata tetap H-07.

## Komentar dan konvensi

PASS: komentar dekoratif pada config dihapus; komentar batasan transaksi, subprocess dan keamanan dipertahankan. Perubahan fungsional mengikuti tugas aplikasi, sedangkan pembersihan komentar terbatas pada komentar tersebut. Prettier dan ESLint memeriksa format serta larangan style/handler JSX inline.
