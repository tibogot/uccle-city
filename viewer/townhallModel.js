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
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only); the dithered LOD cross-fade
//     (lodFade.js) lives on a fading COPY of it (fadeVariant), drawn only while a level is inside a hand-over band
//     (setLodFades): outside the bands the materials have no discard and keep early-z;
//   - setSlotMaterial(slot, material) swaps one slot live (the lab proves it).
// LODs are built offline with meshoptimizer (tools/townhall_pack.mjs): LOD0 = the Blender model, LOD1 = LOD0 simplified
// (shares LOD0's vertex buffers), LOD2 = the script's far variant trimmed. Nothing is simplified in the browser; the
// GLB decodes in MeshoptDecoder's workers and the AO map in a worker too.
//   const m = await loadTownHall();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, normalView, positionWorld, length, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot,
  fwidth, max, min, mod, mrt, roughness, uniform, Fn, vec4,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { fadeVariant, SMOOTH } from "./lodFade.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD) */
export const TH_SLOTS = ["brick_red_brussels", "stone_white", "stone_blue", "slate", "zinc_roof", "wood_frame_white", "wood_frame_dark",
  "glass_window", "cast_iron_green", "cobbles"];
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
/** the baked AO's weight per level (see lodAo) */
export const TH_LOD_AO = [1, 0.55, 1];

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; when viewer/materials/ (the Material Lab's library) lands,
// set it to "./materials/library.js" (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name)
// or materials[name].
const SOURCE = "temp";

/** Live look controls (uniforms: no recompiles) */
export const thLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0), thinFar: uniform(1.0) };

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
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material; m.userData.aoScale = TH_LOD_AO[k];
        m.castShadow = slot !== "glass_window" && slot !== "cobbles"; m.receiveShadow = true;   // (the forecourt paving: ground)
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
 *  out). A level draws with the FADING COPIES of its materials (lodFade.fadeVariant: the dither discard) only while it is
 *  inside a hand-over band, and with its own opaque materials (no discard: early-z kept) otherwise. The copies must be
 *  compiled with the model (lodFade.fadeProxies -> the precompile queue), so the first hand-over builds no shader.
 *  (Saint-Pierre's fix, bb30b74; the town hall's portico close-up paid +0.92 ms for the discard everywhere.) */
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

/** the baked AO's weight per level (mesh.userData.aoScale): LOD1's AO is baked on LOD1 itself (per corner, COLOR_0.g;
 *  tools/blender/townhall_lod1_ao.py), where the simplification's overlapping leftovers read darker than LOD0's lightmap:
 *  0.55 matches LOD0's brightness at the 110 m hand-over (lab, side by side) */
const lodAo = uniform(1).onObjectUpdate(({ object }) => object.userData.aoScale ?? 1);

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO (indirect
 *  light), and the colour darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `townhall ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, thLook.aoStrength.mul(lodAo));
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  // (polish 2b) SMALL PARTS FAR AWAY: COLOR_0.b holds the width of the flat region a face belongs to (a quoin course's
  // top 3.5 cm, a band's top 15 cm, a glazing bar, a sill's edge...). Once the pixel footprint outgrows it, the part is a
  // sub-pixel sliver: a sunlit one on a shaded facade (or the reverse), or a white glazing bar on dark glass, lit lone
  // pixels = the sparkle the owner saw from ~90 m, shimmering while moving. There (1) its shading normal bends toward
  // the view direction: it shades like the wall it sits on; (2) its albedo is scaled by the share of the pixel it really
  // covers (a rasterised sliver covers a whole pixel or none): the facade converges to its average, no sparkle, no
  // shimmer. Close up nothing changes (a part only changes when narrower than ~0.6-1.6 pixel footprints).
  const cw = attribute("color", "vec4").b;
  const width = cw.mul(cw).mul(4.0).max(0.002);
  const foot = length(fwidth(positionWorld));               // ~ metres per pixel (x 1.4-2)
  const k = smoothstep(0.6, 1.6, foot.div(width)).mul(thLook.thinFar);
  const cover = mix(float(1), clamp(width.mul(2.0).div(foot), 0.35, 1.0), k);
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, thLook.aoDirect)).mul(cover);
  }
  m.normalNode = mix(src.normalNode ?? normalView, vec3(0, 0, 1), k).normalize();
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
// Every material is ONE Fn whose intermediates are .toVar(): TSL otherwise re-emits a shared sub-expression at each use
// (Saint-Pierre polish 2: that alone cost ~0.7 ms full-screen); the hash is sin-free (Hoskins hash12).
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const codeV = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (cd, k) => float(1).sub(clamp(abs(cd.sub(k)), 0, 1));
const C = Object.fromEntries(TH_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
/** no screen-space reflections on the small metal parts (railings, bars, finials, zinc rims and seams): the SSR pass
 *  traces every pixel whose metalness > 0 and the reflections are invisible at these sizes (Saint-Pierre: ~0.2 ms
 *  full-screen). The screen-space AO weight (.b) stays 1. */
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(1)) }); return m; };

/** running-bond courses (inside an Fn): cell ids, joint mask (fading to the mean far away) for blocks w x h (m) */
function courses(w, h, joint) {
  const wuv = uv(0).toVar();
  const cv = wuv.y.div(h).toVar(), row = floor(cv).toVar();
  const cu = wuv.x.div(w).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu).toVar();
  const fw = max(fwidth(cv), fwidth(cu)).toVar();
  const fv = fract(cv).toVar();
  const jv = smoothstep(0.0, joint / h, fv).mul(smoothstep(1.0, 1.0 - joint * 0.3 / h, fv));
  const ju = smoothstep(0.0, joint / w, fract(cu));
  return { row, cell, mask: mix(jv.mul(ju), float(0.85), smoothstep(0.2, 0.6, fw)).toVar() };
}
const brick = (c1, c2, burnt) => () => {
  const col = Fn(() => {
    const { row, cell, mask } = courses(0.205, 0.062, 0.011);
    const h = hash2(vec2(cell, row)).toVar(), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0))).toVar();
    const b = mix(lin(c1), lin(c2), h).mul(mix(float(0.84), float(1.1), h2));
    return mix(mix(b, lin(burnt), step(0.94, h2).mul(0.6)), lin(0xa89f92), float(1).sub(mask));
  })();
  return std({ colorNode: col, roughnessNode: float(0.88), metalnessNode: float(0) });
};
const TEMP = {
  brick_red_brussels: brick(0x9a4a35, 0x7d3a29, 0x3e2219),
  brick_yellow: brick(0xc9a873, 0xb08f5c, 0x6e5a3c),
  brick_dark: brick(0x5a3a33, 0x46302b, 0x221715),
  stone_white() {
    const col = Fn(() => {
      const { row, cell, mask } = courses(0.82, 0.36, 0.006);
      const h = hash2(vec2(cell, row));
      const c = mix(lin(0xdcd5c3), lin(0xcac1ac), h).mul(mix(float(0.88), float(1), mask)).toVar();
      // weathering: tops of cornices and bands, quoins' joints darker (by the face code and the normal)
      const cd = codeV().toVar();
      const up = clamp(normalWorld.y, 0, 1);
      const ledge = isC(cd, C.cornice).add(isC(cd, C.band)).add(isC(cd, C.pediment)).add(isC(cd, C.sill)).min(1);
      const grime = mix(float(1), float(0.84), up.mul(ledge)).mul(thLook.weather).add(float(1).sub(thLook.weather));
      return c.mul(grime);
    })();
    return std({ colorNode: col, roughnessNode: float(0.8), metalnessNode: float(0) });
  },
  stone_blue() {
    // Belgian blue stone (petit granit) as the photos show it on the plinth and the perron: BUSH-HAMMERED and weathered,
    // so it reads PALE grey (P01 / P03), not the dark polished blue-grey (that was the temp material's mistake, polish
    // round 2: the baked AO there is normal). Fine tooling speckle, a slight tone per block, pale crinoid flecks.
    const col = Fn(() => {
      const w = uv(0).toVar();
      const blk = hash2(floor(w.mul(vec2(1.1, 2.6)))).toVar();
      const tool = hash2(floor(w.mul(55.0))).mul(0.5).add(hash2(floor(w.mul(19.0)).add(5.0)).mul(0.5));
      const fleck = step(0.975, hash2(floor(w.mul(80.0)).add(11.0))).mul(0.05);
      return mix(lin(0xa4a5a1), lin(0xb2b2ac), blk).mul(float(0.9).add(tool.mul(0.14))).add(fleck);
    })();
    return std({ colorNode: col, roughnessNode: float(0.82), metalnessNode: float(0) });
  },
  render_white() { return std({ colorNode: lin(0xe4dfd4), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  slate() {
    const col = Fn(() => {
      const { row, cell, mask } = courses(0.3, 0.2, 0.02);
      const h = hash2(vec2(cell, row));
      return mix(lin(0x646a73), lin(0x535861), h).mul(mix(float(0.74), float(1), mask));
    })();
    return std({ colorNode: col, roughnessNode: float(0.5), metalnessNode: float(0) });
  },
  zinc_roof() {
    const col = Fn(() => {
      const wuv = uv(0).toVar();
      const x = wuv.x.div(0.5).toVar();
      const s = fract(x);
      const seam = smoothstep(0.0, 0.03, s).mul(smoothstep(1.0, 0.94, s));
      const h = hash2(vec2(floor(x), floor(wuv.y.div(3.0))));
      const cd = codeV();
      const c = mix(lin(0x8a9196), lin(0x7a8287), h).mul(mix(float(0.84), float(1), seam));
      return mix(c, lin(0x9aa1a5), isC(cd, C.seam).add(isC(cd, C.keystone)).min(1));
    })();
    return noSSR(std({ colorNode: col, roughnessNode: float(0.5), metalnessNode: float(0.35) }));
  },
  copper_patina() { return noSSR(std({ colorNode: lin(0x5e9c88), roughnessNode: float(0.6), metalnessNode: float(0.15) })); },
  painted_metal_white() { return noSSR(std({ colorNode: lin(0xe3e4df), roughnessNode: float(0.45), metalnessNode: float(0.05) })); },
  cast_iron_green() { return noSSR(std({ colorNode: lin(0x1f2f26), roughnessNode: float(0.5), metalnessNode: float(0.55) })); },
  wood_frame_white() { return std({ colorNode: lin(0xeeece5), roughnessNode: float(0.45), metalnessNode: float(0) }); },
  wood_frame_dark() {
    const col = Fn(() => lin(0x1d2421).mul(hash2(vec2(floor(uv(0).x.mul(90)), 2.0)).mul(0.25).add(0.85)))();
    return std({ colorNode: col, roughnessNode: float(0.4), metalnessNode: float(0) });
  },
  glass_window() {
    const m = std({ colorNode: lin(0x141a20), roughnessNode: float(0.05), metalnessNode: float(0) });
    m.emissiveNode = Fn(() => {
      const h = hash2(floor(positionWorld.xz.div(3.3)).add(floor(positionWorld.y.div(4.2))));
      return lin(0xffc27a).mul(step(0.4, h)).mul(env.uNight).mul(env.uInteriorGlow).mul(0.9);
    })();
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  cobbles() {
    // the forecourt: grey sandstone / porphyry setts ~10 x 14 cm in straight courses, sanded joints, a tone per sett
    const col = Fn(() => {
      const { row, cell, mask } = courses(0.14, 0.1, 0.012);
      const h = hash2(vec2(cell, row)).toVar();
      const tone = mix(lin(0x7c7871), lin(0x67645f), h).mul(mix(float(0.92), float(1.06), hash2(vec2(cell.add(5.0), row))));
      return mix(lin(0x8e8a80), tone, mask);
    })();
    return std({ colorNode: col, roughnessNode: float(0.86), metalnessNode: float(0) });
  },
  paving_concrete() { return std({ colorNode: lin(0x9a968e), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  gravel_path() { return std({ colorNode: lin(0xa59a88), roughnessNode: float(0.95), metalnessNode: float(0) }); },
  lawn_edge() { return std({ colorNode: lin(0x3a3934), roughnessNode: float(0.6), metalnessNode: float(0.5) }); },
};
export const TH_TEMP_MATERIALS = TEMP;
