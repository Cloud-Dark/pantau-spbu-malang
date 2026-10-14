import test from "node:test";
import assert from "node:assert/strict";
import { ConfigError, parseConfig } from "../src/config.ts";

test("parseConfig: default", () => {
  const c = parseConfig({});
  assert.equal(c.traffic.intervalSec, 300);
  assert.equal(c.cctv.intervalSec, 120);
  assert.equal(c.traffic.provider, "tomtom");
  assert.equal(c.traffic.apiKey, undefined);
  assert.equal(c.traffic.normalRatio, 0.7);
  assert.equal(c.dryRun, false);
  assert.equal(c.cctv.modelPath, undefined);
});

test("parseConfig: nilai kustom & string kosong dianggap tidak diset", () => {
  const c = parseConfig({ DRY_RUN: "1", TRAFFIC_API_KEY: "  ", TRAFFIC_INTERVAL_SEC: "60", CCTV_QUEUE_THRESHOLD: "12", DATABASE_URL: "x" });
  assert.equal(c.dryRun, true);
  assert.equal(c.traffic.apiKey, undefined);
  assert.equal(c.traffic.intervalSec, 60);
  assert.equal(c.cctv.queueThreshold, 12);
});

test("parseConfig: kumpulkan semua masalah", () => {
  assert.throws(
    () => parseConfig({ TRAFFIC_INTERVAL_SEC: "abc", TRAFFIC_NORMAL_RATIO: "5", DRY_RUN: "maybe", TRAFFIC_PROVIDER: "google" }),
    (e: unknown) => e instanceof ConfigError && e.problems.length === 4,
  );
  assert.throws(() => parseConfig({ TRAFFIC_CONCURRENCY: "1.5" }), ConfigError);
});
