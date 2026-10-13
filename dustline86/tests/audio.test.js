import { test } from "node:test";
import assert from "node:assert/strict";
import { installLocalStorage } from "./helpers.js";
import { AudioEngine } from "../js/audio.js";

// Minimal Web Audio stand-in with the same node shapes as the real API: nodes
// expose AudioParams (objects with setTargetAtTime etc.), and only AudioParams
// can be automated.
class FakeParam {
  constructor(value = 0) {
    this.value = value;
    this.targets = [];
  }
  setTargetAtTime(v) {
    this.targets.push(v);
  }
  setValueAtTime(v) {
    this.value = v;
  }
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class FakeNode {
  connect() {}
  start() {}
  stop() {}
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = new FakeNode();
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam(1) });
  }
  createOscillator() {
    return Object.assign(new FakeNode(), {
      frequency: new FakeParam(440),
      type: "sine",
    });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), {
      frequency: new FakeParam(350),
      Q: new FakeParam(1),
      type: "lowpass",
    });
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    return Object.assign(new FakeNode(), { buffer: null, loop: false });
  }
}

function startedEngine() {
  installLocalStorage();
  globalThis.window = { AudioContext: FakeAudioContext };
  const audio = new AudioEngine();
  audio.start();
  return audio;
}

test("stopping vehicle sound silences every loop without throwing", () => {
  // Regression: this called setTargetAtTime on GainNodes rather than their gain
  // param, throwing a TypeError that froze the game loop at the finish line.
  const audio = startedEngine();
  assert.doesNotThrow(() => audio.stopVehicleSound());
  for (const loop of [audio.intake, audio.tireNoise, audio.driftNoise])
    assert.equal(loop.gain.gain.targets.at(-1), 0);
  assert.equal(audio.engineBus.gain.targets.at(-1), 0);
});

test("restarting restores the engine bus after it was stopped", () => {
  const audio = startedEngine();
  audio.stopVehicleSound();
  audio.start();
  assert.ok(audio.engineBus.gain.targets.at(-1) > 0);
});

test("engine pitch follows rpm", () => {
  const audio = startedEngine();
  audio.update(6000, 1, 3);
  assert.equal(audio.engineOsc[0].frequency.targets.at(-1), 100);
});

test("mute persists and silences the master bus", () => {
  const audio = startedEngine();
  assert.equal(audio.toggleMute(), true);
  assert.equal(localStorage.getItem("dustline86-muted"), "1");
  assert.equal(audio.master.gain.targets.at(-1), 0);
  assert.equal(new AudioEngine().muted, true);
});

test("sound effects are safe before audio has started", () => {
  installLocalStorage();
  const audio = new AudioEngine();
  for (const fn of ["stopVehicleSound", "redline", "spinout", "beep", "shift"])
    assert.doesNotThrow(() => audio[fn]());
  assert.doesNotThrow(() => audio.update(3000, 0.5, 2));
});
