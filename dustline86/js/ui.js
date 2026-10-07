import { formatTime } from "./physics.js";

function formatKm(m) {
  return `${(m / 1000).toFixed(2)} KM`;
}

export class UI {
  constructor() {
    this.$ = (id) => document.getElementById(id);
    this.start = this.$("start-screen");
    this.finish = this.$("finish-screen");
    this.center = this.$("center-message");
    this.startBtn = this.$("start-button");
    this.restartBtn = this.$("restart-button");
    this.menuBtn = this.$("menu-button");
    this.raceMenuBtn = this.$("race-menu-button");
    this.gamepad = this.$("gamepad-status");
    this.debug = this.$("debug-panel");
    this.controls = this.$("debug-controls");
    this.trackGrid = this.$("track-grid");
    this.trackSubtitle = this.$("track-subtitle");
    this.trackMeta = this.$("selected-track-meta");
    this.trackDescription = this.$("selected-track-description");
    this.startBtn.onclick = () => this.onStart?.();
    this.restartBtn.onclick = () => this.onRestart?.();
    this.menuBtn.onclick = () => this.onMenu?.();
    this.raceMenuBtn.onclick = () => this.onMenu?.();
    this.$("fullscreen-button").onclick = () => this.onFullscreen?.();
    this.muteButton = this.$("mute-button");
    this.muteButton.onclick = () => this.onMute?.();
    this.setMuted?.(false);
    this.$("debug-toggle").onclick = () =>
      this.debug.classList.toggle("hidden");
    this.$("debug-close").onclick = () => this.debug.classList.add("hidden");
    this.$("reset-tuning").onclick = () => this.onReset?.();
    this.$("save-tuning").onclick = () => this.onSave?.();
    this.$("copy-tuning").onclick = () => this.onCopy?.();
  }
  bind(o) {
    Object.assign(this, o);
  }
  setMuted(muted) {
    if (!this.muteButton) return;
    this.muteButton.textContent = muted ? "🔇" : "🔊";
    this.muteButton.classList.toggle("muted", !!muted);
    this.muteButton.setAttribute(
      "aria-label",
      muted ? "Unmute audio" : "Mute audio",
    );
    this.muteButton.title = muted ? "Unmute audio" : "Mute audio";
  }
  setStartVisible(v) {
    this.start.classList.toggle("hidden", !v);
  }
  setFinishVisible(v) {
    this.finish.classList.toggle("hidden", !v);
  }
  countdown(text) {
    this.center.textContent = text;
    this.center.classList.remove("hidden");
  }
  hideCountdown() {
    this.center.classList.add("hidden");
  }
  setRaceMenuVisible(visible) {
    this.raceMenuBtn?.classList.toggle("hidden", !visible);
  }

  async copyTuning(params) {
    const groups = {
      Engine: [
        "engineTorque",
        "redline",
        "idleRPM",
        "rpmResponse",
        "reverseRatio",
        "finalDrive",
        "steerMax",
      ],
      Tires: [
        "tireFront",
        "tireRear",
        "longGrip",
        "latGrip",
        "tireStiffness",
        "slipPeak",
        "anglePeak",
        "surfaceShoulder",
      ],
      Brakes: ["frontBrake", "rearBrake", "brakeBias", "brakeLockup"],
      Vehicle: [
        "mass",
        "cgHeight",
        "wheelbase",
        "trackWidth",
        "weightFront",
        "steeringRatio",
        "diffLock",
        "drag",
        "downforce",
        "rolling",
      ],
      Suspension: ["suspensionStiffness", "suspensionDamping"],
    };
    const lines = ["DUSTLINE 86 VEHICLE TUNING", ""];
    for (const [group, names] of Object.entries(groups)) {
      lines.push(`[${group}]`);
      for (const name of names)
        lines.push(`${name} = ${Number(params[name]).toFixed(3)}`);
      lines.push("");
    }
    const text = lines.join("\n");
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      this.toast("Tuning copied to clipboard");
    } catch {
      this.toast("Clipboard access failed");
    }
  }

  setGamepad(name) {
    this.gamepad.textContent = name
      ? `Gamepad: ${name}`
      : "Gamepad: none (keyboard fallback)";
  }
  hud(car, lap, total, best, race) {
    this.$("lap-time").textContent = formatTime(lap);
    this.$("best-lap").textContent = formatTime(best);
    this.$("race-time").textContent = formatTime(race);
  }
  finishRace(total, best) {
    this.$("finish-time").textContent = formatTime(total);
    this.$("finish-best").textContent = formatTime(best);
  }
  toast(t) {
    const x = this.$("toast");
    x.textContent = t;
    x.classList.add("show");
    clearTimeout(this.tt);
    this.tt = setTimeout(() => x.classList.remove("show"), 1300);
  }

  renderTrackSelector(tracks, selectedId, onSelect) {
    this.trackGrid.innerHTML = "";
    for (const track of Object.values(tracks)) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "track-card";
      card.dataset.trackId = track.id;
      card.innerHTML = `<canvas class="track-preview" width="320" height="116"></canvas><div class="track-card-head"><span class="track-name"></span><span class="track-difficulty"></span></div><div class="track-card-meta"></div>`;
      card.querySelector(".track-name").textContent = track.name;
      card.querySelector(".track-difficulty").textContent = track.difficulty;
      card.querySelector(".track-card-meta").textContent =
        `${formatKm(track.length)} · ${track.subtitle}`;
      card.onclick = () => onSelect(track.id);
      this.trackGrid.appendChild(card);
      this.drawTrackPreview(card.querySelector("canvas"), track);
    }
    this.setTrackSelected(
      selectedId,
      tracks[selectedId] || Object.values(tracks)[0],
    );
  }

  drawTrackPreview(canvas, track) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width,
      h = canvas.height,
      p = 12;
    ctx.clearRect(0, 0, w, h);
    const theme = track.theme || {};
    ctx.fillStyle = theme.skyTop || "#5c7580";
    ctx.fillRect(0, 0, w, h * 0.58);
    ctx.fillStyle = theme.groundTop || "#7f6d52";
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    const xs = track.samples.map((s) => s.x),
      zs = track.samples.map((s) => s.z);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    const sx = (w - p * 2) / Math.max(1, maxX - minX),
      sz = (h - p * 2) / Math.max(1, maxZ - minZ),
      scale = Math.min(sx, sz);
    const ox = w / 2 - ((minX + maxX) / 2) * scale,
      oz = h / 2 - ((minZ + maxZ) / 2) * scale;
    const pt = (s) => [ox + s.x * scale, oz + s.z * scale];
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,.65)";
    ctx.lineWidth = Math.max(7, track.width * scale + 6);
    ctx.beginPath();
    for (let i = 0; i < track.samples.length; i++) {
      const [x, y] = pt(track.samples[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = theme.curbA || "#d05b46";
    ctx.lineWidth = Math.max(4, track.width * scale + 2);
    ctx.beginPath();
    for (let i = 0; i < track.samples.length; i++) {
      const [x, y] = pt(track.samples[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = theme.road || "#3c4645";
    ctx.lineWidth = Math.max(2, track.width * scale);
    ctx.beginPath();
    for (let i = 0; i < track.samples.length; i++) {
      const [x, y] = pt(track.samples[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    const start = pt(track.samples[0]);
    ctx.fillStyle = "#f4d37e";
    ctx.strokeStyle = "#171311";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start[0], start[1], 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  setTrackSelected(id, track) {
    if (!track) return;
    for (const card of this.trackGrid?.querySelectorAll(".track-card") || [])
      card.classList.toggle("selected", card.dataset.trackId === id);
    this.trackSubtitle.textContent = `SOLO TIME TRIAL / ${track.name.toUpperCase()}`;
    this.trackMeta.textContent = `${formatKm(track.length)} · ${track.difficulty}`;
    this.trackDescription.textContent = track.description;
  }

  buildDebug(params, onChange) {
    this.controls.innerHTML = "";
    const groups = {
      Engine: [
        "engineTorque",
        "redline",
        "idleRPM",
        "rpmResponse",
        "reverseRatio",
        "finalDrive",
        "steerMax",
      ],
      Tires: [
        "tireFront",
        "tireRear",
        "longGrip",
        "latGrip",
        "tireStiffness",
        "slipPeak",
        "anglePeak",
        "surfaceShoulder",
      ],
      Brakes: ["frontBrake", "rearBrake", "brakeBias", "brakeLockup"],
      Vehicle: [
        "mass",
        "cgHeight",
        "wheelbase",
        "trackWidth",
        "weightFront",
        "steeringRatio",
        "diffLock",
        "drag",
        "downforce",
        "rolling",
      ],
      Suspension: ["suspensionStiffness", "suspensionDamping"],
    };
    const ranges = {
      engineTorque: [50, 1500, 1],
      redline: [3000, 14000, 50],
      idleRPM: [400, 2500, 25],
      rpmResponse: [0.5, 30, 0.1],
      reverseRatio: [1, 6, 0.01],
      finalDrive: [1.5, 7, 0.01],
      steerMax: [0.1, 1.1, 0.01],
      tireFront: [0.2, 3, 0.01],
      tireRear: [0.2, 3, 0.01],
      longGrip: [0.2, 2.5, 0.01],
      latGrip: [0.2, 2.5, 0.01],
      tireStiffness: [0.5, 20, 0.1],
      slipPeak: [0.02, 0.4, 0.005],
      anglePeak: [0.02, 0.35, 0.005],
      surfaceShoulder: [0.2, 1.5, 0.01],
      frontBrake: [0.1, 3, 0.01],
      rearBrake: [0.1, 3, 0.01],
      brakeBias: [0.25, 0.95, 0.01],
      brakeLockup: [0.1, 2.5, 0.01],
      mass: [500, 2500, 10],
      cgHeight: [0.1, 1.5, 0.01],
      wheelbase: [1.5, 4.5, 0.01],
      trackWidth: [0.9, 2.3, 0.01],
      weightFront: [0.2, 0.8, 0.01],
      steeringRatio: [5, 30, 0.1],
      diffLock: [0, 1, 0.01],
      drag: [0, 2, 0.01],
      downforce: [0, 0.1, 0.001],
      rolling: [0, 0.1, 0.001],
      suspensionStiffness: [5000, 150000, 500],
      suspensionDamping: [250, 20000, 100],
    };
    for (const [group, names] of Object.entries(groups)) {
      const h = document.createElement("div");
      h.className = "debug-group";
      h.textContent = group;
      this.controls.appendChild(h);
      for (const name of names) {
        const r = ranges[name];
        if (!r) continue;
        const row = document.createElement("div");
        row.className = "debug-row";
        const label = document.createElement("label");
        label.textContent = name;
        const input = document.createElement("input");
        input.type = "range";
        [input.min, input.max, input.step] = r;
        input.value = params[name];
        const out = document.createElement("output");
        out.textContent = Number(params[name]).toFixed(3);
        input.oninput = () => {
          params[name] = +input.value;
          out.textContent = Number(params[name]).toFixed(3);
          onChange?.(name, +input.value);
        };
        row.append(label, input, out);
        this.controls.appendChild(row);
      }
    }
  }
}
