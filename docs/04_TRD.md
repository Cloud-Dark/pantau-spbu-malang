# Technical Requirements Document (TRD)

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## 1. Stack

| Lapisan | Teknologi | Sumber |
|---|---|---|
| Frontend | Next.js 16.4.0, React 19.3.0, TypeScript 5, Tailwind CSS 4 | `web-client/package.json` |
| Peta | Leaflet atau React-Map-GL (belum dipilih) | PRD |
| Database & Realtime | Supabase (PostgreSQL) + Realtime Subscriptions | PRD |
| Worker | Python 3.9+, OpenCV/YOLO | README, PRD |
| Deployment | Vercel (client, serverless functions) | PRD |
| Repositori | GitHub, monorepo (`web-client`, `vision-engine`) | PRD |

## 2. Kebutuhan Teknis

| ID | Kebutuhan | Trace |
|---|---|---|
| TR-001 | Monorepo dengan dua paket: `/web-client` dan `/vision-engine` | — |
| TR-002 | Skema `spbu_locations` dan `status_logs` di PostgreSQL (lihat [20_DATABASE.md](20_DATABASE.md)) | FR-001, FR-007 |
| TR-003 | Frontend berlangganan perubahan `status_logs` via Supabase Realtime | FR-003 |
| TR-004 | Validasi geofence di sisi server (middleware/serverless), bukan hanya klien; rumus jarak Haversine | FR-006 |
| TR-005 | Worker menulis ke Supabase memakai kredensial server (service role), tidak pernah diekspos ke klien | FR-010 |
| TR-006 | Kunci API (Traffic API, Supabase service role, Telegram) disimpan di variabel lingkungan | FR-008, FR-012 |
| TR-007 | Row Level Security aktif; klien publik hanya boleh `SELECT` | FR-001 |
| TR-008 | Worker terjadwal (cron) — mekanisme penjadwal _TBD_ | FR-008 |
| TR-009 | Perhitungan confidence score dapat diuji (fungsi murni) | FR-011 |

## 3. Batasan Teknis

- Next.js 16.4 memiliki *breaking changes*; baca `web-client/node_modules/next/dist/docs/` sebelum menulis kode (lihat `web-client/AGENTS.md`).
- Folder `web-client/` saat ini masih templat bawaan `create-next-app`.
- `vision-engine/main.py` masih placeholder.
- Leaflet butuh render sisi klien (tanpa SSR) — _TBD_ verifikasi.
