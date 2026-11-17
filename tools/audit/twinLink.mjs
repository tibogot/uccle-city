// TWIN LINK CHECK (twinlink 2026-11-17, docs/TWINLINK.md, rule 19): every tile's traffic graph carries buffer copies
// of its neighbours' lanes; when the neighbour is loaded, viewer/traffic/trafficWorld.js `link` gives each copy its
// TWIN (the neighbour's own lane under it), so cars move onto the lane that was fitted to the street and round the
// parked cars there. A block of neighbouring tiles is built as the worker builds them (parking by width, traffic graph),
// all added to one TrafficWorld (every pair linked, as in the browser), then measured here independently:
//   has a twin   >= 60 % of the copy (sampled every 1 m) within 4 m of the neighbour's own lanes of the same kind and
//                direction (heading within 45 deg), mean <= 3 m, and its START within 4 m of one (where the car enters)
//   linked       twin[i] >= 0
//   wrong        lanes: the copy (up to where the twin ends) is > 4 m from the twin over most of it, or it runs the
//                other way; connectors: not the same two ends (4 m) and shape (mean 4 m at the same fractions);
//                both: the car's entry point (twin at twinAt) > 4 m from the copy's start (the sim's handover blends <= 4 m)
//   leftovers    copies in a loaded neighbour without a twin there, by class
//   cost         link ms per tile pair (max, warm, best of 3): the browser links when a tile loads
//   sim          the real TrafficSim on H5 H6 I5 (+ I6 after 10 s), 120 s: 0 position jumps > 0.5 m at the handovers
//
//   node --import ./tools/road_audit/register.mjs tools/audit/twinLink.mjs [--old] [--all] [--min 99] [--ms 5] [T ...]
// default tiles: H5 H6 H7 I5 I6 I7 J5 J6 J7 (Saint-Job, 3 x 3) + D3 D4 E3 E4 (Alsemberg); --all: every tile (~4 min).
// --old: the link of before (?twinlink=old), report only. Exit 1 when linked < --min % of the copies with a twin, any
// wrong link, or a pair's link over --ms.
const argv = process.argv.slice(2);
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const OLD = flag("--old"), ALL = flag("--all"), QUIET = flag("--quiet");
const MIN = +opt("--min", 99), MAXMS = +opt("--ms", 5), CACHE = opt("--cache", null);
globalThis.location = { search: OLD ? "?twinlink=old" : "" };
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
const { loadTile, allTiles, ROOT } = await import("../road_audit/tile.mjs");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { buildTrafficGraph } = await imp("viewer/traffic/trafficGraph.js");
const { TrafficWorld } = await imp("viewer/traffic/trafficWorld.js");
const { TrafficSim, STEP } = await imp("viewer/traffic/trafficSim.js");

const TILES = ALL ? allTiles() : argv.length ? argv.map((t) => t.toUpperCase()) : ["H5", "H6", "H7", "I5", "I6", "I7", "J5", "J6", "J7", "D3", "D4", "E3", "E4"];
const KEEP = ["paths", "bounds", "xy", "cum", "off", "len", "kind", "core", "turn", "nextOff", "nextIdx", "prevOff", "prevIdx"];
// (--cache dir: graphs stored as JSON once, for quick reruns while tuning; the gate builds them fresh)
function graph(name) {
  const f = CACHE && join(CACHE, name + ".json");
  if (f && existsSync(f)) {
    const o = JSON.parse(readFileSync(f, "utf8"));
    for (const [k, C] of [["xy", Float32Array], ["cum", Float32Array], ["len", Float32Array], ["off", Uint32Array], ["core", Uint8Array], ["kind", Uint8Array]]) o[k] = C.from(o[k]);
    return o;
  }
  const { roads, feats, bounds, rd } = loadTile(name);
  if (!rd.surfaceData) return null;
  const wp = widthParking(roads, feats, bounds, streetFit(rd.surfaceData));
  const g = buildTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData.grid, { parked: wp.sites });
  if (f) { mkdirSync(CACHE, { recursive: true }); const o = {}; for (const k of KEEP) o[k] = ArrayBuffer.isView(g[k]) ? Array.from(g[k]) : g[k]; writeFileSync(f, JSON.stringify(o)); }
  return g;
}
const t0 = performance.now();
const T = new Map();
for (const n of TILES) { const g = graph(n); if (g) T.set(n, g); }
const buildS = (performance.now() - t0) / 1000;

// link cost per pair: each pair linked on its own world first (both directions, as add() does), timed
const adj = (a, b) => !(a.x1 < b.x0 || b.x1 < a.x0 || a.z1 < b.z0 || b.z1 < a.z0);
let pairMax = 0, pairSum = 0, pairN = 0, pairWorst = "", coldMs = -1;
const names = [...T.keys()];
// (the first link runs cold (JIT): measured once, reported, not gated; the browser pays it once per session)
for (let rep = 0; rep < 2; rep++) for (let x = 0; x < names.length; x++) for (let y = x + 1; y < names.length; y++) {
  const A = T.get(names[x]), B = T.get(names[y]);
  if (!adj(A.bounds, B.bounds)) continue;
  // (best of 3 fresh worlds: a garbage collection pause is not the link's cost)
  let ms = Infinity;
  for (let r = 0; r < (rep ? 3 : 1); r++) {
    const w = new TrafficWorld();
    w.add(names[x], A); w.linkMs = 0;
    w.add(names[y], B);                  // (links A -> B and B -> A)
    if (coldMs < 0) coldMs = w.linkMs;
    ms = Math.min(ms, w.linkMs);
  }
  if (rep === 0) continue;
  pairN++; pairSum += ms;
  if (ms > pairMax) { pairMax = ms; pairWorst = `${names[x]}-${names[y]}`; }
}
// the whole block in one world (the browser: every loaded tile)
const W = new TrafficWorld();
for (const [n, g] of T) W.add(n, g);

// ---- independent measure (1 m samples)
function near(o, x, z, hx, hz, kd) {
  let best = null, bd = 16;
  const ci = Math.floor(x / 8), cj = Math.floor(z / 8);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const l = o.segHash.get((ci + di + 32768) * 65536 + (cj + dj + 32768));
    if (!l) continue;
    for (let n = 0; n < l.length; n += 2) {
      const j = l[n], k = l[n + 1];
      if (!o.core[j] || (kd >= 0 && o.kind[j] !== kd)) continue;
      const ax = o.xy[k * 2], az = o.xy[k * 2 + 1], dx = o.xy[k * 2 + 2] - ax, dz = o.xy[k * 2 + 3] - az, L2 = dx * dx + dz * dz;
      if (L2 < 1e-9) continue;
      const L = Math.sqrt(L2), dot = (dx * hx + dz * hz) / L;
      if (dot < 0.7) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d2 = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2;
      if (d2 < bd) { bd = d2; best = j; }
    }
  }
  return best === null ? null : Math.sqrt(bd);
}
const P = [0, 0, 0, 0];
const at = (g, i, d) => W.point((g.slot << 16) | i, d, P) && [P[0], P[1], P[2], P[3]];
function samples(g, i, step = 1) { const L = g.len[i], n = Math.max(1, Math.ceil(L / step)), s = []; for (let m = 0; m <= n; m++) s.push(at(g, i, (L * m) / n)); return s; }
function cover(g, i, o, kd) {
  const S = samples(g, i); let c = 0, sum = 0;
  for (const p of S) { const d = near(o, p[0], p[1], p[2], p[3], kd); if (d !== null) { c++; sum += d; } }
  return { f: c / S.length, mean: c ? sum / c : Infinity };
}
function connTwin(g, i, o) {
  const s0 = at(g, i, 0), e0 = at(g, i, g.len[i]);
  for (let j = 0; j < o.paths; j++) {
    if (!o.core[j] || !o.kind[j]) continue;
    const a = at(o, j, 0); if (Math.hypot(a[0] - s0[0], a[1] - s0[1]) > 4) continue;
    const b = at(o, j, o.len[j]); if (Math.hypot(b[0] - e0[0], b[1] - e0[1]) > 4) continue;
    // (the same shape: points at the same fractions of the two lengths, so a U-turn's legs or a mirrored turn never pass)
    let sum = 0, n = 0;
    for (let f = 0; f <= 1.0001; f += 0.05) { const p = at(g, i, g.len[i] * f), q = at(o, j, o.len[j] * f); sum += Math.hypot(p[0] - q[0], p[1] - q[1]); n++; }
    if (sum / n <= 3) return true;
  }
  return false;
}
// a lane piece: a core lane of o (same direction) that the copy's START lies on (within 4 m: where the car enters it) and
// that carries the copy as far as it reaches (>= 60 % of the copy's 1 m samples up to the twin's end within 4 m, mean <= 3 m)
const bbox = new Map();
function boxOf(o) {
  if (bbox.has(o)) return bbox.get(o);
  const B = new Float32Array(o.paths * 4);
  for (let j = 0; j < o.paths; j++) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = o.off[j]; k < o.off[j + 1]; k++) { const x = o.xy[k * 2], z = o.xy[k * 2 + 1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    B.set([x0, x1, z0, z1], j * 4);
  }
  bbox.set(o, B); return B;
}
function polyNear(o, j, x, z) {          // [distance, along, unit tangent dot helper (dx, dz)]
  let bd = Infinity, ba = 0, tx = 0, tz = 0;
  for (let k = o.off[j]; k < o.off[j + 1] - 1; k++) {
    const ax = o.xy[k * 2], az = o.xy[k * 2 + 1], dx = o.xy[k * 2 + 2] - ax, dz = o.xy[k * 2 + 3] - az, L2 = dx * dx + dz * dz;
    if (L2 < 1e-12) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < bd) { const L = Math.sqrt(L2); bd = d; ba = o.cum[k] + t * L; tx = dx / L; tz = dz / L; }
  }
  return [bd, ba, tx, tz];
}
function laneTwin(g, i, o) {
  const s0 = at(g, i, 0), B = boxOf(o), L = g.len[i];
  for (let j = 0; j < o.paths; j++) {
    if (!o.core[j] || o.kind[j]) continue;
    if (s0[0] < B[j * 4] - 4 || s0[0] > B[j * 4 + 1] + 4 || s0[1] < B[j * 4 + 2] - 4 || s0[1] > B[j * 4 + 3] + 4) continue;
    const [d, along, tx, tz] = polyNear(o, j, s0[0], s0[1]);
    if (d > 4 || tx * s0[2] + tz * s0[3] < 0.7) continue;
    const reach = Math.max(1, Math.min(L, o.len[j] - along));
    let n = 0, c = 0, sum = 0;
    for (let x = 0; x <= reach; x += 1) { const p = at(g, i, x), [dd] = polyNear(o, j, p[0], p[1]); n++; if (dd <= 4) { c++; sum += dd; } }
    if (c >= 0.6 * n && sum / c <= 3) return true;
  }
  return false;
}
let copies = 0, withTwin = 0, linked = 0, linkedNoTwin = 0, wrong = 0, laneFar = 0;
const left = new Map(), wrongList = [], leftList = [];
const tally = (m, k) => m.set(k, (m.get(k) || 0) + 1);
for (const [an, g] of T) for (const [bn, o] of T) {
  if (an === bn || !adj(g.bounds, o.bounds)) continue;
  const b = o.bounds;
  for (let i = 0; i < g.paths; i++) {
    if (g.core[i]) continue;
    const m = W.midOf(g, i);
    if (m[0] < b.x0 || m[0] >= b.x1 || m[1] < b.z0 || m[1] >= b.z1) continue;
    copies++;
    const c = cover(g, i, o, g.kind[i]), s0 = at(g, i, 0);
    // (the car enters the twin where the copy starts: a copy whose start is not on a lane that carries it cannot be
    // handed over there; a junction connector: the neighbour has one between the same two ends, of the same shape)
    const has = c.f >= 0.6 && c.mean <= 3 && (g.kind[i] ? connTwin(g, i, o) : laneTwin(g, i, o));
    if (has) withTwin++;
    const tw = g.twin[i];
    if (tw >= 0) {
      linked++; if (!has) linkedNoTwin++;
      // the twin's piece from twinAt, as long as the copy (or to its end): near the copy, same way; entry near the copy's start
      const oj = tw & 0xffff, ta = g.twinAt?.[i] ?? 0, e0 = at(o, oj, ta);
      const entry = Math.hypot(s0[0] - e0[0], s0[1] - e0[1]);
      const span = Math.min(g.len[i], o.len[oj] - ta);
      if (g.kind[i]) {
        // a connector: the same shape (fractions of the lengths), the same two ends
        let sum = 0, n = 0;
        for (let f = 0; f <= 1.0001; f += 0.05) { const p = at(g, i, g.len[i] * f), q = at(o, oj, o.len[oj] * f); sum += Math.hypot(p[0] - q[0], p[1] - q[1]); n++; }
        const e1 = at(g, i, g.len[i]), e2 = at(o, oj, o.len[oj]), endOff = Math.hypot(e1[0] - e2[0], e1[1] - e2[1]);
        if (entry > 4 || endOff > 4 || sum / n > 4) { wrong++; if (wrongList.length < 12) wrongList.push(`${an}#${i}->${bn}#${oj} connector entry ${entry.toFixed(1)} m, end ${endOff.toFixed(1)} m, mean ${(sum / n).toFixed(1)} m`); }
        continue;
      }
      // a lane: the twin carries the copy: of the copy's 1 m samples up to where the twin ends, >= 50 % within 4 m of
      // it, the same way (the owner's lane may leave the copy by > 4 m for a stretch where its fit moved it: up to 9 m)
      const reach = Math.max(1, Math.min(g.len[i], o.len[oj] - ta));
      let sum = 0, n = 0, back = 0, far = 0;
      for (let d = 0; d <= reach; d += 1) {
        const p = at(g, i, d), [dd, , tx, tz] = polyNear(o, oj, p[0], p[1]);
        n++; sum += dd; if (dd > 4) far++; else if (tx * p[2] + tz * p[3] < 0) back++;
      }
      if (sum / n > 2) laneFar++;
      if (entry > 4 || far > n / 2 || back > n / 2) { wrong++; if (wrongList.length < 12) wrongList.push(`${an}#${i}->${bn}#${oj} lane entry ${entry.toFixed(1)} m, mean ${(sum / n).toFixed(1)} m, ${far} of ${n} m > 4 m off${back > n / 2 ? ", reversed" : ""}`); }
      continue;
    }
    if (!has && c.f >= 0.6 && c.mean <= 3 && g.kind[i]) { tally(left, "connector over the neighbour's lanes, but none of its connectors has the same two ends and shape (the junction cut differently): kept as it is"); continue; }
    if (!has && c.f >= 0.6 && c.mean <= 3) { tally(left, "lane over the neighbour's lanes, but its START is on none that carries it (it starts > 4 m before the twin, in a junction cut differently): kept to its end"); continue; }
    if (!has) {
      // no twin there: why
      const rv = (() => { const S = samples(g, i); let k = 0; for (const p of S) if (near(o, p[0], p[1], -p[2], -p[3], g.kind[i]) !== null) k++; return k / S.length; })();
      const ak = cover(g, i, o, -1);
      tally(left, rv >= 0.6 ? "no twin: only the reverse lane there" : ak.f >= 0.6 ? "no twin: a lane of the other kind (lane / connector) there" : c.f >= 0.3 ? "no twin: partly covered (< 60 %)" : c.f > 0 ? "no twin: mostly off the neighbour's lanes (junction it does not have / > 4 m)" : "no twin: nothing within 4 m (a road or junction the neighbour does not build)");
      continue;
    }
    tally(left, "HAS A TWIN, NOT LINKED");
    if (leftList.length < 20) leftList.push(`${an}#${i}->${bn} kind ${g.kind[i]} len ${g.len[i].toFixed(1)} cover ${(c.f * 100).toFixed(0)} % mean ${c.mean.toFixed(2)} m`);
  }
}
// ---- the running sim across the borders (H5 H6 I5 loaded, I6 comes in after 10 s: routes re-planned onto its lanes):
// no car's position jumps (> 0.5 m beyond its own travel in a step) at a handover; the car time on copies in a loaded
// neighbour (the copies without a twin). Skipped with --cache (the cached graphs lack the sim's arrays).
let simRes = null;
if (!CACHE && ["H5", "H6", "I5", "I6"].every((n) => T.has(n))) {
  const SW = new TrafficWorld();
  for (const n of ["H5", "H6", "I5"]) SW.add(n, T.get(n));
  const types = [{ name: "hatch_c", len: 4.31, w: 1.81, h: 1.45, wb: 2.6, wheelR: 0.31, weight: 1 }, { name: "saloon", len: 4.73, w: 1.85, h: 1.44, wb: 2.8, wheelR: 0.32, weight: 1 }];
  const sim = new TrafficSim(SW, { cap: 600, types, paints: [[0.5, 0.5, 0.5]], ground: () => 0, seed: 11 });
  sim.typeWeights ??= types.map((t) => t.weight);
  const bs = ["H5", "H6", "I5", "I6"].map((n) => T.get(n).bounds);
  const ctx = { visible: () => false, fx: (Math.min(...bs.map((b) => b.x0)) + Math.max(...bs.map((b) => b.x1))) / 2, fz: (Math.min(...bs.map((b) => b.z0)) + Math.max(...bs.map((b) => b.z1))) / 2 };
  const px = new Float32Array(sim.cap), pz = new Float32Array(sim.cap), had = new Uint8Array(sim.cap);
  let jumps = 0, maxJump = 0, samp = 0, onCopy = 0;
  const inB = (b, x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
  for (let s = 0; s < 120 / STEP; s++) {
    if (s === Math.round(10 / STEP)) SW.add("I6", T.get("I6"));
    sim.step(ctx);
    for (let i = 0; i < sim.cap; i++) {
      if (!sim.alive[i]) { had[i] = 0; continue; }
      if (had[i] && sim.state[i] === 0) { const m = Math.hypot(sim.x[i] - px[i], sim.z[i] - pz[i]) - sim.v[i] * STEP; if (m > 0.5) { jumps++; maxJump = Math.max(maxJump, m); } }
      px[i] = sim.x[i]; pz[i] = sim.z[i]; had[i] = 1;
      if (s % 4 || s < 15 / STEP) continue;
      samp++;
      const g = SW.slots[sim.path[i] >>> 16], p = sim.path[i] & 0xffff;
      if (g.core[p]) continue;
      const m = SW.midOf(g, p);
      if (SW.tiles.some((o) => o !== g && inB(o.bounds, m[0], m[1]))) onCopy++;
    }
  }
  simRes = { cars: sim.count, handovers: sim.stats.handovers, enteredPartWay: sim.stats.twinEntries || 0, jumpsOver05m: jumps, maxJumpM: +maxJump.toFixed(2), carTimeOnCopiesInALoadedNeighbourPct: +((100 * onCopy) / samp).toFixed(2) };
}
const unlinkedWithTwin = left.get("HAS A TWIN, NOT LINKED") || 0;
const pct = withTwin ? (100 * (withTwin - unlinkedWithTwin)) / withTwin : 100;
const res = {
  mode: OLD ? "old (start + length)" : "geometry", tiles: [...T.keys()].length, buildS: +buildS.toFixed(1),
  copiesInLoadedNeighbour: copies, withTwin, linked, linkedPctOfCopies: +((100 * linked) / copies).toFixed(1),
  linkedPctOfWithTwin: +pct.toFixed(2), linkedWithoutTwinThere: linkedNoTwin, wrong, lanesMeanOver2m: laneFar, pairs: pairN,
  linkMsPerPair: { mean: +(pairSum / pairN).toFixed(2), max: +pairMax.toFixed(2), worst: pairWorst, firstCold: +coldMs.toFixed(2) },
  sim: simRes,
  leftovers: Object.fromEntries([...left].sort((a, b) => b[1] - a[1])),
};
console.log(JSON.stringify(res, null, QUIET ? 0 : 1));
if (!QUIET) { if (wrongList.length) console.log("wrong links:\n  " + wrongList.join("\n  ")); if (leftList.length) console.log("not linked though a twin is there:\n  " + leftList.join("\n  ")); }
if (OLD) process.exit(0);
const bad = [];
if (pct < MIN) bad.push(`linked ${pct.toFixed(2)} % of the copies with a twin (< ${MIN} %)`);
if (wrong) bad.push(`${wrong} wrong links`);
if (simRes && simRes.jumpsOver05m) bad.push(`${simRes.jumpsOver05m} car position jumps at tile handovers (max ${simRes.maxJumpM} m)`);
if (pairMax > MAXMS) bad.push(`link ${pairMax.toFixed(1)} ms for ${pairWorst} (> ${MAXMS} ms)`);
if (bad.length) { console.error("FAIL twinlink: " + bad.join("; ")); process.exit(1); }
console.log(`PASS twinlink: ${pct.toFixed(2)} % of ${withTwin} copies with a twin linked, 0 wrong, link <= ${pairMax.toFixed(2)} ms per tile pair`);
