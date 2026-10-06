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

Task dikerjakan pada `task/<ID>`, commit `<ID>: <ringkasan huruf kecil>` dengan penerimaan dan checks pada body, lalu merge `--no-ff` ke main. Orchestrator satu-satunya penulis log. Worker memakai `PORT=3101..3103` dan suffix database `TEST_DB_SUFFIX` dari ID task huruf kecil dengan garis bawah.

## Pemeriksaan

`pnpm lint`, `pnpm typecheck`, `pnpm test:domain`, `pnpm build`, lalu `pnpm start`. Script integration/e2e dan operasi database ditambahkan ketika harness terkait tersedia; jangan menganggap pemeriksaan yang belum tersedia sebagai lulus.

Tidak ada deploy atau push otomatis. Preview hanya Neon development project rough-dawn-85427948 dan Vercel yang ditautkan Toku. Data produksi tidak digunakan untuk seed atau test.

## Pemeriksaan visual scaffold

Halaman awal adalah placeholder pengembangan tanpa kontrol interaktif. Review independen pada 360/768/1024: ship pada scope S1-01; kontras teks 12.36:1, tanpa overflow. Detector menandai Arial sebagai overused-font; pengecualian Operate dan brief mengizinkan font sistem untuk UI tugas sekolah. Antislop: hard gate PASS (tidak ada aset/klaim/kontrol buatan); purpose PASS (font sistem dipilih untuk keterbacaan dan tanpa unduhan); liveliness PASS pada scope placeholder (fokus judul, ruang terstruktur, ENERGY/RHYTHM/MOTION 1); craftsmanship PASS berdasarkan screenshot dan smoke test, bukan penerimaan fitur guru.
