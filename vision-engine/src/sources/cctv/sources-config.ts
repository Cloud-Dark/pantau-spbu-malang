import { readFileSync } from "node:fs";
import type { CctvSource } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedSources {
  sources: CctvSource[];
  problems: string[];
}

/** Validasi manual isi cctv-sources.json. Entri tak valid dilaporkan di problems dan dilewati. */
export function parseCctvSources(json: unknown): ParsedSources {
  const problems: string[] = [];
  const sources: CctvSource[] = [];
  const list = (json as { sources?: unknown } | null)?.sources;
  if (!Array.isArray(list)) return { sources, problems: ['berkas harus berbentuk {"sources": [...]}'] };

  list.forEach((raw, i) => {
    const tag = `sources[${i}]`;
    const o = raw as Record<string, unknown>;
    if (!o || typeof o !== "object") return void problems.push(`${tag}: bukan objek`);
    const bad = (m: string) => void problems.push(`${tag}: ${m}`);

    const spbuId = typeof o.spbuId === "string" ? o.spbuId : undefined;
    const spbuName = typeof o.spbuName === "string" ? o.spbuName : undefined;
    if (!spbuId && !spbuName) return bad("wajib spbuId atau spbuName");
    if (spbuId && !UUID.test(spbuId)) return bad("spbuId bukan UUID");

    if (typeof o.url !== "string") return bad("url wajib string");
    let u: URL;
    try {
      u = new URL(o.url);
    } catch {
      return bad("url tidak valid");
    }
    if (!["http:", "https:", "rtsp:", "rtsps:"].includes(u.protocol)) return bad(`protokol ${u.protocol} tidak diizinkan`);

    // tebakan: .jpg/.jpeg = snapshot, selain itu stream (HLS .m3u8 / RTSP)
    const guessed = /\.(jpe?g)(\?|$)/i.test(u.pathname + u.search) ? "snapshot" : "stream";
    const type = o.type === undefined ? guessed : o.type;
    if (type !== "snapshot" && type !== "stream") return bad('type harus "snapshot" atau "stream"');

    let roi: [number, number][] | undefined;
    if (o.roi !== undefined) {
      const r = o.roi;
      const ok =
        Array.isArray(r) &&
        r.length >= 3 &&
        r.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && n >= 0 && n <= 1));
      if (!ok) return bad("roi harus array >=3 titik [x,y] ternormalisasi 0..1");
      roi = r as [number, number][];
    }

    let capacity: number | undefined;
    if (o.capacity !== undefined) {
      if (typeof o.capacity !== "number" || !Number.isInteger(o.capacity) || o.capacity < 1) return bad("capacity harus bilangan bulat >= 1");
      capacity = o.capacity;
    }
    sources.push({ spbuId, spbuName, url: o.url, type, roi, capacity });
  });
  return { sources, problems };
}

/** Membaca berkas; null bila berkas tidak ada (CCTV opsional). */
export function loadCctvSources(file: string): ParsedSources | null {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  try {
    return parseCctvSources(JSON.parse(text));
  } catch {
    return { sources: [], problems: [`${file}: bukan JSON valid`] };
  }
}

/** Redaksi kredensial/query pada URL untuk log. */
export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return "<url-tidak-valid>";
  }
}
