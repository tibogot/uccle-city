# Tram v2: research, method, results (branch `claude/tram2`, 2026-11-06)

The owner: the T3000 "still looks somehow low". It did: v1 was built 3.30 m tall; the photos say ~3.6 m. This pass
re-measures the tram on photos, rebuilds it in `tools/blender/tram2.py` (all scripted, Blender 5.0 headless,
`--factory-startup`), draws it with `viewer/tram2Model.js`, and makes it the city's default (`?tram=v1` = the old
model for A/B, `?tram=box` = the boxes).

## Which trams run on 92 and 97 now

| line | stock | evidence |
|---|---|---|
| 92 (Schaerbeek Gare - Fort-Jaco, through Saint-Job) | **T3000** (Bombardier Flexity Outlook "Cityrunner", 5 sections) | Commons: car 3131 at Place Saint-Job 2024-11-04 (Stratoswift), 3007 at Gare de Saint-Job 2024-07-14, 3097 / 3029 / 3135 on 92 2015-2019. During the Carsoel bridge works (Nov 2024 - Jan 2025) old PCC 7700s ran a 92 shuttle to Lancaster (Commons, 2025-01-06): temporary. |
| 97 (Louise - Dieweg, through Uccle) | **PCC 7900** (BN, high floor, 2 articulations) | Commons "STIB 7904", 2025-02-25, line 97 at Wiels (CC0); every 97 photo 2016-2025 is a PCC 7700 / 7900. |
| T4000 (43.2 m, 7 sections) | not on 92 or 97 | Railway Gazette / Railjournal give 43.22 m; photos show it on lines 3 / 4 / 7 (line 3 merged into 10 in 2024). |

So the model stays the T3000. The PCC 7900 of line 97 is a different vehicle (high floor, steps, other body) and line
97 is not in the city's transit data yet (`data/transit/` has only stib-92): left for later (TODO). A T4000 would be
cheap with our pieces only if its module lengths were known (7 sections: cab / susp / centre / susp / centre / susp /
cab does not sum to 43.22 m with the T3000 lengths): not done.

## Dimensions

Published (STIB via techno-science.net, Railjournal, EMTA): **length 31.85 m, width 2.30 m, floor 0.35 m,
5 sections, 3 bogies, 54 seats / 184 places, 70 km/h**. No published height or drawing found.

### Heights (new)

Measured on the photos, three independent scales:

1. **Front width 2.30 m** on the near-frontal telephoto of 3041 (Commons, public domain) and the frontal 3001 (2005):
   bumper bottom to hood top = 1.57 x the front width -> ~3.6 m with the bumper 0.22 m above the rail.
2. **People** standing beside 3001 at the depot (2005): ~3.5 m for a 1.75 m person.
3. **Floor 0.35 m** at the door sill on 3097: the gold cantrail band at 2.8-3.05 m, the side top at ~3.5 m.

Taken: hood **3.58 m**, side fairings **3.50 m**, gold band **2.74-3.00 m**, window band **1.14-2.74 m** (glass
1.20-2.68), doors 0.36-2.74 m. Nose (3041 / 3001 ratios): bumper 0.22-0.76 m with its dark band 0.44-0.58, gold
panel 0.79-1.38, windscreen 1.42-2.96, display band 3.00-3.47 under the same glass, hood above. v1 had the roof at
3.30 m and a 0.55 m gold panel low on the nose: the squat look.

A camera was fitted to three photos by point correspondences (`data/raw/tram2tools/camfit.js`, coordinate descent
over position / yaw / pitch / fov; rms 4.6 px per 1000 on 3041, 12.6 on 3097, 18.4 on 3017): the fitted views are
the lab's photo viewpoints and the comparison images. The module lengths (cab 8.825 / suspended 5.6 / centre 3.0 m,
from v1) could not be confirmed better than ~0.5 m from the oblique photos.

### Counts (from the photos)

- 5 modules: cab (bogie) - suspended - centre (bogie) - suspended - cab (bogie); 4 bellows.
- Doors per side: **6** = cab single + 2 double on each suspended module + the other cab's. The cab is **not
  mirror-symmetric**: a single leaf on its left (3097, 3095, 3028), a double door on its right (3017, 3029). The tram
  is symmetric by rotation (cab 5 = cab 1 turned round), so each side has one single and one double cab door.
- Windows: cab 2 large (+ the narrow black driver's window panel behind the gold sweep), suspended 1 between its doors
  (with the side LED display at its top), centre 1. Transom (hopper) bar near the top of the large windows.
- Front: windscreen and display band behind one black glass field framed by the silver hood; gold panel with a lamp
  pod in each corner (2 red tail lamps on top, 2 white head lamps below), two-tier grey bumper with a dark band, red
  reflectors low; black mirrors on arms from the hood corners with a small kerb mirror under each; one wiper.
- Roof: equipment boxes in a well between silver side fairings (aerial photo of the Esplanade terminus); the
  pantograph on the 2nd module.
- Interior (2010 / 2022 photos): brown leather seats on grey plinths, grey floor, light grey lining, wooden ceiling
  side panels, light strips in the coves, grey poles and rails.

## What the model has now

`tools/blender/tram2.py` -> `models/tram2/t3000.glb` (+ `t3000.json`, `t3000_ao.png`):

- **Named material slots** (22: Silver, Gold, Black, Bumper, BumperDark, Glass, GlassCab, GlassFar, Rubber, Metal,
  Bellows, LampHead, LampTail, LampMarker, Display, Seat, Lining, Floor, CeilingLight, Pole, Wood, Console); no colour
  in the file: `viewer/tram2Model.js SLOT_LOOK` holds colour / roughness / metal / AO strength / emission per slot
  (uniform arrays, live). UV0 in metres (planar per face; the LED displays 0..1), UV1 = lightmap, **AO baked** with
  Cycles (384 samples, 1.2 m reach) on the whole assembled tram over a ground plane into one 2048 px greyscale atlas.
- Real nose (rake 0.36 m at the windscreen top, 0.72 m at the crown, tapered 6 cm a side toward the tip, rounded
  corners, the silver hood framing the glass), the gold sweep, lamp pods, two-tier bumper, mirrors with kerb mirrors,
  wiper, antenna, marker lamps.
- Windows with depth: black seal, glass 3 cm in, an 8 cm wall reveal to the lining, transom bars, a glass face looking
  in; see-through glass (alpha to coverage in the same opaque draw, as the faceted cars) onto the **interior**: lining,
  floor, coves with light strips and wood, ceiling, grab rails, poles, 60+ seats, the driver's cab with console,
  seat, display housing. Lit at night (ceiling strips, interior glow).
- **Plug doors that open**: leaf code in COLOR_0, opened in the vertex stage (out 5.5 cm, then slide a leaf width).
- Bogie skirts (pillow shape), bevelled module ends, groove under the window band, roof fairings + equipment well with
  HVAC / converter / resistor boxes with grilles, ribbed bellows, a new pantograph (insulators, frame, lower / upper
  arm, push rod, head with carbon strips and horns) whose strip top is the wire's underside.
- LODs (meshoptimizer in JS, never Blender decimate): LOD0 = Blender full, **30.5k triangles / tram** (v1: 15.9k), to
  90 m; LOD1 = the script's mid variant (no interior, opaque glass that fakes the interior's light), trimmed, **12k**,
  to 240 m; LOD2 = the coarse variant, **2k**, to 1800 m with the far fade. The simplifier welds by position, door
  code AND lightmap UV, so AO seams stay locked (the first LOD1 had dark streaks). Dithered cross-fades (lodFade).
- Instanced: one draw per piece type and LOD (as v1), 8 vertex buffers (the WebGPU limit: the slot rides in aData.w).

## Motion

- Modules on their own track positions (tramPose, unchanged); the **bellows bend** in the vertex stage between the
  two module headings (a vertex at local x turns by angle * x / 0.72), checked on the 18 m curve outside and inside.
- **Pitch on slopes**: each module / bogie follows the ground at both of its ends; the pantograph stays vertical
  at its own ground height, so its head meets the wire (5.8 m above the road, viewer/tram.js).
- **Stops**: GTFS gives arrival = departure, so each hop starts with a dwell taken from its own time (a quarter of it,
  6-18 s, never squeezing the run below 2 sqrt(D / ACC)); doors open 1-3.5 s in, close 0.5 s before leaving, on the
  platform side (nearest OSM platform of a loaded tile; right when none); tail lights brighter while braking.
- Checked: the motion function evaluated every 0.05 s over 20 min of timetable: max acceleration **1.00 m/s^2**
  (ACC), speed continuous. Frame-to-frame jitter in the per-frame sampling was measurement noise (frame timing).

## Performance (the owner's machine, WebGPU in Chrome, 1700x800 viewport; the trains agent shared the GPU, see notes)

City, `?tile=I6&clock=14:02`, clock frozen, a tram standing at stop 5031F, median GPU ms over 6 s (round 1, the only
round without the other agent's city tab drawing at the same time):

| view | no trams | v1 | v2 | draws off / v1 / v2 | tram CPU per frame (v1 / v2) |
|---|---|---|---|---|---|
| at the stop, 13 m | 5.37 | 5.37 | 5.44 | 424 / 436 / 436 | 0.015 / 0.016 ms |
| street, 40 m | 4.39 | 4.26 | 4.39 | 427 / 447 / 447 | 0.014 / 0.018 ms |
| high, 120 m | 5.31 | 5.83 | 5.24 | 420 / 426 / 427 | 0.017 / 0.014 ms |

Within noise (+-0.1-0.5 ms between runs); same draw calls as v1. Later rounds were taken while the trains agent ran
its own city tab (GPU 10-12 ms for everything): not comparable, not used.

Lab worst case, 20 trams all in view, GPU ms over "no trams" (2 runs each, same session per model):

| | LOD0 x20 | LOD1 x20 | LOD2 x20 |
|---|---|---|---|
| v1 | +0.20 / +0.26 | +0.13 / +0.20 | 0.00 / +0.13 |
| v2 | +0.59 / +0.66 | +0.00 / +0.13 | -0.07 / -0.07 |

v2's LOD0 costs ~2.5x v1's per tram (~0.03 ms vs 0.012 per tram at LOD0): fine in the city, where at most one or two
trams are within 90 m.

## Smoothness checks (frame sequences, `docs/tram2/frames/`)

- `curve_passing.jpg`: four positions through the 18 m curve, modules articulating, bellows bending.
- `lod0_vs_lod1_68m.jpg`: the first LOD1 (black opaque windows) next to LOD0: an obvious switch. Fixed: LOD0 to 90 m
  and a far-glass shading that fakes what the see-through glass shows -> `lod0_vs_lod1_98m.jpg`,
  `lod_switch_75_to_105m.jpg` (camera receding across the 79-101 m dithered band): the windows darken slightly over
  the band, no pop.
- City, frozen at the stop: doors open toward the platform, pantograph on the wire.

## Before / after (`docs/tram2/compare/`)

`3097_front34_left.jpg`, `3041_front.jpg`, `3017_front34_right.jpg` (reference photo | v1 | v2, fitted cameras),
`rear34.jpg`, `side.jpg` (v1 | v2). The composites contain CC BY-SA photos (credited in the image): they are
documentation, share-alike, not shipped (docs/ is in .vercelignore).

## Weak points (honest)

- (Round 3, 2026-11-07: the nose re-shaped, see below.) Still: the visor is a smooth cap (the real one has a seam
  line and a slight overhang lip shadow); the glass field shows the cab partition as a faint light line at the
  windscreen top; the bumper's two tiers are still a little too white and even vs the photos' grey.
- The gold panel shows brownish blotches in strong light (environment reflection of a metallic-ish gold; metalness
  now 0.15). Grime is a height ramp only (no streaks under the windows, no roof dirt).
- Heights rest on photo ratios (no drawing); module lengths are v1's estimates.
- AO atlas 2048 px for every piece and variant: ~1 cm texels on LOD0; the interior gets a share it barely needs.
- Interior is generic (2+1 seats in every bay); no people; the driver's cab is a few boxes.
- No fleet number, no "www.stib.be", no STIB logo (text / decals not done).
- Door side: nearest OSM platform; stops without a mapped platform open on the right.
- Pantograph is rigid (fixed at the nominal wire height); fine as the wire is at a constant 5.8 m.
- 20-tram LOD0 cost 2.5x v1 (see above). LOD1 12k triangles (v1 5.7k).
- Line 97 (PCC 7900) and the T4000 not modelled.

## Round 3: the nose (2026-11-07)

Against 3097 / 3041 / 3017 (same fitted cameras, `docs/tram2/compare/*`: photo | before (round 2) | after):

- **Windscreen taller**: gold panel top 1.38 -> 1.32, glass 1.36-3.00 (was 1.42-2.96); the display (3.07-3.34) sits in
  the SAME glass right above it behind a 2 cm frame bar; its housing behind is full cab width and reaches into the visor,
  and the LED field's background emission dropped (0.012 -> 0.002): the band no longer reads as a separate brown box.
- **Plan corners rounder**: corner radius 0.40 -> 0.47-0.60 over the glass, and the glass now wraps round the corners
  (the silver side columns are gone) back to the gold sweep, up to the visor, as on 3097.
- **Visor**: a thicker, rounder silver cap 3.38-3.60 m: front lip 3 cm proud of the glass, then a quarter-ellipse
  (7 rows) rounding 0.40 m back; in elevation it keeps nearly the full width with 0.36 m corners (the nose's front
  part flares out from the roof-shoulder profile, `nose_front_w`), the glass field's top corners round into it.
- Cost unchanged: 30.7k triangles per tram at LOD0 (was 30.5k); LODs re-derived by meshoptimizer at load.
- Motion: `frames/lod_switch_74_to_106m_round3.jpg`, the camera backing off 74 -> 106 m with the zoom holding the size;
  mean frame-to-frame difference 2.3 / 2.2 / 2.2 across the 90 m hand-over (no spike: no jump), LOD0 -> LOD1 at 90 m.
- GPU, city `?tile=I6&clock=14:02`, frozen, two trams at ~12 m (stop view), tram meshes on / off, 8 alternating
  rounds (debug/gpuAB.js): medians 12.75 / 12.75 ms (+0.00), mean of the round differences +0.57 with a spread of
  -1.6 .. +3.1 ms: the GPU was shared with another session's browser (frame time 11-14 ms instead of ~5): noise, not
  a regression (same triangle count as round 2).

## Re-run

```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/blender/tram2.py -- models/tram2 [--no-bake] [--preview <abs dir>]
python tools/serve_nocache.py 8791     # then http://127.0.0.1:8791/labs/tram-lab.html  (?tram=v1 for the old model)
```

## Reference photos (data/raw/refs/tram/, git-ignored; SOURCES.json beside them)

| file | date | author | licence | page |
|---|---|---|---|---|
| Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_01.jpg | 2024-11-04 | Stratoswift | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_01.jpg |
| Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_02.jpg | 2024-11-04 | Stratoswift | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_02.jpg |
| Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_03.jpg | 2024-11-04 | Stratoswift | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_03.jpg |
| Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_04.jpg | 2024-11-04 | Stratoswift | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dernier_tram_92_place_Saint-Job_avant_les_travaux_-_04.jpg |
| Tram_92_gare_de_Saint-Job_14_juillet_2024.jpg | 2024-07-14 | Stratoswift | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Tram_92_gare_de_Saint-Job,_14_juillet_2024.jpg |
| Tram92_Brussels_Louise_1.jpg | 2019-08-21 | Eole99 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Tram92_Brussels_Louise_1.jpg |
| Tram92_Brussels_Louise_2.jpg | 2019-08-21 | Eole99 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Tram92_Brussels_Louise_2.jpg |
| Brussels_tram_T3000_3097.jpg | 2015-03-07 | Jacek Rużyczka | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Brussels_tram_T3000_3097.JPG |
| Brussels_tram_T3000_3067_at_night.jpg | 2015-03-06 | Jacek Rużyczka | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Brussels_tram_T3000_3067_at_night.JPG |
| 3025_STIB_-_Flickr_-_antoniovera1.jpg | 2015-07-19 | Antonio Vera | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:3025_STIB_-_Flickr_-_antoniovera1.jpg |
| 3003_stib_-_Flickr_-_antoniovera1.jpg | 2015-07-18 | Antonio Vera | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:3003_stib_-_Flickr_-_antoniovera1.jpg |
| 3017_stib_-_Flickr_-_antoniovera1.jpg | 2015-07-18 | Antonio Vera | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:3017_stib_-_Flickr_-_antoniovera1.jpg |
| Cityrunner_3005_Brussel.jpg | 2010-01-26 | Mauritsvink | Public domain | https://commons.wikimedia.org/wiki/File:Cityrunner_3005_Brussel.jpg |
| T3000_edited.jpg | 2010-01-26 | Maurits90 | Public domain | https://commons.wikimedia.org/wiki/File:T3000_edited.jpg |
| MIVB_3041.jpg | 2010-01-26 | User:Willem_90 | Public domain | https://commons.wikimedia.org/wiki/File:MIVB_3041.jpg |
| Brussel_tram_3037.jpg | 2008-03-15 | Vitaly Volkov, Волков Виталий Сергеевич  | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Brussel_tram_3037.jpg |
| Tram_de_la_STIB_le_21_juillet_2016.jpg | 2016-07-21 | Domaine public | CC0 | https://commons.wikimedia.org/wiki/File:Tram_de_la_STIB_le_21_juillet_2016.jpg |
| Tram_de_la_STIB_le_21_juillet_2016_2.jpg | 2016-07-21 | Domaine public | CC0 | https://commons.wikimedia.org/wiki/File:Tram_de_la_STIB_le_21_juillet_2016_2.jpg |
| TramBrussels_ligne4_Esplanade3.jpg | 2008-07-25 | Eole99 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:TramBrussels_ligne4_Esplanade3.JPG |
| TramBrussels_ligne4_Esplanade.jpg | 2008-07-25 | Eole99 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:TramBrussels_ligne4_Esplanade.JPG |
| TramBrussels_ligne4_2DeWand.jpg | 2008-07-25 | Eole99 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:TramBrussels_ligne4_2DeWand.JPG |
| Brussels_tram_57263089_.jpg | 2005-10-29 | LHOON from Mechelen, Belgium | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Brussels_tram_(57263089).jpg |
| Brussels_tram_57263196_.jpg | 2005-10-29 | LHOON from Mechelen, Belgium | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Brussels_tram_(57263196).jpg |
| Brussels_tram_57262984_.jpg | 2005-10-29 | LHOON from Mechelen, Belgium | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Brussels_tram_(57262984).jpg |
| STIB_travaux_pont_Carsoel_4_novembre_2024_08_.jpg | 2024-11-04 | Stratoswift | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:STIB_travaux_pont_Carsoel_4_novembre_2024_(08).jpg |
| A_low_floor_tram_28110573134_.jpg | 2016-07-31 | Franklin Heijnen | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:A_low_floor_tram_(28110573134).jpg |
| Tram81stib-meir.jpg | 2017-12-09 | Kalen201524 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Tram81stib-meir.jpg |
| STIB_7904.jpg | 2025-02-25 | Léonard Patakreppe | CC0 | https://commons.wikimedia.org/wiki/File:STIB_7904.jpg |
| Interieur_T3000_Brussel.jpg | 2010-01-26 | Mauritsvink | Public domain | https://commons.wikimedia.org/wiki/File:Interieur_T3000_Brussel.JPG |
| Vue_int_rieur_d_une_rame_T3000-T4000.jpg | 2022-03-15 | Beaufix | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Vue_int%C3%A9rieur_d%27une_rame_T3000-T4000.jpg |
| TramBrussels_T3000_Int_rieur.jpg | 2008-07-25 | Eole99 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:TramBrussels_T3000_Int%C3%A9rieur.JPG |
| Cabine_T3000-T4000_Bruxelles_2022_-_STIB.jpg | 2022-03-15 | Beaufix | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Cabine_T3000-T4000_Bruxelles_2022_-_STIB.jpg |
