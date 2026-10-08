# Panduan pemelihara dan handover

Gunakan [runbook operasional](RUNBOOK.md) untuk backup/restore/koreksi historis/tahun baru dan [runbook rilis](RELEASE_RUNBOOK.md) untuk lingkungan, migrasi/deploy/rollback, guard serta pemilik dashboard. Bukti uji dan checkpoint ada pada [log](IMPLEMENTATION_LOG.md); [validasi](VALIDATION.md) memisahkan ukuran lokal dari provider/perangkat nyata. Akses aplikasi admin berbeda dari akses owner Neon/Vercel/storage.

## Pemeriksaan berkala

Setiap hari belajar, admin memeriksa kelas belum dicatat dan kelengkapan rekap; pemilik backup memeriksa hasil job terakhir serta salinan baru. Cadangan harian terenkripsi dan retensi 30 salinan memerlukan runner/tujuan/recipient nyata H-07. Private identity disimpan offline; runner backup memakai public recipient.

Setiap minggu, periksa umur backup, kuota penyimpanan, notifikasi, compute/storage/connection Neon serta bandwidth/function/build Vercel pada dashboard dan plan aktual. Gunakan requestId/action/errorCode untuk diagnosis API; log tidak membutuhkan nama siswa atau credential. APP_LOG_TEST=1 hanya untuk melihat metadata pada uji lokal. Catat penggunaan/ambang/pemilik; perubahan biaya/plan perlu keputusan Toku.

Sesudah perubahan aplikasi, jalankan frozen install, format/lint/type/domain/integration/build/browser pada data sintetis dan verifikasi preview development. CI checks berisi service PostgreSQL 18 dan tool backup; secret produksi tidak dipasang pada job tersebut. Migrasi/bootstrap rilis memakai manifest/konfirmasi terpisah, setelah metadata branch diverifikasi operator. Build tidak memigrasi atau membuat data. Jangan push/deploy produksi dari otomatisasi agent.

## Insiden dan pemulihan

Jika simpan/otorisasi/totals bermasalah, hentikan write terkait, simpan catatan sementara guru dan catat waktu/commit/requestId. Pertahankan database rusak untuk investigasi. Pilih rollback aplikasi yang cocok dengan schema/secret, atau restore data ke database baru sesuai runbook; keduanya berbeda. Setelah restore, cabut sesi, periksa counts/hash serta sample rekap, uji login baru dan rekonsiliasi catatan sejak backup. Jangan mengubah/menghapus audit atau memindahkan status lama secara otomatis.

Drill lokal menggunakan APP_ENV=test, loopback dan elementary_test_* serta key temporer. Drill produksi hanya operator H-07 pada target baru yang disetujui. RPO/RTO satu hari adalah target operasional, belum hasil pengukuran produksi. Bukti emulator/PDF belum menutup HP guru/Excel/printer nyata.

## Paket handover H-09

| Barang           | Pemilik/penerus dan bukti yang diisi saat handover                                             |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Repo/commit/CI   | URL, akses minimum, commit yang diterima dan receipt CI nyata                                  |
| Aplikasi sekolah | URL/domain, dua guru, admin aktif cadangan dan prosedur reset                                  |
| Neon/Vercel      | Project/branch/region, owner/penerus, MFA dan dashboard kuota                                  |
| Backup/storage   | Runner, remote, public recipient, identity offline, penerima notifikasi, receipt restore drill |
| Data/kalender    | Daftar siswa/kode/tanggal, kelas, tahun/kalender, pengesahan sekolah                           |
| Perangkat/cetak  | Jenis HP/tablet, browser, Excel/printer dan hasil H-03/H-06                                    |
| Insiden          | Kontak, jam tanggung jawab, penghentian write, restore dan eskalasi                            |
| Pilot            | [Templat evaluasi](PILOT_EVALUATION.md), isu/FIX, kesimpulan dan keputusan H-09                |

Semua kolom pemilik/nilai nyata masih diisi oleh Toku/sekolah; tidak menamai penerus atau membuat bukti lapangan. Credential dipindahkan melalui password manager/jalur aman, bukan Git atau tabel ini. Pemelihara berikutnya mempraktikkan login/reset, tahun baru, membaca penanda ekspor dan restore drill sebelum menerima tanggung jawab.
