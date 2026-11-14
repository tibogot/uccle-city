// THE STREET-LIFE PROP KITS (pure JS on kitGeom.js: the lab, the worker and Node's mesh audit build the same meshes).
// Round and organic props only: everything boxy (fascias, plates, awnings, the fuel canopy slab, the price totem, stop
// flags, shelters, shop frames, the Villo terminal) is an instance of the ONE textured box (streetlife.js), so it can be
// any size without stretched bevels and draws in the same call as the text.
//
// Frame: x = along the façade / the road (right), y up, z = outward (toward the street), origin on the ground (or on the
// wall foot for wall-mounted props). Units: metres. Every vertex carries a named material slot (SLOTS); no colour is baked.

import { Geo } from "./kitGeom.js";

/** Named material slots: [name, linear rgb, roughness, metalness, emissive (x colour at night), tintable 0/1] */
export const SLOTS = [
  ["steel_dark", [0.045, 0.048, 0.052], 0.45, 0.75, 0, 0],
  ["steel", [0.56, 0.57, 0.58], 0.32, 0.9, 0, 0],
  ["white_paint", [0.72, 0.72, 0.7], 0.42, 0.0, 0, 0],
  ["light_panel", [0.92, 0.93, 0.95], 0.3, 0.0, 2.2, 0],
  ["screen", [0.06, 0.16, 0.2], 0.15, 0.0, 1.6, 0],
  ["concrete", [0.36, 0.35, 0.33], 0.92, 0.0, 0, 0],
  ["rubber", [0.018, 0.018, 0.02], 0.75, 0.0, 0, 0],
  ["pharmacy_green", [0.02, 0.42, 0.09], 0.35, 0.0, 5.0, 0],
  ["canvas", [0.42, 0.05, 0.04], 0.85, 0.0, 0, 1],
  ["wood", [0.25, 0.14, 0.07], 0.62, 0.0, 0, 0],
  ["chalk", [0.025, 0.03, 0.026], 0.9, 0.0, 0, 0],
  ["bpost_red", [0.55, 0.015, 0.012], 0.38, 0.1, 0, 0],
  ["bottle_glass", [0.05, 0.16, 0.07], 0.55, 0.0, 0, 1],
  ["stib_grey", [0.22, 0.23, 0.25], 0.5, 0.55, 0, 0],
  ["brand", [0.5, 0.5, 0.5], 0.35, 0.1, 0, 1],
  ["rattan", [0.36, 0.24, 0.12], 0.75, 0.0, 0, 0],
  ["table_top", [0.62, 0.61, 0.57], 0.25, 0.0, 0, 0],
  ["warm_light", [1.0, 0.82, 0.58], 0.4, 0.0, 3.0, 0],
  ["lightbox", [0.86, 0.87, 0.88], 0.35, 0.0, 1.6, 1],
  ["galvanized", [0.21, 0.215, 0.21], 0.7, 0.35, 0, 0],   // hot-dip galvanized tread plate (chute platforms): matt light grey
];
export const SLOT = Object.fromEntries(SLOTS.map((s, i) => [s[0], i]));

const S = SLOT;

/** fuel dispenser on its island (island 4.4 x 1.1 m, the pump 1.1 x 1.9 x 0.55) */
function pump() {
  const g = new Geo();
  g.box(0, 0.09, 0, 4.4, 0.18, 1.1, S.concrete, 0.04);                 // island kerb (sunk 0 .. 0.18)
  g.box(0, 0.19, 0, 4.25, 0.02, 0.95, S.steel_dark, 0.005);             // its steel nosing plate
  g.box(0, 0.2 + 0.85, 0, 1.1, 1.7, 0.5, S.white_paint, 0.03);          // the body
  g.box(0, 1.98, 0, 1.16, 0.16, 0.56, S.brand, 0.02);                   // brand-coloured head band
  for (const z of [-1, 1]) {
    g.box(0, 1.45, z * 0.258, 0.62, 0.3, 0.02, S.screen, 0.004);        // price / volume displays, both sides
    g.box(0, 0.62, z * 0.258, 0.8, 0.5, 0.02, S.steel_dark, 0.004);     // lower panel
    for (const x of [-0.38, 0.38]) {                                    // nozzle holsters + nozzles
      g.box(x, 1.08, z * 0.29, 0.13, 0.16, 0.08, S.steel_dark, 0.01);
      g.tube([[x, 1.12, z * 0.32], [x, 1.02, z * 0.37]], 0.022, S.rubber, 14);
    }
  }
  g.tube([[0.52, 1.85, 0], [0.75, 1.9, 0], [0.9, 1.2, 0], [0.75, 0.6, 0.05]], 0.016, S.rubber, 14);   // a hanging hose
  for (const x of [-1.7, 1.7]) g.cyl(x, 0.1, 0, 0.07, 1.03, S.brand, 16, 0.01);    // crash posts
  return g;
}

/** canopy column (round, 4.9 m) with a footing collar */
function column() {
  const g = new Geo();
  g.cyl(0, 0, 0, 0.26, 0.35, S.concrete, 20, 0.03);
  g.cyl(0, 0.35, 0, 0.16, 4.6, S.white_paint, 20, 0.02);
  return g;
}

/** bistro table: round top 0.6 m, cast foot */
function table() {
  const g = new Geo();
  g.lathe(0, 0, 0, [[0.0, 0.0], [0.24, 0.0], [0.25, 0.012], [0.2, 0.04], [0.05, 0.07], [0.03, 0.12], [0.028, 0.68], [0.06, 0.7], [0.0, 0.7]], S.steel_dark, 20, [1, 2, 7]);
  g.lathe(0, 0, 0, [[0.0, 0.70], [0.298, 0.70], [0.3, 0.712], [0.3, 0.728], [0.298, 0.74], [0.0, 0.74]], S.table_top, 28, [1, 4]);
  return g;
}

/** bistro chair (rattan seat + back, bent steel legs), facing -z (its back toward +z) */
function chair() {
  const g = new Geo();
  const leg = (x, z, x2, z2) => g.tube([[x, 0.0, z], [x * 0.98, 0.25, z * 0.98], [x2, 0.45, z2]], 0.011, S.steel_dark, 14);
  leg(-0.2, -0.2, -0.18, -0.18); leg(0.2, -0.2, 0.18, -0.18); leg(-0.21, 0.2, -0.19, 0.18); leg(0.21, 0.2, 0.19, 0.18);
  g.box(0, 0.465, 0, 0.42, 0.035, 0.42, S.rattan, 0.012);
  // back: two posts and a curved rattan band
  for (const x of [-0.19, 0.19]) g.tube([[x, 0.46, 0.19], [x * 1.02, 0.66, 0.22], [x * 1.03, 0.86, 0.24]], 0.011, S.steel_dark, 14);
  const band = [];
  for (let k = 0; k <= 8; k++) { const a = -0.55 + (k / 8) * 1.1; band.push([Math.sin(a) * 0.23, 0.79, 0.2 + Math.cos(a) * 0.05]); }
  g.tube(band, 0.04, S.rattan, 14);
  for (const x of [-0.19, 0.19]) g.tube([[x, 0.47, -0.2], [x, 0.47, 0.165]], 0.011, S.steel_dark, 14);
  return g;
}

/** market parasol, open: 2.6 m canopy (8 panels), pole and weighted base */
function parasol(lod = 0) {
  const g = new Geo();
  g.cyl(0, 0, 0, 0.24, 0.07, S.concrete, 20, 0.015);
  g.cyl(0, 0.07, 0, 0.022, 2.32, S.wood, 16, 0.004);
  const R = 1.3, top = 2.42, rim = 2.05, n = 8;
  // 8 flat panels (canvas, double-faced so the underside is lit too) with a valance
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
    const p0 = [Math.cos(a0) * R, rim, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, rim, Math.sin(a1) * R], c = [0, top, 0];
    g.poly([p1, p0, c], S.canvas);
    g.poly([[p0[0] * 0.995, p0[1] - 0.012, p0[2] * 0.995], [p1[0] * 0.995, p1[1] - 0.012, p1[2] * 0.995], [0, top - 0.012, 0]], S.canvas);
    g.poly([[p1[0], rim, p1[2]], [p1[0], rim - 0.16, p1[2]], [p0[0], rim - 0.16, p0[2]], [p0[0], rim, p0[2]]], S.canvas);
    g.poly([[p0[0] * 0.99, rim, p0[2] * 0.99], [p0[0] * 0.99, rim - 0.16, p0[2] * 0.99], [p1[0] * 0.99, rim - 0.16, p1[2] * 0.99], [p1[0] * 0.99, rim, p1[2] * 0.99]], S.canvas);
    if (!lod) g.tube([[Math.cos(a0) * 0.026, 1.62, Math.sin(a0) * 0.026], [Math.cos(a0) * 0.65, rim - 0.02, Math.sin(a0) * 0.65]], 0.008, S.wood, 14, false);        // struts
  }
  g.cyl(0, top - 0.01, 0, 0.035, 0.1, S.wood, 12, 0.008);
  return g;
}

/** pharmacy cross: double-sided green lightbox cross 0.8 m projecting from the wall on a bracket (wall at z = 0, the arm
 *  along +z, the cross's faces look along +-x: up and down the street) */
function cross() {
  const g = new Geo();
  const t = 0.26, L = 0.8, d = 0.12, zc = 0.78, yc = 0;
  g.box(0, yc, zc, d, L, t, S.pharmacy_green, 0.02);
  g.box(0, yc, zc - (L + t) / 4, d - 0.002, t, (L - t) / 2, S.pharmacy_green, 0.02);
  g.box(0, yc, zc + (L + t) / 4, d - 0.002, t, (L - t) / 2, S.pharmacy_green, 0.02);
  // bracket: wall plate + arm (it ends in the cross's inner arm)
  g.box(0, yc, 0.015, 0.16, 0.3, 0.03, S.steel_dark, 0.006);
  g.box(0, yc, 0.205, 0.05, 0.05, 0.35, S.steel_dark, 0.008);
  return g;
}

/** bpost letter box (the free-standing red box with a rounded top, ~1.25 m) on its foot */
function postbox() {
  const g = new Geo();
  g.box(0, 0.09, 0, 0.32, 0.18, 0.28, S.steel_dark, 0.02);
  g.box(0, 0.18 + 0.43, 0, 0.44, 0.86, 0.36, S.bpost_red, 0.035);
  // the rounded top: a half-cylinder along x (lathe would be around y: build it as a tube cap)
  const R = 0.18, segs = 12, top = [];
  for (let k = 0; k <= segs; k++) { const a = (k / segs) * Math.PI; top.push([Math.cos(a) * R, 1.04 + Math.sin(a) * R * 0.55]); }
  for (let k = 0; k < segs; k++) {
    const [z0, y0] = top[k], [z1, y1] = top[k + 1];
    g.poly([[0.22, y0, z0], [0.22, y1, z1], [-0.22, y1, z1], [-0.22, y0, z0]], S.bpost_red);
  }
  const cap = (x, s) => { const pts = top.map(([z, y]) => [x, y, z]); g.poly(s > 0 ? pts.slice().reverse() : pts, S.bpost_red); };
  cap(0.22, 1); cap(-0.22, -1);
  g.box(0, 0.93, 0.181, 0.3, 0.035, 0.012, S.steel_dark, 0.004);     // the letter slot (front)
  g.box(0, 0.62, 0.181, 0.28, 0.2, 0.01, S.white_paint, 0.003);      // collection-times plate
  return g;
}

/** glass bubble (Bruxelles-Propreté overground container): a ~1.6 m bell, two round mouths, lifting ring */
function bubble() {
  const g = new Geo();
  g.lathe(0, 0, 0, [[0.0, 0.0], [0.62, 0.0], [0.7, 0.06], [0.76, 0.35], [0.78, 0.7], [0.74, 1.05], [0.6, 1.36], [0.36, 1.56], [0.12, 1.64], [0.0, 1.65]], S.bottle_glass, 32, [1]);
  for (const a of [0, Math.PI]) {
    const x = Math.sin(a) * 0.62, z = Math.cos(a) * 0.62;
    g.at(x, 1.25, z, a, 0.75).cyl(0, -0.03, 0, 0.11, 0.08, S.rubber, 18, 0.01).reset();
  }
  g.lathe(0, 1.64, 0, [[0.03, 0.0], [0.04, 0.05], [0.04, 0.16], [0.03, 0.2], [0.0, 0.2]], S.steel, 14, [3]);
  g.tube([[0, 1.84, 0], [0.08, 1.92, 0], [0, 2.0, 0], [-0.08, 1.92, 0], [0, 1.84, 0]], 0.014, S.steel, 14, false);
  return g;
}

/** underground container chute (a column with a mouth) */
function chute() {
  const g = new Geo();
  // the pedestrian platform over the buried container: a galvanized tread plate (matt light grey; it was a 2 cm slab of
  // dark polished steel that read as a BLACK SQUARE in shade) in a dark steel rim, set into the paving: both sink 4-5 cm
  // below the origin, so a sidewalk with a 2-3 % cross-fall meets the rim, never a floating edge (the joins rule)
  g.box(0, -0.022, 0, 1.6, 0.056, 1.6, S.steel_dark, 0.004);
  g.box(0, -0.018, 0, 1.52, 0.06, 1.52, S.galvanized, 0.003);
  g.cyl(0, 0.012, 0, 0.3, 1.088, S.bottle_glass, 24, 0.03);
  g.at(0, 0.9, 0.29, 0, 1.2).cyl(0, -0.02, 0, 0.1, 0.06, S.rubber, 16, 0.008).reset();
  g.cyl(0, 1.1, 0, 0.32, 0.05, S.steel_dark, 24, 0.012);
  return g;
}

/** STIB stop pole (3.2 m; the flag and timetable box are textured boxes) */
function pole() {
  const g = new Geo();
  g.cyl(0, 0, 0, 0.07, 0.06, S.steel_dark, 16, 0.01);
  g.cyl(0, 0.06, 0, 0.045, 3.12, S.stib_grey, 16, 0.006);
  g.cyl(0, 3.18, 0, 0.055, 0.04, S.steel_dark, 16, 0.01);
  return g;
}

/** street-plate post (2.9 m) */
function post() {
  const g = new Geo();
  g.cyl(0, 0, 0, 0.06, 0.05, S.steel_dark, 14, 0.008);
  g.cyl(0, 0.05, 0, 0.035, 2.85, S.steel_dark, 14, 0.005);
  g.cyl(0, 2.9, 0, 0.042, 0.03, S.steel_dark, 14, 0.008);
  return g;
}

/** Villo dock: a bollard-like post with the locking head */
function dock() {
  const g = new Geo();
  g.cyl(0, 0, 0, 0.09, 0.04, S.steel_dark, 16, 0.01);
  g.cyl(0, 0.04, 0, 0.055, 0.78, S.stib_grey, 16, 0.006);
  g.box(0, 0.88, 0.02, 0.13, 0.2, 0.16, S.steel_dark, 0.025);
  g.box(0, 0.84, 0.105, 0.06, 0.05, 0.012, S.screen, 0.004);
  return g;
}

/** gooseneck spotlight over a shop fascia: wall plate, an arm curving out and down, a cone head with a warm lens (aimed
 *  back at the board below it); the wall at z = 0, mounted at the fascia's top edge */
function spot() {
  const g = new Geo();
  g.box(0, 0.0, 0.012, 0.09, 0.12, 0.024, S.steel_dark, 0.006);
  g.tube([[0, 0, 0.024], [0, 0.08, 0.2], [0, 0.14, 0.42], [0, 0.11, 0.55]], 0.012, S.steel_dark, 14);
  // the head: a cone (lathe) tilted to look down and back at the board
  g.at(0, 0.1, 0.58, 0, 2.35).lathe(0, 0, 0, [[0.0, -0.02], [0.03, -0.02], [0.055, 0.06], [0.06, 0.13], [0.052, 0.13], [0.052, 0.12]], S.steel_dark, 18, [1, 3, 4]).reset();
  g.at(0, 0.1, 0.58, 0, 2.35).disc(0, 0.12, 0, 0.052, S.warm_light, 18, true).reset();
  return g;
}

/** the kit: kind -> { build, lod: [switch m, end m] } (LOD1 = meshoptimizer simplify of LOD0, made by the caller) */
export const KITS = {
  pump: { build: pump, lod: [45, 260], shadow: true },
  column: { build: column, lod: [60, 360], shadow: true },
  table: { build: table, lod: [28, 140], shadow: true },
  chair: { build: chair, lod: [22, 120], shadow: true },
  parasol: { build: parasol, lod: [40, 200], shadow: true },
  cross: { build: cross, lod: [45, 320], shadow: false },
  postbox: { build: postbox, lod: [30, 160], shadow: true },
  bubble: { build: bubble, lod: [40, 220], shadow: true },
  chute: { build: chute, lod: [30, 160], shadow: true },
  pole: { build: pole, lod: [40, 220], shadow: true },
  post: { build: post, lod: [40, 220], shadow: true },
  dock: { build: dock, lod: [30, 150], shadow: true },
  spot: { build: spot, lod: [25, 140], shadow: false },
};
