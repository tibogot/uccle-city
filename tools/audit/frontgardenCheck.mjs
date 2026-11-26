// FRONT-GARDEN BOUNDARY BY CONTEXT (claude/reality1, 2026-11-26; rule frontgarden-by-context, class C4 of
// docs/REALITY_ROUND_2026-11-26.md). The garden kit drew every street's boundary from one mix (solid brick walls on pre-
// war rows, a house's wall round a school). tools/gardens/build_gardens.py now picks it by the house's family (its
// building type with the data/bldclass evidence, tools/gardens/faces.mjs). This keeps the mix where Street View put it:
//
//   node tools/audit/frontgardenCheck.mjs [--quiet]
//
// M  per family, metres of front by boundary (data/gardens/<T>.json gardens[].fam, styles): pre-war rows (fam prewar):
//    low plinth + railing (with or without a hedge behind) >= 55 %, solid walls (no hedge, wall > 0.65 m) <= 10 %;
//    post-war: hedges / low walls / modern railings, solid walls <= 10 %; the old data (data/gardens/fgold) printed beside
// I  every institution front (fam inst) not set by an OSM barrier is a steel bar fence: flat bars 1.35-1.65 m on a kerb
//    <= 0.2 m, posts; >= 1 per tile with an institution front
// S  the switch: ?frontgarden=old reads data/gardens/fgold (viewer/gardens/cityGardens.js and the retaining-wall reader
//    in viewer/tileData.js), the frozen data is complete (one file per tile)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const fail = (m) => { fails++; console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const cls = (st, r) => {
  if (r.kind === "open") return "open";
  if (st.fence === "bars") return "bars";
  if (st.kind === "rail") return st.wallH > 0.01 ? (st.hedge ? "plinth+rail+hedge" : "plinth+rail") : "rail";
  if (st.kind === "wall") return st.hedge ? "lowwall+hedge" : st.wallH > 0.65 ? "solid wall" : "low wall";
  return st.kind || "?";
};
function mix(dir) {
  const M = {};
  const files = readdirSync(join(ROOT, dir)).filter((f) => /^[A-O]\d+\.json$/.test(f));
  for (const f of files) {
    const g = json(`${dir}/${f}`);
    for (const r of g.gardens || []) {
      const fam = r.fam || "-", k = cls(g.styles[r.style] || {}, r);
      (M[fam] ??= { tot: 0 })[k] = (M[fam][k] || 0) + r.len; M[fam].tot += r.len;
    }
  }
  return { M, files: files.length };
}
const share = (m, ...ks) => (m ? ks.reduce((a, k) => a + (m[k] || 0), 0) / (m.tot || 1) : 0);
const pr = (m) => Object.entries(m).filter(([k]) => k !== "tot").sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((100 * v) / m.tot).toFixed(0)}%`).join(", ");

const now = mix("data/gardens"), old = existsSync(join(ROOT, "data/gardens/fgold")) ? mix("data/gardens/fgold") : null;
for (const [fam, m] of Object.entries(now.M)) say(`     M ${fam.padEnd(8)} ${(m.tot / 1000).toFixed(1)} km: ${pr(m)}`);
if (old) for (const [fam, m] of Object.entries(old.M)) say(`     M old ${fam.padEnd(4)} ${(m.tot / 1000).toFixed(1)} km: ${pr(m)}`);
const pw = now.M.prewar, po = now.M.postwar;
if (!pw || pw.tot < 1000) fail(`M no pre-war family fronts (${pw?.tot ?? 0} m): faces.mjs lost the types?`);
else {
  const rail = share(pw, "plinth+rail", "plinth+rail+hedge"), solid = share(pw, "solid wall");
  if (rail < 0.55) fail(`M pre-war rows: low plinth + railing ${(100 * rail).toFixed(0)} % (< 55 %)`);
  if (solid > 0.1) fail(`M pre-war rows: solid walls ${(100 * solid).toFixed(0)} % (> 10 %)`);
}
if (po && share(po, "solid wall") > 0.1) fail(`M post-war: solid walls ${(100 * share(po, "solid wall")).toFixed(0)} % (> 10 %)`);
console.log(`M pre-war rows: plinth + railing ${(100 * share(pw, "plinth+rail", "plinth+rail+hedge")).toFixed(0)} %, solid walls ${(100 * share(pw, "solid wall")).toFixed(0)} %; all fronts solid walls ${(100 * (Object.values(now.M).reduce((a, m) => a + (m["solid wall"] || 0), 0) / Object.values(now.M).reduce((a, m) => a + m.tot, 0))).toFixed(0)} %${old ? ` (old ${(100 * (Object.values(old.M).reduce((a, m) => a + (m["solid wall"] || 0), 0) / Object.values(old.M).reduce((a, m) => a + m.tot, 0))).toFixed(0)} %)` : ""}`);

// ---- I: institution fences
let inst = 0, bars = 0;
for (const f of readdirSync(join(ROOT, "data/gardens")).filter((f) => /^[A-O]\d+\.json$/.test(f))) {
  const g = json(`data/gardens/${f}`);
  for (const r of g.gardens || []) {
    if (r.fam !== "inst" || r.osm) continue;
    inst++;
    const st = g.styles[r.style] || {};
    if (st.fence !== "bars") { fail(`I ${f} ${r.bu}: an institution front drawn ${cls(st, r)}`); continue; }
    if (!(st.railH >= 1.35 && st.railH <= 1.65) || st.wallH > 0.2 || st.rail !== 1) fail(`I ${f} ${r.bu}: bar fence out of spec (rail ${st.rail} ${st.railH} on ${st.wallH})`);
    bars++;
  }
}
say(`ok   I ${bars} institution fronts with a bar fence`);
if (!inst) fail("I no institution front at all (faces.mjs lost the evidence?)");

// ---- S: the switch
if (!old || old.files !== now.files) fail(`S data/gardens/fgold: ${old?.files ?? 0} tiles for ${now.files}`);
const cg = readFileSync(join(ROOT, "viewer/gardens/cityGardens.js"), "utf8"), td = readFileSync(join(ROOT, "viewer/tileData.js"), "utf8");
if (!/FRONTGARDEN_OLD \? "\.\.\/\.\.\/data\/gardens\/fgold\/"/.test(cg)) fail("S viewer/gardens/cityGardens.js does not read fgold with ?frontgarden=old");
if (!/old === "fg" \? "fgold\/"/.test(td)) fail("S viewer/tileData.js gardenDoc does not read fgold with ?frontgarden=old");
console.log(fails ? `FRONTGARDEN: FAIL (${fails})` : `FRONTGARDEN: PASS (${inst} institution fronts fenced, pre-war rows plinth + railing)`);
process.exit(fails ? 1 : 0);
