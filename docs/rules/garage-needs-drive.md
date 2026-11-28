---
status: provisional
added: 2026-11-28
check: `garageev` (tools/audit/garageEvidenceCheck.mjs: E every painted garage door on a building with a car way in front, N <= 3,900 doors, D the evidence built, F Delvaux 36 / Equateur 13); `garagedrive` (the drives follow the doors)
---
**Rule.** A garage door needs evidence of a car way in front of the building, never a coin. tools/bldclass/build_evidence.py
writes `drive` (topo / ramp / osm) on a solid when a free footprint edge (>= 2 m, not against another solid) has, 0.3 m in
from its ends and 0.3-35 m out, a point of an UrbIS Topo CR42L driveway line, an UrbIS ramp surface (a dropped kerb,
surfaces.json class 8) or an OSM service road, nearer this solid than any other; viewer/buildingTypes.js classify draws a
garage (bel-étage, or a villa's 45 % share) only on a BU group carrying it. The gardens (tools/gardens/build_gardens.py,
rule garage-has-drive) pave drives only to those doors. `?garageev=old` (GARAGE_EV=old for faces.mjs): the coin again.

**Why.** Reality round (docs/TODO.md item 6): "Rue Delvaux 36: Street View shows a low plinth, a railing and a garden
gate, no garage; the kit paints one and the gardens draw a drive". Cause: classify gave every post-war bel-étage and 45 %
of the villas a garage door by type and hash alone (6,621 doors); nothing looked at the street. Street View (look only,
2026-11-28) at Av. Arnold Delvaux 36 itself shows a narrow 3-storey brick house with a DOUBLE garage on a paved drive
(UrbIS has its CR42L line and ramp): it keeps its door; the plinth / railing / gate front is its neighbour. City-wide
6,621 -> 3,793 doors (2,153 bel-étages, 720 villas lose theirs), drives 2,937 -> 1,872. Spot check of 10 removed doors:
8 right (rows on the sidewalk line, a shop row, hedged villas, a semi with a side gate), 2 doubtful (Av. des Statuaires:
a 25 m drive to a garage, the pano snapped to No 88; Rue Keyenbempt: new houses with garages whose ramp lies to the side
of the plot, not in front).
