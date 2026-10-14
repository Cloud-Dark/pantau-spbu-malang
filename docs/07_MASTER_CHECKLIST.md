# Master Checklist

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## Fase 1 — MVP dan Scaffolding
- [x] Buat GitHub Organization dan inisiasi monorepo
- [x] Inisiasi struktur `web-client` (Next.js) dan `vision-engine` (placeholder)
- [x] Provisioning project Neon (database, Auth, Storage) — kredensial dikelola di luar repositori
- [x] Buat tabel dasar di Neon (migrasi `web-client/db/migrations/001_init.sql`)
- [ ] Deploy `web-client` ke Vercel (butuh akun Vercel pemilik; set `DATABASE_URL` di environment Vercel)
- [x] Peta sederhana menampilkan titik SPBU dari database (Leaflet + `/api/spbu`)
- [x] Pembaruan status di frontend via polling 10 detik (ADR-006; SSE opsional kemudian)

## Fase 2 — Crowdsourcing dan Geofencing
- [x] Modal/UI pelaporan status (`components/report-modal.tsx`)
- [x] `navigator.geolocation` untuk koordinat pelapor (izin ditolak/timeout/tidak didukung ditangani)
- [x] Validasi server menolak laporan di luar radius 100 m (`POST /api/report`, 403) + akurasi, rate limit, validasi input

## Fase 3 — Vision Engine dan Traffic Integration
- [x] Inisiasi proyek Node.js (TypeScript) `/vision-engine` (struktur nyata; Python dihapus — ADR-008)
- [x] Cron/penjadwal penarik Traffic API (TomTom) — kode + uji mock; **live belum diverifikasi** (butuh `TRAFFIC_API_KEY`)
- [x] Pipeline CCTV (ffmpeg + YOLO ONNX) — kode + uji sintetis; **akses CCTV Dishub, model, dan onnxruntime nyata belum diverifikasi**
- [x] Skrip Node.js `INSERT` otomatis ke `status_logs` (teruji ke Neon nyata)
- [ ] Verifikasi dengan kunci TomTom valid dan koordinat SPBU asli
- [ ] Konfirmasi akses CCTV Dishub dan sediakan model YOLO

## Fase 4 — Rilis Publik dan Otomasi
- [x] Algoritma pembobotan confidence score (`lib/confidence.ts`, 13 uji) — bobot belum dikalibrasi
- [x] Webhook notifikasi Telegram/WhatsApp (`/api/cron/notify` + Vercel Cron) — teruji dengan fetch mock; **pengiriman nyata belum diuji**
- [x] Materi promosi ke warga Malang (`docs/promosi/`) — draf; eksekusi kampanye belum
- [ ] Set `CRON_SECRET`, `REPORT_HASH_SALT`, token bot di environment produksi
- [ ] Jalankan kampanye promosi

## Dokumentasi
- [x] Set dokumen awal `docs/` (2026-10-14)
- [x] Kontrak API, algoritma confidence, vision engine, threat model
- [ ] Dokumen standar (`docs/standards/`) — _TBD_
- [ ] `12_TEST_STRATEGY.md` — _TBD_
