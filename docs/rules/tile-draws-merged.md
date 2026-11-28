---
status: provisional
added: 2026-11-27
check: `fewerdraws` (tools/audit/fewerDrawsCheck.mjs: a tram tile's platform slabs + kerb edges are one casting mesh with one shared material, colour / roughness per vertex) + debug/tileDraws.js (draws per full tile and mesh kind, per pass) in docs/perf/QUIET_2026-11-27.md
---
**Rule.** Two meshes of one tile that differ only by plain material values (colour, roughness, metalness) are ONE mesh: the values go into vertex attributes read by ONE material made once for every tile (rule shared-node-graph), each part's normals computed as before. Keep a mesh separate only when its shader, its pass flags (cast / receive, side, transparency), its LOD switch or a reader of its own (instances read by colliders, garlands) need it. Count first with debug/tileDraws.js at the spawn view.

**Why.** three r187 pays ~25-28 us of main thread per render object, and the police game is CPU-bound (docs/perf/QUIET_2026-11-26.md). A tram tile drew its platform slabs (grey, roughness 0.85) and their kerb edges (light, 0.7) as two meshes with two materials made per tile: 2 draws in the main pass and 2 in the sun's for one look, and a fresh material per tile.
