# Sistem Absensi SD

Satu aplikasi Next.js untuk guru dan admin sekolah. Kebutuhan dan penerimaan ada pada [PRD](docs/PRD.md), [rancangan teknis](docs/TECHNICAL_REFERENCE.md), dan [plan](docs/IMPLEMENTATION_PLAN.md). Status pekerjaan ada pada [log](docs/IMPLEMENTATION_LOG.md).

## Setup lokal

Gunakan Node.js 22.23.3 atau lebih baru dan pnpm 12.4.2. Sesi validasi memakai Node.js 24.21.0. Jalankan `pnpm install --frozen-lockfile`, salin `.env.example` ke `.env.local`, lalu `pnpm dev`. Secret auth diisi lokal dengan nilai acak, tidak dimasukkan Git. Script tidak membuat atau memakai database cloud.

PostgreSQL uji memakai major 18, sama dengan metadata project Neon rough-dawn-85427948 (diperiksa 7 Oktober 2026). Jalankan `docker compose up -d`: port 55433 hanya loopback, user school_test, volume uji terpisah. Container Compose sesi ini adalah elementarys-postgres-1. Bila port dipakai container lama, periksa target uji sebelum menghentikannya. Konfigurasi trust hanya untuk database uji lokal ini.

Harness membuat `elementary_test_<TEST_DB_SUFFIX>`, menjalankan kedua migrasi, lalu reset tabel antar test. Seed/reset menolak host nonlokal, APP_ENV selain test dan nama database tanpa prefix uji. Beri TEST_ACCOUNT_PASSWORD lokal, buat database uji kosong, jalankan `pnpm db:migrate` dan `pnpm db:seed:test`; seed menghasilkan 10 siswa contoh dan admin@example.test/guru@example.test. Tidak ada password dalam seed atau log. Untuk CLI migrasi, environment dibaca dari `.env.local`.

Schema auth dihasilkan oleh `pnpm dlx auth@1.7.7 generate --config ./auth.generate.ts --output ./src/server/db/auth-schema.ts --yes`. Schema domain mengikuti TRD 3.1, migrasi 0001 menambahkan btree_gist, exclusion ranges, sequence kode siswa, trigger relasi records dan append-only history. Urutan lock: academic_years → students → classes terurut → attendance_sessions. Jangan menjalankan network call dalam transaksi.

### Data simulasi untuk uji manual

Gunakan database kosong terpisah, misalnya `elementary_test_manual_preview`, pada Docker lokal. Isi DATABASE_URL dan DATABASE_MIGRATION_URL untuk database tersebut, APP_ENV=test, serta DEMO_ACCOUNT_PASSWORD minimal 12 karakter pada `.env.local`. Jalankan `pnpm db:migrate`, `pnpm db:seed:demo`, lalu `pnpm start --hostname 127.0.0.1 --port 3101` sesudah build tersedia. Seed menolak produksi/nonlokal dan database yang sudah memiliki akun; tidak mereset data.

Seed demo membuat SD Harapan Bangsa dengan label data sintetis, enam kelas/60 siswa bernama Indonesia, NIS simulasi, timezone Asia/Jakarta, tahun ajaran Juli–Juni, admin Dewi Lestari (`dewi.lestari@sdharapan.example`) dan guru Budi Santoso (`budi.santoso@sdharapan.example`). Kedua akun memakai DEMO_ACCOUNT_PASSWORD lokal. Sepuluh hari belajar sebelumnya memiliki H/S/I/A beserta audit melalui service aplikasi; hari ini belum dicatat agar bisa dicoba. Jumlah hari menyesuaikan bila tahun baru belum memiliki sepuluh hari sebelumnya. Nama/data dibuat untuk simulasi, bukan daftar siswa sekolah nyata.

Database ini terpisah dari harness browser/integration. Pada sesi persiapan lokal, akun disimpan dalam `.local/demo-accounts.txt` dan proses server dalam `.local/app.pid`; keduanya diabaikan Git. Gunakan `http://localhost:3101` sesuai origin auth. Jangan gunakan credential demo untuk produksi.

## Struktur dan konvensi

- `src/app`: halaman dan route API; handler memvalidasi input dan memanggil guard/service.
- `src/components`: komponen antarmuka.
- `src/domain`: aturan murni, tanpa database atau React.
- `src/contracts`: kontrak input/output.
- `src/server`: auth, services, queries, db dan reports; entry server memakai `server-only`.
- `tests/domain`, `tests/integration`, `tests/e2e`: aturan, PostgreSQL nyata dan browser.

TypeScript strict, nama komponen PascalCase, fungsi camelCase, tanggal kerja date-only. Semua query dalam satu transaksi memakai client yang sama. Respons data memakai no-store dan id korelasi; error tidak mengembalikan SQL, token atau stack.

Format kode memakai Prettier: indentasi dua spasi, double quotes, semicolon, trailing comma, dan lebar 100 karakter. Jalankan `pnpm format` lalu `pnpm format:check`. ESLint menolak style inline, mutasi DOM style, serta callback inline pada event JSX; gunakan stylesheet dan handler bernama. Callback transformasi array tetap diperbolehkan.

Pisahkan aturan murni, kontrak, akses jaringan/database, state interaksi, dan komponen tampilan. Komponen tidak menjalankan SQL; hook bergantung pada kontrak client yang kecil dan dapat diinjeksi. Gunakan guard clause, tipe respons eksplisit, dan validasi respons sebelum menyatakan berhasil. Komentar menjelaskan batasan atau alasan yang tidak terlihat dari kode.

Task dikerjakan pada `task/<ID>`, commit `<ID>: <ringkasan huruf kecil>` dengan penerimaan dan checks pada body, lalu merge `--no-ff` ke main. Orchestrator satu-satunya penulis log. Worker memakai `PORT=3101..3103` dan suffix database `TEST_DB_SUFFIX` dari ID task huruf kecil dengan garis bawah.

## Pemeriksaan

Jalankan `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:domain`, `pnpm test:integration`, `pnpm build`, lalu `pnpm test:e2e`. `pnpm start` menjalankan hasil build untuk pemeriksaan manual.

Harness browser memakai database uji aplikasi terpisah dan data sintetis. Test berjalan serial karena beberapa alur mengedit konfigurasi sekolah yang sama. Fixture membersihkan tabel transient rate_limit sebelum setiap test untuk memberi window login baru pada akun seed bersama. Aturan batas login diverifikasi pada database integrasi tersendiri. Build ulang sebelum e2e setelah perubahan source; global setup e2e menyiapkan ulang fixture aplikasi.

`pnpm test:integration` membaca `.env.local` bila tersedia. Untuk drill backup di Windows, arahkan `PG_TOOL_DIR` ke folder bin PostgreSQL 18, `AGE_BIN` ke age.exe, dan `AGE_KEYGEN_BIN` ke age-keygen.exe. Binary lokal dapat ditempatkan di `.local/tools` yang diabaikan Git. Test tetap menolak database nonlokal; jangan memakai credential produksi.

Tidak ada deploy atau push otomatis. Preview hanya Neon development project rough-dawn-85427948 dan Vercel yang ditautkan Toku. Data produksi tidak digunakan untuk seed atau test.

## Akun dan akses

Login email/password memakai Better Auth di aplikasi. HTTP auth hanya menerima sign-in/email, sign-out, dan get-session; public signup dan semua jalur admin plugin ditolak. Guard data membaca role, banned, must_change_password dan profil guru dari database setiap request. Password sementara hanya memberi akses ganti password/logout. Cookie sesi dirotasi library saat ganti password, diteruskan ke browser; sesi lain dicabut.

Bootstrap awal: isi BOOTSTRAP_EMAIL, BOOTSTRAP_NAME dan BOOTSTRAP_PASSWORD melalui environment lokal aman, bukan argumen command atau berkas tracked. Password minimal 12 karakter. `pnpm auth:bootstrap-admin` hanya untuk APP_ENV=test pada tahap ini dan menolak bila admin aktif sudah ada. BOOTSTRAP_TEACHER_ID opsional menautkan profil guru aktif yang belum berakun. Jangan menempelkan password pada command shell yang masuk history; gunakan input tersembunyi terminal atau password manager lalu hapus variabel setelah selesai.

Percobaan login dibatasi lima kali per email per menit, memakai key HMAC tanpa email mentah dalam tabel rate_limit. Batas library lintas IP/path adalah 50 login per menit; kedua guru dalam Wi-Fi sama tidak saling mengunci pada percobaan satu akun. TRUSTED_ORIGINS dan BETTER_AUTH_URL harus sesuai origin browser lokal/preview. Tidak ada polling sesi atau dashboard berkala.

Halaman Guru mendukung profil tanpa akun, buat/tautkan akun, kelas utama, status aktif, akses dan reset password. Wrapper Better Auth memakai API server dan adapter yang terikat client transaksi domain untuk pembuatan/penautan/reset. Arsip profil sekaligus menonaktifkan akses dan mencabut sesi. Admin aktif terakhir dilindungi dari arsip, penonaktifan dan demosi. Guru aktif dapat mencatat semua kelas; kelas utama menentukan urutan dashboard.

## Fitur Slice 2

- Sekolah/Persiapan sekolah: identitas, lokasi, timezone, preview waktu dan checklist minimum. Konfigurasi sintetis diberi penanda dan belum dianggap siap produksi.
- Tahun ajaran/Kelas/Kalender: periode current, versi master, hari belajar dan pengecualian tanggal. Perubahan kalender yang bertentangan dengan sesi submitted menunjuk catatan yang perlu dibatalkan dahulu.
- Siswa: daftar/filter/detail, identitas dan penempatan bertanggal dalam satu transaksi; transfer, keluar, naik kelas, arsip dan riwayat penempatan tersedia.
- Absensi: Koreksi catatan atau Isi ulang catatan membuka status dari versi terbaru dengan alasan wajib. Konflik memuat ulang data sebelum koreksi berikutnya. Riwayat menampilkan pencatat, waktu, alasan dan status sebelum/sesudah. Pembatalan satu sesi hanya admin; guru mencatat tahun current dan admin juga dapat melengkapi tahun lama dengan alasan.
- Rekap: filter tahun/bulan/kelas, totals dan tabel tanggal, Excel serta cetak A4 landscape. Proyeksi memakai snapshot transaksi yang sama. Setiap ekspor mencatat versi yang dirender; perubahan berikutnya menampilkan tanggal yang berubah. Membuka halaman cetak tetap read-only, tombol Cetak mencatat ekspor sebelum dialog print.
- Backup: enkripsi age, retensi 30 dan restore drill tersedia pada [runbook](docs/RUNBOOK.md). Tujuan/kunci/runner/pemilik operasional menunggu H-07; Excel/printer sekolah menunggu H-06.

## Endpoint dan audit

Semua endpoint data memakai guard sesi/no-store. GET mendukung guru/admin kecuali audit admin. Mutasi master, penempatan, akun, void dan audit hanya admin; PUT absensi untuk guru tahun current atau admin dengan alasan pada tahun lama. Namespace /api/auth hanya sign-in/email, sign-out dan get-session; operasi plugin publik lain ditolak.

| Kelompok             | Endpoint                                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identitas/setup      | GET/PATCH /api/settings                                                                                                                                                                                                 |
| Tahun/kelas/kalender | GET/POST /api/academic-years, PATCH /api/academic-years/{id}, GET/PUT /api/academic-years/{id}/calendar, GET/POST /api/classes, PATCH /api/classes/{id}                                                                 |
| Siswa/lifecycle      | GET/POST /api/students, GET/PATCH /api/students/{id}, POST /api/students/{id}/enrollments, PATCH /api/enrollments/{id}/end, POST /api/enrollments/promote/preview dan /api/enrollments/promote                          |
| Guru/akun            | GET/POST /api/teachers, PATCH /api/teachers/{id}, PUT /api/teachers/{id}/classes, POST /api/teachers/{id}/account, PATCH /api/users/{id}/access, POST /api/users/{id}/reset-password, POST /api/account/change-password |
| Absensi              | GET /api/me, GET /api/dashboard, GET /api/classes/{id}/attendance, PUT /api/classes/{id}/attendance/{date}, POST /api/classes/{id}/attendance/{date}/void, GET /api/classes/{id}/attendance/{date}/history              |
| Laporan/audit        | GET /api/reports/attendance, GET /api/reports/attendance.xlsx, POST /api/reports/exports, GET /api/audit                                                                                                                |
| Operasi              | GET /api/health, pnpm auth:bootstrap-admin, pnpm db:migrate, pnpm db:seed:test, pnpm measure:attendance; CLI backup/restore pada runbook                                                                                |

[Cakupan audit](docs/AUDIT_COVERAGE.md) memetakan mutasi dan ekspor ke bukti uji. Log API memakai metadata yang dipilih eksplisit; payload, cookie, credential dan nama siswa tidak dicetak. APP_LOG_TEST=1 hanya untuk melihat metadata pada uji lokal. Guard seed/reset/migrasi/restore saat ini menerima database uji lokal; provisioning produksi mengikuti runbook dan checkpoint operator.

## Kesiapan rilis dan handover

[Runbook rilis](docs/RELEASE_RUNBOOK.md) memuat CI clone bersih, manifest/koneksi/konfirmasi terpisah untuk release:migrate dan release:bootstrap, environment/pemilik, smoke read-only dan H-05. Guard seed/test/CLI lokal tetap menolak produksi. Script rilis hanya disiapkan untuk operator setelah pemeriksaan dashboard dan checkpoint H-04; manifest bukan bukti identitas host tanpa pemeriksaan akun. Release tidak memasukkan migrasi/seed ke build dan tidak menjalankan deploy/push otomatis.

[Panduan guru](docs/PANDUAN_GURU.md), [admin](docs/PANDUAN_ADMIN.md), [pemelihara/handover](docs/PANDUAN_PEMELIHARA.md), [evaluasi pilot](docs/PILOT_EVALUATION.md) dan [verifikasi panduan](docs/GUIDE_VERIFICATION.md) mengikuti alur UI terbaru. [Validasi](docs/VALIDATION.md) memuat matriks izin, uji perangkat emulasi dan pengukuran lokal6kelas60; bukti nyata tetap pada checkpoint log.

## Pemeriksaan visual

Arah UI ada di [DESIGN.md](DESIGN.md): Operate untuk pekerjaan guru/admin, ENERGY 1 / RHYTHM 1 / MOTION 1, font sistem dan aksen hijau. [Laporan anti-slop](docs/ANTI_SLOP_REPORT.md) mencatat gate, kontras, viewport, keyboard dan interaksi yang diuji. Bukti emulator dan PDF lokal melengkapi pemeriksaan teknis; penerimaan perangkat nyata tetap pada checkpoint manusia di log.

Build membersihkan folder hasil generate `.next` terlebih dahulu. Ini mencegah CSS lama dari cache build lokal terbawa ke artefak baru; kode sumber dan data database tidak disentuh. Assertion browser S1-04 turut memeriksa computed tap-highlight style, bukan source CSS saja.
