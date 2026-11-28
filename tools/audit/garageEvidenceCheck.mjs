// GARAGE EVIDENCE (claude/facades5, rule garage-needs-drive; gate row `garageev`). A garage door the facade paints
// (tools/gardens/faces.mjs garageAt = viewer/buildingTypes.js classify garage + facadeWindows.js faceOpenings) needs a car
// way in front of its building: data/bldclass/<T>.json `drive` on one of the BU group's solids (tools/bldclass/
// build_evidence.py: an UrbIS Topo CR42L driveway line, an UrbIS ramp surface, an OSM service road within 35 m in front
// of a free footprint edge, nearer that solid than any other).
//   E  garage doors whose building has no drive evidence (must be 0)
//   N  garage doors city-wide (--max N=..: the ceiling; ?garageev=old = GARAGE_EV=old drew 6,621 and fails it)
//   D  solids with drive evidence (a floor: the evidence file was built with the drives, >= 9,000)
//   F  fixtures (Street View, look only, 2026-11-28): Av. Arnold Delvaux 36 (solid group 1585281) has a real double garage
//      on a paved drive: keeps its door; Rue de l'Equateur 13 (1727653), a row house on the sidewalk line: none
//   node tools/audit/garageEvidenceCheck.mjs [--old] [--quiet] [--max N=3900]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const OLD = argv.includes("--old"), QUIET = argv.includes("--quiet");
const mi = argv.indexOf("--max");
const MAX = Object.fromEntries((mi >= 0 ? argv[mi + 1] : "").split(",").filter(Boolean).map((kv) => kv.split("=")).map(([k, v]) => [k, +v]));
if (OLD) process.env.GARAGE_EV = "old";
const { tileFaces } = await import(pathToFileURL(path.join(ROOT, "tools/gardens/faces.mjs")).href);

const FIX = [{ bu: "1585281", garage: true, what: "Av. Arnold Delvaux 36 (a real double garage)" }, { bu: "1727653", garage: false, what: "Rue de l'Equateur 13 (no garage)" }];
const tiles = fs.readdirSync(path.join(ROOT, "data/tiles")).filter((t) => /^[A-Z]\d+$/.test(t) && fs.existsSync(path.join(ROOT, "data/tiles", t, "buildings.bin"))).sort();
let N = 0, D = 0;
const E = [], gar = new Set();
for (const T of tiles) {
  const evf = path.join(ROOT, "data/bldclass", `${T}.json`);
  const ev = fs.existsSync(evf) ? JSON.parse(fs.readFileSync(evf, "utf8")).solids : {};
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, "data/tiles", T, "buildings.json"), "utf8"));
  const drv = new Set();                                   // BU groups with a drive on any solid
  for (const b of doc.buildings) { const e = ev[String(b.id).split("/").pop()]; if (e?.drive) { D++; drv.add(String(b.attrs?.BU_ID ?? b.id)); } }
  const F = tileFaces(T), faces = F.faces || F;
  for (const f of faces) {
    if (!f.garageAt) continue;
    N++; gar.add(f.bu.split("/").pop());
    if (!drv.has(f.bu)) E.push({ T, bu: f.bu.split("/").pop(), at: `${f.garageAt.x},${f.garageAt.z}` });
  }
}
const fixBad = FIX.filter((q) => gar.has(q.bu) !== q.garage).map((q) => `${q.what}: garage ${gar.has(q.bu)}`);
if (!QUIET) for (const e of E.slice(0, 12)) console.log(`  no evidence: ${e.T} bu ${e.bu} ?at=${e.at}`);
const bad = [];
if (E.length) bad.push(`E ${E.length} garage doors without a car way in front`);
if (MAX.N !== undefined && N > MAX.N) bad.push(`N ${N} > ${MAX.N}`);
if (!OLD && D < 9000) bad.push(`D ${D} < 9000 solids with drive evidence (data/bldclass built without the drives?)`);
if (!OLD) bad.push(...fixBad);
console.log(`${bad.length ? "FAIL" : "PASS"} garageev: ${tiles.length} tiles, N ${N} garage doors, E ${E.length} without evidence, D ${D} solids with a car way, fixtures ${FIX.length - fixBad.length}/${FIX.length}${bad.length ? ": " + bad.join("; ") : ""}`);
process.exit(bad.length ? 1 : 0);
