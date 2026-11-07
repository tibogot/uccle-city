// THE EGLISE SAINT-PIERRE D'UCCLE (Parvis Saint-Pierre; tools/blender/stpierre.py -> tools/hero_pack.mjs -> models/stpierre/),
// shared by the Saint-Pierre Lab and the city (?stpierre=1). Same contract as the Chapelle de Stalle (branch claude/stalle).
//
// The GLB carries geometry only: one primitive per NAMED material slot (SP_SLOTS) per level of detail, a per-face code in
// COLOR_0.r (SP_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and the
// baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity today). One slot name is new (not
//     in viewer/materials/ yet, see models/stpierre/NOTES.md): "copper_brown" (the dome's copper sheet before it turns
//     green); until the library has it, it resolves to the temporary TSL version below, whatever SOURCE says;
//   - SOURCE below is the ONE line that picks where the named materials come from: the temporary TSL versions in this
//     file, or the shared library (viewer/materials/library.js, branch claude/materials);
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only) and, in the city, the dithered
//     LOD cross-fade (lodFade.js); setSlotMaterial(slot, material) swaps one slot live (the lab proves it).
// LODs are built offline with meshoptimizer (tools/hero_pack.mjs): LOD0 = the Blender model, LOD1 = LOD0 simplified (shares
// LOD0's vertex buffers), LOD2 = the script's far variant trimmed.
//   const m = await loadStPierre();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, sin, dot, select,
  fwidth, max, min, mod, mrt, roughness, uniform,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { bumpNormal } from "./tslkit.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD) */
export const SP_SLOTS = ["brick_red_brussels", "stone_white", "stone_blue", "slate", "copper_brown", "copper_patina", "zinc_roof",
  "wood_frame_dark", "glass_window", "cast_iron_green"];
/** every name of the shared library (viewer/materials/, branch claude/materials) + the new name this model adds */
export const LIBRARY_NAMES = ["brick_red_brussels", "brick_yellow", "brick_dark", "stone_white", "stone_blue", "render_white", "slate",
  "roof_tiles_red", "zinc_roof", "copper_patina", "painted_metal_white", "cast_iron_green", "wood_frame_white", "wood_frame_dark", "glass_window",
  "cobbles", "paving_concrete", "gravel_path", "lawn_edge", "copper_brown"];
export const NEW_NAMES = ["copper_brown"];
/** THE ADAPTER TABLE: GLB slot -> library material name */
export const SLOT_TABLE = Object.fromEntries(SP_SLOTS.map((s) => [s, s]));
export const SP_CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
  "gilt", "door", "dial", "quoin", "lead"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band */
export const SP_LODS = [{ until: 110, band: 18 }, { until: 420, band: 50 }, { until: Infinity }];
const GROUND = 49.8;                           // the parvis (m TAW): splash, damp, algae work from here

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; "./materials/library.js" = the shared library
// (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name) / materials[name].
const SOURCE = "temp";

/** Live look controls (uniforms: no recompiles) */
export const spLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.6), weather: uniform(1.0), moss: uniform(1.0), glow: uniform(0.35) };

let promise = null;
export function loadStPierre() {
  return (promise ??= (async () => {
    const base = new URL("../models/stpierre/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lods_json, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "stpierre.glb"),
      fetch(base + "stpierre.json").then((r) => r.json()),
      fetch(base + "stpierre.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "stpierre_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[stpierre] material library not loaded:", e.message); return null; }),
    ]);
    const names = ["StPierre", "StPierre_lod1", "StPierre_lod2"];
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
    for (const s of SP_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `stpierre_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot;
        m.castShadow = slot !== "glass_window"; m.receiveShadow = true;
        g.add(m);
      }
      groups.push(g);
      return g;
    };
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
      lods, tris, materials, notes, placement, boundsWorld, make, setSlotMaterial, distance, aoTex, lib,
      aoBytes: aoTex.userData.bytes, glbBytes: lods_json.glbBytes, lodsJson: lods_json,
      tempMaterial: (s) => wrapAO(TEMP[s](), aoTex, s),
      libraryMaterial: (name) => sourceMaterial(name, lib),
      drawCalls: lods.map((l) => l.length),
    };
  })());
}

/** a named material from the library when SOURCE points at one (and has it), else the temporary version of that name */
export function sourceMaterial(name, lib, opts = {}) {
  let m = null;
  if (lib && !NEW_NAMES.includes(name)) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? lib.getMaterial?.(name) ?? lib.materials?.[name] ?? lib.default?.[name] ?? null; }
    catch (e) { console.warn(`[stpierre] library failed on "${name}":`, e.message); }
    if (!m) console.warn(`[stpierre] library has no "${name}": temporary material`);
  }
  return m ?? (TEMP[name] ?? TEMP.stone_white)(opts);
}

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO (indirect
 *  light), and the colour darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `stpierre ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, spLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, spLook.aoDirect));
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
// the new name. They read only what every slot gets: UV0 in metres, the face code (COLOR_0.r), the world normal.
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const code = () => floor(attribute("color", "vec4").r.mul(16));
const isCode = (k) => float(1).sub(clamp(abs(code().sub(k)), 0, 1));
const C = Object.fromEntries(SP_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
/** value noise 0..1 */
const vnoise = (p) => {
  const i = floor(p), f = fract(p), u = f.mul(f).mul(float(3).sub(f.mul(2)));
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
};
/** weathering shared by the masonry: splash grime low on the walls, green algae on north faces near the ground, dark
 *  streaks under ledges (vertical noise), the tops of ledges darker (soot crust, photos P01-P03) */
function weather(col, k = 1) {
  const P = positionWorld;
  const up = clamp(normalWorld.y, 0, 1);
  const north = clamp(normalWorld.z.negate().mul(0.8).add(normalWorld.x.mul(0.2)), 0, 1);           // city z = south
  const low = smoothstep(GROUND + 1.6, GROUND, P.y);
  const n1 = vnoise(P.xz.add(P.y).mul(0.9)), n2 = vnoise(vec2(P.x.add(P.z).mul(2.3), P.y.mul(0.28)));
  const algae = clamp(north.mul(0.55).add(low.mul(0.45)).mul(n1.mul(1.2)).mul(spLook.moss).mul(k), 0, 0.8);
  let c = mix(col, col.mul(vec3(0.66, 0.7, 0.55)), algae.mul(0.6));
  const streak = smoothstep(0.58, 0.88, n2).mul(float(1).sub(up)).mul(0.18);
  c = c.mul(float(1).sub(streak.mul(spLook.weather)).sub(low.mul(0.1).mul(spLook.weather)));
  return c.mul(mix(float(1), float(0.82), up.mul(0.7).mul(spLook.weather)));
}
/** BRICK in the 1782 CROSS BOND (Arter 2014: hand-moulded "Spanish format" 48 x 115 x 240 mm, lime joints): stretcher
 *  and header courses alternate, every other stretcher course shifted by half a header; per-brick tone (orange-red,
 *  some darker burnt headers), recessed joints in the bump, the far field blended to the mean */
function crossBond() {
  const w = uv(0);
  const cv = w.y.div(0.06), row = floor(cv), fv = fract(cv);
  const header = mod(row, 2);                                            // odd rows: headers
  const shift = mod(floor(row.div(2)), 2).mul(0.5);                      // stretcher rows alternate by half a header
  const L = mix(float(0.25), float(0.125), header);
  const cu = w.x.div(L).add(mix(shift, float(0.5), header)), cell = floor(cu), fu = fract(cu);
  const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00005);
  const jx = min(fu, float(1).sub(fu)).mul(L), jy = min(fv, float(1).sub(fv)).mul(0.06);
  const e = min(jx, jy);
  const jw = float(0.0055);
  const mask = smoothstep(jw, jw.add(max(fw.mul(1.2), 0.002)), e);
  const far = smoothstep(0.006, 0.02, fw);
  const h = hash2(vec2(cell, row)), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0))), h3 = hash2(vec2(cell.mul(0.37), row.add(9.0)));
  let b = mix(lin(0x86402a), lin(0x9e5034), h).mul(mix(float(0.82), float(1.06), h2));
  b = mix(b, lin(0x6b3328), step(0.82, h3).mul(header).mul(0.75));      // burnt headers (purple-brown)
  b = mix(b, lin(0xa8694a), step(0.93, h2).mul(0.5));                   // pale ones
  b = b.mul(vnoise(w.mul(40.0)).mul(0.12).add(0.94));
  const mortar = lin(0xa39a89);
  const mean = mix(lin(0x8f4a31), mortar, 0.18);
  const col = mix(mix(mortar, b, mask), mean, far);
  return { col, bump: mask.mul(0.0035).mul(float(1).sub(far)), mask };
}
/** ASHLAR of the 1782 facing ("gres ledien" sandstone, Savonnieres for the crowning, Gobertange plinth: Arter 2014):
 *  courses of 0.28-0.36 m, stones 0.4-1.1 m with per-stone tone (cream, ochre, grey), thin lime joints; mouldings and
 *  dressed parts (codes) get no coursing; tops of ledges darker */
function ashlar() {
  const w = uv(0);
  const ch = float(0.32);
  const row = floor(w.y.div(ch)), fv = fract(w.y.div(ch));
  const L = hash2(vec2(row, 7.0)).mul(0.5).add(0.55);
  const cu = w.x.add(hash2(vec2(row, 1.0)).mul(3.0)).div(L), cell = floor(cu), fu = fract(cu);
  const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00005);
  const e = min(min(fu, float(1).sub(fu)).mul(L), min(fv, float(1).sub(fv)).mul(ch));
  const plain = isCode(C.plain).add(isCode(C.quoin)).add(isCode(C.plinth)).min(1);
  const mask = mix(float(1), smoothstep(0.003, float(0.003).add(max(fw.mul(1.2), 0.002)), e), plain.mul(float(1).sub(smoothstep(0.006, 0.02, fw))));
  const hs = hash2(vec2(cell, row)), hs2 = hash2(vec2(cell.add(31.0), row.mul(1.7)));
  let tone = mix(lin(0xc4bba4), lin(0xb8a886), hs);
  tone = mix(tone, lin(0xa9a598), step(0.72, hs2).mul(0.7));
  tone = mix(tone, lin(0xd8cfb8), isCode(C.cornice).add(isCode(C.coping)).add(isCode(C.sculpture)).min(1).mul(0.6));   // Savonnieres
  tone = mix(tone, lin(0xb4b0a6), isCode(C.plinth).mul(0.7));                                                               // Gobertange
  const grain = vnoise(w.mul(9.0).add(hs.mul(13.0))).mul(0.09).add(vnoise(w.mul(33.0)).mul(0.06));
  const col = mix(lin(0xb7af9e), tone.mul(float(0.9).add(grain)), mask);
  return { col, bump: mask.mul(0.002).add(grain.mul(0.002)) };
}
const TEMP = {
  brick_red_brussels(o = {}) {
    const { col, bump } = crossBond();
    return std({ colorNode: o.indoor ? col : weather(col, 0.5), roughnessNode: float(0.88), metalnessNode: float(0), normalNode: bumpNormal(bump) });
  },
  stone_white(o = {}) {
    const { col, bump } = ashlar();
    // crust: the ledges' upper faces and the undersides near them darker (the 2014 cleaning left them lighter: moderate)
    const up = clamp(normalWorld.y, 0, 1);
    const ledge = isCode(C.cornice).add(isCode(C.coping)).add(isCode(C.sill)).add(isCode(C.band)).min(1);
    const c = col.mul(mix(float(1), float(0.8), up.mul(ledge).mul(spLook.weather)));
    return std({ colorNode: o.indoor ? c : weather(c, 0.7), roughnessNode: float(0.84), metalnessNode: float(0), normalNode: bumpNormal(bump) });
  },
  stone_blue() {
    // petit granit: dark blue-grey, fine vertical chisel striations (ciselures), white crinoid flecks, paler weathered faces
    const w = uv(0);
    const stri = vnoise(vec2(w.x.mul(60.0), w.y.mul(2.0))).mul(0.08);
    const fleck = step(0.985, hash2(floor(w.mul(70.0)))).mul(0.25);
    const up = clamp(normalWorld.y, 0, 1);
    let col = mix(lin(0x464b52), lin(0x5a5f66), vnoise(w.mul(3.0))).mul(float(0.92).add(stri)).add(fleck.mul(0.15));
    col = mix(col, lin(0x7d8186), up.mul(0.35));
    return std({ colorNode: weather(col, 0.4), roughnessNode: float(0.66), metalnessNode: float(0), normalNode: bumpNormal(stri.mul(0.002)) });
  },
  slate() {
    // Spanish slates (2014: 20 x 30, hooks): exposure 0.125, 0.2 wide, half-lap shift; per-slate tone; lead ridge rolls
    const w = uv(0);
    const cv = w.y.div(0.125), row = floor(cv);
    const cu = w.x.div(0.2).add(mod(row, 2).mul(0.5)), cell = floor(cu);
    const h = hash2(vec2(cell, row)), h2 = hash2(vec2(cell.add(5.0), row.mul(1.3)));
    const fw = max(fwidth(cv), fwidth(cu));
    const lap = mix(smoothstep(0.0, 0.1, fract(cv)).mul(smoothstep(0.0, 0.04, fract(cu))).mul(smoothstep(1.0, 0.96, fract(cu))), float(0.88), smoothstep(0.2, 0.6, fw));
    let col = mix(lin(0x30343b), lin(0x3c414a), h).mul(mix(float(0.75), float(1), lap)).mul(mix(float(0.92), float(1.05), h2));
    const m = smoothstep(0.75, 0.92, vnoise(w.mul(1.7))).mul(smoothstep(0.45, 0.8, vnoise(w.mul(11.0)))).mul(spLook.moss).mul(0.6);
    col = mix(col, lin(0x55603f), m.mul(clamp(normalWorld.z.negate().add(0.3), 0, 1)));
    return std({ colorNode: col, roughnessNode: mix(float(0.62), float(0.8), h2), metalnessNode: float(0), normalNode: bumpNormal(lap.mul(0.003)) });
  },
  copper_brown() {
    // the dome's copper (re-covered 2013-14): dark brown oxide, the sheets' tone per bay, green run-offs starting low
    const w = uv(0);
    const sheet = hash2(vec2(floor(w.x.div(0.5)), floor(w.y.div(1.8))));
    const seam = isCode(C.ridge);
    let col = mix(lin(0x3b2c24), lin(0x4a3628), sheet).mul(vnoise(w.mul(vec2(2.0, 9.0))).mul(0.16).add(0.88));
    const run = smoothstep(0.65, 0.95, vnoise(vec2(w.x.mul(6.0), w.y.mul(0.6)))).mul(0.25);
    col = mix(col, lin(0x5b7d66), run);
    col = mix(col, col.mul(1.25), seam);
    return std({ colorNode: col, roughnessNode: float(0.55), metalnessNode: float(0.45) });
  },
  copper_patina() {
    const w = uv(0);
    const n = vnoise(w.mul(5.0));
    const col = mix(lin(0x4f8f76), lin(0x6aa891), n).mul(mix(float(0.8), float(1.0), vnoise(w.mul(vec2(3.0, 12.0)))));
    const gutter = isCode(C.gutter);
    return std({ colorNode: mix(col, lin(0x5e4636), gutter.mul(0.55)), roughnessNode: float(0.6), metalnessNode: mix(float(0.15), float(0.5), gutter) });
  },
  zinc_roof() {
    const h = vnoise(uv(0).mul(vec2(0.6, 4.0)));
    return std({ colorNode: mix(lin(0x6f7478), lin(0x60656a), h), roughnessNode: float(0.5), metalnessNode: float(0.35) });
  },
  wood_frame_dark() {
    // the doors: dark aubergine-brown oil paint (photos P02, Arter 2014); the louvres: grey weathered boards
    const w = uv(0);
    const grain = vnoise(w.mul(vec2(3.0, 45.0))).mul(0.12).add(0.93);
    const door = isCode(C.door), louvre = isCode(C.louvre);
    let col = mix(lin(0x3b2a1d), lin(0x3a2324), door).mul(grain);
    col = mix(col, lin(0x2c2a27).mul(grain), louvre);
    return std({ colorNode: col, roughnessNode: mix(float(0.7), float(0.45), door), metalnessNode: float(0) });
  },
  glass_window() {
    // leaded quarries: rectangles of lead cames, slightly tinted glass (P01: clear-grey from outside; stained inside)
    const w = uv(0);
    const q = w.div(vec2(0.22, 0.3));
    const f = fract(q), fw = fwidth(q.x).max(0.0001);
    const lead = float(1).sub(smoothstep(0.0, max(fw.mul(1.5), 0.05), min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y)))));
    const isLead = isCode(C.lead);
    const pane = hash2(floor(q));
    const glass = mix(lin(0x1a2224), lin(0x2a302c), pane);
    const col = mix(glass, lin(0x2a2826), lead.mul(isLead));
    const m = std({ colorNode: col, roughnessNode: mix(float(0.06), float(0.55), lead.mul(isLead)), metalnessNode: mix(float(0.0), float(0.5), lead.mul(isLead)) });
    m.emissiveNode = mix(lin(0xffb46a), lin(0xffd59a), pane).mul(float(1).sub(lead.mul(isLead))).mul(env.uNight).mul(spLook.glow).mul(pane.mul(0.4).add(0.6));
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  cast_iron_green() {
    // wrought iron (window bars, anchors): black paint; the clocks: matt black dials, gilt rings / marks / hands
    const gilt = isCode(C.gilt), dialC = isCode(C.dial);
    const col = mix(mix(lin(0x1a1b1b), lin(0x0e0f10), dialC), lin(0xc9973c), gilt);
    return std({ colorNode: col, roughnessNode: mix(mix(float(0.55), float(0.8), dialC), float(0.3), gilt), metalnessNode: mix(float(0.5), float(1.0), gilt) });
  },
  // other library names, for the swap panel
  render_white() { return std({ colorNode: lin(0xe4dfd4), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  brick_dark() { return std({ colorNode: lin(0x4a2c25), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  roof_tiles_red() { return std({ colorNode: lin(0x8f4129), roughnessNode: float(0.7), metalnessNode: float(0) }); },
  painted_metal_white() { return std({ colorNode: lin(0xe3e4df), roughnessNode: float(0.45), metalnessNode: float(0.05) }); },
  wood_frame_white() { return std({ colorNode: lin(0xeeece5), roughnessNode: float(0.45), metalnessNode: float(0) }); },
  cobbles() { return std({ colorNode: lin(0x5f5b55), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  paving_concrete() { return std({ colorNode: lin(0x9a968e), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  gravel_path() { return std({ colorNode: lin(0xa59a88), roughnessNode: float(0.95), metalnessNode: float(0) }); },
  lawn_edge() { return std({ colorNode: lin(0x4d6b2b), roughnessNode: float(0.95), metalnessNode: float(0) }); },
};
TEMP.brick_yellow = () => { const m = TEMP.brick_red_brussels(); m.colorNode = m.colorNode.mul(vec3(1.25, 1.2, 0.85)); return m; };
export const SP_TEMP_MATERIALS = TEMP;
