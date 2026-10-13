// Per-track best laps and ghost recordings, persisted in localStorage.
//
// A ghost is the car's pose sampled at a fixed lap-time interval and stored flat
// as [x, y, z, yaw, x, y, z, yaw, ...] so a full lap is only a few tens of KB.

const STORAGE_KEY = "dustline86-records-v1";
export const GHOST_INTERVAL = 0.05;

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function getRecord(trackId) {
  const rec = readAll()[trackId];
  return rec && Number.isFinite(rec.time) ? rec : null;
}

export function saveRecord(trackId, time, ghost) {
  const all = readAll();
  all[trackId] = { time, ghost, date: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    // Storage full or blocked: still keep the time without the ghost.
    try {
      all[trackId] = { time, ghost: null, date: all[trackId].date };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
    return false;
  }
}

export class GhostRecorder {
  constructor() {
    this.reset();
  }
  reset() {
    this.samples = [];
    this.next = 0;
  }
  record(lapTime, car) {
    while (lapTime + 1e-9 >= this.next) {
      this.samples.push(
        Math.round(car.x * 100) / 100,
        Math.round(car.y * 100) / 100,
        Math.round(car.z * 100) / 100,
        Math.round(car.yaw * 1000) / 1000,
      );
      this.next += GHOST_INTERVAL;
    }
  }
}

// Ghost pose at `lapTime`, or null once the recording has run out.
export function ghostPose(ghost, lapTime) {
  if (!ghost || ghost.length < 8) return null;
  const f = lapTime / GHOST_INTERVAL,
    i = Math.floor(f),
    count = ghost.length / 4;
  if (i < 0 || i >= count - 1) return null;
  const t = f - i,
    a = i * 4,
    b = a + 4;
  let dYaw = ghost[b + 3] - ghost[a + 3];
  dYaw -= Math.round(dYaw / (2 * Math.PI)) * 2 * Math.PI;
  return {
    x: ghost[a] + (ghost[b] - ghost[a]) * t,
    y: ghost[a + 1] + (ghost[b + 1] - ghost[a + 1]) * t,
    z: ghost[a + 2] + (ghost[b + 2] - ghost[a + 2]) * t,
    yaw: ghost[a + 3] + dYaw * t,
  };
}
