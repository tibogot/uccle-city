# Tyre marks (claude/tyremarks, rule 48)

The player's car and the two-wheelers (motorbike, scooter, Villo) lay rubber on the road. `?tyremarks=old` = none (the features.js row).

Code: `viewer/drive/tyreMarks.js`, hooked in `viewer/drive/driveMode.js` (created with the Driver, `update()` after the vehicle's step, `lift()` when the drive mode stops). Source: the owner's engine (game-engine-v1, read only): `games/thunderline/proto/kit/tyreMarks.js` and `modular-road-v3/modularRoadTireMarks.js` (MARK_LOOK). The mask `textures/tyremarks/skid_mark01.png` is the owner's asset from game-engine-v1 (owner confirmed 2026-11-19), read soft as an alpha mask.

## When a wheel marks
- **Slide:** slip = |v lateral| / max(|v long|, 3.5) in the wheel's own frame (the body's velocity + the yaw rate at the wheel), from 0.18 (starts) to 0.7 (full), gated 8-16 m/s.
- **Fronts:** they countersteer into a slide, so they mark only by what the slide angle passes the lock (car 0.56 rad = CTL.maxSteer, bikes 0.3): a drift lays two lines, a spin four.
- **Brake lock / wheelspin:** `c.tyres.over` (carCtl.js) from what the pedals ASK against the grip on all four (not the clamped acceleration: at the stop it takes the last speed in one substep). A full brake on dry asphalt (92 % of the grip) = a faint mark (alpha ~0.2, ABS); handbrake on top or grass / soil = full. Motorbike: the rear brake locks the rear.
- **Handbrake:** the car's rears at 0.85 (locked), from 4 m/s (full at 10).
- **Grass / soil:** no rubber (carEnv surface 1; the bikes ask the driver's `surface()` per wheel).
- **Touch-down:** a wheel coming down faster than 3.5 m/s (bikes 2.5) scuffs for 0.14 s (`c.tyres.touch`, moto `touchV` / `touchN`).
- None in the air, in a wheelie (front) / stoppie (rear), or while a bike is crashed.

## Drawing
- One mesh, one draw call, a ring of 4096 quads (non-indexed, position + uv + aMark(alpha, birth)). The oldest are overwritten first.
- Static buffers, never DynamicDrawUsage. The span written since the last render is uploaded with 1-2 update ranges set in `mesh.onBeforeRender`. The WebGPU backend never clears ranges itself, and a frame that is not rendered keeps its span.
- Post chain: a static up normal attribute, and an `mrtNode` writing the normal / metal-rough targets blended by the mark's own opacity (`?fx=0`: none). Before that the marks wrote a null normal at alpha 1, and GTAO / SSR left a dark imprint even where a mark had faded out (seen in Chrome 2026-11-20).
- Seating: each vertex on `driver.ground()` (the drive surface, decks included) at its own x / z + 3 cm, polygonOffset -4 / -4, depthWrite off, renderOrder 20. A side point more than 12 cm off the wheel's height (a kerb) takes the wheel's height.
- Fade by age in TSL: a frame-updated time uniform minus the vertex birth. Full to ~52 s, gone at 150 s.
- Wet (`wx.uWet`): the lighter "cleared line" colour (MARK_LOOK 0x414852, alpha x0.55), dimmed at night (unlit material), gone in ~8 s (the film refills).
- Snow cover (`wx.uSnowCover` 0.15-0.5) hides them: `snowTrails.js` already stamps the tracks in the snow.

## Chrome check (2026-11-20, quick mode)
- Av. Churchill (H2): a handbrake drift lays two rear lines on asphalt. A full dry brake at 62 km/h gives alpha <= 0.19 (barely visible). Forced past `life`: nothing left, no imprint.
- The H6 deck (881-943, 521): 66 / 66 segments on the deck, every vertex at ground + 3 cm.
- Night: no glow.
- Wet: not judged. Quick mode forces `?weather=old`, so the road itself is not wet; only the switch to the cleared colour was checked.

## Cost
About 1 µs per update, 4 wheels marking (node). No allocation per frame.

## Gate
`tyremarks`: `node --expose-gc --import ./tools/christmas/hook.mjs tools/tyreMarksTest.mjs`.

## Not done yet
- Tyre smoke.
- Scrape marks from a crashed bike.
- Marks for traffic cars.
