# Texture factory: research and toolchain choice (2026-11-13)

Goal: scripted, offline generators that bake Substance-quality, tileable PBR sets (albedo, normal, roughness, height,
AO, packed like the library's scans) for the materials the owner judged bad or missing. They must be reproducible,
CC0 by construction, and run with no hand work. This note covers how the node tools build such materials, which
toolchains can run with no GUI, and what was tried.

## 1. How Substance Designer builds these materials

The node families below are what every Designer brick / stone / asphalt graph is made of. The factory re-implements
each one as a numpy function (`tools/texturefactory/tf/`).

| Designer node | What it does | Factory equivalent |
|---|---|---|
| **Tile Generator / Tile Sampler** ([tile generator](https://helpx.adobe.com/substance-3d-designer/substance-compositing-graphs/nodes-reference-for-substance-compositing-graphs/node-library/texture-generators/patterns/tile-generator.html), [tile sampler](https://helpx.adobe.com/substance-3d-designer/substance-compositing-graphs/nodes-reference-for-substance-compositing-graphs/node-library/texture-generators/patterns/tile-sampler.html)) | Rows of shapes with size, offset and rotation jitter, and a random value per tile. | `units.courses()`: each course is cut into units of their **own** length (a random partition of the tile width, so it wraps). Per unit: height, vertical offset, tilt and per-edge joint width. Out: a unit id, local coordinates and a rounded-box SDF. |
| **Flood Fill** → to Random Grayscale / Gradient / BBox Size ([flood fill](https://helpx.adobe.com/substance-3d-designer/substance-compositing-graphs/nodes-reference-for-substance-compositing-graphs/node-library/filters/effects/flood-fill.html), [flood fill mapper](https://helpx.adobe.com/substance-3d-designer/substance-compositing-graphs/nodes-reference-for-substance-compositing-graphs/node-library/filters/effects/flood-fill-mapper.html)) | Recovers the cells of a pattern so that each brick or stone gets its own value, gradient or tilt. Matt Taylor's [VersaTile](https://matt-taylor.artstation.com/blog/DVPRy/versatile-my-new-tile-pattern-generation-system-for-substance-3d-designer) system is built from such nodes. | Not needed: the layout already knows each unit's id (`Tex.per_unit`), so it is exact rather than reconstructed from an image. |
| **Cells / Crystal / Voronoi** | Stones, aggregate and cracks. | `Tex.worley()`: periodic F1, F2 and id. The anisotropic metric gives long straight-sided cells (bark fissures). `aggregate.stones()` shrinks each cell into a polygonal crushed stone with a flattened (worn) top. |
| **Perlin / Clouds / Fractal Sum** | Colour and relief noise. | `Tex.noise()`: FFT spectral synthesis, isotropic, exactly tileable. A low-pass at N/6 cycles keeps it from aliasing into diagonal crawl, which was the cause of the old procedural shimmer. |
| **Warp / Directional Warp** | Organic outlines. | `Tex.warp()` (cv2.remap with BORDER_WRAP). |
| **Slope Blur Grayscale** ([Adobe Learn: edge damage](https://www.adobe.com/learn/substance-3d-designer/web/create-edge-damage)) | Smears or eats a shape along the slope of a grunge map. "min" erodes the edges, which gives chipped arrises. | `Tex.slope_blur()`. The bricks use the cheaper SDF + grunge threshold for their chips, which gives the same look. |
| **Curvature Smooth / Ambient Occlusion (HBAO)** → edge wear, grime in recesses | Wear on the convex parts, dirt in the concave ones. | `Tex.curvature()`, `Tex.ao()` (a 12-direction horizon search on the height in metres), and `masonry.grime()` (AO x grunge). |
| **Height → Normal** | The normal map from the height. | `Tex.normal()`: physical (the height is in metres, the texel size is known) and OpenGL, like the scans. |

Two principles carry over from Designer.
- **Everything is driven by one height field in real units.** The normal, AO, curvature, wear and grime are all
  derived from it, so the maps never disagree.
- **Every unit is its own object.** It has its own size, chips, tilt and colour, and it is layered: firing colour,
  then clouds, then specks, then chips, then grime, then bleach.

## 2. Toolchains considered

| Option | Headless / scripted? | Evidence (tried 2026-11-12) | Verdict |
|---|---|---|---|
| **Substance Designer + `sbsrender` / Automation Toolkit** | Yes, but it needs a paid Adobe licence and the graphs are made in its GUI. | Not installed; licence. | Out: not CC0 by construction, not fully scripted. |
| **Material Maker 1.8** ([CLI docs](https://rodzill4.github.io/material-maker/doc/command_line.html), Godot 4.7, MIT) | `material_maker --export-material -t <target> -o <dir> file.ptex` | Downloaded 1.8 (Windows). The CLI starts Godot and Vulkan on the GPU, prints "Exporting…", and quits after ~5 s **without writing any file**. Tried targets `Blender`, `Godot`, `Godot/Godot 4 Standard`, `Unity`, `Unreal`, `--size 2048`, the bundled `examples/bricks.ptex`, absolute and relative paths. Per [start.gd](https://raw.githubusercontent.com/RodZill4/material-maker/1.8/start.gd), the loader returns before the export loop. The .ptex graphs are JSON, but they are authored in the GUI. | Out for now. Its nodes are good, but the CLI is unreliable here and scripting a graph means writing its JSON by hand. |
| **Blender 5.0 shader nodes, baked headless** (`--factory-startup -b`) | Yes | `bake_test.py` (scratchpad): Brick + Noise → emission bake, 2048², Cycles OptiX, **3.5 s per map** (+5 s start-up). | Works, but Blender's Brick Texture has no per-brick sizes, chips or tilts and no flood fill. Per-unit control would mean modelling every brick as a mesh and baking a high-poly mesh to a plane. Kept for later as the "true geometry + ray-traced AO" option. |
| **numpy + OpenCV (Python)** | Yes | Already installed (numpy 2.5, OpenCV 5.0). 2048² set: **18-50 s** on the CPU, deterministic (PCG64 streams keyed `[seed, k]`). | **Chosen.** |
| GPU synthesis (WebGPU compute / PyTorch) | Yes | Not installed. Not needed at these timings. | Later, if 4K or many seeds get slow. |
| Example-based synthesis (Heitz-Neyret, texture GANs) | — | Needs exemplars, i.e. scans. Not CC0-by-construction from scratch. AI-generated imagery is not wanted. | Out. |

### Why numpy + OpenCV wins here

- **Exact per-unit control.** The layout knows every brick (id, size, local frame). Substance has to rebuild that
  from an image with Flood Fill; here it is exact.
- **Real units.** Bricks 21 x 6.5 cm, 1 cm joints, 30 cm tiles, heights in metres. The normal and AO are physically
  scaled.
- **Seamless by construction.** FFT noise, periodic Worley, BORDER_WRAP warps, and courses partitioned modulo the
  width.
- **Reproducible.** One command per material. Variants are seeds plus parameter sets in plain Python.
- **CC0 by construction.** There are no inputs: no scans and no AI.
- **No new dependencies.** Output goes through the same KTX2 path as the scans (KTX-Software `ktx create`, UASTC +
  zstd, the same settings).

## 3. Runtime side (r187, slop-newyork checked first)

- The baked sets are used **exactly like the scans**: `createMaterial(name, { variant: "scan", scan })`, the hex-tile
  anti-tiling of `viewer/materials/antitile.js` (Mikkelsen 2022; after Heitz & Neyret 2018), and the library's live
  layers (finish() weathering, wetness via `weatherOpts`, per-building variation).
- No new runtime code is needed, so three.js r187 and slop-newyork offer nothing extra here. slop-newyork's façades
  are procedural, not baked (docs/SLOP_NEWYORK_AUDIT.md).
- The generators give the exact `lattice` (units across, courses up), so the structured anti-tiling snaps on true
  joints instead of a measured guess.
