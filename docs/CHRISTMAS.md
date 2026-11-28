# Christmas in Uccle: the seasonal layer (branch claude/christmas)

## SEASON CHECK BY DATE (claude/xmascheck, 2026-11-27, four days before 1 December)

`?quick=1&day=335|350|362`, day (`time=midday`) and `time=night`, `&with=weather,traffic`: Place Saint-Job (fir, market,
garlands, the Chaussee with traffic), the Parvis Saint-Pierre, Rue Xavier De Bue (garlands, swags, December windows), Rue
du Ham, the police yard (the police game's start). Shots: `C:/Users/tibog/Downloads/uccle-xmas/check1127/`.
- **Fixed: snow wedges in the middle of the road on the snow days** (rule wx-road-edge, row `wxroadedge`): the asphalt's
  weather edge read each lane's aLateral, so every mid-road lane line kept a snow band that stopped dead at the junction
  pads and fanned into wedges where the lanes diverge. Now the carriageway's drain (aPiece.y): slush at the kerbs only.
- Fine: 1 Dec dry, bare trees, December sun; the fir (both squares) day and night, its foot on the paving; the LEDs, star,
  pole and wall garlands, De Bue swags and stars, the December window strands; 15 Dec cover by day (roofs, the fir, the
  chalets, parked cars) and the night's snowfall; 28 Dec dry; 0 console errors of ours (one 404: the favicon).
- Open, NOT Christmas code (the weather system; the same with `?xmas=0&wx=snow_cover`): on Place Saint-Job's paving a
  polygonal patch with only a thin material cover (cobbles showing) at 15 cm depth, and the snow layer's edge round it in
  ~25 cm saw-teeth (the coarse outer chunks of snowLayer.js); dark rings round the police yard's tree pits; white domes
  on young trees (garden caps); thin white zigzags on wall copings. Worth a snow job before 15 Dec.
- **Fixed (claude/snowfix, 2026-11-28; docs/WEATHER.md "Snow-day edges"):** the four snow-day defects were weather
  classes. (1) the bare patch = the overhead bake's in-place hole fill flooding the ROAD pass (rule overhead-fill-bounded,
  `?wxfill=old`); (2) its saw-teeth = the cut along the layer's 25 cm triangles, now a per-pixel signed distance (rule
  snow-edge-sdf, `?snowsdf=old`; the facade-foot teeth too); (3)+(4) the yard's rings and domes = the Wolvendael pond's
  REFLECTION trees (layer 9) baked as solid (rule wx-bake-drawn-only, `?wxdrawn=old`); found on the way: a dark hole
  under every hanging basket (props / lamp extras baked solid, `?wxprops=old`); (5) the coping / fascia zigzags = a
  1-2 cell strip of the layer on narrow raised ledges (rule snow-thin-ledge). Gate row `snowedge` + browser row
  `snowedge` (debug/snowEdge.js audit). Shots: `C:/Users/tibog/Downloads/uccle-jobs/snowfix_shots/`.
- **Counts** (debug/snowEdge.js `audit()`, the 64 m window, `?quick=1&with=weather&day=350&xmas=0&wx=snow_cover`;
  before = `&snowsdf=old&wxfill=old&wxdrawn=old&wxprops=old`), Saint-Job street / police yard:
  flooded road cells 14 665 / 2 959 -> 0 / 0; flooded shelter cells 173 252 / 116 330 (66 % / 44 % of the window
  thinner under a phantom crown) -> 0 / 0; meshes baked but not drawn 0 / 2 (the pond's reflection trees) -> 0 / 0;
  props / lamp extras / poles baked solid 12 / 12 -> 0 / 0; narrow raised layer strips 800 / 2 018 cells -> 0 / 0
  (cut: 983 / 2 053). Node row `snowedge`: the edge's largest step off its 1 m mean 10.7-12.8 cm -> <= 2.1 cm.
- **XMASPERF re-measured (2026-11-28, claude/snowfix):** preflight YELLOW at the start (system: 2 warn, other city
  servers listening; page: CPU +1.5 %, GPU +5.8 %, boot +16 %), browser.lock held, page in front (hasFocus true before
  and after each read); render scale pinned 0.75: **layer-street 0.497 +- 0.047 ms (budget 0.30: FAIL), fir-8m
  0.268 +- 0.052 ms (budget 0.10: FAIL)**, extra-poles 0.014 +- 0.031, extra-windows 0.023 +- 0.069 (pass). The closing
  preflight was RED (GPU 6.16 vs 4.52 ms: the machine got busy at the end: another agent's gate Chrome), so read the
  numbers as an upper bound, but they agree with the hot-machine numbers of 27 Nov (0.67 / 0.48), not with 7.2's 24 Nov
  0.121 / 0.086: the layer got ~4x dearer since claude/xmas3 (poles, windows, the fir rounds 3-4?): a job for
  the Christmas side before 1 Dec (not the snow fixes: ?xmas=1 has no weather here).
- **Snow cover GPU, before / after the snow fixes** (same session, the snow layer's camera layers off / on, 12 rounds,
  scale 0.75, bakes frozen during the A/B; before = `&wxfill=old&wxdrawn=old&wxprops=old&snowsdf=old`): Saint-Job street
  spot -0.012 +- 0.013 -> 0.006 +- 0.027 ms, the paving spot 0.036 +- 0.031 -> 0.091 +- 0.040 (the patch is covered now:
  more layer drawn), a walk view 0.058 +- 0.016 -> p50 -0.10 (noisy: se 0.28): no regression beyond the noise. The shape
  pass (worker, once per bake) 231 -> 258 ms.
- Seen, kept: under the night snowfall the fir reads as a flocked white tree; its LEDs are clear within ~15 m and fainter
  from the square's edge (the snow is lit by the city, the glow uses the needles' own albedo).
- GPU (RED preflight: two other agents' jobs, GPU 58 % busy at rest, power cap; read as noise): whole frame p50 at the
  stjob-street spot, native scale: 1 Dec night 12.8-15.3 ms vs `?xmas=0` night 13.0-14.9 (no difference visible in the
  noise); 15 Dec night (cover + snowfall) 16.8-17.0. debug/xmasPerf.js run(): layer-street 0.67 +- 0.19, fir-8m 0.48 +-
  0.12 (over budget, as the first hot-machine numbers of 7.2; re-measure on GREEN), extras within 0.05.

## THE SNOW (claude/snowseason, owner 2026-11-27: chose snow, "why no snow")

The season snows in its second half (rule snow-schedule, gate row `snowsched`, tools/audit/snowScheduleCheck.mjs):
viewer/seasons/snowSchedule.js (three-free, read once at boot by cityWeather.js) picks the START weather.
Quick mode (`?quick=1`, every tour view) keeps the weather off unless asked (`&with=weather`, `?wx=`): no tour
baseline flips on 15 December. (quick.js imports nothing but the places table: an early version imported the
schedule there and the merge was blocked, see the rule.)
- 1-14 Dec: dry (the winter look only). 15-26 Dec: the existing **snow cover** (roofs, cars, ground, the chalets: the
  layer, caps, tracks) by day; **cover + light snowfall** (0.4-0.9 cm/h, the existing snowfall path, snow2) from 18:00
  to 08:00 Brussels clock. 27 Dec - 6 Jan: dry.
- Seeded by the day of the year: cover depth 10-17 cm, the night's snowfall, wind, cloud; the same date = the same
  weather. Real date: the Brussels date + clock hour (a 02:00 visit on 15 Dec snows: the first snow night). A pinned
  `?day=` uses the scene's hour (`?time=night` = night, golden by default = day, `?hour=` solar), never the wall clock.
- Overrides: any `?wx=` (incl. clear, live) wins; `?season=summer`, `?xmas=0`, `?weather=old`: no snow; `?xmas=1` /
  `?season=winter` outside the real season (the forced 21 Dec look, the Christmas tour) stay dry: use `?day=350`;
  `?snowsched=old` = no automatic snow (as before). The dev panel's weather menu still changes it live.
- Cost: nothing new per frame (the schedule only chooses the preset at boot); outside the snow days the start is clear,
  exactly as before (no bake shown, nothing drawn). Shots: C:\Users\tibog\Downloads\uccle-xmas\snow\ (outside git).

## THE WINTER LOOK (claude/xmasreview, owner 2026-11-26: "yes do the winter look for christmas")

While the Christmas season is on, the city is in December (rules season-from-date, bare-winter-trees, walker-statics;
gate row `winter`, tools/audit/winterCheck.mjs). `?season=summer` = the city as before (the A/B), `?season=winter`
forces it, `?baretrees=0` keeps the leaves.
- **One season resolver**, viewer/seasons/seasonMode.js (`SEASON`, three-free): winter in the season by the Brussels date
  (xmasDate.js) or `?xmas=1` (then 21 Dec), summer = day 200 as before. lighting.js takes its day; the time presets are
  times of DAY on it (golden 1.3 h before sunset, twilight 0.45 h after, misty 0.8 h after sunrise, midday 12:30 solar,
  night unchanged): 15 Dec sunrise 8:40, sunset 16:38 Brussels clock, "golden" at ~15:22 with the sun 7.6 deg up.
  `?day=` / `?hour=` / `?time=` / the sky panel still pin. main.js sets the season's uniforms (viewer/seasons/season.js:
  lawns, shrubs, hedges, ivy, the weather's crown shelter) on that day at boot (before: only when the weather ran).
- **Bare trees** (viewer/treesStylized.js `BARE`): the city's trees are one broadleaf form (UrbIS CHM: no species), so
  all are treated as deciduous. The same leaf cards draw a fine TWIG spray (branching, buds) in grey-brown (the colours
  x `WINTER_F`): the crown keeps its silhouette as a twig haze over the bark mesh's limbs. The mask is RG (.r leaves +
  twigs, .g twigs): the pool's depth pass and the sun's shadow keep .g for the trees and the deciduous shrubs (hydrangea,
  rose); the evergreen shrubs (box, laurel, rhododendron, lavender) keep their leaves and green (their tint / WINTER_F).
  The far impostors (the kit, the old bake) are baked from the twig mask. No new view, mesh or pass: the same draws and
  triangles as summer, fewer fragments (the twigs cover less than the leaves).
- **Winter ground**: the textured ground's lawns duller and olive (per-cover tone x TONE_WINTER), more dull patches.
  The garden plants / hedges follow the season's day (deciduous leaves shrink, beech hedges keep brown leaves).
- **The walker and the fir**: the planter (octagon, body + camera) and the crown (body only, 2.4 m, to 3 m up) and the
  chalets join the walker's collision world (`window.__walkerStatics`, cityHook.js takeExtras).
- **Browser look** (2026-11-26, `?quick=1&xmas=1` vs `&season=summer`, golden + twilight presets; shots and the compare
  sheet `C:/Users/tibog/Downloads/uccle-xmas/winter/winter_sheet.png`): Place Saint-Job from 20 m and from 60 m (the fir
  now stands out of the bare plane trees), Avenue De Fre, Parc de Wolvendael from 70 m; the low December sun at 15:22
  (golden) and its long thin twig shadows on the lawns; 0 console errors of ours. Structure, the same view and page
  kind (renderer.info): Avenue De Fre 103 draws / 814,617 triangles winter = summer exactly; Wolvendael 142 / 1,315,028
  winter vs 190 / 1,315,538 summer (the draw count moves with the sun cache's redraws). GPU timing: later, on a quiet
  machine. The walker: the fir's planter + crown and the 6 chalets reach the collision world (`__walkerStaticsIn`).
- Not done (optional in the brief): fallen-leaf decals, morning frost on lawns / roofs / cars. The far tiles' orthophoto
  (past 250-550 m) is a leaf-on summer photo: from high up the far ground keeps green crowns.

## ART-DIRECTOR REVIEW IN GAME (claude/xmasreview, 2026-11-26, five days before 1 December)

Looked at with `?quick=1&xmas=1` day and `&time=night`: Place Saint-Job (the fir at 8 / 20 / 46 m, the 45 m switch
zoomed, from 60 m above, walking the market, car height on the Chaussée de Saint-Job), the Parvis Saint-Pierre (fir,
planter) and Rue Xavier De Bue (garlands, car height). Shots and the owner's sheet: `C:/Users/tibog/Downloads/uccle-xmas/`
(`review_sheet.png`).

**Defects found and fixed** (each: why, rule, check):
1. **A chalet's roof pierced by a street-name post** (Place de Saint-Job plate post 1117.7, 538.3, inside the west
   chalet's footprint). Why: build_site.py placed the market clear of trees, walls, shops and the fir, never of the
   street furniture. Fix: `street_furniture` in the build (plate posts, sign poles, postboxes, stops, Villo, bins, hoops,
   benches, bike parkings) 0.5 m clear of each footprint; site.json rebuilt (only `chalets` changed). Rule
   xmas-fit-current-city (extended); check: gate row `xmas` "street furniture" (siteFit.mjs; the old site.json fails).
2. **Two serving hatches 1.3 m from the fir's lowest branches** (the north row opened into the crown: no room for a
   customer). Why: the clearance was measured to the planter (1.4 m), not to the crown (2.95 m). Fix: the customers'
   strip (1.5 m in front of each hatch) clear of the crown + 0.3 m; the market now has the fir standing in the south row
   with the aisle free. Same rule / row.
3. **The Saint-Job planter floated 1.7 cm on its downhill side** (centre 70.483, rim min 70.446, foot 70.463). Why: the
   fir was set on the ground at its centre only (the chalets already used their lowest corner). Fix: xmasCity.js
   `treeFootY` (lowest of the rim and centre). Rule xmas-fit-current-city (joins); check `xmastest` "fir foot".
4. **At night each fir read as LED dots floating in a black void** (crown, baubles, planter invisible). Why: the 654 LEDs
   are emissive only (fixed light count) and lit nothing. Fix (`?firglow=0` = before): the foliage of every level, the
   baubles and the garlands' greenery take albedo x LED warm x `xmas.look.glow` (0.8) / `.glint` (0.08) x env.uNight
   (tuned in the page: 0.35 / 0.6 left the tree dark and turned the baubles into coloured bulbs; 1.2 read lime at 8 m).
   The 43 / 48 m switch at night keeps its brightness (crop mean 39.0 / 41.1 of 255). Rule xmas-night-glow; check
   `xmastest` "LED glow".
4b. **The market was a block of black huts at night** (same cause: its 16 eave LEDs per chalet lit nothing). Fix: the
   chalets' FRONT faces (boards, trim, sign; chosen by the normal, glTF +Z) take the same glow (`xmas.look.stall` 0.5).
   Same switch, rule and row.
2b. **The first furniture fix put a chalet between the square's main approach and the fir** (places `stjob-street`, the
   default boot and tour spot: the fir's lower half hidden). Fix: no chalet within 0.5 m of the sightline from there to
   the fir (build_site.py `FIR_VIEWS`, siteFit.mjs `FIR_VIEWS`); same row.
5. **The season followed the visitor's clock** (Montreal 6 h late, Tokyo a day early). Fix: xmasDate.js `brusselsDate`
   (Intl, Europe/Brussels). Rule xmas-season-date; check `xmastest` (UTC instants round the Brussels midnights).
6. **The layer's code was fetched on every boot all year** (main.js imported xmasCity.js statically: the kit, the
   GLTF / meshopt loaders before the cover). Fix: a dynamic import after `whenXmasNeeded()`, only when the layer is on.
   Rule xmas-low-priority (extended); check `xmas` "boot: no static import ...".

**Date logic checked:** on from 1 December 00:00 to 6 January 23:59 Brussels time; `?xmas=1` / `?xmas=0` force it;
`?day=` (day of the year: 335-365 or 1-6) decides when given (note: the dev panel's "day of year" slider writes `?day=`,
so a December visitor who moved it to summer gets no Christmas: intended, it is a simulation). Outside the season the boot
loads xmasDate.js + xmasWindows.js only (~3 KB, the date switch and the windows' uniform), no Christmas data.

**For the owner to decide (not changed):**
- **The city is in July when the layer is on.** lighting.js defaults to day 200 (mid-July sun) and the street plane trees
  are in full leaf: on 1 December the firs and the market stand under green summer crowns in a golden July light. The
  biggest "reads fake" of the review (`day_stjob_fir_20m.png`, `day_stjob_above60m.png`: from 60 m the fir disappears
  under the plane trees). Options: with the layer on by date, default `?day=` to the real day (December sun) and bare
  plane trees (a winter foliage state the stylized trees do not have yet); or leave it.
- **The chalets' goods are coloured boxes and their eave garland a smooth ribbed tube** up close (`day_chalet_close.png`):
  a Blender change of `build_chalet` (jars, mugs, bottles, ornaments on the shelves; a needle garland like the swags).
  Not done here: no Blender while the owner works.
- **The walker can walk into the fir** (the planter collides for the car only): inside, the 4 cm LED beads read as big
  flat glowing hexagons. A walker collider on the planter (and ideally the crown at 1.5 m) would keep the camera out.
- **The middle level (45-150 m) of the fir shows flat frond pads** when zoomed (12 deg FOV at 47 m:
  `day_fir_43m_zoom.png` vs `day_fir_47m_zoom.png`); at the game's 55 deg it is ~5 px per pad and not seen.

**Seen and fine:** the fir from 20 m day and night (needles, baubles, star), Saint-Pierre's fir at night, the pole
garlands on the Saint-Job lamps (5.5 m, well over a car), the De Bue garlands with their stars, the December windows,
the 43 -> 47 m switch at street FOV (no pop), no z-fight specks in the cards, 0 console errors of ours.

## FIR ROUND 3: the cards' cost and the middle level (claude/xmasfir3, 2026-11-18 offline, browser turn 2026-11-20)

- **Browser turn (2026-11-20, fast lane, preflight RED: Chrome 6.2 GB, GPU 52 % busy before start, power cap):**
  foundation merged; rows xmas, xmastest, stutter, stutter2, tourdet PASS. Place Saint-Job, `?quick=1&xmas=1`, eye
  height, 8 / 21 / 45 m, one page per variant (the switches are boot-only), GPU p50 ms, INDICATIVE only:
  default 12.65 / 12.65 / 12.78 then 11.80 / 11.93 / 11.93 (drift 0.8 ms between two loads of the same page);
  `?firprepass=0` 11.67 / 11.53 / 11.60; `?firshadow=cards` 11.53 / 11.99 / 11.73; 60 fps in all. The expected
  -0.1 ms of the pre-pass is under this machine's noise: neither switch measurably cheaper or dearer here; re-measure
  on GREEN with `gpuAB.alternate` once the switches can flip live. Look: no holes / z-fight specks in the cards at 8 m
  (day and night), the 42 -> 48 m switch keeps colour and silhouette, the tree's shadow on the paving, 0 console
  errors. Shots `docs/christmas/fir3_browser_{8m_day,42m_day,48m_day,8m_night}.jpg`.

- **Problems:** (1) the near level's needle cards cost +0.26 ms GPU at 8 m (budget 0.1 ms); (2) the middle level
  (45-150 m: solid fronds) read as flat tiers next to the needle crown at the 45 m switch.
- **Cost model** (`tools/christmas/firCost.mjs` on `tools/christmas/firRaster.mjs`, a software rasterizer: the cards with
  the atlas' alpha, early depth TEST + late write as a discarding shader gets, 2 x 2 quads; 1920 x 1080, the game's
  55 deg lens, eye 1.7 m; the sun's map at 2.9 cm texels, December sun 15 deg; lit lanes calibrated on the browser
  turn: 0.20 ms for the 8 m single pass + 0.06 ms measured for the cards' shadow; a depth-only lane = 0.2 x a lit one,
  an assumption): `docs/christmas/fir_cost.json` (before / after).

| at 8 m (near level) | card fragments | layers per seen pixel | lit lanes | depth-only lanes | model ms |
|---|---|---|---|---|---|
| seen card pixels 291 k (tree 397 k) | 6.18 M rasterised | 21.2 rasterised, 6.6 pass the depth test | | | |
| single alpha-tested pass (before) | | | 3.39 M | | 0.20 |
| **P depth pre-pass** + EQUAL lit pass | | | 0.74 M | 3.39 M | **0.084** |
| X fewer crossing cards (70 -> 55 %, -12 % cards) | | | 3.12 M / with P 0.70 M | | 0.184 / with P 0.078 |
| C hidden-card cull (553 of 16,207 cards no eye sees from 344 views round the tree, 2-40 m, 1.7-14 m high) | | | 3.39 M (they fail the depth test already) | | 0.20 (0 gain) |
| D per-direction card order (4 index orders, the nearest first; scratch test) | | | 2.67 M | | single pass -0.04; with P -0.008 |
| M mip bias | the atlas is read at level 4.5 (8 m), 5.9 (21 m), 7 (45 m): a bias only matters inside ~1 m | | | | ~0 |
| **S shadow**: cards + twigs + cone in the sun's map vs the FAR level's solid fronds + trunk | 0.47 M alpha-tested lanes vs 0.13 M opaque | | | | 0.06 -> **0.01** |

  21 m: 0.042 -> 0.017 (lit + pre-pass); 45 m: 0.012 -> 0.004. **Shipped estimate (P + S): 8 m 0.26 -> 0.094 ms,
  21 m 0.10 -> 0.027, 45 m 0.07 -> 0.014.** Ranked P >> S > X > D > C, M; implemented **P and S** (X changes the look
  for -0.006 ms after P, D needs 4 x the card indices for -0.008 ms, C gains nothing): the vertex work is unchanged in
  count (pre-pass + lit pass replace lit + shadow pass); the middle level's cards add ~0.001-0.003 ms at 45-100 m.
- **Why it happened:** a discarding (alpha-tested) shader gets the depth TEST early but writes depth only after it
  runs, so every card layer that passes the test runs the full lit shader (PBR, 5 PCF taps, IBL, weather, snow): 6.6
  layers per seen pixel at 8 m; the outer-first order only took 9 % of them. And the cards were drawn into the sun's
  map alpha-tested (3.7 x the lanes of solid fronds, noisy card-shaped shadows) at every redraw of the static cache.
- **Fixes** (each behind a switch, defaults on):
  - **P, `?firprepass=0` = before:** `viewer/christmas/xmasKit.js` slot `fir_cards` pass "depth" (MeshBasic, the atlas'
    alpha + the band mask, colorWrite off, `@invariant` position) as a TWIN of every card mesh (same geometry wrapper,
    instance matrices and band; renderOrder -1: before the city, whose pixels behind the tree then fail the depth test),
    and pass "colour" (the lit material, no discard, depthFunc EQUAL, no depth write, `@invariant`): the lit shader
    once per visible pixel, early depth back. As the city's leaves and impostors (viewer/treesStylized.js, impostors.js).
  - **S, `?firshadow=cards` = before:** the tree's drawn meshes cast nothing; shadow-only copies on
    `XMAS_SHADOW_LAYER` (25, enabled on the sun's shadow camera by xmasCity.js, re-asserted every 30 frames after an
    interior visit) draw the FAR level's (LOD2) solid fronds + trunk for EVERY level's instances and band: the same
    shadow on both sides of the 45 m and 150 m switches (no shadow change at a switch), no alpha-tested cards in the
    sun's map. The cards receive the fronds' shadow (self-shadowing of the crown by its solid core).
  - **The middle level (LOD1, 45-150 m) = a needle-card SHELL** (`tools/blender/christmasKit.py build_tree`): 3,325 big
    cards of the SAME atlas (one material with the near cards: colour, light, canopy normals and canopy AO match by
    construction) on the same branch curves as the near level's twigs: side sprays every ~21 cm (0.3-0.6 m long,
    alternating, swept forward, 70 % crossed by a rolled one), a tip spray + a crossing one, the leader's two rings;
    round a thin dark CORE (the fronds at 0.85 x the length, 0.45 x the width, no side sprays; AO at most 0.3 like the
    near level's depths: lighter, their silvery undersides turned the middle crown blue-grey). Each shell card keeps
    clear of the ornaments (shortened to 0.72 / 0.5, else left out: 676 / 394). LOD1 36,572 triangles (cards 13,300) from
    40,582. The FAR level (LOD2) keeps the solid fronds. The 45 m cross-fade unchanged (dithered over 39.6-45 m,
    `LOD_FADE` 0.12): now card crown to card crown. (Impostor rejected: a baked view turns with the walker at 45-60 m, the
    bulbs / baubles would need their own channel, and a separate material breaks the colour / light match.)
- **The switch's match** (`tools/blender/firReview.py`: the RAW kit GLB in Blender with the viewer's materials, the game's
  pixel density, film transparent; `tools/christmas/fir_review.py`; christmas.json `fir_switch`), at 45 m near vs middle:

| | silhouette IoU | foliage brightness | colour diff | row width err | see-through middle / near |
|---|---|---|---|---|---|
| old (solid fronds) | 0.836 | x 0.775 | 0.028 | 0.044 | 0.066 / 0.096 |
| **new (card shell)** | **0.844** | **x 1.069** | 0.030 | **0.037** | **0.095 / 0.096** |

- **Renders** (`docs/christmas/`, Cycles OptiX, the same sun and sky, the game's pixel density, enlarged by whole
  pixels): `fir3_8m_old_vs_new.jpg`, `fir3_21m_...`, `fir3_45m_...` (near level), `fir3_60m_...`, `fir3_100m_...`
  (middle level), `fir3_switch45_old_vs_new.jpg` (45 m: near over middle, old | new), `fir3_sheet.jpg` (all). The near
  level's look is unchanged (8 / 21 / 45 m old = new: the pre-pass changes the cost, not the picture).
- **Rule** (QUALITY_RULES 19, extended): the near cards as a depth pre-pass + EQUAL lit pass; alpha-tested cards never in
  the sun's map (the far level's solid fronds cast for every level); the next level keeps the look (same atlas and
  material), its match checked from the street at the game's pixel density, its cost by the model re-run per kit.
- **Gate rows:** `xmas` (tools/audit/xmasCheck.mjs): triangles 160 k / 45 k / 15 k and card triangles 20-80 k / 5-16 k / 0
  per level, the shell >= 1,500 cards with <= 20 % left out, the 45 m switch (IoU >= 0.82, brightness 1 +- 0.15, colour
  <= 0.05, row width <= 0.08, see-through +- 0.03: the old fronds fail brightness and sit on the see-through edge), the cost
  model re-run for this kit (card triangles equal) with <= 0.1 ms at 8 m, the switch defaults and the sun's shadow layer
  in the code. `xmastest` (tools/christmas/xmasTest.mjs): canopy normals on BOTH card levels, the pre-pass pair (twin:
  alpha + band, no colour, @invariant; lit: EQUAL, no discard, no depth write, @invariant, shadow mask kept), the field
  (every level: the twin first, the drawn meshes cast nothing, the shadow copies = LOD2's fronds + trunk on layer 25 with
  the level's band and instances; `cards` mode: each level's own), the 30 -> 70 m walk (38-46 m: both levels' fade sets),
  `LOD_FADE` 0.12 with cards on both sides of 45 m.
- **Rebuild:** `blender -b -P tools/blender/christmasKit.py` -> `node tools/christmas_pack.mjs` -> `blender -b -P
  tools/blender/firReview.py -- --tag new` (+ `--raw <old raw> --tag old`) -> `python -E tools/christmas/fir_review.py
  old new` -> `node tools/christmas/firCost.mjs --label after --out docs/christmas/fir_cost.json`.
- **For the browser turn (GREEN only, one Chrome tab, `?xmas=1`):** at Place Saint-Job, night and day, eye height, 8 m
  (the fir fills the view), 21 m (the street spot of 2026-11-17) and 45 m: `debug/gpuAB.js alternate` GPU p50, >= 10
  rounds each: default vs `?firprepass=0` (expect -0.10..-0.12 ms at 8 m) and default vs `?firshadow=cards` (expect
  -0.03..-0.06 ms averaged; a smaller spike at each sun-cache redraw), and `?xmas=0` vs default (the fir's total: the
  model says <= 0.1 ms at 8 m). Look: no holes or z-fight specks in the cards (the EQUAL test; if any: the twin's depth
  differs: check @invariant in the WGSL), the crown's self-shadow from the fronds (no blotches), the tree's shadow on
  the paving at the 45 m switch (must not change), the walk 30 -> 70 m and back (no pop: colour, brightness,
  silhouette; the middle crown should read as needles at 45-60 m); `window.xmas.fir`, `xmas.stats()`; the first
  sun-cache redraw after boot: no shadow-shader hitch (the shadow copies share LOD2's materials). Then the visual tour
  `views_xmas.json` and the HEAP 5-boot line.

## NEEDLE CARDS: BROWSER TURN (claude/xmasfir, 2026-11-17, foundation merged incl. mdraw + twinlink)

- **Fixes from the stills review:** the LED bulbs read as flat white hexagons at 3 m: the tree's beads now 8-sided and the
  `bulb_warm` material glows brightest facing the eye, 0.22 toward the rim (`normalView . view`): round bulbs close up,
  a point far off (same in the Blender previews: Layer Weight). The lone white dot beside the fir in the stills was the
  Blender sky texture's SUN DISC (gone with `sun_disc` off in `--stills`), not a bulb. Baubles 16 x 10 (12 x 8 showed
  facets at 3 m).
- **Found in game:** (1) the inner cone read as a sunlit striped column up close: smaller (0.22 L) and its AO held at
  0.18. (2) At the 45 m switch the FAR fronds stood ~25 % wider and darker than the card crown (both levels forced at
  40 m from the same spot: `xmasfir_40m_lod0_vs_lod1_narrowed.jpg` is after the fix): far fronds now 0.6 x the width,
  0.93 x the length, far cone 0.4 L; card gain `xmas.look.cards` 0.92 -> 0.78, `.under` 0.7 -> 0.55: the foliage's
  median colour LOD1 (44, 50, 50) vs LOD0 (48, 52, 51) sRGB at 47 / 38 m. The near level stays see-through where the far
  one is solid (dithered over 39.6-45 m: `xmasfir_switch_47_42_38m.jpg`): no pop, a softer crown inside 45 m.
  Far stand-in LEDs may now sink into the narrower far fronds (pack exemption 3 extended to `bulb_warm`).
- **Cost** (full city, Place Saint-Job at night, preflight YELLOW: 4.5 GB free, Chrome 4.3 GB; in-page alternation,
  `debug/gpuAB.js alternate`, GPU p50, 7-12 rounds): at the street-level spot 21 m from the fir: the needle cards alone
  **-0.01 ms** (12 rounds), the whole fir +0.07 ms median (+0.12 mean; an earlier run -0.05 / +0.25); at 8 m (the fir
  fills the view): cards +0.26 ms median at 85 % crossing cards, measured again at 70 %: +0.26 (mean +0.30), the fir
  +0.39; the cards' shadow +0.05-0.07. Outer-first card order (`christmas_pack.mjs outerFirst`) did not change it
  measurably. The whole layer (chalets, swags, spans incl.) +0.33 to +0.59 median in this YELLOW state (was +0.00 on
  GREEN before this branch; not the fir: the fir alone is the lines above). Within +0.1 ms at the reference spot; over
  it only when the tree fills the screen.
- **Crossing cards 70 %** (from 85 %): LOD0 150,368 triangles (cards 76,544 = 16,343 cards; baubles 37,440).
- **Images** (`docs/christmas/`): `xmasfir_stjob_{3m,8m,30m}_day.jpg`, `xmasfir_stjob_8m_night.jpg`,
  `xmasfir_stpierre_{3m,8m,30m}_day.jpg`, `xmasfir_stpierre_{3m,8m}_night.jpg`, `xmasfir_switch_47_42_38m.jpg`,
  `xmasfir_40m_lod0_vs_lod1_narrowed.jpg` (the Saint-Job 3 / 8 m day shots before the 70 % step).
- **HEAP browser line** (5 boots, `&xmas=1`, localStorage cleared): `gamemenu=0&orbitcam2=old`, default menu,
  `gamemenu=0&tilecache=0`, `game=police` + gamePerf police 45 s (54.7 fps, gpu 11.7 ms), `game=falcon`: 0 console errors,
  0 WebGPU errors, `tripCounts {}` in all five (queue skips flush 8 / 14 / 0 / 0 / 0).
- **Tour:** run `xmasfir` (views.json, xmas off) vs `foundation`: 1 of 22 flagged, traffic-alsemberg (a moving car at
  another place: traffic, twinlink; not this branch). Run `xmasfir-xmas` (views_xmas.json) vs `christmas`: 3 of 22:
  stjob-shops and stpierre-parvis (the fir only: the diff is the tree's outline) and traffic-alsemberg (the car).

## NEEDLE CARDS: the fir's near level (claude/xmasfir, 2026-11-17; offline first)

- **Defect:** up close the fir's branches read as flat leaves / cards, not a fir.
- **Why it happened:** every branch was a CLOSED, lumpy, flattened sleeve (a solid slab 0.5-0.85 m wide) with a needle
  stroke pattern in the shader and zigzag edges. Lit by its own smooth surface it shades as one broad leaf; no needle has
  a silhouette, nothing is seen through, the tiers have no depth. Detail in the colour cannot make a volume of needles.
- **Fix:** the NEAR level (LOD0, to 45 m) is now built of **alpha-tested needle cards** (new slot `fir_cards`):
  - `tools/blender/firNeedles.py` MODELS four Nordmann branchlets needle by needle (twig, terminal + side shoots, flat
    blunt needles parted to the sides and swept forward in a shallow V, a shorter top row over the twig, lighter new growth
    at the tips, buds; ~13 k faces each), renders them from ABOVE and BELOW (Cycles on OptiX, emission of the albedo x
    AO between the needles) into one atlas; `tools/christmas/fir_needles_ktx2.py` composes it (bottom views mirrored so a
    texel is the same needle; the card's back face samples v + 0.5: the silvery undersides), keeps 6 px of empty border
    per cell, bleeds the colour, builds COVERAGE-PRESERVING alpha mips and writes `models/christmas/fir_needles.ktx2`
    (2048 x 1024, UASTC + zstd, 743 KB file, 2.7 MB as BC7, 12 levels).
  - `tools/blender/christmasKit.py build_tree`: each of the 270 branches is a thin twig (bark) carrying side branchlet
    cards every 5.5 cm (alternating, swept forward 38-60 deg, hanging 4-22 deg) and, crossing 85 % of them, a second card
    rolled 60-88 deg (hanging / rising shoots: the branch is a bottle-brush from any side, never a flat tier seen edge-on
    from the street), sprays along the axis, a tip spray + a crossing one, a two-ring leader; outer cards take the
    light-tipped sprays, inner the older ones; a smaller dark inner cone (gaps show depth). 17.6 k cards.
  - **Canopy normals** (`CUSTOM_NORMALS`): every card corner takes the crown's normal (out from the trunk, 35 deg up;
    straight up round the leader) blended 20 % with its face's, on BOTH faces in the viewer (`normalNode =
    normalViewGeometry`: DoubleSide would flip the back's): the crown lights as a volume. **Canopy AO** in COLOR_0.b
    (depth into the crown x 38 % of the Cycles bake: the bake sees the cards as opaque quads).
  - Viewer (`viewer/christmas/xmasKit.js` case `fir_cards`): the KTX2 loaded with the kit (the shared KTX2Loader, before
    any material), alpha TESTED at 0.5 in the mask (+ the LOD band mask on the fade set; the shadow pass uses the same
    mask: card-shaped shadows), DoubleSide, glossy top / matt silvery underside (`xmas.look.cards`, `.under`), snow on the
    sprays' tops. Shadows: `fir_cards` casts. No light, no DynamicDrawUsage, the LOD bands / fade unchanged.
  - Ornaments: ray cast onto the SOLID foliage (trunk, twigs, cone, the cards' cores = the twig line +- 30 % of the half
    width), kept clear of it (they nestle among the cards' transparent fringe; 0 crossing with a card in the audit), LED
    bulbs clear of every card, no ornament out in the air past the branch tips (the crown's reach check). The far
    stand-ins keep the near places (moved out of the far fronds they would jump 0.2-0.45 m at the 45 m switch).
  - FAR levels unchanged in kind (solid fronds, no texture) + the trunk as its own stand-in (LOD0's twigs are not
    simplified into LOD1).
- **Rule** (docs/QUALITY_RULES.md row 19, extended): foliage seen from the street is needles, not slabs: the near level
  alpha-TESTED needle cards (never blended) of modelled sprays with CANOPY normals on both faces, the far levels solid and
  cheap, a triangle budget per level.
- **Automated checks** (gate rows `xmas` + `xmastest`): `tools/christmas/xmasTest.mjs` on the DECODED GLB: cards on LOD0
  only, >= 98 % of card vertices within 37 deg of the canopy normal and < 5 % of card triangles flat-shaded (now 100 % /
  0 %), the material alpha-tested (a mask, not transparent), two-sided, own normal node, depth written, the atlas present
  with >= 10 mip levels; `tools/audit/xmasCheck.mjs`: the triangle budget per level (160 k / 45 k / 15 k), needle-card
  triangles on the near level only, the atlas <= 1.5 MB file / 4 MB GPU, every ornament clear of the solid foliage and
  the card cores. Mesh audit (`tools/christmas_pack.mjs`): 0 blocking over 18 piece levels; exemptions widened (and
  written down there): foliage vs foliage now includes `fir_cards` (+ a card against the twig carrying it); the cards'
  own surface checks (open, two-sided, canopy-shaded by design: checked by the lines above instead); on the far levels a
  bauble sinking into the solid frond that stands in for the cards it nestles among.

| tree level | before (triangles / draws) | after (triangles / draws) | textures |
|---|---|---|---|
| LOD0 (0-45 m) | 183,424 / 8 (fir_needles 139,262 solid sleeves) | **135,192 / 9** (fir_cards 81,552 = 17,576 cards; twigs + trunk 9.8 k; cone 910) | before none; after `fir_needles.ktx2` 2048 x 1024 RGBA (743 KB file, 2.7 MB BC7) |
| LOD1 (45-150 m) | 41,090 / 8 | 40,616 / 8 | none |
| LOD2 (150-1000 m) | 12,802 / 5 | 12,622 / 5 | none |

**Stills** (Blender, Cycles OptiX, `--stills`, eye height 1.7 m): `docs/christmas/blender/fir_8m_day.jpg`,
`fir_3m_detail_day.jpg`, `fir_30m_day.jpg`, `fir_12m_night.jpg`, `fir_lod1_30m_day.jpg` (the far level at 30 m for the
45 m switch). Before: `tree_close.jpg`, `tree_day.jpg`, `tree_night.jpg` (the solid sleeves; left as they were).

**Rebuild:** `blender -b -P tools/blender/firNeedles.py` -> `python -E -P tools/christmas/fir_needles_ktx2.py` ->
`blender -b -P tools/blender/christmasKit.py -- --stills` -> `node tools/christmas_pack.mjs`
(the atlas sources live in data/raw/textures/christmas/, not committed; the shipped KTX2 is).

**For the browser turn:** the look at 5-15 m day / night / snow at both squares (cards' colour vs the far fronds at the
45 m switch: `xmas.look.cards`, `.under`; the dithered switch under motion), `?xmas=0` vs `?xmas=1` cost at night at
Place Saint-Job (budget +0.1 ms: alpha-tested overdraw + card shadows are the new cost; if over: the crossing cards to
70 %, the card shadow through LOD1's fronds), the visual tour `tools/tour/views_xmas.json`.

## BROWSER TURN 2 (2026-11-17, after the foundation merge 08395f0d)

- **GPU rebuild** (OptiX AO + previews, `docs/christmas/blender/`), mesh audit 0 blocking over 18 piece levels. Defect eye
  on the previews: the chalet's board gaps glowed at night (the core walls were in the lit interior slot): the core is
  now dark trim, the inside lit by one emissive bulb + the goods. The fir's sprays read as smooth leaves close up: the
  sprays' flat edges now zigzag ring to ring (needle tufts), needles two-tone (silvery undersides, by normal); LOD0
  161 k -> 183 k triangles.
- **Positions:** Saint-Job fir to the square's centre (1127, 530) (the first spot was 2.9 m from the square's pavilion);
  Saint-Pierre fir into the open parvis (-723, -495) (the first put its branches at the side door); two chalets touched
  the pavilion: found by the new gate check, re-placed 1 m clear. Joins: the planter and the chalets' skirts meet the
  setts / pavers with no gap (chalets set on their lowest corner: sunk uphill, never floating).
- **Images:** `stjob_market_day.jpg`, `stjob_chalet_close_day.jpg`, `stjob_market_night_snowfall.jpg`,
  `stpierre_after_move_day.jpg`, `stpierre_fir_close_day.jpg`, `stpierre_night.jpg` (+ the before shots).
  Swags now sit on the cornices / fascia boxes (visible on Deneubourg, La fleur du pain).
- **Cost** (full city, Place Saint-Job street level at night, 21 m from the fir with the market in view, GREEN preflight,
  in-page alternation `debug/gpuAB.js alternate`, xmas group off / on, 14 rounds): first +0.72 ms (median +0.59).
  Cause: every instanced material carried the dithered band mask (a discard: no early depth test) and the fir's
  layered sprays overdraw. Fix: per level a SOLID mesh set (no mask) for the instances inside their band and a FADE set
  only near a switch; shadows from the big parts only (27 -> 6 shadow draws). After: **+0.00 ms median (mean -0.13)**,
  draws 272 -> 319 (+47 incl. shadows), +474 k triangles (the fir's LOD0 in view).
- **HEAP browser line** (5 boots with `&xmas=1`, localStorage cleared: `gamemenu=0&orbitcam2=old`, default menu,
  `gamemenu=0&tilecache=0`, `game=police` + gamePerf police 45 s, `game=falcon`): 0 console errors, 0 WebGPU errors,
  `tripCounts {}` in all five (queue skips 6 / 10 / 6 / 0 / 0). Console warnings seen are the city's own (TSL inline
  return, texture serialize), also without the layer.
- **Visual tour:** the main tour now runs with `?xmas=0` (tools/tour/views.json common: it must not flip on 1 December);
  the layer's own run uses `tools/tour/views_xmas.json`. Run "christmas" (xmas on) vs foundation: 3 of 22 flagged, all
  intended: stjob-shops (the fir, a chalet, a lamp snowflake), stjob-60m (the market's chalet roofs from 60 m),
  stpierre-parvis (the fir): `docs/christmas/tour_*.jpg`. Run "christmas-off" (xmas off) vs foundation: **0 of 22 flagged** (the shopLayout refactor and the rest change nothing when the layer is off).
- **Rule 19 + gate:** `tools/audit/xmasCheck.mjs` (row `xmas`) and `tools/christmas/xmasTest.mjs` (row `xmastest`) in
  tools/audit/mergeGate.mjs; docs/QUALITY_RULES.md row 19.

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
- **The Saint-Job fir moved** from (1115, 533) to the centre of the square's paving (1127, 530): the first spot was
  2.9 m from the square's 3 m pavilion (UrbIS solid 559426): the branches (2.95 m) went into it. Now 7.8 m from any wall,
  8.3 m from the drawn plane trees' crowns, 16 m from the tram. The Saint-Pierre fir checks out: 9.1 m from the nearest
  wall, 8.6 m from the roadway, on the paved forecourt (UrbIS sidewalk "Parvis Saint-Pierre"), 137 m from the tram.
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
| tree | 150,368 / 40,582 / 12,578 (2026-11-17 needle cards, browser turn) | 45 / 150 / 1000 | needle cards (LOD0 only), needles, bark, bauble, gold, LEDs, star, planks, mulch (LOD2 drops planks + mulch) |
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

### 4.1 Rebuild after the data restore (claude/xmas1, 2026-11-23, plan jobs 0-1)

`python tools/christmas/build_site.py` on the current foundation (OSM 2026-11-23 snapshot in data/raw; the committed tiles
and street life read by the build are unchanged by the restore). site.json is NOT byte-identical; every difference is
explained, none comes from the restore itself:
- **Fronts 107 -> 109:** + Agam nightshop (Ch. de Saint-Job 701) and + Brico (Ch. de Saint-Job 594), street-life extras
  added by claude/places1 after site.json was baked (stale, never rebuilt).
- **Wreaths 120 -> 119:** - Ch. de Saint-Job 701: its address point is now the night shop's front (0 m; the 3 m shop rule).
- **Spans 56 -> 52 (Saint-Pierre 43 -> 39):** - 4 garlands across the Parvis Saint-Pierre whose east end hooked on the
  UrbIS church solid 1594643, which models/stpierre hides (the generator never read the hide lists). The generator now
  drops hidden solids (and keeps wreaths off retail boxes, `shed: true`).
- Trees, chalets, street lines, config: identical.
- site.json now carries `select` (areas, shop kinds, tree radius) so the gate re-derives the fronts from the current street
  life.

**Swag width (job 1):** xmasCity.js sized each swag from site.json's slot width (<= 6.5 m) and never read the curated
front.w / front.du. Now viewer/christmas/xmasSwag.js `swagRun` takes width and centre from viewer/shops/shopLayout.js
`frontFace` / `frontWidth`, the helper streetlife/layout.js and `layoutShop` use too. A front under a curated canopy (the
Carrefour, a `shed: true` box) gets its swag along the canopy's band over the glazed run (18 m, 11 modules); it is not on a
decorated street today, so nothing changes in the city until the decorated area reaches it. Unchanged fronts give the
same modules as before (`?xmas=1` / `?xmas=0` unchanged).

**Checks:** gate row `xmas`, "site fit" rows (tools/christmas/siteFit.mjs, rule xmas-fit-current-city): fronts complete +
unmoved + on drawn walls, every swag inside the front the shop kit draws (+ the Carrefour + a synthetic 18 m front),
wreaths, spans on drawn walls at their height (not hidden, not across a park fence), firs and chalets >= 1 m from street
lamps and park fences. `node --import ./tools/christmas/hook.mjs tools/christmas/siteFit.mjs [old site.json]` prints the
audit (the pre-rebuild file: 2 fronts missing, 1 wreath on a shop, 4 spans on a hidden solid).

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

## 7.1 The Christmas tour views (claude/xmas2, 2026-11-24, plan job 2)

`tools/tour/views_xmas.json` showed the layer in 3 views only, all at golden hour (stjob-shops, stjob-60m,
stpierre-parvis). Five views are added, each for one thing a later change can break. Every camera was checked with
`debug/quick.js` `view()`: none stands inside a building (the first Saint-Pierre spot, -745, -482, was inside the corner
building, roof 65.9 m: moved to -740, -486). Each view costs ~35 s of tour time, so there are no more than these:

| view | time | what it guards |
|---|---|---|
| `xmas-stjob-night` | night | Place Saint-Job from the east, 24 m from the fir: the fir's LEDs (bloom), the 6 chalets' lit counters and roofs, the snowflakes on the lamps, the swags on the shopfronts behind. Breaks when: the market (`config.chalets`), the night emission (`xmasLook.night`), the fir's level switch |
| `xmas-stjob-dusk` | twilight | the same square from the west (the stjob-street spot): the fir with its star against the sky, a chalet, a lamp snowflake. The LEDs at the dusk level of `env.uNight` |
| `xmas-stpierre-night` | night | the Parvis Saint-Pierre: the 9 m fir in front of the church. The parvis lost 4 garlands to the hidden-church fix (claude/xmas1): none may come back hooked on the church |
| `xmas-debue-garlands-dusk` | twilight | Rue Xavier De Bue looking east: garlands across the street with their star motifs, the tram span at x -898 without one, the swags, the pharmacy cross |
| `xmas-debue-swag-night` | night | a shopfront swag and a door wreath up close (Maroquinerie Karwan + the wreath of no. 36A, Les Petits Riens next door): the swag along the drawn front (the shared `frontFace` / `frontWidth`), the wreath on the door |

Shots of the first branch run (no baseline yet): `C:/Users/tibog/Downloads/uccle-xmas2-ab/tour/xmas2-new/` (5 views) and
`.../xmas2-new2/` (the two moved cameras). 7/7 ready, 0 console errors. The Christmas tour baseline ("xmas2026") is
recorded on the foundation after the merge. The plan also lists an Alsemberg tram-span view, an eye-height lamp snowflake
and a 45 m fir switch. They are left out to keep the tour short: the tram span is in `xmas-debue-garlands-dusk`, the
snowflakes are in both Saint-Job views, and the 45 m switch has its own browser row (`xmasfir3`).

## 7.2 Boot with the layer on (claude/xmas2, 2026-11-24, plan job 3)

**What was wrong.** The layer was queued with the landmarks in `viewer/main.js` and started its downloads at once,
whatever the spawn, at the default High fetch priority: site.json, christmas.json, christmas.glb (5.71 MB), the needle
atlas (0.73 MB) and data/shops/terraces.json. On a G9 spawn (Rue Engeland, 1.5 km from any decoration) all of it came in
before the cover. On the default boot (I6, Saint-Job) site.json was requested before the start tile's first file. From
1 December every cold visit on the live site would have shared its bandwidth between the start tile and decorations
it may not see.

**Fix (rule `xmas-low-priority`, docs/rules/xmas-low-priority.md):**
- Every Christmas fetch carries `XMAS_FETCH = { priority: "low" }` (viewer/christmas/xmasKit.js). The GLTFLoader gets
  `setPriority("low")` (r187 Loader). The needle atlas is fetched at low priority and handed to the shared KTX2 loader's
  `parse`, which keeps its own priority for the ground's textures.
- The layer starts through `viewer/bootGate.js` `whenXmasNeeded()`. It starts at once when a decorated area (site.json
  `select.areas`: centre + radius, mirrored in `XMAS_AREAS`) reaches into the boot's ring, because the layer can then be
  in the first view. Otherwise it starts after the cover, staggered like the far landmarks.
- Under `?quick=1` it starts at once and `quickReady` waits for it (`window.__xmasPending`), so a tour shot never
  misses it. This guards against flaky tour shots now that the layer's downloads are low priority.
- Check: gate row `xmas` "boot:" rows. XMAS_FETCH is low. Every fetch / loader under viewer/christmas/ uses it. No
  shared-KTX2 `load()`. addChristmas is started only after `whenXmasNeeded()`. `XMAS_AREAS` = site.json
  `select.areas`. A mutation test (the site.json fetch without XMAS_FETCH) fails the row.

**Request lists** (local tour server, `?gamemenu=0`, resource timing, decoded body sizes; no timing claims: the laptop
was busy with another agent's gate, so the absolute times differ between runs):

| boot | Christmas files | before the cover: requests / MB |
|---|---|---|
| foundation, default (I6), xmas=0 | none | 638 / 139.27 |
| foundation, default (I6), xmas=1 | 4 + terraces.json, all before the cover; site.json at 3412 ms, before the start tile's first file (I6 ortho at 3455 ms) | 645 / 144.09 |
| xmas2, default (I6), xmas=1 | the same 4 + terraces.json, before the cover (Saint-Job is in the ring: the fir is in the first view), at low priority | 641 / 144.72 |
| foundation, G9 (far south), xmas=1 | all before the cover (site.json 6.3 s, glb 6.4-8.2 s, atlas 12.4 s; cover 29.3 s) | 644 / 138.32 |
| xmas2, G9, xmas=1 | **all after the cover** (cover 25.3 s; site.json 25.9 s, glb 26.1 s, atlas 27.1 s) | 634 / 130.48 |

Resource timing and the DevTools request headers do not show the fetch priority, so the offline row above is what
guards it. On the local HTTP/1.1 server the priority changes nothing measurable. It matters on the live site's HTTP/2,
where requests share bandwidth by priority (PERF_RESEARCH idea 8).

**Perf probe (timing):** `debug/xmasPerf.js` `run()` on `?quick=1&place=stjob-street&xmas=1&time=night`. It runs a GPU
A/B with `gpuAB.alternate`, switching the layer's meshes off and on through their camera layers (mask 0, so neither the
colour pass nor the shadow pass draws them). Budgets (plan section 3):
- the whole layer at street level < 0.30 ms;
- the fir alone at 8 m < 0.10 ms;
- each extra registered in `window.xmas.extras` (poles, window lights: none yet) < 0.05 ms.

**First numbers (2026-11-24, preflight GREEN before, YELLOW after (CPU 11 %), page check YELLOW: no baseline recorded; one
tab, no other gate or Blender running).** `?quick=1&place=stjob-street&xmas=1&time=night`, two runs of `run()` in one page,
GPU p50, mean of 6 alternated rounds (the min / max of the per-round differences in brackets):
- the whole layer at street level: 0.53 ms [0.32, 0.79] and 0.60 ms [0.07, 1.31]. **Over the 0.30 ms budget.**
- the fir alone at 8 m: 0.90 ms [0.78, 1.04] and 0.98 ms [0.66, 1.58]. **Far over the 0.10 ms budget.** The 0.084 ms of the
  cost model (tools/christmas/firCost.mjs) is the needle cards' share only.
- At 8 m, the fir split up (5 rounds each, noisy): the needle cards (lit + depth pre-pass) ~0.21 ms; the shadow-only
  casters (far fronds, layer 25) ~0.20 ms at night; the rest of LOD0 (solid needles, bark, baubles, LEDs, star, planter)
  ~0.25 ms. The three parts add up to ~0.66 ms, against 0.9-1.0 ms for the whole fir: the noise is about +-0.3 ms.
- No extras are registered yet.
- **Verdict: FAIL on both budgets** (superseded by 7.3: PASS, the first numbers were mostly the automatic render scale and noise). Next (plan section 6, in this order): the shadow casters at night (the moon's map;
  are they needed at all?), LOD0's solid needles and bark under the cards, the cards' pre-pass. Re-measure on a GREEN page
  check with a recorded baseline before acting on any of these.

Browser row `xmasperf` (tools/audit/gate.d/browser/xmasperf.mjs) runs the probe plus the request lists above
(`debug/xmasBoot.js` after `debug/bootTimeline.js`).

## 7.3 The layer's GPU cost (claude/xmas3, 2026-11-24): both budgets met

**Result** (`debug/xmasPerf.js run()`, `?quick=1&place=stjob-street&xmas=1&time=night`, render scale pinned at 0.75,
10 rounds, preflight YELLOW before and after: system CPU / GPU OK, the page check CPU +15 % / boot -12 %, GPU -1 %;
browser.lock held, no gate or Blender running; one page, old and new swapped live in it):

| row | budget | before (`?firlight=old`) | after (default) |
|---|---|---|---|
| layer-street (the whole layer, 31 m from the fir) | 0.30 ms | 0.140 +- 0.015 | **0.121 +- 0.014** |
| fir-8m (the fir alone, filling the view) | 0.10 ms | 0.179 +- 0.022 | **0.086 +- 0.014** |
| the cut alone, `lightAB()` (14 rounds, alternated) | | | 8 m **-0.084 +- 0.017**, street -0.012 +- 0.010 |

**Why the first numbers (0.53 / 0.90 ms) were so high and so spread (+-0.3 ms).** (1) The render scale was AUTOMATIC
(upscale.js dynres): it stepped between 0.6 and 0.85 during a run, and each step moves the whole frame by more than the
budgets. (2) One p50 per 2.5 s round, 6 rounds, always off-then-on. (3) The machine heats up under a timed session: the
same fir read 0.65 ms at 81 C with the power cap active, 0.32 ms later the same hour, 0.18 ms on a quiet machine (costs
scale with the GPU clock: compare only inside one alternated run). The probe now pins the scale (0.75, dynres restored
after), flips the order every round, takes the trimmed mean of the frames (viewer `gpuStats().tmean`, the 10-90 % band:
the shadow-cache redraw frames drop out) and reports the standard error. Rule: a timing row pins the render scale.

**Each cost, its cause, its cut:**
- **The fir's shadow casters at night: not a cost.** They are static casters of the sun's cached map (`christmas` is
  not a mover in lighting.js `MOVER_TOP`): drawn on the cache's redraws only (counted: 6 draws in 180 frames, the
  30-frame refresh), and of the lamps' cached maps (layer 6, never the per-frame mover layer 11). Forcing a full sun-map
  redraw EVERY frame, the copies cost 0.03 +- 0.06 ms per redraw: ~0.001 ms a frame. The "~0.20 ms" of the first split
  was noise. **Kept by night**: the moon casts the city's shadows (intensity 1.2), and the lamp maps take the fir's
  shadow too. No hand-over to build, no snapping. Node check (row `xmas`): "fir shadow at night: static casters".
- **The needle cards' lighting: the cut.** The lit EQUAL pass runs once per visible card pixel, but at night with the
  night's whole light set: the cluster loop over the pooled lamp lights + the two shadowed lamp spots (their shadow
  maps). Measured by swapping the cards' material live: sun / moon + sky only -0.14 ms (a hot run), the cluster loop
  alone or the spots alone ~-0.03 (only both gone frees the shader: a register / occupancy cliff), the night loop's
  foliage path (`nightFoliage`) -0.03, per-vertex sun on top of sun + sky -0.01 (not taken). The lamps' light on the
  crown is not seen: at 6 m, 8 m, 24 m at night and 8 m at dusk the frames match (mean brightness 12.48 / 12.45, 10.83 /
  10.84, dusk 10.59 / 10.61 of 255; the remaining pixel differences are the LEDs' twinkle). **Cut (`?firlight=old` =
  before, features row `firlight`):** the cards' lit materials take `foliageLights()` (foliage/vertexLight.js: the sun /
  moon + the hemisphere, as the city's grass, plants and ivy); the moon's shadow, the canopy normals, the sky light, the
  snow and the depth pre-pass are unchanged; by day the lamps are off: no change. Both levels' cards (near + middle shell:
  one material) take it: no step at the 45 m switch. The 150 m switch is to the far fronds (all lights), whose lamp
  light is as invisible at that range. Node checks: row `xmas` "fir light", `xmastest` "fir light".
- **The rest of the near level.** In the same page: the twin (depth pre-pass) ~0 (the lit pass carries the cost);
  bark, cone, bulbs: sun + sky only gains -0.004 +- 0.008 (not taken); baubles and gold caps with sun + sky only: -0.09 +-
  0.07 but their lamp glints go (the small warm crescents on the baubles: a visible loss) - **not taken**, the
  budget is met without it. Unlit, the ornaments' many small triangles cost 0.03 +- 0.03 (micro-triangles: not the
  cost). The FLOOR: the whole fir unlit (MeshBasic, same geometry and passes) still costs 0.17 +- 0.03 ms in a hot run
  (vs 0.32 lit): the pixels it takes from the sky go through the scene MRT, GTAO and SSR (sky pixels skip them). Any
  opaque object filling that much of the view pays it; below ~half of the fir's cost at 8 m cannot come from shading.
- **Triangle and draw budgets per level** (node, row `xmas`): 150,368 / 36,572 / 12,578 triangles (160 k / 45 k / 15 k),
  9 / 9 / 5 draws (+ the cards' depth twin on the card levels, + 2 shadow-only copies in the sun's map).

**Look:** `C:/Users/tibog/Downloads/uccle-xmas3-ab/` `fir8m_night_old_vs_new.jpg`, `stjob24m_night_old_vs_new.jpg`,
`fir8m_dusk_old_vs_new.jpg` (left old, right new; the separate frames beside them).

**To re-measure:** `const X = await import('/debug/xmasPerf.js'); await X.run()` (budgets) and `await X.lightAB()`
(the cut, live); `run({ split: true })` splits the fir at 8 m into cards / shadow copies / the rest. The baseline of
the page check was recorded by this branch (`docs/perf/preflight_baseline.json`, 1280 x 720, GREEN system preflight).

## 7.4 Garlands on poles at Saint-Job (claude/xmas4, plan job 5, owner's choice 2026-11-23)

**What was wrong.** Place de Saint-Job had 13 garlands across the street. build_site.py hangs a garland only between two
facades at 6.8 m with the roof 0.8 m higher; the square's two-storey houses rarely reach that, and the square itself and
its north edge (Avenue du Prince de Ligne) have no facade on one side. Brussels hangs such garlands from poles.

**Added (rule xmas-pole-garlands, docs/rules/xmas-pole-garlands.md):**
- `tools/christmas/xmasPoles.mjs` places them from the city's own data (the tile's road stage in node, tools/road_audit/tile.mjs),
  writes `models/christmas/poles.json` (`--write`) and checks it (default; gate row `xmaspoles`). A station every 16 m along
  the decorated Saint-Job lines (site.json streets) + the square's north edge, moved onto the middle of the DRAWN
  carriageway (the OSM line of Avenue du Prince de Ligne runs on the square's paving edge), none within 11 m of a wall
  garland. Each side: a drawn street lamp or tram pole within 4 m along the street (the same placedLampSites /
  tramPoleSites the city uses), else a Christmas pole 0.55 (0.95) m behind the kerb, shifted up to 4 m along it, that
  passes every placement rule (measured sidewalk; >= 0.45 m off the carriageway and its parking; >= 1.25 m from every
  traffic lane / junction turn: the car's body, rule 27; >= 1.5 m from a zebra crossing, 1.6 m from a trunk, 1.0 m from a
  wall, 2.2 m from a tram track, 1.2 m from a bollard or another pole; clear of the market and the fir).
- Heights: lamp hook 5.5 m (on the shaft, 0.3 m under the 6.6 m Brussels lamp's lantern), tram pole 6.85 m (its 7 m top),
  Christmas pole 6.6 m (5.5 m beside a lamp; 7.2 m over a tram). The street garlands' catenary and LEDs (buildSpans), sag
  0.3 + 0.02 x width, less where the lowest LED would come under 4.8 m over the road / 6.4 m over a track; the hanging
  star only where its foot clears 4.6 m (it hangs 1.32 m under the wire: not on the 5.5 m lamp garlands).
- **13 pole garlands** (Saint-Job: 13 wall + 13 pole = 26), 7 with a star: hooks 5 lamps + 21 Christmas poles (no tram pole
  stood at a station); widths 7.4-21.4 m, sags 0.45-0.73 m, the lowest LED 5.01 m over the road, 6.86 m over the tram.
  Stations left out: a wall garland there 16, no pole spot (traffic lane / turn: the narrow north arm of the Chaussée,
  junctions) 10, no kerb within 16 m 3, a pole garland there 3, a lamp over the tram 1, width 1, a bollard 1.
- City (`viewer/christmas/xmasCity.js`): poles.json at low priority (XMAS_FETCH); a garland shows once BOTH hooks are
  drawn: a Christmas pole on `world.walkY`, a lamp / tram pole only where the city draws it (lampSiteSets / the
  "tram-poles" instances within 0.25 m; else dropped after ~10 s, logged: never a garland in the air). Three merged static
  meshes (wires, LEDs, poles: `buildPoleGeometry`, slot `pole_steel` = the tram poles' steel), made with stand-in geometry
  so they compile in the layer's warm-up, rebuilt when a set of garlands comes in; the stars join the street garlands'
  instanced `spanmotif`. The Christmas poles are drive colliders (0.1 m octagons). No shadow (small pieces cast
  nothing), no light, no DynamicDrawUsage. `?xmaspoles=0` / site.json `config.poles = false`: without.
- Browser (2026-11-24, `?quick=1&place=stjob-street&xmas=1&time=night`): 13 / 13 shown, 0 dropped (the 5 lamp hooks are
  drawn where the node data says), the foot on the drawn ground (footA = walkY exactly), 0 console errors of ours.

## 7.5 December windows (claude/xmas4, plan job 7)

- `viewer/christmas/xmasWindows.js` + `viewer/facades.js interiorRoom`: with the layer on, a warm LED strand (two shallow
  swags of 11 beads, a slow twinkle) across the window head in 12 % of all rooms among the DARK ones (their faint warm
  glow on the curtains: the extra warm windows at night) and in 38 % of the lit ones; far off the beads become a soft
  warm line (no sparkle). The lit rooms and their colours are unchanged: viewer/nightLights/litHash.js is the shader's CPU
  copy (the night's window light sources) and a strand is a decoration, not a room light.
- Compiled into the facade shader only when the layer is on at boot (`xmasDate.js xmasActive`, the layer's own switch,
  now three-free and re-exported by xmasCity.js; `?xmaswin=0`: never): outside the layer the shader is exactly the one of
  before (an early return with the same expression), so the main tour (`xmas=0`) is unchanged; turning the layer on
  never rebuilds a shader. Inside, `If(xmasWin > 0.5)`: the uniform is set when the layer starts; the probe flips it.
- Shots (`C:/Users/tibog/Downloads/uccle-xmas4-ab/`): `windows_stjob_north_night_on.jpg` / `_off.jpg` (the same frame),
  `windows_and_pole_close_night.jpg`, `poles_stjob_east_night.jpg`.

## 7.6 The cost of the two extras

`debug/xmasPerf.js run()` (render scale 0.75 pinned, 10 alternated rounds, trimmed means; `layer-street` now switches
the layer's group AND the extras outside it: the windows' uniform), one page at a time, the page brought to front (rAF
60.1 fps), browser.lock held, no Blender. System preflight YELLOW before (a second city server listening);
**another agent's merge gate (gate.lock, carrefour2) started 6 minutes before the runs and ran through them**, and the
page check after was RED on CPU (+60 %, boot +127 %) with the GPU within -6 %: the numbers below are YELLOW-to-RED, read
them as an upper side; the alternation inside a page keeps the extras' differences fair.

| page | layer-street (budget 0.30) | extra-poles (0.05) | extra-windows (0.05) |
|---|---|---|---|
| default, first load (machine hot) | 0.389 +- 0.011 | 0.028 +- 0.016 | 0.005 +- 0.007 |
| the same page, extras off in it | 0.327 +- 0.004 | | |
| `?xmaspoles=0&xmaswin=0` (the layer as xmas3) | 0.203 +- 0.029 | | |
| default | 0.177 +- 0.026 | 0.004 +- 0.007 | -0.009 +- 0.014 |
| `?xmaspoles=0&xmaswin=0` | 0.212 +- 0.024 | | |
| default | 0.203 +- 0.017 | 0.009 +- 0.004 | -0.041 +- 0.126 |

The extras: poles 0.004-0.028 ms, windows within noise (<= 0.005 ms): both under 0.05 ms. The whole layer with them:
0.18-0.20 ms in the alternated default / without pages (without: 0.20-0.21), under 0.30; the first page's 0.39 / 0.33
(the extras switched off in it) came from the machine's state, not from the extras.
**Re-measured on GREEN** (after the other gate; system preflight GREEN, page check GREEN: CPU -0.8 %, GPU +4.4 %, boot
-0.7 %; rAF 60.5 fps; after the runs the system check went RED on memory only: Chrome 7 GB, the page then closed):

| page | layer-street (budget 0.30) | extra-poles (0.05) | extra-windows (0.05) |
|---|---|---|---|
| default | **0.192 +- 0.009** | **0.008 +- 0.004** | **0.001 +- 0.011** |
| `?xmaspoles=0&xmaswin=0` | 0.338 +- 0.031 [0.20, 0.45] | | |
| default | **0.131 +- 0.007** | **0.023 +- 0.016** | **-0.010 +- 0.005** |

PASS: each extra < 0.05 ms, the whole layer with both 0.13-0.19 ms < 0.30. The whole-layer row moves by up to 0.2 ms
between page LOADS of the same code (the xmas3 layer alone read 0.20-0.34 in this session, 0.121 on xmas3's day):
compare rows only inside one page; the extras' own rows are the in-page A/B.

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
- Shop-window decorations inside the glass, lights in house windows: December strands in the facade shader (7.5, claude/xmas4).
- The planter collides for the car only (not the third-person walker yet).
- Saint-Job's 13 spans: the two-storey houses rarely hold a span at 6.8 m: 13 garlands on poles added (7.4, claude/xmas4).
