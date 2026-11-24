// CARS LOOK GATE (claude/cars1, rule car-look, docs/rules/car-look.md): the car family's budgets and named material slots,
// the shared clear-coat car material and the reflection probe's wiring, from the files (no browser).
//   node tools/audit/carLookGate.mjs [--quiet]        exit 1 on a failure
// What it checks (models/cars/cars2.glb against models/cars/cars2_r0.glb, the family before CARS LOOK round 1):
//   1. budgets per car and LOD: LOD0 <= LOD0_MAX (street types) / LOD0_MAX_POLICE, LOD1 and LOD2 NOT above the r0 file's
//      (the 30-130 m bands carry most of a street: they must not grow), the body size within 1 cm of r0's (the fleet's
//      SIZES, colliders and slots are r0's numbers)
//   2. named material slots (_KIND): only the known kinds; LOD0 of every street type carries the clear-coat gloss black
//      (10), the alloy rim (11) and the panel gaps (12); no gap kind at LOD1 / LOD2 (their detail level has no shut lines)
//   3. the material (viewer/drive/carPacks.js): the new paint's metalness is 0 (the post chain's SSR mask is the
//      metalness: no SSR on paint unless ?carssr=1), gloss black has the coat, every car material takes carEnv.node
//   4. the probe (viewer/carProbe.js): one cube face per step, two cubes cross-faded, made before the fleets in main.js,
//      no DynamicDrawUsage; ?carlook=old loads cars2_r0.glb
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCarGlb } from "../../viewer/drive/carLod.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0, oks = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else { oks++; if (!QUIET) console.log("ok  ", m); } return c; };
const rd = (p) => readFileSync(path.join(ROOT, p), "utf8");
const glb = (p) => { const b = readFileSync(path.join(ROOT, p)); return parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };

export const LOD0_MAX = 19000, LOD0_MAX_POLICE = 21500;
const STREET = JSON.parse(/export const TYPE_MIX = (\[.*?\]);/s.exec(rd("viewer/carFleet.js"))[1]).map(([t]) => t);
const KNOWN = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]);

const now = glb("models/cars/cars2.glb"), old = glb("models/cars/cars2_r0.glb");
const lvl = (name) => (/_L(\d)$/.exec(name) ? +RegExp.$1 : 0);
const tris = (car, L) => car.parts.filter((p) => lvl(p.name) === L).reduce((a, p) => a + p.mesh.I.length / 3, 0);
const kinds = (car, L) => { const s = new Set(); for (const p of car.parts) if (lvl(p.name) === L) for (const k of p.mesh.K) s.add(Math.round(k)); return s; };
const rows = [];
for (const c of now) {
  const o = old.find((q) => q.id === c.id);
  if (!ok(!!o, `${c.id}: in cars2_r0.glb`)) continue;
  const t = [0, 1, 2].map((L) => tris(c, L)), t0 = [0, 1, 2].map((L) => tris(o, L));
  rows.push(`${c.id.padEnd(8)} LOD0 ${t0[0]} -> ${t[0]}   LOD1 ${t0[1]} -> ${t[1]}   LOD2 ${t0[2]} -> ${t[2]}`);
  ok(t[0] <= (c.id === "police" ? LOD0_MAX_POLICE : LOD0_MAX), `${c.id}: LOD0 ${t[0]} tris <= ${c.id === "police" ? LOD0_MAX_POLICE : LOD0_MAX}`);
  ok(t[1] <= t0[1] && t[2] <= t0[2], `${c.id}: LOD1 ${t[1]} <= ${t0[1]}, LOD2 ${t[2]} <= ${t0[2]} (the far bands do not grow)`);
  const s = c.extras.size, s0 = o.extras.size;
  ok(s.every((v, i) => Math.abs(v - s0[i]) <= 0.01), `${c.id}: size ${s} within 1 cm of r0 ${s0}`);
  for (const L of [0, 1, 2]) { const bad = [...kinds(c, L)].filter((k) => !KNOWN.has(k)); ok(!bad.length, `${c.id} LOD${L}: known kinds only${bad.length ? ` (unknown ${bad})` : ""}`); }
  if (STREET.includes(c.id)) {
    const k0 = kinds(c, 0);
    ok(k0.has(10) && k0.has(11) && k0.has(12), `${c.id} LOD0: gloss black (10), alloy rim (11) and panel gaps (12) slots present`);
  }
  ok(!kinds(c, 1).has(12) && !kinds(c, 2).has(12), `${c.id}: no panel-gap slot at LOD1 / LOD2`);
}
ok(STREET.every((t) => now.some((c) => c.id === t)), `every street type (${STREET.join(" ")}) in cars2.glb`);

// ---- the material and the probe (text)
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;,){])\/\/.*$/gm, "$1");
const packs = strip(rd("viewer/drive/carPacks.js")), probe = strip(rd("viewer/carProbe.js")), main = strip(rd("viewer/main.js"));
ok(/metalnessNode = select\(isPaint, float\(CARSSR \? 0\.2 : 0\)/.test(packs), "carPacks: the new paint is not metallic (no SSR on paint unless ?carssr=1)");
ok(/clearcoatNode = select\(isPaint\.or\(isGloss\), packLook\.clearcoat/.test(packs), "carPacks: the clear coat on the paint and the gloss black trim");
ok(/if \(carEnv\.node && !noProbe\) m\.envNode = carEnv\.node/.test(packs), "carPacks: every car material takes the probe's environment");
ok(/CARLOOK_OLD \? "\.\.\/\.\.\/models\/cars\/cars2_r0\.glb"/.test(packs), "carPacks: ?carlook=old loads cars2_r0.glb");
ok(/drawFace\(rts\[r\], face\)/.test(probe) && /frame\+\+ % every === 0/.test(probe), "carProbe: one cube face per step");
ok(/mix\(pmA, pmB, w\)/.test(probe) && /needsPMREMUpdate = true/.test(probe), "carProbe: two cubes, cross-faded, a PMREM per completed cube");
ok(!/DynamicDrawUsage/.test(probe), "carProbe: no DynamicDrawUsage");
const iProbe = main.indexOf("createCarProbe({"), iTraffic = main.search(/createTraffic|trafficFleet/);
ok(iProbe > 0 && main.indexOf("updaters.push(probe.update)") > iProbe, "main.js: the probe is made and updated per frame");
ok(iProbe > 0 && (iTraffic < 0 || iProbe < iTraffic), "main.js: the probe exists before the traffic's car materials");

if (!QUIET || fails) for (const r of rows) console.log("    " + r);
console.log(`car look: ${oks} ok, ${fails} failed`);
process.exit(fails ? 1 : 0);
