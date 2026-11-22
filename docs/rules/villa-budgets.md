---
status: provisional
added: 2026-11-22
check: `villa` (tools/audit/villaCheck.mjs) + browser row `villa` (the stream-in hitch, tools/audit/gate.d/browser/villa.mjs)
---
**Rule.** The villa on Av. du Prince d'Orange (viewer/villa/) stays inside its budgets: download (villa.glb + interior.glb)
<= 5 MB; LOD0 <= 60k triangles, LOD1 <= 20k, LOD2 <= 1.5k, one draw per named slot (<= 9 per level); the interior cell
<= 140k triangles and <= 16 draws, every opaque interior primitive carrying its three baked lights (sky / sun / night: no
runtime light, rule fixed-light-count). The interior streams in (fetch < 60 m, shown < 30 m) with its shaders built in
the background before it shows: no frame over 33 ms while it fetches, compiles or appears. The drive lane from the gate
to the garage's right bay is free of car blockers and no parked car stands in it; the closed gate closes its mouth; the
walker finds a floor under every interior spawn, a walkable riser on every stair tread and a floor in the pool.

**Why.** The owner's first concern for the villa (2026-11-22) was performance: a big detailed house with an interior must
not cost the city. A hero with an interior is the case where triangles, draws and a stream-in hitch creep up unseen
(the house pilot's first stream-in was a 51-65 ms long task, docs/INTERIOR.md); the first browser test of this villa put
a parked SUV in the only bay the player's car could enter (the car stopped against it).
