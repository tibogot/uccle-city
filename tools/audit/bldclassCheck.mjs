// BUILDING-CLASS EVIDENCE (claude/reality1, 2026-11-26; rule bldclass-evidence, class C1 of
// docs/REALITY_ROUND_2026-11-26.md). The classifier drew 1,856 solids as the post-war balcony block, 194 under steep
// pitched roofs (Institut Montjoie: a neo-Gothic school with balconies). viewer/buildingTypes.js classify now reads open-
// data evidence (data/bldclass/<T>.json, tools/bldclass/build_evidence.py) before its period draw. This keeps it so:
//
//   node tools/audit/bldclassCheck.mjs [--quiet] [--list N] [--json out.json]
//
// A  every tile has its evidence file; every entry names a source (inv: / osm:)
// B  census, old (form only) vs new (evidence): balcony blocks under a steep pitched roof (>= 70 % of the roof at >= 35
//    deg, over its BU_ID group as classify sees it) on a ROW front or a small block (< 350 m2) must be 0 unless dated post-
//    war (a big free-standing block under a steep roof keeps the draw: 1970s-90s residences have balconies and dormers);
//    nothing dated pre-1946 and no institution drawn as the balcony block
// F  fixtures (Street View 2026-11-26, look only): Institut Montjoie (506834) is not a balcony block and wears brick; the
//    five real post-war balcony blocks below stay balcony blocks
// L  (--list N) the changed buildings, ranked (tallest first), with old -> new type and why; --json writes them all
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
let fails = 0;
const fail = (m) => { fails++; console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };
const { classify, applyBuildingEvidence, TYPE, TYPE_NAMES, STEEP_COS, STEEP_SHARE } = await import(pathToFileURL(join(ROOT, "viewer/buildingTypes.js")).href);

// the five real post-war balcony blocks (Street View 2026-11-26, look only): long balcony slabs on every floor
export const TRUE_BLOCKS = JSON.parse(readFileSync(join(ROOT, "data/bldclass/fixtures.json"), "utf8")).trueBlocks;

const manifest = json("data/tiles/manifest.json");
const rows = [];
const cen = { old: { block: 0, steep: 0 }, new: { block: 0, steep: 0, steepPost: 0, inst: 0 } };
const typeOf = new Map();
let missing = 0;
for (const t of manifest.tiles) {
  if (!existsSync(join(ROOT, `data/tiles/${t.name}/buildings.json`))) continue;
  if (!existsSync(join(ROOT, `data/bldclass/${t.name}.json`))) { missing++; continue; }
  const ev = json(`data/bldclass/${t.name}.json`);
  for (const [k, e] of Object.entries(ev.solids)) if (!(e.src || []).length && !e.near) fail(`A ${t.name} ${k}: evidence without a source`);
  const buf = readFileSync(join(ROOT, `data/tiles/${t.name}/buildings.bin`));
  const V = buf.readUInt32LE(0), T = buf.readUInt32LE(4);
  const P = new Float32Array(buf.buffer.slice(buf.byteOffset + 8, buf.byteOffset + 8 + 12 * V));
  const I = new Uint32Array(buf.buffer.slice(buf.byteOffset + 8 + 12 * V, buf.byteOffset + 8 + 12 * V + 12 * T));
  const docOld = json(`data/tiles/${t.name}/buildings.json`);
  const docNew = applyBuildingEvidence(json(`data/tiles/${t.name}/buildings.json`), ev);
  const a = classify(docOld, P, I, () => 0), b = classify(docNew, P, I, () => 0);
  docNew.buildings.forEach((bd, bi) => {
    let all = 0, st = 0;
    for (let k = bd.roof.first; k < bd.roof.first + bd.roof.count; k++) {
      const ia = I[k * 3] * 3, ib = I[k * 3 + 1] * 3, ic = I[k * 3 + 2] * 3;
      const ux = P[ib] - P[ia], uy = P[ib + 1] - P[ia + 1], uz = P[ib + 2] - P[ia + 2], vx = P[ic] - P[ia], vy = P[ic + 1] - P[ia + 1], vz = P[ic + 2] - P[ia + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, Ln = Math.hypot(cx, cy, cz);
      if (Ln < 1e-9) continue;
      all += Math.abs(cy) / 2; if (Math.abs(cy) / Ln < STEEP_COS) st += Math.abs(cy) / 2;
    }
    const steep = b.steep[bi] >= STEEP_SHARE, e = bd.attrs?._ev, id = bd.id.split("/").pop();
    typeOf.set(id, { t: b.type[bi], s: b.style[bi], tile: t.name });
    if (a.type[bi] === TYPE.BLOCK) { cen.old.block++; if (steep) cen.old.steep++; }
    if (b.type[bi] === TYPE.BLOCK) {
      cen.new.block++;
      if (steep) { cen.new.steep++; if (e?.era === "post") cen.new.steepPost++; else if (b.row[bi]) fail(`B ${t.name} ${id}: a balcony block on a row front / small block under a steep pitched roof with no post-war date`); else cen.new.steepBig = (cen.new.steepBig || 0) + 1; if (e?.era === "pre" || e?.era === "inter") fail(`B ${t.name} ${id}: dated ${e.era} yet a balcony block`); }
      if (e?.inst) { cen.new.inst++; fail(`B ${t.name} ${id}: an institution (${e.inst}) drawn as the balcony block`); }
    }
    if (a.type[bi] !== b.type[bi] || Math.round(a.style[bi]) !== Math.round(b.style[bi])) {
      const r = bd.footprint[0]; let cx = 0, cz = 0; for (const q of r) { cx += q[0]; cz += q[1]; }
      rows.push({ tile: t.name, id, x: +(cx / r.length).toFixed(1), z: +(cz / r.length).toFixed(1), h: +(bd.top - bd.base).toFixed(1), from: TYPE_NAMES[a.type[bi]], to: TYPE_NAMES[b.type[bi]], style: [Math.round(a.style[bi]), Math.round(b.style[bi])], why: e ? [e.inst, e.era, e.year, e.near && `near ${e.near}`].filter(Boolean).join(" ") || "evidence" : steep ? "steep pitched roof" : "-", src: e?.src || [] });
    }
  });
}
if (missing) fail(`A ${missing} tiles without data/bldclass/<T>.json (run python tools/bldclass/build_evidence.py)`);
say(`ok   A evidence files`);
console.log(`B census: balcony blocks ${cen.old.block} -> ${cen.new.block}; under a steep pitched roof ${cen.old.steep} -> ${cen.new.steep} (${cen.new.steepPost} dated post-war, ${cen.new.steepBig || 0} big free-standing blocks left to the draw); institutions as balcony blocks ${cen.new.inst}; ${rows.length} buildings changed type or wall`);

// ---- F: fixtures
const mj = typeOf.get("506834");
if (!mj) fail("F Institut Montjoie 506834: not found");
else if (mj.t === TYPE.BLOCK || ![0, 1, 2].includes(Math.round(mj.s))) fail(`F Institut Montjoie 506834: drawn ${TYPE_NAMES[mj.t]} style ${mj.s} (want an old type in face brick)`);
for (const f of TRUE_BLOCKS) {
  const q = typeOf.get(f.id);
  if (!q) fail(`F true balcony block ${f.id} (${f.name}): not found`);
  else if (q.t !== TYPE.BLOCK) fail(`F true balcony block ${f.id} (${f.name}): drawn ${TYPE_NAMES[q.t]}, Street View shows balcony slabs`);
}
say(`ok   F Montjoie + ${TRUE_BLOCKS.length} true balcony blocks`);

rows.sort((a, b) => b.h - a.h);
const N = +(arg("--list") || 0);
for (const r of rows.slice(0, N)) console.log(`     ${r.tile} ${r.id} (${r.x}, ${r.z}) h ${r.h}: ${r.from} -> ${r.to} style ${r.style.join("->")} (${r.why}) ${r.src.join(" ")}`);
if (arg("--json")) writeFileSync(arg("--json"), JSON.stringify({ census: cen, changed: rows }, null, 1));
console.log(fails ? `BLDCLASS: FAIL (${fails})` : `BLDCLASS: PASS (steep-roofed balcony blocks ${cen.old.steep} -> ${cen.new.steep}, Montjoie + ${TRUE_BLOCKS.length} true blocks right)`);
process.exit(fails ? 1 : 0);
