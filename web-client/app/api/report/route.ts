import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import { GEOFENCE_RADIUS_M, haversineMeters } from "@/lib/geo";
import { validateReport } from "@/lib/report-validation";

// Skor keyakinan awal laporan crowdsourcing; pembobotan lanjutan dikerjakan terpisah.
const CROWDSOURCE_BASE_CONFIDENCE = 40;
/** Akurasi GPS terburuk yang diterima (meter). */
const MAX_ACCURACY_M = 100;
const PER_SPBU_WINDOW_MIN = 5;
const PER_REPORTER_HOURLY_LIMIT = 10;
const MAX_BODY_BYTES = 2_000;

const noStore = { "Cache-Control": "no-store" };
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  Response.json({ ok: false, error, ...extra }, { status, headers: noStore });

function reporterHash(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const salt = process.env.REPORT_HASH_SALT ?? "dev-salt-ganti-di-produksi";
  return createHash("sha256").update(`${ip}|${ua}|${salt}`).digest("hex");
}

// Validasi geofence di server (ADR-004): klien tidak dipercaya.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return fail(400, "Payload terlalu besar.");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Body bukan JSON yang valid.");
  }
  const v = validateReport(body);
  if (!v.ok) return fail(400, v.error);
  const { spbuId, status, lat, lng, accuracy } = v.value;

  try {
    const sql = getSql();
    const spbu = (await sql`select lat, lng, name from spbu_locations where id = ${spbuId}`) as {
      lat: number;
      lng: number;
      name: string;
    }[];
    if (spbu.length === 0) return fail(404, "SPBU tidak ditemukan.");

    const distance = Math.round(haversineMeters(lat, lng, spbu[0].lat, spbu[0].lng));
    if (distance > GEOFENCE_RADIUS_M) {
      return fail(
        403,
        `Anda berada ${distance} m dari ${spbu[0].name}. Laporan hanya diterima dalam radius ${GEOFENCE_RADIUS_M} m.`,
        { distance_m: distance, radius_m: GEOFENCE_RADIUS_M },
      );
    }
    if (accuracy !== null && accuracy > MAX_ACCURACY_M) {
      return fail(
        422,
        `Sinyal GPS kurang akurat (±${Math.round(accuracy)} m, maksimal ${MAX_ACCURACY_M} m). Pindah ke area terbuka lalu coba lagi.`,
        { accuracy_m: Math.round(accuracy), max_accuracy_m: MAX_ACCURACY_M },
      );
    }

    const hash = reporterHash(req);
    const [recent] = (await sql`
      select
        count(*) filter (where spbu_id = ${spbuId} and created_at > now() - make_interval(mins => ${PER_SPBU_WINDOW_MIN})) as per_spbu,
        count(*) as per_hour
      from status_logs
      where reporter_hash = ${hash} and created_at > now() - interval '1 hour'
    `) as { per_spbu: string; per_hour: string }[];
    if (Number(recent.per_spbu) >= 1) {
      return fail(429, `Anda sudah melapor untuk SPBU ini. Coba lagi dalam ${PER_SPBU_WINDOW_MIN} menit.`);
    }
    if (Number(recent.per_hour) >= PER_REPORTER_HOURLY_LIMIT) {
      return fail(429, `Batas ${PER_REPORTER_HOURLY_LIMIT} laporan per jam tercapai. Coba lagi nanti.`);
    }

    // lat/lng pelapor tidak disimpan; hanya jarak terverifikasi dan hash anonim.
    const [row] = (await sql`
      insert into status_logs (spbu_id, status, source, confidence_score, reporter_hash, distance_m)
      values (${spbuId}, ${status}, 'CROWDSOURCE', ${CROWDSOURCE_BASE_CONFIDENCE}, ${hash}, ${distance})
      returning id, created_at
    `) as { id: string; created_at: string }[];

    return Response.json(
      { ok: true, id: row.id, status, distance_m: distance, created_at: row.created_at },
      { headers: noStore },
    );
  } catch (e) {
    console.error("POST /api/report gagal", e instanceof Error ? e.message : e);
    return fail(500, "Terjadi kesalahan server. Coba lagi nanti.");
  }
}
