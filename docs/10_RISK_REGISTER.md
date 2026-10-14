# Risk Register

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

| ID | Risiko | Likelihood | Impact | Mitigasi | Owner |
|---|---|---|---|---|---|
| R-01 | Stream CCTV Dishub tidak dapat diakses | Tinggi | Sedang | Andalkan Traffic API + crowdsourcing; CCTV bersifat opsional | _TBD_ |
| R-02 | Laporan palsu/spam dari warga | Sedang | Tinggi | Geofencing, *rate limit*, bobot confidence lebih rendah untuk crowdsourcing | _TBD_ |
| R-03 | GPS dipalsukan (*spoofing*) | Sedang | Sedang | Validasi server-side, deteksi anomali, korelasi sumber lain | _TBD_ |
| R-04 | Biaya Traffic API melonjak | Sedang | Sedang | Atur frekuensi polling, cache, batasi radius | _TBD_ |
| R-05 | Batas tier gratis Neon/Vercel terlampaui | Sedang | Sedang | Monitoring kuota, retensi data `status_logs` | _TBD_ |
| R-06 | Privasi lokasi pengguna | Rendah | Tinggi | Tidak menyimpan koordinat mentah pelapor; kebijakan privasi | _TBD_ |
| R-07 | False alarm tinggi memicu notifikasi tidak perlu | Sedang | Sedang | Sensor fusion dan ambang confidence sebelum notifikasi | _TBD_ |
| R-09 | Model/akses CCTV dan kunci TomTom tidak tersedia sehingga jalur otomatis belum terbukti di lapangan | Tinggi | Sedang | Jalur otomatis fail-soft; crowdsourcing tetap berjalan; verifikasi live sebelum klaim akurasi | _TBD_ |
| R-10 | Bobot/ambang confidence belum dikalibrasi | Tinggi | Sedang | Tinjau dengan data nyata sebelum promosi besar-besaran | _TBD_ |
| R-08 | Breaking changes Next.js 16 | Sedang | Rendah | Rujuk dokumentasi lokal di `node_modules/next/dist/docs/` | satset-dev |
