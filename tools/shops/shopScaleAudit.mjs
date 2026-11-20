// THE SHOP WINDOW SCALE AUDIT (docs/SHOPS_V2_PLAN.md job 1): runs the street-life layout (viewer/streetlife/layout.js,
// shops on, as the worker does) over every data/streetlife/<T>.json in Node and lists every interior-mapped shop
// window: its glass width / height, the interior type, the stretch of the 6 m render (old: RW / w, new: shopScale.js),
// the rooms and partitions (new), the depth, and how many windows share one room image (by type, and same-type
// neighbours within 12 m: twins side by side). Pure CPU, no browser (~10-20 s for the 121 tiles).
//
//   node tools/shops/shopScaleAudit.mjs [--json out.json] [--quiet]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { layoutTile, WIN_STRIDE } from "../../viewer/streetlife/layout.js";
import { RW, DEPTH_BY_INDEX, TYPES, OLD_DEPTH, roomLayout, acrossScale } from "../../viewer/shops/shopScale.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
/** the label measure stands in for the worker's canvas one: the layout only needs a size back */
const measure = (lines) => ({ w: 64 * Math.max(...lines.map((l) => String(l).length), 1), h: 48 * lines.length, px: 32 });

export function auditWindows() {
  const terraces = JSON.parse(readFileSync(join(ROOT, "data/shops/terraces.json"), "utf8")).terraces || {};
  const dir = join(ROOT, "data/streetlife");
  const out = [];
  for (const f of readdirSync(dir).filter((n) => /^[A-Z]\d+\.json$/.test(n)).sort()) {
    const tile = f.slice(0, -5);
    const doc = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const L = layoutTile(doc, measure, null, { shops: true, terraces });
    for (const m of L.windows) {
      if (m.length !== WIN_STRIDE) throw new Error(`${tile}: window record of ${m.length} floats`);
      const w = m[16], h = m[17], seed = m[18], type = Math.round(m[20]), gb = m[21];
      const R = roomLayout(w, seed);
      out.push({ tile, x: m[12], y: m[13], z: m[14], nx: m[8], nz: m[10], w, h, seed, lit: m[19], type, typeName: TYPES[type], gb, mirror: m[22],
        stretchOld: acrossScale(w, true), stretch: acrossScale(w), rooms: R.rooms, roomW: R.roomW, offset: R.o, partitions: R.partitions,
        depthOld: OLD_DEPTH, depth: DEPTH_BY_INDEX[type] });
    }
  }
  // same-type neighbours: windows of the same room image within 12 m of each other, facing the same way
  for (const a of out) {
    a.twins = 0;
    for (const b of out) if (b !== a && b.type === a.type && (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < 144 && a.nx * b.nx + a.nz * b.nz > 0.7) a.twins++;
  }
  return out;
}

const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const f2 = (v) => v.toFixed(2);

export function summary(W) {
  const ws = W.map((a) => a.w), so = W.map((a) => a.stretchOld);
  const byType = TYPES.map((t, i) => {
    const g = W.filter((a) => a.type === i);
    return { type: t, n: g.length, wMed: g.length ? q(g.map((a) => a.w), 0.5) : 0, depth: DEPTH_BY_INDEX[i], twins: g.filter((a) => a.twins > 0).length };
  });
  const bins = [[0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 10]].map(([a, b]) => ({ from: a, to: b, n: W.filter((x) => x.w >= a && x.w < b).length }));
  return {
    windows: W.length, tiles: new Set(W.map((a) => a.tile)).size,
    width: { min: Math.min(...ws), p10: q(ws, 0.1), median: q(ws, 0.5), p90: q(ws, 0.9), max: Math.max(...ws) }, bins,
    stretchOld: { min: Math.min(...so), median: q(so, 0.5), max: Math.max(...so), within10: W.filter((a) => Math.abs(a.stretchOld - 1) <= 0.1).length },
    stretchNew: { within10: W.filter((a) => Math.abs(a.stretch - 1) <= 0.1).length },
    wide: W.filter((a) => a.rooms > 1).length, byType,
    twinWindows: W.filter((a) => a.twins > 0).length,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const t0 = performance.now();
  const W = auditWindows(), S = summary(W);
  const quiet = process.argv.includes("--quiet");
  const ji = process.argv.indexOf("--json");
  if (ji > 0) writeFileSync(process.argv[ji + 1], JSON.stringify({ summary: S, windows: W }, null, 1));
  console.log(`shop windows: ${S.windows} in ${S.tiles} tiles (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  console.log(`glass width (m): min ${f2(S.width.min)}  p10 ${f2(S.width.p10)}  median ${f2(S.width.median)}  p90 ${f2(S.width.p90)}  max ${f2(S.width.max)}`);
  console.log(`  ${S.bins.map((b) => `${b.from}-${b.to} m: ${b.n}`).join("  ")}`);
  console.log(`old stretch of the ${RW} m render across the glass (render m per glass m = ${RW} / w): min ${f2(S.stretchOld.min)}  median ${f2(S.stretchOld.median)}  max ${f2(S.stretchOld.max)}; within +-10 % of metric: ${S.stretchOld.within10} of ${S.windows}`);
  console.log(`new (shopScale.js): within +-10 % of metric: ${S.stretchNew.within10} of ${S.windows}; wider than STRETCH_MAX x the room (rooms + a partition): ${S.wide}`);
  console.log(`type        windows  median w  depth (old ${OLD_DEPTH})  with a same-type twin within 12 m`);
  for (const t of S.byType) console.log(`  ${t.type.padEnd(10)} ${String(t.n).padStart(6)}  ${f2(t.wMed).padStart(8)}  ${f2(t.depth).padStart(5)}  ${String(t.twins).padStart(6)}`);
  console.log(`windows sharing a room image with a same-type neighbour within 12 m: ${S.twinWindows}`);
  if (!quiet) {
    console.log("widest / narrowest:");
    for (const a of [...W].sort((a, b) => b.w - a.w).slice(0, 4).concat([...W].sort((a, b) => a.w - b.w).slice(0, 4)))
      console.log(`  ${a.tile} (${a.x.toFixed(0)}, ${a.z.toFixed(0)}) ${a.typeName} w ${f2(a.w)} old x${f2(a.stretchOld)} rooms ${a.rooms} offset ${f2(a.offset)}${a.partitions.length ? ` partition at ${a.partitions.map(f2).join(", ")} m` : ""}`);
  }
}
