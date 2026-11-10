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
