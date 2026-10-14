export interface Frame {
  width: number;
  height: number;
  /** RGBA, panjang = width*height*4 */
  data: Uint8Array;
}

export type VehicleLabel = "car" | "motorcycle" | "bus" | "truck";

export interface Detection {
  label: VehicleLabel;
  score: number;
  /** piksel pada frame asli */
  box: { x1: number; y1: number; x2: number; y2: number };
}

export interface Detector {
  readonly name: string;
  detect(frame: Frame): Promise<Detection[]>;
}

export interface CctvSource {
  spbuId?: string;
  spbuName?: string;
  url: string;
  type: "snapshot" | "stream";
  /** Poligon ROI, koordinat ternormalisasi 0..1 (x,y) */
  roi?: [number, number][];
  /** Jumlah kendaraan dalam ROI yang dianggap antrean panjang */
  capacity?: number;
}
