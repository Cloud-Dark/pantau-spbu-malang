# Database

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Skema awal dari PRD. Database: Neon PostgreSQL (lihat ADR-002). Migrasi: `web-client/db/migrations/*.sql`, dijalankan `npm run db:migrate` (pelacakan di `schema_migrations`). Seed contoh: `web-client/db/seed.sample.sql` (`npm run db:seed`) — koordinat hanya perkiraan dan **wajib diverifikasi** sebelum rilis. Enum diimplementasikan sebagai `text` + `CHECK`.

## `spbu_locations`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID, PK | |
| `name` | text | Contoh: "SPBU Tlogomas" |
| `address` | text | |
| `lat` | double precision | |
| `lng` | double precision | |

## `status_logs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID, PK | |
| `spbu_id` | UUID, FK → `spbu_locations.id` | |
| `status` | enum | `NORMAL`, `ANTRE_PANJANG`, `KOSONG` |
| `source` | enum | `CCTV`, `TRAFFIC_API`, `CROWDSOURCE` |
| `confidence_score` | integer | 1–100 |
| `created_at` | timestamptz | default `now()` |
| `reporter_hash` | text, null | Migrasi 002. `sha256(ip\|user-agent\|REPORT_HASH_SALT)`; hanya untuk laporan crowdsourcing (rate limit) |
| `distance_m` | integer, null | Migrasi 002. Jarak pelapor ke SPBU saat verifikasi geofence. Koordinat mentah pelapor **tidak disimpan** |

## `notification_log` (migrasi 003)

Status pengiriman notifikasi untuk mencegah spam: `spbu_id`, `status`, `confidence`, `channel` (`telegram`, `whatsapp`, atau `system` sebagai penanda pemulihan NORMAL), `sent_at`; indeks per SPBU dan kanal. Lihat [05_ARCHITECTURE.md](05_ARCHITECTURE.md).

## Catatan

- Indeks `(spbu_id, created_at DESC)` untuk query status terbaru — usulan.
- Status terkini per SPBU = baris terbaru atau hasil agregasi berbobot (Phase 4).
- Akses hanya melalui server (ADR-007); role aplikasi diberi hak minimum — lihat [04_TRD.md](04_TRD.md) (TR-007).
- Gunakan koneksi *pooled* untuk aplikasi; koneksi *direct* hanya untuk migrasi atau `LISTEN/NOTIFY`.
