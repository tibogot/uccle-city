# agargaro's three.js libraries vs our own instancing (docs/TODO.md item 8k)

Desk study, 2026-11-17, offline: the code was read, nothing was run in a browser. The five repos were cloned (read
only, no install, no build) at their current `HEAD`. Our side was read on `claude/foundation` (05a58e26), with three
r187 taken from `tools/worker/node_modules/three` (0.187.0, the same build the viewer pins in `viewer/index.html`).

**Short answer: adopt none of them.** We have already built, on r187 WebGPU, everything they offer that matters for
the city. Two of the libraries are WebGL-only, and on r187 WebGPU the BatchedMesh one gets its draws overwritten by
three's own code. Two of their ideas fit into `viewer/multiDraw.js` as small jobs (section 4).

## 1. The libraries

| library (npm) | latest (repo HEAD) | three range | renderer | licence | maintenance |
|---|---|---|---|---|---|
| instanced-mesh `@three.ez/instanced-mesh` (InstancedMesh2) | 0.3.16, last commit 2026-10-06 (repo now three-ez/instanced-mesh) | peer `>=0.186.0`, dev lock 0.186.0 | **WebGL only** | MIT | active: CI, benchmarks, screen-space LOD added 2026-09 |
| batched-mesh-extensions `@three.ez/batched-mesh-extensions` | 0.0.12, 2026-06-23 | peer `>=0.159.0`, dev lock **0.174.0** | WebGL; a `webgpu.js` build exists but does not take effect on r187 (below) | MIT | slow; README "vanilla examples will be added" |
| BVH.js `bvh.js` | 0.0.13, 2026-10-26 (tooling only) | none (pure maths) | n/a | MIT | README still "Work in progress"; a TODO list of missing queries |
| octahedral-impostor `@three.ez/octahedron-imposter` | 0.0.1, 2025-11-03 | peer `>=0.159.0` | **WebGL only** (GLSL + WebGLRenderer bake) | MIT | demo-grade, idle for a year, 7-line README |
| simplify-geometry `@three.ez/simplify-geometry` | 1.0.0, 2026-11-12 | peer `>=0.159.0` | n/a (CPU, meshoptimizer WASM `^1.3.0`) | MIT | active (playground site) |

### 1.1 instanced-mesh (InstancedMesh2)
- **What it does.** It is a drop-in InstancedMesh. Each frame it culls instance by instance on the CPU (linear, or
  through a bvh.js BVH of the instance boxes), sorts the visible instances (opaque front to back, or a radix sort),
  picks LODs (by distance or, since 2026-09, by screen size, with hysteresis), with separate **shadow LODs**. It also
  has per-instance uniforms (a data texture), morphs, skinning (bone texture), BVH raycasting and InstancedEntity
  objects.
- **How it draws.** The visible list goes into an instance-index buffer that is uploaded every pass.
- **Why it is WebGL only (the code).**
  - `core/utils/GLInstancedBufferAttribute.ts` creates and fills a raw `gl` buffer: `gl.createBuffer`, `gl.bufferData(...,
    gl.DYNAMIC_DRAW)`, `gl.bufferSubData` inside `onBeforeRender` / `onBeforeShadow`.
  - `InstancedMesh2.ts` calls `gl.getParameter(gl.CURRENT_PROGRAM)` and patches materials through `onBeforeCompile`
    with the GLSL chunks in `src/shaders/chunks/*.glsl`.
  - `SquareDataTexture.ts` uploads with `gl.texSubImage2D` and the `__webglTexture` internals.
  - There is no TSL and no WebGPU path, and its docs never mention WebGPU.
- **Against our rules.** Even if it were ported, it re-uploads a buffer on every pass (view + sun shadow + lamp
  shadows), the pattern we ban with `no-dynamic-draw-usage`. Its LODs are hard switches with hysteresis, with no
  dithered cross-fade (`smooth-lod-no-popping`). It keeps no previous-frame transform per instance, so TAAU would get
  no motion vectors.

### 1.2 batched-mesh-extensions
- **What it does.** It patches `BatchedMesh.prototype`:
  - a bvh.js BVH of the instances (`computeBVH`), with BVH or linear frustum culling and sorting in `onBeforeRender`;
  - LOD as extra index ranges per geometry (`addGeometryLOD`, picked by screen size or distance; no fade);
  - raycasting;
  - per-instance uniforms. The README marks these **"WebGLRenderer only"**, and they are left out of `index.webgpu.ts`.
- **The r187 problem (found by reading the code).**
  - In r187 the WebGPU backend does not read `_multiDrawStarts / _multiDrawCounts`. It loops over
    `_mergedDrawStarts / _mergedDrawCounts / _mergedDrawInstanceCounts`
    (`renderers/webgpu/WebGPUBackend.js` ~2147).
  - Those arrays are filled by three's own `_updateDrawParameters(..., 'merged')`, which runs from an `OnObjectUpdate`
    in `nodes/accessors/Batch.js:176-180`, after `onBeforeRender`.
  - The extension writes only the old `_multiDraw*` arrays (it has no `merged` or `_updateDrawParameters` anywhere in
    `src/`), and it was tested against three 0.174.
  - **So on r187 WebGPU its culling, sorting and LOD picks are thrown away and three's own culling draws.** The BVH
    work is pure cost.
- It also relies on private fields (`_indirectTexture`, `_geometryInfo`, `_instanceInfo`) that three has already
  changed once.
- **Note.** Plain r187 BatchedMesh already does per-instance culling + sorting on WebGPU, and its `Batch.js` keeps a
  *previous matrices texture* for velocity (line 159). That is useful to know, but each matrix change marks the
  whole matrices texture `needsUpdate` (`BatchedMesh.js:611`): a full re-upload, which our movers' rule forbids.

### 1.3 BVH.js
- **What it does.** A dynamic AABB tree over objects, not triangles: insert, move, delete, `frustumCulling`,
  `frustumCullingLOD`, ray / box / sphere queries. It uses incremental insertion (Catto's dynamic BVH) or a top-down
  build. It is pure TypeScript with no three dependency, so it would run on WebGPU.
- **Not done.** `intersectsRayFirst`, `getNearestObject` and BVH vs BVH are still on its TODO list.

### 1.4 octahedral-impostor
- **What it does.** It bakes an octahedral atlas (albedo + normal/depth MRT) with a `WebGLRenderer` and
  `WebGLRenderTarget` (`utils/createTextureAtlas.ts`).
- **How it draws.** A MeshStandardMaterial patched through `onBeforeCompile` with GLSL (`shaders/impostor/*.glsl`).
  It blends 3 frames in the vertex shader and discards early on the dominant frame. Its parallax is disabled.
- **Status.** WebGL only. Already compared line by line in `docs/IMPOSTORS_RESEARCH.md` (table at line 214, notes at
  271). Version 0.0.1, no commits since 2025-11.

### 1.5 simplify-geometry
- **What it does.** A thin wrapper over meshoptimizer's `simplify` / `simplifyWithAttributes` for a `BufferGeometry`:
  per-attribute weights, `protectSeams`, LOD chains, and a "shared vertices" mode (LOD levels as index buffers over one
  vertex buffer). It runs on the CPU, so the renderer does not matter.

## 2. Our equivalents, feature by feature

| feature | agargaro | ours (file / function) | who is ahead |
|---|---|---|---|
| fewer render objects (our CPU limit: ~10-12 us each, ~390 / frame, docs/PERF_GAME.md) | InstancedMesh2: 1 object per mesh; BatchedMesh: 1 object, N draws | `viewer/multiDraw.js` MultiDrawSet: many pieces per object via `setIndirect` + `drawIndexedIndirect` with first-instance; `mergeStreamPools`; `viewer/farMerge.js` `mergeFarLevel` (far LOD in 1 draw) | **ours**: same or better object count, no per-pass upload |
| per-instance frustum culling | per instance, CPU, index buffer re-uploaded per pass | `MultiDrawSet.cull()`: per-pass chunk cull (chunks <= 160 m, <= 48 per part), only the indirect offset list changes, nothing uploaded; `viewer/cellCull.js` for big static meshes (40 m cells, sun reach) | theirs is finer; **ours costs nothing on the bus**. Gap: chunk size (job 2) |
| streaming / gathering | none (everything resident) | `viewer/instanceStream.js` Streamer / StreamPool: 50 m cells, LOD bands + 6 m margin, 2 m trigger, time-sliced generator gather (0.45 ms / frame shared budget), FadeSlots per tile | **ours** (they have no equivalent) |
| sorting (overdraw) | sorts opaque front to back, transparent back to front, per frame | none: the cull list is in part / chunk order; leaf cards have a depth pre-pass (docs/RENDER_PLAN.md) | **theirs** for the opaque sets without a pre-pass (job 1) |
| LOD | hard switch + hysteresis; distance or screen size | distance bands with dithered cross-fades (`viewer/lodFade.js` keepBand / objectFade, `lodEye` so the shadow matches the eye), per-instance bands in shaders | **ours** (no popping) |
| shadow LOD | `addShadowLOD` (a cheaper geometry for the shadow pass) | `parkKit.js` shadowProxy (LOD2 casts for LOD0/1), facade kit LOD0-only casters, `treeshadow` switch, sun shadow cache (`?sunshadowcache`) | equal; we have it where it pays |
| motion vectors | none (InstancedMesh2); BatchedMesh previous-matrices texture (whole re-upload) | `viewer/instMotion.js` InstancePrev: 16 B / drawn instance / frame, update ranges, yaw-delta reprojection | **ours** |
| per-instance uniforms | data texture, WebGL only | instance attributes / storage buffers in TSL (band / variant vec4s, FadeSlots uniformArray) | **ours** on WebGPU |
| skinning | bone texture per instance (WebGL) | pedestrians: compute pass writing poses from a baked gait table (`viewer/pedestrians/crowd.js`, docs/PEDESTRIANS.md) | **ours** |
| raycasting / BVH | instance BVH (bvh.js) for picking | `viewer/heroBVH.js` (triangle BVHs off the main thread, `character/bvh.js` TriBVH); 48 m cell hashes for drive colliders (`viewer/drive/colliders.js`); height fields for the orbit cam (docs/ORBITCAM.md) | ours fits our queries; no per-instance picking need today |
| impostors | WebGL demo, 3 frames, no parallax | `viewer/impostorKit/` TSL: 3-view bary, single-step parallax, pixel depth offset, coherent alpha, dither fade, measured jitter 0.42-0.58x the mesh (docs/IMPOSTOR_KIT.md) | **ours** |
| mesh simplification | wrapper over meshoptimizer | meshoptimizer used directly: `viewer/drive/carLod.js` (`simplifyWithAttributes`, welded / loose / prune modes, in `carLodWorker.js`), `tools/calevoet_pack.mjs`, `tools/christmas_pack.mjs`; heroes use scripted Blender LODs on purpose (meshopt streaks, HEROES_REPORT) | equal; the wrapper adds nothing we lack |

How our constraints rule things out:
- **Fixed light count.** No conflict: none of the libraries adds lights.
- **No DynamicDrawUsage, update ranges only.** Rules out InstancedMesh2's per-pass index upload and BatchedMesh's whole
  matrices-texture upload for movers.
- **TAAU per-instance motion.** Any replacement for our instanced movers (traffic, two-wheelers, trams, trains) must
  keep `InstancePrev`. None of the libraries can.
- **Smooth LOD.** Rules out their hard LOD switches unless a dither band is added on top, which is what we already
  have.
- **Shadow cache.** Our cached static sun shadow already removes most of the shadow-pass cost their shadow LOD aims
  at.

## 3. Verdicts

| library | verdict | why / where |
|---|---|---|
| instanced-mesh | **SKIP** (borrow 2 ideas) | WebGL only (raw `gl`, GLSL chunks, `onBeforeCompile`). A port would bring back per-pass uploads and lose motion vectors and fades. Ideas worth taking: front-to-back order of what is drawn (job 1) and finer culling granularity (job 2), both inside `viewer/multiDraw.js`. |
| batched-mesh-extensions | **SKIP** | On r187 WebGPU its culling / LOD output is thrown away (three draws from `_mergedDraw*`, filled by `Batch.js`). Uniforms are WebGL only. It patches private fields. Plain BatchedMesh is no better than MultiDrawSet for us: it uploads the whole matrices texture on any change, and each draw is a direct call looped on the CPU. |
| BVH.js | **SKIP** (keep in mind) | Our culling units are few (<= 48 chunks per part, tile cells). A linear test over them costs microseconds, and a BVH only pays from thousands of nodes. Colliders use 48 m hashes; heroes need triangle BVHs, which BVH.js does not build. It becomes relevant only if we ever pick or cull **individual moving instances by the thousand** (e.g. a click-to-select over every parked car). |
| octahedral-impostor | **SKIP** | WebGL only, version 0.0.1, idle. Our impostorKit is ahead on every axis we measured (docs/IMPOSTORS_RESEARCH.md table). Its one trick, the dominant-frame early discard, is already in our research notes. |
| simplify-geometry | **SKIP** | We already call meshoptimizer directly with more control (`carLod.js`). Its "shared vertices" LOD mode does not fit our flat-shaded, non-indexed car LODs. Heroes keep scripted Blender LODs. |

## 4. Plan: at most 3 small jobs, ranked

Before measuring, run `tools/perf/preflight.ps1` + `debug/preflight.js` and measure only on GREEN, with one Chrome tab
(`perf-preflight`, `one-chrome-tab`). Each job gets an A/B switch, alternating rounds, and the merge gate + city tour
before merging.

### Job 1: front-to-back order of the visible chunks in the view pass (idea from InstancedMesh2 `sortObjects`)
- **Where.** `viewer/multiDraw.js` `MultiDrawSet.cull(camera, frame, v)`.
  - After the frustum test, for the **view camera only** (not shadow cameras: no shading there) and only for opaque
    views without a depth pre-pass twin, order `e.all` by the distance from the camera to each chunk box centre (an
    insertion sort over <= parts x 48 entries).
  - The indirect draws then run near to far, and early-z rejects the hidden fragments of the far chunks (roof kit,
    facade kit, furniture, street trees' trunks).
  - Switch: `?mdsort=0`.
- **Measure.**
  - `debug/gpuAB.js` `measure({ seconds: 5 })` at 3 fixed street-level views: Place Saint-Job, Chaussée d'Alsemberg
    looking down the street, the police spawn.
  - Then `debug/gamePerf.js` `police({ seconds: 45 })` for the CPU.
- **Target.** Scene pass GPU -0.2 ms or better on at least 2 of the 3 views. CPU +0.02 ms or less (the sort). Pixels
  identical (order only).
- **Risk.** Low: the order does not change the image of opaque geometry. The win may be small where the pre-pass
  already exists. If under 0.1 ms, drop it.

### Job 2: finer culling granularity for the city-wide sets (InstancedMesh2's per-instance culling, at chunk scale)
- **Where.** `viewer/multiDraw.js` `CHUNK = 160, CHMAX = 48`.
  - Try 80 m / 128. This means 2.7x the indirect buffer (`parts x CHMAX x 20 B`, still a few KB).
  - It gives tighter boxes for the view and, above all, for the sun shadow camera and the lamp shadows.
  - Instances in a 160 m chunk that only grazes the frustum currently get all their vertices drawn.
  - Switch: `?mdchunk=160`.
- **Measure.**
  - `MultiDrawSet.stats()` (instances and draw commands per pass) and `debug/drawBreakdown.js` `run({ frames: 30 })`,
    to confirm render objects are unchanged.
  - `debug/gpuAB.js` (shadow + scene passes), and the night lamp-shadow case with `debug/nightShadowCost.js`.
- **Target.** Instances drawn per pass -20 % or better, shadow pass -0.1..-0.3 ms GPU, cull CPU < 0.05 ms per frame,
  render objects unchanged.
- **Risk.** More indirect draws per object. They are cheap GPU-side, but check that r187 issues
  `drawIndexedIndirect` per offset without per-draw CPU work beyond the loop (it does: `WebGPUBackend.js` ~2189).
  Chunks overflowing CHMAX fall back to coarser chunks (`chunk(..., lim * 1.5)`), which is already handled.

### (No job 3.)
Nothing else in the five libraries beats what we have on r187 WebGPU. The CPU wall is still three's per-render-object
cost (docs/PERF_GAME.md), and none of these libraries reduces it below what MultiDrawSet / farMerge already do.

## 5. Sources read
- agargaro / three-ez repos (HEAD on 2026-11-17):
  - instanced-mesh: `src/core/InstancedMesh2.ts`, `core/utils/GLInstancedBufferAttribute.ts`,
    `core/utils/SquareDataTexture.ts`, `core/feature/LOD.ts`, `FrustumCulling.ts`;
  - batched-mesh-extensions: `src/index.webgpu.ts`, `patch/ExtendBatchedMeshPrototype.*.ts`,
    `core/feature/FrustumCulling.ts`, `LOD.ts`, README;
  - BVH.js: README, `src/core/BVH.ts`;
  - octahedral-impostor: `src/core/octahedralImpostorMaterial.ts`, `utils/createTextureAtlas.ts`;
  - simplify-geometry: README, `src/Simplify.ts`;
  - the `package.json` / `package-lock.json` of each repo.
- three r187: `src/objects/BatchedMesh.js` (`_updateDrawParameters`, `onBeforeRender`),
  `src/nodes/accessors/Batch.js` (`OnObjectUpdate`, previous matrices),
  `src/renderers/webgpu/WebGPUBackend.js` (BatchedMesh loop, indirect offsets).
- Ours:
  - code: `viewer/instanceStream.js`, `multiDraw.js`, `cellCull.js`, `farMerge.js`, `heroBVH.js`, `instMotion.js`,
    `lodFade.js`, `impostorKit/material.js`, `drive/colliders.js`, `drive/carLod.js`;
  - docs: `docs/PERF_GAME.md`, `IMPOSTOR_KIT.md`, `IMPOSTORS_RESEARCH.md`, `RENDER_PLAN.md`, `ORBITCAM.md`,
    `PEDESTRIANS.md`.
