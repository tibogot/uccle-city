// THE UCCLE TOWN HALL (Place Jean Vander Elst; tools/blender/townhall.py -> tools/townhall_pack.mjs -> models/townhall/),
// shared by the Town Hall Lab and the city (?townhall=1).
//
// The GLB carries geometry only: one primitive per NAMED material slot (TH_SLOTS) per level of detail, a per-face code
// in COLOR_0.r (TH_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and
// the baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity today; the owner can point a
//     slot at another library material, e.g. stone_blue -> paving_concrete, without touching the model);
//   - SOURCE below is the ONE line that picks where those named materials come from: the temporary TSL versions in
//     this file, or the shared library (viewer/materials/, the Material Lab) once it lands;
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only) and, in the city, the dithered
//     LOD cross-fade (lodFade.js);
//   - setSlotMaterial(slot, material) swaps one slot live (the lab proves it).
// LODs are built offline with meshoptimizer (tools/townhall_pack.mjs): LOD0 = the Blender model, LOD1 = LOD0 simplified
// (shares LOD0's vertex buffers), LOD2 = the script's far variant trimmed. Nothing is simplified in the browser; the
// GLB decodes in MeshoptDecoder's workers and the AO map in a worker too.
//   const m = await loadTownHall();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, sin, dot,
  fwidth, max, mod, mrt, roughness, uniform,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD) */
export const TH_SLOTS = ["brick_red_brussels", "stone_white", "stone_blue", "slate", "zinc_roof", "wood_frame_white", "wood_frame_dark",
  "glass_window", "cast_iron_green"];
/** every name of the shared library (viewer/materials/, branch claude/materials): any slot may point at any of them */
export const LIBRARY_NAMES = ["brick_red_brussels", "brick_yellow", "brick_dark", "stone_white", "stone_blue", "render_white", "slate",
  "zinc_roof", "copper_patina", "painted_metal_white", "cast_iron_green", "wood_frame_white", "wood_frame_dark", "glass_window", "cobbles",
  "paving_concrete", "gravel_path", "lawn_edge"];
/** THE ADAPTER TABLE: GLB slot -> library material name */
export const SLOT_TABLE = Object.fromEntries(TH_SLOTS.map((s) => [s, s]));
export const TH_CODES = ["plain", "band", "surround", "cornice", "plinth", "pilaster", "sill", "keystone", "pediment", "baluster", "column",
  "interior", "seam", "coping", "console", "door"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band */
export const TH_LODS = [{ until: 110, band: 18 }, { until: 420, band: 50 }, { until: Infinity }];

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; when viewer/materials/ (the Material Lab's library) lands,
// set it to "./materials/library.js" (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name)
// or materials[name].
const SOURCE = "temp";

/** Live look controls (uniforms: no recompiles) */
export const thLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0) };

let promise = null;
export function loadTownHall() {
  return (promise ??= (async () => {
    const base = new URL("../models/townhall/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lods_json, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "townhall.glb"),
      fetch(base + "townhall.json").then((r) => r.json()),
      fetch(base + "townhall.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "townhall_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[townhall] material library not loaded:", e.message); return null; }),
    ]);
    const names = ["TownHall", "TownHall_lod1", "TownHall_lod2"];
    const lods = names.map(() => []);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1;
      for (let p = o; p && k < 0; p = p.parent) k = names.indexOf(p.name);
      if (k < 0) return;
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0));
    const materials = {};
    for (const s of TH_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `townhall_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot;
        m.castShadow = slot !== "glass_window"; m.receiveShadow = true;
        g.add(m);
      }
      groups.push(g);
      return g;
    };
    /** swap the material of one slot everywhere (made groups too): the material is cloned and gets the AO (+ fade) */
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

/** a named material from the library when SOURCE points at one, else the temporary version of that name */
function sourceMaterial(name, lib) {
  let m = null;
  if (lib) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? lib.getMaterial?.(name) ?? lib.materials?.[name] ?? lib.default?.[name] ?? null; }
    catch (e) { console.warn(`[townhall] library failed on "${name}":`, e.message); }
    if (!m) console.warn(`[townhall] library has no "${name}": temporary material`);
  }
  return m ?? (TEMP[name] ?? TEMP.render_white)();
}

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO (indirect
 *  light), and the colour darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `townhall ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, thLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, thLook.aoDirect));
  }
  m.userData.shared = true;
  m.userData.slot = slot;
  return m;
}

/** The AO map decoded OFF the main thread (worker: fetch, createImageBitmap, red channel), uploaded as R8 + mips. */
function loadAO(url) {
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
// Simple TSL stand-ins named like the shared library's materials (replaced by name when viewer/materials/ lands).
// They read only what every slot gets: UV0 in metres, the face code (COLOR_0.r), the world normal.
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const code = () => floor(attribute("color", "vec4").r.mul(16));
const isCode = (k) => float(1).sub(clamp(abs(code().sub(k)), 0, 1));
const C = Object.fromEntries(TH_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);

/** running-bond courses: cell ids, joint mask (fading to the mean far away) for blocks w x h (m) */
function courses(w, h, joint) {
  const wuv = uv(0);
  const cv = wuv.y.div(h), row = floor(cv);
  const cu = wuv.x.div(w).add(mod(row, 2).mul(0.5)), cell = floor(cu);
  const fw = max(fwidth(cv), fwidth(cu));
  const jv = smoothstep(0.0, joint / h, fract(cv)).mul(smoothstep(1.0, 1.0 - joint * 0.3 / h, fract(cv)));
  const ju = smoothstep(0.0, joint / w, fract(cu));
  return { row, cell, mask: mix(jv.mul(ju), float(0.85), smoothstep(0.2, 0.6, fw)) };
}
const brick = (c1, c2, burnt) => () => {
  const { row, cell, mask } = courses(0.205, 0.062, 0.011);
  const h = hash2(vec2(cell, row)), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0)));
  const b = mix(lin(c1), lin(c2), h).mul(mix(float(0.84), float(1.1), h2));
  const col = mix(mix(b, lin(burnt), step(0.94, h2).mul(0.6)), lin(0xa89f92), float(1).sub(mask));
  return std({ colorNode: col, roughnessNode: float(0.88), metalnessNode: float(0) });
};
const TEMP = {
  brick_red_brussels: brick(0x9a4a35, 0x7d3a29, 0x3e2219),
  brick_yellow: brick(0xc9a873, 0xb08f5c, 0x6e5a3c),
  brick_dark: brick(0x5a3a33, 0x46302b, 0x221715),
  stone_white() {
    const { row, cell, mask } = courses(0.82, 0.36, 0.006);
    const h = hash2(vec2(cell, row));
    const col = mix(lin(0xdcd5c3), lin(0xcac1ac), h).mul(mix(float(0.88), float(1), mask));
    // weathering: tops of cornices and bands, quoins' joints darker (by the face code and the normal)
    const up = clamp(normalWorld.y, 0, 1);
    const grime = mix(float(1), float(0.84), up.mul(isCode(C.cornice).add(isCode(C.band)).add(isCode(C.pediment)).add(isCode(C.sill)).min(1)))
      .mul(thLook.weather).add(float(1).sub(thLook.weather));
    return std({ colorNode: col.mul(grime), roughnessNode: float(0.8), metalnessNode: float(0) });
  },
  stone_blue() {
    const p = uv(0).mul(40), h = hash2(floor(p)), h2 = hash2(floor(p.mul(0.25)).add(7.0));
    const col = mix(lin(0x6b7075), lin(0x575c62), h.mul(0.5).add(h2.mul(0.5)));
    return std({ colorNode: col, roughnessNode: float(0.72), metalnessNode: float(0) });
  },
  render_white() { return std({ colorNode: lin(0xe4dfd4), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  slate() {
    const { row, cell, mask } = courses(0.3, 0.2, 0.02);
    const h = hash2(vec2(cell, row));
    return std({ colorNode: mix(lin(0x4a4f58), lin(0x3a3e47), h).mul(mix(float(0.74), float(1), mask)), roughnessNode: float(0.5), metalnessNode: float(0) });
  },
  zinc_roof() {
    const wuv = uv(0);
    const s = fract(wuv.x.div(0.5));
    const seam = smoothstep(0.0, 0.03, s).mul(smoothstep(1.0, 0.94, s));
    const h = hash2(vec2(floor(wuv.x.div(0.5)), floor(wuv.y.div(3.0))));
    let col = mix(lin(0x8a9196), lin(0x7a8287), h).mul(mix(float(0.84), float(1), seam));
    col = mix(col, lin(0x9aa1a5), isCode(C.seam).add(isCode(C.keystone)).min(1));
    return std({ colorNode: col, roughnessNode: float(0.5), metalnessNode: float(0.35) });
  },
  copper_patina() { return std({ colorNode: lin(0x5e9c88), roughnessNode: float(0.6), metalnessNode: float(0.15) }); },
  painted_metal_white() { return std({ colorNode: lin(0xe3e4df), roughnessNode: float(0.45), metalnessNode: float(0.05) }); },
  cast_iron_green() { return std({ colorNode: lin(0x1f2f26), roughnessNode: float(0.5), metalnessNode: float(0.55) }); },
  wood_frame_white() { return std({ colorNode: lin(0xeeece5), roughnessNode: float(0.45), metalnessNode: float(0) }); },
  wood_frame_dark() {
    const g = hash2(vec2(floor(uv(0).x.mul(90)), 2.0)).mul(0.25).add(0.85);
    return std({ colorNode: lin(0x1d2421).mul(g), roughnessNode: float(0.4), metalnessNode: float(0) });
  },
  glass_window() {
    const m = std({ colorNode: lin(0x141a20), roughnessNode: float(0.05), metalnessNode: float(0) });
    const h = hash2(floor(positionWorld.xz.div(3.3)).add(floor(positionWorld.y.div(4.2))));
    m.emissiveNode = lin(0xffc27a).mul(step(0.4, h)).mul(env.uNight).mul(env.uInteriorGlow).mul(0.9);
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  cobbles() { return std({ colorNode: lin(0x6f6a62), roughnessNode: float(0.85), metalnessNode: float(0) }); },
  paving_concrete() { return std({ colorNode: lin(0x9a968e), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  gravel_path() { return std({ colorNode: lin(0xa59a88), roughnessNode: float(0.95), metalnessNode: float(0) }); },
  lawn_edge() { return std({ colorNode: lin(0x3a3934), roughnessNode: float(0.6), metalnessNode: float(0.5) }); },
};
export const TH_TEMP_MATERIALS = TEMP;
