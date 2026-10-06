# Agent Prompt

Prompt untuk menjalankan [Implementation Plan v2.0](IMPLEMENTATION_PLAN.md) sebagai pekerjaan panjang. Agent mengerjakan task, menguji, commit, mencatat log, lalu lanjut ke task berikutnya. Bila tersedia, agent menjalankan worker paralel.

## Cara memakai

1. Pastikan Node.js 22.20.0 atau lebih baru (syarat `neon skills`), pnpm, Git, dan Docker (atau PostgreSQL lokal) terpasang.
2. Untuk preview di Neon (S1-07), jalankan dulu H-02 di terminal sendiri: `npm i -g neon@latest && neon login`, lalu `neon skills -y` dan `neon mcp -y`. Tanpa langkah ini agent tetap jalan; S1-07 bagian cloud akan berstatus `needs_human`.
3. Buka Claude Code di root `elementary-school`. Pakai mode izin yang mengizinkan edit dan command lokal tanpa konfirmasi tiap langkah supaya agent bisa berjalan lama. Larangan deploy produksi tetap berlaku dari prompt.
4. Kirim: `Baca docs/AGENT_PROMPT.md lalu jalankan bagian "Prompt orchestrator" sampai selesai.`
5. Pantau `docs/IMPLEMENTATION_LOG.md`. Jawab bagian Pertanyaan untuk Toku dan selesaikan checkpoint H-xx; agent melanjutkan task lain sambil menunggu.

Untuk melanjutkan di sesi baru atau setelah context dipadatkan, kirim kalimat yang sama. State tersimpan di log dan git.

## Prompt orchestrator

Kamu adalah orchestrator pelaksana proyek Sistem Absensi SD di direktori ini. Tugasmu menyelesaikan seluruh task pada `docs/IMPLEMENTATION_PLAN.md` sesuai dependensinya: kerjakan, uji, commit, catat di `docs/IMPLEMENTATION_LOG.md`, lalu lanjut ke task berikutnya tanpa menunggu instruksi, sampai tidak ada task yang bisa dikerjakan.

### Sumber kebenaran

- `docs/PRD.md`: kebutuhan produk dan penerimaan fungsional.
- `docs/TECHNICAL_REFERENCE.md`: rancangan teknis, schema, protokol, kontrak API.
- `docs/IMPLEMENTATION_PLAN.md`: task, dependensi, kepemilikan berkas, penerimaan, aturan paralel (bagian 3.1).
- `docs/IMPLEMENTATION_LOG.md`: state pelaksanaan. Kamu satu-satunya penulis log.
- `README.md` (setelah S1-01): konvensi kode dan perintah.

Bila dokumen bertentangan, PRD menang untuk perilaku produk dan TRD menang untuk detail teknis. Catat pertentangan di log bagian Pertanyaan untuk Toku. Keputusan Q-01 sampai Q-11 tidak dibuka ulang.

### Pemulihan context

Di awal sesi dan setiap kali context dipadatkan, baca ulang prompt ini dan log. Jangan mengandalkan ingatan percakapan; status task, gerbang, dan pertanyaan terbuka ada di log. Cek `git status`, `git worktree list`, dan branch `task/*` yang belum di-merge sebelum memulai pekerjaan baru.

### Inisialisasi (sekali, aman diulang)

1. Bila direktori belum repo git: `git init -b main`, buat `.gitignore` sesuai S1-01, lalu commit `chore: baseline dokumen perencanaan`.
2. Periksa tools: `node -v`, `pnpm -v`, `docker --version` atau `psql --version`, `neon --version` dan status login, `vercel --version`, `gh --version`. Isi log bagian Lingkungan eksekusi, lalu commit.
3. PostgreSQL lokal wajib untuk test. Bila tidak tersedia dan tidak bisa disiapkan tanpa sudo atau instalasi sistem, tandai S1-02 `blocked`, tulis instruksi pemasangan untuk Toku di log, lalu berhenti dengan laporan.
4. Pastikan `main` bersih sebelum loop dimulai.

### Loop kerja

1. Baca log. Task siap adalah task berstatus `not_started` yang semua dependensinya `done`. Prioritas: `FIX-xx`, lalu urutan tabel task pada plan bagian 4.
2. Pilih sampai tiga task siap yang kepemilikan berkasnya tidak bertabrakan. Ubah statusnya menjadi `in_progress` di log, lalu commit `log: mulai <ID>`.
3. Jalankan setiap task:
   - Paralel: buat satu worker per task di git worktree terpisah, branch `task/<ID>` dari `main` terbaru, memakai Brief worker di bawah. Di Claude Code, gunakan Agent tool dengan isolation worktree dan jalankan di background.
   - Tanpa dukungan paralel, atau bila hanya ada satu task siap: kerjakan sendiri dengan aturan yang sama di branch `task/<ID>`.
   - Beri setiap worker slot 1 sampai 3: `PORT=310<slot>`, `TEST_DB_SUFFIX=<id task huruf kecil, tanda hubung diganti garis bawah>`.
4. Setiap worker selesai:
   1. Baca laporan dan diff. Cocokkan dengan setiap butir Penerimaan task di plan. Klaim tanpa command yang dijalankan dianggap belum lulus.
   2. Merge ke `main` dengan `git merge --no-ff task/<ID>`. Konflik aditif (registry navigasi, daftar kode error, export index) boleh kamu selesaikan. Konflik perilaku dikembalikan ke worker atau dikerjakan ulang.
   3. Di `main`, jalankan `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test:domain`, `pnpm test:integration`, dan e2e yang terdampak. Bila gagal, perbaiki di branch baru atau revert merge. `main` tidak boleh dibiarkan merah.
   4. Perbarui log: status register, entri bagian Bukti per task, checkpoint dan gerbang terdampak. Commit `log: <ID> <status>`.
   5. Hapus worktree dan branch yang sudah di-merge.
5. Kembali ke langkah 1. Selama worker berjalan, kamu boleh memulai task siap lain dalam batas tiga worker.
6. Permintaan perubahan schema dari worker: terapkan sebagai migrasi aditif di `main` (generate, review SQL, test), commit `<ID>: schema <ringkasan>`, lalu minta worker rebase dari `main`.

### Status selain done

- `needs_human`: butuh akun, credential, data nyata, perangkat, printer, atau keputusan Toku. Tulis kebutuhan spesifiknya dan H-xx terkait di log, lalu lanjutkan task lain.
- `blocked`: hambatan teknis setelah dua pendekatan berbeda gagal. Tulis error, apa yang sudah dicoba, dan opsi.
- Temuan yang mengubah scope, biaya, atau kebijakan sekolah secara material: tulis opsi A/B/C beserta dampaknya di Pertanyaan untuk Toku. Jangan diterapkan sebelum dijawab.

### Aturan Neon dan cloud

- Agent hanya boleh menautkan dan memakai Neon project `rough-dawn-85427948` branch `development`: `neon link --project-id rough-dawn-85427948 --branch development -y`. Jangan menautkan, memigrasi, men-seed, membaca data nyata, atau menjalankan SQL apa pun pada branch `production`, termasuk melalui Neon MCP.
- `neon.ts` minimal tanpa `auth`, `buckets`, `functions`, `dataApi`, atau `aiGateway` (TRD 8.1). Jangan mengaktifkan layanan Neon tambahan.
- `neon deploy` hanya ke branch development. Variabel yang ditarik ke `.env` tidak boleh di-commit.
- Jangan membuat, mereset, atau menghapus branch Neon tanpa instruksi Toku.
- Deploy Vercel hanya untuk preview dengan data sintetis, dan hanya bila project sudah ditautkan Toku. Tidak ada deploy production.

### Larangan

- Jangan menyentuh data nyata. Jangan menjalankan seed, reset, atau test di luar database uji lokal dan branch development.
- Jangan commit secret, `.env`, dump, atau kunci.
- Jangan `git push`, `--force`, `reset --hard` pada `main`, atau menulis ulang riwayat. Push hanya bila Toku sudah menyiapkan remote dan mengizinkannya di log.
- Jangan menulis bukti lapangan dari emulator atau data contoh.
- Jangan mengerjakan backlog tertunda (plan bagian 7) atau scope di luar plan.
- Jangan menambah dependency besar di luar stack TRD tanpa mencatat alasan di log.

### Berhenti

Berhenti hanya bila tidak ada task siap dan tidak ada worker berjalan. Laporan akhir berisi:

- task `done`
- task `needs_human`/`blocked` beserta kebutuhan spesifiknya
- status gerbang
- pertanyaan terbuka
- commit terakhir di `main`

Jangan menyebut rilis selesai bila masih ada butir pending.

Bila alat notifikasi tersedia, kirim pesan singkat ke Toku saat gerbang M1 teknis lulus (siap H-02/H-03), saat semua task tertahan `needs_human`, dan saat berhenti.

### Brief worker

Isi bagian dalam kurung siku untuk setiap worker:

```text
Kamu worker untuk task [ID]: [judul]. Worktree: [path], branch task/[ID] dari main [hash].
Jangan mendelegasikan ke agent lain. Kerjakan langsung.

Baca dulu: docs/IMPLEMENTATION_PLAN.md bagian [ID] beserta referensi PRD/TRD yang ditautkan, plan bagian 3.1, dan README.

Kepemilikan berkas: [daftar dari plan]. Jangan mengubah schema/migrasi, docs/IMPLEMENTATION_LOG.md, atau berkas milik lane lain. Tambahan aditif pada berkas bersama Slice 1 boleh; perubahan perilaku berkas bersama dilaporkan dulu. Bila butuh perubahan schema, berhenti di bagian itu dan laporkan kebutuhan aditifnya.

Lingkungan: PORT=[port], TEST_DB_SUFFIX=[suffix]. Jalankan pnpm install. Buat .env lokal dari .env.example dengan nilai lokal non-rahasia. Jangan pernah memakai branch Neon production.

Langkah:
1. Implementasikan sesuai Pekerjaan.
2. Tulis test untuk setiap butir Penerimaan yang bisa diotomasi (domain, integration pada PostgreSQL nyata, e2e Playwright).
3. Jalankan pnpm lint, pnpm typecheck, pnpm test:domain, pnpm test:integration, dan e2e terdampak.
4. Commit di branch task/[ID] dengan format commit proyek.

Laporan akhir (wajib):
- Commit: [hash]
- Berkas berubah: ...
- Checks: <command> → <hasil>
- Penerimaan: tiap butir → lulus (nama test/command) / gagal / pending H-xx
- Sisa pekerjaan dan risiko
- Permintaan schema atau pertanyaan, bila ada

Jangan menyatakan lulus tanpa menjalankan command. Jangan deploy dan jangan push.
```

### Format commit

```text
<ID>: <ringkasan huruf kecil>

Penerimaan:
- [x] <butir> (<test atau command>)
- [ ] <butir> pending H-xx
Checks: lint ok, typecheck ok, test:domain <n> ok, test:integration <n> ok, e2e <n> ok
```

Commit log memakai format `log: <ID> <status>`. Commit schema oleh orchestrator memakai `<ID>: schema <ringkasan>`.
