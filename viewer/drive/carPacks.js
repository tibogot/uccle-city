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
import { attribute, color, float, select, uniform } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export const PACK_SOURCES = {
  kenney: { label: "Kenney Car Kit", url: new URL("../../models/cars/kenney.glb", import.meta.url).href, credit: "Kenney (kenney.nl), CC0" },
  quaternius: { label: "Quaternius Cars Pack", url: new URL("../../models/cars/quaternius.glb", import.meta.url).href, credit: "Quaternius (quaternius.com), CC0" },
  // ours: tools/blender/carFaceted.py (faceted hard-surface family, baked AO, see-through tinted glass)
  faceted: { label: "Faceted (carFaceted.py)", url: new URL("../../models/cars/faceted.glb", import.meta.url).href, credit: "uccle-city, scripted", seeThrough: true,
    welded: true,      // flat faces split per normal everywhere: always simplify on the position + colour weld
    prune: true, wheelError: 1.0,
    lods: [{ error: 0, until: 22 }, { error: 0.006, until: 55 }, { error: 0.022, until: 130 }, { error: 0.08, until: 600 }] },
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
      const lods = (S.lods || PACK_LODS).map(({ error }) => {
        const out = { tris: 0 };
        for (const [k, p] of Object.entries(parts)) {
          const g = error ? simplify(p.geo, error * (k === "Body" ? 1 : S.wheelError ?? 0.6), S.welded, S.prune) : p.geo;
          g.computeBoundingSphere(); g.userData.shared = true;
          out[k] = g; out.tris += g.index.count / 3;
        }
        return out;
      });
      cars.push({ id: node.name, label: x.label || node.name, type: x.type, paint: new THREE.Color().setRGB(...(x.paint || [0.5, 0.5, 0.5])),
        keepPaint: !!x.keepPaint, size: x.size || [1.8, 1.45, 4.3], parts, lods });
    }
    return { source, label: S.label, credit: S.credit, seeThrough: !!S.seeThrough, lods: S.lods || PACK_LODS, cars };
  })();
  cache.set(source, p);
  return p;
}

function simplify(g, error, weldedOnly = false, prune = false) {
  if (weldedOnly) return simplifyWelded(g, error, prune);
  const src = new Uint32Array(g.index.array), P = g.attributes.position.array;
  const [idx] = MeshoptSimplifier.simplify(src, P, 3, 0, error, ["ErrorAbsolute"]);
  if (idx.length < src.length * 0.85) {
    const s = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(g.attributes)) s.setAttribute(k, a);
    s.setIndex(new THREE.BufferAttribute(idx, 1));
    return s;
  }
  return simplifyWelded(g, error);
}

/**
 * Flat-shaded packs (Quaternius, Kenney) split vertices per face (hard normals): nearly every edge is a border and
 * the simplifier can hardly move. Simplify on an index WELDED by position + colour + kind instead (normals ignored):
 * colour seams stay borders (kept closed with LockBorder up close), flat faces merge; then flat face normals again.
 */
function simplifyWelded(g, error, prune = false) {
  const P = g.attributes.position.array, C = g.attributes.color.array, K = g.attributes._kind.array, n = P.length / 3;
  const key = (i) => `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}|${K[i]}|` +
    `${Math.round(C[i * 3] * 500)},${Math.round(C[i * 3 + 1] * 500)},${Math.round(C[i * 3 + 2] * 500)}`;
  const map = new Map(), weld = new Uint32Array(n), rep = [];
  for (let i = 0; i < n; i++) {
    const k = key(i);
    let w = map.get(k);
    if (w == null) { w = rep.length; map.set(k, w); rep.push(i); }
    weld[i] = w;
  }
  const wpos = new Float32Array(rep.length * 3);
  rep.forEach((i, w) => wpos.set(P.subarray(i * 3, i * 3 + 3), w * 3));
  const widx = Uint32Array.from(g.index.array, (i) => weld[i]);
  const flags = error < 0.02 ? ["ErrorAbsolute", "LockBorder"] : ["ErrorAbsolute"];
  if (prune) flags.push("Prune");     // drop islands smaller than the error (lug nuts, plate glyphs, wipers far away)
  const [idx] = MeshoptSimplifier.simplify(widx, wpos, 3, 0, error, flags);
  const T = idx.length / 3, pos = new Float32Array(T * 9), nrm = new Float32Array(T * 9), col = new Float32Array(T * 9), kind = new Float32Array(T * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < T; t++) {
    const w = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]];
    a.fromArray(wpos, w[0] * 3); b.fromArray(wpos, w[1] * 3); c.fromArray(wpos, w[2] * 3);
    const nn = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    for (let k = 0; k < 3; k++) {
      const o = t * 3 + k, src = rep[w[k]];
      pos.set(wpos.subarray(w[k] * 3, w[k] * 3 + 3), o * 3);
      nrm[o * 3] = nn.x; nrm[o * 3 + 1] = nn.y; nrm[o * 3 + 2] = nn.z;
      col.set(C.subarray(src * 3, src * 3 + 3), o * 3); kind[o] = K[src];
    }
  }
  const s = new THREE.BufferGeometry();
  s.setAttribute("position", new THREE.BufferAttribute(pos, 3)); s.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  s.setAttribute("color", new THREE.BufferAttribute(col, 3)); s.setAttribute("_kind", new THREE.BufferAttribute(kind, 1));
  s.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: T * 3 }, (_, i) => i), 1));
  return s;
}

/** Live look switches for every pack material: glass = multiplier on the glass colour (Kenney's windows are pale
 *  blue-white swatches: 1 = as designed, ~0.12 = tinted dark like the city's real cars). */
export const packLook = { glass: uniform(1), glassOpacity: uniform(0.76) };

/**
 * The pack material. paint: a THREE.Color (one car: a uniform) or "instance" (parked cars: geometry attribute "paint",
 * an InstancedBufferAttribute). lights: { head, tail, brake } uniforms (carModel.js carLights), optional.
 */
export function packMaterial({ paint = new THREE.Color(0.5, 0.5, 0.5), lights = null, seeThrough = false } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.6, metalness: 0 });
  // the interpolated varying is 0.99999 / 1.00001 across a face: round it before comparing (else per-pixel noise)
  const kind = attribute("_kind", "float").add(0.5).floor(), vc = attribute("color", "vec3");
  const isPaint = kind.equal(1), isGlass = kind.equal(4), isHead = kind.equal(2), isTail = kind.equal(3);
  const uPaint = paint === "instance" ? attribute("paint", "vec3") : uniform(paint);
  m.colorNode = select(isPaint, vc.mul(uPaint), select(isGlass, vc.mul(packLook.glass), vc));
  const isChrome = kind.equal(5), isRubber = kind.equal(6), isPlate = kind.equal(7), isInterior = kind.equal(8);
  m.roughnessNode = select(isPaint, float(0.32), select(isGlass, float(0.06), select(isChrome, float(0.22),
    select(isRubber, float(0.9), select(isPlate, float(0.45), select(isInterior, float(0.85), float(0.62)))))));
  m.metalnessNode = select(isPaint, float(0.25), select(isGlass, float(0.1), select(isChrome, float(1), float(0))));
  if (seeThrough) {
    // tinted glass the interior shows through, still ONE opaque draw: alpha-to-coverage on the MSAA target
    // (the lab / city render with antialias: true), no sorting, no transparent pass
    m.alphaToCoverage = true;
    m.opacityNode = select(isGlass, packLook.glassOpacity, float(1));
  }
  if (lights) {
    const head = select(isHead, lights.head.mul(5), float(0));
    const tail = select(isTail, lights.tail.mul(1.2).add(lights.brake ? lights.brake.mul(5) : float(0)), float(0));
    m.emissiveNode = color(0xfff1dc).mul(head).add(color(0xff1408).mul(tail));
  }
  // no mrtNode: the post chain's MRT (viewer/post.js) reads this roughness / metalness itself (SSR on paint and glass),
  // and an mrtNode breaks the shader where no MRT is set (labs, ?fx=0: "structures must have at least one member")
  m.userData.paint = uPaint;
  m.userData.shared = true;
  return m;
}
