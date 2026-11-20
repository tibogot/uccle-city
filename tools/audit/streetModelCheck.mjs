// GATE ROW `model` (claude/street2, rule street-model, docs/STREET_MODEL_PLAN.md job 2): the street model v0
// (viewer/street/model.js) as the tile worker builds it, every tile in its OWN process (tools/audit/census/lib_street.mjs
// runTiles), so an element shared by two tiles is built twice, independently:
//   schema      every element of every tile passes validateElement (typed arrays of the right length, ids
//               s:<way>:<nodeA>-<nodeB> / j:<node>, an owner tile, kerbL left of kerbR, a confidence on every station of
//               every kerb / drive end / axis / lane boundary, every M kerb with its measured line kind, M elements
//               naming their UrbIS sources)
//   coverage    every road of data/roads/network.json (a driven OSM way piece) in exactly one segment, every OSM way of the
//               network in some segment's sources, segment ids unique
//   seam        every element present in two or more tiles has byte-identical canonical bytes (elementHash) in each:
//               a neighbour carries the owner's element, never its own recomputation from clipped data
//   owner       every segment is held by its owner tile (when that tile is built), every junction by its node's tile
//   fixture     the owner's Ch. de Saint-Job stretch (E7 r71812634_1): both kerbs M on >= 80 % of it, its centre line D
//               on >= 40 % (the rest: the junction mouths)
// Only the model is built (no road stage): about 1 s a tile.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/streetModelCheck.mjs [--all | T ...] [--quiet]
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runTiles, cli, ROOT } from "./census/lib_street.mjs";
import { tileEntry } from "../road_audit/tile.mjs";

const { CHILD, TILES, flag } = cli();
const QUIET = flag("--quiet");
const imp = (p) => import(new URL(`../../${p}`, import.meta.url).href);
const json = (p) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), "utf8")) : null);

if (CHILD) {
  const T = TILES[0];
  const { buildStreetModel, validateElement, elementHash, CONF, ROLE } = await imp("viewer/street/model.js");
  const { streetModelInputsSync } = await imp("viewer/street/inputs.js");
  const e = tileEntry(T), bounds = { x0: e.bounds.x[0], x1: e.bounds.x[1], z0: e.bounds.z[0], z1: e.bounds.z[1] };
  const t0 = performance.now();
  const inp = streetModelInputsSync({ readJson: json, name: T, bounds, overrides: json("data/overrides.json") ?? {} });
  const t1 = performance.now();
  const M = buildStreetModel({ ...inp, bounds });
  const t2 = performance.now();
  const els = [...M.segments, ...M.junctions].map((E) => ({ id: E.id, kind: E.kind, owner: E.owner, hash: elementHash(E), bad: validateElement(E) }));
  const fx = M.segments.filter((E) => E.sources.roads.includes("r71812634_1")).map((E) => {
    const n = E.n, m = (a) => a.filter((q) => q === CONF.M).length / n, B = E.lanes.B;
    let cD = 0, cN = 0;
    for (let i = 0; i < n; i++) for (let b = 0; b < B; b++) if (E.lanes.role[i * B + b] === ROLE.centre && E.lanes.code[i * B + b] > 0) { cN++; if (E.lanes.bconf[i * B + b] <= CONF.D) cD++; }
    return { id: E.id, kL: m(E.kerbL.conf), kR: m(E.kerbR.conf), centreD: cN ? cD / cN : 0 };
  });
  console.log(JSON.stringify({ tile: T, els, stats: M.stats, inputsMs: Math.round(t1 - t0), modelMs: Math.round(t2 - t1), fixture: fx }));
  process.exit(0);
}

if (!TILES.length) { console.error("usage: streetModelCheck.mjs [--all | T ...]"); process.exit(2); }
let bad = 0;
const fail = (m) => { bad++; console.log(`  FAIL ${m}`); };
// coverage (the network alone)
{
  const { networkIndex } = await imp("viewer/street/model.js");
  const net = json("data/roads/network.json"), N = networkIndex(net, null);
  const seen = new Map(); for (const c of N.chains) for (const r of c.roads) seen.set(r, (seen.get(r) || 0) + 1);
  const missing = net.roads.filter((r) => !seen.has(r.id)).map((r) => r.id), twice = [...seen].filter(([, k]) => k > 1).map(([r]) => r);
  const ways = new Set(net.roads.flatMap((r) => (r.meta?.osmWays?.length ? r.meta.osmWays : [r.meta?.osm]).filter((w) => w != null).map(String)));
  const inSeg = new Set(N.chains.flatMap((c) => c.ways));
  const lostWays = [...ways].filter((w) => !inSeg.has(w));
  const ids = new Set(N.chains.map((c) => c.id));
  console.log(`model coverage: ${net.roads.length} network roads in ${N.chains.length} segments (${N.chains.filter((c) => c.roads.length > 1).length} chains of 2+ roads), ${ways.size} OSM ways; in no segment ${missing.length}, in two ${twice.length}, ways in no segment ${lostWays.length}, duplicate ids ${N.chains.length - ids.size}`);
  if (missing.length) fail(`roads in no segment: ${missing.slice(0, 5).join(", ")}`);
  if (twice.length) fail(`roads in two segments: ${twice.slice(0, 5).join(", ")}`);
  if (lostWays.length) fail(`OSM ways in no segment: ${lostWays.slice(0, 5).join(", ")}`);
  if (N.chains.length !== ids.size) fail("duplicate segment ids");
}
const res = await runTiles(new URL(import.meta.url), TILES, { log: !QUIET });
const byId = new Map(), done = new Set();
let nEl = 0, nBad = 0, inMs = 0, mMs = 0, maxMs = 0;
for (const r of res) {
  if (r.error) { fail(`${r.tile}: did not build`); continue; }
  done.add(r.tile); inMs += r.inputsMs; mMs += r.modelMs; maxMs = Math.max(maxMs, r.modelMs);
  for (const e of r.els) { nEl++; if (e.bad.length) { nBad++; if (nBad <= 8) fail(`${r.tile} ${e.bad[0]}`); } (byId.get(e.id) || byId.set(e.id, []).get(e.id)).push({ tile: r.tile, ...e }); }
}
if (nBad > 8) fail(`... ${nBad} elements with schema problems in all`);
let shared = 0, mism = 0, ownerMiss = 0;
for (const [id, L] of byId) {
  if (L.length > 1) { shared++; const h = new Set(L.map((q) => q.hash)); if (h.size > 1) { mism++; if (mism <= 8) fail(`seam: ${id} differs between ${L.map((q) => `${q.tile}:${q.hash}`).join(" ")}`); } }
  const own = L[0].owner;
  if (done.has(own) && !L.some((q) => q.tile === own)) { ownerMiss++; if (ownerMiss <= 5) fail(`owner: ${id} (owner ${own}) is not in its owner's model`); }
}
if (mism > 8) fail(`... ${mism} elements differ across tiles in all`);
console.log(`model: ${done.size} tiles, ${nEl} elements (${byId.size} distinct, ${shared} held by 2+ tiles), schema problems ${nBad}, seam mismatches ${mism}, owner misses ${ownerMiss}; inputs ${Math.round(inMs / Math.max(1, done.size))} ms + model ${Math.round(mMs / Math.max(1, done.size))} ms a tile (worst model ${maxMs} ms)`);
if (done.has("E7")) {
  const fx = res.filter((r) => r.tile === "E7").flatMap((r) => r.fixture || []);
  const ok = fx.length > 0 && fx.every((f) => f.kL >= 0.8 && f.kR >= 0.8 && f.centreD >= 0.4);
  console.log(`  ${ok ? "ok  " : "FAIL"} fixture Ch. de Saint-Job E7 r71812634_1: ${fx.map((f) => `${f.id} kerbs M ${Math.round(f.kL * 100)} / ${Math.round(f.kR * 100)} %, centre line D ${Math.round(f.centreD * 100)} %`).join("; ") || "no segment"}`);
  if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
