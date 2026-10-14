import { spawn } from "node:child_process";
import jpeg from "jpeg-js";
import type { Frame } from "./types.ts";

export type FetchFn = typeof fetch;

export function decodeJpeg(buf: Uint8Array): Frame {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("data bukan JPEG");
  const img = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256 });
  return { width: img.width, height: img.height, data: img.data };
}

/** Ambil satu frame dari snapshot JPEG via HTTP(S). */
export async function grabSnapshot(url: string, timeoutMs: number, fetchImpl: FetchFn = fetch): Promise<Frame> {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
  return decodeJpeg(new Uint8Array(await res.arrayBuffer()));
}

/** Cek ketersediaan ffmpeg (menjalankan `ffmpeg -version`). */
export function ffmpegAvailable(ffmpegPath = "ffmpeg"): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn(ffmpegPath, ["-version"], { stdio: "ignore" });
    p.once("error", () => resolve(false));
    p.once("exit", (code) => resolve(code === 0));
  });
}

/** Ambil satu frame dari HLS/RTSP (atau berkas) lewat ffmpeg -> JPEG di stdout. Tanpa shell. */
export function grabStreamFrame(url: string, timeoutMs: number, ffmpegPath = "ffmpeg"): Promise<Frame> {
  if (url.startsWith("-")) return Promise.reject(new Error("url tidak valid"));
  const args = ["-hide_banner", "-loglevel", "error", "-nostdin"];
  if (url.startsWith("rtsp")) args.push("-rtsp_transport", "tcp");
  args.push("-i", url, "-frames:v", "1", "-f", "image2pipe", "-c:v", "mjpeg", "-q:v", "3", "pipe:1");

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let stderr = "";
    let settled = false;
    const p = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      p.kill("SIGKILL");
      finish(() => reject(new Error(`ffmpeg timeout ${timeoutMs}ms`)));
    }, timeoutMs);
    p.stdout.on("data", (c: Buffer) => chunks.push(c));
    p.stderr.on("data", (c: Buffer) => {
      if (stderr.length < 500) stderr += c.toString();
    });
    p.once("error", (e: NodeJS.ErrnoException) =>
      finish(() => reject(new Error(e.code === "ENOENT" ? `ffmpeg tidak ditemukan (${ffmpegPath})` : `ffmpeg error: ${e.message}`))),
    );
    p.once("close", (code) =>
      finish(() => {
        if (code !== 0 || chunks.length === 0) {
          // stderr dipotong dan URL tidak disertakan agar kredensial tidak bocor
          return reject(new Error(`ffmpeg gagal (kode ${code}): ${stderr.replaceAll(url, "<url>").trim().slice(0, 200)}`));
        }
        try {
          resolve(decodeJpeg(Buffer.concat(chunks)));
        } catch (e) {
          reject(e);
        }
      }),
    );
  });
}
