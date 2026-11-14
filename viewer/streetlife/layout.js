// THE STREET-LIFE LAYOUT (pure JS, runs in the street-life worker): one tile's data/streetlife/<T>.json -> instances.
//
//  boxes  : every boxy thing as ONE textured unit box (fascia boards, shop frames, projecting signs, awnings, plates,
//           house numbers, the fuel canopy and its price pylon, stop flags, shelters, the Villo terminal, ATM panels),
//           BOX_STRIDE floats each: the matrix (column-major), then label index, text box, board, ink, size, misc
//  props  : per kit kind (kits.js), PROP_STRIDE floats each: x, y, z, yaw, tint rgb + amount
//  windows: shop windows (the parallax interior, vendor/slop-street), WIN_STRIDE floats: matrix, w, h, seed, lit
//  glass  : shelter panes (see-through, their own small draw), matrix + size
//  labels : the text the boxes show: { key, lines, style } (rasterised into SDF by the worker, packed by the main thread)
// Text is copied from the data (names, brands, FR / NL street names, house numbers, stop names, line numbers, fuel
// grades); a POI without a name gets a blank fascia. Colours are a neutral palette chosen per POI by a hash (no brand
// colours, no logos).
// Frame per façade POI: X = right along the wall seen from the street, Y = up, Z = the wall's outward normal.

import { layoutShop, layoutTerrace, SHOP_PIECES } from "../shops/shopLayout.js";

// WIN_STRIDE: the matrix, (w, h, seed, lit), (interior type, floor below the glass, mirror, 0) (viewer/shops/shopWindow.js)
export const BOX_STRIDE = 40, PROP_STRIDE = 8, WIN_STRIDE = 24, GLASS_STRIDE = 16;

export function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const pick = (arr, id, salt = "") => arr[Math.floor(hash01(id + salt) * arr.length) % arr.length];

// neutral shopfront paints (linear rgb), inks, canvas
const PAINT = [[0.012, 0.035, 0.022], [0.06, 0.012, 0.014], [0.012, 0.018, 0.05], [0.012, 0.012, 0.013], [0.32, 0.29, 0.22], [0.09, 0.09, 0.085], [0.025, 0.045, 0.06],
  [0.78, 0.77, 0.73], [0.62, 0.55, 0.42], [0.5, 0.52, 0.5]];
const INK_ON_DARK = [[0.95, 0.92, 0.82], [0.97, 0.97, 0.95], [0.8, 0.58, 0.2]];
const INK_ON_LIGHT = [[0.012, 0.012, 0.014], [0.05, 0.012, 0.01], [0.01, 0.025, 0.07]];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** the sign treatments real fronts have: backlit letters, gooseneck spotlights on a painted board, a lit lightbox */
const SIGN = ["backlit", "backlit", "backlit", "spots", "spots", "lightbox"];
const CANVAS = [[0.32, 0.03, 0.03], [0.03, 0.12, 0.05], [0.04, 0.05, 0.13], [0.55, 0.5, 0.38], [0.06, 0.06, 0.06]];
// Uccle street plate: white letters + white border on a mid blue enamel (checked against a Wikimedia Commons photo of an
// Uccle plate, look only; the real ones also carry a small "Uccle - Ukkel" line and the street type small: TODO)
const PLATE_BLUE = [0.012, 0.06, 0.26], WHITE = [0.86, 0.86, 0.84];
const AWNING_KINDS = new Set(["cafe", "bar", "restaurant", "bakery", "fastfood"]);
const AWNING_CATS = new Set(["greengrocer", "butcher", "florist", "deli", "cheese", "pastry", "chocolate", "ice_cream", "seafood", "wine", "coffee"]);
const PROJECT_KINDS = new Set(["cafe", "bar", "restaurant", "hotel", "bakery", "bank", "fastfood"]);
const TERRACE_KINDS = new Set(["cafe", "bar", "restaurant"]);
const KIT_KINDS = ["pump", "column", "table", "chair", "parasol", "cross", "postbox", "bubble", "chute", "pole", "post", "dock", "spot"];

/** lit at night? From the opening hours when they parse (open after 19:00 on some day), else yes */
function litAtNight(p) {
  if (!p.week) return 1;
  return p.week.some((d) => d.some(([a, b]) => b > 19 * 60)) ? 1 : 0.35;
}

/** split a long name over two lines at the space nearest the middle */
function twoLines(s, maxChars = 13) {
  if (s.length <= maxChars) return [s];
  const mid = s.length / 2;
  let best = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [s] : [s.slice(0, best), s.slice(best + 1)];
}

/** sRGB "#rrggbb" -> linear rgb (the GTFS line colours) */
const linHex = (h) => [1, 3, 5].map((i) => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2));

/** stopsDoc: data/stops/<T>.json (tools/stops/build_stops.py) when the STIB stops kit is on (viewer/stops/): the poles,
 *  shelters and panels are the kit's (viewer/stops/cityStops.js); this layer adds their TEXT only (the stop name and the
 *  line numbers in their GTFS colours on both faces of the pole flag, the name on the shelter's roof board). null: the
 *  old stop poles, flags and box shelters (?stops=old). */
export function layoutTile(doc, measure, stopsDoc = null, opts = {}) {
  // opts.shops: the shopfront kit (viewer/shops/, on unless ?shops=old): the fronts, doors, awnings, blades and terraces
  // as kit pieces (shops: { <piece>: [records] }), terrace colliders; opts.terraces: the curated terraces by POI id
  const SHOPS = !!opts.shops, curated = opts.terraces || {};
  const shops = Object.fromEntries(SHOP_PIECES.map((k) => [k, []])), colliders = { table: [], parasol: [], planter: [] };
  const boxes = [], windows = [], glass = [], labels = [], labelIdx = new Map();
  const props = Object.fromEntries(KIT_KINDS.map((k) => [k, []]));
  const night = { shops: [], signs: [], spots: [] };
  const used = { names: [], plates: [], numbers: [], stops: [], fuel: [] };

  const label = (lines, style) => {
    lines = style === "plateUccle" || style === "plateTwo" ? lines.map((l) => String(l ?? "")) : lines.filter((l) => l && String(l).trim()).map(String);
    if (!lines.length) return { i: -1 };
    const key = style + "\u0001" + lines.join("\u0002");
    if (!labelIdx.has(key)) { const m = measure(lines, style); labelIdx.set(key, labels.length); labels.push({ key, lines, style, w: m.w, h: m.h }); }
    const i = labelIdx.get(key), L = labels[i];
    return { i, aspect: L.w / L.h, lines: lines.length };
  };
  /** a box: origin o (its CENTRE), basis X Y Z (unit, right-handed), size; text { lab, fit } on the front (+Z) face */
  const box = (o, X, Y, Z, sx, sy, sz, { board = [0.5, 0.5, 0.5], boardGlow = 0, ink = WHITE, inkGlow = 0, lab = null, pad = 0.12, sides = 0, border = 0, rough = 0.6, metal = 0, kind = 0, fill = 0, cy = 0.5, padX = null } = {}) => {
    const b = new Float32Array(BOX_STRIDE);
    b.set([X[0] * sx, X[1] * sx, X[2] * sx, 0, Y[0] * sy, Y[1] * sy, Y[2] * sy, 0, Z[0] * sz, Z[1] * sz, Z[2] * sz, 0, o[0], o[1], o[2], 1], 0);
    // text box: the label's aspect fitted in the face minus a padding (fraction of the smaller side), centred
    let li = -1, hx = 0, hy = 0;
    if (lab && lab.i >= 0) {
      li = lab.i;
      const padM = Math.min(sx, sy) * pad, aw = Math.max(0.01, sx - 2 * (padX ?? padM)), ah = fill ? sy * fill : Math.max(0.01, sy - 2 * padM);
      // fill: the label ROW is fill x the face height (a row's cap height is ~0.45 of it), shrunk only when too wide
      let tw = aw, th = aw / lab.aspect;
      if (th > ah) { th = ah; tw = ah * lab.aspect; }
      hx = tw / sx / 2; hy = th / sy / 2;
    }
    b[16] = li;
    b.set([0, cy, hx, hy], 17);                         // x: the atlas page (set by the main thread)
    b.set([...board, boardGlow], 21);
    b.set([...ink, inkGlow], 25);
    b.set([sx, sy, sz, border], 29);
    b.set([sides, rough, metal, kind], 33);
    boxes.push(b);
  };
  const v3 = (x, y, z) => [x, y, z];
  const add = (o, X, a, Y, b, Z, c) => [o[0] + X[0] * a + Y[0] * b + Z[0] * c, o[1] + X[1] * a + Y[1] * b + Z[1] * c, o[2] + X[2] * a + Y[2] * b + Z[2] * c];
  const UP = [0, 1, 0];
  const frameOf = (nx, nz) => ({ X: [nz, 0, -nx], Y: UP, Z: [nx, 0, nz] });
  const prop = (kind, x, y, z, yaw, tint = [0, 0, 0], amt = 0) => props[kind].push(x, y, z, yaw, tint[0], tint[1], tint[2], amt);
  // yaw for a prop whose local +z must face (nx, nz): three's rotation.y maps local +z to (sin yaw, cos yaw)
  const yawTo = (nx, nz) => Math.atan2(nx, nz);

  // ------------------------------------------------------------------------------------------ façade POIs
  for (const p of doc.pois) {
    const f = p.face;
    if (!f) continue;
    const { X, Y, Z } = frameOf(f.nx, f.nz);
    const base = [f.x, f.y, f.z];
    const id = p.id, W = f.w, lit = litAtNight(p);
    const lowFloor = f.eaves - f.y < 4.0;
    const fasciaY = lowFloor ? 2.55 : 3.0;            // bottom of the fascia board above the sidewalk
    const FH = lowFloor ? 0.68 : 0.8;                 // fascia height: Brussels fronts carry 25-40 cm letters
    const sign = pick(SIGN, id, "s");
    let paint = pick(PAINT, id, "p");
    if (sign === "lightbox") paint = [0.86, 0.86, 0.84];
    const lightPaint = lum(paint) > 0.18;                 // contrast: dark letters on a light board, light on dark
    const ink = lightPaint ? pick(INK_ON_LIGHT, id, "i") : pick(INK_ON_DARK, id, "i");
    if (p.kind === "atm") {
      box(add(base, X, 0, Y, 1.3, Z, 0.05), X, Y, Z, 0.62, 0.95, 0.1, { board: [0.05, 0.055, 0.06], rough: 0.35, metal: 0.6 });
      box(add(base, X, 0, Y, 1.42, Z, 0.102), X, Y, Z, 0.36, 0.26, 0.01, { board: [0.06, 0.16, 0.2], boardGlow: 1.2, rough: 0.15 });
      continue;
    }
    const civic = p.kind === "school" || p.kind === "civic";
    if (civic) {
      // a name plaque by the door (stone-coloured), no shopfront
      const lab = p.name ? label(twoLines(p.name, 22), "board") : null;
      box(add(base, X, 0, Y, 2.1, Z, 0.012), X, Y, Z, 0.9, 0.42, 0.024, { board: [0.42, 0.4, 0.36], ink: [0.04, 0.04, 0.04], lab, rough: 0.7, kind: 1 });
      if (p.name) used.names.push(p.name);
      continue;
    }
    if (SHOPS) {
      const env = { box, label, prop, windows, night, used, hash01, pick, add, twoLines, yawTo, WIN_STRIDE,
        cur: curated[p.id], shop: (k, ...r) => shops[k].push(...r), collide: (k, x, y, z, yaw) => colliders[k].push(x, y, z, yaw) };
      const front = layoutShop(p, f, { X, Y, Z }, lit, env);
      if (TERRACE_KINDS.has(p.kind) || p.seating === "yes" || curated[p.id]?.depth != null) layoutTerrace(p, f, { X, Y, Z }, front, curated[p.id], env);
      continue;
    }
    // shopfront: stall riser, jambs, head, door mullion; the window (parallax interior) between them
    const H = fasciaY - 0.05, riser = 0.42;
    box(add(base, X, 0, Y, riser / 2, Z, 0.05), X, Y, Z, W, riser, 0.1, { board: paint, rough: 0.5 });
    for (const s of [-1, 1]) box(add(base, X, s * (W / 2 - 0.07), Y, H / 2, Z, 0.06), X, Y, Z, 0.14, H, 0.12, { board: paint, rough: 0.5 });
    box(add(base, X, 0, Y, H - 0.07, Z, 0.06), X, Y, Z, W - 0.28, 0.14, 0.12, { board: paint, rough: 0.5 });   // between the jambs (no coplanar overlap)
    const doorAt = (hash01(id + "d") < 0.5 ? -1 : 1) * (W / 2 - 0.14 - 0.55);
    if (W > 3) {
      box(add(base, X, doorAt - 0.6 * Math.sign(doorAt), Y, H / 2, Z, 0.05), X, Y, Z, 0.07, H - 0.1, 0.1, { board: paint, rough: 0.5 });
      box(add(base, X, doorAt, Y, H - 0.5, Z, 0.05), X, Y, Z, 1.2, 0.06, 0.08, { board: paint, rough: 0.5 });       // the door's transom bar
    }
    // the window: from the riser to the head, between the jambs, 4 cm behind their front
    {
      const wW = W - 0.28, wH = H - 0.14 - riser, o = add(base, X, 0, Y, riser + wH / 2, Z, 0.035);
      const m = new Float32Array(WIN_STRIDE);
      m.set([X[0] * wW, X[1] * wW, X[2] * wW, 0, 0, wH, 0, 0, Z[0], 0, Z[2], 0, o[0], o[1], o[2], 1]);
      m.set([wW, wH, hash01(id + "w"), lit], 16);
      windows.push(m);
      night.shops.push(o[0] + Z[0] * 0.6, f.y + 1.6, o[2] + Z[2] * 0.6);
    }
    // fascia with the real name (backlit letters)
    const lab = p.name ? label([p.name], pick(["shopSans", "shopSerif", "shopHumanist", "shopItalic"], id, "f")) : null;
    if (p.name) used.names.push(p.name);
    // spots: no light of their own in the lab: the board and letters get the wash of the goosenecks at night (0.35)
    const inkGlow = sign === "backlit" ? 1.6 * lit : sign === "spots" ? 0.35 * lit : 0, boardGlow = sign === "lightbox" ? 1.1 * lit : sign === "spots" ? 0.35 * lit : 0;
    box(add(base, X, 0, Y, fasciaY + FH / 2, Z, 0.07), X, Y, Z, W + 0.1, FH, 0.14, { board: paint, ink, inkGlow, boardGlow, lab, fill: 1.22, padX: 0.18, rough: 0.45, kind: 2 });
    if (sign === "spots" && !lowFloor) {
      // gooseneck spotlights over the board (2 or 3 by width), aimed down at it: the kit "spot"; the night lab's spots
      const k = W > 4.5 ? 3 : 2;
      for (let i = 0; i < k; i++) {
        const o = add(base, X, (i - (k - 1) / 2) * (W / k), Y, fasciaY + FH + 0.06, Z, 0);
        prop("spot", o[0], o[1], o[2], yawTo(f.nx, f.nz));
        night.spots.push(...add(o, X, 0, Y, 0.1, Z, 0.55));
      }
    } else night.signs.push(...add(base, X, 0, Y, fasciaY + FH / 2, Z, 0.5));
    // awning (food and fresh shops), the name on its valance
    const awn = AWNING_KINDS.has(p.kind) || AWNING_CATS.has(p.cat);
    if (awn && !lowFloor) {
      const depth = 1.25, tilt = 0.36, canvas = pick(CANVAS, id, "c");
      const dz = Math.cos(tilt), dy = -Math.sin(tilt);                     // the slope, outward and down
      const Z2 = [Z[0] * dz, dy, Z[2] * dz];
      // the canvas: local x = X, local z = down the slope, local y = its normal (up and out): X x N = Z2
      const N = [Z[0] * Math.sin(tilt), Math.cos(tilt), Z[2] * Math.sin(tilt)];
      const top = add(base, X, 0, Y, fasciaY - 0.08, Z, 0.16);
      const mid = [top[0] + Z2[0] * depth / 2, top[1] + Z2[1] * depth / 2, top[2] + Z2[2] * depth / 2];
      box(mid, X, N, Z2, W + 0.1, 0.025, depth, { board: canvas, rough: 0.85 });
      const front = [top[0] + Z2[0] * depth, top[1] + Z2[1] * depth, top[2] + Z2[2] * depth];
      const vlab = p.name ? label([p.name], "shopSans") : null;
      const vink = canvas[0] > 0.3 ? [0.03, 0.03, 0.03] : [0.85, 0.82, 0.72];
      box([front[0] + Z[0] * 0.012, front[1] - 0.14, front[2] + Z[2] * 0.012], X, Y, Z, W + 0.1, 0.28, 0.024, { board: canvas, ink: vink, lab: vlab, pad: 0.1, sides: 1, rough: 0.85 });
      for (const s of [-1, 1]) {                                          // side arms (steel)
        const a = add(base, X, s * (W / 2 - 0.02), Y, fasciaY - 0.5, Z, 0.0);
        const b = [front[0] + X[0] * s * (W / 2 - 0.02), front[1] - 0.02, front[2] + X[2] * s * (W / 2 - 0.02)];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), D = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L];
        const Yb = [D[1] * X[2] - D[2] * X[1], D[2] * X[0] - D[0] * X[2], D[0] * X[1] - D[1] * X[0]];
        box([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], X, Yb, D, 0.03, 0.03, L, { board: [0.05, 0.05, 0.055], rough: 0.4, metal: 0.8 });
      }
    }
    // projecting sign (double-sided) or the pharmacy's green cross, at the shopfront's door end
    const pend = Math.min(f.u + W / 2 + 0.25, f.edgeL - 0.3) - f.u;        // along X from the shop centre
    const px = Math.abs(pend) < W / 2 ? -(W / 2 + 0.25) : pend;
    if (p.kind === "pharmacy") {
      const o = add(base, X, px, Y, fasciaY + 0.45, Z, 0);
      prop("cross", o[0], o[1], o[2], yawTo(f.nx, f.nz));             // the kit's arm runs along its +z (out of the wall)
      night.signs.push(o[0] + Z[0] * 0.8, o[1], o[2] + Z[2] * 0.8);
    } else if (PROJECT_KINDS.has(p.kind) && p.name && !lowFloor) {
      const o = add(base, X, px, Y, fasciaY + 0.55, Z, 0);
      // bracket arm from the wall + the board, its faces along the wall (front = +X)
      box(add(o, X, 0, Y, 0.36, Z, 0.42), X, Y, Z, 0.04, 0.04, 0.84, { board: [0.03, 0.03, 0.03], rough: 0.4, metal: 0.8 });
      const plab = label(twoLines(p.name, 11), pick(["shopSans", "shopSerif", "shopHumanist"], id, "j"));
      const Xs = [-Z[0], 0, -Z[2]], Zs = X;                                   // board basis: front face looks along +X
      box(add(o, X, 0, Y, 0, Z, 0.5), Xs, Y, Zs, 0.66, 0.62, 0.07, { board: paint, ink, inkGlow: 1.2 * lit, lab: plab, pad: 0.12, sides: 1, border: 0.018, rough: 0.45, kind: 3 });
      night.signs.push(...add(o, X, 0, Y, 0, Z, 0.5));
    }
    // ATM in a bank's front
    if (p.atm) {
      const ax = -doorAt;
      box(add(base, X, ax, Y, 1.3, Z, 0.08), X, Y, Z, 0.6, 0.9, 0.06, { board: [0.05, 0.055, 0.06], rough: 0.35, metal: 0.6 });
      box(add(base, X, ax, Y, 1.42, Z, 0.112), X, Y, Z, 0.34, 0.24, 0.01, { board: [0.06, 0.16, 0.2], boardGlow: 1.2, rough: 0.15 });
    }
    // terrace: tables + chairs (+ parasols on a wide sidewalk) in front of cafés and restaurants that have the room
    const usable = Math.min((f.pave ?? 0) - 1.5, 3.2);       // paved depth in front minus a 1.5 m passage
    const seat = p.seating !== "no" && (p.seating === "yes" || TERRACE_KINDS.has(p.kind)) && usable >= 1.2;
    if (seat) {
      const n = Math.max(1, Math.floor((W - 0.4) / 1.7));
      const rows = usable >= 2.6 ? 2 : 1;
      for (let r = 0; r < rows; r++) for (let k = 0; k < n; k++) {
        const ux = -W / 2 + 0.2 + (k + 0.5) * ((W - 0.4) / n), zz = 0.9 + r * 1.35;
        const o = add(base, X, ux, Y, 0, Z, zz);
        prop("table", o[0], o[1], o[2], 0);
        for (const s of [-1, 1]) {
          const c = add(base, X, ux + s * 0.5, Y, 0, Z, zz);
          prop("chair", c[0], c[1], c[2], yawTo(X[0] * -s, X[2] * -s) + Math.PI);    // facing the table
        }
      }
      if (usable >= 2.6 && p.kind !== "fastfood") for (let k = 0; k < n; k += 2) {
        const ux = -W / 2 + 0.2 + (k + 0.5) * ((W - 0.4) / n), o = add(base, X, ux, Y, 0, Z, 0.9 + (rows - 1) * 0.67);
        prop("parasol", o[0], o[1], o[2], hash01(id + k) * 6.28, pick(CANVAS, id, "c"), 1);
      }
    }
  }

  // ------------------------------------------------------------------------------------------ fuel stations
  for (const s of doc.fuel) {
    const n = [s.nx, 0, s.nz], d = [Math.cos(s.yaw), 0, Math.sin(s.yaw)];
    // canopy frame: X along the road, Z toward the road
    let X = d, Z = n;
    const cr = [X[1] * Y3[2] - X[2] * Y3[1], X[2] * Y3[0] - X[0] * Y3[2], X[0] * Y3[1] - X[1] * Y3[0]];
    if (cr[0] * Z[0] + cr[2] * Z[2] < 0) X = [-X[0], 0, -X[2]];
    const c = [s.cx, s.y, s.cz];
    const brand = s.name || s.brand;
    const blab = brand ? label([brand], "brand") : null;
    if (brand) used.fuel.push(brand);
    box(add(c, X, 0, UP, 5.35, Z, 0), X, UP, Z, 12, 0.75, 8, { board: [0.78, 0.78, 0.76], ink: [0.03, 0.03, 0.035], inkGlow: 0.8, lab: blab, pad: 0.04, sides: 1, rough: 0.4, kind: 4 });
    // the long sides carry the name; the short ends too (a second box face pair along X)
    for (const e of [-1, 1]) {        // the short ends: a thin name panel on each (faces +-X)
      const EX = e > 0 ? [-Z[0], 0, -Z[2]] : Z, EZ = e > 0 ? X : [-X[0], 0, -X[2]];
      box(add(c, X, e * 6.012, UP, 5.35, Z, 0), EX, UP, EZ, 7.4, 0.62, 0.024, { board: [0.78, 0.78, 0.76], ink: [0.03, 0.03, 0.035], inkGlow: 0.8, lab: blab, pad: 0.1, rough: 0.4, kind: 4 });
    }
    box(add(c, X, 0, UP, 4.955, Z, 0), X, UP, Z, 10.5, 0.03, 6.5, { board: [0.92, 0.93, 0.95], boardGlow: 2.0, rough: 0.3, kind: 5 });   // light panels
    for (const zz of [-2.0, 2.0]) {
      const o = add(c, X, 0, UP, 0, Z, zz);
      prop("pump", o[0], o[1], o[2], yawTo(Z[0], Z[2]) + 0, [0.55, 0.56, 0.57], 1);
      for (const xx of [-3.0, 3.0]) { const q = add(c, X, xx, UP, 0, Z, zz); prop("column", q[0], q[1], q[2], 0); }
    }
    night.shops.push(c[0], c[1] + 4.5, c[2]);
    // price pylon: brand on top, then one row per fuel grade the data lists (grade names only: no prices in the data)
    const [tx, ty, tz] = s.totem;
    const T = [tx, ty, tz], TX = [-Z[0], 0, -Z[2]], TZ = X;   // faces along the road both ways
    box(add(T, TX, 0, UP, 2.4, TZ, 0), TX, UP, TZ, 1.5, 4.8, 0.32, { board: [0.06, 0.065, 0.07], rough: 0.4, metal: 0.4 });
    box(add(T, TX, 0, UP, 4.15, TZ, 0), TX, UP, TZ, 1.4, 1.1, 0.34, { board: [0.85, 0.85, 0.84], boardGlow: 0.6, ink: [0.03, 0.03, 0.035], lab: blab, pad: 0.1, sides: 1, kind: 4 });
    s.grades.slice(0, 5).forEach((g, k) => {
      const y = 3.25 - k * 0.42;
      box(add(T, TX, -0.3, UP, y, TZ, 0), TX, UP, TZ, 0.72, 0.34, 0.34, { board: [0.06, 0.065, 0.07], ink: [0.9, 0.9, 0.9], inkGlow: 0.6, lab: label([g], "board"), pad: 0.08, sides: 1 });
      box(add(T, TX, 0.38, UP, y, TZ, 0), TX, UP, TZ, 0.52, 0.3, 0.335, { board: [0.01, 0.01, 0.012], rough: 0.2, sides: 1 });   // the price window (dark: no price in the data)
    });
  }

  // ------------------------------------------------------------------------------------------ STIB stops (the kit's text)
  // frame of a kit piece at yaw: local x -> (cos, 0, -sin), local z (the road side) -> (sin, 0, cos)
  for (const s of stopsDoc?.stops || []) {
    used.stops.push(s.fr);
    const P = s.pole, cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), Xl = [cs, 0, -sn], Zl = [sn, 0, cs];
    const FX = [-Zl[0], 0, -Zl[2]], FZ = Xl;                       // the flag's faces look along local +-x (along the street)
    const o = [P.x, P.y, P.z];
    const names = s.nl && s.nl !== s.fr ? [s.fr, s.nl] : [s.fr];
    // the flag's white panel (tools/blender/stibStops.py: 0.51 x 0.55 m, its faces 33 mm off the axis): the name on top
    box(add(o, FX, 0, UP, 3.07, FZ, 0), FX, UP, FZ, 0.51, 0.25, 0.069, { board: [0.86, 0.86, 0.84], ink: [0.02, 0.02, 0.025], lab: label(names, "stop"), pad: 0.06, sides: 1, rough: 0.4 });
    // the line numbers in their own colours, up to 4 a row, 2 rows
    const L = s.lines.slice(0, 8);
    L.forEach((ln, i) => {
      const row = i >> 2, nr = Math.min(4, L.length - row * 4), col = i & 3;
      box(add(o, FX, (col - (nr - 1) / 2) * 0.12, UP, 2.865 - row * 0.105, FZ, 0), FX, UP, FZ, 0.105, 0.085, 0.071,
        { board: linHex(ln.bg), ink: linHex(ln.fg), lab: label([ln.n], "line"), pad: 0.1, sides: 1, rough: 0.35 });
    });
    if (s.shelter) {
      const S = s.shelter, c2 = Math.cos(S.yaw), s2 = Math.sin(S.yaw), X2 = [c2, 0, -s2], Z2 = [s2, 0, c2];
      // the name board hung under the roof's front edge, readable from the road and from inside
      box(add([S.x, S.y, S.z], X2, 0.55, UP, 2.19, Z2, 0.74), X2, UP, Z2, 1.5, 0.2, 0.02, { board: [0.86, 0.86, 0.84], boardGlow: 0.35, ink: [0.02, 0.02, 0.025], lab: label([s.fr], "stop"), pad: 0.1, sides: 1, rough: 0.4 });
    }
  }
  // ------------------------------------------------------------------------------------------ STIB stops (old: ?stops=old)
  for (const s of stopsDoc ? [] : doc.stops) {
    const d = [s.tx, 0, s.tz], n = [s.nx, 0, s.nz];
    const o = [s.x, s.y, s.z];
    prop("pole", o[0], o[1], o[2], 0);
    const names = s.nl && s.nl !== s.fr ? [s.fr, s.nl] : [s.fr];
    used.stops.push(s.fr);
    const FX = [n[0], 0, n[2]], FZ = [-FX[2], 0, FX[0]];        // the flag's faces look along the street (FX x up = FZ)
    const flab = label(names, "stop");
    box(add(o, FX, 0.33, UP, 2.86, FZ, 0), FX, UP, FZ, 0.62, names.length > 1 ? 0.42 : 0.3, 0.035, { board: [0.92, 0.92, 0.9], ink: [0.02, 0.02, 0.025], lab: flab, pad: 0.08, sides: 1, rough: 0.4 });
    if (s.lines.length) {
      const llab = label([s.lines.join("  ")], "line");
      box(add(o, FX, 0.33, UP, 2.5, FZ, 0), FX, UP, FZ, 0.62, 0.26, 0.035, { board: [0.03, 0.03, 0.035], ink: [0.95, 0.95, 0.95], inkGlow: 0.5, lab: llab, pad: 0.1, sides: 1, rough: 0.4 });
    }
    box(add(o, FX, -0.1, UP, 1.45, FZ, 0), FX, UP, FZ, 0.32, 0.5, 0.06, { board: [0.2, 0.21, 0.23], rough: 0.4, metal: 0.4 });   // timetable case
    if (s.shelter) {
      // behind the pole, along the street: two end frames, a roof, a back pane, the stop name on the roof fascia
      const b = add(o, d, 0, UP, 0, n, -1.6);
      const SX = n[0] * -d[2] + 0 + n[2] * d[0] >= 0 ? d : [-d[0], 0, -d[2]], SZ = [-SX[2], 0, SX[0]];   // SZ = toward the road
      for (const e of [-1.7, 1.7]) box(add(b, SX, e, UP, 1.2, SZ, 0), SX, UP, SZ, 0.06, 2.4, 1.3, { board: [0.18, 0.19, 0.2], rough: 0.4, metal: 0.6 });
      box(add(b, SX, 0, UP, 2.45, SZ, 0.05), SX, UP, SZ, 3.7, 0.1, 1.5, { board: [0.18, 0.19, 0.2], rough: 0.4, metal: 0.6 });
      box(add(b, SX, 0, UP, 2.27, SZ, 0.78), SX, UP, SZ, 3.4, 0.26, 0.04, { board: [0.92, 0.92, 0.9], ink: [0.02, 0.02, 0.025], lab: label([s.fr], "stop"), pad: 0.1, sides: 1 });
      const g = new Float32Array(GLASS_STRIDE);
      const gO = add(b, SX, 0, UP, 1.25, SZ, -0.6);
      g.set([SX[0] * 3.34, 0, SX[2] * 3.34, 0, 0, 2.2, 0, 0, SZ[0] * 0.012, 0, SZ[2] * 0.012, 0, gO[0], gO[1], gO[2], 1]);
      glass.push(g);
      for (const e of [-1.7, 1.7]) {
        const sO = add(b, SX, e * 0.985, UP, 1.25, SZ, 0.0), g2 = new Float32Array(GLASS_STRIDE);
        g2.set([SX[0] * 0.012, 0, SX[2] * 0.012, 0, 0, 2.2, 0, 0, SZ[0] * 1.16, 0, SZ[2] * 1.16, 0, sO[0], sO[1], sO[2], 1]);
        glass.push(g2);
      }
    }
  }

  // ------------------------------------------------------------------------------------------ Villo
  for (const v of doc.villo) {
    const n = [v.nx, 0, v.nz], o = [v.x, v.y, v.z];
    const d = n[0] * -v.tz + n[2] * v.tx >= 0 ? [v.tx, 0, v.tz] : [-v.tx, 0, -v.tz];    // d x up = n
    const k = Math.max(4, Math.min(v.stands || 0, 40)) || 10;
    const len = (k - 1) * 0.85;
    for (let i = 0; i < (v.stands || 0); i++) {
      const q = add(o, d, -len / 2 + i * 0.85, UP, 0, n, 0);
      prop("dock", q[0], q[1], q[2], yawTo(n[0], n[2]));
    }
    const t = add(o, d, -len / 2 - 1.1, UP, 0, n, 0);
    const vlab = label([v.name, v.nameNl && v.nameNl !== v.name ? v.nameNl : null], "board");
    box(add(t, d, 0, UP, 0.85, n, 0), d, UP, n, 0.55, 1.7, 0.36, { board: [0.12, 0.125, 0.13], rough: 0.4, metal: 0.5 });
    box(add(t, d, 0, UP, 1.95, n, 0), d, UP, n, 0.9, 0.4, 0.06, { board: [0.9, 0.9, 0.88], ink: [0.02, 0.02, 0.02], lab: vlab, pad: 0.06, sides: 1 });
    box(add(t, d, 0, UP, 1.25, n, 0.181), d, UP, n, 0.3, 0.22, 0.01, { board: [0.06, 0.16, 0.2], boardGlow: 1.2, rough: 0.15 });
  }

  // ------------------------------------------------------------------------------------------ bpost boxes, glass bubbles
  for (const b of doc.postboxes) {
    prop("postbox", b.x, b.y, b.z, yawTo(b.nx, b.nz));
    if (b.operator) {
      const { X, Z } = frameOf(b.nx, b.nz);
      box(add([b.x, b.y, b.z], X, 0, UP, 1.12, Z, 0.19), X, UP, Z, 0.3, 0.07, 0.008, { board: [0.55, 0.015, 0.012], ink: [0.9, 0.9, 0.9], lab: label([b.operator], "brand"), pad: 0.05 });
    }
  }
  for (const g of doc.glass) {
    const { X } = frameOf(g.nx, g.nz);
    const kinds = g.underground ? "chute" : "bubble";
    [-0.95, 0.95].forEach((s, k) => prop(kinds, g.x + X[0] * s, g.y, g.z + X[2] * s, yawTo(g.nx, g.nz), k ? [0.55, 0.58, 0.55] : [0.04, 0.16, 0.06], 1));
  }

  // ------------------------------------------------------------------------------------------ street plates
  for (const p of doc.plates) {
    used.plates.push(p.fr);
    // the whole plate layout is one label (sdfText.js plateUccle / plateTwo): one box, no decals
    const uccle = !!p.big;
    const lab = uccle ? label([p.frType, p.big, p.nlType, p.commune || ""], "plateUccle") : label([p.fr, p.nl || "", p.commune || ""], "plateTwo");
    const h = uccle ? 0.3 : 0.36;
    const w = Math.max(0.45, Math.min(1.4, h * lab.aspect));
    const post = p.mount !== "wall";
    if (post) prop("post", p.x, p.y, p.z, 0);
    const { X, Z } = frameOf(p.nx, p.nz);
    const c = post ? [p.x + Z[0] * 0.04, p.y + 2.6, p.z + Z[2] * 0.04] : [p.x + Z[0] * 0.003, p.y, p.z + Z[2] * 0.003];   // enamel: 6 mm thick, 2 cm off the wall (in the real wall plane)
    box(c, X, UP, Z, w, h, post ? 0.012 : 0.006, { board: PLATE_BLUE, ink: WHITE, lab, pad: 0, padX: 0.0, fill: 1.0, border: 0.012, sides: post ? 1 : 0, rough: 0.25, kind: 6 });
  }
  // ------------------------------------------------------------------------------------------ house numbers
  for (const nb of doc.numbers) {
    const { X, Z } = frameOf(nb.nx, nb.nz);
    const lab = label([nb.n], "number");
    used.numbers.push(nb.n);
    const h = 0.15, w = Math.max(0.15, Math.min(0.42, h * lab.aspect * 0.8));
    box([nb.x + Z[0] * 0.007, nb.y + 2.25, nb.z + Z[2] * 0.007], X, UP, Z, w, h, 0.005, { board: PLATE_BLUE, ink: WHITE, lab, pad: 0.12, border: 0.006, rough: 0.25, kind: 7 });
  }
  return { boxes, props, windows, glass, labels, night, used, shops, colliders };
}
const Y3 = [0, 1, 0];
