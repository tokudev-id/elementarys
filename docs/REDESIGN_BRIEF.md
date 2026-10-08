# Brief Redesign UI/UX

Status: siap dikerjakan · Pemilik produk: Toku · Acuan visual: [DESIGN.md](../DESIGN.md)

## 1. Latar belakang

Secara fungsi aplikasi ini sudah lengkap: absensi, koreksi dan pembatalan, data master, penempatan dan naik kelas, kalender, rekap dan ekspor, serta audit. Validasi, versi optimistik, dan aksesibilitas dasar juga sudah benar. Masalahnya ada di tampilan dan alur, dan audit visual pada 8 Oktober 2026 (data demo, viewport 1440 dan 390) menemukan hal berikut.

| Area | Masalah |
|---|---|
| Shell | 11 menu sejajar di top nav. Menu harian, data master, pengaturan, dan akun dicampur. Di HP, nav memakan 3 baris sebelum konten. Tombol "Keluar" memakai gaya primary. Belum ada Beranda/dashboard (`navigation.ts`: `ready: false`). |
| Siswa | Form tambah ada di atas list. List hanya menampilkan nama dan kode, tanpa kelas atau status. Tanpa pagination: `listStudents` tanpa `LIMIT`, sehingga 50 siswa menghasilkan halaman setinggi ±7.000px. |
| Guru | Setiap guru merender 4 form inline (profil, kelas utama, akses, reset password). 2 guru menghasilkan halaman ±3.600px, dan field reset password terbuka di halaman list. |
| Kelas | Setiap kelas dirender sebagai form edit. |
| Detail siswa | 4 form ditumpuk tanpa ringkasan read-only. Arsip dan tutup penempatan sejajar dengan Simpan. |
| Absensi | ±145px per siswa (nama, kode, "Belum dicatat", legend mengulang nama, 4 tombol), sehingga kelas 30 siswa butuh ±4.400px scroll. Default Hadir tidak terlihat. Status tanpa warna. Konfirmasi hanya menampilkan total, bukan nama yang tidak hadir. |
| Rekap | Semua kelas dirender sekaligus (list total dan grid tanggal), ±8.600px. Legend berupa paragraf. Ekspor/cetak terselip di tengah. Tanpa angka ringkasan. |
| Audit | Pagination hanya "berikutnya/awal". JSON before/after mentah. Entitas tampil sebagai UUID. |
| Umum | Checkbox 44×44px visual. Semua tombol primary dan full width. Tanpa card atau surface. CSS tulisan tangan 762 baris di `globals.css`, Tailwind hampir tidak terpakai. |

## 2. Tujuan

1. Tampilan admin panel yang bersih dan konsisten, sesuai `DESIGN.md`.
2. Guru menyelesaikan absensi satu kelas 30 siswa (3 tidak hadir) dalam **≤ 6 ketukan** termasuk konfirmasi, tanpa scroll lebih dari 2 layar di HP 390px.
3. Semua halaman list memakai tabel atau list card dengan pagination server, dan form create/edit di halaman terpisah.
4. Nyaman di HP (360–639), tablet (640–1023), dan desktop (≥ 1024), tanpa scroll horizontal kecuali grid tanggal rekap.

## 3. Di luar lingkup

- Aturan bisnis, schema absensi, protokol versi/konflik, audit, dan format ekspor Excel/cetak tetap. Halaman cetak (`/reports/print`) hanya menyesuaikan font.
- Tidak ada fitur baru selain yang disebut di brief ini.
- Catatan per siswa untuk S/I (misalnya "demam") ditunda ke fase berikutnya karena butuh kolom baru di `attendance_entries`. Desain baris absensi tidak perlu menyiapkan tempat untuk catatan itu sekarang.
- Tanpa dark mode, logo, foto, atau ilustrasi.

## 4. Keputusan teknis

- Pasang shadcn/ui (Radix, Tailwind v4), `lucide-react`, `@tanstack/react-table`, `sonner`. Font Inter via `next/font`.
- Token warna di `globals.css` sesuai `DESIGN.md`, dipetakan lewat `@theme`. Hapus CSS lama secara bertahap per halaman yang dimigrasi. Pertahankan blok `@media print` dan `@page`.
- Komponen bersama di `src/components/ui/` (primitif shadcn) dan `src/components/` (komposit: `AppShell`, `PageHeader`, `DataTable`, `DataTablePagination`, `DataTableToolbar`, `MobileCardList`, `StatusBadge`, `KpiCard`, `FormSection`, `FormActions`, `ConfirmDialog`, `EmptyState`).
- `Dialog` yang ada saat ini (focus trap, penanganan visual viewport) diganti dengan Dialog/Sheet Radix. Perilaku resize keyboard HP harus tetap lolos test.
- Hook `useMutation` dan `MutationFeedback` tetap dipakai untuk komunikasi API. Hanya presentasinya yang berubah (toast dan error inline).
- **Kompatibilitas test**: label aksesibel dan `data-testid` yang dipakai `tests/e2e` dipertahankan bila elemennya masih ada. Bila alur berubah (misalnya form pindah ke `/new`), perbarui spec terkait di commit yang sama. `pnpm lint`, `typecheck`, `test:domain`, `test:integration`, dan `test:e2e` harus hijau di akhir setiap fase.

## 5. Perubahan backend minimal

Halaman list membutuhkan pagination dan kolom tambahan. Tambahkan secara aditif tanpa mengubah perilaku endpoint mutasi.

| Fungsi / endpoint | Perubahan |
|---|---|
| `listStudents` + `GET /api/students` | Parameter `page`, `pageSize` (10/25/50, default 25), `q`, `classId`, `status` (`active`/`archived`/`all`), `sort` (`name`, `code`, `class`). Kembalian `{ items, total, page, pageSize }`. `items` menyertakan kelas aktif (nama, id) dari penempatan yang berlaku pada tanggal sekolah. |
| `listTeachers` + `GET /api/teachers` | Pagination sama. `items` menyertakan email akun, peran, status akses, wajib ganti password, dan nama kelas utama. |
| `listClasses` + `GET /api/classes` | Filter `yearId`, `grade`, `status`, plus jumlah siswa aktif dan guru utama. Pagination opsional (data kecil), tapi kontraknya tetap sama. |
| `getDashboard` | Tambahkan agregat untuk Beranda admin: total siswa aktif, kelas sudah/belum dicatat hari ini, total H/S/I/A hari ini, dan persentase hadir. |
| Audit | Tetap cursor. Tambahkan dukungan `before` cursor agar ada tombol "Sebelumnya". Kirim label entitas yang bisa dibaca (nama siswa/kelas/guru) bersama `entityId`. |

Pemanggil lain (`/students/promote`, form penempatan, rekap) yang membutuhkan daftar penuh memakai fungsi terpisah, misalnya `listStudentOptions`, supaya tidak ikut terpotong pagination.

## 6. Peta halaman baru

| Rute | Isi | Peran |
|---|---|---|
| `/` | Beranda. Admin: dashboard. Guru: redirect ke `/attendance`. | semua |
| `/attendance` | Absensi hari ini (daftar kelas) | semua |
| `/attendance/[classId]` | Input absensi | semua |
| `/attendance/[classId]/history` | Riwayat catatan | semua |
| `/reports` | Rekap bulanan | semua |
| `/students`, `/students/new`, `/students/[id]`, `/students/[id]/edit` | CRUD siswa | baca: semua, tulis: admin |
| `/students/promote` | Wizard naik kelas | admin |
| `/teachers`, `/teachers/new`, `/teachers/[id]`, `/teachers/[id]/edit` | CRUD guru dan akun | baca: semua, tulis: admin |
| `/classes`, `/classes/new`, `/classes/[id]`, `/classes/[id]/edit` | CRUD kelas | baca: semua, tulis: admin |
| `/academic-years`, `/academic-years/new`, `/academic-years/[id]/edit`, `/academic-years/rollover` | Tahun ajaran | admin tulis |
| `/calendar` | Kalender akademik | semua, edit admin |
| `/settings` | Pengaturan sekolah (tab Identitas, Zona waktu) | admin |
| `/setup` | Checklist persiapan | admin |
| `/audit` | Audit | admin |
| `/account/password` | Ganti password (dari menu user). `/change-password` di-redirect ke sini. | semua |

## 7. Spesifikasi per halaman

### 7.1 Shell

Ikuti `DESIGN.md` bagian Breakpoint dan layout shell.

- **Topbar**:
  - Desktop: breadcrumb di kiri. Di kanan: tanggal sekolah ("Kamis, 8 Okt 2026") dengan tooltip zona waktu, lalu avatar yang membuka menu user (nama, peran, Ganti password, Keluar).
  - HP: nama sekolah dipotong dengan elipsis, plus avatar.
- **Penanda data sintetis**: bila konfigurasi sintetis, tampilkan badge "Data uji" di topbar, bukan di nama sekolah.

### 7.2 Beranda admin (`/`)

1. KPI: Kehadiran hari ini (%), Kelas sudah dicatat (x/y), Siswa aktif, Tidak hadir hari ini (S/I/A).
2. Card "Belum dicatat hari ini": daftar kelas dengan tombol "Buka".
3. Bila setup belum lengkap, card checklist persiapan muncul paling atas.
4. Pintasan: **Rekap bulan ini** (link menonjol, karena Rekap tidak ada di bottom nav admin di HP), Tambah siswa, Kalender.

Bila hari ini libur, tampilkan banner "Hari ini libur: <alasan>", dan KPI absensi berganti menjadi "—".

### 7.3 Absensi hari ini (`/attendance`)

- Header: "Absensi" dan tanggal, dengan stepper ‹ tanggal › untuk melihat hari lain.
- Progress ringkas: "4 dari 6 kelas sudah dicatat", ditampilkan sebagai progress bar.
- Grid card kelas: 1 kolom HP, 2 tablet, 3 desktop.
- Isi card kelas:
  - nama kelas
  - badge status (Sudah dicatat / Belum dicatat / Libur / Kelas kosong)
  - "10 siswa"
  - penanda kelas utama (ikon bintang dan teks "Kelas utama")
  - bila sudah dicatat, angka mini "8 H · 1 S · 0 I · 1 A"
  - tombol "Catat absensi" (primary) atau "Lihat" (secondary)
- Hapus teks "Jumlah hadir belum tersedia".

### 7.4 Input absensi (`/attendance/[classId]`): prioritas utama

**Header**
- Breadcrumb Absensi › Kelas 4 A.
- Judul kelas dan badge status sesi.
- Stepper tanggal: tombol ‹ ›, dan tanggal yang bisa diklik untuk membuka date picker. Maksimal tanggal sekolah hari ini, dan hari libur ditandai di picker.
- Link "Riwayat" (ikon jam).

**Toolbar roster**
- Search nama (tampil bila > 15 siswa).
- Filter chip: Semua (30) · Tidak hadir (3).
- Tombol "Semua hadir" untuk reset seluruh pilihan ke H.

**Baris siswa**

| Breakpoint | Layout | Tinggi |
|---|---|---|
| ≥ 400px | `[no] Nama lengkap / kode (13px muted)` di kiri, segmented `H S I A` di kanan | ≤ 64px |
| < 400px | Nama di baris 1, segmented lebar penuh di baris 2 | ≤ 96px |
| Tablet/desktop | Tabel: No, Nama, Kode, Status | baris 56px |

- Segmented adalah radio group. Tiap segmen ≥ 44×44px, berisi huruf tebal dan label kecil di bawah ("Hadir"). Bila sempit, label disembunyikan secara visual tapi tetap ada untuk screen reader.
- Default H terpilih (sesuai perilaku sekarang: yang tidak ditandai disimpan sebagai H).
- Pilihan S/I/A memberi latar soft status pada seluruh baris dan border kiri 3px berwarna status.
- Mode baca (sudah dicatat): segmented diganti badge status. Tombol "Koreksi" ada di header.
- Mode koreksi/isi ulang: field "Alasan koreksi" wajib, di atas roster, dengan teks bantu yang sudah ada.

**Keyboard (desktop)**
- Panah atas/bawah pindah siswa.
- `H`/`S`/`I`/`A` memilih status.
- `Ctrl+Enter` membuka konfirmasi.

**Action bar sticky bawah**
- Kiri: ringkasan live "27 Hadir · 1 Sakit · 1 Izin · 1 Alpa", dengan angka berwarna status dan teks tetap ada.
- Kanan: tombol "Simpan absensi".
- Di HP, ringkasan di baris atas dan tombol penuh di bawah. Bar tidak boleh menutupi baris terakhir (beri padding bawah pada roster).

**Konfirmasi** (dialog, atau bottom sheet di HP)
- Judul "Simpan absensi Kelas 4 A?" dan tanggal.
- Empat angka total.
- **Daftar nama yang tidak hadir beserta statusnya**, dikelompokkan S/I/A.
- Kalimat "Siswa lain dicatat Hadir."
- Alasan (bila koreksi).
- Tombol: Batal, Simpan.

**Setelah simpan**
- Toast "Absensi Kelas 4 A tersimpan".
- Halaman berganti ke mode baca dengan card ringkasan: total, "Dicatat oleh … pada …".
- Tombol "Kembali ke daftar kelas" dan "Kelas berikutnya ›" (kelas belum dicatat berikutnya).

**Pertahankan**: perilaku konflik 409, sesi habis 401, konfirmasi ganti tanggal saat ada draft, pembatalan catatan oleh admin (pindah ke menu `⋯` > "Batalkan catatan", dialog destructive dengan alasan), dan draft tidak hilang saat rotasi.

### 7.5 Siswa

**List `/students`**
- Header "Siswa", dengan aksi "Tambah siswa" dan menu `⋯` berisi "Naik kelas / penempatan".
- Toolbar: search (nama, kode, NIS), filter Kelas, filter Status (Aktif/Diarsipkan/Semua).
- Kolom: Nama (link), Kode, NIS, NISN, Kelas aktif, Status, aksi.
  - Tablet: Nama, Kode, Kelas, Status.
  - HP: card berisi nama dan badge, dengan meta "S-0047 · Kelas 5 A".
- Menu aksi: Lihat, Ubah, Pindah kelas, Arsipkan.

**Form `/students/new`**
- Section "Identitas": nama, NIS, NISN.
- Section "Penempatan awal": kelas, tanggal mulai, dengan catatan bahwa kode dibuat otomatis.
- Simpan, lalu ke detail.

**Detail `/students/[id]`**
- Header: nama, badge status, dan meta (kode · kelas aktif). Aksi: Ubah, `⋯` (Pindah kelas, Tutup penempatan, Arsipkan).
- Tab "Ringkasan": data identitas read-only dan kelas aktif.
- Tab "Riwayat penempatan": timeline vertikal (kelas · tahun, rentang tanggal dalam format "1 Jul 2026 – 30 Jun 2027", status dibatalkan).
- Tab "Kehadiran": ringkasan bulan berjalan H/S/I/A dan link ke rekap. Hanya tampilkan bila data bisa diambil dari query rekap yang ada. Jika tidak, tunda.
- Pindah kelas, Tutup penempatan, dan Arsip masing-masing dibuka di dialog (field dan teks bantu sama dengan form sekarang).

**Edit `/students/[id]/edit`**: nama, kode, NIS, NISN.

**Naik kelas `/students/promote`**: ubah menjadi wizard 3 langkah, dengan stepper di atas:
1. Pilih tahun dan kelas asal-tujuan.
2. Pratinjau tabel siswa beserta checkbox pengecualian.
3. Konfirmasi.

### 7.6 Guru

- **List**:
  - Kolom: Nama, Email akun, Peran, Kelas utama (maksimal 2 chip, "+n"), Status akun.
  - Filter: Status, Peran.
  - Akun tanpa profil ditampilkan sebagai tab kedua "Akun tanpa profil".
- **Detail**: tab "Profil", "Kelas utama" (checkbox list kelas tahun berjalan dan tombol simpan), dan "Akun & akses" (peran, status, tombol "Reset password" yang membuka dialog dengan field password sementara, tombol "Nonaktifkan akses" destructive). Bila belum punya akun, tab ini menampilkan form tautkan/buat akun.
- **New/Edit**: nama dan switch "Profil aktif", dengan teks bantu dampak nonaktif.

### 7.7 Kelas

- **List**: kolom Nama, Tingkat, Tahun ajaran, Guru utama, Jumlah siswa, Status. Filter Tahun ajaran (default tahun aktif), Tingkat.
- **Detail**: ringkasan, daftar siswa aktif (tabel kecil dengan link ke siswa), dan link "Catat absensi" / "Rekap kelas".
- **New/Edit**: nama, tingkat (select 1–6), tahun ajaran, switch Diarsipkan (edit saja). Tingkat dan tahun read-only bila sudah ada penempatan, beserta penjelasannya.

### 7.8 Tahun ajaran dan Kalender

- **Tahun ajaran**: tabel (Label, Mulai, Selesai, Status: Aktif/Arsip), form terpisah, dan "Persiapan tahun berikutnya" sebagai aksi header.
- **Kalender**:
  - Header dengan select tahun ajaran dan stepper bulan ‹ Oktober 2026 ›.
  - Grid bulan: sel hari belajar putih, libur abu dengan teks "Libur", pengecualian bertanda titik dan tooltip/teks alasan. Hari ini diberi outline primary.
  - Di HP: grid ringkas (angka dan titik status), dan ketuk tanggal untuk membuka sheet detail.
  - Admin: klik tanggal membuka sheet "Atur tanggal" (libur/hari belajar tambahan, alasan, simpan/hapus pengecualian).
  - Card samping (desktop) atau bawah (HP): "Hari belajar rutin" dengan chip hari yang bisa di-toggle, dan daftar pengecualian bulan ini.

### 7.9 Rekap (`/reports`)

- **Toolbar**: Tahun ajaran, stepper bulan, select Kelas (default kelas utama guru, atau kelas pertama untuk admin; opsi "Seluruh kelas" hanya untuk ekspor). Di kanan: "Unduh Excel" dan "Cetak".
- **KPI kelas**: Rata-rata kehadiran (%), Total Sakit, Total Izin, Total Alpa, Catatan belum lengkap (warning bila > 0, dengan teks "12 catatan siswa belum dicatat").
- **Tabel rekap**:
  - Kolom nama sticky kiri.
  - Kolom total H/S/I/A **di kiri setelah nama** (pada desktop), lalu kolom tanggal.
  - Sel status memakai warna soft sesuai status dan hurufnya. Kolom libur/akhir pekan berlatar abu.
  - Header tanggal menampilkan angka dan inisial hari.
- **Legend**: chip-chip di atas tabel, bukan paragraf.
- **HP**: tampilkan dulu list card per siswa (nama dan 4 angka total). Toggle "Lihat per tanggal" memunculkan grid dengan scroll horizontal (satu-satunya pengecualian scroll horizontal).
- Pemberitahuan "Berubah setelah ekspor terakhir" tampil sebagai alert warning di atas tabel.

### 7.10 Audit

- **Tabel**: Waktu, Pelaku, Aksi, Entitas (label yang bisa dibaca, dan ID di tooltip), Alasan.
- **Detail**: klik baris membuka sheet kanan berisi diff before/after per field (field berubah disorot, nilai lama dicoret, nilai baru ditebalkan), dengan JSON mentah di bawah dalam "Lihat data mentah".
- **Filter**: di toolbar dengan date range. Di HP, filter pindah ke sheet "Filter".
- **Pagination**: Sebelumnya/Berikutnya dan pilihan per halaman.

### 7.11 Pengaturan, Persiapan, Login, Akun

- **Pengaturan sekolah**: form card bersection, dengan action bar.
- **Persiapan**: checklist bergaya stepper. Tiap item punya status (selesai/belum) dan link ke halaman yang melengkapinya.
- **Login**: card terpusat lebar 400px, nama sekolah dari konfigurasi di atas. Field email/password dengan toggle tampilkan password, dan error inline.
- **Ganti password**: card form tunggal, dengan indikator syarat minimal 12 karakter.

## 8. Kriteria penerimaan

1. Viewport 360, 390, 768, 1024, dan 1440: tanpa scroll horizontal halaman (kecuali grid rekap), tanpa teks terpotong yang menyembunyikan informasi, dan target sentuh ≥ 44px di < 1024.
2. Halaman Siswa, Guru, dan Kelas memakai pagination server. Dengan seed 600 siswa, `/students` merender ≤ 25 baris dan waktu respons server tidak naik dibanding sekarang (ukur dengan `scripts/measure-attendance.ts` atau padanannya).
3. Tidak ada form edit di halaman list. Semua create/edit ada di rute `/new`, `/[id]/edit`, atau dialog untuk aksi satu langkah.
4. Absensi: skenario 30 siswa dengan 3 tidak hadir selesai dalam ≤ 6 ketukan dari halaman kelas. Konfirmasi menampilkan nama ketiganya. Semua test e2e absensi (konflik, sesi habis, koreksi, pembatalan, ganti tanggal) lulus.
5. Status absensi selalu punya teks atau huruf, tidak hanya warna. Kontras sesuai `DESIGN.md`.
6. Navigasi sesuai peran. Guru tidak melihat menu Sistem, dan aksi tulis tersembunyi untuk guru (guard API tetap jadi sumber kebenaran).
7. Lighthouse Accessibility ≥ 95 untuk `/attendance/[classId]`, `/students`, dan `/reports` di mode mobile.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test:domain`, `pnpm test:integration`, dan `pnpm test:e2e` hijau. `tests/e2e/mobile-sweep.spec.ts` diperbarui untuk rute baru.
9. Screenshot sebelum/sesudah (360 dan 1440) untuk setiap halaman utama disimpan di `docs/redesign/` sebagai bukti.

## 9. Urutan pengerjaan

| Fase | Isi | Selesai bila |
|---|---|---|
| R0 Fondasi | Install dependensi, token, font, primitif `ui/`, komponen komposit, AppShell baru (sidebar/rail/bottom nav, menu user), `/component-preview` diperbarui | Semua halaman lama tampil di shell baru tanpa regresi test |
| R1 Absensi | 7.3 dan 7.4 | Kriteria 4 lulus. Uji manual di HP nyata oleh guru pilot |
| R2 Data master | Backend pagination (bagian 5), lalu 7.5, 7.6, 7.7 | Kriteria 2 dan 3 lulus |
| R3 Rekap & Beranda | 7.2, 7.9 | KPI cocok dengan angka rekap/ekspor yang ada |
| R4 Sisanya | 7.8, 7.10, 7.11, hapus CSS lama yang tidak terpakai | Kriteria 1–9 lulus seluruhnya |

Setiap fase di-merge terpisah ke `main` dan dicatat di `docs/IMPLEMENTATION_LOG.md` dengan ID `UI-R0` … `UI-R4`.

## 10. Keputusan Toku

1. Catatan per siswa untuk S/I ditunda ke fase berikutnya (lihat bagian 3).
2. Bottom nav admin di HP: Beranda, Absensi, Siswa, Lainnya. Rekap diakses lewat link di Beranda dan menu Lainnya.
3. Warna merek hijau dihapus dan diganti biru langit ala MBG (token di `DESIGN.md`). Hijau hanya untuk status Hadir. Nilai hex masih pendekatan; ganti dengan nilai resmi bila panduan warnanya tersedia.
4. Klarifikasi 8 Oktober 2026: batas dua layar pada input absensi berlaku untuk scroll halaman. Roster boleh bergulir di area sendiri agar target sentuh dan baris nama/status tetap terbaca.
