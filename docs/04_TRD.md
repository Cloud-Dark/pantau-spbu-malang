# Technical Requirements Document (TRD)

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## 1. Stack

| Lapisan | Teknologi | Sumber |
|---|---|---|
| Frontend | Next.js 16.4.0, React 19.3.0, TypeScript 5, Tailwind CSS 4 | `web-client/package.json` |
| Peta | Leaflet atau React-Map-GL (belum dipilih) | PRD |
| Database | Neon PostgreSQL (pooled) via `@neondatabase/serverless` / `pg` — pilihan driver _TBD_ | Keputusan pemilik |
| Auth | Neon Auth (JWKS) | Keputusan pemilik |
| Storage | Neon Storage, S3-compatible (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) | Keputusan pemilik |
| Konfigurasi | `dotenv` untuk skrip Node/worker | Keputusan pemilik |
| Worker | Node.js >= 20 (TypeScript), ffmpeg, onnxruntime-node (YOLO ONNX) | ADR-008 |
| Deployment | Vercel (client, serverless functions) | PRD |
| Repositori | GitHub, monorepo (`web-client`, `vision-engine`) | PRD |

## 2. Kebutuhan Teknis

| ID | Kebutuhan | Trace |
|---|---|---|
| TR-001 | Monorepo dengan dua paket: `/web-client` dan `/vision-engine` | — |
| TR-002 | Skema `spbu_locations` dan `status_logs` di PostgreSQL (lihat [20_DATABASE.md](20_DATABASE.md)) | FR-001, FR-007 |
| TR-003 | Frontend memperbarui status lewat polling Route Handler (Phase 1) dengan opsi SSE — ADR-006 | FR-003 |
| TR-004 | Validasi geofence di sisi server (middleware/serverless), bukan hanya klien; rumus jarak Haversine | FR-006 |
| TR-005 | Worker menulis ke Neon memakai `DATABASE_URL` server; tidak pernah diekspos ke klien | FR-010 |
| TR-006 | Kunci API (Traffic API, `DATABASE_URL`, kredensial Neon Storage, Telegram) disimpan di variabel lingkungan | FR-008, FR-012 |
| TR-007 | Browser tidak terhubung ke database; akses hanya lewat server (ADR-007). Role database aplikasi diberi hak minimum (`SELECT`/`INSERT` pada tabel terkait) | FR-001 |
| TR-008 | Worker terjadwal (cron) — mekanisme penjadwal _TBD_ | FR-008 |
| TR-009 | Perhitungan confidence score dapat diuji (fungsi murni) | FR-011 |
| TR-010 | Koneksi memakai `sslmode=require`; kredensial tidak pernah masuk repositori — lihat [16_CONFIG_REFERENCE.md](16_CONFIG_REFERENCE.md) | — |
| TR-011 | Berkas di Neon Storage diakses lewat *presigned URL* berkedaluwarsa (`forcePathStyle: true`) | FR-009 |
| TR-012 | Algoritma confidence tertimbang berupa fungsi murni teruji ([22_CONFIDENCE_ALGORITHM.md](22_CONFIDENCE_ALGORITHM.md)) | FR-011 |
| TR-013 | Notifikasi lewat `/api/cron/notify` (Vercel Cron), dilindungi `CRON_SECRET`, dengan cooldown di `notification_log` | FR-012 |

## 3. Batasan Teknis

- Next.js 16.4 memiliki *breaking changes*; baca `web-client/node_modules/next/dist/docs/` sebelum menulis kode (lihat `web-client/AGENTS.md`).
- `web-client` memakai `cacheComponents`; Route Handler `/api/spbu` berjalan saat request (tanpa cache) dan peta dirender hanya di klien.
- Akses CCTV Dishub belum terverifikasi; jalur CCTV bersifat opsional dan fail-soft.
- Pustaka peta: Leaflet + react-leaflet, dirender klien saja (ADR-005 diputuskan).
