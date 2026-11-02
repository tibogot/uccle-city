// Engine-in-the-loop clean-up of a road-lab network converted from OSM (CONTRACT 5.1, "refine").
//
//   node pipeline/refine_roads.mjs <in.json> [out.json]      (out defaults to in, rewritten)
//
// Builds the network with vendor/roads buildRoadNetwork (flat ground: these fixes are about
// plan geometry), then fixes what the engine reports, and repeats until nothing changes:
//
//   road-swallowed  (junction trims longer than the road)
//     1. tighten the kerb radius at both end nodes (node.radius = TIGHT_RADIUS[type]);
//     2. still swallowed: if one end is a dead end or a buffer cut, drop the road (a stub the
//        junction pad covers anyway); otherwise merge its two end nodes into one junction at
//        their midpoint. The kept node is the one with more roads (then the smaller id); it gets
//        meta.merged = [absorbed node ids].
//   (a merge that would leave two roads between the same two nodes is not done)
//   tight-bend      (a bend tighter than the road is wide, after the engine shrank its radius)
//     remove the PI nearest the reported point; with no PI left, the kink is at a node joining two
//     roads (a continuation): make that node kind "junction" so it becomes a corner.
//
//     If the road has a parallel twin (same two end nodes) and at most one PI, an alley/service
//     road is dropped instead ("drop-parallel"); other types are left for review.
// A round that creates a new "crossing" error (a merge moved a node so roads now cross) is rolled
// back, and the merges/stub drops near the new crossing are not tried again.
//
// Every action is listed in meta.refine. The engine is not changed.
import { readFileSync, writeFileSync } from "node:fs";
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";

const TIGHT_RADIUS = { alley: 2, local: 3, oneWay: 3, collector: 4, avenue: 5 };
const MAX_ROUNDS = 40;
const MAX_MERGE = 45;          // m: never merge junctions further apart than this

const [inPath, outPath = inPath] = process.argv.slice(2);
if (!inPath) { console.error("usage: node pipeline/refine_roads.mjs <in.json> [out.json]"); process.exit(2); }
const data = JSON.parse(readFileSync(inPath, "utf8"));

const counts = (issues) => {
  const c = {};
  for (const i of issues) if (i.level === "error") c[i.code] = (c[i.code] || 0) + 1;
  return c;
};
const degree = () => {
  const d = new Map();
  for (const r of data.roads) { d.set(r.a, (d.get(r.a) || 0) + 1); d.set(r.b, (d.get(r.b) || 0) + 1); }
  return d;
};
const nodeById = () => new Map(data.nodes.map((n) => [n.id, n]));

const log = [];
const banned = new Set();       // road ids whose merge / stub drop made roads cross
const crossKeys = (n) => new Set(n.issues.filter((i) => i.code === "crossing").map((i) => [i.fix?.a, i.fix?.b].sort().join("|")));
let net = buildRoadNetwork(data);
const before = counts(net.issues);

for (let round = 0; round < MAX_ROUNDS; round++) {
  const errors = net.issues.filter((i) => i.level === "error");
  if (!errors.length) break;
  const N = nodeById(), deg = degree(), R = new Map(data.roads.map((r) => [r.id, r]));
  const touched = new Set();      // one action per node/road per round, then rebuild
  let changed = 0;
  const snapshot = JSON.stringify(data), logLen = log.length, crossBefore = crossKeys(net);
  const moved = [];               // [road id, node ids] of merges and stub drops this round

  for (const e of errors) {
    const road = R.get(e.roadId);
    if (!road || touched.has(road.id) || touched.has(road.a) || touched.has(road.b)) continue;
    const A = N.get(road.a), B = N.get(road.b);
    if (!A || !B) continue;

    const sibling = data.roads.find((r) => r !== road && ((r.a === road.a && r.b === road.b) || (r.a === road.b && r.b === road.a)));
    if (e.code === "tight-bend") {
      if (sibling && road.pts.length <= 1) {
        // two roads between the same nodes (a loop split in halves): straightening one would lay it on the other
        if (road.type !== "alley" || banned.has(road.id)) continue;
        data.roads = data.roads.filter((r) => r !== road);
        log.push({ round, action: "drop-parallel", road: road.id, keeps: sibling.id });
        touched.add(road.id); touched.add(sibling.id); changed++;
        continue;
      }
      if (!road.pts.length) {
        const ends = [A, B].filter((n) => (deg.get(n.id) || 0) === 2 && n.kind !== "junction" && !touched.has(n.id))
          .sort((p, q) => Math.hypot(p.x - e.x, p.z - e.z) - Math.hypot(q.x - e.x, q.z - e.z));
        if (!ends.length) continue;
        ends[0].kind = "junction";
        ends[0].radius = Math.min(ends[0].radius ?? Infinity, TIGHT_RADIUS[road.type] ?? 3);
        log.push({ round, action: "corner-node", road: road.id, node: ends[0].id });
        touched.add(road.id); touched.add(ends[0].id); changed++;
        continue;
      }
      let k = 0, bd = Infinity;
      road.pts.forEach((p, i) => { const d = Math.hypot(p.x - e.x, p.z - e.z); if (d < bd) { bd = d; k = i; } });
      const [p] = road.pts.splice(k, 1);
      log.push({ round, action: "drop-pi", road: road.id, at: [p.x, p.z] });
      touched.add(road.id); changed++;
      continue;
    }
    if (e.code !== "road-swallowed") continue;

    const tight = TIGHT_RADIUS[road.type] ?? 3;
    const loose = [A, B].filter((n) => (deg.get(n.id) || 0) >= 3 && n.kind !== "roundabout" && !(n.radius <= tight));
    if (loose.length) {
      for (const n of loose) { n.radius = tight; touched.add(n.id); }
      log.push({ round, action: "tight-corner", road: road.id, nodes: loose.map((n) => n.id), radius: tight });
      touched.add(road.id); changed++;
      continue;
    }
    if (banned.has(road.id)) continue;
    const dead = [A, B].find((n) => (deg.get(n.id) || 0) === 1);
    if (dead) {
      moved.push([road.id, [A.id, B.id]]);
      data.roads = data.roads.filter((r) => r !== road);
      data.nodes = data.nodes.filter((n) => n !== dead);
      log.push({ round, action: "drop-stub", road: road.id, node: dead.id, cut: !!dead.meta?.cut });
      touched.add(road.id); touched.add(A.id); touched.add(B.id); changed++;
      continue;
    }
    if (A.kind === "roundabout" || B.kind === "roundabout") continue;
    if (Math.hypot(A.x - B.x, A.z - B.z) > MAX_MERGE) continue;
    const da = deg.get(A.id) || 0, db = deg.get(B.id) || 0;
    const keep = da > db || (da === db && A.id < B.id) ? A : B;
    // Cluster: A, B and every node both of them connect to (a triangle junction) within MAX_MERGE.
    const nbrs = (n) => new Set(data.roads.filter((r) => r.a === n.id || r.b === n.id).map((r) => (r.a === n.id ? r.b : r.a)));
    const na = nbrs(A), nb = nbrs(B);
    const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
    const extra = [...na].filter((id) => nb.has(id)).map((id) => N.get(id))
      .filter((n) => n && n.kind !== "roundabout" && Math.hypot(n.x - mx, n.z - mz) <= MAX_MERGE);
    const cluster = [A, B, ...extra];
    if (cluster.some((n) => touched.has(n.id))) continue;
    const ids = new Set(cluster.map((n) => n.id));
    // after the merge, would two roads join the cluster to the same outside node? then don't merge
    const outside = data.roads.filter((r) => ids.has(r.a) !== ids.has(r.b)).map((r) => (ids.has(r.a) ? r.b : r.a));
    if (new Set(outside).size !== outside.length) { banned.add(road.id); continue; }
    moved.push([road.id, [...ids]]);
    keep.x = +(cluster.reduce((t, n) => t + n.x, 0) / cluster.length).toFixed(2);
    keep.z = +(cluster.reduce((t, n) => t + n.z, 0) / cluster.length).toFixed(2);
    const gone = cluster.filter((n) => n !== keep);
    keep.meta = { ...(keep.meta || {}), merged: [...(keep.meta?.merged || []), ...gone.flatMap((g) => [g.id, ...(g.meta?.merged || [])])] };
    if (gone.some((g) => g.control === "signal" || g.meta?.signals)) keep.control = "signal";
    keep.radius = Math.min(keep.radius ?? Infinity, ...gone.map((g) => g.radius ?? Infinity), tight);
    const inner = data.roads.filter((r) => ids.has(r.a) && ids.has(r.b));
    data.roads = data.roads.filter((r) => !(ids.has(r.a) && ids.has(r.b)));
    for (const r of data.roads) { if (ids.has(r.a)) r.a = keep.id; if (ids.has(r.b)) r.b = keep.id; }
    data.nodes = data.nodes.filter((n) => !gone.includes(n));
    log.push({ round, action: "merge", road: road.id, keep: keep.id, gone: gone.map((g) => g.id), droppedRoads: inner.map((r) => r.id) });
    for (const id of ids) touched.add(id);
    touched.add(road.id);
    changed++;
  }
  if (!changed) break;
  const next = buildRoadNetwork(data);
  const fresh = [...crossKeys(next)].filter((k) => !crossBefore.has(k));
  if (fresh.length && moved.length) {
    // roll back; ban the merges/stub drops whose nodes are on a newly crossing road (all of them if none match)
    const ends = new Set();
    for (const k of fresh) for (const id of k.split("|")) { const r = data.roads.find((x) => x.id === id); if (r) { ends.add(r.a); ends.add(r.b); } }
    const guilty = moved.filter(([, nodes]) => nodes.some((n) => ends.has(n)));
    for (const [rid] of guilty.length ? guilty : moved) banned.add(rid);
    const restored = JSON.parse(snapshot);
    data.nodes = restored.nodes; data.roads = restored.roads;
    log.length = logLen;
    log.push({ round, action: "rollback", banned: (guilty.length ? guilty : moved).map(([rid]) => rid), crossings: fresh });
    continue;                     // net is unchanged: same errors, banned roads skipped next time
  }
  net = next;
}

// drop nodes no road uses any more
const used = new Set(data.roads.flatMap((r) => [r.a, r.b]));
data.nodes = data.nodes.filter((n) => used.has(n.id));
const after = counts(net.issues);
const actions = {};
for (const l of log) actions[l.action] = (actions[l.action] || 0) + 1;
data.meta = { ...(data.meta || {}), refine: { before, after, actions, log } };
writeFileSync(outPath, JSON.stringify(data) + "\n");
console.log(`refine ${inPath}: errors ${JSON.stringify(before)} -> ${JSON.stringify(after)}, actions ${JSON.stringify(actions)}, ${data.roads.length} roads / ${data.nodes.length} nodes`);
