# Road tunnels under the Linkebeek railway embankments (branch claude/tunnels, 2026-11-14)

OSM tags two roads `tunnel=yes layer=-1` under the railway embankments at Linkebeek. Until now the terrain (a height
field: the bare-earth DTM shows the embankment solid) could not hold them: the road engine drew the streets into a deep
slot or up over the embankment and the car stopped at the "portals" (docs/collisions/ROAD_FIX2.md item 1).

| tunnel | OSM | tile | road under | measured | real type (Street View, looked at only) |
|---|---|---|---|---|---|
| **Kleindalstraat / Rue Kleindal** | way 430168935 (one-way, maxheight 3.2) | E10 | 58.6-59.1 m TAW | L124 rail top 80.0 m: **21 m** of embankment; barrel 52 m (the embankment's toe in the DTM, portals at +-26 m) | dark red brick headwall, round arch on low jambs (crown ~4.2 m), header-brick ring, grey concrete string course, short brick parapet + concrete coping; splayed brick wing walls with sloping concrete copings ending on low piers; brick barrel with sodium bulkhead lamps on the NW wall; footway on the NW side, kerb ledge on the SE side (2010 + 2024 panoramas, both portals + inside) |
| **Rue de la Brasserie / Brouwerijstraat** | way 775790690 (tertiary, two-way) | D9 | 46.8-47.4 m | L26 rail top 63.5 m: **16.6 m**; barrel 29.6 m (portals at +-14.8 m) | red brick headwall ~10 m high, large semicircular arch with a brick ring and five blue-stone blocks (imposts, haunches, keystone), a corbelled round-arch frieze (11 small arches) under a stone coping, battered brick wing walls (splayed at the NW portal, parallel to the street at the SE one); brick barrel, LED boxes at the crown; sidewalks both sides with dark X-pattern steel guard rails along the kerbs (2024 panoramas, both portals + inside) |

Mr.doob's slop-newyork and the three.js examples have no tunnel / underpass method (slop-newyork's bridges are
procedural decks; docs/SLOP_NEWYORK_AUDIT.md): the method here is the round-2 rail bridges' (docs/trains/BRIDGES_ROUND2.md)
plus a new terrain stage. Lighting: emissive lamps only (no light added: the city's light count is fixed).

## What was built

### The models: `tools/blender/railTunnel.py` -> `models/rail/tunnel_<name>.glb / .json / _ao.png`

```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/railTunnel.py -- <kleindal|brasserie> models/rail [--no-bake] [--preview <abs dir>]
node tools/mesh_audit/cli.mjs models/rail/tunnel_<name>.glb --out models/rail/audit --ignore-below -1.5
```

- Frame: X along the road (OSM first node -> last), Y left, origin = the barrel's centre at road level; placement json as
  the hero bridges (`city_local_position`, `rotation_y_rad`), so `viewer/rail/bridgeModel.js` loads it unchanged.
- Measured [M] in the script: the axis (OSM), the road level beyond each wing tip (lowest DTM across the lane, linear
  between: Kleindal grade -0.65 %, Brasserie +1.05 %), the portal faces (the embankment's toe), the rail top (rail.json),
  the ground for the bake. Estimated [E] from the panoramas: span (= the drawn lanes), springing, headwall size, ring,
  string course / frieze, wing splay and length, lamps, guard rails. Every value is commented in `TUNNELS`.
- Geometry: the barrel from inside (walls + semicircular vault in 4 m bays, inward faces, smooth only on the curve), the
  portal faces as radial quad bands round the arch (no ear-clipped slivers), a 2.5 cm proud header ring, the string
  course (Kleindal) / corbel table with welded bay tops (Brasserie), blue-stone blocks set 4 cm into the wall, copings
  overhanging 6-7 cm (1 cm bevel), wing walls (inner face, hidden back, sloping coping, pier + cap at the tip), a floor
  slab 5 cm under the road (never a void where the ground's mesh stops at a wall), lamps (painted housing + emissive
  `lamp_glow` lens), guard rails (posts, rail, X braces).
- Named slots: `brick_red_brussels`, `stone_blue`, `concrete` (from the material library: shipped scan sets for brick
  and blue stone), `painted_metal_grey` (made near-black in the city, as the photos), `lamp_glow` (emissive).
- AO baked with Cycles into UV1 (1024 px), against the ground the city will have (approach cut, the earth over the
  barrel, the retained earth behind the walls: the same rules, simplified).
- Triangles LOD0 / 1 / 2: Kleindal 1 946 / 590 / 134, Brasserie 5 392 / 1 626 / 336 (the guard rails are most of it).

### The ground: `viewer/rail/tunnels.js` (tile worker)

Each grid cell near a tunnel is classed (tunnel frame):
- **ROAD**: the clear approach between the wing walls, in front of the faces: walk / drive / road-engine ground at the
  road level - 2 cm.
- **LID**: the barrel's corridor (|X| <= L/2, |Y| <= r + 0.3): the walk / drive / road-engine ground at the road level,
  but the **drawn** terrain is the earth over the barrel: the DTM, at least 0.9 m over the crown, at the headwall's top
  within its thickness, under the ballast (carveGrid's rule) and under Linkebeek station's platforms (they stand over the
  Kleindalstraat bore). The bore is under the drawn ground.
- **KEPT**: the earth the walls retain: the wall's top (under the coping) within its thickness, then the DTM clamped to
  1:1.5 down / 2:1 up; a headwall's earth reaches 6 m past its ends (falling 1:2) so the bank comes down beside the
  portal onto the wing; under a wing's coping the wing wins; beside the barrel beyond the headwalls the DTM is kept (the
  road stage's carve may not dig its shoulder into the embankment).
- a 1:1 bank (lower only) round the approaches past the wing tips.

The drawn mesh cannot step from the road to a wall's top within one 1 m cell either: every terrain triangle with a ROAD
corner and a LID / KEPT corner is **clipped** at the face of the wall its road corners face (the road part keeps the road
heights) and at the wall's back (the earth part keeps its heights); the band between lies inside the masonry and is
dropped (new vertices shared between neighbours: no crack). Before meshoptimizer (LockBorder keeps the cuts).

Also in the worker: the lanes through the bores (`tunnelRoads`: the json's lanes on its OSM ways; the engine's type
defaults were 12-16 m wide: Kleindal lane 3.2 + NW footway 0.9 + SE ledge 0.5 = the 4.6 m arch, Brasserie 2 x 3.0 + 1.3
sidewalks = the 8.6 m arch), the road stage's ground through the zones (`tunnelGround`), the LiDAR trees (none in the
streets; the ones over a bore moved beside it: they would stand on the street's ground, inside it), the rail's
embankment fill re-cut (carveGrid filled the bore again under the track: `tunnelRecut`), the line's fence colliders
broken over the bores and the drawn fence on the lid (`tunnelFenceRings`, `tunnelSurface`), Linkebeek's platform walls
given a base (a car far under them passes).

### The city: `viewer/rail/tunnelModel.js`

Loaded through the hero-bridge path (LODs by meshoptimizer 30 % / 6 %, dithered hand-overs at 140 / 420 m: states
100 / 110 / 010 / 011 / 001 checked for both; warm-up of shaders + shadow pass before showing), root `tunnel-<name>`
(listed in heroColliders.js, contactAudit.js, drive/collisionTest.js: car + walker collide with LOD0), emissive lamps,
both faces cast shadows (the bore is modelled from inside), shown while the home tile is loaded, falcon proxies
(window.__bridges).

**Switch: `?tunnels=0`** = no model, no cut, no lanes, the city as before.

## Checks

- **Mesh audit**: both **0 blocking** (`models/rail/audit/tunnel_*.audit.md`; warnings: slivers of the long bays,
  T-junctions of the frieze / ring bands, back-to-back faces, seams).
- **Contact check (JOINS)**, `viewer.contactAudit("tunnel-kleindal" / "tunnel-brasserie")`: **0 floating, 0 overhang, 0
  blocking** each (2 / 1 "opening" infos: the arches).
- **Node check**: `node --import ./tools/road_audit/register.mjs tools/tunnels/check.mjs E10 D9` (the walk ground along
  the axis is the road level - 0.02 through both bores; road vertices in the bores within 0.7 m of the level: the kerbs
  and their skirts).
- **City collision test** `viewer.collisionTest(tile, { drive: true, walk: true })`, before = `?tunnels=0`, same build
  (raw: `docs/trains/tunnels/collision_before.json`, `collision_after.json`):

| tile | static invisible / missing | drive contacts, invisible, through, fell, floated, stuck | walk contacts, invisible, through, fell, floated, stuck |
|---|---|---|---|
| E10 before | 377 / 7 | 77, 3, 0, 1, 1, **2** | 21, 0, 0, 0, 18, 1 |
| E10 after | 384 / 7 | 91, 1, 0, 2, 4, **0** | 40, 0, 0, 0, 16, 1 |
| F10 before / after | 0 / 1 both | identical (3, 0, 0, 0, 0, 1) | identical (8, 0, 0, 0, 4, 0) |
| D9 before | 190 / 5 | 46, 0, 0, 0, 0, 0 | 3, 0, 0, **6**, 0, **2** |
| D9 after | 186 / 8 | 18, 0, 0, 0, 0, 0 | 12, 0, 0, **0**, 0, **0** |

  The two portal stuck spots on Kleindalstraat are gone (the car drives through both ways), the D9 walk falls / stucks
  at the Brasserie are gone. Left near the tunnels: the test drives every road both ways, and Kleindalstraat is one-way:
  its wrong-way lane runs 1.1 m outside the drawn road, along the wing walls (spawned against the SE wing at the SW mouth
  and rubbing the NE wing): the E10 fell 2 / floated 4 samples are all on that route ((-676.6, 2889.9) and (-638.4,
  2852.7)); no item on the real lane. Static +7 invisible on E10: Linkebeek's platform rings over the bore (the static
  raster ignores a wall's base; the car passes under them, the dynamic test has no hit there). D9 missing +3 (0.6 m2):
  the guard rails' thin X braces. Contacts went up: the bore walls.
- Street View vs the city (same viewpoints, looked at only, nothing stored): `docs/trains/compare/tunnel_*_city_*.jpg`,
  Cycles previews `r_blender_tunnel_*.jpg`, before `tunnel_kleindal_city_before.jpg` (the road in a slot over the
  embankment).
  - Kleindal NE / SW: the composition matches (headwall, arch, string course, parapet, splayed wings with sloping
    copings, the earth slope above); the real wings are longer and lower at their roots on the NE side, and everything is
    covered in ivy and trees (ours: the land cover's bare / scrub slope, fewer trees).
  - Kleindal inside: brick barrel, footways, warm bulkhead lamps on the NW wall: as the 2024 panorama; ours is a little
    brighter on the sidewalks (the road engine's paving gets the sky's ambient light; only the model has the baked AO).
  - Brasserie NW / SE: frieze, ring, stone blocks, wing walls (splayed NW, parallel SE), guard rails, crown lamps all as
    the photos; the real brick is darker and sooty (the library's Brussels red brick is brighter), the big trees over the
    NW portal are not there.

## Cost

Per tunnel: one draw per slot per shown level (Kleindal 4, Brasserie 5) + the shadow pass; the fading copies only inside
a hand-over band. Worker: tunnel cut 6-30 ms, tunnel terrain 110-300 ms (the clip), per tile that holds a tunnel. Memory:
two 1024 px AO maps, 140 + 420 KB of GLB. **GPU timing not measured**: `tools/perf/preflight.ps1` was **RED** (another
agent shares the GPU; frames from 9 to 48 ms in the same view minutes apart).

## Shared files touched (for the merge)

- `viewer/tileData.js`: the import (line ~18); after `railVerges` (the tunnel fetch + trees); after `applyRoadOverrides`
  (lanes); after `underpass cut` (the cut); `roadGround` wrapped by `tunnelGround`; after `rail carve` (re-cut); after
  `terrain grid` (lid + clipping); the platform walls' `base`; after `railFences` (fence rings); `fenceMesh(..., tunnelSurface(...))`.
- `viewer/main.js`: `const TUNNELS` (after `BRIDGES2`), `tunnels: TUNNELS` in the worker entry, the `addTunnels` call
  before `const cy = hm.ground(cx, cz)`.
- `viewer/heroColliders.js`, `viewer/contactAudit.js`, `viewer/drive/collisionTest.js`: `...TUNNEL_ROOTS` in the hero
  lists (+ the import).
- `viewer/tileWorker.bundle.js` rebuilt (`node tools/build_worker.mjs`): rebuild again after merging.
- Not touched: `viewer/streets/roadLevels.js`, `pipeline/build_terrain.py`, `railData.js`, `bridgeModel.js`.

New: `tools/blender/railTunnel.py`, `viewer/rail/tunnels.js`, `viewer/rail/tunnelModel.js`, `tools/tunnels/check.mjs`,
`tools/tunnels/near.mjs` (debug: GLB triangles near a point), `models/rail/tunnel_*`, `models/rail/audit/tunnel_*`.

## Left

- The one-way's wrong-way route in the collision test (a test rule: one-way streets could be driven one way only).
- Inside the bores the road engine's road and sidewalks get the full sky ambient (no AO on them): slightly bright.
- Ivy, trees and grime on the portals (real: heavily overgrown); the 3.2 m height-limit and warning signs on the
  Kleindalstraat headwall; drainage (gullies / weep holes) not modelled.
- Walking on the embankment exactly over a bore: the walk ground there is the street's (the height field holds one
  level); the bore's vault collider and the rail fences keep a walker off it in practice, not by design.
- Thin sky slivers can show at the very top corners of the Brasserie headwalls from close by (earth 0.1-0.3 m under
  the parapet's end).
- GPU A/B on a GREEN machine.
