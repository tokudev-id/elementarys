# Sistem Absensi SD

Satu aplikasi Next.js untuk guru dan admin sekolah. Kebutuhan dan penerimaan ada pada [PRD](docs/PRD.md), [rancangan teknis](docs/TECHNICAL_REFERENCE.md), dan [plan](docs/IMPLEMENTATION_PLAN.md). Status pekerjaan ada pada [log](docs/IMPLEMENTATION_LOG.md).

## Setup lokal

Gunakan Node.js 22.23.3 dan pnpm 12.4.2. Jalankan `pnpm install --frozen-lockfile`, salin `.env.example` ke `.env.local`, lalu `pnpm dev`. Secret auth diisi lokal dengan nilai acak, tidak dimasukkan Git. Script tidak membuat atau memakai database cloud.

PostgreSQL uji memakai major 18, sama dengan metadata project Neon rough-dawn-85427948 (diperiksa 7 Oktober 2026). Jalankan `docker compose up -d` pada clone baru: port 55433 hanya loopback, user school_test, volume uji terpisah. Docker sesi ini memakai container elementary-school-test-pg18 pada port yang sama; hentikan container itu sebelum menjalankan Compose. Konfigurasi trust hanya untuk database uji lokal ini.

Harness membuat `elementary_test_<TEST_DB_SUFFIX>`, menjalankan kedua migrasi, lalu reset tabel antar test. Seed/reset menolak host nonlokal, APP_ENV selain test dan nama database tanpa prefix uji. Beri TEST_ACCOUNT_PASSWORD lokal, buat database uji kosong, jalankan `pnpm db:migrate` dan `pnpm db:seed:test`; seed menghasilkan 10 siswa contoh dan admin@example.test/guru@example.test. Tidak ada password dalam seed atau log. Untuk CLI migrasi, environment dibaca dari `.env.local`.

Schema auth dihasilkan oleh `pnpm dlx auth@1.7.7 generate --config ./auth.generate.ts --output ./src/server/db/auth-schema.ts --yes`. Schema domain mengikuti TRD 3.1, migrasi 0001 menambahkan btree_gist, exclusion ranges, sequence kode siswa, trigger relasi records dan append-only history. Urutan lock: academic_years → students → classes terurut → attendance_sessions. Jangan menjalankan network call dalam transaksi.

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

`pnpm lint`, `pnpm typecheck`, `pnpm test:domain`, `pnpm build`, lalu `pnpm start`. Script integration/e2e dan operasi database ditambahkan ketika harness terkait tersedia; jangan menganggap pemeriksaan yang belum tersedia sebagai lulus.

`pnpm test:integration` membaca `.env.local` bila tersedia. Untuk drill backup di Windows, arahkan `PG_TOOL_DIR` ke folder bin PostgreSQL 18, `AGE_BIN` ke age.exe, dan `AGE_KEYGEN_BIN` ke age-keygen.exe. Binary lokal dapat ditempatkan di `.local/tools` yang diabaikan Git. Test tetap menolak database nonlokal; jangan memakai credential produksi.

Tidak ada deploy atau push otomatis. Preview hanya Neon development project rough-dawn-85427948 dan Vercel yang ditautkan Toku. Data produksi tidak digunakan untuk seed atau test.

## Akun dan akses

Login email/password memakai Better Auth di aplikasi. HTTP auth hanya menerima sign-in/email, sign-out, dan get-session; public signup dan semua jalur admin plugin ditolak. Guard data membaca role, banned, must_change_password dan profil guru dari database setiap request. Password sementara hanya memberi akses ganti password/logout. Cookie sesi dirotasi library saat ganti password, diteruskan ke browser; sesi lain dicabut.

Bootstrap awal: isi BOOTSTRAP_EMAIL, BOOTSTRAP_NAME dan BOOTSTRAP_PASSWORD melalui environment lokal aman, bukan argumen command atau berkas tracked. Password minimal 12 karakter. `pnpm auth:bootstrap-admin` hanya untuk APP_ENV=test pada tahap ini dan menolak bila admin aktif sudah ada. BOOTSTRAP_TEACHER_ID opsional menautkan profil guru aktif yang belum berakun. Jangan menempelkan password pada command shell yang masuk history; gunakan input tersembunyi terminal atau password manager lalu hapus variabel setelah selesai.

Percobaan login dibatasi lima kali per email per menit, memakai key HMAC tanpa email mentah dalam tabel rate_limit. Batas library lintas IP/path adalah 50 login per menit; kedua guru dalam Wi-Fi sama tidak saling mengunci pada percobaan satu akun. TRUSTED_ORIGINS dan BETTER_AUTH_URL harus sesuai origin browser lokal/preview. Tidak ada polling sesi atau dashboard berkala.

## Pemeriksaan visual scaffold

Halaman awal adalah placeholder pengembangan tanpa kontrol interaktif. Review independen pada 360/768/1024: ship pada scope S1-01; kontras teks 12.36:1, tanpa overflow. Detector menandai Arial sebagai overused-font; pengecualian Operate dan brief mengizinkan font sistem untuk UI tugas sekolah. Antislop: hard gate PASS (tidak ada aset/klaim/kontrol buatan); purpose PASS (font sistem dipilih untuk keterbacaan dan tanpa unduhan); liveliness PASS pada scope placeholder (fokus judul, ruang terstruktur, ENERGY/RHYTHM/MOTION 1); craftsmanship PASS berdasarkan screenshot dan smoke test, bukan penerimaan fitur guru.

Build membersihkan folder hasil generate `.next` terlebih dahulu. Ini mencegah CSS lama dari cache build lokal terbawa ke artefak baru; kode sumber dan data database tidak disentuh. Assertion browser S1-04 turut memeriksa computed tap-highlight style, bukan source CSS saja.
