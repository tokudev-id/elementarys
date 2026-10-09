# Pelaksanaan redesign

Acuan: [brief](../REDESIGN_BRIEF.md) dan [DESIGN.md](../../DESIGN.md). Data screenshot dan pengujian sintetis. Arah panel operasi sekolah, ENERGY 1 / RHYTHM 1 / MOTION 1.

| Fase | Status | Bukti |
|---|---|---|
| UI-R0 | done | 58baf15 + 5b15661, main11f3f5b; domain18/integration105/e2e51, build dan kontras19 pasangan lulus |
| UI-R1 | teknis done, needs_human | c947c06/a38906d, mainbe8fb09; domain18/integration105/e2e52; lima ketukan, H-03 pending |
| UI-R2 | done | b26c76f; dilanjutkan oleh UI-F1–F4; baseline600siswa128.07ms |
| UI-F1 | done | a147c1a; DataCard master/detail, sticky topbar (y===0), mobile filter sheet, pagination footer |
| UI-F2 | done | useZodForm, error inline Bahasa Indonesia, noValidate, first error focus/scroll, error summary (>=3), skema kontrak Zod, dialog persistence; domain 18/integration 111/e2e redesign-f2+auth+school-master+students+f1 lulus |
| UI-F3 | done | DataCard & pagination tahun ajaran, audit diff sheet, history absensi, unlinked accounts, grid kelas, promote wizard; 111 integration, 18 domain, e2e redesign-f3 lulus |
| UI-F4 | done | Form inline → dialog/page dan perbaikan absensi; 111 integration, 18 domain, e2e redesign-f4/attendance/auth/teachers/settings lulus |
| UI-R3 | not_started | Beranda dan rekap |
| UI-R4 | not_started | Polish redesign, audit CSS, penerimaan akhir |

## Fondasi UI-R0

- shadcn/Radix dengan Tailwind v4, Inter self-host melalui next/font, lucide untuk ikon menu/tugas, Sonner untuk sukses, TanStack v8 untuk manual pagination/sorting. v8.21.3 memakai API useReactTable yang sesuai kebutuhan; v9 sudah memiliki API berbeda. DataTable secara eksplisit tidak memakai React Compiler untuk API tabel mutable, dengan pengecualian lint hanya pada berkas tersebut.
- Sidebar desktop 248px yang bisa diciutkan, rail tablet72px yang membuka menu, dan bottom navigation HP dengan Lainnya. Menu user memuat nama/peran/Ganti password/Keluar; Data uji dipisahkan dari nama sekolah. Tujuan Beranda tetap memakai redirect lama sampai UI-R3 mengisi dashboard.
- Dialog Radix mempertahankan focus trap/restore, Escape, scroll body, header/footer yang terjangkau serta keyboard360×340. Utility translate bawaan dinetralkan agar tidak menggandakan transform CSS. ResizeObserver membaca ukuran setelah layout berubah sehingga isian fokus tetap terlihat. Screenshot dan tes mengukur bounds dialog serta seluruh isian terakhir.
- [38 screenshot sebelum](before) mencakup19halaman ×360/1440. [Kontras](CONTRAST.md) dihitung dari token CSS; teks/control dipisahkan dari border/aksen dekoratif. Turunan gelap dipakai untuk Hadir/Sakit terpilih dan Libur agar memenuhi AA. Semua19 pasangan yang digunakan lulus.
- Label/testid lama dipertahankan untuk halaman yang belum dimigrasi. Spec shell/auth memakai alur menu baru; helper membaca menu berstatus open, karena menu modal menyembunyikan trigger dari accessibility tree. Snapshot aturan/protokol/audit tetap lulus105 integration.

- Hard Gate PASS: 51e2e, overflow/touch, permission matrix dan keyboard/bounds lulus.
- Purpose Gate PASS: keputusan komponen/font/warna/ikon sesuai brief.
- Liveliness PASS: dials1/1/1, data sekolah sebagai fokus.
- Craftsmanship PASS: build,19 kontras dan regression main lulus, bukti sintetis diberi label.

## Klarifikasi dan batas bukti

Toku mengonfirmasi batas dua layar berlaku pada scroll halaman; roster boleh bergulir di area sendiri. Langkah/tap automation akan diukur pada UI-R1. Uji guru di HP nyata, printer/Excel sekolah, provider, pilot dan handover tetap checkpoint manusia. Lighthouse dan screenshot setelah seluruh fase belum dijalankan pada UI-R0.

## Absensi UI-R1

- Card kelas, progress, tanggal bertahap/kalender libur, default H yang belum tersimpan, search kelas besar, filter tidak hadir/semua hadir, badge mode baca, shortcut panah/H/S/I/A/Ctrl+Enter, toolbar sticky dan konfirmasi nama S/I/A. Pembatalan admin dipindahkan ke Aksi catatan → dialog; reason/version/Origin/auth/audit tetap.
- Skenario nyata Playwright touch390×844: 30 siswa dengan status awal null di DB; H terpilih pada UI, tiga pilihan S/I/A + buka konfirmasi + Simpan = lima pointerup. DB sesudahnya27H/1S/1I/1A. Bounds halaman≤1688px, baris≤96px, roster bergulir sendiri. Keyboard/filter/reset/date picker dan future disabled diuji. Ini bukan waktu guru atau bukti HP nyata.
- Receipt simpan sudah authoritative. Refresh setelah simpan dihapus agar respons RSC tidak me-remount halaman dan menutup menu yang baru dibuka. Void/master tetap refresh. Konflik/reload/no-op/unknown ACK/sesi habis/rotasi/date dirty/history/print lulus; main52e2e3.6menit.
- Toast memakai posisi responsif Sonner, bukan transform CSS tambahan; teks/tombol notifikasi Indonesia dan bounds HP diuji. Source private runtime disimpan di .local agar build/test tidak mengganti artefak preview manual. Alias eksternal pnpm dipertahankan sebagai junction menuju package aslinya. .local diabaikan lint/typecheck selain Git.
- Baseline sebelum pagination: 600 siswa sintetis pada DB ukur tersendiri, render600baris; sampel respons SSR179.31/125.09/128.07/151.83/97.90ms, median128.07ms pada2026-10-08T07:59:29.039Z. Pengukuran Node/Playwright lokal, tanpa klaim provider/perangkat guru. Data demo manual60siswa tidak direset.

- Hard Gate PASS: batas halaman/roster,5tap,nama konfirmasi,52regresi dan API guard lulus.
- Purpose Gate PASS: compact roster untuk pencatatan, warna hanya status, tombol secondary/risiko dibedakan.
- Liveliness PASS: dials1/1/1, nama/kode/status sebagai motif, aksi simpan dan ringkasan sebagai fokus.
- Craftsmanship PASS: receipt/protokol tetap, tests105PostgreSQL dan52browser lulus; H-03 tetap pending.

## Data master UI-R2

- Daftar siswa/guru/kelas memakai pagination SQL dalam snapshot read-only, urutan stabil dengan ID, pencarian/filter allowlist, serta opsi penuh terpisah untuk penempatan/promosi. Kelas aktif siswa memakai tanggal sekolah dan rentang penempatan eksklusif. Akun guru tetap hanya terlihat oleh admin; endpoint mutasi tidak berubah.
- Halaman new/detail/edit menggantikan form pada daftar. Detail siswa memiliki ringkasan, timeline dan ringkasan kehadiran dari proyeksi rekap. Pindah/tutup/arsip memakai dialog. Detail guru memisahkan profil, kelas utama dan akun; reset password serta penonaktifan akses/profil memerlukan dialog. Kelas menggunakan select tingkat dan read-only tahun/tingkat setelah ada penempatan.
- Wizard promosi tiga langkah mempertahankan versi tiap siswa, pratinjau authoritative dan transaksi seluruh batch. Siswa dipilih secara default; pengecualian dapat dilepas sebelum konfirmasi. Form menjaga perubahan sebelum meninggalkan halaman melalui link atau penutupan tab.
- Uji browser 600 siswa membuktikan25baris, halaman berikutnya tanpa pengulangan, filter/NIS, navigasi kembali dan pembatalan keluar dari draft. Empat tes PostgreSQL tambahan mencakup pagination600, penempatan efektif, arsip/filter invalid dan pembatasan rincian akun.
- Pengukuran pertama sesudah redesign berlangsung bersamaan dengan regresi browser:25baris, median133.12ms; belum memenuhi pembanding128.07ms. Pengukuran ulang saat regresi menunggu locator wizard lama:25baris, median118.39ms. Pengukuran final setelah build main harus berjalan tanpa build atau test lain. Cleanup backup Windows sempat melewati timeout10detik dan meninggalkan DB restore fixture; hook cleanup diberi30detik tanpa mengubah perilaku restore yang menolak target yang sudah ada.

## Shell, Card, dan Kit Tabel UI-F1

- Topbar sticky (`top: 0; z-index: 15`) di semua breakpoint (1440, 768, 390); diverifikasi via E2E `boundingBox().y === 0` setelah scroll. Tombol "Ciutkan sidebar" dipindahkan ke bawah daftar menu navigasi. Navigasi balik HP (`‹` ke induk) ditambahkan di topbar pada halaman detail siswa, guru, dan kelas; link teks duplikat di body dihapus.
- Komponen `DataCard` (`DataCardHeader`, `DataCardToolbar`, `DataCardContent`, `DataCardFooter`) diterapkan pada Siswa, Guru (kedua tab), Kelas, detail Kelas, dan `/component-preview`.
- Toolbar list & filter: Debounce pencarian 300ms tersinkron ke URL (`?q=`). Filter select langsung menerapkan filter tanpa tombol "Tampilkan". Pada HP (< 640px), filter masuk ke modal sheet bottom drawer tunggal (tanpa duplikasi DOM/input). Pengurutan kolom via header tabel (`aria-sort`).
- Pagination standar di footer card: pilihan baris per halaman (10/25/50) dipindah ke footer, tombol halaman 36×36, di HP hanya "1–25 dari total" dan tombol ‹ › 44px. Kolom aksi 56px tanpa header visual (`sr-only`), baris 48–52px, nilai kosong "—" (`.empty-dash`).
- Pengujian: E2E baru `redesign-f1.spec.ts` lulus di port 3104, `enrollments.spec.ts`, `students.spec.ts`, `mobile-sweep.spec.ts`, dan `shell.spec.ts` lulus. Seluruh 109 integrasi dan domain test lulus. Screenshot perbandingan disimpan di `docs/redesign/after/UI-F1/`.

## Fondasi Validasi Form UI-F2

- Hook form Zod mandiri `useZodForm` dibuat di `src/components/use-zod-form.ts` dengan pola `blur-then-live`:
  - `noValidate: true` disematkan ke form props sehingga browser native validation popup dinonaktifkan.
  - Nilai form disinkronkan secara real-time via `valuesRef` untuk mencegah bug stale closure saat submit.
  - Submit memvalidasi seluruh skema secara komprehensif, memetakan error ke masing-masing field, memfokuskan dan men-scroll elemen field error pertama (`focus()` + `scrollIntoView({ block: "nearest" })`).
  - Menampilkan ringkasan error (`FormErrorSummary`) bila ditemukan ≥ 3 error, lengkap dengan tautan anchor interaktif ke masing-masing field.
  - Server errors (`options.serverErrors`) dipetakan otomatis ke field terkait saat respons mutasi kembali.
- Komponen input terstandarisasi:
  - `Field`: penanda `*` (`aria-hidden="true"`) + teks screen reader `.sr-only "wajib"`, `aria-label` eksplisit agar accessible name Playwright dan AT tetap bersih, `aria-invalid`, serta pesan inline error (`role="alert"`).
  - `SelectField`: menerima `error` dan `required`, render opsi bersih dan accessible.
  - `TextareaField`: dilengkapi counter karakter saat fokus (`0/1000`, `aria-live="polite"`), auto-expand/resize, dan pesan error inline.
  - `CheckboxField` & `SwitchField`: mendukung state checked, required, dan inline error.
- Pembaruan skema kontrak Zod bahasa Indonesia:
  - `src/contracts/auth.ts`: login (email wajib & format email, password wajib), change password (min 12, beda dari lama, ulangi password sama).
  - `src/contracts/students.ts`: nama mengandung huruf & min 2 huruf, NIS regex angka/titik/strip/slash max 30, NISN tepat 10 digit, kode siswa alphanumeric+strip max 64.
  - `src/contracts/teachers.ts`: nama guru mengandung huruf & min 2, email max 254, password min 12, konfirmasi password sama.
  - `src/contracts/school-master.ts`: label tahun ajaran format `YYYY/YYYY` tahun berurutan, batas durasi tahun ajaran ≤ 400 hari, nama kelas 1–100, tingkat 1–6.
  - `src/contracts/enrollments.ts`: alasan penempatan/transfer/tutup/arsip wajib 1–1000 karakter.
  - `src/contracts/settings.ts`: nama sekolah 1–200, lokasi max 300, validasi timezone IANA, alasan ubah timezone wajib bila zona berubah.
- Form di-refactor: `StudentForm`, `ClassForm`, `TeacherProfileForm`, `TeacherAccountForm`, `PasswordResetForm`, `PlacementForm`, `EndEnrollmentForm`, `StudentArchiveForm`, dan `AccountForm` (login & ganti password).
- Pengujian & Bukti:
  - Integration: 111 tests lulus 100% (`vitest.config.ts` dikonfigurasi `fileParallelism: false` untuk mencegah PostgreSQL lock timeouts).
  - Domain: 18 tests lulus 100%.
  - E2E: `tests/e2e/redesign-f2.spec.ts` memverifikasi submit form kosong, pesan error inline Bahasa Indonesia, fokus ke error pertama, summary saat ≥ 3 error, form dialog tetap terbuka saat error, dan `noValidate` aktif.
  - Seluruh rangkaian regresi E2E (`auth.spec.ts`, `school-master.spec.ts`, `students.spec.ts`, `redesign-f1.spec.ts`) lulus 100%.
  - Screenshot bukti tersimpan di `docs/redesign/after/UI-F2/`: `login-error.png`, `siswa-form-error.png`, dan `kelas-form-error.png`.

## Daftar dan Pagination Halaman Tersisa UI-F3

- **Tahun Ajaran** (`/academic-years`):
  - Halaman list dibungkus `DataCard` dengan `MasterList` 5 kolom (Label, Mulai, Selesai, Status, Aksi).
  - Primary action: "Tambah tahun ajaran" mengarah ke halaman mandiri `/academic-years/new`. Secondary action: "Persiapan tahun berikutnya" mengarah ke `/academic-years/rollover`.
  - Form inline dihilangkan dari halaman list (memperbaiki Finding A10).
  - Halaman mandiri `/academic-years/new` dan `/academic-years/[yearId]/edit` dibangun dengan breadcrumb dan form `AcademicYearForm` terintegrasi `useZodForm`, `noValidate`, dan skema validasi format `YYYY/YYYY` tahun berurutan serta durasi ≤ 400 hari.
  - Pagination server 25 item per halaman dengan `academicYearListSchema` dan query `listAcademicYearsPage`.
- **Audit Log** (`/audit`):
  - Log audit dibungkus dalam `DataCard` dengan cursor pagination dua arah (`cursor` / `before`) dan navigasi "‹ Sebelumnya", "Berikutnya ›", serta "Kembali ke awal".
  - Tabel audit responsif dengan badge tipe aksi dan entitas terlokalisasi Bahasa Indonesia.
  - Filter mobile dalam sheet dialog (`MobileFilterSheet`).
  - Klik baris membuka drawer/sheet slide-over diff data visual: menampilkan field sebelum dan sesudah yang berubah (`before` vs `after`), badge status perubahan, dan accordion data mentah JSON (`audit-raw-json`).
- **Riwayat Absensi & Akun Tanpa Profil**:
  - Riwayat sesi absensi (`/attendance/[classId]/history`) dibungkus `DataCard` dengan pagination server 10 sesi per halaman, tombol kembali ke catatan absensi, dan tabel revisi.
  - Daftar akun guru tanpa profil (`/teachers` tab Akun tanpa profil) dibungkus tabel responsif desktop dan kartu mobile dalam `DataCard`.
- **Riwayat Penempatan Siswa, Rollover, Promote Wizard, & Attendance Grid**:
  - Tab riwayat penempatan siswa (`/students/[studentId]`) dibungkus `DataCard` dengan pagination 10 item per halaman.
  - Halaman rollover tahun ajaran (`/academic-years/rollover`) membungkus daftar kelas pada tahun yang disiapkan dalam `DataCard` dengan pagination 25 item per halaman.
  - Wizard penempatan siswa naik kelas (`/students/promote`): Step 2 pemilihan kandidat dibungkus `DataCard` dengan pagination 25 siswa per halaman, tombol "Pilih semua di semua halaman", dan pengiriman seluruh pilihan lintas halaman dalam satu mutasi batch.
  - Grid kelas pada halaman absensi (`/attendance`) dibungkus `DataCard` dengan pagination bila jumlah kelas > 12.
- **Pengujian & Bukti**:
  - Build produksi: Turbopack production build sukses tanpa error.
  - Domain tests: 18 passed (100%).
  - Integration tests: 111 passed (100%).
  - E2E: `tests/e2e/redesign-f3.spec.ts` memverifikasi seluruh fungsionalitas UI-F3 (pagination tahun ajaran, halaman form baru, audit cursor pagination & sheet diff visual, history absensi, rollover card, promote wizard multi-page selection, dan attendance card).
  - Screenshot bukti tersimpan di `docs/redesign/after/UI-F3/`: `tahun-ajaran-list.png`, `tahun-ajaran-new.png`, `audit-list-diff.png`, `attendance-history.png`, dan `promote-wizard.png`.

## Form Inline → Dialog/Halaman dan Perbaikan Absensi UI-F4

- **Detail Guru** (`/teachers/[teacherId]`):
  - Seluruh form inline di dalam `TabsContent` (`TeacherClassesForm`, `AccountAccessForm`, `TeacherAccountForm`, `PasswordResetForm`) telah dihapus.
  - Tab "Profil", "Kelas utama", dan "Akun & akses" diubah menjadi kartu ringkasan read-only yang bersih.
  - Tombol aksi kontekstual membuka Dialog sheet: "Ubah kelas utama", "Hubungkan akun guru", "Buat akun guru", "Ubah akses", dan "Reset password". Penonaktifan akun menggunakan `ConfirmDialog`.
- **Kalender** (`/calendar`):
  - Direfaktor ke `CalendarClient`.
  - Card 1: Grid bulan interaktif dengan stepper `‹ Bulan YYYY ›` (lokalisasi Indonesia, misal "‹ Oktober 2026 ›"). Klik tanggal libur/rutin bagi admin membuka dialog pengaturan pengecualian tanggal tersebut.
  - Card 2: Hari belajar rutin ditampilkan dalam chip read-only plus tombol "Ubah" yang membuka dialog multiselect hari.
  - Card 3: Pengecualian bulan ini dibungkus tabel paginasi `DataCard` dengan tombol "Tambah pengecualian" (dialog) dan konfirmasi hapus via `ConfirmDialog`. Form inline checkbox dan isian pengecualian di bawah grid dihilangkan total.
- **Pengaturan & Persiapan** (`/settings`, `/setup`):
  - `/settings`: Dibungkus dalam `DataCard`, dilengkapi banner info data uji `<StateBanner state="info" title="Data uji">`, pemilih zona waktu dengan quick chip (WIB, WITA, WIT) serta datalist IANA lengkap, dan input alasan hanya wajib bila zona waktu berubah.
  - `/setup`: Checklist kesiapan sekolah dibungkus `DataCard` dengan badge status per langkah dan tautan navigasi langsung.
- **Rollover** (`/academic-years/rollover`):
  - Checklist persiapan tahun ajaran berikutnya dibungkus `DataCard`, tombol aksi aktivasi memicu dialog konfirmasi sebelum eksekusi rollover.
- **Absensi** (`/attendance/[classId]`):
  - Mobile bottom navigation disembunyikan (`hideBottomNav` pada shell layout) khusus di halaman input absensi mobile untuk memaksimalkan viewport kerja.
  - Nested scroll dihilangkan: daftar siswa mengalir secara wajar di scroll utama halaman dengan sticky bar aksi di safe area bawah.
  - Stepper tanggal disatukan ke kontrol ringkas `‹ Hari, Tanggal ›` dengan label accessible `aria-label="Buka kalender tanggal"`.
  - Header disederhanakan: judul dan badge status berdampingan, tombol riwayat berupa ikon tombol accessible di header.
  - Breakpoint mobile 360px memastikan ≥ 6 baris siswa tampak langsung di layar HP (390×844) tanpa perlu scroll.
- **Login & Ganti Password** (`/login`, `/change-password`):
  - Tampilan auth card terpusat dengan branding "Absensi Sekolah".
  - Toggle tampilkan/sembunyikan password (Eye/EyeOff) yang accessible dengan `aria-label`.
- **Pengujian & Bukti**:
  - `pnpm lint`: 0 error, 0 warning.
  - `pnpm typecheck`: 0 error.
  - `pnpm test:domain`: 18 passed (100%).
  - `pnpm test:integration`: 111 passed (100%).
  - `pnpm playwright test`: 12 tests passed (termasuk `attendance-redesign.spec.ts`, `auth.spec.ts`, `school-master.spec.ts`, `settings.spec.ts`, `teachers.spec.ts`, dan `redesign-f4.spec.ts`).
  - 13 screenshot bukti tersimpan di `docs/redesign/after/UI-F4/`:
    `login-desktop.png`, `login-mobile.png`, `settings-desktop.png`, `settings-mobile.png`, `setup-desktop.png`, `calendar-desktop.png`, `calendar-mobile.png`, `calendar-dialog-mobile.png`, `rollover-desktop.png`, `teacher-detail-desktop.png`, `teacher-classes-dialog.png`, `teacher-account-tab.png`, `attendance-mobile.png`.

