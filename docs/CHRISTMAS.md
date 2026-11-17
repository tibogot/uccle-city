# Christmas in Uccle: the seasonal layer (branch claude/christmas)

## UPDATE 2026-11-17 (owner + browser turn 1, interrupted by the owner's playtest)

- **Owner:** Uccle puts a big fir on Place Saint-Job AND on the Parvis Saint-Pierre (in the squares); there WILL be a
  small Christmas market with chalets on Place Saint-Job. Garlands / swags / wreaths / snowflakes stay, tunable per street.
- **Browser turn 1 (quick mode, night, Place Saint-Job):** the layer loads and draws (no console error of ours; 493
  instances, 33 draws, shaders 7.1 s in the background), the tree, its LEDs and star read well at night
  (`docs/christmas/stjob_night_square.jpg`, `stjob_night_tree_close.jpg`), lamp snowflakes and swag LEDs visible.
  **DEFECT found:** the swags hung behind the classic fronts' cornice (only sprig tips showed over it:
  `docs/christmas/DEFECT_swag_hidden_in_cornice.jpg`). FIX (code, not yet seen): site.json now lists the FRONTS; the city
  decides each front's family with the shop kit's own rule (`viewer/shops/shopLayout.js frontFamily`, now exported and
  used by layoutShop too) and hangs the modules from the classic cornice's corona edge (0.94 m over the fascia bottom,
  0.30 m out) or the modern fascia box's face (0.62 m, 0.22 m out), 0.7 high (a shallower sag).
  Not yet checked: per-instance cross-fade under motion, cost on GREEN, Saint-Pierre, snow, day.
- **The market (new piece `chalet`, tools/blender/christmasKit.py build_chalet):** a Brussels market chalet 3.0 x 2.0 m,
  walls 2.2 m, a 38-degree green felt roof with fake snow, shiplap boards (stained: dark walnut .. natural pine per
  instance), corner posts, a serving hatch with its shutter propped 20 degrees over the horizontal on two struts, a
  counter on brackets, a blank cream sign board, shelves of goods inside (lit warm at night), a door in the right gable,
  a fir garland in three scallops + 16 LEDs under the front eave. 9,608 / 6,772 / 2,666 triangles (LOD band ends 40 /
  130 / 600 m), mesh audit 0 blocking (dry pack). Placement (`build_site.py chalets_on_square`): 6 chalets in two rows
  facing a 4 m aisle along the square's long axis beside the fir, each footprint (3.6 x 2.8 m with the shutter) 2.5 m in
  from the paving's edge (the parked cars), 1 m clear of the drawn trees' trunks, 3 m off the planter, 4 m from shops.
  City: instanced, shadows, drive colliders, on the lowest corner's ground; `?xmaschalets=0` / `config.chalets` off.
- **Per-street switches:** `models/christmas/site.json config.streets[<name>] = { spans, swags, wreaths, lamps }`.
- **QUEUED (needs the GPU: after the owner's playtest):** rebuild the whole kit with the AO bake and previews, then pack
  (the committed christmas.glb has no chalet yet; the city skips the market until then):
  `blender --factory-startup -b -P tools/blender/christmasKit.py -- --previews --samples 32` then `node tools/christmas_pack.mjs`.


Owner's ask (2026-11-15, deadline before Christmas 2026): a date-driven, switchable Christmas layer: a big decorated tree
on Place Saint-Job and on Place / Parvis Saint-Pierre, light garlands across the shopping streets, decorations on lamp
posts, shopfronts and doors; a market chalet only if Uccle really has one; emissive only (fixed light count); works under
snow and at night; instanced, LODs, cheap.

**State (phase 1, 2026-11-17, no browser yet):** the Blender kit, the packer + mesh audit (0 blocking), the placement
data, the city code (behind the date / `?xmas=`), node checks all PASS. NOT seen in a browser yet: everything visual,
the cost and the defect eye are for "YOUR BROWSER TURN" (checklist at the end).

## 1. What Uccle really puts up (research, look only)

What could be checked from the web (press, the commune's site, agendas; no Facebook / Instagram access from here, no
Street View without the browser):

- **Christmas market on Place Saint-Job: historical, not current.** L'Avenir, 14 Nov 2008: the 13th "Marché de Noël
  d'Uccle" on Place Saint-Job, ~100 exhibitors, 27-30 November, evening openings until 22:00 (so held under the square's
  plane trees in late NOVEMBER, before our 1 Dec - 6 Jan window). An agenda page lists a "Grand Marché de Noël" there in
  2011. Nothing found for recent years (quefaire.be lists no Uccle Christmas market for 2025-26; the uccle.be agenda shows
  the September "Marché annuel de Saint-Job", 137th edition 2025). **Decision: no chalet** (none documented in December).
- **"Ucclehiver"**: the Centre culturel d'Uccle's winter programme exists (Wolvendael magazine, Dec 2024: "Ucclehiver
  2024" folder); its contents could not be read (image-only PDF). To check with the owner / Street View.
- **The commune supports December shopping** (free 2 h parking on Saturdays in the holidays: DH / L'Avenir, May 2026), and
  the police note the busy shopping districts of Uccle in December: the shopping streets are the right place for garlands.
- **Trees and garlands in Uccle: no photo or article found** for the size, style or colour of a tree on Place Saint-Job or
  the Parvis Saint-Pierre. The Brussels practice (City of Brussels: Grand-Place natural spruce 18-22 m, "Brussels by
  Lights" 140 streets of warm-white garlands; neighbouring communes: natural firs of 8-12 m on their main squares, warm
  white LEDs, traditional red / gold / champagne baubles) sets the defaults below. These are ESTIMATES, flagged here.

Sources: [L'Avenir 2008, Noël à Saint-Job](https://www.lavenir.net/regions/bruxelles/uccle/2008/11/14/noel-a-saint-job-WLC5MOIPWZG4HKMHY5ABSI5ZHE/),
[French-Connect, Grand Marché de Noël Uccle](https://www.french-connect.com/396-agenda-grand-marche-de-noel-uccle.html),
[uccle.be, Marché annuel de Saint-Job](https://www.uccle.be/fr/agenda/marche-annuel-de-saint-job),
[quefaire.be, Noël à Uccle](https://www.quefaire.be/noel/uccle),
[CCU, Wolvendael décembre 2024](https://www.ccu.be/wp-content/uploads/2024/12/Wolvendael-decembre-2024.pdf),
[DH 2026, stationnement gratuit pendant les fêtes](https://www.dhnet.be/regions/bruxelles/2026/05/29/stationnement-gratuit-pendant-les-fetes-uccle-debourse-plus-de-18-000-par-samedi-BUAK35CP2ZBUTDAD37RJ7ZZSIA/),
[BX1, Brussels by Lights](https://bx1.be/communes/bruxelles-ville/coup-denvoi-de-brussels-by-lights-131-rues-commercantes-illuminees-jusquau-5-janvier/),
[DH 2022, the Grand-Place tree's champagne baubles](https://www.dhnet.be/regions/bruxelles/2022/11/20/trois-fois-plus-de-boules-couleur-champagne-eclairage-limite-tout-savoir-sur-la-decoration-du-sapin-de-la-grand-place-de-bruxelles-photos-57LKCVJLYFB7JC5RMI2BCNABYA/).
No image was downloaded or stored.

**To verify in the browser turn (Street View, December captures if any):** whether the trees stand where we put them,
their size, the garland pattern on Chaussée de Saint-Job / Rue Xavier De Bue / Chaussée d'Alsemberg, lamp-post motifs.

## 2. The look (decisions)

- **Trees:** a cut Nordmann fir, 10 m to the leader + a 0.84 m gold star (10.4 m), 5.9 m wide (Saint-Pierre's at 0.9 x),
  in an octagonal pine planter (2.5 m, 0.55 m high). 130 mirrored-glass baubles (red / gold / champagne), 654 warm-white
  LEDs on a spiral string (17 turns) set ON the foliage by ray casts, ~14 % flash bulbs.
- **Light colour:** warm white 2700 K everywhere (Brussels' choice; no blue / multicolour), a short cold sparkle on the
  flash bulbs.
- **Across the streets:** a catenary wire wall to wall at 6.8 m over the walls' ground (7.3 m where the span crosses a
  tram track: above the ~6 m contact wire), LEDs every 33 cm, a wall plate at each end (joins rule), a hanging double
  star (LED rope on an aluminium frame, 1.3 m) at the middle of each span that is not over a tram line.
- **Lamp posts:** an LED-rope snowflake (1 m, six arms with V branches) clamped at 3.9 m on two lamps in three along the
  decorated streets, standing toward the road in the plane that faces along the street.
- **Shopfronts:** fir garland swags (1.6 m modules, scaled 0.6-1.45 to fill the front) over the fascia, 12 LEDs, two
  baubles and a red bow per module. **Doors:** a 55 cm fir wreath with a red velvet bow, berries and 10 battery LEDs on a
  third of the houses (hashed) of the decorated streets.

## 3. Assets (tools/blender/christmasKit.py, Blender 5.0, OptiX)

```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/christmasKit.py -- [--previews] [--samples 32] [--only tree]
node tools/christmas_pack.mjs            # LODs (meshoptimizer) + the mesh audit -> models/christmas/christmas.glb (4.4 MB)
python tools/christmas/build_site.py     # placement -> models/christmas/site.json
node --import ./tools/christmas/hook.mjs tools/christmas/xmasTest.mjs   # the offline checks
```

Built entirely in code (no hand modelling): needle fronds are lumpy flattened sleeves along drooping curves (4 side sprays
each, 270 branches in 30 whorls, a dark inner cone so the sky never shows through), ornaments placed by BVH ray casts and
pushed clear of the needles (no intersections). Named material slots (no baked colour), COLOR_0 = (random per element,
variant, Cycles AO), UV in metres on LOD0 (the needle strokes in the shader). Cycles AO baked to vertex colours on the
RTX 4050 (OptiX, ~5 s for the whole kit; `--factory-startup` starts on CPU, the script switches). Previews:
`docs/christmas/blender/*.jpg` (day / night per piece).

| piece | LOD0 / LOD1 / LOD2 triangles | LOD band ends (m) | slots |
|---|---|---|---|
| tree | 161,560 / 40,982 / 12,760 | 45 / 150 / 1000 | needles, bark, bauble, gold, LEDs, star, planks, mulch (LOD2 drops planks + mulch) |
| wreath | 5,292 / 2,054 / 1,000 | 10 / 32 / 90 | needles, ribbon, bauble, LEDs, gold |
| swag | 6,036 / 3,028 / 1,048 | 14 / 45 / 150 | needles, LEDs, bauble, gold, ribbon |
| lampmotif | 1,716 / 1,110 / 318 | 30 / 100 / 380 | LED rope, frame (LOD2: rope only) |
| spanmotif | 728 / 484 / 132 | 35 / 120 / 480 | LED rope, frame (LOD2: rope only) |

LOD1 / LOD2: the tree's foliage and every piece's LEDs / LED rope / baubles / star come from hand-made far stand-ins in
the same script (fewer sides and sprays at the same places: meshoptimizer would prune the tiny parts); the rest is
meshoptimizer (welded, simplified, normals rebuilt with a crease).

**Mesh audit (tools/mesh_audit, every piece and level): 0 blocking.** One documented exemption: needle spray against
needle spray (crossing / coplanar / depth / near between two `fir_needles` faces: 3,596 pairs on the tree's LOD0): a fir's
foliage interpenetrates like the real one, one material, one colour; the city's foliage kit is not audited at all.
Every other pair blocks (needles vs ornaments, planks, bark were fixed: ornaments pushed clear, the trunk ends under the
leader, the planter lowered under the lowest whorl). Reports: `models/christmas/audit/`.

## 4. Placement (tools/christmas/build_site.py -> models/christmas/site.json)

From the city's own data only:
- **Trees** (estimates, see 1): Place de Saint-Job (1115, 533): the widest clearing of the UrbIS square surface, 9.8 m
  from the nearest drawn plane tree's crown and the square's edge, at its west end; Parvis Saint-Pierre (-718.5, -491):
  the paved forecourt before the church's west tower (8.8 m clear). The star faces the square's long axis / the parvis.
  Set on the drawn ground (world.walkY) once the tile is in. The planter is a drive collider.
- **Spans (56):** along the decorated streets' centre lines (roads.json: Chaussée de Saint-Job + Place de Saint-Job within
  420 m of the square; Rue Xavier De Bue, Chaussée d'Alsemberg, Parvis Saint-Pierre within 520 m of the church) every 18 m,
  a ray each side to the first UrbIS wall; kept when the street is 7-26 m wide and both buildings' roofs rise 0.8 m over
  the hook. 13 at Saint-Job (two-storey houses: few walls hold a span), 43 at Saint-Pierre; 31 cross a tram track
  (UrbIS tramRoad / tramSite surfaces) and hang at 7.3 m without a motif.
- **Swags (331 modules):** the street life's shops / cafés / restaurants on those streets or within 160 m of a tree, sized to
  the front's width (viewer/shops' clamp 2-9.9 m), hung 0.28 m over the fascia (3.0 / 2.55 m + 0.8 / 0.68 m).
- **Wreaths (120):** a third of the address numbers of the decorated streets (hash), none within 3 m of a shop, 4 m apart,
  at 1.7 m over the number's ground.
- **Lamp snowflakes:** decided in the city from the loaded tiles' own lamp sites (viewer/lamps.js now exports
  `lampSiteSets` / `lampSitesVersion`): lamps within 9 m of a decorated street line, two in three (hash).

## 5. The city code

`viewer/christmas/xmasCity.js` (`addChristmas`, `xmasActive`), `viewer/christmas/xmasKit.js` (loader + materials),
hooked in viewer/main.js next to the public art (loads in the background: never holds the boot), a `?xmas` row in
viewer/features.js (World layers: by date / on / off).

- **Date switch:** on from 1 December to 6 January; `?xmas=1` always, `?xmas=0` never; a simulated `?day=` (day of year)
  decides when given (335-365 or 1-6).
- **Instancing:** one InstancedMesh per piece, level and slot, sharing one instance-matrix buffer and one band buffer per
  piece and level (uploaded once, the used range only; no DynamicDrawUsage); re-bucketed when the camera has moved 4 m;
  empty meshes hidden. The garlands across the streets are TWO merged static meshes for the whole city (all wires +
  wall plates, all 2,282 LEDs).
- **Smooth LOD:** ONE material per slot for every piece and level: the per-instance attribute `xlod` (band start, end, id
  hash) and a per-pixel dither (lodFade's keepBand / rampTo on the distance to lodEye) cross-fade the levels with
  complementary pixels; the last level dithers out. ~24 materials in use (11 slots x near / far + the spans' wire and LEDs).
- **Light:** emissive only (no light added: the fixed light count). LEDs: a slow per-bulb shimmer (sin of time + phase),
  ~14 % flash bulbs with a short cold sparkle, x 9 at night / x 1.1 by day (env.uNight), live controls in
  `window.xmas.look` (night, day, twinkle, flash, rope, star).
- **Weather:** greenery, bark, planks, mulch, metal, ribbon and baubles go through wxMat (snow on the up-facing needles,
  wet sheen); the lights are not weatherized (they shine through).
- **Shadows:** only the trees cast (castShadow on their meshes); everything else receives.
- **Debug:** `window.xmas` (site, kit, field, `stats()`: instances, per level, draws, triangles).

## 6. Budget and cost (to MEASURE in the browser turn, on GREEN)

Target: < 0.3 ms GPU at night at street level, ~0 away from the decorated areas.
- Away from the two areas: no instance within the last band ends: 0 draws (the two static span meshes are frustum
  culled; they fade out beyond 650 m).
- Worst case, Place de Saint-Job at street level: tree LOD0 (8 draws + 8 shadow), swags 5-15, wreaths 5-13, snowflakes 2-5,
  stars 2-5, spans 2: ~30-45 draws, ~250 k triangles (the tree's 162 k). If over budget, in this order: merge the small
  pieces' non-emissive slots into one "trim" material (2 draws per piece level instead of 5), tree LOD0 to 30 m, the
  tree's shadow through its LOD2.

## 7. Offline checks (node, all PASS)

`node --import ./tools/christmas/hook.mjs tools/christmas/xmasTest.mjs`: the date switch (1 Dec on, 30 Nov off, 6 Jan on,
7 Jan off, ?xmas, ?day), the kit (5 pieces x 3 levels, COLOR_0 everywhere, UV on LOD0 only, triangles falling), the 48
slot material variants build (TSL graphs), the lights are emissive only, the site (spans 7-26 m wide, no star over a tram,
the lowest point of a span 4.68 m over the street, unit normals, swag scales), the span geometry (2,282 LEDs), the field's
level buckets match the bands, empty meshes hidden.

## 8. Browser turn checklist (server 8828, one tab)

1. `?xmas=1&tile=I6&view=stjob&at=1115,533` day / `&time=night` / `&wx=snow_cover`; the same at Saint-Pierre
   (`tile=E4&at=-718,-491`). DEFECT EYE: tree on the ground (planter joins the paving), nothing in the plane trees,
   star facing the square, baubles / LEDs not floating, needles' look (strokes, snow on top), shadow.
2. Walk Chaussée de Saint-Job and Rue Xavier De Bue at night: spans on the walls (plates touching), heights over buses /
   trams, motif orientation, LED twinkle not noisy, no LOD pop on the swags / wreaths / snowflakes while walking and driving.
3. Lamp snowflakes: the clamp on the post (shaft radius ~6.5 cm at 3.9 m assumed), facing along the street.
4. Shopfronts: the swag over the fascia (goosenecks?), wreaths on recessed doors (the address point is on the wall plane).
5. `attribute("xlod")` on an InstancedBufferAttribute must step per instance in r187 WebGPU (if not: the same data via
   `instancedBufferAttribute` per level, or by instance index).
6. Cost (gpuAB on GREEN, `?xmas=0` vs `?xmas=1`) day / night at both squares + while driving; shader warm-up time
   (`window.xmas.tComp`), no synchronous pipelines when the layer appears.
7. Images to docs/christmas/.

## 9. Not done / later

- No chalet (no December market documented). The square's real plane trees could carry light strings (not done).
- Shop-window decorations inside the glass, lights in house windows: not done (the facade shaders' lit windows could
  take a warm string pattern in December).
- The planter collides for the car only (not the third-person walker yet).
- Saint-Job's 13 spans: the two-storey houses rarely hold a span at 6.8 m; Brussels hangs them from poles too (not done).
