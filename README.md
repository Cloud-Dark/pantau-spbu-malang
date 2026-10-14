# ⛽ Pantau SPBU Malang (Real-Time Tracker)

Inisiatif *open-source* untuk memantau ketersediaan BBM dan panjang antrean di berbagai SPBU di wilayah Malang secara *real-time*. Proyek ini dikembangkan di bawah bendera **satset-dev** dengan tujuan memberikan solusi taktis terhadap masalah antrean BBM menggunakan pendekatan data kolaboratif dan analitik pintar.

## 🏗️ Struktur Repositori (Monorepo)

Proyek ini menggunakan struktur *monorepo* yang membagi sistem menjadi dua bagian utama:

- **`/web-client`**: Antarmuka *frontend* interaktif berbasis peta. Dibangun menggunakan Next.js dan Tailwind CSS, mengambil data dari basis data Neon melalui server (Route Handler) untuk pembaruan status mendekati *real-time* (mendukung pelaporan *crowdsourcing* dan visualisasi).
- **`/vision-engine`**: Skrip *backend* dan *worker* berbasis Python. Bertugas untuk melakukan penarikan data dari API Lalu Lintas (Traffic API) dan memproses tangkapan CCTV publik menggunakan OpenCV untuk memvalidasi kepadatan antrean.

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
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)

**Deployment**  
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## 🚀 Cara Menjalankan Proyek Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18.x atau terbaru)
- [Python](https://www.python.org/) (versi 3.9 atau terbaru)
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
