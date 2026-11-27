// node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/falconPerchTest.mjs [--quiet] [--tiles I6,H6,I5] [--n 8]
// THE FALCON LANDS ON WHAT IS DRAWN (gate row `falconperch`, rule falcon-gym "landing on what is drawn"; owner 2026-11-26:
// "when landing on a house it's not really landing on it, it's floating; no matter where we land it shouldn't float").
// Real tiles, built by the tile worker's own code (tools/gate/tileBuild.mjs, the gate's tile cache), as the city's falcon
// world reads them (viewer/falconFlight/cityStream.js CityFalconWorld: the drawn ground, the drawn roof grid, the façade
// kit, the front gardens' collision stand-ins made as viewer/gardens/cityGardens.js makes them), the perch pool
// (cityGymWorld.js) sampled round each tile: every perch kind it offers (roof edges, ridges, chimneys, sills, railings,
// garden walls, pillars, hedges). On each perch, BOTH controllers land (the gym's E with the perch preferred; the current
// game's landing on it) and BOTH models pose there perched (the current falcon, the v2: the real rigs), then:
//   gap      the lowest toe-pad vertex over the DRAWN top (-5 mm .. 10 mm); the drawn top is measured on its own geometry:
//            the roof triangles of buildings.bin (a chimney: the drawn roof grid's stamped sample), the façade kit's piece
//            mesh (models/facadekit/kit.bin: the sill's / the handrail's top at the perch), the garden stand-in box's top
//            face (its instance matrix), the drive surface on the ground
//   inside   the body's vertices (not the legs) inside a solid of the world (the floor there over them by > 2 cm)
//   upright  the body's up within 15 deg of the vertical
// Self-test: the world before round 5 (no furniture, the DTM ground, the nearest roof sample, round 4's kit heights) fails.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2), QUIET = args.includes("--quiet"), arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const TILES = arg("--tiles", "I6,H6,I5").split(","), NPK = +arg("--n", 6);
globalThis.location = { search: "" };
const el = () => ({ style: { setProperty() {} }, append() {}, classList: { add() {}, remove() {}, toggle() {} } });
if (!globalThis.document?.body) globalThis.document = { ...(globalThis.document || {}), createElement: el, body: el(), head: el() };
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
let seed = 7; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const THREE = await import("three/webgpu");
const { tileData } = await imp("tools/gate/tileBuild.mjs");
const { Heightmap } = await imp("viewer/heightmap.js");
const { CityFalconWorld } = await imp("viewer/falconFlight/cityStream.js");
const { CityGymWorld, LEDGE_KINDS } = await imp("viewer/falconFlight/cityGymWorld.js");
const { FalconGame } = await imp("viewer/falconFlight/falconGame.js");
const { FlightControls } = await imp("viewer/falconFlight/flightModel.js");
const { driveHeight } = await imp("viewer/drive/colliders.js");
const { gardenInstancesGen, standinGeometries } = await imp("viewer/gardens/gardenKit.js");
const still = { sample: (x, y, z, t, o) => { o.x = 0; o.y = 0; o.z = 0; return o; } };
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); if (!QUIET || !ok) console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${info}`); };

// ------------------------------------------------------------------------------------------------ the tiles
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const base = pathToFileURL(join(ROOT, "data/tiles") + "/").href;
const SG = standinGeometries();
const kitJ = JSON.parse(readFileSync(join(ROOT, "models/facadekit/kit.json"), "utf8")), kitB = readFileSync(join(ROOT, "models/facadekit/kit.bin"));
const kitBuf = kitB.buffer.slice(kitB.byteOffset, kitB.byteOffset + kitB.byteLength);
/** the drawn top of a kit piece at z = out in its own frame (models/facadekit/kit.bin LOD0): the upper envelope of its
 *  vertices' (z, y) (the sill is an extrusion: only its end profiles have vertices), linearly between the profile's points;
 *  a railing: its handrail's top, the highest vertex in the band under the finials (which start at the posts' tops) */
function kitTop(piece, out, under = Infinity) {
  const s = kitJ.pieces[piece]?.lods[0]?.opaque; if (!s) return null;
  const P = new Float32Array(kitBuf, s.vOff, s.vCount * 3), top = new Map();
  for (let i = 0; i < s.vCount; i++) {
    const y = P[i * 3 + 1]; if (y >= under) continue;
    const z = Math.round(P[i * 3 + 2] * 2000) / 2000; top.set(z, Math.max(top.get(z) ?? -Infinity, y));
  }
  const zs = [...top.keys()].sort((a, b) => a - b);
  let lo = null, hi = null;
  for (const z of zs) { if (z <= out) lo = z; if (z >= out && hi == null) hi = z; }
  if (lo == null || hi == null) return null;
  if (hi === lo) return top.get(lo);
  return top.get(lo) + (top.get(hi) - top.get(lo)) * (out - lo) / (hi - lo);
}
const tiles = [], truthRoof = [];
const log0 = console.log;
for (const T of TILES) {
  const m = manifest.tiles.find((t) => t.name === T); if (!m) continue;
  const entry = { ...entries.find((e) => !e.lite).entry, ...m, cache: false };
  console.log = () => {};
  const d = await tileData(entry, base);
  console.log = log0;
  const hm = Heightmap.from(d.hdr, d.y, d.orig), b = d.bounds;
  const group = new THREE.Group(); group.name = `features-${T}`;
  // the front gardens' stand-ins (cityGardens.js: furniture-gardenwall / -pillar / -gate / -hedge, unit boxes, never drawn)
  const gp = join(ROOT, "data/gardens", `${T}.json`);
  if (existsSync(gp)) {
    const doc = JSON.parse(readFileSync(gp, "utf8"));
    const gen = gardenInstancesGen(doc, (x, z) => driveHeight(hm, d.drive.ground, x, z), { hedgeFronts: true, hedges: true });
    let r; while (!(r = gen.next()).done);
    const g = r.value, hf = g.stand.hedgeFrom ?? g.stand.wall.length;
    const stand = { wall: g.stand.wall.slice(0, hf), hedge: g.stand.wall.slice(hf), pillar: g.stand.pillar, gate: g.stand.gate };
    const M = new THREE.Matrix4();
    for (const [k, nm] of [["wall", "furniture-gardenwall"], ["hedge", "furniture-gardenhedge"], ["pillar", "furniture-gardenpillar"], ["gate", "furniture-gardengate"]]) {
      const a = stand[k]; if (!a.length) continue;
      const mesh = new THREE.InstancedMesh(SG[k === "hedge" ? "wall" : k], new THREE.MeshBasicNodeMaterial(), a.length / 16);
      for (let i = 0; i < a.length / 16; i++) { M.fromArray(a, i * 16); mesh.setMatrixAt(i, M); }
      mesh.name = nm; mesh.visible = false; group.add(mesh);
    }
  }
  group.updateMatrixWorld(true);
  tiles.push({ name: T, bounds: b, hm, roofs: d.roofs, kit: d.buildings.kit, roofCols: d.buildings.roofKit?.cols ?? null, drive: d.drive, feats: d.feats, drawn: { lamps: [] }, groups: [group], d });
  // the drawn roof triangles (buildings.bin), 4 m buckets, for the truth
  const bj = JSON.parse(readFileSync(join(ROOT, "data/tiles", m.files.buildings.split("?")[0]), "utf8")), bb = readFileSync(join(ROOT, "data/tiles", m.files.buildingsBin.split("?")[0]));
  const buf = bb.buffer.slice(bb.byteOffset, bb.byteOffset + bb.byteLength), dv = new DataView(buf), V = dv.getUint32(0, true), Tn = dv.getUint32(4, true);
  const P = new Float32Array(buf, 8, V * 3), I = new Uint32Array(buf, 8 + V * 12, Tn * 3), tris = [];
  for (const bd of bj.buildings) if (bd.roof) for (let t = bd.roof.first; t < bd.roof.first + bd.roof.count; t++) tris.push(t);
  // (the truth: the DRAWN roof triangles, d.buildings.roofs, after the worker's roof work; buildings.bin's own for the ridges)
  const DP = d.buildings.roofs.position, DI = new Uint32Array(DP.length / 3), dtris = [];
  for (let k = 0; k < DI.length; k++) DI[k] = k;
  for (let t = 0; t < DI.length / 3; t++) dtris.push(t);
  truthRoof.push({ b, P: DP, I: DI, tris: dtris, cell: new Map(), doc: bj, binP: P, binI: I });
}
const TR = truthRoof;
// the street lamps as the city places them (viewer/lamps.js: on the sidewalk, 12 cm over the kerb line) and the lamp
// model's lantern cap (viewer/birds/cityBirds.js lampTop: the highest iron vertex within 12 cm of the lantern's axis)
const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { loadLampModel } = await imp("viewer/lampModel.js");
const LM = await loadLampModel().catch(() => null);
let LAMP_TOP = null, LAMP_V = null;
if (LM?.lods?.[0]) {
  const glass = LM.lods[0].glass, iron = LM.lods[0].iron;
  glass.computeBoundingBox();
  const gb = glass.boundingBox, gx = (gb.min.x + gb.max.x) / 2, gz = (gb.min.z + gb.max.z) / 2, P = iron.attributes.position;
  let top = gb.max.y;
  let cap = gb.max.y;
  for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i) - gx, P.getZ(i) - gz); if (r < 0.12) top = Math.max(top, P.getY(i)); if (r < 0.03) cap = Math.max(cap, P.getY(i)); }
  LAMP_TOP = { x: gx, y: top + 0.005, z: gz, n: 1, cap };
  LAMP_V = [iron.attributes.position, glass.attributes.position];
}
for (const t of tiles) {
  const d = t.d, fit = d.road?.surfaceData ? streetFit(d.road.surfaceData) : null;
  t.drawn.lamps = placedLampSites(d.roads, t.bounds, fit?.placeLamp).map((q) => ({ x: q.x, z: q.z, yaw: q.yaw || 0, y: driveHeight(t.hm, t.drive.ground, q.x, q.z) + 0.12 }));
}
/** the lamp model's top under a lamp perch: the highest vertex within 3 cm of the point, in its lamp's frame */
function lampTruth(l) {
  let best = null, bd = 3;                                        // (the lantern hangs on an arm, up to ~1.5 m out)
  for (const t of tiles) for (const q of t.drawn.lamps) { const d = Math.hypot(q.x - l.x, q.z - l.z); if (d < bd) { bd = d; best = q; } }
  if (!best || !LAMP_V) return -Infinity;
  const c = Math.cos(best.yaw), sn = Math.sin(best.yaw), dx = l.x - best.x, dz = l.z - best.z;
  const lx = dx * c - dz * sn, lz = dx * sn + dz * c;            // (the inverse of x' = x c + z s, z' = -x s + z c)
  if (process.env.DEBUGLAMP) log0("lamp", lx.toFixed(3), lz.toFixed(3), JSON.stringify(LAMP_TOP));
  let top = -Infinity;
  for (const P of LAMP_V) for (let i = 0; i < P.count; i++) if (Math.hypot(P.getX(i) - lx, P.getZ(i) - lz) < 0.03) top = Math.max(top, P.getY(i));
  return best.y + top;
}
for (const R of TR) for (const t of R.tris) {
  const { P, I } = R; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let c = 0; c < 3; c++) { const v = I[t * 3 + c] * 3; x0 = Math.min(x0, P[v]); x1 = Math.max(x1, P[v]); z0 = Math.min(z0, P[v + 2]); z1 = Math.max(z1, P[v + 2]); }
  for (let i = Math.floor(x0 / 4); i <= Math.floor(x1 / 4); i++) for (let j = Math.floor(z0 / 4); j <= Math.floor(z1 / 4); j++) { const k = i * 100000 + j; if (!R.cell.has(k)) R.cell.set(k, []); R.cell.get(k).push(t); }
}
/** the drawn roof's height at (x, z): the highest roof triangle over the point (-Infinity: none) */
function roofTruth(x, z) {
  let h = -Infinity;
  for (const R of TR) {
    const L = R.cell.get(Math.floor(x / 4) * 100000 + Math.floor(z / 4)); if (!L) continue;
    const { P, I } = R;
    for (const t of L) {
      const a = I[t * 3] * 3, c = I[t * 3 + 1] * 3, e = I[t * 3 + 2] * 3;
      const ax = P[a], az = P[a + 2], bx = P[c], bz = P[c + 2], cx = P[e], cz = P[e + 2];
      const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(den) < 1e-9) continue;
      const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den, w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den, w3 = 1 - w1 - w2;
      if (w1 < -1e-5 || w2 < -1e-5 || w3 < -1e-5) continue;
      h = Math.max(h, w1 * P[a + 1] + w2 * P[c + 1] + w3 * P[e + 1]);
    }
  }
  return h;
}
const inv = new THREE.Matrix4(), MI = new THREE.Matrix4(), Wm = new THREE.Matrix4(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
/** the garden stand-ins' top face over (x, z): the highest box top whose top face is over the point (its own matrix) */
function furnTruth(x, z) {
  let h = -Infinity;
  for (const t of tiles) for (const m of t.groups[0].children) {
    if (!m.isInstancedMesh) continue;
    const bb = m.geometry.boundingBox || (m.geometry.computeBoundingBox(), m.geometry.boundingBox);
    for (let i = 0; i < m.count; i++) {
      m.getMatrixAt(i, MI); Wm.multiplyMatrices(m.matrixWorld, MI);
      const e = Wm.elements; if (Math.abs(e[12] - x) > 6 || Math.abs(e[14] - z) > 6) continue;
      inv.copy(Wm).invert();
      // a vertical line through (x, z) in the box's frame: local = inv (x, t, z); local y linear in t
      vA.set(x, 0, z).applyMatrix4(inv); vB.set(x, 1, z).applyMatrix4(inv);
      const dy = vB.y - vA.y; if (Math.abs(dy) < 1e-9) continue;
      const t = (bb.max.y - vA.y) / dy, lx = vA.x + (vB.x - vA.x) * t, lz = vA.z + (vB.z - vA.z) * t;
      if (lx < bb.min.x - 1e-4 || lx > bb.max.x + 1e-4 || lz < bb.min.z - 1e-4 || lz > bb.max.z + 1e-4) continue;
      h = Math.max(h, t);
    }
  }
  return h;
}
// (the handrail: its profile's top 0.954 / 0.974; the finials over the posts start 0.95 / 0.97 with their lathe: under 0.956 / 0.976)
// the garden stand-ins in 4 m buckets (for the "inside" truth: the drawn solids)
const FB = new Map();
for (const t of tiles) for (const m of t.groups[0].children) {
  if (!m.isInstancedMesh) continue;
  for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, MI); const k = Math.floor(MI.elements[12] / 4) * 100000 + Math.floor(MI.elements[14] / 4); if (!FB.has(k)) FB.set(k, []); FB.get(k).push([m, i]); }
}
const furnTruthFast = (x, z) => {
  let h = -Infinity;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const L = FB.get((Math.floor(x / 4) + di) * 100000 + Math.floor(z / 4) + dj); if (!L) continue;
    for (const [m, i] of L) {
      const bb = m.geometry.boundingBox || (m.geometry.computeBoundingBox(), m.geometry.boundingBox);
      m.getMatrixAt(i, MI); Wm.multiplyMatrices(m.matrixWorld, MI); inv.copy(Wm).invert();
      vA.set(x, 0, z).applyMatrix4(inv); vB.set(x, 1, z).applyMatrix4(inv);
      const dy = vB.y - vA.y; if (Math.abs(dy) < 1e-9) continue;
      const t = (bb.max.y - vA.y) / dy, lx = vA.x + (vB.x - vA.x) * t, lz = vA.z + (vB.z - vA.z) * t;
      if (lx < bb.min.x || lx > bb.max.x || lz < bb.min.z || lz > bb.max.z) continue;
      h = Math.max(h, t);
    }
  }
  return h;
};
const colTop = (x, z) => { let h = -Infinity; for (const t of tiles) { const C = t.roofCols; for (let k = 0; C && k < C.length; k += 5) if (x >= C[k] && x <= C[k + 2] && z >= C[k + 1] && z <= C[k + 3]) h = Math.max(h, C[k + 4]); } return h; };
// the buildings' footprints (buildings.json rings, even-odd), 4 m buckets; the façade kit's openings (the wall is cut there:
// a window's reveal, a door) as boxes 0.25 m deep behind the wall plane
const FP = new Map(), OPEN = new Map();
for (const R of TR) for (const bd of R.doc.buildings) {
  const rings = (bd.footprint || []).filter((r) => r?.length > 2); if (!rings.length) continue;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const r of rings) for (const [x, z] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  for (let i = Math.floor(x0 / 4); i <= Math.floor(x1 / 4); i++) for (let j = Math.floor(z0 / 4); j <= Math.floor(z1 / 4); j++) { const k = i * 100000 + j; if (!FP.has(k)) FP.set(k, []); FP.get(k).push(rings); }
}
for (const t of tiles) for (const [nm, A] of Object.entries(t.kit?.pieces || {})) {
  if (!/^(win|frenchWin|bay|door|garage)/.test(nm)) continue;
  for (let o = 0; o < A.length; o += 14) { const k = Math.floor(A[o] / 4) * 100000 + Math.floor(A[o + 2] / 4); if (!OPEN.has(k)) OPEN.set(k, []); OPEN.get(k).push([A[o], A[o + 1], A[o + 2], A[o + 3], A[o + 4], A[o + 5], A[o + 6]]); }
}
function inRings(rings, x, z) {
  let inside = false;
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function inOpening(x, y, z) {
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const [ox, oy, oz, nx, nz, w, h] of OPEN.get((Math.floor(x / 4) + di) * 100000 + Math.floor(z / 4) + dj) || []) {
    const dx = x - ox, dz = z - oz, d = dx * nx + dz * nz, u = dx * nz - dz * nx;
    if (Math.abs(u) < w / 2 + 0.02 && y > oy - 0.02 && y < oy + h && d > -0.25 && d < 0.03) return true;
  }
  return false;
}
/** a DRAWN solid at (x, y, z): the ground, a building (in its footprint, under its roof, not in a window's / a door's
 *  opening), a roof kit box, a garden stand-in */
function solidAt(x, y, z) {
  const t = tileOf(x, z);
  if (t && y < driveHeight(t.hm, t.drive.ground, x, z) - 0.02) return (solidAt.why = "ground"), true;
  const ct = colTop(x, z);                                         // (a roof kit box: from the roof under it up to its top)
  if (y < ct - 0.02 && y > roofTruth(x, z) - 0.05) return (solidAt.why = "col"), true;
  if (y < furnTruthFast(x, z) - 0.02) return (solidAt.why = "furn"), true;
  solidAt.why = "building";
  const rt = roofTruth(x, z);
  if (y < rt - 0.02 && (FP.get(Math.floor(x / 4) * 100000 + Math.floor(z / 4)) || []).some((r) => inRings(r, x, z)) && !inOpening(x, y, z)) return true;
  return false;
}
const SILL_TOP = kitTop("sill", 0.068), RAIL_TOP = { balcony: kitTop("balcony", 0.43, 0.9555), balconnet: kitTop("balconnet", 0.17, 0.9755) };
/** the kit piece under a sill / railing perch: its drawn top there */
function kitTruth(t0, l) {
  let best = -Infinity, bd = 0.2;
  // (every tile's kit: a façade on a tile's edge is placed by the tile that owns the building)
  for (const t of tiles) { const K = t.kit?.pieces; if (!K) continue;
  for (const [nm, out, top] of [["sill", 0.068, SILL_TOP], ["balcony", 0.43, RAIL_TOP.balcony], ["balconyP", 0.43, RAIL_TOP.balcony], ["balconnet", 0.17, RAIL_TOP.balconnet], ["balconnetP", 0.17, RAIL_TOP.balconnet]]) {
    const A = K[nm]; if (!A || top == null) continue;
    for (let o = 0; o < A.length; o += 14) {
      const x = A[o] + A[o + 3] * out, z = A[o + 2] + A[o + 4] * out, d = Math.hypot(x - l.x, z - l.z, A[o + 1] + top - l.y);
      if (d < bd) { bd = d; best = A[o + 1] + top; }
    }
  } }
  return best;
}
const tileOf = (x, z) => tiles.find((t) => x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1);
/** the drawn top under a perch, from its own geometry */
function truth(l, kind) {
  const t = tileOf(l.x, l.z); if (!t) return null;
  if (kind === "sill" || kind === "railing") return kitTruth(t, l);
  if (kind === "wall" || kind === "pillar" || kind === "hedge") return furnTruth(l.x, l.z);
  if (kind === "chimney") return colTop(l.x, l.z);
  if (kind === "roof edge" || kind === "ridge") return roofTruth(l.x, l.z);
  if (kind === "lamp") return lampTruth(l);
  return driveHeight(t.hm, t.drive.ground, l.x, l.z);
}

// ------------------------------------------------------------------------------------------------ the worlds
const { ridgePoints } = await imp("viewer/falconFlight/ridgeScan.js");
function cityWorld(old) {
  const city = { tiles, decks: [], deckY: () => null };
  const w = new CityFalconWorld({ city, manifest, base, hide: [], log: () => {} });
  w.lampTop = LAMP_TOP;
  // (the worker's ridges job, in node: ridgeScan.js over the tiles' buildings.json / .bin)
  w.ridgesNear = async (x, z, R) => { const out = []; for (const T of TR) ridgePoints(T.doc, T.binP, T.binI, { x, z }, R, new Set(), 0, out); return new Float32Array(out); };
  if (!old) { w.syncFurniture(); for (let k = 0; k < 100000 && w.furnStep(5000) > 0; k++); }
  else {
    // (self-test: round 4's world: the DTM ground, no furniture)
    w.drawnGround = (x, z) => (w.tileAt(x, z) || w.nearest(x, z)).hm.ground(x, z);
  }
  return w;
}
const W = cityWorld(false);

// the perches round each tile: the pool rebuilt on a grid of centres, unique by position, up to NPK a kind a tile
const perches = [], seen = new Set(), byKind = {};
const gw0 = new CityGymWorld(W);
for (const t of tiles) {
  const b = t.bounds, mine = {};
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const cx = b.x0 + (i + 0.5) * (b.x1 - b.x0) / 4, cz = b.z0 + (j + 0.5) * (b.z1 - b.z0) / 4;
    gw0.rebuild(cx, cz); await new Promise((r) => setTimeout(r, 0)); gw0.rebuild(cx, cz);
    for (const l of gw0.ledges) {
      if (l.k < 0 || !tileOf(l.x, l.z) || tileOf(l.x, l.z) !== t) continue;
      const key = `${Math.round(l.x * 10)},${Math.round(l.z * 10)},${Math.round(l.y * 10)}`;
      if (seen.has(key) || (mine[l.kind] ?? 0) >= NPK) continue;
      seen.add(key); mine[l.kind] = (mine[l.kind] ?? 0) + 1; byKind[l.kind] = (byKind[l.kind] ?? 0) + 1;
      perches.push({ x: l.x, y: l.y, z: l.z, yaw: l.yaw, kind: l.kind, k: l.k, tile: t.name });
    }
  }
}

// the ground: points on the drawn ground (a street, a sidewalk, a garden), checked as the pool checks a perch
for (const t of tiles) {
  let n = 0;
  for (let k = 0; k < 400 && n < NPK; k++) {
    const x = t.bounds.x0 + 20 + Math.random() * (t.bounds.x1 - t.bounds.x0 - 40), z = t.bounds.z0 + 20 + Math.random() * (t.bounds.z1 - t.bounds.z0 - 40);
    const y = W.column(x, z, 1e4).floor, yaw = Math.random() * 6.283;
    if (Math.abs(y - W.drawnGround(x, z)) > 0.005 || !gw0.perchOK(x, y, z, yaw, 12)) continue;
    perches.push({ x, y, z, yaw, kind: "ground", k: -1, tile: t.name }); byKind.ground = (byKind.ground ?? 0) + 1; n++;
  }
}

// ------------------------------------------------------------------------------------------------ the birds (the real rigs)
const { register } = await import("node:module");
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { if (s === "meshoptimizer/simplifier") return { url: "data:text/javascript," + encodeURIComponent("export const MeshoptSimplifier = { ready: Promise.resolve(), simplify: (i) => [i, 0] };"), shortCircuit: true }; return n(s, c); }`));
THREE.TextureLoader.prototype.loadAsync = async function () { return new THREE.Texture(); };
const warn = console.error; console.error = () => {}; console.warn = () => {};
const { loadFalconAssets } = await imp("viewer/falcons.js");
const { FalconBird } = await imp("viewer/falconFlight/falconBird.js");
const { GymBird } = await imp("viewer/falconGym/gymBird.js");
const A = await loadFalconAssets();
const ktx2 = { load(u, ok) { ok(new THREE.Texture()); }, loadAsync: async () => new THREE.Texture(), setPath() { return this; } };
const BIRDS = { current: new FalconBird(A, 1.0), v2: await GymBird.create("v2", 1.0, null, "juvenile", { ktx2 }) };
console.error = warn;
const LEG = /Leg|Foot|Toe|Digit|Tars/i, TOE = /Toe|Digit|Foot/i;
function parts(b) {
  const meshes = b.meshes || [b.mesh], body = [], toes = [];
  for (const m of meshes) {
    const SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight, n = m.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) {
      let mb = -1, mw = 0; for (let c = 0; c < 4; c++) { const w = SW.getComponent(i, c); if (w > mw) { mw = w; mb = SI.getComponent(i, c); } }
      const nm = m.skeleton.bones[mb].name;
      if (TOE.test(nm)) toes.push([m, i]); else if (!LEG.test(nm) && i % 3 === 0) body.push([m, i]);
    }
  }
  return { body, toes };
}
const PARTS = { current: parts(BIRDS.current), v2: parts(BIRDS.v2) };
const v = new THREE.Vector3(), up = new THREE.Vector3();
/** the bird perched at pos facing yaw (60 frames to settle its clips): the toe pads' lowest point, body vertices inside
 *  the world's solids, the tilt of its up */
function perchedPose(which, pos, yaw, world) {
  const b = BIRDS[which], f = { heading: yaw, gamma: 0, alpha: 0, phi: 0, fold: 0, flapLevel: 0, brake: 0, V: 0, walkV: 0 };
  b.setSpan(1.0);
  for (let k = 0; k < 60; k++) b.pose(1 / 60, pos, f, { mode: "perch", perchYaw: yaw });
  b.root.updateMatrixWorld(true);
  const meshes = b.meshes || [b.mesh]; for (const m of meshes) m.skeleton.update();
  let pad = Infinity, inside = 0;
  for (const [m, i] of PARTS[which].toes) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); pad = Math.min(pad, v.y); }
  for (const [m, i] of PARTS[which].body) {
    m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld);
    // (inside a DRAWN solid: the roofs' triangles, the roof kit's boxes, the garden stand-ins, the ground; a wall face:
    // the building's roof over the vertex within its footprint)
    if (solidAt(v.x, v.y, v.z)) { inside++; if (process.env.DEBUGIN && inside < 4) { const q = v.clone().sub(pos); const c = Math.cos(yaw), sn = Math.sin(yaw); log0(`  in ${globalThis.__pk} ${solidAt.why} ${which} ${m.skeleton.bones[m.geometry.attributes.skinIndex.getX(i)].name}: ahead ${(-q.x * sn - q.z * c).toFixed(2)} side ${(q.x * c - q.z * sn).toFixed(2)} up ${q.y.toFixed(2)}`); } }
  }
  // the body's up: the hips to the head's line is the pose's own; the ROOT's up is the body frame's
  up.set(0, 1, 0).applyQuaternion(b.root.quaternion);
  return { pad, inside, tilt: Math.acos(Math.min(1, up.y)) * 57.3 };
}

// ------------------------------------------------------------------------------------------------ the landings
function fakeBird() { return { prey: null, downstroke: false, setSpan() {}, pose() {}, carry() {}, drop() {} }; }
function fakeInput() {
  const C = new FlightControls();
  return { C, intent: { turn: 0, vert: 0, climb: 0, stoop: 0, half: 0, brake: 0, aim: null }, aim: { yaw: 0, pitch: 0 }, talons: false, actions: new Set(), script: null,
    update() { return C; }, take(a) { const h = this.actions.has(a); this.actions.delete(a); return h; }, syncAim() {} };
}
/** one landing: ctl gym (E, the perch preferred) or current (its landing onto it); the bird's feet when perched */
function land(ctl, p, world) {
  const gw = new CityGymWorld(world);
  { const out = []; for (const T of TR) ridgePoints(T.doc, T.binP, T.binI, { x: p.x, z: p.z }, 90, new Set(), 0, out); gw.ridgePts = new Float32Array(out); gw.ridgeAt = { x: p.x, z: p.z }; }
  gw.rebuild(p.x, p.z);                                              // (its pads: the sills, the railings)
  const g = new FalconGame({ world, air: still, bird: fakeBird(), pigeons: null, fam: null, audio: null, input: fakeInput(), ctl, gymWorld: ctl === "gym" ? gw : null });
  // from 14 m back along the perch's facing (+ a little to the side) and 3 m over it, flying at it at 9 m/s
  // (the start: in free air with a clear line to the perch: the first of 12 directions round its facing that has one)
  let sx = 0, sz = 0;
  for (let k = 0; k < 12; k++) {
    const a = p.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6;
    sx = p.x + Math.sin(a) * 14; sz = p.z + Math.cos(a) * 14;
    let free = world.column(sx, sz, p.y + 3).floor < p.y + 1;
    for (let s = 0.1; free && s < 0.9; s += 0.1) { const x = sx + (p.x - sx) * s, z = sz + (p.z - sz) * s, y = p.y + 3 - 2.4 * s; if (world.column(x, z, y).floor > y - 0.5) free = false; }
    if (free) break;
  }
  const hd = Math.atan2(-(p.x - sx), -(p.z - sz));
  g.start(sx, p.y + 3, sz, hd, 9, -0.1);
  const q = { name: p.kind, pos: new THREE.Vector3(p.x, p.y, p.z), yaw: p.yaw, ledge: true };
  if (ctl === "gym") { g.f.prefer = () => q; g.input.actions.add("land"); } else g.beginLanding(q);
  for (let k = 0; k < 8 * 60 && g.mode !== "perch"; k++) g.update(1 / 60, null);
  if (g.mode !== "perch") return null;
  for (let k = 0; k < 30; k++) g.update(1 / 60, null);              // (settled: standing 0.5 s)
  const feet = g.pos.clone(), yaw = ctl === "gym" ? g.f.heading : g.perch.yaw;
  return { feet, yaw, off: Math.hypot(feet.x - p.x, feet.z - p.z), stillPerched: g.mode === "perch" };
}

function run(world) {
  const R = { n: 0, landed: 0, gaps: [], bad: [], inside: 0, insideN: 0, tilt: 0, kinds: {} };
  for (const p of perches) {
    globalThis.__pk = p.kind + "@" + p.x.toFixed(1) + "," + p.z.toFixed(1);
    const top = truth(p, p.kind);
    if (top == null || !Number.isFinite(top)) { R.bad.push(`notop ${p.kind}@${p.tile} (${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)}) no drawn top`); continue; }
    for (const ctl of ["gym", "current"]) {
      const L = land(ctl, p, world); R.n += 2;
      if (!L || L.off > 0.3) { R.bad.push(`${ctl} ${p.kind}@${p.tile} (${p.x.toFixed(1)},${p.z.toFixed(1)}) ${L ? `landed ${L.off.toFixed(2)} m off` : "did not land"}`); continue; }
      for (const which of ["current", "v2"]) {
        const P = perchedPose(which, L.feet, L.yaw, world), gap = P.pad - top;
        R.landed++; R.gaps.push(gap); R.kinds[p.kind] = (R.kinds[p.kind] ?? 0) + 1;
        if (P.inside > 0) { R.insideN++; R.inside += P.inside; }
        R.tilt = Math.max(R.tilt, P.tilt);
        if (gap < -0.005 || gap > 0.01 || P.inside > 0 || P.tilt > 15) R.bad.push(`${ctl}/${which} ${p.kind}@${p.tile} (${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)}): gap ${(gap * 100).toFixed(1)} cm, inside ${P.inside}, tilt ${P.tilt.toFixed(0)}`);
      }
    }
  }
  return R;
}
if (args.includes("--probe")) {
  const [px, py, pz] = arg("--probe").split(",").map(Number);
  for (const [dx, dz] of [[0, 0], [0.15, 0], [-0.15, 0], [0, 0.15], [0, -0.15], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
    const x = px + dx, z = pz + dz, c = W.column(x, z, py + 0.2);
    log0(`(${dx},${dz}) world floor ${c.floor.toFixed(2)} furn ${c.furn} | truth: roof ${roofTruth(x, z).toFixed(2)} furn ${furnTruthFast(x, z).toFixed(2)} col ${colTop(x, z).toFixed(2)} fp ${(FP.get(Math.floor(x / 4) * 100000 + Math.floor(z / 4)) || []).some((r) => inRings(r, x, z))} solid@+0.2 ${solidAt(x, py + 0.2, z)}`);
  }
  process.exit(0);
}
const R = run(W);
const g = R.gaps, gmin = Math.min(...g), gmax = Math.max(...g);
check(`the perch pool offers the kinds round ${tiles.length} real tiles (${tiles.map((t) => t.name).join(" ")}): roof edges, ridges, chimneys, sills, railings, garden walls and pillars, lamps, the ground`, ["roof edge", "ridge", "chimney", "sill", "railing", "wall", "pillar", "lamp", "ground"].every((k) => (byKind[k] ?? 0) > 0), Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(", "));
check("100+ landings (both controllers x both models), every one ON the perch (< 0.3 m off)", R.landed >= 100 && !R.bad.some((s) => /did not land|m off/.test(s)), `${R.landed} landed poses of ${R.n} landings x 2 models; ${R.bad.filter((s) => /did not land|m off/.test(s)).slice(0, 6).join("; ") || "all on"}`);
check("the toe pads ON the drawn top: -5 mm .. 10 mm over it, every perch kind, both models", gmin >= -0.005 && gmax <= 0.01, `gap ${(gmin * 100).toFixed(1)} .. ${(gmax * 100).toFixed(1)} cm over ${g.length} poses (${Object.entries(R.kinds).map(([k, n]) => `${n} ${k}`).join(", ")}); ${R.bad.filter((s) => /gap/.test(s) && !/gap -0\.[0-5] cm|gap [0-9]\.[0-9] cm, inside 0, tilt [0-9] *$/.test(s)).slice(0, 5).join("; ")}`);
check("no body vertex inside the world's solids (a wall, a roof, the ground) when perched", R.insideN === 0, `${R.insideN} poses with ${R.inside} vertices inside`);
check("upright: the body's up within 15 deg of the vertical", R.tilt <= 15, `max ${R.tilt.toFixed(1)} deg`);
// self-test: round 4's world
const KITOLD = null;
const W0 = cityWorld(true);
const R0 = run(W0);
const bad0 = R0.gaps.filter((x) => x < -0.005 || x > 0.01).length + R0.insideN;
check("self-test: round 4's world (no garden walls, the DTM ground) fails the same landings", bad0 > 0, `${bad0} bad poses of ${R0.gaps.length}`);
const bad = results.filter((r) => !r.ok);
console.log(`falconperch: ${results.length - bad.length}/${results.length} PASS${bad.length ? ` (FAIL: ${bad.map((b) => b.name).join("; ")})` : ""}`);
if (!QUIET && R.bad.length) { const by = {}; for (const b of R.bad) { const k = b.split(" ")[1].split("@")[0]; (by[k] ??= []).push(b); } for (const [k, L] of Object.entries(by)) console.log(`bad ${k}: ${L.length}\n  ${L.slice(0, 3).join("\n  ")}`); for (const b of R.bad) { const m = /gap (-?[0-9.]+) cm/.exec(b); if (m && (+m[1] > 1 || +m[1] < -0.5)) console.log("BIG", b); } }
process.exit(bad.length ? 1 : 0);
