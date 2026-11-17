// node tools/audit/xmasCheck.mjs [--quiet]
// RULE 19 (docs/QUALITY_RULES.md): the seasonal layer (viewer/christmas/, models/christmas/site.json) stands where the
// city can hold it and adds no light:
//   - every fir and market chalet stands on paving (UrbIS square / sidewalk surface under its whole footprint, never a
//     roadway, a tram track or a parking strip), clear of tram surfaces (>= 4 m), building walls (the fir: its branches'
//     reach + 1 m; a chalet: 0.5 m), the drawn trees' trunks (1 m), shop fronts / doors (4 m: the street-life faces),
//     and of each other;
//   - street garlands hang 7-26 m wall to wall, >= 4.4 m over the street at their lowest (bulbs + the star motif), and
//     never carry a star over a tram track;
//   - the kit's mesh audit (models/christmas/christmas.json) has 0 blocking items on every piece and level;
//   - NO LIGHT: no three.js light is constructed or added under viewer/christmas/ (rule 7: emissive only), no
//     DynamicDrawUsage (rule 8).
// Exit 1 on any failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
let fails = 0;
const out = (ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };

const site = J("models/christmas/site.json"), map = J("data/map/map.json");
const tileOf = (x, z) => map.tiles.find((t) => x >= t.x0 && x < t.x0 + 500 && z >= t.z0 && z < t.z0 + 500)?.name;
const cache = {};
const tileData = (name) => (cache[name] ??= {
  surfaces: J(`data/tiles/${name}/surfaces.json`).surfaces,
  buildings: J(`data/tiles/${name}/buildings.json`).buildings,
  trees: J(`data/tiles/${name}/features.json`).trees,
});
const around = (x, z) => {
  const names = new Set();
  for (const dx of [-30, 0, 30]) for (const dz of [-30, 0, 30]) { const n = tileOf(x + dx, z + dz); if (n) names.add(n); }
  const T = [...names].map(tileData);
  return { surfaces: T.flatMap((t) => t.surfaces), buildings: T.flatMap((t) => t.buildings), trees: T.flatMap((t) => t.trees) };
};
const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [x0, z0] = r[i], [x1, z1] = r[j]; if ((z0 > z) !== (z1 > z) && x < ((x1 - x0) * (z - z0)) / (z1 - z0) + x0) c = !c; } return c; };
const edist = (x, z, r) => { let d = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); d = Math.min(d, Math.hypot(ax + t * dx - x, az + t * dz - z)); } return d; };
const distTo = (x, z, r) => (pip(x, z, r) ? 0 : edist(x, z, r));
const PAVING = new Set([4, 5]), TRAM = new Set([1, 2]);           // surfaces.json classes: square, sidewalk | tramRoad, tramSite

// the street-life shop faces (doors / fronts)
const fronts = site.fronts ?? [];

/** a footprint (sample points) on paving, clear of trams / walls / trunks / fronts */
function standsWell(label, pts, { wall, tram = 4, trunk = 1, front = 4 }) {
  const [cx, cz] = pts[0], A = around(cx, cz);
  const bad = [];
  for (const [x, z] of pts) {
    const under = A.surfaces.filter((s) => pip(x, z, s.rings[0]));
    if (!under.some((s) => PAVING.has(s.c)) || under.some((s) => !PAVING.has(s.c))) { bad.push(`(${x.toFixed(1)}, ${z.toFixed(1)}) not on paving (${under.map((s) => s.c).join(",") || "none"})`); break; }
  }
  const dTram = Math.min(...A.surfaces.filter((s) => TRAM.has(s.c)).map((s) => Math.min(...pts.map(([x, z]) => distTo(x, z, s.rings[0])))), Infinity);
  if (dTram < tram) bad.push(`${dTram.toFixed(1)} m from a tram track (< ${tram})`);
  const dWall = Math.min(...A.buildings.flatMap((b) => b.footprint.map((r) => Math.min(...pts.map(([x, z]) => distTo(x, z, r))))), Infinity);
  if (dWall < wall) bad.push(`${dWall.toFixed(1)} m from a building wall (< ${wall})`);
  const dTrunk = Math.min(...A.trees.map((t) => Math.min(...pts.map(([x, z]) => Math.hypot(t.x - x, t.z - z)))), Infinity);
  if (dTrunk < trunk) bad.push(`${dTrunk.toFixed(1)} m from a tree trunk (< ${trunk})`);
  const dFront = Math.min(...fronts.map((f) => Math.min(...pts.map(([x, z]) => Math.hypot(f.x - x, f.z - z)))), Infinity);
  if (dFront < front) bad.push(`${dFront.toFixed(1)} m from a shop front (< ${front})`);
  out(!bad.length, `${label}: on paving, tram ${dTram.toFixed(1)} m, walls ${dWall.toFixed(1)} m, trunks ${dTrunk.toFixed(1)} m, shops ${dFront.toFixed(1)} m${bad.length ? " :: " + bad.join("; ") : ""}`);
}
const ring = (x, z, r, n = 12) => [[x, z], ...Array.from({ length: n }, (_, k) => [x + Math.cos((2 * Math.PI * k) / n) * r, z + Math.sin((2 * Math.PI * k) / n) * r])];
const rect = (c, hw, fr, bk) => {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ux = fz, uz = -fx, P = [[c.x, c.z]];
  for (const a of [-1, -0.5, 0, 0.5, 1]) for (const b of [-bk, 0, fr]) P.push([c.x + ux * a * hw + fx * b, c.z + uz * a * hw + fz * b]);
  return P;
};
// the firs: the planter on paving; the branches (2.95 m x scale) + 1 m clear of walls
for (const t of site.trees) standsWell(`fir ${t.id}`, ring(t.x, t.z, 1.4 * t.scale), { wall: 2.95 * t.scale + 1, trunk: 1.5 + 1.4 * t.scale });
// the chalets: the footprint with the roof overhangs and the propped shutter
for (const [i, c] of (site.chalets ?? []).entries()) standsWell(`chalet ${i}`, rect(c, 1.8, 1.45, 1.35), { wall: 0.5 });
{
  const ch = site.chalets ?? [], fir = site.trees.find((t) => t.id === "stjob");
  const apart = ch.every((a, i) => ch.every((b, j) => i === j || Math.hypot(a.x - b.x, a.z - b.z) >= 3.0));
  const offFir = ch.every((c) => Math.min(...rect(c, 1.8, 1.45, 1.35).map(([x, z]) => Math.hypot(x - fir.x, z - fir.z))) >= 1.4 + 3.0);
  out(ch.length >= 4 && ch.length <= 8 && apart && offFir, `${ch.length} chalets (4-8), >= 3 m apart, >= 3 m off the fir's planter`);
}
// the street garlands
{
  const bad = site.spans.filter((s) => {
    const w = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]), H = s.tram ? 7.3 : 6.8, ground = (s.a[1] + s.b[1]) / 2 - H;
    const low = (s.a[1] + s.b[1]) / 2 - s.sag - 0.04 - (s.motif ? 0.75 * 1.76 : 0) - ground;
    return w < 6.9 || w > 26.1 || low < 4.4 || (s.tram && s.motif);
  });
  out(!bad.length, `${site.spans.length} street garlands: 7-26 m wall to wall, >= 4.4 m over the street, no star over a tram (${bad.length} bad)`);
}
// the kit's mesh audit
{
  const info = J("models/christmas/christmas.json"), A = info.audit ?? {};
  const blk = Object.entries(A).filter(([, v]) => v.blocking);
  out(Object.keys(A).length >= 15 && !blk.length, `kit mesh audit: ${Object.keys(A).length} piece levels, ${blk.length ? blk.map(([k, v]) => `${k} ${v.blocking}`).join(", ") : "0 blocking"}`);
}
// no light, no DynamicDrawUsage
{
  const dir = path.join(ROOT, "viewer/christmas"), hits = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\/.*$/gm, "");
    for (const re of [/new\s+THREE\.\w*Light\b/g, /\b(PointLight|SpotLight|DirectionalLight|RectAreaLight|HemisphereLight|AmbientLight)\b/g, /DynamicDrawUsage/g]) for (const m of src.matchAll(re)) hits.push(`${f}: ${m[0]}`);
  }
  out(!hits.length, `no light added, no DynamicDrawUsage in viewer/christmas/ (${hits.length ? hits.join(", ") : "none"})`);
}
console.log(fails ? `xmasCheck: ${fails} FAIL` : "xmasCheck: all PASS");
process.exit(fails ? 1 : 0);
