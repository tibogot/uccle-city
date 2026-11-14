// THE STREET KIT (tools/blender/streetKit.py -> models/streetkit/streetkit.glb + streetkit_ao.png, the face atlas
// models/streetkit/streetkit_faces.png from tools/streetkit/faceAtlas.py; docs/assets/STREETKIT.md): Belgian road signs
// (poles + aluminium plates), the posts of the street-name plates, the Villo stations (totem, docks, bikes). Built like
// furniture kit 2 (viewer/furniture2/furnitureKit.js):
//   pieces   PIECES below; local frame: y up, +z = the front (a plate's printed face, the totem's panel, a dock's lock
//            mouth, the bike's rear: it runs from its front tyre at the origin toward +z)
//   LODs     0 = the Blender mesh (AO from the lightmap); 1 / 2 = welded by position + slot, simplified with
//            meshoptimizer, normals rebuilt with a crease, AO per vertex (in the slot attribute's fraction)
//   faces    the plate faces carry NO UVs at any LOD: the face atlas cell is mapped from the geometry position
//            (positionGeometry.xy * (1 / w, 1 / h) + 0.5: a cell covers the plate's bounding box, signShapes.py), so
//            LOD1 / 2 keep their faces; iVar = (cell, 1 / w, 1 / h, 0). The Villo head band maps its station strip
//            the same way (iVar.x = the strip, -1 none). No transparency, no decals (no z-fighting)
//   draws    per piece and LOD ONE draw; THREE shared materials (one per LOD) for every piece of the kit
//   hand-over per instance band (iBand: switch 0-1, switch 1-2, end, the tile's fade slot) + the per-pixel dither of
//            viewer/lodFade.js (same noise in the shadow pass: no pop, no shadow snap)
//   night    emissive only (fixed light count): the plates' retroreflective faces give back a little light toward the
//            viewer (x env.uNight), the Villo screens and status lamps glow
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, texture, uv, vec2, vec3, float, int, mix, smoothstep, length, positionWorld, positionGeometry, normalGeometry,
  select, fract, clamp, floor, mod, max, pow, normalView, positionView, normalize, dot,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { FadeSlots, StreamPool, sourceFromYaw, MARGIN } from "../instanceStream.js";
import { env } from "../lighting.js";

export const streetKitFades = new FadeSlots();

/** slot palette by NAME: [name, linear rgb, roughness, metalness, glow (x night; day glow in [4])] */
export const SLOTS = [
  ["galvanised", [0.36, 0.37, 0.37], 0.48, 0.85, 0, 0],
  ["cap_dark", [0.02, 0.02, 0.022], 0.6, 0.0, 0, 0],
  ["sign_face", [1, 1, 1], 0.42, 0.0, 0, 0],                // the atlas colour; retroreflection by night (material)
  ["sign_back", [0.33, 0.34, 0.35], 0.55, 0.55, 0, 0],      // the grey back of the plate (mill-finish aluminium)
  ["sign_rail", [0.45, 0.46, 0.47], 0.4, 0.8, 0, 0],
  ["bolt_steel", [0.3, 0.3, 0.3], 0.35, 0.9, 0, 0],
  ["villo_body", [0.42, 0.43, 0.44], 0.32, 0.75, 0, 0],     // ribbed silver aluminium
  ["villo_dark", [0.012, 0.014, 0.016], 0.38, 0.2, 0, 0],
  ["villo_screen", [0.05, 0.11, 0.14], 0.08, 0.0, 1.4, 0.35],
  ["villo_head", [0.62, 0.36, 0.012], 0.42, 0.0, 0, 0],     // the ochre head band (+ the station strip from the atlas)
  ["villo_ochre", [0.66, 0.38, 0.012], 0.45, 0.0, 0, 0],    // the skirt guards: plain colour, no mark
  ["bike_frame", [0.46, 0.47, 0.48], 0.3, 0.7, 0, 0],
  ["bike_black", [0.015, 0.015, 0.016], 0.72, 0.0, 0, 0],
  ["bike_chrome", [0.6, 0.6, 0.6], 0.2, 1.0, 0, 0],
  ["reflector", [0.75, 0.2, 0.01], 0.3, 0.0, 0.25, 0],
  ["status_led", [0.03, 0.4, 0.08], 0.2, 0.0, 2.0, 0.6],
];
const SLOT = Object.fromEntries(SLOTS.map((s, i) => [s[0], i]));
export const SHAPES = ["circle", "tri_down", "tri_up", "octagon", "diamond", "square", "rect"];
export const PIECES = ["sign_pole", "sign_pole_tall", "plate_post", ...SHAPES.map((s) => "plate_" + s), "villo_totem", "villo_dock", "villo_bike"];
/** the plates' bounding boxes (tools/streetkit/signShapes.py SHAPES) */
export const PLATE_SIZE = {
  circle: [0.6, 0.6], tri_down: [0.7, 0.7 * Math.sqrt(3) / 2], tri_up: [0.7, 0.7 * Math.sqrt(3) / 2], octagon: [0.6, 0.6],
  diamond: [0.5 * Math.SQRT2, 0.5 * Math.SQRT2], square: [0.6, 0.6], rect: [0.6, 0.9],
};
export const AXIS = 0.088;                    // a plate's face in front of its pole's axis
const PLATE_BAND = { lod: [30, 90, 320], err: [0.003, 0.02], shadow2: false, crease: 25 };
export const BANDS = {
  sign_pole: { lod: [30, 90, 320], err: [0.002, 0.01], shadow2: false, crease: 25 },
  sign_pole_tall: { lod: [30, 90, 320], err: [0.002, 0.01], shadow2: false, crease: 25 },
  plate_post: { lod: [25, 80, 260], err: [0.002, 0.002], shadow2: false, crease: 25 },
  ...Object.fromEntries(SHAPES.map((s) => ["plate_" + s, PLATE_BAND])),
  villo_totem: { lod: [30, 90, 320], err: [0.001, 0.002], shadow2: true, crease: 15 },
  villo_dock: { lod: [20, 60, 200], err: [0.003, 0.015], shadow2: false, crease: 25 },
  villo_bike: { lod: [7, 40, 160], err: [0.0025, 0.008], shadow2: false, crease: 25, shadowLods: 1 },   // (its shadow dithers out with LOD0)
};
const ATLAS_W = 2048, ATLAS_H = 2560, CELL = 512;

let promise = null;
export function loadStreetKit(base = new URL("../../", import.meta.url)) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const [gltf, ao, faces] = await Promise.all([
      new GLTFLoader().loadAsync(new URL("models/streetkit/streetkit.glb", base).href),
      loadAO(new URL("models/streetkit/streetkit_ao.png", base).href),
      new THREE.TextureLoader().loadAsync(new URL("models/streetkit/streetkit_faces.png", base).href),
    ]);
    Object.assign(faces, { colorSpace: THREE.SRGBColorSpace, anisotropy: 8, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    faces.needsUpdate = true;
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
      if (!raw[p]) throw new Error(`street kit: piece ${p} missing`);
      const b = BANDS[p];
      const lod0 = mainGeometry(raw[p]);
      const lods = [lod0, weldedSimplify(lod0, b.err[0], ao, b.crease), weldedSimplify(lod0, b.err[1], ao, b.crease)];
      for (const g of lods) { g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.shared = true; }
      pieces[p] = { name: p, lods, standin: p.startsWith("plate_") && p !== "plate_post" ? null : standin(lods[1]), tris: lods.map((g) => g.index.count / 3), band: b };
    }
    const mats = materials(ao.tex, faces);
    return { pieces, mats, aoTex: ao.tex, faces, loadMs: performance.now() - t0 };
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

function mainGeometry(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`street kit: unknown slot ${p.slot}`);
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    if (g.attributes.uv1) U.set(g.attributes.uv1.array, v * 2);
    S.fill(s, v, v + n);
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v;
    v += n; i += gi.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("uv1", new THREE.BufferAttribute(U, 2));
  g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

/** LOD1 / LOD2 (furnitureKit.js's method): weld by position + slot, simplify, crease-aware normals, AO per vertex */
function weldedSimplify(g, err, ao, creaseDeg = 25) {
  const P = g.attributes.position.array, S = g.attributes.slot.array, UV = g.attributes.uv1.array, n = S.length;
  const key = new Map(), remap = new Uint32Array(n), wp = [], wslot = [], aoSum = [], aoN = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[3 * i] * 2000)},${Math.round(P[3 * i + 1] * 2000)},${Math.round(P[3 * i + 2] * 2000)},${S[i]}`;
    let j = key.get(k);
    if (j === undefined) { j = wslot.length; key.set(k, j); wp.push(P[3 * i], P[3 * i + 1], P[3 * i + 2]); wslot.push(S[i]); aoSum.push(0); aoN.push(0); }
    remap[i] = j;
  }
  const GI = g.index.array;
  for (let t = 0; t < GI.length; t += 3) {
    const a = GI[t], b = GI[t + 1], c = GI[t + 2];
    const v = ao.at((UV[2 * a] + UV[2 * b] + UV[2 * c]) / 3, (UV[2 * a + 1] + UV[2 * b + 1] + UV[2 * c + 1]) / 3);
    const ux = P[3 * b] - P[3 * a], uy = P[3 * b + 1] - P[3 * a + 1], uz = P[3 * b + 2] - P[3 * a + 2], vx = P[3 * c] - P[3 * a], vy = P[3 * c + 1] - P[3 * a + 1], vz = P[3 * c + 2] - P[3 * a + 2];
    const w = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) + 1e-9;
    for (const k of [a, b, c]) { aoSum[remap[k]] += v * w; aoN[remap[k]] += w; }
  }
  const I0 = Uint32Array.from(GI, (i) => remap[i]), pos = new Float32Array(wp);
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
  const crease = Math.cos(creaseDeg * Math.PI / 180);
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
    OS[o] = wslot[v] + 0.99 * Math.min(1, aoN[v] ? aoSum[v] / aoN[v] : 1) * 0.999;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(OP, 3)); out.setAttribute("normal", new THREE.BufferAttribute(ON, 3));
  out.setAttribute("slot", new THREE.BufferAttribute(OS, 1));
  out.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: T * 3 }, (_, i) => i), 1));
  return out;
}

/** the collision stand-in: LOD1's triangles clipped at the ground (the 0.35 m in the ground are not bumped into) */
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
const slotA = uniformArray(SLOTS.map((s) => new THREE.Vector4(...s[1], s[2])), "vec4");
const slotB = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[3], s[4], s[5], 0)), "vec4");      // metal, night glow, day glow

function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = streetKitFades.fade(band.w);
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}

function materials(aoTex, faces) {
  const opaque = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial();
    const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor().toInt();
    const V = attribute("iVar", "vec4");
    const A = slotA.element(idx), B = slotB.element(idx);
    const ao = lod >= 1 ? fract(sl.add(0.0005)).div(0.99).min(1) : texture(aoTex, uv(1)).r;
    const p = positionGeometry;
    // the plate faces: the cell (iVar.x) over the plate's bounding box
    const isFace = idx.equal(int(SLOT.sign_face));
    const f = clamp(vec2(p.x.mul(V.y), p.y.mul(V.z)).add(0.5), 0.004, 0.996);
    const cell = V.x.add(0.5).floor();
    const col = mod(cell, 4), row = floor(cell.div(4));
    const faceUV = vec2(col.add(f.x).mul(CELL / ATLAS_W), float(1).sub(row.mul(CELL).add(float(1).sub(f.y).mul(CELL)).div(ATLAS_H)));
    // the Villo head band's front: the station strip (256 x 64 px, 8 a row, in the atlas's last 512 px band)
    const isHead = idx.equal(int(SLOT.villo_head)).and(normalGeometry.z.greaterThan(0.9)).and(V.x.greaterThan(-0.5));
    const h = clamp(vec2(p.x.add(0.26).div(0.52), p.y.sub(2.165).div(0.13)), 0.006, 0.994);
    const s = V.x.add(0.5).floor(), sc = mod(s, 8), sr = floor(s.div(8));
    const headUV = vec2(sc.add(h.x).mul(256 / ATLAS_W), float(1).sub(float(4 * CELL).add(sr.mul(64)).add(float(1).sub(h.y).mul(64)).div(ATLAS_H)));
    const tex = texture(faces, select(isFace, faceUV, headUV)).rgb;
    const base = select(isFace.or(isHead), tex, A.xyz);
    m.colorNode = base.mul(mix(float(1), ao, 0.6));
    m.aoNode = ao;
    m.roughnessNode = A.w;
    m.metalnessNode = B.x;
    // night: the screens / lamps glow; the retroreflective faces send a little light back toward the viewer
    const night = env.uNight;
    const facing = pow(max(dot(normalize(normalView), normalize(positionView.negate())), 0), 3);
    const retro = select(isFace, tex.mul(facing).mul(night).mul(0.35), vec3(0));
    m.emissiveNode = A.xyz.mul(mix(B.z, B.y, night)).add(retro);
    m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
    m.maskShadowNode = m.maskNode;
    m.name = `streetkit-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;
    return m;
  });
  const standinMat = new THREE.MeshStandardNodeMaterial({ color: 0x555555 });
  standinMat.name = "streetkit-collision-standin";
  standinMat.userData.shared = true; standinMat.userData.noFade = true;
  return { opaque, standin: standinMat };
}

// ------------------------------------------------------------------------------------------------ the pools
/** a tile's instances of one piece (x y z yaw v0 v1 v2 v3) as a streaming source */
export function streetKitSource(piece, a, slot) {
  const [s1, s2, end] = piece.band.lod;
  return sourceFromYaw(a, 8, piece.lods[0].boundingSphere.radius, {
    iBand: (o, v) => { v[0] = s1; v[1] = s2; v[2] = end; v[3] = slot; },
    iVar: (o, v) => { v[0] = a[o + 4]; v[1] = a[o + 5]; v[2] = a[o + 6]; v[3] = a[o + 7]; },
  });
}

/** ONE pool per piece for the whole city (instanceStream.js StreamPool: static buffers + update ranges, never
 *  DynamicDrawUsage; a mesh with nothing to draw is hidden) */
export class StreetKitPool {
  constructor(piece, mats, group, margin = MARGIN) {
    this.piece = piece; this.meshes = [];
    const b = piece.band, [s1, s2, end] = b.lod;
    const live = [[0, s1 * 1.1], [s1 * 0.9, s2 * 1.1], [s2 * 0.9, end]];
    const spec = piece.lods.map((geo, k) => {
      const g = new THREE.BufferGeometry();
      for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, mats.opaque[k], 1);
      m.castShadow = k < (b.shadowLods ?? 2) || b.shadow2; m.receiveShadow = true; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `streetkit-${piece.name}-lod${k}`;
      group.add(m); this.meshes.push(m);
      return { mesh: m, l0: live[k][0], l1: live[k][1], attrs: [["instanceMatrix", "instanceMatrix", 16], ["iBand", "iBand", 4], ["iVar", "iVar", 4]] };
    });
    this.stream = new StreamPool(piece.name, spec, piece.lods[0].boundingSphere.radius, margin);
  }
  /** the labs: a synchronous gather (fade slot 0) round c */
  gather(tiles, c) {
    const srcs = [], k = this.piece.name;
    for (const t of tiles) {
      const a = t.inst[k]; if (!a) continue;
      t.__src ||= {};
      srcs.push({ src: (t.__src[k] ||= streetKitSource(this.piece, a, 0)) });
    }
    const it = this.stream.gather(srcs, c, () => false);
    while (!it.next().done);
  }
  get drawn() { return this.meshes.filter((m) => m.visible).length; }
}
