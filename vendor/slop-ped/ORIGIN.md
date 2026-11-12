# vendor/slop-ped: origin

Mr.doob's pedestrians (bodies, procedural clothes shader, rigid-pair instanced GPU skinning, PersonRig gait / IK) from
**mrdoob/slop-newyork** (MIT, © 2026 Mr.doob; see `LICENSE` in this folder).

| | |
|---|---|
| Source repo | https://github.com/mrdoob/slop-newyork |
| Source commit | `536a907c605964421563f12f15c5e00d735fc94f` (2026-11-06) |
| `pedestrians.js` | `js/pedestrians.js`, copied **unchanged** (2,213 lines: skeleton, `buildPersonGeometry`, `createPersonMaterial`, `PersonCrowd`, `PersonRig`) |

Not copied: `js/pedestrian-system.js` and `js/pedestrian-routes.js` (they depend on his city grid). Their ideas (kerb
queues, reaction delay, pauses) are re-written for a walk graph in `viewer/pedestrians/sim.js`.

## Rules

- Do not edit `pedestrians.js` without a line in `CHANGES.md`. Our adaptation lives in `viewer/pedestrians/`
  (bone table, LOD bands, compute pass, meters) and `tools/peds/` (the gait baker loads this file in Node with its
  three imports redirected, without editing it).
- To update: re-copy from a newer upstream commit, update the hash, re-run `node tools/peds/bakeGait.mjs`.
