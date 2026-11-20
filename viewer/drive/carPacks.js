// CAR PACKS: the CC0 cars of models/cars/<source>.glb (tools/cars/convertPacks.mjs: Kenney "Car Kit", Quaternius
// "Cars Pack"), as models for carModel.js (the drive car: same interface as the scripted hatchback) and as instanced
// variants for parked streets (the Car Lab's comparison; later perhaps viewer/cars.js).
//
// One material draws every car of a source: the palette is baked into COLOR_0, _KIND says what a vertex is
// (0 fixed colour, 1 body paint = COLOR_0 is a shade the paint colour multiplies, 2 head light, 3 tail light, 4 glass;
// the faceted family adds 5 chrome / gloss, 6 rubber, 7 plate, 8 interior).
// Paint comes from a uniform (one car) or a per-instance attribute "paint" (parked cars). LODs are made here at load by
// meshoptimizer (absolute error in metres; colour seams are open borders, so the simplifier keeps them as borders).
import * as THREE from "three/webgpu";
import { attribute, color, float, select, uniform, uniformArray, int, screenCoordinate, vec2, vec3, vec4, cos, sin, positionLocal, normalLocal, smoothstep, mod, normalView, positionView, dot, normalize, mix, varying } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodMesh, lodOpts, partLevel } from "./carLod.js";
import { wxMat } from "../weather/cityWeatherize.js";   // the weather (docs/WEATHER.md "City hookup"): gated, ?weather=old none
import { DENT_OLD, dentFrame, frameRows, dentNodes, shadeDent } from "./carDent.js";   // claude/dent: dents without holes

// ?vfix2=old: the traffic's light bits decoded as before round 2 of the visual fixes (A/B)
const CARLIGHTS_OLD = typeof location !== "undefined" && /[?&](carlights|polish1)=old(&|$)/.test(location.search);   // polish1 item 6
const VFIX2_OLD = typeof location !== "undefined" && /[?&]vfix2=old\b/.test(location.search);

export const PACK_SOURCES = {
  kenney: { label: "Kenney Car Kit", url: new URL("../../models/cars/kenney.glb", import.meta.url).href, credit: "Kenney (kenney.nl), CC0" },
  quaternius: { label: "Quaternius Cars Pack", url: new URL("../../models/cars/quaternius.glb", import.meta.url).href, credit: "Quaternius (quaternius.com), CC0" },
  // ours: tools/blender/carFaceted.py (faceted hard-surface family, baked AO, see-through tinted glass)
  faceted: { label: "Faceted (carFaceted.py)", url: new URL("../../models/cars/faceted.glb", import.meta.url).href, credit: "uccle-city, scripted",
    rich: true,        // packMaterial: clear-coat paint, see-through glass (alpha to coverage), light shadow through glass, lit sign letters
    welded: true,      // always simplify on the position + colour weld (+ normal: smooth)
    smooth: true,      // weighted split normals (docs/VISUAL_FIXES.md): the LODs keep them instead of flat face normals
    prune: true,       // meshoptimizer Prune: islands under the error go (lug nuts, plate glyphs, wipers far away)
    // body error per LOD; wheels have their own (colour borders locked up to LOD1, free beyond: seen whole, far away)
    lods: [{ error: 0, wheel: 0, until: 22 }, { error: 0.008, wheel: 0.018, until: 55 }, { error: 0.032, wheel: 0.05, until: 130 },
      { error: 0.11, wheel: 0.10, loose: true, until: 600 }] },     // LOD3: position-only weld, colour as an attribute
  // ours, round 2 (docs/CARS2.md): tools/blender/cars2.py, smooth lofted bodies at real proportions, Cycles AO, AUTHORED
  // LODs in the GLB (Body / Wheel_* = LOD0 ~7.5-9k tris, *_L1 = LOD1 ~1.5-2.1k, *_L2 = LOD2 ~350). The fleets keep their
  // four levels (levels 0-1 the near material, 2-3 the far one, level 3 casts no shadow); `src` = the authored LOD drawn
  cars2: { label: "Cars 2 (cars2.py)", url: new URL("../../models/cars/cars2.glb", import.meta.url).href, credit: "uccle-city, scripted",
    rich: true, authored: true,
    lods: [{ src: 0, until: 30 }, { src: 1, until: 60 }, { src: 1, until: 130 }, { src: 2, until: 600 }] },
};
/** THE CITY'S CAR FAMILY: "cars2" (default) or, with ?cars=old, the faceted family as before. Every fleet (parked,
 *  traffic, the police yard and game, the drive car's default) loads FLEET_SOURCE. */
export const CARS_OLD = typeof location !== "undefined" && /[?&]cars=old(&|$)/.test(location.search);
export const FLEET_SOURCE = CARS_OLD ? "faceted" : "cars2";
export const PACK_LODS = [
  { error: 0, until: 25 },         // LOD0: the pack's mesh
  { error: 0.012, until: 70 },     // LOD1: 1.2 cm
  { error: 0.045, until: 160 },    // LOD2: 4.5 cm
  { error: 0.12, until: 600 },     // LOD3: 12 cm (a few pixels at 160 m)
];

const cache = new Map();
/** -> { source, cars: [{ id, label, type, paint: Color (linear), keepPaint, size: [w, h, l], parts: { Body, Wheel_FL, ... }:
 *  { geo, pos: [x, y, z] }, lods: [{ Body: geo, Wheel_FL: geo, ... , tris }] }] } */
export function loadPack(source) {
  if (cache.has(source)) return cache.get(source);
  const p = (async () => {
    const S = PACK_SOURCES[source];
    if (!S) throw new Error(`unknown car pack "${source}"`);
    const gltf = await new GLTFLoader().loadAsync(S.url);
    await MeshoptSimplifier.ready;
    const cars = [];
    for (const node of gltf.scene.children) {
      const x = node.userData || {};
      const parts = {};
      node.traverse((o) => {
        if (!o.isMesh) return;
        const name = o.parent === node ? o.name : o.parent.name;     // GLTFLoader keeps node names (Body / Wheel_FL ...)
        const geo = o.geometry;
        for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "color", "_kind"].includes(k)) geo.deleteAttribute(k);
        parts[name.replace(/_\d+$/, "")] = { geo, pos: o.position.toArray() };   // GLTFLoader makes names unique: Body_3
      });
      const done = new Map();       // the left / right wheels share a geometry: simplify it once
      // authored LODs (cars2): `parts` keeps LOD0 (Body, Wheel_*); a level draws its `src` LOD's parts (Body_L1 ...)
      const all = { ...parts };
      if (S.authored) for (const k of Object.keys(parts)) if (partLevel(k)) delete parts[k];
      const lods = (S.lods || PACK_LODS).map((L) => {
        const out = { tris: 0 };
        for (const k of Object.keys(parts)) {
          const p = S.authored && L.src ? all[`${k}_L${L.src}`] : all[k];
          if (!p) continue;
          const o = lodOpts(S, L, k), key = `${p.geo.uuid}|${o.error}`;
          const g = done.get(key) || (o.error ? lodGeometry(p.geo, o) : p.geo);
          done.set(key, g);
          g.computeBoundingSphere(); g.userData.shared = true;
          out[k] = g; out.tris += g.index.count / 3;
        }
        return out;
      });
      const bodyGeo = parts.Body?.geo;
      cars.push({ id: node.name, label: x.label || node.name, type: x.type, paint: new THREE.Color().setRGB(...(x.paint || [0.5, 0.5, 0.5])),
        keepPaint: !!x.keepPaint, size: x.size || [1.8, 1.45, 4.3], parts, lods,
        // (claude/dent) the dent's frame: half width, ends, cabin box (carDent.js)
        dent: bodyGeo ? dentFrame(bodyGeo.attributes.position.array, bodyGeo.attributes._kind?.array) : null });
    }
    return { source, label: S.label, credit: S.credit, rich: !!S.rich, lods: S.lods || PACK_LODS, cars };
  })();
  cache.set(source, p);
  return p;
}

/** One LOD of a pack geometry (viewer/drive/carLod.js: the same code the city's LOD worker runs). */
function lodGeometry(g, o) {
  const A = g.attributes;
  const r = lodMesh({ P: A.position.array, N: A.normal.array, C: A.color.array, K: A._kind.array, I: Uint32Array.from(g.index.array) }, o, MeshoptSimplifier);
  const s = new THREE.BufferGeometry();
  s.setAttribute("position", new THREE.BufferAttribute(r.P, 3)); s.setAttribute("normal", new THREE.BufferAttribute(r.N, 3));
  s.setAttribute("color", new THREE.BufferAttribute(r.C, 3)); s.setAttribute("_kind", new THREE.BufferAttribute(r.K, 1));
  s.setIndex(new THREE.BufferAttribute(r.I, 1));
  return s;
}

/** Live look switches for every pack material: glass = multiplier on the glass colour (Kenney's windows are pale
 *  blue-white swatches: 1 = as designed, ~0.12 = tinted dark like the city's real cars). */
export const packLook = { glass: uniform(1), glassOpacity: uniform(0.76), clearcoat: uniform(0.7),
  // the traffic's lamp strengths (packMaterial motion path; docs/VISUAL_FIXES.md round 2): brake, night tail, reversing,
  // indicators (?vfix2=old: 5 / 1.2 / 4 / 6)
  brake: uniform(0.35), tailNight: uniform(0.4), reversing: uniform(1.8), indicator: uniform(0.5),
  // (fix4 item 1, live; ?rearpool=old = 0) the tail lens lit by the view angle: a real lamp's reflector + prism lens
  // throw the light backwards, so the lens seen head-on is the bright part and the wrap-round facets fall off. At night
  // the brake + tail (0.75) clipped the red channel on every facet alike: the whole wrap-round lamp one flat red block
  lensShade: uniform(/[?&]rearpool=old(&|$)/.test(typeof location !== "undefined" ? location.search : "") ? 0 : 1) };
/** the tail lens's view-angle factor (1 when lensShade = 0): ~1.1 head-on, ~0.35 edge-on */
const lensK = () => {
  const nv = dot(normalView, normalize(positionView.negate())).clamp(0, 1);
  return mix(float(1), nv.mul(nv).mul(0.8).add(0.3), packLook.lensShade);
};

// ---------------------------------------------------------------- CARHIT (docs/CARHIT.md): crumpled corners
/** The crumple of four corners (the police accident props' sheet-metal fold, viewer/police/props.js, per corner): p the
 *  vertex (local, metres, x = left, z = forward), n its normal, dep a vec4 of push depths (m) for the corners front-left,
 *  front-right, rear-left, rear-right, hl the body's half length. -> the offset to SUBTRACT from p. Near a corner (the
 *  last metre of the body, from 0.2 m short of the centre line out) the panel is pushed in along its normal with a wavy
 *  fold, sagged a little and shortened along the car. All corners 0: an exact 0 (no cost in the picture). */
export function crumpleOffset(p, n, dep, hl) {
  const fold = sin(p.y.mul(23)).mul(0.35).add(sin(p.z.mul(17).add(p.x.mul(9))).mul(0.25)).add(0.7);
  const one = (sx, sz, d) => {
    const w = smoothstep(hl.sub(1.0), hl, p.z.mul(sz)).mul(smoothstep(-0.2, 0.75, p.x.mul(sx))).mul(d);
    return n.mul(w.mul(fold)).add(vec3(0, w.mul(0.25), w.mul(sz * 0.6)));
  };
  return one(1, 1, dep.x).add(one(-1, 1, dep.y)).add(one(1, -1, dep.z)).add(one(-1, -1, dep.w));
}
/** the player's car damage (viewer/drive/carHit.js -> driveMode.js): corner depths (m) FL FR RL RR, its half length */
export const playerDamage = { depth: uniform(new THREE.Vector4(0, 0, 0, 0)), hl: uniform(2.15),
  // (claude/dent) the model's dent frame rows (carDent.js frameRows): set by setPlayerDent when the car changes
  frame: [uniform(new THREE.Vector4(0.9, 2.15, -2.15, 0)), uniform(new THREE.Vector4(-0.75, 0.68, -1.9, 0)), uniform(new THREE.Vector4(0.75, 1.3, 0.9, 0))] };
/** the player's / police car model changed: its dent frame (model.dent from loadPack; else a box from its size) */
export function setPlayerDent(model) {
  const s = model?.size || [1.8, 1.45, 4.3];
  const F = model?.dent || { hw: s[0] / 2, zF: s[2] / 2, zR: -s[2] / 2, box: { x0: -s[0] / 2 + 0.22, y0: 0.68, z0: -s[2] / 2 + 0.15, x1: s[0] / 2 - 0.22, y1: s[1] - 0.12, z1: s[2] / 2 - 1.2 } };
  frameRows(F).forEach((r, k) => playerDamage.frame[k].value.set(...r));
}
/** the traffic types' dent frames: 3 vec4 rows per type index (trafficFleet.js TYPE_NAMES order, <= 8 types) */
export const trafficDentRows = Array.from({ length: 24 }, (_, i) => new THREE.Vector4(...[[0.9, 2.15, -2.15, 0], [-0.75, 0.68, -1.9, 0], [0.75, 1.3, 0.9, 0]][i % 3]));
const trafficDentU = uniformArray(trafficDentRows, "vec4").setName("carDentTypes");
const CARPUSH_OLD = typeof location !== "undefined" && /[?&]carpush=old(&|$)/.test(location.search);

/** THE PLAYER'S CAR GLASS (policefeel, owner 2026-11-17: "bad lines at the back of the car when moving"): under the
 *  TAAU the see-through glass is a stochastic per-frame discard (viewer/upscale.js) the history averages; on the
 *  player's car, big and close in the chase view and moving with the camera, the clamp never settles it: the rear window
 *  showed a band of crawling speckles (glass vs the bright boot / parcel shelf behind it). The player's car now has
 *  solid tinted glass under the TAAU (as the far LODs: dark, reflective; estates have privacy-tinted rear glass).
 *  ?carglass=old: the stochastic see-through as before. Native (?upscale=0, MSAA) keeps alpha-to-coverage. */
const CARGLASS_OLD = typeof location !== "undefined" && /[?&]carglass=old(&|$)/.test(location.search);
const UPSCALED = typeof location !== "undefined" && !/[?&](upscale|fx)=0(&|$)/.test(location.search);
export const playerSeeThrough = (rich) => !!rich && (CARGLASS_OLD || !UPSCALED);

/** THE FLEETS' CAR GLASS (carglass2, TODO 8g, docs/CARGLASS.md): under the TAAU the parked + traffic cars' see-through
 *  glass was the same per-frame stochastic discard: a fine dot / hatch pattern up close, crawling as the car or the
 *  camera moved (the history's residual noise is ~10 % of the glass-vs-interior contrast even when still; motion
 *  raises the current frame's weight). Now SPLIT: the near material (LOD 0-1) drops its glass fragments in the scene
 *  pass and the glass is drawn again as real alpha-blended glass (transparent pass, no depth write) from a compact
 *  glass-only geometry sharing the batch's instance buffers: smooth, stable, the interior and the street seen through
 *  it, the motion vectors those of what lies behind (depth) / the car (motion target). Glass-over-glass order inside a
 *  car does not matter (same tint). The glass shadow stays on the opaque material (maskShadowNode).
 *  ?carglass2=old: the stochastic glass as before. Native (?upscale=0, MSAA): alpha-to-coverage, untouched. */
const CARGLASS2_OLD = typeof location !== "undefined" && /[?&]carglass2=old(&|$)/.test(location.search);
export const GLASS_PASS = UPSCALED && !CARGLASS2_OLD;
/** the few one-off standing cars (police game props, the police yard's five): solid tinted glass under the TAAU like
 *  the player's car (no glass pass for single meshes); ?carglass2=old: stochastic as before */
export const standingSeeThrough = (rich) => !!rich && !GLASS_PASS;
const GLASS = 4;
/** the glass-only part of a car geometry: every triangle with a glass vertex (the material's per-fragment kind test
 *  splits the mixed ones exactly like the opaque material's), its vertices compacted; null when the car has none.
 *  Instanced attributes are not copied (the caller shares its batch's). */
export function glassGeometry(geo) {
  const K = geo.attributes._kind?.array, I = geo.index?.array;
  if (!K || !I) return null;
  const isG = (v) => Math.round(K[v]) === GLASS;
  const map = new Int32Array(geo.attributes.position.count).fill(-1), tri = [];
  let nv = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (!(isG(a) || isG(b) || isG(c))) continue;
    for (const v of [a, b, c]) { if (map[v] < 0) map[v] = nv++; tri.push(map[v]); }
  }
  if (!tri.length) return null;
  const out = new THREE.BufferGeometry();
  for (const [n, at] of Object.entries(geo.attributes)) {
    if (at.isInstancedBufferAttribute) continue;
    const w = at.itemSize, src = at.array, arr = new (src.constructor)(nv * w);
    for (let v = 0; v < map.length; v++) { const j = map[v]; if (j >= 0) for (let c = 0; c < w; c++) arr[j * w + c] = src[v * w + c]; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, w, at.normalized));
  }
  out.setIndex(new THREE.BufferAttribute(nv > 65535 ? Uint32Array.from(tri) : Uint16Array.from(tri), 1));
  if (geo.boundingSphere) out.boundingSphere = geo.boundingSphere.clone(); else out.computeBoundingSphere();
  out.userData.shared = true;
  return out;
}

/**
 * The pack material. paint: a THREE.Color (one car: a uniform) or "instance" (parked cars: geometry attribute "paint",
 * an InstancedBufferAttribute). lights: { head, tail, brake } uniforms (carModel.js carLights), optional.
 */
export function packMaterial({ paint = new THREE.Color(0.5, 0.5, 0.5), lights = null, rich = false, crossFade = false,
  clearcoat = rich, seeThrough = rich, motion = null, glass = null } = {}) {
  // glass (GLASS_PASS only): "split" = the opaque material of a fleet that also draws a "pass" glass mesh: its glass
  // fragments are dropped; "pass" = the blended glass material (glass fragments only)
  const split = GLASS_PASS && glass === "split" && seeThrough, pass = GLASS_PASS && glass === "pass";
  if (pass) { clearcoat = false; seeThrough = false; }
  // rich (our faceted family): vertex-colour lamps; clearcoat: a physical material for a light clear coat on the paint
  // mask only; seeThrough: alpha-to-coverage glass + a light glass shadow. The city's far LODs switch both off (cost).
  const m = clearcoat ? new THREE.MeshPhysicalNodeMaterial({ roughness: 0.6, metalness: 0 }) : new THREE.MeshStandardNodeMaterial({ roughness: 0.6, metalness: 0 });
  // the interpolated varying is 0.99999 / 1.00001 across a face: round it before comparing (else per-pixel noise)
  const kind = attribute("_kind", "float").add(0.5).floor(), vc = attribute("color", "vec3");
  const isPaint = kind.equal(1), isGlass = kind.equal(4), isHead = kind.equal(2), isTail = kind.equal(3);
  const uPaint = paint === "instance" ? attribute("paint", "vec3") : uniform(paint);
  m.colorNode = select(isPaint, vc.mul(uPaint), select(isGlass, vc.mul(packLook.glass), vc));
  const isChrome = kind.equal(5), isRubber = kind.equal(6), isPlate = kind.equal(7), isInterior = kind.equal(8);
  m.roughnessNode = select(isPaint, float(rich ? 0.34 : 0.32), select(isGlass, float(0.06), select(isChrome, float(0.22),
    select(isRubber, float(0.9), select(isPlate, float(0.45), select(isInterior, float(0.85), float(0.62)))))));
  m.metalnessNode = select(isPaint, float(0.25), select(isGlass, float(0.1), select(isChrome, float(1), float(0))));
  if (clearcoat) {
    // clear coat on the paint only: a second, sharp specular lobe (environment + sun) over the base paint
    m.clearcoatNode = select(isPaint, packLook.clearcoat, float(0));
    m.clearcoatRoughnessNode = float(0.05);
  }
  let glassShadow = null;
  if (split) {
    // the glass is the glass pass's; the light glass shadow stays here (one shadow-map texel in three under glass)
    m.userData.glassSplit = true;
    glassShadow = isGlass.not().or(screenCoordinate.x.floor().add(screenCoordinate.y.floor()).mod(3).equal(0));
    m.maskShadowNode = glassShadow;
  } else if (pass) {
    m.transparent = true; m.depthWrite = false;
    m.opacityNode = packLook.glassOpacity;
    m.userData.glassPass = true;
  } else if (seeThrough) {
    // tinted glass the interior shows through, still ONE opaque draw: alpha-to-coverage on the MSAA target
    // (the lab / city render with antialias: true), no sorting, no transparent pass
    m.alphaToCoverage = true;
    m.userData.seeThrough = true;   // (upscaled, no MSAA: stochastic see-through, viewer/upscale.js)
    m.opacityNode = select(isGlass, packLook.glassOpacity, float(1));
    // glass casts a light shadow: only one shadow-map texel in three under glass is written (PCF blends it)
    glassShadow = isGlass.not().or(screenCoordinate.x.floor().add(screenCoordinate.y.floor()).mod(3).equal(0));
    m.maskShadowNode = glassShadow;
  }
  if (lights) {
    const head = select(isHead, lights.head.mul(5), float(0));
    // (polish1 item 6, ?carlights=old: x1.2 tail / x5 brake): the player's car on the traffic's measured levels (packLook:
    // brake 0.35, night tail 0.4), the brake lens a lit red like every other car's, not a cream-salmon blob
    const kT = CARLIGHTS_OLD ? 1.2 : packLook.tailNight, kBr = CARLIGHTS_OLD ? 5 : packLook.brake;
    const tail = select(isTail, lights.tail.mul(kT).add(lights.brake ? lights.brake.mul(kBr) : float(0)).mul(lensK()), float(0));
    // rich: the lamp's own vertex colour glows (white lamps, amber taxi sign); packs: a fixed warm white
    m.emissiveNode = (rich ? vc.mul(1.15) : color(0xfff1dc)).mul(head).add(color(0xff1408).mul(tail));
    // (carhit: the player's car crumples where it was hit; one uniform, so no new pipeline per hit)
    // (claude/dent: a position-only field that keeps the shell closed, carDent.js; ?dent=old the normal push as before)
    if (!CARPUSH_OLD && DENT_OLD) m.positionNode = positionLocal.sub(crumpleOffset(positionLocal, normalLocal, playerDamage.depth, playerDamage.hl));
    else if (!CARPUSH_OLD) {
      const D = dentNodes(positionLocal, playerDamage.depth, ...playerDamage.frame);
      m.positionNode = positionLocal.add(D.offset);
      shadeDent(m, D.tone, isPaint);
    }
  }
  if (motion) {
    // THE MOVING TRAFFIC (viewer/traffic/trafficFleet.js): per-instance attribute "motion" = (wheel spin, front-wheel
    // steer, light bits, heading); per-vertex "wheel" = (wheel centre, 1 front / 2 rear / 0 body). The wheels roll and
    // steer in the vertex shader: the offset of each wheel vertex, rotated into the car's heading, is added after the
    // instance transform (the car's pitch is left out of that small offset). Normals stay (faceted tyres: invisible).
    const W = attribute("wheel", "vec4"), Mo = attribute("motion", "vec4"), p0 = attribute("position", "vec3");
    const rel = p0.sub(W.xyz), cs = cos(Mo.x), sn = sin(Mo.x);
    const r1 = vec3(rel.x, rel.y.mul(cs).sub(rel.z.mul(sn)), rel.y.mul(sn).add(rel.z.mul(cs)));          // roll about the axle
    const st = select(W.w.lessThan(1.5), Mo.y, float(0)), cst = cos(st), sst = sin(st);
    const r2 = vec3(r1.x.mul(cst).add(r1.z.mul(sst)), r1.y, r1.z.mul(cst).sub(r1.x.mul(sst)));          // steer (front)
    const dl = select(W.w.greaterThan(0.5), r2.sub(rel), vec3(0, 0, 0)), ch = cos(Mo.w), sh = sin(Mo.w);
    // CARHIT (docs/CARHIT.md): motion.z = light bits (0..63, 32 = lights off: a shoved parked car) + 64 x the damage code
    // (3 bits per corner FL FR RL RR, 4 cm a level; + 4096 x the type's half-length code, hl = 1.9 + 0.12 code), decoded
    // here in the VERTEX stage (an attribute read in the vertex shader is exact); the fragment gets the light bits alone
    // through a varying (an interpolated 70 000 would not floor cleanly)
    const zi = Mo.z.add(0.5).floor(), D = zi.div(64).floor();
    const dep = vec4(mod(D, 8), mod(D.div(8).floor(), 8), mod(D.div(64).floor(), 8), mod(D.div(512).floor(), 8)).mul(0.04);
    // (claude/dent) the top code is the TYPE index (trafficFleet.js TYPE_CODE): its dent frame from carDentTypes;
    // ?dent=old: the half-length code (hl = 1.9 + 0.12 code) and the normal push as before
    let dent;
    if (CARPUSH_OLD) dent = vec3(0, 0, 0);
    else if (DENT_OLD) dent = select(W.w.greaterThan(0.5), vec3(0, 0, 0), crumpleOffset(p0, normalLocal, dep, D.div(4096).floor().mul(0.12).add(1.9))).negate();
    else {
      const ti = int(D.div(4096).floor().clamp(0, 7)).mul(3);
      const N = dentNodes(p0, dep, trafficDentU.element(ti), trafficDentU.element(ti.add(1)), trafficDentU.element(ti.add(2)));
      const body = W.w.lessThan(0.5);
      dent = select(body, N.offset, vec3(0, 0, 0));
      shadeDent(m, select(body, N.tone, float(0)), isPaint);
    }
    m.positionNode = positionLocal.add(vec3(dl.x.mul(ch).add(dl.z.mul(sh)), dl.y, dl.z.mul(ch).sub(dl.x.mul(sh)))).add(dent);
    // lights: bits of motion.z: 1 brake, 2 head (forced), 4 left indicator, 8 right indicator, 16 reversing.
    // motion is per instance, but READ IN THE FRAGMENT it is an interpolated varying: 1 arrives as 0.99999 / 1.00001
    // per pixel (like _kind above), and floor() then flipped the bits pixel by pixel: a brake-lit lens speckled
    // half lit / half dark (white-hot vs dark red through the tone map): the "grainy tail lamps" (docs/VISUAL_FIXES.md
    // round 2); indicators and reversing lamps the same. (0 interpolates to exactly 0: unlit cars were clean.)
    // Round to the integer first.
    const bits = VFIX2_OLD ? Mo.z : CARPUSH_OLD ? Mo.z.add(0.5).floor() : varying(mod(zi, 64), "v_carBits").add(0.5).floor();
    const bit = VFIX2_OLD ? (k) => mod(bits.div(k).floor(), 2) : (k) => mod(bits.add(0.5).div(k).floor(), 2);
    const night = smoothstep(0.3, 0.6, motion.night);
    const lit = float(1).sub(bit(32));                              // (carhit: 32 = no driver: a shoved parked car)
    const headOn = night.max(bit(2)).mul(lit), blink = mod(motion.time.mul(1.5), 1).lessThan(0.5);
    const px = p0.x, outer = px.abs().greaterThan(0.55);
    const ind = select(px.greaterThan(0), bit(4), bit(8)).mul(select(blink.and(outer).and(isHead.or(isTail)), float(1), float(0)));
    const head = select(isHead, headOn.mul(5), float(0));
    // lamp strengths: with the lens now lit WHOLE (it was half dead pixels), the old x5 brake / x6 indicators / x1.2 night
    // tail read as a flat cream-salmon lens: the grade's contrast + ACES turn a bright saturated red orange (measured
    // on the lens at 10 m, golden hour: brake 0.9 -> rgb 255 149 80, 0.35 -> 255 74 45; unlit 122 17 28). Measured
    // levels instead: by day brake 0.35 = a lit RED; at night the tail 0.4 = deep red glow (227 0 11) and the brake on
    // top (255 ~65 35) still reads a step brighter; amber indicators 0.5 (255 151 45), reversing white 1.8.
    const kB = VFIX2_OLD ? 5 : packLook.brake, kN = VFIX2_OLD ? 1.2 : packLook.tailNight, kR = VFIX2_OLD ? 4 : packLook.reversing, kI = VFIX2_OLD ? 6 : packLook.indicator;
    const tail = select(isTail, night.mul(kN).mul(lit).add(bit(1).mul(kB)).mul(lensK()), float(0));
    const rev = select(isTail.and(outer.not()), bit(16).mul(kR), float(0));
    m.emissiveNode = vc.mul(1.15).mul(head).add(color(0xff1408).mul(tail)).add(color(0xffffff).mul(rev)).add(color(0xff8a00).mul(ind.mul(kI)));
  }
  if (crossFade) {
    // dithered LOD cross-fade (instanced fleets): per-instance attribute lodFade in [0, 2]. 0..1 = the outgoing LOD,
    // keeps the pixels whose screen hash is >= v; 1..2 = the incoming LOD, keeps hash < v - 1. Complementary masks,
    // so the car is never doubled nor holed while it crosses a switch distance (0 = drawn whole).
    const v = attribute("lodFade", "float");
    const h = screenCoordinate.xy.floor().dot(vec2(0.06711056, 0.00583715)).fract().mul(52.9829189).fract();   // interleaved gradient noise
    m.maskNode = select(v.greaterThan(1), h.lessThan(v.sub(1)), h.greaterThanEqual(v));
    // the shadow fades with it (in the shadow pass screenCoordinate is the shadow-map texel): no shadow pop either
    m.maskShadowNode = glassShadow ? m.maskNode.and(glassShadow) : m.maskNode;
  }
  // the split (after the cross-fade mask, which the shadow keeps): fragments of the other half dropped in every pass
  // but the shadow (maskShadowNode set above / by the cross-fade)
  if (split || pass) {
    const keep = pass ? isGlass : isGlass.not();
    m.maskNode = m.maskNode ? m.maskNode.and(keep) : keep;
  }
  // no mrtNode: the post chain's MRT (viewer/post.js) reads this roughness / metalness itself (SSR on paint and glass),
  // and an mrtNode breaks the shader where no MRT is set (labs, ?fx=0: "structures must have at least one member")
  m.userData.paint = uPaint;
  m.userData.shared = true;
  return wxMat(m, { porosity: 0.05, beads: true, frost: true });   // the weather: beads on the paint, snow on roofs / bonnets, frost
}
