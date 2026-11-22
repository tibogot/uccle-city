// THE VILLA'S SITE (claude/villa1): the plot frame on Avenue du Prince d'Orange, the city's terrain sampled in that
// frame (the SAME 1 m DTM grid and bilinear lookup the tile draws: viewer/heightmap.js surface), the UrbIS solid the
// villa replaces and the neighbours (bake occluders). Input of tools/blender/villa.py and of viewer/villaPlot.js.
//
//   node --import ./tools/road_audit/register.mjs tools/villa/site.mjs          -> models/villa/site.json
//
// The plot: the detached house UrbIS solid 543176 (BU 1588559, tile H9, 25 x 29 m, the nearest building 27 m away) on
// the west side of the avenue, about 28 m back from its axis. The frame (u, w): origin on the avenue's axis abeam the
// house, u = into the plot (west-north-west, the avenue's normal), w = along the avenue toward the south (so that
// three.js local (x = u, z = w) is a rotation of the city's (x, z): no mirror). The villa is fictional (no real owner,
// no brand); the plot's ground is the real DTM.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Heightmap } from "../../viewer/heightmap.js";

const ROOT = new URL("../../", import.meta.url);
const TILE = "H9";
export const SOLID = "543176", BU = "1588559";
// the avenue's axis (data/roads/network.json r40793021_1: n166450143 -> the bend at 960.59, 2126.4)
const A = [829.53, 1895.76], B = [960.59, 2126.4];
const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
const d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];         // along the avenue, north
const n = [-d[1], d[0]];                                    // into the plot (west)
const C = [885.5, 2051.0];                                  // the old house's centre
const t = (C[0] - A[0]) * d[0] + (C[1] - A[1]) * d[1];
const O = [A[0] + d[0] * t, A[1] + d[1] * t];
const U = n, W = [-d[0], -d[1]];                            // w = south along the avenue
const rotY = Math.atan2(-U[1], U[0]);                       // three: local x -> (cos, -sin) = U, local z -> (sin, cos) = W
const OY = 100;                                             // model y = TAW - OY

const hdr = JSON.parse(readFileSync(new URL(`data/tiles/${TILE}/terrain.json`, ROOT), "utf8"));
const hm = new Heightmap(hdr, readFileSync(new URL(`data/tiles/${TILE}/terrain.u16`, ROOT)).buffer.slice(0));
const world = (u, w) => [O[0] + U[0] * u + W[0] * w, O[1] + U[1] * u + W[1] * w];
const frame = (x, z) => [(x - O[0]) * U[0] + (z - O[1]) * U[1], (x - O[0]) * W[0] + (z - O[1]) * W[1]];

// the ground grid (0.5 m) over the plot and a margin
const G = { u0: -2, u1: 64, w0: -40, w1: 36, step: 0.5 };
G.nu = Math.round((G.u1 - G.u0) / G.step) + 1; G.nw = Math.round((G.w1 - G.w0) / G.step) + 1;
const h = [];
for (let j = 0; j < G.nw; j++) for (let i = 0; i < G.nu; i++) {
  const [x, z] = world(G.u0 + i * G.step, G.w0 + j * G.step);
  h.push(Math.round(hm.surface(x, z) * 1000) / 1000);
}
// the neighbours within 70 m (bake occluders): footprint in the frame, base, top
const bj = JSON.parse(readFileSync(new URL(`data/tiles/${TILE}/buildings.json`, ROOT), "utf8"));
const neighbours = [];
let replaced = null;
for (const b of bj.buildings) {
  const id = String(b.id).split("/").pop(), bu = String(b.attrs?.BU_ID || "").split("/").pop();
  const ring = b.footprint[0].map(([x, z]) => frame(x, z).map((v) => Math.round(v * 100) / 100));
  if (id === SOLID) { replaced = { id, bu, ring, base: b.base, top: b.top }; continue; }
  const near = ring.some(([u, w]) => u > -20 && u < 90 && w > -70 && w < 70);
  if (near) neighbours.push({ id, bu, ring, base: b.base, top: b.top ?? b.base + b.height });
}
if (!replaced) throw new Error(`solid ${SOLID} not in ${TILE}`);

// THE PLOT (frame metres): the front wall on the property line (the avenue's half width 9.2 m: 3 + 1.5 + 2.2 + 2.5,
// network.json lanes), the sides and the back 9-10 m short of the neighbours
const plot = { u0: 9.6, u1: 58.0, w0: -34.0, w1: 30.0 };
const plotRing = [[plot.u0, plot.w0], [plot.u1, plot.w0], [plot.u1, plot.w1], [plot.u0, plot.w1]];
const out = {
  about: "tools/villa/site.mjs (claude/villa1): the villa's plot frame + the city's terrain in it (heightmap.js surface, tile H9)",
  tile: TILE, hides_solids: [SOLID], hides_bu_ids: [BU], replaced,
  frame: { origin_city: O.map((v) => Math.round(v * 1000) / 1000), u: U, w: W, rotation_y_rad: rotY, oy: OY,
    note: "three local (x, y, z) = (u, TAW - oy, w); city = origin + u * U + w * W; Blender (X, Y, Z) = (u, -w, TAW - oy)" },
  plot, plot_ring_uw: plotRing, plot_ring_city: plotRing.map(([u, w]) => world(u, w).map((v) => Math.round(v * 1000) / 1000)),
  ground: { ...G, h },
  neighbours,
};
mkdirSync(new URL("models/villa/", ROOT), { recursive: true });
writeFileSync(new URL("models/villa/site.json", ROOT), JSON.stringify(out));
const inPlot = h.filter((_, k) => { const i = k % G.nu, j = Math.floor(k / G.nu); const u = G.u0 + i * G.step, w = G.w0 + j * G.step; return u >= plot.u0 && u <= plot.u1 && w >= plot.w0 && w <= plot.w1; });
console.log(`models/villa/site.json: origin ${O.map((v) => v.toFixed(2))}, rotY ${rotY.toFixed(4)}, ${neighbours.length} neighbours, ground ${G.nu} x ${G.nw} (plot ${Math.min(...inPlot).toFixed(2)}..${Math.max(...inPlot).toFixed(2)} m TAW)`);
