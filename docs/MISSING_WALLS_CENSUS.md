# Missing walls / open balconies: census (claude/walls1, 2026-11-24)

TODO "Buildings with missing walls" (docs/TODO.md, OWNER PLAYTEST 2026-11-18 step 1) and "Balconies / terraces open at the
sides". A DATA AUDIT only: the list, the causes, a proposed fix and the gate row that will hold it. Nothing in the
viewer is changed on this branch.

Detector: `tools/audit/missingWallsCensus.mjs` (node, offline, no browser; one tile a child process, sequential by default):

    node --import ./tools/road_audit/register.mjs tools/audit/missingWallsCensus.mjs --all [--jobs 1] [--out FILE]
    node --import ./tools/road_audit/register.mjs tools/audit/missingWallsCensus.mjs I3 --solid 520249     (one solid, edge by edge)
    node --import ./tools/road_audit/register.mjs tools/audit/missingWallsCensus.mjs --eyes tools/tour/views.json ...   (view eyes inside a building)

It reads every tile AS THE TILE WORKER DRAWS IT (viewer/tileData.js buildTileData through the gate tile cache: wall
repair, coplanar clean, ground fit + wall feet, facade kit walls; heroes' solids hidden; FrontSide walls) and checks:

- **EDGE**: every outer footprint edge, a sample every 0.5 m along it and every 1 m up, from the drawn ground + 0.6 m to
  0.4 m under the building's OWN roof over a point 0.6 m inside the edge. A horizontal ray from the open air in front
  (the first point 0.3-6 m out with nothing drawn over the ray's height) runs in to 1.2 m inside the edge against the
  drawn shell (walls + kit walls + roofs, the whole tile): front face = ok, back face = **inward** (culled), nothing =
  **missing** (then: a front face deeper in = recess, none = through). A neighbour's mass in front (same tile, a
  neighbouring tile's building, a hidden solid a hero stands on) is a party stretch, skipped. Each failed sample is
  re-run against the SOURCE (UrbIS walls + roofs of buildings.bin) for the cause: **data** (the source is open there
  too), **srcIn** (the source face is wound inward), **lost** (the source closes it, the pipeline lost it; and of those,
  how many hit a source triangle on a "false foot" vertex, below). Per 0.5 m column: SHORT (wall stops under its roof),
  NOWALL (missing at every height), LOW (missing low, closed above: arcades, undercrofts, or a wall foot over the ground).
- **BALC**: every up-facing detail face 0.6-1.6 m out of a building's edge, >= 2 m over its base, with the building's own
  roof >= 1.5 m over it (a balcony / canopy slab hung on a wall): a ray in from 0.5 m over it must meet the shell's
  front face. None = an ORPHAN balcony (a slab with no wall behind it).
- **ROOF**: a 1 m grid inside each footprint: a ray down from over the top must meet an up-facing shell face first.
- **EYES**: tour / shot view eyes (`at = x, z[, h]`) standing inside a building's footprint under its top, read across
  every tile within 150 m (a building is in ONE tile's data, by its own centre).

Load: the whole city, 120 tiles / 25,412 buildings / 9.77 M edge rays, in ~4 min sequential on a warm tile cache, one
node process, ~1 GB.

## 1. UrbIS 520249 (building 1787335, I3, Langeveld): its walls ARE drawn; the eye stood inside it

`--solid 520249`: 1,860 edge rays over all 8 footprint edges, **1,860 meet a front-facing wall** (every column `o`, the
party stretches against 713851 / 538674 / 543646 / 713847 `p`), 0 missing, 0 inward, roof closed (0 of its roof
points open). The UrbIS solid is complete (76 wall triangles, all wound outward) and the tile build keeps it.

The billboards tour's eye for the Langeveld trivision, `at 1504.6,-947.3,1.7` (views_bb2.json, and the first run's
`1502.1,-946.1,1.7` in views_billboards.json), stands **2.2 m inside the footprint's north-east edge**, at y 108.2 under
the block's roof at 122-127 m (ground 106.5, the walls' feet at 101.4). From there every direction meets a wall from
BEHIND (8 horizontal rays: all `BACK`, 2.2-29 m), and the wall material is FrontSide (rule faces-out), so every wall of
the block is culled from that eye. What is left on screen is what is drawn double-sided or facing in: the balcony slabs,
parapets and side panels of the BLOCK type (viewer/facadeGeom.js typeDetails, rule balconies-closed) and their dividers /
the facade kit's pieces = "floating balcony slabs and pillars with no walls around them". The ray to the board runs
through 520249's own south wall (back), the party solids 713851 / 644233 (back) and meets the board's wall (front, 36 m).

So 520249 is not a missing-walls defect; it is an **eye inside a building**. The billboards row already rejects such an
eye since its round 3 (rule billboards: "an eye inside a building is never a street eye", `view` stored per board). The
census's `--eyes` over all tour / shot view files: 68 views, **2 inside a building (both the trivision views above), 0 in
tools/tour/views*.json**.

## 2. Census counts (whole city, 2026-11-24, foundation 2726c13a)

| class | what | count |
|---|---|---|
| EDGE (all) | edge rays failed / cast | 26,005 / 9,766,767 (22,947 missing, 3,058 inward) |
| | buildings open >= 1 m2 / >= 10 m2 / >= 100 m2 | 1,261 / 222 / 14 of 25,412 |
| **E1 feet tear** (lost in the pipeline) | buildings (open >= 1 m2) / m2 | **996 / 4,755 m2**; 782 of them feet-majority; 8,387 of the 9,952 lost samples hit a source triangle on a false-foot vertex |
| **E2 empty edge** (data, NOWALL) | buildings / m2 | 100 / 3,236 m2 |
| **E3 open low** (data, LOW) | buildings / m2 | 100 / 3,792 m2 (most are RECESS: a wall deeper in) |
| **E4 short wall** (data, SHORT) | buildings / m2 | 16 / 428 m2 |
| **E5 inward in UrbIS** (srcIn) | buildings / m2 | 49 / 603 m2 |
| **R roof wound downward** (ROOF back face, source too) | buildings >= 2 m2 / m2 | 138 / ~5,000 m2 (5,036 1 m points; 139 lost in the pipeline, 2 plain holes) |
| **BALC orphan** | slabs with no wall behind / balcony + canopy slab faces checked | **2** (F5 536589 1.5 m2, C8 507212 0.6 m2) / 88,730 |
| EYES | view eyes inside a building | 2 of 68 (both the trivision, section 1) |
| heroes (openMeshes `--heroes --hero stpierre`) | Saint-Pierre hole m2 L0 / L1 / L2 (worst direction), clusters >= 1 m2 | 2.2 / 1.8 / 4.6, clusters 0 / 0 / 5 (ceiling L2 11.8) |

Sizes: >= 1 m2 1,261, >= 2 m2 962, >= 5 m2 478, >= 10 m2 222, >= 25 m2 105, >= 50 m2 46, >= 100 m2 14.
Per sample shape x cause (0.5 x 1 m each): nowall.data 6,723, nowall.lost 6,409, low.data 7,312, low.lost 864,
short.lost 2,458, short.data 731, nowall.srcIn 517, low.srcIn 502, short.srcIn 108, mixed 381.

**A/B, the ground fit and wall feet off** (`BUILD_OVER={"groundFit":false}` = ?groundfit=old, uncached build of every
tile): lost samples 9,952 -> **809** (-92 %; on a false foot 8,387 -> 190), but open-low "data" samples 7,312 -> 17,566
(the walls then stand over the ground: why the feet exist), buildings open >= 1 m2 1,261 -> 680 (13,198 m2 "data").
So the feet close ~10,000 samples of gap under the walls and tear ~9,100 others: the fix keeps the first and stops the
second. Missing samples split 10,234 recess (a front face deeper in) / 12,713 through.

### Worst cases

| tile | solid (building) | m2 | cause | where (x, z) | what is missing |
|---|---|---|---|---|---|
| B5 | 561065 (1781349) | 494 | E3 data LOW | -2528.6, 69.2 | the 240 m block's stepped ends: the lowest 2-6 m of 9 end walls (260 recess, 715 through) |
| D5 | 507248 (1789121) | 414 | E3 data LOW | -1199.1, 115.1 (Rue de Stalle 70) | the lowest ~4-9 m on 4 edges: a recessed ground floor (752 of 828 recess) |
| F7 | 723572 (1591486) | 414 | E2 empty edge | -368.8, 1378.8 (Rue de Verrewinkel 95D) | 2 long walls (19.8 + 14.9 m) with no UrbIS triangle at all |
| F7 | 723573 (1778333) | 360 | E2 empty edge | -386.5, 1372.7 (Verrewinkel 95C) | the same: empty edges, 80 columns |
| H1 | 509208 (1581081) | 311 | E4 short + E2 | 912.7, -1555.7 (Rue Dodonée 92) | walls stop under the roof (65 columns) |
| H1 | 541447 (1779496) | 256 | E5 srcIn | 678.3, -1874.9 (Rue Alphonse Renard 86) | the north edge seen from behind (an overlapping solid 541177 inside it) |
| D3 | 750156 (1796119) | 212 | E3 data LOW | -1063.1, -641.6 (Rue Beeckman 87) | open under, 74 columns |
| J4 | 655873 (1760821) | 155 | E3 + E2 | 1676.8, -353 (Ch. de Waterloo 964) | open low (95 columns) |
| K7 | 548053 (1797359) | 135 | E2 | 2055.5, 1342.4 (Drève du Caporal 5C) | empty edges, 27 columns |
| J5 | 761186 + 760045 | 117 + 117 | E3 | 1742.2, 105.3 (Av. Hamoir 8) | the solid given twice (zfight's solidsGone keeps one): open low |
| E3 | 526306 | 53 | **E1 feet** (106 / 106) | -956.2, -569.7 | wall torn by the feet |
| J7 | 718039 | 52.5 | **E1 feet** (105 / 105) | 1872.2, 1034.5 (Av. du Fort-Jaco 24) | idem |
| K6 | 726369 | 48 | **E1 feet** (96 / 96) | 2027.6, 570.7 | idem |
| F4 | 533428 | 43.5 | **E1 feet** (87 / 87) | -217, -129.8 (Av. Paul Stroobant 41) | idem |
| E5 | 525238 | 43.5 | **E1 feet** (87 / 87) | -996, 148.7 (Rue Rittweger 6) | idem (the census's old E5 worst spot) |
| E4 | 523869 | 40 | **E1 feet** (80 / 80) | -831.8, -374.1 | idem |
| I8 | 542120 | 33 | **E1 feet** (62 / 66) | 1280.1, 1673.3 (Clos de Wagram 10) | idem |
| I3 | 540548 (1727902) | 7 | **E1 feet** (11 / 14) | 1139.3, -902.7 (Av. de la Floride 63A) | traced below |

The full list (every building, per-edge numbers) is what the script writes with `--out`.

## 3. Causes

### E1 (the main pipeline cause): the wall feet pull down vertices that are not feet

viewer/groundFit.js `sinkFeet` (JOINS; the walls' feet sunk onto the drawn ground, run in viewer/tileData.js before the
drive colliders) calls an edge a FOOT when both its corners are the lowest wall vertex at their x|z and it slopes under
0.6; it then moves every vertex at that x|z|y, in EVERY wall triangle of the building, down by the shift. The test looks
at vertices only, so it also takes:

- **the top of a plinth under a recess** (I3 536783, Av. De Fré 202): the front's lower wall triangle (9061) ends at a
  flat edge at 103.0 m, the recessed porch behind it starts there; both corners are the lowest vertices at their x|z (the
  wall under them has no vertex there): the plinth's TOP is sunk to the ground and the wall collapses, 8 columns open;
- **a step in the solid's bottom outline** (I3 540548, Av. de la Floride 63A): a sliver triangle's corner B (105.66) sits
  over the big wall triangle A-C-D that runs down to 102.32; A-B passes the test, A and B go down 2.57 m while C stays:
  the A-C line drops, the sliver turns over (wound inward) and a 1.5 m band under the roof opens (11 of 14 samples);
- **a hanging edge over a porch** (I3 539754): the porch lintel at 107.69 is 2.4 m over the ground (under MAX_GAP 2.5)
  and is the lowest vertex there: it is pulled down to 105.0, and the front wall's fan apex at the same x|z|y goes with
  it, tearing the front (9 of 9).

Measured: 40,002 of the city's 288,154 foot edges are such false feet (an edge with its own wall under it, or its wall
going on >= 0.5 m lower within 1.5 m); 8,387 of the 9,952 lost samples (84 %) hit a source triangle on one of their
vertices; with the ground fit (and so the feet) off the lost samples fall from 9,952 to 809 (section 2's A/B).

Why it was not seen: rule faces-out's `shell` row (tools/audit/wallAudit.mjs) reads the UrbIS solids and
viewer/wallRepair.js, never the sunk walls; the old census class A (openMeshes.mjs) probes the drawn walls but reports
m2 only, with no cause; the feet came later (JOINS, colliders rule 25: "the walls' feet sunk onto the ground") and were
checked for contact (the foot meets the ground), not for what they do to the wall above.

### E2: UrbIS edges with no wall triangle at all are never repaired

viewer/wallRepair.js `repairWalls` rebuilds an edge whose UrbIS triangles cover it under 85 %, but skips an edge with
NO triangle on it (`if (!on.length) continue;`): Verrewinkel 95C / 95D (F7 723572 / 723573: the two long sides of each
block, 15-20 m, are simply absent in the source), 100 buildings / 3,236 m2 (73 of them mostly see-through). wallAudit.mjs's "roofOnly" counts only
solids whose EVERY open edge is bare (canopies), so a solid with some walls and some empty edges passes `shell`.

### E3: open low (walls closed above, open near the ground)

100 buildings / 3,792 m2, 65 of them mostly RECESS (a front face further in): a ground floor set back under the upper floors, an
undercroft on pilotis, a passage (D5 Rue de Stalle 70: 752 of 828 samples recess). Many are real; the rest are walls
whose foot stands over the drawn ground by more than FEET.MAX_GAP (2.5 m: the feet do not reach) or a solid given twice
(J5 Av. Hamoir 8). Needs a Street View look per case before any fix (look only).

### E4 / E5 / R: the source itself

- E4 short (16 / 428 m2): UrbIS walls ending under their own roof's edge (H1 Rue Dodonée 92).
- E5 inward (49 / 603 m2): UrbIS wall triangles wound into the footprint that wallRepair does not judge (or the wall of
  an overlapping solid seen from behind: H1 541447 / 541177).
- R roof down (138 buildings >= 2 m2): UrbIS roof triangles facing DOWN with nothing of the solid over them (I1 540558:
  510 points all on one flat triangle at 98.6 m, ny -1.00): culled from above, a hole seen from the falcon / the hill.

### Balconies (class B) and Saint-Pierre

- Balconies: 2 orphan slabs in the whole city (88,730 balcony / canopy slab faces checked): the BLOCK balconies are built
  only where the face's own wall stands (`runsOn`) and closed at the sides (rule balconies-closed, gate row
  `balconies`). The "open balconies" playtest note (Alsemberg apartment blocks) is the class B fixed on 2026-11-18;
  the "floating balcony slabs" of 520249 are the eye-inside case of section 1, not a balcony defect.
- Saint-Pierre: its tile solid is hidden (the hero GLB stands there). The "whole wall pieces missing" were the generator
  (tools/blender/stpierre.py: the porch bay cut at bay 4, the south side ending at u 33.3), fixed by claude/heroshell
  (rule heroes-closed, gate row `heroshell`). Today: L0 / L1 no cluster >= 1 m2 (2.2 / 1.8 m2 summed over the worst
  direction); L2 (the far level, seen from > ~450 m) 4.6 m2 in 5 clusters, under its ceiling 11.8.

## 4. Proposed fix (next branch; not done here)

1. **E1, viewer/groundFit.js sinkFeet** (the class, at the generator): a foot edge must be on the wall mesh's LOWER
   BOUNDARY: (a) every wall triangle using it lies above it (no triangle whose third corner is under the edge's line),
   and (b) the building's own wall does not go on >= 0.5 m lower within 1.5 m of it (a porch lintel, a passage soffit,
   a stepped base). Better still, and the joins rule's other half: do not MOVE shared vertices at all; emit a SKIRT from
   each true foot edge down to the ground - SINK (two triangles, wound out, the wall's own face attributes), so nothing
   above the foot can tear. Switch `?feet=old`. Expected: lost 9,952 -> the non-feet rest (A/B above), no change in the
   drive colliders' "missing" count (rule colliders-match-drawn: the skirt is drawn and collides as the sunk wall did).
2. **E2, viewer/wallRepair.js**: an edge with no triangle, not a party stretch, under the building's own roof and not a
   recess (the same `probe()`), is rebuilt like a partial one (a quad strip from the base to the roof's edge over it).
   `?wallfix=old` keeps the old behaviour. Expected: 100 buildings / 3,236 m2 -> ~0 (Verrewinkel 95C / 95D).
3. **R**: a roof triangle facing down with nothing of its own solid over it is flipped (the roof's up side drawn), in
   facadeGeom.js where the roof triangles are pushed (138 buildings).
4. E3 / E4 / E5: after a Street View look (look only) per worst case; real arcades and undercrofts stay open.

## 5. Gate row design (holds the class)

Rule `docs/rules/walls-closed-from-street.md` (provisional):

> **Rule.** Every building the tile worker draws is closed from the street AS DRAWN, after every step that moves or adds
> its walls (repair, coplanar clean, feet, kit): along each outer footprint edge that is not a party stretch, from the
> drawn ground to the building's own roof, a ray from the open air meets a front-facing wall within 1.2 m behind the edge.
> A step that moves wall vertices moves only the mesh's lower boundary (a skirt is better than a move); an edge the
> source leaves empty is rebuilt; an opening that is real (an arcade, an undercroft) is listed in the gap register with
> its Street View check. A view eye (tour, shot, billboard street eye) never stands inside a building.
>
> **Why.** 520249 looked like a block with no walls: the eye stood inside it (all walls culled). The census then found
> 996 buildings torn by the wall feet (sinkFeet moved plinth tops, lintels and bottom steps with every triangle on
> them) and 100 with UrbIS edges that wallRepair skipped: `shell` read the solids before the feet, never the walls as
> drawn.

Gate row `tools/audit/gate.d/walls.mjs` (node, offline):

```js
export default {
  name: "walls",
  script: "tools/audit/missingWallsCensus.mjs",
  node: ["--import", "./tools/road_audit/register.mjs"],
  args: ["--all", "--jobs", "4", "--gate", "tools/audit/missingWalls.ceil.json", "--eyes", "tools/tour/views.json", "tools/tour/views_sunstep.json", "tools/tour/views_xmas.json"],
  guards: "every drawn building closed from the street at every outer edge (edge rays: lost / data / srcIn per cause under the ceilings, lost.feet = 0), 0 orphan balconies, 0 roof faces down over open sky (after fix 3), 0 tour eyes inside a building; the A/B (BUILD_OVER feet old) must FAIL (rule walls-closed-from-street)",
};
```

- `--gate FILE` (to add): exit 1 when a count is over its ceiling. Ceilings, per cause: `lostFeet: 0`, `lost` <= the
  non-feet rest measured after fix 1, `data.nowall` <= after fix 2, `low.*`, `short.*`, `srcIn` = today's counts as a
  ratchet (only down), `balcOrphan` <= 2, `eyesInside: 0`. Findings as gap-register ids
  `walls.edge:<solid>:<edge>-<u0>-<u1>` (rule gap-register) so a real arcade is an entry with its Street View evidence,
  not a raised ceiling.
- The row's own test: the same run with the feet as they are today must FAIL (`lostFeet > 0`), like `shell --repair`.
- Time: ~4 min sequential, ~1-1.5 min with `--jobs 4` on a warm tile cache (the gate builds the tiles anyway); a fast
  lane variant on the 6 tiles with the most cases (I3, F7, H1, D5, E5, J5) for small branches.
- The billboards row keeps its own eye check (its street eyes are generated, not listed in the tour files).
