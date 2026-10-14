import test from "node:test";
import assert from "node:assert/strict";
import { fetchTomTomFlow, runTrafficCycle } from "../src/sources/traffic.ts";
import { createRepo, type NewStatusLog } from "../src/repo.ts";
import { silentLogger } from "../src/log.ts";
import { fakeDb, jsonResponse, SPBU, tomtomBody } from "./helpers.ts";
import { parseConfig } from "../src/config.ts";
import type { LastLog } from "../src/types.ts";
import type { Repo } from "../src/repo.ts";

const cfg = { ...parseConfig({ TRAFFIC_API_KEY: "KUNCI-RAHASIA" }).traffic, retries: 2 };
const noSleep = async () => {};

function memRepo(last = new Map<string, LastLog>()): Repo & { inserted: NewStatusLog[] } {
  const inserted: NewStatusLog[] = [];
  return {
    inserted,
    listSpbu: async () => SPBU,
    lastLogs: async () => last,
    insertStatusLog: async (l) => (inserted.push(l), "id-" + inserted.length),
    deleteStatusLog: async () => {},
  };
}

test("fetchTomTomFlow: URL benar & parsing", async () => {
  let url = "";
  const r = await fetchTomTomFlow(SPBU[0]!, cfg, {
    fetchImpl: async (u) => (url = String(u), jsonResponse(tomtomBody(20, 40, 0.8))),
  });
  assert.match(url, /flowSegmentData\/absolute\/10\/json\?point=-7\.93,112\.6&/);
  assert.match(url, /key=KUNCI-RAHASIA/);
  assert.deepEqual(r, { currentSpeed: 20, freeFlowSpeed: 40, confidence: 0.8, roadClosure: false });
});

test("fetchTomTomFlow: retry pada 503 lalu sukses; backoff dipanggil", async () => {
  let n = 0;
  const waits: number[] = [];
  const r = await fetchTomTomFlow(SPBU[0]!, cfg, {
    fetchImpl: async () => (++n < 3 ? new Response("x", { status: 503 }) : jsonResponse(tomtomBody(30, 30))),
    sleepMs: async (ms) => void waits.push(ms),
  });
  assert.equal(n, 3);
  assert.deepEqual(waits, [500, 1000]);
  assert.equal(r.currentSpeed, 30);
});

test("fetchTomTomFlow: 403 tidak diulang; pesan error tanpa kunci", async () => {
  let n = 0;
  await assert.rejects(
    fetchTomTomFlow(SPBU[0]!, cfg, { fetchImpl: async () => (n++, new Response("no", { status: 403 })), sleepMs: noSleep }),
    (e: Error) => /HTTP 403/.test(e.message) && !/KUNCI-RAHASIA/.test(e.message),
  );
  assert.equal(n, 1);
});

test("fetchTomTomFlow: kegagalan jaringan habis retry, kunci tidak bocor", async () => {
  let n = 0;
  await assert.rejects(
    fetchTomTomFlow(SPBU[0]!, cfg, { fetchImpl: async () => { n++; throw new TypeError("fetch failed"); }, sleepMs: noSleep }),
    (e: Error) => !/KUNCI-RAHASIA/.test(e.message),
  );
  assert.equal(n, 3);
});

test("runTrafficCycle: tanpa API key => nonaktif, tanpa fetch", async () => {
  const repo = memRepo();
  const s = await runTrafficCycle({
    cfg: { ...cfg, apiKey: undefined }, heartbeatMin: 30, repo, spbuList: SPBU, log: silentLogger,
    fetchImpl: async () => { throw new Error("tidak boleh dipanggil"); },
  });
  assert.equal(s.skipped, 3);
  assert.equal(repo.inserted.length, 0);
});

test("runTrafficCycle: insert, dedupe, isolasi error per SPBU", async () => {
  const now = Date.parse("2026-01-01T12:00:00Z");
  const last = new Map<string, LastLog>([
    [SPBU[1]!.id, { status: "NORMAL", createdAt: new Date(now - 60_000) }], // sama & baru => dedupe
  ]);
  const repo = memRepo(last);
  const lat = (u: string) => Number(/point=([-\d.]+),/.exec(u)![1]);
  const s = await runTrafficCycle({
    cfg: { ...cfg, concurrency: 2 }, heartbeatMin: 30, repo, spbuList: SPBU, log: silentLogger, sleepMs: noSleep, now: () => now,
    fetchImpl: async (u) => {
      const la = lat(String(u));
      if (la === -7.93) return jsonResponse(tomtomBody(15, 50)); // A: ANTRE
      if (la === -7.95) return jsonResponse(tomtomBody(50, 50)); // B: NORMAL (dedupe)
      return new Response("err", { status: 500 }); // C: gagal
    },
  });
  assert.deepEqual(s, { total: 3, inserted: 1, skipped: 1, failed: 1 });
  assert.equal(repo.inserted[0]!.spbuId, SPBU[0]!.id);
  assert.equal(repo.inserted[0]!.status, "ANTRE_PANJANG");
  assert.equal(repo.inserted[0]!.source, "TRAFFIC_API");
});

test("repo: INSERT parameterized, dry-run tidak menyentuh DB", async () => {
  const db = fakeDb(() => [{ id: "abc" }]);
  const repo = createRepo(db, { dryRun: false, log: silentLogger });
  const id = await repo.insertStatusLog({ spbuId: "x'; drop table--", status: "NORMAL", source: "TRAFFIC_API", confidence: 77 });
  assert.equal(id, "abc");
  assert.match(db.calls[0]!.text, /insert into status_logs \(spbu_id, status, source, confidence_score\)\s+values \(\$1, \$2, \$3, \$4\)/);
  assert.deepEqual(db.calls[0]!.params, ["x'; drop table--", "NORMAL", "TRAFFIC_API", 77]);

  const dry = fakeDb();
  const r2 = createRepo(dry, { dryRun: true, log: silentLogger });
  assert.equal(await r2.insertStatusLog({ spbuId: "a", status: "NORMAL", source: "CCTV", confidence: 1 }), null);
  assert.equal(dry.calls.length, 0);
});

test("repo: listSpbu & lastLogs memetakan baris", async () => {
  const db = fakeDb((t) =>
    /spbu_locations/.test(t)
      ? [{ id: "i1", name: "N", address: null, lat: "-7.9", lng: "112.6" }]
      : [{ spbu_id: "i1", status: "NORMAL", created_at: "2026-01-01T00:00:00Z" }],
  );
  const repo = createRepo(db, { dryRun: false, log: silentLogger });
  assert.deepEqual(await repo.listSpbu(), [{ id: "i1", name: "N", address: null, lat: -7.9, lng: 112.6 }]);
  const m = await repo.lastLogs("CCTV");
  assert.equal(m.get("i1")!.createdAt.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.deepEqual(db.calls[1]!.params, ["CCTV"]);
});
