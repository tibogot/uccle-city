---
status: provisional
added: 2026-11-21
check: `shopsv2` (tools/audit/shopsV2Check.mjs)
---
**Rule.** A layered shop interior (Shops v2: cafés / restaurants / bars today) is built from separate depth layers, never
one painted image: L0 the room shell (walls, floor, ceiling and what stands against them; the free-standing furniture
is in the bake but hidden from the camera, so it still casts its shadows and AO and is not painted onto the floor), L1
the mid card (furniture 1.8-3.5 m deep, drawn at 2.6 m), L2 the near card (0.6-1.8 m, at 1.2 m), L3 the window display
(0-0.6 m, at 0.3 m). The cards are premultiplied (in linear light) and composited front to back at metric scale (the
render's room depth = the viewer's). Day and night are separate bakes (closed at night = 10 % of the night bake + a
security light, all emission, no light added). Within 40 m every layer is drawn (4 fetches a pixel); beyond it ONE
composite fetch; the hand-over is a cross-fade over 35-45 m (no pop). The layers ship as one KTX2 2D array within
12 MB GPU / 4 MB download, one draw per tile as before. `?shopsv2=old` keeps the v1 room for A/B.

**Why.** The v1 café showed one render with the back tables painted into the room and one furniture card on a single
plane: walking past, the painted tables slid like a decal over the floor, everything at one depth, emission-only and
dimmed to 24 % by day (docs/SHOPS_V2_PLAN.md causes 1, 4, 5). The owner's verdict: interiors look flat and cheap at
street level. Forza Horizon 4's Edinburgh windows (separate layers, a display near the glass, night textures, a flat
composite at distance, raised fresnel) are the model; the budget keeps it to a handful of fetches and one array.
