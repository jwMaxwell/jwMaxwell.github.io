export class Input {
  constructor() {
    this.state = {
      steer: 0,
      throttle: 0,
      frontBrake: 0,
      rearBrake: 0,
      handbrake: false,
      up: false,
      down: false,
      reverse: false,
      restart: false,
      fullscreen: false,
      mute: false,
      ghost: false,
    };
    this.prev = { ...this.state };
    this.gpPrev = { up: false, down: false, options: false, triangle: false };
    this.gamepad = null;
    // Held keyboard controls are tracked as a key set so they can be merged with a
    // connected gamepad instead of being overwritten by it every frame.
    this.keys = new Set();
    addEventListener("keydown", (e) => this.key(e, true));
    addEventListener("keyup", (e) => this.key(e, false));
    // A key released while the window is unfocused never sends keyup.
    addEventListener("blur", () => this.keys.clear());
    addEventListener("gamepadconnected", (e) => {
      this.gamepad = e.gamepad;
    });
    addEventListener("gamepaddisconnected", (e) => {
      if (this.gamepad?.index === e.gamepad.index) this.gamepad = null;
    });
  }
  key(e, on) {
    // Leave typing and slider adjustment in form controls alone.
    if (e.target?.closest?.("input, textarea, select")) return;
    const k = e.key.toLowerCase();
    // Cancel on keyup too: buttons activate from Space on release, so a MENU or
    // mute button focused by an earlier click would otherwise fire on handbrake.
    if (
      [
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        " ",
        "q",
        "e",
        "r",
        "f",
        "z",
        "s",
        "x",
      ].includes(k)
    )
      e.preventDefault();

    if (on) this.keys.add(k);
    else this.keys.delete(k);
    // One-shot actions fire once per physical press, not on OS key repeat.
    if (!on || e.repeat) return;
    switch (k) {
      case "e":
        this.state.up = true;
        break;
      case "q":
        this.state.down = true;
        break;
      case "x":
        this.state.reverse = true;
        break;
      case "r":
        this.state.restart = true;
        break;
      case "f":
        this.state.fullscreen = true;
        break;
      case "m":
        this.state.mute = true;
        break;
      case "g":
        this.state.ghost = true;
        break;
    }
  }
  keyboardControls() {
    const held = (...names) => names.some((n) => this.keys.has(n));
    return {
      steer:
        (held("d", "arrowright") ? 1 : 0) - (held("a", "arrowleft") ? 1 : 0),
      throttle: held("w", "arrowup") ? 1 : 0,
      frontBrake: held("s", "arrowdown") ? 1 : 0,
      rearBrake: held("z") ? 1 : 0,
      handbrake: held(" "),
    };
  }
  poll() {
    const kb = this.keyboardControls();
    Object.assign(this.state, kb);
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.gamepad) this.gamepad = gps[this.gamepad.index] || this.gamepad;
    else this.gamepad = [...gps].find(Boolean) || null;
    if (this.gamepad) {
      const b = this.gamepad.buttons,
        a = this.gamepad.axes;
      const dz = 0.08,
        raw = a[0] || 0;
      const analogDeadzone = (v) =>
        Math.abs(v) < 0.035
          ? 0
          : ((v < 0 ? -1 : 1) * (Math.abs(v) - 0.035)) / 0.965;
      const padSteer =
        Math.abs(raw) < dz
          ? 0
          : (Math.sign(raw) * (Math.abs(raw) - dz)) / (1 - dz);
      // Keyboard and gamepad are merged; the stronger input wins.
      if (Math.abs(padSteer) > Math.abs(kb.steer)) this.state.steer = padSteer;
      // Standard mapping: R2 7, L2 6, Square 2, Cross 0, L1 4, R1 5, Options 9.
      this.state.throttle = Math.max(
        kb.throttle,
        analogDeadzone(b[7]?.value ?? 0),
      );
      this.state.frontBrake = Math.max(
        kb.frontBrake,
        analogDeadzone(b[6]?.value ?? 0),
      );
      this.state.rearBrake = b[2]?.pressed ? 1 : kb.rearBrake;
      this.state.handbrake = !!b[0]?.pressed || kb.handbrake;

      const up = !!b[5]?.pressed;
      const down = !!b[4]?.pressed;
      const options = !!b[9]?.pressed;
      const triangle = !!b[3]?.pressed;

      if (up && !this.gpPrev.up) this.state.up = true;
      if (down && !this.gpPrev.down) this.state.down = true;
      if (options && !this.gpPrev.options) this.state.restart = true;
      if (triangle && !this.gpPrev.triangle) this.state.reverse = true;

      this.gpPrev = { up, down, options, triangle };
    }
    const out = { ...this.state };
    this.prev = { ...this.state };
    this.state.up = false;
    this.state.down = false;
    this.state.reverse = false;
    this.state.restart = false;
    this.state.fullscreen = false;
    this.state.mute = false;
    this.state.ghost = false;
    return out;
  }
  connectedName() {
    return this.gamepad?.id || null;
  }
}
