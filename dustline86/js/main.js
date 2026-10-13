import { Car, cloneCarParams } from "./car.js";
import { TRACKS, buildTrackMesh, buildScenery } from "./track.js";
import { Input } from "./input.js";
import { AudioEngine } from "./audio.js";
import { Renderer } from "./render.js";
import { UI } from "./ui.js";
import { formatTime, crossedLapForward } from "./physics.js";
import { getRecord, saveRecord, GhostRecorder, ghostPose } from "./records.js";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

const LAPS = 5;
// The simulation advances in fixed steps so handling and lap times do not depend
// on the display refresh rate. Rendering interpolates between the last two steps.
const STEP = 1 / 120;
// Longest stretch of real time simulated per frame; beyond this (a stalled tab or
// a breakpoint) the game slows down instead of trying to catch up all at once.
const MAX_FRAME_TIME = 0.1;

const canvas = document.getElementById("game");
const renderer = new Renderer(canvas),
  input = new Input(),
  audio = new AudioEngine(),
  ui = new UI();
let selectedTrackId = localStorage.getItem("dustline86-track");
if (!TRACKS[selectedTrackId]) selectedTrackId = "mesa86";
let track = TRACKS[selectedTrackId];
const params = loadParams(),
  car = new Car(params);
let scenery = buildScenery(track);
renderer.upload("track", buildTrackMesh(null, track));

let state = "menu",
  count = 3,
  countTimer = 0,
  raceTime = 0,
  lapTime = 0,
  bestLap = Infinity,
  lap = 0,
  lastProgress = 0,
  lapValid = true,
  lapArmed = false,
  lapDistance = 0,
  totalDistance = 0;
// Lap splits for the current session, the stored record for the selected track,
// and the recording of the lap in progress (saved if it becomes the new record).
let laps = [],
  record = getRecord(track.id),
  newRecord = false,
  ghostEnabled = localStorage.getItem("dustline86-ghost") !== "0";
const recorder = new GhostRecorder();
let last = performance.now(),
  accumulator = 0,
  gearLatch = 0,
  redlinePulseTimer = 0,
  wasSpinning = false;

ui.bind({
  onStart: () => start(),
  onRestart: () => start(),
  onMenu: () => showMainMenu(),
  onFullscreen: () => toggleFullscreen(),
  onReset: () => {
    Object.assign(params, cloneCarParams());
    ui.buildDebug(params, () => {});
    ui.toast("Defaults restored");
  },
  onSave: () => {
    localStorage.setItem("dustline86-tuning-v12", JSON.stringify(params));
    ui.toast("Tuning saved locally");
  },
  onCopy: () => ui.copyTuning(params),
  onTrackSelect: (id) => selectTrack(id),
  onMute: () => ui.setMuted(audio.toggleMute()),
});
ui.buildDebug(params, (k, v) => (params[k] = v));
ui.renderTrackSelector(TRACKS, selectedTrackId, (id) => selectTrack(id), getRecord);
ui.setGamepad(input.connectedName());
ui.setMuted(audio.muted);

function selectTrack(id) {
  if (!TRACKS[id]) return;
  selectedTrackId = id;
  track = TRACKS[id];
  scenery = buildScenery(track);
  renderer.upload("track", buildTrackMesh(null, track));
  localStorage.setItem("dustline86-track", id);
  record = getRecord(id);
  ui.setTrackSelected(id, track, record);
}

function loadParams() {
  const params = cloneCarParams();
  try {
    const saved = JSON.parse(
      localStorage.getItem("dustline86-tuning-v12") || "{}",
    );
    // Only take keys the current car model knows about, so values for removed
    // parameters in older saves don't linger and get written back out.
    for (const key of Object.keys(params))
      if (saved && key in saved) params[key] = saved[key];
  } catch {}
  return params;
}
function showMainMenu() {
  state = "menu";
  ui.hideCountdown();
  ui.setFinishVisible(false);
  ui.setStartVisible(true);
  ui.setRaceMenuVisible(false);
  audio.stopVehicleSound?.();
}

function start() {
  audio.start();
  car.reset();
  const startPose = track.sample(track.startHint || 0);
  car.x = startPose.x;
  car.z = startPose.z;
  car.y = startPose.y + 0.42;
  car.trackIndex = 0;
  car.yaw = Math.atan2(startPose.tz, startPose.tx);
  snapPose();
  state = "countdown";
  count = 3;
  countTimer = 0;
  raceTime = 0;
  lapTime = 0;
  bestLap = Infinity;
  lap = 0;
  totalDistance = 0;
  lastProgress = track.nearest(car.x, car.z, car.y, car.trackIndex).progress;
  lapValid = true;
  lapArmed = false;
  lapDistance = 0;
  laps = [];
  record = getRecord(track.id);
  newRecord = false;
  recorder.reset();
  gearLatch = 0;
  redlinePulseTimer = 0;
  wasSpinning = false;
  ui.setStartVisible(false);
  ui.setFinishVisible(false);
  ui.setRaceMenuVisible(true);
  ui.hideCountdown();
}
function toggleFullscreen() {
  const el = document.getElementById("game-shell");
  if (!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
}
// Pose at the start of the most recent physics step, for render interpolation.
const prevPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
function snapPose() {
  prevPose.x = car.x;
  prevPose.y = car.y;
  prevPose.z = car.z;
  prevPose.yaw = car.yaw;
  prevPose.pitch = car.pitch;
}
function interpolatedCar(alpha) {
  const view = Object.create(car);
  view.x = prevPose.x + (car.x - prevPose.x) * alpha;
  view.y = prevPose.y + (car.y - prevPose.y) * alpha;
  view.z = prevPose.z + (car.z - prevPose.z) * alpha;
  view.pitch = prevPose.pitch + (car.pitch - prevPose.pitch) * alpha;
  let dYaw = car.yaw - prevPose.yaw;
  dYaw -= Math.round(dYaw / (2 * Math.PI)) * 2 * Math.PI;
  view.yaw = prevPose.yaw + dYaw * alpha;
  return view;
}

// Discrete, once-per-press actions are handled once per frame; the physics substeps
// below then share the same held controls.
function handleFrameInput(ctl) {
  ui.setGamepad(input.connectedName());
  if (ctl.fullscreen) toggleFullscreen();
  if (ctl.restart && state !== "menu") start();
  if (ctl.mute) {
    ui.setMuted(audio.toggleMute());
  }
  if (ctl.ghost) {
    ghostEnabled = !ghostEnabled;
    localStorage.setItem("dustline86-ghost", ghostEnabled ? "1" : "0");
    ui.toast(ghostEnabled ? "Ghost on" : "Ghost off");
  }
  if (state !== "race") return;
  if (ctl.reverse && !gearLatch) {
    if (car.speed < 1.5) {
      const before = car.gear;
      car.setGear(car.gear < 0 ? 0 : -1);
      if (car.gear !== before)
        audio.shift(car.gear > before ? 1 : -1, car.gear);
    } else {
      ui.toast("Slow down to engage reverse");
    }
    gearLatch = 1;
  }
  if (ctl.up && !gearLatch) {
    const before = car.gear;
    if (car.gear < car.p.gears.length) car.setGear(car.gear + 1);
    if (car.gear !== before) audio.shift(1, car.gear);
    gearLatch = 1;
  }
  if (ctl.down && !gearLatch) {
    const before = car.gear;
    if (car.gear > 0) car.setGear(car.gear - 1);
    if (car.gear !== before) audio.shift(-1, car.gear);
    gearLatch = 1;
  }
  if (!ctl.up && !ctl.down && !ctl.reverse) gearLatch = 0;
  // Upshifts are entirely manual. At redline the engine simply reaches the limiter;
  // the selected gear never changes without a driver command.
}

function simulate(dt, ctl) {
  if (state === "menu") return;
  if (state === "countdown") {
    countTimer += dt;
    if (countTimer > 1) {
      countTimer = 0;
      count--;
      audio.beep(count > 0 ? 330 : 660, 0.09);
    }
    ui.countdown(count > 0 ? String(count) : "GO!");
    if (count <= 0 && countTimer > 0.45) {
      state = "race";
      ui.setRaceMenuVisible(true);
      ui.hideCountdown();
      lastProgress = track.nearest(
        car.x,
        car.z,
        car.y,
        car.trackIndex,
      ).progress;
      lapArmed = false;
      lapDistance = 0;
    }
    car.update(
      dt,
      { steer: 0, throttle: 0, frontBrake: 0, rearBrake: 0, handbrake: false },
      track,
    );
    return;
  }
  if (state === "race") {
    car.update(dt, ctl, track);
    // A marshal reset teleports the car; don't interpolate across the jump.
    if (car.recoverySnap) snapPose();
    raceTime += dt;
    lapTime += dt;
    recorder.record(lapTime, car);
    totalDistance += car.speed * dt;
    const here = track.nearest(car.x, car.z, car.y, car.trackIndex);
    const prog = here.progress;
    // Lap distance is signed progress along the course, not an odometer, so
    // reversing or shuffling back and forth near the line cannot build up a lap.
    let dProg = prog - lastProgress;
    if (dProg > 0.5) dProg -= 1;
    else if (dProg < -0.5) dProg += 1;
    lapDistance += dProg * track.length;
    // The start line is physically the same point as the lap seam. Do not allow the
    // first few meters of movement to count as a completed lap due to sample jitter.
    if (!lapArmed && prog > 0.12 && prog < 0.5) lapArmed = true;
    if (
      lapArmed &&
      lapDistance > track.length * 0.78 &&
      crossedLapForward(lastProgress, prog)
    ) {
      // Time the crossing within the step instead of rounding to the step edge.
      const overshoot = (prog / (prog + 1 - lastProgress)) * dt;
      const completed = lapTime - overshoot;
      laps.push({ time: completed, valid: lapValid });
      let message = "";
      if (lapValid) {
        bestLap = Math.min(bestLap, completed);
        audio.beep(880, 0.12);
        if (!record || completed < record.time) {
          saveRecord(track.id, completed, recorder.samples);
          record = { time: completed, ghost: recorder.samples };
          newRecord = true;
          ui.updateTrackRecord(track.id, record);
          ui.setTrackSelected(track.id, track, record);
          message = "NEW TRACK RECORD";
        }
      }
      lapTime = overshoot;
      recorder.reset();
      recorder.record(lapTime, car);
      lapValid = true;
      lap++;
      lapArmed = false;
      lapDistance = 0;
      if (lap === LAPS - 1)
        message = message ? `${message} · FINAL LAP` : "FINAL LAP";
      if (message && lap < LAPS) ui.toast(message);
      if (lap >= LAPS) {
        state = "finish";
        ui.setRaceMenuVisible(false);
        audio.stopVehicleSound?.();
        ui.finishRace(raceTime - overshoot, bestLap, laps, record, newRecord);
        ui.setFinishVisible(true);
      }
    }
    // If the player goes substantially off track, mark the lap dirty rather than
    // inventing a reset or invisible wall.
    if (Math.abs(here.lateral) > track.width * 0.75) lapValid = false;
    lastProgress = prog;
    const drift =
      car.speed > 10 && Math.abs(car.slipAngle) > 0.105
        ? clamp((Math.abs(car.slipAngle) - 0.08) / 0.25, 0, 1)
        : 0;
    const spinning =
      car.speed > 10 &&
      Math.abs(car.yawRate) > 1.05 &&
      Math.abs(car.slipAngle) > 0.28;
    if (spinning && !wasSpinning) {
      audio.spinout();
      wasSpinning = true;
    }
    if (!spinning) wasSpinning = false;
    redlinePulseTimer -= dt;
    if (car.rpm >= car.p.redline - 12 && redlinePulseTimer <= 0) {
      audio.redline();
      redlinePulseTimer = 0.24;
    }
    raceDrift = drift;
  }
}

let raceDrift = 0;
function loop(now) {
  const frameTime = Math.min(MAX_FRAME_TIME, (now - last) / 1000);
  last = now;
  const ctl = input.poll();
  handleFrameInput(ctl);
  accumulator += frameTime;
  while (accumulator >= STEP) {
    snapPose();
    simulate(STEP, ctl);
    accumulator -= STEP;
  }
  // Audio is driven once per frame from the latest simulated state. Updating it
  // during the countdown keeps a restart from holding the previous run's pitch.
  if (state === "countdown") audio.update(car.rpm, car.throttle, car.gear, 0, 0);
  else if (state === "race")
    audio.update(car.rpm, car.throttle, car.gear, car.skid, raceDrift);
  ui.hud(Math.min(lapTime, 99999), lap, LAPS, bestLap, raceTime);
  // The ghost replays the record lap at the current lap time; the accumulator
  // adds the sub-step remainder so it moves as smoothly as the player's car.
  const ghost =
    state === "race" && ghostEnabled
      ? ghostPose(record?.ghost, lapTime + accumulator)
      : null;
  renderer.render(interpolatedCar(accumulator / STEP), track, scenery, {
    ghost,
  });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
