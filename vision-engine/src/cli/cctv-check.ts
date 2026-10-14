// Periksa konfigurasi & ketersediaan CCTV. Tidak butuh database. Tidak menghubungi URL CCTV kecuali --probe.
import { loadEnvFile, parseConfig } from "../config.ts";
import { errMsg } from "../log.ts";
import { OnnxYoloDetector } from "../sources/cctv/onnx-detector.ts";
import { ffmpegAvailable, grabSnapshot, grabStreamFrame } from "../sources/cctv/frame.ts";
import { loadCctvSources, redactUrl } from "../sources/cctv/sources-config.ts";

loadEnvFile();
const probe = process.argv.includes("--probe");
let bad = 0;
const ok = (m: string) => console.log(`[OK]    ${m}`);
const warn = (m: string) => console.log(`[WARN]  ${m}`);
const fail = (m: string) => (bad++, console.log(`[GAGAL] ${m}`));

const cfg = parseConfig(process.env);
const parsed = loadCctvSources(cfg.cctv.sourcesFile);
if (!parsed) {
  warn(`${cfg.cctv.sourcesFile} tidak ada (CCTV opsional; salin cctv-sources.example.json untuk mengaktifkan)`);
} else {
  parsed.problems.forEach((p) => fail(`konfigurasi: ${p}`));
  ok(`${parsed.sources.length} sumber valid di ${cfg.cctv.sourcesFile}`);
  for (const s of parsed.sources) {
    console.log(`        - ${s.spbuName ?? s.spbuId} [${s.type}] ${redactUrl(s.url)} roi=${s.roi ? s.roi.length + " titik" : "penuh"} capacity=${s.capacity ?? cfg.cctv.queueThreshold}`);
  }
}

const hasFfmpeg = await ffmpegAvailable(cfg.cctv.ffmpegPath);
if (hasFfmpeg) ok(`ffmpeg tersedia (${cfg.cctv.ffmpegPath})`);
else if (parsed?.sources.some((s) => s.type === "stream")) fail(`ffmpeg tidak ditemukan (${cfg.cctv.ffmpegPath}) padahal ada sumber stream`);
else warn("ffmpeg tidak ditemukan (hanya dibutuhkan untuk sumber HLS/RTSP)");

if (!cfg.cctv.modelPath) warn("YOLO_MODEL_PATH kosong: deteksi CCTV nonaktif");
else {
  try {
    await OnnxYoloDetector.create({ modelPath: cfg.cctv.modelPath, scoreThreshold: cfg.cctv.scoreThreshold, iouThreshold: cfg.cctv.iouThreshold });
    ok(`model & onnxruntime-node termuat (${cfg.cctv.modelPath})`);
  } catch (e) {
    fail(errMsg(e));
  }
}

if (probe && parsed) {
  for (const s of parsed.sources) {
    try {
      const f = s.type === "snapshot" ? await grabSnapshot(s.url, cfg.cctv.timeoutMs) : await grabStreamFrame(s.url, cfg.cctv.timeoutMs, cfg.cctv.ffmpegPath);
      ok(`probe ${redactUrl(s.url)}: frame ${f.width}x${f.height}`);
    } catch (e) {
      fail(`probe ${redactUrl(s.url)}: ${errMsg(e)}`);
    }
  }
} else if (parsed?.sources.length) console.log("        (tambahkan --probe untuk benar-benar mengambil satu frame dari tiap sumber)");

process.exit(bad ? 1 : 0);
