# Smooth LOD and shadows

The owner's top complaint (2026-11-05): trees pop and change shape as the camera moves, shadows appear
abruptly. Goal: no shadow appearing suddenly, no tree changing shape, nothing popping in or out, for about
the same GPU time. Branch `claude/smooth-lod`. `?smooth=0` turns every change below off (hard switches, the
old shadow box) for A/B; the dev panel has a **Smoothness** folder (`viewer/smoothPanel.js`).

## 1. Inventory: every discontinuity found (before)

Found by reading the code and checking with a moving camera (walk the Saint-Job avenue at eye height, fly up
from 2 m to 300 m, orbit Saint-Job at 160 m, and a frozen view while the LOD camera walks; frames in
`docs/smooth/`).

| # | What | Where / distance | Kind |
|---|---|---|---|
| T1 | Stylized trees LOD 0 → 1 | 40 m, every 5 m of camera motion (re-bucketing) | whole tree swapped for a DIFFERENT random card set (20 → 7 cards per pad, new positions, 1.35x size): "the tree changes shape" |
| T2 | Trees LOD 1 → 2 | 120 m | same, 7 → 3 cards, new positions, 1.7x |
| T3 | Tree shadows | 40 m | only LOD 0 cast: a tree's shadow switched on/off at 40 m (the owner's "shadows appear abruptly") |
| T4 | Bark | 40 m / 120 m | sub-branches dropped, 9 → 6 → 4 sides |
| T5 | Trees end | 900 m | hard cut |
| T6 | Far-LOD tiles | ring 2-3 (≥ 500 m) | no trees at all: when a tile streamed in full, a whole tile of trees (and roads, façades) appeared in one frame |
| S1 | Shadow box edge | box half 60-380 m | r187 ShadowNode returns "lit" outside its frustum: shadows stop dead at a square edge |
| S2 | Shadow box size | orbit / fly | box resized when the view distance drifted 10 %: texel size jump (all edges jump) and the edge (S1) jumps with it |
| S3 | Shadow texel snap | every frame | snapped in WORLD x/y/z, not across the sun's view: sub-texel slides. Measured with a frozen view and a sliding box: below JPEG noise at the 60-135 m boxes (minor) |
| L1 | Street lamps (Blender model) | 35 / 110 / 450 m | meshopt LODs (1-2 cm error: invisible) but the shadow came from LOD 0 only: lamp shadows switched at 35 m; lamps vanished at 450 m |
| C1 | Saint-Job church (`THREE.LOD`) | 170 / 520 m | hard swap of 38.6k / 15k / 3k triangle versions |
| R1 | Tram T3000 LODs | 70 / 260 / 1800 m | hard swap per tram; LOD 2 cast no shadow (shadow switched off at 260 m); vanished at 1800 m |
| P1 | Parked cars | — | already smooth on `claude/foundation` (`viewer/carFleet.js`: dithered LOD and distance fades, shadow fades with the car, streaming fade-in). Left alone, same dither noise (IGN) as here |
| F1 | Street furniture, bollards | — | no LOD, no cull distance: no pop (they exist while their tile is loaded in full) |
| W1 | Tile streaming | ≥ 500 m | full ↔ far swap in one frame (lite disposed the frame the full one was ready); a full tile leaving the ring left a HOLE until its far tile loaded (one stream step later) |
| W2 | World edge | ring 3 (~1.5-1.75 km) | far tiles appear / disappear at the edge in one frame |
| X1 | Slop / simple trees (`?trees=slop|simple`) | slop: 105 / 420 m with 6 m hysteresis | not the default; untouched (vendor/slop-trees must not be edited) |

## 2. Research (what others do)

- **mrdoob/slop-newyork** (`vendor/slop-trees/trees.js`): 3 geometry LODs with a 6 m hysteresis (105 / 420 m),
  and the key idea: the coarse **canopy shell is shared by all LODs**, the near LODs only ADD cards. The tree keeps
  its silhouette because the far version is literally part of the near one. Shadows: `SunLight` (2 cascades,
  rotation-stable bounding sphere, texel snap, 10 % cascade blend band), shadow far 300 m growing with altitude.
  No THREE.LOD, no impostors, no dithered fades.
- **three.js r187**: `THREE.LOD` = hard switch. `SunLightShadow` fits each cascade with a bounding sphere (rotation
  invariant) snapped to texels, and blends cascades over 10 % (`_cascadeFade`). `ShadowNode.setupShadowFilter` has a
  hard frustum test (lit outside), which is the hook used here. `CSMShadowNode` has a `fade` option.
  `material.maskNode` / `maskShadowNode` discard in the main / shadow passes; uniforms with `onObjectUpdate` give a
  per-object value with one shared material. Cascades were not adopted: Firmament's sun shafts and the volumetric
  fog march THE single shadow map (`lighting.js` hazeHook), and the WebGL2 fallback did not cast with SunLight.
- **Unity**: LOD Group "cross-fade" with a dithered (`LODFadeMode`, `unity_LODFade`) complementary mask over a band,
  also in shadow casters; Shadow Distance + "Shadow Fade" (fade over the last 20 %); stable-fit shadow projection.
- **Unreal**: dithered LOD transitions (same complementary screen dither, smoothed by TAA), HLOD for far clusters,
  Virtual Shadow Maps (page-cached, constant texel density), distance-field shadows fading in past the cascades.
- **Godot 4**: visibility ranges with begin/end **margins** and fade modes (Self = alpha/dither fade of the object,
  Dependencies = cross-fade with the next LOD node); `directional_shadow_fade_start` fades the last shadow split.
- **game-engine-v1** (read only): `v3/render/foliage/foliageLodRenderer.js` cross-dissolves tiers over 16 frames by
  ramping instance COUNTS (density-safe) with ±10 % hysteresis; `games/thunderline/proto/kit/sunShadows.js`: a
  fixed-size, texel-snapped live map blended into a static atlas at its edge ("why not CSM: boxes follow the
  camera"); octahedral impostors (`octahedralCore.js`, already borrowed by `viewer/impostors.js`).

## 3. Plan and what was done (technique, cost)

Shared module `viewer/lodFade.js`: `lodEye` (the VIEW camera as a uniform, read by every distance fade in every
pass, so the shadow pass picks exactly the LOD the eye sees), `ditherNoise()` (interleaved gradient noise on the
pixel / shadow texel, as `carFleet.js`), `keepBand(lo, hi)` (complementary cross-fade: outgoing keeps n < 1-t,
incoming n ≥ 1-t from the same t: every pixel drawn by exactly one of them), `objectFade` (per-object time fade),
`Fader` (time fades of tile groups) with **fading copies of materials swapped in only while a tile fades**
(`fadeVariant`: a permanent discard on every façade, road and terrain material cost ~3 ms of GPU at Saint-Job).

| # | Technique | Cost (measured, see §5) |
|---|---|---|
| T1-T2 | **Nested LODs + geomorph** (vendor stylized-trees CHANGES #8). All LODs take their cards from LOD 0's set (slop-newyork's shared shell, made exact): LOD 1 = the first 7 cards of each pad, LOD 2 the first 3. In the vertex shader the cards the next LOD drops SHRINK to nothing over `morph1` = 14 m (26-40 m) / `morph2` = 40 m (80-120 m) and the kept cards grow to the old 1.35x / 1.7x sizes; the CPU swaps the mesh 6 m after the morph ended (`lodSlack`, more than the 5 m re-bucketing step), so the swap draws **the same pixels**. No dither, no double draw. Same shape at every distance | ~0 (a few ALU per vertex; same card counts) |
| T3 | Trees cast from LOD 0 **and 1** (same morph in the shadow pass through `lodEye`), and their shadows **fade out** (dithered, shadow pass only) over 80-120 m (`TREE_SHADOW`, dev panel). All three LODs casting was measured: +3 ms (LOD 2 out to 400 m in the orbit's shadow box) → not default (`?treeshadow=2`) | ≈ +0.4-0.5 ms (shadow pass) |
| T4 | Bark morph (CHANGES #9): per-vertex ring centre + level; level-2 sub-branches shrink onto their axis over the 40 m band; LOD 1 keeps 9 sides, LOD 2 has 6 | small (+50 % far-trunk triangles, few px) |
| T5-T6 | **Impostors as the far LOD** (`viewer/impostors.js`, baked from the real LOD 0 tree: same crown, same variant, same per-tree tint, relit live), dither **cross-faded** with LOD 2 over 350-400 m (complementary, same tree foot, same t), and **on the far tiles too** (`buildFarTreeField`, same placements and variants as the full tile, so the swap changes nothing); dissolve over 800-1100 m into the orthophoto. With a depth pre-pass (alpha-tested quads overlap deep over a forest: 1.3 → 0.5 ms at Saint-Job). Out to 2400 m was +3.1 ms in the overview: 1100 m default (`?impend=`) | ≈ +0.5 ms (Saint-Job), ≈ +0.9 ms (overview); but no 900 m LOD 2 any more |
| S1 | `FadedShadowNode` (lighting.js): shadows blend to lit over the last 22 % of the fade radius, inside the box | ~0 |
| S2 | The fade radius follows the view smoothly (damped, 0.35 s); the box takes **fixed sizes** 60/90/135/200/300/400 m (x1.5) with hysteresis, always ≥ the fade radius: a resize changes only the texel size, never where shadows end | 0 (400 vs 380 m max box) |
| S3 | Snap the box centre to whole texels **across the sun's view** (light-space x/y), the stable-fit method | 0 |
| L1 | Lamps: every LOD casts; the last LOD dithers out over 390-450 m | ~0 |
| C1 | Saint-Job: `THREE.LOD` replaced by the three levels cross-faded by `objectFade` over ±15 % / ±12 % of 170 / 520 m | ~0 (two levels drawn only inside a band) |
| R1 | Trams: inside ±10 % / ±8 % of 70 / 260 m a tram is drawn in both LODs, split by the dither (`aInst.w`, which was free); fades out over 1650-1800 m; LOD 2 casts | ~0 |
| W1 | Streamed full tile: built hidden, then faded in (0.9 s) over the far tile, which fades out and is disposed; a full tile leaving the ring loads its far tile FIRST, then fades out over it | 0 outside the 0.9 s of a fade |
| W2 | Far tiles fade in / out at the ring's edge | 0 outside fades |
| boot | Tiles streamed under the loading cover hold their fade, so the warm-up compiles the fading copies too; the first far tile does not fade (its own materials compile) | 0 |

## 4. What remains

- **Impostor look up close (telephoto)**: the octahedral impostors show a halftone / hatched pattern inside crowns
  at long focal lengths (alpha-to-coverage on the soft mip-filtered alpha); at the normal 55° FOV they are a few
  pixels. Pre-existing (the owner's 2026-11-04 note: "blurrier"); a depth atlas / 16x16 views would help.
- **World edge** (ring 3, ~1.5-1.75 km): far tiles now dissolve in/out, but the world still ends there (no
  horizon LOD beyond the far ring).
- **Shadow resolution steps**: a box size step (x1.5) still changes the texel size in one frame (softness, not
  position). Cascades with blend bands would remove it but would have to feed the sky's shafts and the fog.
- **Trees beyond 120 m cast no shadow** (faded, as before except the old cut was at 40 m). `?treeshadow=2
  &treeshadowend=300` shows them, at ~+3 ms in the orbit view.
- Slop / simple trees (`?trees=slop|simple`) keep their own LOD switches.
- The leaves' colour pass (EQUAL depth) does not fade its SHADOW with a streaming tile (the tile is ≥ 500 m away,
  beyond every shadow range).

## 5. Evidence and cost

Frames (`docs/smooth/`, left `?smooth=0`, right smooth, same poses): `walk.webp` (eye height along the Saint-Job
avenue), `fly_up.webp` (2 → 300 m), `orbit.webp` (around Saint-Job at 160 m), `frozen_view_lod_walk.webp` (the view
stays put while the LOD / shadow state walks 200 m toward it: only state changes show), `tile_streaming.webp`
(orbit target moved 600 m east: three tiles stream in), `shadow_swim.webp` (view frozen, shadow box sliding);
`before/` = the same walk and fly-up on the base commit 413bec9.

Pop metric (`docs/smooth/`, frozen view): share of pixels changing by more than 40/255 between steps of 4 m of
the LOD camera. A pop is a step much larger than its neighbours.

| Sequence (50 steps) | max jump over neighbours | steps with a jump > 1.5 % |
|---|---|---|
| frozen view, LOD camera walks 1100 → 1300 m along the avenue, `?smooth=0` | 7.8 % | 3 |
| same, smooth | 0.56 % | 0 |
| tile streaming (3 tiles swap far → full), `?smooth=0` | 2.4 % (one frame) | 1 |
| same, smooth | 0.09 % | 0 |

(Moving-camera sequences cannot be scored this way, the motion itself changes 25-40 % of the pixels per step;
see the side-by-side frames.)

GPU A/B, 2026-11-05, back to back, three alternations (base = `claude/foundation` 8136fc5 served from a copy;
after = this branch). GPU ms per frame (r187 timestamp queries, 5 s average per view, 1500x800, pixel ratio 1);
the GPU was shared with other agents' tabs, so the spread is reported.

| View | base GPU ms (3 runs) | smooth GPU ms (3 runs) | Δ | draw calls base → smooth | triangles base → smooth |
|---|---|---|---|---|---|
| Saint-Job close-up (orbit, 120 m) | 6.43 / 6.48 / 6.10 (mean 6.34) | 7.02 / 7.37 / 7.31 (7.23) | **+0.9** | 337 → 421-431 | 5.52 M → 4.48 M |
| Overview (300 m up) | 8.54 / 8.83 / 8.17 (8.51) | 7.47 / 7.68 / 7.68 (7.61) | **−0.9** | 397 → 372-380 | 7.04 M → 4.16 M |
| Street (6 m up, the avenue) | 6.72 / 6.80 / 6.99 (6.84) | 7.54 / 8.03 / 7.89 (7.82) | **+1.0** | 364 → 436 | 5.87 M → 4.58 M |

Where the time goes (toggled in place, three alternations each, Saint-Job view): impostors ~0.5 ms (1.3 before
their depth pre-pass), trees' LOD 1 shadows ~0.5 ms, LOD 2 trees 0.6 ms (as before). Things tried and dropped for
cost: every LOD casting (+3 ms), a permanent per-object fade discard on every tile material (+3 ms; now swapped in
only while a tile fades), impostors out to 2400 m (+3.1 ms overview; now 1100 m). Cheaper knobs if the near views
must be even: a shorter tree shadow range in the dev panel (e.g. end 80 m, band 30: the
shadows still fade, over 50-80 m), or `?treeshadow=0` (LOD 0 only: the old 40 m shadow switch comes back).

URLs (local server from the repo root, e.g. port 8775):
- smooth (default): `/viewer/index.html?tile=I6&view=stjob`
- A/B: add `&smooth=0`; single parts: `&tilefade=0`, `&impostors=0`, `&treeshadow=0|1|2`, `&impend=`, `&impstart=`,
  `&impprepass=0`, `&prepass=0`
