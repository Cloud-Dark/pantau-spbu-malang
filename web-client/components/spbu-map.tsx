"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { STATUS_META, type SpbuWithStatus } from "@/lib/spbu";

const MALANG: [number, number] = [-7.9666, 112.6326];
const POLL_MS = 10_000; // ADR-006: polling pada Phase 1

export default function SpbuMap() {
  const [items, setItems] = useState<SpbuWithStatus[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/spbu", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SpbuWithStatus[];
        if (active) {
          setItems(data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={MALANG} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map((s) => {
          const meta = STATUS_META[s.status ?? "UNKNOWN"];
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={11}
              pathOptions={{ color: "#fff", weight: 2, fillColor: meta.color, fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>{s.name}</strong>
                <br />
                {s.address}
                <br />
                Status: <b style={{ color: meta.color }}>{meta.label}</b>
                {s.updated_at && (
                  <>
                    <br />
                    Sumber: {s.source} · keyakinan {s.confidence_score}
                    <br />
                    Diperbarui: {new Date(s.updated_at).toLocaleString("id-ID")}
                  </>
                )}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-lg bg-white/95 p-3 text-xs text-zinc-900 shadow">
        {Object.entries(STATUS_META).map(([k, m]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: m.color }} />
            {m.label}
          </div>
        ))}
      </div>
      {error && (
        <div role="alert" className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded bg-red-600 px-3 py-1 text-sm text-white">
          Gagal memuat data SPBU. Mencoba lagi…
        </div>
      )}
    </div>
  );
}
