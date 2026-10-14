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
- [ ] Modal/UI pelaporan status
- [ ] `navigator.geolocation` untuk koordinat pelapor
- [ ] Middleware menolak laporan di luar radius 100 m

## Fase 3 — Vision Engine dan Traffic Integration
- [ ] Inisiasi proyek Node.js (TypeScript) `/vision-engine` (struktur nyata, bukan placeholder)
- [ ] Cron job penarik Traffic API pada poligon SPBU
- [ ] Integrasi stream CCTV Dishub dengan ffmpeg + ONNX YOLO (jika dapat diakses)
- [ ] Skrip Node.js `INSERT` otomatis ke `status_logs`

## Fase 4 — Rilis Publik dan Otomasi
- [ ] Algoritma pembobotan confidence score
- [ ] Webhook notifikasi Telegram/WhatsApp
- [ ] Promosi ke warga Malang

## Dokumentasi
- [x] Set dokumen awal `docs/` (2026-10-14)
- [ ] Dokumen standar (`docs/standards/`) — _TBD_
