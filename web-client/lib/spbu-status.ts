// Server-only: ambil log berjendela waktu untuk semua SPBU (satu query) lalu hitung agregat confidence.
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { aggregateStatus, DEFAULT_CONFIDENCE_OPTIONS, type ConfidenceOptions, type LogInput } from "@/lib/confidence";
import type { SpbuWithStatus } from "@/lib/spbu";

type Sql = NeonQueryFunction<false, false>;

// Batas log per SPBU yang dibaca dalam jendela (melindungi dari spam).
const MAX_LOGS_PER_SPBU = 200;

const positive = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Opsi dari env (opsional): CONFIDENCE_WINDOW_MINUTES, CONFIDENCE_HALF_LIFE_MINUTES. */
export function confidenceOptionsFromEnv(): Partial<ConfidenceOptions> {
  const w = positive(process.env.CONFIDENCE_WINDOW_MINUTES);
  const h = positive(process.env.CONFIDENCE_HALF_LIFE_MINUTES);
  return {
    ...(w ? { windowMs: w * 60_000 } : {}),
    ...(h ? { halfLifeMs: h * 60_000 } : {}),
  };
}

type Row = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  logs: LogInput[];
  last_seen_at: string | null;
};

export async function getSpbuWithAggregates(
  sql: Sql,
  now: Date = new Date(),
  options: Partial<ConfidenceOptions> = confidenceOptionsFromEnv(),
): Promise<SpbuWithStatus[]> {
  const windowMs = options.windowMs ?? DEFAULT_CONFIDENCE_OPTIONS.windowMs;
  const since = new Date(now.getTime() - windowMs).toISOString();
  const rows = (await sql.query(
    `select l.id, l.name, l.address, l.lat, l.lng,
            coalesce(w.logs, '[]'::json) as logs,
            (select max(created_at) from status_logs where spbu_id = l.id) as last_seen_at
     from spbu_locations l
     left join lateral (
       select json_agg(json_build_object(
                'status', x.status, 'source', x.source,
                'confidence_score', x.confidence_score, 'created_at', x.created_at)) as logs
       from (
         select status, source, confidence_score, created_at
         from status_logs
         where spbu_id = l.id and created_at >= $1::timestamptz
         order by created_at desc
         limit ${MAX_LOGS_PER_SPBU}
       ) x
     ) w on true
     order by l.name`,
    [since],
  )) as Row[];

  return rows.map((r) => {
    const agg = aggregateStatus(r.logs, now, options);
    const lastSeen = r.last_seen_at ? new Date(r.last_seen_at).toISOString() : null;
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      status: agg.status,
      source: agg.sources[0] ?? null,
      confidence_score: agg.stale ? null : agg.confidence,
      // Stale -> null supaya popup peta tidak menampilkan "Sumber: null"; waktu terakhir ada di last_seen_at.
      updated_at: agg.stale ? null : agg.updatedAt,
      sources: agg.sources,
      stale: agg.stale,
      sample_count: agg.sampleCount,
      last_seen_at: lastSeen,
    };
  });
}
