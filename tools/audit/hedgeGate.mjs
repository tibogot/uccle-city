// node --import ./tools/characters/threeHook.mjs tools/audit/hedgeGate.mjs [--quiet]
// THE GARDEN HEDGES' GATE (claude/hedges, viewer/gardens/gardenHedge.js; ?hedges=old = gardenHedgeOld.js). Root cause
// it guards: the bushes' lesson (docs/FOLIAGE.md §11): a per-pixel DITHER between two DIFFERENT models inside the range
// the drive / walk cameras keep things in reads as a see-through ghost under the TAA. The old hedges dithered their
// body LODs at 27-33 m (a lumpy body -> a smoother one) and their cards' end at 18.7-22 m. Checks:
//   1. near range: no hedge dither inside NEAR (30 m): the body's 0 -> 1 hand-over starts >= 40 m and the lumps are flat
//      before it (LOD0 = LOD1's shape there); the cards shrink (a morph) and are gone before their end dither
//   2. geometry: triangles per LOD <= the old ones, cards per module <= the old 64; <= 8 vertex buffers a pipeline
//      (attributes + the 4 instance columns: WebGPU's limit); every LOD's foot reaches
//      HEDGE_BOTTOM (12 % of the height under the base line)
//   3. budget on the real data (all tiles, a view every 25 m, the modules within 300 m): the worst view's hedge
//      triangles new <= old x 1.15; draws: the kit's pools keep 3 body + 1 card draw
//   4. on the ground: hedgeInstancesGen on a bumpy synthetic ground: every module's foot under the lower side
//      everywhere along it (JOINS)
//   5. rules: no DynamicDrawUsage, no light; the ?hedges=old switch and its features row; the baked textures exist
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
globalThis.location ??= { search: "", href: "file:///" };
const H = await import("../../viewer/gardens/gardenHedge.js");
const O = await import("../../viewer/gardens/gardenHedgeOld.js");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const rows = [];
let fails = 0;
const check = (name, ok, detail) => { rows.push([name, ok ? "PASS" : "FAIL", detail]); if (!ok) fails++; };
const NEAR = 30;
const OLD_BANDS = { hedge: [30, 90, 300], hedgecard: [22, 22, 22] };

// ---- 1. near range
const [b1, b2, bEnd] = H.HEDGE_BANDS.hedge, cEnd = H.HEDGE_BANDS.hedgecard[2];
check("lod-dither", b1 * 0.9 >= NEAR + 10 && H.LUMP_FADE[1] <= b1 * 0.9, `body LOD0 -> 1 dithers ${(b1 * 0.9).toFixed(1)}-${(b1 * 1.1).toFixed(1)} m (>= ${NEAR + 10}), the lumps flat by ${H.LUMP_FADE[1]} m (before it: identical shapes swap); LOD1 -> 2 ${(b2 * 0.9).toFixed(0)}-${(b2 * 1.1).toFixed(0)} m, end ${(bEnd * 0.85).toFixed(0)}-${bEnd} m (old: ${OLD_BANDS.hedge[0] * 0.9}-${OLD_BANDS.hedge[0] * 1.1} m, lumpy -> smooth)`);
check("card-morph", H.CARD_NEAR >= 10 && cEnd * 0.85 >= H.CARD_FAR && cEnd * 0.85 >= NEAR - 6, `cards shrink ${H.CARD_NEAR}-${H.CARD_FAR} m (a morph), gone before their end dither ${(cEnd * 0.85).toFixed(1)}-${cEnd} m`);

// ---- 2. geometry
const gN = H.hedgeGeometries(), gO = O.hedgeGeometries();
const tri = (g) => g.index.count / 3;
const tN = gN.body.map(tri), tO = gO.body.map(tri), cN = tri(gN.cards[0]), cO = tri(gO.cards[0]);
check("tris", tN.every((t, k) => t <= tO[k]) && cN <= cO, `body ${tN.join(" / ")} (old ${tO.join(" / ")}), cards ${cN} (old ${cO}) a module`);
// WebGPU's limit: 8 vertex buffers a pipeline (browser turn 2026-11-18: the cards with a 6th attribute + iAux = 9, the
// card pipeline failed to build and no card drew); every per-vertex attribute + the pools' 4 instance columns
// (instanceMatrix, iBand, iVar, iAux) must fit
const vb = (g) => Object.keys(g.attributes).length + 4;
check("vertex-buffers", [...gN.body, gN.cards[0]].every((g) => vb(g) <= 8), `vertex buffers: body ${gN.body.map(vb).join(" / ")}, cards ${vb(gN.cards[0])} (<= 8, WebGPU maxVertexBuffers)`);
const foot = gN.body.map((g) => { const p = g.attributes.position.array; let lo = Infinity; for (let i = 1; i < p.length; i += 3) lo = Math.min(lo, p[i]); return lo; });
check("foot", foot.every((y) => Math.abs(y - H.HEDGE_BOTTOM) < 1e-6), `every LOD's foot at ${foot.map((y) => y.toFixed(2)).join(" / ")} of the height (HEDGE_BOTTOM ${H.HEDGE_BOTTOM})`);

// ---- 3. budget on the data
const D = path.join(ROOT, "data/gardens"), mods = [];
for (const f of fs.readdirSync(D)) {
  if (!/^[A-Z]\d+\.json$/.test(f)) continue;
  for (const r of JSON.parse(fs.readFileSync(path.join(D, f), "utf8")).hedges || []) {
    const P = r.points; let L = 0; const S = [0];
    for (let k = 1; k < P.length; k++) { L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); S.push(L); }
    if (L < 0.3) continue;
    const m = Math.max(1, Math.round(L / H.HEDGE_MODULE));
    for (let i = 0; i < m; i++) {
      const s = (i + 0.5) * L / m; let k = 1; while (k < S.length - 1 && S[k] < s) k++;
      const t = (s - S[k - 1]) / ((S[k] - S[k - 1]) || 1);
      mods.push([P[k - 1][0] + (P[k][0] - P[k - 1][0]) * t, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * t]);
    }
  }
}
const CELL = 50, grid = new Map();
for (const q of mods) { const k = `${Math.floor(q[0] / CELL)},${Math.floor(q[1] / CELL)}`; (grid.get(k) || grid.set(k, []).get(k)).push(q); }
const cost = (d, bands, body, card) => (d < bands.hedge[0] ? body[0] : d < bands.hedge[1] ? body[1] : d < bands.hedge[2] ? body[2] : 0) + (d < bands.hedgecard[2] ? card : 0);
let worst = { n: 0, o: 0, at: "" }, worstO = { n: 0, o: 0, at: "" }, views = 0;
const R = Math.ceil(300 / CELL);
for (const [key] of grid) {
  const [gx, gz] = key.split(",").map(Number);
  for (let cx = gx * CELL; cx < (gx + 1) * CELL; cx += 25) for (let cz = gz * CELL; cz < (gz + 1) * CELL; cz += 25) {
    views++;
    let n = 0, o = 0;
    for (let i = gx - R; i <= gx + R; i++) for (let j = gz - R; j <= gz + R; j++) {
      const c = grid.get(`${i},${j}`); if (!c) continue;
      for (const q of c) { const d = Math.hypot(q[0] - cx, q[1] - cz); if (d > 300) continue; n += cost(d, H.HEDGE_BANDS, tN, cN); o += cost(d, OLD_BANDS, tO, cO); }
    }
    if (n > worst.n) worst = { n, o, at: `(${cx}, ${cz})` };
    if (o > worstO.o) worstO = { n, o, at: `(${cx}, ${cz})` };
  }
}
check("tris-budget", worst.n <= Math.max(worst.o, worstO.o) * 1.15, `${mods.length} modules, ${views} views; worst new view ${worst.at}: ${(worst.n / 1000).toFixed(1)}k tris (old there ${(worst.o / 1000).toFixed(1)}k); worst old view ${worstO.at}: ${(worstO.o / 1000).toFixed(1)}k (new ${(worstO.n / 1000).toFixed(1)}k); <= old x 1.15`);
const KIT = rd("viewer/gardens/gardenKit.js");
check("draws", gN.body.length === 3 && gN.cards.length === 1 && /"hedge", "hedgecard"\]/.test(KIT), `the kit's pools: ${gN.body.length} body + ${gN.cards.length} card LOD = ${gN.body.length + gN.cards.length} draws for the whole city (old ${gO.body.length + gO.cards.length})`);

// ---- 4. on the ground
const ground = (x, z) => 0.35 * Math.sin(x * 0.7) + 0.2 * Math.cos(z * 1.3) + 0.08 * Math.sin(x * 3.1 + z * 2.3);
const runs = [];
for (let k = 0; k < 40; k++) { const a = k * 0.37, pts = []; for (let i = 0; i < 12; i++) pts.push([k * 7 + Math.cos(a) * i * 0.8 + Math.sin(i) * 0.3, Math.sin(a) * i * 0.8]); runs.push({ points: pts, species: H.HEDGE_SPECIES[k % 5], height: 0.6 + (k % 7) * 0.25, width: 0.5 + (k % 3) * 0.1 }); }
const out = [];
const push = (arr, x0, y0, z0, dx, dy, dz, sy, w) => arr.push({ x0, y0, z0, dx, dy, dz, sy, w });
H.hedgeInstances(runs, ground, push, out);
let floating = 0, worstF = 0;
for (const q of out) {
  const lh = Math.hypot(q.dx, q.dz), nx = -q.dz / lh * q.w / 2, nz = q.dx / lh * q.w / 2;
  for (let k = 0; k <= 8; k++) {
    const f = 0.03 / lh + (1 - 0.06 / lh) * k / 8, x = q.x0 + q.dx * f, z = q.z0 + q.dz * f, footY = q.y0 + q.dy * f + H.HEDGE_BOTTOM * q.sy;
    const lo = Math.min(ground(x + nx, z + nz), ground(x - nx, z - nz), ground(x, z));
    const gap = footY - lo; if (gap > 0.02) { floating++; worstF = Math.max(worstF, gap); break; }
  }
}
check("on-ground", out.length > 200 && floating === 0, `${out.length} modules on a bumpy ground: ${floating} with the foot over the lower side (worst ${worstF.toFixed(3)} m)`);

// ---- 5. rules
const code = rd("viewer/gardens/gardenHedge.js");
check("rules", !/DynamicDrawUsage|setUsage\(THREE\.Dynamic/.test(code) && !/new THREE\.\w*Light\(/.test(code), "no DynamicDrawUsage, no light added (gardenHedge.js)");
check("switch", /hedges=old/.test(KIT) && /old\("hedges", "world"/.test(rd("viewer/features.js")) && H.HEDGE_TEX.every((p) => fs.existsSync(path.join(ROOT, p))), "?hedges=old in gardenKit.js + its features row; the baked surface textures exist");

if (!quiet || fails) {
  console.log("| check | result | detail |\n|---|---|---|");
  for (const r of rows) console.log(`| ${r.join(" | ")} |`);
}
console.log(fails ? `hedgeGate: ${fails} FAIL` : `hedgeGate: all ${rows.length} pass`);
process.exit(fails ? 1 : 0);
