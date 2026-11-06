// THE CHAPELLE DE STALLE (Notre-Dame de Bon-Secours, rue de Stalle 50; tools/blender/stalle.py -> tools/stalle_pack.mjs ->
// models/stalle/), shared by the Stalle Lab and the city (?stalle=1). The interior cell is viewer/stalleInterior.js.
//
// The GLB carries geometry only: one primitive per NAMED material slot (ST_SLOTS) per level of detail, a per-face code
// in COLOR_0.r (ST_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and
// the baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity today). Two slot names are new
//     (not in viewer/materials/ yet, see models/stalle/NOTES.md): "sandstone_rubble" (the chapel's walls: rough-squared
//     Brussels sandstone in irregular courses) and "painted_wood_red" (its oxblood doors and the house's shutters); until
//     the library has them they resolve to the temporary TSL versions below, whatever SOURCE says;
//   - SOURCE below is the ONE line that picks where the named materials come from: the temporary TSL versions in this
//     file, or the shared library (viewer/materials/library.js, branch claude/materials);
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only) and, in the city, the dithered
//     LOD cross-fade (lodFade.js); setSlotMaterial(slot, material) swaps one slot live (the lab proves it).
// LODs are built offline with meshoptimizer (tools/stalle_pack.mjs): LOD0 = the Blender model, LOD1 = LOD0 simplified
// (shares LOD0's vertex buffers), LOD2 = the script's far variant trimmed. The west door's leaves are their own node
// (shown with LOD0 / LOD1; the interior cell swaps them for its opening ones).
//   const m = await loadStalle();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld;  m.setDoor(bool)
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, sin, dot,
  fwidth, max, min, mod, mrt, roughness, uniform, length,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { bumpNormal } from "./tslkit.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD) */
export const ST_SLOTS = ["sandstone_rubble", "stone_white", "stone_blue", "brick_red_brussels", "slate", "zinc_roof", "wood_frame_dark",
  "painted_wood_red", "glass_window", "cast_iron_green", "cobbles"];
/** every name of the shared library (viewer/materials/, branch claude/materials) + the two new names this model adds */
export const LIBRARY_NAMES = ["brick_red_brussels", "brick_yellow", "brick_dark", "stone_white", "stone_blue", "render_white", "slate",
  "roof_tiles_red", "zinc_roof", "copper_patina", "painted_metal_white", "cast_iron_green", "wood_frame_white", "wood_frame_dark", "glass_window",
  "cobbles", "paving_concrete", "gravel_path", "lawn_edge", "sandstone_rubble", "painted_wood_red"];
export const NEW_NAMES = ["sandstone_rubble", "painted_wood_red"];
/** THE ADAPTER TABLE: GLB slot -> library material name */
export const SLOT_TABLE = Object.fromEntries(ST_SLOTS.map((s) => [s, s]));
export const ST_CODES = ["plain", "coping", "surround", "tracery", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
  "interior", "door", "bell", "quoin", "lead"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band */
export const ST_LODS = [{ until: 80, band: 14 }, { until: 320, band: 40 }, { until: Infinity }];

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; "./materials/library.js" = the shared library
// (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name) / materials[name].
const SOURCE = "temp";

/** Live look controls (uniforms: no recompiles) */
export const stLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.6), weather: uniform(1.0), moss: uniform(1.0), glow: uniform(0.35) };

let promise = null;
export function loadStalle() {
  return (promise ??= (async () => {
    const base = new URL("../models/stalle/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lods_json, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "stalle.glb"),
      fetch(base + "stalle.json").then((r) => r.json()),
      fetch(base + "stalle.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "stalle_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[stalle] material library not loaded:", e.message); return null; }),
    ]);
    const names = ["Stalle", "Stalle_lod1", "Stalle_lod2"];
    const lods = names.map(() => []), door = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1, isDoor = false;
      for (let p = o; p && k < 0 && !isDoor; p = p.parent) { k = names.indexOf(p.name); isDoor = p.name === "Stalle_door"; }
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      if (isDoor) door.push({ slot: o.material.name, geometry: o.geometry });
      else if (k >= 0) lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0));
    const doorTris = door.reduce((s, m) => s + m.geometry.index.count / 3, 0);
    const materials = {};
    for (const s of ST_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    let doorShown = true;
    const make = (k) => {
      const g = new THREE.Group(); g.name = `stalle_lod${k}`;
      const parts = k < 2 ? [...lods[k], ...door.map((d) => ({ ...d, door: true }))] : lods[k];
      for (const { slot, geometry, door: isDoor } of parts) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = isDoor ? `door ${slot}` : slot; m.userData.slot = slot; m.userData.door = !!isDoor;
        m.castShadow = slot !== "glass_window"; m.receiveShadow = true;
        if (isDoor) m.visible = doorShown;
        g.add(m);
      }
      groups.push(g);
      return g;
    };
    /** the west door's leaves on / off (the interior cell has its own, which open) */
    const setDoor = (v) => { doorShown = v; for (const g of groups) for (const o of g.children) if (o.userData.door) o.visible = v; };
    const setSlotMaterial = (slot, mat, { fade = null, dryRun = false, raw = false } = {}) => {
      const w = raw ? mat : wrapAO(mat, aoTex, slot);
      if (fade && !raw) fade(w);
      if (dryRun) return w;
      materials[slot] = w;
      for (const g of groups) g.traverse((o) => { if (o.isMesh && o.userData.slot === slot) o.material = w; });
      return w;
    };
    const tmp = new THREE.Vector3();
    const distance = (p) => boundsWorld.distanceToPoint(tmp.copy(p));
    return {
      lods, door, tris, doorTris, materials, notes, placement, boundsWorld, make, setDoor, setSlotMaterial, distance, aoTex, lib,
      aoBytes: aoTex.userData.bytes, glbBytes: lods_json.glbBytes, lodsJson: lods_json,
      tempMaterial: (s) => wrapAO(TEMP[s](), aoTex, s),
      libraryMaterial: (name) => sourceMaterial(name, lib),
      drawCalls: lods.map((l, k) => l.length + (k < 2 ? door.length : 0)),
    };
  })());
}

/** a named material from the library when SOURCE points at one (and has it), else the temporary version of that name */
export function sourceMaterial(name, lib, opts = {}) {
  let m = null;
  if (lib && !NEW_NAMES.includes(name)) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? lib.getMaterial?.(name) ?? lib.materials?.[name] ?? lib.default?.[name] ?? null; }
    catch (e) { console.warn(`[stalle] library failed on "${name}":`, e.message); }
    if (!m) console.warn(`[stalle] library has no "${name}": temporary material`);
  }
  return m ?? (TEMP[name] ?? TEMP.stone_white)(opts);
}

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO (indirect
 *  light), and the colour darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `stalle ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, stLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, stLook.aoDirect));
  }
  m.userData.shared = true;
  m.userData.slot = slot;
  return m;
}

/** The AO map decoded OFF the main thread (worker: fetch, createImageBitmap, red channel), uploaded as R8 + mips. */
export function loadAO(url) {
  const src = `self.onmessage = async (e) => {
    const bmp = await createImageBitmap(await (await fetch(e.data)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(bmp, 0, 0);
    const d = x.getImageData(0, 0, bmp.width, bmp.height).data, r = new Uint8Array(bmp.width * bmp.height);
    for (let i = 0; i < r.length; i++) r[i] = d[i * 4];
    postMessage({ w: bmp.width, h: bmp.height, r }, [r.buffer]);
  };`;
  return new Promise((res, rej) => {
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    w.onmessage = ({ data }) => {
      w.terminate();
      const t = new THREE.DataTexture(data.r, data.w, data.h, THREE.RedFormat, THREE.UnsignedByteType);
      t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
      t.userData.bytes = Math.round(data.r.length * 4 / 3);
      res(t);
    };
    w.onerror = (e) => { w.terminate(); rej(new Error(e.message || "AO worker failed")); };
    w.postMessage(new URL(url, location.href).href);
  });
}

// ------------------------------------------------------------------------------------------------ temporary materials
// TSL stand-ins named like the shared library's materials (replaced by name when SOURCE points at the library), plus
// the two new names. They read only what every slot gets: UV0 in metres, the face code (COLOR_0.r), the world normal.
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const code = () => floor(attribute("color", "vec4").r.mul(16));
const isCode = (k) => float(1).sub(clamp(abs(code().sub(k)), 0, 1));
const C = Object.fromEntries(ST_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
/** value noise 0..1 */
const vnoise = (p) => {
  const i = floor(p), f = fract(p), u = f.mul(f).mul(float(3).sub(f.mul(2)));
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
};
/** weathering shared by the stones: grime low on the walls (splash), green algae on north faces and near the ground, darker
 *  under ledges (vertical streaks from the noise), cleaner upper parts */
function weather(col, k = 1) {
  const P = positionWorld;
  const up = clamp(normalWorld.y, 0, 1);
  const north = clamp(normalWorld.z.negate().mul(0.8).add(normalWorld.x.mul(0.25)), 0, 1);           // city z = south
  const low = smoothstep(36.2, 34.2, P.y);
  const n1 = vnoise(P.xz.add(P.y).mul(0.9)), n2 = vnoise(vec2(P.x.add(P.z).mul(3.1), P.y.mul(0.35)));
  const algae = clamp(north.mul(0.6).add(low.mul(0.5)).mul(n1.mul(1.3)).mul(stLook.moss).mul(k), 0, 0.85);
  let c = mix(col, col.mul(vec3(0.62, 0.68, 0.5)), algae.mul(0.75));
  const streak = smoothstep(0.55, 0.85, n2).mul(float(1).sub(up)).mul(0.22);
  c = c.mul(float(1).sub(streak.mul(stLook.weather)).sub(low.mul(0.12).mul(stLook.weather)));
  return c.mul(mix(float(1), float(0.86), up.mul(0.6).mul(stLook.weather)));
}
/** irregular coursed rubble: rows of varying height, blocks of varying length, recessed lime joints, per-block tone + bulge */
function rubble() {
  const w = uv(0);
  const row = floor(w.y.div(0.205).add(vnoise(vec2(w.x.mul(0.35), 3.0)).mul(0.35)));
  const ry = fract(w.y.div(0.205).add(vnoise(vec2(w.x.mul(0.35), 3.0)).mul(0.35)));
  const Lb = hash2(vec2(row, 7.0)).mul(0.32).add(0.22);
  const cu = w.x.div(Lb).add(hash2(vec2(row, 1.0)));
  const cell = floor(cu), fx = fract(cu);
  const h = hash2(vec2(cell, row)), h2 = hash2(vec2(cell.add(31.0), row.mul(1.7)));
  const fw = max(fwidth(w.y.div(0.205)), fwidth(cu)).max(0.0001);
  const jv = smoothstep(0.0, 0.09, ry).mul(smoothstep(1.0, 0.9, ry));
  const ju = smoothstep(0.0, float(0.035).div(Lb), fx).mul(smoothstep(1.0, float(1).sub(float(0.035).div(Lb)), fx));
  const mask = mix(jv.mul(ju), float(0.8), smoothstep(0.15, 0.5, fw));
  // block: cream / ochre / grey Brussels sandstone, irregular weathered surface
  const tone = mix(mix(lin(0xd9d0b6), lin(0xc8b48a), h), lin(0xb3ad9f), step(0.78, h2).mul(0.7));
  const grain = vnoise(w.mul(9.0)).mul(0.12).add(vnoise(w.mul(31.0)).mul(0.08));
  let col = tone.mul(float(0.9).add(grain)).mul(mix(float(0.92), float(1.05), h2));
  col = mix(lin(0xbfb6a2).mul(0.82), col, mask);
  const bulge = jv.mul(ju).mul(0.006).add(grain.mul(0.002));
  return { col, bulge, mask };
}
const TEMP = {
  sandstone_rubble() {
    const { col, bulge } = rubble();
    const c = weather(col).mul(mix(float(1), float(0.93), isCode(C.plinth)));
    return std({ colorNode: c, roughnessNode: float(0.9), metalnessNode: float(0), normalNode: bumpNormal(bulge) });
  },
  stone_white(o = {}) {
    // dressed stone (copings, surrounds, tracery, quoins, statue): tooled ashlar, faint coursing, weathered tops
    const w = uv(0);
    const g = vnoise(w.mul(7.0)).mul(0.08).add(vnoise(w.mul(29.0)).mul(0.05));
    const h = hash2(floor(w.mul(vec2(2.2, 3.4))));
    let col = mix(lin(0xe3dcc8), lin(0xd2c7a8), h.mul(0.6)).mul(float(0.94).add(g));
    col = mix(col, lin(0xc9c3b6), isCode(C.sculpture).mul(0.4));
    const up = clamp(normalWorld.y, 0, 1);
    col = col.mul(mix(float(1), float(0.82), up.mul(isCode(C.coping).add(isCode(C.sill)).add(isCode(C.band)).min(1)).mul(stLook.weather)));
    return std({ colorNode: o.indoor ? col : weather(col, 0.7), roughnessNode: float(0.82), metalnessNode: float(0), normalNode: bumpNormal(g.mul(0.004)) });
  },
  stone_blue() {
    const p = uv(0).mul(40), h = hash2(floor(p)), h2 = hash2(floor(p.mul(0.25)).add(7.0));
    const col = mix(lin(0x6b7075), lin(0x575c62), h.mul(0.5).add(h2.mul(0.5)));
    return std({ colorNode: col, roughnessNode: float(0.72), metalnessNode: float(0) });
  },
  brick_red_brussels(o = {}) {
    // the 1711 house: hand-made orange-red bricks, irregular tones, lime joints
    const w = uv(0);
    const cv = w.y.div(0.062), row = floor(cv);
    const cu = w.x.div(0.205).add(mod(row, 2).mul(0.5)), cell = floor(cu);
    const fw = max(fwidth(cv), fwidth(cu));
    const jv = smoothstep(0.0, 0.16, fract(cv)).mul(smoothstep(1.0, 0.95, fract(cv)));
    const ju = smoothstep(0.0, 0.05, fract(cu));
    const mask = mix(jv.mul(ju), float(0.84), smoothstep(0.2, 0.6, fw));
    const h = hash2(vec2(cell, row)), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0)));
    let b = mix(lin(0xa4472c), lin(0xb86240), h).mul(mix(float(0.78), float(1.08), h2));
    b = mix(b, lin(0x6a2e22), step(0.93, h2).mul(0.6));
    const col = mix(b, lin(0xc2b8a6), float(1).sub(mask));
    return std({ colorNode: o.indoor ? col : weather(col, 0.5), roughnessNode: float(0.88), metalnessNode: float(0), normalNode: bumpNormal(mask.mul(0.004)) });
  },
  slate() {
    const w = uv(0);
    const cv = w.y.div(0.17), row = floor(cv);
    const cu = w.x.div(0.24).add(mod(row, 2).mul(0.5)), cell = floor(cu);
    const h = hash2(vec2(cell, row));
    const fw = max(fwidth(cv), fwidth(cu));
    const lap = mix(smoothstep(0.0, 0.12, fract(cv)).mul(smoothstep(0.0, 0.05, fract(cu))).mul(smoothstep(1.0, 0.95, fract(cu))), float(0.85), smoothstep(0.2, 0.6, fw));
    let col = mix(lin(0x555a5e), lin(0x474c50), h).mul(mix(float(0.78), float(1), lap));
    // lichen / moss spots (photos: mossy slates on the house and the aisles)
    const m = smoothstep(0.72, 0.9, vnoise(w.mul(2.3))).mul(smoothstep(0.4, 0.8, vnoise(w.mul(13.0)))).mul(stLook.moss);
    col = mix(col, lin(0x596040), m.mul(0.55));
    col = mix(col, lin(0x5d6064), isCode(C.ridge).mul(0.4));
    return std({ colorNode: col, roughnessNode: float(0.78), metalnessNode: float(0) });
  },
  zinc_roof() {
    const h = vnoise(uv(0).mul(vec2(0.6, 4.0)));
    return std({ colorNode: mix(lin(0x7b8186), lin(0x6a6f73), h), roughnessNode: float(0.45), metalnessNode: float(0.4) });
  },
  wood_frame_dark() {
    const g = hash2(vec2(floor(uv(0).x.mul(70)), 2.0)).mul(0.25).add(0.85);
    const grain = vnoise(uv(0).mul(vec2(4, 60))).mul(0.15).add(0.92);
    return std({ colorNode: lin(0x3b3027).mul(g).mul(grain), roughnessNode: float(0.7), metalnessNode: float(0) });
  },
  painted_wood_red() {
    // oxblood paint over boards (the chapel's doors, the house's shutters): worn edges show darker wood
    const w = uv(0);
    const grain = vnoise(w.mul(vec2(3, 45))).mul(0.12).add(0.94);
    const wear = smoothstep(0.7, 0.92, vnoise(w.mul(6.0))).mul(0.35);
    const col = mix(lin(0x5e2318), lin(0x3a2219), wear).mul(grain);
    return std({ colorNode: col, roughnessNode: float(0.55), metalnessNode: float(0) });
  },
  glass_window() {
    // leaded quarries (diamond lattice of lead cames; the photos: clear / slightly tinted glass, no figures)
    const w = uv(0);
    const q = vec2(w.x.add(w.y), w.y.sub(w.x)).div(0.16);
    const f = fract(q), fw = fwidth(q.x).max(0.0001);
    const lead = float(1).sub(smoothstep(0.0, max(fw.mul(1.5), 0.06), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y)))));
    const isLead = isCode(C.lead);
    const pane = hash2(floor(q));
    const glass = mix(lin(0x1c2421), lin(0x29302a), pane);
    const col = mix(glass, lin(0x2a2826), lead.mul(isLead));
    const m = std({ colorNode: col, roughnessNode: mix(float(0.08), float(0.55), lead.mul(isLead)), metalnessNode: mix(float(0.0), float(0.5), lead.mul(isLead)) });
    m.emissiveNode = lin(0xffb46a).mul(float(1).sub(lead.mul(isLead))).mul(env.uNight).mul(stLook.glow).mul(pane.mul(0.4).add(0.6));
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  cast_iron_green() {
    const bell = isCode(C.bell);
    return std({ colorNode: mix(lin(0x1b1c1c), lin(0x5a4a2e), bell), roughnessNode: mix(float(0.55), float(0.4), bell), metalnessNode: float(0.6) });
  },
  cobbles() {
    // weathered setts with moss in the joints (photos c00, P03)
    const w = uv(0);
    const cv = w.y.div(0.13), row = floor(cv);
    const cu = w.x.div(0.15).add(hash2(vec2(row, 3.0))), cell = floor(cu);
    const h = hash2(vec2(cell, row));
    const fw = max(fwidth(cv), fwidth(cu));
    const jm = smoothstep(0.0, 0.14, fract(cv)).mul(smoothstep(1.0, 0.86, fract(cv))).mul(smoothstep(0.0, 0.12, fract(cu))).mul(smoothstep(1.0, 0.88, fract(cu)));
    const mask = mix(jm, float(0.7), smoothstep(0.2, 0.6, fw));
    const st = mix(lin(0x8a8174), lin(0x6c665d), h).mul(vnoise(w.mul(20.0)).mul(0.15).add(0.9));
    const moss = mix(lin(0x3e4a26), lin(0x5b6436), vnoise(w.mul(2.3))).mul(stLook.moss).add(lin(0x403a32).mul(float(1).sub(stLook.moss)));
    return std({ colorNode: mix(moss, st, mask), roughnessNode: float(0.9), metalnessNode: float(0), normalNode: bumpNormal(mask.mul(0.01)) });
  },
  // other library names, for the swap panel
  render_white() { return std({ colorNode: lin(0xe4dfd4), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  brick_dark() { return std({ colorNode: lin(0x4a2c25), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  roof_tiles_red() { return std({ colorNode: lin(0x8f4129), roughnessNode: float(0.7), metalnessNode: float(0) }); },
  copper_patina() { return std({ colorNode: lin(0x5e9c88), roughnessNode: float(0.6), metalnessNode: float(0.15) }); },
  painted_metal_white() { return std({ colorNode: lin(0xe3e4df), roughnessNode: float(0.45), metalnessNode: float(0.05) }); },
  wood_frame_white() { return std({ colorNode: lin(0xeeece5), roughnessNode: float(0.45), metalnessNode: float(0) }); },
  paving_concrete() { return std({ colorNode: lin(0x9a968e), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  gravel_path() { return std({ colorNode: lin(0xa59a88), roughnessNode: float(0.95), metalnessNode: float(0) }); },
  lawn_edge() { return std({ colorNode: lin(0x4d6b2b), roughnessNode: float(0.95), metalnessNode: float(0) }); },
};
TEMP.brick_yellow = () => { const m = TEMP.brick_red_brussels(); m.colorNode = m.colorNode.mul(vec3(1.25, 1.2, 0.85)); return m; };
export const ST_TEMP_MATERIALS = TEMP;
