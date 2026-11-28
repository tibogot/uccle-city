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
import { DT, BIKE, SURF, createBikeState, stepBike, bikeSpeed, groundQuery } from "../../viewer/bike/bikePhysics.js";
import { SPOT, SPOT_SPOTS, SOLIDS, spotGround, spotEdges, spotColliders, withOneWay, spotHeight, solidAt, BOUNDS } from "../../viewer/bike/bikeSpot.js";
import { buildColliders, KIND } from "../../viewer/drive/colliders.js";
import { createBikeEnv } from "../../viewer/bike/bikeEnv.js";
import { applyFeel } from "../../viewer/bike/bikeFeel.js";

const quiet = process.argv.includes("--quiet"), ridesOnly = process.argv.includes("--rides-only");
const rows = [];
let failed = 0;
let FEELN = "";
const check = (name, ok, got, want) => { rows.push([(FEELN ? `[feel ${FEELN}] ` : "") + name, ok ? "PASS" : "FAIL", got, want]); if (!ok) failed++; };
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v)), f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v));
const T0 = performance.now();
const CL = spotColliders(KIND), COL = withOneWay(buildColliders(CL.polys, CL.circles, CL.bounds), CL);
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
  // (round 3, owner: "plain houses") every house carries its cornice and a chimney (capped), some a dormer + window;
  // all of them in the closed / grounded checks above and below (each piece on its body / roof)
  { const cnt = (n) => M.parts.reduce((a, p) => a + (p.pieces || []).filter((q) => q.name === n).length, 0), nh = M.houses.length;
    check("the houses have their details (a cornice each, >= 1 capped chimney each, dormers on some), closed + on what carries them", cnt("cornice") === nh && cnt("chimney") >= nh && cnt("chimney cap") === cnt("chimney") && cnt("dormer") > 0 && cnt("dormer window") === cnt("dormer"),
      `${nh} houses: ${cnt("cornice")} cornices, ${cnt("chimney")} chimneys, ${cnt("dormer")} dormers`, "all"); }
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
  // (round 3) the skid's marks follow the surface (on the funbox's 25 deg ramp, the quarter pipe's transition, the hill)
  // and its dust is soft and short-lived (owner 2026-11-28: "marks lying flat on slopes", "dust puffs too solid")
  {
    const { createSkidFx, streakBasis } = await import("../../debug/bikeSpotFx.js");
    const THREE = await import("three/webgpu");
    const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), Pc = new THREE.Vector3();
    const F = SPOT.funbox, Qp = SPOT.qp, H = SPOT.hill;
    const worst = [];
    for (const [name, ax, az, bx, bz] of [["funbox ramp", F.xc + 0.5, F.z0 + 0.3, F.xc + 0.55, F.z0 + 0.42], ["funbox ramp across", F.xc - 0.5, F.z0 + 0.6, F.xc - 0.38, F.z0 + 0.62], ["quarter pipe", Qp.xc, Qp.foot + 0.9, Qp.xc + 0.03, Qp.foot + 1.02], ["hill", H.x + 3, H.z - H.rz * 0.6, H.x + 3.1, H.z - H.rz * 0.6 + 0.08]]) {
      const L = streakBasis(spotHeight, ax, az, bx, bz, X, Y, Z, Pc);
      const q = {}; spotGround((ax + bx) / 2, (az + bz) / 2, q);
      const ang = Math.acos(Math.min(1, Y.x * q.nx + Y.y * q.ny + Y.z * q.nz)) * 57.3;
      let off = 0;
      for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = Pc.x + X.x * 0.045 * u + Z.x * L / 2 * v, cy = Pc.y + X.y * 0.045 * u + Z.y * L / 2 * v, cz = Pc.z + X.z * 0.045 * u + Z.z * L / 2 * v; off = Math.max(off, Math.abs(cy - spotHeight(cx, cz) - 0.012)); }
      worst.push({ name, ang, off, slope: Math.acos(q.ny) * 57.3 });
    }
    const bad = worst.filter((w) => w.ang > 4 || w.off > 0.02);
    check("skid marks lie IN the ground's plane on slopes (normal within 4 deg of the ground's, corners within 2 cm)", !bad.length, worst.map((w) => `${w.name} (${f1(w.slope)} deg): ${f1(w.ang)} deg, ${(w.off * 100).toFixed(1)} cm`).join("; "), "<= 4 deg, <= 2 cm");
    // the dust: a sliding rear wheel throws puffs; each is faint (opacity <= 0.14 at its thickest), fades in and out,
    // and is gone within 0.8 s of its birth
    const fx = createSkidFx({ add() {} }, spotHeight);
    const st = { wheelPos: [0, 0, 0, -16], contact: [true, true], skid: true, crashed: false, surf: [2, 2], vx: 0, vz: 6, slip: 1, heading: 0 };
    let peak = 0, hard = 0, t = 0, lastLive = 0;
    for (; t < 2.5; t += 1 / 60) {
      if (t > 0.6) st.skid = false;
      fx.update(st, 1 / 60);
      for (let i = 0; i < fx.alpha.count; i++) { const a = fx.alpha.array[i]; peak = Math.max(peak, a); if (a > 0) lastLive = t; if (a > 0.999) hard++; }
    }
    const opMax = 0.14 * peak;
    check("skid dust is soft and short-lived (puffs thrown, peak opacity <= 0.15, none left 0.9 s after the slide ends)", fx.S.puffs > 5 && opMax <= 0.15 && lastLive < 0.6 + 0.9,
      `${fx.S.puffs} puffs, peak opacity ${opMax.toFixed(3)}, the last gone ${f2(lastLive - 0.6)} s after the slide`, "soft, gone < 0.9 s");
  }
}

for (FEELN of ["new", "old"]) {
applyFeel(FEELN);
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
// ---------------------------------------------------------------- round 3 (2026-11-28): drop-offs, the frontal face,
// the hop on ramps, landings, pumping, the drift (rule bike-drop-off-rolls-on)
{
  // a BOX with a sharp 90 deg edge (x -2..2, z -10..0, height h) and its side panels ONE-WAY, as the spot's solids
  const boxEnv = (h) => {
    const H = (x, z) => (x >= -2 && x <= 2 && z >= -10 && z <= 0 ? h : 0);
    const box = (x0, x1, z0, z1, top) => ({ rings: [[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], kind: KIND.wall, top, base: -1 });
    const col = buildColliders([box(-2.12, -2, -10, 0, h - 0.02), box(2, 2.12, -10, 0, h - 0.02)], [], { x0: -60, x1: 60, z0: -60, z1: 60 });
    col.oneWay = new Float32Array([-1, 0, 1, 0]);
    return createBikeEnv({ sets: () => [col], ground: groundQuery(H, () => SURF.asphalt, 0.03) });
  };
  const rideIn = (e, x, z, h, v, secs, input = () => ({})) => {
    const q = {}; e.ground(x, z, q); const s = createBikeState(x, z, h, q.h); s.vx = Math.sin(h) * v; s.vz = Math.cos(h) * v;
    const L = []; let n = 0;
    for (let i = 0, N = Math.round(secs / DT); i < N; i++) { stepBike(s, input(s, i * DT), e); if (s.landings > n) { n = s.landings; L.push(s.lastLanding); } if (s.crashed) break; }
    s._L = L; return s;
  };
  const bad = [], out = [];
  for (const h of [0.3, 0.6, 0.9, 1.2]) {
    const e = boxEnv(h); const row = [];
    for (const v of [1.5, 3, 5, 7]) for (const [name, x, z, hd] of [["end", 0, -2.5, 0], ["side", 0, -5, PI / 2], ["diagonal", 0, -4, PI / 4]]) {
      const s = rideIn(e, x, z, hd, v, 4);
      const worst = s._L.some((l) => l.band === "bail"), off = s.y < 1.2;
      // sensible: no crash, no bail, off the box onto the ground, rolling on (>= 45 % of the speed kept, the pitch level)
      const ok = !s.crashes && !worst && off && bikeSpeed(s) > 0.45 * v && Math.abs(s.pitch) < 0.15;
      if (!ok) bad.push(`${h} m ${name} at ${v} m/s: ${crashTxt(s)}, ${lands(s)}, out ${f1(bikeSpeed(s))} m/s, y ${f2(s.y)}`);
      if (name === "end") row.push(`${v}: ${s._L.map((l) => l.band).join("/") || "rolled"}`);
    }
    out.push(`${h} m [${row.join(", ")}]`);
  }
  check("DROP-OFFS: rolled off a box's sharp 90 deg edge (0.3 / 0.6 / 0.9 / 1.2 m; its end, its side, diagonally; 1.5-7 m/s): never a crash or a bail, lands and rolls on", !bad.length, bad.slice(0, 4).join("; ") || out.join("; "), "48 drops, 0 crashes");
  // the frontal face: a face higher than the axle met square at speed still crashes; a slow one stops the bike
  const fc = [], fbad = [];
  for (const h of [0.3, 0.6, 0.9]) {
    const e = boxEnv(h);
    const fast = rideIn(e, 0, 4, PI, 6, 2), slow = rideIn(e, 0, 3, PI, 2, 2);
    fc.push(`${h} m: at 6 m/s ${crashTxt(fast)}, at 2 m/s ${crashTxt(slow)}`);
    if (!fast.crashes || slow.crashes) fbad.push(h);
  }
  const low = rideIn(boxEnv(0.22), 0, 4, PI, 6, 2);
  check("FRONTAL FACE: a face over the axle (0.3 / 0.6 / 0.9 m) met square at 6 m/s crashes; at 2 m/s it stops the bike; a 22 cm one (under the axle) is no crash", !fbad.length && !low.crashes, `${fc.join("; ")}; 22 cm at 6 m/s: ${crashTxt(low)}`, "crash fast, not slow, not under the axle");
  // the owner's case: rolled off the small kicker's lip too slow to clear the gap (the front in the gap)
  const K = SPOT.kickers[1], kr = [];
  let kbad = 0;
  for (const v of [2, 2.5, 3, 3.5]) { const s = ride(spawnAt(K.xc, K.z0 - 1.5, 0, v), () => ({}), 4); kr.push(`${v}: ${crashTxt(s)}`); kbad += s.crashes; }
  check("the small kicker rolled off its lip too slow for the gap (2-3.5 m/s: the front wheel drops into it): no crash", kbad === 0, kr.join("; "), "0 crashes");
  // the side of the funbox's table (0.6 m) and of the kicker landing's deck, ridden off sideways
  const sd = [];
  let sbad = 0;
  const F = SPOT.funbox, KL = SPOT.kickers[0];
  for (const v of [2, 3.5, 5]) for (const [x, z, hd] of [[F.xc + 0.8, F.zt0 + 1.5, PI / 2], [F.xc - 0.8, F.zt0 + 1.5, -PI / 2], [KL.xc, KL.zl + 0.4, PI / 2], [KL.xc, KL.zl + 0.4, -PI / 2]]) {
    const s = ride(spawnAt(x, z, hd, v), () => ({}), 2.5); sbad += s.crashes; if (s.crashes) sd.push(`(${f1(x)}, ${f1(z)}) at ${v}: ${crashTxt(s)}`);
  }
  check("ridden off the side of the funbox's table / the kicker landing's deck (2-5 m/s, square off the side): no crash (the side panels stop only a wheel from outside)", sbad === 0, sd.join("; ") || "12 rides, 0 crashes", "0 crashes");
  // THE HOP ON RAMPS: a charged hop (Space held 0.3 s) on the funbox's up ramp and its down ramp: the wheels leave the
  // ramp about as long as on the flat
  const hopAir = (x, z, hd, v) => { let air = 0; ride(spawnAt(x, z, hd, v), (q, t) => ({ hop: t < 0.3 }), 2, null, (q) => { if (!q.contact[0] && !q.contact[1]) air += DT; }); return air; };
  const flatA = hopAir(0, -16, 0, 4), upA = hopAir(F.xc + 0.9, F.z0 - 0.3, 0, 4.2), downA = hopAir(F.xc + 0.9, F.zt1 - 0.6, 0, 3.4);
  if (FEELN === "new") check("the charged hop works on the ramps (funbox up ramp / down ramp vs the flat: >= 70 % of the flat's air time)", upA > 0.7 * flatA && downA > 0.7 * flatA, `air: flat ${f2(flatA)} s, up ramp ${f2(upA)} s, down ramp ${f2(downA)} s`, ">= 70 %");
  if (FEELN === "new") {
    // LANDINGS: the kicker's landing slope keeps the speed, a flat drop loses some and wobbles, nose-heavy / sideways bail
    const k0 = SPOT.kickers[1];
    const kk = ride(spot(k0.name, k0.v), (q) => ({ pedal: q.z < k0.z0 - 1 && bikeSpeed(q) < k0.v ? 1 : 0, sprint: true }), 6, (q) => q.z > k0.z1 + 1);
    const KLd = airs(kk)[0];
    const fl = rideIn(boxEnv(1.2), 0, -2, 0, 5, 1.6), FLd = fl._L[0];
    // (dropped from 0.6 m at 2.5 m/s down, the pose set: nose down 54 deg / crossed 54 deg)
    const dropIn = (pitch, yaw) => { const e = boxEnv(0), s = createBikeState(0, 0, yaw, 0); s.vz = 5; s.y += 0.6; s.vy = -2.5; s.pitch = pitch; s.air = true; s.airT = 0.3; s.airMax = s.y + 0.8; for (let i = 0; i < 1.5 / DT && !s.crashed; i++) stepBike(s, {}, e); return s; };
    const nose = dropIn(-0.95, 0), side = dropIn(0, 0.95);
    check("landings: on the small kicker's down slope the speed is kept (+ transGain), a flat 1.2 m drop loses speed + wobbles, nose-heavy (54 deg) / sideways (54 deg) bail",
      KLd && KLd.band !== "bail" && kk.flow.transGain > 0 && FLd && FLd.band !== "bail" && fl.flow.flats > 0 && nose.crashes > 0 && side.crashes > 0,
      `kicker: ${KLd?.band}, +${f2(kk.flow.transGain)} m/s; flat 1.2 m at 5 m/s: ${FLd?.band}, ${f1(bikeSpeed(fl))} m/s out; nose: ${crashTxt(nose)}; sideways: ${crashTxt(side)}`, "kept / lost / bail / bail");
    // PUMPING: round the pump track with NO pedalling: C pressed on the back sides (and stroked round the berms) keeps the
    // bike going; coasting stops it; C held all the time gains nothing (the stroke)
    const T = SPOT.pump;
    const follow = (s) => { const t = Math.max(0, Math.min(1, (s.x - T.ax) / (T.bx - T.ax))), px = T.ax + (T.bx - T.ax) * t; const dx = s.x - px, dz = s.z - T.z, d = Math.hypot(dx, dz) || 1; let tx = -dz / d, tz = dx / d; const back = (T.R - d) * 0.6; tx += dx / d * back; tz += dz / d * back; return steerTo(s, Math.atan2(tx, tz)); };
    const pumpRide = (mode) => {
      let dist = 0;
      const s = ride(spot("pump track", 4.5), (q, t) => {
        const on = q.contact[0] || q.contact[1], av = (q.slope[0] + q.slope[1]) / 2, bank = Math.abs(q.slope[0]) < 0.08 && Math.abs(q.yawVel) > 0.3 && t % 0.75 < 0.5;
        return { steer: follow(q), pump: mode === 2 ? 1 : mode === 1 && on && (av < -0.04 || bank) ? 1 : 0 };
      }, 20, null, (q) => { dist += Math.abs(bikeSpeed(q)) * DT; });
      return { s, dist };
    };
    const coast = pumpRide(0), pumped = pumpRide(1), held = pumpRide(2);
    check("PUMPING (no pedalling, 20 s round the pump track): pumped in rhythm it keeps rolling (> 3 m/s at the end, > 2.5x the coast's distance); C held all along gains nothing", pumped.s.crashes === 0 && bikeSpeed(pumped.s) > 3 && pumped.dist > 2.5 * coast.dist && held.dist < 1.3 * coast.dist,
      `coast ${f1(coast.dist)} m; pumped ${f1(pumped.dist)} m, ${f1(bikeSpeed(pumped.s))} m/s at the end, +${f1(pumped.s.flow.pumpGain)} m/s pumped; held ${f1(held.dist)} m`, "pumped >> coast, held ~ coast");
    // THE DRIFT: the steer sets the slide angle (half lock ~ half the angle), a clean exit boosts
    const drift = (st) => { const q = spawnAt(SPOT.drift.x - 3, SPOT.drift.z - 3, 0.6, 6.5); let sum = 0, n = 0; ride(q, (b, t) => ({ brakeR: t > 0.2 && t < 1.0 ? 1 : 0, steer: t > 0.2 && t < 1.0 ? st : 0 }), 2.2, null, (b) => { if (b.t > 0.6 && b.t < 1.0) { sum += Math.abs(b.slipAngle); n++; } }); return { q, slide: sum / n * 57.3 }; };
    const d1 = drift(1), dh = drift(0.5);
    check("THE DRIFT: the steer asks the slide angle (full lock ~ driftAngle, half lock less), a clean exit gives the boost, no crash", d1.q.crashes === 0 && dh.q.crashes === 0 && d1.slide > 1.6 * dh.slide && d1.slide > 35 && d1.q.flow.boosts === 1,
      `full lock ${f1(d1.slide)} deg, half ${f1(dh.slide)} deg; boosts ${d1.q.flow.boosts}, out ${f1(bikeSpeed(d1.q))} m/s`, "full > 1.6 x half, 1 boost");
  }
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
  const TB = SPOT.table, past = (q) => q.z < TB.z1 - 3, tj = ride(spawnAt(TB.xc, TB.z0 + 3, Math.PI, 7), () => ({ pedal: 0 }), 7, past);
  const TL = airs(tj, 0.12)[0];
  check("dirt table jump at 25 km/h: an air off the lip, landed on the table / its down slope, ridden out", tj.crashes === 0 && tj.z < TB.z1 && TL && TL.band !== "bail", `air ${f2(TL?.air)} s ${TL?.band || ""}, ${crashTxt(tj)}`, "an air, no crash");
  const tjs = ride(spot("table jump", 4.2), () => ({ pedal: 1 }), 9, past);
  check("dirt table jump rolled at 15 km/h, pedalling: over it, no crash", tjs.crashes === 0 && tjs.z < TB.z1, crashTxt(tjs), "no crash");
  if (FEELN === "new") {
    // (round 2, owner: "the table clearable from ~15 km/h"): a charged pop at the lip clears the top
    const topEnd = TB.z0 - TB.up - TB.top, lipZ = TB.z0 - TB.up;
    let best = null;
    for (const lead of [0.1, 0.15, 0.2, 0.25]) {
      let land = null, wasAir = false;
      const q = ride(spawnAt(TB.xc, TB.z0 + 3, Math.PI, 4.2), (b) => ({ hop: b.z > lipZ + lead && b.z < lipZ + lead + 1.3 }), 7, past,
        (b) => { if (wasAir && !b.air && land == null && b.lastLanding?.air > 0.15) land = b.z; wasAir = b.air; });
      if (q.crashes === 0 && land != null && (!best || land < best.land)) best = { land, lead };
    }
    check("dirt table at 15 km/h: a charged hop off the lip clears the 1 m top (lands on the down slope)", best && best.land < topEnd + 0.3, best ? `lands at ${f2(topEnd - best.land)} m past the top's end (released ${best.lead} m before the lip)` : "never cleared", "past the top, no crash");
    // the berm: out of the whoops, round the half ring, onto the table line heading south
    const B = SPOT.berm;
    const bq = ride(spot("berm", 5), (b) => { const dx = b.x - B.x, dz = b.z - B.z, d = Math.hypot(dx, dz) || 1; let tx = dz / d, tz = -dx / d; if (b.z < B.z - 0.5) { tx = 0; tz = b.x < B.x ? 1 : -1; } const back = (B.R - d) * 0.6; if (b.z > B.z - 0.5) { tx += dx / d * back; tz += dz / d * back; } return { pedal: bikeSpeed(b) < 5 ? 1 : 0, steer: steerTo(b, Math.atan2(tx, tz)) }; }, 8, (b) => b.x > B.x && b.z < B.z - 1.5 && Math.cos(b.heading) < -0.8);
    check("dirt berm: carved round from the whoops onto the table line (heading south), no crash", bq.crashes === 0 && Math.cos(bq.heading) < -0.8 && bq.x > B.x, `${crashTxt(bq)}, out at (${f1(bq.x)}, ${f1(bq.z)}) heading ${f1(bq.heading * 57.3)} deg`, "round, no crash");
    // THE SKID DRIFT: S + full steer at 23 km/h: a power-slide round on the gravel, less on asphalt
    const drift = (x, z, h) => { const q = spawnAt(x, z, h, 6.5); let maxSlip = 0; const h0 = q.heading; ride(q, (b, t) => ({ brakeR: t > 0.2 && t < 1.0 ? 1 : 0, steer: t > 0.2 && t < 1.0 ? 1 : 0 }), 1.6, null, (b) => { maxSlip = Math.max(maxSlip, Math.abs(b.slipAngle)); }); return { q, turned: (q.heading - h0) * 57.3, maxSlip: maxSlip * 57.3 }; };
    const dg = drift(SPOT.drift.x - 3, SPOT.drift.z - 3, 0.6), da = drift(-2.8, -14, 0);
    check("skid drift (S + steer at 23 km/h): a power-slide on the gravel pad (tail out > 35 deg, > 60 deg turned, no crash), tighter on asphalt", dg.q.crashes === 0 && da.q.crashes === 0 && dg.maxSlip > 35 && Math.abs(dg.turned) > 60 && dg.maxSlip > da.maxSlip,
      `gravel: tail ${f1(dg.maxSlip)} deg, turned ${f1(dg.turned)} deg, out ${f1(bikeSpeed(dg.q))} m/s; asphalt: tail ${f1(da.maxSlip)} deg, turned ${f1(da.turned)} deg; ${dg.q.crashes + da.q.crashes} crashes`, "slide, no crash");
  }
  const W = SPOT.whoops, w = ride(spot("whoops", 5), pumper(), 10, (q) => q.z > W.z1 + 1), wc = ride(spot("whoops", 6), () => ({ pedal: 1 }), 10, (q) => q.z > W.z1 + 1);
  check("whoops: pumped and pedalled through, no crash", w.crashes === 0 && w.z > W.z1 && wc.crashes === 0 && wc.z > W.z1, `pumped ${f1(bikeSpeed(w))} m/s out; pedalled ${crashTxt(wc)}`, "through, no crash");
  const H = SPOT.hill, hu = ride(spot("hill"), (q) => ({ pedal: 1, sprint: true }), 30, (q) => q.z > H.z + H.rz + 1);
  check("hill (1.5 m): pedalled up and over the top, down the far side", hu.crashes === 0 && hu.z > H.z + H.rz, `${crashTxt(hu)}, z ${f1(hu.z)}`, "over, no crash");
  const hd = ride(spawnAt(H.x, H.z - H.rz * H.flat - 0.5, PI, 1.5), () => ({ pedal: 0 }), 12, (q) => q.z < H.z - H.rz - 2);
  check("hill: rolled down from the top toward the plaza", hd.crashes === 0 && hd.z < H.z - H.rz && bikeSpeed(hd) > 2.5, `out at ${f1(bikeSpeed(hd))} m/s, ${crashTxt(hd)}`, "> 2.5 m/s, no crash");
  const dr = ride(spot("drift pad", 6.5), (q, t) => ({ pedal: t < 1 ? 1 : 0, steer: t > 0.8 ? -1 : 0, brakeR: t > 0.9 && t < 2.2 ? 1 : 0 }), 4);
  check("drift pad: a skid turn on the packed gravel (rear brake + full steer at 23 km/h), no crash", dr.crashes === 0, `${crashTxt(dr)}, heading turned ${f1((dr.heading - SPOT_SPOTS["drift pad"][2]) * 57.3)} deg`, "no crash");
}

}
applyFeel("old");
const ms = performance.now() - T0;
if (!quiet || failed) {
  console.log("| check | result | got | want |\n|---|---|---|---|");
  for (const r of rows) if (!quiet || r[1] === "FAIL") console.log(`| ${r.join(" | ")} |`);
}
console.log(`\n${failed ? `${failed} spot check(s) FAIL` : `all ${rows.length} spot checks pass`} (${(ms / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
