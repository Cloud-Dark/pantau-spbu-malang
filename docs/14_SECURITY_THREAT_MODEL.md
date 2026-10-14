# Security Threat Model

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

| ID | Ancaman | Dampak | Mitigasi saat ini | Sisa risiko / tindak lanjut |
|---|---|---|---|---|
| T-01 | Pemalsuan GPS (*spoofing*) klien | Laporan palsu dari jauh | Verifikasi jarak dan akurasi di server (ADR-004); bobot crowdsourcing terbatas 0,25 | Server tak dapat membuktikan lokasi asli; korelasi dengan sumber otomatis |
| T-02 | Spam laporan | Status menyesatkan, notifikasi palsu | Rate limit 1/SPBU/5 menit dan 10/jam per `reporter_hash`; batas atas bobot di agregasi | Mudah dielakkan lewat ganti IP/UA; pertimbangkan CAPTCHA / limit di edge |
| T-03 | Kebocoran kredensial (`DATABASE_URL`, kunci storage, token bot) | Akses data penuh | Env server-only, tidak masuk repo, `.env*` di-ignore | Rotasi berkala; kredensial yang pernah tampil di chat wajib dirotasi |
| T-04 | Akses tak sah ke endpoint cron | Notifikasi spam | `CRON_SECRET` Bearer, perbandingan *timing-safe*, 401 bila tidak diset | — |
| T-05 | Privasi lokasi pelapor | Pelacakan individu | Koordinat mentah tidak disimpan; hanya `distance_m` dan hash | Tetapkan retensi `reporter_hash`; kebijakan privasi publik _TBD_ |
| T-06 | `X-Forwarded-For` dipalsukan | Bypass rate limit | Header dipercaya apa adanya | Pastikan hanya proxy tepercaya (Vercel) yang mengisinya |
| T-07 | Injeksi SQL | Manipulasi data | Query terparameter; validasi input ketat | — |
| T-08 | Race pada rate limit / duplikasi cron | Kuota terlampaui, notifikasi ganda | — | Kunci atomik (mis. advisory lock) _TBD_ |
| T-09 | Penyalahgunaan Traffic API/CCTV pihak ketiga | Pelanggaran ketentuan/biaya | Mode dinonaktifkan tanpa kunci; interval dapat diatur | Konfirmasi izin penggunaan CCTV Dishub dan ketentuan Traffic API |
