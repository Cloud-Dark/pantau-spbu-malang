# Project Charter — Pantau SPBU Malang

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## 1. Visi

Menjadi sumber informasi *real-time* yang dipercaya warga Malang untuk mengetahui ketersediaan BBM dan panjang antrean di setiap SPBU, sehingga warga tidak membuang waktu dan bahan bakar mendatangi SPBU yang kosong atau antreannya mengular.

## 2. Latar Belakang

Antrean panjang di SPBU wilayah Malang marak terjadi akibat kelangkaan atau keterlambatan pasokan BBM. Belum ada kanal informasi terpusat yang menampilkan kondisi tiap SPBU secara aktual.

## 3. Tujuan

1. Membangun platform informasi spasial berbasis web yang menampilkan status SPBU di peta.
2. Mengakuisisi data dari tiga sumber (Traffic API, Computer Vision CCTV, crowdsourcing) dan menggabungkannya (*sensor fusion*) untuk menekan *false alarm*.
3. Memberi notifikasi (Telegram/WhatsApp) saat SPBU berstatus kritis.

## 4. Scope

**In scope**
- Peta SPBU Malang dengan status terkini (`NORMAL`, `ANTRE_PANJANG`, `KOSONG`).
- Pelaporan status oleh warga dengan validasi geofencing.
- Worker Python: penarikan Traffic API dan pengolahan CCTV publik.
- Algoritma *confidence score* gabungan tiga sumber.
- Webhook notifikasi Telegram/WhatsApp.

**Out of scope (rilis awal)**
- Wilayah di luar Malang.
- Informasi harga BBM, navigasi/rute, dan aplikasi mobile native.
- _TBD_: pemesanan/antrean daring.

## 5. Stakeholder

| Peran | Pihak | Keterangan |
|---|---|---|
| Pemilik produk / developer | satset-dev (solo pada Phase 1) | Scaffolding dan MVP |
| Tim kolaborasi | Kontributor komunitas | Phase 2 dan seterusnya |
| Tim data | _TBD_ | Phase 3: vision engine dan Traffic API |
| Pengguna akhir | Pengendara motor/mobil, komunitas, warga Malang | Konsumen informasi dan pelapor |
| Pihak eksternal | Dishub Malang | Sumber stream CCTV (jika dapat diakses) |

## 6. Kriteria Sukses

- Peta menampilkan seluruh SPBU target beserta status terkini dengan latensi pembaruan rendah (target angka: _TBD_).
- Laporan warga di luar radius geofence 100 m ditolak 100%.
- Confidence score terhitung otomatis dari ketiga sumber.
- Adopsi pengguna awal di Malang (target angka: _TBD_, lihat [01_PRD.md](01_PRD.md)).

## 7. Dokumen Terkait

[01_PRD.md](01_PRD.md) · [05_ARCHITECTURE.md](05_ARCHITECTURE.md) · [08_ROADMAP.md](08_ROADMAP.md)
