// Logika job notifikasi SPBU kritis (dipanggil oleh /api/cron/notify). Server-only.
//
// Aturan:
//  - Kritis = status KOSONG atau ANTRE_PANJANG, confidence >= CRITICAL_MIN_CONFIDENCE (default 70), tidak stale.
//  - State per (SPBU, kanal) di tabel notification_log. Baris kanal 'telegram'/'whatsapp' = pesan
//    terkirim; baris kanal 'system' berstatus NORMAL = penanda pemulihan (SPBU kembali normal).
//  - Kirim bila SPBU kritis DAN (belum pernah dinotifikasi, atau sudah ada penanda pemulihan setelah
//    notifikasi terakhir [transisi menjadi kritis], atau status kritis berubah dari notifikasi terakhir)
//    DAN cooldown (default 60 menit, NOTIFY_COOLDOWN_MINUTES) sejak notifikasi terakhir kanal itu terlewati.
//  - Status sama yang masih berlanjut tidak dikirim ulang. Hanya pengiriman sukses yang dicatat,
//    sehingga kanal yang gagal otomatis dicoba lagi pada run berikutnya.
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { escapeHtml, enabledChannels, sendTelegram, sendWhatsApp, type Channel, type NotifyDeps, type SendResult } from "@/lib/notify";
import { getSpbuWithAggregates } from "@/lib/spbu-status";
import { STATUS_META, type SpbuWithStatus, type SpbuStatus } from "@/lib/spbu";

type Sql = NeonQueryFunction<false, false>;

export const DEFAULT_CRITICAL_MIN_CONFIDENCE = 70;
export const DEFAULT_COOLDOWN_MINUTES = 60;

export function isCritical(s: SpbuWithStatus, minConfidence: number): boolean {
  return (
    !s.stale &&
    (s.status === "KOSONG" || s.status === "ANTRE_PANJANG") &&
    (s.confidence_score ?? 0) >= minConfidence
  );
}

const numEnv = (v: string | undefined, fallback: number, allowZero = false) => {
  if (v === undefined || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && (allowZero ? n >= 0 : n > 0) ? n : fallback;
};

const SOURCE_LABEL: Record<string, string> = { CCTV: "CCTV", TRAFFIC_API: "Lalu lintas", CROWDSOURCE: "Laporan warga" };

export function formatWib(iso: string): string {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return `${parts.replace(/\./g, ":").replace(",", "")} WIB`;
}

export function buildMessage(s: SpbuWithStatus, siteUrl?: string): { text: string; html: string } {
  const label = STATUS_META[s.status as SpbuStatus].label;
  const sources = (s.sources ?? []).map((x) => SOURCE_LABEL[x] ?? x).join(", ") || "-";
  const when = s.updated_at ? formatWib(s.updated_at) : "-";
  const maps = `https://www.google.com/maps?q=${s.lat},${s.lng}`;
  const site = siteUrl?.trim().replace(/\/+$/, "");
  const lines = [
    `${s.name}: ${label.toUpperCase()}`,
    s.address,
    `Keyakinan ${s.confidence_score}% | Sumber: ${sources}`,
    `Diperbarui: ${when}`,
  ];
  const text = [...lines, ...(site ? [`Peta: ${site}`] : []), `Lokasi: ${maps}`].join("\n");
  const links = [
    ...(site ? [`<a href="${escapeHtml(site)}">Buka peta</a>`] : []),
    `<a href="${escapeHtml(maps)}">Lokasi</a>`,
  ].join(" | ");
  const html = [
    `<b>${escapeHtml(s.name)}: ${escapeHtml(label.toUpperCase())}</b>`,
    escapeHtml(s.address),
    `Keyakinan ${s.confidence_score}% | Sumber: ${escapeHtml(sources)}`,
    `Diperbarui: ${escapeHtml(when)}`,
    links,
  ];
  return { text, html: html.join("\n") };
}

type StateRow = { spbu_id: string; channel: string; status: SpbuStatus; sent_at: string };

export type NotifyJobSummary = {
  checkedAt: string;
  channels: Channel[];
  totalSpbu: number;
  critical: number;
  notified: { spbu: string; status: SpbuStatus; channel: Channel }[];
  skipped: { cooldown: number; unchanged: number };
  failed: { spbu: string; channel: Channel; error?: string }[];
  recoveredMarked: number;
};

export type NotifyJobDeps = NotifyDeps & {
  sql: Sql;
  now?: Date;
};

export async function runNotifyJob(deps: NotifyJobDeps): Promise<NotifyJobSummary> {
  const env = deps.env ?? process.env;
  const now = deps.now ?? new Date();
  const minConf = numEnv(env.CRITICAL_MIN_CONFIDENCE, DEFAULT_CRITICAL_MIN_CONFIDENCE);
  const cooldownMs = numEnv(env.NOTIFY_COOLDOWN_MINUTES, DEFAULT_COOLDOWN_MINUTES, true) * 60_000;
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || env.SITE_URL;
  const channels = enabledChannels(env);

  const spbu = await getSpbuWithAggregates(deps.sql, now);
  const summary: NotifyJobSummary = {
    checkedAt: now.toISOString(),
    channels,
    totalSpbu: spbu.length,
    critical: 0,
    notified: [],
    skipped: { cooldown: 0, unchanged: 0 },
    failed: [],
    recoveredMarked: 0,
  };

  const state = (await deps.sql.query(
    `select distinct on (spbu_id, channel) spbu_id, channel, status, sent_at
     from notification_log
     order by spbu_id, channel, sent_at desc`,
  )) as StateRow[];
  const byKey = new Map(state.map((r) => [`${r.spbu_id}|${r.channel}`, r]));

  const sendFn = (c: Channel, m: { text: string; html: string }): Promise<SendResult> =>
    c === "telegram"
      ? sendTelegram(m.html, { html: true, fetchImpl: deps.fetchImpl, env, timeoutMs: deps.timeoutMs })
      : sendWhatsApp(m.text, { fetchImpl: deps.fetchImpl, env, timeoutMs: deps.timeoutMs, extra: { type: "spbu_alert" } });

  for (const s of spbu) {
    if (!isCritical(s, minConf)) {
      // Pemulihan: SPBU segar & NORMAL setelah ada notifikasi -> tandai agar kritis berikutnya dianggap transisi baru.
      if (!s.stale && s.status === "NORMAL") {
        const lastReal = channels
          .map((c) => byKey.get(`${s.id}|${c}`))
          .filter((r): r is StateRow => Boolean(r));
        const marker = byKey.get(`${s.id}|system`);
        const needsMarker = lastReal.some(
          (r) => !marker || Date.parse(marker.sent_at) < Date.parse(r.sent_at),
        );
        if (needsMarker) {
          await deps.sql.query(
            "insert into notification_log (spbu_id, status, confidence, channel, sent_at) values ($1, 'NORMAL', $2, 'system', $3)",
            [s.id, s.confidence_score ?? 0, now.toISOString()],
          );
          byKey.set(`${s.id}|system`, { spbu_id: s.id, channel: "system", status: "NORMAL", sent_at: now.toISOString() });
          summary.recoveredMarked++;
        }
      }
      continue;
    }
    summary.critical++;
    const status = s.status as SpbuStatus;
    const msg = buildMessage(s, siteUrl);

    for (const c of channels) {
      const last = byKey.get(`${s.id}|${c}`);
      const marker = byKey.get(`${s.id}|system`);
      const recovered = Boolean(last && marker && Date.parse(marker.sent_at) > Date.parse(last.sent_at));
      const isTransition = !last || recovered || last.status !== status;
      if (!isTransition) {
        summary.skipped.unchanged++;
        continue;
      }
      if (last && now.getTime() - Date.parse(last.sent_at) < cooldownMs) {
        summary.skipped.cooldown++;
        continue;
      }
      const res = await sendFn(c, msg);
      if (res.status === "sent") {
        await deps.sql.query(
          "insert into notification_log (spbu_id, status, confidence, channel, sent_at) values ($1, $2, $3, $4, $5)",
          [s.id, status, s.confidence_score ?? 0, c, now.toISOString()],
        );
        byKey.set(`${s.id}|${c}`, { spbu_id: s.id, channel: c, status, sent_at: now.toISOString() });
        summary.notified.push({ spbu: s.name, status, channel: c });
      } else if (res.status === "failed") {
        summary.failed.push({ spbu: s.name, channel: c, error: res.error });
      }
    }
  }
  return summary;
}
