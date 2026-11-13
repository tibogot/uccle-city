// THE EGLISE NOTRE-DAME DU ROSAIRE (Uccle; tools/blender/rosaire.py -> tools/hero_pack.mjs -> models/rosaire/), for the
// city (?rosaire=0 = off). Same contract as Saint-Pierre (viewer/stpierreModel.js) and the Russian church (russianModel.js):
//
// The GLB carries geometry only: one primitive per NAMED material slot (RO_SLOTS) per level of detail, a per-face code in
// COLOR_0.r (RO_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and the
// baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity). New name (not in
//     viewer/materials/ yet): "rubble_stone" (coursed rubble sandstone); it resolves to the temporary TSL version;
//   - SOURCE is the ONE line that picks the library (viewer/materials/shipped.js) or the temporary materials;
//   - every slot material is wrapped with the model's baked AO (lighting only); the dithered LOD cross-fade comes from
//     lodFade.js through setLodFades (shared with Saint-Pierre).
// LODs: LOD0 = the Blender model, LOD1 = LOD0 simplified (meshoptimizer, shares LOD0's vertex buffers), LOD2 = the
// script's far variant trimmed.
import * as THREE from "three/webgpu";
import { attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot, max, min,
  mod, mrt, uniform, Fn, vec4, fwidth } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { bumpNormal } from "./tslkit.js";
import { loadAO, setLodFades, SP_TEMP_MATERIALS } from "./stpierreModel.js";
import { RU_TEMP_MATERIALS } from "./russianModel.js";
import { libSource } from "./materials/libSwitch.js";

export { setLodFades };
export const RO_SLOTS = ["rubble_stone", "stone_blue", "slate", "zinc_roof", "wood_frame_dark", "glass_window", "cast_iron_green"];
export const NEW_NAMES = ["rubble_stone"];
export const SLOT_TABLE = Object.fromEntries(RO_SLOTS.map((s) => [s, s]));
export const RO_CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
  "gilt", "door", "mosaic", "frame", "lead"];
/** LOD switch distances (m, camera to the building's box) and each cross-fade band's half-width (a small building) */
export const RO_LODS = [{ until: 110, band: 18 }, { until: 420, band: 50 }, { until: Infinity }];
const GROUND = 102.4;

const SOURCE = libSource("rosaire", "./materials/shipped.js");
export const roLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0) };

let promise = null;
export function loadRosaire() {
  return (promise ??= (async () => {
    const base = new URL("../models/rosaire/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lodsJson, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "rosaire.glb"),
      fetch(base + "rosaire.json").then((r) => r.json()),
      fetch(base + "rosaire.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "rosaire_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[rosaire] material library not loaded:", e.message); return null; }),
    ]);
    const names = ["Rosaire", "Rosaire_lod1", "Rosaire_lod2"];
    const lods = names.map(() => []);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1;
      for (let p = o; p && k < 0; p = p.parent) k = names.indexOf(p.name);
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      if (k >= 0) lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0));
    const materials = {};
    for (const s of RO_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `rosaire_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material;
        m.castShadow = slot !== "glass_window"; m.receiveShadow = true;
        g.add(m);
      }
      groups.push(g);
      return g;
    };
    const setSlotMaterial = (slot, mat) => {
      const w = wrapAO(mat, aoTex, slot);
      materials[slot] = w;
      for (const g of groups) g.traverse((o) => { if (o.isMesh && o.userData.slot === slot) { o.userData.base = w; o.material = w; } });
      return w;
    };
    const tmp = new THREE.Vector3();
    const distance = (p) => boundsWorld.distanceToPoint(tmp.copy(p));
    return { lods, tris, materials, notes, placement, boundsWorld, make, setSlotMaterial, distance, aoTex, glbBytes: lodsJson.glbBytes,
      aoBytes: aoTex.userData.bytes, drawCalls: lods.map((l) => l.length) };
  })());
}

function sourceMaterial(name, lib) {
  let m = null;
  if (lib && !NEW_NAMES.includes(name)) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? lib.getMaterial?.(name) ?? null; }
    catch (e) { console.warn(`[rosaire] library failed on "${name}":`, e.message); }
  }
  return m ?? (TEMP[name] ?? SP_TEMP_MATERIALS[name] ?? TEMP.rubble_stone)();
}

/** the baked AO (lighting only) on a slot material: lightmap AO x the thin parts' vertex AO; part of it darkens the colour */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `rosaire ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, roLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, roLook.aoDirect));
  }
  m.userData.shared = true; m.userData.slot = slot;
  return m;
}

// ------------------------------------------------------------------------------------------------ temporary materials
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const vnoise = (p) => {
  const i = floor(p).toVar(), f = fract(p).toVar(), u = f.mul(f).mul(float(3).sub(f.mul(2))).toVar();
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
};
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const codeV = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (cd, k) => float(1).sub(clamp(abs(cd.sub(k)), 0, 1));
const C = Object.fromEntries(RO_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, float(1), float(0)) }); return m; };

/** weathering outside the pattern Fn (normalWorld inside a Fn shared by the colour and the normal breaks the WGSL):
 *  splash grime at the foot, faint streaks under ledges on the walls, ledge tops a touch greyer */
function weather(col) {
  const P = positionWorld;
  const up = clamp(normalWorld.y, 0, 1);
  const low = smoothstep(GROUND + 1.0, GROUND, P.y);
  const n = vnoise(vec2(P.x.add(P.z).mul(0.9), P.y.mul(0.7)));
  const streak = smoothstep(0.66, 0.92, n).mul(float(1).sub(up)).mul(0.07);
  return col.mul(float(1).sub(streak.add(low.mul(0.1)).mul(roLook.weather))).mul(mix(float(1), float(0.9), up.mul(0.5).mul(roLook.weather)));
}

const TEMP = {
  /** COURSED RUBBLE SANDSTONE (Commons August Dominus 2025, Grentidez 2018): roughly squared stones in brick-like courses
   *  of uneven height, lengths 0.22-0.52 m, grey-ochre with brown, honey and a few dark grey stones; recessed grey mortar
   *  joints (the bump); dressed parts (codes other than plain / plinth) smooth */
  rubble_stone: () => {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const coursed = isC(cd, C.plain).add(isC(cd, C.plinth)).min(1).toVar();
      const rv = w.y.div(0.17).toVar(), row = floor(rv).toVar();
      const hr = hash2(vec2(row, 3.0)).toVar();
      const fv = fract(rv).toVar();
      const L = hr.mul(0.3).add(0.22).toVar();
      const cu = w.x.add(hash2(vec2(row, 9.0)).mul(2.0)).div(L).toVar(), cell = floor(cu).toVar(), fu = fract(cu).toVar();
      const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00005).toVar();
      const e = min(min(fu, float(1).sub(fu)).mul(L), min(fv, float(1).sub(fv)).mul(0.17)).toVar();
      const joint = float(1).sub(smoothstep(0.008, float(0.008).add(max(fw.mul(1.5), 0.006)), e)).mul(float(1).sub(smoothstep(0.006, 0.03, fw))).mul(coursed).toVar();
      const h = hash2(vec2(cell, row)).toVar(), h2 = hash2(vec2(cell.add(7.0), row.mul(1.7))).toVar();
      const s0 = mix(lin(0x9a8a6e), lin(0xb3a07c), h);
      const s1 = mix(s0, lin(0x7a7066), step(0.86, h2).mul(0.7));
      const stone = mix(s1, lin(0xb39566), step(0.9, h).mul(0.6));
      const grain = vnoise(w.mul(7.0)).mul(0.1).toVar();
      const col = mix(lin(0x9a8c74), stone.mul(float(0.92).add(grain)), coursed);
      return vec4(mix(col, lin(0x847c70), joint.mul(0.6)), joint);
    })();
    return std({ colorNode: weather(out.xyz), roughnessNode: float(0.9), metalnessNode: float(0), normalNode: bumpNormal(out.w.mul(-0.004)) });
  },
  cast_iron_green: () => RU_TEMP_MATERIALS.cast_iron_green(),
};
export const RO_TEMP_MATERIALS = TEMP;
