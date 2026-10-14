import { createHash, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { runNotifyJob } from "@/lib/notify-job";

// Dilindungi Authorization: Bearer CRON_SECRET (Vercel Cron mengirimnya otomatis bila env CRON_SECRET diset).
// Tidak diset / tidak cocok -> 401. Perbandingan timing-safe (hash SHA-256 agar panjang sama).
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return false;
  const a = createHash("sha256").update(m[1].trim()).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const summary = await runNotifyJob({ sql: getSql() });
    return Response.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("cron/notify gagal", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "Gagal menjalankan job notifikasi" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = handle;
export const POST = handle;
