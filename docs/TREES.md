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

## 4b. Textures A/B: would other textures look better, and what do they cost?

Branch `claude/tree-textures` (2026-11-06). A separate page, `labs/tree-textures-lab.html` (the Tree Lab is
untouched), e.g. `http://127.0.0.1:8786/labs/tree-textures-lab.html`. URL parameters: `species=plane|beech|street`,
`preset=2 m (bark)|15 m|40 m|120 m|400 m (impostor)`, `time=day|golden|night`, `sides=2|3`, `bark0..2=`, `leaves0..2=`,
`seed=`, `ui=0` (screenshots).

**The page.** The same species, seed, variant and light (`lighting.js` + `post.js`) on 2 or 3 sides, A | B | C. The
default is a split screen: each slot is a full render (scene + post) of one tree with the same camera, offset so the
tree sits in its slot (`setViewOffset`), into its own target, then composited by one quad. "Row" puts the three trees
side by side in one render. Camera presets at 2 m (the bark), 15 m, 40 m, 120 m and 400 m (the impostor; past 15 m a
longer lens keeps the tree in the frame, the distance is what the LODs see), a turntable, day / golden / night. The
panel (`viewer/panelUI.js`) chooses the species and each side's bark and leaf source. Each slot shows its cost: texture
memory on the GPU, download size, the impostor atlas and its bake time. GPU A/B buttons (5 alternating rounds) on a
row of 50, the 4,552-tree forest patch, one tree's bark at 2 m and one crown at 15 m (full frame), and a pop meter over
the LOD walk per side.

**Every option goes through the whole chain**: `makeSpecies` with the option's `def.bark` and `params.leafAtlas`, so
the LODs, morph, depth pre-pass, shadows and the **impostors are re-baked from the textured tree** (the bake reads the
spray's alpha, colour and normals: vendor CHANGES #16, `viewer/impostors.js`).

### The options

| | A (today) | B | C |
|---|---|---|---|
| **Plane bark** | procedural TSL (`planeBark`) | CC0 scan **ambientCG Bark009** (the camouflage: pale under-bark, peeling plates) | Bark009 + **Poly Haven `bark_platanus`** at the foot (the old dark flaking bark), ragged boundary; B3: `bark_platanus` alone |
| **Beech bark** | procedural (`beechBark`: eyes, lichen, algae) | CC0 scan **Poly Haven `chinese_hackberry_bark`** (smooth, pale lichen spots), graded to beech grey | + **ambientCG Bark005** at the foot (mossy, algae green); B3: Bark005 alone |
| **Leaves** (both) | procedural canvas mask (512 px RG) | spray **baked in Blender from modelled leaves** (`tools/blender/leafAtlas.py`) | the same spray of **CC0 scanned leaves** (ambientCG LeafSet010 for the plane: green maple, palmate; LeafSet024 for the beech) |
| Megascans | | | **slot only** (bark C / leaves D): not available locally. The owner is claiming them on Fab (Beech Bark, European Beech leaves, Norway Maple, ...). Fab Standard License, NOT CC0: lab only, never committed raw. Drop the exports in `data/raw/textures/trees/megascans/<asset>/` and add them to `tools/textures/process_tree_textures.py` |

No AI-generated textures; no image search. Sources and licences: `CREDITS.md` ("Tree textures");
`viewer/trees/textures/tree_textures.json`.

**How the bark scans are mapped** (`viewer/treeTextures.js scanBark`). The bark mesh has no uv, so the mapping is
**triplanar in the tree's own space** (the trunk, the limbs and the root flare take it without seams, and it turns
with the tree), with normals blended UDN-style. The scan is graded to the species' mean bark colour (its luminance,
plus half the hue; the beech 85 % of the hue, the hackberry being warmer than a beech). Then the species' **macro
variation** goes on top, so the 1-1.8 m repeat never shows: noise zones of value and warmth at 1.7 m and 0.45 m; the
plane's old olive plates in big zones, more of them low down, **following the scan's own darker flakes** so their
edges are the scan's; the darker foot, the paler limbs; the beech's algae side. A second scan can take the foot.

**How the leaf sprays are made** (`tools/blender/leafAtlas.py`, Blender 5.0 headless, Cycles, ~10 s per species). One
card = one spray, as the procedural masks, in the same layout: the plane's 7 twigs with 9-11 alternate leaves and 34
loose leaves behind; the beech's 10 flat zigzag sprays with two-ranked leaves and 34 behind. Leaves are modelled:
- **plane**: palmate, 5 pointed lobes cut to about a third (the mask's star lobes read as flowers when modelled),
  teeth, a truncate base, 5 main veins radiating from the petiole;
- **beech**: ovate, pointed, with a wavy margin, a midrib and 7 parallel vein pairs;
- every leaf is cupped, folded along its midrib, arched, rolled and pitched (foreshortened), with petioles and twigs.

The passes are emission-only data (no lighting):
- albedo: each leaf's colour, lighter veins, darker toward the petiole, x a Cycles AO between the leaves;
- normal: camera space, veins as bump;
- thickness: blade 0.25 .. twig 1.

`--scan` builds the same sprays from the CC0 scanned leaves (each leaf a bent grid quad showing one leaf of the atlas,
with its own normal map). `tools/textures/process_tree_textures.py` then:
- rounds the cluster off;
- bleeds the colour under alpha 0;
- builds **coverage-preserving alpha mips** (each level keeps the share of texels >= 0.5: far leaves do not thin out,
  and the per-species impostor alpha boost and alpha-to-coverage work as before);
- encodes KTX2 UASTC + zstd with those mips (`ktx create --levels`).

In the shader (vendor CHANGES #16), the species keeps its palette (top / bottom colours, tint, occlusion). The spray
multiplies it by its own colour around its mean, bends the clump's dome normal by the spray's normals, and lets the
light through by 1 - thickness.

### Look (side-by-sides with Wikimedia Commons photos, `docs/trees/textures/`)

| File | What |
|---|---|
| `sbs_plane_bark.jpg` | photo (Adrian Tync, CC BY-SA 4.0) / lab at 2 m, midday, crown shade: A, B, C |
| `sbs_plane_leaves.jpg` | photo (Fanghong, CC BY 2.5) / lab at 15 m: leaves A, B, C |
| `sbs_beech_bark.jpg` | photo (Fraxinus Croat, CC BY-SA 3.0) / lab at 2 m: A, B, C |
| `sbs_beech_leaves.jpg` | photo (T. Kebert, CC BY-SA 4.0) / lab at 15 m: leaves A, B, C |
| `sbs_beech_tree.jpg` | photo (T. Kebert, CC BY-SA 4.0) / the open-grown beech at 40 m |
| `lab_*_40m.jpeg`, `lab_*_400m_impostor.jpeg` | the three sides at 40 m and as impostors at 400 m |

The composites with a CC BY-SA photo are shared under the same licence.

- **Plane bark.** B is the clear win at 2-15 m: real flake edges, relief and the pale / olive camouflage of the photo.
  A reads as flat vector blobs with outlines. C adds the dark scaly foot of old planes. It is right for the big old
  trees of Saint-Job, wrong for young avenue trees.
- **Beech bark.** B (hackberry, graded to grey) has the photo's smooth skin with pale lichen spots and fine horizontal
  wrinkles. A is cleaner and more regular (its eyes are good; B has none). B is better close up; at 40 m and beyond
  they are the same.
- **Leaves.** At 15 m B and C show individual leaves with real outlines, veins and their own normals. The crown's
  underside, which A leaves almost black in high sun (§6), gets lit leaf by leaf. C (scans) has the most natural colour
  variation; B the right leaf shapes for each species (the CC0 leaf for the plane is a maple; the beech's LeafSet024 is
  round-ish, close). From 40 m the three are nearly the same. The impostors at 400 m look the same as each other, and
  each matches its own near tree (no colour or shape jump).

### Cost

GPU ms per frame (r187 timestamps, 1500 x 800, pixel ratio 1), A/B alternated in one page, 5 rounds, B minus A.
**The GPU was shared**: the owner's Tree Lab tab (port 8785, the 4,552-tree beech forest) was rendering the whole time
and was not touched. The medians carry its load, so the table gives the **10th / 2nd percentile per round** (the frames
it did not slow down), with the spread over the rounds. "control" is A against an identical A, the noise floor.

| Test (one option changed against A) | Plane: B - A, ms | Beech: B - A, ms |
|---|---|---|
| one tree, bark at 2 m, full frame: control | +0.18 (-0.07 .. +0.46) | -0.07 (-0.46 .. +0.13) |
| ... bark B (CC0 scan) | **-0.18** (-0.33 .. -0.07) | **-0.45** (-0.66 .. -0.33) |
| ... bark B2 (two scans) | -0.14 (-0.33 .. 0) | -0.43 (-1.18 .. +0.46) |
| one tree, crown at 15 m, full frame: control | -0.01 (-0.2 .. +0.13) | +0.05 (-0.07 .. +0.13) |
| ... leaves B (Blender) | **-0.20** (-0.26 .. -0.13) | **-0.08** (-0.13 .. -0.07) |
| ... leaves C (scans) | -0.17 (-0.33 .. 0) | -0.10 (-0.13 .. -0.07) |
| row of 50, bark B | -0.39 (-0.66 .. -0.26) | -0.26 |
| row of 50, leaves B | -0.39 | +0.22 |
| row of 50, leaves C | -0.12 | -0.23 |
| **row of 50, all B (bark + leaves)** | **-0.45** (-0.66 .. -0.33); 3.41 -> 2.95 ms at p2 | **-0.21** (-0.26 .. -0.07) |
| forest patch (4,552), any option | inconclusive: control ±2-5 ms | inconclusive |

The textured options are **not more expensive; they are slightly cheaper**:
- the plane's procedural bark is ~15 noise evaluations per pixel against 6 compressed texture fetches and 4 noises;
- the scan sprays are BC7 (1 byte per texel), where the procedural mask is an uncompressed RG8 (2 bytes).

In the forest patch most trees are LOD 2 and impostors. The impostor material is unchanged and the leaf shader changes
by one fetch, so no difference is expected there. On a shared GPU the patch is bimodal (frames at ~7.5 or ~14 ms),
and its runs could not separate anything from the control. **Re-run the two forest buttons on a free GPU** before
committing to the forest.

**Memory and download** (1024 px, KTX2 UASTC + zstd; on the GPU BC7 / ASTC, 1 byte per texel with mips):

| Option | GPU | Download |
|---|---|---|
| procedural bark | 0 | 0 |
| procedural leaf mask (built at load) | 0.67 MB (512 px RG8 + mips) | 0 |
| bark scan (albedo + normal / roughness / AO) | 2.7 MB | 2.3-2.5 MB (Bark009 2.4, bark_platanus 2.5, hackberry 2.2, Bark005 2.4) |
| two bark scans (B2) | 5.3 MB | 4.7 MB |
| leaf spray (albedo + alpha, normal + thickness) | 2.7 MB | 1.0 MB (Blender), 1.1-1.2 MB (scans) |
| impostor atlas (any option, re-baked) | 64 MB, as before | 0 |

So a species with both B textures costs **5.3 MB of GPU memory and ~3.4 MB of download**, once for every tile. That
is ~8 % of its own impostor atlas.

**LOD walk** (pop meter, frozen view, 60 steps 2 -> 1,200 m, the tree from 45 m with a 40° lens, golden hour; the
largest step / the worst jump over its neighbours, %):

| Band | Plane A | Plane B | Plane C | Beech A | Beech B | Beech C |
|---|---|---|---|---|---|---|
| morph 1, 20-50 m | 0.86 / 0.41 | 0.79 / 0.39 | 0.95 / 0.43 | 1.24 / 0.66 | 1.10 / 0.58 | 0.84 / 0.42 |
| morph 2, 70-135 m | 0.98 / 0.33 | 0.89 / 0.33 | 1.04 / 0.36 | 1.35 / 0.51 | 1.21 / 0.46 | 0.96 / 0.28 |
| impostor, 330-420 m | 1.40 / 0.93 | 1.48 / 0.98 | 1.53 / 1.02 | 3.23 / 2.06 | 3.22 / 2.05 | 3.26 / 2.06 |
| dissolve, 760-1,120 m | 2.52 / 1.14 | 2.50 / 1.14 | 2.71 / 1.24 | 1.49 / 0.67 | 1.49 / 0.67 | 1.44 / 0.64 |

The textured sides walk exactly like A (within ±0.15 %): the re-baked impostors keep each option's shape and colour,
and the coverage-preserving alpha mips keep the far crowns as full as the procedural mask's. The numbers are larger
than §2's because the tree fills more of this frame. The beech's 2 % impostor step is the same with every option: it
is the chain's own, a thing to look at separately.

### Recommendation

- **Plane: take B for the bark** (Bark009 with the macro variation), and B2 (the `bark_platanus` foot) for old trees
  only (Saint-Job, Av. Churchill), as a per-variant choice. **Leaves: B** (the Blender spray): the plane's own leaf
  shape, lit undersides, and no extra cost. If the owner's Megascans "Norway Maple" or a real plane leaf set arrives,
  re-run `leafAtlas.py --scan` with it (option C) and compare. The CC0 maple scan (C) has the best colour but is a
  maple.
- **Beech: take B for the leaves** (modelled sprays: the right leaf, cheaper or equal). **The bark: B (hackberry
  graded to grey) close up**. Better still, keep the procedural eyes on top: a scan with no branch scars is not quite
  a beech. That is the next step, as is the Megascans "Beech Bark", which is the obvious C when it lands.
- **Street trees: keep A** (the baseline; their mask is drawn for a generic broadleaf).
- **Memory budget**: 5.3 MB per species, a fraction of each species' 64 MB impostor atlas. Download ~3.4 MB per species.
- **Before the city**: re-run the forest benchmarks on a free GPU, check night (no texture-specific issue seen), and
  fix the pre-existing issues below.

**Found on the way (pre-existing, every option, A included):**
- the open-grown beech's impostors at 400 m in high sun show diagonal stripes (self-shadow acne at a long lens,
  `lab_beech_400m_impostor.jpeg`); golden hour is clean;
- the procedural plane bark shows dotted dark outlines on its plate edges at 2 m in low sun;
- the split screen's clouds look blocky (the sky's low-resolution clouds do not follow `setViewOffset`): the lab only.

## 5. Changes outside the lab (all leave the city's picture as it was)

- (tree textures, §4b) **Vendor #16** `params.leafAtlas`: absent by default, so no leaf shader changes. In
  **`viewer/impostors.js`** the bake reads `shared.leafAtlas` only when it is set. **New, lab only**:
  `viewer/treeTextures.js` and `viewer/trees/textures/`. The Tree Lab and the city were checked after the change
  (both boot with no errors; the city at Saint-Job is as before).

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
  relief, the fine moss and lichen and the warm colour of the photo (`sbs_bark.jpg`). Answered in §4b: a CC0 scan,
  triplanar, with the plane's macro variation, looks better and costs less.
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
  - Copper beech ('Atropunicea'): done as its own species (2026-11-14, lab only, factory textures, seasons, the
    impostor kit): `docs/trees/COPPER_BEECH.md`.
- **Pollards in summer** are fine at street distance. The knuckles are coarse up close: lumpy rings, not burls.
- **Seasons** are a hook only: near LODs only, and the atlas would need a rebake per season. **Wind** sways the whole
  crown and its cards, with no branch hierarchy, and the impostors do not sway.
- **Crown fit to the LiDAR.** Scaling uses the height only. The plane's crown radius at a given height is fixed per
  variant (the "fit" line shows, for example, 10.4 m model against 7 m LiDAR). A variant could be chosen, or the crown
  stretched, from the LiDAR crown radius.

## 7. Next steps

1. **More species**: the beech is done (§3b), the copper beech and the horse chestnut too (lab only, factory
   textures, four seasons, the impostor kit: `docs/trees/COPPER_BEECH.md`, `docs/trees/HORSE_CHESTNUT.md`); next
   the lime (*Tilia × euchlora*, common on the Uccle roads). For the city: one `makeSpecies` field per species per tile;
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

## 8. The leaf look of the factory-sprayed species, and their memory (2026-11-14, branch `claude/tree-look`)

Lab only (the copper beech and the horse chestnut). The plane, the beech and the city's street trees are unchanged:
the city at Saint-Job loads clean with the same street trees (`docs/trees/look/city_stjob_unchanged.jpg`).
The owner: "the trees are cool" but "your foliage looks a bit weird" next to the old trees, and "I hope they are not
too heavy for the city". Code: `viewer/treeLeafLook.js` (new), hooked through `def.leafLook` in `makeSpecies`, and the
species' `look` option (`copperBeechDef` / `horseChestnutDef(seed, tex, { look })`, default on). The lab keeps the
species as first merged as `copperbeech0` / `horsechestnut0` ("before the look": species list + A/B buttons), and
`?look=0` puts the "before" under the plain names. Live knobs: `window.lab.LOOK` (uniforms).

### What changed in the look

| problem (coordinator's analysis) | change |
|---|---|
| two styles mixed: a crisp photographic spray with its own per-leaf normal map (0.75) over the soft clump domes: stickers on balls | `fadingLeafAtlas`: the spray's per-leaf terms fade with the card's **pixel footprint** (the mip level from the uv derivatives, `log2(texels per pixel)` 1.7 -> 3.4: crisp to ~10 m, the plain clump dome from ~30 m; continuous, no distance band): its normal map (normalK x detail), each leaf's own colour (35 % of it kept far), the thickness in the light through. Node-valued `params.leafAtlas` fields: the vendor reads them unchanged |
| leaves too readable from far | the same fade (no per-leaf light and dark), and the **shade side lifted** (`fill` 0.5 -> 1.6 chestnut, 0.55 -> 1.6 copper; spring 1.15-1.3, autumn / winter 1.2-1.3): the gaps between the leaves are no longer black, so the leaf shapes stop reading as cut-outs on a dark ground |
| a hard, jagged crown silhouette | `softenRim`: the cards at the crown's silhouette (centre on the crown's outer shell, the shell seen edge-on) **shrink toward their centre** by a per-card random share (up to 35 %), continuous with the view (no pops), fading out over 140-260 m (the far LOD and the impostor bake keep the plain crown: the hand-over is untouched). The crown of each built tree comes in through an object uniform keyed by its shared index buffer |
| a heavy, closed, dark inside | `crownGaps`: outer pads left out in smooth clusters (chestnut 17 %, copper 8 %: the copper beech is a dense tree), their secondary branch kept (limbs show in the gaps); the inner layer thinned (18 % -> 8 % / 12 %); the occlusion floor up (0.45 -> 0.56, 0.55 -> 0.62); the chestnut's underside x 1.15 |
| a coral copper beech at golden hour | a wine-brown summer palette (`#42252a` / `#4a2a30`, was `#4e2a30` / `#4a2830`), less sheen (leaf roughness 0.7 -> 0.86: the warm low sun's sheen paled the maroon to salmon), a wine glow at 0.24 (was a coral `#d04a3c` at 0.35), a neutral fill; its secondaries and twigs darker than the silver bole (pale lines read as straw through the new gaps) |

Measured and dropped (softer still, but): eroding the rim cards' ALPHA left dithered "dust" where the cut alpha lay
flat near the threshold; a mid-range alpha mip bias (+0.6) and a wider coverage ramp (x 2.5) tripled the flicker test's
blinking pixels (the Drève near 79 -> 175 ppm); building the outermost cards 25 % smaller (CPU) raised it from 48 to
79 ppm (more, smaller leaf-sky edges). None of them ships.

Screenshots (`docs/trees/look/`, 1400 x 850, 50 deg lens, the camera on the sunny side; tiles 5, 15, 40, 120 m, top row
before, bottom row after): `chestnut_midday_before_after.jpg`, `chestnut_golden_before_after.jpg`,
`copper_midday_before_after.jpg`, `copper_golden_before_after.jpg`; `old_street_tree_vs_new.jpg` (the city's street tree
against the new chestnut at 15 / 40 m); `seasons_after_40m.jpg` (chestnut spring, copper autumn);
`kit_city_vs_lab_450m.jpg` (the far kit, below); `city_stjob_unchanged.jpg`.

Against the old street tree: both now read as soft, lit clumps with a gradient from top to bottom; the new trees keep
their leaf shapes at the edge and up close, the old one has smaller, simpler leaves. Against reference photos
(Wikimedia Commons; looked at, not stored, not traced):
- [Aesculus hippocastanum Paris 3](https://commons.wikimedia.org/wiki/File:Aesculus_hippocastanum_Paris_3.jpg)
  (Awinch1001, CC0): looking up into a street chestnut: sky through many gaps, dark sinuous limbs. Our 5 m view now has
  the gaps and the limbs, but our limbs are paler and straighter, and the real leaves seen from below glow yellow-green
  with the light through them (ours stay mid green: the translucency only works toward the sun).
- [Fagus sylvatica 'Atropunicea' - Mariemont 1](https://commons.wikimedia.org/wiki/File:Fagus_sylvatica_%27Atropunicea%27_-_Mariemont_1.jpg)
  (Jean-Pol Grandmont, CC BY 3.0): sunlit copper beech leaves really are orange-copper in a low sun; what read wrong
  before was the pale, pinkish sheen, not the warmth.
No Street View look this round.

### Memory

Before, each factory species had TWO far-tree atlases: the impostor kit's (16 x 16 hemi views x 64 px, 6 variants, two
RGBA8 arrays with mips: **63.8 MB**) and the old `viewer/impostors.js` atlas that `makeSpecies` still baked although
nothing drew it once the kit was on (**64 MB**).
- **No old bake** for species whose far trees are the kit (`def.noImpostorBake`; the lab turns it back on for
  `?farkit=0`; the LOD chain's 4th slot then shows the kit's impostor).
- **A smaller kit atlas** (`LAB_KIT` in `labs/tree-lab.js`): 12 x 12 views x 48 px (40 inside the 4 px gutter), and the
  aux array (normal, depth, leaf / AO flag: smooth data) at **half size**, from the colour's mip 1 down (new `bakeAtlas`
  option `auxHalf`, the material samples it one level down; default off: the city's street-tree kit is unchanged):
  **12.3 MB** per species (576 x 576 x 6 layers, 3 levels). `?kit=city` bakes the city's preset (A/B).
- The lab loads a season's textures when it is picked (it preloaded all four of both species).

| per species | before | after |
|---|---|---|
| old impostor atlas | 64.0 MB | 0 |
| kit atlas | 63.8 MB | 12.3 MB |
| factory textures (one season) | 5.3 MB | 5.3 MB |
| built trees (6 variants x 3 LODs) | 3.4 MB | 3.1 MB |
| **far-tree atlases for 8 species** | **1,022 MB** | **99 MB** |

Far atlases + textures for 8 such species: ~1,065 MB -> ~141 MB. Whole-tab check with `nvidia-smi` (both species built
with their kits, street of 50, minus the blank tab; another agent shared the GPU, so +-100 MB): before +1,277 MiB,
after +634 MiB.

The hand-over with the smaller kit (`kit_city_vs_lab_450m.jpg`): the same crown, a little softer under a 5 deg
telephoto (10x the normal lens), much the same at 20 deg; the pop meter's impostor hand-over 1.16 % (copper; 1.27 %
with the city's kit). A shared atlas across species (one array, per-species layers) saves no bytes by itself (the
layers are the same) and needs per-layer shading params in `treeShade`: not done.

### Cost (lab, 2026-11-14, 1400 x 850)

**Triangles per tree** (mean of the 6 variants, before -> after): copper beech LOD 0 5,928 -> 5,737 (873 -> 777 cards),
LOD 1 2,128 -> 2,024, LOD 2 775 -> 723; horse chestnut LOD 0 4,590 -> 4,244 (860 -> 687 cards), LOD 1 2,024 -> 1,837,
LOD 2 760 -> 667. Draws unchanged (the Drève 76, the chestnut avenue 72). Shader: + a fwidth / log2 per leaf pixel and
~25 vertex ALU for the rim; no extra texture tap.

**GPU** (`tools/perf/preflight.ps1` YELLOW: the GPU 40 % busy at rest from another agent's tab, so read with care; A/B
alternated in one page, 5 rounds x 2.5 s, after minus before): street of 50, copper -0.30 ms (spread -2.1..+1.4),
chestnut +0.08 ms (-4.1..+2.5); the Drève (520 trees) -0.10 ms (-0.46..+0.26); the chestnut avenue (276) -0.12 ms
(-0.39..+0.07). No measurable cost; if anything cheaper (fewer cards).

**Flicker** (`labs/flickerTest.js`, 24 frames, strafe 0.6 mm, midday, before / after alternated in one page):

| view | copper beech | horse chestnut |
|---|---|---|
| near (eye height down the layout) | 48 -> 49 ppm | 24 -> 13 ppm |
| mid (150 m up, ~200 m away) | 70 -> 68 ppm | 22 -> 8 ppm |
| far (the kit's impostors) | 0 -> 0 | 0 -> 0 |

(The test's absolute numbers move with the lab's auto-exposure: compare within one run only.)

**LOD walk** (pop meter, copper beech, a 30 m tree at 45 m, 40 deg lens, max step change %): morph 0->1 0.62 (0.81
before), 1->2 0.92 (1.04), impostor hand-over 1.16 (1.27), the end dissolve 12.2 (14.5: the lab's lawn).

### Shared files touched (for the merge)

- `viewer/treesStylized.js` `makeSpecies.calibrate()`: `def.leafLook?.(shared, PARAMS)` after the `maxCardSpin` block;
  the old impostor bake skipped when `def.noImpostorBake` (`else if (useImpostors && renderer && !def.noImpostorBake)`).
  Species without either: unchanged.
- `viewer/impostorKit/bake.js`: option `auxHalf` (aux layers from level 1, their own size and level count; `bytes`;
  `atlas.auxHalf`). `viewer/impostorKit/material.js`: the aux taps one level down when `atlas.auxHalf` (`lodB`). Both
  default off: the city's kit and the impostor lab unchanged.
- `labs/tree-lab.js`: header; `LEAF_LOOK` import; `LOOK`, `kitDef`, `DEFS` (+ `copperbeech0`, `horsechestnut0`),
  `seasonTex` (lazy textures, replaces the two preload loops); `SPECIES_NAMES`; the field loop's `attachKit` by
  `sp.def.id`; `LAB_KIT` + `kitFor`; `buildChain`'s 4th slot (the kit's impostor when there is no old bake; label;
  dispose); panel (species list, the far-kit toggle disposes the factory species, async `rebuildSeasonal`, `FACTORY`,
  2 A/B buttons); `memText`; `window.lab` (+ `LOOK`, `rebuildSeasonal`, `seasonTex`).
- `viewer/treesCopperBeech.js`, `viewer/treesHorseChestnut.js`: the `look` option (shape: `gaps`, `inner`, `aoFloor`;
  def: `fadingLeafAtlas`, `leafLook`, `noImpostorBake`, fill; the copper beech's palette, roughness and twig colour).
  New: `viewer/treeLeafLook.js`, `docs/trees/look/`.

### Left

- The light through the leaves from BELOW (looking up into a crown, real leaves glow yellow-green); our translucency
  only works toward the sun.
- The chestnut's limbs: paler and straighter than the photos' dark, sinuous ones.
- The copper beech's thin secondaries still catch a low sun as bright lines in places.
- 12 x 12 x 48 is softer than 16 x 16 x 64 under a telephoto; if the city's views zoom past ~20 deg, 12 x 12 x 56
  (~16 MB) is the next step. KTX2 / BC7 for the kit atlas would cut another 4x but needs a GPU encoder.
- The look is a per-species choice: new species pass `look` (gaps, fill, rim) the same way.
