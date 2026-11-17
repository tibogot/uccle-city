# HOLES: hollow fronts, hollow blocks, doubled garden piers (2026-11-17, branch claude/holes)

Owner playtest images: 60 (Place de Saint-Job, a red-brick house with the upper front missing, a canopy hanging at the
top), 64 (a row of balconied red-brick blocks with their fronts gone in big chunks, balconies floating), 68 (Chaussée de
Waterloo by Optalweg: a low white building with roof planes in the air, walls missing), and z-fighting garden piers.

## 1. Hollow buildings: the wall repair's walls were wound INTO the building

**Cause.** `viewer/wallRepair.js` (citydefects, 2026-11-16, `?wallfix=old` = off) rebuilds an outer footprint edge whose
UrbIS wall triangles cover under 85 % of it: it drops that edge's triangles and puts a quad strip from the base to the
top line in their place. The strip was wound along the edge's LEFT normal (-tz, tx). Every Uccle footprint ring is
counter-clockwise, so that normal points INTO the footprint. The wall material is FrontSide (`facades.js BLD_SIDE` since
the 2026-11-13 orientation pass), and `facadeGeom.js` pushes triangles as wound, so the street saw each new wall's back
face, which was culled. The original partial wall had been dropped too, so the street saw straight into the building:
**1,796 edges city-wide, 19,417 triangles, 68,593 m2 of wall invisible from outside** (`docs/holes/shell_audit_before.json`).
The repair's comment said "facadeGeom orients each face outward itself", and nothing checked that.

Place de Saint-Job (image 60) is buildingsolid/557601 (I5): its front is an oriel 0.55 m proud from 2.5 m to 81.46 m TAW
over a recessed ground floor, with a soffit under it (cover 77 %). The repair dropped the oriel's front and built a
culled wall instead: the hole above the ground floor, with the setback strip and the eaves (the "canopy") over it.
The balconied blocks (image 64) are the same thing on loggia fronts: there the footprint is the outer line and the
UrbIS walls stand back in the loggias (cover 7-60 %).

**Fix (`viewer/wallRepair.js`, worker rebuilt):**
- the rebuilt strips are wound outward (per edge: the footprint test either side of the edge's middle, with the ring's
  winding as the fallback); `n` is the outward normal;
- **a recess is not a hole**: for each uncovered sample, a ray goes in from the edge against the building's own walls
  and roofs. If the first face it meets is a FRONT face (the recessed wall, a soffit) or there is nothing (the open air
  under an overhang or canopy), the shell is closed there. When every sample is closed and the recess is at least
  0.45 m deep, the edge stays as UrbIS drew it: the loggias, oriels, porches and overhanging roofs keep their depth.
  1,656 edges are kept this way. A shallow step is still rebuilt (Carsoel 13's front, 33 cm proud, with a lone diagonal
  triangle across the door: the case citydefects was written for);
- a short open return (under 1 m) next to a rebuilt edge is rebuilt with it, and a recess that would look through the
  back of a wall rebuilt on another edge is rebuilt too (two passes);
- UrbIS wall triangles on an outer, non-party edge that are wound inward are flipped. Only when both the edge test and
  the triangle's own centre test agree: 120 triangles city-wide that `tools/orient_buildings.mjs` left inward.

**After:** 240 edges rebuilt (all facing out), 0 rebuilt triangles inward, 4 edges still open (at most 8 m2 each), and 69
UrbIS triangles / 15 m2 inward on ring slivers (self-crossing footprint spikes where the inside/outside test is unclear).
`docs/holes/shell_audit_after.json`. A tile's façade analysis takes about as long as before (I5 ~1.0 s, I6 ~1.3 s in node).

Remaining open edges (`node tools/audit/shellGate.mjs` lists them): G4 511407 (7.9 m2), J10 728743 (4.4), J6 518303 (4.1),
E1 532111 (2.9). Remaining inward triangles: J6 723257 (4.8 m2), J7 723856 (2.1), then pieces of 1 m2 or less.

Image 68 (Chaussée de Waterloo by Optalweg): the building wasn't found in the data by name (no street labels in the
tiles). The along-Waterloo tiles had 150 culled rebuilt edges before (H1-J5: 97 + 34 + 155 + 25 + 60 + 153 + 350
triangles) and have 0 now. Roof planes "floating" over missing walls fit the same cause. Still to confirm in the browser.

Switch: `?wallfix=old` still turns the whole repair off (the UrbIS walls as they are). The broken state (culled walls)
has no switch; it is only reachable through `--repair <old file>` in the audits.

## 2. Garden piers z-fighting: doubled piers, spurs, coplanar copings

**Cause.** `tools/gardens/build_gardens.py` puts a pier at each run's end unless a straight neighbour does. Where two
runs meet at an angle (two gardens' fronts, a front and its side), both put one at the same point (to the cm) with
yaws a few degrees apart: two identical brick piers and caps, so every face is drawn twice. On top of that, runs that
double back on themselves (spurs) draw a wall and coping over the previous segment, and at mitred corners two copings
overlap with their flat tops in one plane. The citydefects round fixed the caps' winding, but nothing looked for doubles.
Before: 6,016 coplanar overlaps (2,951 pier + 2,454 pier-cap pairs, 554 coping, 47 wall) (`docs/holes/garden_zfight_before.json`).

**Fix (`viewer/gardens/gardenDedupe.js`, used by `gardenKit.js gardenInstances()`; `?gardenpier=old` = before):**
- piers closer than 0.46 m (the cap's width), with bases within 0.3 m, collapse into the tallest one;
- a segment that turns back over 150 degrees onto the previous one is dropped (the shorter of the two);
- at a mitred corner, every other coping in the chain sits 6 mm higher (it reads as a joint between two stones; the
  slit is under the 3.5 cm overhang);
- walls aren't extended at turns under 2 degrees (their side faces would overlap in one plane; the wedge left open is
  under 2 mm, under the coping).

**After:** 34 overlaps, each 67 cm2 or less (16 wall, 16 coping, 2 coping vs pier) (`docs/holes/garden_zfight_after.json`).

## WHY IT HAPPENED + RULE

1. **Root cause.** Two assumptions with no check behind them. (a) The wall repair assumed someone downstream orients
   its faces. Nobody did: the FrontSide switch two days earlier had made winding load-bearing, and the repair was
   checked only by its own coverage audit, which counts triangles, not which way they face. (b) The garden builder
   assumed one pier per spot, but two runs meeting at an angle each place their own. Neither audit looked at what the
   renderer draws from outside: which faces survive culling, and which faces share a plane.
2. **Rules.**
   - **Winding is data**: every triangle generated or repaired at runtime is wound so (B-A)x(C-A) points out of the
     solid, and the code that makes it checks that against the footprint. Its `n` is never trusted on its own.
   - **Never drop source geometry to fill a hole without proving it was a hole**: what the street sees through the
     gap must be the inside of the solid (a back face), not a recess wall, a soffit or open air.
   - **One surface per place**: no two drawn faces share a plane (within 5 mm) over more than a few cm2. Generators
     dedupe their own instances (piers, segments), and pieces that must overlap (mitres) are offset.
3. **Automated checks** (both run on every tile, both exit 1 on a violation):
   - `node tools/audit/shellGate.mjs` (~13 s, 12 processes): `tools/audit/wallAudit.mjs` on every tile, as
     `facadeGeom.js` draws the walls (repair applied). It FAILS if any repair-made wall triangle is wound inward (limit
     0), if more than 5 outer edges are still open (the street sees a back face through them), or if more than 25 m2
     of UrbIS wall on outer edges is wound inward. Self-test: `--repair <old wallRepair.js>` FAILS (19,417 inward).
   - `node tools/audit/gardenZfight.mjs --all --max 40` (~3 s): the garden kit's boxy pieces as `gardenInstances()`
     places them, every pair of same-facing faces in one plane overlapping more than 4 cm2 (and 2 mm wide). Self-test:
     `--old` FAILS (6,016).
   - Both are in **`node tools/audit/mergeGate.mjs`**, which runs every gate and prints a table. Run it before every
     merge.

## Commands

    node tools/audit/mergeGate.mjs                                  # before every merge
    node tools/audit/wallAudit.mjs --all [--out FILE]               # the shell counts, per tile
    node tools/audit/wallAudit.mjs --repair OLD.js --all            # the counts with another wallRepair.js
    node tools/audit/gardenZfight.mjs --all [--old] [--json FILE]   # the garden z-fights

## Browser check

To do on the browser turn: `?quick=1&place=stjob-street` and the I5 front of 557601, the balconied blocks, Waterloo by
Optalweg, garden piers. Before / after images go in docs/holes/.
