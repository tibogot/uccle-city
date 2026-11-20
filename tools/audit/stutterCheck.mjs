// FALCON STUTTER GATE (claude/falconstutter, docs/perf/FALCON_STUTTER.md, docs/QUALITY_RULES.md rule 22).
//   node --import ./tools/heap/register.mjs tools/audit/stutterCheck.mjs [--quiet]      exit 1 on a failure
// WHY: the falcon flight hitched 50-300 ms whenever the city did a whole job in ONE task / frame while the bird flew:
// the Square des Heros' ground built in one 300-350 ms task when its tiles came in, the heap-drop check's bounds for a
// whole tile in one 24-58 ms task, a tile landing's stops-to-plants step in one 25-90 ms frame, three's 8 ms compile
// slices (+ a node build's stage) on top of the frame, the grass field re-baked (35-45 ms) at every tile change with
// the camera too high for a blade, and shadow-warm stand-ins the sun shadow cache never drew (the real meshes then built
// their shadow shaders on screen: 4-5 sync builds, 44-52 ms). Measured with debug/falconStutter.js (the doc's table).
// RULE: work that grows with what streams in (a tile, a landmark, a field) runs in bounded slices while the player
// plays (<= ~4 ms of main thread a slice), or only when its result can be seen; a warm-up goes through the same path
// the real draw takes (a stand-in the shadow cache skips warms nothing).
// Checks:
//   1. asyncPipes.js fineCompile (functional, a stand-in renderer): while playing a node build yields between stages
//      once `ms` passed (precompile state closed around the wait, the same state reopened); under the loader three's
//      yields only; switched off live = three's path
//   2. heapDrop.js tick (functional, a stand-in of three's Attributes): <= DROP_SLICE_MS (+ one geometry) a task, the
//      rest in later tasks, every geometry dropped in the end (bounds first)
//   3. sources: herosGround.js builders = generators drained by the plain functions, herosCity.js runs them through
//      sliced() (?herosslice=old); main.js loadTile's frames between the stops-to-plants placements (?slicesplit=old);
//      grass.js re-bakes the field only after the blades-can-show test (?grassbake=old); lighting.js "*-warm" groups
//      are sun-cache movers (?warmmover=old); stagedCompile.js warms a released landmark's shadow pass
//      (?stagedshadow=old) (main.js wiring, the features rows: the meta row)
//   4. (no DynamicDrawUsage, no light made: the meta row, tools/audit/gate.d/stutter.mjs)
import * as THREE from "three/webgpu";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { measure, bestOf } from "../gate/timing.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const busy = (ms) => { const t = performance.now(); while (performance.now() - t < ms); };
globalThis.window = globalThis; globalThis.location = { search: "" };
let rafQ = [];
globalThis.requestAnimationFrame = (f) => { rafQ.push(f); setTimeout(() => { const q = rafQ; rafQ = []; for (const g of q) g(performance.now()); }, 1); return 1; };

// ------------------------------------------------------------------ 1. fineCompile
{
  const AP = await import("../../viewer/asyncPipes.js");
  const log = [];
  const renderer = {
    _precompilationState: { id: 1 },
    _finishPreCompile() { log.push("finish"); this._precompilationState = null; },
    _beginPreCompile(st) { log.push("begin"); this._precompilationState = st; },
    _nodes: {
      // a node build of 6 stages of 3 ms, calling the yield between them (three's own yields only after 8 ms)
      async getForRenderAsync(ro, yieldFn) { for (let s = 0; s < 6; s++) { busy(3); await yieldFn(); } return "built"; },
    },
  };
  let threeYields = 0, loader = false;
  const threeYield = async () => { threeYields++; };
  const stats = AP.fineCompile(renderer, () => loader, 4);
  ok(!!stats && stats.on, "fineCompile installs (live switch window.__fineCompile.on)");
  await new Promise((r) => setTimeout(r, 5));
  const r1 = await renderer._nodes.getForRenderAsync({}, threeYield);
  ok(r1 === "built" && stats.yields >= 2, `playing: the build yields between its stages after 4 ms (${stats.yields} own yields in 6 stages of 3 ms)`);
  ok(log.length >= 4 && log.every((e, i) => e === (i % 2 ? "begin" : "finish")) && renderer._precompilationState?.id === 1, "the precompile state is closed around every own yield and the same state reopened");
  const y0 = stats.yields; loader = true;
  await renderer._nodes.getForRenderAsync({}, threeYield);
  ok(stats.yields === y0 && threeYields > 0, "under the loader: three's yields only");
  loader = false; stats.on = false;
  await renderer._nodes.getForRenderAsync({}, threeYield);
  ok(stats.yields === y0, "switched off (live): three's path");
}

// ------------------------------------------------------------------ 2. heapDrop tick slices
{
  const timers = [];
  const si = globalThis.setInterval; globalThis.setInterval = (f) => (timers.push(f), 1);
  const H = await import("../../viewer/heapDrop.js");
  class DataMap { constructor() { this.data = new WeakMap(); } get(o) { let m = this.data.get(o); if (!m) this.data.set(o, (m = {})); return m; } }
  const A = new DataMap(); A.update = function (a) { this.get(a).version = a.version; };
  const T = new DataMap(); T.updateTexture = () => 0;
  H.installHeapDrop({ _attributes: A, _textures: T }, {});
  globalThis.setInterval = si;
  ok(timers.length === 1, "heapDrop: its 1 s check captured");
  // (tools/gate/timing.mjs: the best of 3 first ticks, each on a fresh tile, between two calibrations; budget * k)
  const geos = [];
  const tickRun = () => {
    const root = new THREE.Group(), mine = [];
    for (let i = 0; i < 60; i++) { const g = new THREE.SphereGeometry(1, 96, 64); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial()); m.name = `buildings-${i}`; root.add(m); mine.push(g); }
    geos.push(...mine);
    H.dropAfterUpload(root, { tag: "buildings:T" });
    for (const g of mine) { for (const a of Object.values(g.attributes)) A.update(a); A.update(g.index); }
    const one = new THREE.SphereGeometry(1, 96, 64); const t1 = performance.now(); one.computeBoundingBox(); one.computeBoundingSphere(); const per = performance.now() - t1;
    const t0 = performance.now(); timers.forEach((f) => f()); const first = performance.now() - t0;
    return { first, per, over: first - 3 * per, droppedNow: mine.filter((g) => g.attributes.position.array.length === 0).length, n: mine.length };
  };
  const M = await measure(() => bestOf(3, tickRun, "over"));
  const { first, per, droppedNow, n } = M.value;
  ok(first <= (3 + 3 * per + 2) * M.k && droppedNow < n, `a tick: ${first.toFixed(1)} ms (<= 3 ms + one geometry, ${per.toFixed(1)} ms; best of 3, ${M.note}), ${droppedNow}/${n} dropped, the rest later`);
  for (let i = 0; i < 200 && geos.some((g) => g.attributes.position.array.length); i++) await new Promise((r) => setTimeout(r, 60));
  ok(geos.every((g) => g.attributes.position.array.length === 0 && g.boundingSphere), "every geometry dropped in later tasks, bounds first");
  const hd = src("viewer/heapDrop.js");
  ok(/DROP_SLICE = qs\.get\("dropslice"\) !== "old", DROP_SLICE_MS = [1-5]\b/.test(hd) && /heapDropStats = \(\) => \(tick\(true\), stats\)/.test(hd), "heapDrop.js: ?dropslice=old, <= 5 ms a task, heapDropStats drains whole");
}

// ------------------------------------------------------------------ 3. sources
{
  const hg = src("viewer/heros/herosGround.js"), hc = src("viewer/heros/herosCity.js");
  ok(/export const dolomiteGeometry = \(\.\.\.a\) => drain\(dolomiteGen\(\.\.\.a\)\)/.test(hg) && /export const lawnGeometry = \(\.\.\.a\) => drain\(lawnGen\(\.\.\.a\)\)/.test(hg), "herosGround.js: the plain builders drain the generators (one code path)");
  ok(/export async function sliced\(g, ms = [1-5]\)/.test(hg) && /if \(\(t & 1535\) === 0\) yield null;/.test(hg), "herosGround.js: sliced() <= 5 ms, the terrain scan yields");
  ok(/HEROS_SLICE \? await sliced\(dolomiteGen\(/.test(hc) && /HEROS_SLICE \? await sliced\(lawnGen\(/.test(hc) && /get\("herosslice"\) !== "old"/.test(hc), "herosCity.js: the ground built through sliced() unless ?herosslice=old");
  const gr = src("viewer/grass/grass.js");
  const at = gr.indexOf("  frame(camera, dt"), fr = gr.slice(at, at + 1400);
  ok(fr.indexOf("if (!on) return [];") > 0 && fr.indexOf("if (!BAKE_OLD) this.field.update(cam);") > fr.indexOf("if (!on) return [];") && /grassbake=old/.test(gr), "grass.js: the field re-bakes only once the blades can show (?grassbake=old)");
  const li = src("viewer/lighting.js");
  ok(li.includes("(WARM_MOVER && /-warm$/.test(o.name") && /get\("warmmover"\) !== "old"/.test(li), "lighting.js: \"*-warm\" groups are sun-cache movers (?warmmover=old)");
  ok(/g\.name = "boot3-late-warm"/.test(src("viewer/warmup.js")), "warmup.js: warmShadows' group name ends with -warm");
  const st = src("viewer/stagedCompile.js");
  ok(st.includes("STAGED_SHADOW && warmShadow ? warmShadow(d.roots)") && /stagedshadow=old/.test(st), "stagedCompile.js: a released landmark's shadow pass warmed, one mesh a frame (?stagedshadow=old)");
}
console.log(fails ? `${fails} stutter check(s) FAILED` : "stutter checks pass");
process.exit(fails ? 1 : 0);
