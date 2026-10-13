import { test } from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../js/render.js";

// The renderer only needs a 2D context object to exist; the software world pass
// writes into typed arrays we can inspect directly.
function makeRenderer(w = 320, h = 180) {
  const ctx = {
    createImageData: (cw, ch) => ({ data: new Uint8ClampedArray(cw * ch * 4) }),
  };
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  };
  const r = new Renderer({ getContext: () => ctx });
  r.w = w;
  r.h = h;
  r.roadCanvas.width = w;
  r.roadCanvas.height = h;
  r.roadImage = ctx.createImageData(w, h);
  r.roadPixels = new Uint32Array(r.roadImage.data.buffer);
  r.roadDepth = new Float32Array(w * h).fill(Infinity);
  return r;
}

// The previous bounding-box rasterizer, kept as the reference the span
// rasterizer must match pixel for pixel.
function referenceTriangle(w, h, pixels, depth, v0, v1, v2, color, bias = 0) {
  const { x: x0, y: y0 } = v0,
    { x: x1, y: y1 } = v1,
    { x: x2, y: y2 } = v2;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))),
    maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))),
    maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)));
  if (minX > maxX || minY > maxY) return;
  const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (Math.abs(area) < 1e-6) return;
  const inv = 1 / area;
  for (let y = minY; y <= maxY; y++) {
    const py = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const w0 = ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) * inv;
      const w1 = ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) * inv;
      const w2 = ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) * inv;
      if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
      const invZ = w1 / v0.depth + w2 / v1.depth + w0 / v2.depth;
      const d = 1 / Math.max(invZ, 1e-9) + bias,
        idx = y * w + x;
      if (d >= depth[idx]) continue;
      depth[idx] = d;
      pixels[idx] = color;
    }
  }
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

test("span rasterizer matches the reference rasterizer exactly", () => {
  const W = 160,
    H = 90;
  const r = makeRenderer(W, H);
  const refPixels = new Uint32Array(W * H),
    refDepth = new Float32Array(W * H).fill(Infinity);
  const rand = lcg(86);
  const vert = () => ({
    // Include vertices off screen and very thin slivers.
    x: rand() * W * 1.6 - W * 0.3,
    y: rand() * H * 1.6 - H * 0.3,
    depth: 1 + rand() * 300,
  });
  for (let i = 0; i < 600; i++) {
    const tri = i % 5 === 0
      ? (() => {
          const a = vert();
          return [a, vert(), { x: a.x + rand() * 2, y: a.y + rand() * 2, depth: a.depth }];
        })()
      : [vert(), vert(), vert()];
    const color = (0xff000000 | (i * 2654435761)) >>> 0;
    r.rasterTriangle(...tri, color, -0.01);
    referenceTriangle(W, H, refPixels, refDepth, ...tri, color, -0.01);
  }
  let diff = 0;
  for (let i = 0; i < W * H; i++)
    if (r.roadPixels[i] !== refPixels[i] || r.roadDepth[i] !== refDepth[i]) diff++;
  assert.equal(diff, 0, `${diff} pixels differ`);
  assert.ok(refPixels.some(Boolean), "test drew something");
});

test("nearer triangles win the depth test regardless of draw order", () => {
  const r = makeRenderer(40, 40);
  const quad = (depth) => [
    { x: 0, y: 0, depth },
    { x: 40, y: 0, depth },
    { x: 0, y: 40, depth },
  ];
  r.rasterTriangle(...quad(5), 0xff0000ff);
  r.rasterTriangle(...quad(50), 0xff00ff00);
  assert.equal(r.roadPixels[0], 0xff0000ff);
});

test("dithered fill covers every other pixel", () => {
  const r = makeRenderer(20, 20);
  r.rasterPoly(
    [
      { lateral: -100, vertical: 100, depth: 10 },
      { lateral: 100, vertical: 100, depth: 10 },
      { lateral: 100, vertical: -100, depth: 10 },
      { lateral: -100, vertical: -100, depth: 10 },
    ],
    "#ffffff",
    0,
    true,
  );
  const filled = r.roadPixels.filter(Boolean).length;
  assert.equal(filled, 200);
  assert.equal(r.roadPixels[0] !== 0, true);
  assert.equal(r.roadPixels[1], 0);
});

test("hex colors are packed in canvas byte order", () => {
  const r = makeRenderer(4, 4);
  r.rasterPoly(
    [
      { lateral: -10, vertical: 10, depth: 1 },
      { lateral: 10, vertical: 10, depth: 1 },
      { lateral: 10, vertical: -10, depth: 1 },
      { lateral: -10, vertical: -10, depth: 1 },
    ],
    "#336699",
  );
  const d = r.roadImage.data;
  assert.deepEqual([...d.slice(0, 4)], [0x33, 0x66, 0x99, 255]);
});

test("internal resolution drops when slow and recovers with headroom", () => {
  const r = makeRenderer();
  const run = (ms, frames) => {
    for (let i = 0; i < frames; i++) r.adaptResolution(ms);
  };
  run(20, 600);
  assert.equal(r.roadScale, r.minRoadScale);
  run(1, 1200);
  assert.ok(Math.abs(r.roadScale - r.maxRoadScale) < 1e-9);
  run(6, 600);
  assert.ok(Math.abs(r.roadScale - r.maxRoadScale) < 1e-9, "stable inside budget");
});

test("the ghost is hidden when the player drives through it", () => {
  const r = makeRenderer();
  r.camera = { x: 0, y: 1, z: 0, forward: [1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] };
  r.drawGhost({ x: 2, y: 0.42, z: 0, yaw: 0 });
  assert.equal(r.roadPixels.some(Boolean), false);
  r.drawGhost({ x: 15, y: 0.42, z: 0, yaw: 0 });
  assert.equal(r.roadPixels.some(Boolean), true);
});
