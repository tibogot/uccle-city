// THE ROOF-TOP KIT (docs/assets/ROOFS.md), shared by the city (viewer/roofs/cityRoofs.js) and the labs:
//   pieces   stack (procedural here: a unit brick box, bricks laid in world space by the shader) and the Blender pieces
//            (tools/blender/roofTopKit.py -> models/roofs/roofkit.glb): chimcap, pot, cowl, velux, pv, pvframe, cond, ahu,
//            vent, ventbox, hatch, dome, skylight, dish; THREE scripted LODs each
//   draws    per piece and LOD ONE draw for the whole city (every slot in one material: a per-vertex slot + baked AO);
//            THREE shared materials (one per LOD)
//   per instance  iVar / iAux (viewer/roofs/roofPlace.js): the stack's brick tone, render, its origin and the roof plane
//            under it (the lead flashing where it meets the roof, soot at the top); the roof's colour for the
//            upstands of flat-roof pieces; paint / frame variants
//   LOD      the per-instance band (iBand: switch 0-1, 1-2, end, the tile's fade slot) and the per-pixel dither of
//            viewer/lodFade.js in colour and shadow (no pop, no shadow snap); LOD2 casts no shadow
//   night    nothing glows, no light (fixed light count)
import * as THREE from "three/webgpu";
import {
  attribute, vec2, vec3, float, int, mix, smoothstep, length, positionWorld, positionGeometry, select, fract, floor, abs, dot, sin, max, min, fwidth, uniformArray,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { FadeSlots, StreamPool, buildSource, MARGIN } from "../instanceStream.js";
import { brickPattern } from "../gardens/gardenKit.js";
import { PIECES, STRIDE } from "./roofPlace.js";
export { PIECES, STRIDE };

export const roofFades = new FadeSlots();
/** LOD bands (m): [switch 0 -> 1, switch 1 -> 2, end]. Chimneys and solar arrays are the roofscape seen from the air:
 *  they go far; the small flat-roof furniture ends sooner */
export const BANDS = {
  stack: [45, 140, 480], chimcap: [45, 140, 480], pot: [30, 90, 260], cowl: [30, 90, 240],
  velux: [35, 110, 320], pv: [40, 140, 450], pvframe: [30, 80, 200],
  cond: [30, 90, 260], ahu: [40, 120, 380], vent: [25, 70, 200], ventbox: [30, 90, 240], hatch: [30, 90, 260],
  dome: [30, 90, 260], skylight: [30, 90, 260], dish: [25, 70, 220],
};
/** the slots (Blender material names) -> index in the palette shader */
export const SLOT = { brick: 0, cap: 1, clay: 2, soot: 3, steel: 4, alu: 5, glass: 6, pv_cell: 7, pv_frame: 8, hvac: 9, grille: 10, upstand: 11, opal: 12, concrete: 13, dish: 14, rubber: 15 };
// brick tones (linear rgb): red-brown, dark klinker, orange-red, yellow; and the render of a rendered stack
const BRICK = [[0.19, 0.068, 0.045, 0.86], [0.085, 0.032, 0.026, 0.82], [0.28, 0.095, 0.05, 0.86], [0.46, 0.33, 0.17, 0.88], [0.6, 0.58, 0.54, 0.9]];
const uBrick = uniformArray(BRICK.map((c) => new THREE.Vector4(...c)), "vec4");

let promise = null;
/** { pieces: { <name>: { name, lods: [geo x 3], tris, band } }, mats, loadMs } */
export function loadRoofKit(base = new URL("../../", import.meta.url)) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const gltf = await new GLTFLoader().loadAsync(new URL("models/roofs/roofkit.glb", base).href);
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let name = null;
      for (let q = o; q && !name; q = q.parent) if (/_lod[012]$/.test(q.name)) name = q.name;
      if (!name) return;
      (raw[name] ??= []).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    const add = (name, lods) => {
      for (const g of lods) { g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.shared = true; }
      pieces[name] = { name, lods, tris: lods.map((g) => (g.index ? g.index.count : g.attributes.position.count) / 3), band: BANDS[name] };
    };
    add("stack", [0, 1, 2].map((l) => stackGeometry(l)));
    for (const p of PIECES) {
      if (p === "stack") continue;
      add(p, [0, 1, 2].map((l) => { const r = raw[`${p}_lod${l}`]; if (!r) throw new Error(`roof kit: ${p}_lod${l} missing`); return mergePrims(r); }));
    }
    return { pieces, mats: materials(), loadMs: performance.now() - t0 };
  })());
}

/** the stack: a unit box (x / z -0.5..0.5, y 0..1), four sides (the top is under the chimcap, the foot in the roof), a
 *  ring at 15 % (the flashing's AO lives on it); slot brick, AO darker toward the foot */
function stackGeometry(lod = 0) {
  const P = [], N = [], S = [], I = [];
  const sides = [[[-0.5, -0.5], [0.5, -0.5], [0, 0, -1]], [[0.5, -0.5], [0.5, 0.5], [1, 0, 0]], [[0.5, 0.5], [-0.5, 0.5], [0, 0, 1]], [[-0.5, 0.5], [-0.5, -0.5], [-1, 0, 0]]];
  const ys = lod < 2 ? [0, 0.15, 1] : [0, 1];
  for (const [a, b, n] of sides) {
    const v0 = P.length / 3;
    for (const y of ys) for (const q of [a, b]) {
      P.push(q[0], y, q[1]); N.push(...n);
      S.push(SLOT.brick + 0.99 * (0.72 + 0.28 * Math.min(1, y / 0.15)) * 0.999);
    }
    for (let k = 0; k < ys.length - 1; k++) {
      const p = v0 + k * 2;
      // wound outward (CCW seen from outside): a(k) b(k) b(k+1), a(k) b(k+1) a(k+1) -- check: (b - a) x up . n > 0
      I.push(p, p + 3, p + 1, p, p + 2, p + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("slot", new THREE.Float32BufferAttribute(S, 1));
  g.setIndex(I);
  // the winding must face the normals (front-side culling): flip if the first triangle faces inward
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
  pa.fromArray(P, I[0] * 3); pb.fromArray(P, I[1] * 3); pc.fromArray(P, I[2] * 3);
  const gn = pb.sub(pa).cross(pc.sub(pa));
  if (gn.dot(new THREE.Vector3(...N.slice(I[0] * 3, I[0] * 3 + 3))) < 0) { for (let k = 0; k < I.length; k += 3) [I[k + 1], I[k + 2]] = [I[k + 2], I[k + 1]]; g.setIndex(I); }
  return g;
}

/** a piece's primitives (one per Blender slot) merged: position, normal, uv (metres), slot (+ 0.99 x the baked AO) */
function mergePrims(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`roof kit: unknown slot ${p.slot}`);
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3);
    if (g.attributes.uv) U.set(g.attributes.uv.array, v * 2);
    const C = g.attributes.color;
    for (let k = 0; k < n; k++) S[v + k] = s + 0.99 * Math.min(1, C ? C.getX(k) : 1) * 0.999;
    const gi = g.index.array; for (let k = 0; k < gi.length; k++) I[i + k] = gi[k] + v;
    v += n; i += gi.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(U, 2)); g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
  g.setIndex(new THREE.BufferAttribute(nv > 65535 ? I : Uint16Array.from(I), 1));
  return g;
}

// ------------------------------------------------------------------------------------------------ materials
function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = roofFades.fade(band.w);                             // the tile fade by its slot (viewer/instanceStream.js)
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}
const hash2 = (a, b) => fract(sin(dot(vec2(a, b), vec2(12.9898, 78.233))).mul(43758.5453));

function materials() {
  const opaque = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial();
    const sl = attribute("slot", "float"), idx = sl.add(0.0005).floor().toInt();
    // (the panes' few corner vertices sit in their frames: their baked AO is ~0; they read by reflection: no AO)
    const ao = select(idx.equal(int(SLOT.glass)).or(idx.equal(int(SLOT.pv_cell))), float(1), fract(sl.add(0.0005)).div(0.99).min(1));
    const V = attribute("iVar", "vec4"), A = attribute("iAux", "vec4");
    const P = positionWorld, G = positionGeometry;
    const is = (k) => idx.equal(int(SLOT[k]));
    const rnd = V.z;                                            // (the stack: x0 / z0 in iVar.z / w; see below)
    // ---- the brick (stack + its corbel courses): the stack's iVar = (tone + 8 x render, rnd, x0, z0), iAux = the roof
    // under it (y0, gx, gz, tent): hr = the height over that roof -> the lead flashing (14 cm), soot at the top
    const tone = V.x.mod(8.0), render = V.x.greaterThan(7.5);
    const B = uBrick.element(select(render, int(4), tone.add(0.5).floor().toInt()));
    let brick = B.xyz;
    if (lod < 2) {
      const bp = brickPattern(select(render, float(4), tone));
      brick = mix(B.xyz.mul(bp.tone), select(render, B.xyz, vec3(0.24, 0.23, 0.21).mul(select(tone.lessThan(1.5).and(tone.greaterThan(0.5)), float(0.62), float(1)))), bp.mortar.mul(0.9));
    }
    const dx = P.x.sub(V.z), dz = P.z.sub(V.w);
    const lin = dx.mul(A.y).add(dz.mul(A.z));
    const roofY = select(A.w.greaterThan(0.5), A.x.sub(abs(lin)), A.x.add(lin));
    const hr = P.y.sub(roofY);
    const aa = fwidth(hr).add(0.002);
    const lead = float(1).sub(smoothstep(float(0.14).sub(aa), float(0.14).add(aa), hr));
    // soot / weathering: the stack's top 40 cm darker, streaks down from the cap
    const isStack = is("brick");
    brick = brick.mul(mix(float(1), float(0.72), smoothstep(0.55, 0.98, G.y).mul(select(isStack, float(1), float(0)))));
    brick = mix(brick, vec3(0.13, 0.135, 0.14), lead.mul(0.95));
    // ---- the others
    const cap = vec3(0.34, 0.33, 0.3).mul(mix(float(0.85), float(1.1), hash2(V.y, 3.1)));
    const clay = select(V.y.greaterThan(0.5), vec3(0.42, 0.3, 0.18), vec3(0.3, 0.1, 0.045)).mul(mix(float(0.85), float(1.12), V.x))
      .mul(mix(float(1), float(0.45), smoothstep(0.42, 0.56, G.y)));            // pots: sooty rim
    const steel = vec3(0.42, 0.43, 0.44).mul(mix(float(0.8), float(1.05), V.x));          // galvanised
    const alu = select(V.w.greaterThan(0.5), vec3(0.075, 0.08, 0.085), vec3(0.4, 0.41, 0.42));       // velux grey / mill finish
    // solar cells: 156 mm cells (6 x 10 on a module), thin bright busbars + the frame gaps, faded under a pixel
    const uv = attribute("uv", "vec2");
    const cu = uv.x.div(0.1566), cv = uv.y.div(0.1566);
    const wu = max(fwidth(cu), 1e-4), wv = max(fwidth(cv), 1e-4);
    const fade = (w) => float(1).sub(smoothstep(0.06, 0.25, w));
    const lineU = smoothstep(float(0.47).sub(wu), float(0.5), abs(fract(cu).sub(0.5))).mul(fade(wu));
    const lineV = smoothstep(float(0.47).sub(wv), float(0.5), abs(fract(cv).sub(0.5))).mul(fade(wv));
    const bus = smoothstep(float(0.485).sub(wu.mul(3.0)), float(0.5), abs(fract(cu.mul(3.0)).sub(0.5))).mul(fade(wu.mul(3.0)));
    const cell = mix(vec3(0.012, 0.016, 0.032), vec3(0.09, 0.1, 0.12), max(lineU, lineV).mul(0.8)).add(vec3(0.05).mul(bus).mul(0.4));
    const pvFrame = select(V.x.greaterThan(0.72), vec3(0.42, 0.43, 0.44), vec3(0.025, 0.025, 0.028));
    const hvac = mix(vec3(0.6, 0.595, 0.57), vec3(0.42, 0.43, 0.44), step01(V.x, 0.55));
    // the upstands of the flat-roof pieces: the roof's own membrane (its orthophoto colour, iAux.rgb) when given
    const up = select(A.x.add(A.y).add(A.z).greaterThan(0.001), A.xyz.mul(0.8), vec3(0.05, 0.05, 0.055));
    const dish = select(V.x.greaterThan(0.7), vec3(0.12, 0.12, 0.13), vec3(0.62, 0.62, 0.6));
    const col = select(is("brick"), brick, select(is("cap"), cap, select(is("clay"), clay, select(is("soot"), vec3(0.015, 0.014, 0.013),
      select(is("steel"), steel, select(is("alu"), alu, select(is("glass"), vec3(0.018, 0.022, 0.028), select(is("pv_cell"), cell,
      select(is("pv_frame"), pvFrame, select(is("hvac"), hvac, select(is("grille"), vec3(0.03, 0.03, 0.033), select(is("upstand"), up,
      select(is("opal"), vec3(0.72, 0.72, 0.69), select(is("concrete"), vec3(0.36, 0.35, 0.32), select(is("dish"), dish, vec3(0.02, 0.02, 0.02))))))))))))))));
    m.colorNode = col.mul(mix(float(1), ao, 0.75));
    m.aoNode = ao;
    const metal = is("steel").or(is("alu").and(V.w.lessThan(0.5))).or(is("pv_frame"));
    m.metalnessNode = select(metal, float(0.35), select(is("alu"), float(0.2), float(0)));
    m.roughnessNode = select(is("glass"), float(0.06), select(is("pv_cell"), float(0.12), select(is("opal"), float(0.3), select(metal, float(0.42),
      select(is("brick"), mix(float(0.86), float(0.5), lead), select(is("hvac").or(is("dish")), float(0.55), float(0.85)))))));
    m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
    m.maskShadowNode = m.maskNode;
    m.name = `roofs-lod${lod}`;
    m.userData.shared = true; m.userData.noFade = true;          // (the tile fade: its slot rides in iBand.w)
    void rnd; void min;
    return m;
  });
  return { opaque };
}
const step01 = (x, e) => smoothstep(e - 0.001, e + 0.001, x);

// ------------------------------------------------------------------------------------------------ the pools
/** a tile's instances (roofPlace.js finish().pieces: stride 24 = matrix 16 + iVar 4 + iAux 4) as streaming sources per
 *  piece (viewer/instanceStream.js), iBand = the piece's bands + the tile's fade slot */
export function roofSources(pieces, slot) {
  const out = {};
  for (const k of PIECES) {
    const a = pieces?.[k]; if (!a || !a.length) continue;
    const n = a.length / STRIDE, [s1, s2, end] = BANDS[k];
    const M = new Float32Array(n * 16), V = new Float32Array(n * 4), X = new Float32Array(n * 4), C = new Float32Array(n * 4), B = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      M.set(a.subarray(o, o + 16), i * 16); V.set(a.subarray(o + 16, o + 20), i * 4); X.set(a.subarray(o + 20, o + 24), i * 4);
      // centre ~ the origin + half the y axis; radius ~ the scaled axes' half lengths
      const r = 0.5 * Math.hypot(Math.hypot(a[o], a[o + 1], a[o + 2]), Math.hypot(a[o + 4], a[o + 5], a[o + 6]), Math.hypot(a[o + 8], a[o + 9], a[o + 10]));
      C[i * 4] = a[o + 12] + a[o + 4] * 0.5; C[i * 4 + 1] = a[o + 13] + a[o + 5] * 0.5; C[i * 4 + 2] = a[o + 14] + a[o + 6] * 0.5; C[i * 4 + 3] = Math.max(r, 0.6);
      B[i * 4] = s1; B[i * 4 + 1] = s2; B[i * 4 + 2] = end; B[i * 4 + 3] = slot;
    }
    out[k] = buildSource(n, { instanceMatrix: [M, 16], iBand: [B, 4], iVar: [V, 4], iAux: [X, 4] }, C);
  }
  return out;
}

/** ONE pool per piece for the whole city: LOD0..2 instanced meshes streamed from the loaded tiles' sources near the
 *  camera (static buffers, update ranges over the live count, never DynamicDrawUsage; a mesh with nothing to draw is
 *  hidden) */
export class RoofPool {
  constructor(piece, mats, group, margin = MARGIN) {
    this.piece = piece; this.meshes = [];
    const [s1, s2, end] = piece.band;
    const live = [[0, s1 * 1.1], [s1 * 0.9, s2 * 1.1], [s2 * 0.9, end]];
    const small = ["pot", "cowl", "vent", "dish", "pvframe"].includes(piece.name);
    const spec = piece.lods.map((geo, k) => {
      const g = new THREE.BufferGeometry();
      for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, mats.opaque[k], 1);
      // shadows: LOD0 + 1 (thin / small pieces LOD0 only); LOD2 never (its shadow dithers out with LOD1)
      m.castShadow = small ? k === 0 : k < 2;
      m.receiveShadow = true; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `roofs-${piece.name}-lod${k}`;
      group.add(m); this.meshes.push(m);
      return { mesh: m, l0: live[k][0], l1: live[k][1], attrs: [["instanceMatrix", "instanceMatrix", 16], ["iBand", "iBand", 4], ["iVar", "iVar", 4], ["iAux", "iAux", 4]] };
    });
    this.stream = new StreamPool(piece.name, spec, Math.max(piece.lods[0].boundingSphere.radius, 1.0), margin);
  }
  /** the labs: a synchronous gather of tiles [{ pieces }] (fade 1: slot 0) round c */
  gather(tiles, c) {
    const srcs = [];
    for (const t of tiles) { t.__src ||= roofSources(t.pieces, 0); if (t.__src[this.piece.name]) srcs.push({ src: t.__src[this.piece.name] }); }
    const it = this.stream.gather(srcs, c, () => false);
    while (!it.next().done);
  }
  get drawn() { return this.meshes.filter((m) => m.visible).length; }
  get instances() { return this.meshes.map((m) => (m.visible ? m.count : 0)); }
}
