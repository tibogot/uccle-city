// SIGNAL PHASES CHECK (rule signal-phase-road, viewer/traffic/signals.js signalPhases), node, no browser, no road build:
// every tile's roads.json + features.json, the same phase table the tile worker's traffic graph and the drawn posts read.
//   1. links     every road linking two signal nodes under 150 m apart (and a junction with its signals mapped on its
//                approaches to those signals) is on ONE phase at both ends; odd cycles the 2 phases cannot colour
//                (table.conflicts) at most CONFLICT_MAX
//   2. tiles     a link whose two ends lie in the cores of two tiles: each end's phase as ITS core tile builds it (the
//                sim runs a junction from its core tile's graph, the posts are drawn by the core tile) still agree
//   3. posts     every signal post (viewer/streets/signalPlace.js signalSites) of a tile core shows the phase of the
//                approach it faces, read from the table (no post on the old direction rule where a node rules it)
//   4. crossing  at every real signal junction of up to 4 arms the arms crossing at 60-120 deg are on different phases
//   5. before    with the old rule (phaseOfDir of the post's nearest segment) the links fail (the check sees the defect)
//   node tools/audit/sigphaseCheck.mjs [--quiet]
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { signalPhases, phaseOfDir, nearestRoad, SIGNAL_LINK } = await imp("viewer/traffic/signals.js");
const { signalSites } = await imp("viewer/streets/signalPlace.js");
const { applyRoadOverrides } = await imp("viewer/roadBuild.js");
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const overrides = existsSync(join(ROOT, "data/overrides.json")) ? json(join(ROOT, "data/overrides.json")) : {};
const manifest = json(join(ROOT, "data/tiles/manifest.json"));
let fails = 0;
const check = (name, ok, msg) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };
// (odd rings: close signal links the two phases cannot colour. 1 in the city at claude/signals1: E1 Avenue Coghen /
// Rue Vanderkindere / Ch. d'Alsemberg (n3253896673, n3253896677, n43587464), its one-way link left off phase; never raise)
const CONFLICT_MAX = 1;

const tiles = [];
for (const t of manifest.tiles) {
  if (t.status === "missing") continue;
  const d = join(ROOT, "data/tiles", t.name);
  if (!existsSync(join(d, "roads.json"))) continue;
  const roads = json(join(d, "roads.json"));
  applyRoadOverrides(roads, overrides);
  const feats = existsSync(join(d, "features.json")) ? json(join(d, "features.json")) : { points: [] };
  const b = { x0: t.bounds.x[0], x1: t.bounds.x[1], z0: t.bounds.z[0], z1: t.bounds.z[1] };
  tiles.push({ name: t.name, b, roads, feats, PT: signalPhases(roads) });
}
const inCore = (b, x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
const coreOf = (x, z) => tiles.find((t) => inCore(t.b, x, z));
// a node's arm phase in another tile's table, the arm matched by direction
const phaseIn = (T, id, arm) => {
  const S = T.PT.nodes.get(id); if (!S) return null;
  let best = null, bd = 0.9;
  for (const q of S.arms) { const d = q.ux * arm.ux + q.uz * arm.uz; if (d > bd) { bd = d; best = q; } }
  return best ? S.f ^ best.g : null;
};

// 1 + 2 + 5
// the old rule (before claude/signals1): the phase of the post on that road nearest the node (phaseOfDir of the post's
// nearest segment); no post: the arm's own direction
const oldPhase = (T, N, S, road) => {
  let p = null, bd = 30;
  for (const q of T.feats.points || []) {
    if (q.kind !== "traffic_signals") continue;
    const d = Math.hypot(q.x - S.x, q.z - S.z); if (d > bd) continue;
    const nr = nearestRoad(T.roads, N, q.x, q.z); if (nr?.road?.id !== road) continue;
    bd = d; p = phaseOfDir(nr.ux, nr.uz);
  }
  const a = S.arms.find((q) => q.road === road);
  return p ?? phaseOfDir(a.ux, a.uz);
};
let moves = 0, links = 0, off = [], ringOff = [], conflicts = [], cross = 0, crossOff = [], oldOff = 0, virt = 0, sig = 0;
const seen = new Set();
for (const T of tiles) {
  const N = new Map(T.roads.nodes.map((n) => [n.id, n]));
  for (const S of T.PT.nodes.values()) if (inCore(T.b, S.x, S.z)) S.virtual ? virt++ : sig++;
  for (const c of T.PT.conflicts) if (inCore(T.b, T.PT.nodes.get(c.a).x, T.PT.nodes.get(c.a).z)) conflicts.push(`${c.a}-${c.b}`);
  for (const L of T.PT.links) {
    const A = T.PT.nodes.get(L.a), B = T.PT.nodes.get(L.b);
    const key = `${L.a}|${L.b}`;
    if (!inCore(T.b, A.x, A.z) && !inCore(T.b, B.x, B.z)) continue;
    if (seen.has(key)) continue; seen.add(key);
    links++;
    // the through movements along the link, both ways: from the arm most opposite the link at one end (within 60 deg
    // of straight on) to the link's arm at the other, where the one-way tags let traffic in
    const rb = (id) => T.roads.roads.find((q) => q.id === id);
    const canEnter = (id, node) => { const r = rb(id), o = r?.meta?.oneway; return !r ? false : o === "yes" || o === "1" || o === "true" ? r.b === node : o === "-1" ? r.a === node : true; };
    for (const [X, rx, Y, ry] of [[A, L.ra, B, L.rb], [B, L.rb, A, L.ra]]) {
      const ax = X.arms.find((q) => q.road === rx); let far = null, fd = -0.5;
      for (const q of X.arms) { const d = q.ux * ax.ux + q.uz * ax.uz; if (q !== ax && d < fd) { fd = d; far = q; } }
      if (!far || !canEnter(far.road, X.id) || !canEnter(ry, Y.id) || X.virtual || Y.virtual) continue;
      moves++;
      if (T.PT.phaseAt(X.id, far.road) !== T.PT.phaseAt(Y.id, ry)) (T.PT.conflicts.includes(L) ? ringOff : off).push(`${X.id}->${Y.id} (${T.name})`);
      if (oldPhase(T, N, X, far.road) !== oldPhase(T, N, Y, ry)) oldOff++;
    }
    if (T.PT.phaseAt(L.a, L.ra) !== T.PT.phaseAt(L.b, L.rb) && !T.PT.conflicts.includes(L)) off.push(`${L.a}-${L.b} link (${T.name})`);
    const TA = coreOf(A.x, A.z), TB = coreOf(B.x, B.z);
    if (TA && TB && TA !== TB) {
      cross++;
      const pa = phaseIn(TA, L.a, A.arms.find((q) => q.road === L.ra)), pb = phaseIn(TB, L.b, B.arms.find((q) => q.road === L.rb));
      if (pa == null || pb == null || pa !== pb) crossOff.push(`${L.a} (${TA.name}) - ${L.b} (${TB.name})`);
    }
  }
}
check("close signal links on one phase", links > 0 && !off.length && conflicts.length <= CONFLICT_MAX,
  `${sig} signal nodes + ${virt} junctions with their signals on the approaches; ${links} links < ${SIGNAL_LINK} m, ${moves} through movements on them; off phase ${off.length}${off.length ? ": " + off.slice(0, 6).join(", ") : ""}; odd rings ${conflicts.length} (<= ${CONFLICT_MAX})${conflicts.length ? ": " + conflicts.slice(0, 6).join(", ") + ` (off phase on its link: ${ringOff.join(", ") || "none"})` : ""}`);
check("links across tile borders", !crossOff.length, `${cross} links with their ends in two tile cores, each end as its own core tile builds it: ${crossOff.length} disagree${crossOff.length ? ": " + crossOff.slice(0, 6).join(", ") : ""}`);
check("the old rule fails (the check sees the defect)", oldOff > 0, `the phase-by-post-direction rule puts ${oldOff} of these ${moves} through movements off phase`);

// 3. posts
{
  let posts = 0, ruled = 0; const bad = [];
  for (const T of tiles) {
    const N = new Map(T.roads.nodes.map((n) => [n.id, n]));
    for (const s of signalSites(T.feats.points, T.roads, {})) {
      if (!inCore(T.b, s.x, s.z)) continue;
      posts++;
      // the approach this post faces: the signal node its traffic meets along its road
      const nr = nearestRoad(T.roads, N, s.stop[0], s.stop[1]); if (!nr) continue;
      const r = nr.road, fwd = s.tx * nr.ux + s.tz * nr.uz >= 0, h = T.PT.ahead(r.id, fwd ? r.b : r.a);
      if (!h) continue;
      ruled++;
      if (T.PT.phaseAt(h.node, h.road, s.tx, s.tz) !== s.phase) bad.push(`${T.name} (${s.x.toFixed(0)}, ${s.z.toFixed(0)})`);
    }
  }
  check("posts show their approach's phase", posts > 0 && ruled > posts * 0.5 && !bad.length, `${posts} posts in the tile cores, ${ruled} facing a signal node's approach, ${bad.length} on another phase${bad.length ? ": " + bad.slice(0, 6).join(", ") : ""}`);
}
// 4. crossing arms
{
  let pairs = 0; const bad = [];
  for (const T of tiles) for (const S of T.PT.nodes.values()) {
    if (!inCore(T.b, S.x, S.z) || S.virtual || S.arms.length > 4) continue;   // (5-6 arms: two phases cannot part every crossing pair; the sim's yields do)
    for (let i = 0; i < S.arms.length; i++) for (let j = i + 1; j < S.arms.length; j++) {
      const a = S.arms[i], b = S.arms[j], c = Math.abs(a.ux * b.ux + a.uz * b.uz);
      if (c > 0.5) continue;                                     // 60-120 deg apart
      pairs++; if (a.g === b.g) bad.push(`${S.id} (${T.name})`);
    }
  }
  check("crossing arms on different phases", pairs > 0 && !bad.length, `${pairs} arm pairs crossing at 60-120 deg at signal junctions, ${bad.length} on one phase${bad.length ? ": " + bad.slice(0, 6).join(", ") : ""}`);
}
if (!QUIET) console.log(`${tiles.length} tiles`);
console.log(fails ? `FAIL sigphase: ${fails} check(s)` : "PASS sigphase");
process.exit(fails ? 1 : 0);
