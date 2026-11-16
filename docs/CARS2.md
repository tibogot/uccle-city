# Cars 2: better car shapes at the same cost (branch claude/cars2)

The owner (2026-11-16, TODO 8f(b)): *"the shape of the cars, especially the front looks weird; check the Mr.doob cars if
they are different, and tell me if we could have better cars, of course with best optimization and performance"*.
Plus TODO 8e: the police car looks crude from behind (blocky tail lights, flat cream band, low-poly body).

**Result: a new scripted family `tools/blender/cars2.py -> models/cars/cars2.glb`, ON by default in every fleet
(parked, traffic, police yard and game, the drive car); `?cars=old` = the faceted family exactly as before.**
Same draw calls, 3.3x less triangle load at 22-55 m, 2.6x less geometry memory. Browser check still to do (see the end).

| | before (faceted) | after (cars2) |
|---|---|---|
| look | `docs/cars2/old_*.jpg` | `docs/cars2/new_*.jpg`, close-ups `close_*.jpg`, night lamps `night_*.jpg` |
| side by side | `docs/cars2/compare_<type>.jpg` (top: old, bottom: new) | |

## 1. Diagnosis: why the old fronts look weird

Rendered from the GLB with `tools/blender/carSheet.py` (front 3/4, rear 3/4, side and top orthographic; Cycles, OptiX).
Compared by eye with photos / blueprints of the cars common in Brussels (VW Polo / Golf, Peugeot 208 / 308 / 2008,
Renault Clio / Captur, Toyota Yaris, Skoda Octavia Combi, BMW 3, Mercedes A / C, Tesla Model 3 / Y, Kangoo /
Berlingo, Transporter / Trafic; looked at only, nothing stored or shipped).

1. **One-box MPV silhouette for every type.** The windscreen is long and very raked and joins a flat roof that runs
   to the tail; the hatchback, the estate and the saloon share the same tall glasshouse. Real modern cars have a
   clear bonnet - windscreen - roof - tailgate rhythm (Golf: cowl ~0.3 m behind the front axle, header near the middle
   of the wheelbase, roof dropping to a ~35 deg tailgate).
2. **The nose is a tall vertical slab** (the faceted tub's front loops are near vertical from the chin to the lamps),
   the lamps sit as rectangles on that wall, the bumper is a separate block below: an 1980s / Lada face. Modern
   fascias slope back from the bumper to the bonnet, the plan view is rounded, lamps are slim and wrap round the corners.
3. **Flat facets everywhere**: every panel a plane, chamfered corners, so the reflections jump in bands and the body
   reads as "low poly" even at 8k triangles.
4. **Glasshouse as wide as the body** (top view): no tumblehome; real side glass leans in ~10 cm, which is what makes a
   car look planted and the body sides read as shoulders.
5. **Low belt, tall glass** (~0.53 m daylight opening vs ~0.42 m on a Golf), small-looking wheels in big polygonal
   (14-sided boolean) arches.
6. **The rear**: tall flat tail panel, blocky L-shaped lamps high up, a chrome garnish across the tailgate that reads
   as a "cream band" in warm light (the police car's flat cream band of 8e).

## 2. Mr.doob's slop-newyork cars (js/cars.js, js/traffic.js; looked at, nothing copied)

| what | slop-newyork | ours before | ours now |
|---|---|---|---|
| body shape | a table of smooth side / plan curves per body (monotone cubic splines: half width, sill, shoulder, top edge, crown, tumblehome) + superelliptic roundings into the nose / tail + a height-dependent RAKE of the fascia; ~45 cross-sections lofted; arches = the sill rising round the wheel (no boolean) | 7 plan loops of flat facets + boolean arches | the same idea, our own code and numbers (`cars2.py` body_fn / prof_pt / rake_fn) |
| glasshouse | a second loft on the belt line (raked screens, tumblehome, crowned roof) | 4 plan rings | the same idea, with real inset glass in rubber frames (see-through to the interior) |
| details | ALL painted by one TSL material from object position / normal (glass, lamps, grilles, plates, seams, NYPD / taxi liveries): each body type one material, one draw | geometry + per-vertex palette | geometry + per-vertex palette (rows of the loft): our material is shared by every fleet, LOD and the player car, and the see-through glass + interior need real glass faces |
| LODs | near model (~2.5k tris without wheels, counted from its station / section tables) to 90 m, then a ~250-tri lofted proxy | 4 meshoptimizer LODs made at load (8k / 5.8k / 2.2k / 0.3k) | 3 AUTHORED LODs (~8k / ~1.7k / ~0.3k) mapped onto the fleet's 4 levels |
| wheels | one shared wheel model, separately instanced, spun / steered per instance | in the body batch, rolled / steered in the vertex shader | unchanged (separate Wheel_* meshes, per-vertex wheel centre) |
| per instance | paint + a state vec4 (brake, indicators, livery, style) | paint + motion (spin, steer, light bits, heading) | unchanged |
| contact shadow | an instanced SDF quad under each car | none (shadow map only) | not in this job (see "left") |

What slop does well, and we took: **proportions from smooth curves** (the main cause of the "weird front" is shape,
not detail), **the raked, plan-rounded fascia**, **tumblehome**, **arches from the sill line**, and **a cheap authored
far proxy** instead of a simplifier's best effort. What we keep from ours: geometric lamps / grilles / plates / glass
(they hold up close in the chase view and at night), the per-vertex palette (no texture), the shared material and
the existing instancing / motion-vector / LOD-fade machinery.

## 3. What was built (`tools/blender/cars2.py`)

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/cars2.py -- models/cars [--only hatch_c,police] [--no-bake] [--samples 64]
    ... -P tools/blender/carSheet.py -- models/cars/cars2.glb docs/cars2/new [--lod 1|2] [--close] [--night] [--only ...]
    node tools/cars/auditCars2.mjs models/cars/cars2.glb --out docs/cars2/audit.md

Nine cars, real proportions (metres, length x width x height, wheelbase):

| id | class (references) | L x W x H, WB | notes |
|---|---|---|---|
| hatch_s | Polo / 208 / Clio / Yaris | 4.10 x 1.77 x 1.45, 2.56 | |
| hatch_c | Golf / 308 / Megane / A-class | 4.33 x 1.81 x 1.46, 2.64 | the base table |
| estate | Octavia Combi / Passat Variant | 4.73 x 1.84 x 1.47, 2.69 | D pillar, privacy glass, roof rails |
| saloon | BMW 3 / A4 / C-class | 4.75 x 1.84 x 1.44, 2.85 | notchback, long bonnet (short front overhang) |
| suv | 2008 / Captur / T-Roc | 4.34 x 1.84 x 1.57, 2.62 | cladding round the arches, skid plates, rails |
| van_c | Kangoo / Berlingo / Caddy | 4.53 x 1.88 x 1.84, 2.72 | sliding door, vertical tail lamps |
| van_p | Transporter / Trafic H1 | 5.03 x 1.95 x 1.98, 3.00 | cargo body, cab glass only, cargo door shut lines |
| taxi | Brussels taxi (saloon) | as saloon | black, yellow line, amber TAXI sign; keeps its livery |
| police | Belgian police estate | as estate | white, blue + fluorescent yellow Battenburg (2 rows) on the sides and across the tailgate, POLICE on the front doors and the tailgate, real tail-light clusters; keeps its livery |

How a body is made (header of `cars2.py` in full):
- **Profile rows**: the section is sampled at parameters where the region edges fall AT THE NOSE (rowsF) and AT THE
  TAIL (rowsR), blended along the car, plus anchor rows that hold one value all along (top edge, cabin floor,
  cladding, liveries, a 3 mm character line under the belt). So every lamp / grille / intake / shut-line edge is a
  real edge of the mesh and lines run on along the body (the bonnet shut line climbs to the cowl along the wing top).
- **Insets**: head lamps (dark surround, housing, lens with a DRL band, smoked reflector), tail lamps (surround,
  smoked rim, red lens, bright inner lens), grille and lower intake recessed with gloss-black bezels + two grille
  bars, reversing / fog lamps in the bumper; glass inset into a black frame and recessed 6 mm.
- **Named slots = the palette's kinds** (`_KIND`, viewer/drive/carPacks.js packMaterial): paint (per-instance colour),
  glass / privacy glass, trim, gloss black, rubber, chrome, head lamp, tail lamp (lit by the traffic's light bits:
  the outer half blinks as indicators, the inner half is the reversing lamp), plate, interior. Liveries are fixed
  colours (kind 0) so the per-instance paint never touches them.
- **Wheels** separate (Wheel_FL/FR/RL/RR): tyre with a bulged sidewall, 6-spoke rim with real openings (set back 4 cm
  with walls), hub, brake disc + caliper; the traffic rolls and steers them as before.
- **Interior** seen through the see-through glass: dashboard, seats + headrests, steering wheel (left-hand drive).
- **Normals**: smooth + weighted (face area, keep sharp), hard edges only where the kind changes or at creases > 42 deg.
- **AO**: two Cycles bakes per vertex (0.9 m mass + 0.2 m contact), OptiX on the RTX 4050, multiplied into COLOR_0.
- **LODs authored in the GLB**: `Body`, `Wheel_*` (LOD0), `Body_L1`, `Wheel_*_L1` (LOD1: coarser rows / stations, lamps
  as flat lens faces, plain plates, a seat block), `Body_L2`, `Wheel_*_L2` (LOD2: a ~300-triangle stand-in with
  windows, head / tail lamps and 5-sided wheel drums that stand on the ground).

### Why no texture atlas (the brief asked for one shared atlas for lights / grille / plates)
Decided against it for now: every fleet, LOD and the player car share ONE vertex-coloured material with no UVs; an
atlas would add a UV attribute to every car vertex (+8 B), a texture fetch to the most-drawn material in the city, UV
seams that the LOD weld must respect, and texture memory, to replace detail that is already geometry (lamp insets,
grille recess, plate glyphs at LOD0 only). The lamp and plate faces are already separate regions, so an atlas can be
added later without touching the shapes if close-ups ask for printed detail (lamp LED graphics, brand-free badges).
Texture memory today: **0 bytes**.

## 4. Cost budget (measured on the GLBs, `node` + meshoptimizer exactly as the fleet's worker runs)

Average over the 8 street types, per car, per fleet level:

| level (distance) | material | shadow | faceted (old) | cars2 (new) | change |
|---|---|---|---|---|---|
| 0 (< 22 m old, < 30 m new) | near | yes | 8,042 tris | ~11,000 (LOD0, round wheels: see 4c) | +37 % |
| 1 (to 55 / 60 m) | near | yes | 5,776 | 1,723 (LOD1) | **-70 %** |
| 2 (to 130 m) | far | yes | 2,161 | 1,723 (LOD1) | -20 % |
| 3 (to 600 m, faded 380-420) | far | no | 304 | 327 (LOD2) | +7 % |

- **Draw calls: unchanged.** The fleets still instance per (type, level, plain / fade): the parked fleet merges them
  into 6 + 4 multi-draws (`?carmerge=old`: 26 + 11 render objects in a street), the traffic one InstancedMesh per
  (type, level, plain / fade) shown only when it has cars, as before. The fleet still uses the same 8 street types
  (TYPE_MIX); the police estate is loaded only by the yard / game (filtered out of the street fleet). The police
  yard keeps its 2 draws per level (livery material + light bar); `?policecar=marked` adds 1 (the modelled livery).
- **Geometry memory** of the 8 types x 4 levels: 282k vertices / 17.4 MB -> **95k / 6.5 MB** (the old LOD1-3 came
  out of the simplifier non-indexed; ours are indexed).
- **Load**: the worker's LOD build 290 ms -> **6 ms** (no simplification: authored LODs). GLB 2.96 MB -> 3.83 MB on
  the wire (three LODs instead of one; uncompressed floats: meshopt compression / quantization would cut it ~3x, not
  done here).
- **Texture memory**: 0 (both).
- LOD0 is ~7.3-9.2k triangles (police 10.9k: the livery and lettering), not the 3-6k of the brief: the smooth body
  needs its rows and the wheels ~450 each. It is only drawn within 30 m (a handful of cars); the triangle load that
  matters (the 22-130 m band, most of a street) is 3x lower.

## 4b. Proportions pass (coordinator review, 2026-11-16)
"Clearly better, but still ~2000 generic cars": a second pass on the shapes, all in `cars2.py` tables.
- **Wheels**: 16-18" (tyre diameter 0.62-0.70 m: hatch_s 0.62, hatch_c / estate 0.65, saloon 0.66, SUV 0.70, vans
  0.64-0.68), wider tyres, arch gap 4.2 -> 2.8 cm (vans / SUV 3.5): the wheels fill the arches.
- **Overhangs**: the base table is now mapped per type onto its real axles; front overhangs shortened (hatch_c 0.87 ->
  0.82 m with a 2.66 m wheelbase on 4.31 m, saloon 0.79, estate 0.88, hatch_s 0.79).
- **Stance**: track +2-5 cm (tyres 1-2 cm inside the body side), sill 1.5 cm lower, a separate, stronger flare over
  the rear arch (`archFlareR`: the shoulder line over the rear wheel).
- **Glasshouse**: belt line raised 1-2.5 cm (rising to the rear), roof 0.5 cm lower, A pillar base moved back 0.10 m
  (hatch_c cowl 0.41 m behind the front axle), windscreen header back, thicker C pillar: a lower, longer daylight
  opening.
- **Hatch rear**: tail lamps wrap 0.26 m round the corners and reach further in; a roof spoiler over the rear window
  (hatches, estates, SUVs, police) with the third brake lamp under its trailing edge.
- **Police**: the tailgate POLICE now follows the curved tailgate (it was a flat plane half buried: "POL CE"); POLICE
  on the bonnet; one row of Battenburg blocks across the front bumper. The roof is clear and flat from the header to
  the spoiler for the game kit's beacon (`viewer/policeCar/fitCar.js` finds it by rays: to confirm in the browser).
- **Rims**: four designs: 5-spoke (hatch_c, SUV, police), 6-spoke (hatch_s, taxi), 10-spoke multi (estate, saloon),
  plastic wheel covers with 8 slots (vans).
Budget after the pass: level 0 8.1k, levels 1-2 1.7k, level 3 0.33k (table above), memory unchanged (6.5 MB).

## 4c. Round wheels and arches at LOD0 (defect-eye item, 2026-11-16)
LOD0 tyres and rims went from 15-20 to 32-40 segments (5-spoke 40, 6-spoke 36, multi-spoke 40, covers 32), the tyre
profile has a rounded two-point shoulder and one material over sidewall + shoulder (no hard edge), spokes are two
segments wide with DRAFTED walls (the opening's back is narrower than its mouth) shaded smooth up to 62 deg, so their
edges read as bevels; a dark centre cap. Arches: 15 stations per arch at LOD0 (was 9), liners 16 segments.
Cost: ~1,000 tris per LOD0 wheel. Note: in OUR fleets the wheels are merged into each car's geometry per LOD (the
traffic rolls them in the vertex shader), not a separately instanced shared wheel, so LOD0 grew to ~9.4-12.6k per car
(police 15k); it is drawn within 30 m only. LOD1 / LOD2 unchanged (8-segment / 5-sided wheels).

## 5. Mesh audit (`docs/cars2/audit.md`, tools/mesh_audit/audit.js through `tools/cars/auditCars2.mjs`)
Contacts: every tyre touches the ground (lowest point -0.001 m, all cars, all LODs), the body's lowest point is
0.21-0.32 m up. Fixed during the build: the underbody lying on the wheel-well liners (coplanar, z-fight), liners
crossing the sill, the windscreen sliver crossing the bonnet at the cowl (it now rises 3 mm above the crown), the
liner / arch slit, a shoulder row (streaks on the belt ledge), LOD2 wheels floating 7 cm.
Remaining items (reported, not fixed): `bentflat` 40-200 and `streak` 12-90 per car / LOD are the SMOOTH body itself
(weighted normals 3-6 deg off nearly flat curved panels; the check's thresholds were calibrated on buildings where a
panel is a plane); `crossing` 9-34 at LOD0 are the plate holders / grille bars / handles set into the curved skin;
`sliver` warnings are the chin / crown rows of the caps. To trace before merging if the browser shows any of them.

## 6. Switches (viewer/features.js rows)
- `?cars=old` - every car the faceted family as before (fleet, traffic, police, drive default); `?cars=box` the old
  parked boxes (as before).
- `?policecar=marked` - the player's police car (and the yard's estates) is the modelled Belgian police estate;
  default stays the unmarked dark estate of the police game (docs/POLICE_GAME.md), now on the new estate body.
- `?car=cars2:<id>` - the drive car (default `cars2:hatch_c`; `cars2:police` exists); `faceted:<id>` still works.

## 7. Code
- `viewer/drive/carPacks.js`: `PACK_SOURCES.cars2` (authored: `lods: [{src 0, until 30}, {src 1, 60}, {src 1, 130},
  {src 2, 600}]`), `CARS_OLD`, `FLEET_SOURCE`; `loadPack` takes authored LODs (parts keep LOD0 names).
- `viewer/drive/carLod.js`: `partLevel`, `partBase`, `levelParts`; `viewer/carLodWorker.js` uses them.
- `viewer/carFleet.js`: loads FLEET_SOURCE, SIZES per family, street types only; `viewer/traffic/traffic.js`: wheel
  base / radius per family. Police: `viewer/police/policeCar.js` (marked switch), `props.js`, `viewer/policeCars.js`,
  `viewer/main.js` (preload), `viewer/drive/driveMode.js` + `viewer/devPanel.js` (default car).
- Unchanged: the instancing, per-instance paint, motion vectors (viewer/instMotion.js), LOD cross-fades, shadows,
  light bits, weather hooks.

## 8. Browser check (NOT done yet: waiting for the coordinator's "YOUR BROWSER TURN")
`python tools/serve_nocache.py 8817`, one tab. Compare `?cars=old` vs default in: a parked street (Rue Rouge / Saint-Job),
traffic at a junction, the police chase view (rear of the player's estate), night (lamps, indicators, reversing).
Measure draws / GPU ms both ways after the preflight is GREEN; screenshots to docs/cars2/. Watch for: LOD 0 -> 1 fade
at 30 m (the lamp insets turn into flat lenses), the glass at LOD1 (inset frame), the interior through the glass, the
police kit's beacon / cable fit on the new estate roof (`viewer/policeCar/fitCar.js` is ray-based and should adapt).

## 9. Left / next
- Browser comparison and perf numbers (above); fix what it shows.
- LOD0 budget (~8k) could drop ~25 % (fewer crown rows, 16-segment wheels) if the browser shows no need for it.
- GLB compression (meshopt / quantized positions): 3.8 MB -> ~1.3 MB.
- Contact-shadow quads under far cars (slop's trick) for the cars beyond the shadow box.
- More fascia variety per type (today the hatch family shares one face; SUV and vans have their own).
- An atlas for printed lamp graphics, if wanted (section 3).
