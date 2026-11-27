// node --import ./tools/heap/register.mjs tools/bike/spotTest.mjs [--quiet] [--rides-only]: THE BMX SPOT (bike lab 2,
// viewer/bike/bikeSpot.js + bikeSpotMeshes.js, debug/bikeSpot.js; gate row `bikespot`).
//   MESHES: every obstacle mesh closed (each edge shared by exactly two faces, no hole), every mesh standing on the
//   ground (its lowest vertices at or under the ground there, nothing floating > 2 cm), the solids' tops = the height
//   the bike rides (the picture and the physics one surface), the ground pieces never coplanar (the fine grid and the
//   far grid meet on a line, they never overlap; no ground drawn under a solid's top within 1 cm)
//   RIDES: a scripted rider on every obstacle, on the lab's own ground / colliders / edge layer: the funbox + its rail,
//   the quarter pipe (up and back down), the ledge grind, the manual pad, the stair block + handrail, both kickers over
//   their gaps, a pump-track lap, the table jump, the whoops, the hill up and down, the drift pad; every spot level and
//   clear of the colliders
import { DT, BIKE, createBikeState, stepBike, bikeSpeed } from "../../viewer/bike/bikePhysics.js";
import { SPOT, SPOT_SPOTS, SOLIDS, spotGround, spotEdges, spotColliders, spotHeight, solidAt, BOUNDS } from "../../viewer/bike/bikeSpot.js";
import { buildColliders, KIND } from "../../viewer/drive/colliders.js";
import { createBikeEnv } from "../../viewer/bike/bikeEnv.js";

const quiet = process.argv.includes("--quiet"), ridesOnly = process.argv.includes("--rides-only");
const rows = [];
let failed = 0;
const check = (name, ok, got, want) => { rows.push([name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v)), f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
const T0 = performance.now();
const CL = spotColliders(KIND), COL = buildColliders(CL.polys, CL.circles, CL.bounds);
const env = createBikeEnv({ sets: () => [COL], ground: spotGround, edges: spotEdges, wallrides: null });
const spawnAt = (x, z, h, v) => { const q = {}; env.ground(x, z, q); const s = createBikeState(x, z, h, q.h); s.vx = Math.sin(h) * v; s.vz = Math.cos(h) * v; return s; };
const spot = (name, v) => { const [x, z, h, v0] = SPOT_SPOTS[name]; return spawnAt(x, z, h, v ?? v0); };
function ride(s, input, secs, stop = null, each = null) {
  const L = []; let n = s.landings;
  for (let i = 0, N = Math.round(secs / DT); i < N; i++) {
    stepBike(s, input(s, i * DT), env);
    if (s.landings > n) { n = s.landings; L.push(s.lastLanding); }
    each?.(s);
    if (stop && stop(s)) break;
  }
  s._L = L;
  return s;
}
const lands = (s) => s._L.map((l) => `${l.band}${l.why ? ` (${l.why})` : ""}`).join(", ") || "-";
const airs = (s, t = 0.25) => s._L.filter((l) => l.air > t);
const PI = Math.PI;
const steerTo = (s, h) => { let e = h - s.heading; e -= Math.round(e / (2 * PI)) * 2 * PI; return Math.max(-1, Math.min(1, e / 0.25)); };
const pumper = (steer = () => 0) => (s) => {
  const on = s.contact[0] || s.contact[1], av = (s.slope[0] + s.slope[1]) / 2;
  return { pedal: on && av >= -0.08 ? 1 : 0, pump: on && av < -0.08 ? 1 : 0, hop: s.air && s.vy < 0, steer: steer(s) };
};
const crashTxt = (s) => `${s.crashes} crashes${s.crashes ? ` ("${s.crashCause}")` : ""}`;

// ---------------------------------------------------------------- the meshes
if (!ridesOnly) {
  const { buildSpotMeshes, closedReport } = await import("../../viewer/bike/bikeSpotMeshes.js");
  const t0 = performance.now();
  const M = buildSpotMeshes();
  const ms = performance.now() - t0;
  check("the spot builds (every mesh of the lab, in node)", M.parts.length > 0, `${M.parts.length} meshes in ${ms.toFixed(0)} ms, ground ${M.ground.fine.count} + ${M.ground.far.count} verts`, "builds");
  // closed: every obstacle / furniture piece
  const open = [];
  for (const p of M.parts) { if (!p.closed) continue; const r = closedReport(p.geo); if (r.open) open.push(`${p.name}: ${r.open} open edges, ${r.bad} edges with > 2 faces`); }
  check("obstacle + furniture meshes closed (each edge shared by exactly two faces: no hollow mesh, no missing top)", !open.length, open.slice(0, 6).join("; ") || `${M.parts.filter((p) => p.closed).length} closed meshes`, "0 open");
  // grounded: per part (each piece of a merged part carries its own footprint), the lowest vertices at or under the
  // ground: nothing floats > 2 cm
  const float = [];
  for (const p of M.parts) for (const pc of p.pieces || []) {
    if (pc.on) { const ok = pc.on.some((o) => o.box.clone().expandByScalar(0.01).intersectsBox(pc.box)); if (!ok) float.push(`${p.name}/${pc.name}: not touching what it stands on`); continue; }
    let worst = -1e9;
    for (const [x, y, z] of pc.feet) worst = Math.max(worst, y - spotHeight(x, z));
    if (worst > 0.02) float.push(`${p.name}/${pc.name}: ${f2(worst)} m over the ground`);
  }
  check("every piece stands on the ground or a solid (its feet at or under it: nothing floats > 2 cm; a rail / slat / coping touches its posts / frame / ramp)", !float.length, float.slice(0, 6).join("; ") || `${M.parts.reduce((a, p) => a + (p.pieces?.length || 0), 0)} pieces`, "0 floating");
  // the solids' tops = the ridden height (sampled across each top)
  const off = [];
  for (const S of SOLIDS) {
    let worst = 0;
    for (let i = 1; i < 8; i++) for (let k = 1; k < 40; k++) {
      const x = S.x0 + (S.x1 - S.x0) * i / 8, z = S.zmin + (S.zmax - S.zmin) * k / 40;
      const y = M.solidTop(S, x, z);
      if (y == null) continue;
      worst = Math.max(worst, Math.abs(y - spotHeight(x, z)));
    }
    if (worst > 0.025) off.push(`${S.name}: ${f2(worst)} m`);
  }
  check("the solids' drawn tops = the height the bike rides (within 2.5 cm: the bevels)", !off.length, off.join("; ") || `${SOLIDS.length} solids`, "all");
  // ground pieces: never coplanar - the fine grid and the far grid share only their border line; the ground under a
  // solid stays >= 1 cm under its top (the toe plate) or is inside it
  const g = M.ground, F = SPOT.fine;
  const overlap = g.far.cells.filter(([x0, z0, x1, z1]) => x0 < F.x1 && x1 > F.x0 && z0 < F.z1 && z1 > F.z0).length;
  let coplanar = 0;
  for (const S of SOLIDS) for (let i = 1; i < 10; i++) for (let k = 0; k <= 60; k++) {
    const x = S.x0 + (S.x1 - S.x0) * i / 10, z = S.zmin + (S.zmax - S.zmin) * k / 60;
    if (spotHeight(x, z) - g.heightAt(x, z) < 0.01) coplanar++;
  }
  check("ground pieces never coplanar (far grid cut out under the fine grid; every solid top >= 1 cm over the ground)", overlap === 0 && coplanar === 0, `${overlap} far cells under the fine grid, ${coplanar} solid samples within 1 cm of the ground`, "0, 0");
  // the fine grid's border is flat (the far terrain and every feature 0 there: no crack at the T-junctions)
  let border = 0;
  for (let x = F.x0; x <= F.x1; x += 0.25) border = Math.max(border, Math.abs(g.heightAt(x, F.z0)), Math.abs(g.heightAt(x, F.z1)));
  for (let z = F.z0; z <= F.z1; z += 0.25) border = Math.max(border, Math.abs(g.heightAt(F.x0, z)), Math.abs(g.heightAt(F.x1, z)));
  check("the fine ground's border is level with the far grid (no crack where they meet)", border < 1e-4, `max ${border.toExponential(1)} m`, "< 0.1 mm");
}

// ---------------------------------------------------------------- the spots
{
  const bad = [];
  for (const [name, [x, z, h]] of Object.entries(SPOT_SPOTS)) {
    const s = spawnAt(x, z, h, 0);
    if (env.insideSolid(s)) bad.push(`${name}: inside a collider`);
    const q = {}; env.ground(x, z, q);
    if (!(Math.abs(q.ny - 1) < 0.02)) bad.push(`${name}: on a slope (${f2(q.ny)})`);
    if (solidAt(x, z)) bad.push(`${name}: on an obstacle`);
  }
  check("every spot on level ground, clear of the colliders and the obstacles", !bad.length, bad.join("; ") || `${Object.keys(SPOT_SPOTS).length} spots`, "all");
}
// ---------------------------------------------------------------- the obstacles ridden
{
  const out = [], bad = [];
  for (const k of SPOT.kickers) {
    const s = ride(spot(k.name, k.v), (q) => ({ pedal: q.z < k.z0 - 1 && bikeSpeed(q) < k.v ? 1 : 0, sprint: true }), 6, (q) => q.z > k.z1 + 3);
    const L = airs(s)[0];
    const ok = s.crashes === 0 && L && L.band !== "bail" && s.z > k.z1 && L.air > 0.3;
    out.push(`${k.name} at ${k.v} m/s: air ${f2(L?.air)} s, ${L?.band}, ${crashTxt(s)}`);
    if (!ok) bad.push(k.name);
  }
  check("wooden kickers at their speed: over the gap onto the landing, ridden out", !bad.length, out.join("; "), "air > 0.3 s, no bail, no crash");
}
const hopGrind = (name, startZ, v, leads, pedal = 0.3, at = null) => {
  let best = null, crashes = 0;
  for (const lead of leads) {
    const s = at ? spawnAt(...at, v) : spot(name, v); let held = false, done = false;
    ride(s, (q) => { const tl = (startZ - q.z) / Math.max(0.1, q.vz); if (!done && !held && tl < lead + 0.32) held = true; if (held && tl <= lead) { held = false; done = true; } return { hop: held, pedal }; }, 6);
    crashes += s.crashes;
    if (s.grinds && (!best || s.grindDist > best.grindDist)) best = s;
  }
  return { best, crashes };
};
{
  const F = SPOT.funbox, fb = ride(spot("funbox + rail", 5), () => ({ pedal: 0.5 }), 6, (q) => q.z > F.z1 + 3);
  check("funbox ridden over at 18 km/h (up, table, down)", fb.crashes === 0 && fb.z > F.z1, `${crashTxt(fb)}, ${lands(fb)}`, "no crash");
  const fr = hopGrind("funbox + rail", F.zt0 + 0.9, 5, [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]);
  check("funbox rail: hopped onto from the table, ground along it", fr.best && fr.best.grinds >= 1 && fr.crashes === 0, `best: ${fr.best ? `${f1(fr.best.grindDist)} m, off by "${fr.best.grindExit}"` : "no grind"}, ${fr.crashes} crashes`, "a grind, 0 crashes");
  const Q = SPOT.qp; let top = 0;
  const q = ride(spot("quarter pipe", 7), () => ({}), 7, (b) => b.z < Q.foot - 6 && b.vz < 0, (b) => { top = Math.max(top, b.y); });
  check("quarter pipe at 25 km/h: up the transition (a vert air or to the lip), back down it, ridden out", q.crashes === 0 && q.vz < -2 && q.z < Q.foot - 4,
    `top ${f2(top)} m (lip ${f2(Q.h)}), verts ${q.park.verts}, out at ${f1(-q.vz)} m/s, ${crashTxt(q)}, ${lands(q)}`, "back out, no crash");
  const q2 = ride(spot("quarter pipe", 4), () => ({}), 7, (b) => b.z < Q.foot - 6 && b.vz < 0);
  check("quarter pipe at 14 km/h: rolls up part way and back, no crash", q2.crashes === 0 && q2.vz < -1, `${crashTxt(q2)}`, "no crash");
  const Ld = SPOT.ledge, lg = hopGrind("ledge", Ld.z0, 4, [0.0, 0.1, 0.2, 0.3, 0.4]);
  check("ledge: hopped onto from beside it, ground along it", lg.best && lg.best.grindDist > 2 && lg.crashes === 0, `best: ${lg.best ? `${f1(lg.best.grindDist)} m, off by "${lg.best.grindExit}"` : "no grind"}, ${lg.crashes} crashes`, "> 2 m, 0 crashes");
  const M = SPOT.pad, mp = ride(spot("manual pad", 4.5), () => ({ pedal: 0.4 }), 6, (b) => b.z > M.z1 + 3);
  const mph = ride(spot("manual pad", 4.5), (b) => ({ pedal: 0.4, hop: b.z > M.z0 - 1.2 && b.z < M.z0 - 0.5 }), 6, (b) => b.z > M.z1 + 3);
  check("manual pad (15 cm): rolled up onto it and off its end; hopped onto it", mp.crashes === 0 && mp.z > M.z1 && mph.crashes === 0 && mph.z > M.z1, `rolled: ${crashTxt(mp)}; hopped: ${crashTxt(mph)}`, "both through, no crash");
  const ST = SPOT.stairs, sd = ride(spot("stairs + handrail", 3.5), () => ({ pedal: 0.6 }), 10, (b) => b.z > ST.z1 + 3);
  check("stair block: up the 12.5 % ramp, along the platform, down the 5 stairs", sd.crashes === 0 && sd.z > ST.z1, `${crashTxt(sd)}, ${lands(sd)}`, "no crash");
  const railX = ST.xc + (ST.w - 0.4) / 2 - 0.15;
  let best = null, crashes = 0;
  for (const lead of [0.0, 0.1, 0.2, 0.3]) for (const off of [0.35, 0.5]) for (const sd2 of [-1, 1]) {
    const x = railX - sd2 * off;
    const r = hopGrind(null, ST.zs, 3.6, [lead], 0.3, [x, ST.zp + 0.3, 0]);
    crashes += r.crashes; if (r.best && (!best || r.best.grindDist > best.grindDist)) best = r.best;
  }
  check("stair handrail: hopped onto at the top, ground down it", best && best.grindDist > 1, `best: ${best ? `${f1(best.grindDist)} m, off by "${best.grindExit}"` : "no grind"}, ${crashes} crashes over the sweep`, "> 1 m of grind");
}
{
  const T = SPOT.pump;
  const follow = (dir = 1) => (s) => {
    const t = Math.max(0, Math.min(1, (s.x - T.ax) / (T.bx - T.ax))), px = T.ax + (T.bx - T.ax) * t;
    const dx = s.x - px, dz = s.z - T.z, d = Math.hypot(dx, dz) || 1;
    let tx = dz / d * dir, tz = -dx / d * dir;
    const back = (T.R - d) * 0.6; tx += dx / d * back; tz += dz / d * back;
    return steerTo(s, Math.atan2(tx, tz));
  };
  const s = spot("pump track"); let turned = 0, prev = Math.atan2(s.z - T.z, s.x - (T.ax + T.bx) / 2), minV = 99;
  ride(s, pumper(follow(-1)), 30, null, (q) => { const a = Math.atan2(q.z - T.z, q.x - (T.ax + T.bx) / 2); let da = a - prev; da -= Math.round(da / (2 * PI)) * 2 * PI; turned += da; prev = a; if (q.t > 2) minV = Math.min(minV, Math.abs(bikeSpeed(q))); });
  const laps = Math.abs(turned) / (2 * PI);
  check("pump-track loop: pumped round it (rollers + both berms): a lap, no crash", s.crashes === 0 && laps >= 1 && minV > 2.5, `${f2(laps)} laps in 30 s, min ${f1(minV)} m/s, ${crashTxt(s)}`, ">= 1 lap, > 2.5 m/s, 0 crashes");
  const TB = SPOT.table, tj = ride(spot("table jump", 7), (q) => ({ pedal: q.z < TB.z0 - 1 && bikeSpeed(q) < 7 ? 1 : 0, sprint: true }), 7, (q) => q.z > TB.z1 + 3);
  const TL = airs(tj, 0.2)[0];
  check("dirt table jump at 25 km/h: an air off the lip, landed on the table / its down slope, ridden out", tj.crashes === 0 && tj.z > TB.z1 && TL && TL.band !== "bail", `air ${f2(TL?.air)} s ${TL?.band || ""}, ${crashTxt(tj)}`, "an air, no crash");
  const tjs = ride(spot("table jump", 5.5), () => ({ pedal: 1 }), 9, (q) => q.z > TB.z1 + 3);
  check("dirt table jump rolled at 20 km/h, pedalling: over it, no crash", tjs.crashes === 0 && tjs.z > TB.z1, crashTxt(tjs), "no crash");
  const W = SPOT.whoops, w = ride(spot("whoops", 5), pumper(), 10, (q) => q.z > W.z1 + 1), wc = ride(spot("whoops", 6), () => ({ pedal: 1 }), 10, (q) => q.z > W.z1 + 1);
  check("whoops: pumped and pedalled through, no crash", w.crashes === 0 && w.z > W.z1 && wc.crashes === 0 && wc.z > W.z1, `pumped ${f1(bikeSpeed(w))} m/s out; pedalled ${crashTxt(wc)}`, "through, no crash");
  const H = SPOT.hill, hu = ride(spot("hill"), (q) => ({ pedal: 1, sprint: true }), 30, (q) => q.z > H.z + H.rz + 1);
  check("hill (1.5 m): pedalled up and over the top, down the far side", hu.crashes === 0 && hu.z > H.z + H.rz, `${crashTxt(hu)}, z ${f1(hu.z)}`, "over, no crash");
  const hd = ride(spawnAt(H.x, H.z - H.rz * H.flat - 0.5, PI, 1.5), () => ({ pedal: 0 }), 12, (q) => q.z < H.z - H.rz - 2);
  check("hill: rolled down from the top toward the plaza", hd.crashes === 0 && hd.z < H.z - H.rz && bikeSpeed(hd) > 2.5, `out at ${f1(bikeSpeed(hd))} m/s, ${crashTxt(hd)}`, "> 2.5 m/s, no crash");
  const dr = ride(spot("drift pad", 6.5), (q, t) => ({ pedal: t < 1 ? 1 : 0, steer: t > 0.8 ? -1 : 0, brakeR: t > 0.9 && t < 2.2 ? 1 : 0 }), 4);
  check("drift pad: a skid turn on the packed gravel (rear brake + full steer at 23 km/h), no crash", dr.crashes === 0, `${crashTxt(dr)}, heading turned ${f1((dr.heading - SPOT_SPOTS["drift pad"][2]) * 57.3)} deg`, "no crash");
}

const ms = performance.now() - T0;
if (!quiet || failed) {
  console.log("| check | result | got | want |\n|---|---|---|---|");
  for (const r of rows) if (!quiet || r[1] === "FAIL") console.log(`| ${r.join(" | ")} |`);
}
console.log(`\n${failed ? `${failed} spot check(s) FAIL` : `all ${rows.length} spot checks pass`} (${(ms / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
