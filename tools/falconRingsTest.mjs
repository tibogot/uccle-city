// node --preserve-symlinks --import ./tools/road_audit/register.mjs --import ./tools/characters/threeHook.mjs tools/falconRingsTest.mjs [--quiet] [--bake]
// THE FALCON'S RING COURSES (gate row `falconrings`, rule falcon-rings): the courses of viewer/falconGame/ringCourses.js
// over the REAL city, headless:
//   the world   the tiles each course crosses, built by the tile worker's own code (the gate's tile cache) with the hero
//               models' UrbIS solids KEPT (their envelopes: the Saint-Pierre church, the Observatory stand there whole,
//               bigger than the models), the city's falcon world over them (cityStream.js: the drawn ground and roofs,
//               the church proxy), the street trees' crowns (falconWorker.js trees, the generic crown x1.3: wider than
//               the drawn ones)
//   --bake      writes data/falcon/rings.json: every course's rings, moved into free air (ringCourses.js buildCourse);
//               the game loads it (the rings are where this check says they are)
//   checks      every baked ring in free air (its centre and rim, 0.4 m margin), the avenue's under the tram wires
//               (top <= 5.5 m over the street), the rings' sizes; a scripted flight completes every course with BOTH
//               controllers (the gym's and the current), in order, inside the bronze time; the run's ghost recorded
//               and replayed (its positions on the flown path); the view's budget (one instanced mesh + one material for
//               the rings, one mesh for the ghost, no light, the instance buffer static); self-test: the rings as
//               sunk into the floor under them are all caught
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2), QUIET = args.includes("--quiet"), BAKE = args.includes("--bake"), TRACE = args.includes("--trace");
globalThis.location = { search: "" };
globalThis.self ??= globalThis;                    // (falconWorker.js sets self.onmessage)
const el = () => ({ style: { setProperty() {} }, append() {}, classList: { add() {}, remove() {}, toggle() {} } });
if (!globalThis.document?.body) globalThis.document = { ...(globalThis.document || {}), createElement: el, body: el(), head: el() };
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
let seed = 3; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const THREE = await import("three/webgpu");
const { tileData } = await imp("tools/gate/tileBuild.mjs");
const { Heightmap } = await imp("viewer/heightmap.js");
const { CityFalconWorld } = await imp("viewer/falconFlight/cityStream.js");
const { trees } = await imp("viewer/falconFlight/falconWorker.js");
const RC = await imp("viewer/falconGame/ringCourses.js");
const { COURSES, buildCourse, ringClear, RingRun, ghostAt, medalOf } = RC;
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null, PROBE = args.includes("--probe");
const COURSE_IDS = RC.COURSE_IDS.filter((id) => !ONLY || ONLY.includes(id));
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); if (!QUIET || !ok) console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${info}`); };

// ------------------------------------------------------------------------------------------------ the tiles
const entries = JSON.parse(readFileSync(join(ROOT, "tools/boot3/entries.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const base = pathToFileURL(join(ROOT, "data/tiles") + "/").href;
/** a course's footprint (x0, z0, x1, z1) + 120 m */
function bboxOf(def) {
  const P = def.kind === "air" ? [def.from, def.to] : def.kind === "street" ? def.path : [def.at, [def.at[0] + def.off[0] * 5, def.at[1] + def.off[1] * 5]];
  const xs = P.map((p) => p[0]), zs = P.map((p) => p[1]);
  return [Math.min(...xs) - 120 - (def.sway || 0), Math.min(...zs) - 120 - (def.sway || 0), Math.max(...xs) + 120 + (def.sway || 0), Math.max(...zs) + 120 + (def.sway || 0)];
}
/** the tiles a course's corridor crosses (the air course: a 200 m band along its line) */
function tilesOf(def) {
  const [x0, z0, x1, z1] = bboxOf(def);
  return manifest.tiles.filter((t) => {
    if (t.status !== "built" || t.bounds.x[1] < x0 || t.bounds.x[0] > x1 || t.bounds.z[1] < z0 || t.bounds.z[0] > z1) return false;
    if (def.kind !== "air") return true;
    const [ax, az] = def.from, [bx, bz] = def.to, cx = (t.bounds.x[0] + t.bounds.x[1]) / 2, cz = (t.bounds.z[0] + t.bounds.z[1]) / 2;
    const L = Math.hypot(bx - ax, bz - az), s = Math.max(0, Math.min(1, ((cx - ax) * (bx - ax) + (cz - az) * (bz - az)) / (L * L)));
    return Math.hypot(ax + (bx - ax) * s - cx, az + (bz - az) * s - cz) < 250 + 360;
  }).map((t) => t.name);
}
const GENERIC = { V: new Float32Array([0, 0, 8.2, 4.5 * 1.3, 3.0 * 1.3, 0.5]), nVar: 1, H: 12 };
const built = new Map();
const log0 = console.log;
async function tile(T) {
  if (built.has(T)) return built.get(T);
  const m = manifest.tiles.find((t) => t.name === T);
  // (the hero models' solids KEPT: their envelopes stand in for the models, bigger than them)
  const entry = { ...entries.find((e) => !e.lite).entry, ...m, hide: [], cache: false };
  console.log = () => {};
  const d = await tileData(entry, base);
  console.log = log0;
  const hm = Heightmap.from(d.hdr, d.y, d.orig), b = d.bounds;
  const t = { name: T, bounds: b, hm, roofs: d.roofs, kit: d.buildings.kit, drive: d.drive, feats: d.feats, drawn: { lamps: [] }, groups: [], roofCols: d.buildings.roofKit?.cols ?? null };
  // the street trees' crowns (the tile's placements, falconWorker.js trees, the generic crown x1.3)
  const list = (d.feats.trees || []).filter((q) => q.x >= b.x0 && q.x <= b.x1 && q.z >= b.z0 && q.z <= b.z1);
  const pts = new Float32Array(list.length * 4);
  list.forEach((q, i) => pts.set([q.x, q.z, q.y ?? hm.ground(q.x, q.z), q.height ?? 9], i * 4));
  t.treeGrid = trees({ pts, V: GENERIC.V, nVar: 1, H: GENERIC.H, x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 });
  built.set(T, t);
  return t;
}
async function worldFor(def) {
  const names = tilesOf(def), ts = [];
  for (const n of names) ts.push(await tile(n));
  const city = { tiles: ts, decks: [], deckY: () => null };
  const w = new CityFalconWorld({ city, manifest, base, hide: [], log: () => {} });
  w.treeList = ts.map((t) => t.treeGrid).filter((g) => g && g.n);
  return w;
}

// ------------------------------------------------------------------------------------------------ bake / load
const BAKED = join(ROOT, "data/falcon/rings.json");
const worlds = {}, courses = {};
for (const id of COURSE_IDS) {
  const def = COURSES[id], w = await worldFor(def);
  worlds[id] = w;
  const c = buildCourse(def, w);
  courses[id] = c;
  if (PROBE) for (const q of buildCourse(def, { column: () => ({ floor: -1e9, ceil: Infinity }), floor: (x, z) => w.floor(x, z), ground: (x, z) => w.ground(x, z), drawnGround: (x, z) => w.drawnGround(x, z) }).rings) {
    const c0 = w.column(q.x, q.z, q.y), g = w.drawnGround(q.x, q.z);
    console.log(`  probe ${id} (${q.x.toFixed(1)}, ${q.y.toFixed(1)}, ${q.z.toFixed(1)}) r ${q.r} ground ${g.toFixed(1)} floor ${c0.floor.toFixed(1)} ceil ${c0.ceil.toFixed(1)} tree ${c0.tree ?? c0.ceilTree ?? "-"} furn ${c0.furn ?? "-"} clear ${ringClear(w, q)}`);
    if (!ringClear(w, q)) { const ax = -q.nz, az = q.nx, l = Math.hypot(ax, az) || 1; for (let k = 0; k < 12; k++) { const t = k * Math.PI / 6, R = q.r * 1.06 + 0.3, x = q.x + R * Math.cos(t) * ax / l, y = q.y + R * Math.sin(t), z = q.z + R * Math.cos(t) * az / l, cc = w.column(x, z, y); if (cc.floor > y - 0.4 || cc.ceil < y + 0.4) console.log(`     rim ${k} y ${y.toFixed(1)} floor ${cc.floor.toFixed(2)} ceil ${cc.ceil.toFixed(1)} tree ${cc.tree ?? "-"} ceilTree ${cc.ceilTree ?? "-"} ground ${w.drawnGround(x, z).toFixed(2)} roof ${w.roof?.(x, z)?.toFixed?.(1)}`); } }
  }
  if (TRACE) console.log(id, "tiles", tilesOf(def).join(" "), "rings", c.rings.length, "dropped", c.dropped, "moved", c.moved);
}
if (BAKE) {
  mkdirSync(join(ROOT, "data/falcon"), { recursive: true });
  const out = { _doc: "the falcon's ring courses, baked by tools/falconRingsTest.mjs --bake over the real tiles (rule falcon-rings): x, y, z, nx, ny, nz, r per ring; start: x, y, z, heading, V", version: 1, courses: existsSync(BAKED) ? JSON.parse(readFileSync(BAKED, "utf8")).courses : {} };
  for (const id of COURSE_IDS) { const c = courses[id]; out.courses[id] = { rings: c.rings.map((q) => [q.x, q.y, q.z, q.nx, q.ny, q.nz, q.r].map((v) => +v.toFixed(3))), start: Object.fromEntries(Object.entries(c.start).map(([k, v]) => [k, +(+v).toFixed(3)])), dropped: c.dropped }; }
  writeFileSync(BAKED, JSON.stringify(out, null, 1));
  console.log(`baked ${BAKED}: ${COURSE_IDS.map((id) => `${id} ${courses[id].rings.length} rings`).join(", ")}`);
}
const baked = existsSync(BAKED) ? JSON.parse(readFileSync(BAKED, "utf8")) : null;
check("the baked courses exist (data/falcon/rings.json) and match a build over today's tiles", !!baked && COURSE_IDS.every((id) => baked.courses[id]?.rings.length === courses[id].rings.length && baked.courses[id].rings.every((r, k) => Math.hypot(r[0] - courses[id].rings[k].x, r[1] - courses[id].rings[k].y, r[2] - courses[id].rings[k].z) < 0.05)), COURSE_IDS.map((id) => `${id} ${baked?.courses[id]?.rings.length ?? "-"} / ${courses[id].rings.length}`).join(", "));
const ringsOf = (id) => (baked?.courses[id] ?? { rings: [] }).rings.map(([x, y, z, nx, ny, nz, r]) => ({ x, y, z, nx, ny, nz, r }));
const startOf = (id) => baked?.courses[id]?.start ?? courses[id].start;

// ------------------------------------------------------------------------------------------------ the rings in free air
for (const id of COURSE_IDS) {
  const R = ringsOf(id), w = worlds[id], def = COURSES[id];
  const bad = R.filter((q) => !ringClear(w, q));
  const wires = def.kind === "street" ? R.filter((q) => q.y + q.r > w.drawnGround(q.x, q.z) + def.wireTop + 0.01) : [];
  check(`${id}: every ring in free air (its centre and rim, 0.4 m off any roof, landmark envelope, crown), ${def.kind === "street" ? "its top under the tram wires (<= 5.5 m over the street), " : ""}>= 6 rings`, R.length >= 6 && !bad.length && !wires.length, `${R.length} rings (${courses[id].dropped} dropped, ${courses[id].moved} moved into free air), radii ${Math.min(...R.map((q) => q.r))}-${Math.max(...R.map((q) => q.r))} m${bad.length ? `; in geometry: ${bad.slice(0, 3).map((q) => `(${q.x.toFixed(0)},${q.y.toFixed(0)},${q.z.toFixed(0)})`).join(" ")}` : ""}${wires.length ? `; over the wires: ${wires.length}` : ""}`);
}
{
  // self-test: the free-air check sees the city: every ring sunk to half its radius over the floor under it (a roof, a
  // crown, the street) and every ring moved 12 m sideways at the street's height (into the façades and the crowns of
  // the avenue's sides, or still free over a square) - the sunk ones must ALL be caught
  let sunk = 0, n = 0;
  for (const id of COURSE_IDS) for (const q of ringsOf(id)) { n++; const w = worlds[id]; if (!ringClear(w, { ...q, y: w.column(q.x, q.z, q.y).floor + q.r * 0.5 })) sunk++; }
  check("self-test: the free-air check sees the city (every ring sunk to half its radius over the floor under it is caught)", n > 0 && sunk === n, `${sunk} of ${n} sunk rings caught`);
}

// ------------------------------------------------------------------------------------------------ the scripted flights
const { FalconGame } = await imp("viewer/falconFlight/falconGame.js");
const { FlightControls } = await imp("viewer/falconFlight/flightModel.js");
const still = { sample: (x, y, z, t, o) => { o.x = 0; o.y = 0; o.z = 0; return o; } };
function fakeBird() { return { prey: null, downstroke: false, setSpan() {}, pose() {}, carry() {}, drop() {} }; }
function fakeInput() {
  const C = new FlightControls();
  return { C, intent: { turn: 0, vert: 0, climb: 0, stoop: 0, half: 0, brake: 0, aim: null }, aim: { yaw: 0, pitch: 0 }, talons: false, actions: new Set(), script: null,
    update() { return C; }, take(a) { const h = this.actions.has(a); this.actions.delete(a); return h; }, syncAim(y, p) { this.aim.yaw = y; this.aim.pitch = p; } };
}
/** the simple pilot: the mouse aim at the next ring's centre (a little before it: through it along its way), Space when
 *  slow or under it, Shift when it is steeply below (the stoop); returns the run */
function fly(id, ctl, T = 240) {
  const w = worlds[id], R = ringsOf(id), S = startOf(id), def = COURSES[id];
  const inp = fakeInput(), g = new FalconGame({ world: w, air: still, bird: fakeBird(), pigeons: null, fam: null, audio: null, input: inp, ctl });
  g.f.P = { ...g.f.P, stamina: { ...g.f.P.stamina, drain: 0.045, regen: 0.05 } };
  g.start(S.x, S.y, S.z, S.heading, S.V, RC.startGamma({ start: S, rings: R }));
  const run = new RingRun({ rings: R }), I = inp.intent, pos = { x: 0, y: 0, z: 0 };
  let hits = 0, real = 0, out = false, side = -1;
  const say = g.say.bind(g); g.say = (s) => { if (/^hit |tumbl/.test(s)) { hits++; if (TRACE) console.log(`   ${s} at ring ${run.next} (${g.f.pos.x.toFixed(0)}, ${g.f.pos.y.toFixed(0)}, ${g.f.pos.z.toFixed(0)})`); } say(s); };
  for (; real < T && !run.done; real += 1 / 60) {
    const f = g.f, q = R[run.next];
    I.turn = 0; I.vert = 0; I.climb = 0; I.stoop = 0; I.half = 0; I.aim = inp.aim; inp.C.flap = 0; inp.C.fold = 0;
    // a miss (past the ring's plane, not through it): back out to its lead-in point 35 m before it, then in again (no
    // orbiting round it)
    const sd = (f.pos.x - q.x) * q.nx + (f.pos.y - q.y) * q.ny + (f.pos.z - q.z) * q.nz;
    if (side < 0 && sd > 0 && Math.hypot(f.pos.x - q.x, f.pos.y - q.y, f.pos.z - q.z) < 25) out = true;
    if (out && sd < -28) out = false;
    if (TRACE && side < 0 && sd > 0) { const ox = f.pos.x - q.x, oy = f.pos.y - q.y, oz = f.pos.z - q.z; console.log(`   cross ring ${run.next} off ${Math.hypot(ox - sd * q.nx, oz - sd * q.nz).toFixed(2)} h / ${(oy - sd * q.ny).toFixed(2)} v (r ${q.r}) at (${q.x.toFixed(1)}, ${q.y.toFixed(1)}, ${q.z.toFixed(1)}) V ${f.V.toFixed(1)}`); }
    side = sd > 0 ? 1 : -1;
    // the aim: the ring's lead-in point (up to 15 m before it along its way), then its centre
    const d3 = Math.hypot(q.x - f.pos.x, q.y - f.pos.y, q.z - f.pos.z);
    const before = out ? 35 : Math.max(0, Math.min(15, d3 * 0.4));
    const tx = q.x - q.nx * before, ty = q.y - q.ny * before, tz = q.z - q.nz * before;
    const dx = tx - f.pos.x, dy = ty - f.pos.y, dz = tz - f.pos.z, hd = Math.hypot(dx, dz);
    inp.aim.yaw = Math.atan2(-dx, -dz); inp.aim.pitch = Math.max(-1.45, Math.min(0.6, Math.atan2(dy, Math.max(hd, 0.1))));
    if (inp.aim.pitch < -0.6) { I.stoop = 1; inp.C.fold = 1; }             // (Shift: the stoop, steeply down)
    // (Space: the gym's wingbeats when slow; both: a climb when the ring is above)
    if ((ctl === "gym" && f.V < 15) || dy > 1.5) { inp.C.flap = 1; I.climb = 1; }
    g.update(1 / 60, null);
    pos.x = g.f.pos.x; pos.y = g.f.pos.y; pos.z = g.f.pos.z;
    if (g.mode === "perch") { inp.C.flap = 1; inp.actions.add("land"); }
    run.update(1 / 60, pos, g.f.heading, g.f.gamma, g.f.phi);
    if (TRACE && Math.round(real * 60) % (args.includes("--fine") ? 15 : 60) === 0) console.log(`  [${id} ${ctl} ${real.toFixed(0)}] ring ${run.next}/${R.length} hd ${Math.hypot(q.x - pos.x, q.z - pos.z).toFixed(1)} dy ${(q.y - pos.y).toFixed(1)} gam ${g.f.gamma.toFixed(2)} agl ${(pos.y - w.floor(pos.x, pos.z)).toFixed(1)} V ${g.f.V.toFixed(1)} y ${pos.y.toFixed(0)} ${g.mode}`);
  }
  return { done: run.done, next: run.next, n: R.length, t: run.t, hits, ghost: run.ghost(), medal: run.done ? medalOf(def, run.t) : "" };
}
const runs = {}, CTLS = args.includes("--ctl") ? args[args.indexOf("--ctl") + 1].split(",") : ["gym", "current"];
for (const id of COURSE_IDS) for (const ctl of CTLS) {
  const r = (runs[`${id}/${ctl}`] = fly(id, ctl));
  // (the gym's is the feel the courses are made for: inside the bronze time; the current controller (slower: its
  // assist cruises at 14 m/s) must get round, every ring, inside 3 x the bronze)
  const lim = ctl === "gym" ? COURSES[id].medals.bronze : 3 * COURSES[id].medals.bronze;
  check(`${id}: a scripted flight completes it with the ${ctl} controller, every ring in order, inside ${ctl === "gym" ? "the bronze time" : "3 x the bronze time"}`, r.done && r.t <= lim, `${r.next}/${r.n} rings, ${r.t.toFixed(1)} s (medals ${COURSES[id].medals.gold} / ${COURSES[id].medals.silver} / ${COURSES[id].medals.bronze}: ${r.medal || "none"}), ${r.hits} hits`);
}
{
  const r = runs["spires/gym"] ?? Object.values(runs)[0], G = r.ghost, o = {};
  let maxErr = 0, n = 0;
  const D = G.data;
  // (between two samples the replay is on the chord between them: at the mid time, the mid point)
  for (let k = 0; k + 1 < D.length / 7; k++) { const a = k * 7, b = a + 7; ghostAt(G, (D[a] + D[b]) / 2, o); const mx = (D[a + 1] + D[b + 1]) / 2, my = (D[a + 2] + D[b + 2]) / 2, mz = (D[a + 3] + D[b + 3]) / 2; maxErr = Math.max(maxErr, Math.hypot(o.x - mx, o.y - my, o.z - mz)); n++; }
  check("the ghost: the run recorded at 10 Hz from the first ring and replayed on its path (within 1.5 m between samples), off before / after", G.data.length / 7 > r.t * 9 && maxErr < 1.5 && !ghostAt(G, -1, o).on && !ghostAt(G, r.t + 5, o).on, `${G.data.length / 7} samples over ${r.t.toFixed(1)} s, replay off the path by <= ${maxErr.toFixed(2)} m`);
}

// ------------------------------------------------------------------------------------------------ the view's budget
{
  const { RingsView } = await imp("viewer/falconGame/ringsView.js");
  const scene = new THREE.Scene(), V = new RingsView(scene);
  V.setCourse({ rings: ringsOf("spires") });
  let meshes = 0, inst = 0, lights = 0, mats = new Set(), dyn = 0;
  scene.traverse((o) => { if (o.isLight) lights++; if (o.isMesh) { meshes++; if (o.isInstancedMesh) { inst++; if (o.instanceMatrix.usage !== THREE.StaticDrawUsage) dyn++; } mats.add(o.material); } });
  const before = V.mesh.instanceMatrix.version;
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 4000); cam.position.set(1100, 120, 500); cam.lookAt(1000, 90, 400); cam.updateMatrixWorld(true);
  for (let k = 0; k < 120; k++) V.update(1 / 60, k % 5, cam);
  check("the view's budget: the rings one instanced mesh + one material, one ghost mesh, no light, the instance buffer static and not re-written per frame", inst === 1 && meshes <= 2 && lights === 0 && dyn === 0 && V.mesh.instanceMatrix.version === before && mats.size <= 2, `${meshes} meshes (${inst} instanced), ${mats.size} materials, ${lights} lights, instance writes in 120 frames: ${V.mesh.instanceMatrix.version - before}`);
}
const bad = results.filter((r) => !r.ok);
console.log(`falconrings: ${results.length - bad.length}/${results.length} PASS${bad.length ? ` (FAIL: ${bad.map((b) => b.name).join("; ")})` : ""}`);
process.exit(bad.length ? 1 : 0);
