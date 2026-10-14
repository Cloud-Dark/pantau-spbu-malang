# vision-engine

Worker Node.js (TypeScript) untuk Pantau SPBU Malang. Menulis baris ke tabel `status_logs` (Neon PostgreSQL) dari dua sumber:

| Sumber | Peran (PRD) | `source` | Status yang bisa dihasilkan |
|---|---|---|---|
| Traffic API (TomTom Flow Segment Data) | trigger utama | `TRAFFIC_API` | `NORMAL`, `ANTRE_PANJANG` |
| CCTV (ffmpeg + YOLOv8 ONNX) | validasi, opsional | `CCTV` | `NORMAL`, `ANTRE_PANJANG` |

> **`KOSONG` (BBM habis) tidak dapat disimpulkan dari lalu lintas maupun hitungan kendaraan.** Status itu hanya berasal dari laporan warga (`CROWDSOURCE`). Worker ini sengaja tidak pernah menghasilkannya.

Penggabungan (fusion) tidak dilakukan di worker: setiap sumber menulis log sendiri dengan `confidence_score`, dan lapisan baca (web-client) memutuskan status akhir per SPBU.

## Menjalankan

Butuh Node >= 20 (diuji di Node 22).

```bash
cd vision-engine
npm install              # onnxruntime-node bersifat opsional (hanya untuk CCTV)
cp .env.example .env     # isi DATABASE_URL (+ TRAFFIC_API_KEY)
DRY_RUN=1 npm run run:once   # uji: hanya log, tidak menulis
npm run run:once             # satu siklus lalu keluar (cron / GitHub Actions)
npm run start                # loop terjadwal sampai SIGTERM/SIGINT
npm run cctv:check           # periksa konfigurasi CCTV, ffmpeg, model (tanpa DB)
npm run cctv:check -- --probe  # + ambil satu frame dari tiap sumber
npm run typecheck && npm test
npm run test:db              # uji Neon nyata (RUN_DB_TESTS=1), insert lalu hapus baris
```

`ENV_FILE=/path/file.env` memuat file env lain (bila tidak diset, `./.env` dipakai jika ada).

### Exit code `run:once`
`0` normal; `1` bila sebuah job melempar error atau **semua** item dalam satu job gagal (mis. kunci API salah) agar cron/Actions menandai merah. Kegagalan sebagian SPBU hanya dilog.

## Variabel lingkungan

Lihat `.env.example` untuk daftar lengkap dengan default. Ringkasnya:

- Wajib: `DATABASE_URL`.
- `DRY_RUN=1`: hanya log, tidak INSERT.
- Traffic: `TRAFFIC_PROVIDER` (hanya `tomtom`), `TRAFFIC_API_KEY` (kosong = mode dinonaktifkan dengan log jelas, bukan crash), `TRAFFIC_INTERVAL_SEC` (300), `TRAFFIC_CONCURRENCY` (4), `TRAFFIC_TIMEOUT_MS`, `TRAFFIC_RETRIES` (2, backoff 0,5 s/1 s/2 s; 4xx permanen tidak diulang), `TRAFFIC_NORMAL_RATIO` (0,7), `TRAFFIC_MIN_API_CONFIDENCE` (0,3).
- CCTV: `CCTV_SOURCES_FILE`, `CCTV_INTERVAL_SEC` (120), `CCTV_QUEUE_THRESHOLD` (8), `CCTV_TIMEOUT_MS`, `FFMPEG_PATH`, `YOLO_MODEL_PATH`, `YOLO_SCORE_THRESHOLD`, `YOLO_IOU_THRESHOLD`.
- `DEDUPE_HEARTBEAT_MIN` (30): status yang sama untuk SPBU+sumber yang sama tidak ditulis ulang sebelum jeda ini lewat; perubahan status selalu ditulis. `0` = selalu tulis.

Provider Google tidak diimplementasikan (butuh Routes API dan model data berbeda); menambah provider = tambah modul di `src/sources/` yang menghasilkan `TrafficReading`.

## Cara kerja Traffic

Untuk tiap SPBU, titik `lat,lng` (gerbang SPBU) dikirim ke
`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`. TomTom memetakan titik ke segmen jalan terdekat; radius 50 m pada PRD diperlakukan sebagai asumsi bahwa koordinat SPBU akurat. **Koordinat contoh di seed hanya perkiraan dan perlu diverifikasi**, kalau tidak segmen yang terbaca bisa jalan lain.

Pemetaan (`src/mapping.ts`, fungsi murni): `rasio = currentSpeed / freeFlowSpeed`; `rasio >= TRAFFIC_NORMAL_RATIO` -> `NORMAL`, selain itu `ANTRE_PANJANG`; `roadClosure` -> `ANTRE_PANJANG`. `confidence_score` (1-100) = 60% `confidence` API + 40% jarak rasio dari ambang (jenuh pada selisih 0,3). Bacaan dengan `confidence` API di bawah ambang diabaikan. Ambang 0,7 adalah tebakan awal yang belum dikalibrasi dengan data lapangan Malang.

Batasan: kecepatan di jalan raya dapat rendah karena macet umum, bukan antrean SPBU. Karena itu CCTV/laporan warga diperlukan sebagai validasi.

## CCTV

1. `cp cctv-sources.example.json cctv-sources.json` (berkas ini di-gitignore karena URL bisa berisi kredensial).
2. Tiap entri: `spbuId` (UUID) **atau** `spbuName` (cocok nama persis, tidak peka huruf besar), `url` (`http(s)` snapshot JPEG, HLS `.m3u8`, atau `rtsp(s)`), `type` (`snapshot` | `stream`, ditebak dari ekstensi bila kosong), `roi` (poligon antrean opsional, koordinat ternormalisasi 0..1 sehingga tidak bergantung resolusi; kendaraan dihitung bila titik tengah-bawah kotaknya di dalam ROI), `capacity` (jumlah kendaraan dalam ROI yang dianggap antrean panjang; default `CCTV_QUEUE_THRESHOLD`).
3. Unduh model YOLOv8 COCO ke ONNX (mis. `yolov8n.onnx`, export Ultralytics, input 640x640, keluaran `[1,84,8400]`) dan set `YOLO_MODEL_PATH`. Berkas model tidak disertakan di repo.
4. `npm install onnxruntime-node` bila belum terpasang, pastikan `ffmpeg` ada di PATH untuk sumber HLS/RTSP, lalu `npm run cctv:check`.

Kelas yang dihitung: `car`, `motorcycle`, `bus`, `truck`. Pra/pasca-proses (letterbox, NMS per kelas) ditulis sendiri di TypeScript (`src/sources/cctv/yolo-post.ts`). Antarmuka `Detector { detect(frame) }` bersifat pluggable; `StubDetector` dipakai untuk uji.

CCTV bersifat **opsional dan fail-soft**: tanpa `cctv-sources.json`, tanpa `YOLO_MODEL_PATH`, atau bila modul/model gagal dimuat, job CCTV dinonaktifkan dengan log jelas dan Traffic tetap jalan.

### Akses CCTV Dishub: belum terverifikasi

- Belum diketahui apakah Dishub Kota Malang menyediakan akses programatik (snapshot/HLS/RTSP) ke CCTV, atau syarat izin/lisensinya. Itu perlu dikonfirmasi ke Dishub; kode ini tidak membuat asumsi bahwa aksesnya ada.
- Kode pengambilan frame/deteksi **belum pernah dijalankan terhadap CCTV nyata**. Pengujian memakai JPEG sintetis, video uji buatan ffmpeg (`testsrc`), dan detektor/sesi ONNX palsu.
- **`onnxruntime-node` dan model YOLO sungguhan belum pernah dijalankan** di lingkungan pengembangan ini (unduhan binary `onnxruntime-node` diblokir oleh jaringan sandbox). Pasca-proses diuji dengan tensor sintetis, tetapi akurasi deteksi pada gambar nyata belum diukur. Jalankan `cctv:check --probe` dan tinjau hasil secara manual sebelum mengandalkannya.
- Hitungan kendaraan dari satu frame tidak membedakan kendaraan antre vs. lewat; `roi` dan `capacity` per lokasi perlu dikalibrasi.

## Penjadwalan dan deploy

Dua mode: `npm run start` (proses panjang; Traffic tiap `TRAFFIC_INTERVAL_SEC`, CCTV tiap `CCTV_INTERVAL_SEC`; job tidak pernah tumpang tindih dengan dirinya; SIGTERM/SIGINT menyelesaikan siklus berjalan lalu keluar) dan `npm run run:once` (satu siklus).

**GitHub Actions cron** (paling sederhana, hanya Traffic): `.github/workflows/vision-engine-cron.yml` menjalankan `run:once` tiap 10 menit. Set secret `DATABASE_URL` dan `TRAFFIC_API_KEY`. Cron Actions bisa tertunda dan tidak cocok untuk CCTV (butuh ffmpeg, model, dan akses jaringan ke kamera). Hitung kuota: 8 SPBU x 6 siklus/jam x 24 = 1.152 panggilan/hari, jauh di bawah batas gratis TomTom (2.500/hari, periksa syarat terkini).

**VPS + systemd** (untuk Traffic + CCTV):

```ini
# /etc/systemd/system/vision-engine.service
[Unit]
Description=Pantau SPBU vision-engine
After=network-online.target

[Service]
WorkingDirectory=/opt/pantau-spbu-malang/vision-engine
EnvironmentFile=/etc/vision-engine.env
ExecStart=/usr/bin/node --import tsx src/index.ts start
Restart=on-failure
RestartSec=10
User=pantau

[Install]
WantedBy=multi-user.target
```

`ExecStart` memakai `node --import tsx` (bukan `npm run start`) agar SIGTERM dari systemd langsung sampai ke proses. Alternatif tanpa tsx saat runtime: `npm run build` lalu `node dist/index.js start`.

## Struktur

```
src/
  config.ts       validasi env (manual, melaporkan semua masalah sekaligus)
  mapping.ts      pemetaan murni traffic/CCTV -> status, confidence, dedupe
  geo.ts          haversine, point-in-polygon
  db.ts, repo.ts  Neon HTTP; INSERT berparameter; dry-run
  sources/traffic.ts          TomTom + siklus polling
  sources/cctv/               konfigurasi, frame (fetch/ffmpeg), YOLO ONNX, pipeline
  scheduler.ts, engine.ts, index.ts, cli/cctv-check.ts
test/             node:test via tsx
```

## Pengujian

`npm test` (40 uji, termasuk ffmpeg nyata pada video sintetis bila ffmpeg terpasang; uji DB dilewati kecuali `RUN_DB_TESTS=1`). Tidak diuji: TomTom dengan kunci valid, CCTV nyata, ONNX/YOLO sungguhan.
