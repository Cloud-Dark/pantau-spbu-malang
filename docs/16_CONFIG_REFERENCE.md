# Config Reference

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Seluruh nilai rahasia **tidak boleh** dikomit. Simpan di `.env` lokal (diabaikan git) dan di pengaturan environment Vercel/worker. Templat nama variabel ada di `.env.example` pada root repositori.

## Variabel Lingkungan

| Variabel | Dipakai oleh | Keterangan |
|---|---|---|
| `DATABASE_URL` | web-client (server), vision-engine | String koneksi Neon PostgreSQL via *pooler*, dengan `sslmode=require` |
| `AWS_ENDPOINT_URL_S3` | web-client (server), vision-engine | Endpoint Neon Storage (S3-compatible) |
| `AWS_ACCESS_KEY_ID` | idem | Key ID kredensial Neon Storage |
| `AWS_SECRET_ACCESS_KEY` | idem | Secret kredensial Neon Storage |
| `AWS_REGION` | idem | `ap-southeast-1` |
| `NEON_AUTH_URL` | web-client (server) | URL Neon Auth — dipakai bila autentikasi diaktifkan |
| `NEON_AUTH_JWKS_URL` | web-client (server) | JWKS untuk verifikasi token — nilai persis _TBD_, salin utuh dari konsol Neon |
| `STORAGE_BUCKET` | web-client, vision-engine | Nama bucket (contoh di dokumentasi Neon: `assets`); nama final _TBD_ |
| `TRAFFIC_API_KEY` | vision-engine | Kunci Google/TomTom — _TBD_ |
| `TELEGRAM_BOT_TOKEN` | web-client (server) | Bot Telegram; kosong = kanal nonaktif |
| `TELEGRAM_CHAT_ID` | web-client (server) | Chat/grup tujuan notifikasi |
| `WHATSAPP_WEBHOOK_URL` | web-client (server) | Webhook generik (provider-agnostik); menerima `POST {text, source, type}`; kosong = nonaktif |
| `WHATSAPP_WEBHOOK_TOKEN` | web-client (server) | Opsional; dikirim sebagai `Authorization: Bearer` |
| `CRON_SECRET` | web-client (server) | **Wajib** untuk `/api/cron/notify`; kosong = endpoint selalu 401. Vercel Cron mengirimnya otomatis sebagai Bearer |
| `CRITICAL_MIN_CONFIDENCE` | web-client (server) | Ambang keyakinan status kritis; default 70 |
| `NOTIFY_COOLDOWN_MINUTES` | web-client (server) | Jeda minimum antar-notifikasi per SPBU; default 60 |
| `NEXT_PUBLIC_SITE_URL` / `SITE_URL` | web-client | Tautan peta pada pesan notifikasi |
| `CONFIDENCE_WINDOW_MINUTES` | web-client (server) | Jendela data agregasi; default 30 |
| `CONFIDENCE_HALF_LIFE_MINUTES` | web-client (server) | Half-life peluruhan; default 10 |
| `REPORT_HASH_SALT` | web-client (server) | Salt hash pelapor. **Wajib diganti** (acak, rahasia) di produksi; default hanya untuk dev |

Aturan: tidak ada variabel rahasia yang berawalan `NEXT_PUBLIC_` (ADR-007); satu-satunya variabel publik adalah `NEXT_PUBLIC_SITE_URL` (bukan rahasia).

## Dependensi Node untuk Storage

```bash
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv
```

## Contoh Pemakaian Storage

```ts
import "dotenv/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Endpoint, key, secret, dan region dibaca dari AWS_* pada lingkungan.
const s3 = new S3Client({ forcePathStyle: true });
const bucket = process.env.STORAGE_BUCKET ?? "assets";
const key = "uploads/file.txt";

await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "Hello World!" }));
const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
```

## Catatan Keamanan

- Gunakan host *pooler* (`-pooler`) untuk aplikasi; host *direct* hanya untuk migrasi atau `LISTEN/NOTIFY`.
- Jika kredensial pernah terbagikan di kanal tidak aman (chat, tiket), putar ulang (*rotate*) dari konsol Neon.
