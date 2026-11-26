---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2f: villaPool.js wired under ?villa3, Fresnel over the glass model's outdoor reflection + a ray-box house, the entry steps traced, no lane bar, no render target / light)
---
**Rule.** The villa's pool water is ONE opaque material on its 2-triangle surface (viewer/villa/villaPool.js): calm
wind ripples from noise gradients (no vertex mover), Fresnel (F0 0.02) between what the water reflects (the glass
model's analytic outdoor scene + the house itself by a ray-box test on its masses) and the refracted basin traced to
the floor, the walls and the four entry steps (with a dark nosing tile), caustics at pool scale (0.25 m) fading
with depth, Beer-Lambert absorption over the in-water path; at night four LED niches drawn emissive (no light).

**Why.** The audit (e01 / e02): milky water with no reflection of the sky, the house or the trees, giant even
caustics (0.77 m noise), the steps invisible, a flat cyan sheet at night, and a dark 24 cm bar "floating" across the
middle: round 2's lane line tested |w - mid w| (across the 4.5 m width at mid-length) instead of along the length, a
lap-pool marking a residential pool does not have. Removed by cause, not hidden.
