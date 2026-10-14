import test from "node:test";
import assert from "node:assert/strict";
import { haversineMeters, pointInPolygon } from "../src/geo.ts";

test("haversine: ~111 km per derajat lintang, 0 untuk titik sama", () => {
  assert.equal(haversineMeters(-7.9, 112.6, -7.9, 112.6), 0);
  const d = haversineMeters(0, 0, 1, 0);
  assert.ok(Math.abs(d - 111195) < 200, String(d));
});

test("pointInPolygon: persegi dan segitiga/konkaf", () => {
  const sq = [[0, 0], [1, 0], [1, 1], [0, 1]] as const;
  assert.equal(pointInPolygon([0.5, 0.5], sq), true);
  assert.equal(pointInPolygon([1.5, 0.5], sq), false);
  assert.equal(pointInPolygon([-0.1, 0.5], sq), false);
  const L = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]] as const; // bentuk L
  assert.equal(pointInPolygon([0.5, 1.5], L), true);
  assert.equal(pointInPolygon([1.5, 1.5], L), false);
  assert.equal(pointInPolygon([0.5, 0.5], [[0, 0], [1, 1]]), false); // bukan poligon
});
