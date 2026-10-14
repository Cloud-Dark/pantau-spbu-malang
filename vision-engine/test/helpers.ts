import jpeg from "jpeg-js";
import type { Frame } from "../src/sources/cctv/types.ts";
import type { Db } from "../src/db.ts";
import type { Spbu } from "../src/types.ts";

/** Frame sintetis: latar abu dengan persegi berwarna (meniru "kendaraan"). */
export function syntheticFrame(w: number, h: number, rects: { x: number; y: number; w: number; h: number; rgb: [number, number, number] }[] = []): Frame {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([90, 90, 90, 255], i * 4);
  for (const r of rects)
    for (let y = r.y; y < Math.min(h, r.y + r.h); y++)
      for (let x = r.x; x < Math.min(w, r.x + r.w); x++) data.set([...r.rgb, 255], (y * w + x) * 4);
  return { width: w, height: h, data };
}

export function syntheticJpeg(w = 64, h = 48, rects: Parameters<typeof syntheticFrame>[2] = []): Uint8Array {
  const f = syntheticFrame(w, h, rects);
  return new Uint8Array(jpeg.encode({ width: w, height: h, data: f.data }, 90).data);
}

export const SPBU: Spbu[] = [
  { id: "11111111-1111-1111-1111-111111111111", name: "SPBU A", address: null, lat: -7.93, lng: 112.6 },
  { id: "22222222-2222-2222-2222-222222222222", name: "SPBU B", address: null, lat: -7.95, lng: 112.62 },
  { id: "33333333-3333-3333-3333-333333333333", name: "SPBU C", address: null, lat: -7.97, lng: 112.64 },
];

/** Respons TomTom palsu. */
export function tomtomBody(currentSpeed: number, freeFlowSpeed: number, confidence = 0.9, roadClosure = false) {
  return { flowSegmentData: { currentSpeed, freeFlowSpeed, confidence, roadClosure } };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** DB palsu merekam kueri. */
export function fakeDb(handler: (text: string, params: unknown[]) => Record<string, unknown>[] = () => []): Db & { calls: { text: string; params: unknown[] }[] } {
  const calls: { text: string; params: unknown[] }[] = [];
  return {
    calls,
    async query(text, params = []) {
      calls.push({ text, params });
      return handler(text, params);
    },
  };
}
