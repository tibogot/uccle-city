// THE GARE D'UCCLE-CALEVOET (the passenger building on line 124; tools/blender/calevoet_station.py ->
// tools/calevoet_pack.mjs -> models/calevoet_station/), shared by the Station Lab and the city (?calevoet=1).
// A copy of viewer/wolvendaelModel.js (the château's loader) with this building's slots and temporary materials.
//
// The GLB carries geometry only: one primitive per NAMED material slot (CV_SLOTS) per level of detail, a per-face code
// in COLOR_0.r (CV_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, the region width in COLOR_0.b (the
// anti-sparkle), world-metre UVs in TEXCOORD_0 and the baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at
// run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity today);
//   - SOURCE below is the ONE line that picks where those named materials come from: the temporary TSL versions in
//     this file, or the shared library (viewer/materials/, the Material Lab) once it lands;
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only); the dithered LOD cross-fade
//     (lodFade.js) lives on a fading COPY of it (fadeVariant), drawn only while a level is inside a hand-over band;
//   - setSlotMaterial(slot, material) swaps one slot live.
// LODs: LOD0 = Station (the full model), LOD1 = Station_far (the script's far variant, its own AO bake), LOD2 =
// Station_lod2 (the far variant through meshoptimizer, tools/calevoet_pack.mjs). Nothing is simplified in the browser.
//   const m = await loadCalevoet();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, normalView, positionWorld, length, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot,
  fwidth, max, min, mod, mrt, roughness, uniform, Fn, vec4, cameraPosition, normalize, pow, reflect, cameraViewMatrix, cross,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { fadeVariant, SMOOTH } from "./lodFade.js";
import { libSource } from "./materials/libSwitch.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD and node) */
export const CV_SLOTS = ["brick_painted_white", "stone_blue", "slate", "zinc_roof", "terracotta", "wood_frame_dark", "paint_grey_dark",
  "cast_iron_dark", "glass_window"];
/** every name of the shared library (viewer/materials/, branch claude/materials): any slot may point at any of them */
export const LIBRARY_NAMES = ["brick_red_brussels", "brick_yellow", "brick_dark", "stone_white", "stone_blue", "render_white", "slate",
  "zinc_roof", "copper_patina", "painted_metal_white", "cast_iron_green", "wood_frame_white", "wood_frame_dark", "glass_window", "cobbles",
  "paving_concrete", "gravel_path", "lawn_edge",
  // proposed for the library by the château and the station (the temporary versions below until the library has them)
  "render_white_lime", "wood_painted_grey", "terracotta", "brick_painted_white", "paint_grey_dark", "cast_iron_dark"];
/** THE ADAPTER TABLE: GLB slot -> library material name (identity: the station's own names; brick_painted_white ->
 *  render_white or wood_frame_dark -> the library's would use names that exist today) */
export const SLOT_TABLE = Object.fromEntries(CV_SLOTS.map((s) => [s, s]));
export const CV_CODES = ["plain", "block", "joint", "reveal", "sill", "surround", "band", "cornice", "plinth", "keystone", "frame", "bar",
  "pane", "louvre", "hung", "ridge"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band (the mesh audit's
 *  view ranges in tools/calevoet_pack.mjs are these bands' ends: 95 / 385 m) */
export const CV_LODS = [{ until: 80, band: 15 }, { until: 350, band: 35 }, { until: Infinity }];
/** the baked AO's weight per level (LOD1 = the far variant has its own bake; LOD2 keeps LOD1's lightmap) */
export const CV_LOD_AO = [1, 1, 1];

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; when viewer/materials/ (the Material Lab's library) lands,
// set it to "./materials/library.js" (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name)
// or materials[name].
const SOURCE = libSource("calevoet", "./materials/shipped.js");   // 2026-11-13: the library by default (?libmat=0: temp)

/** Live look controls (uniforms: no recompiles) */
export const cvLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0), thinFar: uniform(1.0),
  glassRefl: uniform(1.0), relief: uniform(1.0) };

let promise = null;
export function loadCalevoet() {
  return (promise ??= (async () => {
    const base = new URL("../models/calevoet_station/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lods_json, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "calevoet.glb"),
      fetch(base + "calevoet.json").then((r) => r.json()),
      fetch(base + "calevoet.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "calevoet_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[calevoet] material library not loaded:", e.message); return null; }),
    ]);
    const names = [["Station"], ["Station_far"], ["Station_lod2"]];
    const lods = names.map(() => []);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1;
      for (let p = o; p && k < 0; p = p.parent) k = names.findIndex((l) => l.includes(p.name));
      if (k < 0) return;
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0));
    const materials = {};
    for (const s of CV_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `calevoet_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material; m.userData.aoScale = CV_LOD_AO[k];
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
    catch (e) { console.warn(`[calevoet] library failed on "${name}":`, e.message); }
    if (!m) console.warn(`[calevoet] library has no "${name}": temporary material`);
  }
  return m ?? (TEMP[name] ?? TEMP.brick_painted_white)();
}

const AO_MIN = { wood_frame_dark: 0.6, paint_grey_dark: 0.5, glass_window: 0.5 };
/** the baked AO's weight per level (mesh.userData.aoScale, CV_LOD_AO) */
const lodAo = uniform(1).onObjectUpdate(({ object }) => object.userData.aoScale ?? 1);

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO (indirect
 *  light), and the colour darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `calevoet ${slot}`;
  // (joinery and shutters sit deep in the reveals and are thin: their baked AO floored, the photos show them bright)
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g).max(AO_MIN[slot] ?? 0);
  const aoK = mix(float(1), ao, cvLook.aoStrength.mul(lodAo));
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
  const k = smoothstep(0.6, 1.6, foot.div(width)).mul(cvLook.thinFar);
  // (the joinery keeps more of its share: the window frames read as a grid from 50 m)
  const cover = mix(float(1), clamp(width.mul(2.0).div(foot), slot === "wood_frame_dark" ? 0.75 : 0.35, 1.0), k);
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, cvLook.aoDirect)).mul(cover);
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
// Simple TSL stand-ins named like the slots (replaced by name when the shared library has them: SOURCE above).
// They read only what every slot gets: UV0 in metres (walls: along, height above 90 m TAW = the course levels the
// geometry's raked joints sit on; roofs: along the eave, up the slope), the face code (COLOR_0.r), the world normal.
// One Fn per material with .toVar() intermediates, a sin-free hash (the town hall's round 2 rules).
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const codeV = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (cd, k) => float(1).sub(clamp(abs(cd.sub(k)), 0, 1));
const C = Object.fromEntries(CV_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(1)) }); return m; };

// smooth value noise (bilinear over hash2 cells, smoothstep weights)
const vnoise = (p) => {
  const i = floor(p).toVar(), f = fract(p).toVar();
  const u2 = f.mul(f).mul(float(3).sub(f.mul(2))).toVar();
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u2.x), mix(c, d, u2.x), u2.y);
};
/** a gentle world-space normal relief (k = strength), faded out once its features are sub-pixel; returns a VIEW normal */
const relief = (k, scale) => {
  const w = positionWorld.toVar();
  const q = vec2(w.x.add(w.z), w.y).mul(scale);
  const fw = length(fwidth(q));
  const e = float(1).sub(smoothstep(0.35, 1.2, fw)).mul(cvLook.relief).mul(k);
  const nx = vnoise(q).sub(0.5).add(vnoise(q.mul(2.7).add(13.1)).sub(0.5).mul(0.5));
  const ny = vnoise(q.add(vec2(5.3, 9.1))).sub(0.5).add(vnoise(q.mul(2.7).add(31.7)).sub(0.5).mul(0.5));
  const nz = vnoise(q.add(vec2(17.1, 3.3))).sub(0.5);
  const n = normalize(normalWorld.add(vec3(nx, ny, nz).mul(e)));
  return cameraViewMatrix.transformDirection(n);
};


/** what clear glass reflects, as light (emissive): the sky gradient above the horizon, a dark band of trees just under it,
 *  the park below; Fresnel-weighted (the villa's, claude/vanbuuren) */
function glassReflection(k) {
  const v = normalize(cameraPosition.sub(positionWorld)).toVar();
  const n = normalWorld.toVar();
  const r = reflect(v.negate(), n).toVar();
  const ndv = clamp(abs(dot(v, n)), 0.0, 1.0);
  const fres = pow(float(1).sub(ndv), 3.0).mul(0.5).add(0.06);
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(0.0, 0.7, r.y));
  const skyline = hash2(floor(vec2(r.x, r.z).mul(9.0))).mul(0.12).add(0.06);           // the houses and trees opposite
  const below = mix(lin(0x3e4a35), lin(0x2c3326), smoothstep(-0.05, -0.4, r.y));
  const col = mix(below, sky, smoothstep(skyline.sub(0.03), skyline.add(0.03), r.y));
  return col.mul(fres).mul(k).mul(cvLook.glassRefl).mul(float(1).sub(env.uNight.mul(0.85)));
}

const TEMP = {
  brick_painted_white() {
    // painted brickwork (c00-c09: white / cream paint on brick, flaking on the south gable and the pavilion's corners):
    // courses of 6.5 cm on the wall's own UV0 (u along the wall, v = m TAW - 40: level all round), bricks 22 cm in a
    // stretcher bond, joints a little greyer and recessed (the normal bends in them), a paint tone per wall patch, the
    // paint lost in patches where the red brick shows (weather), grime toward the foot; codes: reveal darker, the
    // cornice / bands / labels a whiter fresh coat
    const m = std({ roughnessNode: float(0.9), metalnessNode: float(0) });
    const parts = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const cv = w.y.div(0.065).toVar(), row = floor(cv).toVar();
      const cu = w.x.div(0.225).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu).toVar();
      const fw = max(fwidth(cv), fwidth(cu)).toVar();
      const fv = fract(cv), fu = fract(cu);
      const joint = max(float(1).sub(smoothstep(0.0, 0.16, fv)), float(1).sub(smoothstep(0.0, 0.045, fu))).toVar();
      const jK = mix(joint, float(0.12), smoothstep(0.25, 0.7, fw)).toVar();
      const h = hash2(vec2(cell, row)).toVar();
      const patch = vnoise(w.mul(0.45)).toVar();
      const paint = mix(lin(0xf1efe9), lin(0xe4dfd2), patch).mul(float(0.97).add(h.mul(0.04))).toVar();
      // flaking: paint gone where a slow noise and a fine one agree (more on the gables' upper parts: v high)
      const flake = smoothstep(0.70, 0.78, vnoise(w.mul(1.3).add(5.0)).mul(0.6).add(vnoise(w.mul(7.0).add(1.0)).mul(0.4))).mul(cvLook.weather).mul(0.35).toVar();
      const brick = mix(lin(0x9b5a45), lin(0x7c4636), h).toVar();
      const c1 = mix(paint, brick, flake.mul(float(1).sub(isC(cd, C.cornice).add(isC(cd, C.surround)).add(isC(cd, C.band)).min(1))));
      const mortar = mix(lin(0xd9d5cb), lin(0xbdb6a8), flake);
      const c2 = mix(c1, mortar, jK.mul(0.55)).toVar();
      const grime = smoothstep(13.2, 11.8, w.y).mul(0.10).mul(cvLook.weather);
      const c3 = c2.mul(float(1).sub(grime)).mul(mix(float(1), float(0.94), isC(cd, C.reveal)));
      return vec4(c3, jK.mul(float(1).sub(smoothstep(0.2, 0.6, fw))));
    })();
    m.colorNode = parts.rgb;
    m.normalNode = Fn(() => {
      const n = normalWorld.toVar();
      const up = normalize(vec3(0, 1, 0).sub(n.mul(n.y))).toVar();
      const k = parts.a.mul(0.10).mul(cvLook.relief);
      return cameraViewMatrix.transformDirection(normalize(n.add(up.mul(k))));
    })();
    return m;
  },
  stone_blue() {
    // Belgian blue stone (the sills, thresholds: c03 dark grey-blue, bush-hammered, a little lighter on the wear)
    const col = Fn(() => {
      const w = uv(0).toVar();
      const blk = hash2(floor(w.mul(vec2(1.1, 2.6)))).toVar();
      const tool = hash2(floor(w.mul(55.0))).mul(0.5).add(hash2(floor(w.mul(19.0)).add(5.0)).mul(0.5));
      return mix(lin(0x3d4146), lin(0x4b4f53), blk).mul(float(0.88).add(tool.mul(0.18)));
    })();
    return std({ colorNode: col, roughnessNode: float(0.78), metalnessNode: float(0) });
  },
  slate() {
    // the main block's south gable is slate-hung (2018+): rectangular slates 30 x 20 cm in a broken bond, a tone per
    // slate, the butt lines dark; a soft sheen
    const m = std({ metalnessNode: float(0), roughnessNode: float(0.5) });
    m.colorNode = Fn(() => {
      const w = uv(0).toVar();
      const cv = w.y.div(0.20).toVar(), row = floor(cv).toVar();
      const cu = w.x.div(0.30).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu).toVar();
      const fw = max(fwidth(cv), fwidth(cu));
      const h = hash2(vec2(cell, row)).toVar();
      const tone = mix(lin(0x3a3f47), lin(0x4b515b), h).mul(mix(float(0.9), float(1.08), hash2(vec2(cell.add(3.0), row.mul(2.0)))));
      const fv = fract(cv), fu = fract(cu);
      const j = max(float(1).sub(smoothstep(0.0, 0.08, fv)), float(1).sub(smoothstep(0.0, 0.03, fu)).mul(0.7));
      return mix(tone, lin(0x1c1f24), mix(j, float(0.12), smoothstep(0.25, 0.7, fw)).mul(0.7));
    })();
    return m;
  },
  zinc_roof() {
    // weathered zinc (light blue-grey, c04 / c09: rust-brown streaks down the slope on the main block in 2008, paler
    // since): long tone bands along the seams, streaks down the slope; the rolls and seams a touch brighter
    const m = noSSR(std({ metalnessNode: float(0.35), roughnessNode: float(0.5) }));
    m.colorNode = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const band = hash2(vec2(floor(w.x.div(0.55)), 1.0)).toVar();
      const streak = smoothstep(0.55, 0.95, vnoise(vec2(w.x.mul(3.0), w.y.mul(0.25)).add(7.0))).mul(cvLook.weather).toVar();
      const base = mix(lin(0x9aa1a4), lin(0x8d9497), band).toVar();
      const c = mix(base, base.mul(lin(0xc9b39a)), streak.mul(0.35));
      return c.mul(mix(float(1), float(1.06), isC(cd, C.ridge)));
    })();
    return m;
  },
  terracotta() {
    // clay tiles: the south pavilion's new red interlocking tiles and the north pavilion's older ones (one slot): tiles 21 cm
    // wide along the eave (UV0.u), each with a rounded rib (the normal rolls across it), a tone per tile; the butt faces
    // (code joint) darker; the ridge tiles (code ridge) a little darker red
    const m = std({ metalnessNode: float(0), roughnessNode: float(0.75) });
    const parts = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const cu = w.x.div(0.21).toVar(), cell = floor(cu).toVar(), fu = fract(cu).toVar();
      const row = floor(w.y.div(0.33)).toVar();
      const h = hash2(vec2(cell, row)).toVar();
      const fw = fwidth(cu);
      const tone = mix(lin(0xa65538), lin(0x8e452e), h).mul(mix(float(0.92), float(1.08), hash2(vec2(cell.mul(3.0), row.add(5.0))))).toVar();
      const weathered = mix(tone, tone.mul(lin(0x8f8a80)).mul(1.25), smoothstep(0.6, 0.9, vnoise(w.mul(0.8).add(2.0))).mul(0.3).mul(cvLook.weather));
      const groove = float(1).sub(smoothstep(0.0, 0.08, min(fu, float(1).sub(fu)))).mul(float(1).sub(smoothstep(0.3, 0.8, fw)));
      const c1 = mix(weathered, lin(0x4a2418), groove.mul(0.5));
      const c2 = mix(c1, c1.mul(0.55), isC(cd, C.joint)).mul(mix(float(1), float(0.88), isC(cd, C.ridge)));
      return vec4(c2, fu.sub(0.5).mul(float(1).sub(smoothstep(0.3, 0.8, fw))));
    })();
    m.colorNode = parts.rgb;
    m.normalNode = Fn(() => {
      const n = normalWorld.toVar();
      const side = normalize(cross(vec3(0, 1, 0), n).add(vec3(1e-4, 0, 0))).toVar();
      const k = parts.a.mul(0.5).mul(cvLook.relief).mul(float(1).sub(isC(codeV(), C.ridge)));
      return cameraViewMatrix.transformDirection(normalize(n.add(side.mul(k))));
    })();
    return m;
  },
  wood_frame_dark() {
    // the window frames (c03: dark green-black; c09: brown in 2008): a dark brown-green paint, a little gloss
    const col = Fn(() => mix(lin(0x262a24), lin(0x2f2a24), hash2(floor(positionWorld.xz.mul(1.3)).add(floor(positionWorld.y.div(3.0))))))();
    return std({ colorNode: col, roughnessNode: float(0.42), metalnessNode: float(0) });
  },
  paint_grey_dark() {
    // the boards over the openings, the doors, the plinth, the bay's fascia (c00-c05: a dark blue-grey paint)
    const col = Fn(() => {
      const cd = codeV().toVar();
      const g = hash2(vec2(floor(uv(0).x.mul(40.0)), floor(uv(0).y.mul(3.0))));
      const base = mix(lin(0x4d545b), lin(0x3c434b), isC(cd, C.plinth).add(isC(cd, C.cornice)).min(1)).toVar();
      return base.mul(float(0.96).add(g.mul(0.06)));
    })();
    return std({ colorNode: col, roughnessNode: float(0.6), metalnessNode: float(0) });
  },
  cast_iron_dark() {
    // the canopy: columns, brackets, beams, the fascia (c04 / c09: near-black blue-grey paint with a soft sheen)
    return noSSR(std({ colorNode: lin(0x22272c), roughnessNode: float(0.45), metalnessNode: float(0.25) }));
  },
  glass_window() {
    // clear glass: the sky reflected with a Fresnel weight (emissive), behind it a dim room, net curtains in a third
    const m = std({ roughnessNode: float(0.08), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const h = hash2(floor(positionWorld.xz.div(2.6)).add(floor(positionWorld.y.div(3.4)))).toVar();
      const room = mix(lin(0x2a2826), lin(0x3d3934), h).mul(mix(float(0.8), float(1.15), hash2(vec2(h.mul(91.0), 3.0))));
      const pleat = abs(fract(uv(0).x.mul(7.0)).sub(0.5)).mul(2.0);
      const fw = fwidth(uv(0).x.mul(7.0));
      const lace = lin(0x9a968e).mul(mix(mix(float(0.82), float(1.0), pleat), float(0.91), smoothstep(0.3, 0.8, fw)));
      return mix(room, lace, step(0.6, h));
    })();
    m.emissiveNode = Fn(() => {
      const r = glassReflection(float(1)).toVar();
      const h = hash2(floor(positionWorld.xz.div(3.3)).add(floor(positionWorld.y.div(4.2))));
      return r.add(lin(0xffc27a).mul(step(0.4, h)).mul(env.uNight).mul(env.uInteriorGlow).mul(0.9));
    })();
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  // (library names that exist today, for the adapter table's swaps)
  render_white() { return std({ colorNode: lin(0xe4dfd4), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  brick_red_brussels() { return std({ colorNode: lin(0x8a4a38), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  wood_frame_white() { return std({ colorNode: lin(0xecebe4), roughnessNode: float(0.45), metalnessNode: float(0) }); },
  cast_iron_green() { return noSSR(std({ colorNode: lin(0x1f2f26), roughnessNode: float(0.5), metalnessNode: float(0.55) })); },
};
export const CV_TEMP_MATERIALS = TEMP;


/** the levels' cross-fade state at distance d (camera to the building's box): { shown, fades } for setLodFades
 *  (lodFade objectFade convention: the outgoing level keeps 2 + t, the incoming one t) */
export function cvLodState(d) {
  const shown = [], fades = [];
  let prevT = null;
  for (let k = 0; k < CV_LODS.length; k++) {
    const L = CV_LODS[k];
    const t = Number.isFinite(L.until) ? THREE.MathUtils.smoothstep(d, L.until - L.band, L.until + L.band) : 1;   // this level's fade-out
    const tin = prevT ?? 1;                                                                                          // the previous level's fade-out = this one's fade-in
    if (k === 0) { shown.push(t < 1); fades.push(2 + t); }
    else if (k === CV_LODS.length - 1) { shown.push(tin > 0); fades.push(tin); }
    else { shown.push(tin > 0 && t < 1); fades.push(tin < 1 ? tin : 2 + t); }
    prevT = t;
  }
  return { shown, fades };
}
