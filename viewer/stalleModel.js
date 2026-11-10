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
  attribute, uv, texture, normalWorld, positionWorld, vec2, vec3, float, floor, fract, mix, step, smoothstep, clamp, abs, sin, dot, select,
  fwidth, max, min, mod, mrt, roughness, uniform, length, transformNormalToView,
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
export const SLOT_TABLE = { ...Object.fromEntries(ST_SLOTS.map((s) => [s, s])) };   // round 3b: the doors' own painted red-brown (c00)
export const ST_CODES = ["plain", "coping", "surround", "tracery", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
  "interior", "door", "bell", "quoin", "lead"];
/** LOD switch distances (m, camera to the building's box) and the half-width of each cross-fade band */
export const ST_LODS = [{ until: 80, band: 14 }, { until: 320, band: 40 }, { until: Infinity }];
/** the real slates (node Stalle_slates, LOD0 only) give way to the deck's painted courses (aligned with them) here */
export const ST_SLATES = { until: 42, band: 10 };
/** the fade value (lodFade objectFade: 2 + t = fading out) of the slates at a distance, given LOD0's own fade value */
export function slateFade(dist, lod0Fade) {
  const t = THREE.MathUtils.smoothstep(dist, ST_SLATES.until - ST_SLATES.band, ST_SLATES.until + ST_SLATES.band);
  if (t >= 1) return null;                                  // hidden
  return t > 0 ? 2 + t : lod0Fade;
}

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
    const lods = names.map(() => []), door = [], slates = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let k = -1, isDoor = false, isSlates = false;
      for (let p = o; p && k < 0 && !isDoor && !isSlates; p = p.parent) { k = names.indexOf(p.name); isDoor = p.name === "Stalle_door"; isSlates = p.name === "Stalle_slates"; }
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      if (isDoor) door.push({ slot: o.material.name, geometry: o.geometry });
      else if (isSlates) slates.push({ slot: o.material.name, geometry: o.geometry });
      else if (k >= 0) lods[k].push({ slot: o.material.name, geometry: o.geometry });
    });
    const tris = lods.map((l) => l.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0));
    const slateTris = slates.reduce((s, m) => s + m.geometry.index.count / 3, 0);
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
      // the door's leaves and the real slates with LOD0 only (round 3: LOD1 is the scripted far variant, which has its own
      // door panel in the frame: the leaves on it would z-fight)
      const parts = k === 0 ? [...lods[0], ...door.map((d) => ({ ...d, door: true })), ...slates.map((d) => ({ ...d, slates: true }))] : lods[k];
      for (const { slot, geometry, door: isDoor, slates: isSlates } of parts) {
        const m = new THREE.Mesh(geometry, materials[slot]);
        m.name = isDoor ? `door ${slot}` : isSlates ? "slates" : slot; m.userData.slot = slot; m.userData.door = !!isDoor; m.userData.slates = !!isSlates;
        // the slates cast no shadow (the deck under them casts the roof's; a 7 mm step is far below a shadow texel)
        m.castShadow = slot !== "glass_window" && !isSlates; m.receiveShadow = true;
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
      lods, door, slates, slateTris, tris, doorTris, materials, notes, placement, boundsWorld, make, setDoor, setSlotMaterial, distance, aoTex, lib,
      aoBytes: aoTex.userData.bytes, glbBytes: lods_json.glbBytes, lodsJson: lods_json,
      tempMaterial: (s) => wrapAO(TEMP[s](), aoTex, s),
      libraryMaterial: (name) => sourceMaterial(name, lib),
      drawCalls: lods.map((l, k) => l.length + (k === 0 ? door.length : 0)),
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
  const algae = clamp(north.mul(0.6).add(low.mul(0.5)).mul(smoothstep(0.35, 0.9, n1)).mul(stLook.moss).mul(k), 0, 0.85);
  let c = mix(col, col.mul(vec3(0.8, 0.83, 0.74)), algae.mul(0.6));
  const streak = smoothstep(0.55, 0.85, n2).mul(float(1).sub(up)).mul(0.22);
  c = c.mul(float(1).sub(streak.mul(stLook.weather)).sub(low.mul(0.12).mul(stLook.weather)));
  return c.mul(mix(float(1), float(0.86), up.mul(0.6).mul(stLook.weather)));
}
/** COURSED RUBBLE as on the chapel (photos c00, P01: rough-squared Brussels sandstone, low courses of 11-22 cm, stones
 *  16-50 cm long, PILLOWED faces with rounded arrises, pale lime joints 1-2 cm, nearly flush; non-repeating: every
 *  course and stone from world-space hashes). Relief from an ANALYTIC height field (no derivative bump: continuous
 *  inside each stone and across the joints, so no black dashes at cell wraps), mapped with the same tangent frame the
 *  Blender script used for UV0 (u along the wall = cross(up, n), v up). Returns colour, the tangent-space normal and
 *  the joint mask; far away the joints and relief fade to the wall's average (no shimmer). */
function rubble() {
  const w0 = uv(0);
  const fw = max(fwidth(w0.x), fwidth(w0.y)).max(0.00002);
  // round 4 (c00): the courses WANDER (+-4 cm over 1-2 m along the wall) instead of running dead level
  const w = vec2(w0.x, w0.y.add(vnoise(vec2(w0.x.mul(0.65), 5.3)).sub(0.5).mul(0.08)).add(vnoise(vec2(w0.x.mul(2.1), 9.1)).sub(0.5).mul(0.02)));
  // courses: 0.52 m bands split into three courses at strongly jittered heights (round 3b, photo c00: irregular
  // courses, from thin 7-9 cm "slab" courses to 25 cm ones; were near-equal thirds = a neat ashlar)
  const bandH = 0.52;
  const bv = w.y.div(bandH), band = floor(bv), fb = fract(bv);
  const s1 = hash2(vec2(band, 13.1)).mul(0.32).add(0.15), s2 = s1.add(hash2(vec2(band, 41.7)).mul(0.4).add(0.17)).min(0.85);
  const c = step(s1, fb).add(step(s2, fb));
  const lo = select(c.lessThan(0.5), float(0), select(c.lessThan(1.5), s1, s2));
  const hi = select(c.lessThan(0.5), s1, select(c.lessThan(1.5), s2, float(1)));
  const y0 = band.add(lo).mul(bandH), y1 = band.add(hi).mul(bandH);
  const row = band.mul(3).add(c);
  // stones: a jittered cell per course; the stone's own joints from its own index (continuous within the stone)
  // stone length per course: 0.18-0.5 m, and the thin courses carry long thin stones (x1.7)
  const cH = hi.sub(lo).mul(bandH);
  const Lc = hash2(vec2(row, 7.0)).mul(0.42).add(0.14).mul(mix(float(1.7), float(1), smoothstep(0.09, 0.16, cH)));
  const xs = w.x.add(hash2(vec2(row, 1.0)).mul(5.0));
  const cu = xs.div(Lc), cell = floor(cu), fx = fract(cu);
  const J = (k) => k.add(hash2(vec2(k, row)).sub(0.5).mul(0.8));   // round 5: more size variety (stones 0.2-1.8 x the course's length)
  const sid = cell.sub(select(fx.lessThan(J(cell).sub(cell)), float(1), float(0))).add(select(fx.greaterThan(J(cell.add(1)).sub(cell)), float(1), float(0)));
  const xl = J(sid).mul(Lc), xr = J(sid.add(1)).mul(Lc);
  const hs = hash2(vec2(sid, row)), hs2 = hash2(vec2(sid.add(31.0), row.mul(1.7))), hs3 = hash2(vec2(sid.mul(0.37), row.add(9.0)));
  // the joint lines wander a little (rough-squared stones, not sawn)
  // round 4 (c00: irregular rubble): the vertical joints lean and wander (a per-stone slant +-25 %, wiggles 3 cm),
  // the bed joints wander 2 cm: stones no longer read as rectangles
  const slant = hash2(vec2(sid.add(2.7), row.add(1.3))).sub(0.5).mul(0.5);
  const wigX = vnoise(vec2(w.y.mul(9.0), sid.mul(3.1))).sub(0.5).mul(0.03).add(w.y.sub(y0).sub(y1.sub(y0).mul(0.5)).mul(slant));
  const wigY = vnoise(vec2(w.x.mul(6.0), row.mul(2.3))).sub(0.5).mul(0.02);
  const dl = xs.sub(xl).add(wigX), dr = xr.sub(xs).sub(wigX), db = w.y.sub(y0).add(wigY), dt = y1.sub(w.y).sub(wigY);
  const ex = min(dl, dr), ey = min(db, dt);
  const sx = select(dl.lessThan(dr), float(1), float(-1)), sy = select(db.lessThan(dt), float(1), float(-1));
  // smooth min of the two distances (rounded corners) and its gradient
  const k = float(0.007);                                       // round 3: crisper corners (0.012 read as tiles)
  const ax = ex.negate().div(k).exp(), ay = ey.negate().div(k).exp();
  const e = ax.add(ay).log().mul(k).negate();
  const wx = ax.div(ax.add(ay)), wy = float(1).sub(wx);
  const jw = hs3.mul(0.005).add(0.006);                         // half joint: joints 1.2-2.2 cm (round 4: deeper, wider)
  const e2 = e.sub(jw);
  // pillow: rounded arrises + a gentle dome over the face, per stone. Round 3 (owner: "bevelled bathroom tiles"): the
  // arris radius 0.9-1.7 cm (was 2.2-4), its drop 2.5-4.5 mm (was 5-8); each stone TILTED a little (rough-squared stones
  // never lie in one plane) and its face ROUGH (two noise octaves, gradient by finite differences: no derivatives)
  const r = hs2.mul(0.008).add(0.009), A = hs.mul(0.002).add(0.0025);
  const t = clamp(e2.div(r), 0, 1);
  const dhde = float(2).mul(A).div(r).mul(float(1).sub(t)).mul(step(0.0, e2));
  const W = xr.sub(xl).max(0.05), H = y1.sub(y0).max(0.05);
  const fxs = clamp(xs.sub(xl).div(W), 0, 1), fys = clamp(w.y.sub(y0).div(H), 0, 1);
  const B = hs.mul(0.0035).add(0.0015);
  const ddx = B.mul(16).mul(float(1).sub(fxs.mul(2))).div(W).mul(fys.mul(float(1).sub(fys)));
  const ddy = B.mul(16).mul(float(1).sub(fys.mul(2))).div(H).mul(fxs.mul(float(1).sub(fxs)));
  const near = float(1).sub(smoothstep(0.003, 0.016, fw));
  const onStone = step(0.0, e2);
  const tiltX = hash2(vec2(sid.add(5.3), row)).sub(0.5).mul(0.08), tiltY = hash2(vec2(sid, row.add(3.3))).sub(0.5).mul(0.06);
  const rh = (q) => vnoise(q.mul(9.0).add(hs.mul(13.0))).mul(0.0035).add(vnoise(q.mul(27.0).add(hs2.mul(7.0))).mul(0.0012));
  const eps = 0.004, h0 = rh(w), rgx = rh(w.add(vec2(eps, 0))).sub(h0).div(eps), rgy = rh(w.add(vec2(0, eps))).sub(h0).div(eps);
  const gx = dhde.mul(sx).mul(wx).add(ddx).add(tiltX.add(rgx).mul(onStone)).mul(near);
  const gy = dhde.mul(sy).mul(wy).add(ddy).add(tiltY.add(rgy).mul(onStone)).mul(near);
  const nT = vec3(gx.negate(), gy.negate(), 1).normalize();
  // joint coverage over the pixel footprint (AA), and far away the average
  const mask = smoothstep(-0.001, max(fw.mul(1.2), 0.004), e2);       // soft joint edges (round 4)
  const far = smoothstep(0.006, 0.03, fw);
  // stone: pale Brussels sandstone, low contrast (cream / pale grey; a few warmer or greyer), pitted surface
  // round 3b: the photo's cream-grey (lighter, warmer), a few grey and ochre stones
  // round 5 (pixel samples, c00's lit wall vs the model's: c00 r/g 1.09, b/g 0.83; the model's 1.03 / 0.92 = grey):
  // cream-beige, fewer grey stones (and warm greys), more ochre ones
  let tone = mix(lin(0xf0e1c2), lin(0xe3cfa6), hs);
  tone = mix(tone, lin(0xd6cbb3), step(0.86, hs2).mul(0.55));
  tone = mix(tone, lin(0xe2c796), step(0.84, hs3).mul(0.55));
  const grain = vnoise(w.mul(13.0).add(hs.mul(17.0))).mul(0.07).add(vnoise(w.mul(41.0)).mul(0.05)).sub(0.06);
  const pits = smoothstep(0.78, 0.92, vnoise(w.mul(70.0).add(hs2.mul(5.0)))).mul(0.1);
  let col = tone.mul(float(1).add(grain).sub(pits)).mul(mix(float(0.94), float(1.04), hs2));
  col = col.mul(mix(float(0.86), float(1), t));                    // the arrises catch dirt: a soft rim
  // mortar: pale lime, a little lighter than the stones, shaded in the recess under each stone
  // softer joints (round 3b): mortar close to the stones' tone, barely shaded in the recess
  // round 4: the mortar recessed: shaded toward the stones' edges, a little greyer than them, soft edged
  const mortar = lin(0xe0d2b2).mul(mix(float(0.7), float(0.93), smoothstep(float(0), jw.mul(1.2), e2.negate())));
  const avg = mix(lin(0xe6d6b4), lin(0xdfcdaa), 0.4).mul(0.95);
  col = mix(mix(mortar, col, mask), avg, far.mul(0.6));
  return { col, nT, mask, far };
}
/** a tangent-space normal (u = cross(up, n), v = cross(n, u): the frame of the Blender script's UV0) to view space */
function tangentNormal(nT) {
  const n = normalWorld;
  const tu = select(abs(n.y).greaterThan(0.98), vec3(1, 0, 0), vec3(0, 1, 0).cross(n).normalize());
  const tv = n.cross(tu);
  return transformNormalToView(tu.mul(nT.x).add(tv.mul(nT.y)).add(n.mul(nT.z)).normalize());
}
/** SLATE (natural Ardennes slate, photos P01 / c05): the real slates (COLOR_0.b = the slate's seed > 0) get a per-slate
 *  tone and a fine cleft grain; the deck (COLOR_0.b = 0: the far roof, and what shows between slates) paints the SAME
 *  course grid (tools/blender/roofkit.py NATURAL: 0.22 x 0.135, broken bond, from the eave line: its UV0 is the facet
 *  frame), with each course's butt shadow and the slates' tilt in the normal: depth without geometry. Lichen: pale grey
 *  crustose patches and a faint grey-green film, mostly on north slopes and near the eaves / ridges, never blobs. */
const SL = { width: 0.22, gauge: 0.135, eaveOver: 0.04 };
function slateLook() {
  const w = uv(0);
  const seed = attribute("color", "vec4").b;
  const real = step(0.01, seed);
  const fw = max(fwidth(w.x), fwidth(w.y)).max(0.00002);
  // the deck's painted courses (aligned with the geometry's)
  const cv = w.y.add(SL.eaveOver).div(SL.gauge), crs = floor(cv), fv = fract(cv);
  const cu = w.x.div(SL.width).add(mod(crs, 2).mul(0.5)), cell = floor(cu), fu = fract(cu);
  const hc = hash2(vec2(cell, crs));
  const id = mix(hc, seed, real);
  // per-slate tone: dark blue-grey, a few warmer / lighter, a few blacker
  let col = mix(lin(0x3b3f45), lin(0x2f3337), id);
  col = mix(col, lin(0x4a4846), step(0.86, fract(id.mul(7.3))).mul(0.6));
  col = mix(col, lin(0x26292c), step(0.9, fract(id.mul(13.1))).mul(0.6));
  const cleft = vnoise(vec2(w.x.mul(9.0).add(id.mul(40.0)), w.y.mul(55.0))).mul(0.08).add(vnoise(w.mul(30.0)).mul(0.05));
  col = col.mul(float(0.95).add(cleft));
  // deck only: the butt shadow line under each course, the joints, the tilt (fading with distance)
  const aaV = fw.div(SL.gauge).mul(1.5).max(0.02), aaU = fw.div(SL.width).mul(1.5).max(0.02);
  const butt = float(1).sub(smoothstep(0.0, aaV.add(0.06), fv)).mul(0.45);
  const joint = float(1).sub(smoothstep(0.0, aaU.add(0.012), min(fu, float(1).sub(fu)))).mul(0.35).mul(float(1).sub(smoothstep(0.55, 0.75, fv)));
  const deckK = float(1).sub(real);
  col = col.mul(float(1).sub(butt.add(joint).mul(deckK).mul(float(1).sub(smoothstep(0.02, 0.09, fw)).mul(0.6).add(0.4))));
  // lichen and patina: north slopes (city z < 0 is north), eaves and ridge
  const north = clamp(normalWorld.z.negate().mul(1.4).add(0.25), 0, 1);
  const film = vnoise(w.mul(0.9)).mul(0.6).add(vnoise(w.mul(3.1)).mul(0.4));
  const grime = smoothstep(0.45, 0.85, film).mul(north.mul(0.7).add(0.3)).mul(0.22).mul(stLook.moss);
  col = mix(col, lin(0x5d6257), grime);
  // lichen (round 3b, coordinator: the small flecks read as sparkle): only RARE soft grey-green patches, metre-scale,
  // mostly on the north slopes; no texel-scale detail left to shimmer
  const patch = smoothstep(0.72, 0.92, vnoise(w.mul(1.3).add(vec2(3.1, 7.7))).mul(0.7).add(vnoise(w.mul(3.7)).mul(0.3)));
  const crust = patch.mul(north.mul(0.85).add(0.15));
  col = mix(col, lin(0x6f7568), crust.mul(0.28).mul(stLook.moss));
  col = mix(col, lin(0x4a4c4e), isCode(C.ridge).mul(0.35));
  // the deck's relief: each course tilts up-slope by one slate thickness over one gauge (the slates rest on the course
  // below), the butt step as a short steep band
  const tilt = float(0.048).mul(deckK).mul(float(1).sub(smoothstep(0.01, 0.05, fw)));
  const step_ = float(1).sub(smoothstep(0.0, 0.05, fv)).mul(-0.6).mul(deckK).mul(float(1).sub(smoothstep(0.004, 0.02, fw)));
  const nT = vec3(0, tilt.add(step_), 1).normalize();
  const rough = mix(float(0.72), float(0.6), id).add(crust.mul(0.25));
  return { col, nT, rough };
}
const TEMP = {
  sandstone_rubble() {
    const r_ = rubble();
    // round 4: a piece with its own seed (COLOR_0.b > 0: the voussoirs round the west window, the soldier course over the
    // door) is ONE stone: its tone from the seed, a rough face, no courses drawn across it
    const seed = attribute("color", "vec4").b, single = step(0.01, seed);
    const wS = uv(0);
    const toneS = mix(mix(lin(0xeedfbf), lin(0xe0cca4), seed), lin(0xd4c9b1), step(0.8, fract(seed.mul(7.3))).mul(0.6))
      .mul(vnoise(wS.mul(13.0).add(seed.mul(31.0))).mul(0.08).add(vnoise(wS.mul(41.0)).mul(0.05)).add(0.94));
    const col = mix(r_.col, toneS, single), nT = mix(r_.nT, vec3(0, 0, 1), single);
    // weathering streaks: faint vertical runs (rain under sills and openings), stronger low on the wall
    const wv = uv(0), streak = smoothstep(0.62, 0.9, vnoise(vec2(wv.x.mul(2.6), wv.y.mul(0.22).add(1.7)))).mul(0.1).mul(smoothstep(41.0, 35.5, positionWorld.y).mul(0.6).add(0.4));
    // the lower walls (north side most) browner and darker: rising damp, splash, algae (photos P01, c05)
    // round 3b (photo c00): the base reads darker grey-green on every side (splash, algae), most on the north
    const low = smoothstep(35.6, 34.2, positionWorld.y), north = clamp(normalWorld.z.negate().mul(0.6).add(0.55), 0, 1);
    const damp = mix(col, col.mul(vec3(0.7, 0.7, 0.62)), low.mul(north).mul(0.7).mul(stLook.weather)).mul(float(1).sub(streak.mul(stLook.weather)));
    const c = weather(damp).mul(mix(float(1), float(0.93), isCode(C.plinth)));
    return std({ colorNode: c, roughnessNode: float(0.9), metalnessNode: float(0), normalNode: tangentNormal(nT) });
  },
  stone_white(o = {}) {
    // dressed stone (copings, surrounds, tracery, quoins, statue): tooled ashlar, faint coursing, weathered tops
    // round 4: indoors (the piers, capitals, arches: curved, each face with its own planar UV0) the pattern comes from
    // WORLD position: per-face UV cells drew a stair-stepped line across the capitals' bells (seen in the albedo-only view)
    const pw = positionWorld;
    const w = o.indoor ? vec2(pw.x.add(pw.z.mul(0.7)), pw.y) : uv(0);
    const g = vnoise(w.mul(7.0)).mul(0.08).add(vnoise(w.mul(29.0)).mul(0.05));
    const h = o.indoor ? hash2(vec2(floor(pw.x.mul(2.2)).add(floor(pw.z.mul(2.2)).mul(17.0)), floor(pw.y.mul(3.4)))) : hash2(floor(w.mul(vec2(2.2, 3.4))));
    let col = mix(lin(0xcfc6b0), lin(0xbcb196), h.mul(o.indoor ? 0.25 : 0.7)).mul(float(0.92).add(g));
    col = mix(col, lin(0xe4dfd2), isCode(C.sculpture).mul(0.85));               // the Virgin and Child: pale limestone
    col = mix(col, col.mul(0.9), isCode(C.quoin).add(isCode(C.coping)).min(1).mul(stLook.weather));
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
    const { col, nT, rough } = slateLook();
    return std({ colorNode: col, roughnessNode: rough, metalnessNode: float(0), normalNode: tangentNormal(nT) });
  },
  zinc_roof() {
    const h = vnoise(uv(0).mul(vec2(0.6, 4.0)));
    return std({ colorNode: mix(lin(0x7b8186), lin(0x6a6f73), h), roughnessNode: float(0.45), metalnessNode: float(0.4) });
  },
  wood_frame_dark() {
    const g = hash2(vec2(floor(uv(0).x.mul(70)), 2.0)).mul(0.25).add(0.85);
    const grain = vnoise(uv(0).mul(vec2(4, 60))).mul(0.15).add(0.92);
    const door = isCode(C.door);
    const varn = lin(0x6a3a24).mul(vnoise(uv(0).mul(vec2(3.0, 40.0))).mul(0.2).add(0.85));      // varnished boards
    return std({ colorNode: mix(lin(0x3b3027).mul(g).mul(grain), varn, door), roughnessNode: mix(float(0.7), float(0.42), door), metalnessNode: float(0) });
  },
  painted_wood_red() {
    // oxblood paint over boards (the chapel's doors, the house's shutters): worn edges show darker wood
    const w = uv(0);
    const grain = vnoise(w.mul(vec2(3, 45))).mul(0.12).add(0.94);
    const wear = smoothstep(0.7, 0.92, vnoise(w.mul(6.0))).mul(0.35);
    const col = mix(lin(0x7c3f27), lin(0x4a2a1c), wear).mul(grain);     // round 3b: c00's matte red-brown (was oxblood)
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
