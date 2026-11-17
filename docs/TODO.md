# Everything still to do

> Continuing in Cursor / another Claude session? Read **`HANDOFF.md`** first (setup, rules, how to run). Look + performance plan: **`docs/RENDER_PLAN.md`**.

One list of all open work, roughly in priority order. `HANDOFF.md` says how to run things;
`docs/PLAN.md` has the history and details of what is done. Rule of thumb for every item:
**look better without costing frame time** (instancing, shared materials, LOD, compressed assets).
Older sections (per-branch notes from 2026-11-04 .. 11-13, labs, master list) moved UNCHANGED to **docs/TODO_ARCHIVE.md**
on 2026-11-17; their open items are carried into NOW below. Every merge: docs/QUALITY_RULES.md + merge gate + city tour.

## NOW (2026-11-17, one current list; newest owner notes win)

**Running:** curvedroads (sharp-bend road folds 4,203 -> 0 offline; browser turn; rule 24; worker bundle to rebuild in main at merge).

**Police car rear (2026-11-17):** policerear merged: the plate is now a pre-filtered texture (plate shimmer -15..-44 %); spec AA / no SSR / shut-line filter measured nothing (dropped). Next job: the low sun's TREE SHADOWS sliding over the moving player car are the main remaining shimmer (car receiving no shadow: -43 %): a smoother received sun shadow on the player car / nearby movers, measured with debug/rearCheck.js (docs/POLICEREAR.md).

**Performance (owner's #1)**
- [ ] Falcon flight stutter round 2: round 1 merged 2026-11-17 (worst 300 -> 67-83 ms, > 50 ms frames 15 -> 7, p99 ~50 -> ~33; goal 0 over 50 ms, p99 <= 25 not met). Left, ranked (docs/perf/FALCON_STUTTER.md): kit far walls' fade copy shadow build 31-56 ms (too many attributes to cache), major GC 50-100 ms, tile gardens step 18-40 ms, street-life box fade copy 8-9 ms, hero collider poll 37-66 ms.
- [ ] Clean performance measure of both games with everything merged (preflight GREEN, one tab).
- [ ] Time to play: police ~43 s, falcon ~39 s -> < 35 s.
- [ ] Heap leftovers: GLB held by the loader, meshopt wasm, landmark geometry holds (docs/HEAP.md).

**Owner playtest 2026-11-16 / notes 2026-11-17 (details in the sections below)**
- [ ] Police car rear: lines shimmer while moving; rear looks crude in the chase view (8c, 8e). Chase camera re-check (8d).
- [ ] Road widths too narrow in places; some curved roads broken at sharp bends.
- [ ] Falcon controls feel hard: ASK THE OWNER what is hard. Police game: owner to replay car control round 3.
- [ ] Lycée Français gate: left fence JITTERS (check close + moving); bare flag poles in that view (quick mode?).
- [ ] Chemin du Cortenbosch: the second, paved part down to the Geleytsbeek, parallel to Av. du Lycée Français (missing).
- [ ] Flags: where else (owner names places; suggestions police station, Observatory, public buildings).
- [ ] Shops Place Saint-Job: Le Touring; re-check Thai Smile / Botanea / Miska / Cacao Tree; ~630 null UrbIS solids to rebuild.
- [ ] Owner image 68 (Waterloo by Optalweg): not located; ask for a hint.

**Defects found 2026-11-17**
- [ ] Wire clearance too low under Av. des Tilleuls / Hospices / Carsoel bridges.
- [ ] Vivier d'Oie station footbridges (UrbIS 751 / 752); Saint-Job deck sidewalks over the bank.
- [ ] Sharp leftovers: pedestrians / flags / grass motion vectors, window-mosaic repro, car streaking at 0.6 res.
- [ ] Cobble junction pads.

**Christmas (on 1 Dec - 6 Jan)**
- [x] Fir round 2 MERGED 2026-11-17 (needle cards, round bulbs; docs/CHRISTMAS.md "NEEDLE CARDS").
- [ ] Before 1 Dec: fir cards cost +0.26 ms at 8 m (budget 0.1; try the shadow from the middle level, fewer / smaller
  cards near the trunk); the middle level (45-150 m) still reads as flat tiers next to the needle crown (cards there
  too, or an impostor); re-measure the whole layer on GREEN (+0.33-0.59 ms on YELLOW vs +0.00 on GREEN before).
- [ ] Owner review of the market + garlands + fir in game (?xmas=1); more decorations if the owner asks.

**City content (open from the archive)**
- [ ] Trains: more bridges (Rue de Stalle, Kauwberg, Linkebeek, Engeland, Moensberg), roads over the line as real decks,
  station canopies / buildings (Calevoet, Stalle), M6/M7 double-decks + HLE18, ballast mosaic up close, SNCB GTFS licence
  (gtfs@sncb.be) before the public site ships the timetable.
- [ ] Landmarks polish: Stalle chapel (statue + slates: owner decisions; north-aisle blotches), Calevoet station details,
  Verrewinkel far LOD + street dip, Wolvendael pond water too dark; Nekkersgat mill needs owner photos.
- [ ] Traffic: trams don't stop for cars, no lane changes, no headlight beams, a few lanes hug kerbs.
- [ ] Pedestrians: feet slide on turns, nobody sits, no children / dogs, walk graph from data.
- [ ] Minimap: more names, neighbourhood names, route to a searched place, satellite toggle.
- [ ] Collisions + physics audit (drive, walk, third person; scripted route per tile).

**Ideas, later**
- [ ] Autumn leaves (8j). Character + car shapes round. Police car round 2 (branch claude/police-car: beam, siren WAVs).
- [ ] Street furniture kit (branch claude/furniture, held). Sound renders: owner to listen.
- [ ] fab.com assets to claim + licence question before the public site uses them.

## OWNER PLAYTEST 2026-11-16 (day, default viewer + both games) — TOP PRIORITY, in this order

**Night 2026-11-17 (owner away):** MERGED sharp (docs/UPSCALE.md), tour (docs/TOUR.md: 22-view city tour, baseline in
uccle-tour/.tour/foundation), holes (docs/HOLES.md: no hollow buildings; tour: 5 views fixed, 17 unchanged), heap +
heapfix (docs/HEAP.md: police heap 1.45 GB -> ~975 MB; no draw after dispose), orbitcam2 (game keys with no button, ?
card), trafpark (docs/TRAFPARK.md: 0 parked cars under traffic, tile borders too), vivier (docs/VIVIER.md: the bridge,
all 42 road-rail crossings resolved), skyctl (13 sky sliders, uniforms, ?skyctl=old), christmas (docs/CHRISTMAS.md:
firs Saint-Job + Saint-Pierre, chalet market, garlands; on 1 Dec - 6 Jan, ?xmas=1/0; +0.00 ms), twinlink
(docs/TWINLINK.md: tile-border car jumps 122-214 -> 0 per street, handover is an S lane change), police place fixed,
gate works in worktrees, agargaro evaluated (docs/AGARGARO.md: adopt none, 2 multiDraw jobs). Rules + gates:
**docs/QUALITY_RULES.md** (20 rules; read before every merge). Tour baseline = the twinlink run.
Running: xmasfir (fir needle sprays, Blender), mdraw (AGARGARO jobs 1-2: near-first chunk order ?mdsort=0, 80 m
chunks ?mdchunk=160). Queue: falcon stutter, loader stills, clean perf measure.
**LYCÉE / CORTENBOSCH (owner 2026-11-17 evening, from an agent's screen at the Lycée Français gate):**
(1) the gate fence on the LEFT of the Lycée gate JITTERS (flicker / shimmer, not visible in a still): check close up and
while moving (frame strips), find why (z-fight, thin bars under TAAU, LOD) + rule + gate check. (2) the Chemin du
Cortenbosch has a SECOND part we never built: the paved stretch that runs DOWN to the Geleytsbeek, parallel to the Avenue
du Lycée Français (one-way, probably why it was missed); find it on the map / Street View (look only), check our street
data for it, build it like the first part. The owner knows it well: ask for photos if Street View is thin. (3) same view:
the 3 flag poles on the right showed NO flags (quick mode not building them, or a real miss): check.
**FLAGS: WHERE ELSE (owner 2026-11-17, later):** flags fly today at the town hall (EU / Belgium / Uccle) and the Lycée
Français (Belgium / EU / France), via viewer/flagsCity.js flyFlags (any pole). Check with the owner where else real flags
are: the owner will name places; my suggestions: police station, Observatory, other public buildings (Belgian flags on
national days?). Look-check on Street View first.
Left: owner image 68 (Waterloo by Optalweg) not located; the two Vivier
d'Oie station footbridges (UrbIS 751 / 752); low wire clearance under Av. des Tilleuls / Hospices / Carsoel; Saint-Job
deck sidewalks over the bank; heap leftovers (GLB held by the loader, meshopt wasm, landmark geometry holds).

**SNOW2 (claude/snow2, 2026-11-17, docs/SNOW2.md):** snowfall's GPU cost over an overcast sky (GPU-bound A/B, 3.4 Mpx) +2.49 -> +1.57 ms (~1.0 -> ~0.6 ms at the window's size; ?snowfast=old): baked snow noise, cover only on up-facing faces, colour -> normal share, one filtered exposure fetch, near-only bump / groove, flakes collapsed / stepped on the drawn count. Looks: Sacré-Cœur 54 deg slate streaks instead of blocks (?snowsteep=old), library slate even (moss kept its sheen, ?slatemoss=old), Saint-Marc brick grey-mauve (?marcbrick=old), paved forecourts at Saint-Marc + Sacré-Cœur's east passage (grounds pavers, ?forecourts=old), hard grounds take the weather. Left: ~0.6 ms of the rest is SSR on the salted roads' wet film (content), the layer's own lit fragment (depth-first order tried: bare grey roofs, reverted), the < 0.6 ms target only at window size; GPU ms at window size needs ?quality=native + debug/snow2.js bound() (dynamic res + GPU clock otherwise hold ~11.5 ms).

**Status 2026-11-16 evening:** perfgame MERGED (hitches gone: police worst frame 350-950 -> 67-83 ms, falcon 300-967 -> 50-100 ms; play loader, no fill-in; steady CPU 11-13 ms unchanged -> follow-up job running: police car merge, patrol instancing, shadow casters, tile unload by distance, time-to-play 63-70 s -> < 35 s). citydefects: bridge deck, signals/poles (lights in lanes 122 -> 5, wrong heading 410 -> 0), parking by width (16,545 -> 12,084 cars, give-way on narrow streets), car slope fit, pier caps, done in code; browser check running. Night shop location unknown (not in OSM): ask the owner / Street View.

**Status update (later 2026-11-16):** citydefects rounds 2-3 MERGED (walls 1,796 -> 1 partial, deck look, flat-roof normals, sound off + mute button, per-building looks, police station = whole school complex + open north gate, Relais Saint-Job / Deneubourg / Press Shop (ex-Barat) / La Meute (ex-Bistroquet) curated, barrel piece). perfgame round 3 MERGED (sun shadow cache -2 ms, police drive CPU 9.5 ms, time to play ~50 s). Leftovers: police-game drive through both gates into the courtyard (collision check passed, not driven); Street View for Maison Dandoy, Proxy, White Night; curate Bois Savanes, Alain D., Lefevre; Relais corner house has 1 painted first-floor window (real: 2); image-59 banded roof spot not found; school blocks' look is an assumption (not visible from public Street View).

**Status (evening 2026-11-16):** MERGED: policefeel (car handling + chase camera + rear glass), falconfix (collisions, flight assist, eyrie start, church sill z-fight), perfgame rounds 4-7 (tile cache via Cache API, staged landmark compiles, lamp pool, far-LOD merges for bridges + landmarks, game preload; police ~48 s / falcon ~45 s to play, target 35 s), orbitcam (new inspection camera), farcity (far buildings with windows/roofs, night-matched). Running: cars2 (better car bodies + police estate). Left from farcity: far park ground darker than full (colour jump), no lamp pools in far tiles at night, far shader could skip the window grid when sub-pixel, far buildings ignore weather.

Owner (lives in Uccle): "most important thing is performance ... any technique: merging, sharing textures, anything".
1. **PERFORMANCE / GAME LAG**: the police game was "very laggy" with nothing else open. Profile the game path
   (police car + traffic + chase + HUD + route), CPU and GPU; merge geometry, share textures/atlases, fewer
   materials, fewer passes, cheaper shadows; budget table per feature. (agent perfgame)
2. **FULL LOADER BEFORE PLAY**: starting at the police station the scene was still filling in. A game start must
   wait (loader) until the tiles, kits and shaders around the spawn are ready. No pop-in in front of a player. (perfgame)
3. **Saint-Job station bridge (Montagne de Saint-Job over the railway)**: a railing + brick-pier fence blocks
   the road on the bridge, grass and tram rails run off it, and under the bridge is a mess (z-fighting, a platform
   block across the tracks, shelters in the wrong place). Rebuild from the real layout. (agent citydefects)
4. **Street furniture on the carriageway**: traffic lights in the road and wrongly rotated, tram/catenary poles
   in the road. Real ones stand on the kerb/footway, facing traffic. (citydefects)
5. **Road widths too narrow** vs reality (owner's eye); lane lines that don't follow the curve and run into a
   wall. (citydefects)
6. **Cars**: traffic driving through parked cars, cars sunk into the road, parked cars on streets where
   parking is not allowed / that become blocked. (citydefects)
7. **Defects**: z-fighting on some windows (door-surround / frame flicker), gate brick pier without cap
   (see-through top), bad shading on flat roofs (stripes/bands), odd buildings (hero buildings log "library has no
   X: temporary material" for zinc_roof / glass_window / ... at load: fix the slot mapping). (citydefects)
8. **Night shop on Place Saint-Job** missing (the white "night shop"). (citydefects)
8b. **Recognisable shops on Place Saint-Job (owner 2026-11-16)**: the shopfronts must be recognisable to a local.
   Start with **Le Relais Saint-Job** (famous restaurant, already in the city but generic), then every commerce on the
   Place and Chaussée de Saint-Job: real façade colour, awning, terrace, signage text/colour/font style, window layout,
   checked against recent photos / Street View (look only). White Night (Chée de Saint-Job 662) may have closed:
   owner is finding photos; keep or remove after that.
   **shops2 (2026-11-16, branch claude/shops2, not merged): docs/SHOPS2.md.** White Night is OPEN, in 662's low wing facing
   its lot (moved there); Place de Saint-Job 22 (Maison Dandoy) was a NULL UrbIS solid (631 city-wide!): rebuilt
   (tools/infill); Dandoy, Bois Savanes, Lefevre, Alain Dantine, Canon, Palais de la Truffe, Uccle Flore, P'tit Rêve,
   Proxy, Bioffice, the vet, Sushi Sama, Pasta Commedia, Le Passage curated; Le Relais' corner has its 2 windows +
   awnings; La Branche d'Olivier (8f e) done. Left: the other null solids, Le Touring, Thai Smile / Botanea / refuge /
   Miska / Cacao Tree re-check, a traffic crash on long teleports (SHOPS2.md).
8c. **Police car rear: bad lines while moving (owner 2026-11-16, default chase view)**: looks like aliasing / shimmer
   on the back of the car (TAAU + motion vectors on the player car? thin rear lights / plate edges? kit merge?). Check
   FIRST next session, with ?carmerge=old, ?instmotion=0, ?upscale=0 to isolate.
8d. **Chase camera too far (owner 2026-11-16)**: when driving, the car drifts far from the camera, almost to the screen
   centre: hard to drive, not like a real car game. Target: close chase (~5.5-6.5 m behind, ~1.8-2.2 m up), car in the
   lower third, stiff follow with little lag, speed pull-back max ~+0.8 m and FOV +5-8 deg (not more), look-ahead
   into turns, no clipping into walls; camera views on a key (chase near / chase far / bonnet / bumper). Tune the
   new carFeel camera (claude/policefeel) with the owner.
8e. **Police car model looks crude from behind** (coordinator 2026-11-16, chase view now frames it large): blocky tail
   lights, flat cream band, low-poly body. Premium Blender police estate (Belgian federal/local police livery: white +
   blue/yellow Battenburg, real proportions, bevels, tail-light clusters, plate recess), LODs, same kit slots.
   -> claude/cars2 (2026-11-16): the cars2 police estate (`?policecar=marked`; the game's unmarked estate is on the new
   body by default), docs/CARS2.md. Browser check pending.
8f. **Owner wishes 2026-11-16 (after the current jobs)**: (a) CHARACTER: Quaternius UAL1+UAL2 rig + the robot's
   locomotion code from claude/character2 as default (?char=hoodie old). (b) CAR SHAPES: traffic/parked car bodies,
   the FRONT looks weird; compare with Mr.doob slop-newyork cars, propose better cars (Blender, premium, LODs,
   instanced, shared atlas) at the same or lower cost. -> claude/cars2: DONE offline (docs/CARS2.md: diagnosis, slop comparison, 9 lofted
   cars with authored LODs, same draws, -70 % tris at 22-55 m, ?cars=old); browser comparison pending. (c) LYCEE FRANCAIS / CHEMIN DE CORTENBOSCH area (owner lives
   there): detail pass with references (school, the chemin's cobbles/hedges/walls, local details). (d) GELEYTSBEEK
   CASTLE (Kasteel / Chateau de Geleytsbeek): hero model if not done (references online, look only). (e) LA BRANCHE
   D'OLIVIER restaurant (in streetlife E7): make it recognisable like Le Relais.
8g. **Car glass dither on parked/traffic cars** (coordinator 2026-11-16): under TAAU the see-through glass of
   parked and traffic cars shows a fine dot/hatch pattern up close (same cause as the player car's rear window, fixed
   only for the player car with ?carglass=old). Fix for all cars without losing see-through interiors: stable
   (non-jittered) dither per instance + resolve weighting, or opaque tinted glass beyond ~8 m with a fake interior,
   or sorted blended glass for the nearest N cars.
   **carglass2 (2026-11-16, branch claude/carglass, not merged):** near-LOD (0-60 m) parked + traffic glass is real
   alpha-blended glass (glass-only geometry on the batches' instance buffers, +1-2 parked / +1 per traffic near batch
   render objects, ~+0.1 ms GPU at a 2.5 m close-up); police props / yard solid tinted; ?carglass2=old; docs/CARGLASS.md.
8h. **Cars2 leftovers**: watch the 30 m LOD fade in motion; compress cars2.glb (4.5 MB); more varied hatch fronts;
   shops2 leftovers (White Night lot asphalt, ivy over Uccle Flore window, Pasta Commedia coral render, 630 UrbIS
   buildings without geometry: infill tool tools/infill/infill_buildings.py, Place Saint-Job 38 next).
8i. **Street-surface name vote bug (cortenbosch agent 2026-11-16)**: DONE on claude/surfvote (docs/SURFVOTE.md,
   ?surfvote=old): names repaired + normalised, either side of OSM's bilingual name, roads inside each surface vote by
   length; 58 -> 3,341 matches, 72 streets / 120,573 m2 change (setts / pavers / gravel), 15 of 16 checked on Street
   View agree, Avenue Legrand overridden to asphalt. Left: junction pads tie -> asphalt, `surveyed` name test in
   surfaces.js, rebuild surfaces.json with the pipeline fix_text (together, own switch).
   Cortenbosch leftovers (round 2 on claude/cortenbosch2, docs/CORTENBOSCH2.md, ?cortenbosch2=old: type 6 1990s house,
   type 7 curtain wall, herringbone layer 4, painted words, railing / gate colliders; browser checks pending): Cortenbosch leftovers: 1990s house type for the facade system, glass curtain-wall style (553227), herringbone
   pavers, "Private Weg / Cortenbosch" paint, railing/gate colliders, other school blocks' looks.
8j. **AUTUMN LEAVES (owner idea 2026-11-17, later)**: falling leaves from the real tree species (colour by species +
   date), leaves lying on the ground (more in gutters, kerbs, against walls, under trees; swept off busy roads) and
   leaf PILES that react to the character, cars and the falcon. Plan: GPU compute particles (one buffer, one
   instanced draw, fixed budget ~20-50k near the camera, recycled), wind from wind.js; ground layer = a cheap
   decal/splat in the ground shader far + instanced leaf cards near; interaction via a small GPU "disturbance" field
   (movers write position+velocity: player car, traffic near the camera, character feet, falcon wingbeats/stoop),
   leaves get kicked up, spin, settle; piles = instanced cards with a height field that dents and scatters.
   References: Ghost of Tsushima leaves/grass talks, RDR2 ground debris, Horizon wind, three.js GPGPU examples.
   Budget < 0.5 ms GPU, no CPU per leaf, no extra lights; seasonal switch (Oct-Dec default, ?leaves=0/1).
8k. **Evaluate agargaro's libraries (owner 2026-11-17)**: github.com/agargaro: instanced-mesh (InstancedMesh2: per-
   instance frustum culling, BVH raycasting, sorting, LOD, shadow LOD, skinning; check WebGPU / r187 support),
   batched-mesh-extensions (WebGPU: BatchedMesh culling, per-instance uniforms, LOD), BVH.js (dynamic BVH),
   octahedral-impostor (vs our impostorKit), simplify-geometry. Measure against our own instancing (instanceStream,
   cellCull, multiDraw, lamp pool, far-LOD merge, heroBVH): adopt only where it beats them on CPU/GPU in the city.
9. **Orbit/inspection camera**: the default orbit is bad for a city. Study Godot / Unity / Unreal editor cameras,
   three.js CameraControls (yomotsu), Cesium/Google Earth: pivot on the clicked point, zoom to cursor, no clipping
   into buildings, smooth damping, terrain follow. (later agent)
   **orbitcam (2026-11-16, branch claude/orbitcam, not merged):** the default orbit is now an inspection camera
   (`viewer/orbitCam.js`, docs/ORBITCAM.md): orbit round the point under the cursor, ground pan, zoom to the cursor,
   F / double-click frames, RMB + WASD/QE flies, terrain / roof / landmark collision, touch, smooth fly-to for views and
   loaded-tile teleports. `?orbitcam=old`, `?orbitheroes=0`. Offline checks `node tools/orbitCamTest.mjs` pass; browser check done (docs/orbitcam/README.md); hand tuning of speeds by the owner left.
10. **Falcon game**: collision bugs (falls, then shoots back up), controls hard. Simpler and friendlier
   (assisted flight, auto level, clear feedback), not more complex. (later agent)
   **falconfix (2026-11-16, branch claude/falconfix, not merged):** collisions round 3 (no launch upward, no pops, a
   tumble without pull-up, out of solids / pins), the flight assist (mouse aim or A / D turns, wings level and altitude
   hold hands off, auto-flapping, Shift stoop with a pull-out, ground / obstacle avoid), steady camera, HUD climb rate +
   assist state, free flight starts on the eyrie. docs/falconfix/README.md; `?falconctl=old`, `?falconcol=old`,
   `?falconavoid=0`, `?falconstart=old`. Offline checks pass (tools/falconAssistTest.mjs); browser check done (tuned: hold follows rising ground, avoid under crowns + opens the wings, pursuit speed, E lands on roof / ground ahead); the eyrie sill z-fight fixed in stjob.py. Hand tuning by the owner left.
11. **Police game**: car physics not fun; it must climb slopes, kerbs and go "many places" without feeling
   blocked; poles in the road and narrow roads block it (3-5). Police station wrong: real gate open, building
   too small vs reality. (later agent)
   **policefeel (2026-11-16, branch claude/policefeel, not merged):** new handling in code (`viewer/drive/carFeel.js`,
   docs/POLICE_FEEL.md, `?carfeel=old` / `?hedgecol=old`): suspension, tyres, counter-steer, handbrake, camera; kerbs on
   steep streets / lawn banks / kerb islands ridden (the old 0.5 m-over-centre ledge rule blocked a 15 cm kerb on a 15 %
   street), hedges soft, posts deflect, parked cars shoved. Offline checks done; browser route 

