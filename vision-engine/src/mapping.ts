import { clamp } from "./util.ts";
import type { LastLog, Status } from "./types.ts";

// CATATAN PENTING: status KOSONG (BBM habis) TIDAK dapat disimpulkan dari lalu lintas
// maupun dari hitungan kendaraan CCTV. KOSONG hanya berasal dari laporan warga (CROWDSOURCE).

export interface TrafficReading {
  currentSpeed: number;
  freeFlowSpeed: number;
  /** 0-1, kepercayaan data dari penyedia */
  confidence: number;
  roadClosure: boolean;
}

export interface TrafficMapOptions {
  normalRatio: number;
  minApiConfidence: number;
}

export interface MappedStatus {
  status: Status;
  /** 1-100 */
  confidence: number;
  detail: string;
}

/**
 * Pemetaan fungsi murni: bacaan lalu lintas -> status.
 * rasio = currentSpeed / freeFlowSpeed; rasio >= normalRatio => NORMAL, selain itu ANTRE_PANJANG.
 * roadClosure => ANTRE_PANJANG. Mengembalikan null bila data tidak layak dipakai.
 * confidence_score = 60% kepercayaan API + 40% jarak rasio dari ambang (jenuh pada selisih 0.3).
 */
export function mapTraffic(r: TrafficReading, opt: TrafficMapOptions): MappedStatus | null {
  if (![r.currentSpeed, r.freeFlowSpeed, r.confidence].every(Number.isFinite)) return null;
  if (r.confidence < opt.minApiConfidence) return null;
  const apiPart = clamp(r.confidence, 0, 1) * 100;

  if (r.roadClosure) {
    return {
      status: "ANTRE_PANJANG",
      confidence: toScore(0.6 * apiPart + 0.4 * 100),
      detail: "jalan ditutup",
    };
  }
  if (r.freeFlowSpeed <= 0 || r.currentSpeed < 0) return null;

  const ratio = r.currentSpeed / r.freeFlowSpeed;
  const margin = clamp(Math.abs(ratio - opt.normalRatio) / 0.3, 0, 1) * 100;
  return {
    status: ratio >= opt.normalRatio ? "NORMAL" : "ANTRE_PANJANG",
    confidence: toScore(0.6 * apiPart + 0.4 * margin),
    detail: `rasio=${ratio.toFixed(2)} (${r.currentSpeed}/${r.freeFlowSpeed} km/j), api=${r.confidence.toFixed(2)}`,
  };
}

/**
 * Pemetaan CCTV: jumlah kendaraan dalam ROI -> status. count >= threshold => ANTRE_PANJANG.
 * avgScore = rata-rata skor deteksi (0-1), undefined bila tak ada deteksi.
 */
export function mapCctv(count: number, avgScore: number | undefined, threshold: number): MappedStatus {
  const status: Status = count >= threshold ? "ANTRE_PANJANG" : "NORMAL";
  const scorePart = (avgScore ?? 0.5) * 100;
  const margin = clamp(Math.abs(count - threshold) / threshold, 0, 1) * 100;
  return {
    status,
    confidence: toScore(0.5 * scorePart + 0.5 * margin),
    detail: `kendaraan=${count} ambang=${threshold}`,
  };
}

export function toScore(v: number): number {
  return clamp(Math.round(v), 1, 100);
}

/**
 * Dedupe: tulis bila belum ada log, status berubah, atau jeda heartbeat terlewati.
 * heartbeatMs=0 berarti selalu tulis.
 */
export function shouldInsert(
  last: LastLog | undefined,
  next: Status,
  nowMs: number,
  heartbeatMs: number,
): boolean {
  if (!last) return true;
  if (last.status !== next) return true;
  return nowMs - last.createdAt.getTime() >= heartbeatMs;
}
