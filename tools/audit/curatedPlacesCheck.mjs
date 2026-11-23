// CURATED PLACES (claude/places1, 2026-11-23; rule curated-place-placed). The owner's places the open data lacks (a night
// shop, a DIY shop, their car parks: Agam nightshop + Brico Sint-Job on Chaussée de Saint-Job, White Night's lot) are
// written into the data from a look-only Street View check. This keeps them there, placed and drawn:
//
//   node tools/audit/curatedPlacesCheck.mjs [--quiet]
//
// E  every extra POI (tools/streetlife/extra_pois.json) has a source and lands in its tile's street-life file as
//    "extra:<id>" on a building face (the build places it; a POI the build skipped is a shop that is not drawn)
// F  every curated front keyed "extra:<id>" (data/shops/terraces.json) belongs to a placed extra POI (a typo or a
//    renamed POI leaves a curation that changes nothing)
// G  every hard ground (data/overrides.json grounds): a ring of >= 3 points with a why, a source and a switch; at most
//    10 % of it under a building footprint of its tile (1 m samples: a car park through a house is a wrong ring); its paint
//    marks (bays) inside its frame; the two lots of this job present (brico_lot with its 2 bay rows, white_night_lot)
// N  the night shop and Brico: their curated fronts carry the sign text the owner recognises (NIGHT SHOP, Brico) and
//    their houses their looks (buildingLooks 556438 white render, 540950 grey)
// W  (claude/carrefour) every curated front wider than the build's slot (front.w, moved by front.du): its POI placed, and
//    both ends of the drawn front (and of its canopy) on its own building's wall (within 0.6 m of the footprint ring): a
//    wide front past the wall's end floats in the air
// S  (claude/carrefour, rule curated-shed-look) every look with shed: true names its place (_name) and a set with a switch
//    (the Carrefour: set carrefour, ?carrefour=old); the Carrefour Market by Square Marlow: its box (529267) is a shed,
//    its front says Carrefour, has the glazing (w >= 12) and the canopy, its car park (carrefour_lot) has its 3 bay rows
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
let fails = 0;
const fail = (m) => { fails++; console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };

const manifest = json("data/tiles/manifest.json");
const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name ?? null;
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

// ---- E: extra POIs placed
const extra = json("tools/streetlife/extra_pois.json").elements || [];
const sl = new Map(), placed = new Set();
const slOf = (T) => { if (!sl.has(T)) sl.set(T, existsSync(join(ROOT, `data/streetlife/${T}.json`)) ? json(`data/streetlife/${T}.json`) : null); return sl.get(T); };
for (const t of manifest.tiles) { const d = slOf(t.name); for (const p of d?.pois || []) if (String(p.id).startsWith("extra:")) placed.add(p.id); }
for (const e of extra) {
  if (e._moves) continue;                           // (an OSM point moved onto its house: placed under its OSM id)
  if (!e._source) fail(`E extra POI ${e.id}: no _source`);
  if (!placed.has(`extra:${e.id}`)) fail(`E extra POI ${e.id} (${e.tags?.name}): not placed in any data/streetlife tile (run tools/streetlife/build_streetlife.py <T> --pois-only)`);
}
say(`ok   E ${extra.length} extra POIs, ${placed.size} placed`);

// ---- F: curated fronts of extra POIs
const cur = json("data/shops/terraces.json").terraces || {};
for (const k of Object.keys(cur)) if (k.startsWith("extra:") && !placed.has(k)) fail(`F curated ${k}: no placed POI with that id`);

// ---- G: hard grounds
const ov = json("data/overrides.json"), grounds = ov.grounds || [];
const fp = new Map();
const feet = (T) => { if (!fp.has(T)) fp.set(T, existsSync(join(ROOT, `data/tiles/${T}/buildings.json`)) ? json(`data/tiles/${T}/buildings.json`).buildings.map((b) => b.footprint[0]) : []); return fp.get(T); };
for (const g of grounds) {
  if (!(g.ring?.length >= 3)) { fail(`G ground ${g.id}: no ring`); continue; }
  for (const k of ["why", "source", "switch"]) if (!g[k]) fail(`G ground ${g.id}: no ${k}`);
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of g.ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  let inside = 0, inHouse = 0;
  for (let x = Math.floor(x0) + 0.5; x < x1; x++) for (let z = Math.floor(z0) + 0.5; z < z1; z++) {
    if (!inRing(g.ring, x, z)) continue;
    inside++;
    const T = tileOf(x, z);
    if (T && feet(T).some((r) => inRing(r, x, z))) inHouse++;
  }
  // (a ring may tuck under a wall it meets: the Lycée's yards run under the school's edges by a few %; a ring through a
  // house is > 10 %)
  if (inHouse > 0.1 * inside) fail(`G ground ${g.id}: ${inHouse} of its ${inside} m2 samples inside a building footprint`);
  else if (inHouse) say(`     G ground ${g.id}: ${inHouse} of ${inside} m2 under a building's edge`);
  if (g.frame) for (const m of g.marks || []) if (m.kind === "bays") {
    const a = ((m.deg || 0) * Math.PI) / 180, du = [Math.cos(a), Math.sin(a)], dv = [-Math.sin(a), Math.cos(a)];
    for (const [s, t] of [[0, 0], [m.n * m.w, 0], [0, m.depth], [m.n * m.w, m.depth]]) {
      const u = m.at[0] + du[0] * s + dv[0] * t, v = m.at[1] + du[1] * s + dv[1] * t;
      if (u < -0.01 || v < -0.01 || u > g.frame.size[0] + 0.01 || v > g.frame.size[1] + 0.01) { fail(`G ground ${g.id}: a bay row runs out of its paint frame (${u.toFixed(1)}, ${v.toFixed(1)})`); break; }
    }
  }
}
const brico = grounds.find((g) => g.id === "brico_lot"), wn = grounds.find((g) => g.id === "white_night_lot");
if (!brico || (brico.marks || []).filter((m) => m.kind === "bays").length !== 2) fail("G brico_lot: missing, or not its 2 bay rows");
if (!wn) fail("G white_night_lot: missing");
say(`ok   G ${grounds.length} hard grounds`);

// ---- N: the two shops of the owner's note
const signOf = (k) => { const f = cur[k]?.front || {}; return [].concat(f.sign ?? [], ...(f.plaques || []).map((p) => p.text ?? [])).join(" | "); };
if (!/NIGHT SHOP/.test(signOf("extra:agam-nightshop"))) fail("N extra:agam-nightshop: the curated front does not say NIGHT SHOP");
if (!/Brico/.test(signOf("extra:brico-sint-job"))) fail("N extra:brico-sint-job: the curated front does not say Brico");
const looks = ov.buildingLooks || {};
if (looks["556438"]?.style !== 3) fail("N buildingLooks 556438 (Ch. de Saint-Job 701, the night shop): not the white render (style 3)");
if (looks["540950"]?.style !== 5) fail("N buildingLooks 540950 (Brico's shed): not grey (style 5)");

// ---- W: wide curated fronts on their wall
const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const ringD = (r, x, z) => { let d = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) d = Math.min(d, segD(x, z, r[j][0], r[j][1], r[i][0], r[i][1])); return d; };
const solidsOf = new Map();
const solids = (T) => { if (!solidsOf.has(T)) solidsOf.set(T, existsSync(join(ROOT, `data/tiles/${T}/buildings.json`)) ? json(`data/tiles/${T}/buildings.json`).buildings : []); return solidsOf.get(T); };
let wide = 0;
for (const [k, c] of Object.entries(cur)) {
  const fr = c?.front;
  if (!fr || !(fr.w || fr.du)) continue;
  wide++;
  let poi = null, T = null;
  for (const t of manifest.tiles) { const p = (slOf(t.name)?.pois || []).find((q) => q.id === k); if (p) { poi = p; T = t.name; break; } }
  if (!poi?.face) { fail(`W curated wide front ${k}: its POI is not placed on a face in any street-life tile`); continue; }
  const f = poi.face, X = [f.nz, -f.nx], du = fr.du || 0, W = fr.w ?? f.w;
  const own = solids(T).filter((b) => b.attrs?.BU_ID === f.bu).map((b) => b.footprint[0]);
  if (!own.length) { fail(`W ${k}: its building ${f.bu} not in ${T}`); continue; }
  const spans = [["front", W / 2]];
  if (fr.canopy) spans.push(["canopy", (W + (fr.canopy.extra ?? 0.4)) / 2]);
  for (const [what, half] of spans) for (const s of [-1, 1]) {
    const x = f.x + X[0] * (du + s * half), z = f.z + X[1] * (du + s * half);
    const d = Math.min(...own.map((r) => ringD(r, x, z)));
    if (d > 0.6) fail(`W ${k}: the ${what}'s ${s < 0 ? "left" : "right"} end (${x.toFixed(1)}, ${z.toFixed(1)}) is ${d.toFixed(2)} m off its wall`);
  }
}
say(`ok   W ${wide} wide curated fronts on their walls`);

// ---- S: retail boxes (shed looks) and the Carrefour Market by Square Marlow
for (const [id, v] of Object.entries(looks)) if (v && v.shed) {
  if (!v._name) fail(`S buildingLooks ${id}: shed without a _name (the place and its Street View check)`);
  if (!v.set) fail(`S buildingLooks ${id}: shed without a set (its switch)`);
}
if (!looks["529267"]?.shed || looks["529267"]?.set !== "carrefour") fail("S buildingLooks 529267 (the Carrefour Market by Square Marlow): not the retail box (shed, set carrefour)");
const cm = cur["osm:n255033292"]?.front;
if (!/Carrefour/.test([].concat(cm?.sign ?? [], ...(cm?.plaques || []).map((p) => p.text ?? [])).join(" "))) fail("S osm:n255033292: the curated front does not say Carrefour");
if (!(cm?.w >= 12) || !cm?.canopy) fail("S osm:n255033292: not the supermarket's glazed run (w >= 12) under its canopy");
const cl = grounds.find((g) => g.id === "carrefour_lot");
if (!cl || cl.switch !== "?carrefour=old" || (cl.marks || []).filter((m) => m.kind === "bays").length !== 3) fail("S carrefour_lot: missing, not on ?carrefour=old, or not its 3 bay rows");

console.log(fails ? `CURATED PLACES: FAIL (${fails})` : `CURATED PLACES: PASS (${extra.length} extra POIs placed, ${grounds.length} hard grounds clear of buildings)`);
process.exit(fails ? 1 : 0);
