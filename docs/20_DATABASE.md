# Database

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Skema awal dari PRD. Belum ada migrasi di repositori (_TBD_ — buat setelah ADR-002 diputuskan).

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

## Catatan

- Indeks `(spbu_id, created_at DESC)` untuk query status terbaru — usulan.
- Status terkini per SPBU = baris terbaru atau hasil agregasi berbobot (Phase 4).
- RLS: klien publik hanya `SELECT`; `INSERT` melalui server — lihat [04_TRD.md](04_TRD.md) (TR-007).
