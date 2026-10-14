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
| `TELEGRAM_BOT_TOKEN` | serverless webhook | Phase 4 — _TBD_ |

Aturan: tidak ada variabel di atas yang berawalan `NEXT_PUBLIC_` (ADR-007).

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
