import type { SpbuStatus } from "@/lib/spbu";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const REPORT_STATUSES: readonly SpbuStatus[] = ["NORMAL", "ANTRE_PANJANG", "KOSONG"];

export type ReportInput = {
  spbuId: string;
  status: SpbuStatus;
  lat: number;
  lng: number;
  accuracy: number | null;
};

export type ValidationResult = { ok: true; value: ReportInput } | { ok: false; error: string };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validasi ketat payload laporan. Menolak tipe/rentang yang tidak wajar. */
export function validateReport(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.spbuId !== "string" || !UUID_RE.test(b.spbuId)) {
    return { ok: false, error: "spbuId harus berupa UUID yang valid." };
  }
  if (typeof b.status !== "string" || !(REPORT_STATUSES as readonly string[]).includes(b.status)) {
    return { ok: false, error: "status harus salah satu dari NORMAL, ANTRE_PANJANG, KOSONG." };
  }
  if (!isNum(b.lat) || b.lat < -90 || b.lat > 90) {
    return { ok: false, error: "lat harus angka antara -90 dan 90." };
  }
  if (!isNum(b.lng) || b.lng < -180 || b.lng > 180) {
    return { ok: false, error: "lng harus angka antara -180 dan 180." };
  }
  let accuracy: number | null = null;
  if (b.accuracy !== undefined && b.accuracy !== null) {
    if (!isNum(b.accuracy) || b.accuracy < 0 || b.accuracy > 100_000) {
      return { ok: false, error: "accuracy harus angka non-negatif (meter)." };
    }
    accuracy = b.accuracy;
  }
  return {
    ok: true,
    value: { spbuId: b.spbuId.toLowerCase(), status: b.status as SpbuStatus, lat: b.lat, lng: b.lng, accuracy },
  };
}
