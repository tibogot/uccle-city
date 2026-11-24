---
status: provisional
added: 2026-11-23
check: `parkfence` (tools/audit/parkFenceCheck.mjs, the papenkasteel row)
---
**Rule.** A private ground the owner names (a castle's grounds with no OSM polygon) is closed as Street View shows it,
with the park-fence kit and the garden hedges: its line is written in its obs file (data/parkfence/<id>.obs.json `ring`:
the street frontages a few metres in from the centre lines, closed through the grounds by a `none` stretch: a listed gap
of reason "obs"), every stretch typed from the look (mesh, an old brick wall: `brickwall`, nothing where the building
itself or a hedge closes it), its gates where they are (piers in their own finish, leaves open or closed as seen), the
hedges the garden kit does not plan as gardenRestyle lines (data/overrides.json, `line`, species / height), all under the
job's switch. No gate is drawn that was not seen.

**Why.** Owner playtest 2026-11-16: "Papenkasteel castle: gates all round and very big fences". Street View (Apr 2024):
the grounds are closed on Rue Papenkasteel by a ~2.1 m clipped beech hedge with ONE street gate (white-rendered piers, a
black iron double gate, closed), on Rue Kinsendael by a wooded bank with a mesh fence, the outbuilding range's own back
wall, then a tall old brick wall. The city drew none of it (the castle is a hero model; the garden kit only plans house
fronts), so the grounds lay open to both streets.
