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
import { attribute, color, float, select, uniform, screenCoordinate, vec2, vec3, cos, sin, positionLocal, smoothstep, mod } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodMesh, lodOpts } from "./carLod.js";
import { wxMat } from "../weather/cityWeatherize.js";   // the weather (docs/WEATHER.md "City hookup"): gated, ?weather=old none

// ?vfix2=old: the traffic's light bits decoded as before round 2 of the visual fixes (A/B)
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
};
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
      const lods = (S.lods || PACK_LODS).map((L) => {
        const out = { tris: 0 };
        for (const [k, p] of Object.entries(parts)) {
          const o = lodOpts(S, L, k), key = `${p.geo.uuid}|${o.error}`;
          const g = done.get(key) || (o.error ? lodGeometry(p.geo, o) : p.geo);
          done.set(key, g);
          g.computeBoundingSphere(); g.userData.shared = true;
          out[k] = g; out.tris += g.index.count / 3;
        }
        return out;
      });
      cars.push({ id: node.name, label: x.label || node.name, type: x.type, paint: new THREE.Color().setRGB(...(x.paint || [0.5, 0.5, 0.5])),
        keepPaint: !!x.keepPaint, size: x.size || [1.8, 1.45, 4.3], parts, lods });
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
  brake: uniform(0.35), tailNight: uniform(0.4), reversing: uniform(1.8), indicator: uniform(0.5) };

/**
 * The pack material. paint: a THREE.Color (one car: a uniform) or "instance" (parked cars: geometry attribute "paint",
 * an InstancedBufferAttribute). lights: { head, tail, brake } uniforms (carModel.js carLights), optional.
 */
export function packMaterial({ paint = new THREE.Color(0.5, 0.5, 0.5), lights = null, rich = false, crossFade = false,
  clearcoat = rich, seeThrough = rich, motion = null } = {}) {
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
  if (seeThrough) {
    // tinted glass the interior shows through, still ONE opaque draw: alpha-to-coverage on the MSAA target
    // (the lab / city render with antialias: true), no sorting, no transparent pass
    m.alphaToCoverage = true;
    m.opacityNode = select(isGlass, packLook.glassOpacity, float(1));
    // glass casts a light shadow: only one shadow-map texel in three under glass is written (PCF blends it)
    glassShadow = isGlass.not().or(screenCoordinate.x.floor().add(screenCoordinate.y.floor()).mod(3).equal(0));
    m.maskShadowNode = glassShadow;
  }
  if (lights) {
    const head = select(isHead, lights.head.mul(5), float(0));
    const tail = select(isTail, lights.tail.mul(1.2).add(lights.brake ? lights.brake.mul(5) : float(0)), float(0));
    // rich: the lamp's own vertex colour glows (white lamps, amber taxi sign); packs: a fixed warm white
    m.emissiveNode = (rich ? vc.mul(1.15) : color(0xfff1dc)).mul(head).add(color(0xff1408).mul(tail));
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
    m.positionNode = positionLocal.add(vec3(dl.x.mul(ch).add(dl.z.mul(sh)), dl.y, dl.z.mul(ch).sub(dl.x.mul(sh))));
    // lights: bits of motion.z: 1 brake, 2 head (forced), 4 left indicator, 8 right indicator, 16 reversing.
    // motion is per instance, but READ IN THE FRAGMENT it is an interpolated varying: 1 arrives as 0.99999 / 1.00001
    // per pixel (like _kind above), and floor() then flipped the bits pixel by pixel: a brake-lit lens speckled
    // half lit / half dark (white-hot vs dark red through the tone map): the "grainy tail lamps" (docs/VISUAL_FIXES.md
    // round 2); indicators and reversing lamps the same. (0 interpolates to exactly 0: unlit cars were clean.)
    // Round to the integer first.
    const bits = VFIX2_OLD ? Mo.z : Mo.z.add(0.5).floor();
    const bit = VFIX2_OLD ? (k) => mod(bits.div(k).floor(), 2) : (k) => mod(bits.add(0.5).div(k).floor(), 2);
    const night = smoothstep(0.3, 0.6, motion.night);
    const headOn = night.max(bit(2)), blink = mod(motion.time.mul(1.5), 1).lessThan(0.5);
    const px = p0.x, outer = px.abs().greaterThan(0.55);
    const ind = select(px.greaterThan(0), bit(4), bit(8)).mul(select(blink.and(outer).and(isHead.or(isTail)), float(1), float(0)));
    const head = select(isHead, headOn.mul(5), float(0));
    // lamp strengths: with the lens now lit WHOLE (it was half dead pixels), the old x5 brake / x6 indicators / x1.2 night
    // tail read as a flat cream-salmon lens: the grade's contrast + ACES turn a bright saturated red orange (measured
    // on the lens at 10 m, golden hour: brake 0.9 -> rgb 255 149 80, 0.35 -> 255 74 45; unlit 122 17 28). Measured
    // levels instead: by day brake 0.35 = a lit RED; at night the tail 0.4 = deep red glow (227 0 11) and the brake on
    // top (255 ~65 35) still reads a step brighter; amber indicators 0.5 (255 151 45), reversing white 1.8.
    const kB = VFIX2_OLD ? 5 : packLook.brake, kN = VFIX2_OLD ? 1.2 : packLook.tailNight, kR = VFIX2_OLD ? 4 : packLook.reversing, kI = VFIX2_OLD ? 6 : packLook.indicator;
    const tail = select(isTail, night.mul(kN).add(bit(1).mul(kB)), float(0));
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
  // no mrtNode: the post chain's MRT (viewer/post.js) reads this roughness / metalness itself (SSR on paint and glass),
  // and an mrtNode breaks the shader where no MRT is set (labs, ?fx=0: "structures must have at least one member")
  m.userData.paint = uPaint;
  m.userData.shared = true;
  return wxMat(m, { porosity: 0.05, beads: true, frost: true });   // the weather: beads on the paint, snow on roofs / bonnets, frost
}
