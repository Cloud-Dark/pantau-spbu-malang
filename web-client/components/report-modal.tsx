"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { STATUS_META, type SpbuStatus } from "@/lib/spbu";

const OPTIONS: SpbuStatus[] = ["NORMAL", "ANTRE_PANJANG", "KOSONG"];
const GEO_TIMEOUT_MS = 15_000;

type Props = {
  spbu: { id: string; name: string };
  onClose: () => void;
  /** Dipanggil setelah laporan berhasil agar peta memuat ulang data. */
  onSuccess: () => void;
};

type Result =
  | { kind: "success"; distance: number }
  | { kind: "rejected"; message: string; distance?: number }
  | { kind: "error"; message: string };

function geoErrorMessage(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED)
    return "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan peramban, lalu coba lagi.";
  if (err.code === err.POSITION_UNAVAILABLE) return "Lokasi tidak tersedia. Pastikan GPS aktif lalu coba lagi.";
  if (err.code === err.TIMEOUT) return "Waktu habis saat mencari lokasi. Pindah ke area terbuka lalu coba lagi.";
  return "Gagal mendapatkan lokasi Anda.";
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: GEO_TIMEOUT_MS,
      maximumAge: 0,
    });
  });
}

export default function ReportModal({ spbu, onClose, onSuccess }: Props) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SpbuStatus | null>(null);
  const [phase, setPhase] = useState<"idle" | "locating" | "sending">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const busy = phase !== "idle";

  // Fokus awal, kembalikan fokus saat tutup, kunci scroll latar.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => previous?.focus?.();
  }, []);

  // Tombol yang dinonaktifkan membuat fokus hilang ke body; kembalikan ke dialog
  // supaya ESC dan jebakan fokus tetap bekerja.
  useEffect(() => {
    if (!dialogRef.current) return;
    if (!dialogRef.current.contains(document.activeElement)) {
      const target = dialogRef.current.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled])");
      (target ?? dialogRef.current).focus();
    }
  }, [phase, result]);

  // ESC menutup dialog (tidak saat sedang mengirim).
  useEffect(() => {
    if (busy) return;
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, [busy, onClose]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

  async function submit() {
    if (!status || busy) return;
    setResult(null);
    setPhase("locating");
    let pos: GeolocationPosition;
    try {
      pos = await getPosition();
    } catch (e) {
      setPhase("idle");
      setResult({
        kind: "error",
        message:
          e instanceof Error && e.message === "unsupported"
            ? "Peramban Anda tidak mendukung geolokasi, sehingga laporan tidak dapat diverifikasi."
            : geoErrorMessage(e as GeolocationPositionError),
      });
      return;
    }
    setPhase("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spbuId: spbu.id,
          status,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        distance_m?: number;
      } | null;
      if (res.ok && data?.ok) {
        setResult({ kind: "success", distance: data.distance_m ?? 0 });
        onSuccess();
      } else if (res.status === 403 || res.status === 422 || res.status === 429) {
        setResult({ kind: "rejected", message: data?.error ?? "Laporan ditolak.", distance: data?.distance_m });
      } else {
        setResult({ kind: "error", message: data?.error ?? "Gagal mengirim laporan. Coba lagi." });
      }
    } catch {
      setResult({ kind: "error", message: "Tidak dapat terhubung ke server. Periksa koneksi Anda." });
    } finally {
      setPhase("idle");
    }
  }

  const success = result?.kind === "success" ? result : null;
  const done = success !== null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="max-h-dvh outline-none w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-zinc-900 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          Laporkan status SPBU
        </h2>
        <p id={descId} className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {spbu.name}
        </p>

        {success ? (
          <div role="status" className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
            <p className="font-semibold">Terima kasih! Laporan Anda terkirim.</p>
            <p className="mt-1">Jarak terverifikasi {success.distance} m dari SPBU. Peta diperbarui.</p>
          </div>
        ) : (
          <>
            <fieldset className="mt-4" disabled={busy}>
              <legend className="mb-2 text-sm font-medium">Kondisi saat ini</legend>
              <div className="grid gap-2">
                {OPTIONS.map((o) => {
                  const meta = STATUS_META[o];
                  const checked = status === o;
                  return (
                    <label
                      key={o}
                      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-base font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2"
                      style={{ borderColor: checked ? meta.color : "#d4d4d8", background: checked ? `${meta.color}1a` : undefined }}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={o}
                        checked={checked}
                        onChange={() => setStatus(o)}
                        className="h-5 w-5"
                        style={{ accentColor: meta.color }}
                      />
                      <span aria-hidden className="h-4 w-4 shrink-0 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {result && result.kind !== "success" && (
              <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
                <p className="font-semibold">{result.kind === "rejected" ? "Laporan ditolak" : "Terjadi masalah"}</p>
                <p className="mt-1">{result.message}</p>
                {result.kind === "rejected" && result.distance !== undefined && (
                  <p className="mt-1">Jarak Anda dari SPBU: {result.distance} m.</p>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
              Privasi: lokasi Anda hanya dipakai sesaat untuk memverifikasi bahwa Anda berada dalam radius 100 m dari SPBU.
              Koordinat Anda tidak disimpan.
            </p>
          </>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-12 flex-1 rounded-xl border border-zinc-300 px-4 text-base font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            {done ? "Tutup" : "Batal"}
          </button>
          {!done && (
            <button
              type="button"
              onClick={submit}
              disabled={!status || busy}
              aria-busy={busy}
              className="min-h-12 flex-1 rounded-xl bg-blue-700 px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "locating" ? "Mencari lokasi…" : phase === "sending" ? "Mengirim…" : "Kirim laporan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
