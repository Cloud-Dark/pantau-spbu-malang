import type { Db } from "./db.ts";
import type { Logger } from "./log.ts";
import type { LastLog, Source, Spbu, Status } from "./types.ts";

export interface NewStatusLog {
  spbuId: string;
  status: Status;
  source: Source;
  confidence: number;
}

export interface Repo {
  listSpbu(): Promise<Spbu[]>;
  /** Log terakhir per spbu_id untuk satu sumber (untuk dedupe). */
  lastLogs(source: Source): Promise<Map<string, LastLog>>;
  /** Mengembalikan id baris, atau null pada dry-run. */
  insertStatusLog(log: NewStatusLog): Promise<string | null>;
  /** Hanya untuk uji/pembersihan manual. */
  deleteStatusLog(id: string): Promise<void>;
}

export function createRepo(db: Db, opts: { dryRun: boolean; log: Logger }): Repo {
  return {
    async listSpbu() {
      const rows = await db.query("select id, name, address, lat, lng from spbu_locations order by name");
      return rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        address: r.address == null ? null : String(r.address),
        lat: Number(r.lat),
        lng: Number(r.lng),
      }));
    },

    async lastLogs(source) {
      const rows = await db.query(
        `select distinct on (spbu_id) spbu_id, status, created_at
           from status_logs where source = $1
          order by spbu_id, created_at desc`,
        [source],
      );
      const map = new Map<string, LastLog>();
      for (const r of rows) {
        map.set(String(r.spbu_id), {
          status: r.status as Status,
          createdAt: new Date(r.created_at as string | Date),
        });
      }
      return map;
    },

    async insertStatusLog(l) {
      if (opts.dryRun) {
        opts.log.info(`[DRY_RUN] insert status_logs spbu=${l.spbuId} ${l.status} ${l.source} conf=${l.confidence}`);
        return null;
      }
      const rows = await db.query(
        `insert into status_logs (spbu_id, status, source, confidence_score)
         values ($1, $2, $3, $4) returning id`,
        [l.spbuId, l.status, l.source, l.confidence],
      );
      return String(rows[0]?.id);
    },

    async deleteStatusLog(id) {
      await db.query("delete from status_logs where id = $1", [id]);
    },
  };
}
