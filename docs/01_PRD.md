# Product Requirements Document (PRD)

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Sumber: PRD Pantau SPBU Malang (Notion export), disesuaikan dengan kondisi repositori per 2026-10-14.

## 1. Problem

Antrean panjang di SPBU Malang akibat kelangkaan/keterlambatan pasokan BBM. Warga sering mendatangi SPBU yang kosong atau antreannya mengular hingga ke jalan raya, membuang waktu dan bahan bakar.

## 2. Target Pengguna

| Persona | Kebutuhan |
|---|---|
| Pengendara motor/mobil | Mengetahui SPBU terdekat yang BBM-nya tersedia dan antreannya pendek |
| Anggota komunitas | Berbagi kondisi lapangan secara cepat |
| Warga umum | Memantau situasi pasokan BBM kota |

## 3. Fitur dan Prioritas (MoSCoW)

| ID | Fitur | Prioritas | Phase |
|---|---|---|---|
| F-01 | Peta SPBU dengan penanda status | Must | 1 |
| F-02 | Pembaruan status *real-time* (polling/SSE, lihat ADR-006) | Must | 1 |
| F-03 | Pelaporan status oleh warga (modal/UI) | Must | 2 |
| F-04 | Validasi geofencing laporan (radius 100 m) | Must | 2 |
| F-05 | Penarikan Traffic API (radius 50 m dari gerbang SPBU) | Should | 3 |
| F-06 | Deteksi antrean via CCTV (OpenCV/YOLO) | Could | 3 |
| F-07 | *Confidence score* gabungan tiga sumber | Must | 4 |
| F-08 | Notifikasi Telegram/WhatsApp saat SPBU kritis | Should | 4 |
| F-09 | Filter/pencarian SPBU, detail SPBU | Could | _TBD_ |

## 4. Strategi Akuisisi Data (Sensor Fusion)

1. **Traffic API** (primary trigger): kepadatan lalu lintas pada radius 50 m dari gerbang SPBU (Google/TomTom).
2. **Computer Vision** (validasi): hitung kendaraan antre dari CCTV publik dengan OpenCV/YOLO.
3. **Crowdsourcing**: laporan warga, divalidasi geofencing (GPS perangkat dalam radius SPBU).

## 5. User Story

- **US-001** — Sebagai pengendara, saya ingin melihat peta SPBU dengan warna status agar memilih SPBU yang tidak penuh.
- **US-002** — Sebagai pengendara, saya ingin status berubah otomatis tanpa memuat ulang halaman.
- **US-003** — Sebagai warga di lokasi SPBU, saya ingin melaporkan status (normal/antre panjang/kosong) dengan cepat.
- **US-004** — Sebagai sistem, saya menolak laporan dari perangkat di luar radius 100 m dari SPBU.
- **US-005** — Sebagai pengelola komunitas, saya ingin mendapat notifikasi Telegram/WhatsApp saat SPBU berstatus kritis.

## 6. Metrik Keberhasilan

| Metrik | Target |
|---|---|
| Jumlah SPBU tercakup | _TBD_ |
| Laporan valid per hari | _TBD_ |
| Rasio laporan ditolak geofence terhadap total | dipantau, _TBD_ |
| Latensi status sumber → tampil di peta | _TBD_ |
| Pengguna aktif (promosi Phase 4) | _TBD_ |

## 7. Asumsi dan Catatan Terbuka

- Akses stream CCTV Dishub Malang belum pasti ("jika accessible").
- Platform data memakai Neon sepenuhnya (PostgreSQL, Auth, Storage) — lihat [11_DECISIONS.md](11_DECISIONS.md) (ADR-002). PRD asli menyebut Supabase pada bagian stack; bagian itu digantikan.
- Radius 50 m (Traffic API) dan 100 m (geofence) adalah dua parameter berbeda.

Detail turunan: [03_FRD.md](03_FRD.md), [04_TRD.md](04_TRD.md).
