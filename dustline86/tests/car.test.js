import { test } from "node:test";
import assert from "node:assert/strict";
import { Car, cloneCarParams, DEFAULT_CAR } from "../js/car.js";
import { TRACKS } from "../js/track.js";
import { LapTracker } from "../js/physics.js";
import { placeCar, NO_INPUT, autopilot } from "./helpers.js";

const mesa = TRACKS.mesa86;
const STEP = 1 / 120;

function run(car, track, seconds, input = NO_INPUT, dt = STEP) {
  for (let t = 0; t < seconds; t += dt)
    car.update(dt, typeof input === "function" ? input() : input, track);
}

function forwardSpeed(car) {
  return car.vx * Math.cos(car.yaw) + car.vz * Math.sin(car.yaw);
}

for (const [name, input] of [
  ["no input", NO_INPUT],
  ["brakes held", { ...NO_INPUT, frontBrake: 1, rearBrake: 1 }],
  ["handbrake held", { ...NO_INPUT, handbrake: true }],
]) {
  test(`a parked car stays still (${name})`, () => {
    // Regression: stiff low-speed tire forces made a stopped car jitter ~0.13 m/s
    // and flip its yaw rate +/-0.13 rad/s every frame.
    const car = new Car(cloneCarParams());
    placeCar(car, mesa, 0.1);
    run(car, mesa, 1, input);
    let maxSpeed = 0,
      maxYaw = 0;
    for (let i = 0; i < 240; i++) {
      car.update(STEP, input, mesa);
      maxSpeed = Math.max(maxSpeed, car.speed);
      maxYaw = Math.max(maxYaw, Math.abs(car.yawRate));
    }
    assert.ok(maxSpeed < 0.01, `speed ${maxSpeed}`);
    assert.ok(maxYaw < 0.01, `yaw rate ${maxYaw}`);
  });
}

test("gravity pulls the car downhill whichever way it faces", () => {
  // Regression: the grade force was scaled by heading, so a car facing backwards
  // on a slope was pushed uphill.
  let steepest = 0;
  mesa.samples.forEach((s, i) => {
    if (s.grade > mesa.samples[steepest].grade) steepest = i;
  });
  for (const reverse of [false, true]) {
    const car = new Car(cloneCarParams());
    const p = placeCar(car, mesa, steepest / mesa.N, reverse);
    car.setGear(0);
    const x0 = car.x,
      z0 = car.z;
    run(car, mesa, 2);
    const alongUphill = (car.x - x0) * p.tx + (car.z - z0) * p.tz;
    assert.ok(alongUphill < 0, `moved ${alongUphill} m uphill (reverse=${reverse})`);
  }
});

test("reverse gear drives backwards", () => {
  const car = new Car(cloneCarParams());
  placeCar(car, mesa, 0.1);
  car.setGear(-1);
  run(car, mesa, 2, { ...NO_INPUT, throttle: 1 });
  assert.ok(forwardSpeed(car) < -2, `forward speed ${forwardSpeed(car)}`);
});

test("neutral produces no drive", () => {
  const car = new Car(cloneCarParams());
  placeCar(car, mesa, 0.1);
  car.setGear(0);
  run(car, mesa, 2, { ...NO_INPUT, throttle: 1 });
  assert.ok(car.speed < 0.5, `speed ${car.speed}`);
});

test("setGear clamps to reverse..top gear", () => {
  const car = new Car(cloneCarParams());
  car.setGear(-5);
  assert.equal(car.gear, -1);
  car.setGear(99);
  assert.equal(car.gear, DEFAULT_CAR.gears.length);
});

test("first gear is limited by redline", () => {
  const p = cloneCarParams();
  const car = new Car(p);
  placeCar(car, TRACKS.driftBasin, 0);
  run(car, TRACKS.driftBasin, 8, () => ({
    ...NO_INPUT,
    steer: 0,
    throttle: 1,
  }));
  const wheelR = 0.31;
  const redlineSpeed =
    ((p.redline / (p.gears[0] * p.finalDrive)) * 2 * Math.PI * wheelR) / 60;
  assert.ok(car.rpm <= p.redline, `rpm ${car.rpm}`);
  assert.ok(car.speed < redlineSpeed * 1.05, `${car.speed} vs ${redlineSpeed}`);
});

test("handling does not depend on the physics step size", () => {
  // The game runs a fixed 120 Hz step; 60 Hz and 144 Hz should behave the same.
  const time0to100 = (dt) => {
    const car = new Car(cloneCarParams());
    placeCar(car, mesa, 0);
    for (let t = 0; t < 20; t += dt) {
      if (car.rpm > car.p.redline - 200 && car.gear < 6) car.setGear(car.gear + 1);
      car.update(dt, { ...NO_INPUT, throttle: 1 }, mesa);
      if (car.speed >= 27.78) return t;
    }
    return Infinity;
  };
  const base = time0to100(1 / 120);
  assert.ok(base < 8, `0-100 km/h in ${base}s`);
  for (const hz of [60, 144]) {
    const t = time0to100(1 / hz);
    assert.ok(Math.abs(t - base) / base < 0.03, `${hz} Hz: ${t}s vs ${base}s`);
  }
});

for (const id of ["mesa86", "driftBasin"]) {
  test(`autopilot completes a clean lap of ${TRACKS[id].name}`, () => {
    // A coarse handling regression check: a simple driver should be able to get
    // round the open courses without leaving the road.
    const track = TRACKS[id];
    const car = new Car(cloneCarParams());
    placeCar(car, track, 0);
    const laps = new LapTracker(track.length);
    laps.reset(0);
    let lap = null,
      offRoad = 0;
    for (let t = 0; t < 90 && !lap; t += STEP) {
      car.update(STEP, autopilot(car, track), track);
      const here = track.nearest(car.x, car.z, car.y, car.trackIndex);
      if (Math.abs(here.lateral) > track.width * 0.75) laps.invalidate();
      if (car.offRoad) offRoad += STEP;
      lap = laps.update(here.progress, STEP);
    }
    assert.ok(lap, "no lap completed in 90 s");
    assert.equal(lap.valid, true);
    assert.equal(offRoad, 0);
    assert.ok(lap.time > 30 && lap.time < 60, `lap time ${lap.time}`);
  });
}
