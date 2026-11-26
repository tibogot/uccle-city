// INSTITUT MONTJOIE + CURATED LOOK SETS (claude/reality1, 2026-11-26; rule institution-not-balcony-block).
// Owner 2026-11-26: "around Montjoie, the Montjoie school buildings are not at all like this in real life". The school
// (Avenue Montjoie, OSM way 30996013, UrbIS solid 506834) is a late-19th-century neo-Gothic red-brick block with steep
// red clay-tile roofs and stepped gables, built straight on the sidewalk; the generator drew a white-render apartment
// block with continuous balcony slabs, a front-garden wall and a lawn for its playgrounds. This keeps the fix and its
// class:
//
//   node tools/audit/montjoieCheck.mjs [--quiet] [--census]
//
// A  the Montjoie entries (data/overrides.json): buildingLooks 506834 red brick (style 0), a type that draws no balcony
//    (never 4 BLOCK), a clay-tile roof colour (red over green x 2), set "montjoie"; grounds montjoie_court and
//    montjoie_west_yard on ?montjoie=old; plantsClear montjoie_front (set montjoie) covering the whole front line
//    (every metre of the facade edge inside the strip: no front-garden wall drawn along it)
// B  every buildingLooks / plantsClear / gardenRestyle entry with a `set` has that set wired to a switch: a look set in
//    viewer/tileData.js lookSet (v.set === "<set>"), a plantsClear set in viewer/main.js (a curated set nobody filters is
//    a look the ?<set>=old A/B cannot take away; a typo'd set silently never shows the old)
// C  (--census, information) the class: buildings the classifier draws as TYPE.BLOCK (balcony block) whose roof is
//    steep and pitched (>= 70 % of the roof's plan area at >= 35 deg): pre-1914 institutions / tall town houses wearing
//    post-war balconies. Printed per tile, the worst first: the list a later generator job starts from (no fail).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet"), CENSUS = process.argv.includes("--census");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const text = (p) => readFileSync(join(ROOT, p), "utf8");
let fails = 0;
const fail = (m) => { fails++; console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

const ov = json("data/overrides.json");
const looks = ov.buildingLooks || {}, grounds = ov.grounds || [], clear = ov.plantsClear || {};

// ---- A: the Montjoie entries
const L = looks["506834"];
if (!L) fail("A buildingLooks 506834 (Institut Montjoie): missing");
else {
  if (L.set !== "montjoie") fail(`A 506834: set ${L.set}, not montjoie (?montjoie=old)`);
  if (L.style !== 0) fail(`A 506834: style ${L.style}, not 0 (red face brick)`);
  if (L.type == null || L.type === 4) fail(`A 506834: type ${L.type}: must be set and never 4 (the balcony block)`);
  const rc = L.roofColor;
  if (!rc || !(rc[0] > 2 * rc[1])) fail(`A 506834: roofColor ${JSON.stringify(rc)} is not a red clay tile`);
  if (!/Street View/.test(L._name || "")) fail("A 506834: _name does not say what Street View showed");
}
for (const id of ["montjoie_court", "montjoie_west_yard"]) {
  const g = grounds.find((q) => q.id === id);
  if (!g) fail(`A ground ${id}: missing`);
  else if (g.switch !== "?montjoie=old") fail(`A ground ${id}: switch ${g.switch}`);
}
const strip = clear.montjoie_front;
if (!strip || strip.set !== "montjoie") fail("A plantsClear montjoie_front: missing or not in set montjoie");
else {
  const b = json("data/tiles/I2/buildings.json").buildings.find((q) => q.id.endsWith("/506834"));
  // the front edge: footprint ring points (1031.8, -1224.7) -> (1092.5, -1239.8), sampled every metre
  const ring = b?.footprint?.[0] || [];
  const near = (x, z) => ring.findIndex((p) => Math.hypot(p[0] - x, p[1] - z) < 0.3);
  const ia = near(1031.8, -1224.7), ib = near(1092.5, -1239.8);
  if (ia < 0 || ib < 0) fail("A 506834: the front edge's corners moved in the UrbIS footprint (re-read the strip)");
  else {
    const [ax, az] = ring[ia], [bx, bz] = ring[ib], n = Math.ceil(Math.hypot(bx - ax, bz - az));
    let out = 0;
    for (let k = 0; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; for (const d of [0.4, 1.5, 3.0]) if (!inRing(strip.ring, x + 0.241 * d, z + 0.970 * d)) out++; }
    if (out) fail(`A plantsClear montjoie_front: ${out} samples of the front's 3 m strip outside it`);
  }
}
say("ok   A Institut Montjoie: look, yards, front strip");

// ---- B: every curated set wired to a switch
const tileData = text("viewer/tileData.js"), main = text("viewer/main.js");
const lookSets = new Set(Object.values(looks).filter((v) => v && typeof v === "object" && v.set).map((v) => v.set));
for (const s of lookSets) if (!tileData.includes(`v.set === "${s}"`)) fail(`B buildingLooks set "${s}": no switch in viewer/tileData.js lookSet (v.set === "${s}")`);
const clearSets = new Set(Object.values(clear).filter((v) => v && typeof v === "object" && v.set).map((v) => v.set));
for (const s of clearSets) if (!main.includes(`v?.set === "${s}"`)) fail(`B plantsClear set "${s}": no switch in viewer/main.js`);
if (!/montjoie: params\.get\("montjoie"\) !== "old"/.test(main)) fail("B viewer/main.js: the tile entry has no montjoie switch");
say(`ok   B ${lookSets.size} look sets, ${clearSets.size} plantsClear sets wired`);

// ---- C: census of steep-roofed balcony blocks (the class)
if (CENSUS) {
  const { classify, TYPE } = await import(pathToFileURL(join(ROOT, "viewer/buildingTypes.js")).href);
  const manifest = json("data/tiles/manifest.json");
  const rows = [];
  let blocks = 0, steepBlocks = 0;
  for (const t of manifest.tiles) {
    let doc, buf;
    try { doc = json(`data/tiles/${t.name}/buildings.json`); buf = readFileSync(join(ROOT, `data/tiles/${t.name}/buildings.bin`)); } catch { continue; }
    const V = buf.readUInt32LE(0), T = buf.readUInt32LE(4);
    const P = new Float32Array(buf.buffer.slice(buf.byteOffset + 8, buf.byteOffset + 8 + 12 * V));
    const I = new Uint32Array(buf.buffer.slice(buf.byteOffset + 8 + 12 * V, buf.byteOffset + 8 + 12 * V + 12 * T));
    const cls = classify(doc, P, I, () => 0);
    doc.buildings.forEach((b, bi) => {
      if (cls.type[bi] !== TYPE.BLOCK) return;
      blocks++;
      let all = 0, steep = 0;
      for (let k = b.roof.first; k < b.roof.first + b.roof.count; k++) {
        const ia = I[k * 3] * 3, ib = I[k * 3 + 1] * 3, ic = I[k * 3 + 2] * 3;
        const ux = P[ib] - P[ia], uy = P[ib + 1] - P[ia + 1], uz = P[ib + 2] - P[ia + 2], vx = P[ic] - P[ia], vy = P[ic + 1] - P[ia + 1], vz = P[ic + 2] - P[ia + 2];
        const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, Ln = Math.hypot(cx, cy, cz);
        if (Ln < 1e-9) continue;
        const ar = Math.abs(cy) / 2; all += ar;
        if (Math.abs(cy) / Ln < Math.cos((35 * Math.PI) / 180)) steep += ar;
      }
      if (all > 0 && steep / all >= 0.7) { steepBlocks++; rows.push({ tile: t.name, id: b.id.split("/").pop(), h: +(b.top - b.base).toFixed(1), steep: +(steep / all).toFixed(2), curated: !!looks[b.id.split("/").pop()] }); }
    });
  }
  rows.sort((a, b) => b.h - a.h);
  console.log(`C census: ${blocks} buildings drawn as the balcony block (TYPE.BLOCK), ${steepBlocks} of them under a steep pitched roof (>= 70 % of the roof at >= 35 deg); curated already: ${rows.filter((r) => r.curated).length}`);
  for (const r of rows.slice(0, 25)) console.log(`     ${r.tile} ${r.id} h ${r.h} m steep ${r.steep}${r.curated ? " (curated)" : ""}`);
}

console.log(fails ? `MONTJOIE: FAIL (${fails})` : "MONTJOIE: PASS (Institut Montjoie's look, yards and front strip; every curated set wired to its switch)");
process.exit(fails ? 1 : 0);
