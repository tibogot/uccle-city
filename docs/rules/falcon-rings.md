---
status: provisional
added: 2026-11-26
check: `falconrings` (tools/falconRingsTest.mjs: the courses over the real tiles, every ring in free air, the avenue under the tram wires, a scripted flight through every course with both controllers, the ghost's record / replay, the view's draw budget; self-test: rings sunk into the floor are caught) + the browser row `falconrings`
---
**Rule.** A ring course must be flyable, and seen to be flyable, before it ships.

- **Free air.** Every ring stands clear of the city: its centre and 12 points round its rim (r x 1.06 + 0.3 m) are at least 0.4 m off any roof, landmark envelope, crown or the street. The check uses the city's own falcon world (`cityStream.js` column) over the real tiles. The hero models' UrbIS solids are kept for it, because their envelopes are bigger than the models, and the street trees' crowns are taken 1.3 x the generic size.
- **Under the wires.** The avenue's rings have their tops 5.4 m over the drawn street: under the tram wires (5.5 m).
- **Flown through.** A scripted flight goes through every ring in order with BOTH controllers. With the gym controller it finishes inside the bronze time; with the current one, inside 3 x the bronze. The medals come from the gym run (gold ~ +10 %, silver + 30 %, bronze + 60 %).
- **Baked.** The rings are data (`data/falcon/rings.json`), baked by `tools/falconRingsTest.mjs --bake`. The check fails when today's tiles would place them differently. The game loads only the active course.
- **Cheap.** The rings are ONE `InstancedMesh` + ONE material. Their matrices are written once per course in a static buffer (rule no-dynamic-draw-usage). The cue (the next ring gold and pulsing, the passed ones dim) is the material's uniforms. No light is added (rule fixed-light-count). The ghost is ONE static mesh, baked once from the v2 falcon's far LOD in its Glide pose, translucent. Nothing is allocated per frame.

**Why.** Owner idea, 2026-11-26 (docs/TODO.md 4b3): "go through rings: not realistic but it's about controlling the falcon well; the goal: the game not boring". Rings are a goal for the flying itself, not for the hunt. A ring that is unreachable, or that sits inside a roof or a crown, is worse than none: the player blames the controls.

The first layout failed on its own check in three ways, and each is now part of the rule:

- **The stoop.** It was a vertical line of rings. Neither controller holds a vertical dive: they reach ~57 deg. Both passed the first ring and missed the next one. The line is now 50 deg.
- **The avenue.** Its 2.8 m rings could not be both under the wires and 0.4 m clear of the street. The rings are now 2.0-2.2 m.
- **The bends.** A ring at a bend that faced the next ring was missed by 2 m and orbited. The rings now face the bisector of the way in and the way out.

The browser check found three more:

- **The loader.** The falcon flew on behind the play loader: it was 500 m past the first ring when the loader closed. It is now held at the start until the loader closes.
- **Hunting.** The flyer still handed it the nearest pigeons, and it caught one on the avenue. A course now sets an empty prey source.
- **The start.** The city's wind drifts a hands-off start ~9 m in 55 m, so the start is now 40 m before the first ring. The stoop's line was below the level chase camera's view, so its start is now 60 m back and 10 m up, where the line is in view.

**What it is** (`viewer/falconGame/ringCourses.js`, `ringsView.js`, `ringsGame.js`, falcon game menu: Rings):

- **The spires.** 17 rings, 7-9 m, 42-60 m over the roofs, a slalom from Saint-Job's tower to Saint-Pierre's.
- **The avenue.** 19 rings, 2.0-2.2 m, down Avenue Brugmann.
- **The stoop.** A 50 deg line of 6 rings off the Observatory's dome, then the pull-out gate and the finish.
- **The run.** The clock starts at the first ring, the rings count in order, and the finish gives the time and the medal.
- **Restart and ghost.** R starts again at the course's start. The best run is kept in the browser (`localStorage`) and flies as the ghost on the next try.
- **The cues.** An arrow on the screen's edge points at the next ring when it is off screen, and the HUD shows the course, the ring, the time, the medal it is on and the best.
- **Both controllers and both models.** The flight is the city's own, with no pigeons.
