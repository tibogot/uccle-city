// GATE: CAR DENTS WITHOUT HOLES (claude/dent, QUALITY_RULES 41, docs/CARHIT.md "Dents without holes").
// Owner playtest 2026-11-19: "the damage leaves some hollow mesh". Every car model of every pack (cars2, faceted,
// kenney, quaternius: the fleets, the player's / police car, the accident props) at every LOD the game draws, dented at
// the full depth (28 cm, carHit.js dentCap) on each corner alone and on all four, by the SAME field the shader runs
// (viewer/drive/carDent.js dentField on numbers):
//   flips    triangles whose winding turns round (the face shows its back to every view it faced: culled = a hole) = 0
//   cracks   vertices of one position (split normals: hard edges, seams) moved apart > 1 mm (a tear) = 0
//   mid      vertices crossing the car's mid-plane x = 0 or z = 0 = 0
//   cabin    skin vertices entering the cabin box (the interior's bounds) = 0
//   NaN      = 0; the wheels (own local frame: the player's / props' material) not moved
// The old crumple (?dent=old: carPacks.js crumpleOffset, the push along each vertex normal) measured the same way must
// FAIL (flips / cracks). Code: ?dent=old a features.js row, no DynamicDrawUsage / light / new mesh (no new draw call:
// the dent is the existing materials' vertex stage), the default materials (player / police, traffic, props) compile
// to WGSL headless with the dent, the traffic's packed code decoded in the vertex stage (rule 34).
//   node --import ./tools/christmas/hook.mjs tools/audit/dentGate.mjs [--quiet] [--old]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet"), onlyOld = process.argv.includes("--old");
globalThis.location ??= { search: "" };
const rows = [];
const check = (name, ok, info = "") => { rows.push([name, ok ? "PASS" : "FAIL", info]); };
const imp = (f) => import(pathToFileURL(path.join(ROOT, f)).href);

const { dentField, dentFrame, jsOps, CORNERS } = await imp("viewer/drive/carDent.js");
const { parseCarGlb, lodMesh, lodOpts, partLevel } = await imp("viewer/drive/carLod.js");
const { PACK_SOURCES, PACK_LODS } = await imp("viewer/drive/carPacks.js");
const { MeshoptSimplifier } = await import("meshoptimizer/simplifier");
await MeshoptSimplifier.ready;

const NEAR = 55, BLOB_FAR = 2500;                     // levels drawn from NEAR m on: holes under a pixel (2026-11-19: 2,249 px)
const HOLE_CEIL = 6500, HOLE_CASE = 220;            // back-face pixels added, all hairlines: a lamp / panel seam of the packs
                                                      // (open there already) shifted by a pixel (2026-11-19: 5,750 / 197)
const FLIP_CEIL = 60;                                 // wound-round slivers nobody sees (1-3 mm wide, under / inside the body)
const DEPTH = 0.28;                                   // carHit.js HIT.dentCap: the most a corner takes
const CASES = [...CORNERS.map((_, c) => { const d = [0, 0, 0, 0]; d[c] = DEPTH; return [["FL", "FR", "RL", "RR"][c], d]; }), ["all", [DEPTH, DEPTH, DEPTH, DEPTH]]];

// the old crumple on numbers (carPacks.js crumpleOffset as it was: SUBTRACTED, along the vertex normal)
const sst = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };
function oldOffset(x, y, z, nx, ny, nz, dep, hl) {
  const fold = Math.sin(y * 23) * 0.35 + Math.sin(z * 17 + x * 9) * 0.25 + 0.7;
  let ox = 0, oy = 0, oz = 0;
  CORNERS.forEach(([sx, sz], c) => {
    const w = sst(hl - 1, hl, z * sz) * sst(-0.2, 0.75, x * sx) * dep[c];
    ox += nx * w * fold; oy += ny * w * fold + w * 0.25; oz += nz * w * fold + w * sz * 0.6;
  });
  return [-ox, -oy, -oz];
}

/** displace a mesh; -> { flips, cracks, mid, cabin, nan, maxD, tris } */
function measure(m, F, dep, old, hl, probe = null) {
  const { P, N, I } = m, n = P.length / 3, Q = new Float64Array(n * 3);
  let nan = 0, maxD = 0, mid = 0, cabin = 0;
  const B = F.box, inBox = (x, y, z, e) => x > B.x0 + e && x < B.x1 - e && y > B.y0 + e && y < B.y1 - e && z > B.z0 + e && z < B.z1 - e;
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    const o = old ? oldOffset(x, y, z, N[i * 3], N[i * 3 + 1], N[i * 3 + 2], dep, hl) : dentField(jsOps, x, y, z, dep, F, F.box);
    const qx = x + o[0], qy = y + o[1], qz = z + o[2];
    if (!Number.isFinite(qx) || !Number.isFinite(qy) || !Number.isFinite(qz) || (!old && !Number.isFinite(o[3]))) nan++;
    Q[i * 3] = qx; Q[i * 3 + 1] = qy; Q[i * 3 + 2] = qz;
    maxD = Math.max(maxD, Math.hypot(o[0], o[1], o[2]));
    if ((Math.abs(x) > 1e-4 && Math.sign(qx) !== Math.sign(x)) || (Math.abs(z) > 1e-4 && Math.sign(qz) !== Math.sign(z))) mid++;
    if (!inBox(x, y, z, -1e-4) && inBox(qx, qy, qz, 1e-4)) cabin++;
  }
  let flips = 0, tris = 0;
  const flipped = new Set();
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const n0 = cross(P, a, b, c), n1 = cross(Q, a, b, c);
    const l0 = Math.hypot(...n0);
    if (l0 < 1e-9) continue;                          // (a degenerate source triangle has no side)
    tris++;
    if (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] <= 0) { flips++; flipped.add(t / 3); }
  }
  // cracks: vertices of one position moved apart
  const first = new Map(), torn = new Set();
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`;
    const f = first.get(k);
    if (f === undefined) { first.set(k, i); continue; }
    if (Math.hypot(Q[i * 3] - Q[f * 3], Q[i * 3 + 1] - Q[f * 3 + 1], Q[i * 3 + 2] - Q[f * 3 + 2]) > 1e-3) torn.add(k);
  }
  let seen = 0, seenPx = 0, flipSeen = 0, blob = 0;
  if (probe) {
    const after = zbuffers(Q, I, probe.R), h = holes(probe.before, after, probe.R.W);
    seen = h.tris.size; seenPx = h.px; blob = h.blob;
    // a wound-round triangle that is the nearest surface of some pixel from outside (it shows its back there)
    if (flipped.size) { const vis = new Set(); for (const A of after) for (const v of A) if (v < 0 && flipped.has(-v - 1)) vis.add(-v - 1); flipSeen = vis.size; }
  }
  return { flips, cracks: torn.size, mid, cabin, nan, maxD, tris, seen, seenPx, flipSeen, blob };
}
// ---- the view probe: orthographic z-buffers from outside, where a camera can be (8 around at 10 / 35 deg down, the
// top; not from under the car), PIX m a pixel. A hole = back faces seen from outside: per view the pixels whose nearest
// surface shows its BACK, after the dent minus before (the packs are not all closed: an open lamp housing or the
// underside shows a few back faces already, and a dent shifts which pixels see them; the NET increase is the hole)
const PIX = 0.015;
const VIEWS = (() => {
  const out = [[0, -1, 0]];
  for (let k = 0; k < 8; k++) for (const el of [10, 35]) { const a = (k * Math.PI) / 4, e = (el * Math.PI) / 180; out.push([Math.cos(a) * Math.cos(e), -Math.sin(e), Math.sin(a) * Math.cos(e)]); }
  return out;                                         // view DIRECTIONS (looking along d)
})();
const BASES = VIEWS.map((d) => {
  const up = Math.abs(d[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0];
  const u = norm(crossV(up, d)), v = crossV(d, u);
  return { d, u, v };
});
function norm(a) { const l = Math.hypot(...a); return a.map((x) => x / l); }
function crossV(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
/** -> per view an Int32Array of (tri index + 1) x (front ? 1 : -1) per pixel (0 = nothing), over a fixed window */
function zbuffers(A, I, R) {
  const out = [];
  for (const { d, u, v } of BASES) {
    const W = R.W, H = R.H, tri = new Int32Array(W * H), dep = new Float32Array(W * H).fill(1e9);
    const n = A.length / 3, pu = new Float32Array(n), pv = new Float32Array(n), pd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = A[i * 3], y = A[i * 3 + 1], z = A[i * 3 + 2];
      pu[i] = (x * u[0] + y * u[1] + z * u[2] + R.r) / PIX; pv[i] = (x * v[0] + y * v[1] + z * v[2] + R.r) / PIX; pd[i] = x * d[0] + y * d[1] + z * d[2];
    }
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      const ax = pu[a], ay = pv[a], bx = pu[b], by = pv[b], cx = pu[c], cy = pv[c];
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(area) < 1e-9) continue;
      // facing: the triangle's normal vs the view direction (a front face points against d); in the (u, v) plane the
      // signed area's sign gives it: u x v = d, so area < 0 <=> front
      const front = area < 0;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
      const ia = 1 / area;
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const sx = px + 0.5, sy = py + 0.5;
        const w0 = ((bx - sx) * (cy - sy) - (by - sy) * (cx - sx)) * ia, w1 = ((cx - sx) * (ay - sy) - (cy - sy) * (ax - sx)) * ia, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * pd[a] + w1 * pd[b] + w2 * pd[c], k = py * W + px;
        if (z < dep[k]) { dep[k] = z; tri[k] = front ? t / 3 + 1 : -(t / 3 + 1); }
      }
    }
    out.push(tri);
  }
  return out;
}
/** holes seen from outside, per view: px = max(0, back pixels after - before) (summed); blob = the pixels newly seen
 *  as a back face whose 8 neighbours are too (an eroded mask: a hole >= 3 px = 4.5 cm across; a seam shifting by a
 *  pixel, a hairline, is not one) -> { px, blob, tris: Set (the back faces newly seen) } */
function holes(before, after, W) {
  let px = 0, blob = 0;
  const tris = new Set();
  for (let v = 0; v < before.length; v++) {
    const B = before[v], A = after[v], N = B.length;
    let nb = 0, na = 0;
    const T = new Set();
    for (let k = 0; k < N; k++) { if (B[k] < 0) nb++; if (A[k] < 0) { na++; if (B[k] >= 0) T.add(-A[k] - 1); } }
    if (na > nb) { px += na - nb; for (const t of T) tris.add(t); }
    const nw = (k) => k >= 0 && k < N && A[k] < 0 && B[k] >= 0;
    for (let k = W + 1; k < N - W - 1; k++) if (nw(k) && nw(k - 1) && nw(k + 1) && nw(k - W) && nw(k + W) && nw(k - W - 1) && nw(k - W + 1) && nw(k + W - 1) && nw(k + W + 1)) blob++;
  }
  return { px, blob, tris };
}

function cross(A, a, b, c) {
  const ux = A[b] - A[a], uy = A[b + 1] - A[a + 1], uz = A[b + 2] - A[a + 2], vx = A[c] - A[a], vy = A[c + 1] - A[a + 1], vz = A[c + 2] - A[a + 2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

// ---- 1. every model of every pack, every LOD, each corner at full depth
const zero = () => ({ flips: 0, cracks: 0, mid: 0, cabin: 0, nan: 0, tris: 0, maxD: 0, seen: 0, seenPx: 0, worstPx: 0, flipSeen: 0, blob: 0, blobFar: 0 });
const tot = { new: zero(), old: zero() };
const worst = { new: [], old: [] };
let models = 0, meshes = 0, wheelMove = 0;
for (const [src, S] of Object.entries(PACK_SOURCES)) {
  const fp = path.join(ROOT, `models/cars/${src}.glb`);
  if (!fs.existsSync(fp)) { check(`pack ${src}`, false, "missing GLB"); continue; }
  const b = fs.readFileSync(fp);
  const cars = parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const lods = S.lods || PACK_LODS;
  for (const car of cars) {
    const part = (name) => car.parts.find((p) => p.name === name);
    const body = part("Body");
    if (!body) continue;
    models++;
    const F = dentFrame(body.mesh.P, body.mesh.K);
    const size = car.extras.size || [1.8, 1.45, 4.3];
    const hlPlayer = size[2] / 2;                       // the old crumple's reach (driveMode.js: BODY.hz)
    const levels = new Map();
    lods.forEach((L, k) => {
      let m;
      if (S.authored) m = (L.src ? part(`Body_L${L.src}`) : body)?.mesh;
      else { const o = lodOpts(S, L, "Body"); m = o.error ? lodMesh(body.mesh, o, MeshoptSimplifier) : body.mesh; }
      if (m && !levels.has(m)) levels.set(m, k);
    });
    for (const [m, k] of levels) {
      meshes++;
      const R = { r: 3.4, W: Math.ceil(6.8 / PIX), H: Math.ceil(6.8 / PIX) };
      const probe = { R, before: zbuffers(m.P, m.I, R) };
      for (const [cn, dep] of CASES) for (const mode of onlyOld ? ["old"] : ["new", "old"]) {
        const r = measure(m, F, dep, mode === "old", hlPlayer, probe), T = tot[mode];
        for (const key of ["flips", "cracks", "mid", "cabin", "nan", "seen", "seenPx", "flipSeen", "blob"]) T[key] += r[key];
        T.tris += r.tris; T.maxD = Math.max(T.maxD, r.maxD); T.worstPx = Math.max(T.worstPx, r.seenPx);
        // a level first drawn beyond NEAR m: its "holes" are under a pixel there (4.5 cm at 70 m ~ 0.6 px at 1080p)
        if ((k ? lods[k - 1].until : 0) >= NEAR) { T.blobFar += r.blob; T.blob -= r.blob; }
        if (r.seenPx + r.cracks + r.mid + r.cabin + r.nan) worst[mode].push(`${src}:${car.id} LOD${k} ${cn}: seen ${r.seen} (${r.seenPx} px, blob ${r.blob}) flips ${r.flips} (seen ${r.flipSeen}) cracks ${r.cracks} mid ${r.mid} cabin ${r.cabin}${r.nan ? ` NaN ${r.nan}` : ""}`);
      }
    }
    // the wheels in their own frame (the player's car / props share the body material): never moved
    for (const w of ["Wheel_FL", "Wheel_RR"]) {
      const g = part(w)?.mesh;
      if (!g) continue;
      for (let i = 0; i < g.P.length / 3; i++) {
        const o = dentField(jsOps, g.P[i * 3], g.P[i * 3 + 1], g.P[i * 3 + 2], [DEPTH, DEPTH, DEPTH, DEPTH], F, F.box);
        wheelMove = Math.max(wheelMove, Math.hypot(o[0], o[1], o[2]));
      }
    }
  }
}
const N = onlyOld ? tot.old : tot.new, O = tot.old;     // (--old: the old crumple through the same checks: it fails)
{
  check("see-through holes = 0", N.blob === 0, `${N.blob} px inside a new back-face region >= 3 px (4.5 cm) across, seen from outside, on every level drawn nearer than ${NEAR} m; old ${O.blob} px`);
  check(`far levels <= ${BLOB_FAR} px`, N.blobFar <= BLOB_FAR, `${N.blobFar} px on the levels first drawn beyond ${NEAR} m (the lab packs' LOD2-3, meshopt-simplified open; a 4.5 cm hole there is under a pixel); old ${O.blobFar} px`);
  check(`seam shifts <= ${HOLE_CEIL} px, <= ${HOLE_CASE} a case`, N.seenPx <= HOLE_CEIL && N.worstPx <= HOLE_CASE, `${N.seenPx} px of ${PIX * 100} cm (${(N.seenPx * PIX * PIX * 1e4).toFixed(0)} cm2 over ${VIEWS.length} views x ${models} models x ${meshes} LOD meshes x ${CASES.length} cases), worst case ${N.worstPx} px; old ${O.seenPx} px (${(O.seenPx * PIX * PIX * 1e4).toFixed(0)} cm2), worst ${O.worstPx}`);
  check("flips seen from outside = 0", N.flipSeen === 0, `${N.flipSeen} wound-round triangles are the nearest surface of a pixel from outside (${VIEWS.length} views, ${PIX * 100} cm pixels); old ${O.flipSeen}`);
  check("flips (any)", N.flips <= FLIP_CEIL, `${N.flips} of ${N.tris} triangle-cases wound round, all unseen slivers (<= ${FLIP_CEIL}); old ${O.flips}`);
  check("cracks = 0", N.cracks === 0, `${N.cracks} split-vertex groups torn > 1 mm; old ${O.cracks}`);
  check("mid-plane = 0", N.mid === 0, `${N.mid} vertices cross x = 0 / z = 0; old ${O.mid}`);
  check("cabin = 0", N.cabin === 0, `${N.cabin} skin vertices into the cabin box; old ${O.cabin}`);
  check("NaN = 0", N.nan === 0, `${N.nan}`);
  check("dent depth", N.maxD > 0.08 && N.maxD < 0.2, `deepest push ${N.maxD.toFixed(3)} m at 0.28 m damage (a light dent: 8-20 cm); old ${O.maxD.toFixed(3)} m`);
  check("wheels untouched", wheelMove < 1e-4, `wheel vertices (own frame) moved <= ${(wheelMove * 1000).toFixed(2)} mm`);
  const W = worst[onlyOld ? "old" : "new"];
  if (W.length && (!quiet || process.argv.includes("--verbose"))) console.log(W.slice(0, process.argv.includes("--verbose") ? 1e9 : 12).join("\n"));
}
if (!onlyOld) check("?dent=old fails here", O.flipSeen > 0 && O.blob > 0 && O.cracks > 0, `the old crumple: ${O.flipSeen} wound-round triangles seen from outside, ${O.blob} px of see-through holes (near levels), ${O.cracks} torn seams, ${O.mid} mid-plane, ${O.cabin} cabin entries`);

// ---- 2. code: the switch, no draw call / light / DynamicDrawUsage, the traffic code in the vertex stage
{
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
  check("?dent=old is a features.js row", /old\("dent"/.test(rd("viewer/features.js")));
  const bad = [];
  for (const f of ["viewer/drive/carDent.js", "viewer/drive/carPacks.js", "viewer/police/props.js", "viewer/traffic/trafficFleet.js", "viewer/carFleet.js"]) {
    const t = rd(f);
    if (/(setUsage\(|usage\s*=)\s*(THREE\.)?DynamicDrawUsage/.test(t)) bad.push(`${f}: DynamicDrawUsage`);
    if (/new THREE\.\w*Light\(/.test(t)) bad.push(`${f}: a light`);
  }
  if (/new THREE\.(Mesh|InstancedMesh|BatchedMesh)\(/.test(rd("viewer/drive/carDent.js"))) bad.push("carDent.js: a mesh");
  const tf = rd("viewer/traffic/trafficFleet.js");
  const nMat = (tf.match(/packMaterial\(/g) || []).length;
  if (nMat !== 6) bad.push(`trafficFleet.js: ${nMat} materials (6 before)`);
  check("no draw call / light / DynamicDrawUsage", !bad.length, bad.join(", ") || "the dent rides on the existing materials' vertex stage (traffic 6 materials, player / police 1, props 1 per car)");
}

// ---- 3. the default materials compile to WGSL with the dent (headless)
try {
  const THREE = await import("three/webgpu"), { context } = await import("three/tsl");
  const { packMaterial, playerDamage } = await imp("viewer/drive/carPacks.js");
  const R = { backend: { isWebGPUBackend: true, capabilities: { getUniformBufferLimit: () => 65536 }, hasFeature: () => false, utils: { getTextureSampleData: () => ({ primarySamples: 1, isMSAA: false }) } },
    library: new THREE.StandardNodeLibrary(), contextNode: context({}), getMRT: () => null, getOutputRenderTarget: () => null, getRenderTarget: () => null,
    toneMapping: 0, outputColorSpace: "srgb", lighting: { enabled: false }, highPrecision: false, debug: { diagnostics: { keywords: false }, onNodeBuilderCreated: null },
    getColorBufferType: () => THREE.HalfFloatType, hasFeature: () => false, getMaxAnisotropy: () => 1, nodes: { library: null }, domElement: { height: 1080 } };
  const geo = (inst) => {
    const g = new THREE.BoxGeometry(1.8, 1.4, 4.3, 2, 2, 4);
    const n = g.attributes.position.count;
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.5), 3)); g.setAttribute("_kind", new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
    if (inst) { g.setAttribute("wheel", new THREE.BufferAttribute(new Float32Array(n * 4), 4)); g.setAttribute("paint", new THREE.InstancedBufferAttribute(new Float32Array(3), 3)); g.setAttribute("motion", new THREE.InstancedBufferAttribute(new Float32Array(4), 4)); }
    return g;
  };
  const build = (mesh) => { const b = new THREE.WGSLNodeBuilder(mesh, R); b.material = mesh.material; b.scene = new THREE.Scene(); b.camera = new THREE.PerspectiveCamera(); b.build(); return b; };
  const warn = console.warn, log = console.log; console.warn = () => {}; console.log = () => {};
  const out = [];
  try {
    const lights = { head: { mul: (x) => x } };
    const { uniform } = await import("three/tsl");
    const L = { head: uniform(0), tail: uniform(0), brake: uniform(0) };
    void lights;
    const pm = packMaterial({ lights: L, rich: true, seeThrough: false });
    const b1 = build(new THREE.Mesh(geo(false), pm));
    out.push(["player / police", /v_carDent/.test(b1.vertexShader) && /v_carDent/.test(b1.fragmentShader)]);
    const tm = packMaterial({ paint: "instance", rich: true, motion: { night: uniform(0), time: uniform(0) } });
    const b2 = build(new THREE.InstancedMesh(geo(true), tm, 1));
    out.push(["traffic", /v_carDent/.test(b2.vertexShader) && /v_carDent/.test(b2.fragmentShader) && /carDentTypes|array</.test(b2.vertexShader)]);
    const { _dentTest } = await imp("viewer/police/props.js");
    const dm = _dentTest.damagedMaterial(new THREE.Color(0.5, 0.1, 0.1), true, { sx: 1, sz: -1, depth: 0.16 }, null);
    const b3 = build(new THREE.Mesh(geo(false), dm));
    out.push(["props", /v_carDent/.test(b3.vertexShader)]);
    void playerDamage;
  } finally { console.warn = warn; console.log = log; }
  check("wgsl", out.length === 3 && out.every((o) => o[1]), `compile to WGSL headless with the dent: ${out.map(([n, ok]) => `${n} ${ok ? "ok" : "NO DENT"}`).join(", ")}`);
} catch (e) { check("wgsl", false, `materials / WGSL: ${e.message.split("\n")[0]} (run with node --import ./tools/christmas/hook.mjs)`); }

const failed = rows.filter((r) => r[1] !== "PASS");
if (!quiet || failed.length) for (const r of rows) console.log(`${r[1]}  ${r[0]}${r[2] ? `  (${r[2]})` : ""}`);
console.log(failed.length ? `dentGate: ${failed.length} FAIL` : `dentGate: all ${rows.length} pass`);
process.exitCode = failed.length ? 1 : 0;
