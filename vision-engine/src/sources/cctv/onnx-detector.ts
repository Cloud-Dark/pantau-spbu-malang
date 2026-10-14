import { existsSync } from "node:fs";
import type { Detection, Detector, Frame } from "./types.ts";
import { postprocess, preprocess } from "./yolo-post.ts";

/** Subset minimal API onnxruntime-node yang dipakai (agar modul opsional tanpa tipe). */
export interface OrtTensorLike {
  data: ArrayLike<number>;
  dims: readonly number[];
}
export interface OrtSessionLike {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensorLike>>;
}
export interface OrtModuleLike {
  InferenceSession: { create(path: string): Promise<OrtSessionLike> };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
}

export interface OnnxDetectorOptions {
  modelPath: string;
  scoreThreshold: number;
  iouThreshold: number;
  inputSize?: number;
  /** Injeksi untuk uji; default: import dinamis onnxruntime-node */
  loadOrt?: () => Promise<OrtModuleLike>;
}

// Spesifier lewat variabel: modul bersifat opsional dan tidak ada tipenya saat kompilasi.
const ORT_MODULE = "onnxruntime-node";
const defaultLoadOrt = () => import(ORT_MODULE) as Promise<OrtModuleLike>;

export class DetectorUnavailable extends Error {}

/** Detektor YOLOv8 ONNX (COCO). Fail-soft: create() melempar DetectorUnavailable berpesan jelas. */
export class OnnxYoloDetector implements Detector {
  readonly name = "onnx-yolov8";
  private constructor(
    private readonly ort: OrtModuleLike,
    private readonly session: OrtSessionLike,
    private readonly opt: OnnxDetectorOptions,
  ) {}

  static async create(opt: OnnxDetectorOptions): Promise<OnnxYoloDetector> {
    if (!existsSync(opt.modelPath)) {
      throw new DetectorUnavailable(`berkas model YOLO tidak ditemukan: ${opt.modelPath} (atur YOLO_MODEL_PATH)`);
    }
    let ort: OrtModuleLike;
    try {
      ort = await (opt.loadOrt ?? defaultLoadOrt)();
    } catch (e) {
      throw new DetectorUnavailable(
        `modul onnxruntime-node tidak tersedia (npm install onnxruntime-node): ${e instanceof Error ? e.message.split("\n")[0] : e}`,
      );
    }
    try {
      return new OnnxYoloDetector(ort, await ort.InferenceSession.create(opt.modelPath), opt);
    } catch (e) {
      throw new DetectorUnavailable(`gagal memuat model ONNX: ${e instanceof Error ? e.message : e}`);
    }
  }

  async detect(frame: Frame): Promise<Detection[]> {
    const size = this.opt.inputSize ?? 640;
    const { tensor, lb } = preprocess(frame, size);
    const input = new this.ort.Tensor("float32", tensor, [1, 3, size, size]);
    const out = await this.session.run({ [this.session.inputNames[0]!]: input });
    const first = out[this.session.outputNames[0]!];
    if (!first) throw new Error("model tidak menghasilkan keluaran");
    return postprocess(first.data, first.dims, {
      scoreThreshold: this.opt.scoreThreshold,
      iouThreshold: this.opt.iouThreshold,
      lb,
      imgWidth: frame.width,
      imgHeight: frame.height,
    });
  }
}
