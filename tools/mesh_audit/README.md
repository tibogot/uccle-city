# Mesh audit: the shared checker against z-fighting, light leaks and bad topology

The owner's rule: **never z-fighting, never bad topology / normals**. Until 2026-11-10 it was written but not enforced.
This folder enforces it for every hero (and later the procedural city: the tile worker's generated geometry).

| file | what |
|---|---|
| `audit.js` | the checks, pure JS, no imports: Node, the browser and the tile worker. `auditParts(parts, options)`, `partFromBufferGeometry(geometry, { name, slot, matrixWorld, maxDistance })`, `toMarkdown(report)` |
| `glb.mjs` | reads any GLB into parts (one per primitive, world space, node + material names), EXT_meshopt_compression and KHR_mesh_quantization included (meshoptimizer's decoder from `tools/worker/node_modules`) |
| `cli.mjs` | `node tools/mesh_audit/cli.mjs <file.glb> [--nodes A,B] [--range Node=metres,...] [--ignore-below y] [--offset x,y,z] [--allow allow.json] [--skip-checks a,b] [--set key=value] [--out dir] [--no-fail]`: writes `<name>.audit.json` + `<name>.audit.md`, exit 1 while blocking items remain |
| `hook.mjs` | the pre-pack hook: `auditBeforePack(rawGlb, opts)` stops the pack on blocking items (`--force-audit` overrides), `auditAfterPack(packedGlb, opts)` re-checks the quantized file |
| `../../labs/flickerTest.js` | the runtime half: N frames from a fixed / slowly moving camera, blinking pixels, heat map (any lab) |

## Checks (severity: block / warn / info)
| check | sev | what it finds | how |
|---|---|---|---|
| `coplanar` | block | same-facing faces closer than `coincident` (0.6 mm) that overlap in projection: z-fight at any distance | candidate pairs from a uniform grid; normals within 5 deg; separation = the smaller of the two triangles' vertex distances to the other's plane (0 when they cross); overlap = convex clip of B projected onto A's plane, > 0.4 cm2 |
| `depth` | block | same-facing overlapping faces farther apart than that but below what the depth buffer resolves at the part's farthest view distance | reversed-Z float32: a depth step is ~ z * 2^-23; the required separation is `D * 2^-23 * depthSafety + quantum` (depthSafety 64 covers interpolation and vertex-transform error; quantum = the file's position quantization, from meshopt's exponential filter). At 94 m: 0.7 mm; 334 m: 2.5 mm; 2 km: 15 mm |
| `near` | warn | same-facing overlaps closer than 3 mm but resolvable | fragile: survives depth, not always quantization or shadow-map bias |
| `crossing` | block | faces of different connected components crossing at < 12 deg: a band where they fight | Möller triangle-triangle intersection on the grid's candidates |
| `seam` | info | steeper crossings (a box set into a wall), summed per component pair | how much geometry is "glued by intersection" |
| `leak` | block | a SLIT next to an open edge you can see through: from in front of the face, the ray through the gap 1.5 mm beyond the edge escapes or first hits a BACK face (= a culled face: you see the sky / the void), while 4-30 mm further out it is closed | rays on a BVH; the viewpoint must be outside the model (6 axis rays: >= 3 first hits on back faces = inside a shell / a wall, skipped) and have 25 cm of free space in front |
| `opening` | info | the same but still open 30 mm out: a real opening (window without glass, the belfry) | |
| `sliver` | warn | triangles longer than 40 x their height and > 25 cm | lightmap / per-corner light interpolate badly along them |
| `streak` | block | a corner normal > 85 deg off its face, or corner normals diverging > 30 deg on a triangle stretched > 6:1 | the shading streaks (e.g. a smooth group across a long sliver) |
| `flipped` | block | the winding's normal opposes the mean corner normal | culled from the side it is shaded for |
| `winding` | warn | two triangles of one part share an edge in the same direction with opposite normals | inconsistent orientation |
| `nonmanifold` | warn | an edge used by > 2 triangles | |
| `tjunction` | warn | a vertex lying inside another triangle's open edge (0.3 mm) | cracks / sparkle along the seam |
| `degenerate` | warn | zero-area triangles | |
| `backtoback` | info | coincident faces facing opposite ways | harmless with back-face culling (e.g. a frame's back on a leaf) |

Welding is global (0.1 mm, across parts and slots), so a wall and a surround in another slot that share an edge are one
surface. Positions in the report: the file's scene coordinates (glTF, Y up, node transforms applied) + `--offset`.

## Calibration (2026-11-10, on the chapel, the town hall and Saint-Job)
- `coincident` 0.6 mm: below the chapel's meshopt position step (~0.3 mm at 20 m) times two; every hit checked by hand
  on the chapel was a real overlap (hidden flush rings 0.5 mm behind the wall around every chamfered reveal, the aisle
  roofs passing through the shoulder copings = the owner's gable-corner z-fight, the gable cross's crossing arms,
  bands and plinths whose end faces lie on the next face's front at the house corners, chair rails overlapping at the
  corners).
- `depthSafety` 64: a 1 mm separation is resolvable to ~110 m; the town hall's sub-millimetre bands at 334 m
  (LOD1's range) are the kind it flags.
- The leak test needed the inside test: without it, gaps behind proud boxes glued on single-sided walls (inside the
  wall) were reported. With it, every chapel hit was real: door-jamb quoins overhanging the chamfered opening with open
  backs, gutter ends without stop ends, the statue's head-veil gaps, the interior oculi (glass 5 mm behind the splay's
  end; wall holes with 32 sides vs splays with 20).
- `opening`, `seam`, `backtoback` are listed for the record; they never block.
- Accepting an item on purpose: `<name>.allow.json` next to the reports: `[{ "check": "near", "at": [x, y, z],
  "radius": 0.1, "why": "..." }]` (positions as reported, after `--offset`).

## How every hero pack calls it
```js
import { auditBeforePack, auditAfterPack } from "./mesh_audit/hook.mjs";
const AUDIT = { name: "townhall", nodes: ["TownHall", "TownHall_door", "TownHall_far"],
  range: { TownHall: 128, TownHall_far: 2000, TownHall_lod1: 380, TownHall_lod2: 2000 },     // each LOD band's END
  ignoreBelow: <lowest ground in scene Y>, offset: [0, OY, 0], reportDir: "models/townhall/audit",
  allowFile: "models/townhall/audit/townhall.allow.json" };
await auditBeforePack(rawGlb, AUDIT);            // stops the pack on blocking items (--force-audit: warn only)
...pack...
await auditAfterPack(packedGlb, { ...AUDIT, nodes: [...with the generated LOD nodes] });
```
The Chapelle de Stalle does this in `tools/stalle_pack.mjs`. For generated geometry (the tile worker, later):
`auditParts(meshes.map((m) => partFromBufferGeometry(m.geometry, { name, slot, matrixWorld: m.matrixWorld.elements, maxDistance })))`.

## The flicker test (runtime)
`labs/flickerTest.js`: freeze the lab's time, render N frames (24) from the current view: fixed, strafing, dollying or
orbiting by sub-pixel steps (0.6 mm per frame), diff consecutive frames' luminance; a pixel BLINKS when it jumps by more
than 0.06 up then down (or down then up) at least twice. Smooth surfaces and edges under a sub-pixel move change a little
and in one direction; z-fighting, shadow acne, sparkle and unstable post effects flip. Output: blinking pixels (count,
ppm), the worst 16 px clusters, a heat map (the frame dimmed, blinks in red, clusters boxed). Stalle Lab: panel
"Performance" -> "flicker test", or `lab.flicker({ move: "strafe", frames: 24, step: 0.0006 })` in the console.
