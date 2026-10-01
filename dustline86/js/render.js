/*
  Deterministic software pseudo-3D renderer.
  World geometry stays in fixed track coordinates. The camera only changes the
  projection, so road markings and scenery no longer slide as the car advances.
*/

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function normalize3(x, y, z) {
  const m = Math.hypot(x, y, z) || 1;
  return [x / m, y / m, z / m];
}
function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}
function fogColor(hex, fog) {
  const [r, g, b] = hexToRgb(hex),
    fr = 126,
    fg = 133,
    fb = 125;
  return rgbToHex(r + (fr - r) * fog, g + (fg - g) * fog, b + (fb - b) * fog);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: false });
    if (!this.ctx) throw new Error("Canvas 2D unavailable");
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.fov = (Math.PI * 70) / 180;
    this.near = 0.6;
    this.far = 380;
    this.camera = {
      x: 0,
      y: 0,
      z: 0,
      forward: [1, 0, 0],
      right: [0, 0, 1],
      up: [0, 1, 0],
    };
    this.nearest = null;
    this.wheelVisual = 0;
    this.roadScale = 0.72;
    this.roadCanvas = document.createElement("canvas");
    this.roadCtx = this.roadCanvas.getContext("2d", { alpha: true });
    this.roadImage = null;
    this.roadDepth = null;
  }

  // Kept for compatibility with main.js and older builds. The current renderer is
  // entirely procedural and does not need a GPU mesh upload.
  upload() {
    return;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width * dpr)),
      h = Math.max(1, Math.floor(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    const rw = Math.max(320, Math.floor(w * this.roadScale)),
      rh = Math.max(180, Math.floor(h * this.roadScale));
    if (this.roadCanvas.width !== rw || this.roadCanvas.height !== rh) {
      this.roadCanvas.width = rw;
      this.roadCanvas.height = rh;
      this.roadImage = this.roadCtx.createImageData(rw, rh);
      this.roadDepth = new Float32Array(rw * rh);
    }
  }

  setupCamera(car, track) {
    const nearest = track.nearest(car.x, car.z, car.y, car.trackIndex);
    const pitch = clamp(
      Number.isFinite(car.pitch) ? car.pitch : nearest.point.pitch || 0,
      -0.42,
      0.42,
    );
    const yaw = car.yaw;
    const cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const forward = normalize3(cy * cp, sp, sy * cp);
    const right = normalize3(-sy, 0, cy);
    const up = normalize3(...cross3(right, forward));

    const camForward = 0.08,
      camRight = -0.16,
      camUp = 0.62;
    this.camera.x = car.x + forward[0] * camForward + right[0] * camRight;
    this.camera.y = car.y + camUp + forward[1] * camForward;
    this.camera.z = car.z + forward[2] * camForward + right[2] * camRight;
    this.camera.forward = forward;
    this.camera.right = right;
    this.camera.up = up;
    this.nearest = nearest;
  }

  cameraPoint(x, y, z) {
    const c = this.camera,
      dx = x - c.x,
      dy = y - c.y,
      dz = z - c.z,
      f = c.forward,
      r = c.right,
      u = c.up;
    return {
      lateral: dx * r[0] + dy * r[1] + dz * r[2],
      vertical: dx * u[0] + dy * u[1] + dz * u[2],
      depth: dx * f[0] + dy * f[1] + dz * f[2],
    };
  }

  projectCP(cp) {
    if (cp.depth < this.near || cp.depth > this.far) return null;
    const focal = (this.h * 0.5) / Math.tan(this.fov * 0.5),
      scale = focal / cp.depth;
    return {
      x: this.w * 0.5 + cp.lateral * scale,
      y: this.h * 0.43 - cp.vertical * scale,
      depth: cp.depth,
      scale,
    };
  }
  project(x, y, z) {
    return this.projectCP(this.cameraPoint(x, y, z));
  }

  spriteGeometry(s) {
    const scale = Number.isFinite(s?.scale) ? s.scale : 1;
    switch (s?.type) {
      case "cactus":
        return { worldHeight: 4.8 * scale, widthRatio: 0.52 };
      case "marker":
        return { worldHeight: 4.4 * scale, widthRatio: 0.68 };
      case "rock":
        return { worldHeight: 2.0 * scale, widthRatio: 1.05 };
      default:
        return { worldHeight: 3.0 * scale, widthRatio: 0.72 };
    }
  }

  clipCamera(poly) {
    let out = poly;
    for (const evalPlane of [
      (p) => p.depth - this.near,
      (p) => this.far - p.depth,
    ]) {
      if (!out.length) break;
      const next = [];
      for (let i = 0; i < out.length; i++) {
        const a = out[i],
          b = out[(i + 1) % out.length],
          da = evalPlane(a),
          db = evalPlane(b),
          ina = da >= 0,
          inb = db >= 0;
        if (ina && inb) next.push(b);
        else if (ina && !inb) {
          const t = da / (da - db);
          next.push({
            lateral: lerp(a.lateral, b.lateral, t),
            vertical: lerp(a.vertical, b.vertical, t),
            depth: lerp(a.depth, b.depth, t),
          });
        } else if (!ina && inb) {
          const t = da / (da - db);
          next.push({
            lateral: lerp(a.lateral, b.lateral, t),
            vertical: lerp(a.vertical, b.vertical, t),
            depth: lerp(a.depth, b.depth, t),
          });
          next.push(b);
        }
      }
      out = next;
    }
    return out;
  }

  drawPolyCP(ctx, poly, fill, alpha = 1) {
    const clipped = this.clipCamera(poly);
    if (clipped.length < 3) return;
    const pts = [];
    for (const p of clipped) {
      const q = this.projectCP(p);
      if (q) pts.push(q);
    }
    if (pts.length < 3) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  triangleWorld(ctx, a, b, c, fill, alpha = 1) {
    this.drawPolyCP(
      ctx,
      [this.cameraPoint(...a), this.cameraPoint(...b), this.cameraPoint(...c)],
      fill,
      alpha,
    );
  }
  quadTriangles(ctx, a, b, c, d, fill, alpha = 1) {
    this.triangleWorld(ctx, a, b, c, fill, alpha);
    this.triangleWorld(ctx, a, c, d, fill, alpha);
  }

  render(car, track, scenery, telemetry = {}) {
    this.resize();
    const ctx = this.ctx,
      w = this.w,
      h = this.h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    this.setupCamera(car, track);
    this.drawSky(ctx, w, h);
    this.drawMountains(ctx, w, h);
    this.drawGround(ctx, w, h, h * 0.43);

    // Near and mid-distance desert are world geometry, not a screen-space paint fill.
    // Road, terrain, and scenery share one depth buffer so hills and pavement can
    // correctly occlude objects instead of letting sprites float through them.
    this.drawWorld(track, scenery);
    this.drawCockpit(ctx, w, h, car);
  }

  drawSky(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.68);
    g.addColorStop(0, "#5c9ec2");
    g.addColorStop(0.48, "#a9ced0");
    g.addColorStop(1, "#d6bb82");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * 0.72);
    ctx.fillStyle = "rgba(248,243,220,.58)";
    for (const c of [
      [0.16, 0.16, 0.16, 0.02],
      [0.72, 0.12, 0.2, 0.025],
      [0.5, 0.25, 0.1, 0.014],
    ]) {
      ctx.fillRect(w * c[0], h * c[1], w * c[2], h * c[3]);
      ctx.fillRect(
        w * (c[0] + 0.03),
        h * (c[1] - 0.012),
        w * c[2] * 0.48,
        h * c[3] * 1.5,
      );
    }
  }

  drawMountains(ctx, w, h) {
    const base = h * 0.48;
    const layers = [
      [
        "#62766f",
        [0, 0.28, 0.17, 0.18, 0.35, 0.24, 0.53, 0.16, 0.76, 0.24, 1, 0.2],
      ],
      [
        "#465c56",
        [0, 0.16, 0.18, 0.27, 0.34, 0.16, 0.54, 0.29, 0.76, 0.2, 1, 0.15],
      ],
    ];
    for (const [color, a] of layers) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, base + 34);
      for (let i = 0; i < a.length; i += 2)
        ctx.lineTo(w * a[i], base - h * a[i + 1] * 0.16);
      ctx.lineTo(w, base + 34);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawGround(ctx, w, h, horizon) {
    const g = ctx.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, "#9e8560");
    g.addColorStop(0.55, "#6e6047");
    g.addColorStop(1, "#39342c");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, w, h - horizon);
    // Screen-space horizon bands are only a distant backdrop. All near ground is
    // world-space geometry below, so these cannot make the track appear to scroll.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#d2b77d";
    for (let i = 0; i < 10; i++) {
      const yy = horizon + (h - horizon) * Math.pow(i / 10, 1.7);
      ctx.fillRect(0, yy, w, Math.max(1, (h - horizon) / 48));
    }
    ctx.globalAlpha = 1;
  }

  trackRingIndices(center, n, back = 260, ahead = 300) {
    const ids = [];
    for (let k = -back; k <= ahead; k++) ids.push((center + k + n) % n);
    return ids;
  }

  cameraPolyDepth(poly) {
    let sum = 0;
    for (const p of poly) sum += p.depth;
    return sum / poly.length;
  }

  roadColor(hex) {
    const [r, g, b] = hexToRgb(hex);
    return [r, g, b, 255];
  }

  rasterTriangle(v0, v1, v2, color, bias = 0) {
    const rw = this.roadCanvas.width,
      rh = this.roadCanvas.height,
      sx = rw / this.w,
      sy = rh / this.h;
    const x0 = v0.x * sx,
      y0 = v0.y * sy,
      x1 = v1.x * sx,
      y1 = v1.y * sy,
      x2 = v2.x * sx,
      y2 = v2.y * sy;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))),
      maxX = Math.min(rw - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))),
      maxY = Math.min(rh - 1, Math.ceil(Math.max(y0, y1, y2)));
    if (minX > maxX || minY > maxY) return;
    const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (Math.abs(area) < 1e-6) return;
    const inv = 1 / area,
      data = this.roadImage.data,
      depth = this.roadDepth,
      rgba = this.roadColor(color);
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        // Edge-function weights are ordered by opposite vertex: w0=v2, w1=v0, w2=v1.
        const w0 = ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) * inv;
        const w1 = ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) * inv;
        const w2 = ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) * inv;
        if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
        // Perspective-correct depth is important when a sprite/terrain polygon crosses
        // the road at a steep viewing angle. Interpolating camera-space Z directly can
        // make the far edge win the depth test and produces the exact popping the game had.
        const invZ =
          w1 / Math.max(v0.depth, 1e-6) +
          w2 / Math.max(v1.depth, 1e-6) +
          w0 / Math.max(v2.depth, 1e-6);
        const d = 1 / Math.max(invZ, 1e-9) + bias,
          idx = y * rw + x;
        if (d >= depth[idx]) continue;
        depth[idx] = d;
        const o = idx * 4;
        data[o] = rgba[0];
        data[o + 1] = rgba[1];
        data[o + 2] = rgba[2];
        data[o + 3] = 255;
      }
    }
  }

  rasterPoly(poly, color, bias = 0) {
    const clipped = this.clipCamera(poly);
    if (clipped.length < 3) return;
    const pts = [];
    for (const p of clipped) {
      const q = this.projectCP(p);
      if (q) pts.push(q);
    }
    if (pts.length < 3) return;
    // Fan triangulation is safe for the clipped convex road/curb polygons.
    for (let i = 1; i < pts.length - 1; i++)
      this.rasterTriangle(pts[0], pts[i], pts[i + 1], color, bias);
  }

  drawWorld(track, scenery) {
    const rctx = this.roadCtx,
      rw = this.roadCanvas.width,
      rh = this.roadCanvas.height;
    const data = this.roadImage.data,
      depth = this.roadDepth;
    data.fill(0);
    depth.fill(Infinity);

    this.drawWorldTerrain(track);
    this.drawRoad(track);
    this.drawSceneryDepth(scenery);

    rctx.putImageData(this.roadImage, 0, 0);
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.roadCanvas, 0, 0, this.w, this.h);
    this.ctx.restore();
  }

  drawWorldTerrain(track) {
    const n = track.samples.length,
      center = this.nearest.index;
    const ids = this.trackRingIndices(center, n, 245, 285);
    // Four expanding ground bands on each side. Every vertex lives in track/world
    // coordinates, so the ground moves and rises with the terrain instead of being a
    // fixed screen-space desert rectangle.
    const bands = [
      { inner: track.width * 0.5 - 0.02, outer: 18, color: "#806a50" },
      { inner: 18, outer: 42, color: "#746149" },
      { inner: 42, outer: 78, color: "#685744" },
      { inner: 78, outer: 132, color: "#5d5041" },
    ];
    const bandCount = bands.length;
    for (let q = 0; q < ids.length - 1; q++) {
      const i = ids[q],
        j = ids[q + 1],
        a = track.samples[i],
        b = track.samples[j];
      for (let side = -1; side <= 1; side += 2) {
        for (let bi = 0; bi < bandCount; bi++) {
          const band = bands[bi],
            ia = band.inner * side,
            oa = band.outer * side;
          const ay = a.y - 0.22 - Math.abs(ia) * 0.012,
            by = b.y - 0.22 - Math.abs(ia) * 0.012;
          const aY2 = a.y - 0.22 - Math.abs(oa) * 0.012,
            bY2 = b.y - 0.22 - Math.abs(oa) * 0.012;
          const p0 = [a.x + a.nx * ia, ay, a.z + a.nz * ia];
          const p1 = [a.x + a.nx * oa, aY2, a.z + a.nz * oa];
          const p2 = [b.x + b.nx * oa, bY2, b.z + b.nz * oa];
          const p3 = [b.x + b.nx * ia, by, b.z + b.nz * ia];
          const fog = clamp(
            (this.cameraPolyDepth([
              this.cameraPoint(...p0),
              this.cameraPoint(...p1),
              this.cameraPoint(...p2),
              this.cameraPoint(...p3),
            ]) -
              75) /
              (this.far - 75),
            0,
            1,
          );
          this.rasterPoly(
            [
              this.cameraPoint(...p0),
              this.cameraPoint(...p1),
              this.cameraPoint(...p2),
              this.cameraPoint(...p3),
            ],
            fogColor(band.color, fog),
            0,
          );
        }
      }
    }
  }

  drawRoad(track) {
    const n = track.samples.length,
      center = this.nearest.index,
      W = track.width * 0.5;
    const ids = this.trackRingIndices(center, n, 260, 300);
    for (let q = 0; q < ids.length - 1; q++) {
      const i = ids[q],
        j = ids[q + 1],
        a = track.samples[i],
        b = track.samples[j];
      const leftA = [a.x - a.nx * W, a.y + 0.045, a.z - a.nz * W];
      const rightA = [a.x + a.nx * W, a.y + 0.045, a.z + a.nz * W];
      const leftB = [b.x - b.nx * W, b.y + 0.045, b.z - b.nz * W];
      const rightB = [b.x + b.nx * W, b.y + 0.045, b.z + b.nz * W];
      const poly = [
        this.cameraPoint(...leftA),
        this.cameraPoint(...rightA),
        this.cameraPoint(...rightB),
        this.cameraPoint(...leftB),
      ];
      const minD = Math.min(...poly.map((p) => p.depth)),
        maxD = Math.max(...poly.map((p) => p.depth));
      if (maxD < this.near || minD > this.far) continue;
      const fog = clamp(
        (this.cameraPolyDepth(poly) - 95) / (this.far - 95),
        0,
        1,
      );
      this.rasterPoly(
        poly,
        fogColor(i % 28 < 4 ? "#4c5553" : "#353d3f", fog),
        -0.045,
      );

      const curbW = 0.22,
        half = 0.11;
      const leftOuterA = [
        a.x - a.nx * (W + curbW),
        a.y + 0.068,
        a.z - a.nz * (W + curbW),
      ];
      const leftRoadA = [a.x - a.nx * W, a.y + 0.055, a.z - a.nz * W];
      const leftRoadB = [b.x - b.nx * W, b.y + 0.055, b.z - b.nz * W];
      const leftOuterB = [
        b.x - b.nx * (W + curbW),
        b.y + 0.068,
        b.z - b.nz * (W + curbW),
      ];
      const rightRoadA = [a.x + a.nx * W, a.y + 0.055, a.z + a.nz * W];
      const rightOuterA = [
        a.x + a.nx * (W + curbW),
        a.y + 0.068,
        a.z + a.nz * (W + curbW),
      ];
      const rightOuterB = [
        b.x + b.nx * (W + curbW),
        b.y + 0.068,
        b.z + b.nz * (W + curbW),
      ];
      const rightRoadB = [b.x + b.nx * W, b.y + 0.055, b.z + b.nz * W];
      const curbColor = fogColor(i % 10 < 5 ? "#d05b46" : "#e5d39a", fog);
      this.rasterPoly(
        [
          this.cameraPoint(...leftOuterA),
          this.cameraPoint(...leftRoadA),
          this.cameraPoint(...leftRoadB),
          this.cameraPoint(...leftOuterB),
        ],
        curbColor,
        -0.06,
      );
      this.rasterPoly(
        [
          this.cameraPoint(...rightRoadA),
          this.cameraPoint(...rightOuterA),
          this.cameraPoint(...rightOuterB),
          this.cameraPoint(...rightRoadB),
        ],
        curbColor,
        -0.06,
      );
      if (i % 6 < 2) {
        const da = [a.x - a.nx * half, a.y + 0.078, a.z - a.nz * half],
          db = [a.x + a.nx * half, a.y + 0.078, a.z + a.nz * half];
        const dc = [b.x - b.nx * half, b.y + 0.078, b.z - b.nz * half],
          dd = [b.x + b.nx * half, b.y + 0.078, b.z + b.nz * half];
        this.rasterPoly(
          [
            this.cameraPoint(...da),
            this.cameraPoint(...db),
            this.cameraPoint(...dd),
            this.cameraPoint(...dc),
          ],
          fogColor("#dbc78f", fog),
          -0.072,
        );
      }
    }
  }

  billboardPoly(s, baseY, worldHeight, points) {
    const f = this.camera.forward,
      r = this.camera.right;
    const geom = this.spriteGeometry(s);
    const half = worldHeight * geom.widthRatio * 0.5;
    const base = { x: s.x, y: baseY, z: s.z },
      top = { x: s.x, y: baseY + worldHeight, z: s.z };
    return points.map(([u, v]) => {
      const ww = u * half;
      const yy = base.y + (top.y - base.y) * v;
      return [base.x + r[0] * ww, yy, base.z + r[2] * ww];
    });
  }

  drawSceneryDepth(scenery) {
    const drawList = [];
    for (const s of scenery) {
      const baseY = s.groundY ?? s.y,
        geom = this.spriteGeometry(s),
        baseCP = this.cameraPoint(s.x, baseY, s.z);
      if (baseCP.depth < this.near * 0.75 || baseCP.depth > this.far) continue;
      drawList.push({ s, baseY, geom, depth: baseCP.depth });
    }
    drawList.sort((a, b) => b.depth - a.depth);
    for (const item of drawList) {
      const { s, baseY, geom } = item,
        h = geom.worldHeight;
      const fog = clamp((item.depth - 55) / (this.far - 55), 0, 1);
      const color = (type) => fogColor(type, fog);
      if (s.type === "rock") {
        const pts = this.billboardPoly(s, baseY, h, [
          [-1, 0],
          [-0.78, 0.48],
          [-0.1, 1],
          [0.88, 0.48],
          [1, 0],
        ]);
        this.rasterPoly(
          pts.map((p) => this.cameraPoint(...p)),
          color("#5b5044"),
          0,
        );
        const hi = this.billboardPoly(s, baseY, h, [
          [-0.3, 0.47],
          [0.02, 0.76],
          [0.3, 0.61],
          [0.23, 0.51],
        ]);
        this.rasterPoly(
          hi.map((p) => this.cameraPoint(...p)),
          color("#8f7a59"),
          -0.01,
        );
      } else if (s.type === "marker") {
        const pole = this.billboardPoly(s, baseY, h, [
          [-0.18, 0],
          [0.18, 0],
          [0.18, 1],
          [-0.18, 1],
        ]);
        this.rasterPoly(
          pole.map((p) => this.cameraPoint(...p)),
          color("#dbc27c"),
          0,
        );
        const flag = this.billboardPoly(s, baseY, h, [
          [-0.45, 0.78],
          [0.45, 0.78],
          [0.45, 1],
          [-0.45, 1],
        ]);
        this.rasterPoly(
          flag.map((p) => this.cameraPoint(...p)),
          color("#a8483e"),
          -0.005,
        );
      } else {
        const trunk = this.billboardPoly(s, baseY, h, [
          [-0.24, 0],
          [0.24, 0],
          [0.24, 0.92],
          [-0.24, 0.92],
        ]);
        this.rasterPoly(
          trunk.map((p) => this.cameraPoint(...p)),
          color("#2e5535"),
          0,
        );
        const armL = this.billboardPoly(s, baseY, h, [
          [-0.72, 0.52],
          [-0.18, 0.52],
          [-0.18, 0.65],
          [-0.72, 0.65],
        ]);
        const armR = this.billboardPoly(s, baseY, h, [
          [0.18, 0.43],
          [0.72, 0.43],
          [0.72, 0.56],
          [0.18, 0.56],
        ]);
        this.rasterPoly(
          armL.map((p) => this.cameraPoint(...p)),
          color("#2e5535"),
          -0.002,
        );
        this.rasterPoly(
          armR.map((p) => this.cameraPoint(...p)),
          color("#2e5535"),
          -0.002,
        );
        const crown = this.billboardPoly(s, baseY, h, [
          [-0.55, 0.86],
          [0.55, 0.86],
          [0.38, 1],
          [-0.38, 1],
        ]);
        this.rasterPoly(
          crown.map((p) => this.cameraPoint(...p)),
          color("#4c7542"),
          -0.003,
        );
      }
    }
  }

  drawRoadDetails(s, W) {
    const ctx = this.ctx,
      i = s.i,
      a = s.a,
      b = s.b,
      fog = s.fog;
    const curbW = 0.22,
      half = 0.11;
    const leftOuterA = [
      a.x - a.nx * (W + curbW),
      a.y + 0.068,
      a.z - a.nz * (W + curbW),
    ];
    const leftRoadA = [a.x - a.nx * W, a.y + 0.055, a.z - a.nz * W];
    const leftRoadB = [b.x - b.nx * W, b.y + 0.055, b.z - b.nz * W];
    const leftOuterB = [
      b.x - b.nx * (W + curbW),
      b.y + 0.068,
      b.z - b.nz * (W + curbW),
    ];
    const rightRoadA = [a.x + a.nx * W, a.y + 0.055, a.z + a.nz * W];
    const rightOuterA = [
      a.x + a.nx * (W + curbW),
      a.y + 0.068,
      a.z + a.nz * (W + curbW),
    ];
    const rightOuterB = [
      b.x + b.nx * (W + curbW),
      b.y + 0.068,
      b.z + b.nz * (W + curbW),
    ];
    const rightRoadB = [b.x + b.nx * W, b.y + 0.055, b.z + b.nz * W];
    const curbColor = fogColor(i % 10 < 5 ? "#d05b46" : "#e5d39a", fog);

    // Details are clipped camera-space quads too. Drawing them as independent
    // triangles was another source of grazing-angle seams around the car.
    this.drawPolyCP(
      ctx,
      [
        this.cameraPoint(...leftOuterA),
        this.cameraPoint(...leftRoadA),
        this.cameraPoint(...leftRoadB),
        this.cameraPoint(...leftOuterB),
      ],
      curbColor,
      1,
    );
    this.drawPolyCP(
      ctx,
      [
        this.cameraPoint(...rightRoadA),
        this.cameraPoint(...rightOuterA),
        this.cameraPoint(...rightOuterB),
        this.cameraPoint(...rightRoadB),
      ],
      curbColor,
      1,
    );

    if (i % 6 < 2) {
      const da = [a.x - a.nx * half, a.y + 0.078, a.z - a.nz * half],
        db = [a.x + a.nx * half, a.y + 0.078, a.z + a.nz * half];
      const dc = [b.x - b.nx * half, b.y + 0.078, b.z - b.nz * half],
        dd = [b.x + b.nx * half, b.y + 0.078, b.z + b.nz * half];
      const mark = fogColor("#dbc78f", fog);
      this.drawPolyCP(
        ctx,
        [
          this.cameraPoint(...da),
          this.cameraPoint(...db),
          this.cameraPoint(...dd),
          this.cameraPoint(...dc),
        ],
        mark,
        1,
      );
    }
  }

  drawDial(
    ctx,
    cx,
    cy,
    r,
    value,
    min,
    max,
    label,
    units,
    needle = true,
    steps = 8,
    labelEvery = 1,
    zoneStart = null,
  ) {
    const start = (135 * Math.PI) / 180,
      end = (405 * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "rgba(10,13,14,.94)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ab9361";
    ctx.lineWidth = Math.max(2, this.dpr);
    ctx.stroke();
    ctx.fillStyle = "#d9cfad";
    ctx.font = `${Math.max(8, r * 0.13)}px ui-monospace,monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps,
        ang = start + (end - start) * t;
      const x1 = Math.cos(ang) * (r * 0.77),
        y1 = Math.sin(ang) * (r * 0.77);
      const x2 = Math.cos(ang) * (r * 0.9),
        y2 = Math.sin(ang) * (r * 0.9);
      const zoneRatio =
        zoneStart == null
          ? null
          : clamp(t - (zoneStart - min) / (max - min), 0, 1);
      ctx.strokeStyle =
        zoneRatio != null && t >= (zoneStart - min) / (max - min)
          ? "#c85a47"
          : "#d6c998";
      ctx.lineWidth = Math.max(1, this.dpr);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (i % labelEvery === 0) {
        const tx = Math.cos(ang) * (r * 0.6),
          ty = Math.sin(ang) * (r * 0.6);
        ctx.fillText(String(Math.round(min + (max - min) * t)), tx, ty);
      }
    }
    if (needle) {
      const t = clamp((value - min) / (max - min), 0, 1),
        ang = start + (end - start) * t;
      ctx.strokeStyle = "#df5b47";
      ctx.lineWidth = Math.max(2, this.dpr * 1.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * (r * 0.73), Math.sin(ang) * (r * 0.73));
      ctx.stroke();
      ctx.fillStyle = "#d9cfad";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#a99f87";
    ctx.font = `${Math.max(7, r * 0.1)}px ui-monospace,monospace`;
    ctx.fillText(label, 0, r * 0.23);
    ctx.fillStyle = "#d6c998";
    ctx.font = `${Math.max(6, r * 0.085)}px ui-monospace,monospace`;
    ctx.fillText(units, 0, r * 0.39);
    ctx.restore();
  }

  drawSpeedometer(ctx, cx, cy, r, mph, gear) {
    this.drawDial(
      ctx,
      cx,
      cy,
      r,
      clamp(mph, 0, 160),
      0,
      160,
      "SPEED",
      "MPH",
      true,
      8,
      1,
      150,
    );
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#111517";
    ctx.beginPath();
    ctx.roundRect(-r * 0.23, -r * 0.3, r * 0.46, r * 0.25, r * 0.06);
    ctx.fill();
    ctx.strokeStyle = "#ab9361";
    ctx.lineWidth = Math.max(1, this.dpr);
    ctx.stroke();
    const text = gear < 0 ? "R" : gear === 0 ? "N" : String(gear);
    ctx.fillStyle = "#f5d26f";
    ctx.font = `bold ${Math.max(10, r * 0.18)}px ui-monospace,monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, -r * 0.175);
    ctx.restore();
  }

  drawShiftLights(ctx, cx, cy, r, rpm, redline) {
    const ratio = clamp(rpm / Math.max(redline, 1), 0, 1.1);
    const total = 6,
      spacing = r * 0.19,
      startX = cx - (total - 1) * spacing * 0.5,
      y = cy - r * 1.08;
    const hardRed = ratio >= 0.995,
      flash = hardRed && Math.floor(performance.now() / 95) % 2 === 0;
    for (let i = 0; i < total; i++) {
      const threshold = 0.76 + i * 0.042;
      const active = ratio >= threshold;
      const red = i >= 4;
      let fill = "rgba(55,49,35,.65)";
      if (active) fill = red ? "#d24d3f" : "#d5b63f";
      if (hardRed)
        fill = flash ? (red ? "#ff3d2f" : "#ffe16b") : "rgba(55,49,35,.65)";
      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = "#201c17";
      ctx.lineWidth = Math.max(1, this.dpr);
      ctx.beginPath();
      ctx.arc(startX + i * spacing, y, r * 0.065, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawRoof(ctx, w, h) {
    // A shallow roof/windshield surround closes the cockpit while leaving the road
    // and horizon overwhelmingly unobstructed.
    ctx.save();
    const roofH = h * 0.085,
      pillarW = Math.max(8, w * 0.018);
    ctx.fillStyle = "#0a0d0e";
    ctx.fillRect(0, 0, w, roofH * 0.56);
    ctx.fillStyle = "#1d2528";
    ctx.fillRect(w * 0.07, 0, w * 0.12, roofH * 0.72);
    ctx.fillRect(w * 0.81, 0, w * 0.12, roofH * 0.72);
    ctx.fillStyle = "#ab9361";
    ctx.fillRect(w * 0.08, roofH * 0.66, w * 0.1, Math.max(2, this.dpr * 2));
    ctx.fillRect(w * 0.82, roofH * 0.66, w * 0.1, Math.max(2, this.dpr * 2));
    ctx.fillStyle = "#0c1012";
    ctx.beginPath();
    ctx.moveTo(w * 0.03, 0);
    ctx.lineTo(w * 0.1, roofH * 0.7);
    ctx.lineTo(w * 0.125, roofH * 0.7);
    ctx.lineTo(w * 0.065, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.97, 0);
    ctx.lineTo(w * 0.9, roofH * 0.7);
    ctx.lineTo(w * 0.875, roofH * 0.7);
    ctx.lineTo(w * 0.935, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#283235";
    ctx.fillRect(w * 0.455, 0, w * 0.09, Math.max(4, roofH * 0.38));
    ctx.restore();
  }

  drawCockpit(ctx, w, h, car) {
    // Roof/windshield frame is deliberately subtle and drawn first so it reads as a
    // cockpit boundary rather than a HUD overlay.
    this.drawRoof(ctx, w, h);

    const deckY = h * 0.715;
    ctx.save();
    const dash = ctx.createLinearGradient(0, deckY, 0, h);
    dash.addColorStop(0, "#202a2f");
    dash.addColorStop(0.45, "#151b1f");
    dash.addColorStop(1, "#080a0c");
    ctx.fillStyle = dash;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, deckY + h * 0.05);
    ctx.lineTo(w * 0.14, deckY - h * 0.01);
    ctx.lineTo(w * 0.86, deckY - h * 0.01);
    ctx.lineTo(w, deckY + h * 0.05);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(202,169,106,.25)";
    ctx.fillRect(0, deckY, w, Math.max(2, this.dpr * 2));

    const speedMph = car.speed * 2.2369362921;
    const tachR = Math.min(w * 0.105, h * 0.17),
      speedR = Math.min(w * 0.105, h * 0.17);
    this.drawSpeedometer(ctx, w * 0.245, h * 0.846, speedR, speedMph, car.gear);
    const tachMax = 8;
    this.drawDial(
      ctx,
      w * 0.755,
      h * 0.846,
      tachR,
      clamp(car.rpm / 1000, 0, tachMax),
      0,
      tachMax,
      "RPM",
      "x1000",
      true,
      8,
      1,
      car.p.redline / 1000,
    );
    this.drawShiftLights(
      ctx,
      w * 0.755,
      h * 0.846,
      tachR,
      car.rpm,
      car.p.redline,
    );

    // Larger, high-contrast steering wheel. The dark inner rim remains readable
    // against the dash because the outer ring is intentionally warm/bright.
    const targetWheel = car.steer * 4.1;
    this.wheelVisual += (targetWheel - this.wheelVisual) * 0.18;
    const wx = w * 0.5,
      wy = h * 0.885,
      wr = Math.min(w * 0.19, h * 0.2);
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(this.wheelVisual);
    ctx.strokeStyle = "#050607";
    ctx.lineWidth = Math.max(12, wr * 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, wr * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#c5a66d";
    ctx.lineWidth = Math.max(4, wr * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, wr * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ead39a";
    ctx.lineWidth = Math.max(1, this.dpr * 1.4);
    ctx.beginPath();
    ctx.arc(0, 0, wr * 0.74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#0d1113";
    ctx.lineWidth = Math.max(6, wr * 0.075);
    for (const a of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * wr * 0.08, Math.sin(a) * wr * 0.08);
      ctx.lineTo(Math.cos(a) * wr * 0.72, Math.sin(a) * wr * 0.72);
      ctx.stroke();
    }
    ctx.fillStyle = "#1a2225";
    ctx.beginPath();
    ctx.arc(0, 0, wr * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c5a66d";
    ctx.lineWidth = Math.max(2, this.dpr);
    ctx.stroke();
    ctx.fillStyle = "#bd5a44";
    ctx.font = `bold ${Math.max(8, wr * 0.14)}px ui-monospace,monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("86", 0, 0);
    ctx.restore();
    ctx.restore();
  }
}
