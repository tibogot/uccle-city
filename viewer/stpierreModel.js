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
  fwidth, max, min, mod, mrt, roughness, uniform, Fn, vec4, cameraPosition,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { bumpNormal } from "./tslkit.js";
import { fadeVariant, SMOOTH } from "./lodFade.js";
import { libSource } from "./materials/libSwitch.js";

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
const SOURCE = libSource("stpierre", "./materials/shipped.js");   // 2026-11-13: the library by default (?libmat=0: temp)

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
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material;
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
      for (const g of groups) g.traverse((o) => { if (o.isMesh && o.userData.slot === slot) { o.userData.base = w; o.material = w; } });
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

/** The levels' LOD state: shown[k] + fades[k] (lodFade objectFade convention: 1 or 2 = whole, 0..1 fading in, 2..3 fading
 *  out). A level draws with the FADING COPIES of its materials (lodFade.fadeVariant: the dither discard) only while it
 *  is inside a band, and with its own materials otherwise: a discard costs early-z (measured on the P01 full-screen view:
 *  +0.6 ms with the fade on every material all the time). */
export function setLodFades(levels, shown, fades) {
  for (let k = 0; k < levels.length; k++) {
    const g = levels[k]; g.visible = shown[k];
    if (!shown[k]) continue;
    const f = fades[k], whole = !SMOOTH || f === 1 || f === 2;
    for (const o of g.children) {
      o.userData.fade = f;
      const base = o.userData.base ?? o.material;
      const want = whole ? base : fadeVariant(base);
      if (o.material !== want) o.material = want;
    }
  }
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
// (polish 2) every material is ONE Fn whose intermediates are .toVar(): TSL otherwise re-emits a shared sub-expression
// at each use (the round-1 materials cost +0.72 ms full-screen for that reason); the hash is sin-free (Hoskins
// hash12); one value-noise per material at most; the bump height is computed once.
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const codeV = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (cd, k) => float(1).sub(clamp(abs(cd.sub(k)), 0, 1));
const isCode = (k) => isC(codeV(), k);
const C = Object.fromEntries(SP_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
/** no screen-space reflections on the small metal parts (gutters, bars, finial, dome): the SSR pass traces every pixel
 *  that asks for it, the reflections are invisible at these sizes, and it cost ~0.2 ms full-screen (P01 view) */
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, float(1), float(0)) }); return m; };
/** value noise 0..1 (4 hashes) */
const vnoise = (p) => {
  const i = floor(p).toVar(), f = fract(p).toVar(), u = f.mul(f).mul(float(3).sub(f.mul(2))).toVar();
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
};
/** light weathering (the 2013-14 cleaning left the stone pale): a little splash grime at the foot, faint streaks under
 *  ledges (one noise), ledge tops slightly darker; algae only on north faces near the ground */
function weather(col, k = 1) {
  const P = positionWorld;
  const up = clamp(normalWorld.y, 0, 1).toVar();
  const low = smoothstep(GROUND + 1.2, GROUND, P.y).toVar();
  const n = vnoise(vec2(P.x.add(P.z).mul(1.7), P.y.mul(0.3))).toVar();
  const north = clamp(normalWorld.z.negate(), 0, 1);
  const algae = north.mul(low).mul(n).mul(spLook.moss).mul(k).mul(0.5);
  const streak = smoothstep(0.62, 0.9, n).mul(float(1).sub(up)).mul(0.1);
  return mix(col, col.mul(vec3(0.7, 0.74, 0.6)), algae)
    .mul(float(1).sub(streak.add(low.mul(0.06)).mul(spLook.weather)))
    .mul(mix(float(1), float(0.88), up.mul(0.6).mul(spLook.weather)));
}
const TEMP = {
  /** BRICK in the 1782 CROSS BOND (Arter 2014: hand-moulded "Spanish format" 48 x 115 x 240 mm, lime joints): stretcher
   *  and header courses alternate, every other stretcher course shifted by half a header; every brick its own tone from
   *  a world-space hash (UV0 = metres; non-repeating): dark red-brown, some burnt purple headers, a few orange ones;
   *  pale lime joints that stay visible as a coursing tone in the far field (box-filtered), recessed in the bump */
  brick_red_brussels: (o = {}) => {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const cv = w.y.div(0.06).toVar(), row = floor(cv).toVar(), fv = fract(cv).toVar();
      const header = mod(row, 2).toVar();
      const L = mix(float(0.25), float(0.125), header).toVar();
      const cu = w.x.div(L).add(mix(mod(floor(row.mul(0.5)), 2).mul(0.5), float(0.5), header)).toVar();
      const cell = floor(cu).toVar(), fu = fract(cu).toVar();
      const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00005).toVar();
      const e = min(min(fu, float(1).sub(fu)).mul(L), min(fv, float(1).sub(fv)).mul(0.06)).toVar();
      const jw = float(0.0055);
      const sharp = smoothstep(jw, jw.add(max(fw.mul(1.2), 0.002)), e);
      // far field: the joints' area share (bed joints 12/60 = 20 %) as a coverage, so the coursing never vanishes
      const far = smoothstep(0.006, 0.02, fw).toVar();
      const mask = mix(sharp, float(0.8), far).toVar();
      const h = hash2(vec2(cell, row)).toVar(), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0))).toVar();
      let b = mix(lin(0x6a2c1e), lin(0x833a28), h).mul(mix(float(0.8), float(1.12), h2));
      b = mix(b, lin(0x47231f), step(0.8, h2).mul(header).mul(0.8));     // burnt headers
      b = mix(b, lin(0x93492c), step(0.94, h).mul(0.7));                   // a few orange ones
      const mortar = lin(0xa69e90);
      const col = mix(mortar, mix(b, lin(0x6c3021), far.mul(0.6)), mask);
      return vec4(col, mask);
    })();
    const col = out.xyz, mask = out.w;
    return std({ colorNode: o.indoor ? col : weather(col, 0.5), roughnessNode: float(0.88), metalnessNode: float(0), normalNode: bumpNormal(mask.mul(0.003)) });
  },
  /** ASHLAR (gres ledien facing, Savonnieres crowning, Gobertange plinth: Arter 2014), PALE cream / sand as cleaned in
   *  2014: courses of 0.32 m, stones 0.55-1.05 m, per-stone tone from a world-space hash, thin lime joints; mouldings and
   *  dressed parts (codes) without coursing; light weathering */
  stone_white: (o = {}) => {
    const out = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const ch = float(0.32);
      const row = floor(w.y.div(ch)).toVar(), fv = fract(w.y.div(ch)).toVar();
      const L = hash2(vec2(row, 7.0)).mul(0.5).add(0.55).toVar();
      const cu = w.x.add(hash2(vec2(row, 1.0)).mul(3.0)).div(L).toVar(), cell = floor(cu).toVar(), fu = fract(cu).toVar();
      const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00005).toVar();
      const e = min(min(fu, float(1).sub(fu)).mul(L), min(fv, float(1).sub(fv)).mul(ch));
      const coursed = isC(cd, C.plain).mul(0.6).add(isC(cd, C.quoin)).add(isC(cd, C.plinth)).min(1).toVar();
      const joint = float(1).sub(smoothstep(0.003, float(0.003).add(max(fw.mul(1.2), 0.002)), e)).mul(float(1).sub(smoothstep(0.008, 0.03, fw)));
      const mask = float(1).sub(joint.mul(coursed).mul(0.8)).toVar();
      const hs = hash2(vec2(cell, row)).toVar();
      let tone = mix(lin(0xd9cdb0), lin(0xcdbb95), hs);
      tone = mix(tone, lin(0xc7c0ae), step(0.8, hash2(vec2(cell.add(31.0), row))).mul(0.6));
      tone = mix(tone, lin(0xe0d7c0), isC(cd, C.cornice).add(isC(cd, C.coping)).add(isC(cd, C.sculpture)).min(1).mul(0.7));
      tone = mix(tone, lin(0xc4bda9), isC(cd, C.plinth).mul(0.6));
      const grain = vnoise(w.mul(9.0)).mul(0.08).toVar();
      const col = mix(lin(0xc4bcaa), tone.mul(float(0.94).add(grain)), mask);
      return vec4(col, mask.mul(0.002).add(grain.mul(0.015)));
    })();
    return std({ colorNode: o.indoor ? out.xyz : weather(out.xyz, 0.6), roughnessNode: float(0.84), metalnessNode: float(0), normalNode: bumpNormal(out.w) });
  },
  stone_blue: () => {
    // petit granit: dark blue-grey, fine vertical chisel striations, a few pale crinoid flecks
    const col = Fn(() => {
      const w = uv(0).toVar();
      const stri = hash2(vec2(floor(w.x.mul(60.0)), floor(w.y.mul(1.5)))).mul(0.07);
      const fleck = step(0.985, hash2(floor(w.mul(70.0)))).mul(0.04);
      return mix(lin(0x464b52), lin(0x535960), hash2(floor(w.mul(1.3)))).mul(float(0.94).add(stri)).add(fleck);
    })();
    return std({ colorNode: col, roughnessNode: float(0.66), metalnessNode: float(0) });
  },
  slate: () => {
    // Spanish slates (2014: 20 x 30): exposure 0.125, 0.2 wide, half-lap shift; per-slate tone
    const out = Fn(() => {
      const w = uv(0).toVar();
      const cv = w.y.div(0.125).toVar(), row = floor(cv).toVar();
      const cu = w.x.div(0.2).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu);
      const h = hash2(vec2(cell, row)).toVar();
      const fw = max(fwidth(cv), fwidth(cu));
      const lap = mix(smoothstep(0.0, 0.1, fract(cv)).mul(smoothstep(0.0, 0.04, fract(cu))), float(0.88), smoothstep(0.2, 0.6, fw)).toVar();
      return vec4(mix(lin(0x30343b), lin(0x3d424b), h).mul(mix(float(0.75), float(1), lap)), lap);
    })();
    return std({ colorNode: out.xyz, roughnessNode: float(0.7), metalnessNode: float(0) });
  },
  copper_brown: () => {
    // the dome's copper (re-covered 2013-14): dark brown-grey oxide, per-sheet tone, seams a little brighter
    const col = Fn(() => {
      const w = uv(0).toVar();
      const sheet = hash2(vec2(floor(w.x.div(0.5)), floor(w.y.div(1.8))));
      const c = mix(lin(0x3a2e27), lin(0x47372d), sheet);
      return mix(c, c.mul(1.25), isCode(C.ridge));
    })();
    return noSSR(std({ colorNode: col, roughnessNode: float(0.55), metalnessNode: float(0.45) }));
  },
  copper_patina: () => {
    const gutter = isCode(C.gutter);
    const col = mix(lin(0x5a9a80), lin(0x5e4636), gutter.mul(0.55));
    return noSSR(std({ colorNode: col, roughnessNode: float(0.6), metalnessNode: mix(float(0.15), float(0.5), gutter) }));
  },
  zinc_roof() {
    return noSSR(std({ colorNode: lin(0x686d72), roughnessNode: float(0.5), metalnessNode: float(0.35) }));
  },
  wood_frame_dark() {
    // the doors: dark aubergine-brown oil paint (photos P02, Arter 2014); the louvres: dark weathered boards
    const cd = codeV();
    const door = isC(cd, C.door), louvre = isC(cd, C.louvre);
    const col = mix(mix(lin(0x3b2a1d), lin(0x3a2324), door), lin(0x2c2a27), louvre);
    return std({ colorNode: col, roughnessNode: mix(float(0.7), float(0.45), door), metalnessNode: float(0) });
  },
  glass_window() {
    // LEADED CLEAR GLASS (photos: the nave windows read pale grey with a fine grid of lead / iron, the sky in them):
    // rectangular quarries 0.22 x 0.3 with pale-grey lead lines, per-pane tilt shimmer, and a cheap sky reflection
    // (view-angle fresnel x the sky colour: no extra draw, no SSR needed). Night: warm glow from inside.
    const out = Fn(() => {
      const w = uv(0).toVar();
      const q = w.div(vec2(0.22, 0.3)).toVar();
      const f = fract(q).toVar();
      const fw = max(fwidth(q.x), fwidth(q.y)).max(0.0001).toVar();
      const leadOn = isCode(C.lead);
      const edge = min(min(f.x, float(1).sub(f.x)), min(f.y, float(1).sub(f.y)));
      const lead = float(1).sub(smoothstep(0.0, max(fw.mul(1.2), 0.05), edge)).mul(leadOn).mul(float(1).sub(smoothstep(0.3, 0.8, fw).mul(0.6))).toVar();
      const pane = hash2(floor(q)).toVar();
      const V = cameraPosition.sub(positionWorld).normalize();
      const ndv = clamp(dot(normalWorld, V), 0, 1);
      const fres = float(0.18).add(float(0.6).mul(float(1).sub(ndv).pow(3))).mul(pane.mul(0.5).add(0.75));
      const sky = mix(lin(0x8e9aa6), lin(0xb9c7d4), clamp(normalWorld.y.add(0.5), 0, 1));
      const glass = mix(lin(0x2a3236), sky, fres.mul(float(1).sub(env.uNight.mul(0.8))));
      return vec4(mix(glass, lin(0x9a9a94), lead), lead);
    })();
    const m = std({ colorNode: out.xyz, roughnessNode: mix(float(0.12), float(0.6), out.w), metalnessNode: float(0) });
    m.emissiveNode = lin(0xffc27a).mul(float(1).sub(out.w)).mul(env.uNight).mul(spLook.glow);
    m.mrtNode = mrt({ metalRough: vec3(0, float(0.6), float(0)) });       // keep SSR off the glass (cheap; the sky term above)
    return m;
  },
  cast_iron_green() {
    // wrought iron: window bars painted pale grey (photos: the nave windows' grids read light), anchors black; the clocks:
    // matt black dials, gilt rings / marks / hands
    const cd = codeV();
    const gilt = isC(cd, C.gilt), dialC = isC(cd, C.dial), pale = isC(cd, C.surround);
    const col = mix(mix(mix(lin(0x1a1b1b), lin(0xb4b2aa), pale), lin(0x0e0f10), dialC), lin(0xc9973c), gilt);
    return noSSR(std({ colorNode: col, roughnessNode: mix(mix(float(0.55), float(0.8), dialC), float(0.3), gilt), metalnessNode: mix(float(0.3), float(1.0), gilt) }));
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
