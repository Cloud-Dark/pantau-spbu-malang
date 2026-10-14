# Backend Web (Route Handler) — Kontrak API

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Seluruh akses data melalui server (ADR-007). Implementasi: `web-client/app/api/**`.

## GET `/api/spbu`
Mengembalikan seluruh SPBU beserta status agregat (algoritma di [22_CONFIDENCE_ALGORITHM.md](22_CONFIDENCE_ALGORITHM.md)). Tidak di-cache (`no-store`).

| Field | Keterangan |
|---|---|
| `id`, `name`, `address`, `lat`, `lng` | Data SPBU |
| `status` | Status pemenang; `null` bila data kedaluwarsa (stale) |
| `source` | Sumber dengan kontribusi terbesar; `null` bila stale |
| `confidence_score` | Keyakinan agregat 1–100; `null` bila stale |
| `updated_at` | Log terbaru dalam jendela; `null` bila stale |
| `sources`, `stale`, `sample_count`, `last_seen_at` | Field tambahan (opsional) |

## POST `/api/report`
Laporan warga. Body: `{spbuId, status, lat, lng, accuracy?}`. Validasi di server (FR-006, ADR-004). Urutan: validasi → SPBU ada → geofence → akurasi → rate limit → insert.

| Kode | Kondisi |
|---|---|
| 200 | `{ok, id, status, distance_m, created_at}` |
| 400 | Body > 2 KB, bukan JSON, UUID/enum/koordinat/akurasi tidak valid |
| 404 | SPBU tidak ditemukan |
| 403 | Jarak > 100 m; respons memuat `distance_m` dan `radius_m` |
| 422 | Akurasi GPS > 100 m |
| 429 | 1 laporan per SPBU per 5 menit atau 10 laporan per jam per pelapor terlampaui |
| 500 | Kesalahan server (pesan generik) |

Laporan disimpan dengan `source = CROWDSOURCE`, `confidence_score = 40`, `reporter_hash`, `distance_m`. Koordinat mentah pelapor tidak disimpan.

## GET/POST `/api/cron/notify`
Dipanggil Vercel Cron setiap 10 menit (`web-client/vercel.json`). Header `Authorization: Bearer <CRON_SECRET>` (perbandingan *timing-safe*).

- 401: `CRON_SECRET` tidak diset, header hilang, atau token salah.
- 200: `{ok, checkedAt, channels, totalSpbu, critical, notified, skipped{cooldown,unchanged}, failed, recoveredMarked}`.
- SPBU **kritis**: status `KOSONG` atau `ANTRE_PANJANG`, confidence ≥ `CRITICAL_MIN_CONFIDENCE` (70), tidak stale.
- Notifikasi dikirim bila: belum pernah dinotifikasi; atau ada penanda pemulihan NORMAL setelah notifikasi terakhir; atau status kritis berubah — dan telah melewati cooldown (60 menit). Hanya pengiriman sukses yang dicatat di `notification_log`, sehingga kanal yang gagal dicoba lagi pada siklus berikutnya.
- Kanal: Telegram Bot API (HTML ter-escape) dan webhook WhatsApp generik. Kanal tanpa env otomatis nonaktif.

## Batasan yang diketahui
- Rate limit `/api/report` memakai query lalu insert tanpa transaksi atomik (celah *race* untuk request paralel).
- Dua eksekusi cron bersamaan dapat mengirim duplikat (belum ada lock).
- Eskalasi ANTRE_PANJANG → KOSONG ikut tertahan cooldown.
- Vercel Cron setiap 10 menit membutuhkan plan Vercel yang mengizinkan (Hobby dibatasi harian) — _TBD_ dicek pemilik.
