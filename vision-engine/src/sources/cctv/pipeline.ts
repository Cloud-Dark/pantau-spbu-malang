import type { CctvConfig } from "../../config.ts";
import { pointInPolygon } from "../../geo.ts";
import { errMsg, type Logger } from "../../log.ts";
import { mapCctv, shouldInsert } from "../../mapping.ts";
import type { Repo } from "../../repo.ts";
import type { Spbu } from "../../types.ts";
import type { CycleSummary } from "../traffic.ts";
import { grabSnapshot, grabStreamFrame, type FetchFn } from "./frame.ts";
import { redactUrl } from "./sources-config.ts";
import type { CctvSource, Detection, Detector, Frame } from "./types.ts";

/** Hitung kendaraan yang titik tengah-bawah kotaknya berada dalam ROI (tanpa ROI = seluruh frame). */
export function countInRoi(dets: Detection[], frame: Frame, roi?: [number, number][]): Detection[] {
  if (!roi) return dets;
  return dets.filter((d) => {
    const px = (d.box.x1 + d.box.x2) / 2 / frame.width;
    const py = d.box.y2 / frame.height;
    return pointInPolygon([px, py], roi);
  });
}

export function resolveSpbu(src: CctvSource, list: Spbu[]): Spbu | undefined {
  if (src.spbuId) return list.find((s) => s.id === src.spbuId);
  const n = src.spbuName?.trim().toLowerCase();
  return list.find((s) => s.name.trim().toLowerCase() === n);
}

export interface CctvCycleDeps {
  cfg: CctvConfig;
  heartbeatMin: number;
  repo: Repo;
  spbuList: Spbu[];
  sources: CctvSource[];
  detector: Detector;
  log: Logger;
  fetchImpl?: FetchFn;
  /** injeksi uji untuk pengambilan frame */
  grab?: (src: CctvSource) => Promise<Frame>;
  now?: () => number;
}

export async function runCctvCycle(d: CctvCycleDeps): Promise<CycleSummary> {
  const sum: CycleSummary = { total: d.sources.length, inserted: 0, skipped: 0, failed: 0 };
  const now = d.now ?? Date.now;
  let last = new Map<string, import("../../types.ts").LastLog>();
  try {
    last = await d.repo.lastLogs("CCTV");
  } catch (e) {
    d.log.warn(`[cctv] gagal membaca log terakhir (dedupe dilewati): ${errMsg(e)}`);
  }

  // Berurutan: sumber CCTV sedikit dan ffmpeg berat; hindari lonjakan CPU.
  for (const src of d.sources) {
    const tag = src.spbuName ?? src.spbuId ?? "?";
    try {
      const spbu = resolveSpbu(src, d.spbuList);
      if (!spbu) throw new Error("SPBU tidak ditemukan di database");
      const frame = d.grab
        ? await d.grab(src)
        : src.type === "snapshot"
          ? await grabSnapshot(src.url, d.cfg.timeoutMs, d.fetchImpl)
          : await grabStreamFrame(src.url, d.cfg.timeoutMs, d.cfg.ffmpegPath);
      const inRoi = countInRoi(await d.detector.detect(frame), frame, src.roi);
      const avg = inRoi.length ? inRoi.reduce((s, x) => s + x.score, 0) / inRoi.length : undefined;
      const mapped = mapCctv(inRoi.length, avg, src.capacity ?? d.cfg.queueThreshold);

      if (!shouldInsert(last.get(spbu.id), mapped.status, now(), d.heartbeatMin * 60_000)) {
        d.log.info(`[cctv] ${spbu.name}: ${mapped.status} tidak berubah, dilewati (dedupe)`);
        sum.skipped++;
        continue;
      }
      await d.repo.insertStatusLog({ spbuId: spbu.id, status: mapped.status, source: "CCTV", confidence: mapped.confidence });
      d.log.info(`[cctv] ${spbu.name}: ${mapped.status} conf=${mapped.confidence} (${mapped.detail}, detektor=${d.detector.name})`);
      sum.inserted++;
    } catch (e) {
      d.log.error(`[cctv] ${tag} (${redactUrl(src.url)}): ${errMsg(e)}`);
      sum.failed++;
    }
  }
  d.log.info(`[cctv] siklus selesai: ${JSON.stringify(sum)}`);
  return sum;
}
