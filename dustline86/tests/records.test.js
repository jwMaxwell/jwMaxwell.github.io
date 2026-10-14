import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installLocalStorage } from "./helpers.js";
import {
  getRecord,
  saveRecord,
  GhostRecorder,
  ghostPose,
  GHOST_INTERVAL,
} from "../js/records.js";

let storage;
beforeEach(() => {
  storage = installLocalStorage();
});

test("records round-trip per track", () => {
  assert.equal(getRecord("mesa86"), null);
  assert.equal(saveRecord("mesa86", 44.5, [1, 2, 3, 0]), true);
  saveRecord("driftBasin", 50, null);
  assert.equal(getRecord("mesa86").time, 44.5);
  assert.deepEqual(getRecord("mesa86").ghost, [1, 2, 3, 0]);
  assert.equal(getRecord("driftBasin").time, 50);
});

test("corrupt storage reads as no record", () => {
  storage.setItem("dustline86-records-v1", "{not json");
  assert.equal(getRecord("mesa86"), null);
});

test("a full storage quota still keeps the lap time", () => {
  const realSet = storage.setItem;
  let calls = 0;
  storage.setItem = (k, v) => {
    if (calls++ === 0) throw new Error("QuotaExceededError");
    realSet(k, v);
  };
  assert.equal(saveRecord("mesa86", 42, new Array(4000).fill(1)), false);
  assert.equal(getRecord("mesa86").time, 42);
  assert.equal(getRecord("mesa86").ghost, null);
});

test("the recorder samples at a fixed lap-time interval", () => {
  const rec = new GhostRecorder();
  const car = { x: 0, y: 1, z: 0, yaw: 0 };
  for (let t = 0; t <= 1 + 1e-9; t += 1 / 120) {
    car.x = t * 10;
    rec.record(t, car);
  }
  const count = rec.samples.length / 4;
  assert.equal(count, Math.floor(1 / GHOST_INTERVAL) + 1);
  // Sample k is taken at the first step at or after k * interval.
  assert.ok(Math.abs(rec.samples[4 * 10] - 5) < 10 / 120 + 1e-9);
  rec.reset();
  assert.equal(rec.samples.length, 0);
});

test("ghostPose interpolates between samples", () => {
  const ghost = [0, 0, 0, 0, 10, 2, 20, 1];
  const mid = ghostPose(ghost, GHOST_INTERVAL / 2);
  assert.deepEqual(
    [mid.x, mid.y, mid.z, mid.yaw].map((v) => +v.toFixed(6)),
    [5, 1, 10, 0.5],
  );
});

test("ghostPose turns the short way across +/-pi", () => {
  const ghost = [0, 0, 0, 3.1, 0, 0, 0, -3.1];
  const yaw = ghostPose(ghost, GHOST_INTERVAL / 2).yaw;
  assert.ok(Math.abs(Math.abs(yaw) - Math.PI) < 0.01, `yaw ${yaw}`);
});

test("ghostPose is null outside the recording", () => {
  const ghost = [0, 0, 0, 0, 1, 0, 0, 0];
  assert.equal(ghostPose(ghost, GHOST_INTERVAL * 2), null);
  assert.equal(ghostPose(ghost, -0.1), null);
  assert.equal(ghostPose(null, 0), null);
  assert.equal(ghostPose([0, 0, 0, 0], 0), null);
});
