// GARDEN PIECES FITTED TO THE BUILT TILE (claude/gates, rule 43; docs/GATES.md): two build-time passes over
// data/gardens/<T>.json against the tile as the worker builds it (viewer/tileData.js in node, tools/audit/census/
// lib_mesh.mjs buildTile), after tools/gardens/build_gardens.py:
//
//   --lanes   no garden piece stands in a DRIVEN LANE: the car's lane carriageway (viewer/streets/carriageway.js
//             lanesOnly, as tools/audit/driveCheck.mjs walks it), 0.3 m in (main.js clears by the drivenAt test, which
//             is not the lanes' one: piers at a run's end stood 0.3 m into a lane, drivecheck cause b). A pier moves
//             back into the garden (0.1 .. 0.8 m along its own inward normal) until its whole 0.36 m square is clear,
//             else it is dropped where the lane is on a MEASURED street surface; a wall / railing segment is cut to its
//             longest clear part (dropped under 0.3 m); a closed driveway gate across the lane stands open. Pieces deep
//             in a lane on UNMEASURED land (the lane / band data through a garden: drivecheck cause a) stay and are
//             counted (laneData)
//   --steps   no garden gate over a step without its steps: the ground census's own test (tools/audit/census/
//             ground.mjs gateNoSteps: the gate in a retaining wall, its garden > 0.3 m over the sidewalk, < 2 tread
//             heights within 2.5 m) on the tile built with the doc; such a gate is not placed: its opening is closed by
//             the run's own piece (a wall / railing segment pier face to pier face, or the hedge)
//   --check   no writes: the counts (gardenInLane = pieces with a footprint point 0.3 m into a lane on a measured
//             surface; the gate row's ceiling is 0)
//
//   node --import ./tools/road_audit/register.mjs tools/gardens/fitGardens.mjs (--lanes | --steps | --check) [--all | T ...]
//        [--jobs N] [--max k=v,...]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runTiles, cli, ROOT, imp } from "../audit/census/lib_street.mjs";
import { buildTile, allBuiltTiles } from "../audit/census/lib_mesh.mjs";

const c = cli();
const { CHILD, JOBS } = c;
const LANES = c.flag("--lanes"), STEPS = c.flag("--steps"), CHECK = c.flag("--check"), MAX = c.opt("--max", null), QUIET = c.flag("--quiet");
const TILES = c.ALL ? allBuiltTiles() : c.argv.filter((a) => /^[A-Z]\d+$/i.test(a)).map((t) => t.toUpperCase());
const MODE = CHECK ? "--check" : LANES ? "--lanes" : STEPS ? "--steps" : null;
const PW = 0.36, IN = 0.3;

if (!CHILD) {
  if (!TILES.length || !MODE) { console.error("usage: fitGardens.mjs (--lanes | --steps | --check) [--all | T ...]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS ?? 4, extra: [MODE], log: !QUIET });
  const sum = {}, items = [];
  for (const r of res) { if (r.error) continue; for (const [k, v] of Object.entries(r.counts)) sum[k] = (sum[k] || 0) + v; for (const it of r.items || []) items.push({ tile: r.tile, ...it }); }
  console.log(`fitGardens ${MODE}, ${res.length} tiles: ${JSON.stringify(sum)}`);
  if (!QUIET) for (const it of items.slice(0, 40)) console.log(`  ${JSON.stringify(it)}`);
  let bad = res.some((r) => r.error) ? 1 : 0;
  if (MAX) for (const kv of MAX.split(",")) { const [k, v] = kv.split("="), n = sum[k] ?? 0; if (n > +v) { console.log(`FAIL ${k} ${n} > ${v}`); bad++; } else console.log(`ok ${k} ${n} <= ${v}`); }
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ child: one tile
const T = TILES[0];
const path = join(ROOT, "data/gardens", `${T}.json`);
if (!existsSync(path)) { console.log(JSON.stringify({ tile: T, counts: {}, items: [] })); process.exit(0); }
const doc = JSON.parse(readFileSync(path, "utf8"));
const { d } = await buildTile(T);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { carriageway } = await imp("viewer/streets/carriageway.js");
const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
const classAt = fit ? fit.classAt : () => -1;
const lanesAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null, lanesOnly: true });
// the pieces main.js keeps (as tools/audit/driveCheck.mjs: drivenAt 0.3 m in, the cleared rings; restyles are
// main.js's own and not baked in): only those can stand in a lane
const { clearRoads } = await imp("viewer/gardens/gardenClear.js");
const { drawnTest } = await imp("viewer/streets/carriageway.js");
const overrides = JSON.parse(readFileSync(join(ROOT, "data/overrides.json"), "utf8"));
const drivenAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null, drawn: drawnTest(d.hdr, d.drive?.ground?.delta) });
const clearRings = Object.entries(overrides.plantsClear || {}).filter(([k]) => !k.startsWith("_")).map(([, v]) => v.ring);
const inR = (r, x, z) => { let c2 = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c2 = !c2; } return c2; };
const cl = clearRoads(doc, (x, z) => drivenAt.inside(x, z, 0.3) || clearRings.some((r) => inR(r, x, z)), { old: true });
const kept = new Set(cl ? [...cl.doc.segs, ...cl.doc.pillars, ...cl.doc.gates] : [...(doc.segs || []), ...(doc.pillars || []), ...(doc.gates || [])]);
const counts = {}, items = [];
const inc = (k, n = 1) => { counts[k] = (counts[k] || 0) + n; };
const r2 = (v) => Math.round(v * 100) / 100;
const into = (x, z) => lanesAt.inside(x, z, IN);
/** a pier's square (centre, corners, side middles) at (x, z) turned by yaw */
const pierPts = (x, z, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw), r = PW / 2; return [[0, 0], [-r, -r], [0, -r], [r, -r], [r, 0], [r, r], [0, r], [-r, r], [-r, 0]].map(([u, v]) => [x + u * c + v * s, z - u * s + v * c]); };
/** a segment's samples (every 0.2 m on its axis and both faces of the 0.30 m stand-in): [t, x, z] */
const segPts = (g) => { const L = Math.hypot(g[3] - g[0], g[5] - g[2]) || 1e-6, nx = -(g[5] - g[2]) / L * 0.15, nz = (g[3] - g[0]) / L * 0.15, n = Math.max(2, Math.ceil(L / 0.2)); const out = []; for (let i = 0; i <= n; i++) { const t = i / n, x = g[0] + (g[3] - g[0]) * t, z = g[2] + (g[5] - g[2]) * t; out.push([t, x, z], [t, x + nx, z + nz], [t, x - nx, z - nz]); } return out; };
const ROADWAY = new Set([0, 1]);   // (UrbIS roadway, tram road: a lane over a measured sidewalk / square is lane data)
const measured = (pts) => pts.some(([x, z]) => into(x, z) && ROADWAY.has(classAt(x, z)));

if (CHECK || LANES) {
  const S0 = doc.segs || [], P0 = doc.pillars || [], G0 = doc.gates || [], H0 = doc.hedges || [];
  const nS = S0.length, nP = P0.length, N = nS + nP + G0.length;
  const gateEnds = (g) => [[g[0], g[2]], [g[0] + Math.cos(g[3]) * g[4], g[2] - Math.sin(g[3]) * g[4]]];
  const gatePts = (g) => { const [[ax, az], [bx, bz]] = gateEnds(g), out = []; for (let k = 0; k <= 10; k++) out.push([ax + (bx - ax) * k / 10, az + (bz - az) * k / 10]); return out; };
  const ptsOf = (i) => i < nS ? segPts(S0[i]).map(([, x, z]) => [x, z]) : i < nS + nP ? pierPts(P0[i - nS][0], P0[i - nS][2], P0[i - nS][3]) : (G0[i - nS - nP][5] === 1 && !(G0[i - nS - nP][6] > 0) ? gatePts(G0[i - nS - nP]) : []);
  const pieceAt = (i) => (i < nS ? S0[i] : i < nS + nP ? P0[i - nS] : G0[i - nS - nP]);
  // which pieces the viewer keeps stand in a lane (and where the lane is on a measured roadway)
  const bad = new Map();
  for (let i = 0; i < N; i++) { if (!kept.has(pieceAt(i))) continue; const pts = ptsOf(i), xs = pts.filter(([x, z]) => into(x, z)); if (xs.length) bad.set(i, measured(xs)); }
  if (CHECK) {
    for (const [i, m] of bad) { if (m) { inc("gardenInLane"); const q = pieceAt(i); items.push({ what: i < nS ? "wall" : i < nS + nP ? "pier" : "closed driveway gate", at: `${r2(q[0])}, ${r2(q[2])}` }); } else inc("laneData"); }
  } else {
    // RUNS: the pieces joined end to end (segments 2 cm, a segment's end / a gate's end at a pier 0.3 m): a run in a lane
    // moves back into the garden as one (walls, piers, gates and its hedge), 0.1 .. 0.8 m, so nothing opens at a joint
    const par = Array.from({ length: N }, (_, i) => i), find = (i) => (par[i] === i ? i : (par[i] = find(par[i]))), join2 = (a, b) => { par[find(a)] = find(b); };
    const grid = new Map(), key = (x, z) => `${Math.floor(x)},${Math.floor(z)}`;
    const ends = [];
    S0.forEach((g, i) => { ends.push([g[0], g[2], i, 0.05], [g[3], g[5], i, 0.05]); });
    P0.forEach((p, j) => ends.push([p[0], p[2], nS + j, 0.3]));
    G0.forEach((g, k) => { for (const [x, z] of gateEnds(g)) ends.push([x, z, nS + nP + k, 0.3]); });
    for (const e of ends) { const k = key(e[0], e[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(e); }
    for (const e of ends) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const f of grid.get(key(e[0] + dx, e[1] + dz)) || []) {
      if (f[2] === e[2]) continue;
      const pier = e[2] >= nS && e[2] < nS + nP || f[2] >= nS && f[2] < nS + nP, tol = pier ? 0.3 : 0.05;
      if (Math.hypot(e[0] - f[0], e[1] - f[1]) <= tol) join2(e[2], f[2]);
    }
    const groups = new Map(); for (let i = 0; i < N; i++) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
    const shift = new Map();          // piece -> [dx, dz]
    const dropped = new Set();
    for (const mem of groups.values()) {
      if (!mem.some((i) => bad.get(i))) continue;          // (only where the lane is on a measured roadway)
      // the garden side: the piers' inward normal, else the side a probe 0.5 m off the worst segment leaves the lane
      let gx = 0, gz = 0;
      for (const i of mem) if (i >= nS && i < nS + nP) { gx -= Math.sin(P0[i - nS][3]); gz -= Math.cos(P0[i - nS][3]); }
      if (Math.hypot(gx, gz) < 1e-6) {
        const g = S0[mem.find((i) => i < nS && bad.has(i)) ?? mem[0]] || null;
        if (g) { const L = Math.hypot(g[3] - g[0], g[5] - g[2]) || 1, nx = -(g[5] - g[2]) / L, nz = (g[3] - g[0]) / L, mx = (g[0] + g[3]) / 2, mz = (g[2] + g[5]) / 2; [gx, gz] = into(mx + nx * 0.5, mz + nz * 0.5) ? [-nx, -nz] : [nx, nz]; }
      }
      const gl = Math.hypot(gx, gz); if (gl < 1e-6) continue; gx /= gl; gz /= gl;
      let k = 0;
      for (let q = 1; q <= 8 && !k; q++) if (mem.every((i) => !kept.has(pieceAt(i)) || !ptsOf(i).some(([x, z]) => into(x + gx * q * 0.1, z + gz * q * 0.1)))) k = q;
      if (k) { for (const i of mem) shift.set(i, [gx * k * 0.1, gz * k * 0.1]); inc("runsShifted"); inc("piecesShifted", mem.length); items.push({ what: "run moved back", at: `${r2(pieceAt(mem[0])[0])}, ${r2(pieceAt(mem[0])[2])}`, by: r2(k * 0.1), pieces: mem.length }); continue; }
      // no clear place within 0.8 m: the pieces on the roadway go (walls cut to their clear part, piers dropped, a closed
      // driveway gate opens)
      for (const i of mem) if (bad.get(i)) dropped.add(i);
    }
    const mv = (x, z, i) => { const s2 = shift.get(i); return s2 ? [r2(x + s2[0]), r2(z + s2[1])] : [x, z]; };
    const segs = [];
    S0.forEach((g, i) => {
      if (!dropped.has(i)) { const [ax, az] = mv(g[0], g[2], i), [bx, bz] = mv(g[3], g[5], i); segs.push([ax, g[1], az, bx, g[4], bz, g[6], g[7]]); return; }
      const S = segPts(g), badT = new Set(S.filter(([, x, z]) => into(x, z)).map(([t]) => t)), ts = [...new Set(S.map(([t]) => t))].sort((a, b) => a - b);
      let best = null, cur = null;
      for (const t of ts) { if (badT.has(t)) { cur = null; continue; } if (!cur) cur = [t, t]; else cur[1] = t; if (!best || cur[1] - cur[0] > best[1] - best[0]) best = cur.slice(); }
      const L = Math.hypot(g[3] - g[0], g[5] - g[2]), at = (t) => [g[0] + (g[3] - g[0]) * t, g[1] + (g[4] - g[1]) * t, g[2] + (g[5] - g[2]) * t];
      if (best && (best[1] - best[0]) * L >= 0.3) { const [ax, ay, az] = at(best[0]), [bx, by, bz] = at(best[1]); segs.push([r2(ax), r2(ay), r2(az), r2(bx), r2(by), r2(bz), g[6], g[7]]); inc("segsCut"); }
      else { inc("segsDropped"); items.push({ what: "wall dropped", at: `${r2(g[0])}, ${r2(g[2])}` }); }
    });
    const pillars = [];
    P0.forEach((p, j) => { const i = nS + j; if (dropped.has(i)) { inc("piersDropped"); items.push({ what: "pier dropped", at: `${r2(p[0])}, ${r2(p[2])}` }); return; } const [x, z] = mv(p[0], p[2], i); pillars.push([x, p[1], z, ...p.slice(3)]); });
    const gates = G0.map((g, k) => { const i = nS + nP + k, [x, z] = mv(g[0], g[2], i); const o = [x, g[1], z, ...g.slice(3)]; if (dropped.has(i)) { o[6] = 1.45; inc("gatesOpened"); } return o; });
    // the hedges behind a moved run go with it (a hedge whose points lie within 1.2 m of the run's pieces, mostly)
    const moved = [...shift.keys()].map((i) => [pieceAt(i), shift.get(i)]);
    const hedges = H0.map((h) => {
      let best = null, n = 0;
      for (const [x, z] of h.points) { const m = moved.find(([q]) => Math.hypot(q[0] - x, q[2] - z) < 1.2 || (q.length === 8 && Math.hypot(q[3] - x, q[5] - z) < 1.2)); if (m) { n++; best = m[1]; } }
      if (!best || n < h.points.length / 2) return h;
      inc("hedgesShifted"); return { ...h, points: h.points.map(([x, z]) => [r2(x + best[0]), r2(z + best[1])]) };
    });
    doc.segs = segs; doc.pillars = pillars; doc.gates = gates; doc.hedges = hedges; doc.fit = { ...(doc.fit || {}), lanes: counts };
    writeFileSync(path, JSON.stringify(doc));
  }
}

if (STEPS) {
  // the ground census's gateNoSteps test (tools/audit/census/ground.mjs, one definition kept in step with it)
  const H = d.hdr, Y = d.y, NC = H.cols, NR = H.rows, st = H.step, b = d.bounds;
  const P = d.road.parts?.concrete, K = P?.attributes?.aKind?.array, U2 = P?.attributes?.aUv2?.array;
  const terr = (x, z) => {
    const fc = (x - H.x0) / st, fr = (z - H.z0) / st, c0 = Math.floor(fc), r0 = Math.floor(fr);
    if (c0 < 0 || r0 < 0 || c0 >= NC - 1 || r0 >= NR - 1) return NaN;
    const u = fc - c0, v = fr - r0, a = r0 * NC + c0, bb = a + NC, cc = a + 1, dd = bb + 1;
    if (Math.abs(Y[a] - Y[dd]) < Math.abs(Y[bb] - Y[cc]) - 0.01) return u >= v ? Y[a] + u * (Y[cc] - Y[a]) + v * (Y[dd] - Y[cc]) : Y[a] + v * (Y[bb] - Y[a]) + u * (Y[dd] - Y[bb]);
    return u + v <= 1 ? Y[a] + u * (Y[cc] - Y[a]) + v * (Y[bb] - Y[a]) : Y[dd] + (1 - u) * (Y[bb] - Y[dd]) + (1 - v) * (Y[cc] - Y[dd]);
  };
  const faces = [], treads = [], tops = [];
  if (P && K) {
    const pos = P.position, I = P.index;
    for (let t = 0; t < I.length; t += 3) {
      const k = K[I[t]], a = I[t] * 3, b2 = I[t + 1] * 3, cI = I[t + 2] * 3;
      const ux = pos[b2] - pos[a], uy = pos[b2 + 1] - pos[a + 1], uz = pos[b2 + 2] - pos[a + 2], vx = pos[cI] - pos[a], vy = pos[cI + 1] - pos[a + 1], vz = pos[cI + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz); if (L < 1e-9) continue;
      const cx = (pos[a] + pos[b2] + pos[cI]) / 3, cy = (pos[a + 1] + pos[b2 + 1] + pos[cI + 1]) / 3, cz = (pos[a + 2] + pos[b2 + 2] + pos[cI + 2]) / 3;
      if (k > 3.5 && k < 5.5) { if (Math.abs(ny) < 0.2 * L) { const h = Math.hypot(nx, nz); if (fit && fit.classAt(cx + nx / h * 0.5, cz + nz / h * 0.5) >= 0) faces.push(cx, cz, nx / h, nz / h); } }
      else if (k > 0.5 && k < 1.5) { if (ny > 0.9 * L && U2 && U2[I[t] * 2 + 1] > 0.5) treads.push(cx, cy, cz); }
      else if (Math.abs(ny) > 0.9 * L) tops.push(cx, cy, cz);
    }
  }
  const noSteps = (q) => {
    const gx = q[0], gz = q[2];
    if (!(gx >= b.x0 && gx < b.x1 && gz >= b.z0 && gz < b.z1)) return false;
    let best = 9, fnx = 0, fnz = 0; for (let i = 0; i < faces.length; i += 4) { const d2 = (faces[i] - gx) ** 2 + (faces[i + 1] - gz) ** 2; if (d2 < best) { best = d2; fnx = faces[i + 2]; fnz = faces[i + 3]; } }
    if (best >= 9) return false;
    const fx = gx + fnx * 1.0, fz = gz + fnz * 1.0; let lo = Infinity, bd = 2.25;
    for (let i = 0; i < tops.length; i += 3) { const d2 = (tops[i] - fx) ** 2 + (tops[i + 2] - fz) ** 2; if (d2 < bd) { bd = d2; lo = tops[i + 1]; } }
    if (fit && [[1.2, 0], [1.6, 0], [2.0, 0], [0.8, 1], [0.8, -1], [1.6, 1], [1.6, -1]].some(([dd, sd]) => fit.classAt(gx - fnx * dd + fnz * sd, gz - fnz * dd - fnx * sd) >= 0)) return false;
    const gy = [1.2, 1.6, 2.0].map((dd) => terr(gx - fnx * dd, gz - fnz * dd)).sort((a, c2) => a - c2)[1];
    if (!(lo < Infinity) || !(gy === gy) || gy - lo <= 0.3) return false;
    const hs = new Set(); for (let i = 0; i < treads.length; i += 3) if ((treads[i] - gx) ** 2 + (treads[i + 2] - gz) ** 2 < 6.25 && treads[i + 1] > lo + 0.05 && treads[i + 1] < gy + 0.1) hs.add(Math.round(treads[i + 1] * 20));
    return hs.size < 2;
  };
  const keep = [];
  for (const g of doc.gates || []) {
    if (!noSteps(g)) { keep.push(g); continue; }
    // the gate is not placed: its opening closed by the run's own piece, pier face to pier face
    const st0 = doc.styles[g[7]] || {}, c0 = Math.cos(g[3]), s0 = Math.sin(g[3]);
    const pa = [g[0], g[2]], pb = [g[0] + c0 * g[4], g[2] - s0 * g[4]];
    inc("gatesClosed"); items.push({ what: "gate over a step without steps: closed", at: `${r2(g[0])}, ${r2(g[2])}`, kind: st0.kind });
    if (st0.kind === "hedge") {
      const near = (doc.hedges || []).reduce((a, h) => { const dd = Math.min(...h.points.map(([x, z]) => Math.hypot(x - pa[0], z - pa[1]))); return !a || dd < a.d ? { h, d: dd } : a; }, null);
      const gx = -s0 * 0.45, gz = -c0 * 0.45, n = Math.max(2, Math.ceil(g[4] / 0.5) + 1), pts = [];
      for (let k = 0; k < n; k++) pts.push([r2(pa[0] + (pb[0] - pa[0]) * k / (n - 1) + gx), r2(pa[1] + (pb[1] - pa[1]) * k / (n - 1) + gz)]);
      (doc.hedges ||= []).push({ points: pts, species: near?.h.species || "privet", height: near?.h.height || 1.2, width: near?.h.width || 0.7 });
    } else {
      const near = (doc.segs || []).filter((q) => q[6] === g[7]).reduce((a, q) => { const dd = Math.min(Math.hypot(q[0] - pa[0], q[2] - pa[1]), Math.hypot(q[3] - pb[0], q[5] - pb[1]), Math.hypot(q[3] - pa[0], q[5] - pa[1]), Math.hypot(q[0] - pb[0], q[2] - pb[1])); return !a || dd < a.d ? { q, d: dd } : a; }, null);
      const y = near ? Math.min(near.q[1], near.q[4]) : g[1] - 0.3, h = near ? near.q[7] : (st0.wallH || 0);
      (doc.segs ||= []).push([r2(pa[0]), r2(y), r2(pa[1]), r2(pb[0]), r2(y), r2(pb[1]), g[7], r2(h)]);
    }
  }
  if (counts.gatesClosed) { doc.gates = keep; doc.fit = { ...(doc.fit || {}), steps: counts }; writeFileSync(path, JSON.stringify(doc)); }
}
console.log(JSON.stringify({ tile: T, counts, items: items.slice(0, 40) }));
