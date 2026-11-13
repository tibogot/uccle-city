# Grass: where it stopped (2026-11-13, paused by the coordinator)

Branch `claude/grass` (worktree `.claude/worktrees/grass`, from claude/foundation 743c9f2). No Chrome tab open, nothing
measured yet, no shared file changed yet.

## Done
- Read: TODO "OUR OWN GRASS", GROUND.md, FOLIAGE.md, `viewer/foliage/grass.js` (our earlier lab grass: stateless world
  grid + indirect draw, the working base), PERF AUDIT / PREFLIGHT, ground.js, landcover.js, main.js tile build
  (`loadTile`, `roadMeshes`, `terrainMesh`, `featureObjects`), labs/streetlife-lab.js (pattern for loading real tiles
  through `tileWorker.bundle.js`), engine `hybridGrassSystem.js` (read-only), Revo `src/entities/grass/` (cloned into
  the scratchpad only, not the repo).
- `tools/grass/build_osm_grass.mjs` + `data/grass/osm_grass.json` (12 KB): OSM kinds the features fold away (78 meadows,
  grassland, heath, village greens, pitch surface + sport). Run: `node tools/grass/build_osm_grass.mjs <main repo>/data/raw/osm/area.json`.
- `viewer/grass/grassTypes.js`: per-tile 1 m RGBA8 type raster (R density, G length 0 lawn .. 0.3 park .. 0.65 verge
  .. 1 meadow, B dry, A flowers) from OSM areas + osm_grass.json, verges = terrain within 1.7 m of a measured
  carriageway (not across a sidewalk), thinner under tree crowns; `trunkDiscs()`. Untested in a browser.

## Next (the design decided, in order)
1. `viewer/grass/grassField.js` — camera-following TOP-DOWN BAKE (orthographic, 128 m window, 1024^2 RGBA32F, centre
   snapped to the texel grid, re-baked when the camera is > 12 m from the centre or a tile is added/removed) of proxy
   meshes sharing the city's geometries:
   - terrain proxies (per-tile material, one shader): R = world y, G = pack(density, flowers), B = pack(length, dry),
     A = 1; density from the type raster x land-cover mask (wood R, paths G, sand B, water A -> 0) x slope; the ground's
     rough / dry noise patches (ground.js noiseTex, same formulas) vary length / density; road part `roads-grass`
     (islands) baked as verge grass surfaces;
   - solids (other road parts, buildings, plazas, trunk discs), renderOrder after, depthTest off: output A = 0 (kills
     grass: clean edges at kerbs / walls / under roofs). Use `outputNode` so nothing is tone mapped.
   - packing as integers (floor(a*255)*256 + floor(b*255)); compute does MANUAL bilinear (4 textureLoads), height
     weighted by A so kerb texels never lift a blade.
2. `viewer/grass/grass.js` — compute per frame, stateless world grid (cell 6 cm), HIERARCHICAL RANKS: dispatch level k
   (k = 0..3) walks cells at stride 2^k over a square +-2*d0max*2^k (cap 48 m), skips cells owned by a higher level;
   rank r of level k in [4^-(k+1), 4^-k), top level [0, 4^-K); keep if p(d) = min(1, (d0/d)^2) * endFade > r, grow =
   smoothstep(0, .35, 1 - r/p), widen 1/sqrt(p) capped + pixel floor; d0 by type (lawn 3, park 4.5, verge 6, meadow 8 m).
   Jitter inside the 2^k block. Survivors append into 3 LOD buffers (5 / 3 / 1 segments) each with its OWN indirect
   args + storage buffers (no "indirect-first-instance" needed; WebGL2 / no compute -> textured ground alone). Per blade
   once in compute (Hybrid): height, width, yaw + view-thicken, Voronoi clump, wind (`viewer/foliage/wind.js windAt`),
   push. Vertex: arc bend, flutter. Material MeshStandardNodeMaterial DoubleSide, receiveShadow, no cast; lighting
   normal mostly up, SSS emissive, `addLampLight`, colour converging with distance to the ground's mean albedo
   (ground.json lawn/rough/dry means + macro tone) so blades sink into the textured ground. Seasons from
   `viewer/seasons/season.js` (dry Jul-Aug, olive winter, frost), presets (blades / radius), `node.count` changes need
   no rebuild.
3. `viewer/grass/grassPush.js` — 256^2 toroidal storage buffer (0.25 m, tag per cell), stamp + recover compute, up to 8
   pushers (car wheels, walker, falcon landing).
4. `labs/grass-lab.html/.js` (+ labs index): tiles via the worker as streetlife-lab, textured ground
   (`setGroundTextures(await loadGroundTextures(renderer))` + ortho), trees `buildStylizedTreeField`; scenes D8 front
   gardens (-1100, 1850), F4 Wolvendael lawn (-455, -135), D8 Rue du Bourdon verge from a car; day / golden / night;
   walk / drive paths; HUD GPU ms (timestamps), draws, blades (indirect readback); bench (alternating), frame strips,
   flicker test, pipeline hook (GPUDevice.prototype.createRenderPipeline).
5. Measure on preflight GREEN/YELLOW only; then optional `?grass=1` city hook (main.js: addTile in loadTile with
   own.terrain / R.meshes / B.meshes / trees, removeTile in dispose, an updater, preCompile); docs/GRASS.md + docs/grass/.
6. One small shared change planned: `export` of `noiseTex` in viewer/ground.js (or a copy of its generator).
