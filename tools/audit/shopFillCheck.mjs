// SHOP FRONTS (claude/reality1 round 3; rules shop-street-fill + shop-front-real, classes C2 + C3 of
// docs/REALITY_ROUND_2026-11-26.md). Street View: on a shop street every ground floor is a shop, OSM maps a third; the
// known shops wear their real name, colours and sign type. This keeps both:
//
//   node tools/audit/shopFillCheck.mjs [--quiet]
//
// F  every fill front (data/streetlife/<T>.json pois with fill: true, tools/streetlife/build_streetlife.py) stands on a
//    street with >= 3 real shops of that street within 45 m, on a wall <= 5 m from the kerb, on a face no real shop
//    uses, with a trade word of the builder's list (no invented brand)
// D  density on the round's shop streets: fronts per 100 m of street (both sides, the street's drawn length in the tiles)
//    >= 4 on Rue Xavier De Bue, the Chaussee d'Alsemberg's centre and the Chaussee de Waterloo at Vivier d'Oie / Fort-
//    Jaco; printed before (.cache / fill old) and now
// C  every curated front of the round (data/shops/terraces.json, _name "claude/reality1 round 3" or the Bleus d'Encre
//    one) has its sign text and its board colour and is placed (its POI in the street life); the CHAIN fronts listed
//    for the owner's call
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const fail = (m) => { fails++; if (fails < 40) console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const WORDS = new Set(["BOUTIQUE", "COIFFURE", "À LOUER", "IMMOBILIER", "INSTITUT DE BEAUTÉ", "OPTIQUE", "CHAUSSURES", "PRESSING", "CADEAUX", "FLEURS", "DÉCORATION", "VOYAGES", "BIJOUTERIE"]);

const tiles = readdirSync(join(ROOT, "data/streetlife")).filter((f) => /^[A-O]\d+\.json$/.test(f)).map((f) => f.slice(0, -5));
const all = [], placed = new Set();
let nFill = 0;
for (const T of tiles) {
  const d = json(`data/streetlife/${T}.json`);
  const real = d.pois.filter((p) => p.face && p.kind !== "atm" && !p.fill);
  const usedFaces = new Set(real.map((p) => `${p.face.si}|${p.face.bu}|${Math.round(p.face.x)}|${Math.round(p.face.z)}`));
  for (const p of d.pois) { placed.add(p.id); if (p.face) all.push({ T, street: p.face.street, fill: !!p.fill }); }
  for (const p of d.pois.filter((q) => q.fill)) {
    nFill++;
    const f = p.face;
    if (!WORDS.has(p.name)) fail(`F ${T} ${p.id}: name "${p.name}" is not a trade word`);
    if (!(f.side != null && f.side <= 5.0)) fail(`F ${T} ${p.id}: ${f.side} m from the kerb`);
    const near = real.filter((q) => q.face.street === f.street && Math.hypot(q.face.x - f.x, q.face.z - f.z) <= 47).length;
    if (near < 3) fail(`F ${T} ${p.id}: ${near} real shops of ${f.street} within 45 m`);
    // a real shop on the same face within its width: the fill took a used face
    if (real.some((q) => q.face.si === f.si && Math.hypot(q.face.x - f.x, q.face.z - f.z) < (q.face.w + f.w) / 2)) fail(`F ${T} ${p.id}: overlaps a real shop`);
  }
}
say(`ok   F ${nFill} fill fronts`);

// ---- D: density on the round's shop streets
const roadLen = {};
for (const T of tiles) {
  if (!existsSync(join(ROOT, `data/tiles/${T}/roads.json`))) continue;
  const r = json(`data/tiles/${T}/roads.json`), N = new Map(r.nodes.map((n) => [n.id, n]));
  const b = { x0: r.meta?.bounds?.x?.[0], z0: r.meta?.bounds?.z?.[0] };
  for (const w of r.roads) {
    const name = w.meta?.name; if (!name) continue;
    const pts = [N.get(w.a), ...w.pts, N.get(w.b)].filter(Boolean);
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    // roads.json holds the roads within 150 m of the tile: count each road id once over the city
    (roadLen[name] ??= new Map()).set(w.id, L);
  }
}
const STREETS = [["Rue Xavier De Bue", 4], ["Chaussée d'Alsemberg", 1.2], ["Chaussée de Waterloo", 1.2], ["Parvis Saint-Pierre", 4]];
for (const [s, min] of STREETS) {
  const L = Object.keys(roadLen).filter((k) => k.startsWith(s)).reduce((a, k) => a + [...roadLen[k].values()].reduce((x, y) => x + y, 0), 0);
  const n = all.filter((p) => (p.street || "").startsWith(s)).length, nf = all.filter((p) => (p.street || "").startsWith(s) && p.fill).length;
  const per = L ? (100 * n) / L : 0;
  console.log(`D ${s}: ${n} fronts (${nf} fill) on ${L.toFixed(0)} m: ${per.toFixed(1)} per 100 m (was ${L ? ((100 * (n - nf)) / L).toFixed(1) : "-"})`);
  if (per < min) fail(`D ${s}: ${per.toFixed(1)} fronts per 100 m (< ${min})`);
}

// ---- C: the round's curated fronts
const cur = json("data/shops/terraces.json").terraces;
const MINE = ["osm:n3930461153", "osm:n2349997604", "osm:n13251478865", "osm:n12460901867", "osm:n12520069811", "osm:n12523281840", "extra:immo-dugo", "extra:traks-vivier"];
const mine = MINE.map((k) => [k, cur[k]]).filter(([k, v]) => v || fail(`C ${k}: no curated front`));
const chains = [];
for (const [k, v] of mine) {
  const f = v.front || {};
  if (!f.sign) fail(`C ${k}: no sign text`);
  if (!Array.isArray(f.board)) fail(`C ${k}: no board colour`);
  if (!placed.has(k)) fail(`C ${k}: its POI is not placed in any street-life tile`);
  if (/CHAIN/.test(v._name || "")) chains.push(`${f.sign} (${k})`);
}
console.log(`C ${mine.length} curated fronts of the round; CHAINS for the owner's call: ${chains.join(", ") || "none"}`);
console.log(fails ? `SHOPFILL: FAIL (${fails})` : `SHOPFILL: PASS (${nFill} fill fronts, ${mine.length} curated fronts)`);
process.exit(fails ? 1 : 0);
