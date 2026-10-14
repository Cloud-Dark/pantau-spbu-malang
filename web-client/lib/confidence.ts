/**
 * Pembobotan confidence status SPBU (fungsi murni, tanpa I/O).
 *
 * Masukan : log terbaru per SPBU {status, source, confidence_score, created_at} + waktu sekarang.
 * Keluaran: { status|null, confidence 0..100, sources, sampleCount, updatedAt, stale }.
 *
 * RUMUS
 * -----
 * Parameter (semua bisa di-override lewat argumen `options`; default di DEFAULT_CONFIDENCE_OPTIONS):
 *   windowMs       = 30 menit   jendela waktu; log lebih tua diabaikan
 *   halfLifeMs     = 10 menit   half-life peluruhan eksponensial
 *   sourceWeights  = { CCTV: 0.40, TRAFFIC_API: 0.35, CROWDSOURCE: 0.25 }   (W_src)
 *
 * 1. Untuk tiap log i dalam jendela (umur a_i = now - created_at, minimum 0):
 *      decay_i    = 0.5 ^ (a_i / halfLife)
 *      strength_i = (confidence_score_i / 100) * decay_i           (0..1)
 * 2. Untuk tiap pasangan (sumber s, status t), kekuatan kelompok G(s,t):
 *      CCTV / TRAFFIC_API : G = max(strength_i)         (pembacaan berulang dari sumber yang sama
 *                                                        tidak ditumpuk; yang terkuat/terbaru menang)
 *      CROWDSOURCE        : G = 1 - exp(-S), S = jumlah strength_i
 *                           (diminishing returns: makin banyak laporan sepakat makin naik, tetapi
 *                            tak pernah melewati 1)
 * 3. Skor per status:  score(t) = sum_s  W_src(s) * G(s,t).
 *    Karena G <= 1, kontribusi satu sumber tak pernah melebihi W_src-nya: spam crowdsourcing paling
 *    banyak menyumbang 0.25, sehingga tidak bisa mengalahkan CCTV (0.40) yang jelas berbeda
 *    selama CCTV cukup segar/yakin.
 * 4. Status pemenang = skor tertinggi. Tie-break (selisih < 1e-9): (a) lebih banyak sumber
 *    independen yang mendukung, (b) log pendukung lebih baru, (c) keparahan lebih tinggi
 *    (KOSONG > ANTRE_PANJANG > NORMAL; sikap hati-hati untuk peringatan warga).
 * 5. Confidence akhir (1..100):
 *      total     = sum_t score(t)
 *      share     = score(menang) / total
 *      margin    = (score(menang) - score(runner-up)) / score(menang)    (1 bila tak ada runner-up)
 *      agreement = 0.5*share + 0.5*margin
 *      supportW  = sum W_src dari sumber yang mendukung pemenang
 *      quality   = score(menang) / supportW                   (kesegaran x keyakinan sumber, 0..1)
 *      coverage  = 0.6 + 0.4 * min(1, supportW / 0.6)         (lebih banyak sumber independen => naik)
 *      confidence = round(100 * quality * agreement * coverage), dijepit ke 1..100
 *    Contoh: satu CCTV segar skor 90 -> 78; CCTV+Traffic sepakat (90/80) -> ~85; CCTV vs Traffic
 *    bertentangan -> ~30.
 * 6. Stale: tidak ada log dalam jendela => status null, confidence 0, stale true, sources [].
 *    `updatedAt` pada kasus stale = waktu log terakhir (di luar jendela) atau null bila tak ada log.
 *    Pada kasus non-stale, `updatedAt` = waktu log terbaru dalam jendela.
 *
 * `sources` = daftar sumber yang mendukung status pemenang (urut kontribusi menurun).
 * `sampleCount` = jumlah log yang dihitung (dalam jendela).
 */
import type { SpbuStatus, StatusSource } from "@/lib/spbu";

export type LogInput = {
  status: SpbuStatus;
  source: StatusSource;
  confidence_score: number;
  created_at: string | Date;
};

export type ConfidenceOptions = {
  windowMs: number;
  halfLifeMs: number;
  sourceWeights: Record<StatusSource, number>;
};

export const DEFAULT_CONFIDENCE_OPTIONS: ConfidenceOptions = {
  windowMs: 30 * 60_000,
  halfLifeMs: 10 * 60_000,
  sourceWeights: { CCTV: 0.4, TRAFFIC_API: 0.35, CROWDSOURCE: 0.25 },
};

export type AggregateResult = {
  status: SpbuStatus | null;
  confidence: number;
  sources: StatusSource[];
  sampleCount: number;
  updatedAt: string | null;
  stale: boolean;
};

const STATUSES: SpbuStatus[] = ["KOSONG", "ANTRE_PANJANG", "NORMAL"]; // urut keparahan menurun
const SEVERITY: Record<SpbuStatus, number> = { KOSONG: 3, ANTRE_PANJANG: 2, NORMAL: 1 };
const EPS = 1e-9;
const COVERAGE_REF = 0.6;

const toMs = (v: string | Date) => (v instanceof Date ? v.getTime() : Date.parse(v));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function aggregateStatus(
  logs: readonly LogInput[],
  now: Date | number = Date.now(),
  options: Partial<ConfidenceOptions> = {},
): AggregateResult {
  const opt: ConfidenceOptions = {
    ...DEFAULT_CONFIDENCE_OPTIONS,
    ...options,
    sourceWeights: { ...DEFAULT_CONFIDENCE_OPTIONS.sourceWeights, ...options.sourceWeights },
  };
  const nowMs = typeof now === "number" ? now : now.getTime();

  const valid = logs
    .map((l) => ({ ...l, t: toMs(l.created_at) }))
    .filter(
      (l) =>
        Number.isFinite(l.t) &&
        l.status in SEVERITY &&
        l.source in opt.sourceWeights &&
        Number.isFinite(l.confidence_score),
    );
  const fresh = valid.filter((l) => nowMs - l.t <= opt.windowMs);

  if (fresh.length === 0) {
    const last = valid.reduce<number | null>((m, l) => (m === null || l.t > m ? l.t : m), null);
    return {
      status: null,
      confidence: 0,
      sources: [],
      sampleCount: 0,
      updatedAt: last === null ? null : new Date(last).toISOString(),
      stale: true,
    };
  }

  // Kelompokkan per status -> per sumber.
  type Group = { sum: number; max: number; newest: number };
  const groups = new Map<SpbuStatus, Map<StatusSource, Group>>();
  for (const l of fresh) {
    const age = Math.max(0, nowMs - l.t);
    const strength = (clamp(l.confidence_score, 0, 100) / 100) * Math.pow(0.5, age / opt.halfLifeMs);
    const byStatus = groups.get(l.status) ?? new Map<StatusSource, Group>();
    const g = byStatus.get(l.source) ?? { sum: 0, max: 0, newest: 0 };
    g.sum += strength;
    g.max = Math.max(g.max, strength);
    g.newest = Math.max(g.newest, l.t);
    byStatus.set(l.source, g);
    groups.set(l.status, byStatus);
  }

  type Scored = {
    status: SpbuStatus;
    score: number;
    supportW: number;
    newest: number;
    contrib: [StatusSource, number][];
  };
  const scored: Scored[] = [];
  for (const status of STATUSES) {
    const byStatus = groups.get(status);
    if (!byStatus) continue;
    let score = 0;
    let supportW = 0;
    let newest = 0;
    const contrib: [StatusSource, number][] = [];
    for (const [src, g] of byStatus) {
      const w = opt.sourceWeights[src];
      const strength = src === "CROWDSOURCE" ? 1 - Math.exp(-g.sum) : g.max;
      const c = w * strength;
      score += c;
      supportW += w;
      newest = Math.max(newest, g.newest);
      contrib.push([src, c]);
    }
    contrib.sort((a, b) => b[1] - a[1]);
    scored.push({ status, score, supportW, newest, contrib });
  }

  scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) > EPS) return b.score - a.score;
    if (a.contrib.length !== b.contrib.length) return b.contrib.length - a.contrib.length;
    if (a.newest !== b.newest) return b.newest - a.newest;
    return SEVERITY[b.status] - SEVERITY[a.status];
  });

  const win = scored[0];
  const runnerUp = scored[1];
  const total = scored.reduce((s, x) => s + x.score, 0);
  const newestAll = fresh.reduce((m, l) => Math.max(m, l.t), 0);

  let confidence = 1;
  if (total > 0 && win.score > 0 && win.supportW > 0) {
    const share = win.score / total;
    const margin = runnerUp ? (win.score - runnerUp.score) / win.score : 1;
    const agreement = 0.5 * share + 0.5 * margin;
    const quality = win.score / win.supportW;
    const coverage = 0.6 + 0.4 * Math.min(1, win.supportW / COVERAGE_REF);
    confidence = clamp(Math.round(100 * quality * agreement * coverage), 1, 100);
  }

  return {
    status: win.status,
    confidence,
    sources: win.contrib.map(([s]) => s),
    sampleCount: fresh.length,
    updatedAt: new Date(newestAll).toISOString(),
    stale: false,
  };
}
