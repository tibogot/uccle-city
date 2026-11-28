---
status: provisional
added: 2026-11-28
check: tools/perf/gpuWatch.mjs (start / stop around a GPU timing run: COOL / WARM / HOT verdict, printed with the numbers); browser row `xmasperf`
---
**Rule.** A GPU timing (an A/B of a feature's meshes, a frame time) is printed with the GPU's state DURING the run:
`node tools/perf/gpuWatch.mjs start` before, `stop` after (nvidia-smi each second: temperature, SM clock, power,
power-cap / thermal-slowdown flags). Absolute ms budgets are judged on COOL / WARM only; a HOT run (median >= 78 C or
>= 25 % of the busy seconds capped) is an upper bound, and a regression is claimed only from old and new code timed
alternately in the same session. Rows give the cost's share of the frame beside the ms.

**Why.** tools/perf/preflight.ps1 reads the GPU once, at rest (2026-11-28: 56 C, no limit: YELLOW). A city page at
60 Hz then heats this laptop's RTX 4050 (30-35 W ceiling) to 82-88 C within ~15 min and runs it capped about half the
time; the same 24 Nov code read 0.19-0.43 ms for the Christmas layer in one afternoon. The "4x dearer" Christmas layer
(docs/CHRISTMAS.md 7.7) was mostly this.
