// THE VILLA VAN BUUREN (Avenue Leo Errera 41, 1928; tools/blender/vanbuuren.py -> tools/vanbuuren_pack.mjs ->
// models/vanbuuren/), shared by the Villa Lab and the city (?vanbuuren=1). Built like viewer/townhallModel.js.
//
// The GLB carries geometry only: one primitive per NAMED material slot (VB_SLOTS) per level of detail, a per-face code
// in COLOR_0.r (VB_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, world-metre UVs in TEXCOORD_0 and
// the baked AO lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity today; the owner can point a
//     slot at another library material, e.g. stone_blue -> paving_concrete, without touching the model);
//   - SOURCE below is the ONE line that picks where those named materials come from: the temporary TSL versions in
//     this file, or the shared library (viewer/materials/, the Material Lab) once it lands;
//   - every slot material is wrapped (cloned) with the model's baked AO (lighting only); the dithered LOD cross-fade
//     (lodFade.js) lives on a fading COPY of it (fadeVariant), drawn only while a level is inside a hand-over band
//     (setLodFades): outside the bands the materials have no discard and keep early-z;
//   - setSlotMaterial(slot, material) swaps one slot live (the lab proves it).
// LODs (tools/vanbuuren_pack.mjs): LOD0 = the Blender model (Villa + Villa_courses: the brick courses and tile courses
// as geometry), LOD1 = the script's far variant (flat walls, the joints in the material, its own AO), LOD2 = that far
// variant simplified by meshoptimizer. Nothing is simplified in the browser; the GLB decodes in MeshoptDecoder's
// workers and the AO map in a worker too.
//   const m = await loadVanBuuren();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, normalView, positionWorld, length, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot,
  fwidth, max, min, mod, mrt, roughness, uniform, Fn, vec4, cameraPosition, normalize, pow, reflect,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { fadeVariant, SMOOTH } from "./lodFade.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD and node) */
export const VB_SLOTS = ["brick_orange_amsterdam", "brick_pattern", "concrete_white", "roof_tiles_flat_dark", "wood_varnished", "wood_frame_white",
  "glass_window", "glass_leaded", "oak_door", "metal_green_veranda", "zinc_gutter", "stone_blue"];
/** every name of the shared library (viewer/materials/, branch claude/materials): any slot may point at any of them */
export const LIBRARY_NAMES = ["brick_red_brussels", "brick_yellow", "brick_dark", "stone_white", "stone_blue", "render_white", "slate",
  "zinc_roof", "copper_patina", "painted_metal_white", "cast_iron_green", "wood_frame_white", "wood_frame_dark", "glass_window", "cobbles",
  "paving_concrete", "gravel_path", "lawn_edge",
  // proposed for the library by the villa (the temporary versions below until the library has them)
  "brick_orange_amsterdam", "brick_pattern", "concrete_white", "roof_tiles_flat_dark", "wood_varnished", "glass_leaded", "oak_door",
  "metal_green_veranda", "zinc_gutter"];
/** THE ADAPTER TABLE: GLB slot -> library material name (identity: the villa's own names; e.g. zinc_gutter -> zinc_roof,
 *  wood_varnished -> wood_frame_dark would use library names that exist today) */
export const SLOT_TABLE = Object.fromEntries(VB_SLOTS.map((s) => [s, s]));
export const VB_CODES = ["plain", "course", "joint", "reveal", "lattice", "sill", "soffit", "drip", "frame", "bar", "pane", "lead", "panel",
  "ridge", "coping", "interior"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band */
export const VB_LODS = [{ until: 55, band: 10 }, { until: Infinity }];
/** the baked AO's weight per level (LOD1 = the far variant has its own bake: no correction) */
export const VB_LOD_AO = [1, 1];

// ------------------------------------------------------------------------------------------------ material source
// THE ONE LINE: "temp" = the temporary TSL materials below; when viewer/materials/ (the Material Lab's library) lands,
// set it to "./materials/library.js" (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name)
// or materials[name].
const SOURCE = "temp";

/** Live look controls (uniforms: no recompiles) */
export const vbLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0), thinFar: uniform(1.0),
  glassRefl: uniform(1.0), jointFade: uniform(1.0) };

let promise = null;
export function loadVanBuuren() {
  return (promise ??= (async () => {
    const base = new URL("../models/vanbuuren/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lods_json, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "vanbuuren.glb"),
      fetch(base + "vanbuuren.json").then((r) => r.json()),
      fetch(base + "vanbuuren.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "vanbuuren_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[vanbuuren] material library not loaded:", e.message); return null; }),
    ]);
    const names = [["Villa", "Villa_courses"], ["Villa_far"]];
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
    for (const s of VB_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `vanbuuren_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material; m.userData.aoScale = VB_LOD_AO[k];
        m.castShadow = slot !== "glass_window" && slot !== "glass_leaded"; m.receiveShadow = true;
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
    catch (e) { console.warn(`[vanbuuren] library failed on "${name}":`, e.message); }
    if (!m) console.warn(`[vanbuuren] library has no "${name}": temporary material`);
  }
  return m ?? (TEMP[name] ?? TEMP.concrete_white)();
}

/** the baked AO's weight per level (mesh.userData.aoScale, VB_LOD_AO) */
const lodAo = uniform(1).onObjectUpdate(({ object }) => object.userData.aoScale ?? 1);

/** The baked AO (lighting only) on any slot material: aoNode = lightmap AO x the thin parts' vertex AO (indirect
 *  light), and the colour darkened by a share of it (direct light in crevices). Glass gets none in its colour. */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `vanbuuren ${slot}`;
  // the raked joints (code "joint": 12.5 mm grooves, their back / top / bottom faces) once they are sub-pixel (~25 m):
  // their dark vertex AO lifted toward the wall's (with the colour, brickCol): no 1-pixel dark / lit lines crawling
  // over the courses while strafing (the flicker test's 135-186 ppm at 25-30 m)
  const jointFar = isC(codeV(), C.joint).mul(smoothstep(0.006, 0.022, length(fwidth(positionWorld)))).mul(vbLook.jointFade);
  const ao = mix(texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g), float(0.9), jointFar.mul(0.8));
  const aoK = mix(float(1), ao, vbLook.aoStrength.mul(lodAo));
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
  const k = smoothstep(0.6, 1.6, foot.div(width)).mul(vbLook.thinFar);
  const cover = mix(float(1), clamp(width.mul(2.0).div(foot), 0.35, 1.0), k);
  if (slot !== "glass_window" && slot !== "glass_leaded") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, vbLook.aoDirect)).mul(cover);
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
const C = Object.fromEntries(VB_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(1)) }); return m; };

// THE BRICK: small orange-red Dutch bricks (Waalformaat ~ 210 x 50 mm) in stretcher bond, courses of 62.5 mm (the
// geometry's: tools/blender/vanbuuren_kit.py COURSE / JOINT), the BED joints raked (deep, in shadow), the perpends flush
// and nearly the brick's colour (the Amsterdam School's horizontal emphasis). Codes: "course" = LOD0's brick faces (the
// bed joints are geometry: perpends only), "joint" = the raked joints' faces (mortar in shadow), anything else (the far
// LOD's flat walls, reveals, boxes) = both joints painted; every line fades to the mean once it is sub-pixel.
const COURSE_M = 0.0625, JOINT_F = 0.0125 / 0.0625, BRICK_W = 0.22;
function brickCol(c1, c2, burnt, light, pattern) {
  return Fn(() => {
    const w = uv(0).toVar();
    const cv = w.y.div(COURSE_M).toVar(), row = floor(cv).toVar();
    const cu = w.x.div(BRICK_W).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu).toVar();
    const fw = max(fwidth(cv), fwidth(cu)).toVar();
    const fv = fract(cv), fu = fract(cu);
    const h = hash2(vec2(cell, row)).toVar(), h2 = hash2(vec2(cell.add(17.0), row.mul(3.0))).toVar();
    const b = mix(lin(c1), lin(c2), h).mul(mix(float(0.86), float(1.08), h2)).toVar();
    const bb = mix(mix(b, lin(burnt), step(0.95, h2).mul(0.55)), lin(light), step(0.9, h).mul(step(h2, 0.3)).mul(0.35)).toVar();
    const cd = codeV().toVar();
    // the raked bed joint (painted where it is not geometry): dark (recessed, in shadow)
    const bed = float(1).sub(smoothstep(JOINT_F - 0.04, JOINT_F + 0.02, fv)).mul(float(1).sub(isC(cd, C.course)));
    const bedK = mix(bed, float(JOINT_F * 0.75), smoothstep(0.25, 0.7, fw)).toVar();
    // the flush perpend: a thin line slightly lighter
    const perp = float(1).sub(smoothstep(0.0, 0.05, fu)).mul(smoothstep(JOINT_F, JOINT_F + 0.05, fv));
    const perpK = mix(perp, float(0.0), smoothstep(0.2, 0.6, fw)).toVar();
    let col = mix(bb, lin(0xa1806a), perpK.mul(0.45));
    col = mix(col, lin(0x3b2d26), bedK.mul(0.85));
    if (pattern) {
      // the gable tops' basket weave (far: the projecting panels of LOD0 painted): 0.23 x 0.25 m cells, a darker outline,
      // every other cell a shade lighter
      const pw = w.div(vec2(0.23, 0.25)).toVar();
      const pr = floor(pw.y), pc = floor(pw.x.add(mod(pr, 2).mul(0.5)));
      const pf = fract(vec2(pw.x.add(mod(pr, 2).mul(0.5)), pw.y));
      const edge = float(1).sub(smoothstep(0.0, 0.07, pf.x).mul(smoothstep(0.0, 0.07, pf.y)));
      const pfw = max(fwidth(pw.x), fwidth(pw.y));
      const edgeK = mix(edge, float(0.12), smoothstep(0.15, 0.5, pfw)).mul(float(1).sub(isC(cd, C.lattice)));
      col = col.mul(mix(float(1), float(1.07), mod(pc.add(pr), 2))).mul(float(1).sub(edgeK.mul(0.35)));
    }
    // the raked joints' own faces: grey mortar in shadow; once sub-pixel, the wall's mean (the joints' share included)
    const mean = mix(mix(lin(c1), lin(c2), 0.5), lin(0x3b2d26), float(JOINT_F * 0.6));
    const jointCol = mix(lin(0x5f574f), mean, smoothstep(0.006, 0.022, length(fwidth(positionWorld))).mul(vbLook.jointFade));
    return mix(col, jointCol, isC(cd, C.joint));
  })();
}
const brick = (c1, c2, burnt, light, pattern = false) => () => std({ colorNode: brickCol(c1, c2, burnt, light, pattern), roughnessNode: float(0.86), metalnessNode: float(0) });
// (the town hall's brick for the library names that exist: courses 62 mm, 11 mm joints)
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
/** what clear glass reflects, as light (emissive): the sky gradient (env's horizon / zenith colours) above the horizon,
 *  a dark band of trees / houses just under it, the street below; Fresnel-weighted (strong at grazing angles, ~2.5 %
 *  head-on: the photos look up at windows reflecting a bright sky). k scales it (0 = a came). */
function glassReflection(k) {
  const v = normalize(cameraPosition.sub(positionWorld)).toVar();
  const n = normalWorld.toVar();
  const r = reflect(v.negate(), n).toVar();
  const ndv = clamp(abs(dot(v, n)), 0.0, 1.0);
  const fres = pow(float(1).sub(ndv), 3.0).mul(0.45).add(0.025);
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(0.0, 0.7, r.y));
  const skyline = hash2(floor(vec2(r.x, r.z).mul(9.0))).mul(0.12).add(0.06);           // the opposite trees / roofs' height
  const below = mix(lin(0x4a4d45), lin(0x34352f), smoothstep(-0.05, -0.4, r.y));
  const col = mix(below, sky, smoothstep(skyline.sub(0.03), skyline.add(0.03), r.y));
  return col.mul(fres).mul(k).mul(vbLook.glassRefl).mul(float(1).sub(env.uNight.mul(0.85)));
}
const TEMP = {
  brick_orange_amsterdam: brick(0xac6c54, 0x975944, 0x5e2e1c, 0xc4835c),
  brick_pattern: brick(0xb3735b, 0x9e604a, 0x66321f, 0xca8a63, true),
  brick_red_brussels: brick(0x9a4a35, 0x7d3a29, 0x3e2219, 0xa8604a),
  concrete_white() {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const n = hash2(floor(w.mul(23.0))).mul(0.5).add(hash2(floor(w.mul(7.0)).add(3.0)).mul(0.5));
      const cd = codeV();
      const c = mix(lin(0xe0ddd3), lin(0xd6d2c6), n).toVar();
      // the drip groove and the soffits a touch darker (dirt, the groove's own shadow is the geometry's)
      return c.mul(mix(float(1), float(0.9), isC(cd, C.drip))).mul(mix(float(1), float(0.96), isC(cd, C.soffit)));
    })();
    return std({ colorNode: col, roughnessNode: float(0.86), metalnessNode: float(0) });
  },
  roof_tiles_flat_dark() {
    // small flat clay tiles, dark brown-grey (v02 / v06): gauge 11 cm (the geometry's courses: TILE_GAUGE), tiles 17 cm
    // wide in a broken bond; "course" = LOD0 (the courses are geometry: the vertical joints only), else both painted
    const col = Fn(() => {
      const w = uv(0).toVar();
      const cv = w.y.div(0.11).toVar(), row = floor(cv).toVar();
      const cu = w.x.div(0.17).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu).toVar();
      const fw = max(fwidth(cv), fwidth(cu)).toVar();
      const h = hash2(vec2(cell, row)).toVar();
      const t = mix(lin(0x4f4843), lin(0x3e3835), h).mul(mix(float(0.9), float(1.08), hash2(vec2(cell.add(3.0), row.add(9.0)))));
      const cd = codeV().toVar();
      const vj = float(1).sub(smoothstep(0.0, 0.035, fract(cu)));
      const hj = float(1).sub(smoothstep(0.0, 0.12, fract(cv))).mul(float(1).sub(isC(cd, C.course)));
      const j = mix(max(vj, hj), float(0.08), smoothstep(0.25, 0.7, fw));
      return mix(t, lin(0x221e1c), j.mul(0.7)).mul(mix(float(1), float(0.92), isC(cd, C.ridge)));
    })();
    return std({ colorNode: col, roughnessNode: float(0.72), metalnessNode: float(0) });
  },
  wood_varnished() {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const g = hash2(vec2(floor(w.x.mul(140.0)), floor(w.y.mul(3.0)))).mul(0.5).add(hash2(vec2(floor(w.y.mul(140.0)), 7.0)).mul(0.5));
      const cd = codeV();
      // varnished pine / oak, golden tan (v06 in sun, v04 in shade: lighter than the brick, yellower); the
      // bargeboards / roof soffits dark brown (v04 / v00)
      return mix(mix(lin(0xc4935a), lin(0xae7d48), g), mix(lin(0x5b3b24), lin(0x4a2f1c), g), isC(cd, C.soffit).add(isC(cd, C.plain)).min(1));
    })();
    return std({ colorNode: col, roughnessNode: float(0.42), metalnessNode: float(0) });
  },
  wood_frame_white() { return std({ colorNode: lin(0xebe9e2), roughnessNode: float(0.45), metalnessNode: float(0) }); },
  glass_window() {
    // clear glass: the sky (and the street's dark band under the horizon) reflected with a Fresnel weight, emissive so it
    // reads in shade as in the photos (v04: the windows are as bright as the brick, blue); behind it a dim room, a tone
    // per window
    const m = std({ roughnessNode: float(0.08), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      // the room (a tone per window: 3 m cells x a storey, wider than any window: rarely split) or, in about a third of the windows, net curtains (v06:
      // pale, softly pleated) right behind the glass
      const h = hash2(floor(positionWorld.xz.div(3.0)).add(floor(positionWorld.y.div(2.6)))).toVar();
      const room = mix(lin(0x2a2724), lin(0x3d3832), h).mul(mix(float(0.8), float(1.15), hash2(vec2(h.mul(91.0), 3.0))));
      const pleat = abs(fract(uv(0).x.mul(7.0)).sub(0.5)).mul(2.0);
      const fw = fwidth(uv(0).x.mul(7.0));
      const lace = lin(0x9a968e).mul(mix(mix(float(0.82), float(1.0), pleat), float(0.91), smoothstep(0.3, 0.8, fw)));
      return mix(room, lace, step(0.66, h));
    })();
    m.emissiveNode = Fn(() => {
      const r = glassReflection(float(1)).toVar();
      const h = hash2(floor(positionWorld.xz.div(3.3)).add(floor(positionWorld.y.div(4.2))));
      return r.add(lin(0xffc27a).mul(step(0.4, h)).mul(env.uNight).mul(env.uInteriorGlow).mul(0.9));
    })();
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  glass_leaded() {
    // leaded glass, per window (UV0 = each pane's own 0..1 square): code "lead" = the stair window's mosaic (v04: each pane
    // a patchwork of small blue-grey / clear rectangles of slightly different tilt, thin cames); code "panel" = the porch
    // windows' and the door's symmetric panels (a tall clear centre, columns of small cream squares, dark cames); far
    // (code "pane", the whole opening): the average. The cames fade to the average once sub-pixel.
    const m = std({ roughnessNode: float(0.12), metalnessNode: float(0) });
    const parts = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      // --- the mosaic: 3 bands of jittered height per pane, each cut into 4-7 cells of jittered width
      const by = w.y.mul(3.0).toVar(), band = floor(by).toVar();
      const nb = floor(hash2(vec2(band, 5.0)).mul(4.0)).add(4.0);
      const bx = w.x.mul(nb).add(hash2(vec2(band, 11.0)).mul(0.7)).toVar();
      const cellM = vec2(floor(bx), band).toVar();
      const fM = vec2(fract(bx), fract(by)).toVar();
      const fwM = max(fwidth(bx), fwidth(by)).toVar();
      const cameM = float(1).sub(smoothstep(0.0, max(fwM, 0.035), min(fM.x, float(1).sub(fM.x))).mul(smoothstep(0.0, max(fwM, 0.045), min(fM.y, float(1).sub(fM.y)))));
      const hM = hash2(cellM.add(vec2(3.0, 7.0))).toVar();
      const tintM = mix(mix(lin(0x1c2633), lin(0x2a3242), step(0.5, hM)), lin(0x4a4436), step(0.88, hM));
      // --- the panel: mirrored about the pane's centre line
      const x = abs(w.x.sub(0.5)).mul(2.0).toVar(), y = w.y.toVar();
      const fwP = max(fwidth(x), fwidth(y)).toVar();
      const line = (v, at, wd) => float(1).sub(smoothstep(wd, wd.add(fwP), abs(v.sub(at))));
      const lw = float(0.022);
      const inC = step(x, 0.36).mul(step(0.16, y)).mul(step(y, 0.84));
      const side = step(0.46, x).mul(step(x, 0.9));
      const sq = fract(y.mul(4.0)).toVar();
      const cameP = max(max(max(line(x, float(0.36), lw).mul(step(0.16, y)).mul(step(y, 0.84)), line(x, float(0.46), lw)), max(line(x, float(0.9), lw), line(y, float(0.16), lw).mul(step(x, 0.36)))),
        max(line(y, float(0.84), lw).mul(step(x, 0.36)), float(1).sub(smoothstep(0.0, max(fwP.mul(4.0), 0.06), min(sq, float(1).sub(sq)))).mul(side)));
      const hP = hash2(vec2(floor(y.mul(4.0)), step(0.46, x).add(step(0.9, x)))).toVar();
      const tintP = mix(mix(lin(0x2b2c2c), lin(0xb8a77f), side.mul(step(0.35, hP))), lin(0x8a6e3e), side.mul(step(0.85, hP)));
      // pick by code; far = the average
      const isLead = isC(cd, C.lead), isPanel = isC(cd, C.panel);
      const came = mix(mix(cameM, cameP, isPanel), float(0.3), smoothstep(0.25, 0.7, mix(fwM, fwP.mul(5.0), isPanel))).toVar();
      const tint = mix(mix(lin(0x333a42), tintM, isLead), tintP, isPanel).toVar();
      const col = mix(tint, lin(0x121212), came.mul(isLead.add(isPanel).max(0.3)));
      // reflection: per cell a slightly different tilt (the mosaic glints); none on the cames; the panel's cream glass is
      // opalescent (less mirror)
      const tilt = mix(float(1), mix(float(0.6), float(1.35), hash2(cellM.add(vec2(9.0, 1.0)))), isLead);
      const refl = tilt.mul(float(1).sub(came)).mul(mix(float(1), float(0.45), side.mul(isPanel))).mul(mix(float(0.75), float(0.55), isLead));
      return vec4(col, refl);
    })();
    m.colorNode = parts.rgb;
    m.emissiveNode = Fn(() => glassReflection(parts.a).add(lin(0xffb867).mul(env.uNight).mul(env.uInteriorGlow).mul(0.35)))();
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  oak_door() {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const g = hash2(vec2(floor(w.x.mul(90.0)), floor(w.y.mul(1.5)))).mul(0.6).add(hash2(vec2(floor(w.x.mul(23.0)), 5.0)).mul(0.4));
      const cd = codeV();
      return mix(mix(lin(0xb06a2a), lin(0x96561f), g), lin(0x1b1511), isC(cd, C.frame));
    })();
    return std({ colorNode: col, roughnessNode: float(0.38), metalnessNode: float(0) });
  },
  metal_green_veranda() { return noSSR(std({ colorNode: lin(0x2f5a44), roughnessNode: float(0.45), metalnessNode: float(0.3) })); },
  zinc_gutter() { return noSSR(std({ colorNode: lin(0x8b9094), roughnessNode: float(0.5), metalnessNode: float(0.35) })); },
  zinc_roof() { return noSSR(std({ colorNode: lin(0x8a9196), roughnessNode: float(0.5), metalnessNode: float(0.35) })); },
  stone_blue() {
    const col = Fn(() => {
      const w = uv(0).toVar();
      const blk = hash2(floor(w.mul(vec2(1.1, 2.6)))).toVar();
      const tool = hash2(floor(w.mul(55.0))).mul(0.5).add(hash2(floor(w.mul(19.0)).add(5.0)).mul(0.5));
      return mix(lin(0x8e908d), lin(0x9d9e99), blk).mul(float(0.9).add(tool.mul(0.14)));
    })();
    return std({ colorNode: col, roughnessNode: float(0.82), metalnessNode: float(0) });
  },
  slate() {
    const col = Fn(() => {
      const { row, cell, mask } = courses(0.3, 0.2, 0.02);
      return mix(lin(0x646a73), lin(0x535861), hash2(vec2(cell, row))).mul(mix(float(0.74), float(1), mask));
    })();
    return std({ colorNode: col, roughnessNode: float(0.5), metalnessNode: float(0) });
  },
  render_white() { return std({ colorNode: lin(0xe4dfd4), roughnessNode: float(0.9), metalnessNode: float(0) }); },
  wood_frame_dark() { return std({ colorNode: lin(0x1d2421), roughnessNode: float(0.4), metalnessNode: float(0) }); },
  cast_iron_green() { return noSSR(std({ colorNode: lin(0x1f2f26), roughnessNode: float(0.5), metalnessNode: float(0.55) })); },
};
export const VB_TEMP_MATERIALS = TEMP;

/** the levels' cross-fade state at distance d (camera to the building's box): { shown, fades } for setLodFades
 *  (lodFade objectFade convention: the outgoing level keeps 2 + t, the incoming one t) */
export function vbLodState(d) {
  const shown = [], fades = [];
  let prevT = null;
  for (let k = 0; k < VB_LODS.length; k++) {
    const L = VB_LODS[k];
    const t = Number.isFinite(L.until) ? THREE.MathUtils.smoothstep(d, L.until - L.band, L.until + L.band) : 1;   // this level's fade-out
    const tin = prevT ?? 1;                                                                                          // the previous level's fade-out = this one's fade-in
    if (k === 0) { shown.push(t < 1); fades.push(2 + t); }
    else if (k === VB_LODS.length - 1) { shown.push(tin > 0); fades.push(tin); }
    else { shown.push(tin > 0 && t < 1); fades.push(tin < 1 ? tin : 2 + t); }
    prevT = t;
  }
  return { shown, fades };
}
