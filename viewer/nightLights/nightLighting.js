// NIGHT LIGHTS: many real lights, cheaply (docs/NIGHT_LIGHTS.md, research: docs/NIGHT_LIGHTS_RESEARCH.md).
//
// three r187's ClusteredLighting (Forward+ clustered shading, Olsson et al. 2012: the view frustum cut into 32 px
// screen tiles x exponential depth slices, a compute pass lists the lights touching each cluster, each fragment loops
// over its cluster's list) with two changes, in a subclass of its ClusteredLightsNode:
//   1. THE LIGHTS ARE NOT Object3Ds. They live in a LightPool (typed arrays, fixed size, written by our selection code
//      every frame: viewer/nightLights/lightSelect.js). No Light objects, no matrixWorld updates, no per-frame
//      allocation: _updateLightsTexture() reads the pool, skips the slots at zero, insertion-sorts the active ones by
//      view depth into a preallocated Int32Array (three's version sorts a JS array with a new comparator each frame)
//      and writes the same four data rows three's compute pass reads (position + range, colour, spot, bounding sphere).
//   2. THE SHADING LOOP knows LIGHT PROFILES (a fifth and sixth row): what a cookie / IES profile does, analytically,
//      in the light's own frame (beam axis + world up), so no texture fetch in the loop and no extra light type:
//        0 PLAIN      point / spot
//        1 LOW BEAM   a car headlight's ECE low-beam pattern: sharp horizontal cut-off 1 % below the horizon on the
//                     oncoming side, the 15 deg kink rising on the kerb side (right-hand traffic), the hot spot just
//                     under the cut-off, a wide dim foreground spread
//        2 LANTERN    a street lamp's vertical intensity curve (an IES profile reduced to two numbers): the share of
//                     light going up (opal globe: walls and tree crowns get light, not only the ground pool) and a
//                     batwing peak at ~65 deg from nadir (even light along the road)
//        3 APERTURE   light leaving a room through a window / shop front: a light behind the opening, its light
//                     clipped to the opening's rectangle (soft edges, optional mullion cross): the window-shaped
//                     patch on the garden / sidewalk that widens and softens with distance
//      plus a finite source size in the falloff: 1 / (d^2 + r^2) x Frostbite's window (1 - (d/range)^4)^2, so a
//      lamp does not burn a hot dot onto its own post and the light ends exactly at its range.
// Lights with shadows stay three's own (SpotLight, castShadow): the few nearest lamps' soft shadows (lightSelect.js
// ShadowLamps) go through the normal lighting path, which the clustered node keeps for every non-pool light.
import * as THREE from "three/webgpu";
import { DataTexture, FloatType, RGBAFormat, LightsNode } from "three/webgpu";
import {
  Fn, Loop, If, Break, int, float, vec3, vec4, ivec2, ivec4, textureLoad, positionView, cameraViewMatrix, dot, cross, normalize,
  smoothstep, max, min, abs, exp, sqrt, clamp, select, uniform, normalView, BRDF_Lambert, diffuseContribution,
} from "three/tsl";
import { ClusteredLighting } from "three/addons/lighting/ClusteredLighting.js";
import ClusteredLightsNode from "three/addons/tsl/lighting/ClusteredLightsNode.js";

/** live switches (uniforms: no rebuild) */
export const nightLook = { uDiffuseOnly: uniform(0) };

export const PROFILE = { PLAIN: 0, LOWBEAM: 1, LANTERN: 2, APERTURE: 3 };

// pool slot layout (floats)
export const S = {
  X: 0, Y: 1, Z: 2, RANGE: 3, R: 4, G: 5, B: 6, SIZE: 7,      // position, range (m), colour x intensity (cd-ish), source radius (m)
  DX: 8, DY: 9, DZ: 10, CONE: 11, PEN: 12,                    // beam direction (unit, light -> target), cos(outer), cos(inner)
  PROF: 13, P1: 14, P2: 15, P3: 16, P4: 17,                   // profile + its parameters
  W: 18,                                                      // weight (fade) 0..1: 0 = not drawn
  FLAGS: 19,                                                  // 1 = diffuse only (a soft source)
  STRIDE: 20,
};

/** Fixed-size light storage. Writers fill slots each frame; nothing is allocated after construction. */
export class LightPool {
  constructor(max = 256) {
    this.max = max;
    this.data = new Float32Array(max * S.STRIDE);
    this.used = 0;          // slots handed out (ranges reserved by the writers)
    this.active = 0;        // lights drawn last frame (weight > 0)
    this.enabled = true;
    this.scale = 1;         // global intensity (x night)
  }
  /** Reserve n consecutive slots for one writer -> first slot index. */
  reserve(n) {
    if (this.used + n > this.max) throw new Error(`LightPool: ${this.used + n} > ${this.max} slots`);
    const s = this.used; this.used += n;
    for (let i = s; i < s + n; i++) this.clear(i);
    return s;
  }
  clear(i) { const o = i * S.STRIDE; this.data.fill(0, o, o + S.STRIDE); this.data[o + S.CONE] = -2; this.data[o + S.PEN] = -1.9; }
  /** A light in slot i. dir = null: omni. */
  set(i, x, y, z, range, r, g, b, w, size = 0.1) {
    const d = this.data, o = i * S.STRIDE;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = range;
    d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = size; d[o + S.W] = w;
  }
  spot(i, dx, dy, dz, outer, inner) {
    const d = this.data, o = i * S.STRIDE;
    d[o + 8] = dx; d[o + 9] = dy; d[o + 10] = dz; d[o + 11] = Math.cos(outer); d[o + 12] = Math.cos(inner);
  }
  omni(i) { const d = this.data, o = i * S.STRIDE; d[o + 8] = 0; d[o + 9] = -1; d[o + 10] = 0; d[o + 11] = -2; d[o + 12] = -1.9; }
  profile(i, p, p1 = 0, p2 = 0, p3 = 0, p4 = 0) {
    const d = this.data, o = i * S.STRIDE;
    d[o + 13] = p; d[o + 14] = p1; d[o + 15] = p2; d[o + 16] = p3; d[o + 17] = p4;
  }
  weight(i, w) { this.data[i * S.STRIDE + S.W] = w; }
  diffuseOnly(i, on) { this.data[i * S.STRIDE + S.FLAGS] = on ? 1 : 0; }
}

const ROW = { POS: 0, COLOR: 1, SPOT: 2, BOUNDS: 3 };   // three's rows (its compute reads BOUNDS)

class NightLightsNode extends ClusteredLightsNode {
  constructor(pool, ...a) {
    super(...a);
    this.pool = pool;
    this._extra = new DataTexture(new Float32Array(this.maxLights * 4 * 2), this.maxLights, 2, RGBAFormat, FloatType);
    this._order = new Int32Array(this.maxLights);
    this._viewZ = new Float32Array(this.maxLights);
    this._src = new Int32Array(this.maxLights);
  }
  // every scene Light keeps three's default path (sun, moon, the shadowed lamp spots): the pool is ours
  _isClusteredLight() { return false; }

  _updateLightsTexture(camera) {
    const P = this.pool, D = P.data, T = this._lightsTexture.image.data, E = this._extra.image.data;
    const line = this._lightsTexture.image.width * 4, eLine = this._extra.image.width * 4;
    const m = camera.matrixWorldInverse.elements, k = P.scale;
    let n = 0;
    if (P.enabled && k > 0) for (let i = 0; i < P.used && n < this.maxLights; i++) {
      const o = i * S.STRIDE, w = D[o + S.W];
      if (w <= 1e-4 || D[o + 4] + D[o + 5] + D[o + 6] <= 0) continue;
      // bounding sphere centre: the light, or for a narrow spot the middle of its cone (as three's)
      let cx = D[o], cy = D[o + 1], cz = D[o + 2];
      const cone = D[o + S.CONE];
      if (cone > 0.7071) { const off = D[o + 3] / (2 * cone); cx += D[o + 8] * off; cy += D[o + 9] * off; cz += D[o + 10] * off; }
      const vz = m[2] * cx + m[6] * cy + m[10] * cz + m[14];
      // insertion by view z (ascending, as three's sort): the pool is ~200 lights, mostly in order frame to frame
      let j = n;
      while (j > 0 && this._viewZ[j - 1] > vz) { this._viewZ[j] = this._viewZ[j - 1]; this._src[j] = this._src[j - 1]; j--; }
      this._viewZ[j] = vz; this._src[j] = i;
      n++;
    }
    P.active = n;
    this._lightsCount.value = n;
    for (let j = 0; j < n; j++) {
      const o = this._src[j] * S.STRIDE, q = j * 4, w = D[o + S.W] * k;
      // POS and SPOT go in VIEW space (three's compute reads only the BOUNDS row, in world space): the fragment loop
      // saves two matrix products per light
      const x = D[o], y = D[o + 1], z = D[o + 2], ax = D[o + 8], ay = D[o + 9], az = D[o + 10];
      T[ROW.POS * line + q] = m[0] * x + m[4] * y + m[8] * z + m[12]; T[ROW.POS * line + q + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      T[ROW.POS * line + q + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]; T[ROW.POS * line + q + 3] = D[o + 3];
      T[ROW.COLOR * line + q] = D[o + 4] * w; T[ROW.COLOR * line + q + 1] = D[o + 5] * w; T[ROW.COLOR * line + q + 2] = D[o + 6] * w; T[ROW.COLOR * line + q + 3] = D[o + 7];
      T[ROW.SPOT * line + q] = m[0] * ax + m[4] * ay + m[8] * az; T[ROW.SPOT * line + q + 1] = m[1] * ax + m[5] * ay + m[9] * az;
      T[ROW.SPOT * line + q + 2] = m[2] * ax + m[6] * ay + m[10] * az; T[ROW.SPOT * line + q + 3] = D[o + 11];
      // bounding sphere: a narrow spot (< 45 deg) the smallest sphere round its cone (three's), else the light's sphere
      const cone = D[o + S.CONE];
      let cx = D[o], cy = D[o + 1], cz = D[o + 2], r = D[o + 3];
      if (cone > 0.7071) { const off = r / (2 * cone); cx += D[o + 8] * off; cy += D[o + 9] * off; cz += D[o + 10] * off; r = off; }
      T[ROW.BOUNDS * line + q] = cx; T[ROW.BOUNDS * line + q + 1] = cy; T[ROW.BOUNDS * line + q + 2] = cz; T[ROW.BOUNDS * line + q + 3] = r;
      E[q] = D[o + S.PROF]; E[q + 1] = D[o + S.P1]; E[q + 2] = D[o + S.P2]; E[q + 3] = D[o + S.P3];
      E[eLine + q] = D[o + S.PEN]; E[eLine + q + 1] = D[o + S.P4]; E[eLine + q + 2] = D[o + S.FLAGS]; E[eLine + q + 3] = 0;
    }
    this._lightsTexture.needsUpdate = true;
    this._extra.needsUpdate = true;
    // depth-slice ranges (three's code, over the sorted list)
    const zR = this._zSliceRangesData, near = camera.near, far = camera.far, NZ = this.zSlices;
    for (let z = 0; z < NZ; z++) {
      const sNear = -(near * Math.pow(far / near, z / NZ)), sFar = -(near * Math.pow(far / near, (z + 1) / NZ));
      let a = n, b = 0;
      for (let j = 0; j < n; j++) {
        const vz = this._viewZ[j], rad = T[ROW.BOUNDS * line + j * 4 + 3];
        // (the bounds row's centre may differ from the sort centre for wide spots: use the sphere's own view z)
        if (vz + rad + 2 >= sFar && vz - rad - 2 <= sNear) { if (j < a) a = j; if (j + 1 > b) b = j + 1; }
      }
      if (a >= n) { a = 0; b = 0; }
      zR[z * 4] = a; zR[z * 4 + 1] = b;
    }
    this._zSliceRangesTexture.needsUpdate = true;
  }

  setupLights(builder, lightNodes) {
    this._initGrid(builder.renderer);
    const reflected = builder.context.reflectedLight;
    reflected.directDiffuse.toStack();
    reflected.directSpecular.toStack();
    LightsNode.prototype.setupLights.call(this, builder, lightNodes);     // sun, moon, shadowed spots
    const tex = this._lightsTexture, extra = this._extra;
    Fn(() => {
      const upV = normalize(cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz).toVar();
      // the cluster's list is ivec4 chunks: one storage load per 4 lights (three's loop reloads the chunk per light)
      const base = this._screenClusterIndex.mul(int(this._chunksPerCluster)).toVar();
      const chunk = ivec4(0).toVar();
      Loop(this.maxLightsPerCluster, ({ i }) => {
        const ii = int(i);
        If(ii.mod(4).equal(0), () => { chunk.assign(this._lightIndexes.element(base.add(ii.div(4)))); });
        const li = chunk.element(ii.mod(4));
        If(li.equal(int(0)), () => { Break(); });
        const idx = li.sub(1);
        const A = textureLoad(tex, ivec2(idx, ROW.POS)), B = textureLoad(tex, ivec2(idx, ROW.COLOR)), C = textureLoad(tex, ivec2(idx, ROW.SPOT));
        const Lv = A.xyz.sub(positionView).toVar();             // fragment -> light (view space)
        const d2 = dot(Lv, Lv).toVar(), range = A.w;
        If(d2.lessThan(range.mul(range)), () => {
          const E0 = textureLoad(extra, ivec2(idx, 0)), E1 = textureLoad(extra, ivec2(idx, 1));
          const d = sqrt(d2);
          const L = Lv.div(max(d, 1e-4)).toVar();               // unit, fragment -> light
          const f = L.negate();                                  // unit, light -> fragment
          const axis = C.xyz;                                    // beam (unit, view space)
          const cosA = dot(f, axis).toVar();
          const spot = smoothstep(C.w, E1.x, cosA).toVar();
          If(spot.greaterThan(0), () => {
            const prof = E0.x;
            const k = float(1).toVar();
            // 1 LOW BEAM: x = lateral tangent (+ = kerb side), y = sine of the elevation above the horizon
            If(prof.greaterThan(0.5).and(prof.lessThan(1.5)), () => {
              const right = normalize(cross(axis, upV));
              const x = dot(f, right).div(max(cosA, 0.2));
              const y = dot(f, upV);
              const cut = E0.y.add(clamp(x, 0, 0.12).mul(E0.z));   // aim (-0.012) + 15 deg kink on the kerb side
              const below = float(1).sub(smoothstep(cut.sub(0.003), cut.add(0.004), y));
              // hot band just under the cut-off (the far road), a dim wide foreground (a real low beam keeps the road
              // right in front of the car dim, or the eye adapts to it and the distance goes black)
              const hot = exp(x.sub(0.03).div(0.2).pow2().negate()).mul(exp(y.sub(cut).add(0.02).div(0.035).pow2().negate()));
              const spread = exp(x.div(0.6).pow2().negate()).mul(smoothstep(-0.35, -0.04, y).mul(0.25).add(0.04));
              k.assign(below.mul(0.97).add(0.03).mul(hot.mul(1.4).add(spread)));
            });
            // 2 LANTERN: c = cos from nadir; up share E0.y, batwing E0.z
            If(prof.greaterThan(1.5).and(prof.lessThan(2.5)), () => {
              const c = dot(f, upV).negate();
              const base = E0.y.add(float(1).sub(E0.y).mul(smoothstep(-0.35, 0.45, c)));
              k.assign(base.mul(float(1).add(E0.z.mul(exp(c.sub(0.42).div(0.2).pow2().negate())))));
            });
            // 3 APERTURE: half width E0.y, half height E0.z, the light's depth behind the opening E0.w, mullions E1.y
            If(prof.greaterThan(2.5), () => {
              const right = normalize(cross(axis, upV));
              const upP = cross(right, axis);
              const t = E0.w.div(max(cosA, 0.05));
              const px = abs(dot(f, right).mul(t)), py = abs(dot(f, upP).mul(t));
              const soft = E0.y.min(E0.z).mul(0.22);
              const box = float(1).sub(smoothstep(E0.y.sub(soft), E0.y.add(soft), px)).mul(float(1).sub(smoothstep(E0.z.sub(soft), E0.z.add(soft), py)));
              const bar = float(1).sub(smoothstep(0.02, 0.05, px)).max(float(1).sub(smoothstep(0.02, 0.05, abs(dot(f, upP).mul(t).sub(E0.z.mul(0.35))))));
              k.assign(box.mul(float(1).sub(bar.mul(E1.y))));
            });
            // falloff: finite source (radius B.w) x Frostbite's window at the range
            const win = float(1).sub(d2.div(range.mul(range)).pow2()).clamp().pow2();
            const att = win.div(d2.add(B.w.mul(B.w)));
            const lc = B.rgb.mul(spot.mul(k).mul(att));
            // soft sources (windows, shop fronts, signs, rear lights: flag E1.z) light the DIFFUSE term only: Lambert,
            // no GGX / clear coat (their glossy reflections come from SSR of the lit glass); lamps and headlights keep
            // the full BRDF (the long specular streaks on a wet road)
            If(E1.z.greaterThan(0.5).or(nightLook.uDiffuseOnly.greaterThan(0.5)), () => {
              reflected.directDiffuse.addAssign(max(dot(normalView, L), 0).mul(lc).mul(BRDF_Lambert({ diffuseColor: diffuseContribution })));
            }).Else(() => {
              builder.lightsNode.setupDirectLight(builder, this, { lightDirection: L, lightColor: lc });
            });
          });
        });
      });
    }, "void")();
  }

  dispose() { this._extra.dispose(); super.dispose(); }
}

/** renderer.lighting = new NightLighting(pool): ClusteredLighting whose clustered lights come from the pool. */
export class NightLighting extends ClusteredLighting {
  constructor(pool, { tileSize = 32, zSlices = 24, maxLightsPerCluster = 48 } = {}) {
    super(pool.max, tileSize, zSlices, maxLightsPerCluster);
    this.pool = pool;
  }
  createNode(lights = []) {
    return new NightLightsNode(this.pool, this.maxLights, this.tileSize, this.zSlices, this.maxLightsPerCluster).setLights(lights);
  }
}
