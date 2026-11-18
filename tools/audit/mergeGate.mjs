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
  { name: "tourdet", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/tour/tourDeterminism.mjs", args: [], guards: "the visual tour is deterministic: views.json / views_xmas.json common switches carry still=1, and under ?still=1 the traffic sim's random parked-car pull-outs / reverse-ins are off (parkRate 0), normal play keeps 1 (claude/deckrail, docs/TOUR.md)" },
  { name: "deckjoins", script: "tools/audit/deckJoins.mjs", args: [], guards: "measured (plan) bridge decks meet the streets / ground on every edge: joined, skirted or railed, no street over the deck at a joint (docs/VIVIER.md)" },
  { name: "deckrails", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/deckRails.mjs", args: ["--quiet"], guards: "every OSM road deck city-wide (band + plan, the 21 tiles with a bridge road): no parapet / railing (nor its car wall) across a street, another deck, a lane / junction turn or a tram track that goes on at the deck's level (1 m and 2 m out, or a lane crossing it), every drawn railing part on a car wall, no edge over a > 0.8 m drop left unrailed that --old had railed (docs/deckrail/rails_old.json; ?deckrail=old: 45 runs / 87 m across fails) (claude/deckrail, rule 17, docs/DECKRAIL.md)" },
  { name: "xmas", script: "tools/audit/xmasCheck.mjs", args: ["--quiet"], guards: "the Christmas layer: firs and market chalets on paving, clear of tram tracks, walls, tree trunks and shop doors; street garlands 7-26 m wide, >= 4.4 m over the street, no star over a tram; the kit's mesh audit 0 blocking; the fir's needle cards on the near level only, its triangle budget per level, the needle atlas size, ornaments clear of the card cores; no light added, no DynamicDrawUsage under viewer/christmas/ (claude/christmas, claude/xmasfir, docs/CHRISTMAS.md)" },
  { name: "xmastest", node: ["--import", "./tools/christmas/hook.mjs"], script: "tools/christmas/xmasTest.mjs", args: [], guards: "the Christmas layer offline: the date switch (1 Dec - 6 Jan, ?xmas, ?day), the kit's pieces / levels / attributes, every slot material builds, lights emissive only, the fir's needle cards (canopy normals on the decoded GLB, alpha tested not blended, two-sided), the shop-front families, the level buckets (claude/christmas, claude/xmasfir)" },
  { name: "skyctl", script: "tools/audit/skyctlCheck.mjs", args: [], guards: "the dev panel's sky controls: every URL key has a features row + panel control with one range, defaults = the sky's own (the look as before), extras neutral, no lights, uniforms only (claude/skyctl)" },
  { name: "stutter", node: ["--import", "./tools/heap/register.mjs"], script: "tools/audit/stutterCheck.mjs", args: ["--quiet"], guards: "falcon-flight hitches: compile slices <= 4 ms while playing (asyncPipes.js fineCompile), the heap-drop check <= 3 ms a task, the Square des Heros ground in slices, a tile landing's stops-to-plants placements a frame apart, the grass field baked only when blades can show, shadow-warm groups drawn by the sun cache, staged landmarks' shadow pass warmed; each behind its ?x=old (claude/falconstutter, docs/perf/FALCON_STUTTER.md)" },
  { name: "stutter2", node: ["--import", "./tools/christmas/hook.mjs"], script: "tools/audit/stutter2Check.mjs", args: ["--quiet"], guards: "falcon-flight hitches round 2: the street-life boxes' node build shared by every tile (three's own canReferenceInstanceData passes, 0 builds per new tile), a distance-swapped mesh's fading copies (kit walls near + far) made with its first tile and a retire's new copies shadow-warmed, a tile's gardens and the hero collider poll in <= 3 ms slices (same results as at once, yields without the timer clamp), the hero BVH copy transferred; each behind its ?x=old (claude/falcon2, docs/perf/FALCON_STUTTER.md)" },
  { name: "roadbends", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/roadBends.mjs", args: ["--quiet"], guards: "road-engine strips at sharp bends, all tiles: 0 folded triangles (plan vs station / lateral frame), no spike, no crack between a row's copies, no exposed hole added, the engine sidewalks / verges (drawn where UrbIS maps nothing) 0 folded too, every vertex the trim moved near a folding bend (the rest bit-identical, kept triangles in order), the default build path = the audited trim (claude/curvedroads, docs/roads/BENDS.md)" },
  { name: "mdrawcull", node: ["--import", "./tools/heap/register.mjs"], script: "tools/audit/mdrawCull.mjs", args: ["--quiet"], guards: "multi-draw culls (viewer/multiDraw.js) on a synthetic city: chunks tile every part exactly (CHMAX fallback too), no instance in a view / sun / lamp frustum lost vs 160 m chunks, fewer drawn with ?mdchunk=80, view camera near to far with ?mdsort=1, shadow + blended passes in the old order, defaults 160 m / 48 unsorted, indirect <= 2560 B a part with range uploads, sort <= 20 us, cull <= 2 x old (claude/mdraw, docs/AGARGARO.md)" },
  { name: "policerear", node: ["--import", "./tools/christmas/hook.mjs"], script: "tools/audit/policeRear.mjs", args: ["--quiet"], guards: "the player's police car rear in the chase view: the rear plate a pre-filtered texture on every police body, the rear's thin-feature (clamp-miss) budget at the chase camera, the switch a features row, no light / DynamicDrawUsage (claude/policerear, docs/POLICEREAR.md)" },
  { name: "drivecheck", script: "tools/audit/driveCheck.mjs", args: ["--all", "--quiet", "--worst", "0", "--max", "211", "--maxhero", "3", "--maxsrc", "tree=0"], guards: "every driven lane / junction turn and every driven street's centre line of all 120 tiles walked headless with the car's body against the car's colliders (worker + lamps / bollards / gardens + every landmark / bridge / tunnel LOD0 built by heroColliders.js from the place's own surface layers): no collider standing >= 0.3 m into the carriageway beyond today's census (211 places: 153 lane / band data through drawn buildings and alleys, 20 garden pieces into a measured roadway, 34 UrbIS bollards, 4 drive-surface defects incl. the E8 Bigarreaux cliff under the Engeland bridge = hero 3), no LiDAR trunk in a carriageway (?roadtrees=old: 63); ?heroground=old (`--old`, the car below the bridge when built): 280 places, hero 9 (6 on the Verrewinkel bridge, 136 m of path) (claude/drivecheck, rule 27 provisional, docs/DRIVECHECK.md)" },
  { name: "colliders", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/colliderAudit.mjs", args: ["F1", "E4", "B6", "D4", "--jobs", "4", "--quiet", "--worst", "0", "--max", "gate=0,lane=75,missing=6,invisible=7,offset=17"], guards: "colliders vs what is drawn on 4 tiles (Carre Cassimans F1, the police station E4, Professeur Hustin B6, the D4 slope block): the police gate mouth clear, building colliders traced from the SUNK walls (?colfeet=old: missing 10 / invisible 13 / offset 34 fails), no new lane blocker (ceilings); city-wide: --all (claude/collisions, rule 25 provisional, docs/COLLIDER_AUDIT.md)" },
  { name: "balconies", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/census/balconies.mjs", args: ["H2", "H4", "G3", "D6", "J3", "F3", "--jobs", "3", "--quiet", "--max", "0"], guards: "census class B: every apartment-block balcony closed at both sides (a side parapet or a wall meets a ray along the slab at each end), 0 open ends on the 6 tiles with the most balconies (?balcony=old: 8,256 open ends of 4,601 slabs fails); the closed shell's own test (synthetic, with and without shared dividers): watertight except on the wall plane, wound by its normals, 11 quads a balcony as before; city-wide: --all (claude/balcony, rule 27 provisional, docs/CENSUS.md B)" },
  { name: "heroshell", node: ["--import", "./tools/road_audit/register.mjs"], script: "tools/audit/heroShell.mjs", args: ["--quiet"], guards: "every hero (landmark GLB, 17) closed from the street at every LOD: 16-direction ray probe (back-face / see-through fails, clusters >= 1 m2), party walls against a neighbour's solid and the listed intended openings (tools/audit/heroShell.allow.json: lanterns, porch colonnade, platform canopy) excluded, open m2 per hero and level <= tools/audit/heroShell.ceil.json; every placed hero probed (claude/heroshell, rule 29 provisional, docs/CENSUS.md class A)" },
  { name: "lycee", node: ["--import", "./tools/christmas/hook.mjs"], script: "tools/audit/lyceeCheck.mjs", args: ["--quiet"], guards: "the Lycée Français front: its bars pre-filtered (a coverage card on every panel and the gate, the modelled bars only where >= 2 internal px), no two faces within 1 mm over the same area, none in a building wall, no garden piece / plant on the railing; ?quick=1 keeps its flags; the Chemin privé 't Cortenbosch old lane (OSM 1235727248) built every metre, >= 2.5 m, joined at both ends, one-way in the OSM direction, nothing standing on it (claude/lycee, docs/LYCEE.md)" },
];
const BROWSER = [
  "HEAP (docs/HEAP.md): fresh tab, localStorage cleared, each boot: ?gamemenu=0&orbitcam2=old, default (menu), ?gamemenu=0&tilecache=0 (cold), ?game=police (+ debug/gamePerf.js police({ seconds: 45 }): tiles unload + reload), ?game=falcon: console 0 [heapDrop] errors, 0 WebGPU errors, window.__heapDrop.tripCounts {} (window.__queueSkips: disposed meshes the queue left out) (claude/heap)",
  "FALCON STUTTER (docs/perf/FALCON_STUTTER.md): ?game=falcon, after the play loader (await import('/debug/falconStutter.js')).run({ seconds: 60 }): summary.over50 0, p99 <= 25 ms, every long frame's why attributed (claude/falconstutter); round 2: alternate page loads default / &retirewarm=old&boxshare=old&gardenslice=old&heropoll=old, and ?buildaudit=1: 0 streetlife-box / walls (kit, far):fade builds on screen after the first tile (claude/falcon2)",
  "VISUAL TOUR (docs/TOUR.md): debug/tour.html on the branch vs the claude/foundation baseline, node tools/tour/compare.mjs; look at every flagged view (claude/tour)",
  "debug/sharpCheck.js  motionCoverage(): every mesh that moved over 30 frames has a motion source (claude/sharp)",
  "debug/sharpCheck.js  stability(): frame-to-frame luma noise + Laplacian sharpness while parked / driving (claude/sharp)",
  "debug/rearCheck.js  ab(): the police car's rear crop while driving straight / turning in the chase view, old (modelled plate) vs new (textured) alternated + isolation knobs: shimmer + hot pixels of the default <= the old state (claude/policerear)",
  "debug/lyceeCheck.js  ab(): the Lycée Français fence (left of the vehicle gate) and gate crops at 3 / 8 / 20 m while the camera dollies sideways, ?lyceerail old / new / blend alternated: shimmer + hot pixels of the default <= old (claude/lycee, docs/LYCEE.md)",
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
