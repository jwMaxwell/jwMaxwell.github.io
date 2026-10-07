function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineBus = null;
    this.effectsBus = null;
    this.engineFilter = null;
    this.engineOsc = [];
    this.engineGains = [];
    this.intake = null;
    this.tireNoise = null;
    this.tireFilter = null;
    this.muted = localStorage.getItem("dustline86-muted") === "1";
    this.lastRpm = 0;
    this.lastGear = 1;
    this.lastTire = 0;
    this.lastDrift = 0;
  }

  start() {
    if (this.ctx) {
      this.ctx.resume?.();
      this.engineBus?.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.035);
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.075;
    this.master.connect(this.ctx.destination);
    this.engineBus = this.ctx.createGain();
    this.engineBus.gain.value = 0.9;
    this.engineBus.connect(this.master);
    this.effectsBus = this.ctx.createGain();
    this.effectsBus.gain.value = 1;
    this.effectsBus.connect(this.master);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 1200;
    this.engineFilter.Q.value = 0.8;
    this.engineFilter.connect(this.engineBus);
    const partials = [1, 2, 3, 4.01];
    const levels = [0.025, 0.01, 0.006, 0.003];
    for (let i = 0; i < partials.length; i++) {
      const o = this.ctx.createOscillator();
      o.type = i === 0 ? "sawtooth" : i === 3 ? "triangle" : "square";
      const g = this.ctx.createGain();
      g.gain.value = levels[i];
      o.connect(g);
      g.connect(this.engineFilter);
      o.start();
      this.engineOsc.push(o);
      this.engineGains.push(g);
    }

    // Intake/exhaust texture from filtered broadband noise, kept quiet so it feels
    // like mechanical texture rather than a constant television hiss.
    this.intake = this.createNoiseLoop("bandpass", 950, 0.9);
    this.tireNoise = this.createNoiseLoop("bandpass", 1450, 2.1);
    this.tireFilter = this.tireNoise.filter;
    this.driftNoise = this.createNoiseLoop("highpass", 2100, 0.7);
  }

  createNoiseLoop(type, freq, Q) {
    const buffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * 2,
      this.ctx.sampleRate,
    );
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const n = Math.random() * 2 - 1;
      d[i] = n * (0.72 + 0.28 * Math.sin(i * 0.0007));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = Q;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsBus);
    src.start();
    return { src, filter, gain };
  }

  setMuted(flag) {
    this.muted = !!flag;
    localStorage.setItem("dustline86-muted", this.muted ? "1" : "0");
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.075, t, 0.025);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  update(rpm, throttle, gear, skid = 0, drift = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const r = clamp(rpm, 400, 10000),
      t = clamp(throttle, 0, 1),
      s = clamp(skid, 0, 1),
      d = clamp(drift, 0, 1);
    // Fundamental follows crank speed; upper harmonics add the sharper mechanical bite
    // that the old single sawtooth could not provide.
    const crank = r / 60;
    const load = clamp(0.28 + t * 0.72, 0, 1);
    this.engineOsc[0].frequency.setTargetAtTime(
      Math.max(20, crank),
      now,
      0.025,
    );
    this.engineOsc[1].frequency.setTargetAtTime(
      Math.max(35, crank * 2),
      now,
      0.025,
    );
    this.engineOsc[2].frequency.setTargetAtTime(
      Math.max(45, crank * 3),
      now,
      0.025,
    );
    this.engineOsc[3].frequency.setTargetAtTime(
      Math.max(30, crank * 4.01),
      now,
      0.025,
    );
    this.engineFilter.frequency.setTargetAtTime(
      650 + 1100 * load + (gear < 0 ? 90 : 0),
      now,
      0.05,
    );
    const base = 0.021 + load * 0.033 + s * 0.004;
    this.engineGains[0].gain.setTargetAtTime(base, now, 0.035);
    this.engineGains[1].gain.setTargetAtTime(0.008 + load * 0.01, now, 0.035);
    this.engineGains[2].gain.setTargetAtTime(0.004 + load * 0.007, now, 0.035);
    this.engineGains[3].gain.setTargetAtTime(0.0015 + load * 0.004, now, 0.035);
    if (this.intake) {
      this.intake.filter.frequency.setTargetAtTime(
        700 + 1850 * t + 250 * d,
        now,
        0.05,
      );
      this.intake.gain.gain.setTargetAtTime(t * (0.008 + 0.014 * d), now, 0.06);
    }
    if (this.tireNoise) {
      this.tireFilter.frequency.setTargetAtTime(
        900 + 2200 * d + 750 * s,
        now,
        0.035,
      );
      this.tireNoise.gain.gain.setTargetAtTime(
        clamp(s * 0.009 + d * 0.01, 0, 0.024),
        now,
        0.04,
      );
    }
    if (this.driftNoise) {
      this.driftNoise.filter.frequency.setTargetAtTime(
        1650 + 1700 * d,
        now,
        0.03,
      );
      this.driftNoise.gain.gain.setTargetAtTime(
        clamp(d * 0.025, 0, 0.03),
        now,
        0.035,
      );
    }
    this.lastRpm = r;
    this.lastTire = s;
    this.lastDrift = d;
    this.lastGear = gear;
  }

  stopVehicleSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.engineBus?.gain.setTargetAtTime(0, now, 0.035);
    for (const source of [this.intake, this.tireNoise, this.driftNoise])
      source?.gain.setTargetAtTime(0, now, 0.035);
  }

  shift(direction = 1, gear = 1) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const low = this.ctx.createOscillator(),
      body = this.ctx.createOscillator(),
      g = this.ctx.createGain(),
      noise = this.ctx.createOscillator(),
      ng = this.ctx.createGain();
    low.type = "square";
    body.type = "sawtooth";
    noise.type = "square";
    low.frequency.setValueAtTime(92, now);
    low.frequency.exponentialRampToValueAtTime(58, now + 0.085);
    body.frequency.setValueAtTime(170, now);
    body.frequency.exponentialRampToValueAtTime(95, now + 0.11);
    noise.frequency.setValueAtTime(31, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.065, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.024, now + 0.006);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    low.connect(g);
    body.connect(g);
    noise.connect(ng);
    g.connect(this.effectsBus);
    ng.connect(this.effectsBus);
    low.start(now);
    body.start(now);
    noise.start(now);
    low.stop(now + 0.14);
    body.stop(now + 0.14);
    noise.stop(now + 0.07);
  }

  redline() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(2520, now);
    o.frequency.exponentialRampToValueAtTime(2050, now + 0.065);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.018, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    o.connect(g);
    g.connect(this.effectsBus);
    o.start(now);
    o.stop(now + 0.08);
  }

  spinout() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain(),
      f = this.ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(980, now);
    o.frequency.exponentialRampToValueAtTime(240, now + 0.42);
    f.type = "bandpass";
    f.frequency.value = 900;
    f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.055, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    o.connect(f);
    f.connect(g);
    g.connect(this.effectsBus);
    o.start(now);
    o.stop(now + 0.46);
  }

  beep(freq = 440, duration = 0.08) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.frequency.value = freq;
    o.type = "square";
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(this.effectsBus);
    o.start();
    g.gain.exponentialRampToValueAtTime(
      0.0001,
      this.ctx.currentTime + duration,
    );
    o.stop(this.ctx.currentTime + duration);
  }
}
