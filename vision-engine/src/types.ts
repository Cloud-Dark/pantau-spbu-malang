export type Status = "NORMAL" | "ANTRE_PANJANG" | "KOSONG";
export type Source = "CCTV" | "TRAFFIC_API" | "CROWDSOURCE";

export interface Spbu {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

export interface LastLog {
  status: Status;
  createdAt: Date;
}
