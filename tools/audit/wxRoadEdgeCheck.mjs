// THE WEATHER'S ROAD EDGE (claude/xmascheck, rule wx-road-edge): gate row `wxroadedge`. Node only.
// The asphalt shader (viewer/roadPaint.js buildAsphalt) keeps snow / slush / puddles at the road's "edge". That edge
// must be the carriageway's GUTTER (the drain coordinate aPiece.y: -1..1 across the carriageway, 0 at the crown), never
// a lane boundary: with aLateral (-1..1 across EACH lane) every lane line in the middle of a two-lane street kept a
// snow band that stopped dead at the junction pads and fanned into wedges where lanes diverge (Place Saint-Job, snow
// day 15-26 Dec, 2026-11-27).
//   node --import ./tools/road_audit/register.mjs tools/audit/wxRoadEdgeCheck.mjs [--quiet] [--old] [--tiles I6,E4]
//   --old: evaluate the old formula (aLateral): the row must FAIL (the mutation test)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), OLD = process.argv.includes("--old");
const ti = process.argv.indexOf("--tiles");
const TILES = ti > 0 ? process.argv[ti + 1].split(",") : ["I6", "E4", "D3"];   // Saint-Job, Saint-Pierre / Alsemberg, the town hall
let fails = 0;
const out = (ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };

// ---- the shader: which attribute its weather edge reads (the same expression the check evaluates below)
const src = fs.readFileSync(path.join(ROOT, "viewer/roadPaint.js"), "utf8");
const line = src.split("\n").find((l) => /const edge = smoothstep\(float\(0\.7\), float\(1\.0\), abs\(/.test(l) && /wxMat|saltMask/.test(l)) ?? "";
const usesDrain = /abs\(WX_EDGE_OLD \? lat : piece\.y\)/.test(line) || /abs\(piece\.y\)/.test(line);
out(usesDrain, `shader: the asphalt's weather edge reads the drain aPiece.y (the gutter), ?wxedge=old = aLateral (line: ${line.trim().slice(0, 110)})`);
out(/get\("wxedge"\) === "old"/.test(src), "shader: ?wxedge=old switch (the A/B) read once at module load");
const feats = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
out(/old\("wxedge"/.test(feats), "features.js: the wxedge row (the dev panel's A/B)");

// ---- the data: every tile's asphalt, the edge as the shader computes it
const { loadTile } = await import("../road_audit/tile.mjs");
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const useLat = OLD || !usesDrain;
for (const T of TILES) {
  const A = loadTile(T).rd.parts.asphalt;
  const lat = A.attributes.aLateral.array, pc = A.attributes.aPiece.array, ps = A.attributes.aPiece.itemSize;
  let laneLines = 0, midBand = 0, gutters = 0, gutterBand = 0;
  for (let i = 0; i < lat.length; i++) {
    const l = Math.abs(lat[i]), d = Math.abs(pc[i * ps + 1]);
    const edge = ss(0.7, 1.0, useLat ? l : d);
    if (l > 0.85 && d < 0.6) { laneLines++; if (edge > 0.05) midBand++; }   // a lane line in the middle of the carriageway
    if (d > 0.95) { gutters++; if (edge > 0.8) gutterBand++; }              // the gutter (by the kerb)
  }
  out(laneLines > 0 && midBand === 0, `${T}: no snow / slush band on the ${laneLines} mid-carriageway lane-line vertices (|aLateral| > 0.85, |drain| < 0.6): ${midBand} in the band${useLat ? " (OLD formula)" : ""}`);
  out(gutters > 0 && gutterBand / gutters > 0.95, `${T}: the band is in the gutter: ${gutterBand} / ${gutters} vertices with |drain| > 0.95 get edge > 0.8`);
}
if (fails) { console.log(`wxRoadEdgeCheck: ${fails} FAIL`); process.exit(1); }
console.log("wxRoadEdgeCheck: PASS");
