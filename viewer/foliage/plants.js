// GARDEN PLANTS (tools/blender/plants.py -> models/foliage/plants.glb): instanced, GPU-driven, seasonal.
//
// Per plant type, three levels of detail drawn with INDIRECT draws whose instance lists a compute pass writes every
// frame (frustum + distance, like the grass; CPU per frame: a few uniform writes and one dispatch per type):
//   LOD0  the Blender model (real leaf and petal geometry), up to LOD_D[0]
//   LOD1  meshoptimizer of LOD0 (Prune: tiny leaves and florets merge away), up to LOD_D[1]
//   LOD2  the scripted far shell (plants.py *_far: a closed lumpy crown), up to LOD_D[2]; nothing beyond
// Between two LODs both are drawn across a 2 m band with complementary screen-space dither (our impostor kit's
// measured choice for hand-overs: screen IGN), and the last one dissolves the same way: nothing pops.
// All the material slots of a plant are merged into ONE geometry with a slot id per vertex and ONE material that picks
// the colour per slot (leaf, leaf_mass, stem, flower_a, flower_b, flower_centre): 1 draw per (type, LOD).
// Seasons (viewer/foliage/seasons.js): deciduous leaves shrink to their base as the leaf amount falls (each leaf its
// own threshold), flowers open and close by the species' bloom, bulbs come and go, colours turn.
// Small plants never cast shadows; they receive the sun's.
import * as THREE from "three/webgpu";
import {
  Fn, If, uniform, float, int, uint, vec2, vec3, vec4, instanceIndex, instancedArray, storage, atomicAdd, atomicStore,
  hash, smoothstep, mix, clamp, max, min, abs, length, normalize, cos, sin, cameraPosition, attribute, select, screenCoordinate,
  fract, dot, Discard, varying, step, PI2, positionWorld, cameraViewMatrix, faceDirection, sign,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { season } from "./seasons.js";
import { windAt, wind } from "./wind.js";
import { noiseAt } from "./noise.js";

export const SLOTS = ["leaf", "leaf_mass", "stem", "flower_a", "flower_b", "flower_centre"];
export const LOD_D = [7, 16, 65];             // LOD0 to 7 m, LOD1 to 16 m, LOD2 (shell) to 65 m (11 / 28 sparkled: sub-pixel leaves)
const BAND = 2.0;
export const plantU = { lodScale: uniform(1), fadeOut: uniform(LOD_D[2]), dbg: uniform(0) };

// per type: sRGB colours and the seasonal behaviour
const TYPES = {
  box_ball:     { leaf: "#4a6e2c", flowers: ["#2f4a1c"], evergreen: true, bloom: null },
  laurel:       { leaf: "#3c6328", flowers: ["#e8ecd8"], evergreen: true, bloom: null },
  rhododendron: { leaf: "#41612c", flowers: ["#c4417e", "#d86aa0", "#9b4fb8", "#e8e4ea"], evergreen: true, bloom: "rose" },
  hydrangea:    { leaf: "#5a8a36", flowers: ["#6f8fd8", "#e07aa8", "#f0eee6", "#9a7fd0"], evergreen: false, bloom: "hydrangea", brown: "hydBrown" },
  rose:         { leaf: "#47702c", flowers: ["#b0102a", "#e86a8a", "#f2efe4", "#f0c040", "#e88050"], evergreen: false, bloom: "rose" },
  lavender:     { leaf: "#9aab8e", flowers: ["#7a5cc0", "#8a6ad0"], evergreen: true, bloom: "lavender", spikeGrey: true },
  bulbs:        { leaf: "#6a9a3a", flowers: ["#d01c1c", "#f2c21a", "#e86aa0", "#f4f0e8"], flowersB: ["#f2d21a", "#f8f0c8"], evergreen: false, bloom: "bulbs", whole: true },
  geranium:     { leaf: "#5a8a30", flowers: ["#d4142a", "#e84a6a", "#f05a3a"], evergreen: true, bloom: "geranium" },
};
export const PLANT_TYPES = Object.keys(TYPES);

let promise = null;
/** { types: { name: { lods: [geometry x3], tris: [n x3], height } } } */
export function loadPlants() {
  return (promise ??= (async () => {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL("../../models/foliage/plants.glb", import.meta.url).href);
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const nodes = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = (o.parent && o.parent.isMesh === false && o.parent !== gltf.scene ? o.parent.name : o.name).replace(/_\d+$/, "");
      (nodes[name] ??= []).push(o);
    });
    const merged = (meshes) => {
      const parts = meshes.map((m) => {
        const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
        // the glTF exporter wrote v as 1 - v: our data channels back to their values (UV0 stays as a texture UV)
        for (const k of ["uv1", "uv2", "uv3"]) { const a = g.attributes[k]; if (a) for (let i = 0; i < a.count; i++) a.setY(i, 1 - a.getY(i)); }
        const slot = Math.max(0, SLOTS.indexOf(m.material.name));
        g.setAttribute("slot", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(slot), 1));
        return g;
      });
      return mergeGeos(parts);
    };
    const types = {};
    for (const t of PLANT_TYPES) {
      if (!nodes[t]) continue;
      const g0 = merged(nodes[t]);
      const far = nodes[t + "_far"] ? merged(nodes[t + "_far"]) : null;
      // LOD1: leaf THINNING with area compensation (GoT's density trick, in JS): keep 40 % of the leaves and florets
      // (by their own random, UV1.y), grown 1/sqrt(0.4) about their base so the crown keeps its mass; the stems through
      // meshoptimizer (1.5 cm). Plain meshopt cannot do it: every leaf is its own little component.
      const g1 = thinLeaves(g0, 0.4);
      // LOD2: the far shell (or LOD1 again for the small plants without one: bulbs, geranium)
      const g2 = far ?? g1;
      g0.computeBoundingBox();
      types[t] = { lods: [g0, g1, g2], tris: [g0.index.count / 3, g1.index.count / 3, g2.index.count / 3], height: g0.boundingBox.max.y };
    }
    return { types };
  })());
}

function thinLeaves(g, keep) {
  const P = g.attributes.position, U1 = g.attributes.uv1, U2 = g.attributes.uv2, U3 = g.attributes.uv3, I = g.index.array;
  const grow = 1 / Math.sqrt(keep);
  const pos = new Float32Array(P.array);
  const out = [], stemTris = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], kind = U3.getY(a), r = U1.getY(a);
    if (kind < 0.5) { stemTris.push(I[t], I[t + 1], I[t + 2]); continue; }
    if (kind > 2.5) { out.push(I[t], I[t + 1], I[t + 2]); continue; }
    if (r >= keep) continue;
    out.push(I[t], I[t + 1], I[t + 2]);
  }
  // grow kept leaves about their base (each vertex knows its part's base)
  const used = new Uint8Array(P.count);
  for (const i of out) used[i] = 1;
  for (let i = 0; i < P.count; i++) {
    if (!used[i] || U3.getY(i) < 0.5 || U3.getY(i) > 2.5) continue;
    const bx = U2.getX(i), by = U2.getY(i), bz = U3.getX(i);
    pos[i * 3] = bx + (pos[i * 3] - bx) * grow; pos[i * 3 + 1] = by + (pos[i * 3 + 1] - by) * grow; pos[i * 3 + 2] = bz + (pos[i * 3 + 2] - bz) * grow;
  }
  let stems = new Uint32Array(stemTris);
  if (stems.length) [stems] = MeshoptSimplifier.simplify(stems, P.array, 3, Math.floor(stems.length * 0.5 / 3) * 3, 0.015, ["ErrorAbsolute"]);
  const g1 = new THREE.BufferGeometry();
  for (const k of Object.keys(g.attributes)) g1.setAttribute(k, g.attributes[k]);
  g1.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const idx = new Uint32Array(out.length + stems.length); idx.set(out); idx.set(stems, out.length);
  g1.setIndex(new THREE.BufferAttribute(idx, 1));
  return g1;
}

function mergeGeos(gs) {
  const keys = ["position", "normal", "uv", "uv1", "uv2", "uv3", "slot"];
  let nv = 0, ni = 0;
  for (const g of gs) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  for (const k of keys) {
    const size = k === "position" || k === "normal" ? 3 : k === "slot" ? 1 : 2;
    const arr = new Float32Array(nv * size);
    let o = 0;
    for (const g of gs) {
      const a = g.attributes[k];
      if (a) for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) arr[(o + i) * size + c] = a.getComponent(i, c);
      else if (k === "uv1") for (let i = 0; i < g.attributes.position.count; i++) { arr[(o + i) * 2] = 1; }
      o += g.attributes.position.count;
    }
    out.setAttribute(k, new THREE.BufferAttribute(arr, size));
  }
  const idx = new Uint32Array(ni);
  let o = 0, base = 0;
  for (const g of gs) {
    const n = g.attributes.position.count;
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[o++] = g.index.array[i] + base;
    else for (let i = 0; i < n; i++) idx[o++] = i + base;
    base += n;
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// screen-space interleaved gradient noise (Jimenez): the hand-over dither
const ign = () => fract(float(52.9829189).mul(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715)))));

/** One plant type's field: instances [{ x, y, z, yaw, scale, rnd }] -> 3 indirect LOD meshes. */
class PlantField {
  constructor(name, model, list) {
    this.name = name; this.n = list.length;
    const T = TYPES[name];
    const inst = instancedArray(this.n, "vec4"), inst2 = instancedArray(this.n, "vec4");
    const a = inst.value.array, b = inst2.value.array;
    list.forEach((p, i) => { a.set([p.x, p.y, p.z, p.yaw], i * 4); b.set([p.scale, p.rnd, 0, 0], i * 4); });
    inst.value.needsUpdate = inst2.value.needsUpdate = true;
    this.u = { cam: uniform(new THREE.Vector3()), vp: uniform(new THREE.Matrix4()) };
    const H = model.height;
    this.meshes = [];
    const lists = [0, 1, 2].map(() => instancedArray(this.n, "vec2"));             // (instance, fade keep)
    const args = model.lods.map((g) => { const d = new Uint32Array(5); d[0] = g.index.count; return new THREE.IndirectStorageBufferAttribute(d, 5); });
    const counters = args.map((a) => storage(a, "uint", 5).toAtomic());
    this.args = args;
    this.reset = Fn(() => { for (const c of counters) atomicStore(c.element(1), uint(0)); })().compute(1);
    const u = this.u;
    this.update = Fn(() => {
      const i = instanceIndex;
      If(i.lessThan(uint(this.n)), () => {
        const A = inst.element(i), B = inst2.element(i);
        const pos = A.xyz, s = B.x;
        const d = length(pos.sub(u.cam)).div(plantU.lodScale);
        const clip = u.vp.mul(vec4(pos.add(vec3(0, H * 0.5, 0).mul(s)), 1));
        const r = float(H).mul(s).add(0.6);
        const inside = abs(clip.x).lessThan(clip.w.add(r.mul(2))).and(abs(clip.y).lessThan(clip.w.add(r.mul(2)))).and(clip.w.greaterThan(r.negate()));
        If(inside, () => {
          // keep of each LOD: 1 inside its range, ramps across the BAND at both ends (complementary)
          const e0 = float(LOD_D[0]), e1 = float(LOD_D[1]), e2 = plantU.fadeOut;
          const k0 = float(1).sub(smoothstep(e0.sub(BAND), e0, d));
          const k1 = smoothstep(e0.sub(BAND), e0, d).mul(float(1).sub(smoothstep(e1.sub(BAND), e1, d)));
          const k2 = smoothstep(e1.sub(BAND), e1, d).mul(float(1).sub(smoothstep(e2.sub(BAND * 2), e2, d)));
          const ks = [k0, k1, k2];
          for (let l = 0; l < 3; l++) {
            If(ks[l].greaterThan(0.001), () => {
              const slot = atomicAdd(counters[l].element(1), uint(1));
              lists[l].element(slot).assign(vec2(float(i), ks[l]));
            });
          }
        });
      });
    })().compute(this.n, [64]);

    for (let l = 0; l < 3; l++) {
      const g = model.lods[l].clone();
      g.setIndirect(args[l]);
      const mat = this.material(T, lists[l], inst, inst2, H, l);
      const m = new THREE.Mesh(g, mat);
      m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; m.name = `plant_${name}_lod${l}`;
      this.meshes.push(m);
    }
  }

  material(T, list, inst, inst2, H, lod) {
    const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.7, metalness: 0 });
    const e = list.element(instanceIndex);
    const id = uint(e.x), keep = e.y;
    const A = inst.element(id), B = inst2.element(id);
    const root = A.xyz, yaw = A.w, sc = B.x, rnd = B.y;
    const p0 = attribute("position", "vec3"), slot = attribute("slot", "float");
    const uv1 = attribute("uv1", "vec2"), uv2 = attribute("uv2", "vec2"), uv3 = attribute("uv3", "vec2");
    const ao = uv1.x, prnd = uv1.y, kind = uv3.y;
    const base = vec3(uv2.x, uv2.y, uv3.x);
    const S = season.u;
    // seasonal shrink of a part toward its own base
    let partK = float(1);
    const isLeaf = step(0.5, kind).mul(step(kind, 1.5)), isFlower = step(1.5, kind).mul(step(kind, 2.5));
    if (!T.evergreen) partK = mix(partK, smoothstep(prnd.sub(0.15), prnd.add(0.05), S.leaf), isLeaf);
    if (T.bloom) {
      const bl = S[T.bloom];
      // brown heads stay on hydrangeas in winter
      const stay = T.brown ? S[T.brown] : float(0);
      partK = mix(partK, max(smoothstep(prnd.mul(0.7), prnd.mul(0.7).add(0.3), bl), stay), isFlower);
    }
    if (T.whole) partK = partK.mul(smoothstep(0.05, 0.35, S.bulbs.add(S.leaf.mul(0.0))));
    const local = mix(base, p0, partK);
    // wind: the whole plant leans from its foot (height²), leaves flutter about their base
    const w = windAt(root.xz);
    const hN = clamp(p0.y.div(H), 0, 1.2);
    const flutter = sin(wind.uTime.mul(7.0).add(prnd.mul(40))).mul(w.z.mul(0.25).add(0.08)).mul(wind.uStrength);
    const leafOff = p0.sub(base).mul(flutter.mul(0.25)).mul(isLeaf.add(isFlower));
    const c = cos(yaw), s = sin(yaw);
    const lp = local.add(leafOff).mul(sc);
    const rot = vec3(lp.x.mul(c).sub(lp.z.mul(s)), lp.y, lp.x.mul(s).add(lp.z.mul(c)));
    const lean = w.xy.mul(hN.mul(hN)).mul(float(H).mul(sc).mul(0.18));
    mat.positionNode = root.add(rot).add(vec3(lean.x, 0, lean.y));
    // the normal rotates with the plant
    const n0 = attribute("normal", "vec3");
    const nF = vec3(n0.x.mul(c).sub(n0.z.mul(s)), n0.y, n0.x.mul(s).add(n0.z.mul(c)));
    // CROWN NORMALS: leaves lit partly as the crown's ellipsoid (the foliage artists' trick), more so with distance:
    // flat-shaded leaves a few pixels wide otherwise flip light / dark as the camera moves (the sparkle at ~12 m)
    const pW = root.add(rot);
    const crownN = normalize(pW.sub(root.add(vec3(0, float(H).mul(sc).mul(0.45), 0))).mul(vec3(1, 1.4, 1)).add(vec3(0, 0.25, 0)));
    const dCam = length(cameraPosition.sub(root));
    const kCrown = mix(float(0.35), float(0.9), smoothstep(3, 12, dCam)).mul(isLeaf.add(isFlower).add(step(2.5, kind)).min(1));
    const nW = normalize(mix(nF.mul(sign(dot(nF, crownN)).add(0.001)), crownN, kCrown));
    mat.normalNode = normalize(cameraViewMatrix.mul(vec4(varying(nW, "v_pN"), 0)).xyz);   // (oriented already: no faceDirection flip)
    // colours per slot
    const leafC = vec3(uniform(new THREE.Color(T.leaf))).toVar();
    const autumnC = vec3(uniform(new THREE.Color("#8a5a1e")));
    let lc = mix(vec3(uniform(new THREE.Color(T.leaf))), autumnC, T.evergreen ? float(0) : S.autumn.mul(0.85));
    lc = lc.mul(prnd.sub(0.5).mul(mix(float(0.3), float(0.08), smoothstep(4, 14, length(cameraPosition.sub(root))))).add(1)).mul(noiseAt(root.xz, 1 / 3, true).b.mul(0.3).add(0.85));
    void leafC;
    const pick = (arr) => { let c0 = vec3(uniform(new THREE.Color(arr[arr.length - 1]))); for (let k = arr.length - 2; k >= 0; k--) c0 = select(rnd.lessThan((k + 1) / arr.length), vec3(uniform(new THREE.Color(arr[k]))), c0); return c0; };
    let fa = pick(T.flowers);
    if (T.brown) fa = mix(fa, vec3(0.42, 0.3, 0.2), S[T.brown]);
    if (T.spikeGrey) fa = mix(vec3(0.42, 0.45, 0.38), fa, smoothstep(0.1, 0.6, S.lavender));
    const fb = T.flowersB ? pick(T.flowersB) : fa;
    const stemC = vec3(0.16, 0.2, 0.06);
    const massC = lc.mul(noiseAt(p0.xz.add(p0.y).add(rnd.mul(17)), 1 / 0.3, true).a.mul(0.5).add(0.7));
    const centreC = vec3(0.95, 0.6, 0.05);
    const sl = slot;
    const col = select(sl.lessThan(0.5), lc, select(sl.lessThan(1.5), massC, select(sl.lessThan(2.5), stemC, select(sl.lessThan(3.5), fa, select(sl.lessThan(4.5), fb, centreC)))));
    const snow = season.uSnow.mul(step(0.5, attribute("normal", "vec3").y.add(0.3)));
    const fin = mix(col.mul(ao), vec3(0.88, 0.9, 0.94), snow.mul(0.8));
    const dbg = plantU.dbg;
    mat.colorNode = varying(select(dbg.lessThan(0.5), fin, select(dbg.lessThan(1.5), lc, select(dbg.lessThan(2.5), vec3(ao), select(dbg.lessThan(3.5), col, vec3(sl.div(5)))))), "v_pC");
    mat.roughnessNode = select(sl.lessThan(0.5), float(0.55), float(0.75));
    // hand-over dither (screen IGN), discard only inside the bands
    const kv = varying(keep, "v_pK");
    mat.maskNode = kv.greaterThan(ign().mul(0.999));
    void lod; void Discard; void fract; void normalize; void min; void int; void hash; void vec2; void PI2;
    return mat;
  }

  frame(renderer, camera) {
    this.u.cam.value.copy(camera.position);
    this.u.vp.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    return [this.reset, this.update];
  }
}

/** Every plant of a placement list [{ x, z, type, yaw, scale }] -> { group, fields, stats, frame(renderer, camera) } */
export async function buildPlants(list, groundAt) {
  const lib = await loadPlants();
  const group = new THREE.Group(); group.name = "plants";
  const fields = [];
  const stats = { plants: list.length, byType: {}, draws: 0 };
  for (const t of PLANT_TYPES) {
    const mine = list.filter((p) => p.type === t);
    if (!mine.length || !lib.types[t]) continue;
    const inst = mine.map((p) => ({ x: p.x, y: groundAt(p.x, p.z) - 0.02, z: p.z, yaw: p.yaw, scale: p.scale, rnd: frac(Math.sin(p.x * 12.9898 + p.z * 78.233) * 43758.5453) }));
    const f = new PlantField(t, lib.types[t], inst);
    fields.push(f);
    for (const m of f.meshes) group.add(m);
    stats.byType[t] = { n: mine.length, tris: lib.types[t].tris.map(Math.round) };
    stats.draws += 3;
  }
  return {
    group, fields, stats, lib,
    /** the dispatches of every type (the caller runs them in one compute pass with the grass's) */
    frame(renderer, camera) { return fields.flatMap((f) => f.frame(renderer, camera)); },
  };
}
const frac = (x) => x - Math.floor(x);
