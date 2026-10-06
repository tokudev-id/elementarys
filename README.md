# Sistem Absensi SD

Satu aplikasi Next.js untuk guru dan admin sekolah. Kebutuhan dan penerimaan ada pada [PRD](docs/PRD.md), [rancangan teknis](docs/TECHNICAL_REFERENCE.md), dan [plan](docs/IMPLEMENTATION_PLAN.md). Status pekerjaan ada pada [log](docs/IMPLEMENTATION_LOG.md).

## Setup lokal

Gunakan Node.js 22.23.3 dan pnpm 12.4.2. Jalankan `pnpm install --frozen-lockfile`, salin `.env.example` ke `.env.local`, lalu `pnpm dev`. Secret auth diisi lokal dengan nilai acak, tidak dimasukkan Git. Script tidak membuat atau memakai database cloud.

PostgreSQL lokal yang tersedia: 16.13. Cluster sintetis sesi pengembangan berada di `/private/tmp/elementary-school-pg`, port 55432. Untuk clone baru, siapkan cluster terpisah dengan `initdb -D /tmp/elementary-school-pg -A trust --no-locale -E UTF8`, lalu `pg_ctl -D /tmp/elementary-school-pg -l /tmp/elementary-school-pg.log -o '-p 55432 -h 127.0.0.1 -k /tmp' start`. Ganti username pada URL contoh sesuai user lokal. Jangan memakai konfigurasi trust di luar loopback lingkungan uji. Major versi Neon development belum diverifikasi; S1-02 harus mencatat kompatibilitasnya.

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
