import test from "node:test";
import assert from "node:assert/strict";
import { iou, nms, postprocess, preprocess } from "../src/sources/cctv/yolo-post.ts";
import { OnnxYoloDetector, DetectorUnavailable, type OrtModuleLike } from "../src/sources/cctv/onnx-detector.ts";
import { syntheticFrame } from "./helpers.ts";

const NC = 80;
/** Bangun tensor [1,84,N] channel-first dari daftar anchor. */
function tensorCF(anchors: { cx: number; cy: number; w: number; h: number; cls: number; score: number }[], N = 8400) {
  const out = new Float32Array((4 + NC) * N);
  anchors.forEach((a, i) => {
    out[0 * N + i] = a.cx; out[1 * N + i] = a.cy; out[2 * N + i] = a.w; out[3 * N + i] = a.h;
    out[(4 + a.cls) * N + i] = a.score;
  });
  return { out, dims: [1, 4 + NC, N] };
}
const lb = { size: 640, scale: 1, padX: 0, padY: 0 };
const base = { scoreThreshold: 0.35, iouThreshold: 0.5, lb, imgWidth: 640, imgHeight: 640 };

test("postprocess: ambil kendaraan, buang kelas lain & skor rendah", () => {
  const { out, dims } = tensorCF([
    { cx: 100, cy: 100, w: 50, h: 40, cls: 2, score: 0.9 }, // car
    { cx: 300, cy: 300, w: 30, h: 60, cls: 3, score: 0.8 }, // motorcycle
    { cx: 500, cy: 500, w: 40, h: 40, cls: 0, score: 0.95 }, // person: dibuang
    { cx: 200, cy: 400, w: 40, h: 40, cls: 7, score: 0.2 }, // truck skor rendah
  ]);
  const d = postprocess(out, dims, base);
  assert.deepEqual(d.map((x) => x.label).sort(), ["car", "motorcycle"]);
  const car = d.find((x) => x.label === "car")!;
  assert.deepEqual([car.box.x1, car.box.y1, car.box.x2, car.box.y2].map(Math.round), [75, 80, 125, 120]);
});

test("postprocess: NMS menekan duplikat tumpang tindih, kelas beda dipertahankan", () => {
  const { out, dims } = tensorCF([
    { cx: 100, cy: 100, w: 50, h: 50, cls: 2, score: 0.9 },
    { cx: 104, cy: 102, w: 50, h: 50, cls: 2, score: 0.7 }, // duplikat car
    { cx: 600, cy: 100, w: 50, h: 50, cls: 2, score: 0.6 }, // car lain, jauh
  ]);
  const d = postprocess(out, dims, base);
  assert.equal(d.length, 2);
  assert.equal(d[0]!.score.toFixed(1), "0.9");
  const a = { x1: 0, y1: 0, x2: 10, y2: 10 };
  assert.equal(iou(a, a), 1);
  assert.equal(iou(a, { x1: 20, y1: 20, x2: 30, y2: 30 }), 0);
  const two = nms([
    { label: "car", score: 0.9, box: a },
    { label: "bus", score: 0.8, box: a },
  ], 0.5);
  assert.equal(two.length, 2);
});

test("postprocess: tata letak [1,N,84] dan unletterbox", () => {
  // frame 1280x720 -> scale .5, pad y = (640-360)/2 = 140
  const f = syntheticFrame(1280, 720);
  const { lb: l } = preprocess(f, 640);
  assert.equal(l.scale, 0.5);
  assert.equal(l.padY, 140);
  const N = 100, C = 84; // heuristik tata letak: dimensi lebih kecil = kanal
  const out = new Float32Array(N * C);
  out.set([320, 320, 100, 60], 0); // pusat letterbox
  out[4 + 2] = 0.9;
  const d = postprocess(out, [1, N, C], { ...base, lb: l, imgWidth: 1280, imgHeight: 720 });
  assert.equal(d.length, 1);
  // pusat (320,320) -> x=640, y=(320-140)/.5=360; lebar 200, tinggi 120
  const b = d[0]!.box;
  assert.deepEqual([b.x1, b.y1, b.x2, b.y2].map(Math.round), [540, 300, 740, 420]);
});

test("postprocess: bentuk tak valid => error", () => {
  assert.throws(() => postprocess(new Float32Array(4), [1, 2], base));
  assert.throws(() => postprocess(new Float32Array(4), [1, 2, 2], base));
});

test("preprocess: tensor NCHW 0..1, letterbox abu", () => {
  const f = syntheticFrame(4, 2, [{ x: 0, y: 0, w: 4, h: 2, rgb: [255, 0, 0] }]);
  const { tensor, lb: l } = preprocess(f, 8);
  assert.equal(tensor.length, 3 * 64);
  assert.equal(l.padX, 0);
  assert.equal(l.padY, 2);
  assert.equal(tensor[0], Math.fround(114 / 255)); // pojok = padding
  const mid = (2 + 1) * 8 + 3;
  assert.equal(tensor[mid], 1); // R
  assert.equal(tensor[64 + mid], 0); // G
});

test("OnnxYoloDetector: fail-soft bila model/modul tak ada", async () => {
  await assert.rejects(OnnxYoloDetector.create({ modelPath: "/tidak/ada.onnx", scoreThreshold: 0.3, iouThreshold: 0.5 }), (e: unknown) => e instanceof DetectorUnavailable && /YOLO_MODEL_PATH/.test((e as Error).message));
  await assert.rejects(
    OnnxYoloDetector.create({ modelPath: import.meta.filename, scoreThreshold: 0.3, iouThreshold: 0.5, loadOrt: async () => { throw new Error("Cannot find package"); } }),
    (e: unknown) => e instanceof DetectorUnavailable && /onnxruntime-node/.test((e as Error).message),
  );
});

test("OnnxYoloDetector: alur penuh dengan sesi ORT palsu (BUKAN model sungguhan)", async () => {
  const { out, dims } = tensorCF([{ cx: 320, cy: 320, w: 100, h: 100, cls: 5, score: 0.88 }]);
  let fedDims: number[] = [];
  const ort: OrtModuleLike = {
    Tensor: class { constructor(public type: string, public data: Float32Array, public dims: number[]) { fedDims = dims; } } as never,
    InferenceSession: { create: async () => ({ inputNames: ["images"], outputNames: ["output0"], run: async (feeds) => { assert.ok("images" in feeds); return { output0: { data: out, dims } }; } }) },
  };
  const det = await OnnxYoloDetector.create({ modelPath: import.meta.filename, scoreThreshold: 0.3, iouThreshold: 0.5, loadOrt: async () => ort });
  const res = await det.detect(syntheticFrame(640, 640));
  assert.deepEqual(fedDims, [1, 3, 640, 640]);
  assert.equal(res.length, 1);
  assert.equal(res[0]!.label, "bus");
});
