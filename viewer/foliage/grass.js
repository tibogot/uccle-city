// GPU GRASS (and the other ground fields: wildflowers, daisies, leaf litter). docs/FOLIAGE.md §2.
//
// Nothing is stored: every frame a compute pass walks a stable WORLD grid of cells around the camera (one candidate
// per cell, jittered inside it by a hash of the cell's integer coordinates), reads the foliage mask there (how much
// grass, which kind, how many flowers), decides if the candidate is drawn, and appends the survivors to a compacted
// buffer whose count feeds an INDIRECT draw (culled candidates cost no vertex work). Same cell -> same blade, same
// height, same colour, whatever the camera does: world-anchored, deterministic, no swimming. (Ghost of Tsushima's
// compute blades, game-engine-v1's revoGrassSystem compaction; docs/FOLIAGE_RESEARCH.md §1.)
//
// DENSITY BY DISTANCE, WITHOUT POPPING. Each candidate has a random r; it is kept while r < p(d), p falling from 1 to 0
// across the layer's fade band. A kept blade's height is scaled by smoothstep(0, 0.12, p(d) - r): a blade that is
// about to go (or has just come) is tiny, so blades GROW out of the ground as you walk toward them and sink back as
// you walk away. The survivors WIDEN by 1/sqrt(p) (capped) so the covered area falls slower than the count, and the
// ground under the grass converges to the colour the blades average to over the same band (grassGroundColor below),
// so where the last blade sinks the ground already looks like the field. (GoT; game-engine-v1 grassFarTsl.)
//
// Sub-pixel blades crawl (they don't fade, they flicker as they cross pixel centres): blade width has a floor in
// PIXELS (game-engine-v1's lesson), so a far blade is drawn wide enough to be drawn honestly.
//
// Two grass layers: NEAR (dense, 7 cm grid, gone by 14 m) and MAIN (17 cm grid, out to ~45 m). Plus the flowers
// layer (meadow wildflowers and lawn daisies, by the mask's B channel and the season) and leaf litter (A channel x
// the season's litter). Small plants never cast shadows; they receive the sun's.
import * as THREE from "three/webgpu";
import {
  Fn, If, uniform, float, int, uint, vec2, vec3, vec4, instanceIndex, instancedArray, storage, atomicAdd, atomicStore,
  hash, texture, smoothstep, mix, clamp, max, min, abs, sqrt, length, normalize, cross, dot, cos, sin, cameraPosition,
  cameraViewMatrix, positionLocal, varying, select, floor, pow, attribute, sign, PI2, uv,
} from "three/tsl";
import { windAt, wind } from "./wind.js";
import { season } from "./seasons.js";
import { noiseAt } from "./noise.js";
import { env } from "../lighting.js";

// ---------------------------------------------------------------------------------------------- inputs
/** The foliage mask over a square region: RGBA8, R = grass cover 0-1, G = kind (0 lawn, 0.5 verge, 1 meadow),
 *  B = flowers 0-1, A = litter receptivity 0-1. Built by viewer/foliage/placement.js. */
export class FoliageMask {
  constructor(data, res, x0, z0, size) {
    this.data = data; this.res = res; this.x0 = x0; this.z0 = z0; this.size = size;
    this.tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat);
    this.tex.magFilter = THREE.LinearFilter; this.tex.minFilter = THREE.LinearFilter;
    this.tex.generateMipmaps = false; this.tex.needsUpdate = true;
    this.uOrigin = uniform(new THREE.Vector2(x0, z0));
    this.uInv = uniform(1 / size);
  }
  /** TSL sample at world xz (level 0: works in compute and vertex) */
  at(xz) { return texture(this.tex, xz.sub(this.uOrigin).mul(this.uInv)).level(0); }
  atFrag(xz) { return texture(this.tex, xz.sub(this.uOrigin).mul(this.uInv)); }
  /** JS read (nearest) */
  get(x, z) {
    const i = Math.floor((x - this.x0) / this.size * this.res), j = Math.floor((z - this.z0) / this.size * this.res);
    if (i < 0 || j < 0 || i >= this.res || j >= this.res) return [0, 0, 0, 0];
    const k = (j * this.res + i) * 4, d = this.data;
    return [d[k] / 255, d[k + 1] / 255, d[k + 2] / 255, d[k + 3] / 255];
  }
}

/** Ground heights on a regular grid (row-major along z), interpolated on the SAME triangles as groundGeometry()
 *  below, so a blade's root is exactly on the drawn ground. */
export class GroundHeights {
  constructor(heights, cols, rows, x0, z0, step) {
    Object.assign(this, { heights, cols, rows, x0, z0, step });
    this.buf = instancedArray(heights.length, "float");
    this.buf.value.array.set(heights);
    this.buf.value.needsUpdate = true;
    this.u = { origin: uniform(new THREE.Vector2(x0, z0)), inv: uniform(1 / step) };
  }
  /** TSL height at world xz */
  at(xz) {
    const g = xz.sub(this.u.origin).mul(this.u.inv);
    const gx = clamp(g.x, 0, this.cols - 1.001), gz = clamp(g.y, 0, this.rows - 1.001);
    const ix = floor(gx), iz = floor(gz), fx = gx.sub(ix), fz = gz.sub(iz);
    const i = uint(iz).mul(uint(this.cols)).add(uint(ix));
    const H = this.buf;
    const a = H.element(i), d = H.element(i.add(1)), b = H.element(i.add(uint(this.cols))), c = H.element(i.add(uint(this.cols + 1)));
    const lower = a.add(d.sub(a).mul(fx)).add(b.sub(a).mul(fz));
    const upper = c.add(b.sub(c).mul(float(1).sub(fx))).add(d.sub(c).mul(float(1).sub(fz)));
    return select(fx.add(fz).lessThanEqual(1), lower, upper);
  }
  /** JS height (same triangles) */
  get(x, z) {
    const gx = Math.min(Math.max((x - this.x0) / this.step, 0), this.cols - 1.001), gz = Math.min(Math.max((z - this.z0) / this.step, 0), this.rows - 1.001);
    const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, H = this.heights, C = this.cols, i = iz * C + ix;
    const a = H[i], d = H[i + 1], b = H[i + C], c = H[i + C + 1];
    return fx + fz <= 1 ? a + (d - a) * fx + (b - a) * fz : c + (b - c) * (1 - fx) + (d - c) * (1 - fz);
  }
  /** a ground mesh on those triangles (cell diagonal from (ix, iz+1) to (ix+1, iz)) */
  geometry() {
    const { cols, rows, x0, z0, step, heights } = this;
    const pos = new Float32Array(cols * rows * 3);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i; pos[k * 3] = x0 + i * step; pos[k * 3 + 1] = heights[k]; pos[k * 3 + 2] = z0 + j * step;
    }
    const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
    let t = 0;
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i, d = a + 1, b = a + cols, c = b + 1;
      idx[t++] = a; idx[t++] = b; idx[t++] = d; idx[t++] = b; idx[t++] = c; idx[t++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    return g;
  }
}

// ---------------------------------------------------------------------------------------------- shared uniforms
export const grassU = {
  density: uniform(1),          // global density multiplier (quality)
  minPixels: uniform(0.8),      // blade width floor in pixels
  pixelScale: uniform(500),     // (projection[5] * viewport height / 2): metres -> pixels at 1 m
  // pushers (feet, wheels): xyz + radius; radius 0 = off
  push: [0, 1, 2, 3].map(() => uniform(new THREE.Vector4(0, -1e4, 0, 0))),
  lawnH: uniform(0.075), vergeH: uniform(0.32), meadowH: uniform(0.48),
  debugLayers: uniform(0),      // 1: tint the layers (near red, main blue) to show the bands
};

// heights by kind (0 lawn, .5 verge, 1 meadow)
const kindMix = (kind, a, b, c) => mix(mix(a, b, clamp(kind.mul(2), 0, 1)), c, clamp(kind.mul(2).sub(1), 0, 1));

/** TSL: the grass albedo at world xz for a blade of kind `kind`, at height fraction h (0 root .. 1 tip), random r.
 *  Shared by the blades AND the ground, so the far ground is what the blades average to. */
export const grassAlbedo = Fn(([xz, kind, h, r]) => {
  const S = season.u;
  const isLong = clamp(kind.mul(2), 0, 1);
  const root = mix(vec3(S.lawnRoot), vec3(S.longRoot), isLong);
  const tip = mix(vec3(S.lawnTip), vec3(S.longTip), isLong);
  const n = noiseAt(xz, 1 / 23, true);                  // patches: ~23 m tile, features of a few metres
  // patches: lusher / paler, and dry straw on long grass in summer (and a little on lawns)
  const lush = n.b.sub(0.5).mul(0.35);
  const dryAmt = smoothstep(0.55, 0.85, n.r.add(r.mul(0.25))).mul(S.dry).mul(mix(float(0.35), float(1), isLong));
  let c = mix(root, tip, pow(max(h, 0.001), float(0.8)));
  c = c.mul(float(1).add(lush)).mul(r.mul(0.3).add(0.85));
  c = mix(c, vec3(0.42, 0.33, 0.17).mul(h.mul(0.5).add(0.6)), dryAmt.mul(0.7));
  return c;
});

/** TSL: the colour the ground under grass takes: the blades' average, darker near the camera (the shaded thatch
 *  between the blades), converging to the field's average across the main layer's fade band. `m` = mask sample. */
export function grassGroundColor(xz, m, dist, baseColor, layer) {
  const kind = m.g, cover = clamp(m.r.mul(grassU.density), 0, 1);
  // the average over a blade's height (h ~ 0.55) and over r (0.5), times the blades' own AO average
  const avg = grassAlbedo(xz, kind, float(0.55), float(0.5)).mul(0.86);
  const far = smoothstep(layer.fadeA * 0.5, layer.fadeB, dist);
  const under = mix(avg.mul(mix(0.55, 0.62, kind)), avg, far);      // near: the thatch between blades is darker
  const snow = season.uSnow;
  const g = mix(under, vec3(0.86, 0.88, 0.92), snow.mul(0.9));
  return mix(baseColor, g, cover);
}

// ---------------------------------------------------------------------------------------------- geometries
/** a blade: `seg` segments + a tip, P0().x in -0.5..0.5 (side), .y in 0..1 (height) */
function bladeGeometry(seg) {
  const pos = [], idx = [];
  for (let s = 0; s < seg; s++) { const y = s / seg; pos.push(-0.5, y, 0, 0.5, y, 0); }
  pos.push(0, 1, 0);
  for (let s = 0; s < seg - 1; s++) { const a = s * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const l = (seg - 1) * 2; idx.push(l, l + 1, seg * 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** a flower: a stem strip (part 0) and a cupped 6-petal head (part 1: centre vertex fpart.y = 0, rim 1).
 *  attribute fpart = (part, radial 0..1, angle) */
function flowerGeometry() {
  const pos = [], fp = [], idx = [];
  const add = (x, y, z, part, rad, ang) => { pos.push(x, y, z); fp.push(part, rad, ang); return pos.length / 3 - 1; };
  // stem: 3 rows
  for (let s = 0; s < 3; s++) { add(-0.5, s / 2, 0, 0, s / 2, 0); add(0.5, s / 2, 0, 0, s / 2, 0); }
  for (let s = 0; s < 2; s++) { const a = s * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  // head: centre + 12 rim (petal tips and notches)
  const c = add(0, 1, 0, 1, 0, 0);
  const rim = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; rim.push(add(Math.cos(a), 1, Math.sin(a), 1, k % 2 ? 0.62 : 1, a)); }
  for (let k = 0; k < 12; k++) idx.push(c, rim[(k + 1) % 12], rim[k]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("fpart", new THREE.Float32BufferAttribute(fp, 3));
  g.setIndex(idx);
  return g;
}

/** a fallen leaf: an outline of 8 points around a midrib, slightly curled (P0().z = curl weight) */
function leafGeometry() {
  const pts = [[0, -0.5], [0.22, -0.3], [0.3, 0.0], [0.22, 0.28], [0, 0.5], [-0.22, 0.28], [-0.3, 0.0], [-0.22, -0.3]];
  const pos = [0, 0, 0], idx = [];
  for (const [x, y] of pts) pos.push(x, y, Math.abs(x) / 0.3);
  for (let k = 0; k < pts.length; k++) idx.push(0, 1 + k, 1 + ((k + 1) % pts.length));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------------------------------------- a GPU scatter layer
const LAYERS = {
  near:    { kind: "blade", spacing: 0.07, fadeA: 6, fadeB: 14, maxWiden: 1.5, seg: 5, seed: 1 },
  main:    { kind: "blade", spacing: 0.17, fadeA: 22, fadeB: 46, maxWiden: 2.2, seg: 4, seed: 2 },
  flowers: { kind: "flower", spacing: 0.32, fadeA: 22, fadeB: 40, maxWiden: 1.6, seed: 3 },
  litter:  { kind: "leaf", spacing: 0.16, fadeA: 12, fadeB: 26, maxWiden: 1.3, seed: 4 },
};

class ScatterLayer {
  constructor(sys, name, o) {
    Object.assign(this, o);
    this.name = name; this.sys = sys;
    this.side = Math.ceil((this.fadeB * 2) / this.spacing) + 2;
    this.count = this.side * this.side;
    this.cap = Math.min(this.count, o.cap ?? this.count);
    this.u = { groundY: uniform(0), base: uniform(new THREE.Vector2()), cam: uniform(new THREE.Vector3()), vp: uniform(new THREE.Matrix4()), fadeA: uniform(this.fadeA), fadeB: uniform(this.fadeB) };
    this.lastCount = 0;
    this.build();
  }

  build() {
    const { sys, u, side, spacing } = this;
    const A = instancedArray(this.cap, "vec4"), B = instancedArray(this.cap, "vec4");
    this.A = A; this.B = B;
    const geom = this.kind === "blade" ? bladeGeometry(this.seg) : this.kind === "flower" ? flowerGeometry() : leafGeometry();
    const ind = new Uint32Array(5); ind[0] = geom.index.count;
    this.indirect = new THREE.IndirectStorageBufferAttribute(ind, 5);
    geom.setIndirect(this.indirect);
    const counter = storage(this.indirect, "uint", 5).toAtomic();
    this.reset = Fn(() => { atomicStore(counter.element(1), uint(0)); })().compute(1);

    const kind = this.kind, seedOff = uint(this.seed * 7919);
    const cap = uint(this.cap);
    this.update = Fn(() => {
      const i = instanceIndex;
      const cx = int(i.mod(uint(side))).add(int(u.base.x)), cz = int(i.div(uint(side))).add(int(u.base.y));
      const seed = uint(cx.add(1048576)).mul(uint(73856093)).bitXor(uint(cz.add(1048576)).mul(uint(19349663))).add(seedOff);
      const r0 = hash(seed), r1 = hash(seed.add(1)), r2 = hash(seed.add(2)), r3 = hash(seed.add(3));
      const xz = vec2(float(cx).add(r0), float(cz).add(r1)).mul(spacing);
      // cheap tests FIRST (no memory reads): the layer's disc and the frustum at the camera's ground height
      // (+- 4 m of slope margin); only then the mask and the ground height
      const dxz = length(xz.sub(u.cam.xz));
      const roughP = vec3(xz.x, u.groundY, xz.y);
      const rc = u.vp.mul(vec4(roughP, 1));
      const roughIn = abs(rc.x).lessThan(rc.w.add(4)).and(abs(rc.y).lessThan(rc.w.add(12))).and(rc.w.greaterThan(-6));
      If(dxz.lessThan(u.fadeB).and(roughIn), () => {
        const m = sys.mask.at(xz);
        // how many of these grow here (0-1)
        let dens;
        if (kind === "blade") dens = m.r.mul(grassU.density);
        else if (kind === "flower") {
          // meadow / verge wildflowers by B; lawn daisies: a few wherever there is lawn (less on mown lawns in summer)
          const lawn = float(1).sub(clamp(m.g.mul(2), 0, 1));
          dens = m.r.mul(m.b.mul(season.u.wild).mul(0.8).add(lawn.mul(season.u.daisy).mul(0.07)));
        } else dens = m.a.mul(season.u.litter).mul(0.55);
        const keepCover = dens.sub(r2);
        If(keepCover.greaterThan(0), () => {
          const pos = vec3(xz.x, sys.ground.at(xz), xz.y);
          const d = length(pos.sub(u.cam));
          const p = float(1).sub(smoothstep(u.fadeA, u.fadeB, d));
          const keepDist = p.sub(r3);
          // exact frustum (generous margin: the tallest thing here is < 1 m with its lean)
          const clip = u.vp.mul(vec4(pos.add(vec3(0, 0.3, 0)), 1));
          const inside = abs(clip.x).lessThan(clip.w.add(1.2)).and(abs(clip.y).lessThan(clip.w.add(1.2))).and(clip.w.greaterThan(-1));
          If(keepDist.greaterThan(0).and(inside), () => {
            const slot = atomicAdd(counter.element(1), uint(1));
            If(slot.lessThan(cap), () => {
              const grow = smoothstep(0, 0.12, keepDist).mul(smoothstep(0, 0.1, keepCover));
              const widen = clamp(float(1).div(sqrt(max(p, 0.02))), 1, this.maxWiden);
              A.element(slot).assign(vec4(pos, float(seed.bitAnd(uint(0xffffff)))));
              B.element(slot).assign(vec4(grow, widen, m.g, d));
            });
          });
        });
      });
    })().compute(this.count, [256]);

    const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.82, metalness: 0 });
    mat.envMapIntensity = 0.8;
    if (kind === "blade") this.bladeNodes(mat);
    else if (kind === "flower") this.flowerNodes(mat);
    else this.leafNodes(mat);
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.name = "foliage_" + this.name;
    this.material = mat;
  }

  /** shared per-instance reads in the vertex stage */
  inst() {
    const a = this.A.element(instanceIndex), b = this.B.element(instanceIndex);
    const seed = uint(a.w);
    return { root: a.xyz, seed, grow: b.x, widen: b.y, kind: b.z, dist: b.w, rnd: (k) => hash(seed.add(uint(k))) };
  }

  /** push from the pushers (feet / wheels): a lean vector away from each, strength by proximity */
  pushAt(root) {
    let lean = vec2(0, 0), crush = float(0);
    for (const P of grassU.push) {
      const dxz = root.xz.sub(P.xz), dd = length(dxz);
      const k = float(1).sub(smoothstep(P.w.mul(0.4), P.w, dd)).mul(step01(P.w)).mul(float(1).sub(smoothstep(0.2, 0.8, root.y.sub(P.y).abs())));
      lean = lean.add(dxz.div(max(dd, 0.01)).mul(k.mul(0.9)));
      crush = max(crush, k);
    }
    return { lean, crush };
  }

  bladeNodes(mat) {
    const I = this.inst();
    const { root, grow, widen, kind, dist } = I;
    const h = P0().y, side = P0().x;
    const r = I.rnd(11), r2 = I.rnd(12), r3 = I.rnd(13);
    const clump = noiseAt(root.xz, 1 / 5, true).a;                          // tufts ~0.3 m
    const S = season.u;
    const Hbase = kindMix(kind, grassU.lawnH, grassU.vergeH.mul(S.height), grassU.meadowH.mul(S.height));
    const snowFlat = float(1).sub(season.uSnow.mul(0.75));
    const H = Hbase.mul(r.mul(0.6).add(0.7)).mul(clump.mul(0.5).add(0.75)).mul(grow).mul(snowFlat);
    // width: authored, widened by the thinning, floored in pixels
    const W0 = kindMix(kind, float(0.0045), float(0.006), float(0.0065)).mul(r2.mul(0.5).add(0.75)).mul(widen);
    const camD = max(length(cameraPosition.sub(root)), 0.1);
    const W = max(W0, grassU.minPixels.mul(camD).div(grassU.pixelScale)).mul(min(grow.mul(4), 1));
    // facing: random yaw, pulled toward the clump's own direction
    const yaw = mix(r3, clump, 0.4).mul(PI2);
    let sideV = vec3(cos(yaw), 0, sin(yaw));
    // view-space widening (GoT): an edge-on blade turns part-way toward the camera so it keeps a width
    const toCam = cameraPosition.sub(root), vxz = normalize(vec3(toCam.x, 0, toCam.z).add(vec3(1e-4, 0, 0)));
    const sb = vec3(vxz.z.negate(), 0, vxz.x);
    const edgeOn = float(1).sub(abs(dot(vec3(sideV.z.negate(), 0, sideV.x), vxz)));
    sideV = normalize(mix(sideV.mul(sign(dot(sideV, sb)).add(0.001)), sb, edgeOn.mul(0.55)));
    // lean: own resting lean (long grass flops more) + wind + pushers
    const restA = I.rnd(14).mul(PI2);
    const rest = vec2(cos(restA), sin(restA)).mul(kindMix(kind, float(0.12), float(0.3), float(0.38)).mul(I.rnd(15).mul(0.6).add(0.4)));
    const w = windAt(root.xz);
    const flick = sin(wind.uTime.mul(2.1).add(r.mul(PI2))).mul(w.z.mul(0.12).add(0.03)).mul(kindMix(kind, float(0.3), float(1), float(1)));
    const pu = this.pushAt(root);
    const lean0 = rest.add(w.xy.mul(kindMix(kind, float(0.45), float(1.1), float(1.25)))).add(vec2(flick, flick.mul(0.6))).add(pu.lean);
    const lm = min(length(lean0), 0.95);
    const lean = lean0.div(max(length(lean0), 1e-4)).mul(lm);
    const prof = h.mul(h);
    const drop = float(1).sub(lm.mul(lm).mul(0.45).mul(h));
    const taper = float(1).sub(pow(max(h, 0.001), float(1.6)).mul(0.85));
    const Hc = H.mul(mix(float(1), float(0.35), pu.crush));
    const p = root.add(vec3(lean.x.mul(prof).mul(Hc), h.mul(Hc).mul(drop), lean.y.mul(prof).mul(Hc))).add(sideV.mul(side.mul(W).mul(taper)));
    mat.positionNode = p;
    // normal: the blade's face (toward the camera), rounded across its width, leaned mostly back to up
    const tang = normalize(vec3(lean.x.mul(h.mul(2)), drop, lean.y.mul(h.mul(2))));
    let nf = normalize(cross(sideV, tang));
    nf = nf.mul(sign(dot(nf, toCam)).add(0.001));
    const nW = normalize(mix(normalize(nf.add(sideV.mul(side.mul(1.4)))), vec3(0, 1, 0), 0.55));
    const vN = varying(nW, "v_gN");
    mat.normalNode = normalize(cameraViewMatrix.mul(vec4(vN, 0)).xyz);
    // colour: the shared grass albedo, root AO (deeper in long grass), wind-flattened blades show paler undersides
    const ao = mix(kindMix(kind, float(0.55), float(0.4), float(0.35)), float(1), smoothstep(0, 0.75, h));
    let c = grassAlbedo(root.xz, kind, h, r).mul(ao).mul(float(1).add(w.z.mul(lm).mul(h).mul(0.15)));
    c = mix(c, vec3(0.9, 0.92, 0.95), season.uSnow.mul(smoothstep(0.3, 1, h)).mul(0.6));
    const dbg = this.name === "near" ? vec3(1.6, 0.6, 0.6) : vec3(0.6, 0.8, 1.6);
    c = mix(c, c.mul(dbg), grassU.debugLayers);
    mat.colorNode = varying(c, "v_gC");
    // translucency: blades lit from behind glow at the tips
    const vDir = normalize(cameraPosition.sub(p));
    const back = pow(max(dot(vDir.negate(), env.uSunDir), 0.001), float(4)).mul(h).mul(0.35);
    mat.emissiveNode = varying(vec3(env.uSunColor).mul(c).mul(back), "v_gE");
    mat.roughnessNode = float(0.78);
    void dist;
  }

  flowerNodes(mat) {
    const I = this.inst();
    const { root, grow, kind } = I;
    const fpart = attribute("fpart", "vec3");
    const part = fpart.x, rad = fpart.y;
    const S = season.u;
    const isLawn = float(1).sub(clamp(kind.mul(2), 0, 1));
    const sp = I.rnd(21);                                     // species pick
    // species: lawn = daisies (and a few dandelions); verge / meadow = buttercup, oxeye daisy, clover, cornflower, poppy
    const stemH = mix(mix(float(0.32), float(0.5), I.rnd(22)), mix(float(0.05), float(0.09), I.rnd(22)), isLawn).mul(grow);
    const headR = mix(mix(float(0.016), float(0.028), I.rnd(23)), float(0.009), isLawn).mul(grow).mul(S.wild.mul(isLawn.oneMinus()).add(S.daisy.mul(isLawn)).mul(0.7).add(0.3));
    const w = windAt(root.xz);
    const sway = sin(wind.uTime.mul(1.7).add(I.rnd(24).mul(PI2))).mul(w.z.mul(0.1).add(0.03));
    const lean = w.xy.mul(0.9).add(vec2(sway, sway.mul(0.5))).add(this.pushAt(root).lean);
    const yaw = I.rnd(25).mul(PI2);
    const hh = select(part.lessThan(0.5), P0().y, float(1));
    const stemTop = root.add(vec3(lean.x.mul(stemH), stemH, lean.y.mul(stemH)));
    const stemP = root.add(vec3(lean.x.mul(hh.mul(hh)).mul(stemH), hh.mul(stemH), lean.y.mul(hh.mul(hh)).mul(stemH)))
      .add(vec3(cos(yaw), 0, sin(yaw)).mul(P0().x.mul(0.003)));
    // head: a slightly cupped disc facing up (tilted with the lean)
    const hx = P0().x.mul(headR), hz = P0().z.mul(headR);
    const headP = stemTop.add(vec3(hx, rad.mul(headR).mul(0.35).add(0.004), hz));
    mat.positionNode = select(part.lessThan(0.5), stemP, headP);
    // colours
    const yellow = vec3(0.95, 0.72, 0.05), white = vec3(0.92, 0.92, 0.88), pink = vec3(0.62, 0.3, 0.5), blue = vec3(0.2, 0.32, 0.8), red = vec3(0.8, 0.08, 0.05);
    const meadowPetal = select(sp.lessThan(0.38), yellow, select(sp.lessThan(0.62), white, select(sp.lessThan(0.82), pink, select(sp.lessThan(0.93), blue, red))));
    const lawnPetal = select(sp.lessThan(0.8), white, yellow);
    const petal = mix(meadowPetal, lawnPetal, isLawn);
    const centre = select(petal.x.greaterThan(0.85).and(petal.z.greaterThan(0.8)), vec3(0.9, 0.62, 0.05), petal.mul(0.6));
    const head = mix(centre, petal, smoothstep(0.0, 0.5, rad));
    const stem = vec3(0.1, 0.2, 0.05).mul(P0().y.mul(0.6).add(0.5));
    mat.colorNode = varying(select(part.lessThan(0.5), stem, head), "v_fC");
    const nW = select(part.lessThan(0.5), vec3(0, 1, 0), normalize(vec3(lean.x, 1, lean.y)));
    mat.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_fN"), 0)).xyz);
    mat.roughnessNode = float(0.6);
  }

  leafNodes(mat) {
    const I = this.inst();
    const { root, grow } = I;
    const size = mix(float(0.035), float(0.075), I.rnd(31)).mul(grow);
    const yaw = I.rnd(32).mul(PI2);
    const ca = cos(yaw), sa = sin(yaw);
    const lx = P0().x.mul(size), lz = P0().y.mul(size);
    const curl = P0().z.mul(size).mul(I.rnd(33).mul(0.35).add(0.08));
    const tilt = I.rnd(34).sub(0.5).mul(0.3);
    const p = root.add(vec3(lx.mul(ca).sub(lz.mul(sa)), curl.add(lz.mul(tilt)).add(0.006), lx.mul(sa).add(lz.mul(ca))));
    mat.positionNode = p;
    const pick = I.rnd(35);
    // beech / oak / lime / plane browns and yellows, some still green-yellow
    const col = select(pick.lessThan(0.35), vec3(0.42, 0.2, 0.06), select(pick.lessThan(0.6), vec3(0.6, 0.38, 0.08),
      select(pick.lessThan(0.8), vec3(0.3, 0.17, 0.07), select(pick.lessThan(0.92), vec3(0.72, 0.55, 0.12), vec3(0.45, 0.42, 0.12)))));
    mat.colorNode = varying(col.mul(I.rnd(36).mul(0.35).add(0.75)).mul(float(1).sub(P0().z.mul(0.25))), "v_lC");
    mat.normalNode = normalize(cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz);
    mat.roughnessNode = float(0.75);
  }

  /** per frame (CPU: a few uniform writes and two dispatches) */
  frame(renderer, camera, groundY) {
    const cam = camera.position;
    // from the sky: nothing to draw and nothing to compute
    const above = cam.y - groundY;
    // nothing to grow this season (litter in July, flowers in January): no dispatch at all
    const S = season.u, idle = (this.kind === "leaf" && S.litter.value < 0.01) || (this.kind === "flower" && S.wild.value < 0.01 && S.daisy.value < 0.01);
    const on = this.enabled !== false && above < this.fadeB && !idle;
    this.u.groundY.value = groundY;
    this.mesh.visible = on;
    if (!on) return false;
    this.u.cam.value.copy(cam);
    this.u.base.value.set(Math.floor(cam.x / this.spacing) - (this.side >> 1), Math.floor(cam.z / this.spacing) - (this.side >> 1));
    this.u.vp.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    return [this.reset, this.update];
  }

  /** read the drawn instance count back (lab read-out; async, occasional) */
  async readCount(renderer) {
    const buf = await renderer.getArrayBufferAsync(this.indirect);
    this.lastCount = Math.min(new Uint32Array(buf)[1], this.cap);
    return this.lastCount;
  }
}

const P0 = () => attribute("position", "vec3");   // the RAW geometry position (positionLocal is the positionNode once set)
const step01 = (x) => select(x.greaterThan(0), float(1), float(0));

/** The ground-vegetation fields of one region: grass near + main, flowers, leaf litter. */
export class GrassSystem {
  constructor({ mask, ground, layers = ["near", "main", "flowers", "litter"], timeNode }) {
    this.mask = mask; this.ground = ground; this._time = timeNode;
    this.group = new THREE.Group(); this.group.name = "foliage_ground_fields";
    this.layers = {};
    for (const n of layers) {
      const L = new ScatterLayer(this, n, LAYERS[n]);
      this.layers[n] = L; this.group.add(L.mesh);
    }
  }
  windTime() { return this._time; }
  get main() { return this.layers.main ?? this.layers.near; }
  frame(renderer, camera) {
    grassU.pixelScale.value = camera.projectionMatrix.elements[5] * renderer.domElement.height * 0.5;
    const gy = this.ground.get(camera.position.x, camera.position.z);
    // every layer's dispatches in ONE compute pass (one pass per layer cost more in pass overhead than the work)
    const nodes = [];
    for (const L of Object.values(this.layers)) { const r = L.frame(renderer, camera, gy); if (r) nodes.push(...r); }
    return nodes;
  }
  /** for the read-out: candidate threads per frame and the cap of each layer */
  stats() { return Object.fromEntries(Object.entries(this.layers).map(([k, L]) => [k, { threads: L.count, cap: L.cap, drawn: L.lastCount }])); }
  async readCounts(renderer) { for (const L of Object.values(this.layers)) if (L.mesh.visible) await L.readCount(renderer); else L.lastCount = 0; }
}

export { LAYERS as GRASS_LAYERS };
