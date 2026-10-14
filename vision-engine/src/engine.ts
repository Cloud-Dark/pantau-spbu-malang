import type { Config } from "./config.ts";
import { errMsg, type Logger } from "./log.ts";
import type { Repo } from "./repo.ts";
import type { Job } from "./scheduler.ts";
import { runCctvCycle } from "./sources/cctv/pipeline.ts";
import { DetectorUnavailable, OnnxYoloDetector } from "./sources/cctv/onnx-detector.ts";
import { loadCctvSources } from "./sources/cctv/sources-config.ts";
import type { Detector } from "./sources/cctv/types.ts";
import { runTrafficCycle } from "./sources/traffic.ts";

/** Menyusun job dari konfigurasi. CCTV dan Traffic keduanya opsional dan fail-soft. */
export async function buildJobs(cfg: Config, repo: Repo, log: Logger): Promise<Job[]> {
  const jobs: Job[] = [];

  jobs.push({
    name: "traffic",
    intervalSec: cfg.traffic.intervalSec,
    run: async () =>
      runTrafficCycle({ cfg: cfg.traffic, heartbeatMin: cfg.dedupeHeartbeatMin, repo, spbuList: await repo.listSpbu(), log }),
  });

  const parsed = loadCctvSources(cfg.cctv.sourcesFile);
  if (!parsed) {
    log.info(`[cctv] ${cfg.cctv.sourcesFile} tidak ada: CCTV dinonaktifkan (opsional)`);
    return jobs;
  }
  parsed.problems.forEach((p) => log.warn(`[cctv] konfigurasi: ${p}`));
  if (parsed.sources.length === 0) {
    log.warn("[cctv] tidak ada sumber valid: CCTV dinonaktifkan");
    return jobs;
  }
  if (!cfg.cctv.modelPath) {
    log.warn("[cctv] YOLO_MODEL_PATH kosong: CCTV dinonaktifkan");
    return jobs;
  }
  let detector: Detector;
  try {
    detector = await OnnxYoloDetector.create({
      modelPath: cfg.cctv.modelPath,
      scoreThreshold: cfg.cctv.scoreThreshold,
      iouThreshold: cfg.cctv.iouThreshold,
    });
  } catch (e) {
    log.warn(`[cctv] detektor tidak tersedia, CCTV dinonaktifkan: ${e instanceof DetectorUnavailable ? e.message : errMsg(e)}`);
    return jobs;
  }
  jobs.push({
    name: "cctv",
    intervalSec: cfg.cctv.intervalSec,
    run: async () =>
      runCctvCycle({
        cfg: cfg.cctv,
        heartbeatMin: cfg.dedupeHeartbeatMin,
        repo,
        spbuList: await repo.listSpbu(),
        sources: parsed.sources,
        detector,
        log,
      }),
  });
  return jobs;
}
