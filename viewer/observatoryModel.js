// THE ROYAL OBSERVATORY OF BELGIUM (tools/blender/observatory.py -> tools/observatory_pack.mjs -> models/observatory/),
// shared by the Observatory Lab and the city (?observatory=1).
//
// The GLB carries geometry only: one primitive per NAMED material slot (OBS_SLOTS) per level of detail, a per-face
// code in COLOR_0.r (OBS_CODES), world-metre UVs in TEXCOORD_0 and the baked ambient occlusion's UVs in TEXCOORD_1.
// COLOR_0.g carries the per-vertex AO of the thin faces (lighting only). Colour and pattern come at run time from the
// material of that slot's NAME:
//   - SOURCE below is the ONE line that picks where the materials come from: the temporary TSL versions in this file,
//     or the shared library (viewer/materials/, the Material Lab) once it lands;
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only) and, in the city, the
//     dithered LOD cross-fade (lodFade.js);
//   - setSlotMaterial(slot, material) swaps one slot live (the lab tests it).
// Levels of detail are built offline with meshoptimizer (tools/observatory_pack.mjs): LOD0 = the Blender model,
// LOD1 = LOD0 simplified (shares LOD0's vertex buffers), LOD2 = the script's far variant trimmed. Nothing is
// simplified in the browser; the GLB decodes in MeshoptDecoder's workers and the AO map in a worker too.
//   const m = await loadObservatory();  m.make(k) -> Group;  m.lodFor(cameraPos) -> k;  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, sin, dot,
  fwidth, max, mod, mrt, roughness, uniform,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { libSource } from "./materials/libSwitch.js";

export const OBS_SLOTS = ["brick_red_brussels", "stone_white", "stone_blue", "copper_patina", "painted_metal_white", "zinc_roof", "slate",
  "render_white", "wood_frame_white", "glass_window", "cast_iron_green", "gravel_path", "lawn_edge"];
export const OBS_CODES = ["plain", "band", "surround", "cornice", "plinth", "pilaster", "sill", "keystone", "dome", "rib", "shutter",
  "interior", "seam", "parapet_coping", "console", "door"];
/** LOD switch distances (m, camera to the campus' bounding box) and the half-width of each cross-fade band */
export const OBS_LODS = [{ until: 150, band: 22 }, { until: 520, band: 60 }, { until: Infinity }];

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; when viewer/materials/ (the Material Lab's library) lands,
// set it to "./materials/index.js" (a module exporting getMaterial(name) or materials[name] -> a NodeMaterial).
const SOURCE = libSource("observatory", "./materials/shipped.js");   // 2026-11-13: the library by default (?libmat=0: temp)

/** Live look controls (uniforms: no recompiles) */
export const obsLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.5), weather: uniform(1.0) };

const promises = {};
/** set: the models/ folder ("observatory"; the lab's ?set=observatory_before shows an older build for A/B) */
export function loadObservatory(set = "observatory") {
  return (promises[set] ??= (async () => {
    const base = new URL(`../models/${set}/`, import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "observatory.glb"),
      fetch(base + "observatory.json").then((r) => r.json()),
      loadAO(base + "observatory_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[observatory] material library not loaded:", e.message); return null; }),
    ]);
    const names = ["Observatory", "Observatory_lod1", "Observatory_lod2"];
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
    // one material per slot (the source's, wrapped with the AO)
    const vtx = !!notes.codes?.["COLOR_0.g"];          // builds before 2026-11-06 had no vertex AO
    const wrap = (m, s) => wrapAO(m, aoTex, s, vtx);
    const materials = {};
    for (const s of OBS_SLOTS) materials[s] = wrap(sourceMaterial(s, lib), s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], 96, b.z[0]), new THREE.Vector3(b.x[1], 120, b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `observatory_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot;
        m.castShadow = !["glass_window", "gravel_path", "lawn_edge"].includes(slot); m.receiveShadow = true;
        g.add(m);
      }
      groups.push(g);
      return g;
    };
    /** swap the material of one slot everywhere (made groups too): the material is cloned and gets the AO (+ fade) */
    const setSlotMaterial = (slot, mat, { fade = null, dryRun = false, raw = false } = {}) => {
      const w = raw ? mat : wrap(mat, slot);       // raw: already wrapped (a dry run's result)
      if (fade && !raw) fade(w);
      if (dryRun) return w;
      materials[slot] = w;
      for (const g of groups) g.traverse((o) => { if (o.isMesh && o.userData.slot === slot) o.material = w; });
      return w;
    };
    const tmp = new THREE.Vector3();
    const distance = (p) => boundsWorld.distanceToPoint(tmp.copy(p));
    return {
      lods, tris, materials, notes, placement, boundsWorld, make, setSlotMaterial, distance, aoTex,
      aoBytes: aoTex.userData.bytes, glbBytes: notes.glbBytes, tempMaterial: (s) => wrap(TEMP[s](), s),
      drawCalls: lods.map((l) => l.length),
    };
  })());
}

function sourceMaterial(slot, lib) {
  const m = lib && (lib.getMaterial?.(slot) ?? lib.materials?.[slot] ?? lib.default?.[slot]);
  if (m) return m;
  if (lib) console.warn(`[observatory] library has no "${slot}": temporary material`);
  return TEMP[slot]();
}

/** The baked AO (lighting only) on top of any slot material: a clone with aoNode = AO (indirect light) and the colour
 *  darkened by a share of it (the direct light: sun-lit crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot, vtx = true) {
  const m = src.clone();
  m.name = `observatory ${slot}`;
  // the lightmap times the per-vertex AO of the thin faces (COLOR_0.g: band tops, glazing bars, ribs; 1 elsewhere)
  const ao = vtx ? texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g) : texture(aoTex, uv(1)).r;
  const aoK = mix(float(1), ao, obsLook.aoStrength);
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, obsLook.aoDirect));
  }
  m.userData.shared = true;
  m.userData.slot = slot;
  return m;
}

/** The AO map decoded OFF the main thread (a worker: fetch, createImageBitmap, read the red channel) and uploaded as
 *  one channel (R8 + GPU mips: 2048 px = 5.6 MB, not 22 MB as RGBA). */
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
// Simple TSL versions of the shared library's slots (replaced by name when viewer/materials/ lands). They read only
// what every slot gets: UV0 in metres, the face code (COLOR_0.r), the world normal.
const hash2 = (p) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453));
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const code = () => floor(attribute("color", "vec4").r.mul(16));
const isCode = (k) => float(1).sub(clamp(abs(code().sub(k)), 0, 1));
const C = Object.fromEntries(OBS_CODES.map((n, i) => [n, i]));
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

const TEMP = {
  brick_red_brussels() {
    const { row, cell, mask } = courses(0.205, 0.062, 0.011);
    const h = hash2(vec2(cell, row)), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0)));
    const brick = mix(lin(0x9d4429), lin(0x7a3220), h).mul(mix(float(0.84), float(1.1), h2));
    const burnt = step(0.94, h2);
    const col = mix(mix(brick, lin(0x3e2219), burnt.mul(0.65)), lin(0xa89f92), float(1).sub(mask));
    return std({ colorNode: col, roughnessNode: float(0.88), metalnessNode: float(0) });
  },
  stone_white() {
    const { row, cell, mask } = courses(0.82, 0.19, 0.006);
    const h = hash2(vec2(cell, row));
    const col = mix(lin(0xd9d3c4), lin(0xc6bead), h).mul(mix(float(0.86), float(1), mask));
    // weathering: the bands and cornices darken a little on their tops / under drips (by the normal)
    const up = clamp(normalWorld.y, 0, 1);
    const grime = mix(float(1), float(0.86), up.mul(isCode(C.cornice).add(isCode(C.band)).add(isCode(C.parapet_coping)).min(1))).mul(obsLook.weather).add(float(1).sub(obsLook.weather));
    return std({ colorNode: col.mul(grime), roughnessNode: float(0.78), metalnessNode: float(0) });
  },
  stone_blue() {
    const p = uv(0).mul(40), h = hash2(floor(p)), h2 = hash2(floor(p.mul(0.25)).add(7.0));
    const col = mix(lin(0x51575c), lin(0x3f444a), h.mul(0.5).add(h2.mul(0.5)));
    return std({ colorNode: col, roughnessNode: float(0.7), metalnessNode: float(0) });
  },
  copper_patina() {
    // verdigris: panels along the dome's arc length, streaks running down, darker ribs, the inside dark
    const wuv = uv(0);
    const panel = floor(wuv.x.div(0.62));
    const h = hash2(vec2(panel, floor(wuv.y.div(2.4))));
    const streak = hash2(vec2(floor(wuv.x.div(0.09)), 3.0)).mul(0.5).add(0.5);
    let col = mix(lin(0x6aa894), lin(0x4f8c78), h).mul(mix(float(0.88), float(1.06), streak));
    col = mix(col, lin(0x355e52), isCode(C.rib).mul(0.6));
    col = mix(col, lin(0x2a2c2a), isCode(C.interior));
    return std({ colorNode: col, roughnessNode: float(0.62), metalnessNode: float(0.15) });
  },
  painted_metal_white() {
    const wuv = uv(0);
    const seam = smoothstep(0.0, 0.02, fract(wuv.x.div(0.9))).mul(0.12).add(0.88);
    let col = mix(lin(0xe3e4df), lin(0xd4d6d2), hash2(vec2(floor(wuv.x.div(0.9)), 1.0))).mul(mix(float(1), seam, smoothstep(0.4, 0.1, max(fwidth(wuv.x), 0.0))));
    col = mix(col, lin(0x5a5d5c), isCode(C.interior));
    return std({ colorNode: col, roughnessNode: mix(float(0.42), float(0.8), isCode(C.interior)), metalnessNode: float(0.05) });
  },
  zinc_roof() {
    const wuv = uv(0);
    const s = fract(wuv.x.div(0.53));
    const seam = smoothstep(0.0, 0.03, s).mul(smoothstep(1.0, 0.94, s));
    const h = hash2(vec2(floor(wuv.x.div(0.53)), floor(wuv.y.div(3.0))));
    const col = mix(lin(0x7a8288), lin(0x6c7378), h).mul(mix(float(0.8), float(1), seam));
    return std({ colorNode: col, roughnessNode: float(0.55), metalnessNode: float(0.35) });
  },
  slate() {
    const { row, cell, mask } = courses(0.3, 0.22, 0.02);
    const h = hash2(vec2(cell, row));
    return std({ colorNode: mix(lin(0x474c55), lin(0x383c44), h).mul(mix(float(0.72), float(1), mask)), roughnessNode: float(0.55), metalnessNode: float(0) });
  },
  render_white() { return std({ colorNode: lin(0xe4dfd4), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  wood_frame_white() {
    const col = mix(lin(0xefede6), lin(0xe8e4da), isCode(C.door));
    return std({ colorNode: col, roughnessNode: float(0.45), metalnessNode: float(0) });
  },
  glass_window() {
    const m = std({ colorNode: lin(0x161b20), roughnessNode: float(0.06), metalnessNode: float(0) });
    // warm interior light at night (the city's night look), no screen-space AO on glass
    const h = hash2(floor(positionWorld.xz.div(3.7)));
    m.emissiveNode = lin(0xffc27a).mul(step(0.45, h)).mul(env.uNight).mul(env.uInteriorGlow).mul(0.9);
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  cast_iron_green() { return std({ colorNode: lin(0x22382b), roughnessNode: float(0.5), metalnessNode: float(0.55) }); },
  gravel_path() {
    const p = uv(0).mul(28), h = hash2(floor(p)), h2 = hash2(floor(p.mul(0.37)).add(5.0));
    return std({ colorNode: mix(lin(0xa59a88), lin(0x857a69), h).mul(mix(float(0.9), float(1.05), h2)), roughnessNode: float(0.95), metalnessNode: float(0) });
  },
  lawn_edge() { return std({ colorNode: lin(0x3a3934), roughnessNode: float(0.6), metalnessNode: float(0.5) }); },
};
export const OBS_TEMP_MATERIALS = TEMP;
