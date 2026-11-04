// CAR PACKS: the CC0 cars of models/cars/<source>.glb (tools/cars/convertPacks.mjs: Kenney "Car Kit", Quaternius
// "Cars Pack"), as models for carModel.js (the drive car: same interface as the scripted hatchback) and as instanced
// variants for parked streets (the Car Lab's comparison; later perhaps viewer/cars.js).
//
// One material draws every car of a source: the palette is baked into COLOR_0, _KIND says what a vertex is
// (0 fixed colour, 1 body paint = COLOR_0 is a shade the paint colour multiplies, 2 head light, 3 tail light, 4 glass).
// Paint comes from a uniform (one car) or a per-instance attribute "paint" (parked cars). LODs are made here at load by
// meshoptimizer (absolute error in metres; colour seams are open borders, so the simplifier keeps them as borders).
import * as THREE from "three/webgpu";
import { attribute, color, float, mrt, positionView, select, smoothstep, uniform, vec3 } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export const PACK_SOURCES = {
  kenney: { label: "Kenney Car Kit", url: new URL("../../models/cars/kenney.glb", import.meta.url).href, credit: "Kenney (kenney.nl), CC0" },
  quaternius: { label: "Quaternius Cars Pack", url: new URL("../../models/cars/quaternius.glb", import.meta.url).href, credit: "Quaternius (quaternius.com), CC0" },
};
export const PACK_LODS = [
  { error: 0, until: 25 },         // LOD0: the pack's mesh
  { error: 0.012, until: 80 },     // LOD1: 1.2 cm
  { error: 0.045, until: 500 },    // LOD2: 4.5 cm
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
        parts[name] = { geo, pos: o.position.toArray() };
      });
      const lods = PACK_LODS.map(({ error }) => {
        const out = { tris: 0 };
        for (const [k, p] of Object.entries(parts)) {
          const g = error ? simplify(p.geo, error * (k === "Body" ? 1 : 0.6)) : p.geo;
          g.computeBoundingSphere(); g.userData.shared = true;
          out[k] = g; out.tris += g.index.count / 3;
        }
        return out;
      });
      cars.push({ id: node.name, label: x.label || node.name, type: x.type, paint: new THREE.Color().setRGB(...(x.paint || [0.5, 0.5, 0.5])),
        keepPaint: !!x.keepPaint, size: x.size || [1.8, 1.45, 4.3], parts, lods });
    }
    return { source, label: S.label, credit: S.credit, cars };
  })();
  cache.set(source, p);
  return p;
}

function simplify(g, error) {
  const [idx] = MeshoptSimplifier.simplify(new Uint32Array(g.index.array), g.attributes.position.array, 3, 0, error, ["ErrorAbsolute"]);
  const s = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(g.attributes)) s.setAttribute(k, a);
  s.setIndex(new THREE.BufferAttribute(idx, 1));
  return s;
}

/**
 * The pack material. paint: a THREE.Color (one car: a uniform) or "instance" (parked cars: geometry attribute "paint",
 * an InstancedBufferAttribute). lights: { head, tail, brake } uniforms (carModel.js carLights), optional.
 */
export function packMaterial({ paint = new THREE.Color(0.5, 0.5, 0.5), lights = null } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.6, metalness: 0 });
  // the interpolated varying is 0.99999 / 1.00001 across a face: round it before comparing (else per-pixel noise)
  const kind = attribute("_kind", "float").add(0.5).floor(), vc = attribute("color", "vec3");
  const isPaint = kind.equal(1), isGlass = kind.equal(4), isHead = kind.equal(2), isTail = kind.equal(3);
  const uPaint = paint === "instance" ? attribute("paint", "vec3") : uniform(paint);
  m.colorNode = select(isPaint, vc.mul(uPaint), vc);
  m.roughnessNode = select(isPaint, float(0.32), select(isGlass, float(0.06), float(0.62)));
  m.metalnessNode = select(isPaint, float(0.25), select(isGlass, float(0.1), float(0)));
  if (lights) {
    const head = select(isHead, lights.head.mul(5), float(0));
    const tail = select(isTail, lights.tail.mul(1.2).add(lights.brake ? lights.brake.mul(5) : float(0)), float(0));
    m.emissiveNode = color(0xfff1dc).mul(head).add(color(0xff1408).mul(tail));
  }
  // post chain (viewer/post.js): SSR on paint and glass, faded out far away; no screen-space AO on glass and lamps
  const rough = m.roughnessNode, metal = m.metalnessNode, ssrFade = smoothstep(360.0, 180.0, positionView.z.negate());
  const noAO = select(isGlass.or(isHead).or(isTail), float(0), float(1));
  m.mrtNode = mrt({ metalRough: vec3(select(rough.lessThan(0.75), metal.mul(ssrFade), float(0)), rough, noAO) });
  m.userData.paint = uPaint;
  m.userData.shared = true;
  return m;
}
