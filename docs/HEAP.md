# HEAP: the CPU copies after the GPU upload (branch claude/heap, 2026-11-17)

Goal: JS heap < 1.0-1.2 GB at police play (round 9: 1.46 GB, 1.23 GB of it ArrayBuffer contents, docs/PERF_GAME.md
"Round 9"), with no visual or behavioural change, by letting go of the CPU copies nothing reads after three r187
(WebGPU) uploaded them. Every drop has its own `?x=old`; `?heapdrop=old` turns them all (and the hooks) off.

## How (viewer/heapDrop.js)

three r187 facts (read in tools/worker/node_modules/three/src/renderers, r187):
- `Attributes.update`: a vertex / index attribute is written ONCE (`data.version === undefined` -> `createAttribute`,
  `mappedAtCreation` + `set(array)`), again only when `attribute.version` grows. WebGPU never calls `onUploadCallback`.
- After the upload the renderer reads only `array.constructor` / `BYTES_PER_ELEMENT` (vertex format, vertex layout,
  index format at every draw: `index.array instanceof Uint16Array`) and `attribute.count` (a plain property set in the
  constructor). So the array is swapped for an EMPTY array of the SAME type: formats, strides, counts unchanged.
- Wireframe (Geometries.getWireframeAttribute) reads the index array: wireframe meshes are never dropped.
- The GPU buffer lives until the GEOMETRY dispatches `dispose` (Geometries onDispose, RenderObject onGeometryDispose ->
  deleteNodeAttributes); a render object's dispose (roSweep.js, a cache-key change) does not touch it.
- A texture: `Textures.updateTexture` returns at once while `textureData.version === texture.version`; a compressed
  texture's level count comes from `mipmaps.length` at creation (the mip objects keep width / height, data -> null).
- `Info` reads `array.byteLength` / `mipmaps[i].data` for its memory stats only (`renderer.info.memory` sizes undercount
  once dropped).

The module: `dropAfterUpload(root, { tag, keep, filter })` registers meshes; once a second it drops each registered
attribute / index whose GPU copy exists and is current (not in `keep`, not held). Before a geometry's first drop its
`boundingBox` and `boundingSphere` are computed from the full arrays. `hold(tag)` / `release(tag)` keep a tag's
geometries for a reader that comes later. A mesh under cellCull.js waits until its sort is done (it copies position +
index at its first draw and sets a new index). An attribute no shader ever reads is never uploaded and so never dropped
(it is left after 180 s). `dropTextureData(tex)`: a DataTexture's pixels after its upload; the KTX2 hook: every
compressed texture's mip levels after its upload (new mip objects: a clone, if any, keeps its own list).

Guards (a TRIP = console.error once per kind, `window.__heapDrop.trips` / `.tripCounts`):
- a dropped attribute marked for update: the update is SKIPPED (the GPU copy stays as it was);
- a dropped attribute created again (its geometry disposed while still drawn): cannot be helped, reported;
- `computeBoundingBox / Sphere` on a dropped geometry: the bounds from before the drop are kept;
- `clone / toNonIndexed / computeVertexNormals / computeTangents / applyMatrix4` of a dropped geometry: reported;
- a dropped texture marked for update: skipped (GPU copy kept); created again after a dispose: reported;
- `needCpu(geometry, names, who)`: the CPU audits (contactAudit, collisionTest) throw a clear error on a dropped array.

`window.__heapDrop`: `MB` (attributes), `texMB`, `byTag` (`terrain:I6`, `buildings:I6`, `roads:I6`, `far`), `pending`,
`held`, `trips`. Node check of the logic: `node --import ./tools/heap/register.mjs tools/heap/dropCheck.mjs` (a stand-in
of three's Attributes / Textures: drop only after upload, keep lists, holds, cellCull wait, bounds first, guards).

## Switches (viewer/features.js, section Performance / Memory)

| switch | what goes (default) | before (`=old`) |
|---|---|---|
| `heapdrop` | all of the below + the hooks | every CPU copy kept |
| `tiledrop` | a full tile's worker build result (`d` in main.js loadTile) once built; its terrain, façade (walls, kit walls, roofs, details) arrays once uploaded; roads / decks / plazas / grounds: everything but position + index; the land-cover mask, marking atlas and grass-type textures' pixels | kept |
| `litedrop` | a far tile's terrain + solids arrays once uploaded (its far-tree field is left alone) | kept |
| `ktxdrop` | every KTX2 (compressed) texture's mip levels once uploaded | kept |

Note on `tiledrop`: before it the tile's whole build result stayed alive with the tile (the `dispose` closure read
`d.bridgeDecks`, so `d` sat in loadTile's closure context): dropping attribute arrays alone would have freed nothing.

## Readers (listed before each drop; grep: `.attributes.*.array|getX|fromBufferAttribute|.index.array|getObjectByName(...-terrain|-roads|-buildings)|.mipmaps|image.data|Raycaster|computeBounding*`)

### Full tile meshes (main.js loadTile; registered at the END of loadTile, so every build-time reader is done)
| reader | reads | when | verdict |
|---|---|---|---|
| grass (grass/cityGrass.js -> grassField.addTile) | terrain / roads / buildings meshes as GPU proxies (same geometry), land-cover texture | during loadTile (awaited) | before registration; GPU only after |
| cellCull.js | façade meshes' position + index (slice), then a new index | the mesh's first draw (async sort) | waited for (state `on` / `off`) |
| character/cityHook.js `gather` (third person collision) | every non-instanced mesh of `<tile>-roads` (roads-*, decks, plazas, grounds): position + index; `tram-platform` meshes in features | whenever a tile streams in while the third person is on | **position + index KEPT** for the roads group; features not registered |
| heros/herosGround.js terrainTrianglesIn (Square des Heros lawn) | terrain position, normal, index of the park tiles (E3, E4, F4) | once all park tiles are in, after the hero loads | **held** (`hold("terrain:E3")`...) until the lawn is built (herosCity.js) |
| wolvendaelCity.js | the tiles' terrain / tree meshes into the pond reflection | precompile + render | GPU only |
| flags/flagField.js wallPlanesFrom (Raycaster) | the town hall's LOD0 | flag setup | not a tile mesh |
| orbitCam.js picks / collision | height fields + hero BVHs (heroBVH.js: own arrays from heroColliders) | any time | no tile mesh |
| drive/driveMode.js featureColliders | instanced kit geometries in features | tile landing | instanced: never registered |
| falcon flight / game | `world.roofAt` (roof grid data), hero colliders | play | no mesh |
| lodFade.js fadeProxies / warmup.js | proxies SHARING the geometry (new Mesh(o.geometry)), compile / draw | load, hand-over | GPU only (an attribute the fading copy needs and the base did not: never uploaded, so never dropped) |
| roSweep.js | disposes stand-ins' render objects (not geometries) | every 5 s | GPU buffers untouched |
| interior/cut.js (house cut) | shader uniforms only | - | GPU only |
| weather (overheadMap, snowLayer, snowCaps / cityCaps) | layers rendered from above (GPU); caps bake from kit geometries | snow | no tile mesh on the CPU |
| tile dispose / retire (main.js) | geometry.dispose(), fadeProxies | unload | fine (the GPU buffers go with the geometry) |
| horizon.js (?horizon=1) | the tile groups' fades | per frame | no geometry |
| contactAudit.js, drive/collisionTest.js | terrain / roads (+ normals) / buildings on the CPU | dev console | `needCpu` throws: run them with `?heapdrop=old` |
| falconFlight/cityWorld.js | its own copy (Falcon Flight Lab) | lab | not the city |

### Far tiles (main.js loadLiteTile)
Readers: the build itself, preCompile + fading copies (GPU), liteShown.js (by name), horizon (fades), dispose. Nothing
reads their arrays on the CPU: all dropped once uploaded. The far-tree field (buildFarTreeField) is not registered.

### Textures
| texture | readers of the CPU data | verdict |
|---|---|---|
| tile land cover (ground.js landCoverTexture), marking atlas (roadPaint.js), grass types (grassField.js) | none after the upload (materials sample them on the GPU; cityIvy / nightLighting / flagField write their OWN textures) | dropped with `tiledrop` |
| KTX2 (scans.js, treeTextures.js, groundTex.js / paving.js arrays, the models' KHR_texture_basisu, aoTexture.js) | scans / treeTextures / aoTexture byte stats at load (before the upload); groundTex.js / paving.js read the per-layer textures' mips to build their arrays (those layers are never uploaded: disposed after the pack); upscale.js reads `mipmaps.length` (kept) | dropped with `ktxdrop`; one renderer only (main.js), so no second upload |

### Not dropped (readers found)
- Instance pools (`instanceMatrix`, kit per-instance attributes): read back by getMatrixAt (cityHook, driveMode, snow
  caps gather), rewritten on every tile add / remove (re-bucketing: lamps, kits, christmas): needed.
- Kit / model geometries shared by many tiles (`userData.shared`, furniture / street kits, cars): cloned lazily per tile
  (streetlife.js, artCity.js), read by driveMode / cityHook / snowCaps: needed.
- The street-life text atlas (32 MB): layers are copied in per tile (round 9).
- Features group meshes (tram, rail, lamps, cars): cityHook / driveMode / collisionTest read them; small.
- Landmarks / heroes: heroColliders + flags + artCity + farMerge read their geometry at varying times; not done yet.

## Gate (tools/audit/mergeGate.mjs "heap" -> tools/audit/heapGate.mjs)
WHY IT HAPPENED: three r187 keeps every array it was given after the upload, nothing let them go, and loadTile's dispose
closure read `d.bridgeDecks`, so a tile's whole worker build result (~37 MB a full tile) lived as long as the tile.
RULE: a module that reads a tile layer's meshes on the CPU after the tile is built is listed in "Readers" above and in
heapGate.mjs KNOWN (and keeps its arrays: keep list / hold / needCpu); loadTile's dispose keeps no build result.
CHECKS: heapGate.mjs (node): the heapDrop logic (tools/heap/dropCheck.mjs), no unlisted reader of a tile layer by name,
loadTile's dispose free of `d.`, the switches' features.js rows. BROWSER line: a police play + gamePerf police 45 s
with `window.__heapDrop.tripCounts` = {}.

## Next (not done)
- GLB bodies held through the GLTF parser's plugins (`GLTFParser.extensions <- GLTF*Extension.parser`): ~4-8 MB.
- meshoptimizer's main-thread WASM memory (8 MB).
- Landmark geometry (readers: heroColliders, flags, artCity, farMerge at varying times): a hold per landmark until its
  colliders / bakes are done would let its LOD arrays go.

## Results (2026-11-17, browser, preflight GREEN, local tools/serve_cached.py, warm tile cache, ONE tab)

Measuring: a FRESH tab per load (closing the old one). Navigating the same tab keeps the previous city in the
back-forward cache in the same renderer process: the first "after" read 2.4 GB (two cities: every class doubled in the
snapshot diff). The heap at play + 15 s is read after a forced GC (a heap snapshot): `usedJSHeapSize` before a GC
swings by 300-700 MB with garbage.

| police play + 15 s (after GC) | `?heapdrop=old` | default |
|---|---|---|
| run 1 (heap snapshot total) | 1460.5 MB (ArrayBuffer contents 1232 MB, JS objects 228.6) | **986.1 MB** (ArrayBuffer contents 761, JS objects 225) |
| run 2 (usedJSHeapSize after GC) | 1440 MB | **965 MB** |
| time to play (cover / play) | 20.3 / 52.6 s, 18.8 / 42.8 s | 17.3 / 36.7 s, 18.7 / 40.4 s |
| first 15 s of play | avg 16.7 ms, p99 17, worst 33, 0 over 50 ms (both runs) | same (both runs) |

**-475 MB (-33 %)**, all of it ArrayBuffer contents (JS objects unchanged). What went, by owner, at police play (window.__heapDrop):

| owner | MB |
|---|---|
| far tiles' terrain + solids (`litedrop`) | 102.3 |
| full tiles' façades (walls, kit walls, roofs, details) (`tiledrop`) | 105.3 |
| full tiles' terrain (`tiledrop`) | 62.1 |
| full tiles' road / deck / plaza extras (normal, uv, street attributes) (`tiledrop`) | 34.8 |
| textures: KTX2 mip levels (`ktxdrop`) + the tiles' land-cover / atlas / grass-type pixels (`tiledrop`) | 169 |
| total | ~474 (snapshot: -471 MB of ArrayBuffer contents) |

What is left (after; tools/heap/owners.mjs, 548 buffers >= 256 KB, 551 MB): the street-life text atlas 32 MB + its
pages ~45 MB (needed: copied in per tile), the grass storage buffer 21 MB, a Uint16 DataArrayTexture 16 MB (night light
pool), instance pools / storage buffers (kits, ivy, lamps), the kept road position + index, the heightmaps, the
landmarks' geometry, meshoptimizer's WASM memory 8 MB, GLB bodies held through a GLTF parser's plugins (~4-8 MB:
`GLTFBinaryExtension.body <- GLTFParser.extensions <- GLTF*Extension.parser`).

The round-9 "193 MB of ArrayBuffers with no JS owner": they were not ownerless. Buffers that arrive by postMessage
from a worker show in the snapshot as `native` ArrayBuffer / Uint8Array wrappers that point at each other (a cycle);
the first-retainer chain of tools/perf/heapsnap.mjs ran round it. owners.mjs takes the shortest way up through them:
`ArrayBuffer <- native:Uint8Array.buffer <- Object.data <- ...`: the tile worker's results (the build result `d`
held by loadTile's dispose closure, the far tiles' arrays) and the DataTextures made from them, both dropped here.

Functional sweep (default, `window.__heapDrop.tripCounts` = {} in every run):
- police: gamePerf police 45 s, tiles unloaded and loaded (D3..F5 -> E4..G5), 2382 frames, no trip;
- falcon: gamePerf falcon 40 s, 60 fps, worst 33 ms, no trip;
- free roam: a glide 1750 m east and back: tiles K5..L7 unloaded and loaded again, 0 trips, worst frame 67 ms (one);
- third person at Place Saint-Job: its collision world identical to `?heapdrop=old` (the same TriBVH triangle counts:
  97706, 69681, 95360, 72607, 38579, 1386, the same prism sets);
- Square des Heros: the lawn built after the hold, 4107 vertices / 11955 triangles, same as `?heapdrop=old`;
- orbit picks (3 screen points, Place Saint-Job, snow cover): identical to the metre with `?heapdrop=old`;
- snow cover, Saint-Job from 45 m: 0.034 % of pixels over 24 levels vs `?heapdrop=old` (noise);
- console: the same warnings as `?heapdrop=old` (the "Unable to serialize Texture" x 278 is there in both: Material
  .copy JSON-copies a library material's userData in the models' wrapAO); no error from the drops.
