# Runbook operasional

## Preview development dan pengukuran (S1-07)

Status: alur lokal S1-06 dan fitur Slice2 tersedia dengan data sintetis. Bukti command terbaru ada pada IMPLEMENTATION_LOG.md. Preview cloud belum tersedia; H-02 memerlukan login Neon CLI dan project Vercel yang ditautkan Toku. URL dan hasil latensi provider belum ada. Tidak ada data nyata atau branch production yang dipakai pada persiapan ini.

### Pemeriksaan lokal

1. Siapkan Node minimal22.20.0, pnpm12.4.2, Docker dan PostgreSQL18 uji: `docker compose up -d`. Salin `.env.example` ke `.env.local`; isi secret/password uji secara lokal. Jangan commit `.env.local`.
2. Jalankan `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:domain`, `pnpm test:integration`, `pnpm build`, dan `pnpm test:e2e`. Drill backup memerlukan pg_dump/pg_restore dan age/age-keygen sesuai bagian backup di bawah.
3. Jalankan `pnpm measure:attendance` setelah build. Script membuat database uji lokal tersendiri, seed10siswa dengan password acak, lalu menjalankan proses Next baru pada3103 dengan APP_ENV=production dan koneksi uji sintetis. MEASUREMENT_PORT opsional; pilih port yang kosong. Script tidak memanggil Neon/Vercel dan menolak APP_ENV sumber selain test.
4. JSON hasil mencatat pembukaan login pertama, login, pembukaan absensi pertama, dan sepuluh simpan yang benar-benar mengubah status (bukan retry no-op). p95 memakai sampel terurut. Kondisi dingin hanya proses Next lokal baru; PostgreSQL tetap aktif. Angka ini bukan hasil cloud ataupun waktu guru. Proses dan database pengukuran dibersihkan setelah selesai/gagal; tidak menyentuh database uji aplikasi lain.
5. Uji APP_ENV=production pada port terpisah dengan `tests/production/playwright.config.ts` membuktikan component-preview404. Database tetap URL uji lokal. Pemeriksaan ini tidak menggantikan H-03 pada HP guru.

### Langkah cloud setelah H-02

Toku menyiapkan Neon CLI login/skills/MCP serta project Vercel untuk preview, sesuai AGENT_PROMPT. Pastikan project rough-dawn-85427948 dan branch development sudah tersedia. Jangan membuat, mereset, menghapus, atau menautkan branch production.

1. Verifikasi metadata penautan dan target development sebelum menarik environment. `neon link --project-id rough-dawn-85427948 --branch development -y`; `neon config init`; tinjau neon.ts minimal tanpa auth/buckets/functions/dataApi/aiGateway. Periksa dokumentasi CLI terpasang sebelum menjalankan deploy.
2. `neon deploy` hanya pada development. Environment hasil tarik berada di berkas yang di-ignore. Cocokkan host koneksi dengan metadata branch development; runtime memakai credential aplikasi minimum, credential migrasi hanya pada pekerjaan migrasi.
3. CLI migrasi/seed saat ini sengaja hanya menerima database uji lokal. Adapter cloud belum dikerjakan sebelum target development dapat diverifikasi dari akun H-02. Jangan menghapus atau melewati guard tersebut untuk membuat langkah cloud tampak berhasil. Tambahkan adapter development yang memverifikasi identitas branch, tinjau SQL, lalu migrasi sebagai pekerjaan terpisah dari build. Seed hanya sintetis dan harus menolak host production.
4. Isi environment server-only pada Vercel preview: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL dan TRUSTED_ORIGINS sesuai origin preview. DATABASE_MIGRATION_URL hanya untuk runner migrasi, tanpa NEXT_PUBLIC_ secret. Node runtime/region/pool serverless diverifikasi terhadap project dan dokumentasi provider terpasang sebelum deploy. Jangan menambahkan migrasi ke build.
5. Setelah project ditautkan oleh Toku, deploy preview saja. Catat URL nyata, branch, commit, region, pemilik dan hasil smoke: dua akun guru, simpan/konflik/retry, dashboard dan mobile. Catat latensi dingin provider setelah idle dan latensi hangat secara terpisah dari hasil lokal.

Bagian cloud tetap needs_human sampai H-02 selesai dan verifikasi target/adapter serta deployment preview benar-benar dijalankan. Tidak ada produksi otomatis atau push dari runbook ini.

## Koreksi penempatan historis (S3-01)

Mutasi rutin menolak perubahan roster sesi submitted dan menunjukkan tanggal aman berikutnya. Bila tanggal aman memenuhi kebutuhan, gunakan transfer/keluar pada tanggal tersebut. Pembatalan penempatan mendatang berlaku sebelum mulai; data rencana tetap disimpan di audit dan ditampilkan sebagai dibatalkan pada riwayat. Arsip siswa memerlukan semua penempatan berjalan ditutup dan rencana mendatang dibatalkan.

Untuk penempatan historis yang memang salah, pemelihara bersama admin memverifikasi siswa berdasarkan kode internal, bukan nama. Langkah berikut dijalankan operator pada lingkungan yang disetujui; agent tidak menyentuh data nyata.

1. Hentikan write terkait selama pemeliharaan. Buat backup terenkripsi dan buktikan dapat direstore ke DB terpisah sebelum perubahan. Simpan rincian semester, kelas asal/tujuan, enrollment, rentang efektif, versi sesi dan ekspor acuan.
2. Tinjau seluruh sesi submitted pada rentang terdampak di kedua kelas. Simpan proyeksi/rekap serta isi dan aktor catatan sebelumnya untuk pembandingan; catatan absensi tidak dianggap milik kelas baru hanya karena siswa pindah.
3. Admin membatalkan setiap sesi terdampak melalui UI dengan alasan koreksi penempatan. Audit menyimpan isi lama, current records dihapus, dan versi sesi meningkat. Verifikasi semua sesi terdampak sudah voided sebelum mengubah rentang; tidak menonaktifkan trigger, constraint atau audit append-only.
4. Gunakan layanan transfer/penempatan/keluar dengan expectedVersion terbaru bila rentang valid dapat dinyatakan lewat UI. Jika kasus membutuhkan pembetulan di luar alur rutin, pemelihara menyiapkan SQL berparameter untuk ditinjau: transaksi dengan lock academic_year terurut → students → classes terurut → sessions, rentang [mulai,akhir), pemeriksaan overlap dan audit before/after lengkap. Jangan menjalankan SQL tak ditinjau atau mengganti riwayat audit.
5. Periksa roster tepat sebelum, pada dan sesudah tanggal efektif di kedua kelas. Admin mengisi ulang tiap sesi voided dari roster yang telah diverifikasi dengan alasan pemeliharaan dan status yang disetujui guru. Ini pekerjaan rekonsiliasi manual; tidak ada salin otomatis dari kelas lama.
6. Bandingkan totals H/S/I/A per siswa dan tanggal, pastikan tidak ada catatan ganda atau siswa wajib hadir setelah keluar. Tinjau history dan penanda Berubah setelah ekspor terakhir, lalu ekspor acuan baru bila telah disetujui. Jika pemeriksaan gagal, tetap hentikan write dan gunakan runbook restore; catat kehilangan data yang ditemukan serta penanggung jawab sebelum membuka kembali.

## Backup harian dan pemulihan (S2-E1)

Status: drill lokal dengan data sintetis tersedia. H-07 masih membutuhkan repository/runner nyata, tujuan penyimpanan terpisah, pasangan kunci age, pemilik backup, notifikasi kegagalan dan drill production ke database terpisah. Target RPO satu hari belajar dan RTO satu hari kerja belum menjadi hasil pengukuran produksi.

### Konfigurasi runner

Workflow `.github/workflows/backup.yml` berjalan setiap hari pukul 18:00 WIB (11:00 UTC), termasuk hari libur, atau lewat workflow_dispatch. Gunakan runner khusus berlabel `school-backup` dengan Node 22.23.3, pnpm 12.4.2, `age`, `rclone` dan `pg_dump` major minimal sama dengan server (saat ini PostgreSQL 18). Runner harus memiliki ruang sementara yang terbatas aksesnya dan koneksi TLS ke database. Batasi siapa yang boleh mengubah workflow serta menjalankannya di environment `backup`.

Isi secret environment runner `BACKUP_DATABASE_URL` (akun backup dengan SELECT pada semua tabel domain/auth/audit, akses sequence dan schema). Isi variable `BACKUP_AGE_RECIPIENT` dengan public recipient age dan `BACKUP_TARGET` dengan folder remote rclone khusus aplikasi ini. `BACKUP_ADAPTER=rclone`; secret `RCLONE_CONFIG_PATH` menunjuk file konfigurasi rclone yang sudah dipasang aman pada runner, bukan isi file. Batasi credential storage ke folder backup. Private identity age disimpan offline oleh pemilik, tidak dipasang pada runner backup. Atur notifikasi failed workflow untuk pemilik runner dan buktikan penerimaannya saat H-07.

Jalankan `pnpm exec tsx scripts/backup/backup.ts`. Credential koneksi diteruskan ke client lewat environment PostgreSQL; URL/password tidak dicetak. pg_dump format custom mencakup semua schema/data, auth, audit, export history, constraints dan sequence. Dump dialirkan langsung ke age; hanya ciphertext dibuat di folder sementara privat. Upload harus berhasil sebelum retensi berjalan. Retensi mempertahankan 30 nama `school-<timestamp UTC>-<UUID>.dump.age` terbaru, hanya pada folder target. Berkas lain tidak dihapus. Job gagal dengan exit nonzero pada kegagalan dump/enkripsi/upload/retensi; pemilik memeriksa status run dan backup terbaru, bukan hanya keberadaan nama file. File sementara dibersihkan saat proses selesai normal atau gagal; operator juga membersihkan sisa folder privat apabila runner mati mendadak.

Adapter `local` memakai `BACKUP_TARGET` berupa direktori di luar repo untuk fixture/drill; upload memakai file pending dan rename. Adapter `rclone` memakai remote terpisah sesuai H-07. Interface `BackupStore` di `scripts/backup/core.ts` dapat diganti untuk storage lain. Jangan memakai direktori fixture sebagai backup produksi. Mingguan, periksa umur backup terbaru, kuota, dan lakukan dekripsi sebagai pemilik identity offline.

### Restore drill lokal

Restore CLI sengaja menerima hanya `APP_ENV=test`, host loopback dan nama `elementary_test_*`, sesuai guard database proyek. Database target harus belum ada: script tidak drop atau mengganti database. Siapkan `RESTORE_DATABASE_URL`, `RESTORE_FILE` (ciphertext yang diunduh), dan `RESTORE_AGE_IDENTITY` (path identity di luar repo), lalu jalankan `pnpm exec tsx scripts/backup/restore.ts`. `age` mendekripsi ke dump sementara privat; `pg_restore --single-transaction --exit-on-error --no-owner --no-acl` memuat DB baru. Restore gagal dapat meninggalkan DB baru kosong untuk investigasi; jangan menganggapnya siap dipakai.

Hasil JSON berisi counts/hash seluruh tabel public, contoh rekap bulanan per siswa/status, dan jumlah sesi login dicabut. Evidence diambil sebelum pencabutan seluruh baris auth `session`. Bandingkan dengan evidence dari sumber drill yang dibekukan atau fixture sebelum backup; jangan membandingkan sumber aktif yang berubah sesudah dump. Script test membuktikan seluruh isi domain/auth/audit/export history cocok, 10 siswa dan 10 penempatan, absensi/rekap cocok, semua sesi lama hilang dan login baru memakai password akun yang dipulihkan berhasil. Token lama harus ditolak oleh guard aplikasi yang membaca tabel sesi. Hash/counters merupakan bukti teknis, bukan data yang ditampilkan kepada guru.

Untuk client yang tidak ada di PATH, gunakan `PG_TOOL_DIR` berisi executable `pg_dump`/`pg_restore`, `AGE_BIN`, serta `AGE_KEYGEN_BIN` khusus test. Wrapper test dapat memakai `docker exec -i` pada container PostgreSQL 18 lokal dan memetakan host/port ke loopback container; jangan memakai wrapper yang mengabaikan target untuk produksi.

Pemeriksaan drill: `APP_ENV=test TEST_DB_SUFFIX=s2_e1 pnpm exec vitest run tests/integration/backup.test.ts`. Siapkan binary age/age-keygen dan PostgreSQL 18 terlebih dahulu. Test hanya membuat data sintetis, identity temporer di luar repo dan DB dengan suffix task; setelah selesai artefak dan DB drill dihapus. Tidak ada identity/password/dump yang ditambahkan ke Git.

### Insiden produksi

1. Pemilik insiden menghentikan writes aplikasi dan menyimpan catatan absensi sementara guru. Catat waktu backup terakhir serta perkiraan data yang belum tercakup.
2. Simpan snapshot kondisi rusak untuk investigasi. Pertahankan database lama dan batasi akses; jangan menimpanya dengan restore.
3. Unduh backup terakhir yang berhasil ke mesin operator terbatas aksesnya. Dekripsi memakai identity offline. Buat database baru di lingkungan tujuan terpisah, lalu gunakan client PostgreSQL sesuai major untuk restore dalam transaksi dengan exit-on-error. CLI lokal di atas tidak menerima URL production; langkah produksi dijalankan operator pada tujuan yang disetujui H-07.
4. Sebelum membuka koneksi aplikasi, cabut seluruh sesi auth (`DELETE FROM "session"`) dan rotasi secret/credential yang relevan. Periksa counts siswa/penempatan/sesi absensi/records/audit, export history, sample rekap, schema/migration dan sequence. Uji login baru dan pastikan token lama ditolak. Pemilik menyetujui hasil sebelum pengalihan.
5. Alihkan koneksi aplikasi ke DB baru, buka writes, dan monitor login serta submit. Jika verifikasi gagal, tetap hentikan writes dan simpan DB baru untuk diagnosis.
6. Rekonsiliasi catatan sementara sejak backup terakhir dengan alasan pemulihan dan audit. Catat waktu mulai/selesai, kehilangan data yang ditemukan, hasil verifikasi, pemilik dan pelajaran drill. Tidak menyatakan RPO nol. Hapus plaintext sementara dan lepaskan akses identity setelah selesai.
