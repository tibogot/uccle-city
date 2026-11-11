# Mesh audit of the other heroes (2026-11-10, report only, nothing fixed)

Run with the checker as calibrated on the Chapelle de Stalle (README.md "Calibration"), on the PACKED GLBs (quantized
positions: what the browser draws), one LOD group at a time, each with its band's end as the view distance. No allow
lists, no `--ignore-below` (some items may be under the ground), items NOT traced one by one: read the numbers as "where
to look", not as a verified defect list. Item lists are capped at 400 per check (the counts are complete).

```
node tools/mesh_audit/cli.mjs <glb> --nodes <node> --range <node>=<band end> --out <dir> --no-fail
```

| hero (source) | level (range) | tris | BLOCKING | coplanar | depth | crossing | leak | streak | flipped | main parts |
|---|---|---|---|---|---|---|---|---|---|---|
| Town hall (`models/townhall/townhall.glb`, foundation) | LOD0 TownHall (128 m) | 54,734 | 1,705 | 1,518 | 0 | 183 | 4 | 0 | 0 | stone_white on stone_white (bands / surrounds / quoins meeting); slate x zinc crossings (flashings) |
| | LOD1 TownHall_lod1 (470 m) | 22,534 | 2,762 | 1,642 | 53 | 120 | 10 | 937 | 0 | meshopt LOD: brick x stone overlaps, stretched stone triangles (streaks) |
| | LOD2 TownHall_lod2 (2 km) | 3,031 | 409 | 386 | 4 | 8 | 2 | 9 | 0 | |
| Saint-Job (`models/stjob/stjob.glb`, foundation) | LOD0 StJob (170 m) | 38,579 | 3,804 | 3,709 | 0 | 0 | 5 | 90 | 0 | Masonry on Masonry (the old box-kit pieces), roof streaks |
| | far StJob_far (2 km) | 5,205 | 471 | 465 | 0 | 4 | 2 | 0 | 0 | (LOD1 is simplified at load in the browser: not in the GLB, not audited) |
| Saint-Pierre (`agent-ae8ce83307390d83c/models/stpierre/stpierre.glb`, read only) | LOD0 StPierre (128 m) | 30,922 | 1,219 | 940 | 1 | 93 | 61 | 124 | 0 | stone on stone, stone x copper; open copper edges (leaks 53) |
| | LOD1 StPierre_lod1 (470 m) | 12,489 | 4,880 | 1,776 | 84 | 104 | 78 | 2,836 | 2 | meshopt LOD: streaks on stone, brick x stone overlaps |
| | LOD2 StPierre_lod2 (2 km) | 1,671 | 613 | 300 | 6 | 0 | 34 | 272 | 1 | |
| Royal Observatory (`git show claude/observatory:models/observatory/observatory.glb`) | LOD0 Observatory (172 m) | 174,668 | 17,742 | 12,364 | 120 | 4,290 | 779 | 155 | 34 | stone x stone crossings, copper_patina leaks (domes / drums), gravel paths overlapping |
| | LOD1 Observatory_lod1 (580 m) | 66,233 | 42,404 | 7,017 | 809 | 7,955 | 720 | 25,808 | 95 | meshopt LOD: streaks everywhere |
| | LOD2 Observatory_lod2 (2 km) | 14,412 | 3,614 | 1,162 | 76 | 45 | 239 | 2,092 | 0 | |

For comparison, the chapel (same checker): round 2 LOD0 582 blocking (raw) / LOD1 1,506 (packed); round 3 LOD0 0 (raw,
1 justified), LOD1 = the scripted far variant 0, interior cell 0 (2 justified). Report files are not kept in the repo;
re-run the command above.

## What the numbers say
1. **Every hero's LOD0 has hundreds to thousands of coplanar overlaps.** The chapel's equivalents were kit pieces whose
   faces sit exactly on another piece's face (quoins on plinth ends, bands on corners, coping halves at an apex, end caps
   flush with a wall, crossing bars of a window or a cross). Saint-Job's 3,709 are "Masonry on Masonry": the old box kit.
2. **Every meshopt-simplified LOD1 is worse than its LOD0** (streaks and overlaps from collapsed parts). Town hall,
   Saint-Pierre and the Observatory all build LOD1 that way; the chapel now uses its scripted far variant instead. The
   town hall's "far sparkle" (round 2b) is consistent with this.
3. **Leaks** are few except where thin open sheets are used: Saint-Pierre's and the Observatory's copper (domes, roofs).
4. **Crossings** (faces crossing at < 12 deg): roofs x flashings (town hall), stone pieces sunk into each other
   (Observatory 4,290).

## Suggested order (when each hero gets its pass)
Hook the checker into each pack script (`auditGroups`, README), trace the largest clusters with `--set debugTris=1` /
`--set traceAt=[x,y,z]` (the chapel's clusters were each one fix in the generator, not per triangle), replace the
meshopt LOD1 by a scripted mid variant or audit-guided simplification, then allow-list what is truly invisible with a
reason. Observatory first (largest), then Saint-Job (box kit), Saint-Pierre, town hall.
