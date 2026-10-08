# Validasi teknis dan pengukuran lokal

Scope S3-04 memakai PostgreSQL18 lokal, data sintetis, Chromium Playwright dan build Next.js. Hasil mesin tidak menutup H-03 (HP/tablet guru), H-06 (Excel/printer sekolah), atau latensi provider H-02.

## Matriks izin dan ketahanan

permissions.spec.ts menelusuri setiap export method pada src/app/api dan membandingkannya dengan daftar endpoint yang diuji. Setiap endpoint data dijalankan pada anonim, guru, admin, password sementara, profil nonaktif, akun banned dan sesi dicabut. Read/write master, lifecycle, akun, absensi, history, unduhan, receipt cetak dan audit termasuk matriks. Namespace plugin auth yang tidak digunakan ditolak; signup publik tidak tersedia. Body kosong pada mutasi yang diizinkan memeriksa bahwa guard lolos ke validasi400, tanpa menulis perubahan; keberhasilan mutasi diuji pada suite fitur masing-masing.

Uji integration menahan lock PostgreSQL nyata dan memeriksa pg_stat_activity: submit→transfer ditolak HISTORICAL_ROSTER_CHANGE, transfer→submit menolak draft ROSTER_CHANGED, dan kalender/transfer/submit menyimpan urutan serial yang konsisten. Draft usang pada balapan tiga transaksi menerima HOLIDAY atau ROSTER_CHANGED sesuai urutan yang didapat, tanpa records parsial. Deadlock SQL nyata diretry maksimal dua kali; kegagalan tetap berhenti pada attempt ketiga. Trigger failure membuktikan rollback data/version/audit/credential yang terkait.

mobile-sweep.spec.ts memeriksa17 halaman operasi pada enam kombinasi viewport/orientasi:360×800,800×360,768×1024,1024×768,1024×1366,1366×1024. Tombol/status/checkbox/link/summary minimal44×44; field diuji dengan viewport360×340 sebagai emulasi keyboard. Status memuat, kosong, gagal, konflik, sesi habis dan tersimpan tersedia; error boundary mempunyai retry/kembali. Uji khusus dialog membuktikan Tab/Shift+Tab/Escape/focus trap/restore, sementara rotasi/draft/retry dibuktikan suite absensi. Capture360 diperiksa langsung. Tidak ada hover-only atau horizontal page overflow; tabel bulanan memakai area gulir sendiri.

## Pengukuran 8 Oktober 2026

Command: pnpm measure:attendance sesudah build. Fixture enam kelas,60 siswa (10 per kelas), dua akun guru dengan tiga kelas utama masing-masing. Tiap sampel menyimpan10 siswa pada kelas terpilih dan benar-benar mengubah status/version; bukan no-op. Script membuat serta membersihkan DB uji tersendiri.

| Ukuran | Hasil lokal |
|---|---|
| Waktu pengukuran | 2026-10-08T02:09:30.272Z |
| Login page pertama | 682.22ms |
| Login email/password | 354.62ms |
| Halaman absensi pertama | 359.14ms |
| Sampel simpan hangat | 44.33,42.99,44.52,46.32,49.54,80.18,54.89,64.66,55.80,46.96ms |
| p95 dari10 sampel | 80.18ms |

Kondisi dingin berarti proses Next baru dengan APP_ENV=production dan database uji sintetis; PostgreSQL tetap menyala. Ini ukuran request lokal di mesin pengembangan, bukan cold start Neon/Vercel, waktu guru, atau bukti jaringan sekolah. Pada H-02, ukur kembali preview development setelah idle dan hangat dengan konfigurasi provider sebenarnya. Pada H-03/H-08, ukur pekerjaan guru di perangkat dan koneksi yang tersedia.
