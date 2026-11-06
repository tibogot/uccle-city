// THE SNCB AM08 "DESIRO ML" (tools/blender/am08.py -> models/rail/am08.glb + am08.json), shared by the Train Lab and the
// city (?trains=1). Loaded once:
//   - pieces in their own frames (origin on the track at rail-top height, +x forward): EndCar (the rear one is the same
//     mesh turned 180 deg), MidCar, Bogie (x6), Gangway (x2), Panto (raised, on the mid car);
//   - LODs: LOD0 = the Blender model (window recesses, door glass, the saloon behind it); LOD1 = the script's "_far"
//     bodies (flat-painted openings, no saloon) + the simple bogie; LOD2 = "_far" trimmed by meshoptimizer, no bogies;
//   - ONE node material for every piece: the GLB's NAMED slots (paint_body, paint_cab, paint_door, paint_skirt, ...) become
//     a per-vertex slot index; the colours are a palette of uniforms, so a livery is a palette (trainLook.setLivery),
//     never baked; COLOR_0 = the Cycles-baked ambient occlusion (light only);
//   - glass drawn see-through with alpha-to-coverage in the same opaque draw (the saloon shows; as the car fleet).
// trainPose() puts the pieces of one unit on a track given as at(s) -> [x, y, z, heading] (s = distance along it, the
// nose at s = d): each car is carried by its two bogies (position AND pitch from the two bogie points: no car floats on
// a grade change), bogies tangent to the track, gangways on the bisector. createTrainFleet() draws any number of units
// with InstancedMeshes per piece and LOD, dithered LOD cross-fades and a far fade-out (per-instance, aInst.w).
import * as THREE from "three/webgpu";
import { attribute, float, vec3, vec4, mix, smoothstep, clamp, step, uniform, uniformArray, color, positionLocal, mrt, positionView } from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { env } from "../lighting.js";
import { SMOOTH, ditherNoise } from "../lodFade.js";

export const TRAIN_LODS = [
  { until: 90 },
  { until: 450, src: "_far" },
  { until: 2400, src: "_far", ratio: 0.35 },
];
const LOD_BANDS = [0.12, 0.1], FADE_END = 250;
export const PIECES = ["EndCar", "MidCar", "Bogie", "Gangway", "Panto"];
const PER_UNIT = { EndCar: 2, MidCar: 1, Bogie: 6, Gangway: 2, Panto: 1 };

/** SNCB current livery (sRGB): white body, yellow cab, red doors, navy skirt band (photos 2019-2025) */
export const LIVERIES = {
  sncb: { paint_body: "#e8eae7", paint_cab: "#ecd20f", paint_door: "#d0202a", paint_skirt: "#1b2a5c", paint_grey: "#aeb3b6",
    paint_roof: "#b9bdbf", rubber: "#141516", glass: "#0d1114", metal_dark: "#26272a", lamp_white: "#d8d8d2", lamp_red: "#6b0d0d",
    display: "#050505", interior: "#2b3a5a" },
  // the pre-2010s grey-blue / the red local livery are other palettes over the same slots (an example of swapping)
  grey: { paint_body: "#d7d9d6", paint_cab: "#d7d9d6", paint_door: "#3a5ea8", paint_skirt: "#3a5ea8", paint_grey: "#7a7f84",
    paint_roof: "#b0b4b6", rubber: "#141516", glass: "#0d1114", metal_dark: "#26272a", lamp_white: "#d8d8d2", lamp_red: "#6b0d0d",
    display: "#050505", interior: "#2b3a5a" },
};

let SLOTS = null;
const palette = uniformArray(new Array(16).fill(0).map(() => new THREE.Color(1, 1, 1)), "color");
/** Live look controls (uniforms, no recompile). */
export const trainLook = {
  interior: uniform(1.0), headlights: uniform(1.0), dirt: uniform(1.0), seeThrough: uniform(0.55),
  setLivery(name) {
    const L = LIVERIES[name] || name;
    SLOTS.forEach((s, i) => { palette.array[i].set(L[s] ?? "#ff00ff").convertSRGBToLinear(); });
  },
};

let promise = null;
export function loadTrainModel() {
  return (promise ??= (async () => {
    const base = new URL("../../models/rail/", import.meta.url).href;
    const [gltf, layout] = await Promise.all([new GLTFLoader().loadAsync(base + "am08.glb"), fetch(base + "am08.json").then((r) => r.json())]);
    SLOTS = layout.slots;
    trainLook.setLivery("sncb");
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    const objects = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let node = o; while (node && !/^(EndCar|MidCar|Bogie|Gangway|Panto)(_far)?$/.test(node.name)) node = node.parent;
      if (!node) return;
      (objects[node.name] ??= []).push({ g: o.geometry, slot: Math.max(0, SLOTS.indexOf(o.material.name)) });
    });
    const lods = TRAIN_LODS.map((L, k) => {
      const out = {};
      for (const p of PIECES) {
        if (k === 2 && (p === "Bogie" || p === "Gangway")) { out[p] = null; continue; }
        const src = objects[p + (L.src || "")] || objects[p];
        out[p] = merge(src, L.ratio || 1, !!L.src && !!objects[p + L.src]);
      }
      out.tris = PIECES.reduce((s, p) => s + (out[p] ? out[p].index.count / 3 * PER_UNIT[p] : 0), 0);
      return out;
    });
    return { layout, lods, material: makeMaterial() };
  })());
}

function merge(prims, ratio, far = false) {
  const total = prims.reduce((s, q) => s + q.g.index.count / 3, 0);
  const nV = prims.reduce((s, q) => s + q.g.attributes.position.count, 0);
  const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), ao = new Float32Array(nV), slot = new Float32Array(nV);
  const idx = [];
  let v0 = 0;
  for (const { g, slot: s } of prims) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, v0 * 3); nrm.set(g.attributes.normal.array, v0 * 3);
    const c = g.attributes.color;
    for (let i = 0; i < n; i++) { ao[v0 + i] = c ? c.getX(i) : 1; slot[v0 + i] = s; }
    let I = g.index.array;
    if (ratio < 1) {
      const want = Math.min(I.length, Math.max(6, Math.floor(I.length / 3 * ratio)) * 3);
      if (want < I.length) I = MeshoptSimplifier.simplify(new Uint32Array(I), new Float32Array(g.attributes.position.array), 3, want, 0.05, ["LockBorder"])[0];
    }
    for (let i = 0; i < I.length; i++) idx.push(I[i] + v0);
    v0 += n;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute("aAO", new THREE.BufferAttribute(ao, 1));
  geo.setAttribute("aSlot", new THREE.BufferAttribute(slot, 1));
  geo.setAttribute("aFar", new THREE.BufferAttribute(new Float32Array(nV).fill(far ? 1 : 0), 1));   // far bodies: glass painted on the hull, opaque
  geo.setIndex(new THREE.Uint32BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  geo.userData.shared = true; geo.userData.tris = idx.length / 3; geo.userData.srcTris = total;
  return geo;
}

function makeMaterial() {
  const m = new THREE.MeshStandardNodeMaterial();
  const slot = attribute("aSlot", "float"), ao = attribute("aAO", "float"), inst = attribute("aInst", "vec4");
  const si = slot.add(0.5).toInt();
  const is = (k) => step(k - 0.5, slot).sub(step(k + 0.5, slot));
  const S = (n) => SLOTS.indexOf(n);
  const base = palette.element(si);
  const paint = is(S("paint_body")).add(is(S("paint_cab"))).add(is(S("paint_door"))).add(is(S("paint_skirt")));
  const glass = is(S("glass")), lampW = is(S("lamp_white")), lampR = is(S("lamp_red")), disp = is(S("display"));
  // grime: a little darker low on the body (the photos' skirts and bogies are dull)
  const y = positionLocal.y;
  const grime = mix(float(0.8), float(1.0), smoothstep(0.5, 1.6, y)).mul(trainLook.dirt).add(float(1).sub(trainLook.dirt));
  m.colorNode = base.mul(grime);
  m.aoNode = mix(float(1), ao, mix(float(0.55), float(0.85), is(S("metal_dark")).add(is(S("interior")))));
  const rough = mix(mix(float(0.62), float(0.32), paint), float(0.04), glass);
  const metal = mix(float(0.05), float(0.15), paint).add(is(S("metal_dark")).mul(0.4));
  m.roughnessNode = rough; m.metalnessNode = metal;
  // lights: the leading cab (aInst.x = 1) shows white headlights, the trailing one red tails; saloon light at night
  const lead = inst.x, night = env.uNight;
  const head = lampW.mul(lead).mul(mix(float(2.0), float(12.0), night));
  const tail = lampR.mul(float(1).sub(lead)).mul(mix(float(1.5), float(6.0), night));
  const saloon = glass.mul(night).mul(trainLook.interior).mul(0.2).mul(smoothstep(1.4, 2.9, y));   // ceiling LEDs: brighter toward the top of the glass
  const led = disp.mul(lead).mul(mix(float(0.6), float(1.4), night));
  m.emissiveNode = vec3(head.mul(trainLook.headlights)).mul(color(1.0, 0.96, 0.88))
    .add(color(1.0, 0.05, 0.03).mul(tail.mul(trainLook.headlights)))
    .add(color(1.0, 0.85, 0.65).mul(saloon))
    .add(color(1.0, 0.45, 0.05).mul(led));
  // see-through glass (alpha-to-coverage, the same opaque draw), the saloon behind it
  m.opacityNode = mix(float(1), float(1).sub(trainLook.seeThrough), glass.mul(float(1).sub(attribute("aFar", "float"))));
  m.alphaToCoverage = true;
  const ssrFade = smoothstep(360.0, 180.0, positionView.z.negate());
  m.mrtNode = mrt({ metalRough: vec3(rough.lessThan(0.75).select(metal.mul(ssrFade), float(0)), rough, float(1).sub(glass)) });
  if (SMOOTH) {
    const w = inst.w, n = ditherNoise();
    m.maskNode = w.lessThan(0.001).or(w.lessThan(1.5).and(n.lessThan(w))).or(w.greaterThan(1.5).and(n.greaterThanEqual(w.sub(2))));
  }
  m.userData.shared = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ placement
const tmpA = new THREE.Vector3(), tmpM = new THREE.Matrix4();
/** Every piece of one unit whose nose is at distance d along at(s) (at -> [x, y, z, heading]), driving toward +s.
 *  reversed: the unit is coupled the other way round (its nose at d - length, facing back: the rear unit of a pair).
 *  out = [{ piece, m: Matrix4, lead }] */
export function trainPose(layout, at, d, out = [], { reversed = false, leadFront = true, pool = [] } = {}) {
  out.length = 0;
  const L = layout.length;
  const S = (a) => reversed ? d - (L - a) : d - a;              // distance along the track of a point `a` m behind the unit's nose
  let k = 0;
  const mat = () => (pool[k] ??= new THREE.Matrix4(), pool[k++]);
  const q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, "YXZ"), one = new THREE.Vector3(1, 1, 1);
  const place = (x, y, z, heading, pitch, flip) => {
    e.set(0, heading + (flip ? Math.PI : 0), flip ? -pitch : pitch);
    q.setFromEuler(e);
    return mat().compose(tmpA.set(x, y, z), q, one);
  };
  layout.cars.forEach((car, ci) => {
    const [ba, bb] = car.bogies;                              // from the unit's nose
    const A = at(S(ba)), B = at(S(bb));
    // the car: on the line through its bogie centres (height and pitch from them), centred on its own centre
    const dx = A[0] - B[0], dy = A[1] - B[1], dz = A[2] - B[2], Lh = Math.hypot(dx, dz) || 1;
    const heading = Math.atan2(-dz, dx), pitch = Math.atan2(dy, Lh);
    const centre = car.front + car.length / 2, mid = (ba + bb) / 2, off = mid - centre;  // >0: the centre is ahead of the bogies' midpoint
    const sgn = reversed ? -1 : 1;
    const ux = dx / Lh, uz = dz / Lh;
    const mx = (A[0] + B[0]) / 2 + ux * off * sgn * Math.cos(pitch), mz = (A[2] + B[2]) / 2 + uz * off * sgn * Math.cos(pitch), my = (A[1] + B[1]) / 2 + Math.sin(pitch) * off * sgn;
    const flip = car.flip !== reversed;
    const lead = car.piece === "EndCar" && ((ci === 0) !== reversed) ? (leadFront ? 1 : 0) : 0;
    const carM = place(mx, my, mz, heading, pitch, flip);
    out.push({ piece: car.piece, m: carM, lead, cx: mx, cy: my, cz: mz });
    for (const P of [A, B]) out.push({ piece: "Bogie", m: place(P[0], P[1], P[2], P[3], 0, false), lead: 0 });
    if (car.panto != null) out.push({ piece: "Panto", m: mat().copy(carM).multiply(tmpM.makeTranslation(car.panto, 0, 0)), lead: 0 });
  });
  for (const g of layout.gangways) {
    const G = at(S(g));
    out.push({ piece: "Gangway", m: place(G[0], G[1], G[2], G[3], 0, false), lead: 0 });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the fleet
/** InstancedMeshes per piece and LOD. Per frame: begin(camera); add(pose) per unit; end(). Counters for pops. */
export function createTrainFleet(model, parent, maxUnits = 24) {
  const meshes = [];
  for (let k = 0; k < model.lods.length; k++) {
    const row = {};
    for (const p of PIECES) {
      const geo0 = model.lods[k][p];
      if (!geo0) continue;
      const cap = Math.max(1025, maxUnits * PER_UNIT[p]);
      const geo = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(geo0.attributes)) geo.setAttribute(name, a);
      geo.setIndex(geo0.index); geo.boundingSphere = geo0.boundingSphere;
      const inst = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      geo.setAttribute("aInst", inst);
      const mesh = new THREE.InstancedMesh(geo, model.material, cap);
      mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.name = `train-${p}-lod${k}`;
      parent.add(mesh);
      row[p] = { mesh, inst, n: 0 };
    }
    meshes.push(row);
  }
  const frustum = new THREE.Frustum(), sphere = new THREE.Sphere(), pm = new THREE.Matrix4();
  let cam = null, eye = null, forced = -1, lodScale = 1;
  const stats = { units: 0, perLod: [0, 0, 0], culled: 0, cars: 0 };
  return {
    meshes, stats,
    set forceLod(k) { forced = k; }, set lodScale(s) { lodScale = s; },
    begin(camera, camPos = null) {
      cam = camera; eye = camera ? camera.position : camPos;
      if (cam) { pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); }
      for (const row of meshes) for (const r of Object.values(row)) r.n = 0;
      stats.units = 0; stats.perLod = [0, 0, 0]; stats.culled = 0; stats.cars = 0;
    },
    /** pose from trainPose(); LOD + fade per CAR (an 80 m unit spans LOD bands) - its bogies / panto / gangways follow
     *  the nearest car's choice */
    add(pose) {
      let carLod = null, carFade = null, any = false;
      // per car: LOD by distance from the eye to the car centre
      const decide = (x, y, z) => {
        sphere.center.set(x, y + 2, z); sphere.radius = 15;
        if (cam && !frustum.intersectsSphere(sphere)) return null;
        let k = forced, fadeA = 0, kB = -1, fadeB = 0;
        if (k < 0 && eye) {
          const dist = eye.distanceTo(sphere.center) / lodScale;
          k = TRAIN_LODS.findIndex((l) => dist < l.until);
          if (k < 0) return null;
          if (SMOOTH) {
            const last = TRAIN_LODS.length - 1, end = TRAIN_LODS[last].until;
            for (let j = 0; j < last; j++) {
              const s = TRAIN_LODS[j].until, w = s * LOD_BANDS[j];
              if (dist > s - w && dist < s + w) { const t = THREE.MathUtils.smoothstep(dist, s - w, s + w); k = j; fadeA = 2 + t; kB = j + 1; fadeB = t; }
            }
            if (k === last && dist > end - FADE_END) fadeA = 2 + THREE.MathUtils.smoothstep(dist, end - FADE_END, end);
          }
        }
        return [k < 0 ? 0 : k, fadeA, kB, fadeB];
      };
      const put = (p, k, fade) => {
        const r = meshes[k][p.piece];
        if (!r || r.n >= r.mesh.instanceMatrix.count) return;
        r.mesh.setMatrixAt(r.n, p.m);
        r.inst.array.set([p.lead || 0, 0, 0, fade], r.n * 4);
        r.n++;
      };
      for (const p of pose) {
        if (p.piece === "EndCar" || p.piece === "MidCar") {
          stats.cars++;
          const dcs = decide(p.cx, p.cy, p.cz);
          carLod = dcs;
          if (!dcs) { stats.culled++; continue; }
          any = true;
          stats.perLod[dcs[0]]++;
        }
        if (!carLod) continue;               // a culled car's bogies / panto go with it
        put(p, carLod[0], carLod[1]);
        if (carLod[2] >= 0) put(p, carLod[2], carLod[3]);
      }
      if (any) stats.units++;
    },
    end() {
      for (const row of meshes) for (const r of Object.values(row)) {
        r.mesh.count = r.n;
        if (r.n) { r.mesh.instanceMatrix.clearUpdateRanges(); r.mesh.instanceMatrix.addUpdateRange(0, r.n * 16); r.mesh.instanceMatrix.needsUpdate = true;
          r.inst.clearUpdateRanges(); r.inst.addUpdateRange(0, r.n * 4); r.inst.needsUpdate = true; }
      }
    },
    dispose() { for (const row of meshes) for (const r of Object.values(row)) { r.mesh.removeFromParent(); r.mesh.dispose(); } },
  };
}
