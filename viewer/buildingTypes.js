// BUILDING TYPES (docs/STYLES.md; ?styles=old = every building the one generic façade of before). Pure JS, no three.js:
// runs in the tile worker (facadeGeom.js analyseBuildings, tileData.js far tiles) and in node (tools/styles/scan.mjs).
//
// Uccle is not one façade repeated: 19th-century to 1930s town houses ("maisons de maître", bourgeois terraces), a very
// large interwar stock (art deco / modernist rendered fronts), post-war "bel-étage" terraces (garage at street level,
// living floor above), 1950s-70s apartment blocks along the avenues, detached villas in the green south. UrbIS gives the
// geometry only (no age, no use; OSM carries start_date on 9 buildings of the commune). So the TYPE of a building is
// chosen from what the data does say:
//   1. its FORM, from UrbIS: footprint area, height, the share of flat roof (LoD2 roof triangles), and its PARTY WALLS
//      (the footprint's edges probed 0.35 m outward into another building's footprint): terraced (party walls on two
//      opposite sides), semi-detached (one side), detached (none), a block (tall / big);
//   2. its PERIOD, drawn by a stable hash with the REAL shares of the commune: the cadastre's building stock for Uccle
//      (Statbel open data "building stock 2023", NIS 21016, licence Open Data; see docs/STYLES.md): e.g. closed
//      houses 8,124: before 1919 947, 1919-45 4,342, 1946-70 2,073, after 1970 761; apartment buildings 3,302: 1919-45
//      1,154, 1946-81 1,469, after 1981 513. The period hash is shared by a 60 m cell half the time (rows were built in
//      campaigns: neighbouring houses tend to share their period) and weighted by the form (a flat roof is rarer on a
//      19th-century house, a 3+ storey narrow front rarer after the war).
// The form x period -> type table and the weights are in classify() below; the wall material follows the type.

export const TYPE = { GENERIC: 0, MAITRE: 1, DECO: 2, BELETAGE: 3, BLOCK: 4, VILLA: 5, NINETIES: 6, CURTAIN: 7 };
export const TYPE_NAMES = ["generic", "maison de maître", "art deco / modernist", "post-war bel-étage", "apartment block", "villa", "1990s house", "glass curtain wall"];
// (cortenbosch2, docs/CORTENBOSCH2.md) types 6 and 7 are never drawn by classify(): a curated look gives them
// (data/overrides.json buildingLooks { type: 6 | 7, ... }), city-wide. aBld.z = street + 2 type + 16 garage holds 0-7.
//   6 NINETIES  the 1980s-90s Brussels-periphery house (lotissements of Uccle, Linkebeek, Drogenbos, Rhode): buff /
//               salmon / cream face brick in stretcher bond, wide low windows in thin PVC / aluminium frames (white,
//               brown, anthracite), NO stone surrounds, a soldier course (bricks on end) over every opening, a timber /
//               fibre-cement fascia and soffit under the eaves, a garage door, concrete interlocking tiles on a hip roof
//   7 CURTAIN   a glass curtain wall: a grid of mullions and transoms (burgundy, anthracite, silver, green) over the
//               glass, opaque spandrel panels over the floor slabs (dark enamelled glass, grid-colour metal, light grey),
//               a metal coping: the Lycée Français's teaching block (553227), reusable for any office / school block
// Their sub-look rides in the wall style's fraction (the style stays in its band: 2 = brick for 6, 5 = render /
// concrete for 7, so the material library's set, the far colours and every style test keep working):
//   6: style = 2 (face brick) or 4 (render) + code / 200 (< 0.42: the style stays in its band), code = tone x 12 + frame + 3 x fascia
//      tone 0 buff, 1 salmon, 2 cream-white, 3 orange-red, 4 brown-buff (mixed) bricks; 5 ochre, 6 white, 7 mustard renders;
//      frame 0 white, 1 brown, 2 anthracite; fascia 0 cream-painted timber, 1 dark-stained timber, 2 grey fibre-cement,
//      3 varnished timber (warm brown)
//   7: style = 5 + code / 200, code = grid + 4 x spandrel; grid 0 burgundy, 1 anthracite, 2 silver, 3 dark green;
//      spandrel 0 dark enamelled glass, 1 metal in the grid's colour, 2 light grey panel
export const NINETIES = { tones: ["buff", "salmon", "cream", "orange", "brown", "ochre", "white", "mustard"], frames: ["white", "brown", "anthracite"], fascias: ["cream", "stained", "fibre", "varnished"] };
export const CURTAIN = { grids: ["burgundy", "anthracite", "silver", "green"], spandrels: ["glass", "metal", "grey"] };
const idx = (list, v, dflt) => { const i = list.indexOf(v); return i >= 0 ? i : dflt; };
/** the wall style (with its sub-look code) of a type-6 / -7 building from its look ({ tone, frame, fascia } /
 *  { grid, spandrel }: names as above; missing ones drawn from the building's hash). Other types: null */
export function typedStyle(type, look, key) {
  if (type === TYPE.NINETIES) {
    const tone = idx(NINETIES.tones, look?.tone, Math.floor(h01(key + "|t6") * 3));                      // (buff / salmon / cream)
    const frame = idx(NINETIES.frames, look?.frame, h01(key + "|f6") < 0.6 ? 0 : h01(key + "|f6") < 0.85 ? 1 : 2);
    const fascia = idx(NINETIES.fascias, look?.fascia, Math.floor(h01(key + "|e6") * 3));
    return (tone >= 5 ? 4 : 2) + (tone * 12 + frame + 3 * fascia) / 200;
  }
  if (type === TYPE.CURTAIN) return 5 + (idx(CURTAIN.grids, look?.grid, 1) + 4 * idx(CURTAIN.spandrels, look?.spandrel, 0)) / 200;
  return null;
}
/** (claude/places2) a RENDER TONE on any rendered house (not a typed 6 / 7 one): a curated look's { style: 3 | 4, tone }
 *  (tone a render tone of NINETIES.tones: "ochre", "white", "mustard") rides in the style's fraction like the 1990s
 *  house's (code = tone x 12, < 0.5: the style stays in its band); facades.js / farLook.js tint the render with it (Le
 *  Pigeon Noir's ochre-mustard render: the style palette's cream was a pale tan). Off with ?places2=old (looks.tone
 *  dropped by tileData.js lookSet). Other cases: the style unchanged */
export function renderToneStyle(style, type, look) {
  if (type === TYPE.NINETIES || type === TYPE.CURTAIN || !look?.tone || style == null) return style;
  const s = Math.floor(style + 1e-4), t = NINETIES.tones.indexOf(look.tone);
  return (s === 3 || s === 4) && t >= 5 ? s + (t * 12) / 200 : style;
}
/** the sub-look code of a typed style (inverse of typedStyle: 0-83) */
export const typedCode = (style) => Math.round((style - Math.floor(style + 1e-4)) * 200);

function h01(str) {                           // = facadeGeom.js hash01
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000003) / 1000003;
}
function pip(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const pick = (r, table) => { let acc = 0; for (const [v, p] of table) { acc += p; if (r < acc) return v; } return table[table.length - 1][0]; };

// Statbel, Uccle (21016), building stock on 1 January 2023, buildings by construction period (T3.x) and type (R1-R4)
export const STATBEL_UCCLE = {
  closed: { pre1919: 947, p1919: 4342, p1946: 2073, p1971: 761 },          // R1 houses, closed (terraced)
  semi: { pre1919: 207, p1919: 980, p1946: 1431, p1971: 499 },             // R2 houses, semi-open
  open: { pre1919: 117, p1919: 559, p1946: 932, p1971: 568 },              // R3 houses, open (detached), farms, castles
  flats: { pre1919: 157, p1919: 1154, p1946: 1469, p1971: 513 },           // R4 buildings with apartments
};
const shares = (s) => { const t = s.pre1919 + s.p1919 + s.p1946 + s.p1971; return [s.pre1919 / t, s.p1919 / t, s.p1946 / t, s.p1971 / t]; };
const SH = Object.fromEntries(Object.entries(STATBEL_UCCLE).map(([k, v]) => [k, shares(v)]));

/** the period (0 before 1919, 1 1919-45, 2 1946-70, 3 after 1970) for r in [0, 1) from shares x the form's weights */
function period(r, sh, w) {
  const p = sh.map((s, i) => s * w[i]), t = p.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < 4; i++) { acc += p[i] / t; if (r < acc) return i; }
  return 3;
}

// ---- BUILDING-CLASS EVIDENCE (claude/reality1, rule bldclass-evidence, class C1 of docs/REALITY_ROUND_2026-11-26.md).
// The draw above only knows form; 194 steep-roofed solids came out as the post-war balcony block (Institut Montjoie).
// A balcony block now needs evidence; a steep tile roof or a date / an institution says otherwise:
//   - own date (data/bldclass/<T>.json era from the Irismonument inventory / OSM start_date): pre -> MAITRE, inter ->
//     DECO when flat-roofed or modernist else MAITRE, post -> as drawn among the post-war types (DECO / BLOCK)
//   - an institution (OSM building / amenity site, the inventory's "etablissement scolaire"): never BLOCK; steep roof ->
//     MAITRE in face brick, else DECO (window bands, no balconies)
//   - no date: a steep pitched roof (>= 70 % of the roof's plan area at >= 35 deg) never takes BLOCK; the street / neighbour
//     prior (near old / new: >= 3 dated inventory buildings within 40 m, >= 80 % one era) shifts the period weights
// doc._bldclass === true turns it on (viewer/tileData.js applyBuildingEvidence; ?bldclass=old: never set).
export const STEEP_COS = Math.cos((35 * Math.PI) / 180), STEEP_SHARE = 0.7;
const ERA_RANK = { pre: 0, inter: 1, post: 2 };
function mergeEv(a, b) {
  if (!a) return { ...b };
  const o = { ...a };
  if (b.inst && !o.inst) o.inst = b.inst;
  if (b.wall && !o.wall) o.wall = b.wall;
  if (b.era && (!o.era || ERA_RANK[b.era] < ERA_RANK[o.era])) { o.era = b.era; o.year = b.year; }   // the oldest part dates the group
  if (!o.era && b.near && !o.near) o.near = b.near;
  return o;
}
function evWeights(w, ev, steep, h = 0, row = true) {
  if (ev?.era || ev?.inst) return w;                    // decided by evType
  const o = w.slice();
  // (a steep roof dates a ROW front or a small block; a big free-standing block under a steep roof is as often a 1970s-90s
  // residence with balconies and dormers: Av. du Chateau de Walzin 13, Street View 2026-11-26)
  if (steep >= STEEP_SHARE && row) { o[0] = Math.max(o[0], 2); o[2] = 0; o[3] = 0; o[1] *= 0.05; }   // no post-war draw under a steep pitched roof; the interwar flat-banded front rare under one (the flats share of 1919-45 is 7x the pre-1919 one: ~80 % maison de maitre)
  if (ev?.near === "old" && h <= 20) { o[2] *= 0.25; o[3] *= 0.25; }       // (a tower over 20 m among old houses is still post-war)
  else if (ev?.near === "new") { o[0] *= 0.25; o[1] *= 0.5; }
  if (o.every((v) => v === 0)) o[0] = 1;
  return o;
}
/** a front a steep roof can date: built against its neighbours, or a small block (< 350 m2) */
export const steepRow = (g, partyShare) => partyShare > 0.15 || g.area < 350;
function evType(p, ev, flat, steep) {
  if (ev?.inst) return ev.era === "pre" || ev.era === "inter" || (steep >= 0.5 && ev.era !== "post") ? TYPE.MAITRE : TYPE.DECO;   // (Edith Cavell 143: a dated Beaux-Arts school under a mansard)
  if (ev?.era === "pre") return TYPE.MAITRE;
  if (ev?.era === "inter") return flat > 0.6 ? TYPE.DECO : TYPE.MAITRE;
  if (ev?.era === "post") return p === 1 ? TYPE.DECO : TYPE.BLOCK;
  return p === 0 ? TYPE.MAITRE : p === 1 ? TYPE.DECO : TYPE.BLOCK;
}
/** (rule bldclass-evidence) the tile's evidence (data/bldclass/<T>.json solids) onto its buildings: b.attrs._ev, and
 *  doc._bldclass = true; on === false (?bldclass=old): nothing (the draw as before) */
export function applyBuildingEvidence(doc, ev, on = true) {
  if (on === false || !doc?.buildings) return doc;
  doc._bldclass = true;
  const S = ev?.solids || {};
  for (const b of doc.buildings) { const e = S[String(b.id).split("/").pop()]; if (e) b.attrs = { ...(b.attrs || {}), _ev: e }; }
  return doc;
}

/**
 * Types and wall materials of every building of a tile.
 * doc: buildings.json; P / I: the solids' vertices / triangles (buildings.bin). -> { type: Uint8Array, style:
 * Float32Array (the wall style 0-5 as wallStyle() picks it; landmarks keep theirs), garage: Uint8Array (a garage door in
 * the street front's ground floor), form: per building "terraced" | "semi" | "detached" | "block" | "small" }
 * legacyStyle(b, key): the generic façade's wall style (facadeGeom.js wallStyle), for GENERIC buildings.
 */
export function classify(doc, P, I, legacyStyle) {
  const B = doc.buildings, n = B.length;
  const BC = doc._bldclass === true;                   // (claude/reality1, rule bldclass-evidence; ?bldclass=old: off)
  const keyOf = (b) => String(b.attrs?.BU_ID ?? b.id);
  // footprint grid (25 m cells) for the party probes
  const cell = 25, grid = new Map();
  const box = B.map((b) => {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of b.footprint[0]) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    return [x0, z0, x1, z1];
  });
  box.forEach(([x0, z0, x1, z1], bi) => {
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) {
      const k = i * 100003 + j; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(bi);
    }
  });
  const keys = B.map(keyOf);
  const otherAt = (x, z, key) => {
    for (const bi of grid.get(Math.floor(x / cell) * 100003 + Math.floor(z / cell)) || []) {
      const [x0, z0, x1, z1] = box[bi];
      if (keys[bi] !== key && x >= x0 && x <= x1 && z >= z0 && z <= z1 && pip(x, z, B[bi].footprint[0])) return true;
    }
    return false;
  };
  // per BU_ID: area, perimeter, party length, party edge normals, height, eaves, flat roof share, centroid
  const G = new Map();
  B.forEach((b, bi) => {
    const key = keys[bi];
    let g = G.get(key);
    if (!g) G.set(key, (g = { area: 0, per: 0, party: 0, pn: [], h: 0, eaves: 0, flat: 0, steep: 0, roof: 0, cx: 0, cz: 0, w: 0, landmark: false, main: 0, ev: null }));
    if (b.attrs?._landmark) g.landmark = true;
    if (BC && b.attrs?._ev) g.ev = mergeEv(g.ev, b.attrs._ev);   // (rule bldclass-evidence) what open data knows
    const ring = b.footprint[0];
    let a = 0;
    for (let k = 0; k < ring.length; k++) { const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % ring.length]; a += (x0 * z1 - x1 * z0) / 2; }
    const sg = a >= 0 ? 1 : -1;                                  // the ring's turn: outward = (dz, -dx) x sg
    g.area += Math.abs(a);
    for (let k = 0; k < ring.length; k++) {
      const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % ring.length];
      const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.3) continue;
      const nx = sg * (z1 - z0) / L, nz = -sg * (x1 - x0) / L;
      g.per += L;
      // three probes along the edge (a party wall is often only part of an edge)
      let hits = 0;
      for (const t of [0.2, 0.5, 0.8]) if (otherAt(x0 + (x1 - x0) * t + nx * 0.35, z0 + (z1 - z0) * t + nz * 0.35, key)) hits++;
      if (hits >= 2) { g.party += L * hits / 3; g.pn.push([nx, nz, L]); }
    }
    const hh = b.top - b.base;
    if (Math.abs(a) > g.main) { g.main = Math.abs(a); g.eaves = (b.eaves ?? b.top) - b.base; }
    g.h = Math.max(g.h, hh);
    g.cx += (box[bi][0] + box[bi][2]) / 2 * Math.abs(a); g.cz += (box[bi][1] + box[bi][3]) / 2 * Math.abs(a); g.w += Math.abs(a);
    if (P && I) for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) {
      const ia = I[t * 3] * 3, ib = I[t * 3 + 1] * 3, ic = I[t * 3 + 2] * 3;
      const ux = P[ib] - P[ia], uy = P[ib + 1] - P[ia + 1], uz = P[ib + 2] - P[ia + 2], vx = P[ic] - P[ia], vy = P[ic + 1] - P[ia + 1], vz = P[ic + 2] - P[ia + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, L = Math.hypot(cx, cy, cz);
      if (L < 1e-9) continue;
      const ar = Math.abs(cy) / 2;                                // its plan area
      g.roof += ar; if (Math.abs(cy) / L > 0.97) g.flat += ar; else if (Math.abs(cy) / L < STEEP_COS) g.steep += ar;
    }
  });
  const T = new Map();
  for (const [key, g] of G) {
    const flat = g.roof > 0 ? g.flat / g.roof : 0, steep = g.roof > 0 ? g.steep / g.roof : 0;
    const cx = g.w ? g.cx / g.w : 0, cz = g.w ? g.cz / g.w : 0;
    // opposite party walls (both sides built against): terraced
    let opp = false;
    for (let i = 0; i < g.pn.length && !opp; i++) for (let j = i + 1; j < g.pn.length; j++) if (g.pn[i][0] * g.pn[j][0] + g.pn[i][1] * g.pn[j][1] < -0.7) { opp = true; break; }
    const partyShare = g.per > 0 ? g.party / g.per : 0;
    let form;
    if (g.landmark) form = "landmark";
    else if (g.h < 4.5 || g.area < 28) form = "small";
    else if ((g.h >= 13.5 && g.area >= 150) || g.h >= 17 || (g.area >= 650 && g.h >= 9)) form = "block";
    else if (opp || partyShare > 0.3) form = "terraced";
    else if (partyShare > 0.04) form = "semi";
    else form = "detached";
    // the period's draw: half of the buildings take their 60 m cell's draw (rows built in campaigns)
    const rb = h01(key + "|era"), rc = h01(`cell|${Math.floor(cx / 60)}|${Math.floor(cz / 60)}`);
    const r = h01(key + "|eraPick") < 0.5 ? rc : rb;
    const r2 = h01(key + "|type2");
    let type = TYPE.GENERIC;
    const tall = g.eaves >= 9.5, low = g.eaves < 6.2;
    if (form === "block") {
      // weights: pitched-roof blocks lean older, very tall ones are post-war (Uccle's towers: 1960s-70s)
      const w = flat > 0.6 ? [0.5, 1, 1.2, 1.2] : [2, 1.5, 0.7, 0.6];
      if (g.h > 24) { w[0] = 0; w[1] *= 0.15; }
      const p = period(r, SH.flats, BC ? evWeights(w, g.ev, steep, g.h, steepRow(g, partyShare)) : w);
      type = BC ? evType(p, g.ev, flat, steep) : p === 0 ? TYPE.MAITRE : p === 1 ? TYPE.DECO : TYPE.BLOCK;
    } else if ((form === "terraced" || form === "semi") && g.eaves >= 11) {
      // a terraced front of 4+ storeys is a block of flats ("immeuble de rapport"), not a bel-étage house: the flats' shares
      const w = flat > 0.6 ? [0.5, 1, 1.2, 1.2] : [2, 1.5, 0.7, 0.6];
      const p = period(r, SH.flats, BC ? evWeights(w, g.ev, steep, g.h, steepRow(g, partyShare)) : w);
      type = BC ? evType(p, g.ev, flat, steep) : p === 0 ? TYPE.MAITRE : p === 1 ? TYPE.DECO : TYPE.BLOCK;
    } else if (form === "terraced" || (form === "semi" && g.area < 110)) {
      const sh = form === "terraced" ? SH.closed : SH.semi;
      const w = [1, 1, 1, 1];
      if (flat > 0.6) { w[0] *= 0.35; w[2] *= 1.6; w[3] *= 1.6; } else { w[0] *= 1.3; w[2] *= 0.7; }
      if (tall) { w[0] *= 1.4; w[2] *= 0.6; w[3] *= 0.6; }
      if (low) { w[0] *= 0.6; }
      const p = period(r, sh, w);
      // 1919-45: the interwar row is split: traditional bourgeois brick fronts (still "maisons de maître" in type) and
      // the art deco / modernist rendered fronts; the flat roof leans modernist
      type = p === 0 ? TYPE.MAITRE : p === 1 ? (r2 < (flat > 0.6 ? 0.75 : 0.5) ? TYPE.DECO : TYPE.MAITRE) : TYPE.BELETAGE;
    } else if (form === "semi" || form === "detached") {
      const p = period(r, form === "semi" ? SH.semi : SH.open, [1, 1, 1, 1]);
      // detached: villas; an interwar flat-roofed one = a modernist villa (DECO); a large pre-1919 one keeps the
      // maison de maître dress
      if (flat > 0.6) type = p === 1 || r2 < 0.3 ? TYPE.DECO : TYPE.VILLA;
      else type = p === 0 && g.area > 140 && r2 < 0.5 ? TYPE.MAITRE : TYPE.VILLA;
    }
    // the wall material per type (0 red brick, 1 brown / klinker, 2 yellow / beige brick, 3 white render, 4 cream
    // render, 5 grey render / concrete)
    const rs = h01(key + "s");
    const style = type === TYPE.GENERIC ? null : pick(rs, {
      [TYPE.MAITRE]: [[0, 0.4], [1, 0.1], [3, 0.35], [4, 0.15]],
      [TYPE.DECO]: [[3, 0.3], [4, 0.17], [2, 0.23], [0, 0.22], [1, 0.08]],   // (Street View: Rue Vanderkindere's 1930s fronts are red brick with stone bands)
      [TYPE.BELETAGE]: [[2, 0.35], [1, 0.3], [0, 0.25], [3, 0.1]],
      [TYPE.BLOCK]: [[5, 0.25], [3, 0.2], [2, 0.2], [1, 0.13], [0, 0.22]],     // (Avenue Coghen / Churchill: red-brick blocks with long balconies)
      [TYPE.VILLA]: [[3, 0.45], [4, 0.15], [0, 0.35], [2, 0.05]],
    }[type]);
    // a garage door in the street front's ground floor: every bel-étage, 45 % of the villas
    // (rule bldclass-evidence) an institution drawn as an old type is face brick (the schools / convents / churches of
    // the commune: red, a few buff / brown), not the houses' render share
    const styleI = BC && g.ev?.inst && type === TYPE.MAITRE && !g.ev.wall ? pick(rs, [[0, 0.65], [2, 0.2], [1, 0.15]]) : null;
    // (round 3, rule bldclass-evidence) the wall the evidence dates: the inventory style's material (brick = red brick with
    // white stone bands, 15 % the dark klinker; stone = a pale stone / cream render), and a dated pre-1946 maison de maitre
    // with no style word leans brick (Uccle's 1900-1930 fronts: brick + stone far more than render)
    const wl = BC && (type === TYPE.MAITRE || type === TYPE.DECO) ? g.ev?.wall : null;
    const styleW = wl === "brick" ? (h01(key + "|klinker") < 0.15 ? 1 : 0) : wl === "stone" ? 4
      : BC && type === TYPE.MAITRE && (g.ev?.era === "pre" || g.ev?.era === "inter" || g.ev?.near === "old") && !g.ev?.inst ? pick(rs, [[0, 0.6], [1, 0.15], [4, 0.15], [3, 0.1]]) : null;
    const garage = g.ev?.inst && BC ? 0 : type === TYPE.BELETAGE || (type === TYPE.VILLA && h01(key + "|gar") < 0.45) ? 1 : 0;
    T.set(key, { type, style: styleW ?? styleI ?? style, garage, form, flat, steep, row: steepRow(g, partyShare), ev: BC ? g.ev : null });
  }
  const type = new Uint8Array(n), style = new Float32Array(n), garage = new Uint8Array(n), form = new Array(n), steepS = new Float32Array(n), rowS = new Uint8Array(n);
  B.forEach((b, bi) => {
    const t = T.get(keys[bi]);
    type[bi] = t.type; garage[bi] = t.garage; form[bi] = t.form; steepS[bi] = t.steep; rowS[bi] = t.row ? 1 : 0;
    style[bi] = t.style ?? legacyStyle(b, keys[bi]);
  });
  return { type, style, garage, form, steep: steepS, row: rowS };
}

// ---- THE WINDOW GRID PER TYPE (KEEP IN SYNC: viewer/interior/facadeWindows.js faceOpenings, viewer/facades.js
// typeParams). Bays (pier 0.55, ~2.6 m) are the same for every type (the door bay, the ground fit and the kit agree);
// per type the window's width (min(wwMax, wwFrac x bay)), its sill / head as a share of the storey (ground / upper),
// the door's raise over the ground-floor line (a bel-étage entrance up three steps), the storeys' step and k range
// (facadeWindows.js storeyFit: blocks have lower storeys).
//          wwMax wwFrac yaG  ybG  yaS  ybS  raise step  kMin kMax
export const TYPE_GRID = [
  [1.2, 0.52, 0.27, 0.77, 0.29, 0.79, 0.0, 3.25, 0.87, 1.2],     // 0 generic (as before)
  [1.15, 0.46, 0.30, 0.86, 0.20, 0.84, 0.51, 3.25, 0.87, 1.2],   // 1 maison de maître: tall windows, raised entrance
  [2.2, 0.74, 0.30, 0.74, 0.30, 0.76, 0.0, 3.25, 0.87, 1.2],     // 2 art deco: wide, low window bands
  [2.4, 0.82, 0.42, 0.78, 0.22, 0.80, 0.0, 3.25, 0.87, 1.2],     // 3 bel-étage: small high ground lights, a wide window band above
  [2.6, 0.74, 0.30, 0.80, 0.10, 0.84, 0.0, 2.9, 0.82, 1.12],     // 4 block: large glazing, French doors to the balconies
  [1.2, 0.52, 0.27, 0.77, 0.29, 0.79, 0.0, 3.25, 0.87, 1.2],     // 5 villa (as the generic grid: the kit's pieces fit it)
  [2.1, 0.74, 0.30, 0.78, 0.33, 0.80, 0.0, 2.95, 0.8, 1.12],     // 6 1990s house: wide, low windows; lower storeys (2.7-3.1 m)
  [9.0, 1.0, 0.03, 0.80, 0.06, 0.80, 0.0, 3.4, 0.85, 1.15],      // 7 curtain wall: the glass fills the bay, a spandrel over each slab
];
/** the garage door of a type-3 / -5 street front: which bay (never the door's), its width and height (m) */
export function garageBay(nb, doorBay) { return nb < 2 ? -1 : (doorBay + 1) % nb; }
export const GARAGE_H = 2.15;
