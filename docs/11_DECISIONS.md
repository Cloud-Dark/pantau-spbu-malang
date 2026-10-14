# Decision Log (ADR)

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## ADR-001 — Monorepo dengan dua paket
- **Tanggal:** 2026-10-14 (dicatat; keputusan awal dari PRD)
- **Keputusan:** Satu repositori berisi `/web-client` dan `/vision-engine`.
- **Konteks:** Tim kecil, dua bahasa (TypeScript dan Python), skema data bersama.
- **Alternatif ditolak:** Repositori terpisah (overhead koordinasi).

## ADR-002 — Database: Supabase vs Neon
- **Tanggal:** 2026-10-14
- **Status:** **Terbuka — perlu konfirmasi pemilik.**
- **Konteks:** Stack utama PRD adalah Supabase (PostgreSQL + Realtime), tetapi checklist Phase 1 menyebut "Setup project Neon". Fitur realtime hanya tersedia bawaan di Supabase.
- **Usulan:** Gunakan Supabase; koreksi item checklist PRD.

## ADR-003 — Sensor fusion tiga sumber
- **Tanggal:** 2026-10-14 (dicatat dari PRD)
- **Keputusan:** Traffic API sebagai pemicu utama, CCTV sebagai validasi, crowdsourcing sebagai input komunitas.
- **Alternatif ditolak:** Hanya crowdsourcing (rawan spam) atau hanya sensor (tidak tersedia di semua SPBU).

## ADR-004 — Validasi geofence di server
- **Tanggal:** 2026-10-14
- **Keputusan:** Radius 100 m divalidasi di middleware/serverless, bukan hanya di klien.
- **Alternatif ditolak:** Validasi klien saja (mudah dimanipulasi).

## ADR-005 — Pustaka peta
- **Status:** Terbuka — Leaflet atau React-Map-GL (_TBD_).
