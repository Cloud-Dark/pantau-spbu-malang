# Strategi Promosi Warga Malang

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Dokumen ini menjelaskan cara memperkenalkan Pantau SPBU Malang kepada warga Malang Raya secara bertahap, jujur, dan menghormati privasi. Semua target angka ditandai _TBD_ sampai ditetapkan pemilik produk. Materi pesan ada di [02_MATERI_KOMUNIKASI.md](02_MATERI_KOMUNIKASI.md); daftar persiapan di [03_CHECKLIST_PELUNCURAN.md](03_CHECKLIST_PELUNCURAN.md).

## 1. Tujuan

1. Warga tahu bahwa ada peta status antrean/ketersediaan BBM per SPBU yang dapat dibuka gratis dari ponsel.
2. Warga yang sedang berada di SPBU bersedia mengirim laporan singkat, karena kualitas data bergantung pada laporan lapangan (sumber lain: lalu lintas dan CCTV, bila tersedia).
3. Komunitas dan admin grup mau menjadi penyebar tepercaya, bukan sekadar penerus pesan.

Prinsip: promosi tidak boleh melebih-lebihkan. Aplikasi menampilkan estimasi dari beberapa sumber, bukan jaminan stok.

## 2. Sasaran Audiens

| Segmen | Kebutuhan utama | Alasan mau memakai |
|---|---|---|
| Pengemudi ojek online dan kurir | Hemat waktu antre, tahu SPBU mana yang masih ada BBM | Waktu antre mengurangi jam kerja |
| Komunitas motor dan mobil | Berbagi kondisi lapangan ke sesama anggota | Sudah terbiasa berbagi info di grup |
| Warga di grup WhatsApp/Telegram RT/RW | Info singkat yang bisa dipercaya untuk keluarga | Pesan berantai tanpa sumber sering membingungkan |
| Mahasiswa dan civitas kampus | Mobilitas harian dengan motor | Mudah mengadopsi aplikasi web, aktif di media sosial |
| Media lokal dan penggiat informasi publik | Bahan berita yang bisa diverifikasi | Butuh sumber data dan penjelasan metode |

## 3. Pesan Kunci

1. **Cek dulu sebelum berangkat.** Lihat peta status SPBU di sekitar Malang sebelum mengantre.
2. **Satu laporan membantu banyak orang.** Berada di SPBU? Laporkan kondisi dalam hitungan detik.
3. **Transparan soal data.** Status dihitung dari beberapa sumber dengan tingkat keyakinan; data lama otomatis dianggap kedaluwarsa.
4. **Privasi dijaga.** Lokasi hanya dipakai untuk memastikan laporan dikirim dari dekat SPBU; kami tidak meminta akun atau data pribadi untuk melapor. Jelaskan perilaku sebenarnya sesuai kebijakan privasi yang berlaku saat peluncuran.
5. **Bukan sumber resmi.** Aplikasi tidak mewakili Pertamina, pemerintah, atau pengelola SPBU. Tulis ini jelas di setiap materi.

## 4. Kanal

| Kanal | Cara masuk | Format | Penanggung jawab |
|---|---|---|---|
| Komunitas ojol, motor, mobil Malang | Hubungi admin/pengurus, tawarkan demo singkat dan materi siap pakai | Pesan pembuka admin, tangkapan layar peta, ajakan melapor | _TBD_ |
| Grup WhatsApp/Telegram RT/RW | Lewat ketua RT/RW atau admin grup, dengan izin | Pesan singkat satu paragraf + tautan | _TBD_ |
| Kampus (BEM, UKM, grup angkatan) | Surat/izin pengelola organisasi | Poster digital, pesan grup, sesi 5 menit | _TBD_ |
| Instagram, X, TikTok | Akun resmi proyek (bila dibuat) | Carousel cara pakai, video pendek 15-30 detik, utas penjelasan | _TBD_ |
| Media lokal | Rilis singkat dan kontak narasumber | Rilis media, demo, akses ke penjelasan metode | _TBD_ |

Catatan: jangan menambahkan nomor/anggota ke grup tanpa persetujuan, dan jangan mengirim pesan massal tak diminta.

## 5. Kalender 4 Minggu

Tanggal mulai ditetapkan pemilik (_TBD_). Minggu dihitung dari hari peluncuran lunak.

| Minggu | Fokus | Kegiatan | Keluaran |
|---|---|---|---|
| 1 | Peluncuran lunak | Uji dengan kelompok kecil (komunitas mitra, teman kampus); kumpulkan umpan balik; perbaiki pesan; pastikan notifikasi dan pemantauan berjalan | Daftar masukan, perbaikan prioritas |
| 2 | Komunitas inti | Presentasi singkat ke admin komunitas ojol/motor/mobil; bagikan materi siap tempel; mulai akun media sosial | Admin mitra terkonfirmasi (_TBD_) |
| 3 | Perluasan | Grup RT/RW, kampus, konten pendek TikTok/Instagram; ajakan "lapor saat di SPBU" | Konten terbit, tautan terlacak |
| 4 | Media dan evaluasi | Rilis ke media lokal; evaluasi metrik; susun laporan dan keputusan lanjutan | Laporan evaluasi, rencana bulan berikutnya |

## 6. Metrik Adopsi dan Cara Mengukur

Target angka belum ditetapkan (_TBD_). Pengukuran harus agregat dan tidak mengidentifikasi individu.

| Metrik | Definisi | Cara ukur yang ramah privasi | Target |
|---|---|---|---|
| Kunjungan ke peta | Jumlah kunjungan per hari | Analitik agregat tanpa cookie lintas situs dan tanpa menyimpan IP; atau hitung dari log hosting | _TBD_ |
| Sumber kunjungan | Kanal asal pengunjung | Parameter `utm_source` pada tautan per kanal (mis. `?utm_source=grup-rt`) | _TBD_ |
| Laporan valid per hari | Laporan yang lolos validasi | Hitung baris laporan di basis data (sudah agregat) | _TBD_ |
| Rasio laporan ditolak | Laporan ditolak validasi lokasi terhadap total | Hitung dari catatan penolakan agregat | dipantau |
| Cakupan SPBU | SPBU dengan data segar dalam jendela waktu | Hitung dari hasil agregasi status | _TBD_ |
| Admin mitra aktif | Admin yang membagikan materi | Daftar manual berisi kontak yang setuju dicatat | _TBD_ |

Prinsip pengukuran: kumpulkan seminimal mungkin, tanpa profil individu, tanpa melacak lokasi pengguna, dan umumkan metode ukur dalam kebijakan privasi. Jika memakai analitik pihak ketiga, tinjau dulu kepatuhannya terhadap peraturan pelindungan data pribadi yang berlaku.

## 7. Risiko Promosi dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Informasi keliru memicu kepanikan atau pembelian berlebih | Selalu cantumkan keyakinan dan waktu pembaruan; jangan menyebut "pasti kosong/ada"; lihat panduan anti-hoax |
| Spam atau laporan palsu setelah populer | Validasi lokasi, pembatasan laporan, bobot sumber, dan pemantauan oleh tim |
| Beban server mendadak | Cek kapasitas dan batas penyedia layanan sebelum promosi besar (lihat checklist) |
| Dianggap sumber resmi | Disclaimer di semua materi |
| Kelelahan admin grup | Berikan materi siap tempel dan jangan minta pengiriman berulang |

## 8. Keputusan yang Dibutuhkan dari Pemilik

- Tanggal peluncuran lunak dan publik.
- Nama akun media sosial dan siapa yang mengelolanya.
- Target angka untuk setiap metrik di atas.
- Kanal kontak publik (email/akun) untuk pertanyaan dan koreksi.
- Alat analitik yang diizinkan.
