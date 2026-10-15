# ⛽ Pantau SPBU Malang (Real-Time Tracker)

Inisiatif *open-source* untuk memantau ketersediaan BBM dan panjang antrean di berbagai SPBU di wilayah Malang secara *real-time*. Proyek ini dikembangkan di bawah bendera **satset-dev** dengan tujuan memberikan solusi taktis terhadap masalah antrean BBM menggunakan pendekatan data kolaboratif dan analitik pintar.

## 🏗️ Struktur Repositori (Monorepo)

Proyek ini menggunakan struktur *monorepo* yang membagi sistem menjadi dua bagian utama:

- **`/web-client`**: Antarmuka *frontend* interaktif berbasis peta. Dibangun menggunakan Next.js dan Tailwind CSS, mengambil data dari basis data Neon melalui server (Route Handler) untuk pembaruan status mendekati *real-time* (mendukung pelaporan *crowdsourcing* dan visualisasi).
- **`/vision-engine`**: *Worker* berbasis Node.js (TypeScript). Bertugas untuk melakukan penarikan data dari API Lalu Lintas (Traffic API) dan memproses tangkapan CCTV publik dengan ffmpeg dan model YOLO (ONNX) untuk memvalidasi kepadatan antrean.

## 🛠️ Tech Stack

**Web & UI**  
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Database & Realtime Data**  
![Neon](https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=neon&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

**AI & Computer Vision Pipeline**  
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![ONNX](https://img.shields.io/badge/ONNX_Runtime-005CED?style=for-the-badge&logo=onnx&logoColor=white)

**Deployment**  
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## 🚀 Cara Menjalankan Proyek Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 20.x atau terbaru)
- [ffmpeg](https://ffmpeg.org/) (opsional, hanya untuk jalur CCTV)
- Akun [Neon](https://neon.tech/) untuk basis data PostgreSQL (lihat `docs/16_CONFIG_REFERENCE.md`)
- Git

### Langkah Instalasi

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/satset-dev/pantau-spbu-malang.git
   cd pantau-spbu-malang
   ```

2. **Siapkan environment** — buat `web-client/.env.local` berisi `DATABASE_URL` (lihat `.env.example` dan `docs/16_CONFIG_REFERENCE.md`).

3. **Migrasi, seed, dan jalankan:**
   ```bash
   cd web-client
   npm install
   npm run db:seed        # buat tabel + 8 SPBU contoh (koordinat perkiraan)
   npm run dev            # http://localhost:3000
   npm run db:simulate    # tambah status acak; peta ikut berubah dalam ~10 detik
   ```

4. **Worker (opsional):**
   ```bash
   cd vision-engine
   npm install
   npm run run:once       # satu siklus Traffic/CCTV (butuh DATABASE_URL; lihat vision-engine/README.md)
   ```

## ✅ Status Pengembangan (per 2026-10-15)

### Fase 1 — MVP dan Scaffolding
- [x] Buat GitHub Organization dan inisiasi monorepo
- [x] Struktur `web-client` (Next.js) dan `vision-engine`
- [x] Project Neon (database, Auth, Storage) dan tabel dasar (migrasi 001)
- [x] Pemetaan 53 titik koordinat gerbang SPBU se-Malang Raya secara presisi (`docs/data/data_spbu_malang.csv` dan database Neon)
- [x] Peta SPBU dari database (Leaflet + `/api/spbu`)
- [x] Pembaruan status di frontend via polling 10 detik
- [ ] Deploy `web-client` ke Vercel (env vars produksi sudah siap)

### Fase 2 — Crowdsourcing dan Geofencing
- [x] Modal/UI pelaporan status
- [x] `navigator.geolocation` untuk koordinat pelapor
- [x] Server menolak laporan di luar radius 100 m (plus cek akurasi dan rate limit)

### Fase 3 — Vision Engine dan Traffic Integration
- [x] Proyek Node.js (TypeScript) `/vision-engine` (menggantikan Python)
- [x] Penjadwal penarik Traffic API (TomTom) — kode dan uji mock
- [x] Memperbaiki isu pembacaan environment variables di `vision-engine`
- [x] Setup Environment Variables produksi (`CRON_SECRET`, `REPORT_HASH_SALT`, `TRAFFIC_API_KEY`, `DATABASE_URL`)
- [x] Menyiapkan model YOLOv8n ONNX (pre-trained COCO) tanpa custom training (`vision-engine/models/yolov8n.onnx`)
- [x] Membuat konfigurasi dummy `vision-engine/cctv-sources.json` dan verifikasi pipeline `vision-engine` di localhost end-to-end (berhasil)
- [x] `INSERT` otomatis ke `status_logs` (teruji ke Neon nyata)

### Fase 4 — Rilis Publik dan Otomasi
- [x] Algoritma pembobotan confidence score
- [x] Webhook notifikasi Telegram/WhatsApp (`/api/cron/notify`)
- [x] Materi promosi (`docs/promosi/`)
- [ ] Menjalankan kampanye promosi ke warga Malang

## 📋 TO-DO / Next Phase

- [ ] **Deploy ke Vercel** — Deploy `web-client` dan `vision-engine` ke Vercel (karena semua env vars sudah siap).
- [ ] **Integrasi notifikasi WhatsApp** — Integrasi dan verifikasi webhook WhatsApp untuk pengiriman notifikasi otomatis.
- [ ] **Akses CCTV Dishub Malang** — Mendapatkan dan mengganti dummy CCTV dengan URL RTSP/HLS asli dari Dishub Malang.
- [ ] **Testing GitHub Actions workflow** — Verifikasi eksekusi terjadwal `vision-engine-cron.yml`.
- [ ] **Dokumentasi lanjutan** — Menulis dokumen yang masih kurang (`docs/standards/` dan `12_TEST_STRATEGY.md`).
- [ ] **Kalibrasi lapangan** — Kalibrasi bobot confidence dan ambang batas (*threshold*) langsung di lapangan.

Dokumentasi lengkap ada di [`docs/`](docs/README.md); detail progres di [`docs/07_MASTER_CHECKLIST.md`](docs/07_MASTER_CHECKLIST.md) dan riwayat perubahan di [`docs/31_CHANGELOG.md`](docs/31_CHANGELOG.md).
