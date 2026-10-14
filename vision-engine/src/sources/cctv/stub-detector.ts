import type { Detection, Detector, Frame } from "./types.ts";

/** Detektor palsu untuk uji: mengembalikan deteksi yang ditentukan (statis atau fungsi). */
export class StubDetector implements Detector {
  readonly name = "stub";
  constructor(private readonly provider: Detection[] | ((f: Frame) => Detection[]) = []) {}
  async detect(frame: Frame): Promise<Detection[]> {
    return typeof this.provider === "function" ? this.provider(frame) : this.provider;
  }
}
