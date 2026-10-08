# Kontras token redesign

Rasio dihitung dari token CSS dengan rumus luminansi relatif WCAG. Brand sky hanya aksen dekoratif; teks dan kontrol memakai turunan primary/ring. Border card adalah pemisah dekoratif, sedangkan kontrol memakai control-border yang memenuhi 3:1.

| Teks/komponen | Latar | Rasio | Minimum | Hasil |
|---|---|---|---|---|
| --foreground | --surface | 16.90:1 | 4.5:1 | PASS |
| --muted-foreground | --background | 5.38:1 | 4.5:1 | PASS |
| --muted-foreground | --surface-muted | 5.18:1 | 4.5:1 | PASS |
| --primary | --primary-soft | 5.17:1 | 4.5:1 | PASS |
| --primary-foreground | --primary | 5.93:1 | 4.5:1 | PASS |
| --primary-foreground | --primary-hover | 7.56:1 | 4.5:1 | PASS |
| --primary-foreground | --destructive | 5.55:1 | 4.5:1 | PASS |
| --status-pending | --status-pending-soft | 6.92:1 | 4.5:1 | PASS |
| --status-holiday | --status-holiday-soft | 5.05:1 | 4.5:1 | PASS |
| --control-border | --surface | 3.54:1 | 3:1 | PASS |
| --ring | --surface | 4.10:1 | 3:1 | PASS |
| --status-h | --status-h-soft | 6.49:1 | 4.5:1 | PASS |
| --primary-foreground | --status-h-selected | 7.13:1 | 4.5:1 | PASS |
| --status-s | --status-s-soft | 6.37:1 | 4.5:1 | PASS |
| --primary-foreground | --status-s-selected | 7.09:1 | 4.5:1 | PASS |
| --status-i | --status-i-soft | 7.57:1 | 4.5:1 | PASS |
| --primary-foreground | --status-i-selected | 5.70:1 | 4.5:1 | PASS |
| --status-a | --status-a-soft | 6.80:1 | 4.5:1 | PASS |
| --primary-foreground | --status-a-selected | 4.83:1 | 4.5:1 | PASS |

Token terpilih Hadir/Sakit memakai turunan gelap agar teks putih memenuhi 4.5:1; nilai terang dari brief tidak memenuhi syarat tersebut. Teks Libur juga disesuaikan untuk kontras latar soft. Tidak ada mode gelap.
