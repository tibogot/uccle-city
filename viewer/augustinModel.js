// THE EGLISE SAINT-AUGUSTIN (Place de l'Altitude Cent, Forest; tools/blender/augustin.py -> tools/hero_pack.mjs ->
// models/augustin/), for the city (viewer/augustinCity.js, ?augustin=0 = without it). Same contract as Saint-Pierre
// (viewer/stpierreModel.js, whose generic setLodFades / loadAO it reuses), but its three levels are all scripted in
// Blender (LOD1 = the far variant, LOD2 = the very-far variant; tools/mesh_audit/HEROES_REPORT.md: meshopt LODs streak):
//   the GLB carries geometry only: one primitive per NAMED material slot (AU_SLOTS) per level of detail, a per-face code
//   in COLOR_0.r (AU_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and
//   the baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   SOURCE (THE ONE LINE, viewer/materials/libSwitch.js consumer "augustin") picks the shared library's shipped looks
//   where it has one (stone_blue), else the temporary TSL versions below (concrete_white, roof_bitumen, glass_window,
//   cast_iron_green, wood_frame_dark). New slot name: "roof_bitumen" (the flat concrete roofs' felt).
//   const m = await loadAugustin();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot,
  fwidth, max, min, mrt, uniform, Fn, vec4, cameraPosition,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { bumpNormal } from "./tslkit.js";
import { loadAO } from "./stpierreModel.js";
import { libSource } from "./materials/libSwitch.js";
export { setLodFades } from "./stpierreModel.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD) */
export const AU_SLOTS = ["concrete_white", "stone_blue", "roof_bitumen", "glass_window", "cast_iron_green", "wood_frame_dark"];
export const NEW_NAMES = ["roof_bitumen"];
export const AU_CODES = ["plain", "pilaster", "coping", "band", "sill", "reveal", "louvre", "relief", "plinth", "mullion", "door", "cross",
  "step", "rail", "lead", "soffit"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each dithered cross-fade band */
export const AU_LODS = [{ until: 150, band: 25 }, { until: 600, band: 70 }, { until: Infinity }];
const GROUND = 101.7;                          // the Place round the church (m TAW): splash and grime work from here

const SOURCE = libSource("augustin", "./materials/shipped.js");   // ?libmat=0: the temporary materials only

/** Live look controls (uniforms: no recompiles) */
export const auLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.6), weather: uniform(1.0), glow: uniform(0.4), crossGlow: uniform(1.0) };

let promise = null;
export function loadAugustin() {
  return (promise ??= (async () => {
    const base = new URL("../models/augustin/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lodsJson, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "augustin.glb"),
      fetch(base + "augustin.json").then((r) => r.json()),
      fetch(base + "augustin.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "augustin_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[augustin] material library not loaded:", e.message); return null; }),
    ]);
    const names = ["Augustin", "Augustin_far", "Augustin_xfar"];        // three SCRIPTED levels (no meshopt simplification: it streaks)
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
    for (const s of AU_SLOTS) materials[s] = wrapAO(sourceMaterial(s, lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const make = (k) => {
      const g = new THREE.Group(); g.name = `augustin_lod${k}`;
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
    return {
      lods, tris, materials, notes, placement, boundsWorld, make, distance, aoTex, lib,
      aoBytes: aoTex.userData.bytes, glbBytes: lodsJson.glbBytes, lodsJson,
      drawCalls: lods.map((l) => l.length),
    };
  })());
}

/** a named material from the library when SOURCE points at one (and it has a shipped look), else the temporary one */
function sourceMaterial(name, lib) {
  let m = null;
  if (lib && !NEW_NAMES.includes(name)) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? null; }
    catch (e) { console.warn(`[augustin] library failed on "${name}":`, e.message); }
  }
  return m ?? TEMP[name]();
}

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO, and the colour
 *  darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `augustin ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, auLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, auLook.aoDirect));
  }
  m.userData.shared = true;
  m.userData.slot = slot;
  return m;
}

// ------------------------------------------------------------------------------------------------ temporary materials
// One Fn per material with .toVar() intermediates (TSL re-emits a shared sub-expression at each use otherwise), a
// sin-free hash, at most two value noises. They read UV0 (metres), the face code (COLOR_0.r), world position / normal.
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
const C = Object.fromEntries(AU_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, float(1), float(0)) }); return m; };

const TEMP = {
  /** CAST CONCRETE, PAINTED (1933-35; the photos: a cream / ivory paint over the concrete, greyed by weather, with the
   *  paint flaking in patches where the poor-quality concrete spalled, c11): horizontal lift lines of the formwork
   *  (~1.1 m pours, faint), large-scale mottling, rain streaks running down from the copings and sills (stronger on the
   *  west / north faces), grime splashed at the foot, ledges (copings, bands) a little darker on top, flaked patches
   *  showing grey concrete; the reliefs and copings smoother */
  concrete_white() {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const P = positionWorld;
      const cd = codeV().toVar();
      const up = clamp(normalWorld.y, 0, 1).toVar();
      // tone: two scales of mottling on the world position (non-repeating across faces)
      const m1 = vnoise(vec2(P.x.add(P.z).mul(0.9), P.y.mul(0.9))).toVar();
      const m2 = vnoise(vec2(P.x.sub(P.z).mul(0.23).add(7.1), P.y.mul(0.31))).toVar();
      let col = mix(lin(0xd9d2bf), lin(0xc8bfa8), m2);
      col = col.mul(float(0.95).add(m1.mul(0.08)));
      // formwork lifts: a faint darker line every ~1.12 m on the plain walls
      const fw = max(fwidth(w.y), 0.0005).toVar();
      const lift = fract(w.y.div(1.12)).toVar();                 // UV0 v = height on the walls
      const liftLine = float(1).sub(smoothstep(0.0, max(fw.mul(1.5).div(1.12), 0.012), min(lift, float(1).sub(lift))))
        .mul(isC(cd, C.plain)).mul(float(1).sub(up)).mul(float(1).sub(smoothstep(0.004, 0.03, fw))).toVar();
      col = col.mul(float(1).sub(liftLine.mul(0.06)));
      // rain streaks: a noise stretched down the wall, stronger high up under the ledges and on the weather sides
      const streakN = vnoise(vec2(P.x.add(P.z).mul(3.3), P.y.mul(0.12))).toVar();
      const weatherSide = clamp(normalWorld.x.negate().mul(0.6).add(normalWorld.z.negate().mul(0.5)).add(0.5), 0.2, 1.0);
      const streak = smoothstep(0.55, 0.9, streakN).mul(float(1).sub(up)).mul(weatherSide).mul(0.22).mul(auLook.weather).toVar();
      col = mix(col, col.mul(vec3(0.62, 0.63, 0.6)), streak);
      // flaked paint: patches of grey bare concrete (the c11 tower / transept spalling)
      const flake = smoothstep(0.8, 0.86, vnoise(vec2(P.x.add(P.z).mul(1.3).add(3.0), P.y.mul(1.3))).mul(0.6).add(m1.mul(0.4)))
        .mul(float(1).sub(up)).mul(isC(cd, C.plain).add(isC(cd, C.pilaster)).min(1)).mul(auLook.weather).toVar();
      col = mix(col, lin(0xb3b0a6).mul(float(0.92).add(m1.mul(0.12))), flake.mul(0.5));
      // grime at the foot, darker ledge tops
      const low = smoothstep(GROUND + 1.6, GROUND, P.y).toVar();
      col = col.mul(float(1).sub(low.mul(0.16).mul(auLook.weather)));
      col = col.mul(mix(float(1), float(0.84), up.mul(auLook.weather)));
      // the mullions / louvre slats: the same paint, a touch greyer (photos)
      col = mix(col, col.mul(vec3(0.9, 0.9, 0.88)), isC(cd, C.mullion).add(isC(cd, C.louvre)).min(1));
      // the neon cross: the concrete under the tubes (night glow below)
      return col;
    })();
    const m = std({ colorNode: out, roughnessNode: float(0.86), metalnessNode: float(0) });   // painted, smooth: no bump (also keeps the Fn's vars in one scope)
    m.emissiveNode = lin(0xeaf2ff).mul(isC(codeV(), C.cross)).mul(env.uNight).mul(auLook.crossGlow).mul(1.6);
    return m;
  },
  /** the rubble-stone plinth (photos c09 / c17: dark grey-brown coursed stones) and the blue-stone steps */
  stone_blue() {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const ch = float(0.21);
      const row = floor(w.y.div(ch)).toVar();
      const L = hash2(vec2(row, 3.0)).mul(0.25).add(0.3).toVar();
      const cu = w.x.add(hash2(vec2(row, 9.0)).mul(2.0)).div(L).toVar();
      const cell = floor(cu).toVar();
      const fw = max(fwidth(w.x), fwidth(w.y)).max(0.0001).toVar();
      const e = min(min(fract(cu), float(1).sub(fract(cu))).mul(L), min(fract(w.y.div(ch)), float(1).sub(fract(w.y.div(ch)))).mul(ch));
      const joint = float(1).sub(smoothstep(0.008, float(0.008).add(max(fw.mul(1.2), 0.003)), e)).mul(float(1).sub(smoothstep(0.01, 0.04, fw)));
      const h = hash2(vec2(cell, row)).toVar();
      const rubble = mix(lin(0x56504a), lin(0x6e665c), h).mul(float(0.9).add(hash2(floor(w.mul(23.0))).mul(0.12)));
      const stone = mix(rubble, lin(0x837d72), joint.mul(0.7));
      const steps = mix(lin(0x4a4e54), lin(0x575c62), hash2(floor(w.mul(1.7))));
      return mix(stone, steps, isC(cd, C.step));
    })();
    return std({ colorNode: col, roughnessNode: float(0.82), metalnessNode: float(0) });
  },
  /** the flat roofs: bituminous felt in strips (1 m), grey-black, dusty, a little moss */
  roof_bitumen() {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const strip = hash2(vec2(floor(w.x.div(1.0)), 3.0)).toVar();
      const n = vnoise(w.mul(0.6)).toVar();
      const c = mix(lin(0x2d2d2c), lin(0x3c3b38), strip.mul(0.5).add(n.mul(0.5)));
      return mix(c, lin(0x4a4e36), smoothstep(0.72, 0.95, n).mul(0.35));
    })();
    return std({ colorNode: col, roughnessNode: float(0.92), metalnessNode: float(0) });
  },
  /** the windows (photos c11, c17: big panes in a concrete grid, leaded in a diamond pattern, tinted cathedral glass;
   *  the tower and front lights read dark from outside): lozenges of lead, per-pane tint, sky fresnel, warm at night */
  glass_window() {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const q = vec2(w.x.add(w.y.mul(0.7)), w.x.sub(w.y.mul(0.7))).div(0.32).toVar();
      const f = fract(q).toVar();
      const fwq = max(fwidth(q.x), fwidth(q.y)).max(0.0001).toVar();
      const edge = min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y)));
      const lead = float(1).sub(smoothstep(0.0, max(fwq.mul(1.2), 0.06), edge)).mul(float(1).sub(smoothstep(0.3, 0.8, fwq).mul(0.7))).toVar();
      const pane = hash2(floor(q)).toVar();
      const tint = mix(mix(lin(0x2b3236), lin(0x37352a), step(0.7, pane)), lin(0x2a2f3a), step(0.88, pane));
      const V = cameraPosition.sub(positionWorld).normalize();
      const ndv = clamp(dot(normalWorld, V), 0, 1);
      const fres = float(0.16).add(float(0.55).mul(float(1).sub(ndv).pow(3))).mul(pane.mul(0.4).add(0.8));
      const sky = mix(lin(0x8c98a3), lin(0xb7c5d2), clamp(normalWorld.y.add(0.5), 0, 1));
      const glass = mix(tint, sky, fres.mul(float(1).sub(env.uNight.mul(0.85))));
      return vec4(mix(glass, lin(0x45453f), lead), lead);
    })();
    const m = std({ colorNode: out.xyz, roughnessNode: mix(float(0.15), float(0.6), out.w), metalnessNode: float(0) });
    m.emissiveNode = mix(lin(0xffc27a), lin(0xd9b0ff), hash2(floor(uv(0).div(0.32)))).mul(float(1).sub(out.w)).mul(env.uNight).mul(auLook.glow);
    m.mrtNode = mrt({ metalRough: vec3(0, float(0.6), float(0)) });       // no SSR on the glass (cheap sky term above)
    return m;
  },
  /** dark painted iron: the railing, downpipes, the louvres' back screens (near black) */
  cast_iron_green() {
    const cd = codeV();
    const col = mix(lin(0x2a2c2b), lin(0x0d0e0e), isC(cd, C.louvre));
    return noSSR(std({ colorNode: col, roughnessNode: mix(float(0.55), float(0.9), isC(cd, C.louvre)), metalnessNode: mix(float(0.4), float(0), isC(cd, C.louvre)) }));
  },
  /** the doors: dark varnished oak */
  wood_frame_dark() {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const g = hash2(vec2(floor(w.x.mul(40.0)), floor(w.y.mul(0.8)))).mul(0.12);
      return lin(0x3a2a1c).mul(float(0.92).add(g));
    })();
    return std({ colorNode: col, roughnessNode: float(0.55), metalnessNode: float(0) });
  },
};
export const AU_TEMP_MATERIALS = TEMP;
