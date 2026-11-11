// THE CHATEAU DE WOLVENDAEL (Parc de Wolvendael, Uccle; 18th c.; tools/blender/wolvendael_chateau.py ->
// tools/wolvendael_pack.mjs -> models/wolvendael_chateau/), shared by the Chateau Lab and the city (?wolvendael=1).
// Built like viewer/vanbuurenModel.js (claude/vanbuuren) and viewer/townhallModel.js.
//
// The GLB carries geometry only: one primitive per NAMED material slot (WV_SLOTS) per level of detail, a per-face code
// in COLOR_0.r (WV_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, the region width in COLOR_0.b (the
// anti-sparkle), world-metre UVs in TEXCOORD_0 and the baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at
// run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity today);
//   - SOURCE below is the ONE line that picks where those named materials come from: the temporary TSL versions in
//     this file, or the shared library (viewer/materials/, the Material Lab) once it lands;
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only); the dithered LOD cross-fade
//     (lodFade.js) lives on a fading COPY of it (fadeVariant), drawn only while a level is inside a hand-over band;
//   - setSlotMaterial(slot, material) swaps one slot live.
// LODs: LOD0 = Chateau (the full model), LOD1 = Chateau_far (the script's far variant, its own AO bake), LOD2 =
// Chateau_lod2 (the far variant through meshoptimizer, tools/wolvendael_pack.mjs). Nothing is simplified in the browser.
//   const m = await loadWolvendael();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, normalView, positionWorld, length, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot,
  fwidth, max, min, mod, mrt, roughness, uniform, Fn, vec4, cameraPosition, normalize, pow, reflect, cameraViewMatrix,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { fadeVariant, SMOOTH } from "./lodFade.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD and node) */
export const WV_SLOTS = ["render_white_lime", "stone_white", "stone_blue", "slate", "zinc_roof", "wood_frame_white", "wood_painted_grey",
  "glass_window", "terracotta"];
/** every name of the shared library (viewer/materials/, branch claude/materials): any slot may point at any of them */
export const LIBRARY_NAMES = ["brick_red_brussels", "brick_yellow", "brick_dark", "stone_white", "stone_blue", "render_white", "slate",
  "zinc_roof", "copper_patina", "painted_metal_white", "cast_iron_green", "wood_frame_white", "wood_frame_dark", "glass_window", "cobbles",
  "paving_concrete", "gravel_path", "lawn_edge",
  // proposed for the library by the chateau (the temporary versions below until the library has them)
  "render_white_lime", "wood_painted_grey", "terracotta"];
/** THE ADAPTER TABLE: GLB slot -> library material name (identity: the chateau's own names; render_white_lime ->
 *  render_white would use a library name that exists today) */
export const SLOT_TABLE = Object.fromEntries(WV_SLOTS.map((s) => [s, s]));
export const WV_CODES = ["plain", "block", "joint", "reveal", "sill", "surround", "band", "cornice", "plinth", "keystone", "frame", "bar",
  "pane", "louvre", "hung", "ridge"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band (the mesh audit's
 *  view ranges in tools/wolvendael_pack.mjs are these bands' ends: 105 / 440 m) */
export const WV_LODS = [{ until: 90, band: 15 }, { until: 400, band: 40 }, { until: Infinity }];
/** the baked AO's weight per level (LOD1 = the far variant has its own bake; LOD2 keeps LOD1's lightmap) */
export const WV_LOD_AO = [1, 1, 1];

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; when viewer/materials/ (the Material Lab's library) lands,
// set it to "./materials/library.js" (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name)
// or materials[name].
const SOURCE = "temp";

/** Live look controls (uniforms: no recompiles) */
export const wvLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0), thinFar: uniform(1.0),
  glassRefl: uniform(1.0), relief: uniform(1.0) };

let promise = null;
export function loadWolvendael() {
  return (promise ??= (async () => {
    const base = new URL("../models/wolvendael_chateau/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lods_json, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "wolvendael.glb"),
      fetch(base + "wolvendael.json").then((r) => r.json()),
      fetch(base + "wolvendael.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "wolvendael_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[wolvendael] material library not loaded:", e.message); return null; }),
    ]);
    const names = [["Chateau"], ["Chateau_far"], ["Chateau_lod2"]];
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
    for (const s of WV_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `wolvendael_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material; m.userData.aoScale = WV_LOD_AO[k];
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
    catch (e) { console.warn(`[wolvendael] library failed on "${name}":`, e.message); }
    if (!m) console.warn(`[wolvendael] library has no "${name}": temporary material`);
  }
  return m ?? (TEMP[name] ?? TEMP.render_white_lime)();
}

/** the baked AO's weight per level (mesh.userData.aoScale, WV_LOD_AO) */
const lodAo = uniform(1).onObjectUpdate(({ object }) => object.userData.aoScale ?? 1);

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO (indirect
 *  light), and the colour darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `wolvendael ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g);
  const aoK = mix(float(1), ao, wvLook.aoStrength.mul(lodAo));
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
  const k = smoothstep(0.6, 1.6, foot.div(width)).mul(wvLook.thinFar);
  const cover = mix(float(1), clamp(width.mul(2.0).div(foot), 0.35, 1.0), k);
  if (slot !== "glass_window") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, wvLook.aoDirect)).mul(cover);
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
const C = Object.fromEntries(WV_CODES.map((n, i) => [n, i]));
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
  const e = float(1).sub(smoothstep(0.35, 1.2, fw)).mul(wvLook.relief).mul(k);
  const nx = vnoise(q).sub(0.5).add(vnoise(q.mul(2.7).add(13.1)).sub(0.5).mul(0.5));
  const ny = vnoise(q.add(vec2(5.3, 9.1))).sub(0.5).add(vnoise(q.mul(2.7).add(31.7)).sub(0.5).mul(0.5));
  const nz = vnoise(q.add(vec2(17.1, 3.3))).sub(0.5);
  const n = normalize(normalWorld.add(vec3(nx, ny, nz).mul(e)));
  return cameraViewMatrix.transformDirection(n);
};
// the stone courses of the quoins and strips (tools/blender/wolvendael_chateau.py quoin_courses: 23 courses from 50.32
// to 56.98 m TAW; UV0.v = m TAW - 40)
const Q0 = 10.32, QH = (56.98 - 50.32) / 23;

/** what clear glass reflects, as light (emissive): the sky gradient above the horizon, a dark band of trees just under it,
 *  the park below; Fresnel-weighted (the villa's, claude/vanbuuren) */
function glassReflection(k) {
  const v = normalize(cameraPosition.sub(positionWorld)).toVar();
  const n = normalWorld.toVar();
  const r = reflect(v.negate(), n).toVar();
  const ndv = clamp(abs(dot(v, n)), 0.0, 1.0);
  const fres = pow(float(1).sub(ndv), 3.0).mul(0.45).add(0.025);
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(0.0, 0.7, r.y));
  const skyline = hash2(floor(vec2(r.x, r.z).mul(9.0))).mul(0.16).add(0.10);           // the park's trees opposite
  const below = mix(lin(0x3e4a35), lin(0x2c3326), smoothstep(-0.05, -0.4, r.y));
  const col = mix(below, sky, smoothstep(skyline.sub(0.03), skyline.add(0.03), r.y));
  return col.mul(fres).mul(k).mul(wvLook.glassRefl).mul(float(1).sub(env.uNight.mul(0.85)));
}

const TEMP = {
  render_white_lime() {
    // white lime render (the photos: a warm white, a little cool in shade): soft lumps of tone from the hand-laid coats,
    // a fine sand grain, faint rain streaks (stretched noise), the plinth greyer with a soil splash at its foot; a gentle
    // orange-peel relief in the normal (fades out once sub-pixel)
    const m = std({ roughnessNode: float(0.93), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const lump = vnoise(w.mul(0.55)).mul(0.6).add(vnoise(w.mul(2.1).add(7.0)).mul(0.4)).toVar();
      const grain = hash2(floor(w.mul(160.0))).toVar();
      const fwG = length(fwidth(w.mul(160.0)));
      const g = mix(grain, float(0.5), smoothstep(0.4, 1.0, fwG));
      const streak = smoothstep(0.55, 0.95, vnoise(vec2(w.x.mul(2.6), w.y.mul(0.16)).add(3.0))).mul(wvLook.weather);
      const base = mix(lin(0xe9e6dd), lin(0xdcd8cc), lump).mul(float(0.97).add(g.mul(0.05))).toVar();
      const streaked = base.mul(float(1).sub(streak.mul(0.07)));
      // the plinth: a greyer render, darker toward its foot (v = m TAW - 40; the floor is at 10.35)
      const foot = smoothstep(9.9, 7.5, w.y).mul(isC(cd, C.plinth));
      const pl = mix(streaked, streaked.mul(lin(0xcfccbf)).mul(1.08), isC(cd, C.plinth)).mul(float(1).sub(foot.mul(0.18)));
      // reveals a touch darker (less weathered paint, in shade)
      return pl.mul(mix(float(1), float(0.96), isC(cd, C.reveal)));
    })();
    m.normalNode = relief(0.06, 5.0);
    return m;
  },
  stone_white() {
    // the quoins, strips, cornice, bands, sills, keystones: a warm pale limestone / sandstone (w02, w04: beige-grey against
    // the white render); a tone per block (LOD0 blocks are geometry; the far plates have code "block": the courses
    // painted); the plate between the LOD0 blocks (code "joint") is the mortar; grime in the blocks' lower part
    const m = std({ roughnessNode: float(0.86), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const cv = w.y.sub(Q0).div(QH).toVar(), row = floor(cv).toVar();
      const h = hash2(vec2(row, floor(w.x.mul(1.8)).add(row.mul(0.37)))).toVar();
      const speck = hash2(floor(w.mul(90.0))).toVar();
      const fws = length(fwidth(w.mul(90.0)));
      const sp = mix(speck, float(0.5), smoothstep(0.4, 1.0, fws));
      const stone = mix(lin(0xd7ccb3), lin(0xc9bda2), h).mul(float(0.95).add(sp.mul(0.08))).toVar();
      const grime = smoothstep(0.55, 0.0, fract(cv)).mul(0.07).mul(wvLook.weather);
      const blk = stone.mul(float(1).sub(grime.mul(isC(cd, C.block).add(isC(cd, C.joint)).min(1))));
      // the far plates (code block): joints painted at the course lines, fading to the mean once sub-pixel
      const fw = fwidth(cv);
      const jl = float(1).sub(smoothstep(0.0, max(fw, 0.045), min(fract(cv), float(1).sub(fract(cv)))));
      const jK = mix(jl, float(0.08), smoothstep(0.3, 0.8, fw)).mul(isC(cd, C.block));
      const mortar = lin(0xb5ac97);
      const withJ = mix(blk, mortar, jK.mul(0.8));
      // LOD0's plate in the joints: mortar, recessed
      const c2 = mix(withJ, mortar.mul(0.92), isC(cd, C.joint));
      // the cornice and bands a little paler (lime-washed, sunlit tops), sills greyer
      return c2.mul(mix(float(1), float(1.04), isC(cd, C.cornice).add(isC(cd, C.band)).min(1))).mul(mix(float(1), float(0.94), isC(cd, C.sill)));
    })();
    m.normalNode = relief(0.05, 9.0);
    return m;
  },
  stone_blue() {
    // pale bush-hammered blue stone (the town hall's round 2 values): steps, the terrace, thresholds
    const col = Fn(() => {
      const w = uv(0).toVar();
      const blk = hash2(floor(w.mul(vec2(1.1, 2.6)))).toVar();
      const tool = hash2(floor(w.mul(55.0))).mul(0.5).add(hash2(floor(w.mul(19.0)).add(5.0)).mul(0.5));
      return mix(lin(0xa4a5a1), lin(0xb2b2ac), blk).mul(float(0.9).add(tool.mul(0.14)));
    })();
    return std({ colorNode: col, roughnessNode: float(0.82), metalnessNode: float(0) });
  },
  slate() {
    // natural slate (w02, w04: blue-grey, the brisis darker and sheened, the terrasson greyer, weathered): courses of
    // 15.5 cm (UV0.v = up the slope), slates 24 cm wide in a broken bond, a tone per slate, each course's butt a dark
    // line and its surface tilted (the normal bends course by course: the roof catches the light in bands); code "hung"
    // (the chimney stacks, the dormers' fronts and cheeks): small slates in a zigzag of two tones (w04's chimneys)
    const m = std({ metalnessNode: float(0) });
    const parts = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const hung = isC(cd, C.hung).toVar();
      const gauge = mix(float(0.155), float(0.10), hung), wid = mix(float(0.24), float(0.15), hung);
      const cv = w.y.div(gauge).toVar(), row = floor(cv).toVar();
      const cu = w.x.div(wid).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu).toVar();
      const fw = max(fwidth(cv), fwidth(cu)).toVar();
      const h = hash2(vec2(cell, row)).toVar(), h2 = hash2(vec2(cell.add(7.0), row.mul(3.0))).toVar();
      const tone = mix(lin(0x5d646f), lin(0x4a515b), h).mul(mix(float(0.88), float(1.1), h2)).toVar();
      // weathering: lichen-grey patches and soft streaks down the slope
      const wx = vnoise(w.mul(vec2(0.35, 0.6)).add(11.0)).toVar();
      const weathered = mix(tone, tone.mul(lin(0xb9b8ae)).mul(1.35), smoothstep(0.55, 0.9, wx).mul(0.35).mul(wvLook.weather));
      // the zigzag of the slate hanging (two tones)
      const zz = step(0.5, fract(w.y.div(0.30).add(abs(fract(w.x.div(0.6)).sub(0.5)).mul(0.6)))).toVar();
      const hungCol = mix(lin(0x434953), lin(0x6b717a), zz).mul(mix(float(0.92), float(1.06), h));
      const col = mix(weathered, hungCol, hung).toVar();
      // the butt line (each course's lower edge in its own shadow) and the vertical joints, faded once sub-pixel
      const fv = fract(cv), fu = fract(cu);
      const butt = float(1).sub(smoothstep(0.0, 0.09, fv));
      const vj = float(1).sub(smoothstep(0.0, 0.03, fu)).mul(step(0.12, fv));
      const j = mix(max(butt.mul(0.85), vj.mul(0.7)), float(0.12), smoothstep(0.25, 0.7, fw));
      const c3 = mix(col, lin(0x1e2228), j.mul(0.75));
      return vec4(c3, fv.sub(0.5).mul(float(1).sub(smoothstep(0.2, 0.6, fw))));
    })();
    m.colorNode = parts.rgb;
    // the course tilt: the normal bends along the slope by the course's fraction (a sawtooth), little on the hung slates
    m.normalNode = Fn(() => {
      const n = normalWorld.toVar();
      const up = normalize(vec3(0, 1, 0).sub(n.mul(n.y))).toVar();
      const k = parts.a.mul(0.16).mul(wvLook.relief);
      return cameraViewMatrix.transformDirection(normalize(n.sub(up.mul(k))));
    })();
    m.roughnessNode = float(0.55);
    return m;
  },
  zinc_roof() { return noSSR(std({ colorNode: lin(0x8c9397), roughnessNode: float(0.48), metalnessNode: float(0.35) })); },
  wood_frame_white() { return std({ colorNode: lin(0xecebe4), roughnessNode: float(0.45), metalnessNode: float(0) }); },
  wood_painted_grey() {
    // the louvred shutters and the doors: a light warm grey paint (w04), slightly chalky, a tone per leaf
    const col = Fn(() => {
      const h = hash2(floor(positionWorld.xz.mul(1.6)).add(floor(positionWorld.y.div(3.0)))).toVar();
      const g = hash2(vec2(floor(uv(0).x.mul(60.0)), floor(uv(0).y.mul(4.0))));
      return mix(lin(0xbdbcb3), lin(0xb0afa6), h).mul(float(0.97).add(g.mul(0.05)));
    })();
    return std({ colorNode: col, roughnessNode: float(0.62), metalnessNode: float(0) });
  },
  terracotta() {
    const col = Fn(() => mix(lin(0x9c4f31), lin(0x7f3e27), hash2(floor(positionWorld.xz.mul(4.0)))))();
    return std({ colorNode: col, roughnessNode: float(0.8), metalnessNode: float(0) });
  },
  glass_window() {
    // clear glass: the sky reflected with a Fresnel weight (emissive, so it reads in shade as in the photos: the windows
    // bright blue-grey); behind it a dim room, a tone per window, net curtains in a third (the villa's)
    const m = std({ roughnessNode: float(0.08), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const h = hash2(floor(positionWorld.xz.div(2.6)).add(floor(positionWorld.y.div(3.4)))).toVar();
      const room = mix(lin(0x2a2826), lin(0x3d3934), h).mul(mix(float(0.8), float(1.15), hash2(vec2(h.mul(91.0), 3.0))));
      const pleat = abs(fract(uv(0).x.mul(7.0)).sub(0.5)).mul(2.0);
      const fw = fwidth(uv(0).x.mul(7.0));
      const lace = lin(0x9a968e).mul(mix(mix(float(0.82), float(1.0), pleat), float(0.91), smoothstep(0.3, 0.8, fw)));
      return mix(room, lace, step(0.7, h));
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
  wood_frame_dark() { return std({ colorNode: lin(0x1d2421), roughnessNode: float(0.4), metalnessNode: float(0) }); },
  cast_iron_green() { return noSSR(std({ colorNode: lin(0x1f2f26), roughnessNode: float(0.5), metalnessNode: float(0.55) })); },
};
export const WV_TEMP_MATERIALS = TEMP;


/** the levels' cross-fade state at distance d (camera to the building's box): { shown, fades } for setLodFades
 *  (lodFade objectFade convention: the outgoing level keeps 2 + t, the incoming one t) */
export function wvLodState(d) {
  const shown = [], fades = [];
  let prevT = null;
  for (let k = 0; k < WV_LODS.length; k++) {
    const L = WV_LODS[k];
    const t = Number.isFinite(L.until) ? THREE.MathUtils.smoothstep(d, L.until - L.band, L.until + L.band) : 1;   // this level's fade-out
    const tin = prevT ?? 1;                                                                                          // the previous level's fade-out = this one's fade-in
    if (k === 0) { shown.push(t < 1); fades.push(2 + t); }
    else if (k === WV_LODS.length - 1) { shown.push(tin > 0); fades.push(tin); }
    else { shown.push(tin > 0 && t < 1); fades.push(tin < 1 ? tin : 2 + t); }
    prevT = t;
  }
  return { shown, fades };
}
