# Master Checklist

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## Fase 1 — MVP dan Scaffolding
- [x] Buat GitHub Organization dan inisiasi monorepo
- [x] Inisiasi struktur `web-client` (Next.js) dan `vision-engine` (placeholder)
- [x] Provisioning project Neon (database, Auth, Storage) — kredensial dikelola di luar repositori
- [ ] Buat tabel dasar di Neon (migrasi)
- [ ] Hubungkan `web-client` dengan Vercel CLI
- [ ] Peta sederhana menampilkan titik SPBU dari database
- [ ] Pembaruan status realtime di frontend (polling → SSE, ADR-006)

## Fase 2 — Crowdsourcing dan Geofencing
- [ ] Modal/UI pelaporan status
- [ ] `navigator.geolocation` untuk koordinat pelapor
- [ ] Middleware menolak laporan di luar radius 100 m

## Fase 3 — Vision Engine dan Traffic Integration
- [ ] Inisiasi proyek Python `/vision-engine` (struktur nyata, bukan placeholder)
- [ ] Cron job penarik Traffic API pada poligon SPBU
- [ ] Integrasi stream CCTV Dishub dengan OpenCV (jika dapat diakses)
- [ ] Skrip Python `INSERT` otomatis ke `status_logs`

## Fase 4 — Rilis Publik dan Otomasi
- [ ] Algoritma pembobotan confidence score
- [ ] Webhook notifikasi Telegram/WhatsApp
- [ ] Promosi ke warga Malang

## Dokumentasi
- [x] Set dokumen awal `docs/` (2026-10-14)
- [ ] Dokumen standar (`docs/standards/`) — _TBD_
