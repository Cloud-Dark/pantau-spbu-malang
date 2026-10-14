-- Metadata laporan crowdsourcing: hash pelapor (anonim) dan jarak terverifikasi.
-- Koordinat mentah pelapor sengaja TIDAK disimpan.
alter table status_logs add column if not exists reporter_hash text null;
alter table status_logs add column if not exists distance_m integer null;

create index if not exists status_logs_reporter_created_idx on status_logs (reporter_hash, created_at desc)
