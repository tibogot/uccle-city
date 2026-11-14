// THE SHOPFRONT KIT (docs/assets/SHOPS.md): tools/blender/shopfronts.py -> models/shops/shopkit.glb + shopkit_ao.png,
// drawn for every real shop of the street-life layer (viewer/streetlife/: the fronts' placement is viewer/shops/
// shopLayout.js, run in the street-life worker), and the shop INTERIORS (textures/shops/interiors.ktx2, Blender-rendered
// rooms + furniture cards, tools/blender/shopInteriors.py) behind every shop window (viewer/shops/shopWindow.js).
//
//   pieces   front_classic, front_modern (the surround: pilasters / jambs, head, fascia, consoles, cornice; the modern
//            plinth), riser_classic / riser_modern (a window bay's stall riser, sill, bottom bead / rail: never under a door), door_classic, door_modern, mullion, awning, blade (the projecting-sign bracket),
//            parasol_sq, table_sq, planter (terraces)
//   STRETCH  a 3D 9-slice in the vertex stage (sliceShift): every vertex moves by a translation only, so one mesh fits
//            every shop's width and fascia height with its bevels, mouldings and normals intact:
//              x' = x + sign(x) * dW / 2   (|x| > 0.02)       y' = y + dH   (y > YS)
//            per instance iSize = (dW, dH, YS, yaw), iBand.w = the canvas stripe width; the Blender pieces keep no vertex near x = 0 on a stretching
//            span (checked at load: stretchCheck)
//   LODs     0 = the Blender mesh with its AO lightmap; 1 = welded by position + slot, meshoptimizer-simplified, AO per
//            vertex (stopKit.js's recipe, copied: weldedSimplify). Per-instance band iBand = (switch, end, tile slot, stripes),
//            the dithered cross-fade of viewer/lodFade.js (same noise in the shadow pass: no pop, no shadow snap)
//   colour   named slots (SLOTS, by the Blender material NAME); "paint", "alu" and "canvas" take the instance's tint
//            (iTint rgb + amount); the canvas can be striped (iBand.w = stripe width, m); the hedge gets a leaf mottle
//   draws    ONE pool per piece and LOD for the whole city (viewer/instanceStream.js StreamPool via the street-life
//            Streamer): what is near the camera, static buffers + update ranges (never DynamicDrawUsage); a pool with
//            nothing to draw is hidden
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, texture, uv, vec3, vec4, float, mix, smoothstep, length, positionWorld, positionLocal, select, fract,
  step, max, abs, sign, sin, cos, floor, Fn, positionGeometry,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { StreamPool, buildSource } from "../instanceStream.js";
import { PIECES, W0, SHOP_STRIDE } from "./shopPieces.js";
export { PIECES, W0, SHOP_STRIDE };

/** slot palette (linear rgb, roughness, metalness, tintable, emissive) by the Blender material NAME */
export const SLOTS = [
  ["paint", [0.03, 0.08, 0.06], 0.42, 0.0, 1, 0],
  ["bluestone", [0.085, 0.09, 0.095], 0.72, 0.0, 0, 0],
  ["lead", [0.13, 0.135, 0.14], 0.55, 0.3, 0, 0],
  ["brass", [0.62, 0.45, 0.18], 0.3, 1.0, 0, 0],
  ["alu", [0.03, 0.032, 0.035], 0.4, 0.55, 1, 0],
  ["steel", [0.56, 0.57, 0.58], 0.28, 0.95, 0, 0],
  ["rubber", [0.02, 0.02, 0.022], 0.75, 0.0, 0, 0],
  ["iron", [0.022, 0.022, 0.024], 0.5, 0.6, 0, 0],
  ["canvas", [0.45, 0.06, 0.05], 0.88, 0.0, 1, 0],
  ["wood", [0.22, 0.13, 0.065], 0.6, 0.0, 0, 0],
  ["table_top", [0.5, 0.49, 0.46], 0.3, 0.0, 0, 0],
  ["leaf", [0.035, 0.075, 0.025], 0.8, 0.0, 0, 0],
  ["soil", [0.05, 0.035, 0.025], 0.95, 0.0, 0, 0],
  ["cast_iron", [0.03, 0.03, 0.032], 0.5, 0.5, 0, 0],
];
const SLOT = Object.fromEntries(SLOTS.map((s, i) => [s[0], i]));
const S_CANVAS = SLOT.canvas, S_LEAF = SLOT.leaf;

const LOD_ERR = { riser_classic: 0.006, riser_modern: 0.004, front_classic: 0.006, front_modern: 0.004, door_classic: 0.006, door_modern: 0.004, mullion: 0.004, awning: 0.006, blade: 0.004, parasol_sq: 0.008, table_sq: 0.005, planter: 0.02 };
let promise = null;
/** { pieces: { <name>: { lods: [geo, geo], tris, band, r } }, mats: [lod0, lod1], aoTex, loadMs }; fades: the FadeSlots
 *  of the Streamer the pools ride (the street life's: iBand.z = a tile slot of it) */
export function loadShopKit(fades, base = new URL("../../", import.meta.url)) {
  shopFadeRef.fades = fades;
  return (promise ??= (async () => {
    const t0 = performance.now();
    const [gltf, ao] = await Promise.all([
      new GLTFLoader().loadAsync(new URL("models/shops/shopkit.glb", base).href),
      loadAO(new URL("models/shops/shopkit_ao.png", base).href),
    ]);
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let name = null;
      for (let q = o; q && !name; q = q.parent) if (PIECES[q.name]) name = q.name;
      if (!name) return;
      (raw[name] ??= []).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    for (const [name, P] of Object.entries(PIECES)) {
      if (!raw[name]) throw new Error(`shop kit: no piece ${name} in shopkit.glb`);
      const lod0 = mainGeometry(raw[name]);
      const lod1 = weldedSimplify(lod0, LOD_ERR[name], ao);
      for (const g of [lod0, lod1]) { g.computeBoundingSphere(); g.userData.shared = true; }
      // the bounding sphere must hold the widest stretch (a 10 m front): the pool's own sphere is set at each commit
      pieces[name] = { name, lods: [lod0, lod1], tris: [lod0.index.count / 3, lod1.index.count / 3], band: P, r: lod0.boundingSphere.radius + 4 };
    }
    const mats = [0, 1].map((lod) => shopMaterial(lod, ao.tex));
    return { pieces, mats, aoTex: ao.tex, loadMs: performance.now() - t0 };
  })());
}

function loadAO(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, img.width, img.height).data, r = new Uint8Array(img.width * img.height);
      for (let i = 0; i < r.length; i++) r[i] = d[i * 4];
      const tex = new THREE.DataTexture(r, img.width, img.height, THREE.RedFormat, THREE.UnsignedByteType);
      Object.assign(tex, { flipY: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, colorSpace: THREE.NoColorSpace });
      tex.needsUpdate = true;
      const W = img.width, H = img.height;
      const at = (u, v) => { const px = Math.min(W - 1, Math.max(0, Math.round(u * W - 0.5))), py = Math.min(H - 1, Math.max(0, Math.round(v * H - 0.5))); return r[py * W + px] / 255; };
      res({ tex, at });
    };
    img.onerror = () => rej(new Error(`AO map ${url}`));
    img.src = url;
  });
}

/** the piece's primitives merged into one indexed geometry: position, normal, uv1 (AO), slot (stopKit.js recipe) */
function mainGeometry(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`shop kit: unknown slot ${p.slot}`);
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    if (g.attributes.uv1) U.set(g.attributes.uv1.array, v * 2);
    S.fill(s, v, v + n);
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v;
    v += n; i += gi.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("uv1", new THREE.BufferAttribute(U, 2)); g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

/** LOD1: weld by position + slot, simplify, crease-aware normals (25 deg), AO per vertex in the slot's fraction
 *  (copied from viewer/stops/stopKit.js weldedSimplify, not exported there) */
function weldedSimplify(g, err, ao) {
  const P = g.attributes.position.array, S = g.attributes.slot.array, UV = g.attributes.uv1.array, n = S.length;
  const key = new Map(), remap = new Uint32Array(n), wp = [], wslot = [], aoSum = [], aoN = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[3 * i] * 2000)},${Math.round(P[3 * i + 1] * 2000)},${Math.round(P[3 * i + 2] * 2000)},${S[i]}`;
    let j = key.get(k);
    if (j === undefined) { j = wslot.length; key.set(k, j); wp.push(P[3 * i], P[3 * i + 1], P[3 * i + 2]); wslot.push(S[i]); aoSum.push(0); aoN.push(0); }
    remap[i] = j; aoSum[j] += ao.at(UV[2 * i], UV[2 * i + 1]); aoN[j]++;
  }
  const I0 = Uint32Array.from(g.index.array, (i) => remap[i]), pos = new Float32Array(wp);
  const [I] = MeshoptSimplifier.simplify(I0, pos, 3, 0, err, ["ErrorAbsolute", "Prune"]);
  const T = I.length / 3, fn = new Float32Array(T * 3), fa = new Float32Array(T), around = new Map();
  const pk = (v) => `${pos[v * 3].toFixed(4)},${pos[v * 3 + 1].toFixed(4)},${pos[v * 3 + 2].toFixed(4)}`;
  for (let t = 0; t < T; t++) {
    const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l; fa[t] = l / 2;
    for (let k = 0; k < 3; k++) { const q = pk(I[3 * t + k]); if (!around.has(q)) around.set(q, []); around.get(q).push(t); }
  }
  const crease = Math.cos(25 * Math.PI / 180);
  const OP = new Float32Array(T * 9), ON = new Float32Array(T * 9), OS = new Float32Array(T * 3);
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
    const v = I[3 * t + k], o = 3 * t + k;
    OP[3 * o] = pos[3 * v]; OP[3 * o + 1] = pos[3 * v + 1]; OP[3 * o + 2] = pos[3 * v + 2];
    let nx = 0, ny = 0, nz = 0;
    for (const u of around.get(pk(v))) {
      if (fn[3 * u] * fn[3 * t] + fn[3 * u + 1] * fn[3 * t + 1] + fn[3 * u + 2] * fn[3 * t + 2] >= crease) { nx += fn[3 * u] * fa[u]; ny += fn[3 * u + 1] * fa[u]; nz += fn[3 * u + 2] * fa[u]; }
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    ON[3 * o] = nx / l; ON[3 * o + 1] = ny / l; ON[3 * o + 2] = nz / l;
    OS[o] = wslot[v] + 0.99 * Math.min(1, aoSum[v] / aoN[v]) * 0.999;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(OP, 3)); out.setAttribute("normal", new THREE.BufferAttribute(ON, 3));
  out.setAttribute("slot", new THREE.BufferAttribute(OS, 1));
  out.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: T * 3 }, (_, i) => i), 1));
  return out;
}

/** vertices near x = 0 on a piece that stretches (a stretch would tear them): 0 expected (the Blender script's rule) */
export function stretchCheck(kit) {
  const out = {};
  for (const n of ["front_classic", "front_modern", "riser_classic", "riser_modern", "awning"]) {
    const P = kit.pieces[n].lods[0].attributes.position.array;
    let bad = 0; for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i]) < 0.02) bad++;
    out[n] = bad;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ material
const slotA = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[1][0], s[1][1], s[1][2], s[2])), "vec4");
const slotB = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[3], s[4], s[5], 0)), "vec4");
/** the tile fades of the shop pools: the street life's (they ride its Streamer); set by streetlife.js */
export const shopFadeRef = { fades: null };

/** the 9-slice: the translation of a vertex in the piece's own frame (x by the side it is on, y above the stretch
 *  line), from the RAW geometry position. NOTE three r187 applies the instance matrix BEFORE positionNode (positionLocal
 *  is already the instanced position there), so the shift is rotated by the instance's yaw (iSize.w) and added. */
export const sliceShift = Fn(([p, size]) => {
  const sx = select(abs(p.x).greaterThan(0.02), sign(p.x), float(0));
  return vec3(sx.mul(size.x).mul(0.5), step(size.z, p.y).mul(size.y), 0);
});

function shopMaterial(lod, aoTex) {
  const m = new THREE.MeshStandardNodeMaterial();
  const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor().toInt();
  const A = slotA.element(idx), B = slotB.element(idx);
  const size = attribute("iSize", "vec4"), tint = attribute("iTint", "vec4"), band = attribute("iBand", "vec4");
  const shift = sliceShift(positionGeometry, size), yaw = size.w;
  m.positionNode = positionLocal.add(vec3(cos(yaw).mul(shift.x), shift.y, sin(yaw).negate().mul(shift.x)));
  const local = positionGeometry.add(shift);
  const ao = lod >= 1 ? fract(sl.add(0.0005)).div(0.99).min(1) : texture(aoTex, uv(1)).r;
  let base = mix(A.xyz, tint.xyz, tint.w.mul(B.y));          // (B = metalness, tintable, emissive)
  // canvas stripes (awnings, parasols): alternate the tint with a cream stripe along the local x (after the stretch)
  const isCanvas = step(abs(sl.floor().sub(S_CANVAS)), 0.5);
  const sw = band.w.max(0.01);
  const stripe = step(0.5, fract(local.x.div(sw))).mul(step(0.001, band.w)).mul(isCanvas);
  base = mix(base, vec3(0.72, 0.68, 0.58), stripe);
  // the hedge: a leaf mottle in world space (clumps light / dark, a few lighter tips)
  const isLeaf = step(abs(sl.floor().sub(S_LEAF)), 0.5);
  const p = positionWorld.mul(9.0);
  const mott = sin(p.x.add(sin(p.y.mul(1.7)).mul(1.3))).mul(sin(p.z.mul(1.3).add(sin(p.x.mul(0.8)).mul(1.1)))).mul(0.5).add(0.5);
  base = mix(base, base.mul(mix(float(0.55), float(1.45), mott)), isLeaf);
  m.colorNode = base.mul(mix(float(1), ao, 0.6));
  m.aoNode = ao;
  m.roughnessNode = A.w;
  m.metalnessNode = B.x;
  // LOD band: LOD0 keeps n >= t (t: 0 -> 1 across the switch), LOD1 keeps e <= n < t (e: 0 -> 1 across the end); the
  // tile fade by its slot (iBand.z)
  const d = length(positionWorld.sub(lodEye));
  const t = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), e = smoothstep(band.y.mul(0.85), band.y, d);
  const n = ditherNoise();
  const f = shopFadeRef.fades.fade(band.z);
  const tileKeep = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  m.maskNode = (lod === 0 ? keepBand(t, float(1.01), n) : keepBand(e, t, n)).and(tileKeep);
  m.maskShadowNode = m.maskNode;
  m.name = `shops-lod${lod}`;
  m.userData.shared = true; m.userData.noFade = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ pools
/** a tile's records of one piece (SHOP_STRIDE floats each) as a streaming source: matrix (yaw), iSize, iTint, iBand */
export function shopSource(piece, a, slot) {
  const n = a.length / SHOP_STRIDE, M = new Float32Array(n * 16), cen = new Float32Array(n * 4);
  const iSize = new Float32Array(n * 4), iTint = new Float32Array(n * 4), iBand = new Float32Array(n * 4);
  const [s, e] = piece.band.lod;
  for (let i = 0; i < n; i++) {
    const o = i * SHOP_STRIDE, x = a[o], y = a[o + 1], z = a[o + 2], yaw = a[o + 3], cs = Math.cos(yaw), sn = Math.sin(yaw), k = i * 16;
    M[k] = cs; M[k + 2] = -sn; M[k + 5] = 1; M[k + 8] = sn; M[k + 10] = cs; M[k + 12] = x; M[k + 13] = y; M[k + 14] = z; M[k + 15] = 1;
    // centre + half extent: the piece's own radius + half its stretch
    cen[i * 4] = x; cen[i * 4 + 1] = y; cen[i * 4 + 2] = z; cen[i * 4 + 3] = piece.lods[0].boundingSphere.radius + Math.max(0, a[o + 4]) / 2 + Math.max(0, a[o + 5]);
    // (8 vertex buffers is the pipeline limit: the yaw rides iSize.w, the stripes iBand.w)
    iSize.set([a[o + 4], a[o + 5], a[o + 6], yaw], i * 4);
    iTint.set([a[o + 8], a[o + 9], a[o + 10], a[o + 11]], i * 4);
    iBand.set([s, e, slot, a[o + 7]], i * 4);
  }
  return buildSource(n, { instanceMatrix: [M, 16], iSize: [iSize, 4], iTint: [iTint, 4], iBand: [iBand, 4] }, cen);
}

/** ONE pool per piece (LOD0 + LOD1 instanced meshes) for the whole city */
export class ShopPool {
  constructor(piece, mats, group, margin) {
    this.piece = piece; this.kind = piece.name; this.meshes = [];
    const [s, e] = piece.band.lod, live = [[0, s * 1.1], [s * 0.9, e]], spec = [];
    for (let lod = 0; lod < 2; lod++) {
      const geo = new THREE.BufferGeometry(), src = piece.lods[lod];
      for (const k of Object.keys(src.attributes)) geo.setAttribute(k, src.attributes[k]);
      geo.setIndex(src.index);
      const mesh = new THREE.InstancedMesh(geo, mats[lod], 1);
      mesh.castShadow = piece.band.shadow; mesh.receiveShadow = true;
      mesh.name = `shops-${piece.name}-lod${lod}`;
      mesh.boundingSphere = new THREE.Sphere();
      group.add(mesh); this.meshes.push(mesh);
      spec.push({ mesh, l0: live[lod][0], l1: live[lod][1], attrs: [["instanceMatrix", "instanceMatrix", 16], ["iSize", "iSize", 4], ["iTint", "iTint", 4], ["iBand", "iBand", 4]] });
    }
    this.stream = new StreamPool(`shops-${piece.name}`, spec, piece.r, margin);
  }
  source(a, slot) { return shopSource(this.piece, a, slot); }
}
