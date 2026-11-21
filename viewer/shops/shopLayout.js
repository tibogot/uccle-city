// THE SHOPFRONT LAYOUT (pure JS, runs in the street-life worker; docs/assets/SHOPS.md): one real shop of
// data/streetlife/<T>.json (its OSM point + the façade it sits on, `face`) -> the shopfront kit's pieces
// (viewer/shops/shopKit.js), its window (the interior-mapped glass, viewer/shops/shopWindow.js), its text (the street
// life's SDF boxes: the fascia name, the awning valance, the projecting sign) and its terrace.
//
// The front, read off Street View at Place de Saint-Job / Ch. de Saint-Job / Rue Vanderkindere (look only):
//   classic (painted timber)  pilasters on stone plinth blocks, a panelled stall riser with a moulded sill under each
//                             window bay, a glazed panelled door at one end with a stone step, a framed fascia board
//                             between scroll consoles, a moulded cornice: cafés, restaurants, bakeries, delis,
//                             florists, bookshops (and half of the rest, by a hash)
//   modern (aluminium)        a blue-stone plinth, thin anthracite / black / white frames, roller-shutter guide rails, a
//                             projecting fascia box (or a lightbox), a glass door with a long pull bar: banks,
//                             supermarkets, pharmacies, opticians, phone shops, fast food
// Frame per front: X = right along the wall seen from the street, Y = up, Z = the wall's outward normal; the kit's
// local +z is Z. Records: SHOP_STRIDE floats (x y z yaw, dW dH ys stripes, r g b amount).
import { W0, PIECES } from "./shopPieces.js";
import { v2Slot } from "./shopScale.js";

export const SHOP_PIECES = Object.keys(PIECES);

// heritage paints of the timber fronts (linear rgb): bottle green, oxblood, navy, black, cream, grey-blue, varnished
// oak (La Meute), sage
const CLASSIC = [[0.012, 0.04, 0.025], [0.07, 0.012, 0.013], [0.01, 0.017, 0.045], [0.01, 0.01, 0.011], [0.6, 0.56, 0.45], [0.11, 0.14, 0.16], [0.13, 0.065, 0.025], [0.19, 0.24, 0.17]];
// powder-coat colours of the aluminium fronts: anthracite (most), black, white, silver, bronze
const MODERN = [[0.03, 0.032, 0.035], [0.03, 0.032, 0.035], [0.012, 0.012, 0.013], [0.68, 0.68, 0.66], [0.33, 0.34, 0.35], [0.07, 0.05, 0.035], [0.48, 0.02, 0.02]];   // + 6 signal red (curated: Press Shop)
// awning / parasol canvas: bordeaux, bottle green, navy, black, ecru, terracotta, grey, taupe, light taupe
const CANVAS = [[0.3, 0.025, 0.03], [0.02, 0.1, 0.045], [0.02, 0.035, 0.12], [0.03, 0.03, 0.03], [0.58, 0.53, 0.4], [0.38, 0.09, 0.03], [0.22, 0.22, 0.21], [0.2, 0.17, 0.14], [0.36, 0.3, 0.24]];   // + 7 taupe, 8 light taupe (Le Relais Saint-Job: the canvas in daylight)
const INK_ON_DARK = [[0.95, 0.92, 0.82], [0.97, 0.97, 0.95], [0.78, 0.6, 0.25]];
const INK_ON_LIGHT = [[0.012, 0.012, 0.014], [0.05, 0.012, 0.01], [0.01, 0.025, 0.07]];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const MODERN_CATS = new Set(["bank", "supermarket", "convenience", "pharmacy", "optician", "telecommunication", "mobile_phone", "fast_food", "e-cigarette", "post_office", "travel_agency", "copyshop", "laundry", "dry_cleaning", "hearing_aids", "electronics", "car_repair", "frozen_food"]);
const CLASSIC_CATS = new Set(["cafe", "bar", "pub", "bakery", "pastry", "chocolate", "deli", "cheese", "wine", "florist", "books", "antiques", "jewelry", "watches", "butcher", "caterer", "ice_cream", "tea", "coffee", "confectionery", "beekeeper", "interior_decoration"]);
const AWNING_KINDS = new Set(["cafe", "bar", "restaurant", "bakery", "fastfood"]);
const AWNING_CATS = new Set(["greengrocer", "butcher", "florist", "deli", "cheese", "pastry", "chocolate", "ice_cream", "seafood", "wine", "coffee", "caterer"]);
const PROJECT_KINDS = new Set(["cafe", "bar", "restaurant", "hotel", "bakery", "bank", "fastfood"]);
const TERRACE_KINDS = new Set(["cafe", "bar", "restaurant"]);

/** the interior atlas type (viewer/shops/shopWindow.js INTERIOR_TYPES) of a shop. (shops5) more OSM shop / amenity /
 *  craft values (the POI's `cat`) mapped to the room they look like inside, so fewer fall to the generic shop: second
 *  hand / department store / fabric / tailor / dry cleaning (rails of clothes) -> boutique; health food, tea, tobacco,
 *  pet, variety store -> grocery (shelves of goods); e-cigarette, supplements, herbalist -> pharmacy (small boxes behind
 *  a counter); phone / electronics repair, funeral directors, photographers, garages' and craftsmen's front offices,
 *  surgeries, notaries, guest houses -> office (desks, screens, a reception); pet grooming -> salon. Bikes, books,
 *  furniture, toys, hardware, gifts ... stay generic (shelves of goods + a counter). */
const T_CAFE_K = new Set(["cafe", "bar", "restaurant", "fastfood"]);
const T_CAFE = new Set(["pub", "ice_cream", "fast_food", "cafe", "restaurant", "bar", "biergarten", "food_court"]);
const T_BAKERY = new Set(["bakery", "pastry", "chocolate", "confectionery", "butcher", "cheese", "deli", "seafood", "caterer", "beekeeper", "coffee"]);
const T_PHARMA = new Set(["pharmacy", "optician", "cosmetics", "perfumery", "chemist", "hearing_aids", "medical_supply", "e-cigarette", "nutrition_supplements", "herbalist"]);
const T_BOUTIQUE = new Set(["clothes", "shoes", "jewelry", "watches", "leather", "bag", "fashion_accessories", "boutique", "sports", "department_store", "second_hand", "fabric", "tailor", "dry_cleaning", "bridal", "baby_goods", "charity", "fashion"]);
const T_GROCERY = new Set(["florist", "garden_centre", "supermarket", "convenience", "greengrocer", "general", "frozen_food", "alcohol", "wine", "newsagent", "farm", "organic", "health_food", "food", "tea", "tobacco", "pet", "variety_store", "dairy", "spices", "kiosk", "beverages"]);
const T_OFFICE = new Set(["bank", "travel_agency", "estate_agent", "insurance", "telecommunication", "copyshop", "post_office", "driving_school", "veterinary", "employment_agency",
  "mobile_phone", "electronics_repair", "electronics", "computer", "hifi", "radiotechnics", "appliance", "funeral_directors", "photographer", "studio", "car", "car_repair", "tyres",
  "roofer", "metal_construction", "electrician", "plumber", "carpenter", "builder", "locksmith", "dentist", "doctors", "clinic", "lawyer", "notary", "accountant", "architect",
  "coworking", "guest_house", "hotel", "money_lender", "bureau_de_change", "lottery"]);
const T_SALON = new Set(["hairdresser", "beauty", "massage", "wellness", "tattoo", "nails", "pet_grooming", "hairdresser_supply"]);
export function interiorType(p) {
  const k = p.kind, c = p.cat || "";
  if (T_CAFE_K.has(k) || T_CAFE.has(c)) return 2;
  if (k === "bakery" || T_BAKERY.has(c)) return 0;
  if (k === "pharmacy" || T_PHARMA.has(c)) return 1;
  if (T_BOUTIQUE.has(c)) return 3;
  if (k === "supermarket" || T_GROCERY.has(c)) return 4;
  if (k === "bank" || k === "post" || k === "hotel" || T_OFFICE.has(c)) return 5;
  if (T_SALON.has(c)) return 6;
  return 7;
}

/**
 * one shopfront. env: the layout's helpers { box, label, prop, shop, windows, night, used, hash01, pick, add, twoLines,
 * yawTo, WIN_STRIDE }; p: the POI, f its face; frame { X, Y, Z }; lit 0..1; terraces: curated terraces by POI id.
 * Returns the front's extent (for the terrace).
 */
/** a steep awning from the layout's boxes: top at (u, y) on the wall, `out` m out at `deg` down, canvas slab, front bar,
 *  valance; text on the slope / valance */
function steepAwning(env, at, X, Y, Z, w, y, out, deg, canvas, text, font, valance, vfont, u = 0, inkIn = null) {
  const { box, label, twoLines } = env;
  const drop = out * Math.tan((deg * Math.PI) / 180), L = Math.hypot(out, drop);
  const Ys = [(Z[0] * out) / L, -drop / L, (Z[2] * out) / L];
  let Zo = [X[1] * Ys[2] - X[2] * Ys[1], X[2] * Ys[0] - X[0] * Ys[2], X[0] * Ys[1] - X[1] * Ys[0]];
  if (Zo[1] < 0) Zo = Zo.map((v) => -v);
  // (white letters on a taupe canvas, as the real ones; curated awningInk: Maison Dandoy's beige on black)
  const ink = inkIn ?? (lumOf(canvas) > 0.5 ? [0.03, 0.03, 0.03] : [0.95, 0.94, 0.9]);
  const mid = env.add(at(u, y, 0), Ys, L / 2, Zo, 0.006, X, 0);
  // (a right-handed frame: X x up-the-slope = the face's outward normal; with the down-slope axis it was left-handed:
  // the text face wound inward and culled, browser check 2026-11-16)
  const Yup = Ys.map((v) => -v);
  box(mid, X, Yup, Zo, w, L, 0.012, { board: canvas, ink, lab: text ? label(twoLines(text, 22), font) : null, pad: 0.16, rough: 0.9 });
  const front = at(u, y - drop, out);
  box(env.add(front, Y, -0.015, Z, 0.012, X, 0), X, Y, Z, w + 0.02, 0.03, 0.03, { board: [0.03, 0.03, 0.032], rough: 0.4, metal: 0.5 });
  const vh = env.cur?.front?.valanceH && out > 0.8 ? env.cur.front.valanceH : out > 0.8 ? 0.24 : 0.14;
  box(env.add(front, Y, -vh / 2 - 0.02, Z, 0.02, X, 0), X, Y, Z, w, vh, 0.006, { board: canvas, ink, lab: valance ? label([valance], vfont) : null, pad: 0.05, rough: 0.9 });
}
const lumOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** a front's family and heights (shared with viewer/christmas/xmasCity.js, which hangs garlands on the fronts):
 *  { classic, lowFloor, fasciaY (fascia bottom over the sidewalk), dH (its rise over the kit's nominal 2.55) } */
export function frontFamily(p, f, cur, hash01) {
  const cf = cur?.front || {}, id = p.id;
  // (UrbIS eaves = the solid's LOWEST roof point: a rear annex makes a 4-storey house "low"; curated tall: the real
  // ground floor's height, Street View)
  const lowFloor = cf.tall ? false : f.eaves - f.y < 4.0;
  const fasciaY = lowFloor ? 2.55 : 3.0, dH = fasciaY - 2.55;
  const cat = p.cat || p.kind;
  const classic = cf.family ? cf.family === "classic" : MODERN_CATS.has(cat) || p.kind === "bank" || p.kind === "supermarket" || p.kind === "pharmacy" || p.kind === "fastfood" ? false
    : CLASSIC_CATS.has(cat) || ["cafe", "bar", "bakery"].includes(p.kind) ? true
    : p.kind === "restaurant" ? hash01(id + "fam") < 0.7 : hash01(id + "fam") < 0.5;
  return { classic, lowFloor, fasciaY, dH };
}

export function layoutShop(p, f, frame, lit, env) {
  const { box, label, prop, shop, windows, night, used, hash01, pick, add, twoLines, yawTo, WIN_STRIDE } = env;
  const { X, Y, Z } = frame;
  const base = [f.x, f.y, f.z], id = p.id;
  const W = Math.max(2.0, Math.min(f.w, 9.9));
  const yaw = yawTo(f.nx, f.nz);
  // curated (data/shops/terraces.json "front": checked on Street View): family, paint / canvas (palette index), awning
  const cf = env.cur?.front || {};
  const { lowFloor, fasciaY, dH, classic } = frontFamily(p, f, env.cur, hash01);
  const paint = cf.paint != null ? (classic ? CLASSIC : MODERN)[cf.paint] : classic ? pick(CLASSIC, id, "p") : pick(MODERN, id, "p");
  const lightbox = cf.lightbox ?? (!classic && hash01(id + "lb") < 0.35);
  // (curated) the door, risers and mullions in their own colour (Le Relais Saint-Job: black frames in a white front)
  const framePaint = cf.frame != null ? (classic ? CLASSIC : MODERN)[cf.frame] : paint;
  const at = (u, y = 0, z = 0) => add(base, X, u, Y, y, Z, z);
  const put = (kind, u, y, dW, dHh, tint, amt = 1, stripes = 0) => {
    const o = at(u, y);
    shop(kind, o[0], o[1], o[2], yaw, dW, dHh, PIECES[kind].ys, stripes, tint[0], tint[1], tint[2], amt);
  };
  // ---- the surround
  put(classic ? "front_classic" : "front_modern", 0, 0, W - W0, dH, paint);
  // ---- the door at one end (none on a narrow front), the window bays, their risers and mullions
  const inner = classic ? 0.22 : 0.06;                       // the pilaster / jamb inner face from the front's edge
  const side = hash01(id + "d") < 0.5 ? -1 : 1;
  const hasDoor = W >= 2.6;
  const doorU = side * (W / 2 - inner - 0.57);
  let b0 = -W / 2 + inner, b1 = W / 2 - inner;               // the window run (along X)
  if (hasDoor) {
    put(classic ? "door_classic" : "door_modern", doorU, 0, 0, dH, framePaint);
    if (side < 0) b0 = doorU + 0.57; else b1 = doorU - 0.57;
  }
  const run = b1 - b0;
  put(classic ? "riser_classic" : "riser_modern", (b0 + b1) / 2, 0, run - W0, 0, framePaint);
  const bays = Math.max(1, Math.round(run / (classic ? 1.6 : 2.4)));
  for (let k = 1; k < bays; k++) put("mullion", b0 + run * k / bays, 0, 0, dH, framePaint);
  // ---- the glass: the whole opening between the pilasters (the door's open glass shows the shop too)
  const gx0 = -W / 2 + inner, gx1 = W / 2 - inner, gb = classic ? 0.53 : 0.235, gt = (classic ? 2.29 : 2.47) + dH;
  {
    const wW = gx1 - gx0, wH = gt - gb, o = at((gx0 + gx1) / 2, gb + wH / 2, 0.075);
    const m = new Float32Array(WIN_STRIDE);
    m.set([X[0] * wW, X[1] * wW, X[2] * wW, 0, 0, wH, 0, 0, Z[0], 0, Z[2], 0, o[0], o[1], o[2], 1]);
    m.set([wW, wH, hash01(id + "w"), lit], 16);
    // (curated interior: Lefevre's office); w = the v2 variant (shopScale.js v2Slot: the café type by kind, café /
    // brasserie; (shops7) the other types one of their two rooms by a hash; the neighbour rule may change it
    // afterwards: layout.js)
    const itype = cf.interior ?? interiorType(p);
    m.set([itype, gb, hash01(id + "m") < 0.5 ? 1 : 0, v2Slot(itype, p.kind, p.cat || "", hash01(id + "v"))], 20);
    windows.push(m);
    night.shops.push(o[0] + Z[0] * 0.6, f.y + 1.6, o[2] + Z[2] * 0.6);
    // ?night=1 (viewer/nightLights/cityNight.js): the lit window as a light through its opening, in the facade's own
    // frame (light record: kind 0 = shop window, centre, outward normal, half width / height, colour; NIGHT_LIGHT_STRIDE)
    if (lit > 0) night.lights?.push(0, o[0], o[1], o[2], Z[0], Z[2], wW / 2, wH / 2, 1.0 * lit, 0.86 * lit, 0.66 * lit);
  }
  // ---- the name on the fascia (the street life's SDF box on the fascia's sign panel)
  const style = pick(["shopSans", "shopSerif", "shopHumanist", "shopItalic"], id, "f");
  // (curated) the fascia's own text (sign: a line or lines; "" = a plain board), font and board colour (Street View)
  const signLines = cf.sign != null ? [].concat(cf.sign) : p.name ? [p.name] : [];
  const lab = signLines.some((l) => l) ? label(signLines, cf.font ?? (classic && style === "shopSans" ? "shopSerif" : style)) : null;
  if (p.name) used.names.push(p.name);
  const board = cf.board ?? (lightbox ? [0.86, 0.86, 0.84] : paint);
  const ink = cf.ink ?? (lum(board) > 0.18 ? pick(INK_ON_LIGHT, id, "i") : (classic ? pick(INK_ON_DARK, id, "i") : [0.97, 0.97, 0.95]));   // (curated: a brand colour, linear rgb)
  const sign = cf.spots || (classic && hash01(id + "s") < 0.55) ? "spots" : classic ? "paint" : lightbox ? "lightbox" : "backlit";
  const inkGlow = sign === "backlit" ? 1.6 * lit : sign === "spots" ? 0.35 * lit : 0, boardGlow = sign === "lightbox" ? 1.1 * lit : sign === "spots" ? 0.3 * lit : 0;
  if (cf.fascia === false) {
    // (curated: no name board, the awning carries the name: Le Relais Saint-Job)
  } else if (classic) {
    // the panel inside the moulded frame, between the consoles (shopfronts.py: |x| < W/2 - 0.2, 0.04 .. 0.71 up)
    const pw = W - 0.48, ph = 0.6;
    box(at(0, fasciaY + 0.375, 0.221), X, Y, Z, pw, ph, 0.006, { board, ink, inkGlow, boardGlow, lab, fill: cf.signFill ?? 1.0, padX: 0.12, rough: 0.42, kind: 2 });
  } else {
    box(at(0, fasciaY + 0.325, 0.273), X, Y, Z, W + 0.08, 0.6, 0.006, { board, ink, inkGlow, boardGlow, lab, fill: cf.signFill ?? 1.05, padX: 0.2, rough: lightbox ? 0.3 : 0.4, kind: 2 });
  }
  // (curated) plaques on the fascia: [{ u, w, h, dy, text, board, ink, font }] (White Night's WHITE | NIGHT halves, Proxy's
  // white panel on the black band): thin boxes 1 cm proud of the fascia face
  for (const pl of cf.plaques || []) {
    const zf = cf.fascia === false ? 0.02 : classic ? 0.221 + 0.009 : 0.273 + 0.009, yc = (classic ? fasciaY + 0.375 : fasciaY + 0.325) + (pl.dy ?? 0);
    const plab = pl.text ? label([].concat(pl.text), pl.font ?? "shopSans") : null;
    box(at(pl.u ?? 0, yc, zf), X, Y, Z, pl.w, pl.h ?? 0.46, 0.008, { board: pl.board ?? [0.86, 0.86, 0.84], ink: pl.ink ?? [0.02, 0.02, 0.02], lab: plab, fill: pl.fill ?? 0, pad: 0.1, rough: 0.4, kind: 2,
      inkGlow: (pl.glow ?? 0) * lit, boardGlow: (pl.boardGlow ?? 0) * lit });   // (a lit panel at night: White Night's WHITE half)
  }
  // (curated) a band across the head of the glass: [text, board, ink, font, h] (Bois Savanes' RESTAURANT THAÏ TRAITEUR,
  // Lefevre's name plate)
  if (cf.subSign) {
    const [st, sb, si, sf, sh] = cf.subSign, hh = sh ?? 0.24;
    box(at((gx0 + gx1) / 2, gt - hh / 2 - 0.02, 0.095), X, Y, Z, gx1 - gx0, hh, 0.01, { board: sb ?? [0.02, 0.02, 0.022], ink: si ?? [0.78, 0.62, 0.3], lab: st ? label([st], sf ?? "shopSerif") : null, pad: 0.12, rough: 0.45, kind: 2 });
  }
  if (sign === "spots" && !lowFloor) {
    const k = W > 4.5 ? 3 : 2;
    for (let i = 0; i < k; i++) {
      const o = at((i - (k - 1) / 2) * (W / k), fasciaY + (classic ? 0.97 : 0.69), classic ? 0.18 : 0.12);
      prop("spot", o[0], o[1], o[2], yaw);
      night.spots.push(...add(o, X, 0, Y, 0.1, Z, 0.55));
    }
  } else night.signs.push(...at(0, fasciaY + 0.35, 0.5));
  // ?night=1: the fascia's light (kind 1, a sign: half a metre out, the colour of what glows: the letters when backlit,
  // the board when a lightbox, the warm goosenecks' wash on the board; a painted board gives none)
  if (lit > 0 && sign !== "paint") {
    const c = sign === "backlit" ? ink : sign === "lightbox" ? [0.95, 0.95, 0.92] : [1.0, 0.8, 0.55], k = sign === "spots" ? 0.8 : 1;
    const o = at(0, fasciaY + 0.35, 0.5);
    night.lights?.push(1, o[0], o[1], o[2], Z[0], Z[2], W / 2, 0.3, c[0] * k * lit, c[1] * k * lit, c[2] * k * lit);
  }
  // ---- awning (food and fresh shops), the name on its valance
  const awn = cf.awning ?? ((AWNING_KINDS.has(p.kind) || AWNING_CATS.has(p.cat)) && !lowFloor && hash01(id + "aw") < 0.8);
  if (awn && cf.awningStyle === "steep") {
    // (curated) a STEEP traditional awning (Le Relais Saint-Job, ~33 deg): built from the layout's boxes, no cassette;
    // the script name on its slope (seen from the street), the section's name on the valance
    const canvas = cf.canvas != null ? CANVAS[cf.canvas] : pick(CANVAS, id, "c");
    steepAwning(env, at, X, Y, Z, W - 0.1, fasciaY + (cf.fascia === false ? 0.55 : 0), cf.awningOut ?? 1.25, cf.awningDeg ?? 33, canvas, cf.awningText, cf.awningFont ?? "shopItalic", cf.valance ?? p.name, cf.valanceFont ?? "shopSerif", 0, cf.awningInk ?? null);
    for (const ua of cf.upperAwnings || []) {
      // small awnings over first-floor windows: [u (m along the front), y (m over the shop floor), width, text, valance]
      steepAwning(env, at, X, Y, Z, ua[2], ua[1], 0.55, 38, canvas, ua[3] ?? null, cf.awningFont ?? "shopItalic", ua[4] ?? null, cf.valanceFont ?? "shopSerif", ua[0], cf.awningInk ?? null);
    }
  } else if (awn) {
    const canvas = cf.canvas != null ? CANVAS[cf.canvas] : pick(CANVAS, id, "c"), stripes = cf.stripes ?? (hash01(id + "st") < 0.3) ? 0.24 : 0;
    put("awning", 0, fasciaY, W - W0, 0, canvas, 1, stripes);
    const vtext = cf.valance ?? p.name;
    const vlab = vtext ? label([vtext], cf.valanceFont ?? "shopSans") : null;
    // (curated) the name printed on the awning's slope (Le Relais Saint-Job: "RELAIS saint-job" in a script): a thin
    // label box laid on the canvas, 1.78 m out / 0.6 m down from the fascia line
    if (cf.awningText) {
      const sl = [Z[0] * 1.72, -0.58, Z[2] * 1.72], L = Math.hypot(...sl), Ys = sl.map((v) => v / L);
      // the canvas's outward normal: X x Ys or its opposite, the one pointing up
      let Zo = [X[1] * Ys[2] - X[2] * Ys[1], X[2] * Ys[0] - X[0] * Ys[2], X[0] * Ys[1] - X[1] * Ys[0]];
      if (Zo[1] < 0) Zo = Zo.map((v) => -v);
      const mid = add(at(0, fasciaY, 0), Ys, L * 0.45, Zo, 0.015, X, 0);
      const alab = label(twoLines(cf.awningText, 22), cf.awningFont ?? "shopItalic");
      box(mid, X, Ys, Zo, Math.min(W - 0.6, 3.2), Math.min(0.9, L * 0.55), 0.002, { board: canvas, ink: lum(canvas) > 0.25 ? [0.03, 0.03, 0.03] : [0.93, 0.91, 0.86], lab: alab, pad: 0.06, rough: 0.88 });
    }
    const vink = lum(canvas) > 0.25 ? [0.03, 0.03, 0.03] : [0.9, 0.87, 0.78];
    // the valance (shopfronts.py: 1.775 m out, 0.595 .. 0.835 m under the fascia bottom)
    // (curated valanceFill: the letters' row as a share of the valance height, Uccle Flore's big capitals)
    box(at(0, fasciaY - 0.715, 1.779), X, Y, Z, W - 0.1, 0.2, 0.004, { board: stripes ? [0.72, 0.68, 0.58] : canvas, ink: stripes ? [0.03, 0.03, 0.03] : cf.awningInk ?? vink, lab: vlab, pad: 0.08, fill: cf.valanceFill ?? 0, rough: 0.88 });
  }
  // ---- projecting sign (double-sided) or the pharmacy's green cross, at the shopfront's door end
  const pend = Math.min(f.u + W / 2 + 0.3, f.edgeL - 0.3) - f.u;
  const px = Math.abs(pend) < W / 2 + 0.2 ? -(W / 2 + 0.3) : pend;
  if (p.kind === "pharmacy") {
    const o = at(px, fasciaY + 0.45);
    prop("cross", o[0], o[1], o[2], yaw);
    night.signs.push(o[0] + Z[0] * 0.8, o[1], o[2] + Z[2] * 0.8);
    night.lights?.push(1, o[0] + Z[0] * 0.8, o[1], o[2] + Z[2] * 0.8, Z[0], Z[2], 0.3, 0.3, 0.12, 1.0, 0.3);   // (the green cross: lit all night)
  } else if (cf.blade === false) {
    // (curated) no projecting sign (Street View shows none)
  } else if (cf.blade) {
    // (curated) a projecting sign of the shop's own shape and colours: { text, board, ink, font, w, h, y (centre, m over
    // the shop floor), vertical (the text reads upward: Proxy's tall red sign) }
    const bl = cf.blade, bw = bl.w ?? 0.66, bh = bl.h ?? 0.62, by = bl.y ?? fasciaY + 0.56;
    put("blade", px, by + bh / 2 + 0.01, 0, 0, [0, 0, 0], 0);
    const Xs = [-Z[0], 0, -Z[2]], Zs = X;
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const Xt = bl.vertical ? Y : Xs, Yt = bl.vertical ? cross(Zs, Y) : Y;
    const blab = bl.text ? label([].concat(bl.text), bl.font ?? "shopSans") : null;
    box(at(px, by, 0.55), Xt, Yt, Zs, bl.vertical ? bh : bw, bl.vertical ? bw : bh, 0.045, { board: bl.board ?? [0.86, 0.86, 0.84], ink: bl.ink ?? [0.02, 0.02, 0.025], inkGlow: 1.2 * lit, lab: blab, pad: 0.1, sides: 1, border: 0.018, rough: 0.45, kind: 3 });
    night.signs.push(...at(px, by, 0.55));
  } else if (PROJECT_KINDS.has(p.kind) && p.name && !lowFloor) {
    put("blade", px, fasciaY + 0.95, 0, 0, [0, 0, 0], 0);
    const plab = label(twoLines(p.name, 11), pick(["shopSans", "shopSerif", "shopHumanist"], id, "j"));
    const Xs = [-Z[0], 0, -Z[2]], Zs = X;
    box(at(px, fasciaY + 0.95 - 0.39, 0.55), Xs, Y, Zs, 0.66, 0.62, 0.045, { board: classic ? paint : [0.86, 0.86, 0.84], ink: classic ? ink : [0.02, 0.02, 0.025], inkGlow: 1.2 * lit, lab: plab, pad: 0.12, sides: 1, border: 0.018, rough: 0.45, kind: 3 });
    night.signs.push(...at(px, fasciaY + 0.56, 0.55));
    if (lit > 0) { const o = at(px, fasciaY + 0.56, 0.55), c = classic ? ink : [0.95, 0.95, 0.92]; night.lights?.push(1, o[0], o[1], o[2], Z[0], Z[2], 0.33, 0.31, c[0] * 1.2 * lit, c[1] * 1.2 * lit, c[2] * 1.2 * lit); }
  }
  // ---- ATM in a bank's front (on the glass, away from the door)
  if (p.atm) {
    const ax = hasDoor ? (b0 + b1) / 2 : 0;
    box(at(ax, 1.3, 0.11), X, Y, Z, 0.6, 0.9, 0.06, { board: [0.05, 0.055, 0.06], rough: 0.35, metal: 0.6 });
    box(at(ax, 1.42, 0.142), X, Y, Z, 0.34, 0.24, 0.01, { board: [0.06, 0.16, 0.2], boardGlow: 1.2, rough: 0.15 });
  }
  // (curated) wine barrels on the pavement (Le Relais Saint-Job's traiteur): [[u, m out], ...]
  for (const [u, z] of cf.barrels || []) { const o = at(u, 0, z); prop("barrel", o[0], o[1], o[2], yaw + u); }
  // (curated) a chalk A-board on the pavement: [u along the front, m out from the wall]
  if (cf.aboard) {
    const [u, z] = cf.aboard, o = at(u, 0, z), tilt = 0.17;
    for (const sd of [1, -1]) {
      const Yb = [Z[0] * sd * Math.sin(tilt), Math.cos(tilt), Z[2] * sd * Math.sin(tilt)];
      const Zb = [X[1] * Yb[2] - X[2] * Yb[1], X[2] * Yb[0] - X[0] * Yb[2], X[0] * Yb[1] - X[1] * Yb[0]];
      // (Zb = X x Yb: a right-handed frame, whichever way the board leans)
      box(add(o, Yb, 0.45, Zb, 0.02, X, 0), X, Yb, Zb, 0.55, 0.9, 0.025, { board: [0.025, 0.03, 0.026], border: 0.03, rough: 0.9 });
    }
  }
  return { W, classic, paint, yaw, doorU: hasDoor ? doorU : null, awning: awn };
}

/**
 * the terrace of a café / restaurant / bar: CURATED (data/shops/terraces.json, checked on Street View: the real
 * terraces of Place de Saint-Job and elsewhere) or by rule (OSM outdoor_seating, the paved depth in front minus a 1.6 m
 * walking passage). Tables (square bistro, 2-4 chairs), square parasols where it is deep enough, a hedge of planters
 * along the outer edge where the reference shows one. Colliders: env.collide(kind, x, y, z, yaw).
 */
export function layoutTerrace(p, f, frame, front, cur, env) {
  const { prop, shop, add, hash01, pick, yawTo, collide } = env;
  const { X, Y, Z } = frame;
  const base = [f.x, f.y, f.z], id = p.id;
  let depth, from, to, hedge, parasols, start;
  if (cur && !cur.none && cur.depth == null) cur = null;           // (a curated FRONT only: the terrace by rule)
  if (cur) {
    if (cur.none) return 0;
    depth = cur.depth; from = cur.from ?? -front.W / 2; to = cur.to ?? front.W / 2; hedge = !!cur.hedge; parasols = cur.parasols ?? depth >= 2.4; start = cur.start ?? 0.35;
  } else {
    const usable = Math.min((f.pave ?? 0) - 1.6, 3.4);
    const ok = p.seating !== "no" && (p.seating === "yes" || TERRACE_KINDS.has(p.kind)) && usable >= 1.1;
    if (!ok) return 0;
    depth = usable; from = -front.W / 2 + 0.2; to = front.W / 2 - 0.2; hedge = false; parasols = usable >= 2.6 && p.kind !== "fastfood"; start = 0.3;
    if (front.awning) start = 0.25;
  }
  // leave the door clear (a 1.1 m gap in front of it)
  const door = front.doorU;
  const canvas = cur?.parasol != null ? CANVAS[cur.parasol] : pick(CANVAS, id, "c");
  const at = (u, z) => add(base, X, u, Y, 0, Z, z);
  let n = 0;
  const rows = depth >= 2.5 ? 2 : 1, rowZ = (r) => start + 0.55 + r * 1.3;
  const pitch = 1.55;
  const cols = Math.max(1, Math.floor((to - from) / pitch));
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const u = from + (k + 0.5) * ((to - from) / cols);
    if (door != null && Math.abs(u - door) < 0.95 && r === 0) continue;
    const zz = rowZ(r);
    if (zz + 0.6 > start + depth) continue;
    const o = at(u, zz);
    shop("table_sq", o[0], o[1], o[2], yawTo(Z[0], Z[2]), 0, 0, 99, 0, 0, 0, 0, 0);
    collide("table", o[0], o[1], o[2], yawTo(Z[0], Z[2]));
    // chairs: left / right of the table (facing it), a third on the street side on a deep row
    for (const s of [-1, 1]) {
      const c = add(o, X, s * 0.56, Y, 0, Z, 0);
      prop("chair", c[0], c[1], c[2], yawTo(X[0] * -s, X[2] * -s) + Math.PI);
    }
    if (rows === 1 && depth >= 1.9) { const c = add(o, Z, 0.56, Y, 0, X, 0); prop("chair", c[0], c[1], c[2], yawTo(-Z[0], -Z[2]) + Math.PI); }
    n++;
  }
  // parasols: clear of an awning (it reaches 1.8 m out; a parasol's canopy 1.3 m round its mast)
  let pz = start + Math.min(depth, 2.6) / 2 + 0.1;
  if (front.awning) pz = Math.max(pz, 1.8 + 1.35);
  if (pz > start + depth + 0.2) parasols = false;
  if (parasols && n) for (let k = 0; k < cols; k += 2) {
    const u = from + (k + 0.5 + (cols > 1 ? 0.5 : 0)) * ((to - from) / cols);
    if (u > to) break;
    const o = at(u, pz);
    shop("parasol_sq", o[0], o[1], o[2], yawTo(Z[0], Z[2]), 0, 0, 99, 0, canvas[0], canvas[1], canvas[2], 1);
    collide("parasol", o[0], o[1], o[2], 0);
  }
  if (hedge) {
    // planters along the outer edge (1.0 m long each, 10 cm apart), the entrance gap in front of the door
    const z = start + depth + 0.21;
    for (let u = from + 0.5; u <= to - 0.45; u += 1.1) {
      if (door != null && Math.abs(u - door) < 0.75) continue;
      const o = at(u, z);
      shop("planter", o[0], o[1], o[2], yawTo(Z[0], Z[2]), 0, 0, 99, 0, 0, 0, 0, 0);
      collide("planter", o[0], o[1], o[2], yawTo(Z[0], Z[2]));
    }
  }
  return n;
}
