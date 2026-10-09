# Panduan Deployment ke Vercel

Panduan ini menjelaskan langkah demi langkah untuk men-deploy aplikasi **Sistem Absensi & Manajemen Sekolah** ke [Vercel](https://vercel.com/) dengan database [Neon PostgreSQL](https://neon.tech/).

---

## 1. Arsitektur Deployment

- **Aplikasi Web**: Next.js 16 (App Router + Turbopack) di-hosting di **Vercel Serverless Function**.
- **Region Serverless**: `sin1` (Singapura), didefinisikan di `vercel.json` agar berdekatan dengan database dan pengguna di Indonesia.
- **Database**: Neon Serverless PostgreSQL 18 di region `ap-southeast-1` (Singapura).
- **Koneksi Database**: Menggunakan _connection pooler_ Neon (`-pooler` pada endpoint host) dengan batas pool kecil (`max: 3`) per fungsi serverless.
- **Autentikasi**: Better Auth dengan penyimpanan sesi di database dan proteksi CSRF/origin.

---

## 2. Persiapan Database (Neon)

Sebelum men-deploy aplikasi ke Vercel, siapkan database di Neon:

1. Buat project baru di [Neon Console](https://console.neon.tech/) dengan region **Asia Pacific (Singapore / ap-southeast-1)**.
2. Dapatkan dua jenis connection string dari dashboard Neon:
   - **Pooled Connection String** (untuk runtime Vercel):
     ```
     postgresql://<user>:<password>@<endpoint>-pooler.ap-southeast-1.aws.neon.tech/<dbname>?sslmode=require
     ```
   - **Direct Connection String** (untuk menjalankan migrasi DDL):
     ```
     postgresql://<user>:<password>@<endpoint>.ap-southeast-1.aws.neon.tech/<dbname>?sslmode=require
     ```
3. Jalankan migrasi skema ke database produksi dari mesin lokal Anda:
   ```bash
   DATABASE_MIGRATION_URL="postgresql://<user>:<password>@<endpoint>.ap-southeast-1.aws.neon.tech/<dbname>?sslmode=require" pnpm release:migrate
   ```
4. Buat akun admin pertama sekolah:
   ```bash
   DATABASE_URL="postgresql://<user>:<password>@<endpoint>.ap-southeast-1.aws.neon.tech/<dbname>?sslmode=require" BETTER_AUTH_SECRET="<secret-anda>" BETTER_AUTH_URL="https://<nama-app>.vercel.app" pnpm release:bootstrap
   ```

---

## 3. Konfigurasi `vercel.json`

File [`vercel.json`](../vercel.json) telah disediakan di root repository:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["sin1"],
  "buildCommand": "pnpm build",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 4. Langkah Deploy via Vercel Dashboard

1. **Login ke Vercel**: Buka [vercel.com](https://vercel.com/) dan masuk ke akun Anda.
2. **Import Repository**:
   - Klik **"Add New..."** → **"Project"**.
   - Pilih repository Git proyek ini.
3. **Konfigurasi Project**:
   - **Framework Preset**: `Next.js` (otomatis terdeteksi).
   - **Root Directory**: `./` (default).
   - **Build Command**: `pnpm build` (otomatis dari `vercel.json`).
   - **Output Directory**: `.next` (default).
   - **Install Command**: `pnpm install` (default).
4. **Environment Variables**:
   Tambahkan variabel lingkungan berikut di tab **Environment Variables**:

   | Variabel             | Lingkungan          | Contoh Nilai / Keterangan                                                                            |
   | -------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
   | `APP_ENV`            | Production, Preview | `production`                                                                                         |
   | `DATABASE_URL`       | Production, Preview | `postgresql://...-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` (Pooled endpoint Neon) |
   | `BETTER_AUTH_SECRET` | Production, Preview | String acak minimal 32 karakter (misal hasil dari `openssl rand -hex 32`)                            |
   | `BETTER_AUTH_URL`    | Production          | `https://<nama-project>.vercel.app` (atau domain kustom Anda)                                        |
   | `TRUSTED_ORIGINS`    | Production, Preview | `https://<nama-project>.vercel.app`                                                                  |

   > **Catatan**: Untuk deployment Preview PR/Branch, aplikasi telah mendukung deteksi otomatis `VERCEL_URL` sehingga fallback URL preview dapat berjalan secara transparan.

5. **Deploy**:
   - Klik tombol **"Deploy"**.
   - Tunggu proses build selesai (~1-2 menit).

---

## 5. Langkah Deploy via Vercel CLI (Alternatif)

Jika Anda ingin men-deploy langsung dari terminal:

```bash
# 1. Install Vercel CLI
pnpm add -g vercel

# 2. Login ke akun Vercel
vercel login

# 3. Tautkan project
vercel link

# 4. Tambahkan environment variable
vercel env add DATABASE_URL production
vercel env add BETTER_AUTH_SECRET production
vercel env add BETTER_AUTH_URL production
vercel env add TRUSTED_ORIGINS production
vercel env add APP_ENV production

# 5. Jalankan deploy ke production
vercel deploy --prod
```

---

## 6. Verifikasi Pasca Deployment (Smoke Test)

Setelah deployment selesai dan status menunjukkan **Ready**:

1. Buka domain aplikasi (misal `https://<nama-project>.vercel.app/login`).
2. Masuk menggunakan akun admin yang telah dibuat pada langkah persiapan.
3. Periksa checklist konfigurasi awal di halaman [`/settings`](file:///settings) dan [`/setup`](file:///setup).
4. Buat tahun ajaran baru di [`/academic-years`](file:///academic-years) dan kelas di [`/classes`](file:///classes).
5. Atur hari belajar di [`/calendar`](file:///calendar).
6. Lakukan uji pencatatan absensi harian di [`/attendance`](file:///attendance) dan ekspor laporan di [`/reports`](file:///reports).
