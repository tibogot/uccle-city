---
status: provisional
added: 2026-11-21
check: `shopsv2` (tools/audit/shopsV2Check.mjs)
---
**Rule.** A shop interior (Shops v2: every interior type since shops5) is built from separate depth layers, never one
painted image: L0 the room shell (walls, floor, ceiling and what stands against them; the free-standing furniture is in
the bake but hidden from the camera, so it still casts its shadows and AO and is not painted onto the floor), L1 the
mid card (furniture 1.8-3.5 m deep, drawn at 2.6 m), L2 the near card (0.6-1.8 m, at 1.2 m), L3 the window display
(0-0.6 m, at 0.3 m, below 1.45 m), L4 the glass dressing (stickers from one scripted sheet: opening hours, a promo sign,
plain payment marks, lace; no brand, no real logo; blinds, a roller shutter half down on a shop closed at night and light
dirt, procedural). Each variant's render is as deep as the viewer's room of its type (metric). The cards are
premultiplied (in linear light) and composited front to back. Day and night are separate bakes (night at half size;
closed at night = 10 % of the night bake + a security light, all emission, no light added). Within 40 m: 4 layer
fetches + 1 sticker fetch a pixel; beyond it ONE composite fetch; a cross-fade over 35-45 m (no pop). All v2 layers
together within 40 MB GPU / 12 MB download, one draw per tile as before. Every type has two rooms (shops7); a shop's
variant comes from its tags (café / brasserie) or a hash, then the neighbour rule: two same-type windows within 12 m on
one side never show the same variant. Fewer than 12 % of the windows may fall to the generic room (map the OSM tags in
interiorType()). Every room is lit as a shop at night (spots, display strips, a fill: no night bake below a mean of
0.05) and its day / night gains are re-derived from the measured bakes after every bake. Every baked piece stays inside
the room box (the bake stops otherwise). `?shopsv2=old` keeps the v1 room for A/B.

**Why.** The v1 rooms were one render with the back furniture painted in and one furniture card on a single plane:
walking past, the painted tables slid like a decal over the floor, everything at one depth, emission-only and dimmed to
24 % by day, the same room behind every café (docs/SHOPS_V2_PLAN.md causes 1-5). The owner's verdict: interiors look
flat and cheap at street level. Forza Horizon 4's Edinburgh windows (separate layers, a display near the glass, glass
dressing, night textures, no repeats on a façade, a flat composite at distance) are the model; the budget keeps it to a
handful of fetches and two arrays. (shops7) The boutique / salon / generic shop were baked with 30-45 W spots only and
read near black when open at night (mean 0.008-0.02 against the café's 0.18); and a rail placed as if a cylinder along
X / Y started at its position (it is centred) ran out through the glass as a stray line near the camera.
