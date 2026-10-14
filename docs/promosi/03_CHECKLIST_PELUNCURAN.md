# Checklist Peluncuran

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Centang sebelum promosi publik. Item bertanda _TBD_ memerlukan keputusan pemilik.

## A. Kesiapan Teknis

- [ ] Aplikasi berjalan di domain produksi dengan HTTPS; tautan publik dicatat: _TBD_.
- [ ] Variabel lingkungan produksi diisi (basis data, `CRON_SECRET`, kanal notifikasi bila dipakai); tidak ada rahasia di repositori.
- [ ] Migrasi basis data terbaru telah diterapkan pada produksi.
- [ ] Pelaporan warga diuji dari ponsel nyata: laporan valid diterima, laporan di luar radius ditolak.
- [ ] Peta menampilkan status, keyakinan, dan tanda "belum ada data" dengan benar.
- [ ] Cron notifikasi terjadwal dan terotorisasi; uji dengan kanal uji, bukan grup warga.
- [ ] Batas penggunaan layanan (basis data, hosting, API pihak ketiga) diperiksa terhadap lonjakan trafik yang diperkirakan: _TBD_.
- [ ] Pemantauan galat dan pemberitahuan kegagalan aktif.
- [ ] Pembatasan laporan/anti-spam aktif dan diuji.
- [ ] Data SPBU (nama, alamat, koordinat) diverifikasi untuk seluruh cakupan awal.

## B. Kepatuhan, Privasi, dan Kepercayaan

- [ ] Kebijakan privasi terbit dan sesuai perilaku aplikasi sebenarnya (data lokasi, masa simpan, analitik).
- [ ] Disclaimer "bukan sumber resmi, estimasi" tampil di aplikasi dan semua materi.
- [ ] Penggunaan sumber data pihak ketiga (lalu lintas, CCTV) sesuai syarat layanan dan izin pemilik sumber: _TBD_ (pastikan sebelum diumumkan sebagai fitur).
- [ ] Kanal kontak untuk koreksi dan pengaduan aktif: _TBD_.
- [ ] Penanggung jawab moderasi dan respons ditetapkan: _TBD_.

## C. Materi dan Kanal

- [ ] Materi di `02_MATERI_KOMUNIKASI.md` ditinjau pemilik dan tautan diisi.
- [ ] Tautan per kanal diberi `utm_source` untuk pengukuran agregat.
- [ ] Akun media sosial dibuat dan pengelolanya ditetapkan: _TBD_.
- [ ] Daftar admin/komunitas mitra yang dihubungi dan izin diperoleh.
- [ ] Rilis media disiapkan dan narasumber siap dihubungi.

## D. Hari Peluncuran

- [ ] Cek akhir: peta dapat dibuka, satu laporan uji berhasil lalu dibersihkan.
- [ ] Publikasikan sesuai kalender di `01_STRATEGI_PROMOSI.md`.
- [ ] Pantau galat, beban, dan laporan mencurigakan secara berkala.
- [ ] Siapkan rencana mundur: cara menonaktifkan pelaporan atau menampilkan pesan pemeliharaan.

## E. Pasca Peluncuran (minggu 1-4)

- [ ] Tinjau metrik adopsi mingguan (target _TBD_).
- [ ] Catat umpan balik dan perbaikan prioritas.
- [ ] Terbitkan koreksi bila ada informasi keliru.
- [ ] Evaluasi akhir minggu ke-4 dan keputusan kelanjutan.
