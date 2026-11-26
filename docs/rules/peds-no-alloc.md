---
status: provisional
added: 2026-11-26
check: `pedssim` (S3: the sim step's heap growth <= 0.5 KB a step over 600 steps with gc; S4: the step <= 0.5 ms headless) + the city's people CPU line (window.__peds.stats.cpuAvg, docs/PEDESTRIANS.md "City")
---
**Rule.** The people's per-frame path (citySim.step, crowd.update, props.update, cityPeds.update) allocates nothing per person. The neighbour grid is a typed-array hash with linked lists, not a Map of arrays. There is no closure per person: the separation and the oncoming test share one inline loop. The next edge is picked by two passes over node.edges, with no filtered arrays. Each person carries one kerb object and one spot object, reused. Clip states are numbers (an action is "act" + its clip index, never a string built each frame). The props write positional floats, with no array literal per instance. Far people (> 90 m) step at 20 Hz and the far band draws at 15 Hz. The crowd's buffers are fixed (no DynamicDrawUsage; update ranges). No light is added for people (fixed light count).

**Why.** The owner's priority #1 is performance (the police game lags). The lab's sim built a Map of arrays and two closures per person every frame. With 200-400 people that is thousands of short-lived objects a frame, and the alloc-rate rule already shows how GC drops cost frames.
