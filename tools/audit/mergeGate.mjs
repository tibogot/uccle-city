// node tools/audit/mergeGate.mjs: every gate check before a merge, one table. Each check is a node script that exits
// non-zero on failure. To add one: one line in CHECKS (name, script, args, what it guards; optional node: [node options]). Keep it simple.
// Browser-side gates (need the viewer running) go in BROWSER: the merger runs them on a browser turn.
// node tools/audit/mergeGate.mjs [name ...]   (only those)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, symlinkSync } from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKS = [
  { name: "carctl", script: "tools/carctlTest.mjs", args: [], guards: "car handling targets (radius, response, slip, kerb, hill, braking), camera jitter, trams / trains solid (docs/CARCTL.md)" },
  { name: "motion", script: "tools/audit/motionAudit.mjs", args: [], guards: "motion vectors on every mover + upscale guarantees (claude/sharp)" },
  { name: "shell", script: "tools/audit/shellGate.mjs", args: [], guards: "every building's outer shell closed from the street: no wall wound inward, no open edge (claude/holes)" },
  { name: "gardenzfight", script: "tools/audit/gardenZfight.mjs", args: ["--all", "--max", "40"], guards: "no two garden pieces draw a face in one plane over the same area, <= 40 small known (claude/holes)" },
  { name: "heap", script: "tools/audit/heapGate.mjs", args: [], guards: "CPU copies dropped after the GPU upload have no unlisted reader; loadTile keeps no build result; heapDrop logic; the compile queue / flush never draw a disposed geometry (claude/heap, docs/HEAP.md)" },
  { name: "orbitcam", script: "tools/orbitCamTest.mjs", args: [], guards: "orbit camera: picks, orbit / zoom / pan / frame, keyboard moves (no NaN, over the ground, speed by height, walls stop it) (claude/orbitcam2)" },
  { name: "trafpark", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/trafParkAudit.mjs", args: ["--quiet", "--max", "0", "--all"], guards: "no parked car overlaps a traffic lane, all tiles (claude/trafpark)" },
  { name: "trafparksim", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/trafParkSimTest.mjs", args: ["--tile", "I6", "--secs", "240"], guards: "simulated traffic never drives through a parked car (tile I6, 240 s) (claude/trafpark)" },
  { name: "trafparkborder", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/trafParkBorder.mjs", args: [], guards: "no parked car under a NEIGHBOUR tile's own lane after the border drop (8 tiles: D3 D4 E3 E4 H5 H6 I5 I6) (claude/trafpark)" },
  { name: "twinlink", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/twinLink.mjs", args: ["--quiet"], guards: "tile-border lane links: >= 99 % of the buffer copies with a twin in a loaded neighbour linked to it, 0 wrong links, link <= 5 ms per tile pair (13 tiles: Saint-Job 3 x 3 + Alsemberg) (claude/twinlink, docs/TWINLINK.md)" },
  { name: "bridges", script: "tools/audit/bridgeAudit.mjs", args: ["--quiet"], guards: "every road-rail crossing resolves to a built structure: road bridges' decks cover their UrbIS polygon, no slab in a cutting, no open cutting under a road, roads under the line under a rail bridge, catenary under the decks (docs/VIVIER.md)" },
  { name: "deckjoins", script: "tools/audit/deckJoins.mjs", args: [], guards: "measured (plan) bridge decks meet the streets / ground on every edge: joined, skirted or railed, no street over the deck at a joint (docs/VIVIER.md)" },
  { name: "xmas", script: "tools/audit/xmasCheck.mjs", args: ["--quiet"], guards: "the Christmas layer: firs and market chalets on paving, clear of tram tracks, walls, tree trunks and shop doors; street garlands 7-26 m wide, >= 4.4 m over the street, no star over a tram; the kit's mesh audit 0 blocking; the fir's needle cards on the near level only, its triangle budget per level, the needle atlas size, ornaments clear of the card cores; no light added, no DynamicDrawUsage under viewer/christmas/ (claude/christmas, claude/xmasfir, docs/CHRISTMAS.md)" },
  { name: "xmastest", node: ["--import", "./tools/christmas/hook.mjs"], script: "tools/christmas/xmasTest.mjs", args: [], guards: "the Christmas layer offline: the date switch (1 Dec - 6 Jan, ?xmas, ?day), the kit's pieces / levels / attributes, every slot material builds, lights emissive only, the fir's needle cards (canopy normals on the decoded GLB, alpha tested not blended, two-sided), the shop-front families, the level buckets (claude/christmas, claude/xmasfir)" },
  { name: "skyctl", script: "tools/audit/skyctlCheck.mjs", args: [], guards: "the dev panel's sky controls: every URL key has a features row + panel control with one range, defaults = the sky's own (the look as before), extras neutral, no lights, uniforms only (claude/skyctl)" },
  { name: "stutter", node: ["--import", "./tools/heap/register.mjs"], script: "tools/audit/stutterCheck.mjs", args: ["--quiet"], guards: "a streamed tile's meshes enter the passes / get their own materials back <= FADE_SLICE_N a frame (lodFade.js stageIn + Fader), a retired tile leaves the scene at once and is freed <= 48 meshes / 1.5 ms a frame (main.js disposeLater), the falcon's landmark proxies yield every 3 ms; old paths behind ?fadeslice=old / ?disposeslice=old / ?proxyslice=old (claude/falconstutter, docs/perf/FALCON_STUTTER.md)" },
  { name: "mdrawcull", node: ["--import", "./tools/heap/register.mjs"], script: "tools/audit/mdrawCull.mjs", args: ["--quiet"], guards: "multi-draw culls (viewer/multiDraw.js) on a synthetic city: chunks tile every part exactly (CHMAX fallback too), no instance in a view / sun / lamp frustum lost vs 160 m chunks, fewer drawn with ?mdchunk=80, view camera near to far with ?mdsort=1, shadow + blended passes in the old order, defaults 160 m / 48 unsorted, indirect <= 2560 B a part with range uploads, sort <= 20 us, cull <= 2 x old (claude/mdraw, docs/AGARGARO.md)" },
];
const BROWSER = [
  "HEAP (docs/HEAP.md): fresh tab, localStorage cleared, each boot: ?gamemenu=0&orbitcam2=old, default (menu), ?gamemenu=0&tilecache=0 (cold), ?game=police (+ debug/gamePerf.js police({ seconds: 45 }): tiles unload + reload), ?game=falcon: console 0 [heapDrop] errors, 0 WebGPU errors, window.__heapDrop.tripCounts {} (window.__queueSkips: disposed meshes the queue left out) (claude/heap)",
  "FALCON STUTTER (docs/perf/FALCON_STUTTER.md): ?game=falcon, after the play loader (await import('/debug/falconStutter.js')).run({ seconds: 60 }): summary.over50 0, p99 <= 25 ms, every long frame's why attributed (claude/falconstutter)",
  "VISUAL TOUR (docs/TOUR.md): debug/tour.html on the branch vs the claude/foundation baseline, node tools/tour/compare.mjs; look at every flagged view (claude/tour)",
  "debug/sharpCheck.js  motionCoverage(): every mesh that moved over 30 frames has a motion source (claude/sharp)",
  "debug/sharpCheck.js  stability(): frame-to-frame luma noise + Laplacian sharpness while parked / driving (claude/sharp)",
  "TRAFPARK (docs/TRAFPARK.md): ?quick=1&place=alsemberg|stjob-street|fortjaco&with=traffic, then (await import('/debug/trafparkWatch.js')).watch(150): into 0, parkedHit 0 (claude/trafpark)",
];

// A git worktree lacks the main checkout's untracked inputs (node_modules, the raw data): link them in (junctions),
// so a gate in a worktree tests the code, not the folder. Both paths are git-ignored.
const LOCAL_ONLY = ["tools/worker/node_modules", "data/raw"];
try {
  const main = path.dirname(spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT, encoding: "utf8" }).stdout.trim());
  if (main && path.resolve(main) !== path.resolve(ROOT)) {
    for (const p of LOCAL_ONLY) {
      const here = path.join(ROOT, p), there = path.join(main, p);
      if (!existsSync(here) && existsSync(there)) { symlinkSync(there, here, "junction"); console.log(`linked ${p} -> ${there}`); }
    }
  }
} catch (e) { console.log(`(worktree links skipped: ${e.message})`); }

const only = process.argv.slice(2);
const rows = [];
let failed = 0;
for (const c of CHECKS) {
  if (only.length && !only.includes(c.name)) continue;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [...(c.node || []), path.join(ROOT, c.script), ...c.args], { cwd: ROOT, encoding: "utf8", timeout: 10 * 60 * 1000 });
  const ok = r.status === 0;
  if (!ok) failed++;
  const out = ((r.stdout || "") + (r.stderr || "")).trim().split("\n");
  const fails = out.filter((l) => /FAIL/.test(l)).slice(0, 3).map((l) => l.trim().slice(0, 120));
  rows.push([c.name, ok ? "PASS" : "FAIL", ((Date.now() - t0) / 1000).toFixed(1) + " s", ok ? c.guards : fails.join(" / ") || `exit ${r.status}`]);
}
console.log("| check | result | time | guards / failures |\n|---|---|---|---|");
for (const r of rows) console.log("| " + r.join(" | ") + " |");
console.log(`\nbrowser gates (run on a browser turn):\n  ${BROWSER.join("\n  ")}`);
console.log(failed ? `\n${failed} gate check(s) FAILED` : "\nall gate checks pass");
process.exitCode = failed ? 1 : 0;
