// THE TRAFFIC LIGHTS KIT (tools/blender/trafficLights.py -> models/tlights/tlights.glb + tlights_picto.png;
// docs/TLIGHTS.md), drawn by viewer/tlights/cityTLights.js. Built like the furniture kit 2 (viewer/furniture2/furnitureKit.js):
//   pieces   tl_post (pole, main head with its backplate, repeater, pedestrian head, push button), tl_post_bike (+ the
//            bike head); local frame: y up, the pole on the origin, the vehicle heads look along -z (toward the coming
//            cars), the pedestrian head along +x (across the road), foot 0.30 m under the origin (JOINS rule)
//   LODs     authored in Blender (LOD0 bevels / bezels / visors, LOD1 fewer segments, LOD2 boxes + flat lens discs):
//            no meshopt here (a simplifier eats the visors and lens discs the far LODs need)
//   draws    per piece and LOD ONE draw: every slot in one material (a per-vertex slot index into a palette, the baked
//            AO in its fraction); THREE shared materials (one per LOD) for both pieces
//   lenses   own slots (lens_red / lens_amber / lens_green, ped_red / ped_green); the lit aspect EMITS (no light is
//            added: the light count is fixed), its shape from the pictogram atlas (uv: plain disc, standing / walking
//            man, bicycle). The state: viewer/furniture.js SIGNAL_STATE (cars, A / B) and WALK_STATE (pedestrians), the
//            same uniforms the moving traffic stops on; per instance its phase (iVar.x)
//   LOD hand-over: per instance band (iBand: switch 0-1, switch 1-2, end, the tile's fade slot) and the per-pixel
//            dither of viewer/lodFade.js (same noise in the shadow pass: no pop, no shadow snap)
import * as THREE from "three/webgpu";
import { attribute, uniformArray, texture, uv, vec3, float, mix, smoothstep, length, positionWorld, select, fract } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { FadeSlots, StreamPool, sourceFromYaw, MARGIN } from "../instanceStream.js";
import { wxMat } from "../weather/cityWeatherize.js";
import { env } from "../lighting.js";
import { SIGNAL_STATE, WALK_STATE } from "../furniture.js";
import { TL_PIECES, TL_STRIDE } from "./tlightPlace.js";
export { TRI_BUDGET } from "./tlightPlace.js";

export const tlightFades = new FadeSlots(128);

/** slot palette by NAME (the Blender slots): [name, rgb (linear), roughness, metalness]; the lenses LAST (index >= LENS0) */
export const SLOTS = [
  ["tl_pole", [0.042, 0.048, 0.046], 0.5, 0.35],          // anthracite with a green cast (Brussels signal poles)
  ["tl_housing", [0.014, 0.014, 0.016], 0.45, 0.0],       // black polycarbonate heads, visors, bezels
  ["tl_backplate", [0.008, 0.008, 0.008], 0.78, 0.0],
  ["tl_border", [0.70, 0.70, 0.68], 0.35, 0.0],           // white retro-reflective edge
  ["tl_bracket", [0.40, 0.41, 0.41], 0.45, 0.85],         // galvanised
  ["tl_buttonbox", [0.05, 0.052, 0.056], 0.5, 0.1],
  ["tl_buttonplate", [0.66, 0.66, 0.64], 0.4, 0.0],
  ["tl_button", [0.018, 0.018, 0.018], 0.35, 0.0],
  ["lens_red", [0.085, 0.010, 0.008], 0.08, 0.0],         // off: dark tinted glass over the reflector
  ["lens_amber", [0.095, 0.042, 0.004], 0.08, 0.0],
  ["lens_green", [0.004, 0.05, 0.038], 0.08, 0.0],
  ["ped_red", [0.085, 0.010, 0.008], 0.08, 0.0],
  ["ped_green", [0.004, 0.05, 0.038], 0.08, 0.0],
];
const SLOT = Object.fromEntries(SLOTS.map((s, i) => [s[0], i]));
const LENS0 = SLOT.lens_red;
/** LOD bands (m): [switch 0 -> 1, switch 1 -> 2, end] (a lit aspect reads far: the posts stay to 450 m) */
export const BANDS = { tl_post: { lod: [25, 80, 450], shadow2: true }, tl_post_bike: { lod: [25, 80, 450], shadow2: true } };

let promise = null;
/** { pieces: { <name>: { lods: [geo x3], standin, tris, band } }, mats, picto, loadMs } */
export function loadTLightKit(base = new URL("../../", import.meta.url)) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    const [gltf, picto] = await Promise.all([
      new GLTFLoader().loadAsync(new URL("models/tlights/tlights.glb", base).href),
      new THREE.TextureLoader().loadAsync(new URL("models/tlights/tlights_picto.png", base).href),
    ]);
    Object.assign(picto, { flipY: false, colorSpace: THREE.NoColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, anisotropy: 8 });
    picto.needsUpdate = true;
    gltf.scene.updateMatrixWorld(true);
    const raw = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let key = null;
      for (let q = o; q && !key; q = q.parent) { const m = /^(tl_post(?:_bike)?)_LOD(\d)$/.exec(q.name || ""); if (m) key = m; }
      if (!key) return;
      ((raw[key[1]] ??= [[], [], []])[+key[2]]).push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), slot: o.material.name });
    });
    const pieces = {};
    for (const p of TL_PIECES) {
      if (!raw[p] || raw[p].some((l) => !l.length)) throw new Error(`traffic lights kit: piece ${p} incomplete`);
      const lods = raw[p].map(mainGeometry);
      for (const g of lods) { g.computeBoundingSphere(); g.computeBoundingBox(); g.userData.shared = true; }
      pieces[p] = { name: p, lods, standin: standin(lods[2]), tris: lods.map((g) => g.index.count / 3), band: BANDS[p] };
    }
    return { pieces, mats: materials(picto), picto, loadMs: performance.now() - t0 };
  })());
}

/** one LOD's primitives merged: position, normal, uv (the pictogram atlas on the lenses), slot (+ 0.99 x AO in its fraction) */
function mainGeometry(prims) {
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.geo.attributes.position.count; ni += p.geo.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), S = new Float32Array(nv), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of prims) {
    const g = p.geo, n = g.attributes.position.count, s = SLOT[p.slot];
    if (s === undefined) throw new Error(`traffic lights kit: unknown slot ${p.slot}`);
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
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

/** what the collision side reads: LOD2's triangles above the ground (the car: a "pole" by its instance position) */
function standin(lod2) {
  const A = lod2.attributes.position.array, I = lod2.index.array, P = new Float32Array(I.length * 3);
  for (let k = 0; k < I.length; k++) { P[3 * k] = A[3 * I[k]]; P[3 * k + 1] = Math.max(-0.02, A[3 * I[k] + 1]); P[3 * k + 2] = A[3 * I[k] + 2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.shared = true;
  return g;
}

// ------------------------------------------------------------------------------------------------ materials
const slotC = uniformArray(SLOTS.map((s) => new THREE.Vector4(...s[1], s[2])), "vec4");
const slotM = uniformArray(SLOTS.map((s) => s[3]), "float");

function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.85), band.z, d);
  const f = tlightFades.fade(band.w);
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}

function materials(picto) {
  const opaque = [0, 1, 2].map((lod) => {
    const m = new THREE.MeshStandardNodeMaterial();
    const sl = attribute("slot", "float"), si = sl.add(0.0005).floor(), idx = si.toInt();
    const C = slotC.element(idx);
    const ao = fract(sl.add(0.0005)).div(0.99).min(1);
    // the signal: phase A / B per instance; cars GREEN 0 / AMBER 1 / RED 2, pedestrians walk 1 / wait 0
    const ph = attribute("iVar", "vec4").x;
    const st = select(ph.greaterThan(0.5), SIGNAL_STATE.B, SIGNAL_STATE.A), walk = select(ph.greaterThan(0.5), WALK_STATE.B, WALK_STATE.A);
    const is = (name) => si.equal(float(SLOT[name]));
    const on = is("lens_red").and(st.equal(2)).or(is("lens_amber").and(st.equal(1))).or(is("lens_green").and(st.equal(0)))
      .or(is("ped_red").and(walk.lessThan(0.5))).or(is("ped_green").and(walk.greaterThan(0.5)));
    const lit = select(is("lens_red").or(is("ped_red")), vec3(1, 0.06, 0.02), select(is("lens_amber"), vec3(1, 0.48, 0.04), vec3(0.08, 1, 0.42)));
    const mask = select(si.greaterThanEqual(float(LENS0)), texture(picto, uv()).r, float(0));
    const base = C.xyz.mul(mix(float(1), ao, 0.85));
    m.colorNode = select(on, mix(base, lit.mul(0.55), mask), base);
    m.emissiveNode = select(on, lit.mul(mask).mul(mix(float(2.2), float(6.0), env.uNight)), vec3(0));
    m.aoNode = ao;
    m.roughnessNode = C.w;
    m.metalnessNode = slotM.element(idx);
    m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
    m.maskShadowNode = m.maskNode;
    m.name = `tlights-lod${lod}`;
    wxMat(m, { porosity: 0.05, beads: true, frost: true });   // the weather (wet, beads, frost; ~0 in clear weather)
    m.userData.shared = true; m.userData.noFade = true;        // (the tile fade: its slot rides in iBand.w)
    return m;
  });
  const standinMat = new THREE.MeshStandardNodeMaterial({ color: 0x555555 });
  standinMat.name = "tlights-collision-standin";
  standinMat.userData.shared = true; standinMat.userData.noFade = true;
  return { opaque, standin: standinMat };
}

// ------------------------------------------------------------------------------------------------ the pools
/** a tile's instance array of one piece (x y z yaw phase 0 0 0) as a streaming source (viewer/instanceStream.js) */
export function tlightSource(piece, a, slot) {
  const [s1, s2, end] = piece.band.lod;
  return sourceFromYaw(a, TL_STRIDE, piece.lods[0].boundingSphere.radius + piece.lods[0].boundingSphere.center.length(), {
    iBand: (o, v) => { v[0] = s1; v[1] = s2; v[2] = end; v[3] = slot; },
    iVar: (o, v) => { v[0] = a[o + 4]; },
  });
}

/** ONE pool per piece for the whole city: LOD0..2 instanced meshes streamed near the camera (static buffers, update
 *  ranges over the live count, never DynamicDrawUsage; a mesh with nothing to draw is not visible) */
export class TLightPool {
  constructor(piece, mats, group, margin = MARGIN) {
    this.piece = piece; this.meshes = [];
    const b = piece.band, [s1, s2, end] = b.lod;
    const live = [[0, s1 * 1.1], [s1 * 0.9, s2 * 1.1], [s2 * 0.9, end]];
    const spec = piece.lods.map((geo, k) => {
      const g = new THREE.BufferGeometry();
      for (const a of Object.keys(geo.attributes)) g.setAttribute(a, geo.attributes[a]);
      g.setIndex(geo.index);
      const m = new THREE.InstancedMesh(g, mats.opaque[k], 1);
      m.castShadow = k < 2 || b.shadow2; m.receiveShadow = true; m.frustumCulled = true;
      m.boundingSphere = new THREE.Sphere(); m.name = `tlights-${piece.name}-lod${k}`;
      group.add(m); this.meshes.push(m);
      return { mesh: m, l0: live[k][0], l1: live[k][1], attrs: [["instanceMatrix", "instanceMatrix", 16], ["iBand", "iBand", 4], ["iVar", "iVar", 4]] };
    });
    this.stream = new StreamPool(piece.name, spec, piece.lods[0].boundingSphere.radius + piece.lods[0].boundingSphere.center.length(), margin);
  }
  get drawn() { return this.meshes.filter((m) => m.visible).length; }
}
