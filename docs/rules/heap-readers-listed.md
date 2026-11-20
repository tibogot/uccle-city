---
number: 13
check: `heap`: tools/audit/heapGate.mjs + browser `__heapDrop.tripCounts` stays `{}`
---
**Rule.** Any module that reads a tile's terrain / road / building / far-tile meshes on the CPU after the build is listed in docs/HEAP.md "Readers" and keeps what it reads (keep list, hold, or `needCpu` refusal); loadTile's dispose keeps no build result.

**Why.** three r187 keeps every array after the GPU upload and a dispose closure held each tile's whole worker result (~37 MB per tile): police heap 1.45 GB
