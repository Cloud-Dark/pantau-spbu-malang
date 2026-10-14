# ⛽ Pantau SPBU Malang (Real-Time Tracker)

Inisiatif *open-source* untuk memantau ketersediaan BBM dan panjang antrean di berbagai SPBU di wilayah Malang secara *real-time*. Proyek ini dikembangkan di bawah bendera **satset-dev** dengan tujuan memberikan solusi taktis terhadap masalah antrean BBM menggunakan pendekatan data kolaboratif dan analitik pintar.

## 🏗️ Struktur Repositori (Monorepo)

Proyek ini menggunakan struktur *monorepo* yang membagi sistem menjadi dua bagian utama:

- **`/web-client`**: Antarmuka *frontend* interaktif berbasis peta. Dibangun menggunakan Next.js dan Tailwind CSS, terhubung langsung ke basis data Supabase untuk pembaruan data secara *real-time* (mendukung pelaporan *crowdsourcing* dan visualisasi).
- **`/vision-engine`**: Skrip *backend* dan *worker* berbasis Python. Bertugas untuk melakukan penarikan data dari API Lalu Lintas (Traffic API) dan memproses tangkapan CCTV publik menggunakan OpenCV untuk memvalidasi kepadatan antrean.

## 🛠️ Tech Stack
- **Web & UI**: Next.js, React, TypeScript, Tailwind CSS, Leaflet / React-Map-GL
- **Database & Realtime Data**: Supabase (PostgreSQL)
- **AI & Computer Vision Pipeline**: Python, OpenCV
- **Deployment**: Vercel

## 🚀 Cara Menjalankan Proyek Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18.x atau terbaru)
- [Python](https://www.python.org/) (versi 3.9 atau terbaru)
- Akun [Supabase](https://supabase.com/) untuk inisialisasi basis data
- Git

### Langkah Instalasi

1. **Clone repositori ini:**
   ```bash
   git clone [https://github.com/satset-dev/pantau-spbu-malang.git](https://github.com/satset-dev/pantau-spbu-malang.git)
   cd pantau-spbu-malang
