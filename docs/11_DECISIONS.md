# Decision Log (ADR)

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## ADR-001 — Monorepo dengan dua paket
- **Tanggal:** 2026-10-14 (dicatat; keputusan awal dari PRD)
- **Keputusan:** Satu repositori berisi `/web-client` dan `/vision-engine`.
- **Konteks:** Tim kecil, dua bahasa (TypeScript dan Python; kemudian disatukan ke TypeScript, lihat ADR-008), skema data bersama.
- **Alternatif ditolak:** Repositori terpisah (overhead koordinasi).

## ADR-002 — Database dan platform data: Neon (menggantikan Supabase)
- **Tanggal:** 2026-10-14
- **Status:** Diputuskan oleh pemilik proyek.
- **Keputusan:** Seluruh platform data memakai **Neon**: PostgreSQL (koneksi *pooled*), Neon Auth, dan Neon Storage (S3-compatible). Supabase tidak digunakan sama sekali.
- **Konteks:** PRD awal mencampur Neon (checklist) dan Supabase (stack). Pemilik memutuskan Neon sepenuhnya.
- **Konsekuensi:**
  - Tidak ada Supabase Realtime. Pembaruan *real-time* diganti — lihat ADR-006.
  - Tidak ada RLS ala klien-langsung. Klien tidak pernah terhubung ke database; semua akses lewat server (Route Handler / Server Component) — lihat ADR-007.
  - Autentikasi (jika dibutuhkan) memakai Neon Auth.
  - Penyimpanan berkas (mis. cuplikan CCTV, bukti laporan) memakai Neon Storage via API S3.
- **Alternatif ditolak:** Supabase (ditolak pemilik).

## ADR-003 — Sensor fusion tiga sumber
- **Tanggal:** 2026-10-14 (dicatat dari PRD)
- **Keputusan:** Traffic API sebagai pemicu utama, CCTV sebagai validasi, crowdsourcing sebagai input komunitas.
- **Alternatif ditolak:** Hanya crowdsourcing (rawan spam) atau hanya sensor (tidak tersedia di semua SPBU).

## ADR-004 — Validasi geofence di server
- **Tanggal:** 2026-10-14
- **Keputusan:** Radius 100 m divalidasi di middleware/serverless, bukan hanya di klien.
- **Alternatif ditolak:** Validasi klien saja (mudah dimanipulasi).

## ADR-005 — Pustaka peta
- **Status:** Diputuskan 2026-10-14 — Leaflet + react-leaflet dengan tile OpenStreetMap.
- **Alasan:** Tanpa API key, ringan, cukup untuk penanda berwarna.
- **Alternatif ditolak:** React-Map-GL (butuh penyedia tile/token).

## ADR-006 — Mekanisme pembaruan real-time tanpa Supabase Realtime
- **Tanggal:** 2026-10-14
- **Status:** Diusulkan.
- **Konteks:** Neon tidak menyediakan *realtime subscription* bawaan. Koneksi *pooled* (PgBouncer) tidak mendukung `LISTEN/NOTIFY` yang andal.
- **Keputusan awal (Phase 1):** *polling* ringan dari klien ke Route Handler (interval _TBD_, mis. 10 detik) yang membaca status terbaru.
- **Peningkatan (opsional):** Server-Sent Events dari Route Handler dengan koneksi *direct* (non-pooled) memakai `LISTEN/NOTIFY`, atau layanan pub/sub terpisah (_TBD_).
- **Alternatif ditolak:** Klien langsung ke database (tidak aman).

## ADR-007 — Akses data hanya lewat server
- **Tanggal:** 2026-10-14
- **Keputusan:** Browser tidak pernah menerima `DATABASE_URL` maupun kredensial storage. Baca dan tulis data dilakukan oleh Route Handler/Server Component di `web-client` dan oleh `vision-engine`. Variabel lingkungan tidak berawalan `NEXT_PUBLIC_`.
- **Alternatif ditolak:** Neon Data API/klien langsung dengan RLS (kompleksitas lebih tinggi untuk kebutuhan ini).

## ADR-008 — Backend/worker memakai Node.js (TypeScript), bukan Python
- **Tanggal:** 2026-10-14
- **Status:** Diputuskan oleh pemilik proyek; menggantikan rencana PRD awal (Python + OpenCV).
- **Keputusan:** `/vision-engine` ditulis dengan Node.js (TypeScript). Skrip Python (`main.py`, `requirements.txt`) dihapus.
- **Konteks:** Satu bahasa untuk seluruh monorepo mengurangi biaya konteks dan memudahkan berbagi tipe dan akses database (`@neondatabase/serverless`) dengan `web-client`.
- **Konsekuensi:**
  - Pengganti OpenCV: **ffmpeg** untuk mengambil frame (HLS/RTSP/snapshot) dan **onnxruntime-node** dengan model YOLO format ONNX untuk deteksi kendaraan (pra/pasca-pemrosesan dan NMS ditulis sendiri). OpenCV tidak dipakai.
  - Deteksi dibungkus antarmuka `Detector` agar mesin deteksi dapat diganti.
  - Penjadwalan: loop internal (`npm run start`) atau satu siklus (`npm run run:once`) untuk cron/GitHub Actions.
  - Kebutuhan runtime: Node.js >= 20, ffmpeg terpasang (hanya untuk CCTV), berkas model ONNX (tidak disimpan di repo).
- **Alternatif ditolak:** Python + OpenCV (dua toolchain; ditolak pemilik), opencv4nodejs (build native rapuh).

