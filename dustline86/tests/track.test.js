import { test } from "node:test";
import assert from "node:assert/strict";
import { TRACKS, buildScenery } from "../js/track.js";

const TARGET_LENGTHS = {
  mesa86: 1150,
  copperSwitchback: 1170,
  quarrySerpentine: 1135,
  driftBasin: 1175,
};

test("every course has a target length and is close to it", () => {
  assert.deepEqual(Object.keys(TRACKS).sort(), Object.keys(TARGET_LENGTHS).sort());
  for (const [id, target] of Object.entries(TARGET_LENGTHS)) {
    const err = Math.abs(TRACKS[id].length - target) / target;
    assert.ok(err < 0.015, `${id}: ${TRACKS[id].length} m vs ${target} m`);
  }
});

for (const track of Object.values(TRACKS)) {
  test(`${track.name}: closed loop with continuous samples`, () => {
    const s = track.samples;
    for (let i = 0; i < s.length; i++) {
      const a = s[i],
        b = s[(i + 1) % s.length];
      const gap = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      assert.ok(gap > 0.2 && gap < 4, `gap ${gap} m after sample ${i}`);
      assert.ok(Math.abs(Math.hypot(a.tx, a.tz) - 1) < 1e-9, "unit tangent");
    }
  });

  test(`${track.name}: nearest() finds the right sample and lateral offset`, () => {
    // Note: sample(p) indexes samples by p * N, while nearest().progress is
    // distance along the road / length. They agree at the start line (0), which
    // is the only place the game compares them.
    for (const progress of [0.1, 0.37, 0.8]) {
      const p = track.sample(progress),
        index = Math.round(progress * track.N);
      for (const offset of [-3, 0, 4]) {
        const n = track.nearest(p.x + p.nx * offset, p.z + p.nz * offset, p.y);
        assert.ok(Math.abs(n.lateral - offset) < 0.3, `lateral ${n.lateral} vs ${offset}`);
        assert.ok(Math.abs(n.index - index) <= 1, `index ${n.index} vs ${index}`);
        assert.ok(
          Math.abs(n.progress - n.point.s / track.length) < 1e-12,
          "progress is arc length",
        );
      }
    }
    assert.equal(track.nearest(track.sample(0).x, track.sample(0).z).progress, 0);
  });

  test(`${track.name}: sample() wraps progress`, () => {
    assert.deepEqual(track.sample(1.25), track.sample(0.25));
    assert.deepEqual(track.sample(-0.75), track.sample(0.25));
  });

  test(`${track.name}: scenery is deterministic and off the pavement`, () => {
    const a = buildScenery(track),
      b = buildScenery(track);
    assert.deepEqual(a, b);
    for (const item of a) {
      const n = track.nearest(item.x, item.z);
      assert.ok(Math.abs(n.lateral) > track.width / 2 + 1, `${item.type} on road`);
    }
  });
}
