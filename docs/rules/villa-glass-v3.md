---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2b: one glass model, env reflection + Fresnel, premultiplied, no pass / light / extra draw)
---
**Rule.** Every pane of the villa (the interior cell's curtain walls and balustrades, the exterior's far glass, the open
bay's pane) is drawn by ONE glass model, viewer/villa/villaGlass.js: Fresnel (Schlick, see-through head-on, a mirror at
grazing angles) weighting what glass reflects outdoors (the sky gradient, the tree line round the plot, the lawn, the
sun's glint, all analytic from lighting.js env: no SSR, no planar / render-target pass, no light), from inside the
lit room instead (dark mirrors at night); the near glass blends PREMULTIPLIED (reflection x F + the room behind x
T (1 - F)), the far glass is the same reflection over a dim room tone that glows at night, and the near glass fades in
from exactly that look (no pop at the 30 m swap). One glass primitive in the cell, one per exterior level.

**Why.** The owner (2026-11-26) on the villa's windows: "last time I saw them they looked very fake, not like real
windows at all". Cause: the near glass was a fixed sky-gradient tint at a constant 10-85 % opacity (it went milky
head-on, the reflection was dimmed by its own alpha), with no garden, tree line or sun in it and the same look from
inside; the far glass reflected only the PMREM sky over flat dark grey. Real glass is a Fresnel mirror over the room.
