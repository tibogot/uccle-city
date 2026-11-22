// THE TRAFFIC-SIGNAL CYCLE, one source of truth for the drawn lights and the traffic (no three.js: the tile worker
// imports it too). The same cycle as the furniture kit (branch claude/furniture, viewer/furnitureModel.js SIGNAL):
// Belgian sequence green -> amber (3 s) -> red -> green (no red + amber), two phase groups A / B (the two directions
// of a junction): B is A shifted by half a cycle, with an all-red clearance of 2 s each way. Pedestrians (crossing the
// street whose cars have red) get green for the first 60 % of that red.
// Phase of an approach (rule signal-phase-road, claude/signals1): from the ROAD it belongs to, not from the raw
// direction of a post (the old rule, phaseOfDir of the post's nearest segment, flipped where a road bends: close pairs
// ran off phase). signalPhases(roads) groups each signal node's arms into two axes (the most opposite pair of arms and
// the arms within 45 deg of it: group 0; the others: group 1) and colours the nodes so that a road linking two signal
// nodes under 150 m apart (through plain 2-arm nodes) is on ONE phase at both ends: one coordinated system, a green
// wave of offset 0. Each cluster's orientation is the one agreeing most with the old direction rule (phaseOfDir of
// the node's main axis: B for north-south). THE ONE SOURCE: the drawn posts (viewer/streets/signalPlace.js
// signalSites -> the tlights kit / furniture) and the traffic graph (trafficGraph.js) both ask phaseAt(node, road) of
// the same table, so a car stops exactly when the head it faces shows red.
// No green-wave offset other than 0: the lights have two city-wide phases (A, and B = A + half a cycle). A two-way
// road gets a green wave both ways only with an offset of 0 or half a cycle (the offset one way is minus the other's);
// the links between close pairs are under 150 m (<= 18 s at 30 km/h, inside a 22 s green), so 0 serves both
// directions; any other offset would also need per-junction head and walk timings (docs/rules/signal-phase-road.md).
// Clock: performance.now() / 1000 * speed + offset (the furniture kit's), so lights and cars agree in every page.

export const CYCLE = { green: 22, amber: 3, allRed: 2 };
export const CYCLE_T = (CYCLE.green + CYCLE.amber + CYCLE.allRed) * 2;     // 54 s
export const GREEN = 0, AMBER = 1, RED = 2;

/** The shared clock (the Traffic Lab's speed slider sets `speed`; both re-anchor so nothing jumps). */
export const signalClock = {
  speed: 1, offset: 0,
  now() { return (performance.now() / 1000) * this.speed + this.offset; },
  setSpeed(k) { const t = this.now(); this.speed = k; this.offset = t - (performance.now() / 1000) * k; },
};

/** Seconds into the cycle of phase 0 (A) / 1 (B) at clock time t. */
export const phaseTime = (phase, t) => { const tt = t + (phase ? CYCLE_T / 2 : 0); return ((tt % CYCLE_T) + CYCLE_T) % CYCLE_T; };
/** GREEN / AMBER / RED of phase 0 (A) / 1 (B) at clock time t. */
export function signalState(phase, t) {
  const s = phaseTime(phase, t);
  return s < CYCLE.green ? GREEN : s < CYCLE.green + CYCLE.amber ? AMBER : RED;
}
/** Seconds until this phase turns green (0 while green). */
export function untilGreen(phase, t) { const s = phaseTime(phase, t); return s < CYCLE.green ? 0 : CYCLE_T - s; }
/** Pedestrian green of phase 0 / 1 at t (furnitureModel.js rule). */
export function walkState(phase, t) {
  const s = phaseTime(phase, t), g = CYCLE.green, a = CYCLE.amber;
  if (s < g + a) return false;
  const redT = s - g - a, redLen = CYCLE_T - g - a;
  return redT > CYCLE.allRed && redT < CYCLE.allRed + (redLen - 2 * CYCLE.allRed) * 0.6;
}
/** The phase rule of the drawn posts: direction (ux, uz) of the road through the OSM point. */
export const phaseOfDir = (ux, uz) => (Math.abs(uz) > Math.abs(ux) ? 1 : 0);

/** Nearest road segment of roads.json to (x, z): point, unit direction, side (+1 left), road (furniture.js placement). */
export function nearestRoad(roads, N, x, z) {
  let best = null;
  for (const r of roads.roads) {
    if (r.meta?.highway === "footway" || r.meta?.highway === "service") continue;
    const pts = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean);
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
      if (L2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
      const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) {
        const L = Math.sqrt(L2), ux = dx / L, uz = dz / L;
        best = { d, px, pz, ux, uz, side: (-uz * (x - px) + ux * (z - pz)) >= 0 ? 1 : -1, road: r };
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------- the phase table (rule signal-phase-road)
const NOT_CAR = new Set(["footway", "path", "cycleway", "pedestrian", "steps", "bridleway", "corridor", "platform"]);
export const SIGNAL_LINK = 150;           // m: signal nodes closer than this along a road run as one system
const ARM_PROBE = 15;                     // m along an arm for its direction
const APPROACH = 40;                      // m: signals this close on a junction's arms are that junction's (mapped on its approaches)
const phaseCache = new WeakMap();
const TYPE_RANK = { avenue: 3, collector: 2, local: 1, oneWay: 1, alley: 0 };
const isOneWay = (r) => { const o = r.meta?.oneway; return o === "yes" || o === "1" || o === "true" || o === "-1"; };
/** a link's weight: the road class, a two-way road (two through movements) before a one-way one */
const linkRank = (r) => 2 * (TYPE_RANK[r.type] ?? 1) + (isOneWay(r) ? 0 : 1);

/** The phase table of a roads.json (cached per object): { phaseAt(nodeId, roadId, ux, uz), ahead(roadId, endId),
 *  nodes: Map id -> { x, z, arms: [{ road, ux, uz, g }], nat, f }, links, conflicts }. Deterministic from the roads
 *  alone (the tile worker, the posts and the gate rows build the same table from the same tile). */
export function signalPhases(roads) {
  let T = phaseCache.get(roads);
  if (T) return T;
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const byId = new Map(roads.roads.map((r) => [r.id, r]));
  const inc = new Map();                  // node id -> [road] (car roads)
  for (const r of roads.roads) {
    if (NOT_CAR.has(r.meta?.highway)) continue;
    for (const e of [r.a, r.b]) { let l = inc.get(e); if (!l) inc.set(e, (l = [])); if (!l.includes(r)) l.push(r); }
  }
  const polyFrom = (r, id) => { const p = [N.get(r.a), ...r.pts, N.get(r.b)].filter(Boolean); return r.a === id ? p : p.reverse(); };
  const armDir = (r, id) => {
    const p = polyFrom(r, id); let acc = 0, q = p[p.length - 1];
    for (let k = 1; k < p.length; k++) {
      const d = Math.hypot(p[k].x - p[k - 1].x, p[k].z - p[k - 1].z);
      if (acc + d >= ARM_PROBE) { const f = (ARM_PROBE - acc) / d; q = { x: p[k - 1].x + (p[k].x - p[k - 1].x) * f, z: p[k - 1].z + (p[k].z - p[k - 1].z) * f }; break; }
      acc += d;
    }
    const dx = q.x - p[0].x, dz = q.z - p[0].z, L = Math.hypot(dx, dz) || 1;
    return [dx / L, dz / L];
  };
  const roadLen = (r) => { const p = polyFrom(r, r.a); let L = 0; for (let k = 1; k < p.length; k++) L += Math.hypot(p[k].x - p[k - 1].x, p[k].z - p[k - 1].z); return L; };
  // the signal nodes and their two arm groups
  const nodes = new Map();
  const addNode = (n, rs, virtual) => {
    const arms = rs.map((r) => { const [ux, uz] = armDir(r, n.id); return { road: r.id, ux, uz, g: 0 }; });
    let bi = 0, bj = -1, bd = Infinity;
    for (let i = 0; i < arms.length; i++) for (let j = i + 1; j < arms.length; j++) {
      const d = arms[i].ux * arms[j].ux + arms[i].uz * arms[j].uz;
      if (d < bd - 1e-9) { bd = d; bi = i; bj = j; }
    }
    let ax = arms[bi].ux, az = arms[bi].uz;
    if (bj >= 0) { ax -= arms[bj].ux; az -= arms[bj].uz; const L = Math.hypot(ax, az) || 1; ax /= L; az /= L; }
    for (const a of arms) a.g = Math.abs(a.ux * ax + a.uz * az) >= Math.SQRT1_2 ? 0 : 1;
    nodes.set(n.id, { id: n.id, x: n.x, z: n.z, arms, nat: phaseOfDir(ax, az), f: 0, virtual });
  };
  for (const n of roads.nodes) {
    const rs = inc.get(n.id) || [];
    if (n.control === "signal" && rs.length) addNode(n, rs, false);
  }
  // the road chain from node `id` along road r (through plain 2-arm nodes) to the next signal node: { end, road, len }
  // (out / back: traffic may run from `id` to the end / from the end back to `id` on every road of it, the one-way tags)
  const flows = (r, from) => { const o = r.meta?.oneway; return o === "yes" || o === "1" || o === "true" ? r.a === from : o === "-1" ? r.b === from : true; };
  const follow = (r, id, maxLen) => {
    let len = 0, at = id, cur = r, out = true, back = true;
    for (let hop = 0; hop < 16; hop++) {
      const nxt = cur.a === at ? cur.b : cur.a;
      len += roadLen(cur); out &&= flows(cur, at); back &&= flows(cur, nxt);
      if (len > maxLen) return null;
      if (nodes.has(nxt)) return { end: nxt, road: cur.id, len, out, back };
      const rs = inc.get(nxt) || [];
      if (rs.length !== 2) return null;
      cur = rs[0] === cur ? rs[1] : rs[0]; at = nxt;
    }
    return null;
  };
  // a junction whose signals are mapped on its approaches (OSM traffic_signals on nodes up to APPROACH m out on two
  // or more of its arms, two distinct nodes at least, none on the junction node: the D7 Ch. d'Alsemberg / Rue du Chateau d'Or / Rue du Bourdon
  // junction n150588281): its arms are grouped the same way and linked to those signal nodes, so the approaches that
  // cross there are on different phases (it stays uncontrolled in the sim: the cars stop at the approach signals)
  const virt = [];
  for (const n of roads.nodes) {
    const rs = inc.get(n.id) || [];
    if (nodes.has(n.id) || rs.length < 3) continue;
    const near = new Set();                // (distinct nodes: not the two halves of a split street meeting one signal)
    // (an approach: its traffic runs from the signal INTO the junction; a signal on a one-way exit is not one)
    for (const r of rs) { const c = follow(r, n.id, APPROACH * 1.5), S = c && c.back && nodes.get(c.end); if (S && Math.hypot(S.x - n.x, S.z - n.z) <= APPROACH) near.add(S.id); }
    if (near.size >= 2) virt.push([n, rs]);
  }
  for (const [n, rs] of virt) addNode(n, rs, true);
  const links = [];
  for (const A of nodes.values()) for (const a of A.arms) {
    const r = byId.get(a.road), c = follow(r, A.id, 2 * SIGNAL_LINK);
    if (!c || c.end === A.id || A.id > c.end) continue;            // once per pair (the chain back finds the same)
    const B = nodes.get(c.end);
    if (Math.hypot(A.x - B.x, A.z - B.z) > SIGNAL_LINK) continue;
    const b = B.arms.find((q) => q.road === c.road);
    if (!b) continue;
    links.push({ a: A.id, ra: a.road, ga: a.g, b: B.id, rb: b.road, gb: b.g, len: c.len, rank: linkRank(r), ab: c.out, ba: c.back });
  }
  // f(A) xor f(B) = ga xor gb along each link: a parity union-find, the main roads and the short links first (an odd
  // ring of links cannot be coloured with two phases: its least link, a one-way side street before a two-way one, is
  // left off phase and listed in `conflicts`)
  links.sort((p, q) => q.rank - p.rank || p.len - q.len || (p.a < q.a ? -1 : p.a > q.a ? 1 : p.b < q.b ? -1 : p.b > q.b ? 1 : 0));
  const par = new Map(), pty = new Map();
  for (const id of nodes.keys()) { par.set(id, id); pty.set(id, 0); }
  const find = (x) => { let p = 0, y = x; while (par.get(y) !== y) { p ^= pty.get(y); y = par.get(y); } return [y, p]; };
  const conflicts = [];
  for (const L of links) {
    const [ra, pa] = find(L.a), [rb, pb] = find(L.b), want = L.ga ^ L.gb;
    if (ra === rb) { if ((pa ^ pb) !== want) conflicts.push(L); continue; }
    par.set(rb, ra); pty.set(rb, pa ^ pb ^ want);
  }
  // each cluster's orientation: the one agreeing most with the direction rule; a tie goes to the lowest node id's
  const comp = new Map();
  for (const id of [...nodes.keys()].sort()) { const [r, p] = find(id); let c = comp.get(r); if (!c) comp.set(r, (c = [])); c.push([id, p]); }
  for (const list of comp.values()) {
    let agree = 0;
    for (const [id, p] of list) agree += nodes.get(id).nat === p ? 1 : -1;
    const v = agree > 0 ? 0 : agree < 0 ? 1 : nodes.get(list[0][0]).nat ^ list[0][1];
    for (const [id, p] of list) nodes.get(id).f = p ^ v;
  }
  // a junction with its signals on its approaches: arm -> that approach signal, and back (rule signal-phase-road)
  const viaArm = (id, road, wantVirtual) => {
    const S = nodes.get(id); if (!S) return null;
    for (const L of links) {
      const [me, mr, ot] = L.a === id ? [L.a, L.ra, L.b] : L.b === id ? [L.b, L.rb, L.a] : [];
      if (me !== id || mr !== road) continue;
      const O = nodes.get(ot);
      const intoJ = L.a === (wantVirtual ? ot : id) ? L.ba : L.ab;        // traffic runs from the signal into the junction
      if (O.virtual === wantVirtual && S.virtual !== wantVirtual && intoJ && Math.hypot(O.x - S.x, O.z - S.z) <= APPROACH) return ot;
    }
    return null;
  };
  T = {
    nodes, links, conflicts,
    /** junction `nodeId` has its signals on its approaches (no signal on the node: the cars stopped at that approach's
     *  signal): the approach signal node on arm `roadId`, or null */
    approachSignal: (nodeId, roadId) => viaArm(nodeId, roadId, false),
    /** signal node `nodeId` is an approach signal of the junction APPROACH m along its arm `roadId`: that junction's
     *  id (its traffic coming FROM that junction is not held here: the heads face the traffic going into it), or null */
    junctionOf: (nodeId, roadId) => viaArm(nodeId, roadId, true),
    /** phase 0 (A) / 1 (B) of the approach to signal node `nodeId` along road `roadId`; (ux, uz): the travel
     *  direction INTO the node, used when the road is not one of its arms (the nearest arm) and off the table
     *  (phaseOfDir, the old rule) */
    phaseAt(nodeId, roadId, ux = 1, uz = 0) {
      const S = nodes.get(nodeId);
      if (!S) return phaseOfDir(ux, uz);
      let a = S.arms.find((q) => q.road === roadId);
      if (!a) { let bd = Infinity; for (const q of S.arms) { const d = q.ux * ux + q.uz * uz; if (d < bd) { bd = d; a = q; } } }
      return S.f ^ a.g;
    },
    /** the signal node a car on road `roadId` heading to its end `endId` meets (that end, or through plain 2-arm nodes
     *  within 60 m): { node, road (the arm it arrives on) } or null */
    ahead(roadId, endId) {
      if (nodes.has(endId)) return { node: endId, road: roadId };
      const rs = inc.get(endId) || [], r = byId.get(roadId);
      if (rs.length !== 2 || !r || !rs.includes(r)) return null;
      const c = follow(rs[0] === r ? rs[1] : rs[0], endId, 60);
      return c ? { node: c.end, road: c.road } : null;
    },
  };
  phaseCache.set(roads, T);
  return T;
}
