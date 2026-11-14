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

export const SHOP_PIECES = Object.keys(PIECES);

// heritage paints of the timber fronts (linear rgb): bottle green, oxblood, navy, black, cream, grey-blue, varnished
// oak (La Meute), sage
const CLASSIC = [[0.012, 0.04, 0.025], [0.07, 0.012, 0.013], [0.01, 0.017, 0.045], [0.01, 0.01, 0.011], [0.6, 0.56, 0.45], [0.11, 0.14, 0.16], [0.13, 0.065, 0.025], [0.19, 0.24, 0.17]];
// powder-coat colours of the aluminium fronts: anthracite (most), black, white, silver, bronze
const MODERN = [[0.03, 0.032, 0.035], [0.03, 0.032, 0.035], [0.012, 0.012, 0.013], [0.68, 0.68, 0.66], [0.33, 0.34, 0.35], [0.07, 0.05, 0.035]];
// awning / parasol canvas: bordeaux, bottle green, navy, black, ecru, terracotta, grey
const CANVAS = [[0.3, 0.025, 0.03], [0.02, 0.1, 0.045], [0.02, 0.035, 0.12], [0.03, 0.03, 0.03], [0.58, 0.53, 0.4], [0.38, 0.09, 0.03], [0.22, 0.22, 0.21]];
const INK_ON_DARK = [[0.95, 0.92, 0.82], [0.97, 0.97, 0.95], [0.78, 0.6, 0.25]];
const INK_ON_LIGHT = [[0.012, 0.012, 0.014], [0.05, 0.012, 0.01], [0.01, 0.025, 0.07]];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const MODERN_CATS = new Set(["bank", "supermarket", "convenience", "pharmacy", "optician", "telecommunication", "mobile_phone", "fast_food", "e-cigarette", "post_office", "travel_agency", "copyshop", "laundry", "dry_cleaning", "hearing_aids", "electronics", "car_repair", "frozen_food"]);
const CLASSIC_CATS = new Set(["cafe", "bar", "pub", "bakery", "pastry", "chocolate", "deli", "cheese", "wine", "florist", "books", "antiques", "jewelry", "watches", "butcher", "caterer", "ice_cream", "tea", "coffee", "confectionery", "beekeeper", "interior_decoration"]);
const AWNING_KINDS = new Set(["cafe", "bar", "restaurant", "bakery", "fastfood"]);
const AWNING_CATS = new Set(["greengrocer", "butcher", "florist", "deli", "cheese", "pastry", "chocolate", "ice_cream", "seafood", "wine", "coffee", "caterer"]);
const PROJECT_KINDS = new Set(["cafe", "bar", "restaurant", "hotel", "bakery", "bank", "fastfood"]);
const TERRACE_KINDS = new Set(["cafe", "bar", "restaurant"]);

/** the interior atlas type (viewer/shops/shopWindow.js INTERIOR_TYPES) of a shop */
export function interiorType(p) {
  const k = p.kind, c = p.cat || "";
  if (["cafe", "bar", "restaurant", "fastfood"].includes(k) || ["pub", "ice_cream", "fast_food", "cafe", "restaurant", "bar"].includes(c)) return 2;
  if (k === "bakery" || ["bakery", "pastry", "chocolate", "confectionery", "butcher", "cheese", "deli", "seafood", "caterer", "beekeeper"].includes(c)) return 0;
  if (k === "pharmacy" || ["pharmacy", "optician", "cosmetics", "perfumery", "chemist", "hearing_aids", "medical_supply"].includes(c)) return 1;
  if (["clothes", "shoes", "jewelry", "watches", "leather", "bag", "fashion_accessories", "boutique", "sports"].includes(c)) return 3;
  if (k === "supermarket" || ["supermarket", "convenience", "greengrocer", "general", "frozen_food", "alcohol", "wine", "newsagent", "farm", "organic"].includes(c)) return 4;
  if (k === "bank" || k === "post" || ["bank", "travel_agency", "estate_agent", "insurance", "telecommunication", "copyshop", "post_office", "driving_school", "veterinary", "employment_agency"].includes(c)) return 5;
  if (["hairdresser", "beauty", "massage", "wellness", "tattoo", "nails"].includes(c)) return 6;
  return 7;
}

/**
 * one shopfront. env: the layout's helpers { box, label, prop, shop, windows, night, used, hash01, pick, add, twoLines,
 * yawTo, WIN_STRIDE }; p: the POI, f its face; frame { X, Y, Z }; lit 0..1; terraces: curated terraces by POI id.
 * Returns the front's extent (for the terrace).
 */
export function layoutShop(p, f, frame, lit, env) {
  const { box, label, prop, shop, windows, night, used, hash01, pick, add, twoLines, yawTo, WIN_STRIDE } = env;
  const { X, Y, Z } = frame;
  const base = [f.x, f.y, f.z], id = p.id;
  const W = Math.max(2.0, Math.min(f.w, 9.9));
  const yaw = yawTo(f.nx, f.nz);
  const lowFloor = f.eaves - f.y < 4.0;
  const fasciaY = lowFloor ? 2.55 : 3.0, dH = fasciaY - 2.55;
  const cat = p.cat || p.kind;
  const classic = MODERN_CATS.has(cat) || p.kind === "bank" || p.kind === "supermarket" || p.kind === "pharmacy" || p.kind === "fastfood" ? false
    : CLASSIC_CATS.has(cat) || ["cafe", "bar", "bakery"].includes(p.kind) ? true
    : p.kind === "restaurant" ? hash01(id + "fam") < 0.7 : hash01(id + "fam") < 0.5;
  const paint = classic ? pick(CLASSIC, id, "p") : pick(MODERN, id, "p");
  const lightbox = !classic && hash01(id + "lb") < 0.35;
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
    put(classic ? "door_classic" : "door_modern", doorU, 0, 0, dH, paint);
    if (side < 0) b0 = doorU + 0.57; else b1 = doorU - 0.57;
  }
  const run = b1 - b0;
  put(classic ? "riser_classic" : "riser_modern", (b0 + b1) / 2, 0, run - W0, 0, paint);
  const bays = Math.max(1, Math.round(run / (classic ? 1.6 : 2.4)));
  for (let k = 1; k < bays; k++) put("mullion", b0 + run * k / bays, 0, 0, dH, paint);
  // ---- the glass: the whole opening between the pilasters (the door's open glass shows the shop too)
  {
    const gx0 = -W / 2 + inner, gx1 = W / 2 - inner, gb = classic ? 0.53 : 0.235, gt = (classic ? 2.29 : 2.47) + dH;
    const wW = gx1 - gx0, wH = gt - gb, o = at((gx0 + gx1) / 2, gb + wH / 2, 0.075);
    const m = new Float32Array(WIN_STRIDE);
    m.set([X[0] * wW, X[1] * wW, X[2] * wW, 0, 0, wH, 0, 0, Z[0], 0, Z[2], 0, o[0], o[1], o[2], 1]);
    m.set([wW, wH, hash01(id + "w"), lit], 16);
    m.set([interiorType(p), gb, hash01(id + "m") < 0.5 ? 1 : 0, 0], 20);
    windows.push(m);
    night.shops.push(o[0] + Z[0] * 0.6, f.y + 1.6, o[2] + Z[2] * 0.6);
  }
  // ---- the name on the fascia (the street life's SDF box on the fascia's sign panel)
  const style = pick(["shopSans", "shopSerif", "shopHumanist", "shopItalic"], id, "f");
  const lab = p.name ? label([p.name], classic && style === "shopSans" ? "shopSerif" : style) : null;
  if (p.name) used.names.push(p.name);
  const board = lightbox ? [0.86, 0.86, 0.84] : paint;
  const ink = lum(board) > 0.18 ? pick(INK_ON_LIGHT, id, "i") : (classic ? pick(INK_ON_DARK, id, "i") : [0.97, 0.97, 0.95]);
  const sign = classic ? (hash01(id + "s") < 0.55 ? "spots" : "paint") : lightbox ? "lightbox" : "backlit";
  const inkGlow = sign === "backlit" ? 1.6 * lit : sign === "spots" ? 0.35 * lit : 0, boardGlow = sign === "lightbox" ? 1.1 * lit : sign === "spots" ? 0.3 * lit : 0;
  if (classic) {
    // the panel inside the moulded frame, between the consoles (shopfronts.py: |x| < W/2 - 0.2, 0.04 .. 0.71 up)
    const pw = W - 0.48, ph = 0.6;
    box(at(0, fasciaY + 0.375, 0.221), X, Y, Z, pw, ph, 0.006, { board, ink, inkGlow, boardGlow, lab, fill: 1.0, padX: 0.12, rough: 0.42, kind: 2 });
  } else {
    box(at(0, fasciaY + 0.325, 0.273), X, Y, Z, W + 0.08, 0.6, 0.006, { board, ink, inkGlow, boardGlow, lab, fill: 1.05, padX: 0.2, rough: lightbox ? 0.3 : 0.4, kind: 2 });
  }
  if (sign === "spots" && !lowFloor) {
    const k = W > 4.5 ? 3 : 2;
    for (let i = 0; i < k; i++) {
      const o = at((i - (k - 1) / 2) * (W / k), fasciaY + 0.97, 0.18);
      prop("spot", o[0], o[1], o[2], yaw);
      night.spots.push(...add(o, X, 0, Y, 0.1, Z, 0.55));
    }
  } else night.signs.push(...at(0, fasciaY + 0.35, 0.5));
  // ---- awning (food and fresh shops), the name on its valance
  const awn = (AWNING_KINDS.has(p.kind) || AWNING_CATS.has(p.cat)) && !lowFloor && hash01(id + "aw") < 0.8;
  if (awn) {
    const canvas = pick(CANVAS, id, "c"), stripes = hash01(id + "st") < 0.3 ? 0.24 : 0;
    put("awning", 0, fasciaY, W - W0, 0, canvas, 1, stripes);
    const vlab = p.name ? label([p.name], "shopSans") : null;
    const vink = lum(canvas) > 0.25 ? [0.03, 0.03, 0.03] : [0.9, 0.87, 0.78];
    // the valance (shopfronts.py: 1.775 m out, 0.595 .. 0.835 m under the fascia bottom)
    box(at(0, fasciaY - 0.715, 1.779), X, Y, Z, W - 0.1, 0.2, 0.004, { board: stripes ? [0.72, 0.68, 0.58] : canvas, ink: stripes ? [0.03, 0.03, 0.03] : vink, lab: vlab, pad: 0.08, rough: 0.88 });
  }
  // ---- projecting sign (double-sided) or the pharmacy's green cross, at the shopfront's door end
  const pend = Math.min(f.u + W / 2 + 0.3, f.edgeL - 0.3) - f.u;
  const px = Math.abs(pend) < W / 2 + 0.2 ? -(W / 2 + 0.3) : pend;
  if (p.kind === "pharmacy") {
    const o = at(px, fasciaY + 0.45);
    prop("cross", o[0], o[1], o[2], yaw);
    night.signs.push(o[0] + Z[0] * 0.8, o[1], o[2] + Z[2] * 0.8);
  } else if (PROJECT_KINDS.has(p.kind) && p.name && !lowFloor) {
    put("blade", px, fasciaY + 0.95, 0, 0, [0, 0, 0], 0);
    const plab = label(twoLines(p.name, 11), pick(["shopSans", "shopSerif", "shopHumanist"], id, "j"));
    const Xs = [-Z[0], 0, -Z[2]], Zs = X;
    box(at(px, fasciaY + 0.95 - 0.39, 0.55), Xs, Y, Zs, 0.66, 0.62, 0.045, { board: classic ? paint : [0.86, 0.86, 0.84], ink: classic ? ink : [0.02, 0.02, 0.025], inkGlow: 1.2 * lit, lab: plab, pad: 0.12, sides: 1, border: 0.018, rough: 0.45, kind: 3 });
    night.signs.push(...at(px, fasciaY + 0.56, 0.55));
  }
  // ---- ATM in a bank's front (on the glass, away from the door)
  if (p.atm) {
    const ax = hasDoor ? (b0 + b1) / 2 : 0;
    box(at(ax, 1.3, 0.11), X, Y, Z, 0.6, 0.9, 0.06, { board: [0.05, 0.055, 0.06], rough: 0.35, metal: 0.6 });
    box(at(ax, 1.42, 0.142), X, Y, Z, 0.34, 0.24, 0.01, { board: [0.06, 0.16, 0.2], boardGlow: 1.2, rough: 0.15 });
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
  const canvas = pick(CANVAS, id, "c");
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
  if (parasols && n) for (let k = 0; k < cols; k += 2) {
    const u = from + (k + 0.5 + (cols > 1 ? 0.5 : 0)) * ((to - from) / cols);
    if (u > to) break;
    const o = at(u, start + Math.min(depth, 2.6) / 2 + 0.1);
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
