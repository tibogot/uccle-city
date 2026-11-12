// THE RAILWAY BRIDGES as heroes (tools/blender/railBridge.py -> models/rail/<name>.glb + <name>_ao.png + <name>.json).
//   const b = await loadBridge("stjob");   b.lods[k] = { meshes: [{ geometry, slot }], tris };   b.make(k) -> Group
//   b.placement = { position, rotationY }   b.info (the .json: deck, openings, measurements)
// The GLB has NAMED material slots (the shared library's names: brick_red_brussels, stone_blue, concrete,
// painted_metal_white), UV0 in metres and the baked AO in UV1: only light is baked, the look comes from the material.
// materialFor(slot) uses the library (viewer/materials/library.js, branch claude/materials) when it is there, else the
// procedural stand-ins below (same names, same UV0 contract), so the heroes switch to the library without a re-export.
// LODs: LOD0 = the Blender mesh; LOD1 / LOD2 by meshoptimizer on a position-welded index (as viewer/stjobModel.js),
// cross-faded with the dither: a level draws its slot materials' FADING COPIES (lodFade fadeVariant, the dithered
// discard) only while it is inside a hand-over band, its own opaque materials otherwise (early-z kept; the town hall's
// setLodFades). Road bridges (tools/blender/roadBridge.py: "verrewinkel") carry a second node "<name>_foot" (the 2022
// footbridge + mesh railings): placeBridge({ foot: false }) leaves it out (the 2021 photo compare).
// warmBridge(): the shaders (+ the fading copies) through the page's precompile, then the shadow pass drawn once far
// under the city (async pipelines): nothing is built on a frame when the bridge shows or hands over.
import * as THREE from "three/webgpu";
import { attribute, uv, texture, float, vec2, vec3, floor, fract, mix, smoothstep, clamp, fwidth, max, abs, step, color, positionWorld, normalWorld, mrt } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { hash2D, noise2D, filteredPulse, bumpNormal } from "../tslkit.js";
import { SMOOTH, fadeVariant, fadeProxies } from "../lodFade.js";

export const BRIDGE_LODS = [
  { ratio: 1, until: 140 },
  { ratio: 0.3, until: 420 },
  { ratio: 0.06, until: Infinity, prune: true },
];
export const BRIDGES = ["stjob", "calevoet", "verrewinkel"];
/** Road bridges (roadBridge.py), per level: which slots are dropped (thin railings, benches, glass), which are
 *  simplified by meshoptimizer with an ERROR bound in metres (not a ratio: the planar walls stay planar, the proud details
 *  never collapse into them) and then FLAT-shaded (a simplified facet keeps no smooth corner normal from LOD0); the arch
 *  rings (node "<name>_fine", 12-20 mm proud) are LOD0 only. tools/verrewinkel_lods.mjs runs this same recipe through the
 *  mesh checker. */
export const ROAD_BRIDGE_LODS = [
  {},
  { drop: ["painted_metal_grey", "wood_frame_dark", "wire_mesh_grey"], simplify: {} },                      // an exact subset of LOD0: 0 checker items
  { drop: ["painted_metal_grey", "wood_frame_dark", "glass_window", "wire_mesh_grey"], simplify: { "*": 0.06 }, prune: true },
];
const cache = new Map();

export function loadBridge(name) {
  if (!cache.has(name)) cache.set(name, (async () => {
    const base = new URL("../../models/rail/", import.meta.url).href;
    const [gltf, info, aoTex] = await Promise.all([
      new GLTFLoader().loadAsync(`${base}${name}.glb`),
      fetch(`${base}${name}.json`).then((r) => r.json()),
      loadAO(`${base}${name}_ao.png`),
    ]);
    await MeshoptSimplifier.ready;
    const prims = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const node = o.parent && o.parent !== gltf.scene && !o.parent.isMesh ? o.parent.name : o.name;
      prims.push({ geometry: o.geometry, slot: o.material.name, foot: /_foot$/.test(node), fine: /_fine$/.test(node) });
    });
    const tris0 = prims.reduce((s, p) => s + p.geometry.index.count / 3, 0);
    const road = info.kind === "road_over_rail";
    const lods = road ? ROAD_BRIDGE_LODS.map(({ drop, simplify, prune }, k) => {
      if (!k) return { meshes: prims, tris: tris0 };
      const meshes = prims.filter((q) => !q.fine && !drop.includes(q.slot)).map(({ geometry: g, slot, foot }) => {
        const err = simplify[slot] ?? simplify["*"];
        if (err == null) return { geometry: g, slot, foot };
        let s = new THREE.BufferGeometry();
        for (const a of Object.keys(g.attributes)) s.setAttribute(a, g.attributes[a]);
        s.setIndex(new THREE.BufferAttribute(simplifyWelded(g, 3, prune, err), 1));
        s = s.toNonIndexed(); s.deleteAttribute("normal"); s.computeVertexNormals();
        return { geometry: s, slot, foot };
      });
      return { meshes, tris: 0 };
    }) : BRIDGE_LODS.map(({ ratio, prune }) => {
      if (ratio >= 1) return { meshes: prims, tris: tris0 };
      const meshes = prims.map(({ geometry: g, slot, foot }) => {
        const want = Math.min(g.index.count, Math.max(12, Math.floor((g.index.count / 3) * ratio)) * 3);
        const s = new THREE.BufferGeometry();
        for (const k of Object.keys(g.attributes)) s.setAttribute(k, g.attributes[k]);
        s.setIndex(want >= g.index.count ? g.index : new THREE.BufferAttribute(simplifyWelded(g, want, prune), 1));
        return { geometry: s, slot, foot };
      });
      return { meshes, tris: 0 };
    });
    for (const l of lods) for (const m of l.meshes) { m.geometry.computeBoundingSphere(); m.geometry.userData.shared = true; }
    for (const l of lods) l.tris = l.meshes.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
    const materials = {};
    for (const p of prims) materials[p.slot] ??= await materialFor(p.slot, aoTex);
    const pl = info.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const make = (k, { foot = true } = {}) => {
      const g = new THREE.Group(); g.name = `bridge-${name}-lod${k}`;
      for (const { geometry, slot, foot: isFoot } of lods[k].meshes) {
        if (isFoot && !foot) continue;
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.castShadow = !materials[slot].transparent && !materials[slot].userData.noShadow; m.receiveShadow = true;
        m.userData.base = m.material; m.userData.foot = !!isFoot;
        g.add(m);
      }
      return g;
    };
    return { name, lods, materials, info, placement, make, aoTex };
  })());
  return cache.get(name);
}

/** A placed bridge with smooth LODs: returns { group, levels, update(camPos), state }. The level meshes draw their own
 *  (opaque) materials outside the hand-over bands and their fading copies inside them. */
export function placeBridge(b, { smooth = SMOOTH, foot = true } = {}) {
  const group = new THREE.Group(); group.name = `bridge-${b.name}`;
  group.position.copy(b.placement.position); group.rotation.y = b.placement.rotationY;
  const levels = BRIDGE_LODS.map((_, k) => b.make(k, { foot }));
  group.add(...levels);
  const BANDS = [0.15, 0.12];
  const ramp = (d, k) => { const s = BRIDGE_LODS[k].until, w = s * BANDS[k]; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
  const c = new THREE.Vector3(), centre = new THREE.Vector3(0, b.info.kind === "road_over_rail" ? 6 : 5, 0);
  const state = { d: 0, shown: [true, false, false], fades: [1, 1, 1] };
  const update = (camPos) => {
    c.copy(centre).applyMatrix4(group.matrixWorld);
    const d = camPos.distanceTo(c), t1 = ramp(d, 0), t2 = ramp(d, 1);
    state.d = d;
    if (!smooth) { levels.forEach((g, k) => { g.visible = k === (t1 < 0.5 ? 0 : t2 < 0.5 ? 1 : 2); }); return; }
    // fade codes (lodFade objectFadeKeep): t in (0, 1) = fading in, 2 + t = fading out, 1 = whole
    const fades = [t1 > 0 ? 2 + t1 : 1, t1 < 1 ? t1 : (t2 > 0 ? 2 + t2 : 1), t2 < 1 ? t2 : 1];
    const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
    state.shown = shown; state.fades = fades;
    setLodFades(levels, shown, fades);
  };
  return { group, levels, update, state };
}

/** a level draws its fading copies only while its fade is strictly inside a band (1 = whole) */
export function setLodFades(levels, shown, fades) {
  for (let k = 0; k < levels.length; k++) {
    const g = levels[k]; g.visible = shown[k];
    if (!shown[k]) continue;
    const f = fades[k], whole = !SMOOTH || f === 1 || f <= 0 || f >= 3;
    for (const o of g.children) {
      o.userData.fade = whole ? 1 : f;
      const base = o.userData.base ?? o.material;
      const want = whole || base.transparent ? base : fadeVariant(base);
      if (o.material !== want) o.material = want;
    }
  }
}

/** Build everything before the bridge shows: the shaders of every level (and their fading copies) through compile(),
 *  then the SHADOW pass (not in compileAsync): each mesh drawn once, a few per frame, 4 km under the city with the
 *  pipelines created async (the villa van Buuren's warm-up). Resolves with { ms, draws }. */
export async function warmBridge(pb, { compile = null, renderer = null, scene = null, openParallel = null, perFrame = 4 } = {}) {
  const t0 = performance.now();
  if (compile) {
    await compile([pb.group]);
    const px = fadeProxies(pb.group); if (px) await compile([px]);
  }
  if (!renderer || !scene) return { ms: performance.now() - t0, draws: 0 };
  const meshes = []; pb.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  const g = new THREE.Group(); g.name = `${pb.group.name}-warm`; g.position.set(0, -4000, 0); scene.add(g);
  const win = openParallel ? openParallel(renderer, scene) : null;
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const draw = async (n) => {
    for (let i = 0; i < meshes.length; i += n) {
      g.clear();
      for (const o of meshes.slice(i, i + n)) {
        const base = o.userData.base ?? o.material;
        for (const mat of base.transparent ? [base] : [base, fadeVariant(base)]) {
          const p = new THREE.Mesh(o.geometry, mat);
          p.castShadow = o.castShadow; p.receiveShadow = o.receiveShadow; p.frustumCulled = false; p.userData = { fade: 0.5 };
          g.add(p);
        }
      }
      await frame();
    }
  };
  await draw(perFrame);
  if (win) await win.end();
  await draw(12);
  g.clear(); scene.remove(g);
  return { ms: performance.now() - t0, draws: meshes.length };
}

// ------------------------------------------------------------------------------------------------ road bridges: deck + colliders
/** A road bridge's frame helpers from its notes (models/rail/<name>.json, kind "road_over_rail"). */
function roadFrame(info) {
  const th = -info.placement.rotation_y_rad, c = Math.cos(th), s = Math.sin(th);
  const [px, py, pz] = info.placement.city_local_position;
  const toLocal = (x, z) => { const dx = x - px, dz = z - pz; return [dx * c + dz * s, -(-dx * s + dz * c)]; };
  const toWorld = (X, Y) => [px + X * c + Y * s, pz + X * s - Y * c];
  const d = info.deck, [r0, r1] = d.road_ends;
  const road = (X) => r0 + (Math.max(d.x0, Math.min(d.x1, X)) - d.x0) * (r1 - r0) / (d.x1 - d.x0);
  const faceY = (X, base) => base + d.flare * Math.max(0, (Math.abs(X) - d.fold) / (d.x1 - d.fold));
  return { toLocal, toWorld, road, faceY, d, floor: py };
}

/** (x, z) -> the walking / driving surface on a road bridge's deck (m TAW), or null off it: the roadway, the NE
 *  sidewalk (+0.13), the SW strip, and the footbridge's deck. Used by walk / drive / third-person heights: the terrain
 *  under the bridge is the cutting. */
export function deckHeightFn(info) {
  if (info.kind !== "road_over_rail") return () => null;
  const F = roadFrame(info), d = F.d, f = info.foot;
  return (x, z) => {
    const [X, Y] = F.toLocal(x, z);
    if (X < d.x0 - 0.6 || X > d.x1 + 0.6) return null;
    const yi = F.faceY(X, d.parapet_inner);
    if (Math.abs(Y) <= yi) {
      const r = F.road(X);
      if (Y >= d.kerb_ne) return r + d.sidewalk_ne;
      if (Y <= d.kerb_sw) return r + d.strip_sw[1] + (d.strip_sw[0] - d.strip_sw[1]) * (d.kerb_sw - Y) / (d.kerb_sw + yi);
      return r;
    }
    if (f && X >= f.x0 && X <= f.x1) {
      const w = X >= f.x_flare ? f.w : f.w + (f.w_nw - f.w) * (f.x_flare - X) / (f.x_flare - f.x0);
      if (Y <= f.y_inner && Y >= f.y_inner - w) return F.road(X) - f.top_under_road + (X - Math.max(d.x0, Math.min(d.x1, X))) * d.grade;
    }
    return null;
  };
}

/** Drive colliders (driveMode addStatic): the two parapets and the footbridge's outer parapet, as plan rings. */
export function roadBridgeColliders(info) {
  if (info.kind !== "road_over_rail") return [];
  const F = roadFrame(info), d = F.d, f = info.foot, rings = [];
  const wall = (sg) => {
    const xs = [d.x0, -d.fold, d.fold, d.x1], inner = xs.map((X) => F.toWorld(X, sg * F.faceY(X, d.parapet_inner)));
    const outer = xs.map((X) => F.toWorld(X, sg * F.faceY(X, d.parapet_inner + 0.42))).reverse();
    return inner.concat(outer);
  };
  rings.push(wall(1), wall(-1));
  if (f) {
    const xs = [f.x0, f.x_flare, f.x1], W = (X) => (X >= f.x_flare ? f.w : f.w_nw);
    rings.push(xs.map((X) => F.toWorld(X, f.y_inner - W(X))).concat(xs.slice().reverse().map((X) => F.toWorld(X, f.y_inner - W(X) - 0.3))));
  }
  return [{ rings, kind: 5 }];
}

async function loadAO(url) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const cx = c.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const rgba = cx.getImageData(0, 0, img.width, img.height).data;
  const r = new Uint8Array(img.width * img.height);
  for (let i = 0; i < r.length; i++) r[i] = rgba[i * 4];
  const t = new THREE.DataTexture(r, img.width, img.height, THREE.RedFormat, THREE.UnsignedByteType);
  t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------------------------------------ materials by slot
let library;          // undefined: not tried; null: absent (foundation); else the module
export async function materialFor(slot, aoTex) {
  if (library === undefined) library = await import("../materials/library.js").catch(() => null);
  const ao = texture(aoTex, uv(1)).r;
  const aoK = mix(float(1), ao, 0.95);
  if (library?.DEFS?.[slot]) {
    const m = library.createMaterial(slot, { mapping: "uv" });
    m.aoNode = m.aoNode ? m.aoNode.mul(aoK) : aoK;
    m.userData.shared = true;
    return m;
  }
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
  const p = uv();                              // metres: x along the face, y up it
  const fw = max(fwidth(p.x), fwidth(p.y)).max(0.0005);
  if (slot === "brick_red_brussels" || slot === "brick_yellow") {
    const yel = slot === "brick_yellow";       // the Calevoet arch rings: a paler, sandier brick (photo)
    // Brussels red brick, running bond: 21 x 6.5 cm bricks, 1 cm lime joints (course 7.5 cm, pitch 22 cm)
    const row = floor(p.y.div(0.075));
    const off = fract(row.mul(0.5)).mul(0.22);
    const col = floor(p.x.add(off).div(0.22));
    const h = hash2D(vec2(col, row)), h2 = hash2D(vec2(row, col.add(17)));
    const brick = (yel ? mix(color(0xb08d62), color(0x8d6e4a), h.mul(h)) : mix(color(0x8c4b3a), color(0x62301f), h.mul(h))).mul(mix(0.85, 1.12, h2));
    const burnt = step(0.93, hash2D(vec2(col.add(5), row.add(3))));
    const tone = mix(brick, color(0x3e2420), burnt.mul(0.6)).mul(mix(0.9, 1.08, noise2D(p.mul(0.35))));
    const jv = filteredPulse(p.y.div(0.075), float(0), float(0.01 / 0.075), fw.div(0.075));
    const jh = filteredPulse(p.x.add(off).div(0.22), float(0), float(0.01 / 0.22), fw.div(0.22));
    const joint = max(jv, jh);
    const mortar = color(0x9e978b).mul(mix(0.75, 1.0, noise2D(p.mul(1.3))));
    m.colorNode = mix(tone, mortar, joint);
    m.roughnessNode = mix(float(0.86), float(0.95), joint);
    // the joints are recessed: a little relief near the camera (fades with the footprint)
    const relief = joint.mul(-0.006).mul(float(1).sub(smoothstep(0.004, 0.02, fw)));
    m.normalNode = bumpNormal(relief);
  } else if (slot === "stone_blue") {
    // petit granit (Belgian blue stone), weathered to the pale grey of the photos, tooled and stained
    const n1 = noise2D(p.mul(2.1)), n2 = noise2D(p.mul(0.4)), spot = hash2D(floor(p.mul(40)));
    const base = mix(color(0x9a9c9c), color(0x6e7275), n1.mul(0.6).add(n2.mul(0.4)));
    const streak = smoothstep(0.55, 0.9, noise2D(vec2(p.x.mul(1.6), p.y.mul(0.15)))).mul(0.18);
    m.colorNode = base.mul(mix(0.94, 1.04, spot)).mul(float(1).sub(streak));
    m.roughnessNode = float(0.8);
    m.normalNode = bumpNormal(noise2D(p.mul(9.0)).mul(0.0015).mul(float(1).sub(smoothstep(0.003, 0.012, fw))));
  } else if (slot === "asphalt") {
    // old, fine asphalt, slightly patched (the deck of a residential lane)
    const n1 = noise2D(p.mul(0.6)), grit = hash2D(floor(p.mul(90)));
    m.colorNode = mix(color(0x3b3b3c), color(0x4c4b49), n1).mul(mix(0.9, 1.08, grit));
    m.roughnessNode = float(0.9);
  } else if (slot === "paving_concrete") {
    // concrete slabs 30 x 30 (sidewalk) and the kerbs: grey, joints
    const j = max(filteredPulse(p.x.div(0.3), float(0), float(0.02), fw.div(0.3)), filteredPulse(p.y.div(0.3), float(0), float(0.02), fw.div(0.3)));
    m.colorNode = mix(mix(color(0x8c8a84), color(0x9d9a92), noise2D(p.mul(1.7))), color(0x5d5b57), j.mul(0.6));
    m.roughnessNode = float(0.88);
  } else if (slot === "resin_terracotta") {
    // the footbridge's walking surface: a terracotta resin with fine aggregate
    m.colorNode = mix(color(0x93604f), color(0xa2705d), noise2D(p.mul(0.8))).mul(mix(0.93, 1.05, hash2D(floor(p.mul(120)))));
    m.roughnessNode = float(0.8);
  } else if (slot === "painted_metal_grey") {
    m.colorNode = mix(color(0x6d7072), color(0x7d8082), noise2D(p.mul(2.0)));
    m.roughnessNode = float(0.5); m.metalnessNode = float(0.35);
  } else if (slot === "wire_mesh_grey") {
    // galvanised welded mesh, 50 x 200 mm: the wires box-filtered by the pixel footprint (coverage -> alpha, drawn with
    // alpha-to-coverage): far away it becomes an even grey veil, no sub-pixel wire to sparkle
    const v = filteredPulse(p.x.div(0.05), float(0), float(0.005 / 0.05), fw.div(0.05));
    const h = filteredPulse(p.y.div(0.2), float(0), float(0.006 / 0.2), fw.div(0.2));
    m.colorNode = mix(color(0x8a8e90), color(0x9da1a3), noise2D(p.mul(1.5)));
    m.opacityNode = clamp(max(v, h), 0, 1);
    m.alphaToCoverage = true;
    m.roughnessNode = float(0.45); m.metalnessNode = float(0.5);
    m.userData.noShadow = true;
  } else if (slot === "glass_window") {
    m.colorNode = color(0x9fb2b4); m.roughnessNode = float(0.05); m.metalnessNode = float(0.0);
    m.transparent = true; m.opacity = 0.28; m.depthWrite = false;
  } else if (slot === "wood_frame_dark") {
    const g = fract(p.x.mul(1.3).add(noise2D(p.mul(vec2(0.4, 6.0))).mul(0.6)));
    m.colorNode = mix(color(0x5b3b24), color(0x7a5434), smoothstep(0.2, 0.8, g));
    m.roughnessNode = float(0.75);
  } else if (slot === "painted_metal_white") {
    m.colorNode = mix(color(0xb9b9b4), color(0x8b5a3a), smoothstep(0.75, 0.95, noise2D(p.mul(3.0))).mul(0.25));
    m.roughnessNode = float(0.55); m.metalnessNode = float(0.2);
  } else {      // concrete
    m.colorNode = mix(color(0x87837c), color(0x9c978e), noise2D(p.mul(0.9)));
  }
  m.aoNode = aoK;
  m.name = slot;
  m.userData.shared = true;
  return m;
}

/** meshoptimizer on a position-welded index, each new corner given back the original vertex whose normal best fits
 *  the new triangle (UVs, normals stay right on the faces that survive). Prune drops small loose parts. */
function simplifyWelded(g, want, prune, error = 2.0) {
  const P = g.attributes.position.array, Nn = g.attributes.normal.array, I = g.index.array;
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const flags = ["ErrorAbsolute"]; if (prune) flags.push("Prune");
  const [out] = MeshoptSimplifier.simplify(ci, new Float32Array(cpos), 3, want, error, flags);
  const res = new Uint32Array(out.length), C = cpos;
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = members[out[t + k]][0], bd = -Infinity;
      for (const v of members[out[t + k]]) { const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz; if (d > bd) { bd = d; best = v; } }
      res[t + k] = best;
    }
  }
  return res;
}
