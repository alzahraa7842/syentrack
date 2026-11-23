# AlumniTrack — Rekap Karir Alumni & Tracer Study

Platform web terpadu, modern, dan profesional untuk rekap karir alumni sekolah, survei tracer study berstandar akreditasi BAN-SM / Puspresnas, bursa kerja khusus (BKK), dan monitoring serapan lulusan.

---

## 🚀 Fitur Unggulan

- **Role-Based Access Control (RBAC)**: Login otomatis mendeteksi peran (`ADMIN` untuk Guru BK / Operator Sekolah dan `ALUMNI` untuk Lulusan).
- **Dashboard Eksekutif Admin**: Metrik keterisian tracer study, donut chart status karir, grafik tren per angkatan & jurusan, dan pemetaan persebaran domisili.
- **Manajemen Data Alumni**: CRUD lengkap, pencarian instan, filter multi-kriteria, server-side pagination, dan modal konfirmasi proteksi data.
- **Import & Export Fleksibel**:
  - **Import**: Unggah Excel (`.xlsx`, `.xls`) & CSV dengan pratinjau validasi data error sebelum disimpan.
  - **Export**: Unduh laporan resmi PDF (lengkap dengan kop sekolah, statistik, dan tabel rapi) serta buku kerja Excel multi-sheet.
- **Instrumen Kuesioner Interaktif**: Desain pertanyaan kuesioner dinamis (teks, pilihan ganda, dropdown, rating bintang 1-5, angka, tanggal).
- **Alumni Wizard Stepper**: Pengisian kuesioner 8 langkah ramah gawai dengan fitur simpan draf.
- **Pusat Karir & Magang**: Publikasi lowongan kerja, beasiswa, dan event dengan integrasi tombol **Google Calendar** dan berkas `.ics`.
- **Forum Diskusi Alumni**: Kanal kolaborasi dan berbagi pengalaman kerja dengan fitur moderasi admin (kunci topik & hapus).
- **Audit Log Keamanan**: Pencatatan kronologis aktivitas krusial untuk akuntabilitas sistem.

---

## 🛠️ Arsitektur Teknologi

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, jsPDF, XLSX.
- **Backend**: Golang 1.22, Gin Web Framework, GORM ORM, JWT Authentication, bcrypt password hashing.
- **Database**: PostgreSQL 16 dengan automated schema migration dan database volume.
- **Reverse Proxy**: Nginx Alpine dengan kompresi Gzip dan routing SPA.
- **Containerization**: Docker & Docker Compose (kompatibel penuh dengan Docker Desktop Windows).

---

## 📋 Prasyarat Sistem

1. **Docker Desktop** (untuk Windows atau macOS / Linux) terpasang dan dalam status *Running*.
2. **Git** (opsional untuk cloning repositori).

---

## ⚡ Panduan Menjalankan dengan Docker Desktop

### 1. Salin Pengaturan Lingkungan
Buka PowerShell atau Command Prompt di folder proyek:
```bash
copy .env.example .env
```
*(Di Linux / macOS gunakan `cp .env.example .env`)*

### 2. Jalankan Seluruh Layanan
Jalankan satu perintah berikut:
```bash
docker compose up --build
```

Docker akan secara otomatis:
1. Menyiapkan database PostgreSQL dan menjalankan healthcheck.
2. Melakukan build container backend Golang Gin & database migration.
3. Melakukan build container frontend React & Nginx.
4. Menghubungkan seluruh service melalui Docker network internal.

### 3. Mengakses Aplikasi
Setelah container selesai dibuat:
- **Aplikasi Web (Frontend)**: [http://localhost](http://localhost)
- **API Backend**: [http://localhost/api](http://localhost/api)
- **PostgreSQL Database**: `localhost:5432` (Database: `tracer_study`, User: `postgres`, Password: `postgres`)

---

## 🛑 Perintah Manajemen Container

- **Menghentikan aplikasi**:
  ```bash
  docker compose down
  ```

- **Mereset database dan menghapus volume data**:
  ```bash
  docker compose down -v
  ```

- **Melihat status log container backend**:
  ```bash
  docker compose logs -f backend
  ```

---

## 🔑 Akun Demo Bawaan

| Peran (Role) | Email / Akun | Password | Keterangan |
|---|---|---|---|
| **ADMIN** | `admin@sekolah.sch.id` | `Admin123!` | Guru BK / Operator Sekolah |
| **ALUMNI** | `budi.santoso@alumni.sch.id` | `Alumni123!` | Lulusan PPLG (Bekerja di PT Telkom) |
| **ALUMNI** | `0058291023` (NISN) | `Alumni123!` | Login menggunakan nomor NISN |

*Catatan: Pada halaman login juga tersedia tombol jalan pintas **"Akses Uji Coba Cepat (Demo Mode)"** untuk kemudahan evaluasi penguji.*

---

## 📄 Lisensi
Hak Cipta © 2026 SMK Negeri 1 Prestasi Nusantara. Seluruh Hak Dilindungi Undang-Undang.
