# Performance audit: results

Plan and method: `docs/perf/AUDIT_PLAN.md`. Runner: `debug/perfRun.js`.

## Baseline (2026-11-13, claude/foundation 2fdc449, quiet GPU)

**Setup.** This machine, one Chrome tab in front, no agent running. City at `?ring=1&far=1`, 1280x720 at DPR 1. Two
rounds of the five paths (`P.suite({ rounds: 2 })`); all 10 runs valid. Raw output:
`scratchpad/baseline_suite.json` (not committed). Frames are capped by vsync at 60 Hz, so p50 16.7 ms means "on time".

### Startup (one load with a long-task / pipeline probe)

| | measured | budget |
|---|---|---|
| Cover gone (first usable frame) | **14.4 s** | < 10 s |
| Long tasks before the cover | 3.24 s + 2.59 s + 0.65 + 0.32 + 0.31 ... (8.7 s in total) | none > 1 s |
| Where | the first renders: three's `update` building every material's nodes (`three.webgpu.js`, long-animation-frame script attribution), during the worker's first tiles and the cloud texture load | |
| Pipelines before the cover | 38 sync + 296 async | |
| Pipelines in the 20 s after the cover | **15 sync** + 195 async | 0 sync |

### Moving (two rounds; numbers per round: round 1 / round 2)

| path | frames > 33 ms | worst frames (ms) | sync pipelines | GPU p50 / p95 (ms) | draws | tris (M) |
|---|---|---|---|---|---|---|
| flight (85 s, 70 m up) | 196 / 371 (4-8 %) | 300, 233, 133 / 233 | 0 / 0 | 6.6 / 12.3 · 7.0 / 12.5 | 331 | 4.0 |
| stjob (street, 71 s) | 96 / 53 (1-2 %) | 67, 50 / 50 | 0 / 0 | 9.4 / 11.1 · 9.4 / 11.3 | 420 | 4.7 |
| alsemberg (street, 122 s) | 155 / **788 (10 %)** | 300 / 283, 283, 183 | 0 / 0 | 8.9 / 10.0 · 7.7 / 9.3 | 350 | 3.3 |
| turn (16 s on the Place) | 19 / 39 | 284 / **3,633, 3,167, 1,217** | 0 / 0 | 7.1 / 8.5 · 7.1 / 9.9 (max 79) | 300 | 3.0 |
| orbit (40 s, 240 m up) | 21 / 99 | 33 / 50 | 0 / 0 | 8.7 / 10.2 · 9.0 / 10.0 | 365 | 4.5 |

**GPU split (share of the sampled pass time, round 1):** the main scene and the sun shadow map are almost all of it.

| path | scene | sun shadow | AO (GTAO) | SSR | bloom + rest |
|---|---|---|---|---|---|
| flight | 45 % | **40 %** | 3 % | 1 % | ~11 % |
| stjob | 55 % | 28 % | 5 % | 2 % | ~10 % |
| alsemberg | 54 % | 26 % | 5 % | 3 % | ~12 % |
| turn | 54 % | 26 % | 5 % | 3 % | ~12 % |
| orbit | 78 % | 9 % | 4 % | 1 % | ~8 % |

(Pass times are summed over the frames the timestamp pool holds, so read them as shares, not as ms per frame; the GPU
p50 / p95 column is the per-frame total.)

**JS heap:** 1.2-1.4 GB, swinging by -830 to +490 MB within one path. **GPU geometries:** 1,664 during the first
flight, 5,155 at the end of the session (to check: more tiles held, or a leak).

### What it says

1. **The GPU is not the limit on this machine:** 6.5-9.5 ms median, p95 under 12.5 ms, everywhere. The frames over
   33 ms are main-thread (CPU) frames: the GPU p95 stays far under 16.7 ms while they happen.
2. **No freeze from shaders while moving:** 0 synchronous pipelines on every path (the 2026-11-13 lamp-pool fix holds).
3. **Stutter is tile streaming:** the 130-300 ms frames land where tiles load or unload (flight, Alsemberg). The 10 %
   of 33 ms frames on the Alsemberg drive (round 2) is the main thread over budget while tiles stream.
4. **One 3.6 s + 3.2 s stall** came in the turn right after the Alsemberg drive: the camera jumped 2 km back to
   Saint-Job, so many tiles unloaded and loaded at once. No JS long task was recorded during it (only 118 and 81 ms),
   and it did NOT come back in two reruns of the turn with the tiles already there -> a GPU-process stall from the mass
   unload / upload (buffer destroys, texture uploads). The falcon's fast flight streams the same way: trace it.
5. **The sun shadow is the biggest GPU item after the scene:** 26-40 % of the GPU (40 % in the flight, where the shadow
   box grows with altitude). Mr.doob's settings (2048 px tiles, far 220 m) and no shadows from small things are the
   first GPU changes to A/B.
6. **Startup 14.4 s** with 3.2 s + 2.6 s blocking material builds; 15 synchronous pipelines still appear in the first
   20 s after the cover (each a possible hitch).
7. **Heap 1.2-1.4 GB with ~800 MB swings:** large garbage-collection work; find what allocates per frame / per tile.

### Next, in order

1. Trace the streaming stall (teleport + fast flight) with a Performance trace: what the main thread and the GPU
   process do in the 200-300 ms frames and in the multi-second stall.
2. Tile streaming slices (AUDIT_PLAN 1.4): what runs on the main thread when a tile lands / leaves; target < 4 ms per slice.
3. Sun shadow A/B (AUDIT_PLAN 2.1, 2.2).
4. Startup: parallel pre-compile (AUDIT_PLAN 1.3) + the 15 late synchronous pipelines.
5. Heap: allocation profile; geometries 1,664 -> 5,155.
