# Panduan admin

Admin memakai akun sendiri dengan peran Admin. Atur data sekolah yang telah diverifikasi bersama guru. Petunjuk guru ada di [panduan guru](PANDUAN_GURU.md); operasi dashboard/backup/rilis ada di [panduan pemelihara](PANDUAN_PEMELIHARA.md).

## Persiapan sekolah

Buka **Sekolah**. Isi nama, lokasi dan zona waktu yang benar, lalu **Simpan identitas sekolah**. Preview waktu membantu memeriksa zona sebelum menyimpan. Jika sudah ada absensi, perubahan zona memerlukan alasan; tanggal catatan lama tetap. Periksa **Persiapan sekolah** dan selesaikan identitas, tahun aktif, hari belajar dan kelas. Nama bertanda data sintetis belum siap digunakan pada sekolah nyata.

Pada **Tahun ajaran**, tambahkan periode. **Berakhir sebelum tanggal** adalah sehari setelah hari terakhir belajar. Pilih aktif sesuai periode sekolah. Buat kelas di menu **Kelas**, lalu atur pola hari dan tanggal libur/hari tambahan di **Kalender**. Jika perubahan kalender ditolak karena absensi tersimpan, periksa sesi yang ditunjukkan dan batalkan melalui alur admin terlebih dahulu bila memang harus dibatalkan.

## Siswa dan penempatan

Di **Siswa**, pilih **Tambah siswa** lalu isi nama lengkap, kelas awal dan tanggal mulai. NIS/NISN opsional; kode dibuat otomatis dan nama sama boleh ada. Pencarian memakai nama, kode atau NIS; filter kelas/status dan pagination membatasi daftar. Buka detail, pilih **Ubah** untuk menyimpan identitas, atau tab **Riwayat penempatan** untuk membaca riwayat. Periksa kode, bukan hanya nama, saat memilih siswa.

Menu **Aksi siswa → Pindah kelas** membuka dialog transfer dalam tahun sama atau penempatan baru/tahun berikutnya. Pilih penempatan asal untuk transfer, kelas tujuan, tanggal mulai dan alasan, lalu **Simpan penempatan**. Pada tanggal efektif, siswa berhenti berada di kelas asal dan mulai berada di tujuan. Transfer harus setelah tanggal mulai sumber dan sebelum akhir sumber. Jika tanggal mengubah absensi tersimpan, sistem menunjukkan tanggal aman; perbaikan historis memerlukan pemelihara dan [runbook](RUNBOOK.md#koreksi-penempatan-historis-s3-01).

Untuk siswa keluar, buka **Aksi siswa → Tutup penempatan**, isi **Tidak bersekolah mulai tanggal** dan alasan, lalu simpan. Siswa tidak diwajibkan hadir mulai tanggal itu, tetapi riwayat lama tetap. Rencana yang belum dimulai dapat **Batalkan penempatan mendatang**; riwayat menandainya dibatalkan. Sebelum **Aksi siswa → Arsipkan siswa**, tutup penempatan berjalan dan batalkan rencana mendatang. Filter **Status siswa → Diarsipkan** membuka daftar arsip; **Aktifkan kembali siswa** tidak membuat penempatan baru otomatis.

## Tahun berikutnya dan arsip

Buka **Persiapan tahun ajaran baru** dari Tahun ajaran. Buat periode tidak aktif, kelas dan kalender, lalu pilih tahun yang disiapkan. Pada **Kelas asal naik kelas**, pilih sumber dan **Buka preview naik kelas**. Pilih siswa, tujuan, tanggal dan alasan, lalu **Periksa preview**. Periksa setiap hasil sebelum **Simpan seluruh batch**. Satu masalah menolak seluruh batch; keberhasilan menampilkan hasil setiap siswa.

Kembali ke persiapan, periksa tanggal sekolah/rentang, lalu **Aktifkan tahun ini** dan **Konfirmasi pindah tahun**. Tahun aktif yang berubah sejak halaman dibuka harus dimuat ulang. Tahun lama tetap dapat dibaca/diekspor; hanya admin mengoreksinya. Arsip kelas/tahun ditolak bila masih ada penempatan berakhir setelah tanggal sekolah; tahun yang masih aktif tidak dapat diarsipkan. Arsip tidak menghapus laporan lama.

## Guru, akun dan akses

Menu **Guru → Tambah guru** mendukung profil tanpa akun. Buka detail, lalu tab **Akun & akses** untuk membuat/menautkan akun. Password sementara diberikan melalui jalur aman dan wajib diganti. Tab **Kelas utama** mengatur kelas tahun berjalan; pilihan ini mengatur urutan, bukan membatasi guru dari kelas lain. Tab **Akun tanpa profil** di daftar memuat akun yang belum terhubung. **Ubah** membuka halaman edit profil.

Perubahan peran/akses, reset password dan arsip dilakukan pada akun/profil yang tepat. **Reset password akun** mencabut sesi dan mewajibkan ganti password. Menonaktifkan profil juga menonaktifkan akun terhubung serta mengakhiri sesinya. Mengaktifkan profil kembali tidak otomatis membuka akses akun; periksa pengaturan akses. Admin aktif terakhir tidak dapat dinonaktifkan, diarsipkan atau diturunkan. Siapkan admin aktif lain lebih dahulu.

## Absensi, laporan dan audit

Koreksi mengikuti panduan guru dengan alasan. Untuk membatalkan seluruh sesi, isi **Alasan pembatalan**, pilih **Batalkan sesi**, periksa lalu **Konfirmasi pembatalan**. Isi lama tetap pada riwayat; rekap menampilkan belum dicatat sampai diisi ulang. Pembatalan bukan cara menghapus jejak perubahan.

Pada **Rekap**, periksa filter, kelengkapan dan penanda perubahan sebelum Excel/cetak. Arsip kelas/tahun masih dapat dipilih. Pembukaan halaman cetak tidak mencatat ekspor; tombol **Cetak** mencatat laporan yang ditampilkan sebelum membuka dialog cetak. Berkas yang telah dibagikan disimpan terpisah oleh operator; unduh/cetak lagi setelah koreksi yang diverifikasi.

**Audit** hanya admin. Pilih jenis/ID entitas, pelaku dan rentang; tanggal akhir ikut dihitung berdasarkan waktu sekolah. **Tampilkan audit**, **Catatan berikutnya**, **Kembali ke halaman pertama** dan **Nilai sebelum dan sesudah** membantu penelusuran. Nama aktor mutasi berasal dari catatan saat perubahan. ID pemeriksaan dapat diberikan kepada pemelihara; jangan mengirim password/token untuk investigasi.
