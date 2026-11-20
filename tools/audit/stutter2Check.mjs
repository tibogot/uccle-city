// FALCON STUTTER ROUND 2 GATE (claude/falcon2, docs/perf/FALCON_STUTTER.md "Round 2", docs/QUALITY_RULES.md rule 22).
//   node --import ./tools/christmas/hook.mjs tools/audit/stutter2Check.mjs [--quiet]      exit 1 on a failure
// WHY: after round 1 the falcon flight still had 3-12 frames over 50 ms: a retiring tile's new fading copy (the far façade
// kit walls) built its SHADOW shader on screen (31-56 ms: compileAsync builds no shadow pass and nothing warmed it); every
// tile's street-life box mesh built its own shader (8-9 ms, its 11 attributes made three's instanced build object
// specific: never cached, the warm-up stand-in's build never reused); a tile's gardens were placed in one 18-40 ms frame;
// the landmark collider poll was one 37-66 ms task (a whole-scene walk per landmark name + the LOD0 triangles in one go);
// and big arrays were copied twice for workers (main-thread garbage behind the 50-100 ms major GCs).
// RULE (rule 22, extended): a warm-up covers every material a mesh can draw with (its distance swaps too) and every pass
// (shadow included) before the frame that needs it; a per-tile mesh of a shared material keeps three's build shared
// (instanced: geometry attributes + instance buffers <= 8, else read through referenceAttribute); the gardens and the
// collider poll run in <= 3 ms slices; a copy made for a worker is transferred, never cloned again.
// Checks:
//   1. street-life boxes: three's own canReferenceInstanceData (taken from the r187 build) passes for a tile's box mesh
//      (fails for the old layout: the proof it was object specific), the geometry cache keys of two tiles are equal and
//      the box material reads the 7 vec4s through referenceAttribute("geometry.boxIB.*") -> node builds per new tile = 0
//   2. lodFade.fadeProxies: a kit-walls-like mesh gets the fading copies of its own, near (cutMat) and far (plainMat)
//      materials once; main.js retire warms the new copies' shadow pass (?retirewarm=old)
//   3. gardens: gardenInstancesGen / clearRoads drained = sliced (same result); slices <= 3 ms + one piece on a slow
//      ground; main.js uses addTileSliced (?gardenslice=old)
//   4. hero colliders: heroTrianglesGen drained = sliced; a step <= 3 ms; the poll walks the scene once for missing roots,
//      slices the triangles and blockers at POLL_MS = 3 (?heropoll=old); heroBVH transfers its copy
//   5. viewer/slices.js sliced(): slices <= ms + one step, the same value as drain()
//   6. (the features rows, main.js wiring, no DynamicDrawUsage / no light: the meta row, tools/audit/gate.d/stutter2.mjs)
import * as THREE from "three/webgpu";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { measure, cleanSteps } from "../gate/timing.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const busy = (ms) => { const t = performance.now(); while (performance.now() - t < ms); };
globalThis.window = globalThis;
globalThis.location ??= { search: "", href: "http://localhost/viewer/" };
const { drain, sliced } = await import("../../viewer/slices.js");

// ------------------------------------------------------------------ 1. street-life boxes: one shared build
{
  // three r187's own test (nodes/accessors/Instance.js), taken from the build the page loads
  const threeDir = (() => {
    const local = path.join(ROOT, "tools/worker/node_modules/three/build");
    if (fs.existsSync(local)) return local;
    const main = path.dirname(spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).stdout.trim());
    return path.join(main, "tools/worker/node_modules/three/build");
  })();
  const tsl = fs.readFileSync(path.join(threeDir, "three.tsl.js"), "utf8");
  const max = +(/const MAX_VERTEX_BUFFERS = (\d+);/.exec(tsl)?.[1] ?? NaN);
  const a = tsl.indexOf("function canReferenceInstanceData("), b = tsl.indexOf("\n}\n", a);
  ok(max === 8 && a > 0, `three r187: MAX_VERTEX_BUFFERS = ${max}, canReferenceInstanceData found`);
  const canRef = new Function("MAX_VERTEX_BUFFERS", `${tsl.slice(a, b + 2)}; return canReferenceInstanceData;`)(max);
  const builder = { renderer: { isRenderer: true }, needsPreviousData: () => true };   // (the motion vectors: a previous matrix)
  const SL = await import("../../viewer/streetlife/streetlife.js");
  ok(SL.BOX_SHARE === true, "streetlife.js: BOX_SHARE on by default (?boxshare=old)");
  const base = SL.boxGeometry();
  const tile = (n) => {
    const ib = new THREE.InstancedInterleavedBuffer(new Float32Array(n * 28), 28);
    const m = new THREE.InstancedMesh(SL.boxTileGeometry(base, ib), null, n);
    return m;
  };
  const t1 = tile(40), t2 = tile(75);
  ok(canRef(t1, builder) && canRef(t2, builder), `a tile's box mesh: ${Object.keys(t1.geometry.attributes).length} geometry attributes + matrix + previous matrix <= ${max}: three's build is NOT object specific (cached)`);
  // the old layout (?boxshare=old): the 7 per-instance vec4s as geometry attributes
  const old = new THREE.InstancedMesh(base.clone(), null, 4);
  const ibo = new THREE.InstancedInterleavedBuffer(new Float32Array(4 * 28), 28);
  ["iRect", "iBox", "iBoard", "iInk", "iSize", "iMisc", "iCen"].forEach((k, j) => old.geometry.setAttribute(k, new THREE.InterleavedBufferAttribute(ibo, 4, j * 4)));
  ok(!canRef(old, builder), `the old layout (${Object.keys(old.geometry.attributes).length} attributes) was object specific: a build per tile mesh, stand-in and fading copy`);
  // three's geometry cache key (RenderObject.getGeometryCacheKey): attribute names + item sizes
  const gkey = (g) => Object.keys(g.attributes).sort().map((n) => `${n},${g.attributes[n].itemSize},${g.attributes[n].normalized ? "n" : ""}`).join(";");
  ok(gkey(t1.geometry) === gkey(t2.geometry) && gkey(t1.geometry) === gkey(base), "two tiles' box geometries have the same cache key (= the shared box)");
  ok(Object.keys(t1.geometry.boxIB || {}).length === 7 && Object.values(t1.geometry.boxIB).every((x) => x.isInterleavedBufferAttribute && x.data.isInstancedInterleavedBuffer), "geometry.boxIB: 7 vec4 columns of ONE instanced interleaved buffer (one vertex buffer)");
  // the material reads them through referenceAttribute (per render object), never attribute()
  const atlas = new SL.TextAtlas(8, 8, 1);
  const mat = SL.boxMaterial(atlas);
  const props = new Set(), attrs = new Set(), seen = new Set();
  const walk = (n) => {
    if (!n || typeof n !== "object" || seen.has(n)) return; seen.add(n);
    if (n.isNode) { if (n.type === "ReferenceAttributeNode" || n.constructor?.name === "ReferenceAttributeNode") props.add(n.property); if (n.isAttributeNode || n.constructor?.name === "AttributeNode") attrs.add(n._attributeName ?? n.attributeName ?? n.name); }
    for (const v of Object.values(n)) { if (Array.isArray(v)) v.forEach(walk); else if (v?.isNode) walk(v); }
  };
  for (const k of ["colorNode", "positionNode", "roughnessNode", "metalnessNode", "emissiveNode"]) walk(mat[k]);
  const want = ["iRect", "iBox", "iBoard", "iInk", "iSize", "iMisc", "iCen"].map((k) => `geometry.boxIB.${k}`);
  ok(want.every((p) => props.has(p)), `the box material reads ${want.length} per-instance vec4s by referenceAttribute (found: ${[...props].join(", ")})`);
  ok(![...attrs].some((n) => /^i(Rect|Box|Board|Ink|Size|Misc|Cen)$/.test(n || "")), "the box material reads no per-instance geometry attribute");
  // node builds per tile: three builds once per (material, cache key) when not object specific, per object otherwise
  const builds = (meshes) => { const keys = new Set(); let n = 0; for (const m of meshes) { if (!canRef(m, builder)) n++; else if (!keys.has(gkey(m.geometry))) { keys.add(gkey(m.geometry)); n++; } } return n; };
  const tiles = [t1, t2, tile(10), tile(200), tile(1)];
  const standins = tiles.map((m) => new THREE.InstancedMesh(m.geometry, null, 1));     // (lodFade.js fadeProxies' stand-ins)
  ok(builds([...standins, ...tiles]) === 1, `5 tiles + their warm-up stand-ins: ${builds([...standins, ...tiles])} build (the first tile's stand-in): 0 per new tile, 0 on screen`);
  // the GPU buffer of the instance data is freed with the geometry (three frees geometry.attributes on dispose)
  const g = t1.geometry; let freed = null;
  g.addEventListener("dispose", () => { freed = Object.keys(g.attributes).filter((k) => k.startsWith("i")).length; });
  g.dispose();
  ok(freed === 7, `on dispose the instance columns are in geometry.attributes for three's release (${freed})`);
}

// ------------------------------------------------------------------ 2. fading copies of a distance-swapped mesh
{
  const L = await import("../../viewer/lodFade.js");
  ok(L.RETIRE_WARM === true, "lodFade.js: RETIRE_WARM on by default (?retirewarm=old)");
  const near = new THREE.MeshStandardNodeMaterial(), far = new THREE.MeshStandardNodeMaterial();
  near.name = "walls (kit)"; far.name = "walls (kit, far)";
  const mk = () => { const m = new THREE.Mesh(new THREE.BoxGeometry(), near); m.castShadow = true; m.userData.cutMat = near; m.userData.plainMat = far; const g = new THREE.Group(); g.add(m); return g; };
  const p1 = L.fadeProxies(mk());
  const names = p1 ? p1.children.map((c) => c.material.name).sort() : [];
  ok(names.length === 2 && names.includes("walls (kit):fade") && names.includes("walls (kit, far):fade") && p1.children.every((c) => c.castShadow), `a landing tile's stand-ins: both copies, shadow casters (${names.join(", ")})`);
  ok(L.fadeProxies(mk()) === null, "the next tile: none (the copies are shared: nothing left to build when a tile retires)");
}

// ------------------------------------------------------------------ 3. gardens in slices
{
  const GK = await import("../../viewer/gardens/gardenKit.js");
  const CG = await import("../../viewer/gardens/cityGardens.js");
  const styles = [{ kind: "rail", rail: 0, railH: 0.9, wallH: 0.5 }, { kind: "wall", rail: -1, railH: 0, wallH: 1.1 }, { kind: "hedge", rail: -1 }];
  const segs = [], pillars = [], gates = [], hedges = [];
  for (let i = 0; i < 600; i++) { const x = (i % 30) * 6, z = Math.floor(i / 30) * 9; segs.push([x, 100, z, x + 5, 100.1, z + 0.5, i % 2, i % 2 ? 1.1 : 0.5]); if (i % 3 === 0) pillars.push([x, 100, z, 0.1, 1.2, i % 2]); if (i % 7 === 0) gates.push([x + 1, 100, z + 2, 0.2, i % 2 ? 1.0 : 3.0, i % 2, 0.3, i % 2]); }
  for (let h = 0; h < 40; h++) hedges.push({ points: [[h * 4, 300], [h * 4 + 3, 300.5], [h * 4 + 3.5, 303]], species: "beech", height: 1.3, width: 0.7 });
  const doc = { styles, segs, pillars, gates, hedges };
  let slow = 0;
  const ground = (x, z) => { slow++; busy(0.004); return 99.8 + 0.001 * x + 0.002 * z; };
  const a = GK.gardenInstances(doc, ground);
  // the slices: each step's best of 5 drains, cut at 3 ms as sliced() cuts (tools/gate/timing.mjs cleanSteps: one
  // preemption on a busy machine made the longest of a run's slices 11-20 ms, every run), budget * k; the real
  // sliced() run must yield at least half as often as the clean steps ask (a slicer that stops checking the clock fails)
  const MG = await measure(() => cleanSteps(() => GK.gardenInstancesGen(doc, ground), 5));
  const GS = MG.value, st = {}, b = await sliced(GK.gardenInstancesGen(doc, ground), 3, st);
  const same = Object.keys(a.inst).length === Object.keys(b.inst).length && Object.keys(a.inst).every((k) => a.inst[k].length === b.inst[k].length && a.inst[k].every((v, i) => v === b.inst[k][i]));
  ok(same && a.stand.wall.length === b.stand.wall.length, `gardenInstances drained = sliced (${Object.keys(a.inst).length} pieces, ${Object.values(a.inst).reduce((s, x) => s + x.length / GK.STRIDE, 0)} instances)`);
  ok(st.slices > 1 && st.slices >= GS.slices(3) / 2 && GS.longest(3) <= (3 + 2) * MG.k, `gardens on a slow ground (${slow} samples): ${GS.slices(3)} slices of clean steps, longest ${GS.longest(3).toFixed(1)} ms (<= 3 ms + one piece; ${GS.steps} steps, the longest ${GS.maxStep.toFixed(2)} ms; ${MG.note}); sliced(): ${st.slices} slices (longest ${st.longest.toFixed(1)} ms wall)`);
  const blocked = (x, z) => { busy(0.01); return Math.floor(x) % 11 === 0; };
  const GC = await import("../../viewer/gardens/gardenClear.js");
  const c1 = GC.clearRoads(doc, blocked);
  const MC = await measure(() => cleanSteps(() => GC.clearRoadsGen(doc, blocked), 5));
  const CC = MC.value, st2 = {}, c2 = await sliced(GC.clearRoadsGen(doc, blocked), 3, st2);
  ok(c1 && c2 && c1.segs === c2.segs && c1.doc.segs.length === c2.doc.segs.length && c1.doc.hedges.length === c2.doc.hedges.length && c1.segs > 0, `clearRoads drained = sliced (${c1.segs} segments, ${c1.pillars} pillars, ${c1.gates} gates off the road)`);
  ok(st2.slices > 1 && st2.slices >= CC.slices(3) / 2 && CC.longest(3) <= (3 + 2) * MC.k, `clearRoads: ${CC.slices(3)} slices of clean steps, longest ${CC.longest(3).toFixed(1)} ms (${CC.steps} steps, the longest ${CC.maxStep.toFixed(2)} ms; ${MC.note}); sliced(): ${st2.slices} slices`);
  const cg = src("viewer/gardens/cityGardens.js");
  ok(cg.includes("addTile(...a) { return drain(this.addTileGen(...a)); },") && cg.includes("yield* clearRoadsGen(doc, blocked, { old: GARDEN_LANE_OLD })") && cg.includes("yield* gardenInstancesGen(doc, groundAt"), "cityGardens.js: addTile drains the same generator addTileSliced slices");
}

// ------------------------------------------------------------------ 4. hero collider poll
{
  const HT = await import("../../viewer/heroTris.js");
  const root = new THREE.Group(); root.name = "testhero";
  const l0 = new THREE.Group(); l0.name = "testhero_lod0"; root.add(l0);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(5, 160, 120), new THREE.MeshBasicMaterial()); m.position.set(i * 20, 3, -i * 7); m.rotation.y = i; l0.add(m); }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()); flag.name = "flag"; l0.add(flag);
  const A = HT.heroTriangles(root);
  // (each step's best of 5 walks, budget * k: tools/gate/timing.mjs cleanSteps)
  const MH = await measure(() => cleanSteps(() => HT.heroTrianglesGen(root), 5));
  const { maxStep: worst, steps, value: B } = MH.value;
  ok(A.length === B.length && A.length % 9 === 0 && A.every((v, i) => v === B[i]), `heroTriangles drained = stepped (${A.length / 9} triangles, the flag left out)`);
  ok(steps > 10 && worst <= 3 * MH.k, `heroTrianglesGen: ${steps} steps, the longest ${worst.toFixed(2)} ms (<= 3 ms; each step's best of 5, ${MH.note})`);
  const hc = src("viewer/heroColliders.js"), hb = src("viewer/heroBVH.js");
  ok(/HERO_POLL = new URLSearchParams\(location\.search\)\.get\("heropoll"\) !== "old"/.test(hc) && /export const POLL_MS = 3;/.test(hc), "heroColliders.js: ?heropoll=old, POLL_MS = 3");
  ok(hc.includes("if (HERO_POLL) findRoots();") && hc.includes("HERO_POLL ? roots.get(name) : scene.getObjectByName(name)") && hc.includes("await sliced(heroTrianglesGen(root), POLL_MS)") && hc.includes("(HERO_POLL ? POLL_MS : 6)"), "heroColliders.js poll: one scene walk for missing roots, cached roots / tiles, triangles + blockers in <= 3 ms slices");
  ok(hb.includes("worker.postMessage({ id, positions, only: \"bvh\" }, TRANSFER ? [positions.buffer] : [])"), "heroBVH.js: the triangle copy transferred to the collider worker");
}

// ------------------------------------------------------------------ 5. slices.js
{
  function* work(n) { let s = 0; for (let i = 0; i < n; i++) { busy(0.5); s += i; yield; } return s; }
  const MS = await measure(() => cleanSteps(() => work(40), 5));
  const CW = MS.value, st = {}, v = await sliced(work(40), 3, st);
  const sl = src("viewer/slices.js");
  ok(sl.includes("await yieldTask();") && sl.includes('typeof S.yield === "function"') && sl.includes("new MessageChannel()"), "slices.js: yields by scheduler.yield / MessageChannel, not nested setTimeout (clamped to >= 4 ms each: a tile's gardens took 4-7 s of wall time at boot)");
  ok(v === drain(work(40)) && st.slices >= 5 && st.slices >= CW.slices(3) / 2 && CW.longest(3) <= (3 + 0.5 + 1) * MS.k, `sliced(): the drained value, ${st.slices} slices (clean steps: ${CW.slices(3)}, longest ${CW.longest(3).toFixed(1)} ms <= 3 ms + one step; ${MS.note}; wall longest ${st.longest.toFixed(1)} ms)`);
}
console.log(fails ? `${fails} stutter2 check(s) FAILED` : "stutter2 checks pass");
process.exit(fails ? 1 : 0);
