// STREET LANES: the traffic lanes and junction turns the street model builds (claude/street4, docs/STREET_MODEL_PLAN.md
// job 4 / invariant 3, rule street-lanes), judged on the graph the tile worker drives (viewer/traffic/tileTraffic.js,
// the one builder) against what the city DRAWS and MEASURES, not against the model the lanes come from:
//   kerb      a model lane point (every 0.5 m, in the tile) nearer than KERB m to a measured kerb / street-edge line
//             (UrbIS, the drawn street's boundary: kerbs, refuge islands, build-outs), unless the carriageway across it is
//             narrower than lanes.js NARROW_TWO (4 m) + NARROW_TOL and the point lies within CENTRE_TOL of its middle (a narrow street's one
//             centred lane, rule street-lanes)
//   carriage  a model lane point not on the measured carriageway (UrbIS roadway / tram roadway / parking), or off the
//             drawn street where UrbIS maps nothing (viewer/streets/carriageway.js: the band)
//   turn      a model junction turn point (the G2 curve) outside its junction's polygon / floor disc (+ 0.3 m)
//   building  a model lane / turn point whose car body (centre +- 0.9 m across) stands > 0.05 m inside a drawn building
//             footprint (this tile and its neighbours)
// Findings by stable id (rule gap-register): `streetlanes.<check>:<roadId>:<s0-s1>` along the nearest OSM road
// (tools/audit/census/lib_find.mjs roadRuns, its cause from the local evidence), a turn's
// `streetlanes.<check>:<node>~<fromRoad>~<toRoad>:0-0`. --register: a finding not in data/gaps.json fails, a registered
// one no longer found fails (stale); --write-register rewrites this row's entries. Also prints the model's coverage
// (lanes / turns built, kept on the old fit) and the parked cars the graph keeps.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/streetLanes.mjs [--all | T ...] [--register]
//        [--write-register] [--quiet] [--worst N] [--out FILE] [--lanesold]
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, json, at, ROOT, imp, SC, lineIndex } from "./lib_street.mjs";
import { footprintIndex } from "./lib_mesh.mjs";
import { findCtx, roadRuns } from "./lib_find.mjs";
import { judge, report, rewrite } from "../gaps.mjs";
import { resample } from "./lib_path.mjs";

const { CHILD, TILES, OUT, JOBS, WORST, flag } = cli();
const QUIET = flag("--quiet"), REG = flag("--register"), WREG = flag("--write-register"), LANES_OLD = flag("--lanesold");
const CHECKS = ["kerb", "carriage", "turn", "building"];
const GATED = CHECKS.map((c) => `streetlanes.${c}`);
export const KERB = 1.0, KERB_TOL = 0.05, NARROW_TOL = 0.3, CENTRE_TOL = 0.3;
const CARR = new Set([SC.roadway, SC.tramRoad, SC.parking]);

if (!CHILD) {
  if (!TILES.length) { console.error("usage: streetLanes.mjs [--all | T ...] [--register] [--write-register]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, log: !QUIET, extra: LANES_OLD ? ["--lanesold"] : [] });
  let bad = res.filter((r) => r.error).length;
  const sum = { tiles: 0, laneM: 0, turnM: 0, lanes: 0, turns: 0, lanesOld: 0, turnsNoJ: 0, parked: 0, parkedKept: 0 }, byCheck = Object.fromEntries(CHECKS.map((c) => [c, 0]));
  for (const r of res) { if (r.error) continue; sum.tiles++; for (const k of Object.keys(sum)) if (k !== "tiles") sum[k] += r.sum[k] || 0; for (const c of CHECKS) byCheck[c] += r.byCheck[c]; }
  sum.laneM = Math.round(sum.laneM); sum.turnM = Math.round(sum.turnM);
  for (const c of CHECKS) byCheck[c] = Math.round(byCheck[c] * 10) / 10;
  const findings = res.flatMap((r) => r.findings || []);
  const byInv = {}, byCause = {}; for (const f of findings) { byInv[f.inv] = (byInv[f.inv] || 0) + 1; byCause[f.cause] = (byCause[f.cause] || 0) + 1; }
  console.log(`streetlanes: ${JSON.stringify(sum)}\n  flagged metres by check: ${JSON.stringify(byCheck)}\n  findings by check: ${JSON.stringify(byInv)}\n  findings by cause: ${JSON.stringify(byCause)}`);
  findings.sort((a, b) => b.m - a.m);
  for (const f of findings.slice(0, WORST)) console.log(`  ${f.id} ${f.m} m ${f.at} ${f.street} (${f.cause})`);
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), sum, byCheck, byInv, byCause, findings }, null, 1));
  const done = res.filter((r) => !r.error).map((r) => r.tile);
  if (WREG) { const w = rewrite(findings, { invariants: GATED, tiles: done, date: new Date().toISOString().slice(0, 10), decision: (f) => `open (${f.cause})` }); console.log(`  register rewritten: ${w.written}`); }
  else if (REG) bad += report("streetlanes", judge(findings, { invariants: GATED, tiles: done }));
  if (bad) console.log(`FAIL streetlanes`);
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------ child: one tile
const T = TILES[0];
const S = await streetTile(T, {});
const { rd, roads, feats, bounds, fit, driven, inB, nameAt, classAt } = S;
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");
const { inJunction, NARROW_TWO } = await imp("viewer/street/lanes.js");
const parked = rd.surfaceData ? widthParking(roads, feats, bounds, fit) : null;
const trace = {};
const g = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData?.grid, { parked: parked?.sites, trace, roofs: S.tile.roofs, entry: LANES_OLD ? { streetLanes: false } : {} });
const model = rd.net.streetModel;
const out = { tile: T, sum: { laneM: 0, turnM: 0, lanes: 0, turns: 0, lanesOld: 0, turnsNoJ: 0, parked: parked?.sites?.length ?? 0, parkedKept: g.parkedKept?.length ?? parked?.sites?.length ?? 0 }, byCheck: Object.fromEntries(CHECKS.map((c) => [c, 0])), findings: [] };
const pathPts = (i) => { const P = []; for (let k = g.off[i]; k < g.off[i + 1]; k++) P.push([g.xy[k * 2], g.xy[k * 2 + 1]]); return P; };
// the measured kerb / street-edge lines (the drawn street's boundary) and the buildings round the tile
const kerbs = lineIndex([...(rd.surfaceData?.kerbs || []), ...(S.tile.surf?.edges || []).map((e) => e.line).filter(Boolean)], 8);
const nbrs = (() => { const m = /^([A-Z])(\d+)$/.exec(T), o = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) o.push(String.fromCharCode(m[1].charCodeAt(0) + a) + (+m[2] + b)); return o; })();
const blds = [];
for (const t of nbrs) { const f = join(ROOT, "data/tiles", t, "buildings.json"); if (existsSync(f)) for (const b of json(f).buildings) if (b.footprint?.[0]?.length >= 3) blds.push(b); }
const FI = footprintIndex(blds);
const ringDist = (x, z, r) => { let m = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };
const inBuilding = (x, z, nx, nz) => { let deep = 0; for (const w of [0, 0.9, -0.9]) { const px = x + nx * w, pz = z + nz * w, k = FI.at(px, pz); if (k >= 0) deep = Math.max(deep, ringDist(px, pz, blds[k].footprint[0])); } return deep > 0.05; };
/** the distance to the first kerb line crossed going along (nx, nz) from (x, z), within 8 m (0.1 m steps) */
const kerbRay = (x, z, nx, nz) => { for (let d = 0; d <= 8; d += 0.1) { const k = kerbs.dist(x + nx * d, z + nz * d, 0.06); if (k) return d; } return Infinity; };
const ctx = findCtx(S);
const samples = [];
const jOf = new Map((model?.junctions || []).map((J) => [J.node, J]));
const turnF = new Map();         // turn id -> { inv, n, x, z }
// (--lanesold: ?streetlanes=old, every lane and every junction turn judged the same way, for the A/B)
const modelOf = (i) => (LANES_OLD ? (g.kind[i] === 0 ? 1 : jOf.has(trace.src[i]?.nodeId) && g.turn[i] <= 2 ? 2 : 0) : g.model[i]);
for (let i = 0; i < g.paths; i++) {
  if (!modelOf(i)) continue;
  const src = trace.src[i], { Q } = resample(pathPts(i), 0.5);
  const lane = g.kind[i] === 0, isTurn = modelOf(i) === 2;
  if (lane) out.sum.lanes++; else if (isTurn) out.sum.turns++;
  const J = isTurn ? jOf.get(src.nodeId) ?? null : null;
  if (isTurn && !J) out.sum.turnsNoJ++;
  const tid = !lane ? `${src.nodeId}~${trace.src[g.prevIdx[g.prevOff[i]]]?.roadId ?? "x"}~${trace.src[g.nextIdx[g.nextOff[i]]]?.roadId ?? "x"}` : null;
  for (let q = 0; q < Q.length; q++) {
    const [x, z] = Q[q]; if (!inB(x, z)) continue;
    const a = Q[Math.max(0, q - 1)], b = Q[Math.min(Q.length - 1, q + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / tl, nz = (b[0] - a[0]) / tl;
    const why = [];
    if (lane) {
      out.sum.laneM += 0.5;
      const c = classAt(x, z);
      if (!(CARR.has(c) || (c < 0 && driven.inside(x, z)))) why.push("carriage");
      else {
        const k = kerbs.dist(x, z, KERB - KERB_TOL);
        if (k) {
          // (a narrow carriageway: one centred lane is the rule)
          const dl = kerbRay(x, z, nx, nz), dr = kerbRay(x, z, -nx, -nz);
          if (!(dl + dr < NARROW_TWO + NARROW_TOL && Math.abs(dl - dr) <= 2 * CENTRE_TOL)) why.push("kerb");
        }
      }
    } else {
      out.sum.turnM += 0.5;
      if (J && q > 0 && q < Q.length - 1 && !inJunction(J, x, z)) why.push("turn");
    }
    if (inBuilding(x, z, nx, nz)) why.push("building");
    if (!why.length) continue;
    for (const w of why) out.byCheck[w] += 0.5;
    if (lane) samples.push({ x, z, why, m: 0.5 });
    else for (const w of why) { const k = `${w}|${tid}`, e = turnF.get(k) || { inv: w, n: 0, x, z }; e.n++; turnF.set(k, e); }
  }
}
for (let i = 0; i < g.paths; i++) if (!g.model[i] && g.kind[i] === 0 && trace.src[i]) { const P = pathPts(i), m = P.length >> 1; if (inB(P[m][0], P[m][1])) out.sum.lanesOld++; }
out.findings.push(...roadRuns(samples, ctx, { prefix: "streetlanes", tile: T, nameAt, at, GAP: 3, MIN: 2 }));
for (const [k, e] of turnF) {
  const tid = k.split("|")[1];
  out.findings.push({ id: `streetlanes.${e.inv}:${tid}:0-0`, tile: T, inv: e.inv, m: e.n * 0.5, at: at(e.x, e.z), street: nameAt(e.x, e.z), cause: e.inv === "turn" ? "junction-unmodelled" : ctx.causeOf({ x: e.x, z: e.z }) });
}
console.log(JSON.stringify(out));
