// A REAL CITY SPOT for the bike (feel round 2): one tile's ground, colliders and edge layer, built from the docs the city
// ships (no three, no worker: node tests and the lab share it). The lab loads it with ?city=D6 (debug/bikeLab.js).
//   ground     the tile's DTM (terrain.u16, 1 m, bilinear) + the street surfaces RAISED as real faces: sidewalks and
//              medians +13 cm (viewer/surfaces.js KERB), dropped-kerb ramps +4 cm (rolled), over a window of the tile
//              rasterised at RES m (nearest: a kerb is a face, as the bike needs it; docs/BIKE.md "Into the city")
//   surfaces   roadway asphalt, sidewalk / median / square setts-like asphalt, outside the street surfaces grass
//   colliders  buildings (buildings.json footprints), front-garden walls / railings / pillars / hedges (gardenPieces),
//              benches (data/furniture: boxes from viewer/furniture2 KEEP dims)
//   edges      kerbs, benches, garden walls + rails, stairs (bikeEdges.js); the stairs become ramps in the ground
import { kerbEdges, benchEdges, gardenEdges, stairEdges, buildEdgeLayer, withStairRamps, edgeCounts, BENCH, EDGE, benchPieces } from "./bikeEdges.js";
import { gardenPieces } from "../gardens/gardenClear.js";

export const KERB_H = 0.13;
const RAISE = [0, 0, 0, 0, KERB_H, KERB_H, KERB_H, 0, 0.04];     // surfaces.json classes 0..8 (viewer/surfaces.js RAISE; ramps rolled)

/** the DTM height (absolute m) from terrain.json + its u16 cm grid */
export function terrainHeight(tj, u16) {
  const { x0, z0, step, cols, rows } = tj;
  const at = (x, z) => {
    let fx = (x - x0) / step, fz = (z - z0) / step;
    fx = fx < 0 ? 0 : fx > cols - 1.001 ? cols - 1.001 : fx; fz = fz < 0 ? 0 : fz > rows - 1.001 ? rows - 1.001 : fz;
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * cols + i;
    const a = u16[k], b = u16[k + 1], c = u16[k + cols], d = u16[k + cols + 1];
    return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) / 100;
  };
  // the object form (pt.x, pt.z -> pt.h), the same arithmetic (feel round 4: no doubles across calls)
  at.P = (pt) => {
    let fx = (pt.x - x0) / step, fz = (pt.z - z0) / step;
    fx = fx < 0 ? 0 : fx > cols - 1.001 ? cols - 1.001 : fx; fz = fz < 0 ? 0 : fz > rows - 1.001 ? rows - 1.001 : fz;
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * cols + i;
    const a = u16[k], b = u16[k + 1], c = u16[k + cols], d = u16[k + cols + 1];
    pt.h = ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) / 100;
  };
  return at;
}

/** rasterise the street surfaces' classes (+1; 0 = none) over a window at res m (even-odd scanlines per polygon) */
function rasterSurfaces(surf, win, res) {
  const W = Math.ceil((win.x1 - win.x0) / res), Hh = Math.ceil((win.z1 - win.z0) / res), grid = new Uint8Array(W * Hh);
  const xs = [];
  for (const p of surf.surfaces || []) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const r of p.rings) for (const [x, z] of r) { if (x < a) a = x; if (x > c) c = x; if (z < b) b = z; if (z > d) d = z; }
    if (c < win.x0 || a > win.x1 || d < win.z0 || b > win.z1) continue;
    const j0 = Math.max(0, Math.floor((b - win.z0) / res)), j1 = Math.min(Hh - 1, Math.ceil((d - win.z0) / res));
    for (let j = j0; j <= j1; j++) {
      const z = win.z0 + (j + 0.5) * res;
      xs.length = 0;
      for (const r of p.rings) for (let i = 0, n = r.length; i < n; i++) {
        const [xa, za] = r[i], [xb, zb] = r[(i + 1) % n];
        if ((za <= z) !== (zb <= z)) xs.push(xa + (z - za) / (zb - za) * (xb - xa));
      }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] - win.x0) / res - 0.5)), i1 = Math.min(W - 1, Math.floor((xs[k + 1] - win.x0) / res - 0.5));
        for (let i = i0; i <= i1; i++) grid[j * W + i] = p.c + 1;
      }
    }
  }
  return { grid, W, H: Hh, res, win };
}

/** THE VERGE (browser check 2026-11-21): a raised surface (sidewalk / median / square) meets the ground OUTSIDE the street
 *  surfaces (grass, a park path, a stair's foot) eased down over `verge` m instead of as a 13 cm face: only a kerb (the
 *  raised surface against the roadway) stays a face the bike must hop. Why: D6's own flight ended 1 m short of the
 *  pavement's back edge, so riding down it ended over the bars every time. -> Uint8Array of mm to add (0 = none) */
function vergeRaise(R, verge) {
  const { grid, W, H } = R, n = Math.round(verge / R.res), out = new Uint8Array(W * H);
  if (n < 1) return out;
  const d = new Uint8Array(W * H).fill(254);
  const raised = (c) => c && RAISE[c - 1] >= KERB_H * 0.9;
  for (let k = 0; k < W * H; k++) if (raised(grid[k])) d[k] = 0;
  // two-pass chamfer (cells; a diagonal counts 1: enough at this scale), capped; inlined (4 M cells)
  for (let j = 0; j < H; j++) for (let i = 0, k = j * W; i < W; i++, k++) {
    let v = d[k]; if (!v) continue;
    if (i && d[k - 1] + 1 < v) v = d[k - 1] + 1;
    if (j) { const u = k - W; if (d[u] + 1 < v) v = d[u] + 1; if (i && d[u - 1] + 1 < v) v = d[u - 1] + 1; if (i < W - 1 && d[u + 1] + 1 < v) v = d[u + 1] + 1; }
    d[k] = v;
  }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1, k = j * W + W - 1; i >= 0; i--, k--) {
    let v = d[k]; if (!v) continue;
    if (i < W - 1 && d[k + 1] + 1 < v) v = d[k + 1] + 1;
    if (j < H - 1) { const u = k + W; if (d[u] + 1 < v) v = d[u] + 1; if (i < W - 1 && d[u + 1] + 1 < v) v = d[u + 1] + 1; if (i && d[u - 1] + 1 < v) v = d[u - 1] + 1; }
    d[k] = v;
  }
  for (let k = 0; k < W * H; k++) {
    if (grid[k] || d[k] > n) continue;                // (only the ground outside the street surfaces; the roadway keeps its kerb)
    const t = 1 - d[k] / (n + 1), e = t * t * (3 - 2 * t);
    out[k] = Math.round(KERB_H * 1000 * e);
  }
  return out;
}

/**
 * docs: { terrainJson, terrain (Uint16Array), surfaces, features, furniture, gardens, buildings } (buildings.json)
 * at: [x, z] the spot's centre; half: the window's half size (m); res: the raster (m)
 * -> { height(x, z), surface(x, z), polys, circles, bounds, lines, edges (layer), counts, win, ms }
 */
export function buildCitySpot(docs, at, { half = 80, res = 0.08, verge = 0.6, SURF = { asphalt: 0, setts: 1, grass: 3 }, KIND = { building: 0, furniture: 7, hedge: 8 } } = {}) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const dtm = terrainHeight(docs.terrainJson, docs.terrain);
  const win = { x0: at[0] - half, x1: at[0] + half, z0: at[1] - half, z1: at[1] + half };
  const R = rasterSurfaces(docs.surfaces, win, res);
  const cls = (x, z) => {
    const i = Math.floor((x - win.x0) / res), j = Math.floor((z - win.z0) / res);
    return i < 0 || j < 0 || i >= R.W || j >= R.H ? 0 : R.grid[j * R.W + i];
  };
  const VG = vergeRaise(R, verge);
  const base = (x, z) => {
    const i = Math.floor((x - win.x0) / res), j = Math.floor((z - win.z0) / res);
    if (i < 0 || j < 0 || i >= R.W || j >= R.H) return dtm(x, z);
    const k = j * R.W + i, c = R.grid[k];
    return dtm(x, z) + (c ? RAISE[c - 1] || 0 : VG[k] * 0.001);
  };
  // (object forms: pt.x, pt.z in; the raster read inline)
  const RW = R.W, RH = R.H, gr = R.grid, wx0 = win.x0, wz0 = win.z0, dtmP = dtm.P;
  const clsP = (pt) => { const i = Math.floor((pt.x - wx0) / res), j = Math.floor((pt.z - wz0) / res); return i < 0 || j < 0 || i >= RW || j >= RH ? 0 : gr[j * RW + i]; };
  base.P = (pt) => {
    dtmP(pt);
    const i = Math.floor((pt.x - wx0) / res), j = Math.floor((pt.z - wz0) / res);
    if (i < 0 || j < 0 || i >= RW || j >= RH) return;
    const k = j * RW + i, c = gr[k];
    if (c) pt.h += RAISE[c - 1] || 0; else pt.h += VG[k] * 0.001;
  };
  // the edges (kerb / stair heights from the ground just built: the kerb's top on the raised side = the DTM + KERB_H)
  const inWin = (l) => l.pts.some((p) => p[0] > win.x0 && p[0] < win.x1 && p[2] > win.z0 && p[2] < win.z1);
  const lines = [
    ...kerbEdges(docs.surfaces, dtm, { kerbH: KERB_H }),
    ...benchEdges(docs.furniture || {}),
    ...gardenEdges(docs.gardens || {}),
    ...stairEdges(docs.features || {}, base),
  ].filter(inWin);
  const edges = buildEdgeLayer(lines, win);
  const height = withStairRamps(base, edges);
  const surface = (x, z) => { const c = cls(x, z); return !c ? SURF.grass : c - 1 === 0 || c - 1 === 1 || c - 1 === 3 ? SURF.asphalt : SURF.setts; };
  surface.P = (pt) => { const c = clsP(pt); return !c ? SURF.grass : c - 1 === 0 || c - 1 === 1 || c - 1 === 3 ? SURF.asphalt : SURF.setts; };
  // the colliders
  const polys = [], circles = [];
  const near = (ring) => ring.some(([x, z]) => x > win.x0 - 5 && x < win.x1 + 5 && z > win.z0 - 5 && z < win.z1 + 5);
  for (const b of docs.buildings?.buildings || []) if (b.footprint?.length && near(b.footprint[0])) polys.push({ rings: b.footprint, kind: KIND.building, drawBase: b.base, drawTop: b.top });
  for (const p of gardenPieces(docs.gardens || {})) if (near(p.rings[0])) polys.push({ rings: p.rings, kind: p.kind === 8 ? KIND.hedge : KIND.furniture, base: p.base, top: p.kind === 8 ? undefined : p.top });
  for (const b of docs.furniture?.benches || []) {
    for (const piece of benchPieces(b)) if (near(piece.rings[0])) polys.push({ ...piece, kind: KIND.furniture });
  }
  // the spots: the top of the window's first stairs (ride down them), 2.5 m before a bench along it, the centre
  const spots = { centre: [at[0], at[1], 0] };
  const st = lines.find((l) => l.type === EDGE.stair);
  if (st) { let a = st.pts[0], b = st.pts.at(-1); if (a[1] < b[1]) [a, b] = [b, a]; const L = Math.hypot(b[0] - a[0], b[2] - a[2]), ux = (b[0] - a[0]) / L, uz = (b[2] - a[2]) / L; spots.stairs = [a[0] - ux * 3, a[2] - uz * 3, Math.atan2(ux, uz)]; }
  lines.filter((l) => l.type === EDGE.bench).slice(0, 3).forEach((l, i) => { const [a, b] = l.pts, L = Math.hypot(b[0] - a[0], b[2] - a[2]), ux = (b[0] - a[0]) / L, uz = (b[2] - a[2]) / L; spots[`bench${i + 1}`] = [a[0] - ux * 4, a[2] - uz * 4, Math.atan2(ux, uz)]; });
  const ms = typeof performance !== "undefined" ? performance.now() - t0 : 0;
  return { height, surface, polys, circles, bounds: win, lines, edges, counts: edgeCounts(lines), win, raster: R, spots, ms };
}

/** the docs of tile T read with readFile(path) -> Buffer / ArrayBuffer (node: fs.readFileSync; the lab: fetch) */
export async function loadCityDocs(T, read, root = "") {
  const J = async (p) => JSON.parse(new TextDecoder().decode(await read(root + p)));
  const raw = await read(root + `data/tiles/${T}/terrain.u16`);
  const ab = raw.buffer ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) : raw;
  const opt = (p) => J(p).catch(() => ({}));
  return {
    terrainJson: await J(`data/tiles/${T}/terrain.json`), terrain: new Uint16Array(ab),
    surfaces: await J(`data/tiles/${T}/surfaces.json`), features: await J(`data/tiles/${T}/features.json`),
    furniture: await opt(`data/furniture/${T}.json`), gardens: await opt(`data/gardens/${T}.json`), buildings: await opt(`data/tiles/${T}/buildings.json`),
  };
}
