# Trees: the tree lab, today's chain, the London plane, the beech

Branch `claude/tree-lab` (2026-11-06). The owner's brief: "don't go too far". First the lab and its tools showing the
trees we use today with all their optimisations, then one or two new species made as well as possible. This branch
adds the lab and two new species: the London plane, then (on the owner's go) the beech (§3b). Both are **lab only**:
the city still draws only the street trees, and its picture is unchanged (§5).

Lab: `labs/tree-lab.html`. Serve it from the repo root with no-cache headers, for example
`http://127.0.0.1:8785/labs/tree-lab.html`. It is also listed in `labs/index.html`.

URL parameters: `layout=`, `species=street|plane|beech`, `mix=` (forest patch: `all beech`,
`beech 80 % + street trees 20 %`), `variant=` (`auto`, `0`..`5`), `seed=`, `h=` (LiDAR height),
`crown=`, `time=` (a lighting preset). The city's own parameters also work: `impstart`, `impend`, `treeshadowend`,
`smooth=0`, `impprepass=0`.

## 1. The lab

**Lighting.** It uses the city's own lighting (`viewer/lighting.js`: the Firmament sky, the Brussels sun, the faded
shadow box) and post chain (`viewer/post.js`: AO, SSR, bloom, grade, eye adaptation). The time-of-day presets and the
solar hour are both available.

**Ground.** The ground is at 100 m TAW. It has:
- a lawn to the horizon (`vergeMaterial`);
- a 48 x 36 m square of the Saint-Job setts (`cobbleMaterial`);
- a street: a road with two sett pavements and a 13 cm kerb;
- tree pits with blue-stone edging (`pitMaterial`), under the single tree, the chain and the street.

**Layouts:**

| Layout | What | Data |
|---|---|---|
| single tree | one tree on the square, with an optional turntable and the LiDAR crown ring | panel height and crown radius |
| LOD chain side by side | LOD 0, LOD 1, LOD 2 and the impostor of the same variant next to each other, each labelled with its triangles, cards, bark, distance band, morph or dither band and shadow | see below |
| street of 50 | 2 x 25 trees, 11 m apart, in pits along both pavements | panel height, ±10 % |
| park cluster (LiDAR G4) | the densest 60 x 60 m of tile G4 (Saint-Job): 92 trees | **real** UrbIS CHM peaks: height and crown |
| forest patch (LiDAR M8, 4552) | the whole of tile M8, 500 x 500 m, on a beech-litter floor; the species is the selected one, or a mix ("all beech", "beech 80 % + street trees 20 %": one field per species, each its share of the trees) | **real** UrbIS CHM peaks: 4,552 trees |

**How the chain layout holds each LOD.** It draws the same built trees and shared materials as the city fields. Each
tree is held in its LOD by a stand-in distance for the morph (per-instance `treePos`): LOD 0 at 10 m, LOD 1 at 80 m,
LOD 2 at 250 m. So what you see is exactly what the city draws at those distances, from 60 m away.

**LOD walk.** It has two modes:
- **frozen view**: the camera stays put while the LOD eye (`lodEye`, which every fade and morph reads, shadows
  included) walks from 2 to 1,200 m away from the tree;
- **dolly zoom**: the camera itself walks back, and the focal length keeps the frame.

You can play the walk or scrub it. A bar shows the state live, for example "LOD 1, cards of LOD 2 shrinking (75 %) ·
shadow fading (75 %)".

**Pop meter.** It is a frozen walk in 60 log steps (or any range: `lab.popWalk({ d0, d1, steps })`). Each step grabs
the frame and gives the share of pixels changing by more than 40/255. A "jump" is a step's change minus the mean of
its two neighbours, as in `docs/SMOOTH_LOD.md` §5.

**Dev panel** (`viewer/panelUI.js`). Every control was driven through the panel's own controllers and checked against
the engine values; the script is in the session notes and `window.lab.ui`.
- **Scene & species**: layout, species (street, plane, beech), forest patch species (mix), variant (auto; auto 0-3 =
  plane natural / beech forest; auto 4-5 = plane pollards / beech open-grown; 0..5), seed (rebuilds the species
  and its impostor bake), LiDAR height and crown radius. A "fit" line compares the model's crown radius at this scale
  with the LiDAR one. Also: show the LiDAR crown, turntable, show the leaf mask.
- **LOD**: force LOD (auto / 0 / 1 / 2 / impostor), LOD colours (blue, yellow, red, magenta), wireframe, the LOD
  0→1 and 1→2 distances, and both morph bands.
- **Impostors**: on/off, start, cross-fade band, end, dissolve band.
- **Shadows**: tree shadows on/off, tree shadows end, fade band.
- **Wind & season**: strength, speed, direction (vendor CHANGES #14), and season. Season is a hook only: it tints the
  near LODs, and the impostor atlas keeps the summer albedo.
- **Light**: time-of-day preset, solar hour, post on/off.
- **LOD walk**: mode, play/stop, scrub distance, duration, live state, pop meter.
- **Performance**:
  - frame: fps, GPU ms (timestamp queries), draws, triangles;
  - GPU per pass: scene, shadow and post. r187 numbers passes by their order in the frame; #1 is the scene and #2 the
    shadow map, checked by toggling the trees and their shadows;
  - CPU ms of the tree updates;
  - memory: impostor atlas, built trees, leaf masks;
  - three benchmarks: **trees on/off**, **street vs plane** and **street vs beech** (both species built in the same
    layout and shown in turn). Each takes 5 alternating rounds of 1 s settle and 2.5 s of samples, reporting the mean difference and the
    spread. Results go to `lab.results` and the console.

## 2. Today's chain (the street trees), with numbers

All species go through `viewer/treesStylized.js makeSpecies()`. It is the old module turned into a factory: the city
uses `STREET`, with the same exports and the same picture. The vendor is `vendor/stylized-trees` (CHANGES.md #1-#15).

| | Street tree (mean of 6 variants) | Distance | Shadow |
|---|---|---|---|
| LOD 0 | 1,690 tris: 260 cards (520 tris) + bark 1,170 | 0-40 m; the cards LOD 1 drops shrink over 26-40 m and the kept ones grow 1.35x | casts |
| LOD 1 | 705 tris: 92 cards + bark 522 | 40-120 m; morph 80-120 m (to 1.7x) | casts; fades out over 80-120 m |
| LOD 2 | 427 tris: 40 cards + bark 348 | 120-400 m; dither cross-fade into the impostor over 350-400 m | none |
| impostor | 2 tris | 400-1,100 m; dissolve over 800-1,100 m | none |

How the chain keeps the tree smooth:
- **Nested LODs.** Every LOD takes its cards from LOD 0's own set. The CPU swaps the mesh 6 m after the morph ends,
  so the swap draws the same pixels.
- **Impostors.** They are octahedral, 8 x 8 views, baked from LOD 0 of each variant and relit live. One 2048 x 3072
  atlas pair is about 64 MB with mips.
- **Rendering.** Depth pre-pass and EQUAL colour pass for the leaves and the impostors; alpha-to-coverage.
- **Shadows.** The trees' shadows fade out over 80-120 m.

Frames: `docs/trees/chain_street.jpeg` and `docs/trees/chain_plane.jpeg`. The LOD colours over the forest are in
`docs/trees/shots/forest_lodcolours.jpeg`.

**Pop meter, frozen view, 30 steps over each band.** The tree is about 40 % of the frame. Each cell gives the largest
change in one step, then the worst jump over the step's neighbours. No step is above 0.3 %.

| Band | Street | Plane | Beech (open-grown, 18 m) |
|---|---|---|---|
| morph 1, 20-50 m | 0.09 %, worst jump 0.03 % | 0.29 %, worst jump 0.12 % | 0.43 %, worst jump 0.18 % |
| morph 2, 70-135 m | 0.10 %, 0.05 % | 0.29 %, 0.12 % | 0.45 %, 0.24 % |
| impostor cross-fade, 330-420 m | 0.06 %, 0.02 % | 0.12 %, 0.05 % | 0.55 %, 0.21 % |
| dissolve, 760-1,120 m | 0.11 %, 0.03 % | 0.29 %, 0.10 % | 0.12 %, 0.04 % |

The plane's and the beech's numbers are larger mostly because their crowns cover more of the frame; the beech's
impostor band (0.55 %) is the largest single step measured, still far under a pop. For comparison, a hard LOD switch in
`docs/SMOOTH_LOD.md` measured 7.8 %.

## 3. The London plane (Platanus × acerifolia)

The code is in `viewer/treesPlane.js`. It is procedural in JavaScript and TSL, and plugs into the same chain: same
LOD rules, nested cards, morph, bark morph, impostor bake, fades and shadows. JavaScript was chosen over Blender
because the chain wants a pad-and-card shape, and a mesh from Blender would have had to be re-cut into that.

**Form.**
- Variants 0-3 are natural trees. 0 and 2 are avenue trees with a 4.4-5.6 m bole; 1 and 3 are trees of squares,
  with a lower fork and a broader crown.
- The leader runs to about two thirds of the height, with 5-6 sinuous scaffold limbs.
- The crown is grown into an envelope, a lobed dome about as wide as it is tall above the bole. The goals of the
  secondaries are spread over the dome as a Fibonacci spiral, from 32° below its centre to the top. Each goal is grown
  from the nearest limb, from lower on the limb for a lower goal, and its twigs go to points next to it. The leaf pads
  sit just inside the dome, so the dome is full on every side, with lumps and gaps.
- Variants 4-5 are **pollards**: a 3.2-4 m bole that swells under the head, 3-5 short limbs ending in knuckled heads,
  and a brush of 6-9 straight shoots on each head.
- Each variant is scaled by its own height (`perVariantHeight`), so a pollard does not shrink to 6 m.

**Leaves.** A 512 px RG mask, drawn on a canvas:
- about 100 palmate leaves with 5 pointed lobes, teeth, a truncate base and a petiole, on 7 twigs plus loose ones;
- the leaves are foreshortened (seen at a slant);
- `.g` carries each leaf's own tone, darker toward the petiole, lighter veins, and the shade of the leaf above;
- the mask covers 35 % of the card, against 23 % for the street mask, so the plane needs fewer cards for the same
  fill;
- the leaf tone reaches the impostor bake too (vendor CHANGES #12).

**Bark.** Procedural TSL in tree space:
- a pale buff-grey under-bark, with the old olive-brown plates still on it, more of them low down and in big zones;
- cream and yellow fresh patches;
- one-sided flake edges: a groove outside each plate, a pale rim inside;
- short cracks in the old plates, a fibrous grain, mottling, moss;
- a darker, fissured foot with a root flare and five buttresses;
- paler limbs;
- everything filtered with the pixel footprint, fading to its mean colour with distance.

**Shading.**
- A gentler occlusion per pad overhead, with a floor, and a near-flat colour ramp from the bottom to the top of the
  crown (vendor CHANGES #15). The street trees' values turned the lower half of this deep crown black.
- The shadow lookup moves 2.4 m toward the sun.

**Triangles** (mean of 6 variants):

| LOD | Total | Cards | Bark |
|---|---|---|---|
| LOD 0 | 4,045 | 612 | 2,821 |
| LOD 1 | 1,505 | 255 | 996 |
| LOD 2 | 481 | 127 | 227 |
| impostor | 2 | | |

LOD 2's bark has 6 and 4 sides and every other ring.

**Side by side with photos** (Wikimedia Commons; credits are on each image and in `data/raw/refs/trees/SOURCES.md`):

| File | Photo |
|---|---|
| `docs/trees/sbs_whole.jpg` | Francoerbi, CC0 |
| `docs/trees/sbs_avenue.jpg` | Aliva Sahoo, CC BY-SA 3.0 |
| `docs/trees/sbs_canopy.jpg` | Jules Verne Times Two, CC BY-SA 4.0 |
| `docs/trees/sbs_bark.jpg` | Adrian Tync, CC BY-SA 4.0 |
| `docs/trees/sbs_pollard.jpg` | lienyuan lee, CC BY 3.0 |

Each composite that includes a CC BY-SA photo is shared under the same licence.

## 3b. The beech (Fagus sylvatica)

The code is in `viewer/treesBeech.js`, through the same chain (`makeSpecies`; the skeleton helpers `grow`, `at`,
`taper`, `barkMesh` are shared with the plane). It is the Sonian Forest's tree and the most common street tree of the
Uccle regional roads (green and copper beech, §7).

**Form, two of them** (variants per form as for the plane, scaled by their own height):
- **Forest, "the beech cathedral"** (variants 0-3, built at ~30 m): a tall, straight, smooth bole clear of branches
  for 50-56 % of the height, 3-4 steep limbs forking high, a narrow, high crown (radius 0.24-0.28 x the height) grown
  into its dome envelope with the goals' heights pulled toward **4 horizontal tiers** (the layered sprays seen inside
  a beech forest). Built for 4,500-tree tiles: ~30 pads of 8 / 3 / 2 cards, LOD 2 = 66 cards + 156 bark triangles.
- **Open-grown** (variants 4-5, ~24 m: avenues, squares, gardens): a 2.6-3.4 m bole, 6-7 long limbs spreading low,
  a wide dome (radius 9-10.5 m) reaching down to ~3 m, as the free-standing beech of the reference photo.
- Both: a root flare with six buttress roots ("elephant feet", `barkMesh` now takes the flare's height, amplitude and
  lobes per branch).

**Leaves.** 512 px RG mask: 10 **flat sprays** (zigzag twigs with two-ranked, alternate leaves, smaller toward the
tip, a terminal leaf) plus leaves of the sprays behind; each leaf ovate, pointed, with a wavy margin, a midrib and 7
straight parallel vein pairs, one half of the blade lighter (gloss) in `.g`; 36 % coverage. The leaf material is
**glossier** (roughness 0.55 against 0.9: `def.leafRoughness`), a clean mid green with a lime translucency.

**Bark.** Procedural TSL: smooth mid-grey, warmer in big zones, mottled at three scales; faint horizontal wrinkles;
the **eyes** (branch scars: a dark almond under a soft dark chevron, laid out on the trunk's own cylinder (the angle
round the ring centre x the height), one in three cells, jittered and sized per cell); pale **lichen** spots (warped
Worley, ragged); **green algae** toward the foot and on one side; darker damp roots; matte (roughness 0.78-0.95).

**Shading.** The crown's dome takes half of each card's normal (`crownNormal` 0.5): with glossy leaves each pad's own
dome read as "broccoli" balls. Occlusion per pad overhead 0.95 with a floor of 0.45, as the plane.

**Triangles** (mean per form):

| LOD | Forest form | Open-grown form | (street trees) |
|---|---|---|---|
| LOD 0 | 2,176 (264 cards, bark 1,648) | 5,918 (985 cards, bark 3,948) | 1,690 |
| LOD 1 | 823 (100 cards, bark 624) | 1,908 (394, 1,120) | 705 |
| LOD 2 | **288** (66 cards, bark 156) | 674 (197, 280) | 427 |
| impostor | 2 | 2 | 2 |

**Side by side with photos** (Wikimedia Commons; credits on each image and in `data/raw/refs/trees/SOURCES.md`):

| File | Photo |
|---|---|
| `docs/trees/sbs_beech_forest.jpg` | Forêt de Soignes, Ben2, CC BY-SA 3.0 |
| `docs/trees/sbs_beech_forest2.jpg` | Sonian Forest, Trougnouf (Benoit Brummer), CC BY 4.0 |
| `docs/trees/sbs_beech_open.jpg` | Rufus46, CC BY-SA 3.0 |
| `docs/trees/sbs_beech_bark.jpg` | Fraxinus Croat, CC BY-SA 3.0 |
| `docs/trees/sbs_beech_canopy.jpg` | T. Kebert, CC BY-SA 4.0 |

The chain: `docs/trees/chain_beech.jpeg` (open-grown). The forest from above: `docs/trees/shots/forest_beech.jpeg`.

## 4. Cost: the new species against the street trees, through the whole chain

**Run 2 (2026-11-06, beech): the GPU was free** (the owner's Kit Lab closed, no other tab). Every number is an A/B
alternation in one page; GPU ms per frame, the median of each round (r187 timestamps, 1500 x 800, pixel ratio 1).
Views as in run 1. The beech uses its open-grown form on the single tree and the street, its forest form in the
forest; the plane its natural forms.

| Layout | Street (ms, per round) | Beech (ms, per round) | **Beech − street** | Plane − street (same run) |
|---|---|---|---|---|
| one tree, 18 m, 30 m away | 2.42 / 2.69 / 2.88 / 2.95 / 2.95 | 2.95 / 3.08 / 2.82 / 3.08 / 3.08 | **+0.22 ms** (−0.07 .. +0.52) | +0.21 ms (0 .. +0.39) |
| street of 50 | 3.34 / 3.41 / 3.47 / 3.47 / 3.54 | 3.74 / 3.87 / 3.67 / 3.93 / 3.93 | **+0.38 ms** (+0.20 .. +0.46) | +0.64 ms (+0.52 .. +0.72) |
| forest patch, 4,552 LiDAR trees | 4.33 / 4.33 / 4.33 / 4.26 / 4.46 | 4.33 / 4.26 / 4.33 / 4.33 / 4.26 | **−0.04 ms** (−0.20 .. +0.07) | +0.89 ms (+0.85 .. +0.98) |

Trees on/off (what the trees cost in total), same run:

| Layout | Street | Beech | Plane |
|---|---|---|---|
| one tree | 0.13 ms (0.07 .. 0.20), 6 k tris | 0.28 ms (0.20 .. 0.33), 17 k tris | 0.26 ms (0.20 .. 0.33), 16 k tris |
| street of 50 | 1.20 ms (1.11 .. 1.25), 63 k tris | 1.61 ms (1.38 .. 1.77), 183 k tris | 1.88 ms (1.64 .. 2.03), 155 k tris |
| forest patch | **2.10 ms** (1.97 .. 2.16), 1.70 M tris | **2.11 ms** (2.10 .. 2.16), 1.51 M tris | 2.87 ms (2.82 .. 2.88), 3.14 M tris |

**The beech meets the forest target**: on the 4,552-tree patch it costs the same as the street trees (2.11 vs 2.10 ms;
the A/B difference −0.04 ms is inside the noise), with fewer triangles. How: the forest form puts all its foliage in
a high, narrow crown (half the pads of the plane, none low down), LOD 2 has 66 cards and a 156-triangle bark (6 / 4
sides, every other ring), the bare bole is one 12-sided tube, and the impostors (most of the patch) are 2 triangles
whatever the species. The open-grown form is the expensive one (985 cards at LOD 0), for gardens and avenues only.

On a loaded GPU (run 1 below) the same trees cost about 3x more in ms; compare within a run, not across runs.

**Run 1 (plane, before the beech): the machine was shared**: other agents' tabs and the façade-kit lab were running. Every number is an A/B alternation in
one page, so both sides saw the same load. GPU ms per frame is the median of each round (r187 timestamps,
1500 x 800, pixel ratio 1).

**Plane minus street, same layout, same view, both species built:**

| Layout | View | Street (ms, per round) | Plane (ms, per round) | Plane − street |
|---|---|---|---|---|
| per tree | 30 m from one 18 m tree, eye height | 1.57 / 1.51 / 1.51 / 1.51 / 1.38 / 1.38 | 1.57 / 1.70 / 1.57 / 1.64 / 1.57 / 1.64 | **+0.14 ms** (spread 0 .. +0.26) |
| street of 50 | eye height, down the avenue | 2.29 / 2.36 / 2.29 / 2.29 / 2.16 / 2.36 | 3.28 / 3.15 / 3.60 / 3.47 / 3.01 / 3.34 | **+1.02 ms** (spread +0.79 .. +1.31) |
| forest patch, 4,552 LiDAR trees | 60 m up, looking into the forest | 6.95 / 7.27 / 7.01 / 7.34 / 7.21 | 9.83 / 10.81 / 10.09 / 10.16 / 10.55 | **+3.13 ms** (spread +2.82 .. +3.54) |

**Trees on/off (what the trees cost in total):**

| Layout | Street | Plane |
|---|---|---|
| one tree | 0.23 ms (0.20 .. 0.33) | 0.34 ms (0.26 .. 0.39) |
| street of 50 | 1.06 ms (0.85 .. 1.25), 63 k tris | 2.02 ms (1.90 .. 2.16), 155 k tris |
| forest patch | 6.6 ms (6.4 .. 7.0), 1.7 M tris | 9.7 ms (9.5 .. 10.2), 3.1 M tris |

The forest view's passes for the plane: scene 3.3 ms, shadow 1.4 ms, post 1.3 ms.

**CPU.** One re-bucket of the 4,552-tree forest (camera moved 6 m) takes a median of 0.8 ms and at most 2.2 ms for
the plane, against 0.6 / 1.7 ms for the street trees. With no motion it is 0.02 ms per frame.

**Memory.** One impostor atlas pair per species, about 64 MB each (2048 x 3072 RGBA8 x 2, with mips). The built
plane trees take 2.9 MB for 6 variants x 3 LODs, the leaf mask 0.67 MB.

**What it took to get there.**
- The first plane cost +3.3 ms on the street of 50 and +5.2 ms in the forest. It is fragment-bound: quarter the
  pixels and the street-of-50 frame drops from 6.3 to 2.2 ms. The fix was fewer, larger pads (dome goals scaled with
  its area) and a denser mask, so 10 / 4 / 2 cards per pad replaced 9-11 / 4-5 / 2.
- The forest is half fragment, half vertex: there LOD 2's bark (6 and 4 sides, half the rings) and its 2 cards per
  pad are what count.
- At 3 ms more for a dense forest, the plane is an avenue and square tree, not a forest tree. The Sonian Forest
  should be beech (§6).

## 5. Changes outside the lab (all leave the city's picture as it was)

- **`viewer/treesStylized.js`: `makeSpecies(def)`.**
  - The per-module state (shared materials, built trees, bake, NATURAL_HEIGHT) moved into a factory. `STREET` is the
    city's species, with the same parameters and exports.
  - New options: `opts.variantOf` on `buildField` (the lab), `def.perVariantHeight` (off for the street trees), and
    `def.impostorAlphaBoost` (0.3, as before, for the street trees).
  - The city was checked to boot and draw as before (Saint-Job view, no errors).
- **Vendor** (`vendor/stylized-trees/CHANGES.md`):
  - #12: leaf tone channel (`leafTone`, 0 = off).
  - #13: `variantOf`, seed, and `shape(r, lod, seed)`.
  - #14: wind direction. It only acts with `windAmp` > 0, and the city has 0.
  - #15: occlusion and normal per shape. The defaults are the old constants.
- **`viewer/impostors.js`.**
  - The bake reads the leaf tone.
  - The bake margin comes from the species' biggest card. It changes only above 1.5 m, so the street trees' atlas is
    unchanged.
  - (beech) `def.leafRoughness` sets the shared leaf materials' roughness (unset for the street trees); `barkMesh`
    (viewer/treesPlane.js) takes per-branch flare parameters (defaults = the plane's).
  - `alphaBoost` is now per material. The far-mip alpha boost of 0.3 turned whole plane quads opaque and dark: black
    rectangles over the forest at 400-550 m, found with the forest patch and a telephoto. The plane uses 0, the street
    trees keep 0.3.

## 6. What still looks weak

- **Bark, close up (< 3 m).** It reads as a plane, but the plates are smooth vector-like shapes. It lacks the flaky
  relief, the fine moss and lichen and the warm colour of the photo (`sbs_bark.jpg`). Next: a baked bark texture
  (Blender, or a CC0 scan) mapped on the trunk with a seam-free projection, plus parallax relief.
- **Inside the crown, looking up.** The crown is a shell of pads; the secondaries show as long straight spokes
  (`sbs_canopy.jpg`). Real planes zigzag and twig densely inside.
- **The lower crown in high sun** is still darker than in the photos. There is no light through the crown except
  toward the sun.
- **Impostors at long focal lengths** (pre-existing, `docs/SMOOTH_LOD.md` §4) show a halftone / moiré inside crowns
  at telephoto, for both species. At a 50° FOV they are a few pixels. Impostors close up are blurrier than the real
  LOD 2, by design.
- **Beech.**
  - The forest's floor is a flat litter material: no ferns, brambles or young beeches (the photos' understory); the
    shaded floor reads too dark and blue. An understory layer (cards, cheap) is the next thing that would sell the
    "cathedral".
  - Trunks are uniform cylinders of one diameter per height; real ones vary, lean a little more, and some are forked
    low. The bark is credible at 2 m (grey, eyes, lichen, algae) but smoother and more regular than the photo, and in
    blue skylight it reads cooler than the real grey-brown.
  - The forest crowns are a little too dense and too uniform in tone against the April photos (fresh, see-through
    canopy); the open-grown dome still shows its pads as lumps.
  - Copper beech ('Atropunicea', 534 of the Uccle street beeches) is not done: a colour preset (and its own impostor
    bake) of the same species.
- **Pollards in summer** are fine at street distance. The knuckles are coarse up close: lumpy rings, not burls.
- **Seasons** are a hook only: near LODs only, and the atlas would need a rebake per season. **Wind** sways the whole
  crown and its cards, with no branch hierarchy, and the impostors do not sway.
- **Crown fit to the LiDAR.** Scaling uses the height only. The plane's crown radius at a given height is fixed per
  variant (the "fit" line shows, for example, 10.4 m model against 7 m LiDAR). A variant could be chosen, or the crown
  stretched, from the LiDAR crown radius.

## 7. Next steps

1. **More species**: the beech is done (§3b); next the copper beech (a preset of it), the lime (*Tilia × euchlora*,
   common on the Uccle roads) and the horse chestnut. For the city: one `makeSpecies` field per species per tile;
   the forest tiles all-beech (or mostly) with the forest form, the avenues per the inventory below.
2. **The real species per tree from open data** (checked 2026-11-06; samples in `data/raw/trees_inventory/`,
   git-ignored):
   - **Bruxelles Mobilité**, regional-road street trees: WFS `https://data.mobility.brussels/geoserver/bm_public_space/wfs`,
     layer `bm_public_space:trees`. CC0. Fields: `essence`, circumference, height, crown diameter, `status`. Keep
     `status = 'en vie'`: 1,579 of the 2,065 trees with `commune = 'UCCLE'`.
     - Coverage: regional roads only (Drève de Lorraine, Av. Churchill, Rue de Stalle, Av. de Fré, Av. Brugmann,
       Ch. d'Alsemberg, ...).
     - Top species: *Fagus sylvatica* 'Atropunicea' 534, *Aesculus hippocastanum* 400, *Tilia × euchlora* 308,
       *Fagus sylvatica* 184, *Carpinus* 136, *Platanus × acerifolia* 109.
     - The planes are on Av. Churchill (72), Av. Brugmann (22) and Av. de Fré (15).
   - **Bruxelles Environnement**, trees it manages (parks, woods): WFS `https://ows.environnement.brussels/green`,
     layer `tree`. Fields: `essence`, height, crown diameter. About 8,100 trees in the Uccle bounding box. No formal
     licence was found ("no conditions apply").
   - **urban.brussels**, remarkable trees: WFS `https://gis.urban.brussels/geoserver/ows`. 848 trees in the Uccle
     bounding box, with species and crown. Licence not verified.
   - **OpenStreetMap**: 1,166 of 2,559 Uccle `natural=tree` nodes have `species`. ODbL; it largely mirrors the
     regional inventory.
   - **Not open anywhere**: the commune's own streets, including Place de Saint-Job. Those trees need the commune's
     data or hand placement.
   - Plan: snap each LiDAR canopy peak to the nearest inventory tree within its crown radius and take its species.
     Elsewhere use a per-context default: plane on avenues and squares, beech in the forest, a mix in gardens. Each
     species is its own `makeSpecies` field per tile, with one more atlas each.
3. **Seasons.** Rebake the atlas per season, or bake albedo with no tint and tint live: the atlas would then store
   the leaf tone, not the colour. Autumn colour per tree from `treeTint`; leaf fall as cards shrinking (the morph
   already shrinks cards).
4. **Wind.** A per-branch hierarchy (the bark mesh knows its levels), gusts from a scrolling noise, and the impostor
   sway as a vertex lean.
5. **Megaplants** (Quixel) **as an impostor or reference source.** It is under the Fab Standard License, NOT CC0:
   usable inside a shipped project but not redistributable as assets. Check that this fits the repo (public on
   GitHub?) before any of it lands in `models/`. It would only feed the impostor bake or serve as a visual reference,
   never be shipped raw.
6. **Tool ideas.** A photo overlay in the tree lab (as in the church lab); the pop meter as a CI-style check per
   species.
