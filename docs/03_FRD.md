# Functional Requirements Document (FRD)

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## Peta dan Status

| ID | Kebutuhan | Acceptance Criteria | Fitur |
|---|---|---|---|
| FR-001 | Sistem menampilkan peta dengan penanda tiap SPBU dari tabel `spbu_locations` | Seluruh baris tabel muncul sebagai penanda pada koordinat `lat`/`lng` | F-01 |
| FR-002 | Penanda berwarna sesuai status terbaru | `NORMAL`, `ANTRE_PANJANG`, `KOSONG` memiliki warna berbeda; tanpa data → tampil "tidak diketahui" | F-01 |
| FR-003 | Status diperbarui tanpa muat ulang | `INSERT` baru pada `status_logs` mengubah penanda dalam waktu singkat (_TBD_ detik) | F-02 |

## Pelaporan Warga

| ID | Kebutuhan | Acceptance Criteria | Fitur |
|---|---|---|---|
| FR-004 | Pengguna membuka modal pelaporan dari SPBU | Modal memuat pilihan status dan tombol kirim | F-03 |
| FR-005 | Aplikasi mengambil koordinat via `navigator.geolocation` | Izin ditolak → pesan jelas dan laporan tidak dikirim | F-03 |
| FR-006 | Laporan di luar radius 100 m ditolak | Jarak > 100 m → 403 dengan pesan dan jarak; tidak ada baris dibuat. Kontrak: [21_BACKEND.md](21_BACKEND.md) | F-04 |
| FR-007 | Laporan valid disimpan dengan `source = CROWDSOURCE` | Baris `status_logs` terbentuk dengan `spbu_id`, `status`, `confidence_score` | F-03 |

## Data Otomatis

| ID | Kebutuhan | Acceptance Criteria | Fitur |
|---|---|---|---|
| FR-008 | Worker menarik data Traffic API pada poligon/radius SPBU | Berjalan terjadwal; menghasilkan `source = TRAFFIC_API` | F-05 |
| FR-009 | Worker memproses stream CCTV dan menghitung kendaraan | Hasil dipetakan ke status; `source = CCTV` | F-06 |
| FR-010 | Worker menulis otomatis ke `status_logs` | `INSERT` berhasil tanpa intervensi manual | F-05/F-06 |

## Penilaian dan Notifikasi

| ID | Kebutuhan | Acceptance Criteria | Fitur |
|---|---|---|---|
| FR-011 | Sistem menghitung *confidence score* tertimbang dari tiga sumber | Bobot terdokumentasi; skor 1–100 | F-07 |
| FR-012 | Webhook mengirim notifikasi saat SPBU kritis | Pesan terkirim ke Telegram/WhatsApp; definisi "kritis" _TBD_ | F-08 |

Pemetaan ke kebutuhan teknis: [04_TRD.md](04_TRD.md).
