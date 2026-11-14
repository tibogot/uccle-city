// CLIPPED FRONT-GARDEN HEDGES AS INSTANCED MODULES (gardens round 2, docs/assets/GARDENS.md "Hedges"): the city's
// hedges behind railings, on low walls and on their own were one merged mesh per tile per species (viewer/foliage/
// hedges.js buildHedges: up to 10 draws and 90-200 k triangles a tile, every card of the tile drawn wherever the camera
// was, a material set per tile). Here a hedge run is cut into ~1 m MODULES, each an instance of one unit piece
// (stretched along the run, sheared to its slope, scaled to the hedge's height and width), drawn through the kit's
// pools (viewer/gardens/gardenKit.js GardenPool: one pool for the whole city, 50 m cells, LOD bands with the dithered
// hand-over, the tile fade): 3 body draws (LOD0-2) + 1 card draw for the whole city, one fixed material set.
//   body    a clipped section (battered sides, rounded top corners), closed flat ends (a clipped hedge's end);
//           LOD0 a 17-point section, 4 rings per module, lumps displaced in the vertex stage from a noise in RUN metres
//           (iVar.y = the module's start along its run: the lumps run on across module joints); LOD1 10 points, 2 rings,
//           the same lumps; LOD2 a 6-point section, 1 ring, no lumps. Shading = the foliage hedge's (viewer/foliage/
//           hedges.js speciesMaterials): leaf clumps, crevices, soft holes into the dark interior, bump, the species
//           colour by season (beech / hornbeam hold their brown leaves), snow on top; the species per instance
//   cards   leaf sprays (viewer/foliage/cards.js, coverage-preserving mips) baked on a unit module's sides and top,
//           HEDGE_CARDS a module, spread in WORLD metres in the vertex stage (no instance scale on the leaves): near
//           only, they shrink into the body from CARD_NEAR to CARD_FAR (nothing pops, no alpha far away); one LOD
// Per instance iVar = (species + width / 10, start along the run (m), module length (m), height (m)).
// NOTE (three r187 NodeMaterial.setupPosition): the instancing runs BEFORE material.positionNode, so positionLocal /
// normalLocal are already the instance-transformed position / normal there (= world: the pools sit at the origin).
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, vec2, vec3, vec4, float, mix, smoothstep, length, normalize, cross, cos, sin, select, abs, max,
  fwidth, saturate, texture, uv, cameraPosition, cameraViewMatrix, varying, positionLocal, normalLocal, normalWorld,
  positionWorld, fract, floor,
} from "three/tsl";
import { season } from "../foliage/seasons.js";
import { wind, windAt } from "../foliage/wind.js";
import { noiseAt } from "../foliage/noise.js";
import { leafCard } from "../foliage/cards.js";
import { bumpNormal } from "../tslkit.js";
import { lodEye, ditherNoise, keepBand } from "../lodFade.js";

// species (the foliage hedges' palette, viewer/foliage/hedges.js SP): summer, winter (sRGB), card size (m), lumps (m),
// gloss, holds (marcescence: beech keeps its brown leaves all winter)
export const HEDGE_SPECIES = ["privet", "beech", "hornbeam", "laurel", "box"];
const SP = {
  privet:   { summer: "#4a6a28", winter: "#45552a", card: 0.2, lump: 0.025, gloss: 0.55, holds: 0 },
  beech:    { summer: "#557a2c", winter: "#94603a", card: 0.26, lump: 0.035, gloss: 0.7, holds: 1 },
  hornbeam: { summer: "#5a7e30", winter: "#86643a", card: 0.25, lump: 0.04, gloss: 0.75, holds: 0.6 },
  laurel:   { summer: "#335722", winter: "#335222", card: 0.34, lump: 0.05, gloss: 0.35, holds: 0 },
  box:      { summer: "#3d5e25", winter: "#425228", card: 0.14, lump: 0.015, gloss: 0.6, holds: 0 },
};
export const HEDGE_MODULE = 1.0;          // m: nominal module length (a run is cut into equal modules near this)
export const HEDGE_BOTTOM = -0.12;        // unit y of the body's bottom: 12 % of the height under the base line (JOINS)
export const HEDGE_CARDS = 64;
export const CARD_NEAR = 10, CARD_FAR = 18;

// ------------------------------------------------------------------------------------------------ geometry
/** the clipped section in unit space (z across -0.5..0.5, y 0..1): [z, y, nz, ny, v] (v = arc length, unit) */
function section(lod) {
  const w = 0.5, wt = 0.45, r = 0.13, B = HEDGE_BOTTOM;
  let P = [];
  if (lod === 2) {
    P = [[-w, B, -1, 0], [-wt, 0.86, -0.9, 0.4], [-wt + r, 1.0, -0.3, 1], [wt - r, 1.0, 0.3, 1], [wt, 0.86, 0.9, 0.4], [w, B, 1, 0]];
  } else {
    const nc = lod === 0 ? 3 : 2;
    P.push([-w, B, -1, 0], [-w * 0.97, 0.4, -1, 0.05]);
    for (let k = 0; k <= nc; k++) { const a = Math.PI - (k / nc) * (Math.PI / 2); P.push([-wt + r + Math.cos(a) * r, 1 - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]); }
    if (lod === 0) P.push([0, 1.005, 0, 1]);
    for (let k = 0; k <= nc; k++) { const a = Math.PI / 2 - (k / nc) * (Math.PI / 2); P.push([wt - r + Math.cos(a) * r, 1 - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]); }
    P.push([w * 0.97, 0.4, 1, 0.05], [w, B, 1, 0]);
    if (lod === 0) {          // the tall sides split once more (the lumps need vertices to live on)
      const out = [];
      for (let k = 0; k < P.length; k++) {
        out.push(P[k]);
        if (k + 1 < P.length && Math.abs(P[k + 1][1] - P[k][1]) > 0.35) { const a = P[k], b = P[k + 1]; out.push(a.map((v, i) => (v + b[i]) / 2)); }
      }
      P = out;
    }
  }
  let v = 0;
  return P.map((p, k) => { if (k) v += Math.hypot(p[0] - P[k - 1][0], p[1] - P[k - 1][1]); const l = Math.hypot(p[2], p[3]) || 1; return [p[0], p[1], p[2] / l, p[3] / l, v]; });
}

/** one body LOD: rings along x 0..1, the section swept, both ends closed (flat; the bottom closes under the ground) */
function bodyGeometry(lod) {
  const S = section(lod), rings = lod === 0 ? 4 : lod === 1 ? 2 : 1, n = S.length;
  const P = [], N = [], V = [], I = [];
  for (let r = 0; r <= rings; r++) {
    const x = r / rings;
    for (const [z, y, nz, ny, v] of S) { P.push(x, y, z); N.push(0, ny, nz); V.push(x, v); }
  }
  for (let r = 0; r < rings; r++) for (let k = 0; k < n - 1; k++) {
    const a = r * n + k, b = a + 1, c = a + n, d = c + 1;
    I.push(a, b, c, b, d, c);
  }
  for (const [x, s] of [[0, -1], [1, 1]]) {
    const c = P.length / 3;
    P.push(x, 0.45, 0); N.push(s, 0, 0); V.push(x, 0);
    for (const [z, y, , , v] of S) { P.push(x, y, z); N.push(s, 0, 0); V.push(x, v); }
    for (let k = 0; k < n - 1; k++) { if (s < 0) I.push(c, c + 2 + k, c + 1 + k); else I.push(c, c + 1 + k, c + 2 + k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("hv", new THREE.Float32BufferAttribute(V, 2));
  g.setIndex(I);
  g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.shared = true;
  return g;
}

/** the card module: HEDGE_CARDS quads; per vertex: position / normal = the card's spot on the unit body's surface and
 *  its normal (the SAME for its 4 corners: the instancing takes them to the world), corner = the quad corner
 *  (-0.5..0.5), crnd = 4 randoms. Stratified along the module; the top corners carry twice the share (leaves stick out
 *  against the sky there) */
function cardGeometry() {
  const S = section(1).filter((p) => p[1] > 0.08);
  const segs = [];
  for (let k = 0; k + 1 < S.length; k++) { const a = S[k], b = S[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); const corner = Math.abs(a[2]) > 0.2 && Math.abs(a[3]) > 0.2; segs.push({ a, b, w: L * (corner ? 2 : 1) }); }
  const tot = segs.reduce((s, q) => s + q.w, 0);
  let h = 12345;
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9 | 0; return (h >>> 0) / 4294967296; };
  const P = [], A = [], AN = [], R = [], U = [], I = [];
  for (let c = 0; c < HEDGE_CARDS; c++) {
    let t = rnd() * tot, q = segs[0];
    for (const s of segs) { if (t < s.w) { q = s; break; } t -= s.w; }
    const f = rnd(), x = (c + rnd()) / HEDGE_CARDS;
    const z = q.a[0] + (q.b[0] - q.a[0]) * f, y = q.a[1] + (q.b[1] - q.a[1]) * f;
    let nz = q.a[2] + (q.b[2] - q.a[2]) * f, ny = q.a[3] + (q.b[3] - q.a[3]) * f; const l = Math.hypot(nz, ny) || 1; nz /= l; ny /= l;
    const r4 = [rnd(), rnd(), rnd(), rnd()], base = P.length / 3;
    for (const [px, py] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      P.push(x, y, z); A.push(px, py); AN.push(0, ny, nz); R.push(...r4); U.push(px + 0.5, py + 0.5);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(AN, 3));
  g.setAttribute("corner", new THREE.Float32BufferAttribute(A, 2));
  g.setAttribute("crnd", new THREE.Float32BufferAttribute(R, 4));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeBoundingBox(); g.boundingBox.expandByScalar(0.4);
  g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  g.userData.shared = true;
  return g;
}

/** { body: [lod0, lod1, lod2], cards: [the card module] } */
export function hedgeGeometries() {
  return { body: [0, 1, 2].map(bodyGeometry), cards: [cardGeometry()] };
}

// ------------------------------------------------------------------------------------------------ materials
const C = (hex) => new THREE.Color(hex);
const uSummer = uniformArray(HEDGE_SPECIES.map((s) => C(SP[s].summer)), "color");
const uWinter = uniformArray(HEDGE_SPECIES.map((s) => C(SP[s].winter)), "color");
const uSp = uniformArray(HEDGE_SPECIES.map((s) => new THREE.Vector4(SP[s].card, SP[s].lump, SP[s].gloss, SP[s].holds)), "vec4");

/** per instance: species index, width, start along the run, module length, height */
function inst() {
  const V = attribute("iVar", "vec4");
  const sI = floor(V.x.add(0.001));
  return { V, sI, spi: sI.toInt(), W: fract(V.x.add(0.001)).mul(10), s0: V.y, L: V.z, H: V.w };
}
function leafColour(spi) {
  const S = season.u, holds = uSp.element(spi).w;
  const winterAmt = select(holds.greaterThan(0.01), S.beechHold.mul(holds).add(S.autumn.mul(0.6).mul(holds)).clamp(0, 1), float(1).sub(S.leaf).mul(0.5));
  return mix(vec3(uSummer.element(spi)), vec3(uWinter.element(spi)), winterAmt);
}
/** the kit's LOD keep (gardenKit.js lodKeep): the per-pixel band hand-over + the tile fade (iBand.w); only = a one-LOD
 *  piece (kept to its end band) */
function keep(lod, only = false) {
  const band = attribute("iBand", "vec4"), n = ditherNoise();
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = band.w;
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = only ? keepBand(e, float(1.01), n) : lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}

let mats = null;
/** { body: [lod0, lod1, lod2], card }: the fixed material set of the city's hedges (made once) */
export function hedgeMaterials() {
  if (mats) return mats;
  const body = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
    const I = inst(), hv = attribute("hv", "vec2"), pRaw = attribute("position", "vec3"), nRaw = attribute("normal", "vec3");
    // run metres: s along the run (continuous over the module joints), v round the section (scaled by the height)
    const side = select(pRaw.z.greaterThan(0), float(0), float(37.1));
    const u = vec2(I.s0.add(hv.x.mul(I.L)).add(side), hv.y.mul(I.H));
    if (lod < 2) {
      // lumps: soft bulges (~0.6 m) and clumps (~0.2 m) along the outward normal, none at the ground line or on the ends
      const nb = noiseAt(u, 1 / 2.4, true).b.sub(0.5).mul(2.4).add(noiseAt(u, 1 / 0.7, true).a.sub(0.5).mul(1.2));
      const amp = uSp.element(I.spi).y.mul(nb).mul(smoothstep(0.0, 0.25, pRaw.y.mul(I.H))).mul(select(abs(nRaw.x).greaterThan(0.5), float(0), float(1)));
      m.positionNode = positionLocal.add(normalize(normalLocal).mul(amp));
    }
    const vu = varying(u, "v_hU");
    const leafC = leafColour(I.spi);
    const n1 = noiseAt(vu, 1 / 2.2).b, n2 = noiseAt(vu, 1 / 0.55).a, n3 = noiseAt(vu.mul(1.3).add(5.1), 1 / 0.16).a;
    const clumps = smoothstep(0.25, 0.75, n1);
    const leaves = n2.mul(0.5).add(n3.mul(0.5));
    const crev = smoothstep(0.15, 0.55, leaves);
    const hN = noiseAt(vu.add(vec2(3.7, 1.3)), 1 / 1.6).b.mul(0.62).add(noiseAt(vu.add(vec2(0.9, 5.2)), 1 / 0.75).g.mul(0.38));
    const hE = max(fwidth(hN).mul(1.5), float(0.06));
    const hRaw = smoothstep(float(0.27).add(hE), float(0.27).sub(hE), hN);
    const hCore = smoothstep(0.24, 0.16, hN);
    const hFar = smoothstep(0.015, 0.07, length(fwidth(vu)));
    const holes = lod === 2 ? float(0.07) : mix(hRaw.mul(0.55).add(hCore.mul(0.45)), float(0.07), hFar);
    const lit = leafC.mul(mix(0.62, 1.12, lod === 2 ? float(0.6) : crev)).mul(clumps.mul(0.3).add(0.82));
    // contact shade at the foot (a hedge's base sits in its own shadow), in metres above the base line
    const foot = smoothstep(0.0, 0.35, varying(pRaw.y.mul(I.H), "v_hY"));
    const snowTop = smoothstep(0.55, 0.9, normalWorld.y).mul(season.uSnow);
    m.colorNode = mix(mix(lit, leafC.mul(0.12), holes.mul(0.92)).mul(mix(0.55, 1, foot)), vec3(0.88, 0.9, 0.94), snowTop);
    if (lod < 2) m.normalNode = bumpNormal(leaves.mul(0.05).add(n1.mul(0.04)).sub(smoothstep(0.34, 0.16, hN).mul(0.05)));
    m.roughnessNode = mix(uSp.element(I.spi).z, float(0.95), float(1).sub(crev).mul(0.5));
    m.maskNode = keep(lod);
    m.maskShadowNode = m.maskNode;
    m.name = `gardens-hedge-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;
    return m;
  });
  // CARDS: positionLocal = the card's spot on the hedge (world), normalLocal its normal (world)
  const tex = [leafCard("privet"), leafCard("beech"), leafCard("laurel")];
  const card = new THREE.MeshStandardNodeMaterial({ metalness: 0, side: THREE.DoubleSide });
  card.alphaToCoverage = true;
  const I = inst(), sp = uSp.element(I.spi), cr = attribute("crnd", "vec4"), corner = attribute("corner", "vec2");
  const anchor = positionLocal, cn = normalize(normalLocal);
  const grow = float(1).sub(smoothstep(float(CARD_NEAR), float(CARD_FAR), length(anchor.sub(cameraPosition))));
  // card basis: tilted out of the surface by 25-65 degrees around a random axis in the surface plane
  const up = select(abs(cn.y).greaterThan(0.9), vec3(1, 0, 0), vec3(0, 1, 0));
  const t1 = normalize(cross(up, cn)), t2 = cross(cn, t1);
  const ang = cr.x.mul(6.2832), ca = cos(ang), sa = sin(ang);
  const ax = t1.mul(ca).add(t2.mul(sa)), ay = t2.mul(ca).sub(t1.mul(sa));
  const tilt = cr.y.mul(0.7).add(0.45);
  const cardN = normalize(cn.mul(cos(tilt)).add(ay.mul(sin(tilt))));
  const cardY = normalize(cross(cardN, ax));
  const size = sp.x.mul(cr.z.mul(0.5).add(0.75)).mul(grow);
  const w = windAt(anchor.xz);
  const flick = sin(wind.uTime.mul(5.0).add(cr.w.mul(40))).mul(w.z.mul(0.02).add(0.004));
  card.positionNode = anchor.add(cn.mul(size.mul(0.42))).add(ax.mul(corner.x.mul(size))).add(cardY.mul(corner.y.add(0.35).mul(size))).add(vec3(flick, 0, flick));
  const uvc = uv();
  const a0 = texture(tex[0], uvc), a1 = texture(tex[1], uvc), a2 = texture(tex[2], uvc);
  const a = select(I.sI.equal(3), a2, select(I.sI.equal(1).or(I.sI.equal(2)), a1, a0));
  card.opacityNode = saturate(a.a.sub(0.5).div(max(fwidth(a.a), 1e-4)).add(0.5));
  const vShade = varying(cr.w.mul(0.3).add(0.8), "v_hS");
  card.colorNode = mix(leafColour(I.spi).mul(a.r).mul(vShade).mul(1.08), vec3(0.88, 0.9, 0.94), season.uSnow.mul(smoothstep(0.3, 0.9, cn.y)));
  // lighting normal: mostly the hedge's surface (a coherent mass), a little of the card's own
  const nW = normalize(mix(cn, cardN, 0.35));
  card.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_hN"), 0)).xyz);
  card.maskNode = keep(0, true);
  card.name = "gardens-hedge-cards";
  card.userData.shared = true; card.userData.noFade = true;
  mats = { body, card };
  return mats;
}

/** a tile's hedge runs ({ points, species, height, width }) -> module instances: { body: [mat16 + iVar4...] }.
 *  groundAt = the drawn ground; each module end stands on the lower of the hedge's two sides there (no floating foot) */
export function hedgeInstances(runs, groundAt, push, out) {
  let n = 0;
  for (const r of runs) {
    const sp = Math.max(0, HEDGE_SPECIES.indexOf(r.species));
    const pts = r.points;
    if (pts.length < 2) continue;
    // arc length, cut into equal modules near HEDGE_MODULE
    const S = [0]; for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const L = S[S.length - 1]; if (L < 0.3) continue;
    const m = Math.max(1, Math.round(L / HEDGE_MODULE)), step = L / m;
    const at = (s) => { let k = 1; while (k < S.length - 1 && S[k] < s) k++; const f = (s - S[k - 1]) / ((S[k] - S[k - 1]) || 1); return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f]; };
    const W = Math.min(0.99, r.width || 0.7), H = r.height || 1.2;
    const s0 = ((Math.round(pts[0][0] * 7 + pts[0][1] * 13) % 997) + 997) % 997;         // a run's own noise offset
    const P = []; for (let i = 0; i <= m; i++) P.push(at(i * step));
    const ground = (p, q) => {
      const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * W / 2, nz = dx / l * W / 2;
      return (x, z) => Math.min(groundAt(x + nx, z + nz), groundAt(x - nx, z - nz), groundAt(x, z));
    };
    for (let i = 0; i < m; i++) {
      const a = P[i], b = P[i + 1], G = ground(a, b);
      // modules overlap 3 cm at each joint (no slit at a bend)
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, e = 0.03;
      const ax = a[0] - ux * e, az = a[1] - uz * e, bx = b[0] + ux * e, bz = b[1] + uz * e;
      let ya = G(a[0], a[1]), yb = G(b[0], b[1]);
      // JOINS: the foot (HEDGE_BOTTOM x the height under the line) must reach the ground all along the module (a dip
      // between its ends): the module goes down by the worst gap and grows by as much (its top stays)
      let gap = 0;
      for (let k = 1; k < 8; k++) { const f = k / 8; gap = Math.max(gap, ya + (yb - ya) * f + HEDGE_BOTTOM * H - G(a[0] + dx * f, a[1] + dz * f)); }
      const drop = gap > 0 ? gap + 0.01 : 0, Hm = H + drop;
      ya -= drop; yb -= drop;
      push(out, ax, ya, az, bx - ax, yb - ya, bz - az, Hm, W, [sp + W / 10, s0 + i * step - e, l + 2 * e, Hm]);
      n++;
    }
  }
  return n;
}
