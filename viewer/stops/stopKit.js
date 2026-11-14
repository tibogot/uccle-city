// THE STIB STOPS KIT (tools/blender/stibStops.py -> models/stops/stibstops.glb + stibstops_ao.png, the poster atlas
// tools/stops/make_posters.py -> textures/posters/stops_posters.jpg), shared by the city (viewer/stops/cityStops.js)
// and the Stops Lab. Loaded once:
//   pieces   shelter (with its lit poster case and bench), pole (STIB flag + timetable case), adpanel (free-standing
//            double-sided lit panel); local frame: x along the kerb, y up, +z = the road side, origin on the ground
//   LODs     0 = the Blender mesh (AO from the lightmap); 1 / 2 = welded by position + slot (the hard-edge and lightmap
//            seams no longer block meshoptimizer) and simplified to 6 mm / 2.5 cm, normals rebuilt with a crease, the AO sampled per vertex from the lightmap
//            (packed in the slot attribute's fraction: slot + ao * 0.99). Never Blender decimate.
//   draws    per piece and LOD ONE opaque draw (every slot in one material: a per-vertex slot index into a palette),
//            + the posters (one draw, the atlas) + the glass (one see-through draw). Shared materials: 3 opaque LODs,
//            poster, glass: 5 pipelines for every stop, shelter and panel of the city.
//   LOD hand-over: per instance band (iBand: switch 0-1, switch 1-2, end, the tile's fade slot) and the per-pixel dither of
//            viewer/lodFade.js (outgoing keeps n >= t, incoming n < t, same noise in the shadow pass: no pop, no shadow
//            snap); beyond the end the last LOD dithers out.
//   night    the poster faces, the poster case's light margin and the roof LED strip glow through their emissive slot,
//            x env.uNight (no light is added: fixed light count)
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, texture, uv, vec2, vec3, float, mix, smoothstep, length, positionWorld, select, fract, clamp, step, max,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { FadeSlots, StreamPool, sourceFromYaw, MARGIN } from "../instanceStream.js";

/** the stops' tile fades (viewer/instanceStream.js): iBand.w = the instance's tile slot */
export const stopFades = new FadeSlots();
import { env } from "../lighting.js";

/** slot palette (linear rgb, roughness, metalness, emissive at night, emissive by day) - by NAME, from the Blender slots */
export const SLOTS = [
  ["frame_anthracite", [0.028, 0.031, 0.033], 0.42, 0.55, 0, 0],
  ["steel_brushed", [0.52, 0.53, 0.54], 0.3, 0.9, 0, 0],
  ["pole_grey", [0.26, 0.27, 0.28], 0.38, 0.7, 0, 0],
  ["stib_red", [0.45, 0.018, 0.025], 0.38, 0.0, 0, 0],
  ["white_panel", [0.78, 0.78, 0.76], 0.35, 0.0, 0, 0],
  ["light_strip", [0.92, 0.92, 0.9], 0.3, 0.0, 3.2, 0.15],
  ["rubber_black", [0.018, 0.018, 0.02], 0.7, 0.0, 0, 0],
];
const SLOT = Object.fromEntries(SLOTS.map((s, i) => [s[0], i]));
/** LOD bands (m): [switch 0 -> 1, switch 1 -> 2, end]; glass stops at `glass` (thin panes: nothing to see beyond) */
export const BANDS = {
  shelter: { lod: [45, 140, 500], glass: 170, shadow: true },
  pole: { lod: [30, 100, 320], glass: 60, shadow: true },
  adpanel: { lod: [45, 140, 500], glass: 0, shadow: true },
};
export const POSTERS = { cols: 4, rows: 2, count: 8 };
const LOD_ERR = [0, 0.006, 0.025];

let promise = null;
/** { pieces: { shelter | pole | adpanel: { lods: [geo x3], poster, glass, standin, tris: [..] } }, mats, aoTex, posterTex } */
export function loadStopKit(base = new URL("../../", import.meta.url)) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const [gltf, ao, posterTex] = await Promise.all([
      new GLTFLoader().loadAsync(new URL("models/stops/stibstops.glb", base).href),
      loadAO(new URL("models/stops/stibstops_ao.png", base).href),
      new THREE.TextureLoader().loadAsync(new URL("textures/posters/stops_posters.jpg", base).href),
    ]);
    Object.assign(posterTex, { flipY: false, colorSpace: THREE.SRGBColorSpace, anisotropy: 8, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    posterTex.needsUpdate = true;
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let name = null;
      for (let q = o; q && !name; q = q.parent) if (/^(shelter|pole|adpanel)(__poster|__glass)?$/.test(q.name)) name = q.name;
      if (!name) return;
      (raw[name] ??= []).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    for (const p of ["shelter", "pole", "adpanel"]) {
      const lod0 = mainGeometry(raw[p]);
      const lod1 = weldedSimplify(lod0, LOD_ERR[1], ao);
      const lod2 = weldedSimplify(lod0, LOD_ERR[2], ao);
      const poster = raw[`${p}__poster`] ? plain(raw[`${p}__poster`], ["position", "normal", "uv"]) : null;
      const glass = raw[`${p}__glass`] ? plain(raw[`${p}__glass`], ["position", "normal"]) : null;
      const lods = [lod0, lod1, lod2];
      for (const g of [...lods, poster, glass]) if (g) { g.computeBoundingSphere(); g.userData.shared = true; }
      pieces[p] = { name: p, lods, poster, glass, standin: standin(lod1, glass), tris: lods.map((g) => g.index.count / 3), band: BANDS[p] };
    }
    const mats = materials(ao.tex, posterTex);
    return { pieces, mats, aoTex: ao.tex, posterTex, loadMs: performance.now() - t0 };
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
      // (glTF uv (0, 0) = the image's top-left: the exporter flips v)
      const at = (u, v) => { const px = Math.min(W - 1, Math.max(0, Math.round(u * W - 0.5))), py = Math.min(H - 1, Math.max(0, Math.round(v * H - 0.5))); return r[py * W + px] / 255; };
      res({ tex, at });
    };
    img.onerror = () => rej(new Error(`AO map ${url}`));
    img.src = url;
  });
}

/** the piece's main primitives merged into one indexed geometry: position, normal, uv1 (AO), slot */
function mainGeometry(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`stops kit: unknown slot ${p.slot}`);
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

function plain(prims, keep) {
  const parts = prims.map((p) => { const g = p.geo; for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k); return g; });
  if (parts.length === 1) return parts[0];
  let nv = 0, ni = 0;
  for (const g of parts) { nv += g.attributes.position.count; ni += g.index.count; }
  const out = new THREE.BufferGeometry(), I = new Uint32Array(ni);
  for (const k of keep) {
    const w = parts[0].attributes[k].itemSize, A = new Float32Array(nv * w);
    let v = 0; for (const g of parts) { A.set(g.attributes[k].array, v * w); v += g.attributes.position.count; }
    out.setAttribute(k, new THREE.BufferAttribute(A, w));
  }
  let v = 0, i = 0;
  for (const g of parts) { const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v; v += g.attributes.position.count; i += gi.length; }
  out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}

/** LOD1 / LOD2: weld by position + slot (the seams no longer block), simplify, rebuild crease-aware normals (25 deg), AO per vertex */
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
  // un-weld per face with crease-averaged normals (flat faces stay flat, round parts round)
  const T = I.length / 3, fn = new Float32Array(T * 3), fa = new Float32Array(T), around = new Map();
  for (let t = 0; t < T; t++) {
    const a = I[3 * t] * 3, b = I[3 * t + 1] * 3, c = I[3 * t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    fn[3 * t] = nx / l; fn[3 * t + 1] = ny / l; fn[3 * t + 2] = nz / l; fa[t] = l / 2;
    for (let k = 0; k < 3; k++) { const pk = `${pos[I[3 * t + k] * 3].toFixed(4)},${pos[I[3 * t + k] * 3 + 1].toFixed(4)},${pos[I[3 * t + k] * 3 + 2].toFixed(4)}`; if (!around.has(pk)) around.set(pk, []); around.get(pk).push(t); }
  }
  const crease = Math.cos(25 * Math.PI / 180);
  const OP = new Float32Array(T * 9), ON = new Float32Array(T * 9), OS = new Float32Array(T * 3);
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
    const v = I[3 * t + k], o = 3 * t + k;
    OP[3 * o] = pos[3 * v]; OP[3 * o + 1] = pos[3 * v + 1]; OP[3 * o + 2] = pos[3 * v + 2];
    let nx = 0, ny = 0, nz = 0;
    for (const u of around.get(`${pos[3 * v].toFixed(4)},${pos[3 * v + 1].toFixed(4)},${pos[3 * v + 2].toFixed(4)}`)) {
      if (fn[3 * u] * fn[3 * t] + fn[3 * u + 1] * fn[3 * t + 1] + fn[3 * u + 2] * fn[3 * t + 2] >= crease) { nx += fn[3 * u] * fa[u]; ny += fn[3 * u + 1] * fa[u]; nz += fn[3 * u + 2] * fa[u]; }
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    ON[3 * o] = nx / l; ON[3 * o + 1] = ny / l; ON[3 * o + 2] = nz / l;
    OS[o] = wslot[v] + 0.99 * Math.min(1, aoSum[v] / aoN[v]) * 0.999;      // slot + ao (fraction)
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(OP, 3)); out.setAttribute("normal", new THREE.BufferAttribute(ON, 3));
  out.setAttribute("slot", new THREE.BufferAttribute(OS, 1));
  out.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: T * 3 }, (_, i) => i), 1));
  return out;
}

/** what the collision side reads (viewer/drive, viewer/character, the collision test): LOD1's triangles + the glass */
function standin(lod1, glass) {
  const parts = [lod1, glass].filter(Boolean);
  let ni = 0; for (const g of parts) ni += g.index.count;
  const P = new Float32Array(ni * 3);
  let o = 0;
  for (const g of parts) { const A = g.attributes.position.array, I = g.index.array; for (let k = 0; k < I.length; k++, o++) { P[3 * o] = A[3 * I[k]]; P[3 * o + 1] = A[3 * I[k] + 1]; P[3 * o + 2] = A[3 * I[k] + 2]; } }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.shared = true;
  return g;
}

// ------------------------------------------------------------------------------------------------ materials
const slotA = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[1][0], s[1][1], s[1][2], s[2])), "vec4");
const slotB = uniformArray(SLOTS.map((s) => new THREE.Vector4(s[3], s[4], s[5], 0)), "vec4");
/** the LOD's dither keep (iBand = switch01, switch12, end, tile slot), lodFade.js conventions */
function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = stopFades.fade(band.w);
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : lod === 2 ? keepBand(e, t2, n) : keepBand(e, float(1.01), n);
  return k.and(tile);
}

function materials(aoTex, posterTex) {
  const night = env.uNight;
  const opaque = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial();
    const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor().toInt();
    const A = slotA.element(idx), B = slotB.element(idx);
    const ao = lod >= 1 ? fract(sl.add(0.0005)).div(0.99).min(1) : texture(aoTex, uv(1)).r;
    m.colorNode = A.xyz.mul(mix(float(1), ao, 0.55));
    m.aoNode = ao;
    m.roughnessNode = A.w;
    m.metalnessNode = B.x;
    m.emissiveNode = A.xyz.mul(mix(B.z, B.y, night));
    m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
    m.maskShadowNode = m.maskNode;
    m.name = `stops-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;           // (the tile fade: its slot rides in iBand.w)
    return m;
  });
  // posters: u 0..1 face A (iPost.x), 1..2 face B (iPost.y); the atlas cell by index; glossy (behind glass); backlit
  const poster = new THREE.MeshStandardNodeMaterial();
  {
    const P = attribute("iPost", "vec4"), u = uv().x, v = uv().y;
    const side = step(1, u), lu = clamp(u.sub(side), 0.004, 0.996), lv = clamp(v, 0.004, 0.996);
    const idx = mix(P.x, P.y, side).add(0.5).floor();
    const col = idx.mod(POSTERS.cols), row = idx.div(POSTERS.cols).floor();
    const t = texture(posterTex, vec2(col.add(lu).div(POSTERS.cols), row.add(lv).div(POSTERS.rows))).rgb;
    poster.colorNode = t.mul(0.85);
    poster.roughnessNode = float(0.12);
    poster.metalnessNode = float(0);
    poster.emissiveNode = t.mul(mix(float(0.22), float(0.75), night));      // (1.9 blew out under the city's night exposure)
    poster.maskNode = lodKeep(3, attribute("iBand", "vec4"));
    poster.name = "stops-poster";
    poster.userData.shared = true; poster.userData.noFade = true;
  }
  // glass: see-through, its opacity faded out by distance (no pop) and by the tile fade
  const glass = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, roughness: 0.04, metalness: 0 });
  {
    const band = attribute("iBand", "vec4"), d = length(positionWorld.sub(lodEye));
    const f = stopFades.fade(band.w), tileA = select(f.greaterThan(1.5), float(3).sub(f), f.min(1));
    glass.colorNode = vec3(0.62, 0.68, 0.7);
    glass.opacityNode = float(0.16).mul(smoothstep(band.z, band.z.mul(0.7), d)).mul(tileA);
    glass.name = "stops-glass";
    glass.userData.shared = true; glass.userData.noFade = true;
  }
  const standin = new THREE.MeshStandardNodeMaterial({ color: 0x555555 });
  standin.name = "stops-collision-standin";
  standin.userData.shared = true; standin.userData.noFade = true;
  return { opaque, poster, glass, standin };
}

// ------------------------------------------------------------------------------------------------ the pools
/** a tile's instance array of one piece (x y z yaw posterA posterB 0 0) as a streaming source (viewer/instanceStream.js):
 *  matrix, iBand (bands + the tile slot), iBandGlass (the glass's end), iPost */
export function stopSource(piece, a, slot) {
  const b = piece.band, [s1, s2, end] = b.lod;
  return sourceFromYaw(a, 8, piece.lods[0].boundingSphere.radius, {
    iBand: (o, v) => { v[0] = s1; v[1] = s2; v[2] = end; v[3] = slot; },
    iBandGlass: (o, v) => { v[0] = s1; v[1] = s2; v[2] = b.glass || 0; v[3] = slot; },
    iPost: (o, v) => { v[0] = a[o + 4]; v[1] = a[o + 5]; },
  });
}

/** ONE pool per piece for the whole city (like the street life's PropPool): LOD0..2 + poster + glass instanced meshes,
 *  streamed from the loaded tiles' sources near the camera (viewer/instanceStream.js StreamPool: static buffers, update
 *  ranges over the live count, never DynamicDrawUsage; a mesh with nothing to draw is not visible: count 0 still costs
 *  a draw). margin: the distance (m) each mesh holds beyond its band (the streamer's hysteresis). */
export class StopPool {
  constructor(piece, mats, group, margin = MARGIN) {
    this.piece = piece; this.meshes = [];
    const [s1, s2, end] = piece.band.lod, spec = [];
    const mk = (geo, mat, name, shadow, l0, l1, band = "iBand") => {
      const g = new THREE.BufferGeometry();
      for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, mat, 1);
      m.receiveShadow = true; m.castShadow = shadow; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `stops-${piece.name}-${name}`;
      group.add(m); this.meshes.push(m);
      spec.push({ mesh: m, l0, l1, attrs: [["instanceMatrix", "instanceMatrix", 16], ["iBand", band, 4], ["iPost", "iPost", 4]] });
      return m;
    };
    const sh = piece.band.shadow;
    // what the shaders may draw (lodKeep's smoothstep windows; the poster to the end; the glass to its own end)
    const live = [[0, s1 * 1.1], [s1 * 0.9, s2 * 1.1], [s2 * 0.9, end]];
    this.lod = piece.lods.map((g, k) => mk(g, mats.opaque[k], `lod${k}`, sh, live[k][0], live[k][1]));
    this.poster = piece.poster ? mk(piece.poster, mats.poster, "poster", false, 0, end) : null;
    this.glass = piece.glass && piece.band.glass > 0 ? mk(piece.glass, mats.glass, "glass", false, 0, piece.band.glass, "iBandGlass") : null;
    if (this.glass) this.glass.renderOrder = 2;
    this.stream = new StreamPool(piece.name, spec, piece.lods[0].boundingSphere.radius, margin);
  }
  /** the labs: a synchronous gather of tiles [{ inst: { <piece>: Float32Array stride 8 } }] (fade 1: slot 0) round c */
  gather(tiles, c) {
    const srcs = [], k = this.piece.name;
    for (const t of tiles) {
      const a = t.inst[k]; if (!a) continue;
      t.__src ||= {};
      srcs.push({ src: (t.__src[k] ||= stopSource(this.piece, a, 0)) });
    }
    const it = this.stream.gather(srcs, c, () => false);
    while (!it.next().done);
  }
  get drawn() { return this.meshes.filter((m) => m.visible).length; }
}
