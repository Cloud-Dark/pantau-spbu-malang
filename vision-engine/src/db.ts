import { neon } from "@neondatabase/serverless";

/** Antarmuka minimal agar repo bisa diuji dengan DB palsu. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}

/** Neon lewat HTTP (tanpa koneksi TCP persisten). */
export function createDb(databaseUrl: string): Db {
  const sql = neon(databaseUrl);
  return {
    async query(text, params = []) {
      return (await sql.query(text, params)) as Record<string, unknown>[];
    },
  };
}
