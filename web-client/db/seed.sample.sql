-- DATA CONTOH untuk pengembangan. Koordinat hanya perkiraan di sekitar ruas jalan
-- dan WAJIB diverifikasi sebelum rilis publik (lihat docs/20_DATABASE.md).
insert into spbu_locations (name, address, lat, lng)
select v.name, v.address, v.lat, v.lng
from (values
  ('SPBU Tlogomas', 'Jl. Tlogomas, Kota Malang', -7.9345, 112.6005),
  ('SPBU Soekarno-Hatta', 'Jl. Soekarno-Hatta, Kota Malang', -7.9400, 112.6250),
  ('SPBU Sutami', 'Jl. Sutami, Kota Malang', -7.9580, 112.6170),
  ('SPBU Ijen', 'Jl. Ijen, Kota Malang', -7.9780, 112.6310),
  ('SPBU Kawi', 'Jl. Kawi, Kota Malang', -7.9810, 112.6190),
  ('SPBU Kebalen', 'Jl. Kebalen Wetan, Kota Malang', -7.9870, 112.6400),
  ('SPBU Ahmad Yani', 'Jl. Ahmad Yani, Kota Malang', -7.9500, 112.6420),
  ('SPBU Sawojajar', 'Jl. Danau Toba, Sawojajar, Kota Malang', -7.9740, 112.6560)
) as v(name, address, lat, lng)
where not exists (select 1 from spbu_locations)
