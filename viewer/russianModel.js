// THE RUSSIAN ORTHODOX CHURCH OF SAINT-JOB (Avenue De Fre 19; tools/blender/russian.py -> tools/hero_pack.mjs ->
// models/russian/), for the city (?russian=0 = off). Same contract as Saint-Pierre (viewer/stpierreModel.js):
//
// The GLB carries geometry only: one primitive per NAMED material slot (RU_SLOTS) per level of detail, a per-face code in
// COLOR_0.r (RU_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and the
// baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity). New names (not in
//     viewer/materials/ yet): "brick_painted_white" (the walls: brick under thick white paint) and "copper_brown"
//     (shared with Saint-Pierre); until the library has them they resolve to the temporary TSL versions;
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
import { libSource } from "./materials/libSwitch.js";

export { setLodFades };
export const RU_SLOTS = ["brick_painted_white", "stone_blue", "copper_brown", "zinc_roof", "wood_frame_dark", "glass_window", "cast_iron_green"];
export const NEW_NAMES = ["brick_painted_white", "copper_brown"];
export const SLOT_TABLE = Object.fromEntries(RU_SLOTS.map((s) => [s, s]));
export const RU_CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
  "gilt", "door", "mosaic", "frame", "lead"];
/** LOD switch distances (m, camera to the building's box) and each cross-fade band's half-width (a small building) */
export const RU_LODS = [{ until: 80, band: 14 }, { until: 320, band: 40 }, { until: Infinity }];
const GROUND = 48.3;

const SOURCE = libSource("russian", "./materials/shipped.js");
export const ruLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0) };

let promise = null;
export function loadRussian() {
  return (promise ??= (async () => {
    const base = new URL("../models/russian/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lodsJson, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "russian.glb"),
      fetch(base + "russian.json").then((r) => r.json()),
      fetch(base + "russian.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "russian_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[russian] material library not loaded:", e.message); return null; }),
    ]);
    const names = ["Russian", "Russian_lod1", "Russian_lod2"];
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
    for (const s of RU_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `russian_lod${k}`;
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
    catch (e) { console.warn(`[russian] library failed on "${name}":`, e.message); }
  }
  return m ?? (TEMP[name] ?? SP_TEMP_MATERIALS[name] ?? TEMP.brick_painted_white)();
}

/** the baked AO (lighting only) on a slot material: lightmap AO x the thin parts' vertex AO; part of it darkens the colour */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `russian ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, ruLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, ruLook.aoDirect));
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
const C = Object.fromEntries(RU_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, float(1), float(0)) }); return m; };

const TEMP = {
  /** BRICK UNDER THICK WHITE PAINT (photos 2015-2017: the coursing reads through, a soft off-white, faint grime at the
   *  foot and under the cornice): stretcher bond 0.22 x 0.065 courses with shallow, softened joints; mouldings and
   *  sculpted parts (codes) are smooth paint; old paint thinner in places (a slightly warmer patch noise) */
  brick_painted_white: () => {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const coursed = isC(cd, C.plain).add(isC(cd, C.plinth)).min(1).toVar();
      const cv = w.y.div(0.065).toVar(), row = floor(cv).toVar(), fv = fract(cv).toVar();
      const cu = w.x.div(0.22).add(mod(row, 2).mul(0.5)).toVar(), fu = fract(cu).toVar();
      const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00005).toVar();
      const e = min(min(fu, float(1).sub(fu)).mul(0.22), min(fv, float(1).sub(fv)).mul(0.065)).toVar();
      const joint = float(1).sub(smoothstep(0.004, float(0.004).add(max(fw.mul(1.5), 0.004)), e)).mul(float(1).sub(smoothstep(0.004, 0.02, fw))).mul(coursed).toVar();
      const brick = hash2(vec2(floor(cu), row)).toVar();
      const P = positionWorld;
      const n = vnoise(vec2(P.x.add(P.z).mul(0.9), P.y.mul(0.7))).toVar();
      let col = mix(lin(0xe9e8e2), lin(0xdedcd3), n.mul(0.7)).mul(float(0.97).add(brick.mul(0.04).mul(coursed)));
      col = mix(col, lin(0xc9c5bb), joint.mul(0.55));
      // weather: splash grime at the foot, faint streaks under ledges on the walls, ledge tops a touch greyer
      const up = clamp(normalWorld.y, 0, 1).toVar();
      const low = smoothstep(GROUND + 1.0, GROUND, P.y).toVar();
      const streak = smoothstep(0.66, 0.92, n).mul(float(1).sub(up)).mul(0.07);
      col = col.mul(float(1).sub(streak.add(low.mul(0.1)).mul(ruLook.weather))).mul(mix(float(1), float(0.9), up.mul(0.5).mul(ruLook.weather)));
      return vec4(col, joint);
    })();
    return std({ colorNode: out.xyz, roughnessNode: float(0.82), metalnessNode: float(0), normalNode: bumpNormal(out.w.mul(-0.0015)) });
  },
  /** the onions, the hoods, the belfry's tent: dark brown copper sheet (photos 2015-2017), seams a little brighter */
  copper_brown: () => {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const sheet = hash2(vec2(floor(w.x.div(0.45)), floor(w.y.div(1.6))));
      const c = mix(lin(0x3b2c22), lin(0x4a3628), sheet).toVar();
      return mix(c, c.mul(1.3), isC(codeV(), C.ridge));
    })();
    return noSSR(std({ colorNode: col, roughnessNode: float(0.5), metalnessNode: float(0.5) }));
  },
  /** iron parts: grilles and chains dark; the GILT balls and crosses; the portal's gold MOSAIC (the Virgin of
   *  Vladimir with two angels, Silbel V): gold tesserae with a soft figure of red-brown and blue in the middle */
  cast_iron_green: () => {
    const out = Fn(() => {
      const cd = codeV().toVar();
      const gilt = isC(cd, C.gilt).toVar(), mos = isC(cd, C.mosaic).toVar();
      const w = uv(0).toVar();
      const t = hash2(floor(w.mul(55.0))).toVar();
      const P = positionWorld;
      const gold = mix(lin(0xb88a2c), lin(0xe0b24a), t);
      // the figure: an oval of deep red-brown with a blue patch, centred in the tympanum (world-space blob from UV0)
      const fx = fract(w.x.mul(0.5)).sub(0.5).abs();
      const fig = smoothstep(0.32, 0.18, fx).mul(smoothstep(0.05, 0.45, fract(w.y.mul(0.55)))).toVar();
      const mosaic = mix(gold, mix(lin(0x6d2a22), lin(0x34477a), step(0.7, t)), fig.mul(0.8)).mul(float(0.85).add(t.mul(0.25)));
      const iron = lin(0x1d1e1e);
      return vec4(mix(mix(iron, gold, gilt), mosaic, mos), gilt.add(mos).min(1));
    })();
    const m = std({ colorNode: out.xyz, roughnessNode: mix(float(0.6), float(0.3), out.w), metalnessNode: mix(float(0.35), float(0.9), out.w) });
    return noSSR(m);
  },
};
export const RU_TEMP_MATERIALS = TEMP;
