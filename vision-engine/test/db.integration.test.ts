// Uji DB nyata (Neon via HTTP). Hanya jalan bila RUN_DB_TESTS=1 dan DATABASE_URL tersedia
// (dapat dimuat lewat ENV_FILE=/path/.env). Menyisipkan satu baris lalu MENGHAPUSNYA.
import test from "node:test";
import assert from "node:assert/strict";
import { loadEnvFile } from "../src/config.ts";
import { createDb } from "../src/db.ts";
import { createRepo } from "../src/repo.ts";
import { silentLogger } from "../src/log.ts";

loadEnvFile();
const enabled = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;

test("Neon nyata: listSpbu, insert TRAFFIC_API, lastLogs, hapus", { skip: !enabled && "set RUN_DB_TESTS=1 + DATABASE_URL" }, async () => {
  const repo = createRepo(createDb(process.env.DATABASE_URL!), { dryRun: false, log: silentLogger });
  const list = await repo.listSpbu();
  assert.ok(list.length > 0, "spbu_locations kosong");
  assert.equal(typeof list[0]!.lat, "number");
  const spbu = list[0]!;
  const id = await repo.insertStatusLog({ spbuId: spbu.id, status: "NORMAL", source: "TRAFFIC_API", confidence: 42 });
  assert.ok(id);
  try {
    const last = await repo.lastLogs("TRAFFIC_API");
    assert.ok(last.has(spbu.id));
  } finally {
    await repo.deleteStatusLog(id!);
  }
  const rows = await createDb(process.env.DATABASE_URL!).query("select 1 from status_logs where id = $1", [id]);
  assert.equal(rows.length, 0, "baris uji harus terhapus");
});
