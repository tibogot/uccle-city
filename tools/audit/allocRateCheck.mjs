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
  try {
    const NEW = await mkFleet(""), OLD = await mkFleet("?fleetflat=old");
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
    ok(diffs === 0 && drawnMax > 30, `carFleet: the flat jobs give the old batches car by car (count, matrix, paint, fade, stats) over ${frames} frames with tiles leaving / coming back, a late type, a hidden car, a jump (drawn up to ${drawnMax}; frames differing ${diffs}${firstDiff != null ? ", first " + firstDiff : ""})`);
  } finally { performance.now = realNow; }
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
  for (const k of ["ringtest", "liftcache", "streamcopy", "fleetflat", "meterpace", "blockflat"]) ok(new RegExp(`old\\("${k}", "perf"`).test(feats), `features.js: a row for ?${k}=old`);
  ok(fs.existsSync(path.join(ROOT, "tools/perf/allocSample.mjs")), "tools/perf/allocSample.mjs (the sampler) present");
}

console.log(fails ? `allocrate: ${fails} FAIL` : "allocrate: all checks pass");
process.exit(fails ? 1 : 0);
