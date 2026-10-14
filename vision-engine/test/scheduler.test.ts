import test from "node:test";
import assert from "node:assert/strict";
import { runOnce, startScheduler } from "../src/scheduler.ts";
import { silentLogger } from "../src/log.ts";
import { mapLimit } from "../src/util.ts";

test("runOnce: exit 0 normal, 1 bila job melempar atau semua item gagal", async () => {
  assert.equal(await runOnce([{ name: "a", intervalSec: 1, run: async () => ({ total: 2, inserted: 1, skipped: 0, failed: 1 }) }], silentLogger), 0);
  assert.equal(await runOnce([{ name: "a", intervalSec: 1, run: async () => ({ total: 2, inserted: 0, skipped: 0, failed: 2 }) }], silentLogger), 1);
  assert.equal(await runOnce([{ name: "a", intervalSec: 1, run: async () => { throw new Error("x"); } }, { name: "b", intervalSec: 1, run: async () => {} }], silentLogger), 1);
});

test("startScheduler: anti-overlap, lanjut setelah error, berhenti saat abort", async () => {
  const ac = new AbortController();
  let running = 0, maxRunning = 0, runs = 0;
  const p = startScheduler([{
    name: "j", intervalSec: 0.02,
    run: async () => {
      running++; maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 30)); // lebih lama dari interval
      running--; runs++;
      if (runs === 1) throw new Error("error siklus pertama");
      if (runs >= 3) ac.abort();
    },
  }], silentLogger, ac.signal);
  await p;
  assert.equal(maxRunning, 1);
  assert.equal(runs, 3);
});

test("mapLimit: batas konkurensi dan urutan hasil", async () => {
  let cur = 0, max = 0;
  const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
    cur++; max = Math.max(max, cur);
    await new Promise((r) => setTimeout(r, 5));
    cur--;
    return n * 2;
  });
  assert.deepEqual(out, [2, 4, 6, 8, 10, 12]);
  assert.equal(max, 2);
});
