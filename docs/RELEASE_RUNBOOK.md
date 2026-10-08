# Runbook kesiapan dan rilis

Status8Oktober2026: aplikasi lokal dan persiapan otomasi tersedia. URL preview, identitas endpoint cloud, pemilik dashboard, data sekolah dan runner backup belum diverifikasi. S1-07/H-02 masih pending; produksi memerlukan H-04/H-05/H-07 serta persetujuan Toku. Agent hanya boleh memakai development pada project rough-dawn-85427948 dan tidak menjalankan SQL/deploy produksi. Perintah produksi di bawah adalah langkah operator setelah checkpoint tersebut.

## Bukti sebelum memakai akun

Mulai dari clone bersih: Node24.21.0, pnpm12.4.2, PostgreSQL18 lokal, client pg_dump/pg_restore major18, age1.3.2 dan Chromium. Salin .env.example ke .env.local dengan URL loopback elementary_test_* serta secret/password sintetis lokal. Jalankan frozen install, format:check, lint, typecheck, test:domain, test:integration, build dan test:e2e. Workflow CI menjalankan urutan yang sama dengan service Postgres uji, key backup temporer, batas job30menit dan contents:read. Install action memakai [checkout](https://github.com/actions/checkout/tree/v6), [setup-node](https://github.com/actions/setup-node/tree/v6), [pnpm](https://github.com/pnpm/action-setup/tree/v4), serta [age1.3.2](https://github.com/FiloSottile/age/releases/tag/v1.3.2) dengan digest asset diverifikasi.

Receipt8Oktober2026: clone lokal commit7360b49 pada direktori terpisah, tree bersih sebelum/sesudah checks, suffix DB s3_05_clone dan port3103. Frozen install, format/lint/typecheck, domain18, integration105, build serta seluruh e2e50 lulus (3.9menit). Client/age memakai binary lokal yang sudah diverifikasi; installer Linux/job GitHub hosted belum dijalankan. CI Ubuntu24.04 memasang client18 melalui [repository PostgreSQL resmi](https://www.postgresql.org/download/linux/ubuntu/) dan menguji major yang sama.

Tidak ada secret produksi pada job checks. Seed/reset/test/CLI migrasi lokal menolak APP_ENV=production atau host/nama di luar database uji. Guard rilis terpisah bukan jalur seed/test; unit memeriksa konsistensi metadata tanpa koneksi cloud, dan CLI produksi tanpa manifest/konfirmasi terbukti berhenti sebelum write. Bukti clone terbaru dicatat pada IMPLEMENTATION_LOG.md; hasil lokal bukan klaim job GitHub hosted sudah dijalankan.

## H-02: preview development

1. Toku menyiapkan login Neon CLI/skills/MCP dan project Vercel yang benar, lalu mencatat ID, URL, region, pemilik dan branch development. Periksa metadata project rough-dawn-85427948 serta endpoint yang memang milik development. Neon config tetap minimal sesuai TRD; layanan tambahan tidak diaktifkan.
2. Pada dashboard Neon, pilih development dan salin koneksi runtime pooled serta koneksi direct untuk migrator. Metadata branch/endpoint/database/role dicocokkan sebelum file lokal dibuat. [Neon pooling](https://neon.com/docs/connect/connection-pooling) merekomendasikan pooled untuk workload serverless dan direct untuk migrasi/pg_dump. [Role terbatas](https://neon.com/docs/manage/roles) dibuat melalui SQL oleh operator, lalu diuji hak aksesnya.
3. Buat manifest ignored yang berisi projectId, branchName development, branchId br-* yang nyata, endpointHost direct ep-*.neon.tech, databaseName, migrationRole dan postgresMajor18. Isi RELEASE_ENV_FILE ke berkas ignored terpisah, APP_ENV=development, DATABASE_MIGRATION_URL direct/TLS, RELEASE_MANIFEST_FILE dan RELEASE_CONFIRM=migrate:rough-dawn-85427948:<branchId nyata>. Jalankan pnpm release:migrate hanya setelah identitas target diverifikasi. Script memeriksa metadata/role/host/TLS/direct dan major server, menjalankan migrasi dari repo, lalu mencetak hasil generik.
4. Bootstrap development memakai konfirmasi operasi bootstrap yang terpisah serta secret/origin HTTPS dan credential sintetis melalui environment; pnpm release:bootstrap memakai helper transaksi yang sama dengan bootstrap lokal. Seed CLI tetap hanya lokal; data development dibuat melalui UI atau adapter development yang ditinjau, bukan menghapus guard test. Hapus variabel credential bootstrap setelah selesai.
5. Vercel project ditautkan Toku; isi environment Preview yang hanya menunjuk development, jalankan build dan deploy preview. [Vercel environments](https://vercel.com/docs/deployments/environments) memisahkan Preview/Production; [CLI deploy](https://vercel.com/docs/projects/deploy-from-cli) memakai vercel deploy untuk preview. Periksa URL aktual, login/role/simpan/rekap/print dan latensi provider. Catat H-03 pada perangkat guru; emulator tidak menggantikannya.

## H-04: provisioning produksi oleh operator

1. Toku menyetujui checkpoint dan menunjuk pemilik insiden. Cocokkan project rough-dawn-85427948, branch production, branch ID, endpoint ID/host, database, role owner/migrator, major18 dan region lewat dashboard. Bila belum tersedia, operator menyiapkan resource yang disetujui; agent tidak membuat atau menautkan branch production.
2. Siapkan owner/migrator direct terpisah dari role aplikasi. Role aplikasi mendapat CONNECT/USAGE schema, SELECT/INSERT/UPDATE pada tabel domain/auth yang diperlukan; DELETE hanya pada session/account/verification/rate_limit, teacher_classes, pola/override kalender, current records serta enrollment mendatang yang memang dibatalkan layanan. audit_events dan report_exports hanya SELECT/INSERT; tidak ada UPDATE/DELETE/DDL. sequence student_code_seq mendapat USAGE/SELECT. Gunakan password manager atau prompt tersembunyi psql untuk password role, bukan argumen command/SQL tracked. Tinjau grant efektif dan uji larangan sebelum membuka write.
3. Backup kondisi awal dan simpan snapshot schema/ledger migrasi. Buat manifest production dari metadata dashboard yang diverifikasi dan file environment ignored. APP_ENV=production, URL direct/TLS dan migrationRole harus cocok; RELEASE_CONFIRM=migrate:rough-dawn-85427948:<branchId nyata>. Setelah persetujuan operator, pnpm release:migrate memeriksa major dan memakai migrator Drizzle/ledger dari src/server/db/migrations. Migrasi dilakukan terpisah dari build; tinjau SQL, extension btree_gist, constraints/indices, ledger dan jumlah row. Jangan memakai seed/reset/test pada target ini.
4. Siapkan secret auth dan domain HTTPS final. Dengan konfirmasi bootstrap terpisah, credential admin nyata via environment aman dan BOOTSTRAP_TEACHER_ID bila profil sudah disiapkan, jalankan pnpm release:bootstrap sekali. Helper menolak bila admin non-banned sudah ada, membuat credential/tautan/audit bersama, serta mewajibkan ganti password. Hapus variabel bootstrap. Akun berikutnya melalui menu Guru dan akun; satu akun per orang sesuai Q-01.
5. Isi environment Production Vercel dengan runtime pooled role minimum dan auth final. Cocokkan region dan domain; deployment harus memakai commit yang diuji. [Environment variables](https://vercel.com/docs/environment-variables) berlaku pada deployment berikutnya, sehingga perubahan harus diikuti deploy yang sesuai. Setelah operator menyetujui, vercel deploy --prod atau dashboard deployment produksi; catat ID/commit/domain dan pemilik. Agent tidak menjalankan langkah ini otomatis.
6. Jalankan smoke:read-only dengan SMOKE_BASE_URL yang diverifikasi. Script hanya GET health/login dan memastikan /api/me anonim401. SMOKE_AUTH_COOKIE opsional di environment operator untuk membaca akun sendiri; cookie/respons data tidak dicetak. Untuk login baru/operator, periksa role, password sementara dan data sekolah lewat UI. Jangan memakai seed atau transaksi simpan palsu untuk smoke produksi.
7. Input data nyata memakai checklist H-05 di bawah; periksa kalender/roster/akun bersama guru. Siapkan backup runner, tujuan terpisah, identity offline, pemilik dan notifikasi pada H-07, lalu restore drill nyata ke database baru. Sesudah H-03/H-06 lulus, mulai pilot H-08.

Manifest dan konfirmasi script hanya memeriksa konsistensi nilai yang diberikan. Keduanya tidak membuktikan bahwa host memang milik branch tersebut tanpa pemeriksaan dashboard dan tidak menggantikan persetujuan H-04. Nama/ID/URL aktual tidak dicontohkan sebagai fakta; isi dari akun yang diverifikasi.

## Environment dan pemilik

| Nilai/dashbord | Tempat dan pemilik yang harus diisi |
|---|---|
| APP_ENV | test lokal, development preview, production final; pemelihara |
| DATABASE_URL | Runtime pooled role minimum sesuai environment; pemilik Neon |
| DATABASE_MIGRATION_URL | Direct role owner/migrator pada mesin/runner operasi, bukan runtime publik; pemilik migrasi |
| BETTER_AUTH_SECRET | Secret acak kuat, berbeda antar lingkungan, server-only; pemilik auth |
| BETTER_AUTH_URL | Origin HTTPS deployment yang diverifikasi; pemilik Vercel |
| TRUSTED_ORIGINS | Contoh env disamakan dengan origin; guard efektif aplikasi memakai BETTER_AUTH_URL |
| RELEASE_ENV_FILE / RELEASE_MANIFEST_FILE / RELEASE_CONFIRM | Mesin operator, ignored, per operasi/branch; Toku/pemilik rilis |
| BOOTSTRAP_* | Temporer melalui environment aman; admin yang ditunjuk |
| SMOKE_BASE_URL / SMOKE_AUTH_COOKIE | Pemeriksaan read-only oleh operator; cookie temporer opsional |
| BACKUP_* / AGE identity / RCLONE_CONFIG | Environment runner dan identity offline terpisah; pemilik backup H-07 |
| Git repository / CI | URL, akses, pemilik dan receipt run nyata diisi saat akun siap |
| Neon / Vercel / storage | Project/region/domain, kuota, kontak pemilik dan penerus diisi pada H-01/H-02/H-04/H-07 |

Jangan menggunakan NEXT_PUBLIC_ untuk credential, menyimpan URL/password/dump/identity dalam Git, atau memberi guru akses owner dashboard. Role sekolah admin berbeda dari owner provider.

## Checklist H-05

- Nama/lokasi/timezone sekolah benar dan konfigurasi sintetis tidak tersisa.
- Periode, kelas, grade, pola weekdays/libur/hari tambahan sesuai sekolah; tanggal akhir eksklusif diperiksa.
- Daftar siswa diverifikasi berdasarkan kode unik, nama/NIS/NISN opsional dan tanggal efektif; nama sama sah. Roster sebelum/pada/sesudah tanggal masuk/keluar dicek.
- Dua akun guru aktif masing-masing milik orangnya sendiri, password sementara sudah diganti, kelas utama sesuai rolling; admin aktif cadangan disiapkan.
- Rekap/Excel/print dibandingkan dengan daftar; format internal disetujui pada H-06. Signature tetap ruang kosong sampai pejabat nyata mengisinya.
- Pemilik backup/insiden/penerus, akses dashboard, notifikasi dan restore drill dicatat. Jangan mencatat credential di checklist.

## Rollback dan kuota

Untuk regresi aplikasi, hentikan write bila ada risiko pada records, pilih deployment terakhir yang cocok dengan schema dan secret aktif, lalu rollback/promotion oleh operator. [Vercel rollback](https://vercel.com/docs/instant-rollback) pada Hobby memakai deployment sebelumnya dan membawa konfigurasi build lama; periksa environment/secret/compatibility. Rollback aplikasi tidak mengembalikan database. Migrasi destruktif tidak dijalankan otomatis; schema berubah memakai rencana kompatibilitas atau forward fix. Bila data rusak, gunakan runbook restore ke DB baru, revoke sesi, verifikasi dan rekonsiliasi, bukan menimpa history.

Pemilik memeriksa compute/storage/egress/connections Neon, penggunaan function/bandwidth/build Vercel, storage30 backup dan umur salinan terbaru. Ambang mengikuti dashboard/plan aktual; angka kuota dapat berubah. Catat latensi dingin/hangat provider dan masalah pilot terpisah dari VALIDATION.md. Perubahan plan/biaya memerlukan keputusan Toku, tidak otomatis diaktifkan.
