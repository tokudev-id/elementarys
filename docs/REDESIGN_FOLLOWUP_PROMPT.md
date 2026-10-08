# Prompt Lanjutan Redesign: Pagination, Form Terpisah, Validasi, Card, Sticky Nav

Dibuat 8 Oktober 2026 setelah audit ulang `main` @ `b26c76f` (UI-R0, UI-R1, UI-R2 sudah di-merge). Acuan: [DESIGN.md](../DESIGN.md) (sudah diperbarui dengan aturan card, sticky nav, pagination, form, dan validasi), [REDESIGN_BRIEF.md](REDESIGN_BRIEF.md), [redesign/IMPLEMENTATION.md](redesign/IMPLEMENTATION.md).

## Cara memakai

Buka Claude Code di root repo, lalu kirim:

> Baca `docs/REDESIGN_FOLLOWUP_PROMPT.md` lalu jalankan bagian "Prompt" sampai semua task selesai.

Untuk melanjutkan di sesi baru, kirim kalimat yang sama. State ada di `docs/IMPLEMENTATION_LOG.md` dan git.

---

## Prompt

Kamu melanjutkan redesign UI aplikasi absensi dan manajemen SD ini. UI-R0 sampai UI-R2 sudah di-merge, tapi hasilnya belum memenuhi standar admin panel yang diminta Toku. Tugasmu menyelesaikan task UI-F1 sampai UI-F4 di bawah, lalu UI-R3 dan UI-R4 dari brief, semuanya mengikuti aturan wajib di bawah.

### Sumber kebenaran

1. `DESIGN.md`: aturan visual dan pola komponen. Bagian "Card sebagai wadah data", "Tabel data", "Form", dan "Validasi form" adalah aturan baru dan **mengalahkan** hasil implementasi UI-R0–R2 bila berbeda.
2. Dokumen ini: temuan audit, daftar halaman, dan aturan validasi per form.
3. `docs/REDESIGN_BRIEF.md`: spesifikasi halaman untuk UI-R3/UI-R4.
4. `docs/AGENT_PROMPT.md`: konvensi kerja (branch `task/<ID>`, commit, merge `--no-ff`, log, status `needs_human`/`blocked`). Ikuti konvensi itu.

Aturan bisnis, protokol versi/konflik, audit, guard peran, dan format ekspor/cetak tidak berubah. Perubahan kontrak zod hanya yang disebut di bagian Validasi.

### Aturan wajib (berlaku untuk semua halaman, termasuk UI-R3/R4)

1. **Navbar sticky.** Topbar `position: sticky; top: 0` di semua breakpoint. Sidebar desktop dan rail tablet tetap sticky setinggi layar. Bottom nav HP tetap fixed.
2. **Semua data di dalam card.** Tabel, list card, ringkasan detail, timeline, grid kalender, grid rekap, checklist, KPI, form section, dan daftar audit masing-masing berada dalam card. Satu daftar = satu card berisi header, toolbar, isi, dan footer pagination. Tidak ada data atau form langsung di latar halaman.
3. **Semua daftar dipaginasi di server** dengan state di URL dan footer pagination standar (lihat `DESIGN.md`). Pengecualian hanya: roster input absensi, grid rekap satu kelas per bulan, dan grid kalender satu bulan.
4. **Tidak ada form tambah/ubah di halaman list atau di isi tab detail.** Form besar memakai halaman `/new` dan `/[id]/edit`. Aksi kecil (≤ 4 field) memakai dialog (bottom sheet di HP) yang dibuka dari tombol. Halaman list dan detail read-only.
5. **Validasi di semua input** sesuai `DESIGN.md` bagian Validasi form dan tabel aturan di bawah: skema zod bersama, `noValidate`, error inline Bahasa Indonesia, fokus ke error pertama, error server dipetakan ke field.

### Temuan audit (main `b26c76f`, build lokal, viewport 1440/768/390)

| # | Area | Temuan | Bukti |
|---|---|---|---|
| A1 | Shell | Topbar `position: static`: setelah scroll, judul halaman, breadcrumb, dan menu user hilang di semua breakpoint. | `/students` 1440 setelah scroll 1429px: `header.shell-topbar` top −1429 |
| A2 | Shell | Tombol "Ciutkan" di atas menu sidebar, menjadi item pertama yang terlihat. | Semua halaman desktop |
| A3 | Detail | Link "Kembali ke siswa/guru/kelas" duplikat dengan breadcrumb. | `/students/[id]`, `/teachers/[id]`, `/classes/[id]` |
| A4 | Tabel | Header kolom aksi terpotong jadi "Aks / i". | Siswa, Guru, Kelas, detail Kelas |
| A5 | Tabel | Toolbar filter, tabel, dan pagination tiga blok terpisah; pagination di luar card. | Siswa, Guru, Kelas |
| A6 | Tabel | Filter harus ditekan "Tampilkan"; "Urutkan" dan "Per halaman" ada di toolbar. Di HP, 5 field filter bertumpuk ±400px sebelum baris data pertama. | `/students` 390 |
| A7 | Tabel | Baris 59–69px dengan garis pemisah gelap. NISN kosong ditulis "Belum diisi" berulang. | `/students` 1440 |
| A8 | Pagination | Nomor aktif rata kiri di kotak biru 44px, teks "Hal 1 dari 3" duplikat dengan nomor. | Semua daftar |
| A9 | Header | Aksi header terpotong di HP ("Naik kelas / penempatan" keluar layar). | `/students` 390 |
| A10 | Tahun ajaran | Form tambah dan form edit setiap tahun tampil inline di halaman list, tombol primary full width, tanpa card, tanpa pagination. | `/academic-years` |
| A11 | Kalender | Form hari rutin (7 checkbox) dan form pengecualian inline di bawah grid. Daftar pengecualian berupa teks polos. Judul bulan mentah "2026-10". | `/calendar` |
| A12 | Audit | Daftar teks polos tanpa card, kode aksi mentah (`report.export.xlsx`), UUID mentah, pagination hanya "Catatan berikutnya", select per halaman satu baris penuh. Tinggi 3850px. | `/audit` |
| A13 | Rekap | Belum dimigrasi: semua kelas ditumpuk, 8061px desktop, 12933px HP. | `/reports` |
| A14 | Detail guru | Tab "Kelas utama" dan "Akun & akses" berisi form inline (`TeacherClassesForm`, `AccountAccessForm`, `TeacherAccountForm`). | `src/app/teachers/[teacherId]/detail.tsx` |
| A15 | Detail | Tab detail bergaya segmented full width, berbeda dengan tab underline di list Guru. Tombol aksi CTA di dalam card ringkasan Kelas; judul "Siswa aktif" di luar card. | Detail Siswa/Guru/Kelas |
| A16 | Absensi HP | Di 390×844 hanya 3 siswa terlihat: header (judul, badge, tombol Riwayat full width, stepper tanggal, filter, teks bantu) ±390px, ditambah sticky bar dan bottom nav. Roster scroll di dalam area sendiri (nested scroll). | `/attendance/[id]` 390 |
| A17 | Absensi | Stepper tanggal memakai input date native dan tombol ikon kalender terpisah (dua picker). Track progress 0% berwarna abu gelap seperti terisi. Ikon "Riwayat" menempel ke teks. Link "Kembali ke daftar kelas" di bawah sticky bar. | `/attendance`, `/attendance/[id]` |
| A18 | Pengaturan | Checklist dan form tanpa card. Banner sintetis memakai judul "Belum ada data" (salah state). Zona waktu berupa input teks bebas. | `/settings` |
| A19 | Validasi | Hanya validasi bawaan browser: bubble berbahasa browser ("Please fill out this field."), tanpa error inline, tanpa `aria-invalid` di client, tanpa penanda wajib. Banyak skema zod tanpa pesan kustom, sehingga error server berbahasa Inggris (contoh `teacherProfile.fullName.min(1)`). NIS/NISN menerima teks bebas 64 karakter. | Probe submit kosong `/students/new`, `/teachers/new`, `/classes/new` |
| A20 | Beranda | `/` masih redirect ke `/attendance` (UI-R3 belum jalan). | — |

### Matriks halaman

Kolom "Form" menunjukkan ke mana form harus dipindah.

| Halaman | Daftar & pagination | Card | Form |
|---|---|---|---|
| `/` Beranda admin (UI-R3) | "Belum dicatat hari ini" paginasi 10 | KPI + daftar | — |
| `/attendance` | Card kelas; >12 kelas → paginasi 12 | Ya | — |
| `/attendance/[id]` | Pengecualian (roster utuh) | Roster dalam card | Koreksi: alasan di card; batalkan catatan: dialog |
| `/attendance/[id]/history` | Paginasi 10 revisi | Ya | — |
| `/reports` (UI-R3) | Pengecualian (satu kelas) | KPI + tabel | Filter di toolbar |
| `/students` | Sudah ada; rapikan A4–A9 | Satu card | `/students/new`, `/[id]/edit` |
| `/students/[id]` | Riwayat penempatan paginasi 10 | Ya | Pindah/tutup/arsip: dialog (sudah) |
| `/students/promote` | Pratinjau siswa paginasi 25 dengan "pilih semua di semua halaman" | Ya | Wizard (sudah) |
| `/teachers` + tab Akun tanpa profil | Keduanya paginasi | Satu card per tab | `/teachers/new`, `/[id]/edit` |
| `/teachers/[id]` | — | Ya | Kelas utama, ubah akses, tautkan/buat akun, reset password: **dialog**; tab hanya read-only + tombol |
| `/classes` | Sudah ada | Satu card | `/classes/new`, `/[id]/edit` |
| `/classes/[id]` | Siswa aktif paginasi 25 | Ringkasan + daftar | CTA pindah ke page header |
| `/academic-years` | **Baru**: tabel paginasi | Satu card | `/academic-years/new`, `/[id]/edit` |
| `/academic-years/rollover` | Daftar kelas/pratinjau paginasi 25 | Ya | Aktivasi: dialog konfirmasi |
| `/calendar` | Pengecualian bulan ini: tabel paginasi 10 | Grid + hari rutin + pengecualian | Hari rutin: dialog "Ubah hari rutin"; pengecualian: dialog dari tombol "Tambah pengecualian" atau klik tanggal; hapus: dialog konfirmasi |
| `/audit` | Tabel paginasi + "Sebelumnya" (cursor `before`) | Satu card | Detail diff: sheet kanan |
| `/settings` | — | Card checklist + card form | Halaman form (pengecualian aturan 4) |
| `/setup` | — | Card checklist | — |
| `/change-password`, `/login` | — | Card terpusat | Form di card |

### Task

Kerjakan berurutan F1 → F2. F3 dan F4 boleh paralel setelah F2 di-merge (kepemilikan berkas tidak bertabrakan). Lalu UI-R3 dan UI-R4. Tambahkan baris task baru di register log, dan ubah status UI-R2 menjadi `done` dengan catatan "dilanjutkan oleh UI-F1–F4".

#### UI-F1 Shell, card, dan kit tabel

**Kepemilikan**: `src/components/app-shell.tsx`, `page-header.tsx`, `data-table*.tsx`, `mobile-card-list.tsx`, `list-filters.tsx`, `master-list.tsx`, `src/components/ui/card.tsx`, `src/styles/shell.css`, `src/styles/components.css`, `tokens.css`.

1. Topbar sticky (A1), "Ciutkan" pindah ke bawah sidebar (A2). Breadcrumb di topbar jadi satu-satunya navigasi balik di ≥ 640. Di HP, topbar menampilkan tombol ‹ ke halaman induk pada halaman detail/form (A3).
2. Komponen `DataCard`: header (judul, jumlah, aksi), toolbar, isi, dan footer, sesuai anatomi di `DESIGN.md`. `MasterList` dan semua daftar memakai `DataCard`.
3. Toolbar:
   - Search debounce 300ms tersinkron ke URL. Filter select diterapkan langsung tanpa tombol "Tampilkan".
   - Sort lewat header kolom (`aria-sort`). "Per halaman" pindah ke footer.
   - Di HP: search + tombol "Filter (n)" yang membuka sheet (A6).
4. Tabel:
   - Baris 48–52px, border `--border`, kolom aksi 56px tanpa header visual (A4).
   - Nilai kosong ditampilkan "—" (A7).
5. Pagination:
   - Nomor aktif terpusat 36×36, hapus "Hal x dari y" di desktop (A8).
   - Ganti halaman scroll ke atas card.
   - Di HP: "1–25 dari 60" dan ‹ ›.
6. Page header di HP: aksi sekunder masuk menu `⋯`. Aksi utama berupa tombol penuh atau ikon + label, tidak boleh terpotong (A9).
7. Halaman detail: tab underline rata kiri, konsisten dengan list. Badge status sejajar judul. CTA di page header (A15).
8. Perbarui `/component-preview` dengan `DataCard`, pagination, dan sheet filter.

**Selesai bila** Siswa, Guru (dua tab), Kelas, dan detail Kelas memakai `DataCard`; topbar tetap terlihat setelah scroll di 1440/768/390 (diuji e2e lewat `boundingBox().y === 0` setelah scroll); tidak ada teks header terpotong.

#### UI-F2 Fondasi validasi form

**Kepemilikan**: `src/components/field.tsx`, `select-field.tsx`, `form-section.tsx`, `form-actions.tsx`, `use-form-guard.ts`, `use-mutation.ts`, komponen form baru (`form-field`, `textarea-field`, `form-error-summary`), `src/contracts/*.ts` (pesan dan aturan saja), `src/lib/http-client.ts`.

1. Buat hook `useZodForm(schema, { defaultValues, onSubmit })`, atau pakai `react-hook-form` + `@hookform/resolvers/zod` bila lebih sederhana; catat keputusannya di log. Perilaku wajib sesuai `DESIGN.md` bagian Validasi form: blur lalu live, submit memvalidasi semua, fokus dan scroll ke error pertama, ringkasan bila ≥ 3 error, error server (`fieldErrors`) dipetakan ke field.
2. `Field`, `SelectField`, `TextareaField`, `CheckboxField`, dan `SwitchField` menerima `error` dan `required`. Penanda `*` dengan teks screen reader "wajib", dan penghitung karakter untuk textarea.
3. Semua `<form>` memakai `noValidate`.
4. Lengkapi semua skema zod dengan pesan Bahasa Indonesia, lalu tambahkan aturan baru dari tabel di bawah. Aturan baru berlaku saat menyimpan; data lama tetap bisa dibaca. Uji integration untuk aturan baru di server.
5. Terapkan pada form yang sudah dimigrasi: siswa new/edit, guru new/edit, kelas new/edit, dialog penempatan/tutup/arsip, reset password, login, dan ganti password.

**Selesai bila** submit kosong di setiap form tersebut menampilkan error inline Bahasa Indonesia tanpa bubble browser, fokus pindah ke field pertama, dan e2e mencakup minimal satu form per jenis (halaman, dialog, auth).

#### UI-F3 Daftar dan pagination untuk halaman tersisa

**Kepemilikan**: `src/app/academic-years/**`, `src/app/audit/**`, `src/app/attendance/[classId]/history/**`, `src/app/teachers/unlinked-list.tsx`, query/service terkait di `src/server/queries` dan `src/server/services/school-master.ts` (list tahun ajaran).

1. Tahun ajaran (A10):
   - Tabel paginasi (Label, Mulai, Selesai, Status, Aksi).
   - Halaman `/academic-years/new` dan `/academic-years/[id]/edit`.
   - Aksi header: "Tambah tahun ajaran", dan "Persiapan tahun berikutnya" di menu `⋯`.
2. Audit (A12):
   - Tabel paginasi dalam card: Waktu, Pelaku, Aksi (label Indonesia dari peta kode aksi), Entitas (label yang bisa dibaca; UUID di tooltip), Alasan.
   - Cursor `before` untuk "Sebelumnya".
   - Klik baris membuka sheet diff before/after per field, dengan JSON mentah di "Lihat data mentah".
   - Filter di toolbar; di HP lewat sheet.
3. Riwayat absensi dan Akun tanpa profil: paginasi dan `DataCard`.
4. Riwayat penempatan siswa, pratinjau promosi, dan pratinjau rollover: paginasi sesuai matriks. Pratinjau promosi tetap mengirim seluruh pilihan (lintas halaman) dalam satu transaksi.
5. `/attendance`: `DataCard` untuk grid kelas, paginasi bila > 12 kelas.

**Selesai bila** setiap daftar di matriks (kecuali pengecualian) punya footer pagination dan state URL; e2e menguji pindah halaman di audit dan tahun ajaran dengan data > 1 halaman.

#### UI-F4 Form inline → dialog atau halaman, dan perbaikan absensi

**Kepemilikan**: `src/app/teachers/[teacherId]/**`, `src/app/teachers/forms.tsx`, `account-panel.tsx`, `src/app/calendar/**`, `src/app/settings/**`, `src/app/setup/**`, `src/app/academic-years/rollover/**`, `src/app/attendance/**` (kecuali history), `src/app/change-password/**`, `src/app/login/**`.

1. Detail guru (A14): tab menampilkan data read-only plus tombol "Ubah kelas utama", "Ubah akses", "Tautkan akun"/"Buat akun", dan "Reset password", masing-masing membuka dialog.
2. Kalender (A11):
   - Card grid bulan, dengan stepper bulan "‹ Oktober 2026 ›" (bukan "2026-10").
   - Card "Hari belajar rutin" read-only berisi chip hari, plus tombol "Ubah" yang membuka dialog.
   - Card "Pengecualian bulan ini" berupa tabel paginasi. Tambah, ubah, dan hapus lewat dialog. Klik tanggal di grid (admin) membuka dialog pengecualian untuk tanggal itu.
3. Pengaturan dan Persiapan (A18):
   - Card checklist dan card form.
   - Banner sintetis memakai state info dengan judul "Data uji".
   - Zona waktu jadi combobox (WIB Asia/Jakarta, WITA Asia/Makassar, WIT Asia/Jayapura di atas, lalu daftar IANA lengkap dengan pencarian).
   - Alasan muncul dan wajib hanya bila zona berubah.
4. Rollover: aktivasi lewat dialog konfirmasi; daftar dalam card.
5. Absensi (A16, A17):
   - Hapus nested scroll: roster ikut scroll halaman. Sticky bar tetap di bawah.
   - Di halaman input absensi HP, bottom nav disembunyikan supaya fokus ke tugas; topbar tetap sticky dengan tombol ‹.
   - Header ringkas: judul kelas + badge di satu baris; "Riwayat" jadi tombol ikon (dengan `aria-label` dan tooltip) di page header.
   - Stepper tanggal jadi satu kontrol "‹ Kamis, 8 Okt 2026 ›": label tanggal membuka picker, tanpa input date native terpisah.
   - Teks bantu dipindah ke tooltip/ikon info.
   - Target: di 390×844 minimal 6 baris siswa terlihat tanpa scroll.
   - Track progress berwarna `--surface-muted`. Ikon dan teks tombol diberi gap 8px.
   - "Kembali ke daftar kelas" dihapus (sudah ada breadcrumb/‹).
6. Login dan ganti password: card terpusat, toggle tampilkan password, field "Ulangi password baru".
7. Terapkan validasi UI-F2 ke semua form di kepemilikan task ini.

**Selesai bila** `grep` tidak menemukan komponen form tambah/ubah yang dirender langsung di halaman list atau isi `TabsContent`; kalender, pengaturan, guru, dan absensi lolos e2e; di absensi HP terlihat ≥ 6 siswa (diuji Playwright 390×844); skenario 5 ketukan UI-R1 tetap lulus.

#### UI-R3 dan UI-R4

Lanjutkan sesuai brief bagian 7.2, 7.9 (UI-R3), dan 7.8, 7.10, 7.11 (UI-R4, yang sebagian besar sudah tercakup F3/F4), dengan aturan wajib di atas. UI-R4 juga menghapus CSS lama yang tidak terpakai dan menjalankan kriteria penerimaan brief bagian 8.

### Aturan validasi per form

Tambahkan di kontrak zod (server dan client). Pesan di kolom kanan dipakai apa adanya. Kata "baru" menandai aturan yang belum ada di server.

| Form | Field | Aturan | Pesan |
|---|---|---|---|
| Login | Email | wajib, format email, ≤ 254 | "Isi email." / "Format email belum benar." |
| | Password | wajib | "Isi password." |
| Ganti password | Password saat ini | wajib | "Isi password saat ini." |
| | Password baru | 12–128, berbeda dari password saat ini (baru, client) | "Password minimal 12 karakter." / "Gunakan password yang berbeda." |
| | Ulangi password baru | sama dengan password baru (baru, client) | "Password belum sama." |
| Siswa | Nama lengkap | wajib, 2–200, mengandung huruf (baru) | "Isi nama siswa." / "Nama minimal 2 huruf." |
| | NIS | opsional; angka, titik, garis miring, strip; ≤ 30 (baru) | "NIS hanya boleh angka, titik, garis miring, atau strip." |
| | NISN | opsional; tepat 10 digit angka (baru) | "NISN harus 10 digit angka." |
| | Kode siswa (edit) | wajib, ≤ 64, huruf/angka/strip (baru) | "Kode hanya boleh huruf, angka, dan strip." |
| | Kelas awal | wajib | "Pilih kelas awal." |
| | Tanggal mulai | wajib, di dalam rentang tahun ajaran kelas terpilih | "Tanggal harus di dalam tahun ajaran {label}." |
| Penempatan/transfer | Kelas tujuan | wajib, berbeda dari kelas asal | "Pilih kelas tujuan yang berbeda dari kelas asal." |
| | Tanggal | wajib, di dalam tahun ajaran tujuan, setelah tanggal mulai penempatan asal (transfer) | "Tanggal harus setelah {tanggal mulai}." |
| | Alasan | wajib, 1–1000 | "Isi alasan perubahan." |
| Tutup penempatan | Tanggal | wajib, > tanggal mulai, ≤ akhir penempatan | "Tanggal harus setelah {mulai} dan sebelum {akhir}." |
| | Alasan | wajib, 1–1000 | "Isi alasan siswa keluar." |
| Arsip siswa | Alasan | wajib, 1–1000 | "Isi alasan arsip." |
| Guru | Nama lengkap | wajib, 2–200, mengandung huruf (baru) | "Isi nama guru." |
| Akun guru (buat) | Email | wajib, email, ≤ 254 | "Format email belum benar." |
| | Password sementara | 12–128 | "Password minimal 12 karakter." |
| | Ulangi password | sama (baru, client) | "Password belum sama." |
| | Peran | wajib | "Pilih peran akun." |
| Akun guru (tautkan) | Akun | wajib | "Pilih akun yang akan ditautkan." |
| Reset password | Password sementara + ulangi | 12–128, sama | seperti di atas |
| Kelas utama | Kelas | boleh kosong, maksimal sesuai kontrak | — |
| Kelas | Nama | wajib, 1–100; unik per tahun ajaran bila server menolak duplikat (petakan ke field) | "Isi nama kelas." / "Nama kelas sudah dipakai di tahun ajaran ini." |
| | Tingkat | wajib, 1–6 | "Pilih tingkat 1 sampai 6." |
| | Tahun ajaran | wajib | "Pilih tahun ajaran." |
| Tahun ajaran | Label | wajib, format `YYYY/YYYY` dengan tahun kedua = tahun pertama + 1 (baru) | "Gunakan format 2026/2027." |
| | Tanggal mulai | wajib | "Isi tanggal mulai." |
| | Berakhir sebelum | wajib, > tanggal mulai, rentang ≤ 400 hari (baru) | "Tanggal akhir harus setelah tanggal mulai." / "Satu tahun ajaran maksimal 400 hari." |
| Hari rutin | Hari | minimal 1 hari | "Pilih minimal satu hari belajar." |
| Pengecualian kalender | Tanggal | wajib, di dalam tahun ajaran | "Tanggal harus di dalam tahun ajaran {label}." |
| | Alasan | wajib, 1–300 | "Isi alasan, misalnya Libur Maulid Nabi." |
| Koreksi/isi ulang absensi | Alasan | wajib, 1–1000 | "Isi alasan koreksi." |
| Batalkan catatan | Alasan | wajib, 1–1000 | "Isi alasan pembatalan." |
| Pengaturan sekolah | Nama sekolah | wajib, 1–200 | "Isi nama sekolah." |
| | Lokasi | opsional, ≤ 300 | "Lokasi maksimal 300 karakter." |
| | Zona waktu | wajib, IANA valid (combobox) | "Pilih zona waktu." |
| | Alasan | wajib bila zona berubah, ≤ 1000 | "Isi alasan perubahan zona waktu." |
| Naik kelas (wizard) | Tahun/kelas tujuan | wajib | "Pilih kelas tujuan." |
| | Siswa | minimal 1 dipilih | "Pilih minimal satu siswa." |
| Filter audit | Dari/Sampai | opsional; Dari ≤ Sampai | "Tanggal awal harus sebelum tanggal akhir." |
| Filter rekap | Bulan | di dalam tahun ajaran terpilih | "Bulan di luar tahun ajaran {label}." |
| Filter absensi | Tanggal | ≤ hari ini sekolah (tombol › nonaktif di hari ini) | — |

Keunikan NIS dan NISN antar siswa **tidak** ditambahkan tanpa keputusan Toku. Catat sebagai pertanyaan di log bila dibutuhkan.

### Verifikasi setiap task

1. `pnpm lint`, `pnpm typecheck`, `pnpm test:domain`, `pnpm test:integration`, dan `pnpm test:e2e` (minimal spec terdampak, ditambah `mobile-sweep`, `shell`, dan `permissions`) hijau di branch dan setelah merge ke `main`.
2. Screenshot sesudah di 390, 768, dan 1440 untuk setiap halaman yang disentuh, disimpan di `docs/redesign/after/<task>/`. Bandingkan dengan temuan A1–A20 dan tulis di log temuan mana yang tertutup.
3. Cek otomatis yang ditambahkan ke e2e:
   - Topbar sticky setelah scroll.
   - Tidak ada scroll horizontal halaman.
   - Setiap halaman di matriks (kecuali pengecualian) punya elemen pagination.
   - Tidak ada `form` di halaman list.
   - Submit kosong menghasilkan `aria-invalid` dan tidak memunculkan bubble native (`form.noValidate === true`).
4. Pengukuran pagination 600 siswa diulang tanpa build/test lain berjalan bersamaan. Hasilnya dicatat di `docs/redesign/IMPLEMENTATION.md`.
5. Uji di HP nyata tetap checkpoint manusia (H-03). Jangan mengklaimnya dari automation.

### Laporan akhir

Setelah semua task selesai atau terhenti, tulis ringkasan di log: status tiap task, temuan A1–A20 yang tertutup atau masih terbuka, dan pertanyaan untuk Toku.
