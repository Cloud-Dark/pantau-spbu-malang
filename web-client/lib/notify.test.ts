import { test } from "node:test";
import assert from "node:assert/strict";
import { enabledChannels, escapeHtml, sendTelegram, sendWhatsApp } from "./notify";
import { buildMessage, formatWib, isCritical } from "./notify-job";
import type { SpbuWithStatus } from "./spbu";

type Call = { url: string; init: RequestInit };
const mockFetch = (status = 200) => {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response("{}", { status });
  }) as typeof fetch;
  return { fn, calls };
};

test("escapeHtml", () => {
  assert.equal(escapeHtml("<b>&</b>"), "&lt;b&gt;&amp;&lt;/b&gt;");
});

test("kanal nonaktif bila env kosong", async () => {
  const { fn, calls } = mockFetch();
  assert.deepEqual(enabledChannels({}), []);
  assert.equal((await sendTelegram("x", { env: {}, fetchImpl: fn })).status, "disabled");
  assert.equal((await sendWhatsApp("x", { env: {}, fetchImpl: fn })).status, "disabled");
  assert.equal(calls.length, 0);
});

test("sendTelegram: payload HTML ter-escape", async () => {
  const { fn, calls } = mockFetch();
  const env = { TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_CHAT_ID: "-100" };
  const r = await sendTelegram("SPBU <A&B>", { env, fetchImpl: fn });
  assert.equal(r.status, "sent");
  assert.equal(calls[0].url, "https://api.telegram.org/bot123:abc/sendMessage");
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.parse_mode, "HTML");
  assert.equal(body.chat_id, "-100");
  assert.equal(body.text, "SPBU &lt;A&amp;B&gt;");
});

test("sendTelegram: gagal tidak melempar dan tidak membocorkan token", async () => {
  const env = { TELEGRAM_BOT_TOKEN: "123:secret", TELEGRAM_CHAT_ID: "1" };
  const bad = mockFetch(500);
  const r1 = await sendTelegram("x", { env, fetchImpl: bad.fn });
  assert.deepEqual(r1, { channel: "telegram", status: "failed", error: "HTTP 500" });
  const boom = (async () => {
    throw new Error("koneksi ke https://api.telegram.org/bot123:secret gagal");
  }) as typeof fetch;
  const r2 = await sendTelegram("x", { env, fetchImpl: boom });
  assert.equal(r2.status, "failed");
  assert.ok(!JSON.stringify(r2).includes("secret"));
});

test("sendWhatsApp: payload & Bearer opsional", async () => {
  const a = mockFetch();
  await sendWhatsApp("halo", { env: { WHATSAPP_WEBHOOK_URL: "https://hook.test/x" }, fetchImpl: a.fn });
  assert.equal(JSON.parse(String(a.calls[0].init.body)).text, "halo");
  assert.equal((a.calls[0].init.headers as Record<string, string>).Authorization, undefined);
  const b = mockFetch();
  await sendWhatsApp("halo", {
    env: { WHATSAPP_WEBHOOK_URL: "https://hook.test/x", WHATSAPP_WEBHOOK_TOKEN: "tok" },
    fetchImpl: b.fn,
  });
  assert.equal((b.calls[0].init.headers as Record<string, string>).Authorization, "Bearer tok");
});

const base: SpbuWithStatus = {
  id: "1", name: "SPBU <Soekarno> & Hatta", address: "Jl. Contoh", lat: -7.97, lng: 112.63,
  status: "KOSONG", source: "CCTV", confidence_score: 80, updated_at: "2026-10-14T05:00:00.000Z",
  sources: ["CCTV", "CROWDSOURCE"], stale: false,
};

test("isCritical: ambang, status, stale", () => {
  assert.equal(isCritical(base, 70), true);
  assert.equal(isCritical({ ...base, confidence_score: 69 }, 70), false);
  assert.equal(isCritical({ ...base, status: "NORMAL" }, 70), false);
  assert.equal(isCritical({ ...base, stale: true }, 70), false);
  assert.equal(isCritical({ ...base, status: "ANTRE_PANJANG" }, 70), true);
});

test("buildMessage: WIB, tautan peta, escape HTML", () => {
  assert.equal(formatWib("2026-10-14T05:00:00.000Z"), "14 Okt 2026 12:00 WIB");
  const m = buildMessage(base, "https://pantau.example/");
  assert.match(m.text, /Peta: https:\/\/pantau\.example$/m);
  assert.match(m.text, /12:00 WIB/);
  assert.match(m.html, /SPBU &lt;Soekarno&gt; &amp; Hatta/);
  assert.match(m.html, /<a href="https:\/\/pantau\.example">Buka peta<\/a>/);
  assert.doesNotMatch(buildMessage(base).text, /Peta:/);
});
