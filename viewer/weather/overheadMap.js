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
import { positionWorld, vec4, vec2, float, uniform, texture, clamp, ivec2, textureLoad } from "three/tsl";

export const SOLID_LAYER = 20;     // meshes that stop rain and carry snow (ground, roads, roofs, cars, walls)
export const CANOPY_LAYER = 21;    // tree crowns (shelter: less snow and less rain under them)

export function markSolid(obj, on = true) { obj.traverse((o) => { if (o.isMesh) on ? o.layers.enable(SOLID_LAYER) : o.layers.disable(SOLID_LAYER); }); return obj; }
export function markCanopy(obj, on = true) { obj.traverse((o) => { if (o.isMesh) on ? o.layers.enable(CANOPY_LAYER) : o.layers.disable(CANOPY_LAYER); }); return obj; }

/** Shape parameters (metres / degrees). */
export const SHAPE = {
  cliff: 0.08,          // a step bigger than this (after the local slope) cuts the snow layer (kerbs are 0.13)
  taper: 0.42,          // rounded taper toward a drop edge (eaves, kerbs, car roofs)
  lip: 0.12,            // depth share left right at the edge (a thin rounded lip, not a knife edge)
  driftWidth: 0.9,      // drifts against walls / kerb faces
  driftGain: 0.45,      // +45 % at the wall foot
  shedFrom: 38, shedTo: 62,   // roof pitch (deg): full snow below shedFrom, none above shedTo
  shelter: 0.65,        // under a full crown, snow depth x (1 - shelter)
};

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
    sample: (xz) => texture(tex, clamp(xz.sub(uOrigin).div(uSize), 0.0001, 0.9999)).level(0),
    /** integer texel load (vertex / compute) */
    load: (i, j) => textureLoad(tex, ivec2(i, j)),
    inside: (xz) => { const u = xz.sub(uOrigin).div(uSize); return u.x.greaterThan(0).and(u.x.lessThan(1)).and(u.y.greaterThan(0)).and(u.y.lessThan(1)); },
    heightAt(x, z) {
      const i = Math.floor((x - uOrigin.value.x) / cell), j = Math.floor((z - uOrigin.value.y) / cell);
      if (i < 0 || j < 0 || i >= res || j >= res) return 0;
      return H[j * res + i];
    },
    async bake(scene) {
      const t0 = performance.now();
      const solid = await pass(scene, SOLID_LAYER);
      const canopy = await pass(scene, CANOPY_LAYER);
      toGrid(solid, H, -1e4);
      const C = new Float32Array(res * res);
      toGrid(canopy, C, -1e4);
      for (let k = 0; k < res * res; k++) shelter[k] = C[k] > H[k] + 0.8 ? 1 : 0;
      blur(shelter, 3);
      computeShape();
      for (let k = 0; k < res * res; k++) { data[k * 4] = H[k]; data[k * 4 + 1] = shelter[k]; data[k * 4 + 2] = shape[k]; data[k * 4 + 3] = cliff[k]; }
      tex.needsUpdate = true;
      map.ready = true;
      map.bakeMs = performance.now() - t0;
      return map;
    },
  };

  async function pass(scene, layer) {
    cam.layers.disableAll(); cam.layers.enable(layer);
    uEnc.value.set(uOrigin.value.x - 1, 0, uOrigin.value.y - 1);
    cam.position.set(map.centre.x, map.centre.y + height, map.centre.z);
    cam.up.set(0, 0, -1);
    cam.lookAt(map.centre.x, map.centre.y, map.centre.z);
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
  /** readback -> canonical grid, using each texel's own world x / z (G, B) */
  function toGrid(px, out, empty) {
    out.fill(NaN);
    for (let k = 0; k < res * res; k++) {
      if (px[k * 4 + 3] < 0.5) continue;
      const i = Math.floor((px[k * 4 + 1] - 1) / cell), j = Math.floor((px[k * 4 + 2] - 1) / cell);
      if (i < 0 || j < 0 || i >= res || j >= res) continue;
      const v = px[k * 4] - 1000;
      const o = j * res + i;
      if (!(out[o] >= v)) out[o] = v;            // the topmost when two texels land in one cell
    }
    // holes (no texel landed: rounding at cell borders; or nothing there): the neighbour's value, else `empty`
    for (let pass = 0; pass < 2; pass++) for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const o = j * res + i;
      if (out[o] === out[o]) continue;
      const n = [i > 0 ? out[o - 1] : NaN, i < res - 1 ? out[o + 1] : NaN, j > 0 ? out[o - res] : NaN, j < res - 1 ? out[o + res] : NaN].filter((v) => v === v);
      if (n.length) out[o] = Math.max(...n); else if (pass === 1) out[o] = empty;
    }
  }
  function blur(a, r) {
    const t = new Float32Array(a.length);
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const ii = i + d; if (ii >= 0 && ii < res) { s += a[j * res + ii]; n++; } } t[j * res + i] = s / n; }
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const jj = j + d; if (jj >= 0 && jj < res) { s += t[jj * res + i]; n++; } } a[j * res + i] = s / n; }
  }
  /** chamfer (3-4) distance transform of a seed mask, in cells */
  function distance(seed) {
    const D = new Float32Array(res * res);
    for (let k = 0; k < D.length; k++) D[k] = seed[k] ? 0 : 1e9;
    const a = 1, b = Math.SQRT2;
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const o = j * res + i; let d = D[o];
      if (i > 0) d = Math.min(d, D[o - 1] + a);
      if (j > 0) { d = Math.min(d, D[o - res] + a); if (i > 0) d = Math.min(d, D[o - res - 1] + b); if (i < res - 1) d = Math.min(d, D[o - res + 1] + b); }
      D[o] = d;
    }
    for (let j = res - 1; j >= 0; j--) for (let i = res - 1; i >= 0; i--) {
      const o = j * res + i; let d = D[o];
      if (i < res - 1) d = Math.min(d, D[o + 1] + a);
      if (j < res - 1) { d = Math.min(d, D[o + res] + a); if (i < res - 1) d = Math.min(d, D[o + res + 1] + b); if (i > 0) d = Math.min(d, D[o + res - 1] + b); }
      D[o] = d;
    }
    return D;
  }
  function computeShape() {
    const S = SHAPE, N = res;
    const edge = new Uint8Array(N * N), wall = new Uint8Array(N * N), slope = new Float32Array(N * N);
    const at = (i, j) => H[Math.min(N - 1, Math.max(0, j)) * N + Math.min(N - 1, Math.max(0, i))];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = j * N + i, h = H[o];
      // local slope from the continuous neighbours (a step is not a slope): one-sided where the other side jumps
      const l = at(i - 1, j), r = at(i + 1, j), u = at(i, j - 1), d = at(i, j + 1);
      // a slope rises the same on both sides; a step (kerb, eave) does not: then the flatter side is the slope
      const SLOPE_MAX = 1.6 * cell;   // above ~58 deg it is a step anyway
      const grad = (m, p) => {
        const a = h - m, b = p - h;
        if (Math.abs(a - b) < 0.05 && Math.abs(a) < SLOPE_MAX) return (p - m) / (2 * cell);
        const s = Math.abs(a) < Math.abs(b) ? a : b;
        return Math.abs(s) < SLOPE_MAX ? s / cell : 0;
      };
      const gx = grad(l, r), gz = grad(u, d);
      slope[o] = Math.atan(Math.hypot(gx, gz)) * 180 / Math.PI;
      // steps after the plane: a neighbour much LOWER than the plane = I am on a drop edge; much HIGHER = a wall foot
      let lo = false, hi = false;
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const e = at(i + di, j + dj) - (h + gx * di * cell + gz * dj * cell);
        // a ridge / valley bends the slope (up to 2 x its rise): a crease, not a step
        const tol = S.cliff + 2 * Math.abs(di ? gx : gz) * cell;
        if (e < -tol) lo = true;
        if (e > tol) hi = true;
      }
      edge[o] = lo ? 1 : 0; wall[o] = hi ? 1 : 0;
      cliff[o] = lo || hi ? 1 : 0;
      if (h < -1e3) cliff[o] = 1;
    }
    const dE = distance(edge), dW = distance(wall);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = j * N + i;
      const shed = 1 - Math.min(1, Math.max(0, (slope[o] - S.shedFrom) / (S.shedTo - S.shedFrom)));
      const e = dE[o] * cell, w = dW[o] * cell;
      let f = shed;
      if (e <= w) {   // closer to a drop edge than to a wall: the high side, rounded taper (quarter ellipse)
        const t = Math.min(1, Math.max(0, (e - 0.5 * cell) / S.taper));
        f *= S.lip + (1 - S.lip) * Math.sqrt(1 - (1 - t) * (1 - t));
      } else {        // the low side of a step: a drift against the wall, quadratic falloff
        const t = Math.max(0, 1 - (w - 0.5 * cell) / S.driftWidth);
        f *= 1 + S.driftGain * t * t;
      }
      shape[o] = f;
    }
  }
  return map;
}
