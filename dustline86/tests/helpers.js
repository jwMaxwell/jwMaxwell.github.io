// Small stand-ins for the browser APIs the game modules touch, so they can run
// under Node's built-in test runner without any dependencies.

export function installLocalStorage() {
  const data = new Map();
  const storage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
}

// Place a car on the centerline at `progress`, facing along the track (or
// backwards when `reverse` is set).
export function placeCar(car, track, progress, reverse = false) {
  car.reset();
  const p = track.sample(progress);
  car.x = p.x;
  car.z = p.z;
  car.y = p.y + 0.42;
  car.trackIndex = Math.round(progress * track.N) % track.N;
  car.yaw = Math.atan2(p.tz, p.tx) + (reverse ? Math.PI : 0);
  return p;
}

export const NO_INPUT = {
  steer: 0,
  throttle: 0,
  frontBrake: 0,
  rearBrake: 0,
  handbrake: false,
};

function wrapPi(a) {
  return a - Math.round(a / (2 * Math.PI)) * 2 * Math.PI;
}

// A simple pure-pursuit driver: steers at a point ahead on the centerline, slows
// for upcoming bends and shifts near redline. Good enough to lap the open courses.
export function autopilot(car, track) {
  const n = track.nearest(car.x, car.z, car.y, car.trackIndex);
  const ahead = track.samples[(n.index + 14) % track.N];
  const far = track.samples[(n.index + 40) % track.N];
  const heading = wrapPi(Math.atan2(ahead.z - car.z, ahead.x - car.x) - car.yaw);
  const bend = Math.abs(
    wrapPi(Math.atan2(far.tz, far.tx) - Math.atan2(n.point.tz, n.point.tx)),
  );
  const target = 22 + 18 * Math.max(0, 1 - bend * 3);
  if (car.rpm > car.p.redline - 200 && car.gear < car.p.gears.length)
    car.setGear(car.gear + 1);
  if (car.rpm < 2600 && car.gear > 1) car.setGear(car.gear - 1);
  return {
    steer: Math.max(-1, Math.min(1, heading * 2.2)),
    throttle: car.speed < target ? 1 : 0,
    frontBrake: car.speed > target + 4 ? 0.6 : 0,
    rearBrake: 0,
    handbrake: false,
  };
}
