// ONE GROUND FOR EVERY MOVER: the unit checks (claude/ground 2026-11-19, rule mover-ground, provisional, docs/MOVERGROUND.md). Fast,
// no tile build:
//   1. moverGround.js gridLayerY gives colliders.js driveHeight's numbers (random grids, two layers, any near)
//   2. moverGroundY gives the player car's ground as driveMode.js had it before (the same decks + grid logic, copied
//      here from claude/foundation 58d69aa0), so the player's car drives exactly as before
//   3. roadDeck.js deckHeightFn with its circle test gives the same heights as without it (the hero road decks' notes)
//   5. cost + no allocation per step (768 cars x 2 wheels)
//   node tools/audit/moverGroundTest.mjs
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { gridLayerY, moverGroundY, createMoverGround, moverLayered } = await imp("viewer/drive/moverGround.js");
const { driveHeight } = await imp("viewer/drive/colliders.js");
const { deckHeightFn } = await imp("viewer/rail/roadDeck.js");
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log(`FAIL ${msg}`); } };
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

// a synthetic tile: 40 x 30 m grid, a street (delta 12-40 cm) and a stacked layer (a deck 6 m over part of it)
const cols = 40, rows = 30, h = { x0: 100, z0: 200, step: 1, cols, rows };
const Y = new Float32Array(cols * rows).map(() => 50 + rnd() * 3);
const delta = new Uint16Array(cols * rows), delta2 = new Uint16Array(cols * rows).fill(65535);
for (let k = 0; k < delta.length; k++) { delta[k] = rnd() < 0.2 ? 0 : Math.round(12 + rnd() * 30); if (rnd() < 0.15) { delta2[k] = delta[k]; delta[k] += 600; } }
const hm = { h, y: Y, surface: (x, z) => 0 };
hm.surface = (x, z) => { const c = Math.min(Math.max(x - h.x0, 0), cols - 1), r = Math.min(Math.max(z - h.z0, 0), rows - 1), c0 = Math.min(Math.floor(c), cols - 2), r0 = Math.min(Math.floor(r), rows - 2), fc = c - c0, fr = r - r0, i = r0 * cols + c0; return (Y[i] * (1 - fc) + Y[i + 1] * fc) * (1 - fr) + (Y[i + cols] * (1 - fc) + Y[i + cols + 1] * fc) * fr; };
const ground = { delta, delta2 };

// 1. grid
let n1 = 0;
for (let q = 0; q < 20000; q++) {
  const x = h.x0 - 3 + rnd() * (cols + 6), z = h.z0 - 3 + rnd() * (rows + 6);
  const near = q % 3 === 0 ? null : 48 + rnd() * 12;
  const a = driveHeight(hm, ground, x, z, near), b = gridLayerY(hm, ground, x, z, near);
  if (Math.abs(a - b) > 1e-9) n1++;
}
check(n1 === 0, `gridLayerY differs from driveHeight at ${n1} of 20000 points`);
check(gridLayerY(hm, ground, 110.5, 210.5, NaN) === driveHeight(hm, ground, 110.5, 210.5, null), "NaN near = no near");

// 2. the player's ground as before (driveMode.js Driver.ground, claude/foundation 58d69aa0)
function oldDriverGround(world, x, z, near) {
  let dk = null, osm = false;
  for (const f of world.decks || []) { const y = f(x, z); if (y != null) { dk = y; osm = !!f.osm; break; } }
  const t = world.at(x, z);
  const g = t.drive ? driveHeight(t.hm, t.drive.ground, x, z, near) : t.hm.surface(x, z) + 0.12;
  if (dk == null) return g;
  if (osm && Math.abs(g - dk) < 1.5) return Math.max(g, dk);
  return Number.isFinite(near) && Math.abs(g - near) + 1 < Math.abs(dk - near) ? g : dk;
}
const osmDeck = Object.assign((x, z) => (x > 110 && x < 120 && z > 205 && z < 215 ? 50.4 + (x - 110) * 0.01 : null), { osm: true });
const highDeck = Object.assign((x, z) => (x > 125 && x < 135 && z > 210 && z < 225 ? 58 : null), { osm: true });
const heroDeck = (x, z) => (x > 102 && x < 108 && z > 220 && z < 228 ? 57 : null);
const tileA = { hm, drive: { ground } }, tileB = { hm, drive: null };
for (const [name, t] of [["grid", tileA], ["no grid", tileB]]) {
  const world = { decks: [osmDeck, highDeck, heroDeck], at: () => t };
  const mg = createMoverGround(world);
  let n2 = 0;
  for (let q = 0; q < 20000; q++) {
    const x = h.x0 + rnd() * cols, z = h.z0 + rnd() * rows, near = q % 4 === 0 ? null : 45 + rnd() * 16;
    const a = oldDriverGround(world, x, z, near), b = moverGroundY(world.decks, t, x, z, near), c = mg(x, z, near);
    if (Math.abs(a - b) > 1e-9 || a !== c) n2++;
  }
  check(n2 === 0, `moverGroundY (${name}) differs from the player's old ground at ${n2} of 20000 points`);
}
// a car under the high deck stays under it, one on it stays on it; the top layer with no height
{
  const world = { decks: [highDeck], at: () => tileB };
  const under = moverGroundY(world.decks, tileB, 130, 215, 51), on = moverGroundY(world.decks, tileB, 130, 215, 57.9), none = moverGroundY(world.decks, tileB, 130, 215, null);
  check(under < 55 && on === 58 && none === 58, `layers: under ${under}, on ${on}, none ${none}`);
  check(moverLayered(createMoverGround(world), 130, 215) && !moverLayered(createMoverGround(world), 112, 210), "moverLayered");
}

// 3. the hero road decks: the circle test changes no height (the notes' fn as it was, from git)
{
  const tmp = mkdtempSync(join(tmpdir(), "movground-"));
  const oldSrc = execSync("git show 58d69aa0:viewer/rail/roadDeck.js", { cwd: ROOT, encoding: "utf8" });
  writeFileSync(join(tmp, "roadDeckOld.mjs"), oldSrc);
  const { deckHeightFn: oldFn } = await import(pathToFileURL(join(tmp, "roadDeckOld.mjs")).href);
  for (const f of readdirSync(join(ROOT, "models/rail")).filter((f) => f.endsWith(".json"))) {
    const info = JSON.parse(readFileSync(join(ROOT, "models/rail", f), "utf8"));
    if (info.kind !== "road_over_rail") continue;
    const A = oldFn(info), B = deckHeightFn(info), [px, , pz] = info.placement.city_local_position;
    let n3 = 0, on = 0;
    for (let x = px - 80; x <= px + 80; x += 0.37) for (let z = pz - 80; z <= pz + 80; z += 0.41) { const a = A(x, z), b = B(x, z); if (a !== b) n3++; if (a != null) on++; }
    check(n3 === 0 && on > 100, `${f}: deckHeightFn with its circle test differs at ${n3} points (${on} on the deck)`);
  }
}

// 4. (the source checks: main.js / driveMode.js / trafficSim.js call the one function) are the `meta` row's: gate.d/movergroundunit.mjs

// 5. cost + no allocation: 768 cars x 2 wheels per step over a world of 9 tiles and 12 decks (the deck tests as the city's:
// a box / circle test first), V8's sampling heap profiler on moverGround.js
{
  const tiles = [];
  for (let i = 0; i < 9; i++) tiles.push({ hm, drive: { ground }, bounds: { x0: h.x0, z0: h.z0, x1: h.x0 + cols, z1: h.z0 + rows } });
  const far = (k) => Object.assign((x, z) => (x > 5000 + k * 50 && x < 5010 + k * 50 && z > 0 && z < 10 ? 70 : null), { osm: true });
  const world = { decks: [osmDeck, highDeck, ...Array.from({ length: 10 }, (_, k) => far(k))],
    at(x, z) { for (const t of tiles) { const b = t.bounds; if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return t; } return tiles[0]; } };
  const mg = createMoverGround(world), N = 768 * 2, PX = new Float64Array(N), PZ = new Float64Array(N), PY = new Float64Array(N).fill(NaN);
  for (let k = 0; k < N; k++) { PX[k] = h.x0 + rnd() * cols; PZ[k] = h.z0 + rnd() * rows; }
  const step = () => { for (let k = 0; k < N; k++) PY[k] = mg(PX[k], PZ[k], PY[k]); };
  for (let r = 0; r < 200; r++) step();                                 // (JIT warm)
  const t0 = performance.now(); for (let r = 0; r < 200; r++) step(); const us = (performance.now() - t0) * 1000 / 200;
  const { Session } = await import("node:inspector/promises");
  const ses = new Session(); ses.connect();
  await ses.post("HeapProfiler.enable");
  const runs = [];
  for (let m = 0; m < 3; m++) {
    await ses.post("HeapProfiler.startSampling", { samplingInterval: 64 });
    for (let r = 0; r < 200; r++) step();
    const { profile } = await ses.post("HeapProfiler.stopSampling");
    let bytes = 0;
    const walk = (n, o) => { const own = o || /moverGround\.js$/.test(n.callFrame.url); if (own) bytes += n.selfSize; for (const c of n.children) walk(c, own); };
    walk(profile.head, false); runs.push(bytes);
  }
  ses.disconnect();
  check(Math.min(...runs) < 2048, `allocation in the mover ground: ${runs.join(" / ")} bytes over 200 steps x ${N} wheels`);
  check(us < 1500, `cost: ${us.toFixed(0)} us per step of ${N} wheels (budget 1500)`);
  console.log(`  mover ground: ${us.toFixed(0)} us per traffic step (${N} wheels, 9 tiles, 12 decks), ${Math.min(...runs)} bytes allocated per 200 steps`);
}

console.log(fails ? `moverGroundTest: FAIL (${fails})` : "moverGroundTest: ok");
process.exit(fails ? 1 : 0);
