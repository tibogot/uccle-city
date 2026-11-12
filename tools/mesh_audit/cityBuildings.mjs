// THE PROCEDURAL CITY BUILDINGS THROUGH THE MESH CHECKER, in Node (docs/CITY_MESH_AUDIT.md, docs/fixes1/README.md).
// Runs the tile worker's own façade analysis (viewer/facadeGeom.js analyseBuildings) on a tile's committed data and
// audits what the city draws, in the mesh groups that stand together:
//   walls+roofs, details+walls, details+roofs (details = cornices, gutters, eaves, chimneys, shop fascias, buttresses)
//   node tools/mesh_audit/cityBuildings.mjs I6 H5 [--max 200] [--json out.json] [--group walls+roofs,details+walls]
// Prints per tile and group: triangles, blocking, and the z-fight / shading counts. Exit 0 always (report).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyseBuildings } from "../../viewer/facadeGeom.js";
import { auditParts } from "./audit.js";

const STJOB = "https://databrussels.be/id/building/1587133";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const tiles = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const maxD = +opt("--max", 200);
const want = (opt("--group", "walls+roofs,details+walls,details+roofs")).split(",");
const out = {};
for (const t of tiles.length ? tiles : ["I6"]) {
  const dir = path.join(ROOT, "data/tiles", t);
  const doc = JSON.parse(fs.readFileSync(path.join(dir, "buildings.json"), "utf8"));
  const b = fs.readFileSync(path.join(dir, "buildings.bin"));
  const buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const roads = JSON.parse(fs.readFileSync(path.join(dir, "roads.json"), "utf8"));
  const feats = JSON.parse(fs.readFileSync(path.join(dir, "features.json"), "utf8"));
  // as the city draws it by default: the Saint-Job church is the hero model (main.js HIDE_BU_IDS); --all keeps it
  if (!args.includes("--all")) doc.buildings = doc.buildings.filter((b) => b.attrs?.BU_ID !== STJOB);
  const t0 = Date.now();
  const a = analyseBuildings(doc, buf, roads, feats);
  const part = (name, g) => ({ name, slot: "", positions: g.position, normals: g.normal, index: null, maxDistance: maxD });
  const P = { walls: part("walls", a.walls), roofs: part("roofs", a.roofs), details: part("details", a.details) };
  out[t] = { analyseMs: Date.now() - t0, stats: a.stats, groups: {} };
  for (const g of want) {
    const parts = g.split("+").map((k) => P[k]);
    const r = auditParts(parts, { maxItemsPerCheck: +opt("--items", 400), debugTris: args.includes("--debug") ? 1 : 0 });
    const c = r.summary.counts || r.summary.byCheck || {};
    out[t].groups[g] = { tris: parts.reduce((s, p) => s + p.positions.length / 9, 0), blocking: r.summary.blocking, counts: c, items: opt("--json") ? r.items : undefined };
    console.log(`${t} ${g.padEnd(15)} tris ${String(out[t].groups[g].tris).padStart(7)} blocking ${String(r.summary.blocking).padStart(6)}  ` +
      Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", "));
  }
}
if (opt("--json")) fs.writeFileSync(opt("--json"), JSON.stringify(out));
