# Product Requirements Document

## Sistem Manajemen Siswa, Guru, dan Absensi SD

| Atribut | Nilai |
|---|---|
| Versi | 1.3 |
| Tanggal | 6 Oktober 2026 |
| Status | Disetujui Toku untuk perencanaan implementasi; revisi 1.3 menambahkan Q-10/Q-11, satu akun per orang, dan milestone vertical slice; nilai konfigurasi dan bukti operasional diisi saat persiapan pilot |
| Pemilik produk | Toku bersama pengelola sekolah |
| Nama kerja proyek | Elementary School System; bukan nama resmi sekolah atau produk |
| Referensi teknis | [Technical Reference Document](TECHNICAL_REFERENCE.md) |
| Rencana eksekusi | [Implementation Plan](IMPLEMENTATION_PLAN.md) |

## 1. Mengapa sistem ini dibuat?

Sekolah yang menjadi sasaran memiliki enam kelas, sekitar sepuluh siswa per kelas, dan dua guru. Guru bergantian mengajar, dengan masing-masing menangani tiga kelas. Absensi dilakukan secara manual sekali sehari dengan mengamati siswa yang hadir, biasanya sore sebelum atau sesudah ngaji. Sekolah menggunakan printout bulanan dan sudah memiliki Wi-Fi.

Sistem membantu guru memelihara daftar siswa dan kelas, mencatat kehadiran dengan sedikit langkah, serta menghasilkan rekap bulanan yang bisa dibuka di Excel dan dicetak. Keberhasilannya diukur dari berkurangnya pekerjaan guru dan ketepatan laporan.

SIKL berarti Sekolah Indonesia Kuala Lumpur. Hubungan administratif sekolah sasaran dengan SIKL, mekanisme pelaporan, dan format yang diterima belum diverifikasi. Excel menjadi keluaran awal berdasarkan diskusi, tanpa klaim kompatibilitas dengan sistem SIKL.

### 1.1 Fakta, keputusan, dan usulan

| Jenis | Pernyataan |
|---|---|
| Fakta dari Toku | Enam kelas, sekitar 60 siswa, dua guru, Wi-Fi tersedia |
| Fakta dari Toku | Guru rolling, masing-masing memegang tiga kelas; absensi sekali sehari |
| Fakta dari Toku | Siswa tidak memegang HP; LKPD nantinya digunakan dalam bentuk cetak |
| Fakta dari Toku | Proyek sukarela tanpa pembayaran; Toku membantu teman yang sedang KKN di sekolah sasaran |
| Keputusan Toku | Fokus perencanaan awal pada manajemen siswa, guru, dan absensi |
| Keputusan Toku | Infrastruktur yang diinginkan memakai free tier Vercel dan Neon |
| Keputusan Toku | Urutan uji satu kelas, pilot enam kelas, kemudian pengembangan berikutnya diterima |
| Keputusan Toku | Guru menandai siswa yang tidak hadir, lalu mengonfirmasi siswa lainnya hadir sebelum menyimpan kehadiran kelas |
| Keputusan Toku | Aplikasi mengutamakan kenyamanan penggunaan lewat HP dan tablet; laptop tetap didukung |
| Keputusan Toku | Satu sekolah; guru yang ditunjuk memakai satu akun miliknya dengan peran admin; seluruh guru aktif dapat mengakses semua kelas |
| Keputusan Toku | Identitas/lokasi/zona waktu sekolah disimpan dalam tabel konfigurasi dan dapat diatur admin |
| Keputusan Toku | Tahun ajaran, hari belajar, dan tanggal libur dapat dikonfigurasi admin |
| Keputusan Toku | Siswa datang belakangan dikoreksi menjadi Hadir; tidak ada status Terlambat terpisah |
| Keputusan Toku | Usulan lainnya diterima, termasuk login email/password, koreksi tercatat, Excel/cetak, serta prosedur backup |
| Keputusan Toku | Data yang berubah setelah ekspor terakhir diberi penanda; tidak ada kunci bulan |
| Keputusan Toku | Database memakai satu Neon project dengan branch development dan production |
| Data persiapan | Nilai identitas sekolah, kalender, pemilik akun, perangkat dan lokasi backup diisi/diverifikasi saat onboarding; format resmi SIKL belum diketahui |

Toku telah menyetujui PRD dan Technical Reference Document sebagai dasar implementation plan. Persetujuan rancangan tidak menggantikan pengisian konfigurasi nyata atau hasil uji lapangan.

## 2. Siapa yang menggunakan sistem?

| Peran | Pekerjaan utama | Hak akses |
|---|---|---|
| Admin/operator sekolah | Menyiapkan data dan memeriksa laporan | Mengelola siswa, guru, kelas, tahun ajaran, kalender dan akses; mengoreksi absensi; mengekspor seluruh kelas |
| Guru | Mengajar dan mencatat kehadiran | Melihat siswa dan seluruh kelas; mencatat/mengoreksi absensi dalam periode aktif; melihat dan mengekspor rekap |
| Penerima laporan | Menerima hasil bulanan | Menerima berkas atau printout dari operator; belum memiliki akun sistem |

Admin merupakan peran pada akun, tidak harus orang ketiga. Guru yang ditunjuk memakai satu akun miliknya dengan peran admin, untuk pencatatan harian maupun administrasi; akun ini tidak dibagikan ke guru lain. Satu orang hanya memiliki satu akun, sehingga nama pencatat tidak terpecah. Siswa dan orang tua belum menjadi pengguna aplikasi.

## 3. Hasil yang ingin dicapai

1. Daftar siswa dan pembagian kelas tersedia tanpa menyalin ulang pada setiap bulan.
2. Guru dapat menyelesaikan satu kelas dengan menandai siswa yang tidak hadir lalu mengonfirmasi sisanya.
3. Kedua guru bisa saling menggantikan tanpa berbagi akun.
4. Rekap bulanan dihasilkan dari catatan harian yang sama, tanpa menghitung ulang secara manual.
5. Laporan menunjukkan data yang belum lengkap sehingga tidak menghasilkan kehadiran palsu.

### 3.1 Ukuran keberhasilan pilot

Angka berikut adalah target usulan untuk diuji, bukan hasil yang sudah dicapai.

| Ukuran | Target usulan | Cara mengukur |
|---|---|---|
| Waktu pencatatan satu kelas berisi 10 siswa | Median paling lama 60 detik setelah daftar dibuka | Observasi tugas dengan guru; pisahkan waktu observasi fisik siswa dari waktu penggunaan aplikasi |
| Pengurangan waktu rekap bulanan | Minimal 50% dibanding proses sekarang | Ukur baseline manual sebelum pilot dan ulangi dengan data bulan yang sama |
| Kemampuan guru bekerja mandiri | Kedua guru menyelesaikan pencatatan, koreksi, dan ekspor tanpa didampingi setelah orientasi singkat | Skenario tugas, catat langkah yang membingungkan |
| Akurasi rekap | Seluruh jumlah H/S/I/A cocok dengan sumber harian dalam sampel pilot | Cocokkan setiap siswa pada periode pilot, bukan hanya total sekolah |
| Kelengkapan | Setiap kelas-hari belajar yang lewat tercatat atau terlihat jelas belum lengkap | Pemeriksaan harian dan rekap akhir pilot |
| Pemulihan data | Backup dapat dikembalikan di lingkungan terpisah | Uji restore sebelum data nyata digunakan |
| Waktu buka pertama harian | Diukur sejak M1; target ditetapkan dari hasil ukur | Catat waktu dari membuka tautan sampai daftar kelas tampil dalam kondisi dingin, terpisah dari kondisi hangat |

Pilot awal berlangsung lima hari belajar sebagai usulan. Jika waktu atau akurasi tidak memenuhi target, alur diperbaiki sebelum menambah fitur.

## 4. Cakupan rilis awal

| ID | Fitur | Prioritas |
|---|---|---|
| F-01 | Login, akun admin/guru, pengelolaan akses | Wajib |
| F-02 | Tahun ajaran, enam kelas awal, kalender hari belajar | Wajib |
| F-03 | Manajemen siswa dan riwayat penempatan kelas | Wajib |
| F-04 | Manajemen guru dan kelas utama | Wajib |
| F-05 | Absensi harian per kelas dengan konfirmasi | Wajib |
| F-06 | Koreksi, konflik perubahan, dan riwayat absensi | Wajib |
| F-07 | Rekap bulanan, ekspor .xlsx, halaman cetak | Wajib |
| F-08 | Ringkasan kelas yang belum dicatat | Wajib |

LKPD tetap menjadi arah pengembangan: pustaka siap cetak terlebih dahulu, kemudian penyusun berbasis template/bank soal. Kurikulum dan sumber materi ditentukan dalam perencanaan tahap LKPD.

Integrasi otomatis SIKL, absensi per pelajaran, pemindaian QR/RFID, biometrik, aplikasi siswa, notifikasi WhatsApp, nilai/rapor, pembayaran, dan layanan banyak sekolah berada di luar rilis awal. Penggunaan saat internet terputus sebatas mempertahankan isian pada halaman yang sedang terbuka; penyimpanan offline dan sinkronisasi otomatis belum menjadi cakupan.

## 5. Bagaimana pekerjaan sehari-hari berlangsung?

### 5.1 Persiapan oleh operator

1. Operator masuk menggunakan akun admin.
2. Operator mengatur nama sekolah sasaran, tahun ajaran, tanggal mulai/akhir, hari belajar, dan tanggal libur.
3. Operator membuat kelas serta memasukkan siswa: nama, kode siswa internal, kelas, dan tanggal mulai belajar.
4. Operator membuat dua profil guru dan akun masing-masing, lalu menetapkan tiga kelas utama per guru.
5. Operator memeriksa daftar bersama guru sebelum absensi pertama.

Untuk sekitar 60 siswa, form input manual menjadi kebutuhan awal. Import Excel belum diwajibkan; tambahkan setelah ada bukti input awal menjadi hambatan.

### 5.2 Mencatat absensi

1. Guru membuka halaman hari ini; tiga kelas utamanya tampil terlebih dahulu.
2. Guru memilih kelas. Tanggal lokal sekolah dan jumlah siswa terlihat jelas.
3. Semua siswa awalnya berstatus **Belum dicatat**. Guru cukup menandai siswa yang tidak hadir sebagai Sakit, Izin, atau Alpa. Guru juga dapat menandai Hadir secara individual.
4. Guru menekan **Simpan, siswa lainnya hadir**. Ringkasan jumlah Hadir/Sakit/Izin/Alpa ditampilkan sebelum konfirmasi akhir.
5. Sesudah dikonfirmasi, sistem menyimpan seluruh kelas sebagai satu transaksi.
6. Halaman menampilkan **Tersimpan**, waktu, dan nama pencatat berdasarkan respons server.

Contoh hipotetis: dari 10 siswa, guru menandai satu Sakit dan satu Izin; setelah konfirmasi, tersimpan delapan Hadir, satu Sakit, satu Izin, nol Alpa. Membuka halaman tanpa menyimpan menghasilkan nol catatan kehadiran.

Alur ini disebut **Tandai siswa yang tidak hadir, lalu simpan kehadiran kelas**. Siswa yang belum ditandai hanya menjadi Hadir setelah guru memastikan kehadirannya dan mengonfirmasi penyimpanan.

Pencatatan dapat dilakukan sebelum atau sesudah ngaji. Aplikasi tidak mewajibkan jam tertentu sampai sekolah menetapkan kebijakan. Kehadiran fisik tetap diverifikasi guru.

### 5.3 Mengganti guru dan memperbaiki catatan

Guru pengganti membuka kelas melalui daftar seluruh kelas. Nama pencatat mencerminkan akun yang benar-benar menyimpan, bukan guru utama kelas. Siswa yang datang setelah pencatatan dapat dikoreksi dari Alpa menjadi Hadir, dengan alasan singkat.

Jika dua guru menyimpan kelas dan tanggal yang sama, perubahan kedua tidak boleh menimpa perubahan pertama secara diam-diam. Guru mendapat pesan untuk memuat catatan terbaru dan menerapkan koreksinya kembali.

### 5.4 Membuat laporan bulanan

1. Guru/operator memilih tahun ajaran, bulan, dan kelas atau seluruh kelas.
2. Sistem menampilkan rekap dan jumlah catatan yang belum lengkap sampai tanggal berjalan.
3. Operator memeriksa kekosongan dan melakukan koreksi yang diperlukan.
4. Operator mengunduh Excel atau membuka halaman cetak.
5. Berkas diserahkan melalui mekanisme yang disepakati sekolah. Tombol ekspor tidak menunjukkan bahwa laporan telah dikirim ke SIKL.

## 6. Persyaratan fungsional dan penerimaan

### F-01: Akun dan akses

- Akun dibuat oleh admin; pendaftaran umum ditutup.
- Satu orang memakai satu akun; peran admin diberikan pada akun guru yang ditunjuk.
- Login memakai email dan password, tanpa ketergantungan OTP untuk tugas harian.
- Admin dapat memperbarui akun, mereset password melalui mekanisme admin, dan menonaktifkan akses.
- Password sementara harus diganti sebelum pengguna mengakses data siswa; reset membatalkan sesi lama.
- Menonaktifkan akun tidak menghapus nama pencatat di riwayat.
- Tidak boleh menonaktifkan atau menurunkan hak admin aktif terakhir.

**Penerimaan:** akses langsung guru ke operasi admin ditolak server; akun yang dinonaktifkan tidak dapat membaca atau mengubah data menggunakan sesi lama.

### F-02: Tahun ajaran, kelas, dan kalender

- Kelas terikat tahun ajaran dan tingkat 1 sampai 6; jumlah siswa dan guru tidak dibatasi tepat pada angka pilot.
- Satu tahun ajaran menjadi periode aktif. Tahun ajaran lama tetap dapat dibaca dan diekspor.
- Hari belajar ditentukan oleh operator, dengan pengecualian tanggal libur/hari belajar tambahan.
- Halaman Kalender Akademik menampilkan bulan dalam tahun ajaran terpilih beserta hari belajar, libur, dan hari tambahan. Guru dapat melihat; admin mengatur pola hari rutin dan pengecualian tanggal. Kalender memakai aturan yang sama dengan absensi.
- Nama kelas unik dalam satu tahun ajaran; kelas yang sudah memiliki riwayat diarsipkan, bukan dihapus.
- Nama sekolah, lokasi, dan zona waktu dapat diatur melalui konfigurasi admin yang tersimpan di database; Asia/Kuala_Lumpur adalah nilai awal yang dapat diubah.
- Perubahan zona waktu menampilkan waktu sekolah sebelum/sesudah, memerlukan alasan setelah ada absensi, dan tidak mengubah tanggal catatan lama. Penyimpanan absensi selalu memvalidasi tanggal terhadap zona waktu yang berlaku saat disimpan.
- Kalender yang sudah mempunyai absensi tidak dapat diubah diam-diam. Admin harus membatalkan sesi terkait dengan alasan sebelum menjadikan tanggal itu libur.

**Penerimaan:** tanggal libur tidak dianggap Alpa, tanggal mendatang tidak dianggap absensi terlewat, dan pergantian tahun ajaran tidak mengubah laporan lama.

### F-03: Manajemen siswa

- Wajib: nama lengkap, kode siswa internal unik, kelas, tanggal mulai. NIS/NISN bersifat opsional jika tersedia.
- Kode internal dibangkitkan sistem bila belum ada nomor sekolah. Nama tidak digunakan sebagai kunci identitas; dua siswa boleh mempunyai nama yang sama.
- Nama dapat diperbaiki. Penempatan kelas disimpan sebagai riwayat bertanggal.
- Siswa baru, pindah kelas, keluar, dan naik kelas memakai tanggal efektif. Naik kelas dibuat sebagai penempatan baru untuk tahun ajaran berikutnya.
- Usulan MVP: tanggal efektif yang mengubah daftar siswa pada sesi yang sudah disimpan ditolak. Operator dapat memilih tanggal setelah sesi terakhir terdampak; koreksi penempatan historis ditangani sebagai pemeliharaan data terverifikasi di luar alur rutin MVP.
- Siswa keluar tetap muncul pada laporan periode saat masih belajar; tidak memperoleh Alpa sesudah tanggal keluarnya.
- Data alamat, dokumen identitas, foto, dan diagnosis kesehatan tidak diperlukan untuk absensi awal.

**Penerimaan:** pindah kelas tidak memindahkan catatan lama; siswa belum terdaftar dan sudah keluar tidak dihitung sebagai wajib hadir pada tanggal di luar masa penempatannya.

### F-04: Manajemen guru

- Profil guru minimal berisi nama dan status aktif. Profil dapat dibuat sebelum akun login tersedia.
- Guru aktif dapat memiliki beberapa kelas utama; tiga kelas per guru merupakan konfigurasi pilot.
- Kedua guru boleh memiliki kelas utama yang sama jika rolling membutuhkan itu; kelas utama mengatur urutan tampilan, bukan hak akses.
- Semua guru aktif dapat mencatat seluruh kelas dalam tahun ajaran aktif untuk mendukung penggantian.
- Arsip profil menonaktifkan akun terhubung dalam transaksi yang sama; penggantian tugas mempertahankan riwayat pencatat lama.

**Penerimaan:** penggantian guru tidak membutuhkan berbagi password dan tidak mengubah identitas pada absensi yang sudah ada.

### F-05: Absensi harian

- Satu siswa hanya memiliki satu status kehadiran per tanggal belajar: Hadir (H), Sakit (S), Izin (I), Alpa (A).
- Belum dicatat merupakan ketiadaan catatan, bukan nilai Alpa atau Hadir.
- Simpan berlaku per kelas per tanggal; seluruh siswa yang memenuhi syarat disimpan bersama.
- Hari ini mengikuti waktu sekolah. Tanggal yang dipilih terlihat selama pencatatan dan konfirmasi.
- Guru dapat mengisi hari belajar yang terlewat dalam tahun ajaran aktif. Pencatatan masa depan ditolak.
- Kelas kosong menunjukkan pesan untuk memeriksa daftar siswa, tanpa membuat absensi sukses kosong.
- Ketika permintaan gagal, pilihan di halaman tetap ada dan status menunjukkan belum tersimpan. Jika respons hilang sesudah server berhasil, coba ulang dengan isi yang sama tidak menggandakan catatan dan menampilkan Tersimpan.

**Penerimaan:** kunjungan halaman tidak membuat data; satu kegagalan penulisan membatalkan seluruh simpan kelas; klik ganda tidak menghasilkan duplikasi.

### F-06: Koreksi dan riwayat

- Koreksi mencantumkan alasan, pencatat, waktu, status sebelumnya dan status baru.
- Guru mengoreksi dalam tahun ajaran aktif; admin juga dapat mengoreksi tahun ajaran lama.
- Perubahan bersamaan diperiksa menggunakan versi sesi. Konflik meminta pengguna memuat data terbaru.
- Guru melihat riwayat absensi; hanya admin dapat membatalkan satu sesi secara keseluruhan dengan alasan.
- Sesi dibatalkan ditampilkan sebagai belum dicatat pada rekap, dengan riwayat pembatalan tetap tersedia.

**Penerimaan:** koreksi tercermin pada laporan berikutnya, catatan lama tetap dapat ditelusuri, dan data usang tidak menimpa data baru.

### F-07: Rekap Excel dan cetak

- Baris siswa, kolom tanggal 1 sampai akhir bulan, serta total H/S/I/A per siswa.
- Penanda: H/S/I/A untuk catatan; `?` untuk hari belajar yang lewat/hari ini belum dicatat; `L` untuk libur; `-` untuk di luar masa penempatan; `.` untuk hari belajar mendatang.
- Prioritas penanda: di luar penempatan (`-`), hari libur (`L`), masa depan (`.`), lalu status tersimpan atau `?`.
- Total hanya menjumlahkan catatan H/S/I/A. `?`, `L`, `-`, dan `.` tidak menambah total.
- Laporan bulan berjalan dibatasi evaluasi kelengkapannya sampai hari ini. Laporan dengan `?` diberi label **Belum lengkap**, termasuk dalam Excel/cetak.
- Nama sekolah, kelas, tahun ajaran, bulan, legenda, tanggal pembuatan, dan nama pengekspor tersedia.
- Excel seluruh kelas berisi satu lembar per kelas dan satu lembar ringkasan. Cetak memakai A4 landscape, satu kelas per halaman untuk ukuran pilot, judul kolom berulang jika melewati satu halaman.
- Format awal merupakan format internal usulan; tanda tangan disediakan sebagai ruang kosong, tanpa membuat nama atau tanda tangan pejabat.
- Sistem mencatat setiap unduhan Excel dan setiap penekanan tombol Cetak. Bila data kelas pada bulan itu berubah setelah ekspor terakhir (koreksi, pembatalan, atau pengisian hari yang terlewat), rekap, Excel, dan cetak menampilkan penanda **Berubah setelah ekspor terakhir** beserta waktu dan nama pengekspor serta tanggal yang berubah. Tidak ada kunci bulan; koreksi tetap dapat dilakukan.

**Penerimaan:** Excel dan halaman cetak memakai hasil perhitungan yang sama; siswa pindah bulan berjalan terlihat pada kelas asal dan tujuan dengan rentang masing-masing; gabungan total tidak menghitung ganda; ekspor lalu koreksi memunculkan penanda pada tanggal yang tepat, dan ekspor berikutnya menjadi acuan baru.

### F-08: Ringkasan hari ini

- Tampilkan kelas utama dahulu, status Sudah dicatat/Belum dicatat, jumlah siswa, dan akses seluruh kelas.
- Jumlah Hadir berasal dari catatan tersimpan. Kelas belum dicatat menampilkan belum tersedia, bukan nol siswa hadir.
- Saat hari libur, ringkasan menjelaskan bahwa absensi tidak diperlukan.
- Kelas kosong dibedakan dari kelas belum dicatat. Data diperbarui setelah simpan/koreksi dan saat pengguna memuat ulang.

**Penerimaan:** guru dapat mengetahui kelas mana yang membutuhkan pencatatan tanpa membuka semua daftar siswa.

## 7. Persyaratan kualitas

| Area | Persyaratan |
|---|---|
| Kemudahan | Bahasa Indonesia; tindakan menggunakan istilah sekolah; guru tidak perlu memahami istilah teknis |
| Perangkat | Web dengan prioritas penggunaan HP dan tablet, mendukung orientasi portrait/landscape serta laptop operator; jenis perangkat nyata divalidasi pada M0 |
| Aksesibilitas | Status memakai teks, bukan warna saja; form berlabel, fokus terlihat, target sentuh nyaman |
| Ketahanan | Loading, kosong, gagal, konflik, sesi habis, dan penyimpanan berhasil memiliki pesan yang jelas |
| Kinerja | Target awal simpan kelas p95 <= 3 detik saat layanan hangat; karena guru membuka aplikasi sekitar sekali sehari, waktu buka pertama kondisi dingin menjadi ukuran utama yang dirasakan guru dan diukur sejak M1 |
| Konsistensi | Catatan harian dan audit disimpan atomik; laporan berasal dari data tersimpan |
| Privasi | Login wajib untuk data dan ekspor; hanya data siswa yang diperlukan dikumpulkan |
| Operasional | Backup database terenkripsi otomatis terjadwal yang mencakup setiap hari belajar; uji restore sebelum pilot; XLSX bukan backup database |
| Biaya | Target biaya hosting/database nol untuk pilot yang memenuhi ketentuan dan kuota provider; tanpa janji gratis selamanya |

### 7.1 Kenyamanan penggunaan HP dan tablet

- Alur login, memilih kelas, absensi, konfirmasi, koreksi, dan pengelolaan siswa/guru dapat diselesaikan melalui layar sentuh tanpa mouse atau tindakan yang hanya muncul saat hover.
- Pada HP, daftar siswa memakai susunan vertikal dengan nama dan pilihan status yang mudah dibaca. Tanggal, kelas, dan tombol simpan tetap mudah ditemukan tanpa tabel lebar untuk pencatatan harian.
- Tombol dan pilihan status memiliki area sentuh minimal 44 × 44 CSS pixel dengan jarak yang mencegah salah tekan. Label status tetap terlihat; warna bukan satu-satunya pembeda.
- Pada tablet, ruang tambahan digunakan untuk memperlihatkan lebih banyak daftar atau ringkasan. Pergantian orientasi mempertahankan pilihan absensi yang belum disimpan selama halaman tetap terbuka.
- Form dan dialog menyesuaikan tinggi layar serta keyboard virtual; field, pesan validasi, dan tombol konfirmasi tidak tertutup. Form siswa/guru tidak mewajibkan tampilan desktop.
- Rekap di HP menampilkan ringkasan total per siswa terlebih dahulu. Tabel tanggal bulanan dapat digulir horizontal di area tabel dengan identitas siswa tetap jelas; halaman keseluruhan tidak melebar ke samping.
- Download Excel tersedia di HP/tablet. Halaman cetak tetap dapat dibuka dari perangkat tersebut; hasil cetak fisik dan koneksi printer diverifikasi terpisah pada perangkat sekolah.

**Penerimaan:** uji alur inti pada lebar viewport 360, 768, dan 1024 CSS pixel, serta portrait/landscape pada perangkat pilot. Tidak ada tombol atau teks penting terpotong, gulir horizontal halaman, status yang hanya dapat dipilih lewat hover, atau pilihan absensi yang hilang karena perubahan orientasi. Gulir horizontal hanya diperbolehkan dalam area tabel rekap. Kedua guru melakukan uji pencatatan dan koreksi di HP/tablet yang benar-benar tersedia sebelum pilot diperluas.

## 8. Rencana pengerjaan dan gerbang keberhasilan

| Milestone | Hasil | Ketergantungan | Gerbang untuk lanjut |
|---|---|---|---|
| M0: Persiapan lapangan | Validasi admin, perangkat, kalender, daftar siswa/guru, baseline, periode KKN dan siapa yang meneruskan operasional | Review dokumen; berjalan paralel dengan M1 | Data dan kebijakan minimum siap sebelum data nyata; format internal rekap disetujui untuk pilot; tidak menahan pengembangan dengan data contoh |
| M1: Slice pertama | Login, satu kelas data contoh, absensi sentuh, ringkasan hari ini, preview pada branch development | Dokumen disetujui | Guru mencoba alur pada HP sendiri; konflik, klik ganda, kegagalan simpan, dan pergantian orientasi teruji otomatis |
| M2: Produk inti enam kelas | Rekap Excel/cetak dengan penanda ekspor, pengelolaan siswa/guru/kalender lengkap, koreksi/riwayat, rolling, audit, backup otomatis, hardening | M1 teknis | Seluruh persyaratan wajib tersedia; perhitungan dan restore lulus; data nyata, perangkat, dan printer siap; kedua guru siap pilot |
| M3: Pilot lapangan | Pemakaian nyata selama lima hari belajar; perbaikan berdasarkan observasi | M2 | Akurasi dan kemudahan memenuhi target; tidak ada kehilangan data atau konflik yang menimpa perubahan |
| M4: Evaluasi | Catatan hasil pilot dan keputusan operasi rutin | M3 | Operator menerima laporan dan prosedur pemulihan; pekerjaan rutin lebih ringan |
| Tahap berikut: LKPD | Perencanaan pustaka siap cetak, lalu template | Evaluasi produk inti | Kebutuhan materi, sumber, dan kurikulum diverifikasi dalam PRD berikutnya |

Pengerjaan memakai vertical slice: alur yang bisa dicoba guru lebih dahulu, lalu rekap bulanan sebagai nilai utama, kemudian pelengkap; rinciannya pada [Implementation Plan](IMPLEMENTATION_PLAN.md). Estimasi kalender pengerjaan ditinjau setelah Slice 1 berjalan; dokumen ini tidak menetapkan deadline tanpa mengetahui kapasitas pelaksana. Pilot sebaiknya dijadwalkan saat teman KKN masih berada di sekolah. LKPD tidak menjadi syarat lulus rilis absensi.

## 9. Risiko dan tindak lanjut

| Risiko | Dampak | Penanganan |
|---|---|---|
| Digital menambah langkah | Guru kembali ke kertas | Uji dengan kedua guru; ukur waktu; konfirmasi sekali per kelas |
| Siswa salah dianggap hadir | Laporan keliru | Tidak ada Hadir otomatis sebelum konfirmasi; ringkasan akhir terlihat |
| Jadwal belajar salah | Libur menjadi absensi terlewat | Kalender disiapkan operator dan diverifikasi sebelum pilot |
| Perubahan daftar siswa merusak sejarah | Rekap lama berubah | Penempatan bertanggal dan pembatasan perubahan retrospektif |
| Respons simpan hilang | Guru mengira data hilang/duplikasi | Kirim ulang isi yang sama dikenali sebagai sudah tersimpan; versi sesi mencegah penimpaan |
| Internet/provider gagal | Pencatatan tertunda | Pesan belum tersimpan, isian tetap di halaman; fallback catatan sementara dan input setelah pulih |
| Kuota free tier habis | Layanan berhenti | Cek dashboard berkala, hindari polling; opsi peningkatan plan dievaluasi berdasarkan penggunaan nyata |
| Excel tidak sesuai SIKL | Perlu menyalin laporan | Validasi contoh format/mekanisme sebelum merancang adapter |
| Operator tunggal tidak tersedia | Akun/pemulihan sulit | Tetapkan penanggung jawab serta pengganti sebelum operasi rutin |
| Masa KKN berakhir | Pendamping lapangan hilang; operasional tidak jelas | Guru admin dan Toku menjadi pemilik operasional/teknis sebelum pilot; jadwalkan pilot saat pendamping masih ada |
| Laporan berubah setelah diserahkan | Penerima memegang data lama tanpa tahu ada koreksi | Penanda Berubah setelah ekspor terakhir pada rekap, Excel, dan cetak |

## 10. Keputusan terkonfirmasi dan persiapan operasional

Q-01 sampai Q-05 diputuskan langsung oleh Toku; usulan untuk Q-06 sampai Q-09 juga diterima. Pada review 6 Oktober 2026, Toku merevisi Q-01 dan Q-08 serta memutuskan Q-10 dan Q-11. Q-09 tetap (setiap hari belajar, 30 salinan); mekanismenya diperbarui menjadi otomatis terjadwal dari hasil review yang sama. Tabel berikut membedakan keputusan desain yang sudah ditetapkan dari data dan bukti yang perlu disiapkan saat implementasi. Tidak perlu meminta persetujuan ulang untuk keputusan yang sama.

| ID | Topik | Keputusan | Persiapan yang diperlukan |
|---|---|---|---|
| Q-01 | Admin | Satu akun per orang; guru yang ditunjuk memakai akunnya dengan peran admin; pemeliharaan teknis oleh Toku | Isi identitas pemilik akun dan pengganti operasional sebelum akun nyata dibuat |
| Q-02 | Identitas/lokasi/zona waktu | Configurable melalui tabel konfigurasi sekolah dan form admin | Isi nama/lokasi/timezone nyata; nilai awal timezone Asia/Kuala_Lumpur |
| Q-03 | Kalender/tahun ajaran | Configurable melalui form admin dan tabel kalender/tahun ajaran | Isi hari belajar dan rentang tahun ajaran sebelum absensi nyata |
| Q-04 | Akses kelas | Semua guru aktif dapat mengakses seluruh kelas; tiga kelas utama mengatur urutan awal | Konfigurasi assignment awal |
| Q-05 | Siswa datang belakangan | Koreksi ke Hadir, dengan alasan; tanpa status Terlambat terpisah | Uji alur koreksi pada M1 |
| Q-06 | Laporan | Ekspor internal .xlsx dan cetak; adapter SIKL belum termasuk scope | Verifikasi format penerima sebelum mengklaim kompatibilitas resmi |
| Q-07 | Login/perangkat | Email/password; prioritas HP/tablet, laptop didukung | Isi email akun dan uji perangkat guru |
| Q-08 | Hosting | Vercel Hobby dan Neon Free; satu Neon project `rough-dawn-85427948` dengan branch development dan production | Verifikasi kuota aktual sebelum deployment operasional; agent hanya memakai branch development |
| Q-09 | Backup | Backup otomatis terjadwal yang mencakup setiap hari belajar; simpan 30 salinan terakhir | Tetapkan runner, pemilik, tujuan penyimpanan/kunci dan retensi data sekolah; uji restore sebelum data nyata |
| Q-10 | Status proyek | Sukarela tanpa pembayaran; Toku membantu teman KKN; dipakai sebagai pemakaian non-komersial | Catat periode KKN dan siapa yang meneruskan operasional setelah KKN selesai |
| Q-11 | Perubahan setelah ekspor | Penanda Berubah setelah ekspor terakhir; tanpa kunci bulan | Uji penanda pada rekap, Excel, dan cetak |

## 11. Keterlacakan ke rancangan teknis

| Kebutuhan | Bagian di Technical Reference Document |
|---|---|
| F-01 dan F-04 | Autentikasi/otorisasi, model teacher dan akun, kontrak API |
| F-02 dan F-03 | Kalender, kelas tahunan, enrollments, invariants dan transaksi penempatan |
| F-05 dan F-06 | Protokol simpan, no-op berbasis state, versi sesi, audit |
| F-07 dan F-08 | Proyeksi laporan, penanda perubahan setelah ekspor, dan query ringkasan |
| Milestone dan kualitas | Strategi pengujian, deployment, backup, daftar pekerjaan |

Sumber kebutuhan adalah percakapan Toku tanggal 4 sampai 6 Oktober 2026. Klaim kemampuan provider dan pilihan teknis dirujuk di [Technical Reference Document](TECHNICAL_REFERENCE.md); target pilot di atas merupakan usulan produk.
