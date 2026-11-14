// FRONT-GARDEN KIT (docs/assets/GARDENS.md), shared by the city (viewer/gardens/cityGardens.js) and the Gardens Lab:
//   pieces   wall, cap, pillar, pcap (procedural, viewer/gardens/gardenGeom.js) and the ironwork from Blender
//            (tools/blender/gardenKit.py -> models/gardens/gardens.glb): rail_spear / rail_flat / rail_rings (1 m modules),
//            gate_<type> (pedestrian leaf), cargate_<type> (one leaf of the driveway gate); each in THREE LODs (scripted,
//            no decimation). Local frame: x along the run, y up, +z = the street side.
//   draws    per piece and LOD ONE draw (every slot in one material: a per-vertex slot + AO into a palette); THREE shared
//            materials (one per LOD) for the whole kit
//   variants per instance iVar = (brick tone 0-4 [4 = white render], coping 0 blue stone / 1 concrete, paint 0-2 + 4 x gilded
//            finials, a random 0..1): the brick, stone, paint and tip colours from small palettes
//   brick    LOD0 / 1: a stretcher bond in WORLD space (u along the face, from its normal; v = height: stretched and
//            sheared pieces keep 22 x 6.5 cm bricks with level courses), mortar joints anti-aliased and faded to the
//            mean colour as they get under a pixel; per-brick tone. LOD2: the mean colour
//   LOD      per instance band (iBand: switch 0-1, switch 1-2, end, the tile's fade) and the per-pixel dither of
//            viewer/lodFade.js in colour and shadow (no pop, no shadow snap). LOD2 casts no shadow (its shadow dithers out
//            with LOD1 across the 1-2 hand-over): low walls and railings have no far shadow
//   night    nothing glows, no light (fixed light count)
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, vec2, vec3, float, int, mix, smoothstep, length, positionWorld, normalWorld, select, fract, floor, abs, dot,
  normalize, fwidth, sin, max, min, saturate,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { boxyPieces, SLOT, CAP_T, PILLAR_W, CAP_W } from "./gardenGeom.js";
import { hedgeGeometries, hedgeMaterials, hedgeInstances } from "./gardenHedge.js";

export const RAILS = ["spear", "flat", "rings"];
export const PIECES = ["wall", "cap", "pillar", "pcap", ...RAILS.map((r) => `rail_${r}`), ...RAILS.map((r) => `gate_${r}`), ...RAILS.map((r) => `cargate_${r}`), "hedge", "hedgecard"];
const IRON = PIECES.slice(4, 4 + 3 * RAILS.length);           // the Blender pieces
/** LOD bands (m): [switch 0 -> 1, switch 1 -> 2, end]: the walls go by ~220 m (the façade's own painted look takes
 *  over), the ironwork by ~150 m */
export const BANDS = {
  wall: [35, 90, 220], cap: [35, 90, 220], pillar: [35, 90, 220], pcap: [30, 80, 200],
  rail: [22, 60, 150], gate: [22, 60, 150], cargate: [25, 70, 160],
  // round 2: the hedges (viewer/gardens/gardenHedge.js): big soft solids, seen far (the end dithers out over 255-300 m);
  // the leaf cards near only (they shrink into the body by 18 m)
  hedge: [30, 90, 300], hedgecard: [22, 22, 22],
};
export const bandOf = (p) => BANDS[p] || BANDS[p.split("_")[0]];
const GATE_W = { gate: 1.0, cargate: 1.6 }, GATE_H = { gate: 1.2, cargate: 1.3 };
const BLENDER_SLOT = { iron_paint: SLOT.iron_paint, iron_tip: SLOT.iron_tip, steel_dark: SLOT.steel_dark };

// palettes (linear rgb, roughness)
export const BRICK = [
  [0.19, 0.068, 0.045, 0.86],    // red-brown
  [0.085, 0.032, 0.026, 0.82],   // dark purple-brown ("klinker")
  [0.28, 0.095, 0.05, 0.86],     // orange-red
  [0.46, 0.33, 0.17, 0.88],      // sand / yellow
  [0.66, 0.64, 0.59, 0.9],       // white render
];
const STONE = [[0.055, 0.06, 0.066, 0.58], [0.4, 0.39, 0.36, 0.82]];     // blue stone (petit granit), concrete
const PAINT = [[0.011, 0.011, 0.012, 0.5], [0.032, 0.034, 0.037, 0.45], [0.006, 0.028, 0.014, 0.5]];
const MORTAR = [0.24, 0.23, 0.21];

let promise = null;
/** { pieces: { <name>: { lods: [geo x3], tris, band } }, mats, loadMs } */
export function loadGardenKit(base = new URL("../../", import.meta.url)) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const gltf = await new GLTFLoader().loadAsync(new URL("models/gardens/gardens.glb", base).href);
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let name = null;
      for (let q = o; q && !name; q = q.parent) if (/_lod[012]$/.test(q.name)) name = q.name;
      if (!name) return;
      (raw[name] ??= []).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    const boxy = boxyPieces();
    const add = (name, lods) => {
      for (const g of lods) { g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.shared = true; }
      pieces[name] = { name, lods, tris: lods.map((g) => (g.index ? g.index.count : g.attributes.position.count) / 3), band: bandOf(name) };
    };
    add("wall", boxy.wall); add("cap", boxy.cap_slab); add("pillar", boxy.pillar); add("pcap", boxy.pcap);
    const hg = hedgeGeometries(), hm = hedgeMaterials();
    add("hedge", hg.body); add("hedgecard", hg.cards);
    pieces.hedge.mats = hm.body; pieces.hedgecard.mats = [hm.card];
    for (const p of IRON) {
      const lods = [0, 1, 2].map((l) => { const r = raw[`${p}_lod${l}`]; if (!r) throw new Error(`gardens kit: ${p}_lod${l} missing`); return mergePrims(r); });
      add(p, lods);
    }
    return { pieces, mats: materials(), loadMs: performance.now() - t0 };
  })());
}

/** a piece's primitives (one per Blender slot) merged: position, normal, slot (+ 0.99 x the baked vertex AO) */
function mergePrims(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = BLENDER_SLOT[p.slot];
    if (s === undefined) throw new Error(`gardens kit: unknown slot ${p.slot}`);
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    const C = g.attributes.color;
    for (let k = 0; k < n; k++) S[v + k] = s + 0.99 * Math.min(1, C ? C.getX(k) : 1) * 0.999;
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v;
    v += n; i += gi.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
  g.setIndex(new THREE.BufferAttribute(nv > 65535 ? I : Uint16Array.from(I), 1));
  return g;
}

// ------------------------------------------------------------------------------------------------ materials
const uBrick = uniformArray(BRICK.map((c) => new THREE.Vector4(...c)), "vec4");
const uStone = uniformArray(STONE.map((c) => new THREE.Vector4(...c)), "vec4");
const uPaint = uniformArray(PAINT.map((c) => new THREE.Vector4(...c)), "vec4");

function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = band.w;
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}

const hash2 = (a, b) => fract(sin(dot(vec2(a, b), vec2(12.9898, 78.233))).mul(43758.5453));

/** the brick face: stretcher bond in world space; returns [colour multiplier (vec3), mortar 0..1] */
function brickPattern(tone) {
  const n = normalize(normalWorld);
  const wallFace = abs(n.y).lessThan(0.7);
  const t = normalize(vec2(n.z.negate(), n.x).add(vec2(1e-5, 0)));
  const u = select(wallFace, dot(positionWorld.xz, t), positionWorld.x);
  const v = select(wallFace, positionWorld.y, positionWorld.z);
  const CH = 0.0655, BW = 0.22;
  const cv = v.div(CH), course = floor(cv);
  const bu = u.div(BW).add(fract(course.mul(0.5)).mul(1.0)), bi = floor(bu);
  const fu = fract(bu), fv = fract(cv);
  const wu = max(fwidth(bu), 1e-4), wv = max(fwidth(cv), 1e-4);
  const ju = 0.011 / BW / 2, jv = 0.011 / CH / 2;          // half joints (11 mm mortar)
  const inU = smoothstep(float(ju).sub(wu), float(ju).add(wu), fu).mul(smoothstep(float(ju).sub(wu), float(ju).add(wu), float(1).sub(fu)));
  const inV = smoothstep(float(jv).sub(wv), float(jv).add(wv), fv).mul(smoothstep(float(jv).sub(wv), float(jv).add(wv), float(1).sub(fv)));
  const brick = inU.mul(inV);
  // under a pixel the pattern averages: fade the contrast out as the courses shrink below ~3 px
  const far = smoothstep(0.12, 0.35, wv);
  const h = hash2(bi, course), h2 = hash2(bi.add(17.1), course.sub(3.3));
  const tv = mix(float(0.8), float(1.16), h).mul(mix(float(0.95), float(1.05), h2));
  const mortarShare = float(1).sub(brick);
  const render = tone.greaterThan(3.5);
  return { tone: select(render, float(1), mix(tv, float(1), far)), mortar: select(render, float(0), mortarShare.mul(float(1).sub(far))), far };
}

function materials() {
  const opaque = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial();
    const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor().toInt();
    const V = attribute("iVar", "vec4");
    const ao = fract(sl.add(0.0005)).div(0.99).min(1);
    const tone = V.x, toneI = tone.add(0.5).floor().toInt();
    const B = uBrick.element(toneI), S = uStone.element(V.y.add(0.5).floor().toInt());
    const pz = V.z.add(0.5).floor(), gilded = pz.greaterThan(3.5), paintI = select(gilded, pz.sub(4), pz).toInt();
    const Pn = uPaint.element(paintI);
    let brickCol = B.xyz, brickRough = B.w;
    if (lod < 2) {
      const bp = brickPattern(tone);
      // (the dark klinker bricks have a darker mortar; the white render has none)
      const mortarCol = select(tone.greaterThan(3.5), B.xyz, select(toneI.equal(int(1)), vec3(...MORTAR).mul(0.62), vec3(...MORTAR)));
      brickCol = mix(B.xyz.mul(bp.tone), mortarCol, bp.mortar.mul(0.9));
      brickRough = mix(B.w, float(0.95), bp.mortar);
    } else {
      brickCol = mix(B.xyz, vec3(...MORTAR), select(tone.greaterThan(3.5), float(0), float(0.12)));
    }
    const gold = vec4c(0.55, 0.38, 0.12);
    const isB = idx.equal(int(SLOT.brick)), isS = idx.equal(int(SLOT.stone)), isP = idx.equal(int(SLOT.iron_paint)), isT = idx.equal(int(SLOT.iron_tip));
    const tipGold = isT.and(gilded);
    const col = select(isB, brickCol, select(isS, S.xyz, select(isP.or(isT.and(gilded.not())), Pn.xyz, select(tipGold, gold, vec3(0.05, 0.05, 0.052)))));
    m.colorNode = col.mul(mix(float(1), ao, 0.7));
    m.aoNode = ao;
    m.roughnessNode = select(isB, brickRough, select(isS, S.w, select(tipGold, float(0.35), select(isP.or(isT), Pn.w, float(0.42)))));
    m.metalnessNode = select(tipGold, float(1), select(isP.or(isT), float(0.15), select(isB.or(isS), float(0), float(0.6))));
    m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
    m.maskShadowNode = m.maskNode;
    m.name = `gardens-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;          // (the tile fade rides in iBand.w)
    return m;
  });
  const standin = new THREE.MeshStandardNodeMaterial({ color: 0x555555 });
  standin.name = "gardens-collision-standin";
  standin.userData.shared = true; standin.userData.noFade = true;
  return { opaque, standin };
}
function vec4c(r, g, b) { return vec3(r, g, b); }

// ------------------------------------------------------------------------------------------------ data -> instances
const STRIDE = 20;                     // 16 (matrix, column major) + 4 (iVar)
/** a style's iVar */
function styleVar(st, rnd) {
  return [st.brick ?? 0, st.cap === 1 ? 1 : 0, (st.paint ?? 0) + (st.gilded ? 4 : 0), rnd];
}
const rnd01 = (x, z) => { let h = Math.imul(Math.round(x * 100) | 0, 73856093) ^ Math.imul(Math.round(z * 100) | 0, 19349663); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/**
 * A tile's data/gardens doc -> { inst: { <piece>: Float32Array stride 20 }, cells: { <piece>: [{ x, z, r, a, b }] },
 * stand: { wall: [mat16...], pillar: [...], gate: [...] } (collision stand-ins: unit boxes), counts }.
 * Segments: [x0, y0, z0, x1, y1, z1, style, wallH]; pillars: [x, y, z, yaw, h, style]; gates: [x, y, z, yaw, w, kind, open, style].
 */
export function gardenInstances(doc, groundAt = null, { hedgeFronts = true, hedges = true } = {}) {
  const L = Object.fromEntries(PIECES.map((p) => [p, []]));
  const SW = [], SP = [], SG = [];
  const styles = doc.styles || [];
  const segs = groundAt ? settle(doc, groundAt) : (doc.segs || []);
  const pillars = groundAt ? settlePillars(doc, groundAt) : (doc.pillars || []);
  const push = (arr, m, v) => { for (let k = 0; k < 16; k++) arr.push(m[k]); arr.push(v[0], v[1], v[2], v[3]); };
  // mitres: consecutive segments of one run that share an end (to 2 cm) and turn < 70 deg overlap by w/2 tan(a/2)
  const ext = new Float32Array(segs.length * 2);
  for (let i = 0; i + 1 < segs.length; i++) {
    const a = segs[i], b = segs[i + 1];
    if (a[6] !== b[6] || Math.hypot(a[3] - b[0], a[5] - b[2]) > 0.02) continue;
    const ax = a[3] - a[0], az = a[5] - a[2], bx = b[3] - b[0], bz = b[5] - b[2];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 1e-3 || lb < 1e-3) continue;
    const c = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb))), ang = Math.acos(c);
    if (ang < 0.005 || ang > 1.22) continue;
    const e = (CAP_W / 2) * Math.tan(ang / 2);
    ext[i * 2 + 1] = e; ext[(i + 1) * 2] = e;
  }
  const m = new Float32Array(16);
  const shear = (x0, y0, z0, dx, dy, dz, sy) => {
    const lh = Math.hypot(dx, dz) || 1e-6;
    m.set([dx, dy, dz, 0, 0, sy, 0, 0, -dz / lh, 0, dx / lh, 0, x0, y0, z0, 1]);
    return m;
  };
  const rot = (x, y, z, yaw, sx, sy, sz) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    m.set([c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1]);
    return m;
  };
  segs.forEach((g, i) => {
    const st = styles[g[6]] || {}, h = g[7];
    const [x0, y0, z0, x1, y1, z1] = g;
    let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const lh = Math.hypot(dx, dz);
    if (lh < 0.05) return;
    const v = styleVar(st, rnd01(x0, z0));
    if (h > 0.01) {
      const e0 = ext[i * 2], e1 = ext[i * 2 + 1], ux = dx / lh, uy = dy / lh, uz = dz / lh;
      const sx = x0 - ux * e0, sy = y0 - uy * e0, sz = z0 - uz * e0, k = (lh + e0 + e1) / lh;
      push(L.wall, shear(sx, sy, sz, dx * k, dy * k, dz * k, h), v);
      push(L.cap, shear(sx, sy + h, sz, dx * k, dy * k, dz * k, 1), v);
    }
    const railH = st.railH || 0;
    const top = h > 0.01 ? h + CAP_T : 0;
    if (st.rail >= 0 && railH > 0) {
      const n = Math.max(1, Math.round(lh / 1.0)), piece = `rail_${RAILS[st.rail]}`;
      for (let k = 0; k < n; k++) push(L[piece], shear(x0 + dx * k / n, y0 + dy * k / n + top, z0 + dz * k / n, dx / n, dy / n, dz / n, railH), v);
    }
    // the stand-in: the whole height (wall + coping + railing) as one sheared box, 30 cm thick
    const H = top + railH;
    if (H > 0.05) for (let k = 0; k < 16; k++) SW.push(shear(x0, y0, z0, dx, dy, dz, H)[k]);
  });
  // (a hedge front without its hedge would be lone gate pillars: none of it then)
  for (const p of pillars) {
    const [x, y, z, yaw, h, s] = p, st = styles[s] || {}, v = styleVar(st, rnd01(x, z));
    if (!hedgeFronts && st.kind === "hedge") continue;
    push(L.pillar, rot(x, y, z, yaw, 1, h, 1), v);
    push(L.pcap, rot(x, y + h, z, yaw, 1, 1, 1), v);
    for (let k = 0; k < 16; k++) SP.push(rot(x, y, z, yaw, PILLAR_W, h + 0.12, PILLAR_W)[k]);
  }
  for (const gt of doc.gates || []) {
    const [x, y, z, yaw, w, kind, open, s] = gt, st = styles[s] || {};
    if (!hedgeFronts && st.kind === "hedge") continue;
    const type = RAILS[st.rail >= 0 ? st.rail : 0], v = styleVar(st, rnd01(x, z));
    const H = st.kind === "rail" ? Math.max(1.0, (st.wallH || 0) + CAP_T + (st.railH || 0)) : st.kind === "wall" ? Math.max(1.0, Math.min(1.8, (st.wallH || 0) + CAP_T + 0.1)) : 1.1;
    if (kind === 0) {
      push(L[`gate_${type}`], rot(x, y, z, yaw + open, w / GATE_W.gate, H / GATE_H.gate, 1), v);   // open into the garden: walkable
    } else {
      const lw = w / 2, c = Math.cos(yaw), sn = Math.sin(yaw);
      push(L[`cargate_${type}`], rot(x, y, z, yaw, lw / GATE_W.cargate, H / GATE_H.cargate, 1), v);
      push(L[`cargate_${type}`], rot(x + c * w, y, z - sn * w, yaw + Math.PI, lw / GATE_W.cargate, H / GATE_H.cargate, 1), v);
      const mm = rot(x, y, z, yaw, 1, 1, 1);
      for (let k = 0; k < 16; k++) SG.push(shear(x, y, z, c * w, 0, -sn * w, H)[k]);
      void mm;
    }
  }
  // the hedges: ~1 m modules on the drawn ground (gardenHedge.js); the leaf cards ride on the same instances
  if (hedges && groundAt && doc.hedges?.length) {
    const shearW = (out, x0, y0, z0, dx, dy, dz, sy, w, v) => {
      const lh = Math.hypot(dx, dz) || 1e-6;
      m.set([dx, dy, dz, 0, 0, sy, 0, 0, -dz / lh * w, 0, dx / lh * w, 0, x0, y0, z0, 1]);
      push(out, m, v);
    };
    hedgeInstances(doc.hedges, groundAt, shearW, L.hedge);
    L.hedgecard = L.hedge;
    // collision stand-ins: each module as a wall box (the unit stand-in is 30 cm thick: scaled to the hedge's width)
    for (let o = 0; o < L.hedge.length; o += STRIDE) {
      const q = L.hedge.slice(o, o + 16);
      q[8] /= 0.3; q[10] /= 0.3;                               // (the module's z column has the hedge's width as length)
      for (let k = 0; k < 16; k++) SW.push(q[k]);
    }
  }
  const inst = {}, cells = {};
  for (const k of PIECES) {
    if (!L[k].length) continue;
    const a = new Float32Array(L[k]);
    const sorted = sortCells(a);
    inst[k] = sorted.a; cells[k] = sorted.cells;
  }
  return { inst, cells, settled: { styles, segs, pillars }, stand: { wall: SW, pillar: SP, gate: SG }, counts: Object.fromEntries(Object.entries(inst).map(([k, a]) => [k, a.length / STRIDE])) };
}

/**
 * JOINS on the DRAWN ground (the placement used the DTM + the measured kerb lift; the city carves its terrain under the
 * roads): every segment end goes down until the footing (0.6 x the wall height, or the bars' 3 cm) reaches the lower of
 * the two sides everywhere along the segment (sampled every 0.5 m); a vertex two segments share takes the larger drop
 * (the base line stays continuous); the wall grows by the drop (its top stays). Returns new segment arrays.
 */
function settle(doc, G) {
  const segs = doc.segs || [], styles = doc.styles || [];
  const key = (x, z) => `${Math.round(x * 50)},${Math.round(z * 50)}`, drop = new Map();
  const need = segs.map((g) => {
    const st = styles[g[6]] || {}, h = g[7], foot = h > 0.01 ? 0.6 * h : 0.03 * (st.railH || 1);
    const dx = g[3] - g[0], dz = g[5] - g[2], Lh = Math.hypot(dx, dz) || 1e-6, nx = -dz / Lh, nz = dx / Lh;
    const n = Math.max(2, Math.ceil(Lh / 0.5) + 1);
    let d0 = 0, d1 = 0, grow = 0;
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1), x = g[0] + dx * f, z = g[2] + dz * f, y = g[1] + (g[4] - g[1]) * f;
      const ga = G(x + nx * 0.18, z + nz * 0.18), gb = G(x - nx * 0.18, z - nz * 0.18), lo = Math.min(ga, gb);
      if (h > 0.01) grow = Math.max(grow, Math.max(ga, gb) + 0.05 - (y + h + CAP_T));      // the garden over the coping: retain it
      const over = y - foot - lo + 0.02;
      if (over > 0) { d0 = Math.max(d0, over * (f < 0.5 ? 1 : (1 - f) * 2)); d1 = Math.max(d1, over * (f > 0.5 ? 1 : f * 2)); if (f === 0.5) { d0 = Math.max(d0, over); d1 = Math.max(d1, over); } }
    }
    for (const [x, z, d] of [[g[0], g[2], d0], [g[3], g[5], d1]]) { const k = key(x, z); drop.set(k, Math.max(drop.get(k) || 0, d)); }
    return grow;
  });
  return segs.map((g, i) => {
    const a = drop.get(key(g[0], g[2])) || 0, b = drop.get(key(g[3], g[5])) || 0;
    const up = Math.max(0, need[i]);
    if (!a && !b && !up) return g;
    const m = Math.max(a, b), h = g[7] + up;
    // a railing straight on the ground has no wall to grow: its footing is the bars' 3 cm, lowered with the base
    return [g[0], g[1] - a, g[2], g[3], g[4] - b, g[5], g[6], h > 0.01 ? h + m : h];
  });
}
function settlePillars(doc, G) {
  return (doc.pillars || []).map((p) => {
    const [x, y, z, yaw, h, s] = p;
    let lo = Infinity; for (const [ox, oz] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]) lo = Math.min(lo, G(x + ox, z + oz));
    const over = y - 0.4 * h - lo + 0.02;
    return over > 0 ? [x, y - over, z, yaw, h + over, s] : p;
  });
}

/** instances sorted into 50 m cells (a pool skips a whole cell beyond its range): { a, cells: [{ x, z, r, a, b }] } */
function sortCells(a) {
  const n = a.length / STRIDE, C = 50, keyOf = new Map();
  const cx = (i) => a[i * STRIDE + 12] + a[i * STRIDE] * 0.5, cz = (i) => a[i * STRIDE + 14] + a[i * STRIDE + 2] * 0.5;
  const idx = Array.from({ length: n }, (_, i) => i);
  const key = (i) => `${Math.floor(cx(i) / C)},${Math.floor(cz(i) / C)}`;
  for (const i of idx) keyOf.set(i, key(i));
  idx.sort((p, q) => (keyOf.get(p) < keyOf.get(q) ? -1 : keyOf.get(p) > keyOf.get(q) ? 1 : 0));
  const out = new Float32Array(a.length), cells = [];
  let cur = null;
  idx.forEach((i, j) => {
    out.set(a.subarray(i * STRIDE, (i + 1) * STRIDE), j * STRIDE);
    const k = keyOf.get(i);
    if (!cur || cur.k !== k) { const [ix, iz] = k.split(",").map(Number); cur = { k, x: (ix + 0.5) * C, z: (iz + 0.5) * C, r: C * 0.71 + 6, a: j, b: j }; cells.push(cur); }
    cur.b = j + 1;
  });
  return { a: out, cells };
}

// ------------------------------------------------------------------------------------------------ the pools
/** ONE pool per piece for the whole city: LOD0..2 instanced meshes re-filled from the loaded tiles' instances near the
 *  camera. Static buffers (needsUpdate + update ranges over the live count, never DynamicDrawUsage); a mesh with nothing
 *  to draw is not visible. */
export class GardenPool {
  constructor(piece, mats, group) {
    this.piece = piece; this.cap = 0; this.meshes = [];
    this.lod = piece.lods.map((geo, k) => {
      const g = new THREE.BufferGeometry();
      for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, (piece.mats || mats.opaque)[k], 1);
      // shadows: the walls / pillars from LOD0 + 1, the ironwork from LOD0 only (its shadow dithers out across the 0-1
      // hand-over: no far shadows for thin bars)
      // (the hedges' bodies from LOD0 + 1 like the walls; their leaf cards never: the body carries the shadow)
      m.castShadow = piece.name === "hedgecard" ? false : /^(rail|gate|cargate)_/.test(piece.name) ? k === 0 : k < 2;
      m.count = 0; m.visible = false; m.receiveShadow = true; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `gardens-${piece.name}-lod${k}`;
      group.add(m); this.meshes.push(m);
      return m;
    });
    this.r = Math.max(piece.lods[0].boundingSphere.radius, 1.0);
    this.grow(64);
  }
  grow(n) {
    if (n <= this.cap) return;
    this.cap = Math.max(n, this.cap * 2);
    for (const m of this.meshes) {
      m.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 16), 16);
      m.geometry.setAttribute("iBand", new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 4), 4));
      m.geometry.setAttribute("iVar", new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 4), 4));
    }
  }
  /** tiles: [{ inst: { <piece>: Float32Array }, cells, fade }]; c = the camera position */
  gather(tiles, c, margin = 4) {
    const [s1, s2, end] = this.piece.band, kind = this.piece.name;
    const lims = [[0, s1 * 1.1 + margin], [s1 * 0.9 - margin, s2 * 1.1 + margin], [s2 * 0.9 - margin, end + margin]];
    // the candidates (cells in range) first: their count bounds every LOD's count
    let total = 0;
    const live = [];
    for (const t of tiles) {
      const a = t.inst[kind]; if (!a) continue;
      for (const cl of t.cells[kind]) {
        if (Math.hypot(cl.x - c.x, cl.z - c.z) - cl.r > end + margin) continue;
        live.push(t, cl); total += cl.b - cl.a;
      }
    }
    this.grow(total);
    this.lod.forEach((m, li) => {
      const d0 = Math.max(0, lims[li][0]), d1 = lims[li][1];
      const M = m.instanceMatrix.array, B = m.geometry.attributes.iBand.array, Vv = m.geometry.attributes.iVar.array;
      let n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity, ext = 0;
      for (let q = 0; q < live.length; q += 2) {
        const t = live[q], cl = live[q + 1], a = t.inst[kind];
        const dc = Math.hypot(cl.x - c.x, cl.z - c.z);
        if (dc - cl.r > d1 || dc + cl.r < d0) continue;
        for (let i = cl.a; i < cl.b; i++) {
          const o = i * STRIDE;
          const hx = a[o] * 0.5, hy = a[o + 1] * 0.5, hz = a[o + 2] * 0.5;
          const x = a[o + 12] + hx, y = a[o + 13] + hy, z = a[o + 14] + hz;
          const half = Math.hypot(hx, hz);
          const d = Math.hypot(x - c.x, y - c.y, z - c.z);
          if (d + half < d0 || d - half > d1) continue;
          M.set(a.subarray(o, o + 16), n * 16);
          B[n * 4] = s1; B[n * 4 + 1] = s2; B[n * 4 + 2] = end; B[n * 4 + 3] = t.fade;
          Vv[n * 4] = a[o + 16]; Vv[n * 4 + 1] = a[o + 17]; Vv[n * 4 + 2] = a[o + 18]; Vv[n * 4 + 3] = a[o + 19];
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
          ext = Math.max(ext, half);
          n++;
        }
      }
      m.count = n; m.visible = n > 0;
      if (!n) return;
      m.boundingSphere.center.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.boundingSphere.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + this.r + ext + 2;
      for (const [att, w] of [[m.instanceMatrix, 16], [m.geometry.attributes.iBand, 4], [m.geometry.attributes.iVar, 4]]) {
        att.clearUpdateRanges(); att.addUpdateRange(0, n * w); att.needsUpdate = true;
      }
    });
  }
  get drawn() { return this.meshes.filter((m) => m.visible).length; }
  get instances() { return this.meshes.map((m) => (m.visible ? m.count : 0)); }
}

/** unit stand-in boxes for the collision code: wall (x 0..1, y 0..1, z +-0.15), pillar (x / z +-0.5, y 0..1), gate (x 0..1,
 *  y 0..1, z +-0.04) */
export function standinGeometries() {
  const box = (x0, x1, y0, y1, z0, z1) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    g.computeBoundingBox(); g.computeBoundingSphere(); g.userData.shared = true;
    return g;
  };
  return { wall: box(0, 1, 0, 1, -0.15, 0.15), pillar: box(-0.5, 0.5, 0, 1, -0.5, 0.5), gate: box(0, 1, 0, 1, -0.04, 0.04) };
}
