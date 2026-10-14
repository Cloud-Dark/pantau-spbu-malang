import test from "node:test";
import assert from "node:assert/strict";
import { mapCctv, mapTraffic, shouldInsert, toScore } from "../src/mapping.ts";

const opt = { normalRatio: 0.7, minApiConfidence: 0.3 };
const r = (cur: number, free: number, confidence = 0.9, roadClosure = false) => ({ currentSpeed: cur, freeFlowSpeed: free, confidence, roadClosure });

test("mapTraffic: rasio >= ambang => NORMAL", () => {
  assert.equal(mapTraffic(r(35, 50), opt)?.status, "NORMAL"); // 0.7 tepat
  assert.equal(mapTraffic(r(50, 50), opt)?.status, "NORMAL");
  assert.equal(mapTraffic(r(60, 50), opt)?.status, "NORMAL"); // lebih cepat dari free flow
});

test("mapTraffic: rasio < ambang => ANTRE_PANJANG, tidak pernah KOSONG", () => {
  assert.equal(mapTraffic(r(34, 50), opt)?.status, "ANTRE_PANJANG");
  assert.equal(mapTraffic(r(0, 50), opt)?.status, "ANTRE_PANJANG");
});

test("mapTraffic: roadClosure => ANTRE_PANJANG walau kecepatan tinggi", () => {
  assert.equal(mapTraffic(r(50, 50, 0.9, true), opt)?.status, "ANTRE_PANJANG");
});

test("mapTraffic: data tak layak => null", () => {
  assert.equal(mapTraffic(r(30, 0), opt), null);
  assert.equal(mapTraffic(r(30, 50, 0.1), opt), null);
  assert.equal(mapTraffic(r(NaN, 50), opt), null);
  assert.equal(mapTraffic(r(-1, 50), opt), null);
});

test("mapTraffic: confidence_score 1..100 dan naik dengan kualitas data", () => {
  const hi = mapTraffic(r(50, 50, 1), opt)!.confidence;
  const lo = mapTraffic(r(36, 50, 0.4), opt)!.confidence; // dekat ambang, api rendah
  assert.ok(hi <= 100 && lo >= 1);
  assert.ok(hi > lo, `${hi} > ${lo}`);
  assert.equal(toScore(0), 1);
  assert.equal(toScore(250), 100);
});

test("mapCctv: ambang jumlah kendaraan", () => {
  assert.equal(mapCctv(7, 0.8, 8).status, "NORMAL");
  assert.equal(mapCctv(8, 0.8, 8).status, "ANTRE_PANJANG");
  const m = mapCctv(0, undefined, 8);
  assert.equal(m.status, "NORMAL");
  assert.ok(m.confidence >= 1 && m.confidence <= 100);
});

test("shouldInsert: dedupe + heartbeat", () => {
  const t0 = new Date("2026-01-01T00:00:00Z");
  const last = { status: "NORMAL" as const, createdAt: t0 };
  const hb = 30 * 60_000;
  assert.equal(shouldInsert(undefined, "NORMAL", t0.getTime(), hb), true);
  assert.equal(shouldInsert(last, "NORMAL", t0.getTime() + 60_000, hb), false);
  assert.equal(shouldInsert(last, "ANTRE_PANJANG", t0.getTime() + 60_000, hb), true);
  assert.equal(shouldInsert(last, "NORMAL", t0.getTime() + hb, hb), true);
  assert.equal(shouldInsert(last, "NORMAL", t0.getTime() + 1, 0), true);
});
