# Park fences and gates: Wolvendael and the Sauvagère (claude/parkfence, 2026-11-23)

Owner, TODO step 3: "Wolvendael: big metal fences all round + several big gates (one at the Dieweg tram terminus)";
"Parc de la Sauvagère: fences all round, a few gates and entrances; check on Street View". Rule park-fence
(docs/rules/park-fence.md), gate row `parkfence`, switch `?parkfence=0` (none, as before).

## 1. What is there (look-only Street View, Google car imagery 2024 + one 2017 user sphere; nothing stored or traced)

The findings are data, in our own words and city coordinates: `data/parkfence/wolvendael.obs.json`,
`data/parkfence/sauvagere.obs.json`.

**Parc de Wolvendael** (OSM way 14384466, 2,158 m round; 10 OSM gate nodes, all with opening hours).
- **Fence types.** Most of the line: dark green welded mesh, ~1.8 m, 200 x 50 mm, on round green posts every ~2.5 m
  (the Dieweg forecourt, the lawns); at the west corner the same line is green chain-link on posts with braces (drawn
  as the mesh). The **Avenue Wolvendael frontage** at the main gate: a pale dressed-stone plinth ~0.8 m with a black
  wrought-iron railing on it (square bars ~12 cm apart, spear tops, two flat rails, ~1.8 m of iron), rusticated pale
  stone piers (~0.7-0.8 m square, ~3.2 m, moulded caps) at the gate and every few bays.
- **Hedge.** The playground entrance on Avenue Paul Stroobant: a clipped hedge ~1.5 m with the green mesh at the gate
  (we draw the mesh; the hedge is the gardens' business).
- **Gates.** The **Dieweg tram terminus gate** (OSM node 4689177219, at the end of the tram loop): a cobbled forecourt,
  two tall pale stone piers, a black iron double gate swung open into the park, green mesh either side. The **Avenue
  Wolvendael main gate** (140289825, the Wolvendael tram stop): rusticated piers, black iron double gate open. The
  **west corner gate** (5762015318): sandstone piers with caps, an ornate scrolled double gate, open. Not checked on
  Street View (from OSM): the service gate on the Allée Jacques Brel (double, open), the gate where the Allée José
  Dierickx enters (double, open), a service gate with access=no beside it (closed), pedestrian gates at 140289709,
  5762014646, 10738040739 and the playground (5762015331). Four more OSM paths cross the line with no gate node: open
  entrances (piers, no leaf), one of them the Chemin du Crabbegat lane.

**Parc de la Sauvagère** (OSM relation 18270753, 1,075 m round; OSM barrier=fence way 933248394 all round; 5 gate nodes).
- **Fence types.** Rue de Verrewinkel side and most of the line: a plain black steel bar fence ~1.6 m (flat-topped
  square bars ~12 cm apart between two rails, square posts) on the bank over the sidewalk. Beside the lodge at the main
  entrance (north of it): dark green welded mesh ~1.8 m.
- **Wall.** South of the main entrance: a low grey rubble-stone wall ~1.1 m with a hedge on it (drawn as the stone wall;
  city z grows to the south).
- **Gates.** The **main entrance** on the Avenue de la Chênaie (2194177685): grey rubble-stone piers, a plain black bar
  double gate open, a cobbled apron, the park lodge beside it. The **Rue de Verrewinkel entrance** (1776917441): a black
  bar pedestrian gate in the bar fence, open. Three more OSM gate nodes, pedestrian, open (not checked); 8650666694 has
  no OSM path: it opens straight off the Avenue de la Chênaie onto the lawn (`opensOnto` in the obs file).

All park gates are drawn **open** (both parks are open from 7:30 / 8:00 till dusk); the one access=no gate is closed.

## 2. The line (tools/parkfence/build.mjs -> data/parkfence/parkfence.json)

`node --import ./tools/road_audit/register.mjs tools/parkfence/build.mjs`: the polygon ring; the entrances (the obs list
+ every OSM highway crossing not within ~7 m of one: an open entrance of the way's width); a pier each side; the runs
between, cut where the observed type changes, simplified (0.3 m) and split into ~2.5 m panels. Where the polygon lies on
the drawn PUBLIC carriageway (carriageway.js inside, within an OSM road's half width + 2 m: a park's own drive behind its
gate is measured as UrbIS roadway and is not public), the run's joints move into the park in 0.25 m steps, up to 4 m
(70 m of Wolvendael's line, 61 m of the Sauvagère's), entrances up to 6 m; a pier still on the street is left out. A
panel over a building footprint is a gap (the house wall closes the park: 2.5 m at Wolvendael).

## 3. The kit (tools/blender/parkFenceKit.py -> models/parkfence/parkfence.glb)

Blender 5.0 headless, Cycles AO baked per vertex on the GPU (OptiX). Pieces: `pf_rail` (spear railing module), `pf_bars`
(bar fence module with its post), `pf_mesh` (welded mesh module with its post and clips), `pf_post`, `pf_gate2` (one leaf
of the big double gate: frame, bars with lances, a band of rings, dog bars, hinges, drop bolt), `pf_gate1` (pedestrian
leaf with a latch), `pf_pier` (base, banded rusticated shaft, cornice, pyramid cap; 0.5 m footing), `pf_plinth` (two
courses of dressed blocks, a coping with a drip; 0.6 m footing). Named slots only (iron_paint, iron_tip, steel_dark,
stone, stone_cap): the paint (black / green) and the stone (pale limestone / grey rubble) per instance. The ironwork is
ONE modelled level + its coverage card; the stone three scripted LODs (bands 30 / 90 / 420 m).

| piece | LOD0 tris | LOD1 | LOD2 |
|---|---|---|---|
| pf_rail | 3,672 | card (2) | |
| pf_bars | 1,128 | card | |
| pf_mesh | 1,560 | card | |
| pf_post | 248 | card | |
| pf_gate2 | 7,820 | card | |
| pf_gate1 | 2,218 | card | |
| pf_pier | 1,644 | 58 | 24 |
| pf_plinth | 992 | 34 | 12 |

## 4. In the city (viewer/parkFence.js, viewer/parkFenceLayout.js)

- Per tile, when main.js builds it: the tile's share on its drawn ground (gardenGround). Bare panels: foot line fitted to
  the ground under them and split to keep it within 0.15 m floating / 0.10 m buried; plinth runs fitted end to end on a
  smoothed ground (no zig-zag on a bank's edge), their skirt takes the rest; the matrices SHEARED (bars vertical, rails
  and coping with the slope). Piers on the low side of their footprint (<= 0.4 m into the high side).
- 18 InstancedMeshes for both parks (6 iron pieces x {modelled near, card}, 2 stone x 3 LODs), every instance of the
  city in them, re-bucketed on the CPU when the eye moves > 1 m; per-pixel dithered bands (lodFade.js). Static buffers
  with update ranges (no DynamicDrawUsage); compiled through the hero compiler before the first instance shows.
- The modelled ironwork to 4-6 m (its shadow to 25 m), then the card (thinBars.js ironCards: the LOD0 rasterised, box
  mips: the bars' and the mesh's true coverage, no moiré) blended to 240 m.
- Colliders: one invisible box soup per park and tile (`parkfence-<park>-<tile>`, a hero root: viewer/heroColliders.js
  makes the car's blocks and the walker's triangles from it, only while the tile is in). Open entrances stay open.
- Garden pieces and generated plants within 0.9 m of the line, a pier or a leaf are not placed (main.js inClear).

Browser turn (quick mode, 2026-11-23): shots in `C:/Users/tibog/Downloads/uccle-parkfence-ab/` (outside git): both main
gates, the Dieweg gate, a mesh run and a bar run at 5 / 30 / 120 m, day and night, with the fences hidden (before) and
shown; a `?parkfence=0` boot (no errors, nothing built). Drive: the car into the mesh on Avenue Wolvendael stops with its
bumper ~0.2 m off it (KIND wall); out through the open main gate it passes.

## 5. Budgets (gate row `parkfence`)

| | value | ceiling |
|---|---|---|
| instanced meshes, both parks | 18 | 18 |
| worst view along the lines (LOD0 near + cards + stone) | 122,750 tris (the Avenue Wolvendael gate) | 140,000 |
| panels | Wolvendael 834, Sauvagère 413 | |
| bare panels' contact on the built ground | 0 floating, 0 buried | 0 |
| gaps | Wolvendael 2.5 m building + 2 m lane carriageway; Sauvagère 0 | 5 / 5 |

## 6. Left

- Wolvendael's other stretches beyond the three checked gates are drawn from the default (green mesh); the unchecked
  OSM gates use a plain leaf. The Sauvagère's wall is the dressed plinth piece in rubble tone (no rubble-stone piece yet)
  and the hedge on it is not drawn.
- Trees of the tree field stand on the line in places (a trunk through the mesh): a tree clear along the line would be
  the trees' job.
- The police game's own car was not driven separately (same driver, same colliders as the drive car used).
