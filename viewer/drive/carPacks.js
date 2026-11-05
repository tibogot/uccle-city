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
import { attribute, color, float, select, uniform, screenCoordinate, vec2 } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { lodMesh, lodOpts } from "./carLod.js";

export const PACK_SOURCES = {
  kenney: { label: "Kenney Car Kit", url: new URL("../../models/cars/kenney.glb", import.meta.url).href, credit: "Kenney (kenney.nl), CC0" },
  quaternius: { label: "Quaternius Cars Pack", url: new URL("../../models/cars/quaternius.glb", import.meta.url).href, credit: "Quaternius (quaternius.com), CC0" },
  // ours: tools/blender/carFaceted.py (faceted hard-surface family, baked AO, see-through tinted glass)
  faceted: { label: "Faceted (carFaceted.py)", url: new URL("../../models/cars/faceted.glb", import.meta.url).href, credit: "uccle-city, scripted",
    rich: true,        // packMaterial: clear-coat paint, see-through glass (alpha to coverage), light shadow through glass, lit sign letters
    welded: true,      // flat faces split per normal everywhere: always simplify on the position + colour weld
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
export const packLook = { glass: uniform(1), glassOpacity: uniform(0.76), clearcoat: uniform(0.7) };

/**
 * The pack material. paint: a THREE.Color (one car: a uniform) or "instance" (parked cars: geometry attribute "paint",
 * an InstancedBufferAttribute). lights: { head, tail, brake } uniforms (carModel.js carLights), optional.
 */
export function packMaterial({ paint = new THREE.Color(0.5, 0.5, 0.5), lights = null, rich = false, crossFade = false,
  clearcoat = rich, seeThrough = rich } = {}) {
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
  return m;
}
