import assert from "node:assert/strict";
import { test } from "node:test";
import { GEOFENCE_RADIUS_M, haversineMeters } from "./geo";

test("jarak titik yang sama adalah 0", () => {
  assert.equal(haversineMeters(-7.9666, 112.6326, -7.9666, 112.6326), 0);
});

test("1 derajat lintang sekitar 111,19 km", () => {
  const d = haversineMeters(0, 0, 1, 0);
  assert.ok(Math.abs(d - 111_195) < 50, `d=${d}`);
});

test("simetris", () => {
  const a = haversineMeters(-7.95, 112.61, -7.98, 112.65);
  const b = haversineMeters(-7.98, 112.65, -7.95, 112.61);
  assert.ok(Math.abs(a - b) < 1e-6);
});

test("Malang ke Surabaya sekitar 76 km", () => {
  const d = haversineMeters(-7.9666, 112.6326, -7.2575, 112.7521) / 1000;
  assert.ok(d > 75 && d < 82, `d=${d}`);
});

test("offset ~0,0003 derajat lintang (~33 m) di dalam geofence, ~0,002 (~222 m) di luar", () => {
  assert.ok(haversineMeters(-7.9666, 112.6326, -7.9666 + 0.0003, 112.6326) < GEOFENCE_RADIUS_M);
  assert.ok(haversineMeters(-7.9666, 112.6326, -7.9666 + 0.002, 112.6326) > GEOFENCE_RADIUS_M);
});

test("melewati antimeridian tetap benar", () => {
  const d = haversineMeters(0, 179.999, 0, -179.999);
  assert.ok(d < 300, `d=${d}`);
});

test("konstanta radius = 100", () => {
  assert.equal(GEOFENCE_RADIUS_M, 100);
});
