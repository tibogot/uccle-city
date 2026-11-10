# Flags (`viewer/flags/`, lab `labs/flag-lab.html`)

Status: lab only (branch `claude/flags`), not in the city yet. Built 2026-11-10 while the owner was away.

## How it works

| File | What |
|---|---|
| `flagCloth.js` | `FlagCloth`: Verlet cloth, 13 x 9 particles, hoist pinned along the pole (any direction), structural + shear + bending constraints (4 iterations), long-range tethers (no stretch in strong wind), gravity + drag-law wind pressure per triangle + skin drag, gusts + a travelling ripple, wall half-spaces; fixed step 1/90 s. `bakeLoop()`: records a seamless loop (periodic gusts, 72 frames, cross-faded overlap). |
| `bakeWorker.js` | runs `bakeLoop` in a module worker (no long task on the main thread). |
| `flagField.js` | `LiveFlag` (one cloth + a dynamic mesh), `BakedFlags` (one instanced draw per design / pole set-up: positions + normals of every frame in float textures, read in the vertex shader; per flag: place, yaw, phase, visible). Two loop slots: a wind change is re-recorded in the worker into the idle slot and cross-faded in over 1.5 s, in the same textures (no new shader). Hand-overs: baked -> live copies the baked state (now + one step before) into the cloth; live -> baked eases the vertices onto the moving baked pose over 0.6 s. |
| `flagDesigns.js` | Belgium (2:3 and the legal 13:15), EU (12 stars to the official geometry), Uccle (light blue / white, Flags of the World), a UV test; drawn on a canvas, no image files. |

Vertical masts: loop baked with the wind along +x, each flag turned to the wind. Fixed angled poles (the town hall
balcony, `models/townhall/townhall.json` `flag_poles`): baked in world space with the real wind, re-recorded when it
turns; the wall behind is found with a fan of 16 rays and kept 4 cm away.

## Measured (2026-11-10, owner's machine BUT two other agents were rendering at the same time: CPU numbers are high)

- Cloth CPU, Node, one flag: ~0.05 ms per sim step; at 60 fps (1.5 steps) ~0.08 ms per flag per frame.
- In the lab tab (30 fps under load = 3 steps per frame): ~0.25-0.3 ms per live flag per frame. Re-measure on a
  quiet machine. Budget proposal: at most 4 live flags at once (~0.3-0.6 ms), everything else baked.
- Bake: ~50 ms per loop in Node; 9 sets in the lab ~0.4-1.2 s in the worker, 0 long tasks on the main thread.
  Re-record on a wind change: ~120 ms in the worker, 0 long tasks.
- Load: two long tasks (~100 and ~150 ms) = the town hall load and the shader builds; in the city they go through
  the boot warm-up / precompile queue.
- Hand-overs (moving vertex jump per frame, mast flag): live p50 0.15 m, baked p50 0.125 m, during hand-back 0.115 m:
  no spike at either switch = no pop. The baked loop moves ~17 % less than live (live has non-periodic gusts).
- GPU: not measured cleanly yet (other agents). 120 field flags = 3 draws.

## Still to do

1. GPU A/B on a quiet machine (0 / 120 / 600 baked flags), and the live CPU cost at 60 fps.
2. Live sims in a worker (to free the main thread) if the budget needs it.
3. The city: attach to the town hall poles (`?townhall=1`), the city wind (weather), the boot warm-up for the
   shaders, LOD: below ~8 px per flag, hide (or a 2-triangle card).
4. Rope / halyard and a snap hook on masts; flag size per real flag (the town hall photos look ~1.5 x 1 m).
5. More designs: Brussels-Capital Region (the iris; needs care with its official drawing), Flanders, Wallonia,
   other municipalities, shop banners.
6. The Uccle blue is not specified anywhere I found: check against photos.
