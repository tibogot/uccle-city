// GATE: THE TWO PATROL CARS IN THE YARD (claude/policeyard, owner 2026-11-28; docs/POLICE_GAME.md "Choosing the car").
// Rule police-car-choice: the police shift starts with BOTH patrol cars in the Rue Rouge yard (the unmarked dark estate,
// seated, and the marked Belgian police estate in a north-row bay), either one taken with E; nothing of it adds a light.
//   1. the cars: two, one of each kind, the seated one at the shift's old start; ?policecar=marked the other way round;
//   2. both in the yard: every box corner inside the drawn yard (viewer/policeYard.js OUTLINE), clear of the station's
//      walls (site.json solids) and of the 5 yard cars (viewer/policeCars.js POLICE_CAR_PLACES) by >= 0.3 m, the bay car
//      inside a painted bay; each car's way out (the seated car ahead to the gate, the bay car backed out 3.5 m then
//      ahead) clear of the other one;
//   3. both enterable (yardCars.js, the functions the game runs): stopped in the yard E gets out (not rolling, not
//      outside the yard), the exit spot is free (no car, no wall, in the yard), next to EITHER car E gets in that car,
//      from the exit spot of one the other is not "in reach" by mistake;
//   4. the marked livery: cars2.glb's police estate keeps its paint and has the blue AND the fluorescent yellow of the
//      Battenburg blocks in its body colours; policeCar.js loads it for kind "marked";
//   5. no runtime light: one pool slot reserved (policeCar.js reserve(1), the only reserve), every kit emission through
//      kitGain (the per-object `live` uniform: a parked car's beacon dark on the SAME materials, no new light, no
//      material per car); the game wiring (the parked boxes a rail-mover source, the warm-up of both cars' looks,
//      the E key, ?policeyard=old = one car).
//   node --import ./tools/christmas/hook.mjs tools/audit/policeYard.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rows = [];
const check = (name, ok, info = "") => { rows.push([name, ok ? "PASS" : "FAIL", info]); };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
globalThis.location ??= { search: "" };
const Y = await import(pathToFileURL(path.join(ROOT, "viewer/police/yardCars.js")).href);

// ---- geometry helpers (city plan)
const site = JSON.parse(rd("models/police_rouge/site.json"));
const F = site.frame, ca = Math.cos(F.rotation_rad), sa = Math.sin(F.rotation_rad);
const toCity = (u, w) => [F.origin_city[0] + u * ca - w * sa, F.origin_city[1] + u * sa + w * ca];
const toFrame = ([x, z]) => { const dx = x - F.origin_city[0], dz = z - F.origin_city[1]; return [dx * ca + dz * sa, -dx * sa + dz * ca]; };
const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segD = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
// two convex rings' clearance (0 = touching or overlapping): sampled edges, both ways
const ringGap = (A, B) => {
  if (A.some((p) => inPoly(p, B)) || B.some((p) => inPoly(p, A))) return 0;
  let d = Infinity;
  const edges = (R) => R.map((a, i) => [a, R[(i + 1) % R.length]]);
  for (const [a, b] of edges(A)) for (let t = 0; t <= 1; t += 0.05) { const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; if (inPoly(p, B)) return 0; for (const [c, e] of edges(B)) d = Math.min(d, segD(p, c, e)); }
  return d;
};

// the size of the two bodies (cars2.glb: the estate and the police estate)
const { parseCarGlb } = await import(pathToFileURL(path.join(ROOT, "viewer/drive/carLod.js")).href);
const glb = fs.readFileSync(path.join(ROOT, "models/cars/cars2.glb"));
const cars2 = parseCarGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength));
const sizeOf = (kind) => (cars2.find((c) => c.id === (kind === "marked" ? "police" : "estate"))?.extras.size) || [1.85, 1.47, 4.75];
const dims = (kind) => { const [w, h, l] = sizeOf(kind); return { hw: w / 2, hl: l / 2, ht: h }; };

// ---- 1. the cars
const cars = Y.yardCars("unmarked").map((c) => ({ ...c, ...dims(c.kind) }));
const rev = Y.yardCars("marked");
check("two cars, one of each kind", cars.length === 2 && new Set(cars.map((c) => c.kind)).size === 2 && cars.every((c) => Y.KINDS.includes(c.kind)), cars.map((c) => `${c.kind}${c.seated ? " (seated)" : ""}`).join(", "));
check("seated at the shift's old start (site frame u 18, w -6, toward the gate)", Math.hypot(cars[0].x - toCity(18, -6)[0], cars[0].z - toCity(18, -6)[1]) < 0.01 && Math.abs(Math.sin(cars[0].heading - Math.atan2(-sa, ca))) < 1e-6 && cars[0].seated && !cars[1].seated);
check("?policecar=marked: seated in the marked one, the unmarked in the bay", rev[0].kind === "marked" && rev[1].kind === "unmarked" && rev[0].x === cars[0].x && rev[1].x === cars[1].x);

// ---- 2. both in the yard
const yardSrc = rd("viewer/policeYard.js");
const OUTLINE = JSON.parse(yardSrc.match(/const OUTLINE = (\[[^;]*\]);/)[1]);
const solids = Object.values(site.solids).map((s) => s.footprint);
const placeSrc = rd("viewer/policeCars.js").match(/POLICE_CAR_PLACES = \[([\s\S]*?)\];/)[1];
const places = [...placeSrc.matchAll(/type: "(\w+)", u: ([-\d.]+), w: ([-\d.]+), nose: "([uw][+-])"/g)].map((m) => {
  const [x, z] = toCity(+m[2], +m[3]); const size = cars2.find((c) => c.id === m[1])?.extras.size || [1.9, 1.6, 4.8];
  return { type: m[1], x, z, heading: Y.noseHeading(m[4]), hw: size[0] / 2, hl: size[2] / 2 };
});
check("the yard cars read (5 places)", places.length === 5, places.map((p) => p.type).join(" "));
for (const c of cars) {
  const ring = Y.boxRing(c, c.hw, c.hl);
  const inYard = ring.every((p) => inPoly(toFrame(p), OUTLINE));
  const wall = Math.min(...solids.map((s) => ringGap(ring, s)));
  const yc = Math.min(...places.map((p) => ringGap(ring, Y.boxRing(p, p.hw, p.hl))));
  check(`${c.kind}: in the yard, clear of the walls and the yard cars`, inYard && wall >= 0.3 && yc >= 0.3, `in yard ${inYard}, wall ${wall.toFixed(2)} m, yard car ${yc.toFixed(2)} m`);
}
{
  const b = cars[1], [u, w] = toFrame([b.x, b.z]);
  const lines = [...yardSrc.matchAll(/const w = (-?[\d.]+) \+ k \* ([\d.]+)/g)][0];
  const w0 = +lines[1], step = +lines[2], k = Math.floor((w - w0) / step);
  const ok = u - b.hl >= 20.2 && u + b.hl <= 25.2 && k >= 0 && k < 7 && w - b.hw > w0 + k * step && w + b.hw < w0 + (k + 1) * step;
  check("the bay car inside a painted bay of the north row", ok, `u ${u.toFixed(2)}, w ${w.toFixed(2)}, bay ${k} (w ${(w0 + k * step).toFixed(1)}..${(w0 + (k + 1) * step).toFixed(1)})`);
}
{
  // the ways out: the seated car straight ahead to w 10 (the gate mouth); the bay car backed out 3.5 m, then along w+
  const [s, b] = cars;
  const sweep = (c, du, dw, n) => { const out = []; for (let i = 0; i <= n; i++) { const [u0, w0] = toFrame([c.x, c.z]); const [x, z] = toCity(u0 + du * i / n, w0 + dw * i / n); out.push({ ...c, x, z }); } return out; };
  const [su, sw] = toFrame([s.x, s.z]);
  const g1 = Math.min(...sweep(s, 0, 10 - sw, 40).map((p) => ringGap(Y.boxRing(p, p.hw, p.hl), Y.boxRing(b, b.hw, b.hl))));
  const back = sweep(b, -3.5, 0, 14), [bu, bw] = toFrame([back[back.length - 1].x, back[back.length - 1].z]);
  const turned = { ...b, x: back[back.length - 1].x, z: back[back.length - 1].z, heading: Y.noseHeading("w+") };
  const g2 = Math.min(...back.map((p) => ringGap(Y.boxRing(p, p.hw, p.hl), Y.boxRing(s, s.hw, s.hl))), ...sweep(turned, 0, 10 - bw, 40).map((p) => ringGap(Y.boxRing(p, p.hw, p.hl), Y.boxRing(s, s.hw, s.hl))));
  check("each car's way out clear of the other (>= 0.5 m)", g1 >= 0.5 && g2 >= 0.5, `seated -> gate ${g1.toFixed(2)} m, bay car backed out (u ${bu.toFixed(1)}) -> gate ${g2.toFixed(2)} m; seated at u ${su.toFixed(1)}`);
}

// ---- 3. both enterable
{
  const s = cars[0];
  check("E gets out: stopped in the yard yes, rolling / far no", Y.canGetOut(s.x, s.z, 0) && !Y.canGetOut(s.x, s.z, 2) && !Y.canGetOut(s.x + 60, s.z, 0));
  for (const c of cars) {
    // (the game's exitBlocked: the other cars' boxes + 0.35 m; here the walls and the yard outline too)
    const others = [...cars.filter((o) => o !== c), ...places];
    const blocked = (x, z) => others.some((p) => Y.boxDist(x, z, p, p.hw, p.hl) < 0.35) || solids.some((sol) => inPoly([x, z], sol)) || !inPoly(toFrame([x, z]), OUTLINE);
    const e = Y.exitSpot(c, c.hw, blocked, undefined, c.hl);
    const clearCars = Math.min(...others.map((p) => Y.boxDist(e.x, e.z, p, p.hw, p.hl)));
    const clearWalls = solids.every((sol) => !inPoly([e.x, e.z], sol)) && Math.min(...solids.flatMap((sol) => sol.map((a, i) => segD([e.x, e.z], a, sol[(i + 1) % sol.length])))) > 0.35;
    const inYard = inPoly(toFrame([e.x, e.z]), OUTLINE);
    check(`${c.kind}: the exit spot free (no car, no wall, in the yard)`, clearCars >= 0.35 && clearWalls && inYard, `nearest car ${clearCars.toFixed(2)} m`);
    const got = Y.carInReach(e.x, e.z, cars);
    check(`${c.kind}: E next to it gets in THAT car`, got === c, got ? got.kind : "none in reach");
    // from the other side and the back too (the player walks round)
    const side = { x: c.x - Math.cos(c.heading) * (c.hw + 0.6), z: c.z + Math.sin(c.heading) * (c.hw + 0.6) };
    const rear = { x: c.x - Math.sin(c.heading) * (c.hl + 0.6), z: c.z - Math.cos(c.heading) * (c.hl + 0.6) };
    check(`${c.kind}: in reach from its right side and its back`, Y.carInReach(side.x, side.z, cars) === c && Y.carInReach(rear.x, rear.z, cars) === c);
  }
  // the parked boxes for the colliders (rail-mover rows: 7 floats, yaw = heading, hw across, hl along)
  const out = new Float32Array(48 * 7), n = Y.parkedBodies(cars, cars[0].x, cars[0].z, 30, out, 7);
  check("parked boxes: both written after an earlier source's row, the car's frame", n === 2 && out[7] === Math.fround(cars[0].x) && out[9] === Math.fround(cars[0].heading) && out[10] === Math.fround(cars[0].hw) && out[11] === Math.fround(cars[0].hl), `n ${n}`);
}

// ---- 4. the marked livery
{
  const p = cars2.find((c) => c.id === "police"), body = p?.parts.find((x) => x.name === "Body");
  let blue = 0, yellow = 0;
  if (body) { const C = body.mesh.C; for (let i = 0; i < C.length; i += 3) { const r = C[i], g = C[i + 1], b = C[i + 2]; if (b > 0.2 && b > 3 * r && b > 3 * g) blue++; if (r > 0.35 && g > 0.35 && b < 0.12) yellow++; } }
  check("cars2 police estate: its own paint kept, Battenburg blue + yellow in the body", !!p && p.extras.keepPaint === true && blue > 50 && yellow > 50, `blue ${blue} / yellow ${yellow} vertices`);
  const pc = rd("viewer/police/policeCar.js");
  check("policeCar.js: kind \"marked\" loads the police estate, its paint", /c\.id === \(marked \? "police" : POLICE_CAR\.type\)/.test(pc) && /marked \? car\.paint\.clone\(\)/.test(pc));
}

// ---- 5. no runtime light + the wiring
{
  const pc = rd("viewer/police/policeCar.js"), pg = rd("viewer/police/policeGame.js"), bm = rd("viewer/policeCar/beaconModel.js"), km = rd("viewer/police/kitMerge.js");
  const reserves = [pc, pg, rd("viewer/police/yardCars.js")].join("\n").match(/\.reserve\(/g)?.length ?? 0;
  check("one night-pool slot for both cars (reserve(1) once)", reserves === 1 && /poolRef\.reserve\(1\)/.test(pc), `${reserves} reserve calls`);
  check("every kit emission through kitGain (the parked car dark on the same materials)", !/\.mul\(beaconU\.gain\)/.test(bm + km) && (bm.match(/mul\(kitGain\)/g)?.length ?? 0) >= 5 && /mul\(kitGain\)/.test(km) && /live: uniform\(1\)\.onObjectUpdate/.test(bm));
  check("the body lamps x live (head, tail, brake)", /\.mul\(live\);/.test(pc) && /tail: carLights\.tail\.mul\(live\), brake: carLights\.brake\.mul\(live\)/.test(pc));
  check("the game: parked boxes a rail-mover source, both looks warmed, E swaps, ?policeyard=old one car",
    /railSources\?\.push\(\(\) => G\.moverSrc\)/.test(pg) && /G\.car\.warmSet\(\)/.test(pg) && /e\.code === "KeyE" && !kit\.promptOn/.test(pg) && /TWO_CARS = !YARD_OLD && HAS_MARKED/.test(pg));
}

const failed = rows.filter((r) => r[1] !== "PASS");
if (!quiet || failed.length) for (const r of rows) console.log(`${r[1]}  ${r[0]}${r[2] ? `  (${r[2]})` : ""}`);
console.log(failed.length ? `policeYard: ${failed.length} FAIL` : `policeYard: all ${rows.length} pass`);
process.exitCode = failed.length ? 1 : 0;
