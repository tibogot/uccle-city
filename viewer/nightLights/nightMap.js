// ?night=1 round 3, step 7: THE GROUND LIGHT MAP PER TILE, baked in a worker (nightBakeWorker.js), replacing the
// city's one R8 lamp map (viewer/lampLight.js, 2 m texels, painted on the main thread, its own falloff) under the flag.
//
// One layer of a DataArrayTexture per loaded tile (RGBA8, RES x RES over the tile's 500 m square + MARGIN m on every
// side, 1.31 m texels, half floats: 1.4 MB a layer): the horizontal irradiance of THAT TILE's static lights only - street lamps (lantern profile),
// lit windows and shop fronts (aperture through the real opening), signs - with the cluster loop's own formulas
// (nightLighting.js), so the ground (which skips those lights in the loop: they are "baked") gets exactly what the
// pool would give. A fragment reads its own tile's layer
// and, within MARGIN of a tile edge, the neighbours' (their lamps light across the seam): no re-bake when a
// neighbour arrives, and every tile's light FADES IN with its own fade (the slot table's second channel): nothing pops.
// The slot table: a 15 x 12 RGBA8 texture over the manifest's grid (A1..O12): r = layer (255 none), g = fade.
// By day (uScale 0) no texture is read at all (a uniform branch).
import * as THREE from "three/webgpu";
import { Fn, If, texture, textureLoad, uniform, vec2, vec3, ivec2, int, float, floor, positionWorld } from "three/tsl";

export const MAP = { X0: -3000, Z0: -2000, TILE: 500, NX: 15, NZ: 12, RES: 416, MARGIN: 22, EMAX: 60000 };
MAP.SPAN = MAP.TILE + 2 * MAP.MARGIN;                       // m covered by one layer
MAP.TEXEL = MAP.SPAN / MAP.RES;

/** the map's textures + uniforms (nightMode.js creates it under the flag) */
export function createNightMap(slots) {
  const { RES, NX, NZ } = MAP;
  const arr = new THREE.DataArrayTexture(new Uint16Array(RES * RES * 4 * slots), RES, RES, slots);
  arr.format = THREE.RGBAFormat; arr.type = THREE.HalfFloatType;
  arr.magFilter = arr.minFilter = THREE.LinearFilter; arr.generateMipmaps = false;
  arr.wrapS = arr.wrapT = THREE.ClampToEdgeWrapping;
  arr.name = "night-ground-map"; arr.needsUpdate = true;
  const table = new Uint8Array(NX * NZ * 4);
  for (let i = 0; i < NX * NZ; i++) table[i * 4] = 255;
  const slotTex = new THREE.DataTexture(table, NX, NZ, THREE.RGBAFormat, THREE.UnsignedByteType);
  slotTex.magFilter = slotTex.minFilter = THREE.NearestFilter; slotTex.generateMipmaps = false;
  slotTex.name = "night-ground-slots"; slotTex.needsUpdate = true;
  const M = {
    arr, slotTex, table, slots,
    uScale: uniform(0),                 // the night x master scale (cityNight.js: 0 by day: nothing read)
    uGain: uniform(1),                  // (tuning) the map's light x this
  };
  // the irradiance of one tile's layer at the tile-local position f (m from its x0 / z0), x its fade; 0 if not loaded
  const tileE = (ti, tj, f) => {
    const e = vec3(0).toVar();
    If(ti.greaterThanEqual(0).and(ti.lessThan(NX)).and(tj.greaterThanEqual(0)).and(tj.lessThan(NZ)), () => {
      const s = textureLoad(slotTex, ivec2(ti, tj)).toVar();
      If(s.x.lessThan(0.99), () => {
        const uv = f.add(MAP.MARGIN).div(MAP.SPAN);
        // (a render-independent level 0 fetch: this runs in non-uniform control flow)
        e.assign(texture(arr, vec2(uv.x, uv.y)).depth(int(s.x.mul(255).add(0.5))).level(0).rgb.mul(s.y));
      });
    });
    return e;
  };
  /** horizontal irradiance (RGB, the pool's units) of the baked static lights at world xz */
  M.irradiance = (xz = positionWorld.xz) => Fn(() => {
    const out = vec3(0).toVar();
    If(M.uScale.greaterThan(0.0), () => {
      const rel = xz.sub(vec2(MAP.X0, MAP.Z0)).toVar();
      const t = floor(rel.div(MAP.TILE)).toVar();
      const f = rel.sub(t.mul(MAP.TILE)).toVar();
      const ti = int(t.x).toVar(), tj = int(t.y).toVar();
      const dx = int(0).toVar(), dz = int(0).toVar();
      If(f.x.lessThan(MAP.MARGIN), () => { dx.assign(-1); }).ElseIf(f.x.greaterThan(MAP.TILE - MAP.MARGIN), () => { dx.assign(1); });
      If(f.y.lessThan(MAP.MARGIN), () => { dz.assign(-1); }).ElseIf(f.y.greaterThan(MAP.TILE - MAP.MARGIN), () => { dz.assign(1); });
      out.assign(tileE(ti, tj, f));
      If(dx.notEqual(0), () => { out.addAssign(tileE(ti.add(dx), tj, f.sub(vec2(float(dx).mul(MAP.TILE), 0)))); });
      If(dz.notEqual(0), () => { out.addAssign(tileE(ti, tj.add(dz), f.sub(vec2(0, float(dz).mul(MAP.TILE))))); });
      If(dx.notEqual(0).and(dz.notEqual(0)), () => { out.addAssign(tileE(ti.add(dx), tj.add(dz), f.sub(vec2(float(dx), float(dz)).mul(MAP.TILE)))); });
      out.mulAssign(M.uScale.mul(M.uGain));
    });
    return out;
  })();
  /** tile name ("E4") -> grid cell, or null */
  M.cell = (name) => {
    const m = /^([A-Z])(\d+)$/.exec(name || "");
    if (!m) return null;
    return { i: m[1].charCodeAt(0) - 65, j: +m[2] - 1 };
  };
  return M;
}
