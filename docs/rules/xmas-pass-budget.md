---
status: provisional
added: 2026-11-28
check: `xmasload` (tools/christmas/xmasLoad.mjs: the layer's placed pieces, LOD0 triangles and instanced sets within models/christmas/load_budget.json; a mutation fails it) + browser row `xmasperf` (debug/xmasPerf.js `passes()`: draws / triangles per pass per frame within XMAS_PASS_BUDGET; `run()` with tools/perf/gpuWatch.mjs around it)
---
**Rule.** The Christmas layer's cost is guarded by its STRUCTURE, not by a timing: (1) what it places (firs, chalets,
shopfront swag modules, wreaths, star motifs, street and pole garlands), counted in node the way viewer/christmas/
xmasCity.js builds it, has committed ceilings (models/christmas/load_budget.json); (2) what it draws, per pass and per
frame at the probe's two spots (debug/xmasPerf.js `passes()`): the colour pass within its draw / triangle ceilings, the
sun map ~1 frame in 30 (its cache), the lamp maps and any other pass 0 in steady state. A change that adds load (a
street-life rebuild, a shop-kit change of front widths, a site refit, a new piece) raises the ceiling in the SAME commit,
with a re-measure. The ms budgets of `run()` (layer < 0.30, fir at 8 m < 0.10, extra < 0.05) are read on a COOL / WARM
GPU only (tools/perf/gpuWatch.mjs start / stop around the run); on a HOT GPU they are an upper bound, and a claimed
regression is shown by old and new code timed alternately in one session (rule timing-rows), never against a number
from another day.

**Why.** On 2026-11-28 the XMASPERF recipe read layer-street 0.47-0.51 ms and fir-8m 0.09-0.27 ms against 7.3's 0.121 /
0.086 of 24 Nov: "4x dearer". Timed alternately in one session (preflight YELLOW, browser.lock held, page in front,
scale 0.75), the 24 Nov commit (b991456e) itself read 0.19 / 0.31 / 0.43 ms and 0.11 / 0.16 / 0.18 / 0.37 ms: most of
the 4x was the laptop, which a preflight at rest cannot see (56 C idle; during the session median 82-85 C, ~50-63 % of
the busy seconds under the 30 W power cap / thermal slowdown). The fir had not changed. What HAD grown, unguarded, was
the content: the merge fix of claude/reality1 (ff47bb82, 2026-11-26) refit the site to the filled shop streets (109 ->
181 fronts), and as each swag is sized to its drawn front the layer went from 335 to 551 swag modules (+64 %); the pole
garlands came in with claude/xmas4. At the street spot that is +8 draws and +94 k triangles a frame (74 / 513 k ->
82 / 607 k); in-page the swags cost 0.18 ms (hot). No row counted them, so it showed only as a noisy timing.
