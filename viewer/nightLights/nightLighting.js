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
  instancedArray, pow, log, instanceIndex, screenCoordinate, mix, step, BRDF_GGX, specularColorBlended, specularF90,
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
    // up to 4 culling planes per light (view space, n.xyz + d; outside = dot(n, p) + d > 0): the low beam's wedge, the
    // window's frustum. The cluster pass rejects a cluster lying wholly outside any of them (lights without planes:
    // n = 0, d = -1, never reject)
    this._planes = new DataTexture(new Float32Array(this.maxLights * 4 * 4), this.maxLights, 4, RGBAFormat, FloatType);
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
      T[ROW.POS * line + q + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]; T[ROW.POS * line + q + 3] = D[o + S.PROF] === PROFILE.LOWBEAM ? -D[o + 3] : D[o + 3];   // < 0: a low beam
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
      this._writePlanes(j, o, m);
    }
    this._planes.needsUpdate = true;
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

  /** culling planes of sorted light j (pool slot offset o), world -> view with the camera's matrix elements m */
  _writePlanes(j, o, m) {
    const D = this.pool.data, PL = this._planes.image.data, line = this._planes.image.width * 4, prof = D[o + S.PROF];
    const px = D[o], py = D[o + 1], pz = D[o + 2];
    let k = 0;
    if (prof === PROFILE.LOWBEAM) {
      // the wedge under the cut-off: above (rising 3.5 % with distance), behind, and the two sides of the beam
      let hx = D[o + 8], hz = D[o + 10]; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      const rx = -hz, rz = hx, th = Math.acos(Math.min(1, D[o + S.CONE])) + 0.05, c = Math.cos(th), sn = Math.sin(th);
      this._plane(j, k++, -0.035 * hx, 1, -0.035 * hz, px, py, pz, m);
      this._plane(j, k++, -hx, 0, -hz, px, py, pz, m);
      this._plane(j, k++, rx * c - hx * sn, 0, rz * c - hz * sn, px, py, pz, m);
      this._plane(j, k++, -rx * c - hx * sn, 0, -rz * c - hz * sn, px, py, pz, m);
    } else if (prof === PROFILE.APERTURE) {
      // the pyramid from the light through the opening (+ its soft edge)
      const ax = D[o + 8], az = D[o + 10], depth = D[o + S.P3], soft = Math.min(D[o + S.P1], D[o + S.P2]) * 0.22 + 0.05;
      const hw = D[o + S.P1] + soft, hh = D[o + S.P2] + soft, rx = -az, rz = ax;     // right = axis x up (horizontal axis)
      this._plane(j, k++, rx * depth - ax * hw, 0, rz * depth - az * hw, px, py, pz, m);
      this._plane(j, k++, -rx * depth - ax * hw, 0, -rz * depth - az * hw, px, py, pz, m);
      this._plane(j, k++, -ax * hh, depth, -az * hh, px, py, pz, m);
      this._plane(j, k++, -ax * hh, -depth, -az * hh, px, py, pz, m);
    }
    for (; k < 4; k++) { const q = k * line + j * 4; PL[q] = 0; PL[q + 1] = 0; PL[q + 2] = 0; PL[q + 3] = -1; }
  }

  /** plane k of sorted light j: through (px, py, pz) with outward normal n (world), stored in view space */
  _plane(j, k, nx, ny, nz, px, py, pz, m) {
    const PL = this._planes.image.data, line = this._planes.image.width * 4;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const vx = m[0] * nx + m[4] * ny + m[8] * nz, vy = m[1] * nx + m[5] * ny + m[9] * nz, vz = m[2] * nx + m[6] * ny + m[10] * nz;
    const q = k * line + j * 4;
    PL[q] = vx; PL[q + 1] = vy; PL[q + 2] = vz; PL[q + 3] = -(nx * px + ny * py + nz * pz) - (vx * m[12] + vy * m[13] + vz * m[14]);
  }

  /** three r187's ClusteredLightsNode._create (MIT, three.js authors), with one change: a light is listed in a cluster
   *  only if its bounding sphere touches the cluster's box AND the box is not wholly outside one of its planes. */
  _create(clusterCount) {
    const { tileSize, zSlices, _chunksPerCluster: chunksPerCluster } = this;
    const NZ = zSlices, grid = this._gridDimensions, NX = int(grid.x), NY = int(grid.y);
    const requiredElements = clusterCount * chunksPerCluster;
    const previousElements = this._lightIndexes !== null ? this._lightIndexes.value.array.length / 4 : 0;
    const elements = previousElements === 0 ? Math.ceil(requiredElements * 1.5) : Math.max(requiredElements, previousElements * 2);
    if (this._compute !== null) { this.needsUpdate = true; this._compute.dispose(); this._lightIndexes.value.dispose(); }
    const lightIndexes = instancedArray(new Int32Array(elements * 4), "ivec4").setPBO(true).setName("lightIndexes");
    const getClusterBounds = (clusterIndex) => {
      const invFocalX = float(1).div(this._cameraProjectionMatrix.element(0).element(0));
      const invFocalY = float(1).div(this._cameraProjectionMatrix.element(1).element(1));
      const cx = clusterIndex.mod(NX), cy = clusterIndex.div(NX).mod(NY), cz = clusterIndex.div(NX.mul(NY));
      const ndcXmin = float(cx).mul(2.0).div(grid.x).sub(1.0), ndcXmax = float(cx.add(int(1))).mul(2.0).div(grid.x).sub(1.0);
      const ndcYmax = float(1).sub(float(cy).mul(2.0).div(grid.y)), ndcYmin = float(1).sub(float(cy.add(int(1))).mul(2.0).div(grid.y));
      const farOverNear = this._cameraFar.div(this._cameraNear);
      const zNear = this._cameraNear.mul(pow(farOverNear, float(cz).mul(1.0 / NZ))).negate();
      const zFar = this._cameraNear.mul(pow(farOverNear, float(cz.add(int(1))).mul(1.0 / NZ))).negate();
      const sNX = zNear.negate().mul(invFocalX), sFX = zFar.negate().mul(invFocalX), sNY = zNear.negate().mul(invFocalY), sFY = zFar.negate().mul(invFocalY);
      const aabbMin = vec3(min(ndcXmin.mul(sNX), ndcXmin.mul(sFX)), min(ndcYmin.mul(sNY), ndcYmin.mul(sFY)), zFar);
      const aabbMax = vec3(max(ndcXmax.mul(sNX), ndcXmax.mul(sFX)), max(ndcYmax.mul(sNY), ndcYmax.mul(sFY)), zNear);
      return { cz, aabbMin, aabbMax };
    };
    const planes = this._planes;
    const intersectsCluster = (lightIdx, aabbMin, aabbMax) => {
      const { center, radius } = this._getLightBounds(lightIdx);
      const closest = max(aabbMin, min(center, aabbMax)), diff = center.sub(closest);
      let ok = radius.lessThan(0).or(dot(diff, diff).lessThanEqual(radius.mul(radius)));
      for (let k = 0; k < 4; k++) {
        const pl = textureLoad(planes, ivec2(lightIdx, k));
        const pmin = mix(aabbMax, aabbMin, step(0, pl.xyz));          // the box corner deepest inside the plane
        ok = ok.and(dot(pl.xyz, pmin).add(pl.w).lessThanEqual(0));
      }
      return ok;
    };
    const chunksPerInvocation = this._isWebGLBackend ? 1 : chunksPerCluster;
    const invocationsPerCluster = chunksPerCluster / chunksPerInvocation;
    this._invocationsPerCluster = invocationsPerCluster;
    const compute = Fn(() => {
      const clusterIndex = int(instanceIndex.div(invocationsPerCluster));
      const firstChunk = int(instanceIndex.mod(invocationsPerCluster)).mul(chunksPerInvocation);
      const firstSlot = firstChunk.mul(4), lastSlot = firstSlot.add(chunksPerInvocation * 4);
      const { cz, aabbMin, aabbMax } = getClusterBounds(clusterIndex);
      const chunks = ivec4(0).toArray(chunksPerInvocation).toVar();
      const index = int(0).toVar();
      const zRange = textureLoad(this._zSliceRangesTexture, ivec2(cz, 0));
      const rangeStart = int(zRange.x), rangeEnd = int(zRange.y);
      Loop(this.maxLights, ({ i }) => {
        const lightIdx = rangeStart.add(i);
        If(index.greaterThanEqual(lastSlot).or(lightIdx.greaterThanEqual(rangeEnd)), () => { Break(); });
        If(intersectsCluster(lightIdx, aabbMin, aabbMax), () => {
          If(index.greaterThanEqual(firstSlot), () => {
            const slot = index.sub(firstSlot);
            chunks.element(slot.div(4)).element(slot.mod(4)).assign(lightIdx.add(int(1)));
          });
          index.addAssign(int(1));
        });
      });
      const firstElement = clusterIndex.mul(chunksPerCluster).add(firstChunk);
      const writeChunks = () => { Loop(chunksPerInvocation, ({ i }) => { lightIndexes.element(firstElement.add(i)).assign(chunks.element(i)); }); };
      if (this._isWebGLBackend === true) If(firstElement.lessThan(int(elements)).and(int(this.id).notEqual(int(-1))), writeChunks);
      else writeChunks();
    })().compute(clusterCount * invocationsPerCluster).setName("Update Clustered Lights (night)");
    const getScreenClusterIndex = Fn(() => {
      const screenTile = screenCoordinate.div(tileSize).floor();
      const viewDepth = positionView.z.negate();
      const invLog = float(1).div(log(this._cameraFar.div(this._cameraNear)));
      const zSlice = clamp(log(viewDepth.div(this._cameraNear)).mul(invLog).mul(float(NZ)).floor(), float(0), float(NZ - 1));
      return int(screenTile.x).add(int(screenTile.y).mul(NX)).add(int(zSlice).mul(NX.mul(NY)));
    });
    this._lightIndexes = lightIndexes;
    this._screenClusterIndex = getScreenClusterIndex().toVar();
    this._compute = compute;
    this._needsRebuild = false;
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
      // with each chunk, the four lights' position rows are fetched together (four loads in flight instead of a
      // dependent load per iteration: the loop is latency-bound, not ALU-bound - measured in the lab)
      const A0 = vec4(0).toVar(), A1 = vec4(0).toVar(), A2 = vec4(0).toVar(), A3 = vec4(0).toVar();
      const row = (k) => textureLoad(tex, ivec2(max(chunk.element(k).sub(1), 0), ROW.POS));
      Loop(this.maxLightsPerCluster, ({ i }) => {
        const ii = int(i), j = ii.mod(4);
        If(j.equal(0), () => {
          chunk.assign(this._lightIndexes.element(base.add(ii.div(4))));
          A0.assign(row(0)); A1.assign(row(1)); A2.assign(row(2)); A3.assign(row(3));
        });
        const li = chunk.element(j);
        If(li.equal(int(0)), () => { Break(); });
        const idx = li.sub(1);
        // cheapest rejections first: the range test (prefetched row), the cone test (one more fetch), the rest only for
        // a fragment that the light reaches (a cluster lists every light whose bounding sphere touches it: most fail)
        const A = select(j.equal(0), A0, select(j.equal(1), A1, select(j.equal(2), A2, A3))).toVar();
        const Lv = A.xyz.sub(positionView).toVar();             // fragment -> light (view space)
        const d2 = dot(Lv, Lv).toVar(), range = abs(A.w);
        If(d2.lessThan(range.mul(range)), () => {
          const C = textureLoad(tex, ivec2(idx, ROW.SPOT)).toVar();
          const d = sqrt(d2);
          const L = Lv.div(max(d, 1e-4)).toVar();               // unit, fragment -> light
          const f = L.negate();                                  // unit, light -> fragment
          const axis = C.xyz;                                    // beam (unit, view space)
          const cosA = dot(f, axis).toVar();
          // a low beam (range stored negative) lights nothing above its cut-off (~ +2 % at the kink): the facades and
          // everything higher than the lamp skip the rest (a headlight's cone covers a lot of screen otherwise)
          If(cosA.greaterThan(C.w).and(A.w.greaterThan(0).or(dot(f, upV).lessThan(0.035))), () => {
          const B = textureLoad(tex, ivec2(idx, ROW.COLOR)).toVar();
          const E0 = textureLoad(extra, ivec2(idx, 0)).toVar(), E1 = textureLoad(extra, ivec2(idx, 1)).toVar();
          const spot = smoothstep(C.w, E1.x, cosA).toVar();
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
              k.assign(below.mul(hot.mul(1.4).add(spread)));
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

  dispose() { this._extra.dispose(); this._planes.dispose(); super.dispose(); }
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
