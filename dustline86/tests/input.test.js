import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Input } from "../js/input.js";

let listeners, gamepads;

beforeEach(() => {
  listeners = {};
  gamepads = [];
  globalThis.addEventListener = (type, fn) => {
    (listeners[type] ||= []).push(fn);
  };
  Object.defineProperty(globalThis, "navigator", {
    value: { getGamepads: () => gamepads },
    configurable: true,
    writable: true,
  });
});

function fire(type, key, { repeat = false, target = null } = {}) {
  const e = {
    key,
    repeat,
    target: target || { closest: () => null },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  for (const fn of listeners[type] || []) fn(e);
  return e;
}
const down = (key, opts) => fire("keydown", key, opts);
const up = (key, opts) => fire("keyup", key, opts);

function pad({ steer = 0, throttle = 0, buttons = {} } = {}) {
  const b = Array.from({ length: 17 }, (_, i) => ({
    pressed: !!buttons[i],
    value: i === 7 ? throttle : buttons[i] ? 1 : 0,
  }));
  return { index: 0, id: "Test pad", axes: [steer, 0, 0, 0], buttons: b };
}

test("held keys drive the analog controls", () => {
  const input = new Input();
  down("w");
  down("a");
  down(" ");
  const c = input.poll();
  assert.equal(c.throttle, 1);
  assert.equal(c.steer, -1);
  assert.equal(c.handbrake, true);
  up("w");
  assert.equal(input.poll().throttle, 0);
});

test("overlapping left/right keys steer correctly", () => {
  // Regression: holding A, tapping D, then releasing D left steering at 0.
  const input = new Input();
  down("a");
  down("d");
  assert.equal(input.poll().steer, 0);
  up("d");
  assert.equal(input.poll().steer, -1);
});

test("one-shot actions fire once per press, not on key repeat", () => {
  const input = new Input();
  down("e");
  down("e", { repeat: true });
  down("e", { repeat: true });
  assert.equal(input.poll().up, true);
  assert.equal(input.poll().up, false);
  down("e", { repeat: true });
  assert.equal(input.poll().up, false);
});

test("a press shorter than a frame is not lost", () => {
  const input = new Input();
  down("q");
  up("q");
  assert.equal(input.poll().down, true);
});

test("keyboard still works with an idle gamepad connected", () => {
  // Regression: a connected gamepad overwrote keyboard input every poll.
  const input = new Input();
  gamepads = [pad()];
  down("w");
  down("d");
  const c = input.poll();
  assert.equal(c.throttle, 1);
  assert.equal(c.steer, 1);
});

test("gamepad and keyboard merge, stronger input wins", () => {
  const input = new Input();
  gamepads = [pad({ steer: -0.6, throttle: 0.5 })];
  let c = input.poll();
  assert.ok(c.steer < -0.5 && c.steer > -0.6);
  assert.ok(c.throttle > 0.45 && c.throttle < 0.5);
  down("w");
  c = input.poll();
  assert.equal(c.throttle, 1);
});

test("gamepad shoulder buttons shift once per press", () => {
  const input = new Input();
  gamepads = [pad({ buttons: { 5: true } })];
  assert.equal(input.poll().up, true);
  assert.equal(input.poll().up, false, "held button does not repeat");
  gamepads = [pad()];
  input.poll();
  gamepads = [pad({ buttons: { 5: true } })];
  assert.equal(input.poll().up, true);
});

test("Space is cancelled on keyup so focused buttons don't activate", () => {
  new Input();
  assert.equal(down(" ").defaultPrevented, true);
  assert.equal(up(" ").defaultPrevented, true);
});

test("keys typed into form controls are ignored", () => {
  const input = new Input();
  const slider = { closest: (sel) => (sel.includes("input") ? slider : null) };
  const e = down("arrowleft", { target: slider });
  assert.equal(e.defaultPrevented, false);
  assert.equal(input.poll().steer, 0);
});

test("losing window focus releases held keys", () => {
  const input = new Input();
  down("w");
  for (const fn of listeners.blur) fn();
  assert.equal(input.poll().throttle, 0);
});
