// THE STIB T3000 TRAM MODEL (tools/blender/tram.py -> models/tram/t3000.glb + t3000.json), shared by the Tram Lab and
// the city (viewer/tramline.js with ?tram=model). Loaded once:
//   - the pieces in their own frames (origin on the track at rail-top height, +x forward): Cab (sections 1 and 5),
//     Susp (2 and 4), Centre (3), Bellows (x4), Bogie (x3), Panto (on section 2);
//   - three LODs: LOD0 = the Blender model, LOD1 / LOD2 = the script's "_mid" / "_far" variants trimmed by meshoptimizer
//     to the budgets below (welded simplify, as viewer/stjobModel.js); LOD2 drops the bogies and the pantograph;
//   - ONE node material for all four Blender materials (Paint, Glass, Trim, Emissive) = one draw call per piece and LOD:
//     the material is a per-vertex kind (aKind), the colours and codes are COLOR_0 (see tram.py);
//   - the destination displays: an LED text atlas (one row per headsign, 160 x 19 LEDs), picked per instance.
// Placement: tramPose() puts every piece of one tram on a track given as at(s) -> [x, z, heading] (s = distance along
// it, the tram's nose at s = d, the tram behind it): the bogie modules (cabs, centre) sit TANGENT to the track at their
// bogie (the Cityrunner's bogies hardly turn under the body), the suspended modules hang between the pivots of their
// neighbours, the bellows turn to the bisector. createTramFleet() draws any number of trams with InstancedMeshes per
// piece type and LOD (capacity >= 1025: the storage-buffer path, no recompiles when the count changes).
import * as THREE from "three/webgpu";
import {
  attribute, uv, texture, vec2, vec3, vec4, float, floor, fract, mix, smoothstep, clamp, length, fwidth, mrt, color,
  uniform, positionView, step,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";
import { env } from "./lighting.js";

// LOD budgets (triangles per piece; per tram: LOD0 ~15.9k, LOD1 ~6k, LOD2 ~1.2k) and switch distances (m)
export const TRAM_LODS = [
  { until: 70 },
  { until: 260, src: "_mid", target: { Cab: 1500, Susp: 700, Centre: 320, Bellows: 160, Panto: 200, Bogie: 0 } },
  { until: 1800, src: "_far", target: { Cab: 300, Susp: 150, Centre: 90, Bellows: 24, Panto: 0, Bogie: 0 } },
];
export const PIECES = ["Cab", "Susp", "Centre", "Bellows", "Bogie", "Panto"];
const PER_TRAM = { Cab: 2, Susp: 2, Centre: 1, Bellows: 4, Bogie: 3, Panto: 1 };
const KINDS = { Paint: 0, Glass: 1, Trim: 2, Emissive: 3 };
const LED = [160, 19];

/** Live look controls (uniforms: no recompiles). */
export const tramLook = {
  interior: uniform(1.0),          // saloon light at night
  headlights: uniform(1.0),
  display: uniform(1.0),
  dirt: uniform(1.0),              // a little grime low on the body
};

/** "FORT-JACO" -> "Fort-Jaco" as STIB's displays write it (photos: "92 Fort-Jaco", "92 Schaerbeek G..."). */
export function headsignText(h) {
  const fixed = { HEROS: "Héros", "ST-SERVAIS": "St-Servais" };
  if (fixed[h]) return fixed[h];
  return h.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}

let promise = null;
export function loadTramModel() {
  return (promise ??= (async () => {
    const base = new URL("../models/tram/", import.meta.url).href;
    const [gltf, layout] = await Promise.all([new GLTFLoader().loadAsync(base + "t3000.glb"), fetch(base + "t3000.json").then((r) => r.json())]);
    await MeshoptSimplifier.ready;
    gltf.scene.updateMatrixWorld(true);
    // primitives per Blender object (pieces + variants), with their kind
    const objects = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const RE = /^(Cab|Susp|Centre|Bellows|Bogie|Panto)(_mid|_far)?$/;
      let node = o; while (node && !RE.test(node.name)) node = node.parent;
      if (!node) return;
      const name = node.name;
      const kind = KINDS[o.material.name] ?? 0;
      const g = o.geometry.clone();
      (objects[name] ??= []).push({ g, kind });
    });
    const lods = TRAM_LODS.map((L, k) => {
      const out = {};
      for (const p of PIECES) {
        const src = objects[p + (L.src || "")] || objects[p];
        const target = L.target ? L.target[p] : 0;
        if (k && target === 0) { out[p] = null; continue; }
        out[p] = mergePrims(src, target);
        if (k === 2) out[p] = flatShade(out[p]);       // far: face normals (the welded picks shade blotchy on 300 triangles)
      }
      out.tris = PIECES.reduce((s, p) => s + (out[p] ? (out[p].index ? out[p].index.count : out[p].attributes.position.count) / 3 * PER_TRAM[p] : 0), 0);
      return out;
    });
    const sign = makeSignAtlas(["FORT-JACO", "SCHAERBEEK GARE"]);
    const material = makeMaterial(sign);
    return { layout, lods, material, sign };
  })());
}

/** Merge a piece's primitives into one indexed geometry with aKind; trim to `target` triangles if given. */
function mergePrims(prims, target) {
  const total = prims.reduce((s, q) => s + q.g.index.count / 3, 0);
  const parts = prims.map(({ g, kind }) => {
    let idx = g.index.array;
    if (target && total > target) {
      const want = Math.max(6, Math.floor((g.index.count / 3) * (target / total))) * 3;
      if (want < g.index.count) idx = simplifyWelded(g, want);
    }
    return { g, kind, idx };
  });
  const nV = parts.reduce((s, q) => s + q.g.attributes.position.count, 0), nI = parts.reduce((s, q) => s + q.idx.length, 0);
  const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), col = new Float32Array(nV * 4), tuv = new Float32Array(nV * 2), kind = new Float32Array(nV);
  const index = new Uint32Array(nI);
  let v0 = 0, i0 = 0;
  for (const { g, kind: k, idx } of parts) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, v0 * 3);
    nrm.set(g.attributes.normal.array, v0 * 3);
    const c = g.attributes.color;
    for (let i = 0; i < n; i++) {
      col[(v0 + i) * 4] = c ? c.getX(i) : 1; col[(v0 + i) * 4 + 1] = c ? c.getY(i) : 1; col[(v0 + i) * 4 + 2] = c ? c.getZ(i) : 1;
      col[(v0 + i) * 4 + 3] = c && c.itemSize === 4 ? c.getW(i) : 0;
      if (g.attributes.uv) { tuv[(v0 + i) * 2] = g.attributes.uv.getX(i); tuv[(v0 + i) * 2 + 1] = g.attributes.uv.getY(i); }
      kind[v0 + i] = k;
    }
    for (let i = 0; i < idx.length; i++) index[i0 + i] = idx[i] + v0;
    v0 += n; i0 += idx.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 4));
  geo.setAttribute("uv", new THREE.BufferAttribute(tuv, 2));
  geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  geo.userData.shared = true;
  return geo;
}

/** Unindexed copy with face normals (small far meshes only). */
function flatShade(g) {
  const f = g.toNonIndexed();
  f.deleteAttribute("normal"); f.computeVertexNormals();
  f.computeBoundingSphere(); f.userData.shared = true;
  return f;
}

/** meshoptimizer on a position-welded index (as viewer/stjobModel.js): the flat-shaded, colour-split mesh would
 *  otherwise be thousands of loose pieces. Borders locked: neighbouring primitives (paint / glass) stay sealed. */
function simplifyWelded(g, want) {
  const P = g.attributes.position.array, Nn = g.attributes.normal.array, I = g.index.array, C4 = g.attributes.color;
  const n = P.length / 3, canon = new Uint32Array(n), map = new Map(), cpos = [], members = [];
  for (let i = 0; i < n; i++) {
    // welded by position AND colour: livery edges (gold band, window band) become locked borders, so they survive
    const ck = C4 ? `${Math.round(C4.getX(i) * 255)},${Math.round(C4.getY(i) * 255)},${Math.round(C4.getZ(i) * 255)}` : "";
    const key = `${Math.round(P[i * 3] * 1000)},${Math.round(P[i * 3 + 1] * 1000)},${Math.round(P[i * 3 + 2] * 1000)},${ck}`;
    let c = map.get(key);
    if (c === undefined) { c = cpos.length / 3; map.set(key, c); cpos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); members.push([]); }
    canon[i] = c; members[c].push(i);
  }
  const ci = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) ci[i] = canon[I[i]];
  const [out] = MeshoptSimplifier.simplify(ci, new Float32Array(cpos), 3, want, 1.0, ["ErrorAbsolute", "LockBorder"]);
  const res = new Uint32Array(out.length), C = cpos;
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t], b = out[t + 1], c = out[t + 2];
    const ux = C[b * 3] - C[a * 3], uy = C[b * 3 + 1] - C[a * 3 + 1], uz = C[b * 3 + 2] - C[a * 3 + 2];
    const vx = C[c * 3] - C[a * 3], vy = C[c * 3 + 1] - C[a * 3 + 1], vz = C[c * 3 + 2] - C[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (let k = 0; k < 3; k++) {
      let best = members[out[t + k]][0], bd = -Infinity;
      for (const v of members[out[t + k]]) {
        const d = Nn[v * 3] * fx + Nn[v * 3 + 1] * fy + Nn[v * 3 + 2] * fz;
        if (d > bd) { bd = d; best = v; }
      }
      res[t + k] = best;
    }
  }
  return res;
}

/** The LED destination atlas: one row of 160 x 19 px per headsign ("92 Fort-Jaco"), white on black (the shader
 *  makes it amber dots). setRows(list) redraws it (the city passes the line's real headsigns). */
function makeSignAtlas(heads, line = "92") {
  const canvas = document.createElement("canvas");
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  const rowsU = uniform(1);
  const sign = { tex, rows: rowsU, list: [], index: {}, canvas };
  sign.setRows = (list, ln = line) => {
    sign.list = list.slice(); sign.index = Object.fromEntries(list.map((h, i) => [h, i]));
    canvas.width = LED[0]; canvas.height = LED[1] * list.length;
    const cx = canvas.getContext("2d");
    cx.fillStyle = "#000"; cx.fillRect(0, 0, canvas.width, canvas.height);
    cx.fillStyle = "#fff"; cx.textBaseline = "middle";
    list.forEach((h, i) => {
      const y = i * LED[1] + LED[1] / 2 + 1;
      cx.font = "bold 15px Arial, sans-serif";
      cx.fillText(ln, 2, y);
      const x0 = 2 + cx.measureText(ln).width + 6;
      const txt = headsignText(h);
      let size = 15;
      cx.font = `bold ${size}px "Arial Narrow", Arial, sans-serif`;
      while (cx.measureText(txt).width > LED[0] - x0 - 2 && size > 9) { size--; cx.font = `bold ${size}px "Arial Narrow", Arial, sans-serif`; }
      cx.fillText(txt, x0, y);
    });
    tex.needsUpdate = true;
    rowsU.value = list.length;
  };
  sign.setRows(heads, line);
  return sign;
}

function makeMaterial(sign) {
  const m = new THREE.MeshStandardNodeMaterial();
  const kind = attribute("aKind", "float"), col = attribute("color", "vec4"), inst = attribute("aInst", "vec4");
  // kinds by ranges, never equal(): the interpolated value is not exactly the integer everywhere (speckle)
  const isPaint = float(1).sub(step(0.5, kind));
  const isGlass = step(0.5, kind).sub(step(1.5, kind));
  const isTrim = step(1.5, kind).sub(step(2.5, kind));
  const isEmit = step(2.5, kind);
  const yLocal = attribute("position", "vec3").y;
  // grime: a little darker toward the skirts (the photos' lower body is duller than the roof)
  const grime = mix(float(0.82), float(1.0), smoothstep(0.2, 1.1, yLocal)).mul(tramLook.dirt).add(float(1).sub(tramLook.dirt));
  const lens = mix(vec3(0.03), vec3(0.75, 0.75, 0.72), clamp(col.x.add(col.y), 0, 1));        // lamp lenses when off
  const base = col.xyz.mul(isPaint.mul(grime).add(isTrim))
    .add(vec3(0.012, 0.014, 0.016).mul(isGlass))
    .add(lens.mul(col.z.oneMinus()).mul(isEmit));
  m.colorNode = base;
  const rough = isPaint.mul(mix(float(0.5), float(0.36), col.w)).add(isGlass.mul(0.05)).add(isTrim.mul(0.6)).add(isEmit.mul(0.15));
  const metal = isPaint.mul(col.w.mul(0.22)).add(isTrim.mul(0.1));
  m.roughnessNode = rough;
  m.metalnessNode = metal;
  // LEDs: the display's uv on a 160 x 19 grid, each cell lit from the atlas row of this instance (aInst.y)
  const g = uv().mul(vec2(LED[0], LED[1]));
  const cell = floor(g);
  // glTF uv: v = 0 at the TOP of the display; the canvas texture is flipped (v = 1 = canvas top), rows top down
  const tv = float(1).sub(inst.y.add(cell.y.add(0.5).div(LED[1])).div(sign.rows));
  const lit = smoothstep(0.35, 0.6, texture(sign.tex, vec2(cell.x.add(0.5).div(LED[0]), tv)).r);
  const dotM = smoothstep(0.5, 0.28, length(fract(g).sub(0.5)));
  const blur = clamp(fwidth(g.x).mul(1.2), 0, 1);                    // far away the dots merge into a glow
  const led = lit.mul(mix(dotM, float(0.55), blur)).add(float(0.015));
  const night = env.uNight;
  const head = col.x.mul(inst.x).mul(mix(float(2.5), float(14.0), night)).mul(tramLook.headlights);
  const tail = col.y.mul(inst.x.oneMinus()).mul(mix(float(1.2), float(5.0), night)).mul(tramLook.headlights);
  const disp = col.z.mul(led).mul(mix(float(3.2), float(2.4), night)).mul(tramLook.display);
  const saloon = smoothstep(0.6, 0.9, col.x).mul(isGlass).mul(night).mul(tramLook.interior).mul(env.uInteriorGlow).mul(0.14)   // the cab (0.3) stays dark
    .mul(mix(float(0.35), float(1.0), smoothstep(1.2, 2.25, yLocal)));                     // ceiling light strips: brighter at the top
  m.emissiveNode = color(1.0, 0.95, 0.86).mul(head).mul(isEmit)
    .add(color(1.0, 0.04, 0.02).mul(tail).mul(isEmit))
    .add(color(1.0, 0.5, 0.06).mul(disp).mul(isEmit))
    .add(color(1.0, 0.9, 0.74).mul(saloon).mul(0.9));
  // post chain: SSR on the paint (as post.js), no screen-space AO on glass and lamps (viewer/facades.js rule)
  const ssrFade = smoothstep(360.0, 180.0, positionView.z.negate());
  m.mrtNode = mrt({ metalRough: vec3(rough.lessThan(0.75).select(metal.mul(ssrFade), float(0)), rough, float(1).sub(isGlass).sub(isEmit)) });
  m.userData.shared = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ placement
const dirOf = (h) => [Math.cos(h), -Math.sin(h)];        // heading (three: yaw about +y, +x forward) -> (x, z) direction
/** All pieces of one tram whose nose is at distance d along at(s): fills `out` = [{ piece, x, z, yaw, flip }] (yaw =
 *  the piece's rotation about +y; flip: turned 180 deg, i.e. the rear cab / section 4; lead: the cab in front, with
 *  white headlights - the other shows red tail lights; leadRear: the tram runs the other way, cab 5 leads). */
export function tramPose(layout, at, d, out = [], leadRear = false) {
  out.length = 0;
  const M = layout.modules, mods = [];
  for (let i = 0; i < M.length; i++) {
    const m = M[i];
    if (m.bogie == null) { mods.push(null); continue; }
    const [bx, bz, h] = at(d - (m.front + m.bogie));
    const [dx, dz] = dirOf(h), c = m.bogie - m.length / 2;          // centre ahead of the bogie
    const ox = bx + dx * c, oz = bz + dz * c;
    mods.push({ ox, oz, h, L: m.length, fx: ox + dx * m.length / 2, fz: oz + dz * m.length / 2, rx: ox - dx * m.length / 2, rz: oz - dz * m.length / 2 });
    out.push({ piece: "Bogie", x: bx, z: bz, yaw: h, flip: false });
  }
  for (let i = 0; i < M.length; i++) {
    if (mods[i]) continue;
    const a = mods[i - 1], b = mods[i + 1];
    const ox = (a.rx + b.fx) / 2, oz = (a.rz + b.fz) / 2, h = Math.atan2(-(a.rz - b.fz), a.rx - b.fx);
    mods[i] = { ox, oz, h, L: M[i].length, fx: a.rx, fz: a.rz, rx: b.fx, rz: b.fz };
  }
  for (let i = 0; i < M.length; i++) {
    const p = mods[i], m = M[i];
    out.push({ piece: m.piece, x: p.ox, z: p.oz, yaw: p.h + (m.flip ? Math.PI : 0), flip: m.flip, lead: leadRear ? i === M.length - 1 : i === 0 });
    if (m.panto != null) { const [dx, dz] = dirOf(p.h); out.push({ piece: "Panto", x: p.ox + dx * m.panto, z: p.oz + dz * m.panto, yaw: p.h, flip: false }); }
    if (i < M.length - 1) {                                          // the bellows at the pivot, on the bisector
      const q = mods[i + 1];
      let dh = q.h - p.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      out.push({ piece: "Bellows", x: (p.rx + q.fx) / 2, z: (p.rz + q.fz) / 2, yaw: p.h + dh / 2, flip: false, angle: dh });
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the fleet
/** InstancedMeshes per piece type and LOD for up to `maxTrams` trams. Per frame: begin(camera); add(pose, ground,
 *  {lead, sign, lod}) per tram; end(). */
export function createTramFleet(model, parent, maxTrams = 40) {
  const meshes = [];       // [lod][piece] -> { mesh, inst, n }
  for (let k = 0; k < model.lods.length; k++) {
    const row = {};
    for (const p of PIECES) {
      const geo0 = model.lods[k][p];
      if (!geo0) continue;
      const cap = Math.max(1025, maxTrams * PER_TRAM[p]);
      const geo = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(geo0.attributes)) geo.setAttribute(name, a);
      if (geo0.index) geo.setIndex(geo0.index);
      geo.boundingSphere = geo0.boundingSphere;
      const inst = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      inst.setUsage(THREE.DynamicDrawUsage);                        // rewritten every frame (positions of moving trams)
      geo.setAttribute("aInst", inst);
      const mesh = new THREE.InstancedMesh(geo, model.material, cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0; mesh.frustumCulled = false; mesh.castShadow = k < 2; mesh.receiveShadow = true;
      mesh.name = `tram-${p}-lod${k}`;
      parent.add(mesh);
      row[p] = { mesh, inst, n: 0 };
    }
    meshes.push(row);
  }
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const frustum = new THREE.Frustum(), sphere = new THREE.Sphere(), pm = new THREE.Matrix4();
  let cam = null, lodScale = 1, forced = -1;
  const stats = { trams: 0, perLod: [0, 0, 0], culled: 0 };
  return {
    meshes,
    stats,
    set lodScale(s) { lodScale = s; },
    set forceLod(k) { forced = k; },
    begin(camera) {
      cam = camera;
      if (cam) { pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); }
      for (const row of meshes) for (const r of Object.values(row)) r.n = 0;
      stats.trams = 0; stats.perLod = [0, 0, 0]; stats.culled = 0;
    },
    /** pose from tramPose(); ground(x, z) -> rail-top height; opts.sign = atlas row; returns the LOD used or -1 */
    add(pose, ground, { sign = 0 } = {}) {
      let cx = 0, cz = 0;
      for (const p of pose) { cx += p.x; cz += p.z; }
      cx /= pose.length; cz /= pose.length;
      const cy = ground(cx, cz);
      let k = forced;
      if (cam) {
        sphere.center.set(cx, cy + 2, cz); sphere.radius = 19;
        if (!frustum.intersectsSphere(sphere)) { stats.culled++; return -1; }
        if (k < 0) {
          const dist = cam.position.distanceTo(sphere.center) / lodScale;
          k = TRAM_LODS.findIndex((l) => dist < l.until);
          if (k < 0) { stats.culled++; return -1; }
        }
      }
      if (k < 0) k = 0;
      const row = meshes[k];
      for (const p of pose) {
        const r = row[p.piece];
        if (!r || r.n >= r.mesh.instanceMatrix.count) continue;
        q.setFromAxisAngle(up, p.yaw);
        M.compose(v.set(p.x, ground(p.x, p.z), p.z), q, one);
        r.mesh.setMatrixAt(r.n, M);
        r.inst.array.set([p.lead ? 1 : 0, sign, p.angle || 0, 0], r.n * 4);
        r.n++;
      }
      stats.trams++; stats.perLod[k]++;
      return k;
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
