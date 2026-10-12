# Design System: Admin Panel Sekolah

Antarmuka admin panel untuk manajemen sekolah dasar: absensi harian, data siswa, guru, kelas, kalender, dan rekap. Gayanya bersih dan tenang seperti admin panel modern. Data yang menonjol, bukan dekorasi. Target utama: guru di HP, admin di laptop dan tablet.

Dokumen ini menggantikan versi minimal sebelumnya. Brief pelaksanaan ada di [docs/REDESIGN_BRIEF.md](docs/REDESIGN_BRIEF.md).

## Prinsip

1. **Tugas harian paling cepat.** Mencatat absensi satu kelas selesai dalam satu layar, beberapa ketukan, dan satu konfirmasi.
2. **List untuk membaca, form untuk menulis.** Halaman daftar tidak berisi form edit. Membuat dan mengubah data dilakukan di halaman form terpisah atau di dialog untuk aksi kecil.
3. **Mobile dan tablet setara desktop.** Semua layar dirancang di 360, 768, dan 1024 px, bukan sekadar menyusut.
4. **Status selalu berupa teks.** Warna membantu memindai, tapi tidak pernah menjadi satu-satunya penanda.
5. **Aksi berisiko dibedakan.** Arsip, nonaktifkan, reset password, dan batalkan catatan memakai gaya destructive dan dialog konfirmasi.
6. **Bahasa Indonesia yang ringkas.** Label pendek, kalimat bantuan hanya bila perlu.

Batasan dari `PRODUCT.md` tetap berlaku: target sentuh minimal 44px, nama sekolah dari konfigurasi, dan tanpa logo, foto, ilustrasi, atau testimoni buatan. Ikon UI boleh dipakai.

## Fondasi teknis

- Komponen: shadcn/ui (Radix + Tailwind v4). Tailwind sudah terpasang.
- Tabel: TanStack Table, dengan sorting, filter, dan pagination dari server.
- Ikon: `lucide-react`, ukuran 16/20px, stroke 1.75.
- Notifikasi: toast (`sonner`) untuk sukses. Error tetap tampil inline di dekat sumbernya.
- Font: Plus Jakarta Sans lewat `next/font` (self-host, subset latin, `display: swap`). Fallback ke Segoe UI/system sans.
- Chart: `recharts` (hanya di Beranda). Warna diatur lewat CSS (`--chart-*`), dan setiap chart punya tabel `sr-only` sebagai alternatif teks.
- Token didefinisikan sebagai CSS variable di `:root` dan dipetakan ke tema Tailwind. Warna hex tidak boleh ditulis langsung di komponen.

## Token warna

Mode terang saja untuk rilis ini. Identitas visual memakai **teal edukasi dengan aksen amber** (redesign UI-R4, data dari ui-ux-pro-max baris LMS). Teal dipakai untuk aksi dan identitas; hijau murni tetap khusus status Hadir, sehingga Hadir digelapkan ke `#15803d` agar tidak tertukar dengan teal.

Teal terang (`--brand-teal`, `#0d9488`) hanya ±3.7:1 terhadap putih, jadi tidak dipakai untuk teks atau latar tombol bertulisan putih. Isian tombol memakai `--primary` (`#0d857b`, teks putih ±4.5:1), sedangkan teks/link teal memakai `--primary-text` (`#0f766e`, ±5.2:1 di latar halaman). Semua warna flat: tidak ada gradient. Amber (`--accent-amber`) adalah sorotan langka: indikator menu aktif di sidebar, chip "siswa tidak hadir" di kalender, label "Data uji", dan KPI sorotan. Teks di atas amber memakai `--accent-amber-on` yang gelap.

| Token | Nilai | Pemakaian |
|---|---|---|
| `--brand-teal` | `#0d9488` | Aksen dekoratif: ring fokus, garis tab aktif, chart, ikon besar |
| `--primary` | `#0d857b` | Isian tombol utama, halaman aktif pagination (putih di atasnya ±4.5:1) |
| `--primary-hover` / `--primary-text` | `#0f766e` | Hover tombol utama; teks, link, tab dan menu aktif |
| `--primary-strong` | `#134e4a` | Tooltip, teks di atas latar teal muda |
| `--primary-soft` / `--primary-tint` | `#ccfbf1` / `#f0fdfa` | Latar tombol soft, badge info, hover baris tabel |
| `--accent-amber` / `-soft` / `-text` / `-on` | `#d97706` / `#fef3c7` / `#b45309` / `#451a03` | Sorotan (lihat di atas) |
| `--background` | `#f5faf9` | Latar halaman (mint sangat tipis) |
| `--surface` | `#ffffff` | Card, tabel, topbar, dialog |
| `--surface-muted` | `#eef5f4` | Header tabel, footer dialog, area filter |
| `--border` / `--border-strong` | `#dce7e5` / `#c3d3d0` | Garis card dan pemisah / border tombol secondary |
| `--foreground` / `--muted-foreground` | `#0f1f1e` / `#52635f` | Teks utama / sekunder |
| `--sidebar-bg` | `#115e59` | Sidebar desktop/rail (teks putih 78%, judul grup 72%, aktif putih penuh) |
| `--destructive` | `#c0352b` | Aksi berisiko |
| `--warning` | `#b45309` | Peringatan, data belum lengkap |

Semua token ada di `src/styles/tokens.css`. Nama token ukuran sengaja tidak memakai namespace Tailwind (`--radius-*`, `--text-*`, `--shadow-*`) supaya tidak menimpa utilitas shadcn: radius `--radius-chip|control|card|pill`, tipe `--type-xs…3xl`, bayangan `--elev-1…4`, gerak `--motion-ease` dan `--dur-fast|base|slow`.

### Warna status absensi

Pasangan teks dan latar wajib lolos kontras 4.5:1. Huruf (H/S/I/A) dan label selalu ditulis. Izin memakai ungu supaya tidak tertukar dengan warna primer.

| Status | Teks | Latar soft | Latar terpilih (teks putih) |
|---|---|---|---|
| H Hadir | `#15803d` | `#dcfce7` | `#15803d` |
| S Sakit | `#92400e` | `#fef3c7` | `#d97706` (teks gelap) |
| I Izin | `#5b21b6` | `#ede9fe` | `#7c3aed` |
| A Alpa | `#991b1b` | `#fee2e2` | `#dc2626` |
| ? Belum dicatat | `#475569` | `#f1f5f9` | — |
| L Libur | `#6b7280` | `#f3f4f6` | — |

## Tipografi

Font: **Plus Jakarta Sans** (400/500/600/700) lewat `next/font`.

| Peran | Ukuran / tinggi baris / bobot |
|---|---|
| Judul halaman (h1) | 24/32 bold, tracking -0.015em. Di mobile 20/28 |
| Judul section/card | 16/24 semibold |
| Body | 14/20 regular. Di mobile 15/22 |
| Label form | 13–14/20 medium |
| Teks bantu, meta | 13/18 regular, `--muted-foreground` |
| Header kolom tabel | 12 semibold uppercase, tracking 0.04em |
| Angka KPI | 30/36 bold, `tabular-nums` |
| Sel tabel angka | 14/20, `tabular-nums` |

Tidak ada teks di bawah 12px, kecuali inisial avatar kecil.

## Spasi, radius, bayangan

- Skala spasi 4px: 4, 8, 12, 16, 20, 24, 32, 40.
- Padding halaman: 16px (mobile), 24px (tablet), 32px (desktop). Lebar konten maksimal 1280px.
- Radius hanya empat: 6px chip/badge kecil (`--radius-chip`), 8px tombol/input/menu (`--radius-control`), 12px card/dialog/sheet (`--radius-card`), pill untuk badge dan avatar.
- Card memakai border plus `--elev-1` (bayangan 1px sangat tipis). Bayangan lebih besar hanya untuk elemen mengambang: menu/tooltip `--elev-3`, dialog `--elev-4`.

## Breakpoint dan layout shell

| Rentang | Shell |
|---|---|
| < 640 (HP, minimal 360) | Topbar 56px (nama sekolah singkat, tanggal, avatar). Bottom nav 4 item + "Lainnya" membuka sheet berisi menu lengkap. Tanpa sidebar. |
| 640–1023 (tablet) | Sidebar rail 72px berisi ikon + label kecil, bisa diperluas jadi drawer. Topbar 56px. Tanpa bottom nav. |
| ≥ 1024 (laptop/desktop) | Sidebar 248px dengan grup menu dan bisa diciutkan ke rail. Topbar 64px dengan breadcrumb, tanggal sekolah, dan menu user. |

**Navigasi selalu terlihat.** Sidebar desktop/rail berlatar teal gelap (`--sidebar-bg`) dengan nama sekolah dan peran di atas, menu aktif berupa pill transparan plus garis amber 3px di kiri. Sheet menu mobile tetap terang. Topbar `position: sticky; top: 0` di semua breakpoint, dengan latar `--surface` semi-transparan (blur), border bawah, dan `z-index` di atas konten. Sidebar desktop/rail tablet sticky setinggi `100dvh` dan scroll sendiri bila menunya panjang. Bottom nav HP fixed. Konten tidak boleh tertutup topbar saat anchor/fokus berpindah (`scroll-margin-top` sebesar tinggi topbar).

Menu sidebar dikelompokkan sebagai berikut. Menu yang bukan hak peran tidak ditampilkan.

- **Operasional**: Beranda, Absensi, Rekap
- **Data master**: Siswa, Guru, Kelas
- **Akademik**: Tahun ajaran, Kalender
- **Sistem** (admin): Pengaturan sekolah, Persiapan sekolah, Audit

Menu user (avatar di topbar) berisi nama, peran, Ganti password, dan Keluar. Keluar tidak lagi berupa tombol primary.

Bottom nav HP:
- Guru: Absensi, Rekap, Siswa, Lainnya.
- Admin: Beranda, Absensi, Siswa, Lainnya.

Bottom nav punya tinggi 64px plus safe-area dan label selalu tampil. Item aktif memakai pola standar mobile: pill `--primary-soft` 56×30 di belakang ikon, ikon dan label `--primary-text` tebal. Tidak ada garis indikator di samping.

## Anatomi halaman

Setiap halaman memakai urutan berikut:

1. **Page header**: breadcrumb (≥ 640), judul, deskripsi satu baris (opsional), dan aksi utama di kanan. Di HP, aksi utama berubah menjadi tombol penuh di bawah judul, atau FAB untuk "Tambah".
2. **Toolbar**: search, filter, dan aksi sekunder (ekspor, cetak).
3. **Konten**: card, tabel, atau form.
4. **Footer konten**: pagination, atau action bar untuk form.

## Pola komponen

### Card sebagai wadah data

Semua data yang ditampilkan berada di dalam card (`--surface`, border `--border`, radius 12px, bayangan `--elev-1`): tabel, list card, ringkasan detail, grid kalender, grid rekap, timeline, checklist, KPI, dan form section. Latar halaman (`--background`) hanya untuk page header dan jarak antar card. Tidak ada teks data, list, atau form yang ditulis langsung di latar halaman.

Anatomi card data (urutan tetap):

1. **Card header**: judul + jumlah sebagai pill abu ("Siswa (60)"), aksi kanan (opsional).
2. **Toolbar**: search dan filter, dipisah border bawah.
3. **Isi**: tabel atau list card.
4. **Card footer**: pagination, dipisah border atas.

Satu daftar = satu card. Toolbar, tabel, dan pagination tidak boleh menjadi card terpisah.

### Tabel data (halaman list)

- Berada di dalam card data. Header kolom berlatar `--surface-muted`, tinggi baris 48–52px, border antar baris `--border` (bukan warna gelap), dan hover `--surface-muted`.
- Kolom aksi lebar tetap 56px, header-nya "Aksi" sebagai teks screen reader saja (visual kosong) supaya tidak terpotong.
- Nilai kosong ditampilkan "—" berwarna `--muted-foreground`, bukan "Belum diisi" berulang.
- Kolom pertama berisi identitas utama (nama) sebagai link ke detail. Seluruh baris bisa diklik.
- Kolom aksi di paling kanan berupa menu `⋯` (Lihat, Ubah, aksi berisiko di bagian bawah, dipisah garis).
- Toolbar berisi search (debounce 300ms, tersinkron ke URL) dan filter select/chip yang langsung diterapkan saat berubah, tanpa tombol "Tampilkan". Tombol "Reset filter" muncul hanya bila ada filter aktif. Urutan diatur lewat header kolom yang bisa diklik, bukan select terpisah.
- Di HP, toolbar hanya berisi search dan tombol "Filter (n)" yang membuka sheet berisi filter.
- **Pagination wajib untuk setiap daftar**, dikerjakan di server dan state-nya tersimpan di URL (`?page=&pageSize=&q=&sort=`):
  - Ukuran default 25, pilihan 10/25/50, diletakkan di footer card ("Baris per halaman"), bukan di toolbar.
  - Footer: "Menampilkan 1–25 dari 312" di kiri; di kanan tombol ‹ ›, dan nomor halaman dengan elipsis. Nomor aktif berupa tombol 36×36 dengan angka di tengah. Tidak ada teks "Hal 1 dari 3" bila nomor halaman sudah tampil.
  - Di HP: "1–25 dari 312" dan tombol ‹ › dengan target sentuh 44px.
  - Ganti halaman, filter, atau search mengembalikan scroll ke atas card, bukan ke atas halaman.
  - Pengecualian hanya untuk tampilan yang sudah dibatasi oleh periode atau kelas dan wajib tampil utuh: roster input absensi (satu kelas), grid rekap (satu kelas, satu bulan), dan grid kalender (satu bulan). Selector kelas/bulan berperan sebagai pagination.
- **Di HP (< 640) tabel berubah menjadi list card.** Baris 1 berisi nama dan badge status, baris 2 berisi meta (kode, kelas), dan menu `⋯` di kanan. Tidak ada scroll horizontal.
- Tablet menampilkan kolom prioritas saja. Kolom sekunder disembunyikan dan tetap terlihat di halaman detail.
- State wajib: skeleton saat memuat (5 baris), empty state dengan teks dan aksi ("Belum ada siswa" + "Tambah siswa"), hasil filter kosong ("Tidak ada yang cocok" + Reset filter), dan error dengan tombol coba lagi.

### Halaman detail

- Header berisi nama, badge status, meta singkat, aksi utama "Ubah", dan menu `⋯` untuk aksi lain.
- Konten berupa card ringkasan read-only (description list dua kolom ≥ 768) dan tab untuk sub-bagian, misalnya Siswa: Ringkasan, Riwayat penempatan, Kehadiran.
- Aksi berisiko dikumpulkan di card "Zona berisiko" di bagian bawah, atau di menu `⋯` dengan warna destructive.

### Form (create/edit)

- **Tidak ada form tambah/ubah di halaman list maupun di isi tab detail.** Form dengan lebih dari 4 field atau lebih dari satu section memakai halaman terpisah (`/x/new`, `/x/[id]/edit`). Aksi satu langkah dengan ≤ 4 field (pindah kelas, reset password, ubah akses, kelas utama, pengecualian kalender, tambah tahun ajaran sederhana) memakai dialog (bottom sheet di HP) yang dibuka dari tombol. Halaman list dan detail hanya menampilkan data read-only plus tombol pemicu.
- Halaman pengaturan (`/settings`) boleh berupa halaman form, karena isinya memang satu form.
- Lebar maksimal halaman form 720px.
- Field dikelompokkan ke dalam card section dengan judul. Grid dua kolom ≥ 768 untuk field pendek, satu kolom di HP.
- Label di atas input. Penanda wajib (`*`) atau "(opsional)" dipakai konsisten. Teks bantu di bawah input. Error inline merah di bawah field, dan fokus diarahkan ke field error pertama.
- Tinggi input 40px di desktop dan 44px di HP/tablet. Checkbox 18px visual dengan area klik label ≥ 44px. Untuk on/off, pakai switch.
- Action bar: Batal (secondary) dan Simpan (primary) di kanan bawah. Di HP, action bar sticky di bawah dengan tombol penuh.
- Bila ada perubahan belum disimpan dan user meninggalkan halaman atau menutup dialog, tampilkan konfirmasi.

### Validasi form

Berlaku untuk semua input, termasuk dialog, filter tanggal, login, dan ganti password.

- Skema zod di `src/contracts/` adalah satu sumber aturan. Client memakai skema yang sama (atau `.pick()`/`.extend()` darinya) sehingga pesan client dan server identik. Aturan baru ditambahkan di kontrak, lalu otomatis berlaku di server.
- Form memakai `noValidate`: bubble bawaan browser (yang bahasanya mengikuti browser, misalnya "Please fill out this field.") tidak dipakai. Atribut `required`, `maxLength`, `inputMode`, `autoComplete`, dan `type` tetap dipasang untuk keyboard HP dan autofill.
- Waktu validasi: field divalidasi saat blur pertama, lalu ulang setiap ketikan setelah pernah error. Submit memvalidasi semua field.
- Tampilan error:
  - Border input `--destructive`, ikon kecil, dan pesan merah 13px di bawah input dengan `id` yang dirujuk `aria-describedby`; input diberi `aria-invalid="true"`.
  - Saat submit gagal, fokus pindah ke field error pertama dan halaman/dialog scroll ke field itu. Bila ≥ 3 error, tampilkan ringkasan di atas form ("Periksa 3 isian berikut") berisi link ke tiap field.
  - Tombol submit tetap aktif (tidak di-disable karena form belum valid), supaya user mendapat penjelasan saat menekan.
- Error dari server (`fieldErrors` dari `HttpError`) dipetakan ke field yang sama. Error tanpa field (konflik versi, sesi habis) tampil sebagai alert di atas form.
- Penanda: field wajib diberi `*` merah setelah label beserta teks screen reader "wajib"; field opsional tidak diberi penanda tambahan (hapus "(opsional)" dari label).
- Field teks panjang (alasan) menampilkan penghitung karakter "0/1000" saat fokus.
- Semua pesan dalam Bahasa Indonesia, spesifik, dan menyebut cara memperbaiki ("NISN harus 10 digit angka."), bukan "Input tidak valid".
- Setelah simpan: toast "Data siswa tersimpan", lalu redirect ke detail.

### Dialog dan sheet

- Dialog dipakai untuk aksi kecil satu langkah: pindah kelas, reset password, arsip, konfirmasi simpan absensi.
- Di HP, dialog tampil sebagai bottom sheet.
- Dialog konfirmasi berisiko: judul berupa pertanyaan, penjelasan dampak, tombol destructive dengan label kerja yang spesifik ("Arsipkan siswa"), bukan "OK".

### Tombol

| Varian | Pemakaian |
|---|---|
| Primary | Maksimal satu per view: Simpan, Tambah, Simpan absensi. Teal flat + bayangan tipis |
| Secondary | Batal, Ubah, Ekspor, Cetak, navigasi pendamping. Putih dengan border |
| Soft | Aksi kontekstual berulang di dalam card/tabel ("Catat"), submit filter ("Tampilkan rekap") |
| Ghost | Aksi ikon di toolbar/tabel |
| Destructive | Arsipkan, Nonaktifkan, Batalkan catatan (di dialog konfirmasi) |
| Link | Navigasi dalam teks |

Komponen: `Button`, `IconButton` (wajib `label`), dan `ButtonLink` untuk navigasi berbentuk tombol (`src/components/button.tsx`). Kelas `.button-link` lama tidak dipakai lagi. Semua tombol setinggi 44px (`--control-height`); size `sm` hanya merapatkan padding dan font, bukan tinggi. Aksi "Tambah X" memakai ikon `Plus`, "Ubah" di halaman detail memakai ikon `Pencil` dan varian secondary.

### Badge status

Berbentuk pill dengan latar soft, teks berwarna, dan titik 6px di depan (selalu ada). Di dalam sel tabel radius turun ke 6px agar teks panjang bisa membungkus.

- Siswa: Aktif, Diarsipkan.
- Guru/akun: Aktif, Nonaktif, Belum punya akun, Wajib ganti password.
- Absensi kelas: Sudah dicatat, Belum dicatat, Libur, Dibatalkan.

### Kartu KPI

Komponen `KpiCard`: label kecil + ikon dalam kotak berwarna di kanan atas, angka besar, progress bar opsional, dan konteks di bawah. Aksen warna (garis kiri 3px) per metrik: teal, sky, amber, rose. Dua kolom di HP (ikon disembunyikan), 2 kolom di tablet, 4 kolom di desktop.

### Beranda

KPI di atas, lalu grid bento: chart tren kehadiran 14 hari sekolah (2/3) dan komposisi H/S/I/A hari ini (1/3), lalu tabel "Belum dicatat hari ini" dan pintasan cepat.

### Avatar dan ikon

`Avatar` menampilkan inisial dengan warna deterministik dari nama (6 nada soft). Dipakai di topbar, header detail siswa/guru, dan kolom nama daftar siswa/guru. Page header halaman utama memakai ikon modul (sama dengan ikon menu) di kotak teal muda. Empty state selalu punya ikon dalam lingkaran.

### Input absensi (pola khusus)

Lihat spesifikasi lengkap di brief bagian Absensi. Ringkasnya:

- Satu baris per siswa: nomor urut, nama, kode kecil, lalu segmented control `H S I A` di kanan dalam satu baris. Di HP < 400px, segmented control turun ke baris kedua dengan lebar penuh.
- Default terpilih H. Pilihan non-H mewarnai latar baris dengan warna soft status.
- Action bar sticky di bawah berisi ringkasan "27 H · 1 S · 1 I · 1 A" dan tombol "Simpan absensi".

### Feedback

- Sukses: toast di kanan atas (desktop) atau atas tengah (HP), hilang setelah 4 detik.
- Error form: inline. Error halaman: alert banner di bawah page header.
- Konflik versi dan sesi habis: alert banner persisten dengan aksi ("Muat data terbaru", "Masuk kembali").
- Loading: skeleton untuk konten, spinner kecil di dalam tombol saat submit.

## Motion

Durasi 150–250ms (`--dur-*`, kurva `--motion-ease`), hanya untuk dropdown, dialog/sheet (fade + scale 0.97), toast, dan perubahan state tombol. Tidak ada animasi masuk halaman. Loading memakai skeleton (`PageSkeleton`) yang bentuknya mengikuti layout akhir; efek denyut opacity hanya aktif bila `prefers-reduced-motion` tidak diset.

## Aksesibilitas

- Kontras teks minimal 4.5:1, komponen UI 3:1.
- Fokus terlihat (ring 2px). Urutan tab logis, skip link tetap ada.
- Semua kontrol bisa dipakai dengan keyboard. Segmented status adalah radio group (panah kiri/kanan).
- Landmark: `nav` sidebar, `main`, dan `header`.
- Rotasi dan resize tidak menghapus pilihan yang belum disimpan.
