-- Jejak notifikasi untuk cooldown & deteksi transisi status kritis (Fase 4).
-- channel 'system' = penanda pemulihan (SPBU kembali NORMAL), bukan pesan terkirim.
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  spbu_id uuid not null references spbu_locations(id) on delete cascade,
  status text not null check (status in ('NORMAL', 'ANTRE_PANJANG', 'KOSONG')),
  confidence integer not null check (confidence between 0 and 100),
  channel text not null check (channel in ('telegram', 'whatsapp', 'system')),
  sent_at timestamptz not null default now()
);

create index if not exists notification_log_spbu_channel_sent_idx on notification_log (spbu_id, channel, sent_at desc)
