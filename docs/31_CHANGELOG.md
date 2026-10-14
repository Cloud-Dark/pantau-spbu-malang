# Changelog

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Format mengikuti [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- 2026-10-14: Set dokumen awal `docs/` (charter, PRD, BRD, FRD, TRD, arsitektur, rencana implementasi, checklist, roadmap, risk register, decisions, glosarium, database) dan rencana Fase 1.

- 2026-10-14: Phase 1 — migrasi Neon (`spbu_locations`, `status_logs`), seed contoh 8 SPBU, endpoint `GET /api/spbu`, peta Leaflet dengan penanda berwarna per status dan polling 10 detik, skrip `db:migrate`, `db:seed`, `db:simulate`.

### Changed
- 2026-10-14: Platform data diganti dari Supabase ke Neon sepenuhnya (PostgreSQL, Auth, Storage). Realtime diganti polling/SSE (ADR-002, ADR-006, ADR-007). Ditambah `16_CONFIG_REFERENCE.md`.

## Riwayat sebelumnya (dari git)
- Inisiasi struktur `web-client` dan `vision-engine`.
- README dengan tech stack dan struktur monorepo.
