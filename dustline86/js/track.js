// Track data and procedural scenery.
export const TRACKS = {};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t,
    t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function buildTrack(config) {
  const pts = [];
  const M = config.controlCount || 56;
  for (let k = 0; k < M; k++)
    pts.push(config.point((k / M) * 2 * Math.PI, k, M));

  const N = config.samples || 720;
  const width = config.width || 11.5;
  const samples = [];
  const baseX = pts.reduce((a, p) => a + Math.abs(p.x), 0) / pts.length || 1;
  const baseZ = pts.reduce((a, p) => a + Math.abs(p.z), 0) / pts.length || 1;

  // Keep all three courses in the same visual/difficulty envelope. A compact
  // dimensional scale keeps the new maps close to Mesa's ~1.15 km lap length.
  const lengthScale = config.planScale || 1;
  for (let i = 0; i < N; i++) {
    const u = (i / N) * M;
    const wrapped = ((u % M) + M) % M;
    const j = Math.floor(wrapped),
      t = wrapped - j;
    const p0 = pts[(j - 1 + M) % M],
      p1 = pts[j],
      p2 = pts[(j + 1) % M],
      p3 = pts[(j + 2) % M];
    samples.push({
      x: catmull(p0.x, p1.x, p2.x, p3.x, t) * lengthScale,
      y: catmull(p0.y, p1.y, p2.y, p3.y, t),
      z: catmull(p0.z, p1.z, p2.z, p3.z, t) * lengthScale,
    });
  }

  for (let i = 0; i < N; i++) {
    const prev = samples[(i - 1 + N) % N],
      a = samples[i],
      b = samples[(i + 1) % N];
    const dx = b.x - prev.x,
      dz = b.z - prev.z,
      dy = b.y - prev.y;
    const hlen = Math.hypot(dx, dz) || 1;
    a.tx = dx / hlen;
    a.tz = dz / hlen;
    a.grade = dy / hlen;
    a.pitch = Math.atan(a.grade);
    a.nx = -a.tz;
    a.nz = a.tx;
  }

  let length = 0;
  for (let i = 0; i < N; i++) {
    const a = samples[i],
      b = samples[(i + 1) % N];
    a.s = length;
    length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }

  // A tiny post-scale corrector keeps the new courses tightly grouped by lap length.
  if (config.targetLength && Math.abs(length - config.targetLength) > 8) {
    const ratio = config.targetLength / length;
    for (const p of samples) {
      p.x *= ratio;
      p.z *= ratio;
    }
    for (let i = 0; i < N; i++) {
      const prev = samples[(i - 1 + N) % N],
        a = samples[i],
        b = samples[(i + 1) % N];
      const dx = b.x - prev.x,
        dz = b.z - prev.z,
        dy = b.y - prev.y,
        hlen = Math.hypot(dx, dz) || 1;
      a.tx = dx / hlen;
      a.tz = dz / hlen;
      a.grade = dy / hlen;
      a.pitch = Math.atan(a.grade);
      a.nx = -a.tz;
      a.nz = a.tx;
    }
    length = 0;
    for (let i = 0; i < N; i++) {
      const a = samples[i],
        b = samples[(i + 1) % N];
      a.s = length;
      length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    }
  }

  function wrappedIndexDistance(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, N - d);
  }

  function nearest(x, z, y = NaN, hintIndex = null) {
    const useY = Number.isFinite(y);
    const verticalWeight = 5.5;
    const hint = Number.isFinite(hintIndex)
      ? ((Math.round(hintIndex) % N) + N) % N
      : null;
    let best = null;
    for (let i = 0; i < N; i += 2) {
      const p = samples[i],
        dx = x - p.x,
        dz = z - p.z,
        dy = useY ? y - p.y : 0;
      const d2 = dx * dx + dz * dz;
      const continuity =
        hint === null
          ? 0
          : Math.pow((wrappedIndexDistance(i, hint) / N) * 2.5, 2);
      const vertical = useY ? dy * dy * verticalWeight * verticalWeight : 0;
      const score = d2 + vertical + continuity;
      if (!best || score < best.score) best = { score, d2, index: i, dy };
    }
    const centers = hint === null ? [best.index] : [best.index, hint];
    const seen = new Set();
    for (const c of centers) {
      for (let k = -8; k <= 8; k++) {
        const i = (c + k + N) % N;
        if (seen.has(i)) continue;
        seen.add(i);
        const p = samples[i],
          dx = x - p.x,
          dz = z - p.z,
          dy = useY ? y - p.y : 0;
        const d2 = dx * dx + dz * dz;
        const continuity =
          hint === null
            ? 0
            : Math.pow((wrappedIndexDistance(i, hint) / N) * 2.5, 2);
        const vertical = useY ? dy * dy * verticalWeight * verticalWeight : 0;
        const score = d2 + vertical + continuity;
        if (score < best.score) best = { score, d2, index: i, dy };
      }
    }
    const p = samples[best.index],
      dx = x - p.x,
      dz = z - p.z;
    const lateral = dx * p.nx + dz * p.nz;
    return {
      ...best,
      point: p,
      lateral,
      progress: p.s / length,
      index: best.index,
    };
  }

  function sample(progress) {
    progress = ((progress % 1) + 1) % 1;
    const f = progress * N,
      i = Math.floor(f) % N,
      t = f - i;
    const a = samples[i],
      b = samples[(i + 1) % N];
    const tx = a.tx + (b.tx - a.tx) * t,
      tz = a.tz + (b.tz - a.tz) * t,
      h = Math.hypot(tx, tz) || 1;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      tx: tx / h,
      tz: tz / h,
      nx: -(tz / h),
      nz: tx / h,
      grade: a.grade + (b.grade - a.grade) * t,
      pitch: a.pitch + (b.pitch - a.pitch) * t,
      width,
      length,
    };
  }

  return {
    id: config.id,
    name: config.name,
    subtitle: config.subtitle,
    description: config.description,
    difficulty: config.difficulty,
    theme: config.theme,
    samples,
    width,
    length,
    nearest,
    sample,
    N,
    startHint: config.startHint || 0,
  };
}

function mesaPoint(t) {
  const theta = -Math.PI / 2 + t;
  const radius =
    1 + 0.05 * Math.sin(3 * theta + 0.4) + 0.025 * Math.sin(5 * theta - 1.1);
  return {
    x: 210 * radius * Math.cos(theta),
    y:
      2.5 +
      18 * (0.5 + 0.5 * Math.sin(theta + Math.PI / 2)) +
      3 * Math.sin(2 * theta - 0.6),
    z: -18 + 150 * radius * Math.sin(theta),
  };
}

function copperPoint(t) {
  // A compact, non-self-intersecting polar loop with eight distinct bend groups.
  const theta = -Math.PI / 2 + t;
  const radius =
    1 +
    0.095 * Math.sin(4 * theta + 0.5) +
    0.04 * Math.sin(9 * theta - 1.1) +
    0.018 * Math.sin(13 * theta + 0.3);
  const radial = 1 + 0.018 * Math.sin(2 * theta - 0.8);
  return {
    x: 205 * radius * Math.cos(theta) * radial,
    y:
      4 +
      13 * (0.5 + 0.5 * Math.sin(2 * theta - 0.4)) +
      3.2 * Math.sin(6 * theta + 0.2),
    z: -12 + 154 * radius * Math.sin(theta),
  };
}

function quarryPoint(t) {
  const theta = -Math.PI / 2 + t;
  const radius =
    1 +
    0.12 * Math.sin(5 * theta + 0.35) +
    0.045 * Math.sin(10 * theta - 1.2) +
    0.022 * Math.sin(15 * theta);
  return {
    x: 202 * radius * Math.cos(theta),
    y:
      3 +
      16 * (0.5 + 0.5 * Math.sin(theta - 0.35)) +
      4.2 * Math.sin(4 * theta + 0.7) +
      1.8 * Math.sin(9 * theta),
    z: -5 + 152 * radius * Math.sin(theta),
  };
}

TRACKS.mesa86 = buildTrack({
  id: "mesa86",
  name: "Mesa Circuit",
  subtitle: "FAST DESERT SWEEPERS",
  description:
    "High-speed sweepers, a climbing section, and a long final run. The original benchmark.",
  difficulty: "FAST",
  targetLength: 1150,
  point: (_, __, ___) => mesaPoint(_),
  theme: {
    skyTop: "#5c9ec2",
    skyMid: "#a9ced0",
    skyBottom: "#d6bb82",
    groundTop: "#9e8560",
    groundBottom: "#39342c",
    road: "#353d3f",
    roadAlt: "#4c5553",
    curbA: "#d05b46",
    curbB: "#e5d39a",
  },
});
TRACKS.copperSwitchback = buildTrack({
  id: "copperSwitchback",
  name: "Copper Switchback",
  subtitle: "TECHNICAL / ELEVATED",
  description:
    "A denser sequence of linked bends and cresting switchbacks that rewards clean braking and early throttle.",
  difficulty: "TECH",
  targetLength: 1170,
  point: (_, __, ___) => copperPoint(_),
  theme: {
    skyTop: "#6c91a2",
    skyMid: "#c4c3ac",
    skyBottom: "#d3ad78",
    groundTop: "#8c7357",
    groundBottom: "#302e2a",
    road: "#3b4240",
    roadAlt: "#555e59",
    curbA: "#d66b4b",
    curbB: "#ecd39a",
  },
});
TRACKS.quarrySerpentine = buildTrack({
  id: "quarrySerpentine",
  name: "Quarry Serpentine",
  subtitle: "TIGHT / COMMITMENT",
  description:
    "Repeated direction changes, steeper grades, and awkward exits. Carrying momentum is the entire trick.",
  difficulty: "TECH+",
  targetLength: 1135,
  point: (_, __, ___) => quarryPoint(_),
  theme: {
    skyTop: "#5b8792",
    skyMid: "#b8c8bf",
    skyBottom: "#d5b680",
    groundTop: "#806b53",
    groundBottom: "#2c2a27",
    road: "#343b3b",
    roadAlt: "#4f5752",
    curbA: "#bf5543",
    curbB: "#e7d09a",
  },
});

export function buildTrackMesh(gl, track) {
  const positions = [],
    normals = [],
    colors = [],
    indices = [];
  const W = track.width / 2,
    shoulder = 2.8,
    N = track.samples.length;
  for (let i = 0; i < N; i++) {
    const p = track.samples[i],
      nx = -p.tz,
      nz = p.tx;
    for (const l of [-W - shoulder, -W, W, W + shoulder]) {
      positions.push(p.x + nx * l, p.y - 0.04, p.z + nz * l);
      normals.push(0, 1, 0);
      const road = Math.abs(l) <= W;
      colors.push(...(road ? [0.17, 0.19, 0.18] : [0.31, 0.27, 0.2]));
    }
  }
  for (let i = 0; i < N; i++) {
    const ni = (i + 1) % N;
    for (let j = 0; j < 3; j++) {
      const a = i * 4 + j,
        b = i * 4 + j + 1,
        c = ni * 4 + j + 1,
        d = ni * 4 + j;
      indices.push(a, b, d, b, c, d);
    }
  }
  return { positions, normals, colors, indices };
}

export function buildScenery(track) {
  const items = [];
  let s = (0x9e3779b9 ^ (track.id.length * 2654435761)) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const count = track.id === "quarrySerpentine" ? 210 : 195;
  for (let i = 0; i < count; i++) {
    const progress = (i / count + rand() * 0.01) % 1;
    const p = track.sample(progress),
      side = rand() < 0.5 ? -1 : 1;
    const dist = track.width / 2 + 5 + rand() * 30,
      nx = p.nx,
      nz = p.nz;
    items.push({
      type: rand() < 0.38 ? "cactus" : rand() < 0.68 ? "rock" : "marker",
      x: p.x + nx * side * dist,
      z: p.z + nz * side * dist,
      y: p.y - (dist - track.width / 2) * 0.012,
      scale: 0.6 + rand() * 1.7,
      rot: rand() * Math.PI * 2,
      progress,
      groundY: p.y - (dist - track.width / 2) * 0.012,
      side,
    });
  }
  return items;
}
