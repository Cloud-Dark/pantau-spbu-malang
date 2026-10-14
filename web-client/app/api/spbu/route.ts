import { getSql } from "@/lib/db";
import type { SpbuWithStatus } from "@/lib/spbu";

export async function GET() {
  const sql = getSql();
  const rows = (await sql`
    select l.id, l.name, l.address, l.lat, l.lng,
           s.status, s.source, s.confidence_score, s.created_at as updated_at
    from spbu_locations l
    left join lateral (
      select status, source, confidence_score, created_at
      from status_logs
      where spbu_id = l.id
      order by created_at desc
      limit 1
    ) s on true
    order by l.name
  `) as SpbuWithStatus[];

  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}
