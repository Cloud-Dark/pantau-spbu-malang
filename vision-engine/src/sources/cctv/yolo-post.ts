import type { Detection, Frame, VehicleLabel } from "./types.ts";

/** Indeks kelas COCO yang dihitung sebagai kendaraan. */
export const VEHICLE_CLASSES: Record<number, VehicleLabel> = { 2: "car", 3: "motorcycle", 5: "bus", 7: "truck" };

export interface Letterbox {
  size: number;
  scale: number;
  padX: number;
  padY: number;
}

/** Letterbox RGBA -> tensor float32 NCHW [1,3,size,size] ternormalisasi 0..1 (nearest-neighbour, isi abu 114). */
export function preprocess(frame: Frame, size = 640): { tensor: Float32Array; lb: Letterbox } {
  const scale = Math.min(size / frame.width, size / frame.height);
  const nw = Math.max(1, Math.round(frame.width * scale));
  const nh = Math.max(1, Math.round(frame.height * scale));
  const padX = Math.floor((size - nw) / 2);
  const padY = Math.floor((size - nh) / 2);
  const plane = size * size;
  const tensor = new Float32Array(3 * plane).fill(114 / 255);
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(frame.height - 1, Math.floor(y / scale));
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(frame.width - 1, Math.floor(x / scale));
      const si = (sy * frame.width + sx) * 4;
      const di = (y + padY) * size + (x + padX);
      tensor[di] = frame.data[si]! / 255;
      tensor[plane + di] = frame.data[si + 1]! / 255;
      tensor[2 * plane + di] = frame.data[si + 2]! / 255;
    }
  }
  return { tensor, lb: { size, scale, padX, padY } };
}

export function iou(a: Detection["box"], b: Detection["box"]): number {
  const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = ix * iy;
  const union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return union <= 0 ? 0 : inter / union;
}

/** NMS greedy per kelas. */
export function nms(dets: Detection[], iouThr: number): Detection[] {
  const sorted = [...dets].sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const d of sorted) {
    if (!kept.some((k) => k.label === d.label && iou(k.box, d.box) > iouThr)) kept.push(d);
  }
  return kept;
}

export interface PostOptions {
  scoreThreshold: number;
  iouThreshold: number;
  lb: Letterbox;
  imgWidth: number;
  imgHeight: number;
}

/**
 * Pasca-proses keluaran YOLOv8 (tanpa objectness): dims [1,4+nc,N] (umum) atau [1,N,4+nc].
 * Tata letak ditebak dari dimensi: dimensi lebih kecil = jumlah kanal (N anchor YOLO nyata = 8400 >> 84).
 * Baris 0-3 = cx,cy,w,h dalam piksel input letterbox. Hanya kelas kendaraan yang dikembalikan
 * (kelas terbaik per anchor harus kendaraan dan skor >= ambang), lalu NMS dan unletterbox.
 */
export function postprocess(output: ArrayLike<number>, dims: readonly number[], o: PostOptions): Detection[] {
  if (dims.length !== 3 || dims[0] !== 1) throw new Error(`bentuk keluaran tak didukung: [${dims.join(",")}]`);
  const channelFirst = dims[1]! < dims[2]!;
  const C = channelFirst ? dims[1]! : dims[2]!;
  const N = channelFirst ? dims[2]! : dims[1]!;
  if (C < 5) throw new Error(`jumlah kanal keluaran tak valid: ${C}`);
  const at = (c: number, i: number) => (channelFirst ? output[c * N + i]! : output[i * C + c]!);

  const raw: Detection[] = [];
  for (let i = 0; i < N; i++) {
    let best = -1;
    let bestScore = 0;
    for (let c = 4; c < C; c++) {
      const s = at(c, i);
      if (s > bestScore) {
        bestScore = s;
        best = c - 4;
      }
    }
    const label = VEHICLE_CLASSES[best];
    if (!label || bestScore < o.scoreThreshold) continue;
    const cx = at(0, i), cy = at(1, i), w = at(2, i), h = at(3, i);
    const un = (v: number, pad: number, max: number) => Math.min(max, Math.max(0, (v - pad) / o.lb.scale));
    raw.push({
      label,
      score: bestScore,
      box: {
        x1: un(cx - w / 2, o.lb.padX, o.imgWidth),
        y1: un(cy - h / 2, o.lb.padY, o.imgHeight),
        x2: un(cx + w / 2, o.lb.padX, o.imgWidth),
        y2: un(cy + h / 2, o.lb.padY, o.imgHeight),
      },
    });
  }
  return nms(raw, o.iouThreshold);
}
