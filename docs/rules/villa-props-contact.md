---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2c: under every re-made piece's footprint the lowest vertex within 5 mm of the floor / rug, nothing sunk > 5 mm; the fabrics in ONE props slot)
---
**Rule.** A re-made villa furniture piece (docs/VILLA_V3_PLAN.md) SITS on its floor: under its footprint
(interior.json `contact`, written by tools/blender/villa.py from the piece's collider box) the lowest drawn vertex is
within 5 mm of the floor (or the rug's top), nothing sinks more than 5 mm into it, and the floor's TSL draws a contact
shadow round the footprint (a 7 cm falloff: no decal, no draw). Cloth (duvet, turn-down, throw) is simulated on the
piece's own meshes as colliders with its head edge pinned (it cannot slide off: the build stops if a cloth reaches the
floor), relaxed before it is thickened, and its folded-over slivers are dissolved (mesh audit 0 blocking). The fabrics
share ONE textured slot `props` (no draw per fabric).

**Why.** The audit (docs/VILLA_V3_PLAN.md §2) found the furniture floating: the per-corner bake (0.42 m grid) cannot hold
the dark crease where a bed meets the floor, and round 2's throw hovered 10 cm over the bed. The first cloth build slid
the duvet off the bed's foot onto the floor (455 blocking audit items: crumpled, self-crossing cloth) because the foot's
overhang pulled it; pinning the head edge (as a duvet lies under the pillows) fixed it by cause.
