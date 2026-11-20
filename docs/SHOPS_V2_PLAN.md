# Shops v2: layered fake interiors (plan, for later)

The owner asked on 2026-11-20: at street level the shop and restaurant interiors look flat and cheap; how do games fake interiors? This plan comes from a research job.

## Why ours reads flat today
Current pipeline:
- viewer/shops/shopWindow.js, baked by tools/blender/shopInteriors.py (docs/assets/SHOPS.md §3).
- One room render + ONE furniture card per type.
- 8 types for 492 windows; all 130 cafés show the same room.

Causes:
1. All near tables / chairs sit on one plane; the back furniture is baked into the room image, so it slides like a decal when the view moves.
2. The room is stretched to the glass width (`nx = hx / w`), not metric.
3. Repetition: the only variation is a mirror flag.
4. No layers near the glass: no window display, stickers or blinds.
5. Emission-only lighting, dim by day (× 0.24); no daylight patch.
6. 1024 px across 3-9 m goes soft up close.
7. The bake runs on the CPU (breaks the OptiX rule) at 40-48 samples.

## How games do it (sources)
- **Interior mapping**, van Dongen 2008: http://www.proun-game.com/Oogst3D/CODING/InteriorMapping/InteriorMapping.pdf , https://joostdevblog.blogspot.com/2018/09/interior-mapping-real-rooms-without.html
- **Forza Horizon 4, Edinburgh** (the closest match): three independent layers (glass with a normal map, transmissive curtains / blinds, a baked room); atlases of 8 rooms; a shallow window-display depth; separate night textures; no repeats on a façade; a flat composite at distance; raised fresnel at grazing angles. https://www.gamedeveloper.com/design/game-tech-deep-dive-a-window-into-playground-games-latest-shader-development
- **AC3, Saints Row 3, BioShock Infinite** (offset sprite planes over a filled background): https://simonschreibt.de/gat/windows-ac-row-ininite/
- **Offline layered shaders:** ILM JIWindowbox (room + curtain + mid furniture / people layers), Twinmotion parallax windows.
- **Unreal:** the InteriorCubemap material function; City Sample window parameters (lit share, blinds share, variation).
- **Godot:** cubemap (MIT) and atlas shaders.
- **Unity:** atlas tangent-space shaders.
- **Dagor engine:** a cubemap per window with per-room rotation.
- **Spider-Man 2:** ray-traced real rooms. Not for our budget.

**Common rule:** several depth layers + metric scale + variation rules + a night bake + strong fresnel. Real geometry only where the player can enter or press against the glass.

## Recommendation: layered baked interior mapping, still one draw per tile

**The layers, back to front:**
- **L0 room shell:** wall-standing furniture only. The free-standing pieces are invisible to the camera but still cast shadows and AO, so the floor keeps its contact shadows and no table is painted onto it.
- **L1 mid card:** about 2.6 m deep.
- **L2 near card:** about 1.3 m deep.
- **L3 window display:** about 0.35 m deep, half height.
- **L4 glass dressing:** from a shader sticker atlas: opening hours, sales, payment logos, no brands; blinds; a half-down shutter when closed; dirt.

**Scale and variation:**
- Metric scale (rooms 10 m wide) with a per-shop offset and depth (3.5-6 m).
- About 16 types: restaurant, café, friterie, bakery, butcher, pharmacy, optician, clothes, shoes, supermarket, greengrocer / florist, bank, hair, books, hardware, generic.
- Day and night bakes, plus a closed state.
- The room is picked from the OSM tags with per-shop hashes; the neighbour rule avoids twins side by side.

**Distances:** all layers within 40 m; a composite image at 40-80 m.

**Assets:** shopInteriors.py v2 on OptiX, about 128 spp + denoise, with slab-split card renders, stored as a KTX2 2D array texture. Budget: ≤ 40 MB GPU and ≤ 12 MB download (today 10.7 / 3.4).

**Cost (estimate):** about 5 texture fetches + ~70 ALU per window pixel, roughly 0.1-0.25 ms. No new lights, no new draws.

**Real 3D props:** only 2-4 curated hero cafés (Place de Saint-Job, Vanderkindere), through the existing interior-cell pipeline, streamed within 15 m.

## Jobs, in order
1. Audit + baseline shots + a scale gate row.
2. Metric scale in the shader (no new assets).

   **Done on claude/shops1 (2026-11-20).** Audit (`node tools/shops/shopScaleAudit.mjs`): 502 interior-mapped windows in
   52 tiles; glass 2.10-6.38 m (median 5.06); the old stretch of the 6 m render was 0.94-2.86 render m per glass m
   (only 84 within 10 % of metric); café 135, shop 90, grocery 69, bakery 60, boutique 44, pharmacy 39, office 34, salon
   31 windows per room image; 42 windows have a same-type twin within 12 m. Shader: the glass in metres on the 6 m room
   (viewer/shops/shopScale.js, the JS twin), a per-shop offset, one room up to 6.6 m of glass (no front is wider today;
   wider glass gets side-by-side rooms + a partition, the next mirrored), depth by type 3.5-6 m (the render's 5 m scaled:
   job 3 bakes each type at its own depth), fresnel exponent 4 -> 3; `?shopscale=old`. Gate row `shopscale`, rule
   shop-room-metric. The bake script now runs on OptiX (not re-baked). A/B shots (8 shops x 2 / 5 / 15 m x head-on / 45 deg
   x day / night) outside the repo: `Downloads/uccle-shops-ab/index.html`.
3. Café / restaurant v2 bake.
4. Shader v2: the layers, day / night / closed, fresnel, the distance composite; VRAM and fetch gate rows.
5. Glass dressing.
6. Roll out the types, 4 per job.
7. Variants + the neighbour rule; Street View check (look only).
8. Optional: hero café cells.
9. Perf pass on a GREEN preflight.
