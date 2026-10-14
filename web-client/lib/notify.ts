// Pengirim notifikasi Telegram & WhatsApp (webhook generik). Server-only.
// - Env kosong => kanal nonaktif (status "disabled"), bukan error.
// - Tidak pernah melempar: kegagalan dikembalikan sebagai {status:"failed"} tanpa membocorkan token.
// - `fetchImpl` dan `env` dapat diinjeksi untuk pengujian (tanpa mengirim pesan nyata).

export type Channel = "telegram" | "whatsapp";
export type SendResult = { channel: Channel; status: "sent" | "disabled" | "failed"; error?: string };

export type NotifyDeps = {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 8000;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const clean = (v: string | undefined) => (v ?? "").trim();

export function telegramEnabled(env: NotifyDeps["env"] = process.env): boolean {
  return Boolean(clean(env?.TELEGRAM_BOT_TOKEN) && clean(env?.TELEGRAM_CHAT_ID));
}

export function whatsappEnabled(env: NotifyDeps["env"] = process.env): boolean {
  return Boolean(clean(env?.WHATSAPP_WEBHOOK_URL));
}

export function enabledChannels(env: NotifyDeps["env"] = process.env): Channel[] {
  const out: Channel[] = [];
  if (telegramEnabled(env)) out.push("telegram");
  if (whatsappEnabled(env)) out.push("whatsapp");
  return out;
}

const describeError = (e: unknown) => (e instanceof Error ? e.name : "error");

/**
 * Kirim ke Telegram Bot API (sendMessage, parse_mode HTML).
 * Secara default `text` dianggap teks biasa dan di-escape; beri `{ html: true }` bila
 * pemanggil sudah menyusun markup HTML aman (tag <b>, <a>, dst.) dan meng-escape sendiri isinya.
 */
export async function sendTelegram(
  text: string,
  opts: NotifyDeps & { html?: boolean } = {},
): Promise<SendResult> {
  const env = opts.env ?? process.env;
  const token = clean(env.TELEGRAM_BOT_TOKEN);
  const chatId = clean(env.TELEGRAM_CHAT_ID);
  if (!token || !chatId) return { channel: "telegram", status: "disabled" };
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: opts.html ? text : escapeHtml(text),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return { channel: "telegram", status: "failed", error: `HTTP ${res.status}` };
    return { channel: "telegram", status: "sent" };
  } catch (e) {
    return { channel: "telegram", status: "failed", error: describeError(e) };
  }
}

/**
 * Kirim ke webhook WhatsApp generik: POST JSON {text, source, ...extra}.
 * Authorization: Bearer WHATSAPP_WEBHOOK_TOKEN bila token diisi. Provider-agnostik: arahkan ke
 * gateway/otomasi apa pun (mis. n8n, Make, atau adaptor WhatsApp Business API) yang menerima field `text`.
 */
export async function sendWhatsApp(
  text: string,
  opts: NotifyDeps & { extra?: Record<string, unknown> } = {},
): Promise<SendResult> {
  const env = opts.env ?? process.env;
  const url = clean(env.WHATSAPP_WEBHOOK_URL);
  if (!url) return { channel: "whatsapp", status: "disabled" };
  const token = clean(env.WHATSAPP_WEBHOOK_TOKEN);
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, source: "pantau-spbu-malang", ...opts.extra }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return { channel: "whatsapp", status: "failed", error: `HTTP ${res.status}` };
    return { channel: "whatsapp", status: "sent" };
  } catch (e) {
    return { channel: "whatsapp", status: "failed", error: describeError(e) };
  }
}
