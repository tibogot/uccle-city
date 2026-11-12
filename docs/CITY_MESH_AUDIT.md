# The procedural city through the mesh checker (report only, 2026-11-10)

The owner saw flickering on buildings while flying. The shared mesh checker (`tools/mesh_audit/`, on `claude/stalle`
until merged) was run on the GENERATED geometry of one tile, I6 (Saint-Job), in the browser: the viewer built the
tile (port 8802 = `claude/stalle`, which has today's city code + the checker), then `auditParts` ran on the meshes
as drawn (`partFromBufferGeometry` with their world matrices, maxDistance 200 m). Instanced meshes (trees, cars,
furniture) were not included. Nothing was changed.

## Results, tile I6

| mesh groups audited together | triangles | blocking | z-fight related (coplanar / depth / crossing) | shading (bentflat / streak / flipped) | leak |
|---|---|---|---|---|---|
| buildings-walls + buildings-roofs | 30,054 | 3,172 | 311 / 17 / 42 | 2,755 / 35 / 0 | 12 |
| buildings-details + buildings-walls | 120,865 | 78,000 | **13,607** / 410 / 482 | 985 / 99 / **62,136** | 281 |
| roads (asphalt, concrete, square, pits) + tram rails + platform edges | 87,431 | 20,944 | **2,230** / 84 / 16 | 9,574 / 1,349 / 6,372 | 1,319 |

Where the z-fight items sit (the first items by mesh pair; the item lists are capped per check):
- details on walls: coplanar 389, depth 203, crossing 349 in the sample: sills, cornices, bands, frames lying in or
  crossing the wall plane. **This is very likely the "flickering on buildings" the owner saw.**
- details on details: depth 191, crossing 28.
- walls on walls: coplanar 11, crossing 23, depth 6 (party walls / adjoining façades).
- roads: coplanar pairs inside roads-asphalt itself (overlapping engine pieces; `claude/roads2` phase 1 already
  lifts these into height tiers and cut the overlap area by a third: re-run on that branch).

## Caveats (to triage before fixing)

- `flipped` (62k on details, 6k on roads) may be partly false alarms: double-sided materials, or geometry whose normals
  are set on purpose (decals); to verify on a few items before counting them as bugs.
- `bentflat` on roads may be terrain-draped strips whose smooth normals are intended; on buildings it is real (the
  owner's shading rule).
- One tile only, and the checker was calibrated on hero models: thresholds may need a city profile.
- Runtime: 14 s (walls + roofs), 37 s (roads), 80 s (details + walls) in the browser; a Node run on the worker's
  output (or in the tile worker itself, report mode) is the way to do all 120 tiles.

## Next (owner to approve)

1. Merge the checker into main (it comes with `claude/stalle`).
2. Fix the façade details at the source (the generator: offset sills / cornices / bands off the wall plane by a depth-safe
   margin or cut them into it cleanly; no coplanar strips), then re-run I6 and 3 other tiles.
3. Re-run roads on `claude/roads2`.
4. A `city` profile + a Node runner over all 120 tiles as a build check.

## Triage (2026-11-11): what causes the façade flicker

Re-run on I6 with the checker's `debugTris` (both triangles of every item, up to 4,000 per check), each item sorted by
mesh pair and by the DETAIL triangle's height (every detail is a `box()` in `viewer/facadeGeom.js`, whose height
identifies it). In the 4,000 coplanar items sampled (13,816 in all):

| detail | where (`viewer/facadeGeom.js`) | coplanar | depth | cause |
|---|---|---|---|---|
| cornice upper box, 0.16 m | line 321 | 1,099 vs walls + 85 vs details | 93 + 82 | the box's SQUARE END CAP at an outside corner lies exactly in the next wall's plane, facing out (separation 0 mm): it fights the wall; at inside corners the box runs into the neighbour wall |
| cornice lower box, 0.12 m | line 322 | 1,050 vs walls + 19 | 88 | the same |
| gutter, 0.1 m | line 395 | 213 vs walls + 365 vs details | 22 + 30 | the same, plus gutters of adjoining segments overlapping |
| box tops at corners | 321 / 322 / 393 | 701 (details vs details, horizontal) | 15 | at a corner the two segments' boxes both cover the corner square: two coplanar tops (and soffits) overlap |
| party-wall / fire-wall caps, 2.4 m | line 353 | 58 | 15 | both neighbours build the same wall cap |
| roof vs roof / wall vs wall | roofs, walls | 153 / 127 (+ 31 roof vs wall) | 11 / 6 | adjoining buildings whose UrbIS solids share a plane (party walls drawn twice: 23,046 back-to-back pairs) |
| crossings | details vs walls 349, details vs details 110 | | | boxes running into the neighbour wall at inside corners |

The other numbers are mostly NOT flicker:
- `flipped` 62,136 on details: `box()` winds some quads against their normal; the detail material is
  `side: THREE.DoubleSide` (`viewer/facades.js:454`), which hides it. Not visible today, but it doubles the detail
  fill cost and breaks back-face culling: fix the winding, then drop DoubleSide.
- `bentflat` on walls (2,757): to check (smooth normals on wall faces next to openings?); `sliver` / `seam` / `opening`:
  info, by design.

## The fix plan (in `viewer/facadeGeom.js`, worker code; rebuild the bundle)

1. **Mitred corners for the strip details** (cornices, bands, gutters): build each façade ring's strips as one chain;
   at every vertex mitre the two boxes on the bisector (outside corners) or stop them at the neighbour's front plane
   (inside corners). No end caps where a strip continues; end caps only at a free end, set back 2 mm from any wall.
   This removes ~2,500 of the 4,000 sampled items (cornice, gutter, corner tops).
2. **Party walls**: generate a shared wall / cap once (the building with the lower id draws it), the neighbour skips it.
3. **Winding**: wind every `box()` / `beam()` quad by its normal; then the detail material goes back to front-side
   only (cheaper).
4. Coplanar roofs of adjoining solids: lift the later one's roof by the depth-safe margin at its own LOD distance
   (the checker's `need_mm`), or clip the shared region.
5. Re-run the checker on I6 + 3 tiles (0 coplanar / depth / crossing on details), then the flicker test while flying
   over a street at 30, 80, 200 m, before / after strips.

Conflicts: the façade-kit branch (`claude/facade-kit`, waiting for the owner) changes the face loop of
`analyseBuildings` but not `box()` / `beam()` nor their callers' geometry: do this fix after (or on top of) the kit
merge to avoid a messy conflict.
