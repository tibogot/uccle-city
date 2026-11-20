---
status: provisional
added: 2026-11-20
check: `meta` (tools/audit/metaGate.mjs: timing rows import tools/gate/timing.mjs, no process.cpuUsage in a row script); the timing rows themselves (stutter, stutter2, mdrawcull, carhit, citysound, engine, orbitcam, tyremarks)
---
**Rule.** A gate row that asserts a wall time is a `timing: true` row and measures through `tools/gate/timing.mjs`: its budgets are multiplied by the calibrated slow-down `k` (a fixed loop timed before and after in the same process, the run discarded and measured again while the two differ by more than 15 %), a worst-step check takes each step's best over 3-5 repeats (or the best of the repeats), and it never times a window under 1 s with `process.cpuUsage()` (15.6 ms ticks on Windows). The gate runs the timing rows alone, first, one at a time.

**Why.** 4 of 13 logged gate runs failed on timing alone: stutter2 and mdrawcull asserted the max of one wall-time sample, which one preemption by another process (a census, another branch's gate) pushes over the budget; on 2026-11-20 with four gates on the laptop a garden slice measured 11-59 ms of wall time for 3.8 ms of work, and the sort-cost difference of two 300-frame bests swung 10-35 us (claude/speed2).
