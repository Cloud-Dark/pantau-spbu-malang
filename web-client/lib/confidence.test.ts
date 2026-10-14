import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateStatus, type LogInput } from "./confidence";

const NOW = Date.parse("2026-10-14T05:00:00Z");
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();
const log = (
  status: LogInput["status"],
  source: LogInput["source"],
  confidence_score: number,
  min: number,
): LogInput => ({ status, source, confidence_score, created_at: ago(min) });

test("tanpa log -> stale, status null", () => {
  const r = aggregateStatus([], NOW);
  assert.equal(r.status, null);
  assert.equal(r.stale, true);
  assert.equal(r.updatedAt, null);
  assert.equal(r.sampleCount, 0);
});

test("satu sumber segar", () => {
  const r = aggregateStatus([log("KOSONG", "CCTV", 90, 0)], NOW);
  assert.equal(r.status, "KOSONG");
  assert.deepEqual(r.sources, ["CCTV"]);
  assert.equal(r.stale, false);
  assert.equal(r.sampleCount, 1);
  assert.ok(r.confidence >= 70 && r.confidence <= 85, String(r.confidence));
});

test("dua sumber sepakat lebih yakin daripada satu sumber", () => {
  const one = aggregateStatus([log("ANTRE_PANJANG", "CCTV", 90, 0)], NOW);
  const two = aggregateStatus(
    [log("ANTRE_PANJANG", "CCTV", 90, 0), log("ANTRE_PANJANG", "TRAFFIC_API", 80, 0)],
    NOW,
  );
  assert.ok(two.confidence > one.confidence);
  assert.deepEqual(two.sources, ["CCTV", "TRAFFIC_API"]);
});

test("sumber bertentangan: sumber lebih kuat menang dengan confidence rendah", () => {
  const r = aggregateStatus(
    [log("NORMAL", "CCTV", 90, 0), log("KOSONG", "TRAFFIC_API", 80, 0)],
    NOW,
  );
  assert.equal(r.status, "NORMAL");
  assert.ok(r.confidence < 45, String(r.confidence));
});

test("spam crowdsourcing tidak mengalahkan CCTV segar yang berbeda", () => {
  const spam = Array.from({ length: 200 }, () => log("KOSONG", "CROWDSOURCE", 100, 0));
  const r = aggregateStatus([log("NORMAL", "CCTV", 90, 0), ...spam], NOW);
  assert.equal(r.status, "NORMAL");
});

test("crowdsourcing: banyak laporan sepakat menaikkan confidence dengan batas atas", () => {
  const mk = (n: number) =>
    aggregateStatus(
      Array.from({ length: n }, () => log("ANTRE_PANJANG", "CROWDSOURCE", 70, 1)),
      NOW,
    );
  const c1 = mk(1).confidence;
  const c5 = mk(5).confidence;
  const c50 = mk(50).confidence;
  const c500 = mk(500).confidence;
  assert.ok(c1 < c5 && c5 < c50);
  assert.ok(c500 - c50 <= 2, "saturasi");
  assert.ok(c500 <= 100);
});

test("peluruhan waktu: data lama kalah dari data baru", () => {
  const r = aggregateStatus(
    [log("NORMAL", "CCTV", 90, 25), log("KOSONG", "CCTV", 90, 1)],
    NOW,
  );
  // satu sumber, dua status: yang baru menang
  assert.equal(r.status, "KOSONG");
  const fresh = aggregateStatus([log("KOSONG", "CCTV", 90, 0)], NOW).confidence;
  const old = aggregateStatus([log("KOSONG", "CCTV", 90, 20)], NOW).confidence;
  assert.ok(old < fresh);
});

test("data kedaluwarsa -> stale dengan updatedAt = log terakhir", () => {
  const r = aggregateStatus([log("KOSONG", "CCTV", 99, 31), log("NORMAL", "CCTV", 99, 90)], NOW);
  assert.equal(r.status, null);
  assert.equal(r.stale, true);
  assert.equal(r.confidence, 0);
  assert.equal(r.updatedAt, ago(31));
});

test("jendela dapat dikonfigurasi", () => {
  const l = [log("KOSONG", "CCTV", 90, 31)];
  assert.equal(aggregateStatus(l, NOW).stale, true);
  assert.equal(aggregateStatus(l, NOW, { windowMs: 60 * 60_000 }).stale, false);
});

test("tie-break: skor sama -> keparahan lebih tinggi", () => {
  const r = aggregateStatus(
    [log("NORMAL", "CCTV", 80, 0), log("KOSONG", "CCTV", 80, 0)],
    NOW,
  );
  assert.equal(r.status, "KOSONG");
  assert.ok(r.confidence >= 1 && r.confidence <= 100);
});

test("tie-break: skor sama -> sumber independen lebih banyak menang", () => {
  // NORMAL = CCTV 0.3 (satu sumber); KOSONG = TRAFFIC 0.15 + CROWD 0.15 (dua sumber), seri tepat.
  const g = 1 - Math.exp(-1); // kekuatan crowdsourcing untuk satu laporan 100% segar
  const r = aggregateStatus(
    [
      log("NORMAL", "CCTV", 100, 0),
      log("KOSONG", "TRAFFIC_API", 100, 0),
      log("KOSONG", "CROWDSOURCE", 100, 0),
    ],
    NOW,
    { sourceWeights: { CCTV: 0.3, TRAFFIC_API: 0.15, CROWDSOURCE: 0.15 / g } },
  );
  assert.equal(r.status, "KOSONG");
  assert.deepEqual([...r.sources].sort(), ["CROWDSOURCE", "TRAFFIC_API"]);
  // seri penuh antar satu sumber -> keparahan
  const tie = aggregateStatus(
    [log("NORMAL", "CCTV", 100, 0), log("ANTRE_PANJANG", "TRAFFIC_API", 100, 0)],
    NOW,
    { sourceWeights: { CCTV: 0.3, TRAFFIC_API: 0.3, CROWDSOURCE: 0.1 } },
  );
  assert.equal(tie.status, "ANTRE_PANJANG");
});

test("override bobot sumber dan input tidak valid diabaikan", () => {
  const r = aggregateStatus(
    [
      log("NORMAL", "CCTV", 90, 0),
      log("KOSONG", "CROWDSOURCE", 90, 0),
      { status: "KOSONG", source: "CCTV", confidence_score: NaN, created_at: "bukan-tanggal" },
    ],
    NOW,
    { sourceWeights: { CCTV: 0.1, TRAFFIC_API: 0.35, CROWDSOURCE: 0.9 } },
  );
  assert.equal(r.status, "KOSONG");
  assert.equal(r.sampleCount, 2);
});

test("confidence selalu dalam 1..100 untuk data segar", () => {
  const r = aggregateStatus([log("NORMAL", "CCTV", 1, 29)], NOW);
  assert.ok(r.confidence >= 1 && r.confidence <= 100);
});
