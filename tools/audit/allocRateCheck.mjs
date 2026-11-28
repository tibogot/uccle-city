// PER-FRAME ALLOCATION GATE (claude/allocrate, perf job B, docs/PERF_RESEARCH_2026-11.md "Job B", rule docs/rules/alloc-rate.md).
//   node --import ./tools/christmas/hook.mjs tools/audit/allocRateCheck.mjs [--quiet]      exit 1 on a failure
// WHY: the falcon flight allocated ~1.8 MB of JS objects a frame (3-4.5 GB a minute with the ArrayBuffers): the young
// generation filled several times a second and the major GCs paused 50-100 ms. An allocation-sampling profile
// (tools/perf/allocSample.mjs) named the sources on our side: array destructuring in hot polygon / attribute loops
// (iterator garbage when TurboFan has not taken the loop), the trams' partial rail-lift average recomputed every frame,
// a subarray view per copied run in the instance gather, per-car job arrays in the parked fleet, a closure per triangle
// in the landmark car blockers, the exposure meter's readback.
// RULE: code on the per-frame path (updaters, gathers, culls, render hooks) and the per-tile / per-landmark builds that
// run while playing allocates nothing per item: index loops, reused scratch objects / arrays, no closure or view per
// item; a GPU readback on the per-frame path is paced; a result that depends on what is loaded is cached until the
// loaded set changes, never recomputed every call.
// Checks:
//   1. ringTest: inRing = the old destructuring loop and ringSet.has = rings.some(inRing) on random polygons; main.js
//      inClear and cityFuel use them (?ringtest=old keeps the old loops)
//   2. trackProfile liftOf (?liftcache=old): a partial lift (a tap not loaded) is kept per roadOff while roadOff.gen()
//      stays the same (0 roadOff taps on the second call), recomputed when it changes, the same value as the old path;
//      main.js roadOffFor reuses one answer object and gives gen()
//   3. instanceStream (?streamcopy=old): the flat gather gives the same back arrays, counts, logs and multi-draw runs
//      as the old gather on a synthetic source (short and long runs); multiDraw chunk() gives the same chunks for flat
//      and paired runs
//   5. round 2 (claude/allocrate2): the villa's drive deck (?villadeck=old) = the old closure on the real villa.json at
//      100k points; the landmark blockers' flat rect merge (?blockkeys=old) = the string-keyed one (walls, top, low);
//      surfaceLayers (?surfout=old) the same layers with and without a reused answer; the heap drop's bounds
//      (?fastbounds=old) = three's computeBoundingBox / Sphere bit for bit; carFleet's placeCars (?fleetopt=old) car by
//      car in the fleet test (4); tramline's index snap / yAlong / update scratch (?tramalloc=old) by text
//   4. text: carFleet's flat jobs (?fleetflat=old), heroColliders' one sample function (?blockflat=old), lighting's paced
//      meter (?meterpace=old); readRenderTargetPixelsAsync only at the listed (non per-frame) call sites; the features rows
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
globalThis.window = globalThis;
globalThis.location = { search: "", href: "http://localhost/viewer/" };
let seed = 987654;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
/** a module loaded fresh with this URL query (its switches are read at import) */
const fresh = async (rel, search) => { globalThis.location.search = search; try { return await import(`${rel}?q=${encodeURIComponent(search) || "new"}`); } finally { globalThis.location.search = ""; } };

// ------------------------------------------------------------------ 1. point-in-ring
{
  const RT = await import("../../viewer/ringTest.js");
  ok(RT.RING_TEST === true, "ringTest: on by default (?ringtest=old)");
  const oldIn = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const rings = [];
  for (let k = 0; k < 40; k++) {
    const cx = rnd() * 400, cz = rnd() * 400, n = 3 + Math.floor(rnd() * 12), r = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, d = 5 + rnd() * 25; r.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]); }
    if (k % 3 === 0) r.push(r[0].slice());                // (some closed)
    rings.push(r);
  }
  rings.push([], [[1, 1]], null);
  const set = RT.ringSet(rings);
  let diffIn = 0, diffSet = 0, inside = 0;
  for (let t = 0; t < 20000; t++) {
    const x = rnd() * 440 - 20, z = rnd() * 440 - 20;
    for (const r of rings) if (r && r.length && RT.inRing(r, x, z) !== oldIn(r, x, z)) diffIn++;
    const o = rings.some((r) => r && r.length && oldIn(r, x, z));
    if (o) inside++;
    if (set.has(x, z) !== o) diffSet++;
  }
  ok(diffIn === 0 && diffSet === 0 && inside > 500, `ringTest: inRing / ringSet.has = the old loop on 20000 points x ${rings.length} rings (${inside} inside; diffs ${diffIn} / ${diffSet})`);
  const main = src("viewer/main.js"), fuel = src("viewer/fuel/cityFuel.js");
  ok(/const clearSet = RING_TEST \? ringSet\(clearRings\) : null;/.test(main) && /const inClear = clearSet \? \(x, z\) => clearSet\.has\(x, z\)/.test(main), "main.js: the garden clear rings through ringSet (?ringtest=old)");
  ok(/if \(RING_TEST\) return inRingFast\(r, x, z\);/.test(fuel) && /ringSet\(this\.clear\)/.test(fuel), "cityFuel.js: inRing + the clear rings' set through ringTest.js");
}

// ------------------------------------------------------------------ 2. the trams' rail lift
{
  // a straight strand along x, samples every 4 m; roadOff answers only for x < 60 (the rest "not loaded")
  const strand = []; for (let i = 0; i <= 40; i++) strand.push([i * 4, 0, 50 + i * 0.01]);
  const doc = { strands: [strand] };
  const run = async (search) => {
    const TP = await fresh("../../viewer/trackProfile.js", search);
    const prof = TP.makeTrackProfile(doc);
    let calls = 0, loadedTo = 60, gen = 1;
    const out = { off: 0, bridge: false };
    const roadOff = (x, z) => { calls++; if (x > loadedTo) return null; out.off = 0.03 + 0.0005 * x; out.bridge = false; return out; };
    roadOff.gen = () => gen;
    const xs = [50, 58, 62, 70];
    const v1 = xs.map((x) => prof.railTop(x, 0, roadOff)), c1 = calls; calls = 0;
    const v2 = xs.map((x) => prof.railTop(x, 0, roadOff)), c2 = calls; calls = 0;
    loadedTo = 200; gen++;                                  // a tile came in
    const v3 = xs.map((x) => prof.railTop(x, 0, roadOff)), c3 = calls; calls = 0;
    const v4 = xs.map((x) => prof.railTop(x, 0, roadOff)), c4 = calls;
    return { on: TP.LIFT_CACHE, v1, v2, v3, v4, c1, c2, c3, c4 };
  };
  const N = await run(""), O = await run("?liftcache=old");
  const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  ok(N.on === true && O.on === false, "trackProfile: LIFT_CACHE on by default, off with ?liftcache=old");
  ok(same(N.v1, O.v1) && same(N.v2, O.v2) && same(N.v3, O.v3) && same(N.v4, O.v4), "trackProfile: the same rail tops as the old path before and after the tile came in");
  ok(N.c1 > 0 && N.c2 === 0 && O.c2 > 0, `trackProfile: a partial lift kept while the loaded tiles stay (taps: first ${N.c1}, again ${N.c2}; old again ${O.c2})`);
  ok(N.c3 > 0 && !same(N.v3, N.v1) && N.c4 === 0, `trackProfile: recomputed once when gen() changes (taps ${N.c3}, then ${N.c4}; the lift now full)`);
  const main = src("viewer/main.js");
  const fn = main.slice(main.indexOf("function roadOffFor(hm, inTile) {"), main.indexOf("/** `treeGround(x, z)`"));
  ok(/if \(LIFT_CACHE\) \{/.test(fn) && /const out = \{ off: 0, bridge: false \};/.test(fn) && /f\.gen = \(\) =>/.test(fn) && !/tiles\.find\(/.test(fn.slice(0, fn.indexOf("return f;"))), "main.js roadOffFor: one reused answer, a loop (no find closure), gen() (?liftcache=old)");
  ok(/const tileRoadOff = LIFT_CACHE && trackProf \? roadOffFor\(hm, inTile\) : null;/.test(main), "main.js featureObjects: one roadOff for the tile's rails, not one a point");
}

// ------------------------------------------------------------------ 3. the instance gather
{
  const IS_N = await fresh("../../viewer/instanceStream.js", ""), IS_O = await fresh("../../viewer/instanceStream.js", "?streamcopy=old");
  ok(IS_N.STREAM_COPY === true && IS_O.STREAM_COPY === false, "instanceStream: STREAM_COPY on by default (?streamcopy=old)");
  // a synthetic source: cells along x, instances with centres; columns of width 16 (a matrix) and 4
  const mkSrc = () => {
    const cells = [], cenA = [], n0 = { n: 0 };
    let a = 0;
    for (let c = 0; c < 30; c++) {
      const x = c * 20 + 10, k = 1 + Math.floor(rnd() * 40);
      for (let i = 0; i < k; i++) cenA.push(x + rnd() * 20 - 10, rnd() * 5, rnd() * 20 - 10, 0.5 + rnd());
      cells.push({ x, z: 0, y0: 0, y1: 5, r: 15, h: 1.5, a, b: a + k, box: new Float64Array([x - 10, 0, -10, x + 10, 5, 10]) });
      a += k;
    }
    n0.n = a;
    const cols = [new Float32Array(a * 16).map(() => rnd()), new Float32Array(a * 4).map(() => rnd())];
    return { n: a, cells, cen: new Float32Array(cenA), cols, w: [16, 4] };
  };
  const source = mkSrc();
  const gatherWith = (IS) => {
    const meshes = [0, 1, 2].map((k) => ({ mesh: { count: 0, visible: false, boundingSphere: null, instanceMatrix: null, geometry: { attributes: {}, setAttribute(k, a) { this.attributes[k] = a; } } }, l0: [0, 80, 200][k], l1: [80, 200, 900][k], attrs: [["instanceMatrix", 0, 16], ["aExtra", 1, 4]] }));
    const P = new IS.StreamPool("t", meshes, 1, 6);
    const runs = meshes.map(() => []);
    const boxAdd = P.boxAdd; P.boxAdd = function (m, b) { boxAdd.call(this, m, b); runs[this.meshes.indexOf(m)].push(m.n); };
    const g = P.gather([{ src: source }], { x: 150, y: 2, z: 3 }, () => false);
    while (!g.next().done);
    return P.meshes.map((m, k) => ({ n: m.n, mi: Array.from(m.back.instanceMatrix?.subarray(0, m.n * 16) || []), ex: Array.from(m.back.aExtra?.subarray(0, m.n * 4) || []), log: m.log.map((v) => (typeof v === "object" ? "src" : v)).join(","), box: Array.from(m.box), runs: runs[k].join(",") }));
  };
  const A = gatherWith(IS_N), B = gatherWith(IS_O);
  ok(JSON.stringify(A) === JSON.stringify(B) && A.some((m) => m.n > 0), `instanceStream: the flat gather = the old one (instances per band ${A.map((m) => m.n).join(" / ")}; back arrays, logs, boxes, runs identical)`);
  ok(A.some((m) => m.log.split(",").length > 8), "instanceStream: short (looped) and long (set) runs both exercised");
  // multiDraw chunk(): flat runs = paired runs
  const MD = await import("../../viewer/multiDraw.js");
  const chunkOf = (runs) => { const P = { nch: 0, ch: new Int32Array(256), chBox: new Float64Array(768) }; MD.MultiDrawSet.prototype.chunk.call({ chMax: 48, chunkM: 160, chunk: MD.MultiDrawSet.prototype.chunk }, P, runs.n, runs.box, runs.list); return [P.nch, Array.from(P.ch.slice(0, P.nch * 2)), Array.from(P.chBox.slice(0, P.nch * 6))].join("|"); };
  const pairs = [], flat = [];
  let end = 0;
  for (let i = 0; i < 300; i++) { end += Math.floor(rnd() * 5); const x = (i % 30) * 40, z = Math.floor(i / 30) * 40; const b = new Float64Array([x, 0, z, x + 40, 5, z + 40]); pairs.push([end, b]); flat.push(end, b); }
  const box = new Float64Array([0, 0, 0, 1200, 5, 400]);
  const cP = chunkOf({ n: end, box, list: pairs }), cF = chunkOf({ n: end, box, list: flat });
  ok(cP === cF && +cP.split("|")[0] > 1, `multiDraw chunk(): flat runs = paired runs (${cP.split("|")[0]} chunks, the CHMAX fallback path included)`);
  const md = src("viewer/multiDraw.js");
  ok(/if \(STREAM_COPY\) m\.runs\.push\(m\.n, b\); else m\.runs\.push\(\[m\.n, b\]\);/.test(md), "multiDraw: the stream pools' runs flat (?streamcopy=old: pairs)");
}

// ------------------------------------------------------------------ 4. the parked fleet: new = old, car by car
{
  // two fleets (the module loaded with and without ?fleetflat=old), the same synthetic types / tiles / camera path and
  // a fake clock: after every update each batch must hold the same cars (count, matrices, paints, fades). Tiles leave
  // and come back, a type goes live late, cars hide (pulled into traffic) and come back, the camera moves and jumps.
  const THREE = await import("three/webgpu");
  const realNow = performance.now.bind(performance);
  let clock = 1000;
  const mkFleet = async (search) => {
    const M = await fresh("../../viewer/carFleet.js", search);
    const F = M.carFleet;
    F.loading = true;                                       // (no model load: the types are made here)
    const geo = new THREE.BoxGeometry(4, 1.5, 2);
    const mat = new THREE.MeshBasicNodeMaterial();
    F.lodDist = [22, 55, 130, 1e9];
    const types = {};
    for (const id of ["hatch_s", "estate", "van_c", "saloon"]) types[id] = { lods: F.lodDist.map((_, k) => ({ tris: 12 * (k + 1), plain: F.batch(geo, mat, true, false, 8), fade: F.batch(geo, mat, true, true, 8) })), keepPaint: id === "van_c", paint: new THREE.Color(0.3, 0.3, 0.3), t0: 0 };
    F.types = types; F.ready = true; F.pendingTypes = [];
    types.saloon.t0 = 2600;                                 // (a type that goes live later)
    return { F, M };
  };
  performance.now = () => clock;
  try { for (const [newQ, oldQ] of [["", "?fleetflat=old"], ["?fleetrun=2", "?fleetopt=old"]]) {
    clock = 1000;
    const NEW = await mkFleet(newQ), OLD = await mkFleet(oldQ);
    const scene = new THREE.Scene();
    const tiles = [];
    let s2 = 4242;
    const r2 = () => ((s2 = (s2 * 1103515245 + 12345) >>> 0) / 4294967296);
    const ids = ["hatch_s", "estate", "van_c", "saloon"];
    for (let t = 0; t < 6; t++) {
      const cars = [];
      for (let i = 0; i < 60; i++) cars.push({ x: t * 120 + r2() * 110, y: 0, z: r2() * 300 - 150, heading: r2() * 6.28, type: ids[Math.floor(r2() * 4)], pv: r2() });
      tiles.push({ cars, gA: new THREE.Group(), gB: new THREE.Group() });
    }
    const clone = (cars) => cars.map((c) => ({ ...c }));
    for (const T of tiles) { T.carsB = clone(T.cars); NEW.F.add(T.gA, T.cars); OLD.F.add(T.gB, T.carsB); }
    const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 2000);
    const pos = new THREE.Vector3();
    const snap = (F) => {
      const out = [];
      for (const id of ids) F.types[id].lods.forEach((l, k) => { for (const [nm, b] of [["p", l.plain], ["f", l.fade]]) { const m = b.mesh, n = m.count; out.push(`${id}${k}${nm}:${n}:${Array.from(m.instanceMatrix.array.subarray(0, n * 16)).map((v) => v.toFixed(3)).join(",")}|${Array.from(b.geo.attributes.paint.array.subarray(0, n * 3)).map((v) => v.toFixed(3)).join(",")}|${b.fade ? Array.from(b.geo.attributes.lodFade.array.subarray(0, n)).map((v) => v.toFixed(4)).join(",") : ""}`); } });
      return out.join("\n") + `#${F.stats.drawn},${F.stats.fading},${F.stats.culled},${F.stats.far},${F.stats.perLod.join("/")},${F.stats.pops}`;
    };
    let frames = 0, diffs = 0, drawnMax = 0, firstDiff = null;
    for (let f = 0; f < 400; f++) {
      clock += 16.7;
      // tiles in / out of the scene (a tile streamed out and in again: its registration leaves and is added back)
      for (let t = 0; t < tiles.length; t++) {
        const T = tiles[t], on = !(t === 2 && f >= 120 && f < 220) && !(t === 5 && f < 60);
        for (const [g] of [[T.gA], [T.gB]]) { if (on && !g.parent) scene.add(g); if (!on && g.parent) scene.remove(g); }
        if (t === 2 && f === 230) { T.gA = new THREE.Group(); T.gB = new THREE.Group(); scene.add(T.gA, T.gB); T.cars = clone(T.carsB); T.carsB = clone(T.cars); NEW.F.add(T.gA, T.cars); OLD.F.add(T.gB, T.carsB); }
      }
      if (f === 150) { tiles[1].cars[3].hidden = true; tiles[1].carsB[3].hidden = true; NEW.F.touch(); OLD.F.touch(); }
      if (f === 260) { tiles[1].cars[3].hidden = false; tiles[1].carsB[3].hidden = false; NEW.F.touch(); OLD.F.touch(); }
      // the camera: a drive along x, a turn, a jump (teleport) at 300
      const x = f < 300 ? f * 1.8 : 500 + (f - 300) * 1.2, z = 20 * Math.sin(f / 40);
      pos.set(x, 1.7, z); cam.position.copy(pos); cam.lookAt(x + 30 * Math.cos(f / 90), 1.2, z + 30 * Math.sin(f / 90)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      if (f % 50 === 49) { clock += 0; }                    // (some frames with a still camera follow)
      for (let rep = 0; rep < (f % 50 === 49 ? 2 : 1); rep++) { NEW.F.update(pos, cam); OLD.F.update(pos, cam); }
      const a = snap(NEW.F), b = snap(OLD.F);
      frames++; drawnMax = Math.max(drawnMax, NEW.F.stats.drawn);
      if (a !== b) { diffs++; firstDiff ??= f; }
    }
    ok(diffs === 0 && drawnMax > 30, `carFleet (${oldQ}): the default fleet gives the old batches car by car (count, matrix, paint, fade, stats) over ${frames} frames with tiles leaving / coming back, a late type, a hidden car, a jump (drawn up to ${drawnMax}; frames differing ${diffs}${firstDiff != null ? ", first " + firstDiff : ""})`);
  } } finally { performance.now = realNow; }
}

// ------------------------------------------------------------------ 5. text: the other fixes, the readbacks, the rows
{
  const fleet = src("viewer/carFleet.js"), hero = src("viewer/heroColliders.js"), light = src("viewer/lighting.js");
  ok(/const FLEET_FLAT = .*get\("fleetflat"\) !== "old";/.test(fleet) && /_jB\[nj\] = b; _jC\[nj\] = c; _jF\[nj\] = f;/.test(fleet) && /b\.set\.write\(b\.part, n, _setCols, B\)/.test(fleet), "carFleet: the jobs in reused parallel lists, one cols object (?fleetflat=old)");
  ok(/const BLOCK_FLAT = .*get\("blockflat"\) !== "old";/.test(hero) && /const sample = BLOCK_FLAT \? sampleT :/.test(hero), "heroColliders: one sample function for the triangle walk (?blockflat=old)");
  ok(/export const METER_PACE = .*get\("meterpace"\) !== "old";/.test(light) && /if \(!METER_PACE \|\| \(this\._meterN = \(\(this\._meterN \?\? -1\) \+ 1\) % METER_EVERY\) === 0\) this\.sky\.meter\(rt\);/.test(light) && (light.match(/this\.sky\.meter\(/g) || []).length === 1, "lighting.js hazeHook: the exposure meter paced (every METER_EVERY-th frame; ?meterpace=old)");
  // a GPU readback allocates a staging buffer + an array per call (three r187): never from the per-frame path unpaced
  const ALLOWED = new Map([
    ["viewer/farMerge.js", "one bake per far merge"], ["viewer/grass/grassField.js", "readback(): a check helper"], ["viewer/impostorKit/bake.js", "impostor bakes"],
    ["viewer/weather/overheadMap.js", "one bake per weather map"], ["viewer/weather/snowTrails.js", "probe(): a debug helper"],
  ]);
  const found = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name) && !/\.bundle\.js$/.test(e.name)) { const s = src(p); if (/\.readRenderTargetPixelsAsync\(/.test(s.replace(/\/\/.*$/gm, ""))) found.push(p); } } };
  walk("viewer");
  const extra = found.filter((p) => !ALLOWED.has(p));
  ok(!extra.length, `readRenderTargetPixelsAsync only at the listed non-per-frame sites (${found.length} files${extra.length ? "; NEW: " + extra.join(", ") + " (pace it, then list it here)" : ""})`);
  const feats = src("viewer/features.js");
  for (const k of ["ringtest", "liftcache", "streamcopy", "fleetflat", "meterpace", "blockflat", "villadeck", "blockkeys", "tramalloc", "surfout", "fleetopt", "fastbounds", "allocsmall"]) ok(new RegExp(`old\\("${k}", "perf"`).test(feats), `features.js: a row for ?${k}=old`);
  ok(fs.existsSync(path.join(ROOT, "tools/perf/allocSample.mjs")), "tools/perf/allocSample.mjs (the sampler) present");
}

// ------------------------------------------------------------------ 6. round 2 (claude/allocrate2)
{
  const THREE = await import("three/webgpu");
  // 6a. the villa's drive deck: the real villa.json and frame; the old closure copied from villaCity.js (before the fix)
  {
    const VD = await fresh("../../viewer/villa/villaDeck.js", ""), VO = await fresh("../../viewer/villa/villaDeck.js", "?villadeck=old");
    ok(VD.VILLA_DECK === true && VO.VILLA_DECK === false, "villaDeck: on by default (?villadeck=old)");
    const { drivePlane, LIFT } = await import("../../viewer/villa/villaGroundsGeom.js");
    const notes = JSON.parse(src("models/villa/villa.json")), pl = notes.placement;
    const rootM = new THREE.Matrix4().compose(new THREE.Vector3(...pl.city_local_position), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.rotation_y_rad), new THREE.Vector3(1, 1, 1));
    const inv = rootM.clone().invert(), q = new THREE.Vector3();
    const dp = notes.drive_plane, dRings = dp.zones.map((z) => notes.grounds[z]);
    const inRingUW = (r, u, w) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ui, wi] = r[i], [uj, wj] = r[j]; if ((wi > w) !== (wj > w) && u < ((uj - ui) * (w - wi)) / (wj - wi) + ui) c = !c; } return c; };
    const onDriveOld = (x, z) => { q.set(x, 0, z).applyMatrix4(inv); return dRings.some((r) => inRingUW(r, q.x, q.z)) ? q.x : null; };
    const deckOld = (x, z) => { const u = onDriveOld(x, z); return u == null ? null : drivePlane(dp, u) + LIFT; };
    const deck = VD.makeDriveDeck(dp, dRings, rootM, inv);
    const cx = pl.city_local_position[0], cz = pl.city_local_position[2];
    let diff = 0, on = 0, n = 0;
    for (let t = 0; t < 100000; t++) {
      const far = t % 10 === 0, x = cx + (rnd() - 0.5) * (far ? 4000 : 120), z = cz + (rnd() - 0.5) * (far ? 4000 : 120);
      const a = deck(x, z), b = deckOld(x, z), ua = deck.onDrive(x, z), ub = onDriveOld(x, z);
      if (a !== b || ua !== ub) diff++;
      if (b != null) on++;
      n++;
    }
    ok(diff === 0 && on > 200, `villaDeck: the drive deck and onDrive = the old closures at ${n} points round the villa and across the city (${on} on the drive; diffs ${diff})`);
    const vc = src("viewer/villa/villaCity.js");
    ok(/const fastDeck = VILLA_DECK \? makeDriveDeck\(dp, dRings, m\.rootM, inv\) : null;/.test(vc) && /const onDrive = fastDeck \? fastDeck\.onDrive :/.test(vc) && /const driveDeck = fastDeck \|\|/.test(vc), "villaCity.js: world.decks gets the boxed deck, onDrive its test (?villadeck=old: the closures)");
  }
  // 6b. the landmark blockers' rect merge: flat lists = string keys (walls, heights top / low, decks)
  {
    const HN = await fresh("../../viewer/heroColliders.js", ""), HO = await fresh("../../viewer/heroColliders.js", "?blockkeys=old");
    const soup = (seed0) => {
      let sd = seed0; const r = () => ((sd = (sd * 1103515245 + 12345) >>> 0) / 4294967296);
      const T = [];
      for (let w = 0; w < 14; w++) {                       // walls: vertical quads, some sloped tops, a few at height
        const x = r() * 40, z = r() * 40, a = r() * Math.PI, L = 2 + r() * 10, y0 = r() < 0.3 ? 3 + r() * 3 : r() * 0.5, h = 0.5 + r() * 4;
        const dx = Math.cos(a) * L, dz = Math.sin(a) * L;
        T.push(x, y0, z, x + dx, y0, z + dz, x + dx, y0 + h, z + dz, x, y0, z, x + dx, y0 + h, z + dz, x, y0 + h * (0.5 + r()), z);
      }
      return T;
    };
    const ground = (x, z) => 0.3 * Math.sin(x / 7) + 0.2 * Math.cos(z / 5) + (x > 25 ? 2.5 : 0);
    const layers = (x, z) => ({ top: ground(x, z) + (z > 30 ? 4 : 0), low: z > 30 ? ground(x, z) : NaN, deck: z > 30 && x < 20 });
    let diffs = 0, rects = 0;
    for (let k = 0; k < 6; k++) {
      const T = soup(1000 + k);
      const a = [HN.carBlockersSync(T, ground), HN.layeredBlockersSync(T, layers)], b = [HO.carBlockersSync(T, ground), HO.layeredBlockersSync(T, layers)];
      if (JSON.stringify(a) !== JSON.stringify(b)) diffs++;
      rects += a[0].length + a[1].length;
    }
    ok(diffs === 0 && rects > 100, `heroColliders: the flat rect merge = the string-keyed one (walls, top, low, decks; 6 soups, ${rects} rects, same order; soups differing ${diffs})`);
    const hc = src("viewer/heroColliders.js");
    ok(/const BLOCK_KEYS = new URLSearchParams\(location\.search\)\.get\("blockkeys"\) !== "old";/.test(hc) && /if \(BLOCK_KEYS\) \{/.test(hc) && /L\[2\] = l\.top; L\[3\] = l\.low; L\[4\] = l\.deck \? 1 : 0;/.test(hc), "heroColliders: BLOCK_KEYS (?blockkeys=old); layerFns copies the fields into a Float64Array (layers() may reuse its answer; no double in a closure context)");
  }
  // 6c. surfaceLayers: the same layers, a reused answer
  {
    const SN = await fresh("../../viewer/drive/surfaceLayers.js", ""), SO = await fresh("../../viewer/drive/surfaceLayers.js", "?surfout=old");
    ok(SN.SURF_OUT === true && SO.SURF_OUT === false, "surfaceLayers: SURF_OUT on by default (?surfout=old)");
    const hm = { surface: (x, z) => 0.5 * Math.sin(x / 9) + 0.3 * Math.cos(z / 4) };
    const d1 = (x, z) => (x > 0 && x < 30 && z > 0 && z < 8 ? 6 + x * 0.01 : null);
    const d2 = (x, z) => (x > 20 && x < 60 && z > 4 && z < 12 ? hm.surface(x, z) + 0.12 + (x < 40 ? 0.8 : 2.2) : null); d2.osm = true;
    const decks = [d1, d2], out = { top: 0, low: NaN, deck: false };
    let diff = 0, lows = 0;
    for (let t = 0; t < 20000; t++) {
      const x = rnd() * 80 - 10, z = rnd() * 20 - 4;
      const o = SO.surfaceLayers(decks, hm, null, x, z), a = SN.surfaceLayers(decks, hm, null, x, z), b = SN.surfaceLayers(decks, hm, null, x, z, out);
      const same = (p) => Object.is(p.top, o.top) && Object.is(p.low, o.low) && p.deck === o.deck;
      if (!same(a) || !same(b) || b !== out) diff++;
      if (Number.isFinite(o.low)) lows++;
    }
    ok(diff === 0 && lows > 100, `surfaceLayers: the same top / low / deck as the old path at 20000 points, with and without a reused answer (${lows} with a low layer; diffs ${diff})`);
    ok(/const layersOut = \{ top: 0, low: NaN, deck: false \};/.test(src("viewer/drive/driveMode.js")), "driveMode.groundLayers: one reused answer");
  }
  // 6d. the heap drop's bounds = three's, bit for bit
  {
    const FN = await fresh("../../viewer/fastBounds.js", "");
    ok(FN.FAST_BOUNDS === true, "fastBounds: on by default (?fastbounds=old)");
    let diff = 0, n = 0;
    const cases = [];
    for (let k = 0; k < 30; k++) { const c = k === 0 ? 0 : 1 + Math.floor(rnd() * 3000), s = k % 5 === 4 ? 4 : 3, a = new Float32Array(c * s); for (let i = 0; i < a.length; i++) a[i] = (rnd() - 0.5) * 2000; cases.push(new THREE.BufferAttribute(a, s)); }
    { const a = new Int16Array(300).map(() => Math.floor((rnd() - 0.5) * 60000)); cases.push(new THREE.BufferAttribute(a, 3, true)); }   // (normalized: three's own)
    { const ib = new THREE.InterleavedBuffer(new Float32Array(600).map(() => rnd() * 100), 6); cases.push(new THREE.InterleavedBufferAttribute(ib, 3, 0)); }
    for (const p of cases) {
      const g1 = new THREE.BufferGeometry(), g2 = new THREE.BufferGeometry();
      g1.setAttribute("position", p); g2.setAttribute("position", p);
      FN.computeBox(g1); FN.computeSphere(g1); g2.computeBoundingBox(); g2.computeBoundingSphere();
      const v = (g) => [...g.boundingBox.min.toArray(), ...g.boundingBox.max.toArray(), ...g.boundingSphere.center.toArray(), g.boundingSphere.radius];
      const A = v(g1), B = v(g2);
      if (A.some((x, i) => !Object.is(x, B[i]))) diff++;
      n++;
    }
    ok(diff === 0, `fastBounds: computeBox / computeSphere = three's computeBoundingBox / Sphere bit for bit (${n} geometries: empty, itemSize 3 and 4, normalized, interleaved; diffs ${diff})`);
    const hd = src("viewer/heapDrop.js");
    ok(/if \(!g\.boundingBox\) computeBox\(g\);/.test(hd) && /if \(!g\.boundingSphere\) computeSphere\(g\);/.test(hd), "heapDrop.js tick: the bounds through fastBounds.js");
    ok(/if \(k === "computeBoundingBox" \? fastBox\(this\) : fastSphere\(this\)\) return;\n      return f\.apply\(this, arguments\);/.test(hd), "heapDrop.js: its computeBoundingBox / Sphere wrapper takes the fast path first (three's own for what fastBounds does not cover)");
  }
  // 6e. tramline (a three + model module: by text)
  {
    const tl = src("viewer/tramline.js");
    ok(/export const TRAM_ALLOC = .*get\("tramalloc"\) !== "old";/.test(tl), "tramline: TRAM_ALLOC (?tramalloc=old)");
    // (claude/tramfix) the snap lives in viewer/tramSched.js createTrackSnap (shared with the tramsnap row): tramline
    // passes alloc: TRAM_ALLOC, and snapFlat reads by index (no destructuring)
    const ts = src("viewer/tramSched.js"), f0 = ts.indexOf("const snapFlat"), f1 = ts.indexOf("const snapOld");
    ok(/createTrackSnap\(shapes, \{ alloc: TRAM_ALLOC/.test(tl) && /await \(alloc \? snapFlat : snapOld\)/.test(ts) && f0 > 0 && f1 > f0 && !/const \[|for \(const \[/.test(ts.slice(f0, f1)), "tramline snap: snapFlat by index reads (no destructuring)");
    ok(/const yAlong = TRAM_ALLOC\s*\? \(shape, q\) => \{ let s = 0; for \(let k = 0; k < 5; k\+\+\) \{ atInto\(shape, q \+ TAP_O\[k\], yA\);/.test(tl), "tramline yAlong: index taps into a scratch (atInto)");
    ok(/if \(TRAM_ALLOC\) \{ atInto\(shapes\[t\.shape\], d, uA\); x = uA\[0\]; z = uA\[1\]; \}/.test(tl), "tramline update: the trip's point into a scratch");
    ok(/if \(FLEET_OPT && !jobs\) \{/.test(src("viewer/carFleet.js")), "carFleet: the car loop in placeCars (?fleetopt=old)");
  }
}

// 6f. the villa's tree clear: the far pre-test keeps the same trees
{
  const PN = await fresh("../../viewer/villa/villaPlot.js", ""), PO = await fresh("../../viewer/villa/villaPlot.js", "?villadeck=old");
  const [ox, oz] = PN.FRAME.origin, trees = [];
  for (let t = 0; t < 20000; t++) { const far = t % 4 === 0, a = rnd() * 6.283, d = far ? 60 + rnd() * 900 : rnd() * 95; trees.push({ x: ox + Math.cos(a) * d, z: oz + Math.sin(a) * d, crown: t % 3 ? 1 + rnd() * 9 : undefined }); }
  const A = PN.villaTreesClear(trees), B = PO.villaTreesClear(trees);
  ok(PN.VILLA_DECK === true && PO.VILLA_DECK === false && A.length === B.length && A.every((t, i) => t === B[i]) && A.length < trees.length - 100, `villaPlot villaTreesClear: the far pre-test keeps the same ${A.length} of ${trees.length} trees in the same order (?villadeck=old: every tree tested)`);
  const far = trees.filter((t) => Math.hypot(t.x - ox, t.z - oz) > 200);
  const C = PN.villaTreesClear(far);
  ok(C.length === far.length && C !== far, "villaPlot villaTreesClear: a tile far from the villa keeps every tree (a new array, as filter gave)");
}

// 6g. the small ones (?allocsmall=old): driveHeight's corners in a module function (= the closure, both layers), the
// park fence stages' index loop, the tram update's index loop
{
  const CN = await fresh("../../viewer/drive/colliders.js", ""), CO = await fresh("../../viewer/drive/colliders.js", "?allocsmall=old");
  const cols = 40, rows = 30, Y = new Float32Array(cols * rows).map(() => 100 + rnd() * 5);
  const d1 = new Uint16Array(cols * rows).map(() => Math.floor(rnd() * 40)), d2 = new Uint16Array(cols * rows).map(() => (rnd() < 0.3 ? 65535 : 500 + Math.floor(rnd() * 300)));
  const hm = { h: { x0: -10, z0: 5, step: 1, cols, rows }, y: Y };
  let diff = 0, n = 0;
  for (let t = 0; t < 20000; t++) {
    const x = -14 + rnd() * 48, z = 1 + rnd() * 38, near = t % 3 === 0 ? null : 100 + rnd() * 10, del = t % 2 ? { delta: d1, delta2: d2 } : d1;
    if (!Object.is(CN.driveHeight(hm, del, x, z, near), CO.driveHeight(hm, del, x, z, near))) diff++;
    n++;
  }
  ok(diff === 0, `colliders driveHeight: the module corner function = the old closure at ${n} points (one and two layers, near or not, outside the grid; diffs ${diff})`);
  const pf = src("viewer/parkFence.js"), tl = src("viewer/tramline.js");
  ok(/const ALLOC_SMALL = qs\.get\("allocsmall"\) !== "old";/.test(pf) && /if \(ALLOC_SMALL\) for \(let li = 0; li < list\.length; li\+\+\) \{/.test(pf), "parkFence Stage.fill: an index loop (?allocsmall=old: for-of)");
  ok(/for \(let ti = 0, tn = trips\.length; ti < tn; ti\+\+\) \{\n      const t = trips\[ti\];\n      const (st = t\.stops|tt = tripTime\(t, T\))/.test(tl), "tramline update: the trips by index");
}

console.log(fails ? `allocrate: ${fails} FAIL` : "allocrate: all checks pass");
process.exit(fails ? 1 : 0);
