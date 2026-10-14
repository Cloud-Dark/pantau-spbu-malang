# Plan: Phase 1 — MVP dan Scaffolding

> Status: Final (kecuali langkah 7 — deploy Vercel)
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## Konteks

Fase 1 membangun fondasi: database, peta SPBU, dan pembaruan status. Dikerjakan solo. Lihat [../06_IMPLEMENTATION_PLAN.md](../06_IMPLEMENTATION_PLAN.md).

## Langkah Implementasi

1. **Database** — Neon sudah diputuskan (ADR-002); project sudah tersedia. Konfigurasi `.env` lokal berdasarkan [../16_CONFIG_REFERENCE.md](../16_CONFIG_REFERENCE.md).
2. **Migrasi tabel** `spbu_locations`, `status_logs` + enum di Neon (lihat [../20_DATABASE.md](../20_DATABASE.md)); buat role aplikasi berhak minimum.
3. **Seed data SPBU Malang** — daftar dan koordinat _TBD_ (sumber data perlu ditentukan).
4. **Bersihkan templat** `web-client/app/page.tsx`; atur variabel lingkungan server-only `DATABASE_URL` (tanpa awalan `NEXT_PUBLIC_`).
5. **Pilih pustaka peta** (ADR-005) dan tampilkan penanda dari `spbu_locations`.
6. **Pembaruan status**: Route Handler membaca status terbaru dan klien melakukan polling (ADR-006) untuk memperbarui warna penanda.
7. **Deploy** ke Vercel (Vercel CLI), set env di Vercel.

## File yang Disentuh

- `web-client/app/page.tsx`, `web-client/app/layout.tsx`, `web-client/package.json`
- Baru: komponen peta, klien database Neon (`web-client/lib/db`), folder migrasi _TBD_

## Risiko

- Breaking changes Next.js 16 — baca `node_modules/next/dist/docs/` dahulu.
- SSR vs pustaka peta (Leaflet butuh klien saja).
- Data SPBU awal belum tersedia.

## Definisi Selesai

Peta publik di Vercel menampilkan SPBU dari database dan berubah warna (lewat polling) saat baris `status_logs` baru ditambahkan.
