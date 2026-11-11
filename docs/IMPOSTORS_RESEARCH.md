# Impostors: why ours jitter, what others do, and a generic impostor kit

Research only (2026-11-11). No code was changed. Our code is cited as `file:line` on `claude/foundation`
(0aa4800) unless a branch is named. Outside claims carry a URL. Anything marked **(guess)** has not been measured.

---

## 0. One page for the owner

**What you saw.** Far trees shimmer while the camera moves, and the shimmer goes away when impostors are off. The code
supports that: three things in `viewer/impostors.js` change pixels from one frame to the next even when the tree
itself has not changed. Ranked:

1. **The far fade is a screen-space dither, and it covers about half of all impostor trees.** Past 800 m the
   impostors "dissolve" over 300 m (800 to 1,100 m) by dropping pixels with a noise pattern fixed to the screen
   (`impostors.js:38`, `:263-265`; `lodFade.js:90-98`). The pattern stays still on the screen while the trees slide
   under it, so different pixels of each tree switch on and off every frame. That is the "fizz". With trees spread
   evenly, the 800-1,100 m ring holds about 54 % of the trees drawn between 400 and 1,100 m (area of the rings; an
   estimate). The pop meter in the tree lab never caught this because it measures with a **frozen** view, and a
   screen-locked pattern does not move on a frozen view.
2. **The crown's edge is a hard cut-out made from a blurred, heavily processed alpha.** The atlas is baked without
   antialiasing (`:55`). Its mips are box-filtered across the whole atlas (`:156`). The alpha is then "unioned" over
   4 views, boosted by a guessed per-mip factor (`:228-242`), and turned into alpha-to-coverage with a 1-pixel ramp
   (`:259`, `alphaCutout.js:48`). A far tree is 10-60 px wide, so most of its pixels sit on that ramp. Any
   sub-pixel camera move flips their MSAA samples. This is the "halftone / hatched" pattern already noted in
   `docs/SMOOTH_LOD.md:85-87`.
3. **No depth, coarse views, 4-view blend.** There are only 8 x 8 views (`:40`, about 13° apart at the horizon). Four
   of them are blended without any depth or parallax correction (`:198-238`). As the camera moves, the leaf clusters
   of the 4 views slide against each other by 1-3 px and cross-fade: the crown "boils". It is slow rather than
   frame-to-frame, but it is visible while flying.

Smaller contributors: mip bleeding between cells (4 px of padding is 1 px at mip 2), the 350-400 m hand-over dither,
flat billboard depth, and a possible amplification through the haze, which reads one depth sample per pixel
(section 1).

**A 1-minute check (no code):** in the dev panel, set Smoothness → "fade-out band" to 0
(`viewer/smoothPanel.js:35`) and fly. If most of the far fizz disappears, cause 1 is confirmed. What remains is
causes 2-3.

**What the best systems do** (Unreal / Fortnite, Amplify, the Godot plugin, agargaro's three.js library):
- **3-view blending** on the octahedral triangle, not 4.
- **12 x 12 to 16 x 16 views.** Fortnite uses 12 x 12 at 2048².
- **A baked depth channel**, used both for a parallax offset (which stops the boiling) and for **writing real depth**
  (the impostor meets the ground and other trees correctly, and can cast shadows).
- **Padding plus dilation, and mips per frame**, so cells never bleed into each other.
- **Supersampled capture.**
- **A cut-out card** instead of a full square, against overdraw.
- **No screen dither without TAA.** They hide transitions with TAA, or make them where the impostor already matches
  the mesh pixel for pixel.

**Anderson Mancini's demo** (webgpu-octahedral-impostor.vercel.app) is a good **teaching** page: atlas, capture rig
and main view are linked, with 3-frame barycentric weights. It is not a production system. It has one frame triplet
for the whole field (a uniform), lighting baked into the colour (it cannot follow our sun), a plain uv lookup (no
ray-plane reprojection), no depth, no parallax, no normals, standard mips, and a WebGL `readPixels` bake. Worth
borrowing: its three-panel atlas / rig / main-view UI, for the lab's atlas viewer.

**Recommendation:** build a **new module `viewer/impostorKit/`** and an **Impostor Lab** with a jitter meter that
measures during a moving camera. Key choices:
- **Texture array**, one layer per variant.
- **Hemi-octahedral 12 x 12 or 16 x 16 views** with cells sized to the screen at the hand-over.
- **Supersampled GPU bake into a G-buffer** (albedo + coverage, normal + depth + AO, roughness / flags), relit live
  like today.
- **Per-cell coverage-preserving mips** (Castaño).
- **3-view barycentric blending with a one-step depth parallax**, and depth written out (pixel depth offset).
- **Alpha-to-coverage on one coherent alpha** (no union, no boost hack).
- **Fades that do not crawl:** a short hand-over at the distance where texel density matches the screen, an
  object-anchored dither, and a colour-into-haze far fade.
- **One instanced draw per atlas per pass**, with a cut-out card.

Trees first, then cars. For hero buildings an HLOD proxy mesh is probably the better tool than an impostor.

---

## 1. Diagnosis: why our impostors jitter while the camera moves

### 1.1 What the current system does (facts from the code)

| Aspect | Today | Where |
|---|---|---|
| Layout | hemi-octahedral, 8 x 8 views, 128 px cells, 4 px pad, 1024² per variant, 6 variants in one 2048 x 3072 atlas pair (~64 MB with mips per species, `claude/tree-lab:docs/TREES.md` §2) | `impostors.js:40`, `:53` |
| Bake | GPU, straight into the atlas, **1 sample** (no MSAA / supersampling), leaves cut at mask 0.5 (binary) | `:55`, `:83-85` |
| Channels | albedo + coverage; normal + AO / leaf flag (RGBA8 x 2); **no depth** | `:64`, `:83-87` |
| Mips | `generateMipmaps` over the **whole atlas** (crosses cells and variants), plain box filter | `:56-58`, `:156` |
| View choice | per instance: direction from the tree's sphere centre to the camera (continuous, the same for the whole quad: good) | `:191-196` |
| Blending | **4 views, bilinear** on the grid square, each sampled at the view ray ∩ that view's plane through the centre (Brucks' virtual plane, good) | `:198-220` |
| Alpha | weighted alpha, **union** with `max(a_i · smoothstep(0.02, 0.2, w_i))`, times `(1 + 0.3 · mipLevel)` | `:228-242` |
| Edge | alpha-to-coverage, "sharpened" ramp `(a - 0.5)/fwidth(a) + 0.5` | `:259`, `alphaCutout.js:45-55` |
| Billboard | camera-facing quad (spherical), size = sphere radius, depth = **flat plane** through the centre | `:176-182` |
| Fades | LOD 2 → impostor over 350-400 m and impostor out over **800-1,100 m**, both by **screen-space IGN dither** (`keepBand`) | `:36-39`, `:263-265`, `lodFade.js:89-98` |
| Passes | depth pre-pass (cut-out + dither) then lit pass with depth EQUAL | `:276-298`, `:313-328` |
| Shadows | no casting by default; receiving with the lookup shifted 0.85 R toward the sun | `:331`, `:272` |
| Instances | per tile, re-bucketed every 5 m of camera motion, with a 6 m slack | `:336-356` |

### 1.2 Ranked causes

**1. Screen-locked dither in the far dissolve band (HIGH).**
- **Evidence.** `IMP.endBand = 300` (`impostors.js:38`), and `maskNode = keepBand(lo, 1 - rampTo(d, end, endBand))`
  (`:265`). The noise is `screenCoordinate`-based IGN (`lodFade.js:90-93`). The header itself says "Static (no TAA
  here): during a fade a fine pattern, never a flicker" (`lodFade.js:72`). That holds only while the camera is still.
  When the camera moves, the tree moves across the fixed threshold pattern, so the kept subset of its pixels changes
  every frame. A 1-2 px crown feature at 1 km is kept in one frame and dropped in the next.
- **Coverage.** The band spans 800-1,100 m. Assuming even density, it holds (1100² − 800²)/(1100² − 400²) ≈ **54 %** of
  the impostor trees (estimate). On far-LOD tiles the impostors use `nearFade: false` but the same far band
  (`:264-265`, `treesStylized.js:269`), so every far tile shows it.
- **Why the lab missed it.** The tree-lab pop meter measures a frozen view while only the LOD camera walks
  (`claude/tree-lab:docs/TREES.md` "Pop meter, frozen view"; `docs/SMOOTH_LOD.md:106-117` says moving-camera
  sequences "cannot be scored this way"). Screen-space patterns are invisible to that metric by design.
- **Test.** Dev panel "fade-out band" = 0 (`smoothPanel.js:35`), or `?impend=3000`. Either one moves the band out of
  view.

**2. Alpha-to-coverage on an aliased, box-mipped, heavily processed alpha (HIGH).**
- **Bake aliasing.** The bake renders 1 sample per texel (`:55`). The leaf cards are cut at 0.5 (`:83`, `:85`), so
  each cell is a staircase of 0/1 coverage. Unreal asks for capture resolution ≥ 2x the final frame size so the
  frames are supersampled
  (https://dev.epicgames.com/documentation/en-us/unreal-engine/impostor-baker-plugin-in-unreal-engine).
- **Mips.** `renderer.backend.generateMipmaps` box-filters the whole atlas (`:156`). The alpha of a leafy crown falls
  with each level (Castaño's problem: the share of texels passing the test drops,
  https://www.ludicon.com/castano/blog/articles/computing-alpha-mipmaps/). The fix in use is a guessed
  `1 + 0.3·mip` boost (`:240-242`). On the tree-lab branch that factor had to become per-species, because it turned
  whole plane quads opaque (`claude/tree-lab`, commit 932b30c). game-engine-v1 already has the proper fix,
  coverage-preserving mips (`game-engine-v1/v3/render/foliage/alphaCoverageMips.js`), and per-cell mips plus dilation
  in its impostor bake (`octahedralCore.js:50-200`). Ours dropped both.
- **Union alpha.** `alphaU = max(a_i · smoothstep(0.02, 0.2, w_i))` (`:234`) keeps every view's silhouette. That is
  good against holes, but a view's leaves switch in or out of the crown as its weight crosses 0.02-0.2.
- **Coverage ramp.** `(a − t)/fwidth(a) + 0.5` (`alphaCutout.js:48`). The `fwidth` of this composite alpha (max,
  smoothstep, mip boost, 4 bilinear taps) is large and noisy inside 2x2 quads. At 10-60 px per tree most of the
  crown is "edge", so most pixels carry fractional coverage. Fractional coverage turns into fixed per-pixel MSAA
  sample masks, which gives the halftone / hatched look (`docs/SMOOTH_LOD.md:85-87`). A sub-pixel move changes the
  texel phase, and the masks flip.
- **No toggles.** The viewer cannot turn this off for an A/B test. `alphaCutout.js:18-19` documents `?msaa=0 /
  ?a2c=0`, but nothing in `viewer/` calls `setAlphaCoverageDefault` (grep: no caller), and `impostors.js:259` passes
  `coverage: true` explicitly anyway.

**3. No depth / parallax, coarse 8 x 8 views, 4-view bilinear blend: the crown "boils" (MEDIUM-HIGH while flying).**
- **View spacing.** 8 x 8 hemi-octahedral views (`:40`) means 7 intervals per 90° of azimuth on the horizon, about
  **13°** between neighbours (more on the diagonal).
- **Parallax error.** Each view is reprojected on a plane through the sphere centre (`:205-210`, correct for that
  plane only). Leaves at depth r off that plane land up to about r·sin(Δθ) apart in two neighbouring views: for
  r = 6 m, about 1.35 m.
- **On screen.** At 1500 x 800 px with a 55° FOV that is ~2.6 px at 400 m and ~0.9 px at 1,100 m. At pixel ratio
  1.5 on a 1080p screen it doubles (arithmetic from `main.js:528`, `:629`).
- **The blend.** The 4 weights (`:219-220`) change continuously with the camera, so the 4 misregistered images
  cross-fade and slide. The union alpha (cause 2) keeps all 4 silhouettes. The bilinear square always includes the
  diagonal view, which is √2 farther than the two others. Brucks, Unreal, Amplify, Godot, agargaro and
  game-engine-v1 all blend 3 views on the octahedral triangle.
- **What fixes it.** A baked depth gives a per-view parallax offset ("Single Sample Parallax" in Unreal's impostor
  material, same doc as above).
- **When you see it.** This shows as slow swimming rather than per-frame flicker. It is strongest when the camera's
  angle to the trees changes fast: flying with the birds, orbiting.

**4. Mip bleeding across cells and variants (MEDIUM-LOW).**
- **Padding.** `PAD = 4` px of a 128 px cell (`:40`, `:145`) is 2 px at mip 1, 1 px at mip 2 and 0.5 px at mip 3.
- **Mip levels in use.** A street tree's quad (2R ≈ 16 m) is ~30-60 px between 400 and 1,100 m against 120 px of
  cell content, so mip 1-2.5 with trilinear filtering.
- **What bleeds.** The atlas-wide mip chain (`:156`) mixes neighbouring views, and at block edges neighbouring
  variants, into each cell's border. The `inside` test (`:211`) only checks the sample centre, not the filter
  footprint.
- **Where it shows.** Crowns that fill their cell edge to edge (the plane's "black blocks", `claude/tree-lab`
  932b30c) get an edge that changes as the sample point slides.

**5. MSAA depth and post effects may amplify cause 2 (MEDIUM, guess: needs a lab A/B).**
- **The set-up.** The scene renders into a 4x MSAA MRT target with a depth texture (`post.js:33-38`). The sky haze,
  sun shafts and volumetric fog read that depth (`lighting.js:243-258`), and so do GTAO (`post.js:80-91`) and SSR.
- **The suspicion (guess).** In r187 WebGPU a multisampled depth texture stays multisampled (three.webgpu.js r187:
  depth textures keep `primarySamples = samples`), and a per-pixel read sees one sample. If so, on a crown edge the
  colour is the resolved average while the depth is either "tree at 1 km" or "whatever is behind". The haze or fog
  amount for that pixel then jumps between the two, frame to frame, as the coverage masks flip.
- **Why it would matter.** At 1 km the haze term is large, so a small coverage flicker would become a large
  brightness flicker.
- **Test.** In the lab: impostors with the post chain and haze on vs off, jitter meter on the same orbit.

**6. Hand-over dither at 350-400 m (LOW-MEDIUM).**
- **The mechanism.** Same screen-locked IGN (`:264`, `treesStylized.js:226`). The impostor is baked from **LOD 0 as
  built** (`treesStylized.js:265-267`: `lodScale = 0`), while LOD 2 at 350-400 m is a 40-card morph with cards grown
  to 1.7x (`docs/SMOOTH_LOD.md:69`). The two silhouettes differ, so the 50/50 pixel split shows two different crowns
  interleaved, and the interleave crawls under motion.
- **Share.** About 7 % of the impostor trees (the 350-400 m ring, estimate).

**7. Flat billboard depth (LOW).**
- **Quad orientation.** Each quad faces the camera from its own centre (`:176-182`), so neighbouring quads are not
  parallel and turn as the camera moves.
- **Effect.** Where crowns overlap on screen, which crown wins a pixel is decided by two rotating planes, so the
  dividing line slides. The quad's lower half also cuts through the ground and houses at an angle that changes with
  camera height.
- **Fix.** A pixel depth offset from a baked depth.

**8. Received shadow steps (LOW).** The shadow box changes size in x1.5 steps (`docs/SMOOTH_LOD.md:90-91`). The
impostors that receive shadows (inside the 400 m box) see the texel size change at once. The receiver shift of
0.85 R toward the sun (`:272`) is a hack that a depth channel would replace.

**Checked and ruled out:**
- **Nearest-view snapping.** We blend continuously from a per-instance direction (`:191-196`).
- **Per-instance LOD pops.** Re-bucketing every 5 m has 6 m of slack, and the fade is computed in the shader
  (`:336-347`).
- **Float precision.** Local coordinates stay within ±4.5 km (`data/tiles/manifest.json` studyBox, local x/z), and
  the depth buffer is reversed-Z (`main.js:527`).
- **The pole up-vector.** It only matters near the zenith (`:178-179`).
- **Re-ordering of instances.** Opaque, depth-tested.
- **The "still camera" part of the 2026-11-10 note** (`docs/TODO.md`): it does not come from the impostors, whose
  output is deterministic with a still camera. It is more likely the façade z-fighting from the same list
  (`docs/CITY_MESH_AUDIT.md`), or a moving sun or clouds.

---

## 2. Survey

### 2.1 Summary table

| System | Layout and grid | View blending | Depth / parallax / depth out | Alpha and edges | Hand-over | Atlas | Lighting |
|---|---|---|---|---|---|---|---|
| **Ryan Brucks, ImpostorBaker (UE4 plugin → built into UE)** | full sphere, upper hemisphere, or "traditional billboards"; FramesXY 16 → 256 frames; **Fortnite: 12 x 12, 2048²** | **3 nearest frames** on one sprite; 1 frame on mobile | captured depth; parallax modes None / Single Sample / Iterative / Full Iterative "depth derived weights"; PDO for intersections | **distance-field alpha** in BaseColor.a, "Mask Offset" grows or shrinks it; capture res ≥ 2x frame size; mip chain also generates the **cut-out sprite geometry** | dithered billboards; LOD actors (HLOD) in Fortnite | 2048 typical | G-buffer capture (BaseColor, Normal, Spec/Rough/Opacity/Depth...), relit; world colours stripped so it can be **tinted at runtime** |
| **Amplify Impostors (Unity)** | Spherical (no smooth blend), Octahedron, HemiOctahedron (more resolution per view); Axis Frames up to 32 (now 64) | "smart blending" between views (octa / hemi) | "Depth-write for object intersections"; HDRP offsets depth | **Pixel Padding** (bleed margin, e.g. 32 px, against mip artefacts); generated mesh with **4-16 vertices** | Unity LOD Group | user-set | baked G-buffer channels, relit |
| **Godot (wojtekpil)** | full or hemi; grid 16 recommended | **3-frame "quad blend weights"** | depth in norm_depth.a, single-step offset `uv -= view.xy/view.z · depth · depth_scale`; depth-prepass mode | alpha clamp + `pow(a, clamp)`; mips **only in the texture-array variant** | n/a | base, norm_depth, orm PNGs | relit (normal, ORM) |
| **agargaro / three.ez octahedral-impostor (three.js, WebGL GLSL)** | hemi or full; 16 x 16 at 2048 in the demo | 3 frames, triangle weights in the vertex shader, ray-plane UVs per frame | bake has **normal + depth** (MRT); **parallax code disabled** ("disable it for now") | discard under `alphaClamp`, early-out on the dominant frame; colour un-premultiplied; no padding found | n/a (author against dither fades) | albedo + normalDepth | relit with patched MeshStandardMaterial |
| **game-engine-v1 octahedralCore.js (owner's engine)** | hemi or full, grid param, cellPad 4 | 3 frames (bary) **or dominant (default)** or IGN-dither selection | depth atlas + 3-step iterative parallax (off by default), depth-based AO | **per-cell alpha-weighted mips + 8-iteration dilation**, fwidth smoothstep edge, 2x supersample + AA in the bake | per-instance dither band | color, normal, RM, depth | relit |
| **Ours, viewer/impostors.js** | hemi 8 x 8, 128 px cells, PAD 4 | **4 frames bilinear**, per-pixel ray-plane | **none** | union alpha + mip boost + A2C; atlas-wide box mips; 1-sample bake | **screen IGN** dither 350-400 m and 800-1,100 m | 2048 x 3072 x 2, ~64 MB | albedo + normal / AO / flag, **relit live** (good) |
| **Anderson Mancini, WebGPU demo (R3F + TSL, three r185)** | hemi (full available), grid 8 / 16 / 32 (default 8), atlas 4096 | 3-frame barycentric, computed **on the CPU once for the whole field** and passed as uniforms | none | `alphaTest 0.28` + `alphaToCoverage`, 2 px colour dilation, up to 4 px edge-clamp padding, standard mips | none | one RGBA texture | **lit bake** (ambient + 2 directional lights baked in) |
| **Meep (Usnul)** | full or hemi, variable grid | "best approximation" | **ray-marches depth**, writes depth, casts shadows; deferred G-buffer reconstruction (MO95 / TSK07) | n/a | Usnul: no fade needed if the swap happens where the impostor ≤ bake resolution | albedo, normal, PBR, AO, depth | relit |
| **Cinevva "open world in the browser" part 19 (three.js)** | tried octa, then az/el, finally hemi-octa 12 x 12 (~9 MB); odd N gives a 0° row | bilinear 2x2 = 8 taps | (deferred to part 20) | from source alpha | n/a | ~1.6-9 MB | unlit albedo + world normal, relit (MeshStandardNodeMaterial) |

Sources for the table:
- Unreal: https://dev.epicgames.com/documentation/en-us/unreal-engine/impostor-baker-plugin-in-unreal-engine and
  https://80.lv/articles/impostor-baker-for-ue4/. Brucks' original post https://shaderbits.com/blog/octahedral-impostors
  renders through JavaScript and could not be fetched here, so its content is cited through the Unreal docs and the
  secondary write-ups below.
- Amplify: https://amplify.pt/_AI, https://amplify.pt/?p=12334, and the 2018 manual translation
  https://www.bilibili.com/read/cv1453281/ (Axis Frames, Pixel Padding, Max Vertices 4-16). The official wiki
  returned 403.
- Godot: https://github.com/wojtekpil/Godot-Octahedral-Impostors (README and
  `addons/octahedral_impostors/materials/shaders/ImpostorShader.shader`, lines 139-241).
- agargaro: https://github.com/agargaro/octahedral-impostor (`src/shaders/impostor/*.glsl`,
  `src/utils/createTextureAtlas.ts`) and https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735.
- Mancini: https://webgpu-octahedral-impostor.vercel.app/ (shipped bundle `assets/index-i1HD56AT.js` read on
  2026-11-11).
- Meep: https://unpkg.com/@woosh/meep-engine@2.124.2/src/engine/graphics/impostors/octahedral/README.md.
- Cinevva: https://app.cinevva.com/blog/2026-05-04-open-world-browser-part-19-imposters.
- Arycama (texture array over atlas, 3-frame triangle, object-centre frame vector, divide in the fragment shader, PDO
  for shadows / SSAO): https://arycama.github.io/2024/10/05/Imposters.html.
- Zucconi (3 closest images): https://www.alanzucconi.com/2018/08/25/shader-showcase-saturday-7/.

### 2.2 Notes per system: what to borrow

**Brucks / Unreal ImpostorBaker / Fortnite.**
- **Upper hemisphere for ground objects.** Fortnite uses upper-hemisphere impostors for all its trees when Nanite is
  off, with 12 x 12 frames at 2048 (Unreal doc above).
- **3 frames on the octahedral triangle** (the grid square split along a diagonal), with weights from the
  barycentric position.
- **Depth.** Single-sample parallax is the cheap default. "Depth derived weights" (each pixel picks the frame whose
  depth agrees best) costs more and is the top quality setting.
- **Distance-field alpha plus a mask offset.** The edge is a distance, so it can be grown or shrunk uniformly at
  every mip.
- **Supersampled capture.**
- **Cut-out card.** An 8-triangle, 9-vertex card built from the union of every frame's alpha (doc: "Imposter: one
  sprite card with 8 triangles and 9 vertices"). It cuts overdraw.
- **Runtime tint.** Capture with world-dependent colouring stripped, so the impostor can be tinted at runtime. We
  already do the equivalent with `treeTint`.
- **Not ours to copy.** TAA hides Unreal's dithered transitions. We have no TAA (`lodFade.js:72`), so we cannot use
  them as they are.

**Amplify Impostors.**
- **Padding.** Large padding (32 px by default in the 2018 manual) against mip bleeding.
- **Generated shape.** A 4-16 vertex shape that trims overdraw.
- **Depth.** Depth written for intersections.
- **Spherical layout.** Explicitly described as having "no smooth blending between views"; avoid it.

**Godot plugin.**
- **Parallax.** The simplest working single-step depth parallax, one line of shader, worth copying as is.
- **Mips.** Only the texture-array variant has mipmaps, because array layers do not bleed into each other. That
  supports texture arrays.

**agargaro (three.ez).**
- **3-frame selection in the vertex shader.** It runs once per vertex, so it is cheap: weights `(min(1-x,1-y),
  |x-y|, min(x,y))` plus a diagonal flag, the same maths as game-engine-v1 (`octahedralCore.js:543-560`).
- **Dominant-frame discard.** It discards on the dominant frame before reading the other two, which saves taps.
- **Scale.** It instances 200k trees with a BVH in the demo.
- **Gaps.** Parallax disabled, WebGL only, no padding seen.
- **Overdraw.** The forum thread's tip from Usnul: a convex hull over the union of all sprites cut ~30 % of pixels
  with 5 vertices; per-sprite hulls do not help, because any pixel can come from any frame.

**Anderson Mancini's demo (assessed honestly).**
- **What it is.** A WebGPU / TSL / R3F single-page demo, three r185 per its bundle.
- **Bake.** A **WebGL** renderer (`readPixels` into a 2D canvas) captures each view with **lighting baked in**:
  ambient 5.55 plus two directional lights in the bundle. It cannot follow a moving sun, which is why we relight.
  It dilates colour by 2 px, pads cells by up to 4 px with clamped edges, and uses standard mips. The atlas is
  4096² and the grid 8 / 16 / 32 (default 8).
- **Runtime.** A `MeshBasicNodeMaterial`. The 3 frame indices and weights are **uniforms computed on the CPU from
  one direction for the whole field**, so all instances show the same frames whatever their position. Every
  instance gets the same rotation. Each frame is sampled at the quad's plain `uv()`, with no ray-plane reprojection.
  It uses alphaTest 0.28 with alpha-to-coverage, and has no depth, parallax or normals.
- **Verdict.** Excellent for explaining the technique. Its three linked panels (atlas with the active cell
  highlighted, capture rig on a hemisphere, main view) and its "billboard vs impostor, look from above" comparison
  are worth copying into the lab. As an engine piece it is below our current system.
- **Proof.** The bake (`Y_e`), sampler (`Mj`, `K_e`) and material (`vve`) were read in the shipped bundle; no
  source repo was found.

**game-engine-v1 (read-only).** It already contains most of the right ingredients:
- per-cell alpha-weighted mips plus dilation (`octahedralCore.js:50-200`);
- a 4-pass bake (colour, normal, RM, depth) with 2x supersampling (`:201-391`);
- 3-frame weights and 3-step parallax (`:543-612`);
- coverage-preserving alpha mips (`alphaCoverageMips.js`).

Our impostors kept only the grid maths. Its defaults (dominant frame, parallax off) are not what we want.

### 2.3 Alpha, mips and temporal stability (papers and articles)

- **Castaño, "Computing Alpha Mipmaps".** Per mip level, scale alpha so the share of texels passing the test equals
  level 0 (bisection). He notes the same issue with alpha-to-coverage.
  https://www.ludicon.com/castano/blog/articles/computing-alpha-mipmaps/. Already implemented in
  `game-engine-v1/v3/render/foliage/alphaCoverageMips.js`.
- **Ben Golus, "Anti-aliased Alpha Test: The Esoteric Alpha To Coverage"** (2017). It is the source of our sharpened
  ramp (`alphaCutout.js:12-13`). The ramp is right for a **single, coherent** alpha with sensible mips. It does not
  rescue a noisy composite alpha.
  https://bgolus.medium.com/anti-aliased-alpha-test-the-esoteric-alpha-to-coverage-8b177335ae4f
- **Wyman & McGuire, "Hashed Alpha Testing" (I3D 2017).** The threshold comes from a hash of **object-space**
  coordinates discretised at the pixel scale, so distant alpha geometry keeps a stable set of pixels and does not
  vanish. That makes it the reference for an object-anchored dither instead of a screen-locked one.
  https://research.nvidia.com/labs/rtr/publication/wyman2017hashed and
  https://developer.download.nvidia.com/assets/gameworks/downloads/regular/GDC17/RealTimeRenderingAdvances_HashedAlphaTesting_GDC2017_FINAL.pdf
- **Comparison of alpha-mip methods.**
  https://lisyarus.github.io/blog/posts/exploring-ways-to-mipmap-alpha-tested-textures.html
- **Billboard clouds.** Décoret, Durand, Sillion, Dorsey, "Billboard Clouds for Extreme Model Simplification",
  SIGGRAPH 2003 (from memory, URL not re-checked). A set of planes fitted to the mesh, an alternative for **buildings
  and cars**: real parallax, no view blending, but many planes and overdraw.
- **Relit G-buffer impostors.**
  - Max & Ohsaki 1995, "Rendering trees from precomputed z-buffer views", and Todt, Rezk-Salama & Kolb 2007, "Fast
    (Spherical) Light Field Rendering with Per-Pixel Depth": depth-per-view reconstruction, the basis of Meep's
    ray-march.
  - Bruneton & Neyret, "Real-time Realistic Rendering and Lighting of Forests" (Eurographics 2012, CGF): forests as
    pre-computed view-dependent data relit at runtime, with care for coherent LOD (from memory).
  - All three are cited by the agargaro thread above. Our "bake the shading inputs, relight live" design is in this
    family and is worth keeping.
- **Overdraw** (https://app.cinevva.com/blog/2026-05-11-foliage-overdraw, a secondary source):
  - the depth pre-pass with EQUAL is the standard answer; we have it (`impostors.js:276-298`);
  - `discard` costs early-Z, so pixel depth output must be paid only where it is needed;
  - sorting front to back helps Hi-Z.

### 2.4 three.js r187 building blocks (checked in the r187 build)

- **`RenderTarget` options.** `depth` (array layers), `count` (MRT), `useArrayDepthTexture`, and
  `RenderTarget3D` (three.core.js r187, `class RenderTarget`, around line 9131). `DataArrayTexture` and
  `CompressedArrayTexture` exist too. Together they allow a bake into an **array** (one layer per variant) with MRT,
  so all channels come out in one pass. Whether the layer is selected through `setRenderTarget(rt, layer)` on WebGPU
  must be verified in the lab **(to verify)**.
- **`material.depthNode`.** It writes `frag_depth` (three.webgpu.js r187 builds `output.frag_depth`), which gives a
  pixel depth offset. `alphaToCoverage` is supported on WebGPU.
- **Mips.** `renderer.backend.generateMipmaps` makes plain box mips. Per-cell coverage-preserving mips need our own
  compute (or render) pass, which `textureStore` and `storageTexture` in TSL allow.
- **Compression.** `KTX2Loader` works with WebGPU, but there is **no runtime BC / ASTC encoder**. Compressed atlases
  mean an **offline** bake (headless Chrome in `pipeline/`, then basisu) saved as KTX2.

---

## 3. Recommended design: `viewer/impostorKit/` (new, touches no existing file)

### 3.1 Modules

```
viewer/impostorKit/
  octa.js        grid <-> direction (hemi / full), 3-frame triangle + weights (CPU and TSL, one source of truth)
  bake.js        bake(renderer, source, spec) -> ImpostorAtlas   (GPU, MRT, array target, supersampled)
  mips.js        per-cell coverage-preserving mip chain + dilation (compute pass)
  material.js    impostorMaterial(atlas, opts) -> { depthPass, colourPass, shadowPass }  (TSL)
  field.js       instanced field: storage / instanced buffers per atlas, per-tile segments, culling, update
  fade.js        object-anchored dither, colour-into-haze far fade, hand-over helpers (uses lodFade's t)
  types.js       per object type presets (grid, cell px, channels, parallax, PDO, distances)
```

`source` is anything with a `bakeScene(viewDir)` hook. A tree species gives its LOD meshes and its bake materials,
which output shading **inputs**, as `impostors.js:66-87` already does. A car or a prop gives a mesh plus its node
material, with a generic G-buffer override (`mrt()` of albedo, normal, roughness / metal / AO, depth).

### 3.2 Key decisions

1. **Layout: hemi-octahedral by default, full octa as an option.**
   - **Why hemi.** Every object type we plan stands on the ground and is seen from above or level, and the
     hemisphere doubles the resolution of the side views. Views below the horizon clamp to the horizon row, which
     depth parallax corrects.
   - **Full octa** only for things seen from below (a statue on a high plinth, the observatory dome close up), and
     those are probably not impostor candidates.
   - **Grid edges.** Keep the grid points on the horizon (gx/(N−1) mapping, as today) so a 0° row exists. That is
     the "odd N / 0° row" lesson from Cinevva, already satisfied by the endpoint-inclusive mapping.

2. **Grid and cell size per type, from the screen at the hand-over.**
   - **The rule** (Usnul's): a cell should hold about 1 texel per screen pixel at the hand-over distance. Then the
     impostor matches the mesh at the swap, and every farther distance minifies, which mips handle.
   - **Example.** 1620 px viewport height (1080p at pixel ratio 1.5), 55° FOV, 400 m gives 3.9 px/m. A 16 m crown
     is then ~62 px, so **64-80 px cells**.
   - **Today** we use 128 px cells with 8 x 8 views, which is resolution spent where it is not needed and not where
     it is (angles).

   | Type | Grid | Cell px | Per-variant layer | Notes |
   |---|---|---|---|---|
   | Street / park trees | 16 x 16 hemi (12 x 12 if memory-bound) | 64 (+4 gutter) | 1088² | hand-over 400 m |
   | Parked cars | 12 x 12 hemi | 48 (+4) | 624² | hand-over ~150 m (4.5 m car ≈ 47 px) |
   | Park props (benches, kiosks) | 8 x 8 hemi | 32-48 | ≤ 416² | probably just distance-cull: few px at range |
   | Crowds | 8 x 8 hemi per pose, 2-4 static poses | 32 | 288² per pose | only static or idle far crowds (> 150 m); walking needs a skinned low LOD or vertex-animation textures, not octa |
   | Hero buildings | 12 x 12 hemi, 128-px cells, beyond ~1 km only | 128 | 1600² | **prefer an HLOD proxy mesh** (simplified mesh + baked textures): flat walls parallax badly in impostors and 2D memory explodes |

3. **Storage: one 2D texture array per type, one layer per variant (or per car model or building).**
   - Layers never bleed into each other, which removes cause 4 at block edges.
   - **Gutter.** Inside a layer, cells keep a gutter (4 px at level 0), filled by **dilation** of the nearest
     coverage, not by a clear colour.
   - **Mips** are built **per cell** down to 8 px a cell (game-engine-v1's `MIN_CELL_PIXELS_FOR_MIP` idea), and the
     sampler LOD is clamped to that level.
   - **Fallback.** If array MRT bakes turn out awkward in r187, use one atlas per type with per-cell mips. It is the
     same shader with a cell offset.

4. **Channels (G-buffer, relit live as today).**
   - **A:** RGBA8, albedo (linear) plus **coverage**.
   - **B:** RGBA8, octahedral-encoded normal (2 channels), **depth** (8 bit over the sphere diameter: 6 cm steps for a
     16 m tree, 16 cm for 40 m, enough for parallax and PDO), and AO.
   - **C** (optional per type): RGBA8, roughness, metalness, translucency / leaf flag, and a paint-tint mask for cars,
     so one atlas serves every paint colour.
   - **Cost.** Trees need A and B, as today plus depth. Cars need A, B and C.
   - **Lighting.** The colour pass runs the type's own lighting nodes. For trees that is today's leaf lighting
     (`impostors.js:246-258`): sun, sky, shadow, translucency, tint.

5. **Bake: GPU, MRT, supersampled, deterministic.**
   - **Supersampling.** Each view renders at 2x the cell size, with MSAA if allowed, into a temp target. A compute
     pass then resolves to the cell, with coverage = the share of covered sub-samples (a real fractional alpha, not
     0/1), dilates, and writes the layer. Unreal's ≥ 2x capture rule is the source.
   - **Hand-over source.** Bake from **the state the mesh is in at the hand-over**. For the trees that is LOD 2 as
     morphed at 400 m (or move the hand-over to a distance where LOD 2 = LOD 0's silhouette), so the 50/50 split shows
     the same crown (cause 6).
   - **Bake cost** is reported per type in the lab. Cache per session.
   - **Later:** an offline bake to KTX2 (BC7 for A, BC5 + BC4 for B, about 4x smaller).

6. **Coverage-preserving mips plus alpha-to-coverage on one coherent alpha.**
   - **Mips.** Castaño scaling per cell and per level, as in game-engine-v1's `alphaCoverageMips.js`, computed on the
     GPU.
   - **Runtime alpha.** The barycentric **weighted** blend of the 3 frames, after parallax has aligned them. Drop the
     union / max and the `1 + 0.3·mip` boost.
   - **Edge.** Golus' sharpened A2C ramp on that alpha.
   - **Option** (lab A/B): a **distance-field coverage** channel (Unreal's DF alpha plus mask offset). The edge then
     stays the same width at every mip, and a far crown can be thickened uniformly.

7. **Views: 3-frame triangle, computed per instance in the vertex shader. Parallax: one depth step per frame.**
   - **Vertex shader:** the direction from the instance centre to the camera picks the triangle (3 cells) and the
     weights (agargaro / game-engine-v1 maths). Per frame it also computes the virtual-plane ray hit (Brucks), with
     the perspective divide done in the fragment shader (Arycama).
   - **Fragment shader:** per frame, read depth once, offset the UV along the frame's view ray (the Godot one-liner),
     then read albedo and normal. That is 3 frames x (1 depth tap + 2 taps) = 9 taps, against 8 today.
   - **Saving taps.** Read the dominant frame first and discard early when its coverage is 0 (agargaro).
   - **Optional (lab):** "depth-derived weights", where each frame's weight is reduced when its depth disagrees with
     the dominant frame's. That is Unreal's top mode, and it kills ghosting at the cost of a few ALU.

8. **Depth output (pixel depth offset), per type.**
   - **What.** `depthNode` = the plane depth plus the blended baked depth.
   - **Why.** Correct contact with terrain, roads and houses; overlapping crowns sort per pixel instead of per plane
     (cause 7); correct shadow receiving (replaces `:272`'s 0.85 R hack); correct shadows cast from the depth.
   - **Cost.** It disables early-Z for that draw. The depth pre-pass pays it once. The EQUAL colour pass must compute
     **the same** depth. **(Risk:** WGSL has no `invariant` for `frag_depth`. If EQUAL fails on some GPU, the colour
     pass uses `LessEqual` with the same `depthNode`.)
   - **Per type.** On for cars, props and trees under ~700 m. Off for the far tree ring (sub-pixel benefit).

9. **Fades that do not crawl.**
   - **Hand-over.** Short (≤ 20-30 m) at the distance from decision 2, where impostor and mesh match. Keep `lodFade`'s
     **same `t`, complementary split** (the shadow pass reads `lodEye`, as today).
   - **The noise.** Replace the screen IGN with an **object-anchored** noise: Wyman-McGuire style, hashed from the
     pixel's position in the impostor's own frame plane (instance id plus plane uv quantised at the screen-pixel
     scale). The mesh LOD must use the **same** coordinates for the split to stay complementary: the ray from the eye
     through the pixel, intersected with the instance's camera-facing plane, which both shaders can compute from
     `lodEye`, the instance centre and the pixel ray. The pattern then moves with the tree, so nothing crawls.
     **(Guess:** complementarity under MSAA needs checking in the lab.)
   - **Far end.** No coverage fade. Fade the impostor's **colour** toward the haze colour at its distance (or toward
     the orthophoto's average for that tile), and remove instances only where the remaining contrast is under 1-2/255.
   - **Better still:** push the far end to ≥ 1.5 km with a **far ring** variant: dominant frame only, no parallax, no
     PDO, 1 tap per channel, cut-out card. That ring was 3.1 ms at 2,400 m for today's shader (`docs/SMOOTH_LOD.md:72`),
     and the new budget is in 3.4.

10. **Instancing and overdraw.**
    - **One draw per atlas per pass** (depth pre-pass, colour, shadow) for the **whole loaded city**, not one per
      tile: a single instance buffer per type with per-tile segments, refreshed when tiles stream (a free-list).
    - **Instance data:** position, yaw, scale, variant, tint seed, fade. In r187: `InstancedBufferAttribute`s as
      today, or a storage buffer.
    - **CPU work:** the 5 m re-bucketing becomes a per-tile visibility list. **(Later:** a compute cull that writes an
      indirect draw.)
    - **Cut-out card:** an 8-vertex convex hull of the union of every frame's coverage, per variant (Unreal, Amplify,
      Usnul's ~30 %), instead of a full square.

11. **Shadows.**
    - **Receiving:** from the PDO depth (decision 8).
    - **Casting, trees:** none past the tree shadow range (120 m today), unchanged. A **far-tree shadow**, if wanted,
      should be a cheap ground darkening baked into the terrain or orthophoto, not a shadow-map caster. Casting
      would put thousands of alpha-tested quads in the shadow pass, and `docs/SMOOTH_LOD.md:70` measured +3 ms for
      far casters.
    - **Casting, cars and props within the shadow box:** the impostor casts with frames chosen from the light
      direction, plus PDO. **(Guess:** about 0.1 ms for 300 cars, to measure.)

12. **Streaming.** The bake is per type, once per session, before the first tile that needs it. Tiles bring only
    instance segments. A far tile and its full tile share placements and variants (today's `buildFarTreeField`
    rule), so the swap changes nothing.

### 3.3 Memory budget (RGBA8, mips x1.33, uncompressed; KTX2 BC7 / BC5 would cut it by about 4x)

| Type | Layers | Layer size | Textures | MB |
|---|---|---|---|---|
| Street trees (6 variants, 16 x 16 x 64 px) | 6 | 1088² | A + B | 6 x 1088² x 8 B x 1.33 ≈ **76 MB** (≈ 43 MB at 12 x 12 x 64) |
| + plane, beech (6 variants each) | 12 | 1088² | A + B | ≈ 151 MB: too much uncompressed, so drop to 12 x 12 or 48 px cells for the far ring, or KTX2 |
| Cars (20 models, 12 x 12 x 48 px, paint mask) | 20 | 624² | A + B + C | ≈ 41 MB |
| Crowds (4 poses x 4 people, 8 x 8 x 32) | 16 | 288² | A + B | ≈ 14 MB |
| Hero buildings (3, 12 x 12 x 128) | 3 | 1600² | A + B + C | ≈ 41 MB, **if** not done as HLOD proxies |

Today: street trees 64 MB (`claude/tree-lab:docs/TREES.md`). **Target:** ≤ 150 MB of impostor textures for the whole
city while uncompressed, ≤ 50 MB once KTX2 lands.

### 3.4 Cost targets (guesses until the lab measures them, same GPU and window as `docs/SMOOTH_LOD.md` §5)

- **Forest, 400 m-1.5 km** (the overview view): ≤ 1.0 ms GPU for every impostor pass together. Today: ~0.9 ms to
  1,100 m. The budget pays for the extra parallax taps by cutting overdraw with the cut-out card and by the cheaper
  far ring.
- **Street of 300 parked cars, 150-600 m:** ≤ 0.3 ms with PDO.
- **Per pixel:** ≤ 10 texture taps and one lighting evaluation, after the depth pre-pass.
- **Bake:** ≤ 300 ms per tree species on the owner's GPU, measured and logged like `treesStylized.js:273`.
- **Jitter** (lab metric, 3.5 / 4): impostor flicker share during a slow orbit ≤ 1.2x that of the real LOD 0 mesh
  rendered at the same distance.

---

## 4. Impostor Lab spec (`labs/impostor-lab.html` + `labs/impostor-lab.js`, new files only)

- **Rules.** Own UI only (`viewer/panelUI.js`, never lil-gui), one Chrome tab, the city lighting
  (`viewer/lighting.js`) and post chain switchable. It imports `viewer/impostorKit/*`, and imports today's
  `viewer/impostors.js` read-only for the A/B.
- **Scenes:**
  - a single object on a turntable;
  - a row of 50 street trees from 300 to 1,500 m;
  - a forest patch (LiDAR M8, as in the tree lab);
  - a car park of 300 cars;
  - one hero building;
  - a "fly with the birds" scripted path at 60-150 m.
- **Object types:** tree species (street, plane, beech from `claude/tree-lab` once merged), a car model, a park prop.
- **Camera rigs.** Deterministic, with the lab's time frozen (dt = 0, as `flickerTest.js` does):
  - slow orbit around a target 400 / 800 / 1,200 m away (0.02-0.2°/frame);
  - strafe and dolly in sub-pixel steps;
  - rise;
  - the recorded bird path.
- **Jitter meter.** It builds on `labs/flickerTest.js` (branch `claude/stalle`, eebd3d6), which counts pixels whose
  luminance flips up-down-up past a threshold over consecutive frames, with a heat map. Additions:
  - **Impostor mask:** an extra render where only the impostors draw, in white, so the metric is restricted to
    impostor pixels and to a band around them (crown edges plus the haze behind).
  - **Second temporal difference:** mean |L(t+1) − 2L(t) + L(t−1)| over the mask. Smooth motion gives ~0, flicker a
    large value. It works during a moving camera, unlike the frozen-view pop meter.
  - **Reference:** the same path rendered with the real mesh (LOD 0) in place of the impostors. Report **jitter
    excess = impostor / mesh** for both metrics.
  - **Output:** numbers per distance band (400-600, 600-800, 800-1,100, > 1,100 m), a heat map, and the 5 worst
    16-px clusters.
- **Side by side.** A split screen (scissored viewports, same camera): left the impostor, right the mesh, plus a
  diff view (|impostor − mesh|, x4). There is also an "LOD colour" mode as in the tree lab.
- **Cost bench.** Per pass GPU ms (depth pre-pass, colour, shadow, post) through timestamp queries, with A/B
  alternations and medians, as in `claude/tree-lab:labs/tree-lab.js:482-499`. Also: bake ms per type, memory per
  type, impostor count, and draw calls.
- **Atlas viewer.** The current layer with its cell grid. The 3 active cells are highlighted with their weights for a
  picked instance. A capture-rig view shows the bake directions on the hemisphere. This is Mancini's three-panel
  idea, plus our channels (albedo / coverage / normal / depth / AO) and the mip level picker.
- **Toggles** (every cause in section 1 can be switched on and off on its own):
  - blending: legacy 4-bilinear, 3-bary, dominant;
  - parallax: off, 1-step, depth-derived weights;
  - PDO on / off;
  - A2C on / off, union alpha on / off, mip boost on / off;
  - mips: box, per-cell coverage-preserving;
  - bake: 1 sample, 2x supersampled;
  - fade: screen IGN, object-anchored, colour-into-haze;
  - hand-over band width;
  - grid 8 / 12 / 16 and cell px;
  - post chain, haze and fog on / off (cause 5);
  - cut-out card on / off.
- **A/B against today's system.** Build both from the same street tree variants: `bakeTreeImpostors` +
  `impostorMaterial` imported from `viewer/impostors.js` against the kit. Run the same path and the same metric, and
  print a one-line verdict table.

---

## 5. Phased plan

| Phase | Size | What | Done when |
|---|---|---|---|
| **0. Confirm** | S | No code: the dev-panel check (fade-out band 0, `?impend=3000`). Then a first lab cut that only wraps today's `viewer/impostors.js` and adds the jitter meter (mask, second difference, mesh reference). | the ranked causes in section 1 have numbers (jitter excess per toggle) |
| **1. Kit core** | M | `octa.js`, `bake.js` (MRT, array, 2x supersample), `mips.js` (per-cell coverage mips + dilation), `material.js` (3-bary, 1-step parallax, coherent alpha + A2C), `field.js` (one draw per atlas). Street trees only, in the lab. | jitter excess ≤ 1.2 on the orbit rigs; GPU ≤ today's at equal counts |
| **2. Depth and fades** | M | PDO (`depthNode`) + EQUAL safety, object-anchored hand-over dither (mesh side via a small shared helper in the kit, no edit of the vendor trees: the lab uses its own LOD 2 material clone), colour-into-haze far fade, far-ring variant, cut-out card. | no visible crawl in the hand-over or far band on the bird path; far end at 1.5 km within ~1 ms |
| **3. Trees migration** | M | **After the owner reviews `claude/tree-lab` and the tree branches.** Switch `treesStylized.js` (and plane / beech) from `impostors.js` to the kit behind a `?impkit=1` flag; bake from the LOD-2-at-hand-over state; A/B in the city at Saint-Job, the overview, the street and the bird path (the `docs/SMOOTH_LOD.md` §5 protocol); then make it the default and retire `impostors.js`. | owner's eye test passes while flying; GPU within ±0.3 ms |
| **4. Cars** | S-M | Car type preset (12 x 12 x 48, paint mask, PDO, casting inside the shadow box), hand-over with `carFleet.js`'s existing dithered LOD (`docs/SMOOTH_LOD.md` P1). | street of 300 cars ≤ 0.3 ms, no crawl |
| **5. Props, crowds** | S | Props: probably distance-cull only (the lab decides). Crowds: static poses only. | |
| **6. Buildings** | L | Compare an HLOD proxy mesh (meshopt + baked textures) against a 12 x 12 impostor for the heroes beyond 1 km; pick per building. | |
| **7. Compression** | M | Offline bake in `pipeline/` to KTX2 (BC7 / BC5) for the shipped types; runtime bake stays as the fallback. | ≤ 50 MB of impostor textures |

**Migration rule.** The kit lives beside `impostors.js` until phase 3 is signed off. No existing file is edited
before the owner has reviewed the tree branches. The lab is the only consumer in phases 0-2.

---

## Sources

- Epic, Impostor Baker plugin: https://dev.epicgames.com/documentation/en-us/unreal-engine/impostor-baker-plugin-in-unreal-engine
- 80.lv, Impostor Baker for UE4: https://80.lv/articles/impostor-baker-for-ue4/
- Ryan Brucks, Octahedral Impostors (2018): https://shaderbits.com/blog/octahedral-impostors (JS-rendered; cited via the above)
- Amplify Impostors: https://amplify.pt/_AI , https://amplify.pt/?p=12334 , manual translation https://www.bilibili.com/read/cv1453281/
- Godot Octahedral Impostors: https://github.com/wojtekpil/Godot-Octahedral-Impostors
- xraxra IMP (Unity): https://github.com/xraxra/IMP
- agargaro / three.ez octahedral impostor: https://github.com/agargaro/octahedral-impostor ; forum https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735 ; earlier thread https://discourse.threejs.org/t/octahedral-impostors-for-three-js/80318
- Anderson Mancini, Octahedral Impostor Demo: https://webgpu-octahedral-impostor.vercel.app/
- Meep engine octahedral impostors: https://unpkg.com/@woosh/meep-engine@2.124.2/src/engine/graphics/impostors/octahedral/README.md
- Arycama, Imposter Baking and Rendering: https://arycama.github.io/2024/10/05/Imposters.html
- Cinevva, open world in the browser part 19 (imposters): https://app.cinevva.com/blog/2026-05-04-open-world-browser-part-19-imposters ; foliage overdraw: https://app.cinevva.com/blog/2026-05-11-foliage-overdraw
- Alan Zucconi, Billboard Impostors: https://www.alanzucconi.com/2018/08/25/shader-showcase-saturday-7/
- Ben Golus, Rendering a Sphere on a Quad: https://bgolus.medium.com/rendering-a-sphere-on-a-quad-13c92025570c ; Anti-aliased Alpha Test: https://bgolus.medium.com/anti-aliased-alpha-test-the-esoteric-alpha-to-coverage-8b177335ae4f
- Ignacio Castaño, Computing Alpha Mipmaps: https://www.ludicon.com/castano/blog/articles/computing-alpha-mipmaps/
- Exploring ways to mipmap alpha-tested textures: https://lisyarus.github.io/blog/posts/exploring-ways-to-mipmap-alpha-tested-textures.html
- Wyman & McGuire, Hashed Alpha Testing: https://research.nvidia.com/labs/rtr/publication/wyman2017hashed
- Unity Pixyz impostors (depth offset limitation): https://docs.unity3d.com/Packages/com.unity.pixyz.unity-sdk@4.0/manual/features/impostors.html
- Unigine impostor material (depth offset): https://developer.unigine.com/en/docs/latest/editor2/tools/impostors_creator/impostor_material
- three.js r187 builds read for API checks: https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.core.js , https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.webgpu.js
- From memory (not re-fetched): Décoret et al. 2003 Billboard Clouds; Max & Ohsaki 1995; Todt et al. 2007; Bruneton & Neyret 2012.
