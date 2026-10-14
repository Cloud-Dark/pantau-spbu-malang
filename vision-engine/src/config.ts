import { existsSync } from "node:fs";

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Konfigurasi tidak valid:\n - ${problems.join("\n - ")}`);
    this.name = "ConfigError";
  }
}

export interface TrafficConfig {
  provider: "tomtom";
  /** undefined = mode lalu lintas dinonaktifkan */
  apiKey: string | undefined;
  intervalSec: number;
  concurrency: number;
  timeoutMs: number;
  retries: number;
  normalRatio: number;
  minApiConfidence: number;
}

export interface CctvConfig {
  sourcesFile: string;
  intervalSec: number;
  timeoutMs: number;
  queueThreshold: number;
  ffmpegPath: string;
  /** undefined = deteksi CCTV dinonaktifkan */
  modelPath: string | undefined;
  scoreThreshold: number;
  iouThreshold: number;
}

export interface Config {
  databaseUrl: string | undefined;
  dryRun: boolean;
  dedupeHeartbeatMin: number;
  traffic: TrafficConfig;
  cctv: CctvConfig;
}

type Env = Record<string, string | undefined>;

/** Muat file env opsional: ENV_FILE, atau ./.env bila ada. Variabel yang sudah diset tidak ditimpa. */
export function loadEnvFile(env: Env = process.env): void {
  const file = env.ENV_FILE ?? (existsSync(".env") ? ".env" : undefined);
  if (file) process.loadEnvFile(file);
}

export function parseConfig(env: Env): Config {
  const problems: string[] = [];
  const str = (k: string): string | undefined => {
    const v = env[k]?.trim();
    return v ? v : undefined;
  };
  const num = (k: string, def: number, min: number, max: number, int = false): number => {
    const raw = str(k);
    if (raw === undefined) return def;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v))) {
      problems.push(`${k}="${raw}" harus ${int ? "bilangan bulat" : "angka"} antara ${min} dan ${max}`);
      return def;
    }
    return v;
  };
  const bool = (k: string): boolean => {
    const raw = str(k)?.toLowerCase();
    if (raw === undefined) return false;
    if (["1", "true", "yes", "on"].includes(raw)) return true;
    if (["0", "false", "no", "off"].includes(raw)) return false;
    problems.push(`${k}="${raw}" harus 0/1/true/false`);
    return false;
  };

  const provider = (str("TRAFFIC_PROVIDER") ?? "tomtom").toLowerCase();
  if (provider !== "tomtom") {
    problems.push(`TRAFFIC_PROVIDER="${provider}" belum didukung (hanya: tomtom)`);
  }

  const cfg: Config = {
    databaseUrl: str("DATABASE_URL"),
    dryRun: bool("DRY_RUN"),
    dedupeHeartbeatMin: num("DEDUPE_HEARTBEAT_MIN", 30, 0, 1440),
    traffic: {
      provider: "tomtom",
      apiKey: str("TRAFFIC_API_KEY"),
      intervalSec: num("TRAFFIC_INTERVAL_SEC", 300, 5, 86400, true),
      concurrency: num("TRAFFIC_CONCURRENCY", 4, 1, 32, true),
      timeoutMs: num("TRAFFIC_TIMEOUT_MS", 8000, 500, 120000, true),
      retries: num("TRAFFIC_RETRIES", 2, 0, 5, true),
      normalRatio: num("TRAFFIC_NORMAL_RATIO", 0.7, 0.05, 1),
      minApiConfidence: num("TRAFFIC_MIN_API_CONFIDENCE", 0.3, 0, 1),
    },
    cctv: {
      sourcesFile: str("CCTV_SOURCES_FILE") ?? "cctv-sources.json",
      intervalSec: num("CCTV_INTERVAL_SEC", 120, 5, 86400, true),
      timeoutMs: num("CCTV_TIMEOUT_MS", 15000, 500, 120000, true),
      queueThreshold: num("CCTV_QUEUE_THRESHOLD", 8, 1, 500, true),
      ffmpegPath: str("FFMPEG_PATH") ?? "ffmpeg",
      modelPath: str("YOLO_MODEL_PATH"),
      scoreThreshold: num("YOLO_SCORE_THRESHOLD", 0.35, 0.01, 0.99),
      iouThreshold: num("YOLO_IOU_THRESHOLD", 0.5, 0.05, 0.95),
    },
  };
  if (problems.length) throw new ConfigError(problems);
  return cfg;
}
