// STREET FURNITURE KIT 2 (tools/blender/streetFurniture.py -> models/furniture2/furniture2.glb + furniture2_ao.png;
// docs/assets/FURNITURE2.md), shared by the city (viewer/furniture2/cityFurniture.js) and the Furniture Lab. Loaded once,
// built like the STIB stops kit (viewer/stops/stopKit.js):
//   pieces   bench_street, bench_park, bench_backless, hoop, bikebox, bin_round, bin_column, glassbank; local frame: x along
//            the kerb, y up, +z = the road side, origin on the ground
//   LODs     0 = the Blender mesh (AO from the lightmap, wood grain from UV0 in metres); 1 / 2 = welded by position + slot
//            and simplified with meshoptimizer (absolute error per piece), normals rebuilt with a 25 deg crease, the AO
//            sampled per vertex (in the slot attribute's fraction). Never Blender decimate.
//   draws    per piece and LOD ONE draw (every slot in one material: a per-vertex slot index into a palette); THREE shared
//            materials (one per LOD) for every piece of the kit in the city
//   variants per instance iVar = (palette mix 0..1, tone, 0, 0): the slot colour is mix(A, B, iVar.x) (metal-slatted
//            benches, the white / coloured glass banks), x tone on the wood (weathered vs freshly oiled)
//   LOD hand-over: per instance band (iBand: switch 0-1, switch 1-2, end, the tile's fade) and the per-pixel dither of
//            viewer/lodFade.js (same noise in the shadow pass: no pop, no shadow snap). Small pieces cast no shadow at LOD2
//            (their shadow dithers out with LOD1 across the 1-2 hand-over)
//   night    nothing glows (no emissive, no light: fixed light count)
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, texture, uv, vec3, float, int, mix, smoothstep, length, positionWorld, select, fract, mx_noise_float,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";

/** slot palette by NAME (the Blender slots): [name, [A rgb (linear), rough, metal], [B rgb, rough, metal]] */
export const SLOTS = [
  ["wood_slat", [[0.17, 0.105, 0.06], 0.66, 0.0], [[0.27, 0.28, 0.29], 0.42, 0.75]],          // B: metal-slatted benches
  ["frame_dark", [[0.026, 0.028, 0.03], 0.45, 0.55], null],
  ["cast_green", [[0.016, 0.03, 0.02], 0.5, 0.3], null],
  ["hoop_grey", [[0.075, 0.078, 0.082], 0.42, 0.6], null],
  ["galvanised", [[0.42, 0.43, 0.43], 0.5, 0.85], null],
  ["alu_panel", [[0.52, 0.53, 0.54], 0.42, 0.6], null],
  ["box_shell", [[0.07, 0.066, 0.062], 0.5, 0.3], null],
  ["rubber_black", [[0.015, 0.015, 0.016], 0.75, 0.0], null],
  ["white_plate", [[0.74, 0.74, 0.72], 0.35, 0.0], null],
  ["bin_green", [[0.007, 0.022, 0.014], 0.42, 0.15], null],
  ["bin_band", [[0.085, 0.018, 0.013], 0.55, 0.0], null],
  ["bank_hull", [[0.6, 0.6, 0.58], 0.55, 0.0], [[0.2, 0.21, 0.21], 0.5, 0.1]],           // A: white glass, B: coloured glass
  ["bank_bay", [[0.6, 0.6, 0.58], 0.55, 0.0], [[0.004, 0.03, 0.04], 0.45, 0.0]],
  ["bank_ring", [[0.02, 0.02, 0.02], 0.5, 0.0], [[0.42, 0.11, 0.025], 0.5, 0.0]],
  ["bank_ring_mid", [[0.02, 0.02, 0.02], 0.5, 0.0], [[0.025, 0.3, 0.06], 0.5, 0.0]],
];
const SLOT = Object.fromEntries(SLOTS.map((s, i) => [s[0], i]));
export const PIECES = ["bench_street", "bench_park", "bench_backless", "hoop", "bikebox", "bin_round", "bin_column", "glassbank"];
/** LOD bands (m): [switch 0 -> 1, switch 1 -> 2, end]; err = meshopt absolute error per LOD; shadow2 = LOD2 casts */
export const BANDS = {
  bench_street: { lod: [25, 70, 220], err: [0.004, 0.02], shadow2: false },
  bench_park: { lod: [25, 70, 220], err: [0.004, 0.02], shadow2: false },
  bench_backless: { lod: [25, 70, 220], err: [0.004, 0.02], shadow2: false },
  hoop: { lod: [18, 50, 140], err: [0.003, 0.012], shadow2: false },
  bikebox: { lod: [35, 110, 350], err: [0.008, 0.03], shadow2: true },
  bin_round: { lod: [20, 60, 180], err: [0.006, 0.02], shadow2: false },
  bin_column: { lod: [20, 60, 180], err: [0.004, 0.02], shadow2: false },
  glassbank: { lod: [35, 110, 320], err: [0.006, 0.03], shadow2: true },
};

let promise = null;
/** { pieces: { <name>: { lods: [geo x3], standin, tris: [..], band } }, mats, aoTex, loadMs } */
export function loadFurnitureKit(base = new URL("../../", import.meta.url)) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const [gltf, ao] = await Promise.all([
      new GLTFLoader().loadAsync(new URL("models/furniture2/furniture2.glb", base).href),
      loadAO(new URL("models/furniture2/furniture2_ao.png", base).href),
    ]);
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let name = null;
      for (let q = o; q && !name; q = q.parent) if (PIECES.includes(q.name)) name = q.name;
      if (!name) return;
      (raw[name] ??= []).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    for (const p of PIECES) {
      if (!raw[p]) throw new Error(`furniture kit: piece ${p} missing`);
      const b = BANDS[p];
      const lod0 = mainGeometry(raw[p]);
      const lods = [lod0, weldedSimplify(lod0, b.err[0], ao), weldedSimplify(lod0, b.err[1], ao)];
      for (const g of lods) { g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.shared = true; }
      pieces[p] = { name: p, lods, standin: standin(lods[1]), tris: lods.map((g) => g.index.count / 3), band: b };
    }
    const mats = materials(ao.tex);
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

/** the piece's primitives merged into one indexed geometry: position, normal, uv (metres, the grain), uv1 (AO), slot */
function mainGeometry(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U0 = new Float32Array(nv * 2), U = new Float32Array(nv * 2), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`furniture kit: unknown slot ${p.slot}`);
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    if (g.attributes.uv) U0.set(g.attributes.uv.array, v * 2);
    if (g.attributes.uv1) U.set(g.attributes.uv1.array, v * 2);
    S.fill(s, v, v + n);
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v;
    v += n; i += gi.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(U0, 2)); g.setAttribute("uv1", new THREE.BufferAttribute(U, 2));
  g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

/** LOD1 / LOD2: weld by position + slot, simplify, rebuild crease-aware normals (25 deg), AO per vertex (slot + ao * 0.99) */
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
  const pk = (v) => `${pos[3 * v].toFixed(4)},${pos[3 * v + 1].toFixed(4)},${pos[3 * v + 2].toFixed(4)}`;
  for (let t = 0; t < T; t++) {
    const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l; fa[t] = l / 2;
    for (let k = 0; k < 3; k++) { const key2 = pk(I[3 * t + k]); if (!around.has(key2)) around.set(key2, []); around.get(key2).push(t); }
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

/** what the collision side reads (viewer/drive, viewer/character, the collision test): LOD1's triangles, clipped to the
 *  ground (the legs' 0.3 m below the origin are not part of what you bump into) */
function standin(lod1) {
  const A = lod1.attributes.position.array, I = lod1.index.array;
  const P = new Float32Array(I.length * 3);
  for (let k = 0; k < I.length; k++) { P[3 * k] = A[3 * I[k]]; P[3 * k + 1] = Math.max(-0.02, A[3 * I[k] + 1]); P[3 * k + 2] = A[3 * I[k] + 2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.shared = true;
  return g;
}

// ------------------------------------------------------------------------------------------------ materials
const slotA = uniformArray(SLOTS.map((s) => new THREE.Vector4(...s[1][0], s[1][1])), "vec4");
const slotB = uniformArray(SLOTS.map((s) => new THREE.Vector4(...(s[2] || s[1])[0], (s[2] || s[1])[1])), "vec4");
const slotM = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[1][2], (s[2] || s[1])[2], 0, 0)), "vec4");
const WOOD = SLOT.wood_slat;

function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = band.w;
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}

function materials(aoTex) {
  const opaque = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial();
    const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor().toInt();
    const V = attribute("iVar", "vec4");
    const A = slotA.element(idx), B = slotB.element(idx), MM = slotM.element(idx);
    const ao = lod >= 1 ? fract(sl.add(0.0005)).div(0.99).min(1) : texture(aoTex, uv(1)).r;
    const wood = idx.equal(int(WOOD)).and(V.x.lessThan(0.5));
    // the wood: per-instance tone (weathered grey-brown .. oiled), and at LOD0 the grain along UV0's u (metres)
    let tone = mix(vec3(0.82, 0.86, 0.9), vec3(1.12, 1.0, 0.88), V.y);
    if (lod === 0) {
      const g = uv();
      const streak = mx_noise_float(vec3(g.x.mul(0.9), g.y.mul(55), V.y.mul(7))).mul(0.5).add(0.5);
      const fine = mx_noise_float(vec3(g.x.mul(14), g.y.mul(160), 3.1)).mul(0.5).add(0.5);
      tone = tone.mul(float(0.78).add(streak.mul(0.32)).add(fine.mul(0.1)));
    }
    const base = mix(A.xyz, B.xyz, V.x);
    m.colorNode = select(wood, base.mul(tone), base).mul(mix(float(1), ao, 0.6));
    m.aoNode = ao;
    m.roughnessNode = mix(A.w, B.w, V.x);
    m.metalnessNode = mix(MM.x, MM.y, V.x);
    m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
    m.maskShadowNode = m.maskNode;
    m.name = `furniture2-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;           // (the tile fade rides in iBand.w)
    return m;
  });
  const standin = new THREE.MeshStandardNodeMaterial({ color: 0x555555 });
  standin.name = "furniture2-collision-standin";
  standin.userData.shared = true; standin.userData.noFade = true;
  return { opaque, standin };
}

// ------------------------------------------------------------------------------------------------ the pools
/** ONE pool per piece for the whole city: LOD0..2 instanced meshes re-filled from the loaded tiles' instances near the
 *  camera. Static buffers (needsUpdate + update ranges over the live count, never DynamicDrawUsage); a mesh with nothing
 *  to draw is not visible. Instances: Float32Array stride 8 (x y z yaw varMix tone 0 0). */
export class FurniturePool {
  constructor(piece, mats, group) {
    this.piece = piece; this.cap = 0; this.meshes = [];
    const b = piece.band;
    this.lod = piece.lods.map((geo, k) => {
      const g = new THREE.BufferGeometry();
      for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, mats.opaque[k], 1);
      m.count = 0; m.visible = false; m.castShadow = k < 2 || b.shadow2; m.receiveShadow = true; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `furniture2-${piece.name}-lod${k}`;
      group.add(m); this.meshes.push(m);
      return m;
    });
    this.r = piece.lods[0].boundingSphere.radius;
    this.grow(32);
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
  /** tiles: [{ inst: { <piece>: Float32Array stride 8 }, fade }]; c = the camera position */
  gather(tiles, c, margin = 4) {
    const [s1, s2, end] = this.piece.band.lod, kind = this.piece.name;
    let total = 0;
    for (const t of tiles) total += (t.inst[kind]?.length || 0) / 8;
    this.grow(total);
    const lims = [[0, s1 * 1.1 + margin], [s1 * 0.9 - margin, s2 * 1.1 + margin], [s2 * 0.9 - margin, end + margin]];
    this.lod.forEach((m, li) => {
      const d0 = Math.max(0, lims[li][0]), d1 = lims[li][1];
      const M = m.instanceMatrix.array, B = m.geometry.attributes.iBand.array, Vv = m.geometry.attributes.iVar.array;
      let n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const t of tiles) {
        const a = t.inst[kind]; if (!a) continue;
        for (let o = 0; o < a.length; o += 8) {
          const x = a[o], y = a[o + 1], z = a[o + 2], d = Math.hypot(x - c.x, y - c.y, z - c.z);
          if (d < d0 || d > d1) continue;
          const yaw = a[o + 3], cs = Math.cos(yaw), sn = Math.sin(yaw), k = n * 16;
          M[k] = cs; M[k + 1] = 0; M[k + 2] = -sn; M[k + 3] = 0; M[k + 4] = 0; M[k + 5] = 1; M[k + 6] = 0; M[k + 7] = 0;
          M[k + 8] = sn; M[k + 9] = 0; M[k + 10] = cs; M[k + 11] = 0; M[k + 12] = x; M[k + 13] = y; M[k + 14] = z; M[k + 15] = 1;
          B[n * 4] = s1; B[n * 4 + 1] = s2; B[n * 4 + 2] = end; B[n * 4 + 3] = t.fade;
          Vv[n * 4] = a[o + 4]; Vv[n * 4 + 1] = a[o + 5]; Vv[n * 4 + 2] = 0; Vv[n * 4 + 3] = 0;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
          n++;
        }
      }
      m.count = n; m.visible = n > 0;
      if (!n) return;
      m.boundingSphere.center.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.boundingSphere.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + this.r;
      for (const [att, w] of [[m.instanceMatrix, 16], [m.geometry.attributes.iBand, 4], [m.geometry.attributes.iVar, 4]]) {
        att.clearUpdateRanges(); att.addUpdateRange(0, n * w); att.needsUpdate = true;
      }
    });
  }
  get drawn() { return this.meshes.filter((m) => m.visible).length; }
}
