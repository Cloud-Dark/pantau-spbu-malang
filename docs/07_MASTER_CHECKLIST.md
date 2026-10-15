# Master Checklist

> Status: Draft
> Terakhir diperbarui: 2026-10-15
> Pemilik: satset-dev

## Fase 1 — MVP dan Scaffolding
- [x] Buat GitHub Organization dan inisiasi monorepo
- [x] Inisiasi struktur `web-client` (Next.js) dan `vision-engine` (placeholder)
- [x] Provisioning project Neon (database, Auth, Storage) — kredensial dikelola di luar repositori
- [x] Buat tabel dasar di Neon (migrasi `web-client/db/migrations/001_init.sql`)
- [x] Memetakan 53 titik koordinat gerbang SPBU se-Malang Raya secara presisi (`docs/data/data_spbu_malang.csv` dan database Neon)
- [ ] Deploy `web-client` ke Vercel (kredensial dan env vars sudah siap)
- [x] Peta sederhana menampilkan titik SPBU dari database (Leaflet + `/api/spbu`)
- [x] Pembaruan status di frontend via polling 10 detik (ADR-006; SSE opsional kemudian)

## Fase 2 — Crowdsourcing dan Geofencing
- [x] Modal/UI pelaporan status (`components/report-modal.tsx`)
- [x] `navigator.geolocation` untuk koordinat pelapor (izin ditolak/timeout/tidak didukung ditangani)
- [x] Validasi server menolak laporan di luar radius 100 m (`POST /api/report`, 403) + akurasi, rate limit, validasi input

## Fase 3 — Vision Engine dan Traffic Integration
- [x] Inisiasi proyek Node.js (TypeScript) `/vision-engine` (struktur nyata; Python dihapus — ADR-008)
- [x] Cron/penjadwal penarik Traffic API (TomTom) — kode + uji mock
- [x] Memperbaiki isu pembacaan environment variables di `vision-engine`
- [x] Setup Environment Variables produksi (`TRAFFIC_API_KEY`, `DATABASE_URL`)
- [x] Pipeline CCTV (ffmpeg + YOLO ONNX) — model YOLOv8n ONNX (pre-trained COCO) disiapkan tanpa custom training
- [x] Konfigurasi dummy `vision-engine/cctv-sources.json` dan pengujian pipeline vision-engine di localhost secara end-to-end (berhasil)
- [x] Skrip Node.js `INSERT` otomatis ke `status_logs` (teruji ke Neon nyata)
- [ ] Mendapatkan dan mengganti dummy CCTV dengan URL RTSP/HLS asli dari Dishub Malang
- [ ] Testing GitHub Actions workflow (`vision-engine-cron.yml`)

## Fase 4 — Rilis Publik dan Otomasi
- [x] Algoritma pembobotan confidence score (`lib/confidence.ts`, 13 uji) — kalibrasi lapangan masih TBD
- [x] Setup Environment Variables produksi (`CRON_SECRET`, `REPORT_HASH_SALT`)
- [x] Materi promosi ke warga Malang (`docs/promosi/`)
- [ ] Integrasi webhook WhatsApp untuk notifikasi
- [ ] Kalibrasi bobot confidence dan ambang batas (threshold) di lapangan
- [ ] Jalankan kampanye promosi ke warga Malang

## TO-DO / Next Phase
- [ ] Deploy web-client dan vision-engine ke Vercel (karena semua env vars sudah siap).
- [ ] Integrasi webhook WhatsApp untuk notifikasi.
- [ ] Mendapatkan dan mengganti dummy CCTV dengan URL RTSP/HLS asli dari Dishub Malang.
- [ ] Testing GitHub Actions workflow (`vision-engine-cron.yml`).
- [ ] Menulis dokumen yang masih kurang (`docs/standards/` dan `12_TEST_STRATEGY.md`).
- [ ] Kalibrasi bobot confidence dan ambang batas (threshold) di lapangan.

## Dokumentasi
- [x] Set dokumen awal `docs/` (2026-10-14)
- [x] Kontrak API, algoritma confidence, vision engine, threat model
- [x] Data 53 koordinat SPBU Malang Raya (`docs/data/data_spbu_malang.csv`)
- [ ] Dokumen standar (`docs/standards/`) — _TBD_
- [ ] `12_TEST_STRATEGY.md` — _TBD_
