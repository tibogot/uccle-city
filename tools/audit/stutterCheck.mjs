// FALCON STUTTER GATE (claude/falconstutter, docs/perf/FALCON_STUTTER.md, docs/QUALITY_RULES.md rule 22).
//   node --import ./tools/heap/register.mjs tools/audit/stutterCheck.mjs [--quiet]      exit 1 on a failure
// WHY: a streamed tile swapped every mesh's material in ONE frame at its fade's start (to the fading copies) and end
// (back to its own), and freed every mesh in ONE frame when it left: three r187 makes / drops a render object per
// (object, material, pass) on the next draw (bindings, uniform buffers, bind groups, GPU buffer destroys), so a tile of
// hundreds of meshes was hundreds of them in one frame, while the falcon flies over the city (tiles every few seconds).
// RULE: per-frame work that scales with a tile's mesh count is sliced: at most FADE_SLICE_N meshes enter the passes / get
// their material back a frame, at most DISPOSE_N meshes (<= DISPOSE_MS) are freed a frame; the slices change nothing on
// screen (fading copies at fade 0 draw nothing, at fade 1 everything; a retired tile is out of the scene first).
// Checks (the real viewer/lodFade.js on three r187 in node, and the source of viewer/main.js / cityStream.js):
//   1. stageIn: the meshes come out of the gate FADE_SLICE_N a frame, fading copies first, at fade 0, groups visible;
//      none gated at the end; a fade() during a staged reveal puts every material back
//   2. Fader: a finished fade-in gives the own materials back <= FADE_SLICE_N a frame, done() once, after the last;
//      with the switch off (?fadeslice=old) all in one frame, as before; a fade-out ends whole (it is disposed)
//   3. main.js: loadTile stages its groups before the fade (sliceStats.on), its dispose takes the groups out of the
//      scene before freeing them through disposeLater, bounded by DISPOSE_N / DISPOSE_MS; ?disposeslice=old keeps the old path
//   4. cityStream.js addProxy yields every PROXY_SLICE_MS (?proxyslice=old: one task)
//   5. no DynamicDrawUsage, no light made in the files this gate covers; the switches have viewer/features.js rows
import * as THREE from "three/webgpu";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
globalThis.window = globalThis; globalThis.location = { search: "" };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 0);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const L = await import("../../viewer/lodFade.js");
const N = L.FADE_SLICE_N;
ok(L.FADE_SLICE === true && N >= 8 && N <= 64, `defaults: staged reveal on, ${N} meshes a frame`);

// a tile: 3 groups, 150 meshes with node materials (fading copies), 10 with a fade-safe own material (no copy)
function tile() {
  const gs = [];
  const shared = new THREE.MeshStandardNodeMaterial();
  for (let k = 0; k < 3; k++) {
    const g = new THREE.Group(); g.name = `T-${k}`; g.visible = false;
    for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(), i % 3 ? shared : new THREE.MeshStandardNodeMaterial()); m.name = `m${k}-${i}`; g.add(m); }
    gs.push(g);
  }
  const safe = new THREE.MeshStandardNodeMaterial(); safe.userData.noFade = true;
  for (let i = 0; i < 10; i++) gs[2].add(new THREE.Mesh(new THREE.BoxGeometry(), safe));
  return gs;
}
const meshes = (gs) => gs.flatMap((g) => { const a = []; g.traverse((o) => { if (o.isMesh) a.push(o); }); return a; });
const gated = (o) => o.material?.name === "fade-gate";

// 1. stageIn
{
  const gs = tile(), all = meshes(gs), own = new Map(all.map((o) => [o, o.material]));
  const perFrame = [];
  let firstPhaseSafeOut = false;
  const frame = async () => { const out = all.filter((o) => !gated(o)); perFrame.push(out.length); if (out.some((o) => own.get(o).userData.noFade) && all.some((o) => gated(o) && !own.get(o).userData.noFade)) firstPhaseSafeOut = true; };
  const p = L.stageIn(gs, { frame });
  ok(all.filter((o) => !gated(o)).length === N && gs.every((g) => g.visible), `stageIn: the groups shown, only the first ${N} meshes out of the gate for the first frame`);
  const frames = await p;
  const steps = perFrame.map((n, i) => n - (perFrame[i - 1] ?? 0));
  ok(frames === Math.ceil(all.length / N) && steps.every((s) => s <= N), `stageIn: ${all.length} meshes in ${frames} frames, <= ${N} a frame (max ${Math.max(...steps)})`);
  ok(!firstPhaseSafeOut, "stageIn: the meshes without a fading copy come out last");
  ok(all.every((o) => !gated(o) && o.userData.fadeGate === undefined), "stageIn: none gated at the end");
  const withCopy = all.filter((o) => !own.get(o).userData.noFade);
  ok(withCopy.every((o) => o.userData.fadeOrig === own.get(o) && o.material !== own.get(o) && /:fade$/.test(o.material.name)), "stageIn: the fading copies in, the own materials kept in fadeOrig");
  ok(all.every((o) => o.userData.fade === 0), "stageIn: fade 0 (the copies draw nothing yet)");
  // 2. the fade: in, then the own materials back a slice a frame
  const F = new L.Fader();
  let done = 0;
  for (const g of gs) F.fade(g, +1, () => done++);
  ok(withCopy.every((o) => o.userData.fadeOrig === own.get(o)), "fade(): starts on the staged copies (nothing swapped again)");
  F.update(10);                                   // (t = 1 at once)
  const back = () => all.filter((o) => o.material === own.get(o)).length;
  const counts = [back()];
  for (let i = 0; i < 40 && F.busy; i++) { F.update(0.016); counts.push(back()); }
  const inc = counts.map((n, i) => n - (counts[i - 1] ?? (all.length - withCopy.length)));
  ok(!F.busy && done === 3 && all.every((o) => o.material === own.get(o) && o.userData.fadeOrig === undefined && o.userData.fade === 1), "Fader: every own material back, fade 1, done() once per group");
  ok(inc.every((s) => s <= N * 3), `Fader: own materials back <= ${N} a group a frame (max ${Math.max(...inc)} over 3 groups)`);
}
// 1b. a fade() during a staged reveal: every material back first
{
  const gs = tile(), all = meshes(gs), own = new Map(all.map((o) => [o, o.material]));
  let n = 0, F = new L.Fader();
  const frame = async () => { if (++n === 2) for (const g of gs) F.fade(g, -1); };
  await L.stageIn(gs, { frame });
  ok(all.every((o) => !gated(o) && o.userData.fadeGate === undefined), "a fade() during a staged reveal: no mesh left behind the gate");
  F.update(10);
  ok(!F.busy && all.every((o) => o.material === own.get(o)), "a fade-out ends whole (own materials back in its last frame: it is disposed then)");
}
// 2b. the switch off: as before
{
  L.sliceStats.on = false;
  const gs = tile(), all = meshes(gs), own = new Map(all.map((o) => [o, o.material]));
  const fr = await L.stageIn(gs, { frame: async () => {} });
  ok(fr === 0 && gs.every((g) => g.visible) && all.every((o) => o.material === own.get(o)), "?fadeslice=old: stageIn only shows the groups");
  const F = new L.Fader();
  for (const g of gs) F.fade(g, +1);
  F.update(10);
  ok(!F.busy && all.every((o) => o.material === own.get(o)), "?fadeslice=old: the fade-in ends whole in one frame");
  L.sliceStats.on = true;
}

// 3-5. the sources
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const main = src("viewer/main.js"), cs = src("viewer/falconFlight/cityStream.js"), lf = src("viewer/lodFade.js"), feat = src("viewer/features.js");
const lt = main.slice(main.indexOf("async function loadTile("), main.indexOf("\n}\n", main.indexOf("async function loadTile(")));
const iStage = lt.indexOf("await stageIn(Object.values(own)"), iFade = lt.indexOf("fader.fade(g, +1)");
ok(iStage > 0 && iFade > iStage && /if \(fadeIn && sliceStats\.on && !fader\.hold\)/.test(lt), "main.js loadTile: the groups staged (sliceStats.on) before their fade starts");
const disp = lt.slice(lt.indexOf("const dispose = () => {"), lt.indexOf("\n  };", lt.indexOf("const dispose = () => {")));
ok(/if \(disposeStats\.on\) \{ const gs = Object\.values\(own\); for \(const g of gs\) g\.removeFromParent\(\); disposeLater\(gs\); \}/.test(disp) && /else for \(const g of Object\.values\(own\)\)/.test(disp), "main.js loadTile dispose: out of the scene first, then disposeLater; the old path behind ?disposeslice=old");
const dl = main.slice(main.indexOf("function disposeLater("), main.indexOf("\n}\n", main.indexOf("function disposeLater(")));
ok(/k < DISPOSE_N/.test(dl) && /performance\.now\(\) - t0 < DISPOSE_MS/.test(dl) && /requestAnimationFrame\(step\)/.test(dl) && /DISPOSE_N = (\d+), DISPOSE_MS = ([\d.]+)/.test(main) && +RegExp.$1 <= 64 && +RegExp.$2 <= 2, "main.js disposeLater: <= DISPOSE_N meshes and <= DISPOSE_MS a frame, the rest next frame");
ok(/params\.get\("disposeslice"\) !== "old"/.test(main), "main.js: ?disposeslice=old switch");
const ap = cs.slice(cs.indexOf("async addProxy("), cs.indexOf("\n  }\n", cs.indexOf("async addProxy(")));
ok(/PROXY_SLICE && .*performance\.now\(\) - sliceT > PROXY_SLICE_MS/.test(ap) && /await new Promise\(\(r\) => setTimeout\(r, 0\)\)/.test(ap) && /PROXY_SLICE_MS = [1-5]\b/.test(cs) && /proxyslice=old/.test(cs), "cityStream.js addProxy: yields every PROXY_SLICE_MS (<= 5 ms), ?proxyslice=old");
for (const [n, s] of [["lodFade.js", lf], ["cityStream.js", cs], ["debug/falconStutter.js", src("debug/falconStutter.js")]]) {
  ok(!/DynamicDrawUsage/.test(s), `${n}: no DynamicDrawUsage`);
  ok(!/new THREE\.(Point|Spot|Directional|Hemisphere|RectArea|Ambient)Light\b/.test(s), `${n}: no light made`);
}
for (const k of ["fadeslice", "fadeslicen", "disposeslice", "proxyslice"]) ok(new RegExp(`\\("${k}",`).test(feat), `viewer/features.js: a row for ?${k}`);
console.log(fails ? `${fails} stutter check(s) FAILED` : "stutter checks pass");
process.exitCode = fails ? 1 : 0;
