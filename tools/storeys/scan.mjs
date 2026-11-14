// STOREYS SCAN (docs/STOREYS.md; owner 2026-11-14: "a lot of houses only have windows at the floor level, some are very
// empty at the first or second floor"). Every tile built in node as the tile worker does (tools/roadfix/tile.mjs), the
// wall faces exactly as viewer/facadeGeom.js analyseBuildings lays them out (the kit spy sees every face), and per
// window-bearing face (not a landmark, not a whole party wall, >= 1.6 m wide, eaves >= 2.8 m):
//   rowsRaw  window rows the FIXED storeys draw under the BUILDING's eaves (its lowest roof point) over the raw base
//            (the lowest DTM point): before the ground fit (?groundfit=old&storeys=old)
//   rowsFix  the same over the ground-fit line (today, ?storeys=old)
//   rowsFace the FIXED storeys under the FACE's own eaves (its top edge's lowest point) over the ground-fit line
//   rowsFit  the FITTED storeys under the face's own eaves (this branch)
//   n        the storeys that fit the face's real height (storeyFit n of the face's own eaves)
//   plinth   the drawn ground's lowest point 0.35 m in front of the face under the ground-floor line (m; the downhill
//            plinth the ground fit leaves)
//   node --import ./tools/road_audit/register.mjs tools/storeys/scan.mjs [TILES...] [--out file.json]
import { writeFileSync } from "node:fs";
import { buildTile, tiles } from "../roadfix/tile.mjs";
import { analyseBuildings } from "../../viewer/facadeGeom.js";
import { faceOpenings, storeyFit } from "../../viewer/interior/facadeWindows.js";
import { drawnGround } from "../../viewer/groundFit.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../roadfix/tile.mjs";

const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const out = oi >= 0 ? args[oi + 1] : null;
const names = args.filter((a, i) => !a.startsWith("--") && (oi < 0 || i !== oi + 1));
const todo = names.length ? names : tiles.map((t) => t.name);
const rowsOf = (f, eaves, fit) => new Set(faceOpenings({ ...f, eaves: Math.fround(eaves), partyH: 0, shop: 0, fit }).map((o) => o.floor)).size;

const T0 = Date.now(), all = [];
const H = (m) => { const o = {}; return { add(k) { o[k] = (o[k] || 0) + 1; }, o }; };
for (const T of todo) {
  const t0 = Date.now();
  const d = await buildTile(T, { keepNet: true });
  const e = tiles.find((t) => t.name === T);
  const pathOf = (f) => join(ROOT, "data/tiles", f.split("?")[0]);
  const bDoc = JSON.parse(readFileSync(pathOf(e.files.buildings), "utf8")), bb = readFileSync(pathOf(e.files.buildingsBin));
  const bBuf = bb.buffer.slice(bb.byteOffset, bb.byteOffset + bb.byteLength);
  const G = drawnGround(d.hm, d.road.parts);
  const faces = [];
  const spy = { face(f) { faces.push(f); return { on: 0 }; }, finish: () => null };
  analyseBuildings(bDoc, bBuf, d.roads, d.feats, { kit: spy, ground: G });
  const { bounds } = d;
  let n0 = 0;
  for (const f of faces) {
    const b = f.building;
    if (f.landmark || f.partyH >= 999 || f.width < 1.6 || f.eaves < 2.8) continue;
    const eB = f.eavesBld;
    const c = b.footprint[0].reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]).map((v) => v / b.footprint[0].length);
    if (c[0] < bounds.x0 || c[0] >= bounds.x1 || c[1] < bounds.z0 || c[1] >= bounds.z1) continue;
    const ff = { width: f.width, street: f.street, rnd: Math.fround(f.rnd), landmark: false };
    const eRaw = eB + (f.base - b.base);
    const rowsRaw = eRaw < 2.8 ? 0 : rowsOf(ff, eRaw, false), rowsFix = eB < 2.8 ? 0 : rowsOf(ff, eB, false);
    const rowsFace = rowsOf(ff, f.eaves, false), rowsFit = rowsOf(ff, f.eaves, true);
    const sf = storeyFit(f.eaves);
    // the downhill plinth: lowest drawn ground in front of the face (not under another building) below the line
    let dd = 0, k = 0;
    for (const { p } of f.tris) for (const q of p) { dd += q[0] * f.nx + q[2] * f.nz; k++; }
    dd = dd / k + 0.35;
    let lo = Infinity;
    for (let u = 0.3; u <= f.width - 0.3; u += 0.6) { const g = G(f.tx * (f.u0 + u) + f.nx * dd, f.tz * (f.u0 + u) + f.nz * dd); if (Number.isFinite(g)) lo = Math.min(lo, g); }
    all.push({ tile: T, key: f.key, street: f.street, kit: 0, w: +f.width.toFixed(2), eaves: +f.eaves.toFixed(2), eavesBld: +eB.toFixed(2), lift: +(f.base - b.base).toFixed(2),
      rowsRaw, rowsFix, rowsFace, rowsFit, n: sf.n, k: sf.k, plinth: Number.isFinite(lo) ? +(f.base - lo).toFixed(2) : null,
      at: [+(f.tx * (f.u0 + f.width / 2) + f.nx * dd).toFixed(1), +(f.tz * (f.u0 + f.width / 2) + f.nz * dd).toFixed(1)] });
    n0++;
  }
  console.log(`${T} ${Date.now() - t0} ms: ${n0} faces`);
}
const S = (r) => r.street;
const cnt = (f, set = all) => set.filter(f).length;
const st = all.filter(S);
const rep = (set, label) => {
  const o = {
    label, faces: set.length,
    todayBelowN: cnt((r) => r.rowsFix < r.n, set),
    lostToGroundfit: cnt((r) => r.rowsFix < r.rowsRaw, set),
    lostToBuildingEaves: cnt((r) => r.rowsFix < r.rowsFace, set),
    lostToFixedRule: cnt((r) => r.rowsFace < r.n, set),
    todayGroundOnly: cnt((r) => r.rowsFix <= 1 && r.n >= 2, set),
    beforeGroundOnly: cnt((r) => r.rowsRaw <= 1 && r.n >= 2, set),
    fitGroundOnly: cnt((r) => r.rowsFit <= 1 && r.n >= 2, set),
    fitBelowN: cnt((r) => r.rowsFit < r.n, set),
    rowsRawSum: set.reduce((a, r) => a + r.rowsRaw, 0), rowsFixSum: set.reduce((a, r) => a + r.rowsFix, 0), rowsFaceSum: set.reduce((a, r) => a + r.rowsFace, 0),
    rowsFitSum: set.reduce((a, r) => a + r.rowsFit, 0), nSum: set.reduce((a, r) => a + r.n, 0),
    plinth12: cnt((r) => r.plinth > 1.2, set), plinth22: cnt((r) => r.plinth > 2.2, set),
    kClampHi: cnt((r) => r.k >= 1.2, set), kClampLo: cnt((r) => r.k <= 0.87, set),
  };
  const hist = {};
  for (const r of set) { const k = `${r.rowsFix}->${r.rowsFit}`; hist[k] = (hist[k] || 0) + 1; }
  o.fixToFit = Object.fromEntries(Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 14));
  const hr = {};
  for (const r of set) { const k = `${r.rowsRaw}->${r.rowsFix}`; hr[k] = (hr[k] || 0) + 1; }
  o.rawToFix = Object.fromEntries(Object.entries(hr).sort((a, b) => b[1] - a[1]).slice(0, 10));
  return o;
};
const R = { street: rep(st, "street faces"), allFaces: rep(all, "all window faces") };
console.log(JSON.stringify(R, null, 1));
console.log(`${((Date.now() - T0) / 1000).toFixed(0)} s`);
if (out) writeFileSync(out, JSON.stringify({ R, rows: all }));
