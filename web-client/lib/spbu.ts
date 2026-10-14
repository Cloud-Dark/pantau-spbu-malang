export type SpbuStatus = "NORMAL" | "ANTRE_PANJANG" | "KOSONG";
export type StatusSource = "CCTV" | "TRAFFIC_API" | "CROWDSOURCE";

export type SpbuWithStatus = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: SpbuStatus | null;
  source: StatusSource | null;
  confidence_score: number | null;
  updated_at: string | null;
  // Field agregat (Fase 4); opsional agar konsumen lama tetap valid.
  sources?: StatusSource[];
  stale?: boolean;
  sample_count?: number;
  last_seen_at?: string | null;
};

export const STATUS_META: Record<SpbuStatus | "UNKNOWN", { label: string; color: string }> = {
  NORMAL: { label: "Normal", color: "#16a34a" },
  ANTRE_PANJANG: { label: "Antre panjang", color: "#f59e0b" },
  KOSONG: { label: "Kosong", color: "#dc2626" },
  UNKNOWN: { label: "Belum ada data", color: "#6b7280" },
};
