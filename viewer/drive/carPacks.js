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
      const lods = (S.lods || PACK_LODS).map(({ error, wheel, loose }) => {
        const out = { tris: 0 };
        for (const [k, p] of Object.entries(parts)) {
          const body = k === "Body", e = body ? error : wheel ?? error * 0.6;
          const key = `${p.geo.uuid}|${e}`;
          const g = done.get(key) || (e ? simplify(p.geo, e, S.welded, S.prune, !body && wheel != null, !!loose) : p.geo);
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

function simplify(g, error, weldedOnly = false, prune = false, free = false, loose = false) {
  if (loose) return simplifyLoose(g, error, prune);
  if (weldedOnly) return simplifyWelded(g, error, prune, free);
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
function simplifyWelded(g, error, prune = false, free = false) {
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
  const flags = error < 0.02 && !free ? ["ErrorAbsolute", "LockBorder"] : ["ErrorAbsolute"];
  if (prune && error >= 0.02) flags.push("Prune");   // far LODs: drop islands under the error (lug nuts, plate glyphs, wipers)
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

/**
 * The FAR LOD of a many-coloured mesh (our faceted cars, >= 130 m: 15-25 px): weld on POSITION only, so colour seams
 * stop being borders, and let simplifyWithAttributes weigh the colour (and a paint flag) so regions keep their place.
 * Each output triangle gets one kind (paint wins when most of its corners are paint, else the commonest) and the mean
 * colour of its corners of that kind; flat normals again.
 */
function simplifyLoose(g, error, prune = false) {
  const P = g.attributes.position.array, C = g.attributes.color.array, K = g.attributes._kind.array, n = P.length / 3;
  const map = new Map(), weld = new Uint32Array(n), reps = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`;
    let w = map.get(k);
    if (w == null) { w = reps.length; map.set(k, w); reps.push([]); }
    reps[w].push(i); weld[i] = w;
  }
  const N = reps.length, wpos = new Float32Array(N * 3), attr = new Float32Array(N * 4), vkind = new Uint8Array(N), vcol = new Float32Array(N * 3);
  reps.forEach((list, w) => {
    wpos.set(P.subarray(list[0] * 3, list[0] * 3 + 3), w * 3);
    const cnt = new Map();
    let r = 0, gg = 0, b = 0, paint = 0;
    for (const i of list) { r += C[i * 3]; gg += C[i * 3 + 1]; b += C[i * 3 + 2]; if (K[i] === 1) paint++; cnt.set(K[i], (cnt.get(K[i]) || 0) + 1); }
    const m = list.length;
    attr.set([r / m, gg / m, b / m, paint / m], w * 4);
    vkind[w] = [...cnt].sort((x, y) => y[1] - x[1])[0][0];
    let cr = 0, cg = 0, cb = 0, cm = 0;
    for (const i of list) if (K[i] === vkind[w]) { cr += C[i * 3]; cg += C[i * 3 + 1]; cb += C[i * 3 + 2]; cm++; }
    vcol.set([cr / cm, cg / cm, cb / cm], w * 3);
  });
  const widx = Uint32Array.from(g.index.array, (i) => weld[i]);
  const flags = ["ErrorAbsolute"];
  if (prune) flags.push("Prune");
  const [idx] = MeshoptSimplifier.simplifyWithAttributes(widx, wpos, 3, attr, 4, [0.05, 0.05, 0.05, 0.08], null, 0, error, flags);
  const T = idx.length / 3, pos = new Float32Array(T * 9), nrm = new Float32Array(T * 9), col = new Float32Array(T * 9), kind = new Float32Array(T * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < T; t++) {
    const w = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]];
    a.fromArray(wpos, w[0] * 3); b.fromArray(wpos, w[1] * 3); c.fromArray(wpos, w[2] * 3);
    const nn = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const ks = w.map((x) => vkind[x]);
    const kd = ks.filter((x) => x === 1).length >= 2 ? 1 : ks[0] === ks[1] || ks[0] === ks[2] ? ks[0] : ks[1] === ks[2] ? ks[1] : ks[0];
    let cr = 0, cg = 0, cb = 0, cm = 0;
    for (const x of w) if (vkind[x] === kd) { cr += vcol[x * 3]; cg += vcol[x * 3 + 1]; cb += vcol[x * 3 + 2]; cm++; }
    for (let k = 0; k < 3; k++) {
      const o = t * 3 + k;
      pos.set(wpos.subarray(w[k] * 3, w[k] * 3 + 3), o * 3);
      nrm[o * 3] = nn.x; nrm[o * 3 + 1] = nn.y; nrm[o * 3 + 2] = nn.z;
      col[o * 3] = cr / cm; col[o * 3 + 1] = cg / cm; col[o * 3 + 2] = cb / cm; kind[o] = kd;
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3)); out.setAttribute("_kind", new THREE.BufferAttribute(kind, 1));
  out.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: T * 3 }, (_, i) => i), 1));
  return out;
}

/** Live look switches for every pack material: glass = multiplier on the glass colour (Kenney's windows are pale
 *  blue-white swatches: 1 = as designed, ~0.12 = tinted dark like the city's real cars). */
export const packLook = { glass: uniform(1), glassOpacity: uniform(0.76), clearcoat: uniform(0.7) };

/**
 * The pack material. paint: a THREE.Color (one car: a uniform) or "instance" (parked cars: geometry attribute "paint",
 * an InstancedBufferAttribute). lights: { head, tail, brake } uniforms (carModel.js carLights), optional.
 */
export function packMaterial({ paint = new THREE.Color(0.5, 0.5, 0.5), lights = null, rich = false, crossFade = false } = {}) {
  // rich (our faceted family): a physical material for a light clear coat on the paint mask only
  const m = rich ? new THREE.MeshPhysicalNodeMaterial({ roughness: 0.6, metalness: 0 }) : new THREE.MeshStandardNodeMaterial({ roughness: 0.6, metalness: 0 });
  // the interpolated varying is 0.99999 / 1.00001 across a face: round it before comparing (else per-pixel noise)
  const kind = attribute("_kind", "float").add(0.5).floor(), vc = attribute("color", "vec3");
  const isPaint = kind.equal(1), isGlass = kind.equal(4), isHead = kind.equal(2), isTail = kind.equal(3);
  const uPaint = paint === "instance" ? attribute("paint", "vec3") : uniform(paint);
  m.colorNode = select(isPaint, vc.mul(uPaint), select(isGlass, vc.mul(packLook.glass), vc));
  const isChrome = kind.equal(5), isRubber = kind.equal(6), isPlate = kind.equal(7), isInterior = kind.equal(8);
  m.roughnessNode = select(isPaint, float(rich ? 0.34 : 0.32), select(isGlass, float(0.06), select(isChrome, float(0.22),
    select(isRubber, float(0.9), select(isPlate, float(0.45), select(isInterior, float(0.85), float(0.62)))))));
  m.metalnessNode = select(isPaint, float(0.25), select(isGlass, float(0.1), select(isChrome, float(1), float(0))));
  if (rich) {
    // clear coat on the paint only: a second, sharp specular lobe (environment + sun) over the base paint
    m.clearcoatNode = select(isPaint, packLook.clearcoat, float(0));
    m.clearcoatRoughnessNode = float(0.05);
    // tinted glass the interior shows through, still ONE opaque draw: alpha-to-coverage on the MSAA target
    // (the lab / city render with antialias: true), no sorting, no transparent pass
    m.alphaToCoverage = true;
    m.opacityNode = select(isGlass, packLook.glassOpacity, float(1));
    // glass casts a light shadow: only one shadow-map texel in three under glass is written (PCF blends it)
    m.maskShadowNode = isGlass.not().or(screenCoordinate.x.floor().add(screenCoordinate.y.floor()).mod(3).equal(0));
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
  }
  // no mrtNode: the post chain's MRT (viewer/post.js) reads this roughness / metalness itself (SSR on paint and glass),
  // and an mrtNode breaks the shader where no MRT is set (labs, ?fx=0: "structures must have at least one member")
  m.userData.paint = uPaint;
  m.userData.shared = true;
  return m;
}
