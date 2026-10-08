# Verifikasi panduan terhadap aplikasi

Panduan menamai kontrol sesuai UI yang diuji. Langkah yang membutuhkan akun provider, data nyata atau perangkat ditandai checkpoint dan tidak diklaim selesai lewat automation.

| Panduan/area                                                               | Bukti otomatis                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Guru login/logout/ganti password                                           | auth.spec, auth integration, teachers.spec password sementara/reset |
| Pilih kelas, H/S/I/A, konfirmasi/batal/rotasi/gagal/retry/sesi habis       | attendance.spec, components.spec, guides.spec                       |
| Koreksi Alpa→Hadir, alasan, no-op, konflik/reload, void/isi ulang, history | corrections.spec, attendance integration, guides.spec               |
| Rekap/filter/totals/tabel/Excel/print/penanda ekspor                       | reports.spec, print.spec, reports integration, guides.spec          |
| Admin identitas/timezone/setup                                             | settings.spec, settings integration                                 |
| Tahun/kelas/kalender                                                       | school-master.spec, year-operations.spec dan integration            |
| Siswa identitas/enrollment/arsip/tahun berikutnya                          | students.spec, enrollments.spec dan integration                     |
| Guru/akun/kelas utama/akses/reset/admin terakhir                           | teachers.spec, teachers integration, permissions.spec               |
| Audit/filter/pagination/before-after                                       | audit.spec dan audit integration                                    |
| Pemelihara backup/restore/retensi/gagal/nonzero                            | backup integration                                                  |
| Guard rilis/local/metadata dan smoke                                       | release-target domain, release-safety integration, smoke.spec       |
| Mobile/keyboard/states/touch                                               | mobile-sweep.spec, components.spec, attendance.spec                 |
| Provider/deploy/owner/kuota                                                | Runbook sumber resmi dan checklist H-02/H-04; akun belum tersedia   |
| Perangkat/Excel/printer/pilot/handover                                     | H-03/H-06/H-07/H-08/H-09 masih memerlukan bukti manusia             |

guides.spec menjalankan urutan login→pilih kelas→Alpa→konfirmasi→koreksi Hadir dengan alasan→history→rekap→Excel→halaman Cetak dengan kontrol yang dinamai dalam panduan guru. Uji fitur lain melaksanakan langkah admin yang dipetakan di atas. Dialog cetak sistem diganti stub pada automation; printer fisik tetap H-06. Templat pilot tetap kosong dan tidak berisi hasil contoh yang menyerupai bukti lapangan.
