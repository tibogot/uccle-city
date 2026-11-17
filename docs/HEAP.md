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

## Still to find (browser turn): the 193 MB with no JS owner, GLB bodies
`tools/heap/owners.mjs x.heapsnapshot` lists ALL retainers of every backing store >= 256 KB, walked up through the
native / system nodes to the first named JS owner (tools/perf/heapsnap.mjs keeps the first retainer only). Suspects:
meshoptimizer's WASM memory (main-thread MeshoptSimplifier in plants / fuel / furniture / falcons / cars: a WASM memory
never shrinks), typed views on decoded GLB buffer views (gltfpack groups accessors per buffer view), the GLTF parser
held by a model module's closure.

## Results
(browser turn: heap at police play + 15 s, before `?heapdrop=old` / after, alternated; the functional sweep)
