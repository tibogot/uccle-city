// Plot a road network around a point as SVG (ids, one-way arrows, node kinds, engine errors).
//
//   node tools/plot_area.mjs <network.json> <x> <z> [radius=90] > out.svg
//
// For writing pipeline/overrides.json: run it on the converter output (before refine) to see
// the OSM-derived ids, or on the refined network to see what refine did.
import { readFileSync } from "node:fs";
import { buildRoadNetwork } from "../vendor/roads/roadNetwork.js";

const [file, xs, zs, rs = "90"] = process.argv.slice(2);
const data = JSON.parse(readFileSync(file, "utf8"));
const cx = +xs, cz = +zs, R = +rs, S = 900 / (2 * R);
const N = new Map(data.nodes.map((n) => [n.id, n]));
const P = (x, z) => [((x - cx + R) * S).toFixed(1), ((z - cz + R) * S).toFixed(1)];
const near = (x, z) => Math.abs(x - cx) < R * 1.2 && Math.abs(z - cz) < R * 1.2;
let issues = [];
try { issues = buildRoadNetwork(data).issues.filter((i) => i.level === "error" && near(i.x, i.z)); } catch { /* plot anyway */ }
const col = { avenue: "#d9534f", collector: "#f0ad4e", local: "#5bc0de", oneWay: "#5cb85c", alley: "#999" };
const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900" font-family="monospace">`,
  `<rect width="900" height="900" fill="#fff"/>`,
  `<defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="#333"/></marker></defs>`];
for (const r of data.roads) {
  const pts = [N.get(r.a), ...r.pts, N.get(r.b)];
  if (!pts.some((p) => near(p.x, p.z))) continue;
  const d = pts.map((p, k) => `${k ? "L" : "M"}${P(p.x, p.z).join(",")}`).join("");
  const ow = r.type === "oneWay" || r.meta?.oneway === "yes";
  out.push(`<path d="${d}" fill="none" stroke="${col[r.type] || "#888"}" stroke-width="${r.meta?.dual ? 7 : 3}" stroke-opacity="0.8"/>`);
  if (ow) for (let k = 1; k < pts.length; k++) {
    const [ax, az] = P(pts[k - 1].x, pts[k - 1].z), [bx, bz] = P(pts[k].x, pts[k].z);
    out.push(`<path d="M${ax},${az}L${(+ax + +bx) / 2},${(+az + +bz) / 2}" stroke="none" fill="none" marker-end="url(#ar)"/>`);
  }
  const m = pts[Math.floor(pts.length / 2)], m0 = pts[Math.max(0, Math.floor(pts.length / 2) - 1)];
  const [lx, lz] = P((m.x + m0.x) / 2, (m.z + m0.z) / 2);
  out.push(`<text x="${lx}" y="${lz}" font-size="10" fill="#000">${r.id}</text>`);
}
for (const n of data.nodes) {
  if (!near(n.x, n.z)) continue;
  const [x, z] = P(n.x, n.z);
  const f = n.kind === "roundabout" ? "#a0f" : n.kind === "split" ? "#0a0" : n.meta?.cut ? "#aaa" : "#000";
  out.push(`<circle cx="${x}" cy="${z}" r="${n.kind === "roundabout" ? n.ring.radius * S : 3}" fill="${n.kind === "roundabout" ? "none" : f}" stroke="${f}"/>`);
  out.push(`<text x="${+x + 4}" y="${+z - 4}" font-size="9" fill="#06c">${n.id}</text>`);
}
for (const i of issues) {
  const [x, z] = P(i.x, i.z);
  out.push(`<circle cx="${x}" cy="${z}" r="9" fill="none" stroke="#f00" stroke-width="2"/><text x="${+x + 10}" y="${+z + 12}" font-size="10" fill="#f00">${i.code}</text>`);
}
out.push(`<text x="10" y="890" font-size="12">${file} @ (${cx}, ${cz}) ±${R} m; ${issues.length} errors. thick = dual</text></svg>`);
console.log(out.join("\n"));
