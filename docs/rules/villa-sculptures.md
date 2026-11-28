---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2h: one draw a level, LOD0 <= 46k / LOD1 <= 12k / LOD2 <= 1.5k triangles, each statue on its plinth within 5 mm; 2d: every scan in models/villa/LICENCES.md)
---
**Rule.** The villa's sculptures are real CC0 scans (Poly Haven, each asset page + the licence page read; Smithsonian /
Scan the World only for objects whose own page states CC0 / public domain), downloaded untouched to
data/raw/villa_sculptures/<id>/ and listed in models/villa/LICENCES.md. LOD0 = the scan itself (welded, its open
base filled), LOD1 / LOD2 = a VOXEL REMESH of it, decimated, its UV transferred back (the scan's own baked maps
apply at every level). All share ONE material (a KTX2 array layer per statue: diffuse + AO, normal + roughness +
metal); each stands on a pale stone plinth with a cap stone, a ground uplight in front (emissive lens; the statue's
night wash computed in its material: no light). Mesh audit 0 blocking at every level.

**Why.** The owner asked for "better sculptures"; there were none. Decimating the scans opened slits (leak) and
folded slivers (crossing / flipped: 220 blocking items on the first pack); scaling the horse x6 turned its
millimetre seams into 4-30 mm slits. Fixed by cause (weld, hole fill, remesh-then-decimate), never by switching
audit checks off.
