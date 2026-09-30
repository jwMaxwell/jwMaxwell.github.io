# Dustline 86

A small browser-based first-person retro time-trial racer using vanilla JavaScript and browser APIs. The simulation is world-space 3D; presentation uses a deterministic Canvas 2D pseudo-3D renderer for cross-browser reliability.

## Run

The project is intentionally dependency-free. `index.html` is the entry point.

Modern Chromium browsers can usually load it directly from disk. If your browser blocks ES modules from `file://`, run a tiny static server in the project directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

Firefox/LibreWolf should work with the same local-server fallback.

## Controls

### DualShock 4 / Gamepad API

- Left stick X: steering
- R2: throttle
- L2: front brake
- Square: rear brake
- Cross: handbrake
- L1/R1: sequential down/up; Triangle: reverse at low speed
- Options: restart
- F: fullscreen (keyboard)

### Keyboard

- A/D: steer
- W: throttle
- S: front brake
- Z: rear brake
- Space: handbrake
- Q/E: shift down/up
- X: reverse at low speed
- R: restart
- F: fullscreen

## Architecture

- `js/car.js`: four-wheel tire-force vehicle model, drivetrain, brakes and load transfer.
- `js/track.js`: track data, centerline sampling, nearest-point query, road mesh and scenery.
- `js/physics.js`: shared timing/progress helpers.
- `js/input.js`: Gamepad API and keyboard fallback.
- `js/render.js`: Canvas 2D pseudo-3D presentation renderer.
- `js/audio.js`: synthesized engine and event sounds.
- `js/ui.js`: HUD, start/finish screens and live tuning controls.
- `js/main.js`: game state and orchestration.

## Physics simplifications

This is a simcade foundation rather than a professional simulator. The four tires have independent slip ratio/slip angle, load, combined-grip limiting, brake forces, RWD drive force and simple load transfer. The model intentionally omits detailed suspension kinematics, tire temperature, camber, caster, differential torque vectoring, wheel-hop and a full Pacejka curve.

The track is a procedural ribbon with elevation and soft off-road behavior. The car follows track elevation visually, scenery uses distance fog, and deep off-road travel adds loose-surface drag and a capped recovery force. Collision with the environment is intentionally forgiving rather than using invisible hard walls.

The debug panel changes live parameters. "Save local" stores the tuning in `localStorage`; reload will reuse it. "Reset defaults" restores the built-in baseline.

## Future extension points

Tracks are objects with `sample()` and `nearest()` plus render/scenery builders. A ghost car can record `{time,x,z,yaw,gear}` samples and replay them through a second `Car`/render path without changing the timing model.

Additional cars can be created by cloning `DEFAULT_CAR` and swapping the parameter object. The physics code does not depend on the UI or renderer.


## Rendering troubleshooting

The current build deliberately avoids depending on browser-specific WebGL matrix/depth behavior. If the HUD is visible, the driving view should still render as a complete sky, terrain, road ribbon, scenery, and hood using Canvas 2D. A hard refresh after replacing files is recommended so the browser does not retain an older JavaScript module from cache.


## Latest stability fixes

The current build uses a rigid driver-position cockpit camera attached directly to the chassis, so camera position and yaw cannot lag behind the vehicle. The car is kept above the sampled road plane with a fixed ride-height offset, and the start/finish detector requires the car to travel most of a full circuit before accepting a lap crossing. The vehicle now has meaningful rolling resistance, aerodynamic drag, closed-throttle engine braking, combined tire grip, and stronger loose-surface deceleration.

The Canvas pseudo-3D renderer is intentionally retained for cross-browser reliability. WebGL was removed from the presentation path because the earlier implementation produced browser-dependent failures even though the underlying simulation was valid.


### Renderer/track stability

The current renderer is a software pseudo-3D path, not WebGL. It uses a full 3D camera basis with pitch, near-plane polygon clipping, depth-sorted road/scenery primitives, and a track window that includes both forward and rearward sections. Track queries also include elevation when selecting the nearest road surface, which prevents an overpass from becoming the collision surface simply because it is close in X/Z.


### Stable v5 changes

The v5 build uses a periodic closed-loop track with no intentional self-intersections, a continuity-aware 3D track query, world-locked road materials, triangulated road surfaces, broad world-space desert ground, and stronger sprite contact shadows. Existing local tuning is versioned separately so older parameters do not silently override the new handling baseline. The renderer remains Canvas 2D pseudo-3D for browser portability.


### v6 changes
- Reverse is a dedicated gear (`R`), available via Triangle on a DualShock 4 or `X` on keyboard; it can only be engaged at low speed.
- Sequential shifting is fully manual; there is no automatic upshift at redline.
- Near-camera road rendering now skips unstable camera-plane geometry and uses a small stable road apron to prevent polygon holes under the car.
- Scenery size uses true 3D distance, so nearby sprites grow rather than shrink when approached from an angle.
- Deep off-road recovery has a capped, always-active tow-like lateral assist and heading recovery; an extreme >30 m excursion gets a last-resort marshal reset instead of becoming permanently stuck.
- Tuning is stored under `dustline86-tuning-v6` so the new drivetrain behavior starts from clean v6 defaults.

### Stable v7 changes
- Removed the screen-space near-road apron that produced the large gray base rectangle. Road triangles now use the normal camera near-plane clip all the way to the car.
- Scenery uses projected world height for billboard size, so objects grow as they approach instead of relying on a separate distance heuristic.
- Gear-dependent engine speed is now mechanically tied to wheel speed. Each forward gear has a real redline-limited road speed, and throttle is cut at the selected gear's redline rather than allowing first gear to pull to arbitrary speed.
- Closed-throttle engine braking is ratio-dependent and increases when the selected gear is being oversped, giving short gears visibly stronger deceleration.
- Manual shifting remains fully manual; there is still no automatic upshift.


## v9 cockpit/rendering pass
- Analog speedometer and tachometer; the old RPM bar HUD is removed.
- Gear indicator is integrated into the speedometer.
- Red/yellow shift lights flash at redline.
- Larger, high-contrast steering wheel with steering-intensity animation.
- Shallow roof/windshield frame added to the cockpit.
- Road visibility uses a software depth buffer so perpendicular views do not rely on painter-order guesses.

## v10 multi-track update
- Added `Mesa Circuit` (~1.15 km): the original fast desert benchmark.
- Added `Copper Switchback` (~1.17 km): tighter linked bends, stronger grade changes, and more frequent gear changes.
- Added `Quarry Serpentine` (~1.14 km): the most technical layout, with repeated direction changes and steeper elevation shifts.
- Added a start-screen map selector with miniature course previews, distance, character, and description.
- The selected course is remembered locally and is used for the next session.
- Track generation is generalized so future courses can be added without changing the race loop.

## v11 world-depth update
The non-track desert is now world-space terrain that follows the course elevation, rather than only a screen-space backdrop. Road, terrain, and roadside entities share one software depth buffer. Sprite silhouettes are rasterized into that depth buffer so pavement, terrain rises, and other foreground geometry occlude them correctly. Depth interpolation uses perspective-correct reciprocal-Z interpolation to reduce grazing-angle visibility errors.
