---
status: provisional
added: 2026-11-20
check: `shopscale` (tools/audit/shopScaleCheck.mjs)
---
**Rule.** A shop interior seen through the glass is at metric scale: the render's room (6 m wide, 3 m high,
tools/blender/shopInteriors.py) is laid onto the glass in metres, within +-10 % across (one room up to 6.6 m of glass;
wider glass gets 6 m rooms side by side with a partition, the next one mirrored), at a per-shop offset, with a depth per
type in 3.5-6 m. The shader's room constants (viewer/shops/shopScale.js) equal the bake's, and the bake runs on the
OptiX GPU. `?shopscale=old` keeps the stretched version for A/B.

**Why.** The first shop window shader stretched the 6 m render over whatever glass it had (`nx = hx / w`): on
2026-11-20 only 84 of the 502 windows were within 10 % of metric; a 3.4 m café showed its tables at 57 % size, the
narrowest window (2.1 m) at 35 %, and every café of one type showed the same slice of the same room. The owner's
verdict: the interiors look flat and cheap at street level (docs/SHOPS_V2_PLAN.md).
