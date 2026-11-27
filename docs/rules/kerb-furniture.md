---
status: provisional
added: 2026-11-26
check: `kerbfurniture` (tools/audit/kerbFurnitureCheck.mjs S school hairpins on the sidewalk along the kerb, door open, >= 2 a school in reach; K timber bollards only by green and off the shop streets; V no light, static, car posts, wired)
---
**Rule.** The kerb carries the furniture its place has. In front of every school front (the street life's school faces)
whose kerb the measured street has, black steel hairpin barriers run along that kerb (viewer/streets/kerbFurniture.js
schoolBarriers: 1.5 m apart, 0.45 m behind the kerb on the sidewalk, never in a driven lane, the door left open over
3.2 m in the front's middle; the kerb is the one whose raised side faces the school, probed 3 / 8 / 14 m out, not a
side street's). The surveyed bollards within 15 m of public green (>= 2,500 m2: a park, a wood, the station green) and >= 40 m from a shopfront are brown timber posts
with a red retroreflective band, the others stay the green cast iron (bollardKinds). Drawn procedurally: one shared
hairpin geometry + material, one instanced draw a tile (viewer/kerbBarriers.js); the bollards one instanced mesh per
kind in use (viewer/streetFit.js buildBollards .slot keeps the props and colliders index for index). Every hairpin's two
legs are car posts (main.js drawn.bollards, rule colliders-match-drawn); the walker's posts come from the instances.
No light. `?kerbbarriers=0`: neither.

**Why.** Reality round 2026-11-26 class C8: Street View (look only) showed hairpin barriers in front of the schools
(Dieweg, Edith Cavell, Saint-Job), timber bollards with red bands along Calevoet's station green and the Saint-Job hill,
and the green cast iron on the town streets; ours had no barriers and one bollard for every place. The green Brussels
bins and the bike hoops are already drawn from OSM (furniture kit 2); textile containers and the black kerb railings
along the shop streets are left for a later round (no data source found yet beyond OSM's few barrier=guard_rail).
