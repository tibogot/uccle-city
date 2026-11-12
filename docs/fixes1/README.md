# fixes1: the owner's visual defects (branch claude/fixes1)

Two jobs: the tram on ramps (job 1) and the clean-buildings pass (job 2). Resume notes: `docs/fixes1/RESUME.md`.
GPU numbers in this file were taken with 2-3 other agents rendering on the same GPU (the city showed 10 fps / 78 ms
GPU frames at times): they are noise-limited and said so where given.

## Job 1: the tram on ramps (owner: "the tram wagon is doing a weird thing on ramps")

### Cause

Measured along line 92 (all 14 tiles it crosses, the rail-top height the tram stood on every metre, `debug/tramStrip.js`):

1. **The tram bridge over the L26 cutting next to Saint-Job station** (OSM w1411905486 / w1411905488, `bridge=yes`,
   `layer=1`, H6 x 872-932): the trams and rails stood on the carved terrain (`hm.surface + CARVE`), and the DTM is bare
   earth: the deck is not in it. The tram DIVED 8 m into the railway cutting and crossed the SNCB tracks at rail level:
   grade breaks of up to 63 % per metre, a vertical radius of ~9 m, sections kinked against each other
   (`img/tram_bridge_cutting_before.jpg`, frame 8). This is the "weird thing on ramps".
2. **Every section pitched on its own**: `tram2Model.js` gave each piece (cab, suspended section, centre, bellows,
   bogie) its own height and pitch from the ground under its own two ends (`HALF`), so neighbouring sections did not
   share their articulation point in 3D (up to 16 cm vertical mismatch at a joint on the ramp) and the bogies followed
   every 1 m bump of the road (grade breaks of 2-6 % per metre at kerb edges of the measured surfaces, rms 2nd
   difference 0.65 cm/m2 along the line).

### Fix

- **One smooth vertical profile for every tram track** (`tools/build_tram_profile.mjs` ->
  `data/transit/tram_profile.json`, 244 KB, 119 strands, 36 km): the OSM tram ways of all tiles, chained into strands
  across tile seams, sampled every metre on the DTM; bridge spans (+ 4 m abutment pad) interpolated between their ends; a
  3 m Gaussian against DTM noise; then VERTICAL CURVES by projection on the whole network: the 2nd derivative clamped to
  the real tram limits (crest radius >= 500 m, sag >= 300 m), through the 207 switches too (a branch's end is tied to the
  point it leaves, the straight-on triplets through the junction constrained). Deviation from the DTM p50 2 mm, p99 2 cm;
  clamped at 8 cm where the limits cannot be met (only the steep A5/B5 depot fan: 335 points).
- `viewer/trackProfile.js`: lookup (nearest centreline, Catmull-Rom through the 4 m samples: continuous grade) and
  `railTop` = profile + the road's own lift over the DTM (the road surfaces sit 0-10 cm above it: crown, tiers; median
  3.4 cm on line 92), that lift averaged along the track over +-8 m and cached per sample once every tap's tile is loaded.
- Rails (`main.js featureObjects`): drawn at `max(road, railTop)`; the contact wire (`tram.js`) hangs over the profile;
  no poles on the bridge deck.
- **The bridge deck** (`tram.js buildDecks`): a closed concrete slab per track (top, soffit, sides, end caps, 0.95 m
  deep), reaching the midline to the other track, solid parapets (1.05 m) on the free sides, flat normals, uv in metres.
- **The vehicle hinged like the real one** (`tramModel.js tramPose(..., yAt)`, used by `tram2Model.js` and v1): each
  bogie stands on the rails (height and grade under it); each section with a bogie (cabs, centre) lies along the grade
  at its bogie; each suspended section hangs between its neighbours' articulation points; bellows on the hinge (mean
  pitch); pantograph on its section's roof, vertical. The tram samples the rail top along its shape averaged over +-3 m
  (`tramline.js yAlong`: < 5 mm on the profile, softens the 321 m where line 92 leaves the OSM tracks at the commune's
  north edge). `?trackprofile=0` = the old behaviour (no deck) for A/B.
- SNCB trains: checked, no change needed: their tracks are already smoothed in the pipeline (30 m robust smoothing;
  minimum vertical radius 330 m on a 10 m chord) and every car stands on its two bogies (`trainModel.js trainPose`).

### Numbers (`debug/tramStrip.js jointCheck`: a tram posed every 0.5 m, old way vs new way, same page)

| stretch | joint mismatch max (old -> new) | bogie off the drawn rail p99 (old -> new) | worst pitch change per 0.5 m (old -> new) |
|---|---|---|---|
| H6 bridge approach + bridge (s 11180-11360) | 16.4 cm -> 0 | 22 cm (43 max) -> 1.8 cm | 9.07 deg -> 0.15 deg |
| H5/G5 streets (s 10300-11150) | 0.1 cm -> 0.1 cm | 0.7 cm -> 2.2 cm | 0.27 deg -> 0.07 deg |
| H6 east (s 11360-12000) | 0.1 cm -> 0 | 0.6 cm -> 1.6 cm | 0.08 deg -> 0.03 deg |
| G1 (trip ...887, s 4500-4900) | 0 -> 0 | 1.6 cm -> 5.2 cm | 0.57 deg -> 0.38 deg |
| G1/F1 (s 7400-8300, incl. the 321 m without OSM tracks) | 0.1 cm -> 0 | 1.6 cm -> 5.6 cm | 0.80 deg -> 0.64 deg |

(the old "bogie off rail" is against the old rails, which followed every bump: 0 by construction; the new rails are
drawn at max(road, railTop), so where the road has a hump the rails follow it and the tram glides over it: up to 5-7 cm
in G1/F1 at raised plateaus. The proper fix is the road laid on the track profile: roads2's domain, the profile API is
there for it.) CPU: `tramLine.update` 0.06-0.1 ms for 19 running trams.

### Images (before = `?trackprofile=0` or the code before this branch)

- `img/tram_bridge_cutting_before.jpg` / `img/tram_bridge_cutting_after.jpg`: from the railway cutting, the tram crossing
  (before: down in the cutting at rail level; after: on the deck over it)
- `img/tram_bridge_chase_after.jpg`: chase camera up the ramp onto the bridge (smooth, no dive)
- `img/tram_g1_side_before.jpg` / `_after.jpg`, `img/tram_g1_chase_before.jpg` / `_after.jpg`: G1 (x 4, z -1918), the
  sharpest sag on 3 m in the streets (R 53 m): no visible change at this scale, the numbers above are the proof.

### Left

- Road humps (raised junction plateaus) under the rails: the rails follow the road, the tram does not (<= 7 cm, behind
  the bogie skirts); fix in the road build (roads2) by laying the carriageway on `trackProfile` near the tracks.
- 321 m of line 92 along the commune's north edge (G1/F1, z -2000..-1704) has no OSM track in our data (outside the
  study polygon): no rails drawn there, the tram follows the smoothed road.
- The deck is generic concrete (no Blender hero); the terrain under its two ends was not re-shaped (the DTM abutments).

## Job 2: the clean-buildings pass

All in the tile worker's façade generator (`viewer/facadeGeom.js`, bundle rebuilt) unless said otherwise. The proof
tool is new: `node tools/mesh_audit/cityBuildings.mjs <tiles> [--group ...] [--json f --items N --debug]` runs the
worker's own `analyseBuildings` on the committed tile data in Node and audits the meshes drawn together
(walls+roofs, details+walls, details+roofs), hiding the Saint-Job solid as the city does (`--all` keeps it).

### (a) + (b) the BLUE line along the wall tops and the BLACK line under it

Reproduced on Rue du Ham (I6, x 1208 z 634) close up: it is not a crack. Every roof eave got a hanging zinc GUTTER
(a 13 cm box 26 cm out, colour 0.30 grey) over a dark EAVES BOARD (roof colour x 0.8), also over the street cornices
and the façade kit's cornice. The gutter's top and front catch the sky (a pale-blue line from any distance), the board
under it reads black (`img/buildings_eaves_gutters_before_top_after_bottom.jpg`). A Brussels terrace has its gutter
inside the cornice. Fix: where the wall top carries a cornice, no eaves board and no hanging gutter
(`emitStrips`: 1,508 strips left out on I6); elsewhere (rear fronts, villas, gables) they stay, the gutter in weathered
zinc (0.20). Also found on the way: the roof rakes show a dotted bright line at gable tops where wall and roof
triangles meet in T-junctions (88 `tjunction` on I6 walls+roofs): NOT fixed (UrbIS topology; a verge strip along the
rakes would cover it, see Left).

### (d) the façade flicker (docs/CITY_MESH_AUDIT.md triage), fixed at the source

- **Strip details** (cornice upper / lower, eaves board, gutter) are no longer boxes emitted per edge: `addStrip`
  collects them for the whole tile, `emitStrips` MERGES collinear pieces of one strip (normals within 2.5 deg, planes
  within 3 cm: UrbIS gives one edge to two adjoining solids a few mm apart, and one box per roof triangle edge), MITRES
  the ends that meet another strip of the same kind and section (each corner = where the two strips' own offset lines
  meet: inside and outside corners, adjoining houses; no end cap), and sets free end caps back per kind (2 / 4 / 6 /
  8 mm: never in the next wall's plane, never in another strip's cap plane). I6: 4,934 strips drawn, 306 collinear pieces merged, 668 mitred joints.
- **Winding**: every detail quad is wound by its normal (`pushQuad`): `flipped` 68,262 -> 0; the detail material is
  FrontSide now (shadows still both sides).
- **Ridge / hip beams**: flat normals per face (their faked "rounded" normals were 5.4k `bentflat` once the winding
  was right), end caps, ends at a junction stop short under a small closed apex block (one per junction), free ends
  4 mm inside the gable's plane (their caps were IN it: 2.6k coplanar items).
- **Chimneys**: one stack per party wall (both neighbours built it: coincident boxes; I6 450 stacks, 205 twins dropped), closed boxes (stack, cap, pots).
- **Landmark buttresses**: the upper stage stands on the weathering cap (its soffit was coplanar with the cap's), one
  buttress per spot.

### Mesh checker, 4 tiles, before (0f94123) -> after, Saint-Job solid hidden in both (blocking; z-fight = coplanar / depth / crossing)

| tile | details+walls blocking | z-fight | flipped | details+roofs blocking | z-fight | leak (details+roofs) | walls+roofs blocking |
|---|---|---|---|---|---|---|---|
| I6 | 77,999 -> 2,965 | 13,607 / 410 / 482 -> 1,080 / 264 / 262 | 62,136 -> 0 | 76,212 -> 3,764 | 11,285 / 214 / 133 -> 664 / 69 / 89 | 542 -> 1,138 | 3,172 (unchanged) |
| H6 | 55,616 -> 1,984 | 9,814 / 372 / 179 -> 955 / 187 / 101 | 44,524 -> 0 | 54,134 -> 2,563 | 7,927 / 199 / 62 -> 673 / 32 / 52 | 391 -> 787 | 1,806 |
| E5 | 87,094 -> 3,040 | 13,452 / 461 / 362 -> 1,529 / 229 / 188 | 71,714 -> 2 | 83,466 -> 3,428 | 9,793 / 200 / 121 -> 1,090 / 59 / 109 | 565 -> 1,193 | 2,171 |
| F2 | 81,904 -> 2,868 | 12,824 / 407 / 256 -> 1,376 / 232 / 150 | 67,402 -> 0 | 78,991 -> 3,378 | 9,597 / 132 / 69 -> 1,074 / 49 / 68 | 565 -> 987 | 2,348 |

Blocking items -96 %, coplanar -89 to -94 %, flipped gone. NOT 0 blocking: what is left is listed under "Left". The
`leak` count on details+roofs went UP: with the eaves board gone over the street cornices, the slit between the
cornice's top and the roof edge counts as a leak, but the checker counts what lies behind it as see-through because it
hits a back face, and the city draws walls and roofs DoubleSide, so in the city a solid surface is seen there, not the
sky. The walls+roofs group (UrbIS's own solids) was not touched: 2.2k bentflat from the 32 deg smoothing + 311
coplanar party walls on I6.

Flicker test (`debug/shots.js flicker`: 24 frames, strafe 0.6 mm, updaters frozen; the before build served from a
scratch worktree of 0f94123, the same tile and view): Rue du Ham eaves close-up 256 -> 191 ppm (a second after-run
after the gutter change: 201 ppm); the aerial view over the terrace 103 -> 100 ppm. Heat maps
`img/flicker_eaves_before.jpg` / `_after.jpg`. Fly-over strip: `img/buildings_flyover_after.jpg` (no popping, no
blinking cornices). Street view before / after: `img/buildings_street_before_top_after_bottom.jpg` (the light
differs between the two runs: live clouds), eaves `img/buildings_eaves_before.jpg` / `_after_step1.jpg` (step 1 =
before the gutter change), `img/buildings_eaves_gutters_before_top_after_bottom.jpg` (gutter change).

### (c) the stair-stepped shadow edges

three r187's PCF (`ShadowFilterNode`) is 5 Vogel taps of a hardware 2x2 compare, IGN-rotated, `radius` texels wide
(default 1). Our sun map is 4096 px over a box that follows the view (`lighting.js`): 80 m half at street level (3.9 cm
texels: clean), but 200-380 m half in the orbit / fly views (9.8-18.6 cm texels): a 1-texel kernel shows the texels
as steps. Mr.doob's slop-newyork uses 2 cascades of 2048 px (docs/SLOP_NEWYORK_AUDIT.md); ours fades instead of
cascading (docs/SMOOTH_LOD.md). Fix (`lighting.js`): the kernel radius follows the texel, 1 at <= 4 cm up to 2.25 at
>= 14 cm, eased over 0.5 s (a uniform: no recompile; `viewer.lighting.radiusAdapt = false` for A/B). Flicker test on
two aerial views, adaptive vs radius 1: 324 vs 320 ppm and 558 vs 540 ppm (within noise: the rotated taps do not add
blinking). Images `img/shadow_high_radius1.jpg` / `_adaptive.jpg`: NOT a clean proof, the sun-lit / shadowed areas
differ between the two captures (the shadow box was still settling / clouds), so the visual comparison is pending on
a quiet machine with frozen weather. The real fix for aerial shadows is cascades (2 x 2048 like slop-newyork) with the
fade kept: left.

### (e) the garage door (a sub-agent did the Blender work; docs/facadekit/README.md "Garage door (fixes1)")

Rebuilt as an insulated SECTIONAL door (4 tongue-and-groove sections with shadow joints and a pressed rib, aluminium
bottom rail, folded steel jamb lining with a rounded nose, rubber seals at the sides / head / bottom, blue-stone lintel
with a drip groove, blue-stone threshold, handle set in the band that never stretches), scripted FAR variant = LOD1,
meshoptimizer LODs in `packKit.mjs`. Named slots only: new `garage_steel` (shader weathering: per-building colour white
/ anthracite / brown / green, embossed speckle, road grime on the bottom 45 cm, a rust streak under the lock) and
`rubber_black` (`viewer/facadeKit/kitMaterials.js`). Triangles LOD0 / LOD1 1,966 / 30 -> 1,136 / 236 (the old LOD1
lost its whole leaf beyond 28 m: painted_metal_white is dropped at LOD1). `auditKit.mjs`: 0 blocking, 3 sizes x 2
LODs, whole kit still 0. Images `docs/facadekit/wip/garage_before.png`, `garage_after.png`,
`garage_after_closeup.png`, `garage_lab.jpg`. PLACEMENT not done (it needs the façade shader to paint / cut a garage
bay): data found = UrbIS Topo CR42L driveways (I6: 59 segments lying on a building wall, 34 of them 2.2-3.2 m wide);
OSM is too sparse (12 entrance=garage in the commune). Plan in docs/facadekit/README.md.

### (f) the grainy far forest (orbit view, 1-2 km)

Looked at from 1.5 km up the H8-H9 woods (`img/forest_orbit_before.jpg` / `_after.jpg`, crop
`img/forest_far_bias_before_after.jpg`). Cause: the impostor kit samples its atlas at lodBias -1 everywhere (measured
as the crispest match to the mesh LODs at the 400 m hand-over); past ~700 m a crown is a few pixels and that crisp
mip reads as per-pixel light / dark grain (leaf texels + the a2c coverage). Not the shadows (receiveShadow off changed
nothing). Fix (`viewer/impostorKit/material.js`): the bias ramps by +1 from 700 to 1,100 m (`view.farBias`, `farFrom`,
`farTo` uniforms); the hand-over at 400 m is untouched. Jitter meter (`labs/cityJitter.js`, far-tree pixels), same view,
two alternating rounds: strafe blinking 0.37 % -> 0.27 %, d2 16.0 -> 14.5; orbit 1.01 % -> 0.94 %, d2 20.5 -> 19.5 (no
crawling dots came back: lower on every run). Seen too: the far end (1.2-1.5 km) fades the crowns into a grey-blue
"ground" colour that reads as a veil band over the woods, and no trees are drawn past 1.5 km: left.

### Left (job 2)

- The remaining audit items (table above): mostly UrbIS's own topology on walls / roofs (bentflat from the 32 deg
  smoothing of adjoining wall facets, T-junctions, party walls drawn twice back to back), strips of two solids whose
  outlines overlap at an angle (a fan: two cornices leaving one corner 20 deg apart), a cornice on a wall whose
  outward test failed (it faces inward under an outward eave), the kit's own cornice in front of the box cornice
  (kept for the far LOD), and leaks counted against back faces that the city draws (walls / roofs are DoubleSide).
- A verge strip along the gable rakes to cover the wall / roof T-junction line.
- Shadow cascades for the aerial views; the visual proof of the adaptive kernel.
- Garage placement (shader bay + CR42L in the pipeline); the far forest's grey fade target.
- GPU cost: not measured (2-3 agents on the GPU: frames at 78-126 ms GPU in this session, no meaningful A/B). The
  detail mesh has fewer triangles (I6 details 15k fewer: 120.9k -> 106.0k with the walls) and is drawn front-side only.
