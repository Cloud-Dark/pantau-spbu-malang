create table if not exists spbu_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);

create table if not exists status_logs (
  id uuid primary key default gen_random_uuid(),
  spbu_id uuid not null references spbu_locations(id) on delete cascade,
  status text not null check (status in ('NORMAL', 'ANTRE_PANJANG', 'KOSONG')),
  source text not null check (source in ('CCTV', 'TRAFFIC_API', 'CROWDSOURCE')),
  confidence_score integer not null check (confidence_score between 1 and 100),
  created_at timestamptz not null default now()
);

create index if not exists status_logs_spbu_created_idx on status_logs (spbu_id, created_at desc)
