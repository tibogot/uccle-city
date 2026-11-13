# Perf preflight: is the machine fit for a measurement right now?

Born 2026-11-13: the same boot went from 19.7 s to 29.9 s to the cover within ten minutes, and one flight froze 7.5 s,
on a laptop with 1.2 of 15.7 GB free (Chrome: 6.2 GB in 60 processes). Numbers taken in that state mean nothing.

## Before a session (owner)
- Restart Chrome (or close it fully); no agent running; laptop on mains, power plan High / Best performance.
- One city tab, in front, not minimised, at the reference URL:
  `http://localhost:8820/viewer/index.html?ring=1&far=1&time=golden&traffic=0`

## 1. System check (30 s)
`powershell -ExecutionPolicy Bypass -File tools/perf/preflight.ps1`
Power (mains, plan), CPU speed (% of base clock: < 90 % = throttled) and load at rest, free memory, Chrome's memory,
GPU (nvidia-smi: temperature, active throttle reasons, load at rest), who uses the GPU's 3D engine, other city servers
listening (agents). Verdict GREEN / YELLOW / RED; fix every FAIL first.

## 2. Page check (~20 s, in the city tab)
`const F = await import("/debug/preflight.js"); await F.check()`
- Which GPU Chrome really uses (this laptop: NVIDIA RTX 4050 "lovelace" + Intel UHD; Chrome ignores powerPreference on
  Windows): must match the baseline's.
- A fixed JavaScript workload (CPU), a fixed view over Saint-Job (GPU ms p50 + frame ms), the boot time to the cover.
- Compared with `docs/perf/preflight_baseline.json`: green within 5 % (CPU) / 7 % (GPU) / 10 % (boot), yellow up to
  15 / 20 / 25 %, red beyond.

## 3. Baseline (once, on a fresh machine)
`await F.check({ record: true })` and save the returned object as `docs/perf/preflight_baseline.json`. Re-record after a
driver / Chrome / three.js update or a big change to the city (the fixed view's cost changes with the city).

## 4. Bracketing
Run the page check before AND after each measurement block; if they differ beyond the green band, the block in between
does not count (the machine changed under it).

## First run (2026-11-13 ~05:30, worn machine, agents running): RED
Free memory 1.2 / 15.7 GB, Chrome 6.2 GB in 60 processes, ~30 old dev servers listening (8801-8844, from earlier
agents), CPU 170 % of base (not throttled), GPU 51 C, no limit active. Page: NVIDIA lovelace, CPU bench 82 ms, fixed view
GPU 10.0 ms (agents rendering), boot 18.6 s. No baseline recorded (not a fresh machine).
