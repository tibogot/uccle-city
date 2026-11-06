// THE RAILWAY BRIDGES as heroes (tools/blender/railBridge.py -> models/rail/<name>.glb + <name>_ao.png + <name>.json).
//   const b = await loadBridge("stjob");   b.lods[k] = { meshes: [{ geometry, slot }], tris };   b.make(k) -> Group
//   b.placement = { position, rotationY }   b.info (the .json: deck, openings, measurements)
// The GLB has NAMED material slots (the shared library's names: brick_red_brussels, stone_blue, concrete,
// painted_metal_white), UV0 in metres and the baked AO in UV1: only light is baked, the look comes from the material.
// materialFor(slot) uses the library (viewer/materials/library.js, branch claude/materials) when it is there, else the
// procedural stand-ins below (same names, same UV0 contract), so the heroes switch to the library without a re-export.
// LODs: LOD0 = the Blender mesh; LOD1 / LOD2 by meshoptimizer on a position-welded index (as viewer/stjobModel.js),
// cross-faded with the dither (lodFade.js objectFade) by the caller.
import * as THREE from "three/webgpu";
import { attribute, uv, texture, float, vec2, vec3, floor, fract, mix, smoothstep, clamp, fwidth, max, abs, step, color, positionWorld, normalWorld, mrt } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { hash2D, noise2D, filteredPulse, bumpNormal } from "../tslkit.js";

export const BRIDGE_LODS = [
  { ratio: 1, until: 140 },
  { ratio: 0.3, until: 420 },
  { ratio: 0.06, until: Infinity, prune: true },
];
export const BRIDGES = ["stjob", "calevoet"];
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
    gltf.scene.traverse((o) => { if (o.isMesh) prims.push({ geometry: o.geometry, slot: o.material.name }); });
    const tris0 = prims.reduce((s, p) => s + p.geometry.index.count / 3, 0);
    const lods = BRIDGE_LODS.map(({ ratio, prune }) => {
      if (ratio >= 1) return { meshes: prims, tris: tris0 };
      const meshes = prims.map(({ geometry: g, slot }) => {
        const want = Math.min(g.index.count, Math.max(12, Math.floor((g.index.count / 3) * ratio)) * 3);
        const s = new THREE.BufferGeometry();
        for (const k of Object.keys(g.attributes)) s.setAttribute(k, g.attributes[k]);
        s.setIndex(want >= g.index.count ? g.index : new THREE.BufferAttribute(simplifyWelded(g, want, prune), 1));
        return { geometry: s, slot };
      });
      return { meshes, tris: meshes.reduce((s, m) => s + m.geometry.index.count / 3, 0) };
    });
    for (const l of lods) for (const m of l.meshes) { m.geometry.computeBoundingSphere(); m.geometry.userData.shared = true; }
    const materials = {};
    for (const p of prims) materials[p.slot] ??= await materialFor(p.slot, aoTex);
    const pl = info.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const make = (k) => {
      const g = new THREE.Group(); g.name = `bridge-${name}-lod${k}`;
      for (const { geometry, slot } of lods[k].meshes) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.castShadow = true; m.receiveShadow = true; g.add(m);
      }
      return g;
    };
    return { name, lods, materials, info, placement, make, aoTex };
  })());
  return cache.get(name);
}

/** A placed bridge with smooth LODs: returns { group, update(camPos) }. */
export function placeBridge(b, { smooth = true, objectFade = null } = {}) {
  const group = new THREE.Group(); group.name = `bridge-${b.name}`;
  group.position.copy(b.placement.position); group.rotation.y = b.placement.rotationY;
  const levels = BRIDGE_LODS.map((_, k) => b.make(k));
  group.add(...levels);
  if (smooth && objectFade) for (const m of Object.values(b.materials)) objectFade(m);
  const BANDS = [0.15, 0.12];
  const ramp = (d, k) => { const s = BRIDGE_LODS[k].until, w = s * BANDS[k]; return THREE.MathUtils.smoothstep(d, s - w, s + w); };
  const c = new THREE.Vector3();
  const update = (camPos) => {
    c.set(0, 5, 0).applyMatrix4(group.matrixWorld);
    const d = camPos.distanceTo(c), t1 = ramp(d, 0), t2 = ramp(d, 1);
    if (!smooth) { levels.forEach((g, k) => { g.visible = k === (t1 < 0.5 ? 0 : t2 < 0.5 ? 1 : 2); }); return; }
    const fades = [2 + t1, t1 < 1 ? t1 : 2 + t2, t2];
    const shown = [t1 < 1, t1 > 0 && t2 < 1, t2 > 0];
    levels.forEach((g, k) => { g.visible = shown[k]; if (shown[k]) g.traverse((o) => { o.userData.fade = fades[k]; }); });
  };
  return { group, levels, update };
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
  if (slot === "brick_red_brussels") {
    // Brussels red brick, running bond: 21 x 6.5 cm bricks, 1 cm lime joints (course 7.5 cm, pitch 22 cm)
    const row = floor(p.y.div(0.075));
    const off = fract(row.mul(0.5)).mul(0.22);
    const col = floor(p.x.add(off).div(0.22));
    const h = hash2D(vec2(col, row)), h2 = hash2D(vec2(row, col.add(17)));
    const brick = mix(color(0x8c4b3a), color(0x62301f), h.mul(h)).mul(mix(0.85, 1.12, h2));
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
  } else if (slot === "painted_metal_white") {
    m.colorNode = mix(color(0xd9d8d2), color(0x8b5a3a), smoothstep(0.75, 0.95, noise2D(p.mul(3.0))).mul(0.4));
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
function simplifyWelded(g, want, prune) {
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
  const [out] = MeshoptSimplifier.simplify(ci, new Float32Array(cpos), 3, want, 2.0, prune ? ["ErrorAbsolute", "Prune"] : ["ErrorAbsolute"]);
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
