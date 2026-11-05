// Candidate terraced houses for the interior pilot: single-solid UrbIS buildings near Place de Saint-Job (tile I6)
// with one street face 5-7.2 m wide, party walls, 7-14 m tall. Uses the city's own façade analysis
// (viewer/facadeGeom.js analyseBuildings), so "street" / "party" mean exactly what the façade shader sees.
//   node tools/interior/pickHouse.mjs [tile] [x z radius]
import fs from "fs";
import { analyseBuildings, hash01 } from "../../viewer/facadeGeom.js";

const tile = process.argv[2] || "I6";
const cx = +(process.argv[3] ?? 1216.19), cz = +(process.argv[4] ?? 561.44), rad = +(process.argv[5] ?? 220);
const dir = new URL(`../../data/tiles/${tile}/`, import.meta.url);
const doc = JSON.parse(fs.readFileSync(new URL("buildings.json", dir)));
const bin = fs.readFileSync(new URL("buildings.bin", dir));
const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const roads = JSON.parse(fs.readFileSync(new URL("roads.json", dir)));
const feats = JSON.parse(fs.readFileSync(new URL("features.json", dir)));
const a = analyseBuildings(doc, buf, roads, feats);

/** Faces per building (keyed by the per-building hash the shader gets as aBld.w). */
export function facesOf(a) {
  const W = a.walls, nV = W.position.length / 3, faces = new Map();
  for (let i = 0; i < nV; i++) {
    const rnd = W.aBld[i * 4 + 3], nx = W.aFN[i * 4], nz = W.aFN[i * 4 + 1], width = W.aWall[i * 4 + 1];
    const k = `${rnd}|${nx.toFixed(4)}|${nz.toFixed(4)}|${width.toFixed(3)}`;
    if (!faces.has(k)) faces.set(k, { rnd, nx, nz, width, eh: W.aWall[i * 4 + 3], style: W.aBld[i * 4], partyH: W.aBld[i * 4 + 1], street: W.aBld[i * 4 + 2], shopW: W.aFN[i * 4 + 3], verts: [] });
    faces.get(k).verts.push(i);
  }
  const byRnd = new Map();
  for (const f of faces.values()) { if (!byRnd.has(f.rnd)) byRnd.set(f.rnd, []); byRnd.get(f.rnd).push(f); }
  return byRnd;
}

const byRnd = facesOf(a);
const count = new Map();
for (const b of doc.buildings) { const k = String(b.attrs?.BU_ID ?? b.id); count.set(k, (count.get(k) || 0) + 1); }
const out = [];
for (const b of doc.buildings) {
  const key = String(b.attrs?.BU_ID ?? b.id), rnd = Math.fround(hash01(key));
  const ring = b.footprint[0];
  const mx = ring.reduce((s, q) => s + q[0], 0) / ring.length, mz = ring.reduce((s, q) => s + q[1], 0) / ring.length;
  const d = Math.hypot(mx - cx, mz - cz);
  if (d > rad || count.get(key) !== 1) continue;
  const fs_ = byRnd.get(rnd) || [];
  const street = fs_.filter((f) => f.street && f.partyH < 999 && f.width > 2);
  if (street.length !== 1) continue;
  const sf = street[0];
  if (sf.width < 5 || sf.width > 7.2 || b.height < 7 || b.height > 14) continue;
  out.push({ id: b.id, bu: key, d: +d.toFixed(0), at: [+mx.toFixed(1), +mz.toFixed(1)], ring: ring.length, base: b.base, eaves: b.eaves, top: b.top,
    front: +sf.width.toFixed(2), eh: +sf.eh.toFixed(2), style: sf.style, shop: sf.shopW,
    faces: fs_.map((f) => `${f.width.toFixed(1)}${f.street ? "S" : ""}${f.partyH >= 999 ? "P" : f.partyH > 0 ? "p" : ""}`).join(" ") });
}
out.sort((p, q) => p.d - q.d);
for (const o of out.slice(0, 40)) console.log(JSON.stringify(o));
