// LANDMARK CHURCHES ROUND 5 (branch claude/landmark5): the models of the Eglise du Sacre-Coeur (Rue Vanderkindere;
// tools/blender/sacrecoeur.py) and the Eglise Saint-Marc (Avenue De Fre; tools/blender/saintmarc.py), and since castle1 the
// Chateau Latour de Frein (Rue Engeland 555; tools/blender/latourdefrein.py) -> tools/hero_pack.mjs
// --nolod -> models/<key>/. Same contract as Saint-Augustin (viewer/augustinModel.js): THREE SCRIPTED levels (LOD1 = the
// far variant, LOD2 = the very-far variant; no meshopt simplification, it streaks), one primitive per NAMED material slot
// per level, a per-face code in COLOR_0.r (L5_CODES), the thin parts' baked AO in COLOR_0.g, world-metre UVs in TEXCOORD_0,
// the baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   SOURCE (THE ONE LINE, viewer/materials/libSwitch.js consumer "landmark5") picks the shared library's shipped looks
//   where it has one (stone_blue, slate, brick_*), else the temporary TSL versions (Rosaire's rubble_stone, Saint-Pierre's
//   zinc / glass, the Russian church's cast iron, wood_oak below). Every temporary material goes through the city weather
//   (wxMat: rain, snow) like the library's; the windows glow at night through their emissive only (no lights).
//   const m = await loadChurch("sacrecoeur");  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import { attribute, uv, texture, vec2, vec3, float, floor, fract, mix, smoothstep, dot, max, min, uniform, Fn, vec4, fwidth } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { bumpNormal } from "./tslkit.js";
import { loadAO, SP_TEMP_MATERIALS } from "./stpierreModel.js";
import { RO_TEMP_MATERIALS } from "./rosaireModel.js";
import { RU_TEMP_MATERIALS } from "./russianModel.js";
import { libSource } from "./materials/libSwitch.js";
import { wxMat } from "./weather/cityWeatherize.js";
export { setLodFades } from "./stpierreModel.js";

export const L5_CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
  "gilt", "door", "mosaic", "frame", "lead"];

/** the churches of this round: GLB node names (LOD0..2), slots, the slots NOT in the shared library (temporary looks),
 *  LOD switch distances (m, camera to the building's box) and each cross-fade band's half-width */
export const CHURCHES = {
  sacrecoeur: {
    label: "Sacré-Cœur", names: ["SacreCoeur", "SacreCoeur_far", "SacreCoeur_xfar"],
    slots: ["rubble_stone", "stone_white", "slate", "zinc_roof", "wood_oak", "glass_window", "cast_iron_green"],
    newNames: ["rubble_stone", "wood_oak"],
    lods: [{ until: 110, band: 18 }, { until: 420, band: 50 }, { until: Infinity }],
  },
  saintmarc: {
    label: "Saint-Marc", names: ["SaintMarc", "SaintMarc_far", "SaintMarc_xfar"],
    slots: ["brick_dark", "stone_blue", "zinc_roof", "concrete_white", "wood_oak", "glass_window", "cast_iron_green"],
    newNames: ["wood_oak", "concrete_white"],
    // (claude/snow2 item 2, ?marcbrick=old = the library's brick_dark as shipped) the photos' brick is warmer, lighter and
    // less red: a grey-mauve brown (Street View 2009 / 2023 from Avenue De Fre, look only); the shipped clinker scan
    // tinted toward it (its detail kept: scanTint 1 = the scan's mean -> this colour)
    looks: { brick_dark: { color: "#7d6c68", scanTint: 1 } },
    lods: [{ until: 110, band: 18 }, { until: 420, band: 50 }, { until: Infinity }],
  },
  // castle1 (branch claude/castle1): the Chateau Latour de Frein, Rue Engeland 555 (tools/blender/latourdefrein.py);
  // every slot from the shared library except the gallery's terrace tiles (temporary look below)
  latourdefrein: {
    label: "Latour de Frein", names: ["LatourDeFrein", "LatourDeFrein_far", "LatourDeFrein_xfar"],
    slots: ["brick_red_brussels", "stone_white", "slate", "zinc_roof", "wood_frame_white", "glass_window", "cast_iron_green",
      "stone_blue", "wood_frame_dark", "terrace_tiles"],
    newNames: ["terrace_tiles"],
    nightLit: true,              // at night only the windows whose glass has the code "gilt" glow (~30 %, chosen in Blender)
    lods: [{ until: 120, band: 20 }, { until: 450, band: 55 }, { until: Infinity }],
  },
};

const SOURCE = libSource("landmark5", "./materials/shipped.js");   // ?libmat=0 / -landmark5: the temporary materials only
/** live look controls (uniforms: no recompiles) */
export const l5Look = { aoStrength: uniform(1.0), aoDirect: uniform(0.55) };

const promises = {};
export function loadChurch(key) {
  const C = CHURCHES[key];
  return (promises[key] ??= (async () => {
    const base = new URL(`../models/${key}/`, import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lodsJson, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + `${key}.glb`),
      fetch(base + `${key}.json`).then((r) => r.json()),
      fetch(base + `${key}.lods.json`).then((r) => r.json()).catch(() => ({})),
      loadAO(base + `${key}_ao.png`),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn(`[${key}] material library not loaded:`, e.message); return null; }),
    ]);
    const lods = C.names.map(() => []);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1;
      for (let p = o; p && k < 0; p = p.parent) k = C.names.indexOf(p.name);
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      if (k >= 0) lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0));
    const materials = {};
    for (const s of C.slots) materials[s] = wrapAO(sourceMaterial(s, lib, C, key), aoTex, s, key);
    if (C.nightLit && materials.glass_window?.emissiveNode) {
      // per window: the glass code "gilt" (11) = lit, set per window in Blender (castle_kit.lit_code)
      const lit = float(1).sub(codeV().sub(11).abs().min(1));
      materials.glass_window.emissiveNode = materials.glass_window.emissiveNode.mul(lit);
    }
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const make = (k) => {
      const g = new THREE.Group(); g.name = `${key}_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material;
        m.castShadow = slot !== "glass_window"; m.receiveShadow = true;
        g.add(m);
      }
      return g;
    };
    const tmp = new THREE.Vector3();
    const distance = (p) => boundsWorld.distanceToPoint(tmp.copy(p));
    return { key, lods, tris, materials, notes, placement, boundsWorld, make, distance, aoTex, lib, lodsJson,
      aoBytes: aoTex.userData.bytes, glbBytes: lodsJson.glbBytes, drawCalls: lods.map((l) => l.length) };
  })());
}

/** the weather families of the temporary looks (as library.js weatherOpts for its kinds) */
const WX = {
  rubble_stone: { porosity: 0.7, streaks: true }, concrete_white: { porosity: 0.5, streaks: true }, wood_oak: { porosity: 0.3 },
  zinc_roof: { porosity: 0.05 }, cast_iron_green: { porosity: 0.05 }, terrace_tiles: { porosity: 0.45 },
  wood_frame_white: { porosity: 0.2 }, wood_frame_dark: { porosity: 0.2 }, glass_window: { porosity: 0, glass: true, streaks: true, snow: false },
};

function sourceMaterial(name, lib, C, key) {
  let m = null;
  if (lib && !C.newNames.includes(name)) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? null; }
    catch (e) { console.warn(`[${key}] library failed on "${name}":`, e.message); }
    // a per-building look on this material's own uniforms (createMaterial gives each call its own look)
    const look = C.looks?.[name], U = m?.userData?.look;
    if (look && U && !/[?&]marcbrick=old(&|$)/.test(location.search)) {
      if (look.color && U.color?.value?.isColor) U.color.value.set(look.color);
      if (look.scanTint != null && U.scanTint) U.scanTint.value = look.scanTint;
    }
  }
  if (m) return m;
  const make = TEMP[name] ?? RO_TEMP_MATERIALS[name] ?? RU_TEMP_MATERIALS[name] ?? SP_TEMP_MATERIALS[name] ?? RO_TEMP_MATERIALS.rubble_stone;
  return wxMat(make(), WX[name] ?? { porosity: 0.4 });
}

/** the baked AO (lighting only): aoNode = lightmap AO x the thin parts' vertex AO, the colour darkened by a share of it */
function wrapAO(src, aoTex, slot, key) {
  const m = src.clone();
  m.name = `${key} ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, l5Look.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.userData.farBase = base;                          // (perfgame round 7: farMerge.js bakes the AO-free colour)
    m.colorNode = base.mul(mix(float(1), aoK, l5Look.aoDirect));
  }
  m.userData.shared = true; m.userData.slot = slot;
  m.userData.farAO = { aoTex, look: l5Look };          // (perfgame round 7: the merged far LOD's AO, farMerge.js)
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
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const step01 = (x, t) => smoothstep(t, t + 0.001, x);

const codeV = () => floor(attribute("color", "vec4").r.mul(16));
const isPlain = () => { const c = codeV(); return float(1).sub(c.min(1)).max(float(1).sub(c.sub(4).abs().min(1))); };   // codes plain / plinth

const TEMP = {
  /** COURSED SQUARED RUBBLE SANDSTONE (the Sacre-Coeur's walls, Street View 2023; Rosaire's slot name): squared stones in
   *  courses of uneven height (0.11-0.27 m, set per course), lengths 0.2-0.62 m, ochre / brown / honey with grey and a few
   *  rust stones; pale recessed mortar joints (the bump), each face a little pillowed; dressed faces (other codes) smooth.
   *  The colour stays a sandstone, not a brick: course heights vary, the stones' tones jump, the joints are lighter. */
  rubble_stone: () => {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const coursed = isPlain().toVar();
      // courses: uneven heights from a hash of a coarse row index (cumulative within 1.6 m bands)
      const band = floor(w.y.div(1.6)).toVar(), yb = fract(w.y.div(1.6)).mul(1.6).toVar();
      const nRow = floor(hash2(vec2(band, 5.0)).mul(4.0)).add(6.0).toVar();       // 6-9 courses in each 1.6 m band
      const rq = yb.div(1.6).mul(nRow).toVar(), r0 = floor(rq).toVar(), fv = fract(rq).toVar();
      const rowH = float(1.6).div(nRow).toVar();
      const row = r0.add(band.mul(nRow)).toVar();
      const L = hash2(vec2(row, 3.0)).mul(0.42).add(0.2).toVar();
      const cu = w.x.add(hash2(vec2(row, 9.0)).mul(2.0)).div(L).toVar(), cell = floor(cu).toVar(), fu = fract(cu).toVar();
      const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00005).toVar();
      const e = min(min(fu, float(1).sub(fu)).mul(L), min(fv, float(1).sub(fv)).mul(rowH)).toVar();
      const joint = float(1).sub(smoothstep(0.007, float(0.007).add(max(fw.mul(1.5), 0.006)), e)).mul(float(1).sub(smoothstep(0.006, 0.03, fw))).mul(coursed).toVar();
      const h = hash2(vec2(cell, row)).toVar(), h2 = hash2(vec2(cell.add(7.0), row.mul(1.7))).toVar();
      const ochre = mix(lin(0x8f7150), lin(0xa88a5e), h);
      const s1 = mix(ochre, lin(0x6f5b46), smoothstep(0.55, 0.75, h2).mul(0.8));          // brown
      const s2 = mix(s1, lin(0x857f74), smoothstep(0.8, 0.9, h2).mul(0.85));               // grey
      const s3 = mix(s2, lin(0x8a5c34), step01(h, 0.93).mul(0.7));                          // rust
      const grain = vnoise(w.mul(9.0)).mul(0.12).add(vnoise(w.mul(2.3)).mul(0.08)).toVar();
      const pillow = min(e.mul(14.0), 1.0).toVar();
      const dressed = mix(lin(0x9a8b72), lin(0xa8977a), vnoise(w.mul(1.3)));
      const col = mix(dressed.mul(float(0.94).add(grain.mul(0.5))), s3.mul(float(0.86).add(grain)).mul(float(0.92).add(pillow.mul(0.08))), coursed);
      return vec4(mix(col, lin(0xa59d8e), joint.mul(0.75)), joint.add(float(1).sub(pillow).mul(0.25).mul(coursed)).min(1));
    })();
    return std({ colorNode: out.xyz, roughnessNode: float(0.9), metalnessNode: float(0), normalNode: bumpNormal(out.w.mul(-0.006)) });
  },
  /** OAK DOORS (the Sacre-Coeur's portals, Street View 2023: light-brown oiled oak in vertical boards with darker joints,
   *  a fine grain along the boards; the rails / stiles the model's own raised parts) */
  wood_oak: () => {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const bw = 0.135;
      const q = w.x.div(bw).toVar(), b = floor(q).toVar(), f = fract(q).toVar();
      const fw = max(fwidth(q), 0.0001).toVar();
      const gap = float(1).sub(smoothstep(0.0, max(fw.mul(1.5), 0.05), min(f, float(1).sub(f)))).mul(float(1).sub(smoothstep(0.3, 0.8, fw))).toVar();
      const h = hash2(vec2(b, 1.0)).toVar();
      const grain = vnoise(vec2(w.x.mul(55.0).add(h.mul(9.0)), w.y.mul(2.2))).toVar();
      const base = mix(lin(0x8a4a22), lin(0xa9662f), h).mul(float(0.82).add(grain.mul(0.26)));
      return vec4(mix(base, lin(0x2e1a0e), gap.mul(0.85)), gap);
    })();
    return std({ colorNode: out.xyz, roughnessNode: float(0.62), metalnessNode: float(0), normalNode: bumpNormal(out.w.mul(-0.003)) });
  },
  /** PAINTED CONCRETE (Saint-Marc's lintels / bands): off-white, faint mottling */
  concrete_white: () => {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const n = vnoise(w.mul(1.7)).mul(0.08).add(vnoise(w.mul(9.0)).mul(0.04));
      return lin(0xd2cdc2).mul(float(0.94).add(n));
    })();
    return std({ colorNode: col, roughnessNode: float(0.85), metalnessNode: float(0) });
  },
  /** TERRACE TILES (castle1: the Latour de Frein gallery's flat roof, salmon on the 2024 orthophoto): square quarry
   *  tiles 0.3 m, salmon / terracotta tones per tile, grey-brown joints, weathered (the weather layer adds wet / snow) */
  terrace_tiles: () => {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const q = w.div(0.3).toVar(), cell = floor(q).toVar(), f = fract(q).toVar();
      const fw = max(fwidth(q.x), fwidth(q.y)).max(0.0001).toVar();
      const e = min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y))).toVar();
      const joint = float(1).sub(smoothstep(0.0, max(fw.mul(1.5), 0.035), e)).mul(float(1).sub(smoothstep(0.2, 0.7, fw))).toVar();
      const h = hash2(cell).toVar();
      const tile = mix(lin(0xa86e55), lin(0xbf8a6c), h).mul(float(0.85).add(vnoise(w.mul(3.0)).mul(0.25)));
      return vec4(mix(tile, lin(0x6a5e55), joint.mul(0.8)), joint);
    })();
    return std({ colorNode: out.xyz, roughnessNode: float(0.85), metalnessNode: float(0), normalNode: bumpNormal(out.w.mul(-0.003)) });
  },
};
export const L5_TEMP_MATERIALS = TEMP;
