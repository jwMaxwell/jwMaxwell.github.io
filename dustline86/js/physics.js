// Physics-facing utilities. The actual tire integration lives in Car so it can
// remain reusable by AI/ghost cars later. This module handles timing and surface data.
export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "--:--.---";
  const m = Math.floor(seconds / 60),
    s = seconds - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

export function crossedLapForward(prevProgress, nextProgress) {
  return prevProgress > 0.92 && nextProgress < 0.08;
}

// Lap detection and timing for one car, driven by its progress around the course
// (0..1, where 0 is the start/finish line).
export class LapTracker {
  constructor(trackLength) {
    this.trackLength = trackLength;
    this.reset(0);
  }
  reset(progress) {
    this.lastProgress = progress;
    this.lapTime = 0;
    this.distance = 0;
    this.armed = false;
    this.valid = true;
  }
  // Mark the lap in progress as not counting toward records (e.g. off track).
  invalidate() {
    this.valid = false;
  }
  // Advance by one physics step. Returns { time, valid, overshoot } when this step
  // crossed the line to complete a lap, otherwise null. `overshoot` is how far into
  // the step the car had already crossed; it is credited to the new lap.
  update(progress, dt) {
    this.lapTime += dt;
    const last = this.lastProgress;
    this.lastProgress = progress;
    // Lap distance is signed progress along the course, not an odometer, so
    // reversing or shuffling back and forth near the line cannot build up a lap.
    let dProg = progress - last;
    if (dProg > 0.5) dProg -= 1;
    else if (dProg < -0.5) dProg += 1;
    this.distance += dProg * this.trackLength;
    // The start line is physically the same point as the lap seam. Do not allow the
    // first few meters of movement to count as a completed lap due to sample jitter.
    if (!this.armed && progress > 0.12 && progress < 0.5) this.armed = true;
    if (
      !this.armed ||
      this.distance <= this.trackLength * 0.78 ||
      !crossedLapForward(last, progress)
    )
      return null;
    // Time the crossing within the step instead of rounding to the step edge.
    const overshoot = (progress / (progress + 1 - last)) * dt;
    const lap = { time: this.lapTime - overshoot, valid: this.valid, overshoot };
    this.lapTime = overshoot;
    this.distance = 0;
    this.armed = false;
    this.valid = true;
    return lap;
  }
}
