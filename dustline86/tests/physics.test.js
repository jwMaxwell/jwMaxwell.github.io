import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime, crossedLapForward, LapTracker } from "../js/physics.js";

const LENGTH = 1000;

// Feed the tracker a sequence of progress values, one physics step each, and
// return the completed laps.
function drive(tracker, progresses, dt = 0.01) {
  const laps = [];
  for (const p of progresses) {
    const lap = tracker.update(((p % 1) + 1) % 1, dt);
    if (lap) laps.push(lap);
  }
  return laps;
}

function range(from, to, step) {
  const out = [];
  if (step > 0) for (let p = from; p <= to + 1e-9; p += step) out.push(p);
  else for (let p = from; p >= to - 1e-9; p += step) out.push(p);
  return out;
}

test("formatTime pads minutes, seconds and milliseconds", () => {
  assert.equal(formatTime(0), "00:00.000");
  assert.equal(formatTime(46.0833), "00:46.083");
  assert.equal(formatTime(61.5), "01:01.500");
  assert.equal(formatTime(Infinity), "--:--.---");
  assert.equal(formatTime(NaN), "--:--.---");
});

test("crossedLapForward only matches the forward seam", () => {
  assert.equal(crossedLapForward(0.99, 0.01), true);
  assert.equal(crossedLapForward(0.01, 0.99), false);
  assert.equal(crossedLapForward(0.5, 0.51), false);
});

test("a full forward lap completes exactly once", () => {
  const t = new LapTracker(LENGTH);
  t.reset(0);
  const laps = drive(t, range(0.001, 1.02, 0.001));
  assert.equal(laps.length, 1);
  assert.equal(laps[0].valid, true);
  // ~1000 steps of 10 ms to come back around to the line.
  assert.ok(Math.abs(laps[0].time - 10) < 0.02, `lap time ${laps[0].time}`);
});

test("laps are timed at the crossing point within the step", () => {
  const t = new LapTracker(LENGTH);
  t.reset(0);
  drive(t, range(0.01, 0.99, 0.01), 0.1);
  const before = t.lapTime;
  // The car moves from 0.99 to 0.01 in one 0.1 s step, crossing halfway through.
  const lap = t.update(0.01, 0.1);
  assert.ok(lap);
  assert.ok(Math.abs(lap.overshoot - 0.05) < 1e-9);
  assert.ok(Math.abs(lap.time - (before + 0.05)) < 1e-9);
  assert.ok(Math.abs(t.lapTime - 0.05) < 1e-9, "overshoot carries into new lap");
});

test("crossing the line backwards never counts", () => {
  const t = new LapTracker(LENGTH);
  t.reset(0.05);
  assert.equal(drive(t, range(0.05, -1.5, -0.002)).length, 0);
});

test("shuffling back and forth near the line cannot fake a lap", () => {
  // Regression: lap distance used to be an odometer, so reversing over the line,
  // rocking back and forth and then crossing forward counted as a lap.
  const t = new LapTracker(LENGTH);
  t.reset(0);
  const seq = range(0, -0.06, -0.002); // reverse over the line to 0.94
  for (let i = 0; i < 40; i++)
    seq.push(...range(0.94, 0.99, 0.002), ...range(0.99, 0.94, -0.002));
  seq.push(...range(0.94, 1.05, 0.002)); // then cross forward
  assert.equal(drive(t, seq).length, 0);
});

test("driving partway, backing over the line and shuffling cannot fake a lap", () => {
  // Same exploit with the lap already armed: odometer distance kept counting
  // while the car rocked back and forth, so the next forward crossing counted.
  const t = new LapTracker(LENGTH);
  t.reset(0);
  const seq = range(0.001, 0.2, 0.002); // far enough to arm the lap
  seq.push(...range(0.2, -0.06, -0.002)); // back over the line to 0.94
  for (let i = 0; i < 40; i++)
    seq.push(...range(0.94, 0.99, 0.002), ...range(0.99, 0.94, -0.002));
  seq.push(...range(0.94, 1.05, 0.002));
  assert.equal(drive(t, seq).length, 0);
});

test("invalidate marks only the current lap", () => {
  const t = new LapTracker(LENGTH);
  t.reset(0);
  drive(t, range(0.001, 0.5, 0.001));
  t.invalidate();
  const laps = drive(t, range(0.501, 2.02, 0.001));
  assert.equal(laps.length, 2);
  assert.equal(laps[0].valid, false);
  assert.equal(laps[1].valid, true);
});
