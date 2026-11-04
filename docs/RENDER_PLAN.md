# Render plan: best look at the lowest frame cost

Written 2026-11-04 after the first real-GPU check (RTX 40-series, Chrome 156, WebGPU) and a
read-only study of three sources: mrdoob/slop-newyork (+ slop-egara), the owner's
`game-engine-v1` (READ-ONLY, never edit it; copy into `vendor/` with an `ORIGIN.md`), and the
three.js r187 source and release notes.

## Measured baseline (2026-11-04)

| View | fps | worst frame | draw calls | triangles | GPU memory |
|---|---|---|---|---|---|
| Overview G4 | 60 (vsync) | 17 ms | 599 | 7.0 M | 400 MB |
| Saint-Job, night | 60 | 17 ms | 433 | 6.0 M | 401 MB |
| Walk, `ring=2`, settled | 60 | 17 ms | 413 | 6.2 M | 387 MB |

**Problem: 300–570 ms freezes while tiles stream in** (10 in the first 20 s of `ring=2`).
CPU profile: ~394 ms in `NodeBuilder.build` / `getNodeBuilderState` / `createRenderPipeline` inside
`renderer.render` (shader building on first render), ~170 ms in `createLeafAtlas` (trees.js, canvas 2D).

## Root cause found and fixed (2026-11-04)

The freezes were **not** JavaScript (only ~450 ms of node builds in 22 s) but the **GPU process**
compiling shaders (DXC on Windows, ~450 ms for a 40 KB fragment shader). Per-tile JS numbers were
written into the WGSL as constants, so every tile produced new shader text and recompiled:
`groundMaterial` (tile bounds, 33 KB shader) and `asphaltMaterial` (marking atlas scale/range,
41 KB). Both are now `uniform()`s. Result, `ring=2` walk: after boot, no frame over 100 ms
(was ~10 freezes of 450–600 ms); programs 101 -> 79.

**Rule: never bake a per-tile / per-object JS number into a TSL graph; use `uniform()` or an
attribute.** Check: hook `GPUDevice.prototype.createShaderModule` and confirm no shader is created
when a new tile streams in.

How it was found (reusable): count `createShaderModule` / `createRenderPipeline` per freeze, then
diff the WGSL of two same-size modules.

## Why freezes can happen (r187 rules)

- A render object's cache key includes the **lights node**: adding, removing or toggling any light
  rebuilds every lit material. (`lamps.js` adds its 6 PointLights on the main tile only, so it was
  not the cause; keep it that way: one fixed pool, never per tile.)
- Node materials share a build only when they use the **same node objects**. `texture(tileTex)`,
  a fresh `uniform()` or `Fn()` per tile = a new build per tile. Plain material properties
  (`.map`, `.color`, `.roughness`) only enter the key as on/off, so per-tile textures go there.
- `compileAsync` does not render shadow maps (r186+), and pipelines are keyed to the render
  target format: warm up on the **real canvas** (game-engine-v1 `roadGame.js` 8545–8680 lesson).
- Two `compileAsync` in flight crash on r187: queue them (game-engine-v1 `v3/render/serialCompile.js`).
- InstancedMesh under 1025 instances bakes the count into WGSL (own pipeline each); pad past
  1025 to share (`v3/render/instancePipeline.js`).
- One BatchedMesh per tile = one build per tile, and on WebGPU it issued one draw per instance
  in game-engine-v1's measurement. Avoid.

## Phase 1: no freezes (before the Vercel deploy)

1. [x] Per-tile constants in ground / asphalt shaders -> uniforms (see above). The main fix.
2. [ ] Boot: a ~3 s compile burst ~4.5 s in, then two ~500 ms freezes (first asphalt-with-atlas
   shader). Warm up on the real canvas behind a loading screen, shadows included
   (`games/shared-rts/pipelineWarmup.js`, `awaitPipelinesQuiet`), async/parallel pipelines
   (`v3/render/parallelPipelines.js`); `keepPipelines.js` for unload/reload.
3. [ ] Remaining 100–200 ms main-thread slices per tile (tree field build, features).
   Optional: share ground/asphalt material instances to cut the ~10–25 ms CPU node build per tile.
4. [ ] Leaf atlas built once in the worker on an OffscreenCanvas (`v3/render/objects/rtsAtlasWorker.js`).
5. [ ] Target: no frame over 33 ms walking with `ring=2`.

## Phase 2: cheap look fixes

- [ ] Glass speckle: box-filtered window grid that fades to its mean below a pixel
  (slop-newyork `js/tsl-materials.js` 116–162), specular AA (fwidth(normal) into roughness,
  game-engine-v1 `games/thunderline/proto/kit/roadSurface.js:151`), glass roughness ≥ 0.18; TRAA later.
- [ ] Wet / varied asphalt (`v3/render/roads/wetRoad.js`, `asphaltSurface.js`).
- [ ] Grooved tram rails (no existing implementation anywhere: new).
- [ ] Night streets too dark: analytic lamp pools in the ground/asphalt shaders, lamp positions
  in a shared uniform/storage array (game-engine-v1 `games/modular-road-v3/modularRoadCityStreets.js`
  `lampPool` ~l.881); skyglow ambient; emissive lamp glass in bloom.

## Phase 3: scale to all of Uccle

- [ ] Shadow proxies + per-cell distance culling (slop-newyork `js/scene-culling.js`).
- [ ] Tree impostors (`v3/render/foliage/octahedralCore.js`), coverage mips (`alphaCoverageMips.js`).
- [ ] Static shadows: `shadow.autoUpdate = false`, `needsUpdate = true` when a tile lands.
- [ ] If many real lights are needed: `ClusteredLighting` (r185+) with a fixed pool, never toggled.

## Phase 4: Blender kit

game-engine-v1 `tools/blender/bkit.py`, `tools/optimizeGlb.mjs` (UASTC/ETC1S KTX2 + meshopt,
16-bit positions), `tools/compressTextures.mjs`, `tools/lod/autoLod.mjs`. See `docs/BLENDER.md`.

## Not now

MeshletDrawingPipeline (r187, experimental), Hi-Z culling (−0.18 ms in the engine lab), Firmament
sky (lab only in game-engine-v1; Sky Pro is the production one).
