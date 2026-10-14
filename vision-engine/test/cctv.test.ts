import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCctvSources, redactUrl } from "../src/sources/cctv/sources-config.ts";
import { countInRoi, resolveSpbu, runCctvCycle } from "../src/sources/cctv/pipeline.ts";
import { decodeJpeg, ffmpegAvailable, grabSnapshot, grabStreamFrame } from "../src/sources/cctv/frame.ts";
import { StubDetector } from "../src/sources/cctv/stub-detector.ts";
import type { Detection } from "../src/sources/cctv/types.ts";
import { parseConfig } from "../src/config.ts";
import { silentLogger } from "../src/log.ts";
import type { NewStatusLog, Repo } from "../src/repo.ts";
import { SPBU, syntheticFrame, syntheticJpeg } from "./helpers.ts";

const cfg = parseConfig({}).cctv;
const det = (cx: number, bottom: number, score = 0.8): Detection => ({ label: "car", score, box: { x1: cx - 5, y1: bottom - 10, x2: cx + 5, y2: bottom } });

test("parseCctvSources: valid, tebakan type, dan entri rusak dilaporkan", () => {
  const { sources, problems } = parseCctvSources({
    sources: [
      { spbuName: "SPBU A", url: "https://x.invalid/a.jpg" },
      { spbuId: "11111111-1111-1111-1111-111111111111", url: "rtsp://x.invalid/s", roi: [[0, 0], [1, 0], [1, 1]], capacity: 5 },
      { url: "https://x.invalid/b.jpg" }, // tanpa spbu
      { spbuName: "B", url: "file:///etc/passwd" },
      { spbuName: "C", url: "https://x.invalid/c", roi: [[0, 0], [2, 0], [1, 1]] },
      { spbuName: "D", url: "https://x.invalid/d", capacity: 0 },
      { spbuId: "bukan-uuid", url: "https://x.invalid/e" },
    ],
  });
  assert.equal(sources.length, 2);
  assert.equal(sources[0]!.type, "snapshot");
  assert.equal(sources[1]!.type, "stream");
  assert.equal(problems.length, 5);
  assert.equal(parseCctvSources({}).problems.length, 1);
});

test("redactUrl: buang kredensial & query", () => {
  assert.equal(redactUrl("rtsp://user:pass@h.invalid:554/s?token=abc"), "rtsp://h.invalid:554/s");
  assert.equal(redactUrl("???"), "<url-tidak-valid>");
});

test("countInRoi: titik tengah-bawah kotak harus di dalam ROI ternormalisasi", () => {
  const f = syntheticFrame(100, 100);
  const roi: [number, number][] = [[0, 0.5], [1, 0.5], [1, 1], [0, 1]]; // separuh bawah
  const dets = [det(50, 90), det(50, 30), det(10, 60)];
  assert.equal(countInRoi(dets, f, roi).length, 2);
  assert.equal(countInRoi(dets, f).length, 3);
});

test("resolveSpbu: by id dan by nama (case-insensitive)", () => {
  assert.equal(resolveSpbu({ url: "", type: "snapshot", spbuName: "spbu b" }, SPBU)?.id, SPBU[1]!.id);
  assert.equal(resolveSpbu({ url: "", type: "snapshot", spbuId: SPBU[2]!.id }, SPBU)?.name, "SPBU C");
  assert.equal(resolveSpbu({ url: "", type: "snapshot", spbuName: "tidak ada" }, SPBU), undefined);
});

test("decodeJpeg & grabSnapshot dengan JPEG sintetis dan fetch palsu", async () => {
  const jpg = syntheticJpeg(64, 48, [{ x: 10, y: 10, w: 20, h: 20, rgb: [255, 0, 0] }]);
  const f = decodeJpeg(jpg);
  assert.equal(f.width, 64);
  assert.equal(f.data.length, 64 * 48 * 4);
  const snap = await grabSnapshot("https://x.invalid/a.jpg", 1000, async () => new Response(Buffer.from(jpg)));
  assert.equal(snap.height, 48);
  await assert.rejects(grabSnapshot("https://x.invalid/a.jpg", 1000, async () => new Response("html", { status: 200 })), /bukan JPEG/);
  await assert.rejects(grabSnapshot("https://x.invalid/a.jpg", 1000, async () => new Response("", { status: 404 })), /HTTP 404/);
});

function memRepo(): Repo & { inserted: NewStatusLog[] } {
  const inserted: NewStatusLog[] = [];
  return {
    inserted,
    listSpbu: async () => SPBU,
    lastLogs: async () => new Map(),
    insertStatusLog: async (l) => (inserted.push(l), "id"),
    deleteStatusLog: async () => {},
  };
}

test("runCctvCycle: detektor stub -> ANTRE_PANJANG / NORMAL, sumber rusak terisolasi", async () => {
  const repo = memRepo();
  const many = Array.from({ length: 9 }, (_, i) => det(10 + i * 8, 80));
  const frame = syntheticFrame(100, 100);
  const s = await runCctvCycle({
    cfg, heartbeatMin: 30, repo, spbuList: SPBU, log: silentLogger,
    detector: new StubDetector(many),
    grab: async (src) => { if (src.spbuName === "SPBU C") throw new Error("gagal ambil frame"); return frame; },
    sources: [
      { spbuName: "SPBU A", url: "https://x.invalid/a.jpg", type: "snapshot", capacity: 8 },
      { spbuName: "SPBU B", url: "https://x.invalid/b.jpg", type: "snapshot", capacity: 20 },
      { spbuName: "SPBU C", url: "https://x.invalid/c.jpg", type: "snapshot" },
      { spbuName: "Tidak Ada", url: "https://x.invalid/d.jpg", type: "snapshot" },
    ],
  });
  assert.deepEqual(s, { total: 4, inserted: 2, skipped: 0, failed: 2 });
  assert.equal(repo.inserted[0]!.status, "ANTRE_PANJANG");
  assert.equal(repo.inserted[0]!.source, "CCTV");
  assert.equal(repo.inserted[1]!.status, "NORMAL");
});

test("runCctvCycle: ROI menyaring kendaraan di luar antrean", async () => {
  const repo = memRepo();
  const dets = [...Array.from({ length: 5 }, (_, i) => det(10 + i * 10, 20)), det(50, 90)]; // 5 di atas (luar ROI), 1 di bawah
  await runCctvCycle({
    cfg, heartbeatMin: 30, repo, spbuList: SPBU, log: silentLogger, detector: new StubDetector(dets),
    grab: async () => syntheticFrame(100, 100),
    sources: [{ spbuName: "SPBU A", url: "https://x.invalid/a.jpg", type: "snapshot", capacity: 3, roi: [[0, 0.5], [1, 0.5], [1, 1], [0, 1]] }],
  });
  assert.equal(repo.inserted[0]!.status, "NORMAL"); // hanya 1 kendaraan dalam ROI < 3
});

const hasFfmpeg = await ffmpegAvailable();
test("grabStreamFrame: ffmpeg nyata pada video SINTETIS lokal (bukan CCTV)", { skip: !hasFfmpeg && "ffmpeg tidak terpasang" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "ve-"));
  const file = join(dir, "t.mp4");
  const r = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=160x120:rate=5:duration=1", "-pix_fmt", "yuv420p", file]);
  assert.equal(r.status, 0, String(r.stderr));
  const f = await grabStreamFrame(file, 10000);
  assert.equal(f.width, 160);
  assert.equal(f.height, 120);
  await assert.rejects(grabStreamFrame(join(dir, "tidak-ada.mp4"), 10000), /ffmpeg gagal/);
  await assert.rejects(grabStreamFrame("-i", 1000), /tidak valid/);
  writeFileSync(join(dir, "x"), "");
});

test("grabStreamFrame: ffmpeg tidak ditemukan => pesan jelas", async () => {
  await assert.rejects(grabStreamFrame("rtsp://x.invalid/s", 2000, "/tidak/ada/ffmpeg"), /ffmpeg tidak ditemukan/);
  assert.equal(await ffmpegAvailable("/tidak/ada/ffmpeg"), false);
});
