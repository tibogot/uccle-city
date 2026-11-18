// node --import ./tools/characters/threeHook.mjs tools/audit/bushGate.mjs [--quiet]
// THE BUSHES' GATE (claude/bushes, viewer/plants/bushes.js). Root cause it guards: the old shrubs' LOD hand-overs were
// per-pixel DITHER cross-fades at 4 m and ~10 m (Blender model -> thinned leaves + inner shell -> an 80-triangle
// shell), inside the range the drive / walk cameras keep bushes in: every nearby bush drew half one model, half the
// other (a see-through ghost under the TAA) and an 80-triangle ball past 10 m. Checks:
//   1. near range: no bush fade / dither starts inside BUSH_NEAR (30 m): the far end's fade start (every type, any
//      height), and the one LOD switch is the trees' card morph (shrink starts >= 20 m; the switch past it)
//   2. shapes: each variant built by the vendor's own builder: triangles per LOD within BUSH_TRIS (LOD 1 <= the old
//      80-triangle shell), the foliage reaches the foot (lowest card <= 3 % of the height above it: no floating ball),
//      its top within 15 % of the design height (the LiDAR scale is right)
//   3. budget on the real data (all tiles, every 25 m): the worst disc's bush triangles new vs old (old: the Blender
//      LODs' triangles by the old bands), new <= old x 1.1 at the worst new point; bush draws: no view of their own (the
//      trees' pool's 3 views a LOD), the plants make no pool for the shrub types
//   4. no DynamicDrawUsage, no light in the bush code
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three/webgpu";
import { createStylizedTrees } from "../../vendor/stylized-trees/stylizedTrees.js";
import {
  bushShape, bushExtent, bushEnd, bushVariant, BUSH_SHAPES, BUSH_SEED, BUSH_TYPES, BUSH_KINDS, BUSH_NEAR, BUSH_TRIS, BUSH_END_BAND, BUSH_SHADOW, BUSH_END_MAX,
} from "../../viewer/plants/bushes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const rows = [];
let fails = 0;
const check = (name, ok, detail) => { rows.push([name, ok ? "PASS" : "FAIL", detail]); if (!ok) fails++; };

// ---- 1. near range
const TS = rd("viewer/treesStylized.js");
const lodDist = +(TS.match(/lodDist:\s*(\d+(?:\.\d+)?),\s*farDist/)?.[1] ?? NaN);
const morph1 = +(TS.match(/morph1:\s*SMOOTH \?\s*(\d+(?:\.\d+)?)/)?.[1] ?? NaN);
check("lod-switch", lodDist - morph1 >= 20, `bush LOD 0 -> 1 = the trees' card morph: cards shrink from ${lodDist - morph1} m, switch at ${lodDist} m (+ slack) (>= 20 m)`);
let minFade = Infinity, worstT = "";
for (const t of BUSH_KINDS) for (let h = 0.1; h <= 6; h += 0.05) { const e = bushEnd(t, h), f = e * (1 - BUSH_END_BAND); if (f < minFade) { minFade = f; worstT = `${t} ${h.toFixed(2)} m`; } }
check("far-fade", minFade >= BUSH_NEAR, `the far end's dither starts at >= ${minFade.toFixed(1)} m (worst ${worstT}; near range ${BUSH_NEAR} m); ends <= ${BUSH_END_MAX} m`);
check("shadow-fade", BUSH_SHADOW.end - BUSH_SHADOW.band >= 20, `the bushes' shadows fade ${BUSH_SHADOW.end - BUSH_SHADOW.band}-${BUSH_SHADOW.end} m (shadow pass only, >= 20 m)`);
// (the old bands, for the record: ?bushes=old)
const CP = rd("viewer/plants/cityPlants.js");
const oldB = [...CP.matchAll(/(\w+): \[(\d+), (\d+), (\d+)\]/g)].filter((m) => BUSH_KINDS.includes(m[1]));
const oldNear = Math.min(...oldB.map((m) => +m[2] * 0.9));
if (!quiet) console.log(`(?bushes=old: dithered hand-overs from ${oldNear.toFixed(1)} m and ~${Math.min(...oldB.map((m) => +m[3] * 0.9)).toFixed(1)} m: fails the near rule)`);

// ---- 2. shapes, built as the city builds them
const shared = {};
const mask = new THREE.DataTexture(new Uint8Array(4), 2, 2, THREE.RedFormat);
createStylizedTrees({ scene: new THREE.Group(), trees: [], shared, variants: BUSH_SHAPES.length, params: { leafMask: mask, shape: bushShape, seed: BUSH_SEED, crownLift: 0 } });
const triOf = [];
BUSH_SHAPES.forEach((S, v) => {
  const e0 = bushExtent(shared.geoms.get(`${v}:0`).leaves), e1 = bushExtent(shared.geoms.get(`${v}:1`).leaves);
  triOf[v] = [e0.tris, e1.tris];
  check(`shape ${S.name}`, e0.tris <= BUSH_TRIS[0] && e1.tris <= BUSH_TRIS[1] && e0.foot <= 0.03 * S.h && e1.foot <= 0.03 * S.h && Math.abs(e0.top - S.h) <= 0.15 * S.h,
    `tris ${e0.tris} / ${e1.tris} (<= ${BUSH_TRIS.join(" / ")}), foliage foot ${e0.foot.toFixed(2)} / ${e1.foot.toFixed(2)} m (<= ${(0.03 * S.h).toFixed(2)}), top ${e0.top.toFixed(2)} (design ${S.h})`);
});
for (const [t, T] of Object.entries(BUSH_TYPES)) if (!T.shapes.every((v) => BUSH_SHAPES[v])) check(`type ${t}`, false, "unknown shape");

// ---- 3. budget on the data
const OLD_TRIS = { box_ball: [5214, 2742, 80], laurel: [7654, 6502, 80], rhododendron: [19626, 10854, 80], hydrangea: [17282, 8492, 80], rose: [5392, 3010, 80], lavender: [5880, 2064, 80] };   // docs/FOLIAGE.md
const OLD_B = Object.fromEntries(oldB.map((m) => [m[1], [+m[2], +m[3], +m[4]]]));
const D = path.join(ROOT, "data/plants");
let worst = { new: 0, old: 0, at: "" }, worstOld = { new: 0, old: 0, at: "" }, nB = 0;
for (const f of fs.readdirSync(D)) {
  if (!/^[A-Z]\d+\.json$/.test(f)) continue;
  const j = JSON.parse(fs.readFileSync(path.join(D, f), "utf8")), P = j.plants || [], types = j.types;
  const pts = [];
  for (let o = 0; o < P.length; o += 6) { const t = types[P[o + 2]]; if (BUSH_TYPES[t]) pts.push([P[o], P[o + 1], t, P[o + 4] / 100]); }
  nB += pts.length;
  if (!pts.length) continue;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  for (let cx = x0; cx <= x1; cx += 25) for (let cz = z0; cz <= z1; cz += 25) {
    let nw = 0, ol = 0;
    for (const [x, z, t, sc] of pts) {
      const d = Math.hypot(x - cx, z - cz);
      if (d > 100) continue;
      const v = bushVariant(t, x, z), e = bushEnd(t, sc);
      if (d < lodDist + 6) nw += triOf[v][0]; else if (d < e) nw += triOf[v][1];
      const B = OLD_B[t], T = OLD_TRIS[t];
      if (d < B[0]) ol += T[0]; else if (d < B[1]) ol += T[1]; else if (d < Math.min(93, B[2] * (0.8 + 0.25 * Math.min(2, sc)))) ol += T[2];
    }
    if (nw > worst.new) worst = { new: nw, old: ol, at: `${f.slice(0, -5)} (${cx.toFixed(0)}, ${cz.toFixed(0)})` };
    if (ol > worstOld.old) worstOld = { new: nw, old: ol, at: `${f.slice(0, -5)} (${cx.toFixed(0)}, ${cz.toFixed(0)})` };
  }
}
check("tris-budget", worst.new <= Math.max(worst.old, worstOld.old) * 1.1, `${nB} bushes; worst new view ${worst.at}: ${Math.round(worst.new / 1000)}k tris (old there ${Math.round(worst.old / 1000)}k); worst old view ${worstOld.at}: ${Math.round(worstOld.old / 1000)}k (new ${Math.round(worstOld.new / 1000)}k)`);
const pool = TS.slice(TS.indexOf("function makeTreePool"));
const views = (pool.slice(0, pool.indexOf("const bands")).match(/\.addView\(/g) || []).length;
check("draws", views === 3 && /if \(this\.bushes && BUSH_KINDS\.includes\(t\)\) continue/.test(CP), `the trees' pool keeps ${views} views a LOD (bushes are parts of them: 0 more draws); the plants make no pool for the shrub types`);

// ---- 4. rules
const BJ = rd("viewer/plants/bushes.js"), bushCode = BJ + pool;
check("rules", !/DynamicDrawUsage\)|setUsage\(THREE\.Dynamic/.test(bushCode) && !/new THREE\.\w*Light\(/.test(bushCode), "no DynamicDrawUsage, no light added (bushes.js + the trees' pool)");

if (!quiet || fails) {
  console.log("| check | result | detail |\n|---|---|---|");
  for (const r of rows) console.log(`| ${r.join(" | ")} |`);
}
console.log(fails ? `bushGate: ${fails} FAIL` : `bushGate: all ${rows.length} pass`);
process.exit(fails ? 1 : 0);
