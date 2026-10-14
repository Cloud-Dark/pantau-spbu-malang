# Plan: Phase 1 — MVP dan Scaffolding

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## Konteks

Fase 1 membangun fondasi: database, peta SPBU, dan pembaruan realtime. Dikerjakan solo. Lihat [../06_IMPLEMENTATION_PLAN.md](../06_IMPLEMENTATION_PLAN.md).

## Langkah Implementasi

1. **Putuskan database** — konfirmasi Supabase vs Neon (ADR-002).
2. **Buat project Supabase** dan migrasi tabel `spbu_locations`, `status_logs` + enum (lihat [../20_DATABASE.md](../20_DATABASE.md)); aktifkan RLS (`SELECT` publik).
3. **Seed data SPBU Malang** — daftar dan koordinat _TBD_ (sumber data perlu ditentukan).
4. **Bersihkan templat** `web-client/app/page.tsx`; atur variabel lingkungan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. **Pilih pustaka peta** (ADR-005) dan tampilkan penanda dari `spbu_locations`.
6. **Realtime listener** pada `status_logs` untuk memperbarui warna penanda.
7. **Deploy** ke Vercel (Vercel CLI), set env di Vercel.

## File yang Disentuh

- `web-client/app/page.tsx`, `web-client/app/layout.tsx`, `web-client/package.json`
- Baru: komponen peta, klien Supabase (`web-client/lib/`), folder migrasi _TBD_

## Risiko

- Breaking changes Next.js 16 — baca `node_modules/next/dist/docs/` dahulu.
- SSR vs pustaka peta (Leaflet butuh klien saja).
- Data SPBU awal belum tersedia.

## Definisi Selesai

Peta publik di Vercel menampilkan SPBU dari database dan berubah warna saat baris `status_logs` baru ditambahkan.
