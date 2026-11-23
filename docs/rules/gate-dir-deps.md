---
status: provisional
added: 2026-11-23
check: `gatedirdeps` (tools/audit/gateDirDepsCheck.mjs: a file added in a new sub-directory of a listed directory touches the row; modified files in a listed-only directory do not); `heroshell` now probes the villa (HERO_LIST) with a ratchet ceiling
---
**Rule.** A gate row that LISTS a directory (readdir: it discovers what is there) is re-run when anything is added to or deleted from that directory at ANY depth, not only directly in it. `tools/gate/deps.mjs touches()` tests every ancestor of an added or deleted path against the row's listed directories. A new hero, kit or data family that lives in its own new sub-directory therefore re-runs the rows that discover heroes, kits or data by scanning. A new hero must also be in `tools/audit/census/openMeshes.mjs` HERO_LIST, with its ceilings in `tools/audit/heroShell.ceil.json` (heroshell fails on any placed hero it does not probe).

**Why.** claude/villa1 (merged 2026-11-23) added `models/villa/`. heroshell scans `models/*/*.json` for placed heroes, but the test was `dirname(p)` in the listed dirs: `models/villa` is not `models`, so the row was skipped on the villa merge. It then failed on foundation for every later branch ("villa/villa: a placed hero not in the probe's HERO_LIST"; claude/places1 reported it). The villa's shell was never probed: open 17.7 / 23.2 / 6.8 m2 at L0 / L1 / L2 (the glass wall and garage mouth, the LOD1 back-faces noted in docs/VILLA.md, LOD2 holes). It is held at a ratchet until a villa follow-up classifies the intended openings and fixes the LODs.
