import type { TrafficConfig } from "../config.ts";
import { errMsg, type Logger } from "../log.ts";
import { mapTraffic, shouldInsert, type TrafficReading } from "../mapping.ts";
import type { Repo } from "../repo.ts";
import type { Spbu } from "../types.ts";
import { mapLimit, sleep } from "../util.ts";

export type FetchFn = typeof fetch;

export interface CycleSummary {
  total: number;
  inserted: number;
  skipped: number;
  failed: number;
}

class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const TOMTOM_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json";

/**
 * Ambil Flow Segment Data TomTom pada titik gerbang SPBU. Titik ini dipakai sebagai proksi
 * radius ~50 m: TomTom memetakan titik ke segmen jalan terdekat. Error HTTP tidak membawa URL (ada kunci).
 */
export async function fetchTomTomFlow(
  spbu: Pick<Spbu, "lat" | "lng">,
  cfg: Pick<TrafficConfig, "apiKey" | "timeoutMs" | "retries">,
  deps: { fetchImpl?: FetchFn; sleepMs?: (ms: number) => Promise<void> } = {},
): Promise<TrafficReading> {
  const doFetch = deps.fetchImpl ?? fetch;
  const wait = deps.sleepMs ?? ((ms: number) => sleep(ms));
  const url = `${TOMTOM_URL}?point=${spbu.lat},${spbu.lng}&unit=KMPH&key=${encodeURIComponent(cfg.apiKey ?? "")}`;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= cfg.retries; attempt++) {
    if (attempt > 0) await wait(500 * 2 ** (attempt - 1)); // backoff 0.5s, 1s, 2s...
    try {
      const res = await doFetch(url, { signal: AbortSignal.timeout(cfg.timeoutMs) });
      if (!res.ok) throw new HttpError(res.status);
      const body = (await res.json()) as { flowSegmentData?: Record<string, unknown> };
      const d = body.flowSegmentData;
      if (!d) throw new Error("respons tanpa flowSegmentData");
      return {
        currentSpeed: Number(d.currentSpeed),
        freeFlowSpeed: Number(d.freeFlowSpeed),
        confidence: Number(d.confidence),
        roadClosure: d.roadClosure === true,
      };
    } catch (e) {
      lastErr = e;
      // 4xx selain 408/429 = permanen (kunci salah, titik tak ada jalan): jangan diulang
      if (e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) break;
    }
  }
  const reason =
    lastErr instanceof HttpError
      ? lastErr.message
      : lastErr instanceof Error && lastErr.name === "TimeoutError"
        ? "timeout"
        : errMsg(lastErr);
  throw new Error(`TomTom gagal: ${reason}`);
}

export interface TrafficCycleDeps {
  cfg: TrafficConfig;
  heartbeatMin: number;
  repo: Repo;
  spbuList: Spbu[];
  log: Logger;
  fetchImpl?: FetchFn;
  sleepMs?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** Satu siklus: polling semua SPBU, dedupe, insert. Error satu SPBU tidak menghentikan siklus. */
export async function runTrafficCycle(d: TrafficCycleDeps): Promise<CycleSummary> {
  const sum: CycleSummary = { total: d.spbuList.length, inserted: 0, skipped: 0, failed: 0 };
  if (!d.cfg.apiKey) {
    d.log.warn("[traffic] TRAFFIC_API_KEY kosong: pemantauan lalu lintas DINONAKTIFKAN (tidak ada panggilan API)");
    sum.skipped = sum.total;
    return sum;
  }
  const now = d.now ?? Date.now;
  let last: Awaited<ReturnType<Repo["lastLogs"]>>;
  try {
    last = await d.repo.lastLogs("TRAFFIC_API");
  } catch (e) {
    d.log.warn(`[traffic] gagal membaca log terakhir (dedupe dilewati): ${errMsg(e)}`);
    last = new Map();
  }

  await mapLimit(d.spbuList, d.cfg.concurrency, async (spbu) => {
    try {
      const reading = await fetchTomTomFlow(spbu, d.cfg, { fetchImpl: d.fetchImpl, sleepMs: d.sleepMs });
      const mapped = mapTraffic(reading, d.cfg);
      if (!mapped) {
        d.log.warn(`[traffic] ${spbu.name}: data tidak layak (confidence rendah/tidak valid), dilewati`);
        sum.skipped++;
        return;
      }
      if (!shouldInsert(last.get(spbu.id), mapped.status, now(), d.heartbeatMin * 60_000)) {
        d.log.info(`[traffic] ${spbu.name}: ${mapped.status} tidak berubah, dilewati (dedupe)`);
        sum.skipped++;
        return;
      }
      await d.repo.insertStatusLog({
        spbuId: spbu.id,
        status: mapped.status,
        source: "TRAFFIC_API",
        confidence: mapped.confidence,
      });
      d.log.info(`[traffic] ${spbu.name}: ${mapped.status} conf=${mapped.confidence} (${mapped.detail})`);
      sum.inserted++;
    } catch (e) {
      d.log.error(`[traffic] ${spbu.name}: ${errMsg(e)}`);
      sum.failed++;
    }
  });
  d.log.info(`[traffic] siklus selesai: ${JSON.stringify(sum)}`);
  return sum;
}
