// THE OVERHEAD MAP: the scene seen straight down, as heights. ONE bake feeds the whole weather system:
//   rain / snow / leaf particles   collide with it (one texture fetch per particle, after game-engine-v1's
//                                  modularRoadWorldRain.js and three's webgpu_compute_particles_rain)
//   every material's snow and wet  "am I the topmost surface here?" (exposure: dry under cars and overhangs)
//   the volumetric snow layer      its base height, and its SHAPE: slope, rounded taper at drop edges (eaves, kerbs,
//                                  car roofs), drifts against walls, cliffs, shelter under tree crowns
//
// How: an orthographic camera above the area renders the meshes on SOLID_LAYER (then on CANOPY_LAYER) with an
// override material whose colour is (y, x, z, 1) of the world position, into an RGBA32F target (fp32: game-engine-v1
// PORT NOTE 2; alpha = "a surface is here", PORT NOTE 3). The pixels come back to the CPU once (readback), where each
// texel's own x / z put it in our canonical grid (row = +z south, column = +x east: no guessing of the target's flips),
// then the shape is computed with two distance transforms (O(N^2), ~30 ms for 512^2) and uploaded as one DataTexture:
//   R base height (m, world y)   G shelter under a crown (0..1)   B shape (snow depth multiplier, without the crown's
//   shelter: that is applied live, x the season's leaf density)   A cliff (1 = cut)
// Static scene = bake once; the city would re-bake when the camera has moved ~1/4 of the area (TODO: the shape pass
// in a compute shader or a worker for that).
import * as THREE from "three/webgpu";
import { computeOverheadShape, SHAPE } from "./overheadShape.js";
export { SHAPE };
import { positionWorld, vec4, vec2, float, uniform, texture, clamp, ivec2, textureLoad } from "three/tsl";

export const SOLID_LAYER = 20;     // meshes that stop rain and carry snow (ground, roads, roofs, cars, walls)
export const CANOPY_LAYER = 21;
export const ROAD_LAYER = 22;     // carriageways (salted / ploughed in winter: the snow layer keeps little there)    // tree crowns (shelter: less snow and less rain under them)

export function markSolid(obj, on = true) { obj.traverse((o) => { if (o.isMesh) on ? o.layers.enable(SOLID_LAYER) : o.layers.disable(SOLID_LAYER); }); return obj; }
export function markRoad(obj, on = true) { obj.traverse((o) => { if (o.isMesh) on ? o.layers.enable(ROAD_LAYER) : o.layers.disable(ROAD_LAYER); }); return obj; }
export function markCanopy(obj, on = true) { obj.traverse((o) => { if (o.isMesh) on ? o.layers.enable(CANOPY_LAYER) : o.layers.disable(CANOPY_LAYER); }); return obj; }

export function createOverheadMap({ renderer, centre = new THREE.Vector3(), size = 64, res = 512, depth = 200, height = 120 } = {}) {
  const rt = new THREE.RenderTarget(res, res, { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true });
  rt.texture.colorSpace = THREE.NoColorSpace;
  const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0.1, depth);
  const mat = new THREE.MeshBasicNodeMaterial();
  // all three POSITIVE (r187 clamps negative colour output on this path: x < 0 read back as 0), decoded in toGrid()
  const uEnc = uniform(new THREE.Vector3());
  mat.colorNode = vec4(positionWorld.y.add(1000), positionWorld.x.sub(uEnc.x), positionWorld.z.sub(uEnc.z), 1);
  mat.fog = false; mat.toneMapped = false; mat.side = THREE.DoubleSide;
  const data = new Float32Array(res * res * 4);
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  const cell = size / res;
  const uOrigin = uniform(new THREE.Vector2(centre.x - size / 2, centre.z - size / 2));
  const uSize = uniform(size);
  const H = new Float32Array(res * res), shelter = new Float32Array(res * res), shape = new Float32Array(res * res), cliff = new Uint8Array(res * res);
  const map = {
    rt, tex, size, res, cell, centre: centre.clone(), uOrigin, uSize, H, shelter, shape, cliff, ready: false, bakeMs: 0,
    /** uv of a world xz node in the canonical texture */
    uvAt: (xz) => xz.sub(uOrigin).div(uSize),
    /** the map's texel at a world xz (vec4: base, shelter, shape, cliff); outside the map: base -1e4 (never hit) */
    // (an integer texel load, the same addressing as load(): a filtered-path texture() lookup of this DataTexture came out
    // mirrored in z in the compute pass, rain over the lawn hit the houses' roofs)
    sample: (xz) => { const c = clamp(xz.sub(uOrigin).div(uSize).mul(res).floor(), 0, res - 1); return textureLoad(tex, ivec2(c)); },
    /** integer texel load (vertex / compute) */
    load: (i, j) => textureLoad(tex, ivec2(i, j)),
    inside: (xz) => { const u = xz.sub(uOrigin).div(uSize); return u.x.greaterThan(0).and(u.x.lessThan(1)).and(u.y.greaterThan(0)).and(u.y.lessThan(1)); },
    heightAt(x, z) {
      const i = Math.floor((x - uOrigin.value.x) / cell), j = Math.floor((z - uOrigin.value.y) / cell);
      if (i < 0 || j < 0 || i >= res || j >= res) return 0;
      return H[j * res + i];
    },
    /** Render the two bakes (GPU), read them back, then the shape pass in a worker (no main-thread stall); the map
     *  keeps its old contents until the new ones arrive. */
    // at = { x, y, z } (the city: a new centre round the camera, snapped to whole cells). The NEW data and the new
    // origin are swapped in together at the end (the materials / layer keep the old window until then: no jump)
    async bake(scene, at = null) {
      const t0 = performance.now();
      if (at) { bakeC.set(Math.round(at.x / cell) * cell, at.y, Math.round(at.z / cell) * cell); }
      else bakeC.copy(map.centre);
      bakeO.set(bakeC.x - size / 2, bakeC.z - size / 2);
      const solidPx = await pass(scene, SOLID_LAYER);
      const canopyPx = await pass(scene, CANOPY_LAYER);
      const roadPx = await pass(scene, ROAD_LAYER);
      const job = { solidPx, canopyPx, roadPx, res, cell, origin: [bakeO.x, bakeO.y] };
      const t1 = performance.now();
      let r;
      try {
        worker ??= new Worker(new URL("./overheadWorker.js", import.meta.url), { type: "module" });
        r = await new Promise((ok, fail) => { worker.onmessage = (e) => ok(e.data); worker.onerror = fail; worker.postMessage(job, [solidPx.buffer, canopyPx.buffer, roadPx.buffer]); });
        map.inWorker = true;
      } catch (e) {
        console.warn("[overhead] worker failed, shape pass on the main thread", e);
        r = computeOverheadShape(job); map.inWorker = false;
      }
      map.centre.copy(bakeC); uOrigin.value.copy(bakeO);
      H.set(r.H); shelter.set(r.shelter); shape.set(r.shape); cliff.set(r.cliff); map.eaves = r.eaves; map.Hs = r.Hs;
      for (let k = 0; k < res * res; k++) { data[k * 4] = r.Hs[k]; data[k * 4 + 1] = shelter[k]; data[k * 4 + 2] = shape[k]; data[k * 4 + 3] = cliff[k] + 2 * r.road[k]; }
      tex.needsUpdate = true;
      map.ready = true;
      map.bakeMs = performance.now() - t0;
      map.gpuMs = t1 - t0; map.shapeMs = r.ms;
      return map;
    },
  };
  let worker = null;
  const bakeC = centre.clone(), bakeO = new THREE.Vector2(centre.x - size / 2, centre.z - size / 2);
  map.setRenderer = (r) => { renderer = r; };

  async function pass(scene, layer) {
    cam.layers.disableAll(); cam.layers.enable(layer);
    uEnc.value.set(bakeO.x - 1, 0, bakeO.y - 1);
    cam.position.set(bakeC.x, bakeC.y + height, bakeC.z);
    cam.up.set(0, 0, -1);
    cam.lookAt(bakeC.x, bakeC.y, bakeC.z);
    cam.updateMatrixWorld(true);
    const prevRT = renderer.getRenderTarget(), prevMRT = renderer.getMRT?.() ?? null, prevOv = scene.overrideMaterial,
      prevBg = scene.background, prevAuto = renderer.autoClear, prevAlpha = renderer.getClearAlpha(), prevShadow = renderer.shadowMap.autoUpdate;
    const prevClear = renderer.getClearColor(new THREE.Color());
    renderer.shadowMap.autoUpdate = false;
    scene.overrideMaterial = mat; scene.background = null;
    renderer.setMRT?.(null);
    renderer.setClearColor(0x000000, 0); renderer.autoClear = true;
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevRT); renderer.setMRT?.(prevMRT);
    renderer.setClearColor(prevClear, prevAlpha); renderer.autoClear = prevAuto; renderer.shadowMap.autoUpdate = prevShadow;
    scene.overrideMaterial = prevOv; scene.background = prevBg;
    return await renderer.readRenderTargetPixelsAsync(rt, 0, 0, res, res);
  }
  return map;
}
