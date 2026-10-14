// Logger sederhana berstempel waktu. Jangan pernah mencatat kunci API / DATABASE_URL.
type Level = "INFO" | "WARN" | "ERROR";

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

function emit(level: Level, msg: string): void {
  const line = `${new Date().toISOString()} [${level}] ${msg}`;
  if (level === "INFO") console.log(line);
  else console.error(line);
}

export const logger: Logger = {
  info: (m) => emit("INFO", m),
  warn: (m) => emit("WARN", m),
  error: (m) => emit("ERROR", m),
};

/** Logger senyap untuk uji. */
export const silentLogger: Logger = { info() {}, warn() {}, error() {} };

/** Pesan error aman (tanpa URL yang bisa memuat kunci). */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
