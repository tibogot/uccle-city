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
//    (claude/carrefour2) every curated store (shed look with store: { front, sign, lot, bays }): its front says its sign,
//    a glazed run under a canopy on THIS building, its lot on the look's switch with that many bay rows, each bay inside
//    the lot's ring; Marlow (529267) and Rue Gatti de Gamond 60 (558122) present; Gatti's lot records OSM node
//    9627537495's wrong parking=underground (osmWrong)
// M  (claude/places2) every OSM point MOVED with an address (extra_pois.json _moves + tags addr:street) is placed on a
//    face of that street: a corner shop opens on its own street (Le Pigeon Noir, Rue Geleytsbeek 2: the build put its front
//    on the Avenue de la Chênaie gable, the nearest wall to OSM's point, which has no address); Le Pigeon Noir on
//    building 1713722's Rue Geleytsbeek face, its curated awning saying LE PIGEON NOIR
// R  (claude/places2, rule curated-render-tone) every look with a render tone: a rendered style (3 / 4), a render tone
//    (buildingTypes.js NINETIES.tones from "ochre" on), a _name and a set (its switch); renderToneStyle puts it in the
//    style's fraction; Le Pigeon Noir's house (532108) mustard, set places2
// P  (claude/places2) every playground (data/overrides.json playgrounds: the park kit's pieces in the city,
//    viewer/playgroundCity.js): a set, a why, a source, a ring; every piece in the kit (models/parkkit/playgroundkit.json)
//    and its whole footprint (the kit's size, turned by its yaw) inside its ring (0.3 m slack) and in no building; the
//    Chênaie garden in front of Le Pigeon Noir with >= 3 pieces
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  const spans = [["front", W / 2, 0]];
  if (fr.canopy) spans.push(["canopy", (W + (fr.canopy.extra ?? 0.4)) / 2, fr.canopy.du ?? 0]);   // (claude/carrefour2: canopy.du)
  for (const [what, half, cu] of spans) for (const s of [-1, 1]) {
    const x = f.x + X[0] * (du + cu + s * half), z = f.z + X[1] * (du + cu + s * half);
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
// (claude/carrefour2) every curated store (a shed look with store: { front, sign, lot, bays }, data-driven: a second
// Carrefour is a data entry, no code): its front present, saying its sign, the glazed run (w >= 12) under a canopy, on
// THIS building (its POI's face on the solid's BU_ID; section W puts both ends on the wall); its lot present on the
// look's switch with its bay rows, every bay's four corners inside the lot's ring (0.3 m slack: a bay row on the
// sidewalk or under the store is a wrong frame); the stores the owner named present (Marlow 529267, Gatti de Gamond
// 558122), and Gatti de Gamond's lot records the wrong OSM tag (node 9627537495 parking=underground: a surface lot)
let stores = 0;
const toWorld = (g, u, v) => { const a = (g.frame.angleDeg * Math.PI) / 180; return [g.frame.origin[0] + Math.cos(a) * u - Math.sin(a) * v, g.frame.origin[1] + Math.sin(a) * u + Math.cos(a) * v]; };
for (const [id, v] of Object.entries(looks)) if (v?.shed && v.store) {
  stores++;
  const st = v.store, fr = cur[st.front]?.front;
  if (!fr) { fail(`S store ${id}: no curated front ${st.front}`); continue; }
  if (!new RegExp(st.sign).test(signOf(st.front))) fail(`S store ${id}: its front ${st.front} does not say ${st.sign}`);
  if (!(fr.w >= 12) || !fr.canopy) fail(`S store ${id}: ${st.front} is not a glazed run (w >= 12) under a canopy`);
  let poi = null, T = null;
  for (const t of manifest.tiles) { const p = (slOf(t.name)?.pois || []).find((q) => q.id === st.front); if (p) { poi = p; T = t.name; break; } }
  const solid = T && solids(T).find((b) => String(b.attrs?.INSPIRE_ID || "").endsWith(`/${id}`));
  if (!poi?.face || !solid || poi.face.bu !== solid.attrs.BU_ID) fail(`S store ${id}: its front ${st.front} is not on this building (face ${poi?.face?.bu ?? "none"})`);
  const g = grounds.find((q) => q.id === st.lot);
  const sw = v.set === "carrefour" ? "?carrefour=old" : null;
  if (!g) { fail(`S store ${id}: no lot ${st.lot}`); continue; }
  // no LiDAR "tree" (urbis-chm) taller than the canopy's underside standing under it, unless the lot's chmClear drops it
  // (viewer/main.js groundTreesClear): a crown through the canopy (Gatti de Gamond: 4 peaks of 3-3.6 m, the canopy edge
  // and the planters)
  if (fr.canopy && poi?.face) {
    const f = poi.face, X = [f.nz, -f.nx], N = [f.nx, f.nz], c = fr.canopy, half = (fr.w + (c.extra ?? 0.4)) / 2, mid = (fr.du || 0) + (c.du ?? 0), out = c.out ?? 3;
    const clear = g.chmClear || [];
    const trees = existsSync(join(ROOT, `data/tiles/${T}/features.json`)) ? json(`data/tiles/${T}/features.json`).trees || [] : [];
    for (const t of trees) {
      if (t.source !== "urbis-chm" || !(t.height > (c.y ?? 3.1))) continue;
      const dx = t.x - f.x, dz = t.z - f.z, u = dx * X[0] + dz * X[1] - mid, n = dx * N[0] + dz * N[1];
      if (Math.abs(u) <= half && n >= -0.5 && n <= out + (t.crown ?? 1) && !clear.some((r) => inRing(r, t.x, t.z))) fail(`S store ${id}: a LiDAR tree ${t.id} (${t.height} m) stands under its canopy (add the lot's chmClear)`);
    }
  }
  if (sw && g.switch !== sw) fail(`S store ${id}: lot ${st.lot} not on ${sw}`);
  const rows = (g.marks || []).filter((m) => m.kind === "bays");
  if (rows.length !== st.bays) fail(`S store ${id}: lot ${st.lot} has ${rows.length} bay rows, the data says ${st.bays}`);
  if (!g.frame) { fail(`S store ${id}: lot ${st.lot} has no paint frame`); continue; }
  for (const m of rows) {
    const a = ((m.deg || 0) * Math.PI) / 180, du = [Math.cos(a), Math.sin(a)], dv = [-Math.sin(a), Math.cos(a)];
    for (const [s, t] of [[0, 0], [m.n * m.w, 0], [0, m.depth], [m.n * m.w, m.depth]]) {
      const [x, z] = toWorld(g, m.at[0] + du[0] * s + dv[0] * t, m.at[1] + du[1] * s + dv[1] * t);
      if (!inRing(g.ring, x, z) && ringD(g.ring, x, z) > 0.3) { fail(`S store ${id}: a bay row of ${st.lot} (at ${m.at}) leaves the lot at (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
    }
  }
}
for (const id of ["529267", "558122"]) if (!looks[id]?.store) fail(`S buildingLooks ${id}: not a curated store (shed + store)`);
const gl = grounds.find((g) => g.id === looks["558122"]?.store?.lot);
if (!gl?.osmWrong?.some((w) => w.id === "osm:n9627537495")) fail("S the Gatti de Gamond lot does not record OSM node 9627537495's wrong parking=underground (osmWrong)");
say(`ok   S ${stores} curated stores (front, sign, canopy, lot, bays inside)`);

// ---- M: moved OSM points with an address, on their street (claude/places2)
let moved = 0;
for (const e of extra) {
  if (!e._moves || !e.tags?.["addr:street"]) continue;
  moved++;
  const id = `osm:n${String(e._moves).replace(/^n/, "")}`, want = e.tags["addr:street"].split(" - ")[0];
  let poi = null;
  for (const t of manifest.tiles) { poi = (slOf(t.name)?.pois || []).find((q) => q.id === id); if (poi) break; }
  if (!e._source) fail(`M moved ${id}: no _source`);
  if (!poi?.face) { fail(`M moved ${id}: not placed on a face (run tools/streetlife/build_streetlife.py <T> --pois-only)`); continue; }
  if (!String(poi.face.street || "").startsWith(want)) fail(`M moved ${id} (${poi.name}): its front is on ${poi.face.street}, not on its address street ${want}`);
}
{
  let pn = null;
  for (const t of manifest.tiles) { pn = (slOf(t.name)?.pois || []).find((q) => q.id === "osm:n4388790239"); if (pn) break; }
  if (!pn?.face || !/^Rue Geleytsbeek/.test(pn.face.street || "") || !/1713722$/.test(pn.face.bu || "")) fail(`M Le Pigeon Noir (osm:n4388790239): not on building 1713722's Rue Geleytsbeek face (${pn?.face?.street} ${pn?.face?.bu})`);
  const pf = cur["osm:n4388790239"]?.front;
  if (!pf?.awning || !/LE PIGEON NOIR/.test(pf.valance || "")) fail("M osm:n4388790239: the curated front has no awning saying LE PIGEON NOIR");
}
say(`ok   M ${moved} moved OSM points with an address on their street`);

// ---- R: render tones (claude/places2, rule curated-render-tone)
const { renderToneStyle, NINETIES } = await import(pathToFileURL(join(ROOT, "viewer/buildingTypes.js")).href);
let toned = 0;
for (const [id, v] of Object.entries(looks)) {
  if (!v || typeof v !== "object" || !v.tone || v.type === 6 || v.v2?.type === 6) continue;
  toned++;
  if (v.style !== 3 && v.style !== 4) fail(`R buildingLooks ${id}: a render tone on style ${v.style} (only the renders 3 / 4 take one)`);
  if (NINETIES.tones.indexOf(v.tone) < 5) fail(`R buildingLooks ${id}: tone ${v.tone} is not a render tone (${NINETIES.tones.slice(5).join(" / ")})`);
  if (!v._name || !v.set) fail(`R buildingLooks ${id}: a render tone without its _name / set (switch)`);
  const s2 = renderToneStyle(v.style, v.type ?? 0, v);
  if (!(s2 > v.style && s2 < v.style + 0.5)) fail(`R buildingLooks ${id}: renderToneStyle gives ${s2} (no tone in the style's fraction)`);
}
if (looks["532108"]?.tone !== "mustard" || looks["532108"]?.set !== "places2") fail("R buildingLooks 532108 (Le Pigeon Noir): not the mustard render tone of set places2");
say(`ok   R ${toned} render-toned looks`);

// ---- P: playgrounds (claude/places2)
{
  const pgs = Object.entries(ov.playgrounds || {}).filter(([k]) => !k.startsWith("_"));
  const kitP = json("models/parkkit/playgroundkit.json").pieces;
  let nP = 0;
  for (const [id, g] of pgs) {
    for (const k of ["set", "why", "source"]) if (!g[k]) fail(`P playground ${id}: no ${k}`);
    if (!(g.ring?.length >= 3)) { fail(`P playground ${id}: no ring`); continue; }
    for (const [piece, x, z, deg] of g.pieces || []) {
      nP++;
      const sz = kitP[piece]?.size_m;
      if (!sz) { fail(`P playground ${id}: no piece ${piece} in the kit`); continue; }
      const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), hx = sz[0] / 2, hz = sz[1] / 2;
      for (const [u, v] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz], [0, 0]]) {
        const px = x + u * c + v * sn, pz = z - u * sn + v * c;
        if (!inRing(g.ring, px, pz) && ringD(g.ring, px, pz) > 0.3) { fail(`P playground ${id}: ${piece} at (${x}, ${z}) runs out of its ring at (${px.toFixed(1)}, ${pz.toFixed(1)})`); break; }
        const T = tileOf(px, pz);
        if (T && feet(T).some((r) => inRing(r, px, pz))) { fail(`P playground ${id}: ${piece} in a building at (${px.toFixed(1)}, ${pz.toFixed(1)})`); break; }
      }
    }
  }
  if (!((ov.playgrounds?.chenaie?.pieces?.length ?? 0) >= 3) || ov.playgrounds?.chenaie?.set !== "places2") fail("P playground chenaie (in front of Le Pigeon Noir): missing, < 3 pieces or not set places2");
  say(`ok   P ${pgs.length} playgrounds, ${nP} pieces inside their rings`);
}

console.log(fails ? `CURATED PLACES: FAIL (${fails})` : `CURATED PLACES: PASS (${extra.length} extra POIs placed, ${grounds.length} hard grounds clear of buildings)`);
process.exit(fails ? 1 : 0);
