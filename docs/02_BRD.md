# Business Requirements Document (BRD)

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

## 1. Kebutuhan Bisnis

| ID | Kebutuhan |
|---|---|
| BR-001 | Mengurangi waktu terbuang warga akibat mendatangi SPBU kosong/antre panjang |
| BR-002 | Menyediakan informasi publik gratis dan terbuka (inisiatif *open-source*) |
| BR-003 | Membangun basis kontributor komunitas di Malang |

## 2. Justifikasi

Masalah antrean BBM berdampak langsung pada mobilitas harian. Kombinasi data otomatis dan laporan warga memungkinkan solusi taktis dengan biaya rendah.

## 3. Dampak

- Pengguna: penghematan waktu dan bahan bakar.
- Kota: distribusi pengendara lebih merata antar-SPBU.
- Proyek: reputasi komunitas dan peluang kolaborasi.

## 4. Constraint Bisnis

- Anggaran minimal; memanfaatkan tier gratis (Vercel, Supabase). Batas tier: _TBD_.
- Biaya Traffic API (Google/TomTom) perlu dikendalikan (frekuensi polling) — _TBD_.
- Akses CCTV publik bergantung izin pihak berwenang.
- Privasi: lokasi GPS pelapor tidak boleh disimpan lebih dari yang diperlukan untuk validasi — _TBD_ kebijakan retensi.
