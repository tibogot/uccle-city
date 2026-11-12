// THE UCCLE POLICE STATION (Commissariat Central "Marlow", Rue Rouge 17; tools/blender/police_rouge.py ->
// tools/police_pack.mjs -> models/police_rouge/), shared by the Police Lab and the city (?police=1). Built like
// viewer/wolvendaelModel.js (the loader, the slot table, the baked AO, the anti-sparkle, the LOD fades).
//
// The GLB carries geometry only: one primitive per NAMED material slot (PO_SLOTS) per level of detail, a per-face code
// in COLOR_0.r (PO_CODES), the per-vertex baked AO of the thin parts in COLOR_0.g, the region width in COLOR_0.b (the
// anti-sparkle), world-metre UVs in TEXCOORD_0 (the sign faces: the lettering atlas; the flags: 0..1) and the baked AO
// lightmap's UVs in TEXCOORD_1. Colour and pattern come at run time from the material of that slot:
//   - SLOT_TABLE maps every GLB slot to a material NAME of the shared library (identity today);
//   - SOURCE below is the ONE line that picks where those named materials come from (the temporary TSL versions here,
//     or the shared library once it lands);
//   - every slot material is wrapped (cloned) with the model's baked AO; the dithered LOD cross-fade (lodFade.js) lives
//     on a fading COPY of it (fadeVariant), drawn only while a level is inside a hand-over band;
//   - setSlotMaterial(slot, material) swaps one slot live.
// The SIGN LETTERING ("POLICE / POLITIE" on the blade, the gate's plate) is a small canvas atlas made here: plain text,
// no official emblem. LODs: LOD0 = Police, LOD1 = Police_far (the script's far variant, its own AO bake), LOD2 =
// Police_lod2 (meshoptimizer of the far variant, tools/police_pack.mjs). Nothing is simplified in the browser.
//   const m = await loadPolice();  m.make(k) -> Group;  m.distance(cameraPos);  m.placement;  m.boundsWorld
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, normalWorld, normalView, positionWorld, length, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, dot,
  fwidth, max, min, mod, mrt, roughness, uniform, Fn, vec4, cameraPosition, normalize, pow, reflect, cameraViewMatrix, atan, cos, sin, round, sqrt,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { env } from "./lighting.js";
import { fadeVariant, SMOOTH } from "./lodFade.js";
import { libSource } from "./materials/libSwitch.js";

/** the slots the GLB uses (one primitive = one draw call each per LOD) */
export const PO_SLOTS = ["brick_yellow", "brick_red_brussels", "concrete_white", "stone_blue", "painted_metal_white", "alu_anthracite",
  "glass_window", "screen_fabric", "roof_membrane", "solar_panel", "galvanised_steel", "cast_iron_green", "rubble_stone", "hedge",
  "signage", "flag_fabric"];
/** every name of the shared library (viewer/materials/, branch claude/materials) + the ones this model proposes */
export const LIBRARY_NAMES = ["brick_red_brussels", "brick_yellow", "brick_dark", "stone_white", "stone_blue", "render_white", "slate",
  "zinc_roof", "copper_patina", "painted_metal_white", "cast_iron_green", "wood_frame_white", "wood_frame_dark", "glass_window", "cobbles",
  "paving_concrete", "gravel_path", "lawn_edge",
  // proposed for the library by the police station (the temporary versions below until the library has them)
  "concrete_white", "alu_anthracite", "screen_fabric", "roof_membrane", "solar_panel", "galvanised_steel", "rubble_stone", "hedge",
  "signage", "flag_fabric"];
export const SLOT_TABLE = Object.fromEntries(PO_SLOTS.map((s) => [s, s]));
export const PO_CODES = ["plain", "joint", "reveal", "sill", "band", "cornice", "plinth", "frame", "bar", "pane", "panel", "text",
  "flag_be", "flag_eu", "hazard", "red"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band (the mesh audit's
 *  view ranges in tools/police_pack.mjs are these bands' ends: 105 / 440 m) */
export const PO_LODS = [{ until: 90, band: 15 }, { until: 400, band: 40 }, { until: Infinity }];
export const PO_LOD_AO = [1, 1, 1];

// THE ONE LINE: "temp" = the temporary TSL materials below; when viewer/materials/ (the Material Lab's library) lands,
// set it to "./materials/library.js" (createMaterial(name, { mapping: "uv" })) or any module exporting getMaterial(name).
const SOURCE = libSource("police", "./materials/shipped.js");   // 2026-11-13: the library by default (?libmat=0: temp)

/** Live look controls (uniforms: no recompiles) */
export const poLook = { aoStrength: uniform(1.0), aoDirect: uniform(0.55), weather: uniform(1.0), thinFar: uniform(1.0),
  glassRefl: uniform(1.0), relief: uniform(1.0) };

let promise = null;
export function loadPolice() {
  return (promise ??= (async () => {
    const base = new URL("../models/police_rouge/", import.meta.url).href;
    MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, notes, lods_json, aoTex, lib] = await Promise.all([
      loader.loadAsync(base + "police.glb"),
      fetch(base + "police.json").then((r) => r.json()),
      fetch(base + "police.lods.json").then((r) => r.json()).catch(() => ({})),
      loadAO(base + "police_ao.png"),
      SOURCE === "temp" ? null : import(SOURCE).catch((e) => { console.warn("[police] material library not loaded:", e.message); return null; }),
    ]);
    const names = [["Police"], ["Police_far"], ["Police_lod2"]];
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
    for (const s of PO_SLOTS) materials[s] = wrapAO(sourceMaterial(SLOT_TABLE[s], lib), aoTex, s);
    const pl = notes.placement;
    const placement = { position: new THREE.Vector3(...pl.city_local_position), rotationY: pl.rotation_y_rad };
    const b = notes.bounds_city;
    const boundsWorld = new THREE.Box3(new THREE.Vector3(b.x[0], b.y[0], b.z[0]), new THREE.Vector3(b.x[1], b.y[1], b.z[1]));
    const groups = [];
    const make = (k) => {
      const g = new THREE.Group(); g.name = `police_lod${k}`;
      for (const { slot, geometry } of lods[k]) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = slot; m.userData.slot = slot; m.userData.base = m.material; m.userData.aoScale = PO_LOD_AO[k];
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
    // the LOD distance: to the BUILDING's box in its own frame (u, w, m TAW; the cornice included), not to the city-axes
    // box of everything (the yard's wall and flagpoles 12 m out, rotated 34 deg: that box held the street)
    const R = -pl.rotation_y_rad, rc = Math.cos(R), rs = Math.sin(R), [ox, , oz] = pl.city_local_position;
    const BB = { u: [-6.9, 14.95], w: [-14.4, 12.95], h: [47.4, 59.6] };
    const distance = (p) => {
      const dx = p.x - ox, dz = p.z - oz, u = dx * rc + dz * rs, w = -dx * rs + dz * rc;
      const du = Math.max(BB.u[0] - u, 0, u - BB.u[1]), dw = Math.max(BB.w[0] - w, 0, w - BB.w[1]), dh = Math.max(BB.h[0] - p.y, 0, p.y - BB.h[1]);
      return Math.hypot(du, dw, dh);
    };
    return {
      lods, tris, materials, notes, placement, boundsWorld, make, setSlotMaterial, distance, aoTex, lib,
      aoBytes: aoTex.userData.bytes, glbBytes: lods_json.glbBytes, lodsJson: lods_json,
      tempMaterial: (s) => wrapAO(TEMP[s](), aoTex, s),
      libraryMaterial: (name) => sourceMaterial(name, lib),
      drawCalls: lods.map((l) => l.length),
    };
  })());
}

/** The levels' LOD state (lodFade objectFade convention: 1 or 2 = whole, 0..1 fading in, 2..3 fading out). A level draws
 *  with the FADING COPIES of its materials only inside a hand-over band (the town hall / Wolvendael rule). */
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

/** the levels' cross-fade state at distance d (camera to the building's box) */
export function poLodState(d) {
  const shown = [], fades = [];
  let prevT = null;
  for (let k = 0; k < PO_LODS.length; k++) {
    const L = PO_LODS[k];
    const t = Number.isFinite(L.until) ? THREE.MathUtils.smoothstep(d, L.until - L.band, L.until + L.band) : 1;
    const tin = prevT ?? 1;
    if (k === 0) { shown.push(t < 1); fades.push(2 + t); }
    else if (k === PO_LODS.length - 1) { shown.push(tin > 0); fades.push(tin); }
    else { shown.push(tin > 0 && t < 1); fades.push(tin < 1 ? tin : 2 + t); }
    prevT = t;
  }
  return { shown, fades };
}

function sourceMaterial(name, lib) {
  let m = null;
  if (lib) {
    try { m = lib.createMaterial?.(name, { mapping: "uv" }) ?? lib.getMaterial?.(name) ?? lib.materials?.[name] ?? lib.default?.[name] ?? null; }
    catch (e) { console.warn(`[police] library failed on "${name}":`, e.message); }
    if (!m) console.warn(`[police] library has no "${name}": temporary material`);
  }
  return m ?? (TEMP[name] ?? TEMP.brick_yellow)();
}

const AO_MIN = { painted_metal_white: 0.6, alu_anthracite: 0.5, glass_window: 0.5, screen_fabric: 0.55, flag_fabric: 0.7, signage: 0.6 };
const lodAo = uniform(1).onObjectUpdate(({ object }) => object.userData.aoScale ?? 1);

/** The baked AO on any slot material + the anti-sparkle of thin parts far away (the Wolvendael's wrapAO) */
function wrapAO(src, aoTex, slot) {
  const m = src.clone();
  m.name = `police ${slot}`;
  const ao = texture(aoTex, uv(1)).r.mul(attribute("color", "vec4").g).max(AO_MIN[slot] ?? 0);
  const aoK = mix(float(1), ao, poLook.aoStrength.mul(lodAo));
  m.aoNode = src.aoNode ? src.aoNode.mul(aoK) : aoK;
  const cw = attribute("color", "vec4").b;
  const width = cw.mul(cw).mul(4.0).max(0.002);
  const foot = length(fwidth(positionWorld));
  const k = smoothstep(0.6, 1.6, foot.div(width)).mul(poLook.thinFar);
  // (the white joinery keeps more of its share: the white window grid reads from 50 m on the street views)
  const cover = mix(float(1), clamp(width.mul(2.0).div(foot), slot === "painted_metal_white" ? 0.75 : 0.35, 1.0), k);
  if (slot !== "glass_window" && slot !== "solar_panel") {
    const base = src.colorNode ?? vec3(src.color?.r ?? 1, src.color?.g ?? 1, src.color?.b ?? 1);
    m.colorNode = base.mul(mix(float(1), aoK, poLook.aoDirect)).mul(cover);
  }
  m.normalNode = mix(src.normalNode ?? normalView, vec3(0, 0, 1), k).normalize();
  m.userData.shared = true;
  m.userData.slot = slot;
  return m;
}

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

// ------------------------------------------------------------------------------------------------ the lettering atlas
/** 512 x 1024 canvas, sampled with glTF UVs (flipY false): the blade's two faces read rows y 512..1024 (POLICE / POLITIE
 *  in white on the police blue, a white rule; NO emblem), the gate plate y 256..512 (its two lines). Plain text only. */
let atlas = null;
export function signAtlas() {
  if (atlas) return atlas;
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024;
  const x = c.getContext("2d");
  x.fillStyle = "#123a8a"; x.fillRect(0, 0, 512, 1024);
  // the blade (0.46 x 0.70 m on 512 x 512 px: glyphs drawn 0.66 high to read upright)
  x.save(); x.translate(0, 512);
  x.strokeStyle = "#f4f4f2"; x.lineWidth = 10; x.strokeRect(22, 22, 468, 468);
  x.fillStyle = "#f4f4f2"; x.textAlign = "center"; x.textBaseline = "middle";
  x.save(); x.translate(256, 190); x.scale(1, 0.66 * 1.45); x.font = "bold 118px Arial, Helvetica, sans-serif"; x.fillText("POLICE", 0, 0); x.restore();
  x.fillRect(70, 262, 372, 8);
  x.save(); x.translate(256, 345); x.scale(1, 0.66 * 1.45); x.font = "bold 92px Arial, Helvetica, sans-serif"; x.fillText("POLITIE", 0, 0); x.restore();
  x.restore();
  // the gate's plate (0.60 x 0.24 m on 512 x 256 px)
  x.save(); x.translate(0, 256);
  x.strokeStyle = "#f4f4f2"; x.lineWidth = 6; x.strokeRect(10, 10, 492, 236);
  x.fillStyle = "#f4f4f2"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "bold 40px Arial, Helvetica, sans-serif";
  x.fillText("EXCEPTÉ VÉHICULES", 256, 52); x.fillText("DE SERVICE", 256, 100);
  x.font = "bold 34px Arial, Helvetica, sans-serif";
  x.fillText("UITGEZONDERD", 256, 158); x.fillText("DIENSTVOERTUIGEN", 256, 202);
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  atlas = t;
  return t;
}

// ------------------------------------------------------------------------------------------------ temporary materials
// Simple TSL stand-ins named like the slots (replaced by name when the shared library has them: SOURCE above). They read
// UV0 in metres (walls: along the wall; the height is taken from positionWorld.y = m TAW so the brick courses sit level
// round the building), the face code (COLOR_0.r), the world normal. One Fn per material, a sin-free hash.
const hash2 = (p) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  const q = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(q.x.add(q.y).mul(q.z));
};
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };
const codeV = () => floor(attribute("color", "vec4").r.mul(16));
const isC = (cd, k) => float(1).sub(clamp(abs(cd.sub(k)), 0, 1));
const C = Object.fromEntries(PO_CODES.map((n, i) => [n, i]));
const std = (o) => Object.assign(new THREE.MeshStandardNodeMaterial(), o);
const noSSR = (m) => { m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(1)) }); return m; };
const vnoise = (p) => {
  const i = floor(p).toVar(), f = fract(p).toVar();
  const u2 = f.mul(f).mul(float(3).sub(f.mul(2))).toVar();
  const a = hash2(i), b = hash2(i.add(vec2(1, 0))), c = hash2(i.add(vec2(0, 1))), d = hash2(i.add(vec2(1, 1)));
  return mix(mix(a, b, u2.x), mix(c, d, u2.x), u2.y);
};
/** a gentle world-space normal relief (k = strength), faded once its features are sub-pixel; returns a VIEW normal */
const relief = (k, scale) => {
  const w = positionWorld.toVar();
  const q = vec2(w.x.add(w.z), w.y).mul(scale);
  const fw = length(fwidth(q));
  const e = float(1).sub(smoothstep(0.35, 1.2, fw)).mul(poLook.relief).mul(k);
  const nx = vnoise(q).sub(0.5).add(vnoise(q.mul(2.7).add(13.1)).sub(0.5).mul(0.5));
  const ny = vnoise(q.add(vec2(5.3, 9.1))).sub(0.5).add(vnoise(q.mul(2.7).add(31.7)).sub(0.5).mul(0.5));
  const nz = vnoise(q.add(vec2(17.1, 3.3))).sub(0.5);
  const n = normalize(normalWorld.add(vec3(nx, ny, nz).mul(e)));
  return cameraViewMatrix.transformDirection(n);
};
/** what clear glass reflects, as light (emissive): the sky above the horizon, the street and the trees below, Fresnel */
function glassReflection(k) {
  const v = normalize(cameraPosition.sub(positionWorld)).toVar();
  const n = normalWorld.toVar();
  const r = reflect(v.negate(), n).toVar();
  const ndv = clamp(abs(dot(v, n)), 0.0, 1.0);
  const fres = pow(float(1).sub(ndv), 3.0).mul(0.5).add(0.06);
  const sky = mix(vec3(env.uSkyHorizon), vec3(env.uSkyTop), smoothstep(0.0, 0.7, r.y));
  const skyline = hash2(floor(vec2(r.x, r.z).mul(9.0))).mul(0.14).add(0.08);
  const below = mix(lin(0x4a4c48), lin(0x2c302b), smoothstep(-0.05, -0.4, r.y));
  const col = mix(below, sky, smoothstep(skyline.sub(0.03), skyline.add(0.03), r.y));
  return col.mul(fres).mul(k).mul(poLook.glassRefl).mul(float(1).sub(env.uNight.mul(0.85)));
}
/** a brick bond on walls: stretcher bond, courses `course` m (positionWorld.y), bricks `len` m along UV0.x; a tone per
 *  brick, mortar joints recessed (darker, AO), faded to the mean once sub-pixel; reveals keep the wall's look */
const brickColor = (c0, c1, mortarHex, course = 0.0625, len = 0.2, joint = 0.01) => Fn(() => {
  const x = uv(0).x.toVar(), y = positionWorld.y.toVar();
  const cv = y.div(course).toVar(), row = floor(cv).toVar();
  const cu = x.div(len).add(mod(row, 2).mul(0.5)).toVar(), cell = floor(cu).toVar();
  const h = hash2(vec2(cell, row)).toVar(), h2 = hash2(vec2(cell.mul(1.7).add(3.0), row.mul(2.3))).toVar();
  const tone = mix(c0, c1, h).mul(float(0.9).add(h2.mul(0.18))).toVar();
  // a soft overall variation (batches, weathering) and faint rain streaks under the sills / cornice
  const lump = vnoise(vec2(x.mul(0.35), y.mul(0.5)).add(7.0)).toVar();
  const streak = smoothstep(0.6, 0.95, vnoise(vec2(x.mul(2.2), y.mul(0.12)).add(1.0))).mul(poLook.weather).mul(0.06);
  const col = tone.mul(float(0.95).add(lump.mul(0.1))).mul(float(1).sub(streak)).toVar();
  const fu = fract(cu), fv = fract(cv);
  const jx = joint / len, jy = joint / course;
  const fwu = fwidth(cu), fwv = fwidth(cv);
  const mx = float(1).sub(smoothstep(float(jx * 0.5), max(fwu.add(jx * 0.5), float(jx)), min(fu, float(1).sub(fu)).mul(2)));
  const my = float(1).sub(smoothstep(float(jy * 0.5), max(fwv.add(jy * 0.5), float(jy)), min(fv, float(1).sub(fv)).mul(2)));
  const mk = max(mx, my).toVar();
  const far = smoothstep(0.25, 0.7, max(fwu, fwv));
  const mortar = lin(mortarHex);
  const near = mix(col, mortar, mk);
  const mean = mix(mix(c0, c1, 0.5), mortar, 0.18);
  return mix(near, mean, far);
})();

const TEMP = {
  brick_yellow() {
    // the buff / sand-yellow facing brick of the street views (a pale ochre beige), light grey mortar
    const m = std({ roughnessNode: float(0.88), metalnessNode: float(0) });
    m.colorNode = brickColor(lin(0xcfb994), lin(0xbfa67c), 0xc9c4b8);
    m.normalNode = relief(0.03, 7.0);
    return m;
  },
  brick_red_brussels() {
    // the red-brown base storey of wing B (darker, a purple cast in places)
    const m = std({ roughnessNode: float(0.88), metalnessNode: float(0) });
    m.colorNode = brickColor(lin(0x7c3a26), lin(0x5e2a1e), 0xa59d90);
    m.normalNode = relief(0.03, 7.0);
    return m;
  },
  concrete_white() {
    // the cornice slab, the band, the sills: a light precast concrete, a little grey, darker grime under the edges
    const m = std({ roughnessNode: float(0.85), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const w = positionWorld.toVar();
      const q = vec2(w.x.add(w.z), w.y);
      const n = vnoise(q.mul(1.3)).mul(0.6).add(vnoise(q.mul(5.0).add(3.0)).mul(0.4)).toVar();
      const grain = hash2(floor(q.mul(140.0)));
      const g = mix(grain, float(0.5), smoothstep(0.4, 1.0, length(fwidth(q.mul(140.0)))));
      const cd = codeV();
      const base = mix(lin(0xd8d5cd), lin(0xc9c5bb), n).mul(float(0.97).add(g.mul(0.05)));
      // the underside of the cornice and sills greyer (rain-shadowed dirt)
      const under = smoothstep(-0.2, -0.8, normalWorld.y);
      return base.mul(mix(float(1), float(0.86), under)).mul(mix(float(1), float(0.95), isC(cd, C.sill)));
    })();
    m.normalNode = relief(0.025, 8.0);
    // (no screen-space reflection: the sloped sill tops read sky-blue in the reveals' shade with it)
    return noSSR(m);
  },
  stone_blue() {
    // pale bush-hammered blue stone (the plinth, the corner pier, steps, copings); the plinth a little darker at its foot
    const col = Fn(() => {
      const w = uv(0).toVar();
      const blk = hash2(floor(w.mul(vec2(1.1, 2.6)))).toVar();
      const tool = hash2(floor(w.mul(55.0))).mul(0.5).add(hash2(floor(w.mul(19.0)).add(5.0)).mul(0.5));
      const t = mix(tool, float(0.5), smoothstep(0.4, 1.0, length(fwidth(w.mul(55.0)))));
      return mix(lin(0x8e908e), lin(0x9d9e9a), blk).mul(float(0.9).add(t.mul(0.14)));
    })();
    return noSSR(std({ colorNode: col, roughnessNode: float(0.82), metalnessNode: float(0) }));
  },
  painted_metal_white() { return std({ colorNode: lin(0xedede8), roughnessNode: float(0.4), metalnessNode: float(0) }); },
  alu_anthracite() { return noSSR(std({ colorNode: lin(0x3a3f44), roughnessNode: float(0.42), metalnessNode: float(0.35) })); },
  glass_window() {
    // clear double glazing: the sky reflected (Fresnel, emissive so it reads in shade); behind it dim offices, a tone per
    // window, white vertical blinds in a third (the street views: many are half-drawn)
    const m = std({ roughnessNode: float(0.06), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const h = hash2(floor(positionWorld.xz.div(2.2)).add(floor(positionWorld.y.div(3.4)))).toVar();
      const room = mix(lin(0x262a2e), lin(0x3a3d3f), h).mul(mix(float(0.8), float(1.15), hash2(vec2(h.mul(91.0), 3.0))));
      const slat = abs(fract(uv(0).x.mul(10.0)).sub(0.5)).mul(2.0);
      const fw = fwidth(uv(0).x.mul(10.0));
      const blind = lin(0xb9b8b1).mul(mix(mix(float(0.8), float(1.0), slat), float(0.9), smoothstep(0.3, 0.8, fw)));
      return mix(room, blind, step(0.68, h));
    })();
    m.emissiveNode = Fn(() => {
      const r = glassReflection(float(1)).toVar();
      const h = hash2(floor(positionWorld.xz.div(2.9)).add(floor(positionWorld.y.div(3.5))));
      // a police station is lit all night: most windows glow (cool office light)
      return r.add(lin(0xe8eeff).mul(step(0.25, h)).mul(env.uNight).mul(env.uInteriorGlow).mul(0.75));
    })();
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  screen_fabric() {
    // the beige exterior roller screens: a fine basket weave (faded once sub-pixel), slight sag shading across
    const m = std({ roughnessNode: float(0.9), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const w = uv(0).toVar();
      const wv = hash2(floor(w.mul(220.0))).toVar();
      const g = mix(wv, float(0.5), smoothstep(0.4, 1.0, length(fwidth(w.mul(220.0)))));
      const sag = abs(fract(w.x.mul(0.5)).sub(0.5)).mul(0.08);
      return lin(0xb7a88d).mul(float(0.95).add(g.mul(0.08)).sub(sag));
    })();
    return m;
  },
  roof_membrane() {
    // a dark slate-grey bitumen cap sheet: mineral granules, sheet seams every 1 m (overlap lines), dusty patches
    const m = std({ roughnessNode: float(0.92), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const p = positionWorld.xz.toVar();
      const gr = hash2(floor(p.mul(90.0)));
      const g = mix(gr, float(0.5), smoothstep(0.4, 1.0, length(fwidth(p.mul(90.0)))));
      const patch = vnoise(p.mul(0.4)).toVar();
      const seamC = uv(0).y.toVar();
      const fs = fract(seamC); const fw = fwidth(seamC);
      const seam = float(1).sub(smoothstep(0.0, max(fw, 0.012), min(fs, float(1).sub(fs)))).mul(float(1).sub(smoothstep(0.3, 0.8, fw)));
      const base = mix(lin(0x3b3d3f), lin(0x4a4b4a), patch).mul(float(0.92).add(g.mul(0.14)));
      return base.mul(float(1).sub(seam.mul(0.25)));
    })();
    return m;
  },
  solar_panel() {
    // monocrystalline modules: dark blue-black cells (6 x 10 per module, UV0 0..1), thin silver gaps and busbars, a
    // glass cover reflecting the sky (Fresnel, emissive like the windows); the frames' sides are galvanised (another slot)
    const m = std({ roughnessNode: float(0.3), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const w = uv(0).toVar();
      const cx = w.x.mul(6.0), cy = w.y.mul(10.0);
      const fx = fract(cx), fy = fract(cy);
      const fwx = fwidth(cx), fwy = fwidth(cy);
      const gx = float(1).sub(smoothstep(0.0, max(fwx, 0.04), min(fx, float(1).sub(fx))));
      const gy = float(1).sub(smoothstep(0.0, max(fwy, 0.04), min(fy, float(1).sub(fy))));
      const gap = max(gx, gy).mul(float(1).sub(smoothstep(0.3, 0.8, max(fwx, fwy))));
      const cell = mix(lin(0x0b1220), lin(0x101a2e), hash2(floor(vec2(cx, cy))));
      return mix(cell, lin(0x6c7278), gap.mul(0.6));
    })();
    m.emissiveNode = glassReflection(float(0.7));
    m.mrtNode = mrt({ metalRough: vec3(0, roughness, float(0)) });
    return m;
  },
  galvanised_steel() {
    // hot-dip galvanised: a spangle of slightly different greys, a satin metal
    const col = Fn(() => {
      const p = positionWorld.toVar();
      const q = vec2(p.x.add(p.z), p.y);
      const sp = hash2(floor(q.mul(30.0)));
      const s = mix(sp, float(0.5), smoothstep(0.4, 1.0, length(fwidth(q.mul(30.0)))));
      return mix(lin(0xb4b8ba), lin(0xc8cbcc), s).mul(float(0.93).add(vnoise(q.mul(0.8)).mul(0.1)));
    })();
    // (a dull zinc coat: half metallic, rough; fully metallic it read black against the sky on the flagpoles)
    return noSSR(std({ colorNode: col, roughnessNode: float(0.5), metalnessNode: float(0.45) }));
  },
  cast_iron_green() {
    // the welded-mesh fence and the north gate: a moss-green powder coat (RAL 6005-like)
    return noSSR(std({ colorNode: lin(0x1d3a2c), roughnessNode: float(0.55), metalnessNode: float(0.2) }));
  },
  rubble_stone() {
    // the street wall: grey-brown sandstone rubble in rough courses (each course its own height and stone length), dark
    // recessed mortar, a tone per stone, moss toward the foot
    const m = std({ roughnessNode: float(0.93), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const x = uv(0).x.toVar(), y = positionWorld.y.toVar();
      const row = floor(y.div(0.21)).toVar();
      const rh = hash2(vec2(row, 7.0)).toVar();
      const len = float(0.28).add(rh.mul(0.3));
      const cu = x.div(len).add(rh.mul(3.0)).toVar(), cell = floor(cu).toVar();
      const h = hash2(vec2(cell, row)).toVar();
      const stone = mix(lin(0x6f685d), lin(0x8a8273), h).mul(float(0.88).add(hash2(vec2(cell.add(5.0), row)).mul(0.2))).toVar();
      const fu = fract(cu), fv = fract(y.div(0.21));
      const fw = max(fwidth(cu), fwidth(y.div(0.21)));
      const j = float(1).sub(smoothstep(0.0, max(fw, 0.06), min(min(fu, float(1).sub(fu)).mul(0.6), min(fv, float(1).sub(fv)))));
      const jk = j.mul(float(1).sub(smoothstep(0.3, 0.8, fw)));
      const moss = smoothstep(0.55, 0.85, vnoise(vec2(x.mul(1.3), y.mul(2.0)))).mul(smoothstep(47.6, 46.9, y)).mul(poLook.weather);
      const c2 = mix(stone, lin(0x3d4a2c), moss.mul(0.5));
      return mix(c2, lin(0x4a4640), jk.mul(0.85));
    })();
    m.normalNode = relief(0.12, 5.0);
    return m;
  },
  hedge() {
    // privet: dark glossy green leaves in clumps, lighter tips on top, a strong leafy relief
    const m = std({ roughnessNode: float(0.7), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const p = positionWorld.toVar();
      const q = vec2(p.x.add(p.z), p.y);
      const n1 = vnoise(q.mul(3.0)).toVar(), n2 = vnoise(q.mul(11.0).add(4.0)).toVar();
      const leaf = hash2(floor(q.mul(40.0)));
      const l = mix(leaf, float(0.5), smoothstep(0.4, 1.0, length(fwidth(q.mul(40.0)))));
      const top = smoothstep(0.3, 0.9, normalWorld.y);
      const base = mix(lin(0x1d3314), lin(0x355a20), n1.mul(0.6).add(n2.mul(0.4))).mul(float(0.8).add(l.mul(0.4)));
      return mix(base, base.mul(lin(0xc9e08a)).mul(1.6), top.mul(0.35)).mul(mix(float(0.55), float(1), n2));
    })();
    m.normalNode = relief(0.55, 6.0);
    return m;
  },
  signage() {
    // by code: panel = police blue, text = the lettering atlas, red = signal red, plain = white, hazard = yellow / black
    // bands (the bollards: 3 yellow bands), frame = grey back
    const atl = signAtlas();
    const m = std({ roughnessNode: float(0.45), metalnessNode: float(0) });
    m.colorNode = Fn(() => {
      const cd = codeV().toVar();
      const txt = texture(atl, uv(0)).rgb;
      const y = positionWorld.y;
      const bands = step(0.5, fract(y.div(0.18)));
      const hz = mix(lin(0x101010), lin(0xf2c200), bands);
      let c = lin(0xf3f3f0);
      c = mix(c, lin(0x123a8a), isC(cd, C.panel));
      c = mix(c, txt, isC(cd, C.text));
      c = mix(c, lin(0xc4161c), isC(cd, C.red));
      c = mix(c, hz, isC(cd, C.hazard));
      c = mix(c, lin(0x8a8d8f), isC(cd, C.frame));
      return c;
    })();
    return m;
  },
  flag_fabric() {
    // Belgium (black / yellow / red, vertical thirds from the hoist) and Europe (blue, 12 yellow stars in a circle of a
    // third of the height); UV0 = (hoist -> fly, top 0 -> bottom 1)
    const m = std({ roughnessNode: float(0.8), metalnessNode: float(0) });
    m.side = THREE.FrontSide;
    m.colorNode = Fn(() => {
      const w = uv(0).toVar();
      const cd = codeV().toVar();
      const be = mix(mix(lin(0x111111), lin(0xf6d21f), step(1 / 3, w.x)), lin(0xd8232a), step(2 / 3, w.x));
      // stars: the nearest of 12 on the ring, a 5-point star by angle (top point up)
      const p = vec2(w.x.sub(0.5).mul(1.5), float(0.5).sub(w.y)).toVar();
      const a = atan(p.y, p.x);
      const ak = round(a.div(Math.PI / 6)).mul(Math.PI / 6);
      const c = vec2(cos(ak), sin(ak)).mul(1 / 3);
      const q = p.sub(c).toVar();
      const r = length(q), th = atan(q.x, q.y);
      const rs = mix(float(0.022), float(0.055), pow(abs(cos(th.mul(2.5))), 6.0));
      const fw = fwidth(r);
      const star = float(1).sub(smoothstep(rs.sub(fw), rs.add(fw), r));
      const eu = mix(lin(0x0a2f9a), lin(0xf6d21f), star);
      return mix(be, eu, isC(cd, C.flag_eu));
    })();
    return m;
  },
};
export const PO_TEMP_MATERIALS = TEMP;
