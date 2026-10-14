import { neon } from "@neondatabase/serverless";

// Hanya dipakai di server (Route Handler / Server Component); lihat ADR-007.
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur");
  return neon(url);
}
