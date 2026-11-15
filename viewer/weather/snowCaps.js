// SNOW CAPS (docs/WEATHER.md "Snow round 2"; ?snowcaps=0 = none): snow on car roofs / bonnets / windscreens, benches,
// bins, bus shelters, bike boxes, glass banks, garden wall copings, pillar caps and hedge tops as a real CAP: thickness,
// a rounded rim that comes down to the surface at the edges (never a flat sheet floating over the object), the snow's
// own normals.
//
// How games do it (looked up, see the doc): Company of Heroes 2 / most engines whiten up-facing surfaces by the normal
// (our materials' cover already does); a vertex push along the normal for thickness (Unity / Unreal "snow
// accumulation" shaders) leaves the classic floating sheet on box-like low-poly models (the top moves up, the sides do
// not). So the cap here is its own mesh, baked ONCE per model from the model's own triangles:
//   1. a top-down z-buffer of the model on a 2-4 cm grid (the topmost triangle per cell, its height and normal)
//   2. cells that can hold snow: up-facing (normal.y > 0.45), connected patches (no step over ~3.5 cm between cells)
//   3. the EDGE DISTANCE of every cell to its patch's rim (a cell next to a drop or a non-holding cell; exact Euclidean
//      distance transform), along x and z too (stretched pieces), and each patch's largest distance (its half-width)
//   4. a grid mesh over the holding cells at the model's top surface, those distances as attributes
// In the vertex shader the thickness is a rounded profile of the edge distance: t = D sqrt(1 - (1 - e / D)^2) (a quarter
// circle of radius D at the rim: the bead), D = snow depth x k, never more than the patch's half-width (snow on a 4 cm
// slat stands ~4 cm); its normal from the surface slope + the profile's slope (analytic: no facets). The rim sits ON
// the surface (t = 0 there): no gap, no z-fight edge; the materials' own white cover meets it.
// Drawing: per model ONE instanced draw (the instances within ~60 m, re-gathered every ~0.4 s or 3 m of travel; the
// traffic and the player's car every frame), receive shadows only, distance-faded thickness (no pop), hidden with no
// snow (visible = false: no draw, no cost). Never DynamicDrawUsage: static buffers + needsUpdate + update ranges.
import * as THREE from "three/webgpu";
import { Fn, float, vec2, vec3, vec4, attribute, positionLocal, positionWorld, cameraPosition, cameraViewMatrix, mix, smoothstep, clamp, min, max,
  sqrt, normalize, select, abs, varying, fwidth, length } from "three/tsl";
import { wx } from "./weatherState.js";
import { glint, SNOW_ALBEDO } from "./surfaceWeather.js";
import { noise2D } from "../tslkit.js";

export const CAPS_ON = new URLSearchParams(location.search).get("snowcaps") !== "0" && !/[?&]weather=old(&|$)/.test(location.search);

/**
 * Bake a cap from one or more geometries (model local frame, y up). opts: cell (m), minNy (up-facing threshold), step
 * (m: a bigger height jump between neighbour cells ends a patch), yMin (ignore tops below this height: wheels, the
 * ground plate), minHalf (patches narrower than this half-width are dropped), drop (fn(x, y, z) -> true: skip a cell).
 * -> { geometry, cells, verts } | null
 */
export function bakeCap(geos, { cell = 0.03, minNy = 0.45, step = 0.035, yMin = -Infinity, minHalf = 0.008, drop = null } = {}) {
  geos = Array.isArray(geos) ? geos : [geos];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const g of geos) {
    const P = g.attributes.position.array;
    for (let k = 0; k < P.length; k += 3) { x0 = Math.min(x0, P[k]); x1 = Math.max(x1, P[k]); z0 = Math.min(z0, P[k + 2]); z1 = Math.max(z1, P[k + 2]); }
  }
  if (!(x1 > x0)) return null;
  const nx = Math.ceil((x1 - x0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1, NN = nx * nz;
  const top = new Float32Array(NN).fill(-Infinity), ny = new Float32Array(NN), sx = new Float32Array(NN), sz = new Float32Array(NN);
  const cx = (i) => x0 + i * cell, cz = (j) => z0 + j * cell;
  // 1. the top-down z-buffer
  for (const g of geos) {
    const P = g.attributes.position.array, I = g.index?.array;
    const T = I ? I.length / 3 : P.length / 9;
    for (let t = 0; t < T; t++) {
      const a = I ? I[t * 3] : t * 3, b = I ? I[t * 3 + 1] : t * 3 + 1, c = I ? I[t * 3 + 2] : t * 3 + 2;
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], bx = P[b * 3], by = P[b * 3 + 1], bz = P[b * 3 + 2], qx = P[c * 3], qy = P[c * 3 + 1], qz = P[c * 3 + 2];
      // the face normal (geometric), turned up: the topmost surface of a solid is always seen from above (neither the
      // winding nor the vertex normals are trusted: the garden kit's coping has its top's normals pointing down)
      let fx = (by - ay) * (qz - az) - (bz - az) * (qy - ay), fy = (bz - az) * (qx - ax) - (bx - ax) * (qz - az), fz = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
      const fl = Math.hypot(fx, fy, fz); if (fl < 1e-12) continue;
      fx /= fl; fy /= fl; fz /= fl;
      if (fy < 0) { fx = -fx; fy = -fy; fz = -fz; }
      const den = (bz - qz) * (ax - qx) + (qx - bx) * (az - qz);
      if (Math.abs(den) < 1e-12) continue;                      // seen edge-on from above (a vertical face)
      const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, qx) - x0) / cell)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, qx) - x0) / cell));
      const j0 = Math.max(0, Math.ceil((Math.min(az, bz, qz) - z0) / cell)), j1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, qz) - z0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = cx(i), pz = cz(j);
        const l1 = ((bz - qz) * (px - qx) + (qx - bx) * (pz - qz)) / den, l2 = ((qz - az) * (px - qx) + (ax - qx) * (pz - qz)) / den, l3 = 1 - l1 - l2;
        if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const y = l1 * ay + l2 * by + l3 * qy, o = j * nx + i;
        if (y > top[o]) { top[o] = y; ny[o] = fy; sx[o] = fy > 0.05 ? -fx / fy : 0; sz[o] = fy > 0.05 ? -fz / fy : 0; }
      }
    }
  }
  // 2. holding cells, rims (a neighbour that does not hold, or a drop), patches
  const hold = new Uint8Array(NN);
  for (let o = 0; o < NN; o++) hold[o] = top[o] > yMin && ny[o] >= minNy && !(drop && drop(cx(o % nx), top[o], cz((o / nx) | 0))) ? 1 : 0;
  const joined = (o, p, di, dj) => {     // same patch: the height follows the surface's slope within `step`
    if (!hold[p]) return false;
    const exp = top[o] + (di * sx[o] + dj * sz[o]) * cell;
    return Math.abs(top[p] - exp) < step;
  };
  const seed = new Uint8Array(NN);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const o = j * nx + i; if (!hold[o]) continue;
    for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) { seed[o] = 1; break; }
      const p = jj * nx + ii;
      // a rim: the neighbour holds no snow and is not higher (a wall the snow leans on is no rim), or it is a drop
      if (!hold[p] ? !(top[p] > top[o] + step) : (top[p] < top[o] + (di * sx[o] + dj * sz[o]) * cell - step)) { seed[o] = 1; break; }
    }
  }
  // 3. edge distances: exact EDT (Felzenszwalb) to the rim cells, directional along rows / columns
  const D = edt(seed, hold, nx, nz);
  const ex = new Float32Array(NN).fill(1e9), ez = new Float32Array(NN).fill(1e9);
  for (let j = 0; j < nz; j++) {
    let last = -1e9; for (let i = 0; i < nx; i++) { const o = j * nx + i; if (seed[o] || !hold[o]) last = i; ex[o] = Math.min(ex[o], i - last); }
    last = 1e9; for (let i = nx - 1; i >= 0; i--) { const o = j * nx + i; if (seed[o] || !hold[o]) last = i; ex[o] = Math.min(ex[o], last - i); }
  }
  for (let i = 0; i < nx; i++) {
    let last = -1e9; for (let j = 0; j < nz; j++) { const o = j * nx + i; if (seed[o] || !hold[o]) last = j; ez[o] = Math.min(ez[o], j - last); }
    last = 1e9; for (let j = nz - 1; j >= 0; j--) { const o = j * nx + i; if (seed[o] || !hold[o]) last = j; ez[o] = Math.min(ez[o], last - j); }
  }
  // patches (flood fill over joined neighbours) and their half-width
  const comp = new Int32Array(NN).fill(-1), cMax = [];
  for (let o0 = 0; o0 < NN; o0++) {
    if (!hold[o0] || comp[o0] >= 0) continue;
    const id = cMax.length, st = [o0]; comp[o0] = id; let m = 0;
    while (st.length) {
      const o = st.pop(), i = o % nx, j = (o / nx) | 0;
      m = Math.max(m, D[o]);
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const p = jj * nx + ii; if (comp[p] >= 0 || !joined(o, p, di, dj)) continue;
        comp[p] = id; st.push(p);
      }
    }
    cMax.push(m * cell);
  }
  // 4. the mesh: a vertex per holding cell of a patch wider than minHalf, quads / triangles between joined cells
  const vid = new Int32Array(NN).fill(-1), pos = [], aE = [], aS = [];
  for (let o = 0; o < NN; o++) {
    if (!hold[o] || cMax[comp[o]] < minHalf) continue;
    const i = o % nx, j = (o / nx) | 0;
    // the gradient of the edge distance (unit, local xz): central differences over the patch
    const at = (ii, jj) => { if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) return D[o]; const p = jj * nx + ii; return comp[p] === comp[o] ? D[p] : D[o]; };
    let gx = at(i + 1, j) - at(i - 1, j), gz = at(i, j + 1) - at(i, j - 1);
    const gl = Math.hypot(gx, gz); if (gl > 1e-6) { gx /= gl; gz /= gl; } else { gx = 0; gz = 0; }
    vid[o] = pos.length / 3;
    pos.push(cx(i), top[o], cz(j));
    aE.push(D[o] * cell, cMax[comp[o]], ex[o] * cell, ez[o] * cell);
    aS.push(gx, gz, sx[o], sz[o]);
  }
  const idx = [];
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;            // a (i, j)  b (i+1, j)  c (i, j+1)  d (i+1, j+1)
    const A = vid[a], B = vid[b], C = vid[c], Dd = vid[d];
    const ok = (p, q) => vid[p] >= 0 && vid[q] >= 0 && comp[p] === comp[q];
    // up-facing winding seen from +y: (a, c, b)
    if (A >= 0 && B >= 0 && C >= 0 && Dd >= 0 && ok(a, b) && ok(a, c) && ok(b, d) && ok(c, d)) { idx.push(A, C, B, B, C, Dd); continue; }
    if (A >= 0 && B >= 0 && C >= 0 && ok(a, b) && ok(a, c)) idx.push(A, C, B);
    else if (B >= 0 && C >= 0 && Dd >= 0 && ok(b, d) && ok(c, d)) idx.push(B, C, Dd);
    else if (A >= 0 && B >= 0 && Dd >= 0 && ok(a, b) && ok(b, d)) idx.push(A, Dd, B);
    else if (A >= 0 && C >= 0 && Dd >= 0 && ok(a, c) && ok(c, d)) idx.push(A, C, Dd);
  }
  if (!idx.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("aE", new THREE.Float32BufferAttribute(aE, 4));
  geometry.setAttribute("aS", new THREE.Float32BufferAttribute(aS, 4));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  geometry.setIndex(idx);
  geometry.computeBoundingSphere(); geometry.computeBoundingBox();
  return { geometry, cells: NN, verts: pos.length / 3, tris: idx.length / 3 };
}

/** exact squared Euclidean distance transform (Felzenszwalb + Huttenlocher) of `seed` over the holding cells, in cells
 *  (0 on a seed; cells that hold no snow count as seeds too, so a patch's distance stops at its own rim) */
function edt(seed, hold, nx, nz) {
  const INF = 1e12, f = new Float64Array(Math.max(nx, nz)), d = new Float64Array(Math.max(nx, nz)), v = new Int32Array(Math.max(nx, nz)), zz = new Float64Array(Math.max(nx, nz) + 1);
  const g = new Float64Array(nx * nz);
  for (let o = 0; o < nx * nz; o++) g[o] = seed[o] || !hold[o] ? 0 : INF;
  const pass = (n, get, set) => {
    for (let q = 0; q < n; q++) f[q] = get(q);
    let k = 0; v[0] = 0; zz[0] = -INF; zz[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= zz[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; zz[k] = s; zz[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (zz[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; set(q, d[q]); }
  };
  for (let i = 0; i < nx; i++) pass(nz, (q) => g[q * nx + i], (q, x) => { g[q * nx + i] = x; });
  for (let j = 0; j < nz; j++) pass(nx, (q) => g[j * nx + q], (q, x) => { g[j * nx + q] = x; });
  const out = new Float32Array(nx * nz);
  for (let o = 0; o < out.length; o++) out[o] = Math.sqrt(g[o]);
  return out;
}

const toView = (n) => normalize(cameraViewMatrix.mul(vec4(n, 0)).xyz);
/**
 * The cap material (one per family: k, maxT, fade). Per-instance attribute aCI = (cos yaw, sin yaw, sx, sz): the
 * instance's turn about y (for the normal) and its stretch along local x / z (garden copings: the edge distance is
 * then the directional one). k: snow depth on this kind of object / depth on the ground; maxT: cap (m); fade: [from,
 * to] m (the thickness sinks to 0, then under the surface: no pop); lumpy: hedge tops.
 */
export function capMaterial({ k = 0.9, maxT = 0.3, fade = [45, 60], lumpy = 0 } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.74, metalness: 0 });
  const E = attribute("aE", "vec4"), S = attribute("aS", "vec4"), CI = attribute("aCI", "vec4");
  const P0 = positionLocal;                                  // (r187: already instanced here)
  const dist = length(cameraPosition.sub(P0));
  const f = float(1).sub(smoothstep(fade[0], fade[1], dist));
  const cover = wx.uSnowCover.mul(smoothstep(0.0, 0.03, wx.uSnowDepth));
  const stretched = abs(CI.z.sub(1)).greaterThan(0.03).or(abs(CI.w.sub(1)).greaterThan(0.03));
  // (stretched = a run of copings, end to end: the ends round off 4 x faster than the sides, so two pieces meeting make
  // a small dimple, not a notch through the cap)
  const e = select(stretched, min(E.z.mul(CI.z).mul(4), E.w.mul(CI.w)), E.x);
  const half = select(stretched, E.y.mul(min(CI.z, CI.w)), E.y);
  // depth on the object, never taller than ~its half-width x 1.1 (snow stands about as tall as the ledge is wide)
  let Dd = min(min(wx.uSnowDepth.mul(k), float(maxT)), half.mul(1.1).add(0.004)).mul(cover);
  if (lumpy) Dd = Dd.mul(noise2D(P0.xz.mul(2.3)).mul(lumpy).add(1 - lumpy * 0.5));
  const R = max(Dd, 0.004), u = min(e.div(R), 1), w = float(1).sub(u);
  const prof = sqrt(max(float(1).sub(w.mul(w)), 0));
  const t = Dd.mul(prof).mul(f);
  // the slope of the profile (dt / de), capped: the bead's tangent is vertical at the rim
  const dtde = select(u.lessThan(1), Dd.mul(w).div(max(prof, 0.18)).div(R), float(0)).mul(f).min(3.0);
  // (sinks under the surface as it fades: nothing coplanar is left far away)
  m.positionNode = P0.add(vec3(0, t.add(mix(float(-0.03), float(0.004), f)), 0));
  const nl = normalize(vec3(S.z.add(dtde.mul(S.x)).negate(), 1, S.w.add(dtde.mul(S.y)).negate()));
  // local -> world: the instance's turn about y (local x -> (cos, 0, -sin), local z -> (sin, 0, cos))
  const nw = vec3(nl.x.mul(CI.x).add(nl.z.mul(CI.y)), nl.y, nl.x.mul(CI.y).negate().add(nl.z.mul(CI.x)));
  const vN = varying(nw);
  const P = positionWorld;
  const fw = fwidth(P.x).add(fwidth(P.z)).mul(0.5).add(0.0002);
  const gl = glint(P, fw);
  m.colorNode = Fn(() => {
    const c = SNOW_ALBEDO.mul(noise2D(P.xz.mul(9.0).add(P.y.mul(3.0))).mul(0.05).add(0.97));
    return mix(c, vec3(0.4, 0.41, 0.42), wx.uSlush.mul(0.6));
  })();
  m.roughnessNode = mix(mix(float(0.74), float(0.15), gl.w), float(0.3), wx.uSlush);
  m.normalNode = normalize(mix(toView(normalize(vN)), toView(gl.xyz), gl.w));
  m.name = "snow-cap";
  return m;
}

/** One model's caps: an InstancedMesh (static buffers, update ranges, hidden at count 0). */
export class CapSet {
  constructor(bake, mat, name, cap = 32) {
    this.bake = bake; this.mat = mat; this.name = name; this.n = 0; this.mesh = null;
    this.grow(cap);
  }
  grow(cap) {
    const parent = this.mesh?.parent;
    if (this.mesh) { parent?.remove(this.mesh); this.mesh.dispose(); }
    this.cap = cap;
    const g = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(this.bake.geometry.attributes)) g.setAttribute(k, a);
    g.setIndex(this.bake.geometry.index);
    this.ci = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    g.setAttribute("aCI", this.ci);
    const m = new THREE.InstancedMesh(g, this.mat, cap);
    m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true;
    m.name = `snow-cap-${this.name}`; m.userData.wxSkip = true;
    this.mesh = m;
    parent?.add(m);
  }
  begin() { this.n = 0; }
  /** a 4 x 4 column-major matrix (array, offset) of a rigid or stretched instance */
  push(e, o = 0) {
    if (this.n >= this.cap) { const keep = this.mesh.instanceMatrix.array.slice(0, this.n * 16), ci = this.ci.array.slice(0, this.n * 4); this.grow(Math.ceil(this.cap * 1.6 / 16) * 16); this.mesh.instanceMatrix.array.set(keep); this.ci.array.set(ci); }
    const M = this.mesh.instanceMatrix.array, i = this.n++;
    for (let k = 0; k < 16; k++) M[i * 16 + k] = e[o + k];
    const sx = Math.hypot(e[o], e[o + 1], e[o + 2]), sz = Math.hypot(e[o + 8], e[o + 9], e[o + 10]);
    const hx = Math.hypot(e[o], e[o + 2]) || 1;
    this.ci.array.set([e[o] / hx, -e[o + 2] / hx, sx, sz], i * 4);
  }
  end(show) {
    const m = this.mesh;
    m.count = this.n;
    m.visible = show && this.n > 0;
    if (!this.n) return;
    m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.addUpdateRange(0, this.n * 16); m.instanceMatrix.needsUpdate = true;
    this.ci.clearUpdateRanges(); this.ci.addUpdateRange(0, this.n * 4); this.ci.needsUpdate = true;
  }
}
