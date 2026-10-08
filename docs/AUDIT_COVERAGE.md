# Cakupan audit aplikasi

Audit administratif dapat dibaca admin pada menu Audit atau GET /api/audit. Filter mencakup jenis/ID entitas, pelaku dan rentang tanggal sekolah; batas100 catatan, default20, cursor timestamp mikrodetik + ID. Riwayat aktor mutasi memakai nama saat perubahan. Nama pengekspor dari ledger memakai identitas akun saat pembacaan. Nilai before/after adalah snapshot, bukan hasil menghitung ulang data lama.

| Mutasi | Catatan | Nilai yang dicatat | Bukti otomatis |
|---|---|---|---|
| Identitas/timezone | settings.update | Config lama/baru, versi dan alasan timezone | settings integration |
| Buat/edit/current tahun | academic-year.create/update/current | Periode/flag/versi sebelum-sesudah; current lama juga dicatat | school-master/year-operations integration |
| Kelas/arsip | class.create/update | Tahun/grade/nama/arsip/versi | school-master/year-operations integration |
| Kalender | calendar.update | Pola hari dan overrides lama/baru | school-master integration + lock test |
| Identitas siswa | student.create/update | Kode/nama/NIS/NISN dan placement awal, versi | students integration |
| Penempatan/transfer/keluar | enrollment.create/transfer/end | ID/kelas/tanggal sebelum-sesudah, alasan dan versi siswa | enrollments integration |
| Rencana dibatalkan | enrollment.cancel | Rencana lengkap sebelum dibatalkan, after null | enrollments integration + riwayat siswa |
| Arsip/aktif siswa | student.archive | Status lama/baru, versi dan alasan | enrollments integration |
| Profil/status guru | teacher.create/update | Profil dan akses akun sebelum-sesudah; archive sekaligus revoke | teachers integration |
| Tautkan akun | teacher.account-link | User lama/baru, role, versi | teachers rollback/duplicate tests |
| Kelas utama | teacher.classes | Daftar kelas lama/baru | teachers integration |
| Role/nonaktif akun | user.access | Role dan banned sebelum-sesudah | teachers last-admin/race tests |
| Reset admin | user.password-reset | Flag wajib ganti aktual sebelum/sesudah, sesi dicabut | teachers integration |
| Ganti password pribadi | user.password-change | Flag lama/baru dan permintaan revoke sesi lain | auth integration; credential/session/flag rollback bila audit gagal |
| Bootstrap awal lokal | user.bootstrap | Identitas akun baru, role, flag dan tautan profil; actor akun yang dibuat | bootstrap CLI integration |
| Catat/koreksi/isi ulang | attendance.submit/correct | Roster/status/state/versi sebelum-sesudah, snapshot aktor dan alasan | attendance integration |
| Pembatalan sesi | attendance.void | Isi lama lengkap, after voided tanpa records, versi/alasan | attendance rollback/race integration |
| Excel/cetak | report_exports | Pengekspor, waktu, tahun/bulan/kelas, format dan peta versi | reports integration + print/download e2e |

Ekspor memakai ledger append-only tersendiri dan tampil bersama mutasi pada audit admin. Membuka rekap/cetak/preview batch dan GET tidak menambah audit. No-op absensi atau penutupan tanpa perubahan tidak menambah versi/audit. Password, credential hash, token dan payload login dikecualikan dari audit. Database menolak UPDATE/DELETE terhadap audit_events dan report_exports.

Log teknis API hanya memuat requestId server, actorId yang diketahui dari guard, action, durationMs terukur dan errorCode yang disetujui. Body, URL/query, cookie, nama siswa, password, token, pesan error mentah dan stack tidak dicetak. AsyncLocalStorage memisahkan metadata request bersamaan; kegagalan collector tidak mengubah respons yang sudah commit. Logger bawaan auth dimatikan; audit/metadata tetap tersedia. Test menambahkan payload sensitif sintetis dan memeriksa bahwa nilainya tidak masuk log. APP_ENV=test meredam log normal kecuali APP_LOG_TEST=1.

Saat menambah mutasi, pilih snapshot before/after yang diperlukan dan alasan, gunakan client transaksi yang sama, tambahkan penerimaan rollback/otorisasi yang relevan, lalu perbarui tabel ini. Jangan mencatat payload login atau credential untuk membantu debugging.
