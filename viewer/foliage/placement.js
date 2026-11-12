// PLACEMENT for the foliage systems: from real data (polygons, polylines, the orthophoto) to
//   (1) the FOLIAGE MASK the GPU ground fields read (viewer/foliage/grass.js FoliageMask: R cover, G kind, B flowers,
//       A litter), painted on a canvas from polygons / polylines, and
//   (2) deterministic plant placements (hedge runs along polylines, shrubs and beds inside polygons), every random
//       choice a hash of the WORLD position, so a tile always grows the same garden (Horizon's "locally stable").
//
// The API for the city (later, per tile in the worker; pure JS + OffscreenCanvas, no three):
//   const mb = new MaskBuilder(x0, z0, size, res);
//   mb.fill(rings, { cover, kind, flowers, litter }); mb.stroke(line, width, {...}); mb.cut(rings); mb.data()
//   frontGardens(tile, mb, opts)      UrbIS surfaces + buildings + the orthophoto -> garden cover, kinds, edges
//   hedgeRuns(gardenEdges, ...)       polylines along the street side of front gardens -> [{ points, species, height }]
//   scatterPlants(mb, buildings, ...) shrubs, flower beds, bulbs inside the gardens -> [{ x, z, type, yaw, scale }]
//
// What is DATA and what is RULE (docs/FOLIAGE.md §5): where gardens are = data (UrbIS street surfaces, UrbIS
// building footprints, the orthophoto's green); OSM grass / meadow / garden / park / wood areas = data; WHICH
// hedge species, which shrubs where = rules seeded by position (no Uccle-wide plant inventory exists; the rules are
// tuned to what Street View shows of Uccle's villa and terrace streets: privet / beech / laurel hedges on the
// street line, hydrangeas, roses and lavender in the front beds, box balls by the door).

/** a stable hash of a world position (and a salt) -> [0, 1) */
export function hash2(x, z, salt = 0) {
  let h = Math.imul(Math.floor(x * 100) | 0, 73856093) ^ Math.imul(Math.floor(z * 100) | 0, 19349663) ^ Math.imul(salt + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const KIND = { lawn: 0, verge: 0.5, meadow: 1 };

export class MaskBuilder {
  constructor(x0, z0, size, res) {
    Object.assign(this, { x0, z0, size, res });
    this.k = res / size;
    // one canvas per channel (grey levels in its red), so the channels never premultiply each other away
    this.ch = [0, 1, 2, 3].map(() => { const c = new OffscreenCanvas(res, res); const g = c.getContext("2d", { willReadFrequently: true }); g.fillStyle = "#000"; g.fillRect(0, 0, res, res); return g; });
  }
  px(p) { return [(p[0] - this.x0) * this.k, (p[1] - this.z0) * this.k]; }
  path(g, rings) {
    g.beginPath();
    for (const r of rings) { r.forEach((p, i) => { const [x, y] = this.px(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); }
  }
  /** fill polygons (outer + holes, evenodd); values 0-1 per channel, undefined = leave the channel alone */
  fill(rings, v) {
    const vals = [v.cover, v.kind, v.flowers, v.litter];
    vals.forEach((x, c) => { if (x === undefined) return; const g = this.ch[c]; g.fillStyle = grey(x); this.path(g, rings); g.fill("evenodd"); });
  }
  stroke(line, width, v) {
    const vals = [v.cover, v.kind, v.flowers, v.litter];
    vals.forEach((x, c) => {
      if (x === undefined) return;
      const g = this.ch[c]; g.strokeStyle = grey(x); g.lineWidth = width * this.k; g.lineCap = g.lineJoin = "round";
      g.beginPath(); line.forEach((p, i) => { const [a, b] = this.px(p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke();
    });
  }
  /** remove everything (all channels) inside polygons: buildings, streets */
  cut(rings, channels = [0, 1, 2, 3]) { for (const c of channels) { const g = this.ch[c]; g.fillStyle = "#000"; this.path(g, rings); g.fill("evenodd"); } }
  /** soften edges by `px` pixels (cover only): blades thin out over a bed's edge instead of ending on a line */
  feather(pxRadius = 1) {
    const g = this.ch[0], c = new OffscreenCanvas(this.res, this.res), h = c.getContext("2d");
    h.filter = `blur(${pxRadius}px)`; h.drawImage(g.canvas, 0, 0);
    g.clearRect(0, 0, this.res, this.res); g.drawImage(c, 0, 0);
  }
  /** RGBA8 data for FoliageMask */
  data() {
    const n = this.res * this.res, out = new Uint8Array(n * 4);
    this.ch.forEach((g, c) => { const d = g.getImageData(0, 0, this.res, this.res).data; for (let i = 0; i < n; i++) out[i * 4 + c] = d[i * 4]; });
    return out;
  }
  get(c, x, z) {
    const i = Math.floor((x - this.x0) * this.k), j = Math.floor((z - this.z0) * this.k);
    if (i < 0 || j < 0 || i >= this.res || j >= this.res) return 0;
    return this.ch[c].getImageData(i, j, 1, 1).data[0] / 255;
  }
  /** a snapshot of one channel for many reads */
  snapshot(c) { const d = this.ch[c].getImageData(0, 0, this.res, this.res).data; return (x, z) => {
    const i = Math.floor((x - this.x0) * this.k), j = Math.floor((z - this.z0) * this.k);
    return i < 0 || j < 0 || i >= this.res || j >= this.res ? 0 : d[(j * this.res + i) * 4] / 255; }; }
}
const grey = (x) => { const v = Math.round(Math.max(0, Math.min(1, x)) * 255); return `rgb(${v},${v},${v})`; };

/**
 * Gardens from real data, inside the builder's region:
 *   private land = not a UrbIS street surface, not a UrbIS building footprint;
 *   green        = the tile's orthophoto (1 m) reads as vegetation (G above R and B);
 *   cover        = private & green -> lawn (kind 0), a few wildflowers (daisies) and a little litter;
 *   OSM areas    = grass / park -> lawn, meadow -> meadow (flowers 0.8), verges along roads (grass strips inside the
 *                  street surfaces: UrbIS medians / planted verges) -> verge; wood / scrub -> litter, no grass.
 * Returns the street-side garden edges (polylines on the street boundary with garden behind them) for hedges.
 * `tile` = { surfaces (surfaces.json), buildings (buildings.json .buildings), features (features.json), ortho
 *   (ImageBitmap / HTMLImageElement of ortho.jpg), bounds { x0, z0, size } }.
 */
export function frontGardens(tile, mb, { gardenDepth = 14 } = {}) {
  const { x0, z0, size, res } = mb;
  // 1. green from the orthophoto, resampled into the region
  const oc = new OffscreenCanvas(res, res), og = oc.getContext("2d", { willReadFrequently: true });
  const b = tile.bounds, s = res / size;
  og.imageSmoothingEnabled = true;
  og.drawImage(tile.ortho, (b.x0 - x0) * s, (b.z0 - z0) * s, b.size * s, b.size * s);
  const od = og.getImageData(0, 0, res, res).data;
  // 2. private land: everything minus streets minus buildings
  const priv = new OffscreenCanvas(res, res), pg = priv.getContext("2d", { willReadFrequently: true });
  pg.fillStyle = "#fff"; pg.fillRect(0, 0, res, res); pg.fillStyle = "#000";
  const pathOn = (g, rings) => { g.beginPath(); for (const r of rings) { r.forEach((p, i) => { const x = (p[0] - x0) * s, y = (p[1] - z0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } };
  for (const su of tile.surfaces.surfaces) { pathOn(pg, su.rings); pg.fill("evenodd"); }
  for (const bu of tile.buildings) { pathOn(pg, bu.footprint); pg.fill("evenodd"); }
  const pd = pg.getImageData(0, 0, res, res).data;
  // 3. near the street (front gardens): the street edges stroked gardenDepth wide each side
  const near = new OffscreenCanvas(res, res), ng = near.getContext("2d", { willReadFrequently: true });
  ng.strokeStyle = "#fff"; ng.lineWidth = gardenDepth * 2 * s; ng.lineCap = ng.lineJoin = "round";
  for (const e of tile.surfaces.edges) { ng.beginPath(); e.line.forEach((p, i) => { const x = (p[0] - x0) * s, y = (p[1] - z0) * s; i ? ng.lineTo(x, y) : ng.moveTo(x, y); }); ng.stroke(); }
  const nd = ng.getImageData(0, 0, res, res).data;
  // 4. per pixel
  const cover = new Uint8ClampedArray(res * res), front = new Uint8Array(res * res);
  for (let i = 0; i < res * res; i++) {
    const r = od[i * 4], g = od[i * 4 + 1], bl = od[i * 4 + 2];
    // vegetation index: green over the brighter of red / blue, soft (0 at +0, 1 at +18 levels); shadowed lawns are dark
    // but still green-dominant, paving / roofs / cars are grey or red
    const gi = (g - Math.max(r, bl) * 0.98) / 18;
    const v = Math.max(0, Math.min(1, gi)) * (pd[i * 4] / 255);
    cover[i] = Math.round(v * 255);
    front[i] = nd[i * 4] > 127 && v > 0.3 ? 1 : 0;
  }
  // write into the builder: cover (grass), kind lawn, a few daisies, a little litter (more under trees: later)
  const put = (c, f) => { const g = mb.ch[c], id = g.getImageData(0, 0, res, res); for (let i = 0; i < res * res; i++) { const v = f(i); if (v >= 0) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; } } g.putImageData(id, 0, 0); };
  put(0, (i) => (cover[i] ? Math.max(cover[i], 0) : -1));
  put(1, (i) => (cover[i] ? 0 : -1));
  put(2, (i) => (cover[i] ? 40 : -1));
  put(3, (i) => (cover[i] ? 70 : -1));
  // OSM areas on top (data): meadows, parks, woods
  for (const a of tile.features?.areas ?? []) {
    if (a.kind === "meadow") mb.fill(a.rings, { cover: 1, kind: KIND.meadow, flowers: 0.85, litter: 0.15 });
    else if (a.kind === "grass" || a.kind === "park" || a.kind === "village_green") mb.fill(a.rings, { kind: KIND.lawn });
    else if (a.kind === "wood" || a.kind === "forest" || a.kind === "scrub") mb.fill(a.rings, { cover: 0.15, kind: KIND.verge, flowers: 0.05, litter: 1 });
  }
  // streets and buildings stay bare
  for (const su of tile.surfaces.surfaces) mb.cut(su.rings);
  for (const bu of tile.buildings) mb.cut(bu.footprint);
  return { front, cover, res };
}

/**
 * Hedge runs: walk every street edge (UrbIS surfaces' outer boundary) in steps of 0.5 m; where the land just behind
 * it (0.4-1.2 m in) is a front garden, the edge is a garden front. Consecutive garden samples form a run; each run
 * (a plot frontage, cut where the garden stops: a driveway, a building on the street line) gets one hedge decision,
 * seeded by its start point: a hedge (most), a low box edging, or nothing (an open front). The hedge is set 0.45 m
 * behind the edge (inside the garden).
 */
export function hedgeRuns(tile, mb, gardens, { step = 0.5 } = {}) {
  const { x0, z0, size, res } = mb, s = res / size;
  const isFront = (x, z) => { const i = Math.floor((x - x0) * s), j = Math.floor((z - z0) * s); return i >= 0 && j >= 0 && i < res && j < res && gardens.front[j * res + i] === 1; };
  const runs = [];
  for (const e of tile.surfaces.edges) {
    const L = e.line;
    let cur = null;
    const flush = () => { if (cur && cur.points.length >= 4) runs.push(cur); cur = null; };
    for (let k = 0; k < L.length - 1; k++) {
      const [ax, az] = L[k], [bx, bz] = L[k + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      if (len < 1e-3) continue;
      const tx = dx / len, tz = dz / len;
      for (let t = 0; t < len; t += step) {
        const x = ax + tx * t, z = az + tz * t;
        // which side is the garden? test both normals
        let side = 0;
        for (const sg of [1, -1]) { const nx = -tz * sg, nz = tx * sg; if (isFront(x + nx * 0.8, z + nz * 0.8) && isFront(x + nx * 1.4, z + nz * 1.4)) { side = sg; break; } }
        if (!side) { flush(); continue; }
        const nx = -tz * side, nz = tx * side;
        if (cur && cur.side !== side) flush();
        if (!cur) cur = { side, points: [] };
        cur.points.push([x + nx * 0.45, z + nz * 0.45]);
      }
    }
    flush();
  }
  // one decision per run
  const SPECIES = [["privet", 0.34], ["beech", 0.26], ["laurel", 0.16], ["hornbeam", 0.08], ["box", 0.16]];
  const out = [];
  for (const r of runs) {
    const [px, pz] = r.points[0];
    const h = hash2(px, pz, 5);
    if (h < 0.22) continue;                            // open front
    let u = hash2(px, pz, 6), sp = SPECIES[0][0];
    for (const [name, w] of SPECIES) { if (u < w) { sp = name; break; } u -= w; }
    const height = sp === "box" ? 0.45 + hash2(px, pz, 7) * 0.25 : 0.95 + hash2(px, pz, 7) * 0.9;
    const width = sp === "box" ? 0.35 : 0.55 + hash2(px, pz, 8) * 0.25;
    out.push({ points: r.points, species: sp, height, width });
  }
  return out;
}

/**
 * Shrubs, flower beds and bulbs inside the gardens, on a jittered 1.6 m grid (hash of the cell): only on front-garden
 * cover, not on a hedge line, not touching a building (0.5 m). Near a building's wall (within 2.2 m): a bed
 * (lavender, roses, hydrangea, spring bulbs); in the open garden: an occasional shrub (box ball, laurel, rhododendron)
 * on lawn. Returns [{ x, z, type, yaw, scale }].
 */
export function scatterPlants(tile, mb, gardens, hedges, { cell = 1.6 } = {}) {
  const { x0, z0, size, res } = mb, s = res / size;
  // distance to buildings (coarse): a raster of building footprints dilated
  const bc = new OffscreenCanvas(res, res), bg = bc.getContext("2d", { willReadFrequently: true });
  const strokeRings = (w) => { bg.lineWidth = w * s; bg.lineJoin = "round"; for (const bu of tile.buildings) { bg.beginPath(); for (const r of bu.footprint) { r.forEach((p, i) => { const x = (p[0] - x0) * s, y = (p[1] - z0) * s; i ? bg.lineTo(x, y) : bg.moveTo(x, y); }); bg.closePath(); } bg.stroke(); } };
  bg.strokeStyle = "#808080"; strokeRings(4.4);      // within 2.2 m of a wall
  bg.strokeStyle = "#ffffff"; strokeRings(1.0);      // within 0.5 m: no plants
  const bd = bg.getImageData(0, 0, res, res).data;
  const hc = new OffscreenCanvas(res, res), hg = hc.getContext("2d", { willReadFrequently: true });
  hg.strokeStyle = "#fff"; hg.lineCap = "round";
  for (const h of hedges) { hg.lineWidth = (h.width + 0.8) * s; hg.beginPath(); h.points.forEach((p, i) => { const x = (p[0] - x0) * s, y = (p[1] - z0) * s; i ? hg.lineTo(x, y) : hg.moveTo(x, y); }); hg.stroke(); }
  const hd = hg.getImageData(0, 0, res, res).data;
  const at = (arr, x, z) => { const i = Math.floor((x - x0) * s), j = Math.floor((z - z0) * s); return i < 0 || j < 0 || i >= res || j >= res ? -1 : (j * res + i); };
  const out = [];
  const c0 = Math.floor(x0 / cell), c1 = Math.floor((x0 + size) / cell), r0 = Math.floor(z0 / cell), r1 = Math.floor((z0 + size) / cell);
  for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) {
    const x = (i + 0.15 + 0.7 * hash2(i, j, 11)) * cell, z = (j + 0.15 + 0.7 * hash2(i, j, 12)) * cell;
    const k = at(null, x, z);
    if (k < 0 || !gardens.front[k] || hd[k * 4] > 127) continue;
    const bv = bd[k * 4];
    if (bv > 200) continue;
    const r = hash2(x, z, 13), yaw = hash2(x, z, 14) * Math.PI * 2, sc = 0.8 + hash2(x, z, 15) * 0.45;
    if (bv > 100) {
      // a bed along the wall: 70 % of cells planted
      if (r < 0.3) continue;
      const t = hash2(x, z, 16);
      const type = t < 0.3 ? "hydrangea" : t < 0.55 ? "rose" : t < 0.78 ? "lavender" : t < 0.9 ? "box_ball" : "bulbs";
      out.push({ x, z, type, yaw, scale: sc });
    } else if (r < 0.1) {
      const t = hash2(x, z, 17);
      out.push({ x, z, type: t < 0.4 ? "box_ball" : t < 0.7 ? "laurel" : "rhododendron", yaw, scale: sc });
    }
  }
  return out;
}
