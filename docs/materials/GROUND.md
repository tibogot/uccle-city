# Ground textures (the terrain's land covers)

Branch `claude/groundtex`, 2026-11-13. The terrain ground was 100 % procedural (value noise + flat colours on the
OSM land-cover mask). Now each cover samples a real CC0 scan, anti-tiled, blended to the tile's orthophoto far away.
`?groundtex=0` = the old procedural ground (A/B). On by default.

## What each cover uses

The mask is unchanged (`viewer/landcover.js`: R woodland, G paths, B sand, A water, everything else grass; steep
ground = soil). The tile worker and the tile data are untouched.

| Layer | Cover | Where | Scan (CC0) | Repeat |
|---|---|---|---|---|
| 0 | lawn | grass by default (gardens, verges, park lawns) | ambientCG Grass 004 | 1.4 m |
| 1 | rough | ~40 m noise patches in the grass; scrub and the railway verges (mask R < 0.9); the soft edge of a wood | ambientCG Grass 001 | 1.4 m |
| 2 | dry | ~11 m noise patches in the grass (thin grass over soil) | ambientCG Ground 003 | 2 m |
| 3 | forest | inside real woods (mask R > 0.9): leaf litter, twigs, moss | Poly Haven Forest Leaves 02 | 3 m |
| 4 | gravel | OSM footways / paths (pale dolomite park paths) | ambientCG Gravel 037 | 2 m |
| 5 | soil | steep banks; small worn spots in the lawn | ambientCG Ground 048 | 1.4 m |
| 6 | sand | playgrounds | ambientCG Ground 054 | 3.5 m |

Picked from a contact sheet of 26 candidates at one scale (`docs/materials/ground/candidates_sheet.jpg`) next to
Brussels lawns, the Soignes / Kinsendael beech litter and the Wolvendael paths (look only). Grass 005 / 008 were the
saturated golf green; Forest Leaves 02 is the russet litter with moss and twigs (toned down 0.52 / 0.6 / 0.62: sunlit
it read orange). Sources, licences: `viewer/materials/textures/ground/ground.json` and CREDITS.md.

## How it works

- `viewer/materials/groundTex.js`: loads the 14 KTX2 files (the library's KTX2 loader, one transcoder per page) and
  concatenates the transcoded mip chains into TWO `CompressedArrayTexture`s (albedo sRGB, nra = normal x,y +
  roughness + AO). The ground shader binds 10 sampled textures in all (2 arrays, mask, ortho, noise, lamp map, shadow,
  environment, ...): within WebGPU's 16.
- `viewer/ground.js` `texturedGround()` (one shader for every tile: bounds, mask, ortho are per-material uniforms /
  textures, the code is the same; measured: 9 terrain materials -> 2 programs, the second is the tile-fade copy):
  - cover weights from the mask (the procedural ground's mixing order) + slope + 3 taps of a 256 px noise texture
    (40 / 11 / 3 m) for the grass flavours and the macro tone;
  - the TWO strongest covers per pixel (the third's weight subtracted: no jump when 2nd and 3rd swap), blended by height
    (each scan's luminance over its own mean: gravel and soil show through thin grass first);
  - anti-tiling: Mikkelsen hex tiling (as `viewer/materials/antitile.js`) on a 1.3 m grid, random offset + rotation
    + a +-6 % tone per hex tile, explicit gradients; macro tone at ~11 / ~40 m;
  - far: blends to the tile's orthophoto over 250-550 m (the far-LOD tiles show the same orthophoto, so the full ->
    far hand-over has no colour jump); normal map and AO fade out with it, roughness to the far tiles' 0.95;
  - kept: the lamp light map (`addLampLight`), the house-cut mask, the contour lines, steep-slope soil, water.
- Costs cut by branches (explicit gradients make them legal in WGSL; everything with implicit derivatives is sampled
  first): nothing textured past the orthophoto hand-over; the second cover only where it has a share; ONE hex tile per
  pixel near the hex centres (sharpened weight > 0.96) and everywhere once the pixel footprint is > ~5 cm; the noise
  from a texture instead of six sin-hash value noises.
- `viewer/main.js`: `setGroundTextures(await loadGroundTextures(renderer))` before the first tile; each full tile
  fetches its `ortho.jpg` alongside the tile data (only when the textures are on); `viewer.groundAB(on)` swaps every
  full tile's terrain between the textured and the procedural material (debug A/B, built lazily);
  `viewer.groundLook()` exposes the live uniforms (`uOrthoNear`, `uOrthoFar`, `uNormal`, `uMacro`, `uRough`, `uDry`).
- `tools/textures/ground_textures.py fetch | sheet | build` + `cd tools/textures && node encode_ktx2.mjs --ground`.
  Raw downloads in `data/raw/textures/` (git-ignored, deleted after the build); the KTX2 picks are committed like the
  library's shipped scans, so a fresh clone / Vercel works. No WebP fallback for the ground (if KTX2 fails, the
  procedural ground).

## Costs (2026-11-13, the owner's laptop, shared GPU)

- Download: 19 MB (14 KTX2, 2.6-2.8 MB per cover) + each full tile's orthophoto (~70 KB, already fetched for its far
  tile). Boot: 387 ms to load + pack (in parallel with the rest of the boot).
- GPU memory: 18.7 MB for the two arrays (7 layers x 2 maps x 1024^2 BC7 + mips) + 0.35 MB noise + one 512^2 RGBA8
  orthophoto per full tile (~1.4 MB with mips, 9 tiles at ring 1 = ~12.6 MB).
- Draw calls: unchanged (one terrain mesh per tile). Shaders: one ground program (+ its fade copy), as before.
- GPU A/B (`debug/gpuAB.js alternate()`, procedural vs textured, same frame, 4-6 rounds; an indication only, the GPU
  was shared): before the cost cuts +0.6 ms (car, street) and +1.0 ms (200 m aerial); after: lawn at street level
  **+0.14 ms** (-0.06..+0.27), street with wood bank **+0.33 ms** (0.13..0.52), car view +0.5 ms on a noisy run
  (0.07..1.05; an earlier quiet run of the previous step +0.39), 200 m aerial **+0.05 ms** (0..0.13).
  Street level is still above the +0.1-0.2 ms target where two covers meet (wood edges, rough / dry patches): see
  "What's left".
- Shimmer (`labs/flickerTest.js` via `debug/shots.js flicker`, 24 frames strafing 2 cm/frame, lower half of the
  screen): car view textured 282 ppm vs procedural 289 ppm; the street-level lawn reads 54 173 ppm vs 2 220, all of it
  in the nearest 2-4 m where the 2 cm steps are ~10 px of grass-blade detail sliding past (the heat map
  `ground/flicker_lawn_strafe_heat.jpg`: no blinking from ~5 m on; the procedural ground has no detail there to
  blink). As in MATERIALS.md: compare at >= 10 m.

## Before / after (`docs/materials/ground/`, `*_before.jpg` = procedural, `*_after.jpg` = textured, same frame)

| View | Files |
|---|---|
| Park lawn and wood edge, Wolvendael (F4, -455,-135) | `park_lawn_wood_edge_F4_*` |
| Garden lawn between houses (D8, -1100,1850) | `front_garden_D8_*` |
| From a car on a verge-lined road (D8, Rue du Bourdon) | `car_verge_D8_*` |
| Same at night (lamp pools still lit on the verge) | `night_car_verge_D8_*` |
| Footpath in the Wolvendael wood (F4) | `gravel_path_F4_*` |
| Aerial ~200 m over Wolvendael (F4) | `aerial200_F4_*` |
| Full -> far hand-over, 60 m up looking 600 m west (F4 -> D4) | `handover_full_far_F4_D4_*` |
| Shimmer heat map, lawn strafe | `flicker_lawn_strafe_heat.jpg` |
| The 26 candidates at one scale | `candidates_sheet.jpg` |

Seen: no repeat visible from street level, a car or 200 m; the wood floors read as litter instead of flat brown;
no seam at tile borders (bounds are uniforms, the noise and hex grid are world-space); the orthophoto takes over
smoothly from ~250 m (the full tiles now show the gardens' real paving / shade far away, like the far tiles).

## What's left

- Street-level cost where two covers meet is +0.3-0.5 ms: next steps would be a single hex tap for the second cover,
  aniso 8 -> 4, or narrower rough / dry transitions. Re-measure on a quiet GPU.
- Many park footways are drawn by the road engine as their own (blue-grey) path meshes over the ground, so the gravel
  layer only shows where OSM paths have no mesh; the dolomite look for those meshes belongs to roadPaint / the roads
  branch (the same `gravel` array layer could be reused there).
- Grass flavour is noise-driven: OSM `park` / `garden` / `pitch` / `cemetery` kinds are not in the mask (all "grass");
  a fifth mask meaning (e.g. pitches = mown stripes, cemeteries = rough) needs a landcover.js + worker change.
- `roadPaint.js` `vergeMaterial()` (verge strips inside the road meshes) is still procedural: it could sample the
  `dry` / `lawn` layers (one import from ground.js); not done to keep the roads files untouched.
- The orthophoto's roads and roofs show as pale imprints past ~400 m (as on the far tiles); a luminance clamp would
  hide them but must then be applied to the far tiles too.
- Megascans upgrade (docs/materials/MEGASCANS_LIST.md: Grass Cut, Lawn Grass, Ground Gravel, Gravel on Soil, Soil Mud):
  drop them into `data/raw/megascans/`, point `PICK_ID` in `tools/textures/ground_textures.py` at them, rebuild; after the
  Fab licence check for the public site.
- Foliage Lab GPU grass near the camera on lawns: not done (out of time; its 0.2-0.4 ms on top of this ground would
  break the street-level budget unless the cuts above land first).
- The night look was checked on one street; no change in how the lamp pools are added.
