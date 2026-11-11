// PARK KITS (rocks / rockwork and playground equipment): load a kit made by tools/blender/{rockKit,playgroundKit}.py +
// tools/park_kit_pack.mjs (models/parkkit/), and draw any number of its pieces INSTANCED with smooth LODs.
//
//   const kit = await loadParkKit("rockkit");            // or "playgroundkit"
//   const field = new KitField(kit, { castShadow: true });  scene.add(field.group);
//   field.add("rk_face_a", matrix4);  ...  field.commit();
//   every frame: field.update(cameraPosition)            // LOD buckets + dithered cross-fades, per instance
//
// The GLB holds geometry only, with one primitive per NAMED material slot per LOD ("<piece>_lod<k>"). Colour and
// pattern come at run time from the slot's material here (TEMPORARY TSL stand-ins named by slot, like the town hall's,
// until the shared library, viewer/materials/ on claude/materials, is merged: then MATERIAL_SOURCE points at it). Every
// slot material gets the kit's baked AO: the AO atlas through TEXCOORD_1 (LOD0, and every playground LOD), or the
// vertex AO in COLOR_0.a (the rock LOD1/LOD2, welded and simplified without UVs).
//
// LODs per instance: camera distance -> band (kit.ranges = each band's END); over the last 15 % of a band the instance
// is drawn by BOTH levels with complementary dither masks (lodFade.js's convention: incoming keeps n < t, outgoing
// keeps n >= t; the fade value is a per-instance attribute, so the shadow pass masks the same pixels). Instances
// that are not fading draw with the opaque materials (no discard: early-z kept); only the fading ones use the masked
// copies. Beyond the last band the instance fades out and is not drawn.
//
// Anti-sparkle: the materials' fine detail is a mipmapped noise texture (it averages out with distance by itself), and
// roughness grows with the normal's screen-space variance (specular anti-aliasing: chains, wires and rock bumps do not
// glitter far away).
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, positionWorld, positionView, normalView, positionLocal, vec2, vec3, float, fract, mix, smoothstep, clamp, abs, dot, sin, floor,
  fwidth, max, min, length, Fn, select, instancedBufferAttribute, uniform,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { ditherNoise, SMOOTH } from "./lodFade.js";

export const KITS = ["rockkit", "playgroundkit"];
/** live look controls (uniforms) */
export const kitLook = { ao: uniform(1.0), aoDirect: uniform(0.5), moss: uniform(1.0), normal: uniform(1.0), normalY: uniform(-1.0), bump: uniform(1.0) };

// ------------------------------------------------------------------------------------------------ loading
const cache = new Map();
export function loadParkKit(name) {
  if (cache.has(name)) return cache.get(name);
  const p = (async () => {
    const base = new URL("../models/parkkit/", import.meta.url).href;
    const t0 = performance.now();
    const [gltf, info, aoTex, nrmTex] = await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${base}${name}.glb`),
      fetch(`${base}${name}.json`).then((r) => r.json()),
      loadAO(`${base}${name}_ao.png`),
      new THREE.TextureLoader().loadAsync(`${base}${name}_nrm.jpg`).then((t) => {
        t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
      }).catch(() => null),
    ]);
    const pieces = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let m = null;
      for (let q = o; q && !m; q = q.parent) m = /^(.*)_lod(\d)$/.exec(q.name);      // (multi-primitive nodes: a Group of Meshes)
      if (!m) return;
      const [, piece, k] = m;
      (pieces[piece] ??= { name: piece, lods: [] });
      (pieces[piece].lods[+k] ??= []).push({ slot: o.material.name, geometry: o.geometry });
      o.geometry.computeBoundingSphere();
    });
    for (const p of Object.values(pieces)) {
      p.tris = p.lods.map((l) => l.reduce((s, x) => s + x.geometry.index.count / 3, 0));
      p.draws = p.lods.map((l) => l.length);
      p.size = info.pieces[p.name]?.size_m ?? [1, 1, 1];
      p.range = info.lods?.[p.name]?.range ?? null;          // per-piece LOD bands (else the kit's)
    }
    const materials = {};
    const slotMaterial = (slot, vertexAo) => {
      const key = `${slot}|${vertexAo ? "v" : "t"}`;
      return (materials[key] ??= withAO(slot === "playground" ? playgroundMat(info.slot_order) : slotMat(slot), aoTex, vertexAo, slot, nrmTex));
    };
    return { name, pieces, info, aoTex, nrmTex, ranges: info.lod_ranges_m?.bands ?? [25, 70, 250], slotMaterial, materials, loadMs: performance.now() - t0 };
  })();
  cache.set(name, p);
  return p;
}

function loadAO(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, img.width, img.height).data, r = new Uint8Array(img.width * img.height);
      for (let i = 0; i < r.length; i++) r[i] = d[i * 4];
      const t = new THREE.DataTexture(r, img.width, img.height, THREE.RedFormat, THREE.UnsignedByteType);
      t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; t.userData.bytes = Math.round(r.length * 4 / 3);
      res(t);
    };
    img.onerror = () => rej(new Error(`AO map ${url}`));
    img.src = url;
  });
}

/** the kit's AO on a slot material: lightmap (uv1) or vertex AO (COLOR_0.a), indirect (aoNode) + a share on the colour;
 *  geometric specular anti-aliasing on the roughness */
function withAO(m, aoTex, vertexAo, slot, nrmTex = null) {
  const ao = vertexAo ? attribute("color", "vec4").a : texture(aoTex, uv(1)).r;
  // the baked normal map (rock kit, LOD0: the sculpt's detail on the light low-poly), in the atlas (TEXCOORD_1). The
  // tangent frame comes from the screen-space derivatives of the position and of uv1 (three's instancing does not
  // rotate tangent attributes; this frame follows every instance by itself)
  const rock = ["rocaille_concrete", "rock_sandstone", "rock_schist_dark"].includes(slot);
  if (rock) {
    // ROUGH CONCRETE close up: a bump from the noise texture (2-6 cm pitting and aggregate, ~3 mm deep) on top of the
    // baked normal map (LOD0) or the mesh normal (LOD1 / LOD2); mipmapped, so it flattens out with distance by itself
    const noise = noiseTexture();
    m.normalNode = Fn(() => {
      let N = normalView.toVar();
      if (nrmTex && !vertexAo) {
        const t = uv(1);
        const n = texture(nrmTex, t).xyz.mul(2).sub(1).toVar();
        n.assign(vec3(n.x.mul(kitLook.normal), n.y.mul(kitLook.normal).mul(kitLook.normalY), n.z).normalize());
        const q0 = positionView.dFdx(), q1 = positionView.dFdy(), s0 = t.dFdx(), s1 = t.dFdy();
        const q1p = q1.cross(N), q0p = N.cross(q0);
        const T = q1p.mul(s0.x).add(q0p.mul(s1.x)), B = q1p.mul(s0.y).add(q0p.mul(s1.y));
        const det = max(dot(T, T), dot(B, B)), k = select(det.equal(0), float(0), det.inverseSqrt());
        N.assign(T.mul(k).mul(n.x).add(B.mul(k).mul(n.y)).add(N.mul(n.z)).normalize());
      }
      const q = planar();
      const hgt = texture(noise, q.div(2.0)).b.mul(0.0035).add(texture(noise, q.div(0.9)).b.mul(0.0025)).mul(kitLook.bump);
      const dpx = positionView.dFdx(), dpy = positionView.dFdy();
      const r1 = dpy.cross(N), r2 = N.cross(dpx), det2 = dot(dpx, r1);
      const g = r1.mul(hgt.dFdx()).add(r2.mul(hgt.dFdy())).mul(select(det2.lessThan(0), float(-1), float(1)));
      return abs(det2).mul(N).sub(g).normalize();
    })();
  } else if (nrmTex && !vertexAo && slot !== "playground") {
    m.normalNode = Fn(() => {
      const t = uv(1);
      const n = texture(nrmTex, t).xyz.mul(2).sub(1).toVar();
      n.assign(vec3(n.x.mul(kitLook.normal), n.y.mul(kitLook.normal).mul(kitLook.normalY), n.z).normalize());
      const q0 = positionView.dFdx(), q1 = positionView.dFdy(), s0 = t.dFdx(), s1 = t.dFdy();
      const N = normalView.toVar();
      const q1p = q1.cross(N), q0p = N.cross(q0);
      const T = q1p.mul(s0.x).add(q0p.mul(s1.x)), B = q1p.mul(s0.y).add(q0p.mul(s1.y));
      const det = max(dot(T, T), dot(B, B)), k = select(det.equal(0), float(0), det.inverseSqrt());
      return T.mul(k).mul(n.x).add(B.mul(k).mul(n.y)).add(N.mul(n.z)).normalize();
    })();
  }
  const aoK = mix(float(1), ao, kitLook.ao);
  m.aoNode = m.aoNode ? m.aoNode.mul(aoK) : aoK;
  const base = m.colorNode ?? vec3(m.color.r, m.color.g, m.color.b);
  m.colorNode = base.mul(mix(float(1), aoK, kitLook.aoDirect));
  const r0 = m.roughnessNode ?? float(m.roughness);
  const dn = fwidth(normalWorld);
  m.roughnessNode = clamp(r0.mul(r0).add(min(dot(dn, dn).mul(2.0), 0.35)).sqrt(), 0.04, 1.0);
  m.name = `parkkit ${slot}${vertexAo ? " (vertex AO)" : ""}`;
  m.userData.slot = slot; m.userData.vertexAo = vertexAo;
  return m;
}

// ------------------------------------------------------------------------------------------------ temporary slot materials
// Stand-ins by slot name (replaced by the shared library's materials when it lands). The detail comes from ONE small
// tiling noise texture (made here once: value-noise octaves in R/G/B, vertical streaks in A), sampled with mipmaps,
// so far away it averages out by itself (no sparkle) and a pixel costs 1-2 texture reads instead of 3D noise.
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const cv = (c) => vec3(c.r, c.g, c.b);
let NOISE = null;
function noiseTexture() {
  if (NOISE) return NOISE;
  const S = 256, d = new Uint8Array(S * S * 4);
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const octave = (cells, sx = 1, sy = 1) => {
    const cx = Math.max(1, Math.round(cells * sx)), cy = Math.max(1, Math.round(cells * sy)), g = Array.from({ length: cx * cy }, rnd);
    const at = (i, j) => g[((j % cy) + cy) % cy * cx + ((i % cx) + cx) % cx];
    const f = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
      const u = (x / S) * cx, v = (y / S) * cy, i = Math.floor(u), j = Math.floor(v), a = f(u - i), b = f(v - j);
      return (at(i, j) * (1 - a) + at(i + 1, j) * a) * (1 - b) + (at(i, j + 1) * (1 - a) + at(i + 1, j + 1) * a) * b;
    };
  };
  const o = [octave(4), octave(8), octave(16), octave(32), octave(64), octave(128), octave(64, 1, 0.125), octave(128, 1, 0.0625)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    d[i] = 255 * (0.6 * o[0](x, y) + 0.4 * o[1](x, y));                 // R: low (1 m and 0.5 m at a 4 m tile)
    d[i + 1] = 255 * (0.6 * o[2](x, y) + 0.4 * o[3](x, y));             // G: mid (25 / 12 cm)
    d[i + 2] = 255 * (0.6 * o[4](x, y) + 0.4 * o[5](x, y));             // B: fine (6 / 3 cm)
    d[i + 3] = 255 * (0.5 * o[6](x, y) + 0.5 * o[7](x, y));             // A: vertical streaks
  }
  NOISE = new THREE.DataTexture(d, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
  NOISE.wrapS = NOISE.wrapT = THREE.RepeatWrapping; NOISE.generateMipmaps = true;
  NOISE.minFilter = THREE.LinearMipmapLinearFilter; NOISE.magFilter = THREE.LinearFilter; NOISE.anisotropy = 4; NOISE.needsUpdate = true;
  return NOISE;
}
/** the world position projected on the plane facing the normal most (metres) */
const planar = () => {
  const n = abs(normalWorld), p = positionWorld;
  return select(n.y.greaterThan(max(n.x, n.z)), p.xz, select(n.x.greaterThan(n.z), p.zy, p.xy));
};

function standard(color, rough = 0.8, metal = 0) {
  const m = new THREE.MeshStandardNodeMaterial({ color, roughness: rough, metalness: metal });
  m.colorNode = cv(color);
  return m;
}
function rocaille(baseSrgb, opts = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: opts.rough ?? 0.9, metalness: 0 });
  const base = lin(...baseSrgb), mossC = lin(0.22, 0.27, 0.1), dirt = lin(0.3, 0.26, 0.21), algae = lin(0.17, 0.2, 0.12);
  const tex = noiseTexture();
  m.colorNode = Fn(() => {
    const C = attribute("color", "vec4");
    const cav = C.r, layer = C.g, edge = C.b;
    const q = planar();
    const a = texture(tex, q.div(4.0)).toVar();                   // R 1 m, G 25 cm, B 6 cm, A streaks
    const b = texture(tex, q.div(17.0).add(0.37)).toVar();         // large weathering patches
    const tone = mix(float(0.9), float(1.08), layer);
    const col = cv(base).mul(tone).mul(float(0.82).add(a.r.mul(0.2)).add(a.g.mul(0.1)).add(a.b.mul(0.1))).toVar();
    col.assign(mix(col, cv(dirt), smoothstep(0.45, 0.85, b.r).mul(opts.stain ?? 0.45)));                 // grey-brown weathering
    col.assign(col.mul(float(1).sub(smoothstep(0.5, 0.9, a.a).mul(opts.streak ?? 0.18).mul(float(1).sub(abs(normalWorld.y))))));   // dark rain streaks
    col.assign(mix(col, cv(algae), smoothstep(0.9, 0.1, positionWorld.y).mul(smoothstep(0.3, 0.6, b.b)).mul(0.6)));   // green algae near the water (lab: water at y 0)
    col.assign(col.mul(mix(float(1), float(0.62), smoothstep(0.64, 0.92, cav))));                         // joints, cracks (deep ones only)
    col.assign(col.mul(float(1).add(edge.mul(0.12))));                                                    // worn edges
    const mossM = clamp(smoothstep(0.5, 0.9, normalWorld.y).mul(smoothstep(0.35, 0.7, b.g)).add(smoothstep(0.62, 0.85, cav).mul(0.4)), 0, 1)
      .mul(opts.moss ?? 0.75).mul(kitLook.moss);
    col.assign(mix(col, cv(mossC).mul(float(0.75).add(a.b.mul(0.5))), mossM));
    return col;
  })();
  return m;
}
function wood(srgb, opts = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: opts.rough ?? 0.75 });
  const c = lin(...srgb), tex = noiseTexture();
  m.colorNode = Fn(() => {
    // u runs along the grain: the texture stretched along it (LOD1/2 have no UV: a flat tone, they are far)
    const t = uv(0);
    const g = texture(tex, vec2(t.x.mul(0.02), t.y.mul(opts.ring ?? 0.8)));
    return cv(c).mul(float(0.85).add(g.b.mul(0.2)).add(g.g.mul(0.1)));
  })();
  return m;
}
function speckle(srgb, srgb2, scale, opts = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: opts.rough ?? 0.9 });
  const a = lin(...srgb), b = lin(...srgb2), tex = noiseTexture();
  m.colorNode = Fn(() => {
    const n = texture(tex, planar().mul(scale / 64));
    return mix(cv(a), cv(b), smoothstep(0.45, 0.65, n.b)).mul(float(0.92).add(n.r.mul(0.12)));
  })();
  return m;
}
function rope() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
  const c = lin(0.13, 0.13, 0.14), tex = noiseTexture();
  m.colorNode = Fn(() => {
    const t = uv(0);
    return cv(c).mul(float(0.85).add(texture(tex, vec2(t.x.mul(3), t.y.mul(0.5))).b.mul(0.3)));
  })();
  return m;
}
const SLOTS = {
  rocaille_concrete: () => rocaille([0.58, 0.555, 0.51], { stain: 0.6, moss: 0.9, streak: 0.3 }),   // warm grey-brown weathered concrete (o01, round 3)   // grey weathered concrete (owner's photo o01)
  rock_sandstone: () => rocaille([0.6, 0.5, 0.36], { moss: 0.5, stain: 0.3 }),
  rock_schist_dark: () => rocaille([0.3, 0.3, 0.29], { moss: 0.35, rough: 0.7, stain: 0.2 }),
  wood_stained: () => wood([0.38, 0.22, 0.12]),
  wood_log: () => wood([0.55, 0.44, 0.33], { ring: 0.5, rough: 0.85 }),
  wood_bench: () => wood([0.45, 0.30, 0.18]),
  steel_galvanised: () => speckle([0.62, 0.63, 0.64], [0.52, 0.53, 0.55], 18, { rough: 0.45 }),
  steel_painted_red: () => standard(lin(0.55, 0.06, 0.05), 0.5),
  steel_painted_green: () => standard(lin(0.08, 0.22, 0.12), 0.55),
  hpl_panel: () => standard(lin(0.62, 0.30, 0.12), 0.45),
  hdpe_green: () => standard(lin(0.10, 0.42, 0.32), 0.5),
  hdpe_red: () => standard(lin(0.66, 0.10, 0.08), 0.5),
  rope_grey: rope,
  rubber_black: () => standard(lin(0.06, 0.06, 0.06), 0.85),
  stainless_steel: () => standard(lin(0.75, 0.75, 0.76), 0.28, 1),
  surface_rubber: () => speckle([0.42, 0.16, 0.10], [0.30, 0.10, 0.07], 60),
  surface_woodchip: () => speckle([0.45, 0.30, 0.18], [0.25, 0.15, 0.08], 25),
  sand: () => speckle([0.78, 0.70, 0.55], [0.66, 0.58, 0.45], 40, { rough: 0.95 }),
};
/** ONE material for every playground piece (all slots batched: COLOR_0.r = the slot's index in kit.info.slot_order).
 *  Per slot: colour, roughness, metalness and a detail mode (0 plain, 1 wood along uv0.x, 2 speckle, 3 rope). */
const PG = {
  wood_stained: [[0.38, 0.22, 0.12], 0.75, 0, 1], wood_log: [[0.55, 0.44, 0.33], 0.85, 0, 1], wood_bench: [[0.45, 0.30, 0.18], 0.7, 0, 1],
  steel_galvanised: [[0.60, 0.61, 0.62], 0.45, 0.8, 2], steel_painted_red: [[0.55, 0.06, 0.05], 0.5, 0, 0], steel_painted_green: [[0.08, 0.22, 0.12], 0.55, 0, 0],
  hpl_panel: [[0.62, 0.30, 0.12], 0.45, 0, 0], hdpe_green: [[0.10, 0.42, 0.32], 0.5, 0, 0], hdpe_red: [[0.66, 0.10, 0.08], 0.5, 0, 0],
  rope_grey: [[0.13, 0.13, 0.14], 0.9, 0, 3], rubber_black: [[0.06, 0.06, 0.06], 0.85, 0, 0], stainless_steel: [[0.75, 0.75, 0.76], 0.28, 1, 0],
  surface_rubber: [[0.36, 0.13, 0.08], 0.9, 0, 2], surface_woodchip: [[0.38, 0.25, 0.14], 0.9, 0, 2], sand: [[0.74, 0.66, 0.51], 0.95, 0, 2],
};
export const pgLook = { surface: uniform(12) };      // the slot drawn for "surface_rubber" (index in slot_order + 2 extras)
function playgroundMat(order) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
  const tex = noiseTexture();
  const names = [...order, "surface_woodchip"];
  const idx = attribute("color", "vec4").r.mul(32).floor().toVar();
  const surf = order.indexOf("surface_rubber");
  const pick = (f) => {         // a select chain over the slots
    let out = f(PG[names[names.length - 1]], names.length - 1);
    for (let i = names.length - 2; i >= 0; i--) out = select(idx.equal(i), f(PG[names[i]], i), out);
    return out;
  };
  m.colorNode = Fn(() => {
    const id = select(idx.equal(surf), pgLook.surface, idx).toVar();
    const pk = (f) => { let out = f(PG[names[names.length - 1]]); for (let i = names.length - 2; i >= 0; i--) out = select(id.equal(i), f(PG[names[i]]), out); return out; };
    const base = pk((q) => cv(lin(...q[0])));
    const mode = pk((q) => float(q[3])).toVar();
    // ONE texture read: its coordinates chosen by the mode (wood along uv0.x, speckle on the world plane, rope twist)
    const t = uv(0);
    const c = select(mode.equal(1), vec2(t.x.mul(0.02), t.y.mul(0.8)), select(mode.equal(2), planar().mul(0.6), vec2(t.x.mul(3), t.y.mul(0.5))));
    const n = texture(tex, c);
    const k = select(mode.equal(0), float(1), select(mode.equal(1), float(0.85).add(n.b.mul(0.2)).add(n.g.mul(0.1)), float(0.88).add(n.b.mul(0.24))));
    return base.mul(k);
  })();
  m.roughnessNode = pick((q) => float(q[1]));
  m.metalnessNode = pick((q) => float(q[2]));
  m.name = "playground";
  return m;
}
export const SLOT_NAMES = Object.keys(SLOTS);
function slotMat(slot) {
  const m = (SLOTS[slot] ?? (() => standard(lin(0.6, 0.6, 0.6), 0.8)))();
  m.name = slot;
  return m;
}

// ------------------------------------------------------------------------------------------------ instanced field with LODs
const FADE = 0.08;                 // the cross-fade covers the last 8 % of each band (a fading instance draws twice, with discard)
/** the layer of the shadow proxies: add it to the sun's shadow camera (light.shadow.camera.layers.enable(SHADOW_LAYER)) */
export const SHADOW_LAYER = 2;                 // the cross-fade covers the last 15 % of each band
export class KitField {
  constructor(kit, { castShadow = true, receiveShadow = true, slotOverride = {}, shadowProxy = false } = {}) {
    this.shadowProxy = shadowProxy;     // LOD0 / LOD1 cast their shadow through the LOD2 mesh (layer SHADOW_LAYER: enable it on the sun's shadow camera)
    this.kit = kit; this.group = new THREE.Group(); this.group.name = `kitfield ${kit.name}`;
    this.inst = {};                 // piece -> [{ m: Matrix4, p: Vector3 }]
    this.castShadow = castShadow; this.receiveShadow = receiveShadow;
    this.rangeScale = 1; this.force = null;      // force: null = auto, k = every instance at LOD k, "off"
    this.slotOverride = slotOverride;
    this.meshes = [];
    this.stats = { lod: [0, 0, 0], fading: 0, tris: 0, draws: 0 };
  }
  add(piece, matrix) {
    if (!this.kit.pieces[piece]) throw new Error(`no piece ${piece} in ${this.kit.name}`);
    (this.inst[piece] ??= []).push({ m: matrix.clone(), p: new THREE.Vector3().setFromMatrixPosition(matrix) });
  }
  clear() { for (const m of this.meshes) { this.group.remove(m); } this.meshes = []; this.inst = {}; this.built = null; }
  /** build the instanced meshes (call after the adds) */
  commit() {
    for (const m of this.meshes) this.group.remove(m);
    this.meshes = [];
    this.built = {};
    for (const [piece, list] of Object.entries(this.inst)) {
      const P = this.kit.pieces[piece], cap = list.length;
      const lods = P.lods.map((prims) => {
        const mk = (fade) => {
          const attr = fade ? new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage) : null;
          const meshes = prims.map(({ slot, geometry }) => {
            const vertexAo = !geometry.attributes.uv1;
            const s = this.slotOverride[slot] ?? slot;
            let mat = this.kit.slotMaterial(s, vertexAo);
            if (fade) mat = fadeCopy(mat, attr);
            const im = new THREE.InstancedMesh(geometry, mat, cap);
            im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            im.count = 0; im.frustumCulled = false; im.visible = false;
            im.castShadow = this.castShadow; im.receiveShadow = this.receiveShadow;
            im.name = `${piece} ${slot}${fade ? " fade" : ""}`;
            im.userData.slot = slot;
            this.group.add(im); this.meshes.push(im);
            return im;
          });
          return { meshes, attr, buf: new Float32Array(cap * 16), vals: attr ? attr.array : null, n: 0 };
        };
        return { solid: mk(false), fade: mk(true) };
      });
      // shadow proxy: the LOD2 mesh for every instance drawn at LOD0 / LOD1 (once: the outgoing side of a fade), shadow layer only
      let proxy = null;
      if (this.shadowProxy && P.lods.length > 1) {
        const SL = P.lods[P.lods.length - 1];        // the shadow is cast by the LAST LOD's mesh (LOD2) for LOD0 and LOD1
        proxy = { meshes: SL.map(({ geometry }) => {
          const im = new THREE.InstancedMesh(geometry, this.kit.slotMaterial(SL[0].slot, !geometry.attributes.uv1), cap);
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; im.frustumCulled = false; im.visible = false;
          im.castShadow = true; im.receiveShadow = false; im.layers.set(SHADOW_LAYER); im.name = `${piece} shadow proxy`;
          this.group.add(im); this.meshes.push(im); return im;
        }), buf: new Float32Array(cap * 16), n: 0 };
        for (let k = 0; k < lods.length - 1; k++) for (const kind of ["solid", "fade"]) for (const im of lods[k][kind].meshes) im.castShadow = false;
      }
      this.built[piece] = { list, lods, proxy };
    }
  }
  /** per frame: LOD buckets for every instance from the eye position */
  update(eye) {
    if (!this.built) this.commit();
    const R0 = this.kit.ranges.map((r) => r * this.rangeScale);
    const st = this.stats; st.lod = [0, 0, 0]; st.fading = 0; st.tris = 0; st.draws = 0;
    for (const [piece, { list, lods, proxy }] of Object.entries(this.built)) {
      const R = this.kit.pieces[piece].range ? this.kit.pieces[piece].range.map((r) => r * this.rangeScale) : R0;
      for (const L of lods) { L.solid.n = 0; L.fade.n = 0; }
      if (proxy) proxy.n = 0;
      const put = (k, kind, i, val) => {
        const B = lods[k]?.[kind]; if (!B) return;
        list[i].m.toArray(B.buf, B.n * 16);
        if (B.vals) B.vals[B.n] = val;
        B.n++;
        if (proxy && k < lods.length - 1 && (kind === "solid" || val > 1.5)) { list[i].m.toArray(proxy.buf, proxy.n * 16); proxy.n++; }
      };
      for (let i = 0; i < list.length; i++) {
        if (this.force === "off") continue;
        if (this.force != null) { put(Math.min(this.force, lods.length - 1), "solid", i, 1); st.lod[this.force]++; continue; }
        const d = eye.distanceTo(list[i].p);
        let k = R.findIndex((r) => d < r);
        if (k < 0) continue;
        const w = R[k] * FADE, t = (d - (R[k] - w)) / w;
        if (t <= 0 || !SMOOTH) { put(k, "solid", i, 1); st.lod[k]++; continue; }
        put(k, "fade", i, 2 + t);                       // outgoing keeps n >= t
        if (k + 1 < lods.length) put(k + 1, "fade", i, t);   // incoming keeps n < t
        st.lod[k]++; st.fading++;
      }
      lods.forEach((L, k) => {
        for (const kind of ["solid", "fade"]) {
          const B = L[kind];
          for (const im of B.meshes) {
            im.count = B.n; im.visible = B.n > 0;
            if (!B.n) continue;
            im.instanceMatrix.array.set(B.buf.subarray(0, B.n * 16)); im.instanceMatrix.needsUpdate = true;
            st.draws++; st.tris += B.n * im.geometry.index.count / 3;
          }
          if (B.attr && B.n) B.attr.needsUpdate = true;
        }
      });
      if (proxy) for (const im of proxy.meshes) {
        im.count = proxy.n; im.visible = proxy.n > 0;
        if (proxy.n) { im.instanceMatrix.array.set(proxy.buf.subarray(0, proxy.n * 16)); im.instanceMatrix.needsUpdate = true; st.shadowTris = (st.shadowTris ?? 0) + proxy.n * im.geometry.index.count / 3; }
      }
    }
    return st;
  }
  setSlot(slot, toSlot) {
    this.slotOverride[slot] = toSlot;
    for (const im of this.meshes) {
      if (im.userData.slot !== slot) continue;
      if (im.name.endsWith("shadow proxy")) continue;
      const fade = im.name.endsWith(" fade");
      const vertexAo = !im.geometry.attributes.uv1;
      let mat = this.kit.slotMaterial(toSlot, vertexAo);
      if (fade) mat = fadeCopy(mat, im.material.userData.fadeAttr);
      im.material = mat;
    }
  }
  wireframe(on) {
    for (const im of this.meshes) im.material.wireframe = on;
  }
  get instances() { return Object.values(this.inst).reduce((s, l) => s + l.length, 0); }
}

/** the masked copy of a slot material for the fading instances (per-instance value: lodFade's objectFade convention) */
function fadeCopy(mat, attr) {
  const m = mat.clone();
  const f = instancedBufferAttribute(attr, "float");
  const n = ditherNoise();
  m.maskNode = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  m.userData.fadeAttr = attr;
  m.name = mat.name + " (fading)";
  return m;
}

/** a sample arrangement helper: a rock cliff of n pieces along a curve (the lab's "sample cliff") */
export function sampleCliff(field, { n = 40, seed = 3, length = 34, height = 5.2, origin = new THREE.Vector3(), yaw = 0, ground = () => 0 } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const faces = ["rk2_pillars_tall", "rk2_pillars_low", "rk2_slabs", "rk2_grotto"], small = ["rk2_pillar", "rk2_cap", "rk2_foot", "rk_step"];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const rot = new THREE.Matrix4().makeRotationY(yaw);
  let placed = 0;
  // the wall: two rows of faces (the lower in front), the top row set back and higher; a grotto near the middle
  const rows = [{ z: 0, y: 0, k: 0.95 }, { z: 1.1, y: 1.9, k: 0.8 }, { z: 2.0, y: 3.4, k: 0.65 }];
  for (const r of rows) {
    for (let x = -length / 2; x < length / 2 && placed < n * 0.72;) {
      const name = r.y === 0 && Math.abs(x) < 2.5 ? "rk2_grotto" : faces[Math.floor(rnd() * 3)];
      const scl = r.k * (0.8 + rnd() * 0.45);
      const w = (field.kit.pieces[name].size[0] || 3) * scl;
      const bend = Math.sin((x / length) * Math.PI) * 3.0;
      pos.set(x + w / 2, r.y + (rnd() - 0.5) * 0.7 - 0.15, r.z - bend + (rnd() - 0.5) * 0.9);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI + (rnd() - 0.5) * 0.9 + Math.cos((x / length) * Math.PI) * 0.35);   // (the pieces' front is +z)
      sc.set(scl, scl * (0.85 + rnd() * 0.35), scl);
      m.compose(pos, q, sc).premultiply(rot); m.setPosition(m.elements[12] + origin.x, m.elements[13] + origin.y + ground(m.elements[12] + origin.x, m.elements[14] + origin.z), m.elements[14] + origin.z);
      field.add(name, m); placed++;
      x += w * (0.55 + rnd() * 0.2);
    }
  }
  while (placed < n) {
    const name = small[Math.floor(rnd() * small.length)];
    const x = (rnd() - 0.5) * length, scl = 0.7 + rnd() * 0.6;
    const bend = Math.sin((x / length + 0.5) * Math.PI) * 3.0;
    pos.set(x, rnd() < 0.5 ? -0.1 : 1.6 + rnd() * 2.2, -1.8 - rnd() * 2.0 - bend * 0.3 + (pos.y > 0 ? 2.5 : 0));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    sc.setScalar(scl);
    m.compose(pos, q, sc).premultiply(rot); m.setPosition(m.elements[12] + origin.x, m.elements[13] + origin.y + ground(m.elements[12] + origin.x, m.elements[14] + origin.z), m.elements[14] + origin.z);
    field.add(name, m); placed++;
  }
  return placed;
}

/** a sample playground (one of each, laid out like the Sauvagere's main playground) */
export function samplePlayground(field, { origin = new THREE.Vector3(), yaw = 0 } = {}) {
  const L = [
    ["pg_surface", -4.5, 1.5, 0], ["pg_swing", -4.5, 1.5, 0], ["pg_surface", 1.0, 2.5, 0.2], ["pg_slide", 1.0, 2.5, 0.2],
    ["pg_climb", 5.5, 2.0, -0.3], ["pg_surface", 5.5, 2.0, -0.3], ["pg_spring", -2.0, -3.5, 0.6], ["pg_spring", -0.6, -4.2, -0.4],
    ["pg_sandpit", 3.0, -4.0, 0], ["pg_seesaw", 7.5, -3.5, 1.2], ["pg_bench", -8.5, -2.0, 1.57], ["pg_bench", 10.5, 1.0, -1.57],
  ];
  const m = new THREE.Matrix4(), rot = new THREE.Matrix4().makeRotationY(yaw);
  for (const [name, x, z, a] of L) {
    m.makeRotationY(a).setPosition(x, 0, z).premultiply(rot);
    m.setPosition(m.elements[12] + origin.x, origin.y, m.elements[14] + origin.z);
    field.add(name, m);
  }
  // the fence: 2 m panels round a 26 x 14 m area, a gate on the front
  const W = 26, D = 14;
  const seg = (x0, z0, x1, z1) => {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.0), a = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      m.makeRotationY(a).setPosition(x, 0, z).premultiply(rot);
      m.setPosition(m.elements[12] + origin.x, origin.y, m.elements[14] + origin.z);
      field.add(i === Math.floor(n / 2) && z0 === D / 2 && z1 === D / 2 ? "pg_gate" : "pg_fence", m);
    }
  };
  seg(-W / 2, D / 2, W / 2, D / 2); seg(W / 2, D / 2, W / 2, -D / 2); seg(W / 2, -D / 2, -W / 2, -D / 2); seg(-W / 2, -D / 2, -W / 2, D / 2);
}

/** THE SAUVAGERE CLIFF, laid out like the owner's photo o01 (from the pond, looking east; DTM: ~28 m of face, 5 m
 *  from the water at 88.5 to the top at 93.3-94.3): slanted slabs on the left, pillars rising to the right, the
 *  grotto at the water under the middle, ledges along the water line, cap ledges on top under the temple.
 *  Lab frame: the water line at y = 0 along x, the cliff's front facing -z (the pieces' front is +z: yaw pi). */
export function sampleSauvagereCliff(field, { origin = new THREE.Vector3(), yaw = 0 } = {}) {
  const L = [
    // name, x, y, z, yaw (deg, 0 = facing the pond), scale. o01 read left to right: low broad slanted blocks and
    // ledges with plants (left, ~2-3 m), the grotto and lower pillars (middle), tall pillars rising to the right
    // (4.5-5 m) with a back row filling up to the top under the temple; ledges and slabs along the water line.
    ["rk2_foot", -12.0, -0.3, -0.9, 4, 1.0], ["rk2_cap", -11.4, -0.1, 0.6, 80, 1.2], ["rk2_slabs", -9.0, -0.2, 0.4, -12, 1.0],
    ["rk2_foot", -7.4, -0.3, -1.2, -3, 1.05], ["rk2_cap", -8.2, 1.0, 2.6, 95, 1.1], ["rk2_slabs", -5.6, 0.0, 0.0, 18, 1.15],
    ["nat_slab", -5.6, -0.15, -1.9, 20, 1.2], ["rk2_pillars_low", -6.2, 0.4, 2.8, -8, 0.95],
    ["rk2_pillars_low", -2.6, -0.2, 0.2, 6, 1.0], ["rk2_grotto", 0.2, -0.15, 0.3, -4, 1.0], ["rk2_foot", -1.6, -0.3, -1.3, 2, 0.95],
    ["rk2_pillars_tall", -2.4, -0.6, 3.0, -2, 0.85], ["rk2_slabs", -0.4, 1.6, 3.4, 4, 1.05], ["rk2_pillars_low", 3.1, 0.0, 0.0, -5, 1.1],
    ["rk2_pillars_tall", 2.4, -0.2, 3.0, -3, 1.05],
    ["rk2_pillars_tall", 6.2, -0.1, 0.4, 2, 1.0], ["rk2_pillar", 4.6, -0.1, -1.1, 15, 0.95], ["rk2_pillars_tall", 9.4, -0.3, 0.6, -6, 0.95],
    ["rk2_pillar", 7.8, -0.2, -1.0, -10, 0.85], ["rk2_pillars_low", 12.4, 0.0, 0.6, 9, 1.15], ["rk2_foot", 9.4, -0.3, -1.6, 0, 1.1],
    ["rk2_foot", 5.2, -0.3, -1.8, -4, 1.0], ["rk2_pillars_tall", 6.6, 0.1, 3.2, 8, 1.1], ["rk2_pillars_tall", 10.4, -0.4, 3.4, -5, 1.0],
    ["rk2_pillars_low", 14.6, -0.2, 2.0, 25, 1.0], ["rk_step", 15.8, 0.0, -1.2, 30, 1.0],
  ];


  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const rot = new THREE.Matrix4().makeRotationY(yaw), Y = new THREE.Vector3(0, 1, 0);
  for (const [name, x, y, z, a, s] of L) {
    if (!field.kit.pieces[name]) continue;
    // (seen from the pond, i.e. looking +z, screen-right is -x: x is mirrored so the list reads left to right like o01)
    pos.set(-x, y, z); q.setFromAxisAngle(Y, Math.PI - THREE.MathUtils.degToRad(a)); sc.setScalar(s);
    m.compose(pos, q, sc).premultiply(rot);
    m.setPosition(m.elements[12] + origin.x, m.elements[13] + origin.y, m.elements[14] + origin.z);
    field.add(name, m);
  }
  return L.length;
}
