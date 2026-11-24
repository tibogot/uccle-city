---
status: provisional
added: 2026-11-24
check: `xmas` (tools/audit/xmasCheck.mjs "boot:" rows); browser row `xmasperf` (debug/xmasBoot.js request list, debug/xmasPerf.js GPU)
---
**Rule.** A layer that turns itself on by date for every visitor (the Christmas layer from 1 December) never competes
with the boot: every one of its fetches carries the low fetch-priority hint (viewer/christmas/xmasKit.js `XMAS_FETCH`;
three.js loaders through `setPriority`, the shared KTX2 loader only through `parse` of bytes fetched at low priority),
and it starts only through viewer/bootGate.js `whenXmasNeeded`: at once when a decorated area (site.json
`select.areas`, centre + radius, mirrored in `XMAS_AREAS`) reaches into the boot's ring, else after the cover, staggered
as the far landmarks. Under `?quick=1` it starts at once and quickReady waits for it (`window.__xmasPending`), so a tour
shot never misses it.

**Why.** The layer was queued with the landmarks and started its ~7 MB (christmas.glb 6.0 MB, the needle atlas
0.76 MB, site.json, christmas.json, terraces.json) at the default High priority before the start tile was even
requested, wherever the spawn was: from 1 December every cold visit on the live site would have shared its bandwidth
between the start tile and decorations that are kilometres away (PERF_RESEARCH idea 8, plan job 3). Nothing checked
the priority of a fetch.
