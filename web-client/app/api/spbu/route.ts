import { getSql } from "@/lib/db";
import { getSpbuWithAggregates } from "@/lib/spbu-status";

// Status per SPBU = agregat berbobot dari log dalam jendela waktu (lihat lib/confidence.ts).
export async function GET() {
  const data = await getSpbuWithAggregates(getSql());
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
