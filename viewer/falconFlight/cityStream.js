// THE STREAMING CITY as the falcon flight sees it (the city's fly mode; the lab has its fixed cityWorld.js): what
// FalconGame / FalconFlight / AirField / Pigeons ask of a world, answered from the city's OWN loaded tiles
// (viewer/main.js world.tiles: their heightmaps and roof grids, their OSM features), read-only:
//
//   floor(x, z)    the highest solid = max(the DTM, the tile's 2 m roof grid, the Saint-Job church proxy (church.js),
//                  the landmarks' height proxies, the road bridges' decks). A landmark proxy is rasterised (1 m, in
//                  falconWorker.js) from the landmark's own drawn mesh (its lowest LOD: the town hall, the Observatory,
//                  Saint-Pierre, Stalle, the villa, the château, the police station, Calevoet station, the three railway /
//                  road bridges); inside a landmark's footprint the roof grid's flat UrbIS envelope (the replaced solid,
//                  which the roof grid keeps: its top is the spire's) gives way to the model, as it does for the church.
//   liftGrid       the obstacle field for the updrafts (air.js): max floor of 2 x 2 m on a 4 m grid, box-blurred twice
//                  over +-12 m, in an 800 m WINDOW that follows the falcon: rebuilt when it is 140 m off the window's centre
//                  or the loaded tiles change, in SLICES of at most `budget` ms a frame (no hitch), swapped in when done.
//   thermals       a fixed pool of 12 thermal slots (the hints' gulls are per slot): the Place de Saint-Job + the OSM
//                  pitches / parks / grass of the loaded tiles, the nearest within 1.5 km; a slot changes source only
//                  when its own is over 1 km from the falcon (no column vanishes in view).
//   roosts         the pigeons' roosts round the Place: roof ridges (falconWorker.js, from the tiles' buildings.bin), the
//                  church's wing ridges and drum cornice, the Place's setts (on the city's walking surface).
//   column(x, z, y) the solid AT A HEIGHT (the falcon's own collision, viewer/falconFlight/flightModel.js): the floor
//                  under y and the ceiling over it, so the bird can fly UNDER the bridges' arches (the bridge proxies
//                  keep their lowest surface per cell too: where it is 2.5 m over the ground the arch is open) and under
//                  the trees' crowns, and the brush of the leaves. The trees: every drawn street tree of the loaded tiles
//                  (the tile's own placements: viewer/treesStylized.js variant, turn, scale), an ellipsoid crown from the
//                  drawn variant's leaf cards with a DENSE CORE (60 % of the radius, 85 % of the height: a hit, the bird
//                  can land on top) inside a soft shell (brushing through: drag), and the trunk; built per tile in the
//                  worker (an 8 m bucket grid), so a query is a handful of trees.
//   (round 5, rule falcon-gym "landing on what is drawn") column() also stands on what the city DRAWS on the ground:
//                  the drawn ground (the drive surface: the carved terrain + the road / kerb / sidewalk decks, as the car rides
//                  it; the DTM sat up to ~15 cm off it), the drawn roofs interpolated between the 1 m grid's samples (exact on
//                  a roof plane; the nearest sample put the bird up to 0.4 m off a pitched roof), and the FURNITURE: every
//                  collision stand-in the city keeps (front-garden walls / pillars / gates / hedges, benches, shelters, bins,
//                  ...: viewer/gardens/cityGardens.js, the furniture kits) as oriented boxes with their drawn top (a sloping
//                  wall's two ends), 4 m buckets per tile, built in slices as they appear (furnStep). The owner: the falcon
//                  "landed" on a garden wall it did not know, its feet on the pavement inside the wall.
// Where no full tile is loaded (the falcon outran the streaming) the nearest tile's edge stands in (clamped).
import { Vector3, Matrix4 } from "three/webgpu";
import { driveHeight, gather, pointInBuilding } from "../drive/colliders.js";
import { PLACE, churchTop } from "./church.js";

/** ?falconperch=old: the falcon's world before round 5 (the DTM ground, no furniture, the nearest roof sample; the perch
 *  pool unchecked): the owner's "it's floating" A/B */
export const PERCH_OLD = typeof location !== "undefined" && /[?&]falconperch=old(&|$)/.test(location.search);
const HEAT = { pitch: 0.85, playground: 0.8, grass: 0.7, park: 0.65, meadow: 0.7, garden: 0.55, recreation_ground: 0.75, wood: 0.35, scrub: 0.5, farmland: 0.7 };
const SLOTS = 12;
const LIFT = { step: 4, half: 400, rebuild: 140, rad: 3 };

let worker = null, reqId = 0;
const jobs = new Map();
function work(msg, transfer = []) {
  worker ??= (() => {
    const w = new Worker(new URL("./falconWorker.js", import.meta.url), { type: "module" });
    w.onmessage = (e) => { const p = jobs.get(e.data.id); jobs.delete(e.data.id); e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data.r); };
    return w;
  })();
  return new Promise((resolve, reject) => { const id = ++reqId; jobs.set(id, { resolve, reject }); worker.postMessage({ ...msg, id }, transfer); });
}

export class CityFalconWorld {
  /** city: viewer/main.js `world` (tiles, decks, deckY, walkY); manifest: data/tiles/manifest.json; base: its URL */
  constructor({ city, manifest, base, hide = [], log = () => {} }) {
    Object.assign(this, { city, manifest, base, hide, log });
    this.PLACE = PLACE;
    this.church = null;            // { x, z, y0, c, s } (the placement, its rotation)
    this.proxies = [];             // landmark height proxies (rasters)
    this.roosts = [];
    this.liftGrid = null; this.job = null; this.pool = []; this.liftStats = { builds: 0, lastMs: 0, slices: 0, worstSlice: 0 };
    this.thermalSources = [];
    this._t = null;
    this._feat = new WeakMap();
    this.cpu = { lift: 0 };
    this.trees = new Map();        // tile -> tree crowns (worker), null while building
    this.treeList = [];            // the loaded tiles' tree grids
    this.treeDims = null;          // () => { V, nVar, H }: the drawn variants' crowns (cityFlyer.js measures them)
    this.treeStats = { tiles: 0, trees: 0, lastMs: 0 };
    this._col = { floor: 0, ceil: Infinity, brush: 0, tree: null, open: false };
    this._near = [];
    this.furn = new Map();         // tile -> { boxes: number[], n, grid, seen: WeakSet, queue: [] } (round 5)
    this.furnList = [];            // the tiles' furniture sets with a grid
    this.furnStats = { boxes: 0, maxWork: 0 };
    this._M = new Matrix4(); this._W = new Matrix4(); this._fv = new Vector3();
  }
  get tiles() { return this.city.tiles; }

  // ---------------------------------------------------------------------------------------------- the solid
  tileAt(x, z) {
    const c = this._t;
    if (c && x >= c.bounds.x0 && x < c.bounds.x1 && z >= c.bounds.z0 && z < c.bounds.z1 && this.city.tiles.includes(c)) return c;
    for (const t of this.city.tiles) if (x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1) return (this._t = t);
    return null;
  }
  nearest(x, z) {
    let best = null, bd = Infinity;
    for (const t of this.city.tiles) {
      const dx = Math.max(t.bounds.x0 - x, 0, x - t.bounds.x1), dz = Math.max(t.bounds.z0 - z, 0, z - t.bounds.z1), d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  ground(x, z) { const t = this.tileAt(x, z) || this.nearest(x, z); return t ? t.hm.ground(x, z) : 0; }
  /** the DRAWN ground (round 5): the drive surface as the car rides it (the carved terrain + the road / kerb / sidewalk
   *  decks); the DTM where the tile has none */
  drawnGround(x, z) {
    const t = this.tileAt(x, z) || this.nearest(x, z);
    if (!t) return 0;
    const g = t.drive?.ground;
    return g && t.hm?.h && t.hm?.y && !PERCH_OLD ? driveHeight(t.hm, g, x, z) : t.hm.ground(x, z);
  }
  /** the roof grid's cell (m TAW, 0 = none), the hero models' envelopes left out */
  roof(x, z) {
    const t = this.tileAt(x, z); if (!t) return 0;
    let r = rawRoof(t, x, z);
    // (round 5) near a tile's edge: a neighbour's building reaching over it (the drawn grids run 20 m past their tiles)
    const bo = t.bounds;
    if (x - bo.x0 < 20 || bo.x1 - x < 20 || z - bo.z0 < 20 || bo.z1 - z < 20) for (const u of this.city.tiles) {
      const sf = u.roofs?.surf;
      if (u === t || !sf || x < sf.x0 || z < sf.z0 || x >= sf.x0 + sf.nx * sf.step || z >= sf.z0 + sf.nz * sf.step) continue;
      const v = rawRoof(u, x, z); if (v > r) r = v;
    }
    if (r <= 0) return 0;
    // the drawn roof surface leaves the solids a model replaces out already (they are hidden before it is made): only
    // the old flat grid keeps their envelope, which the checks below take out
    if (t.roofs?.surf) return r;
    const ch = this.church;
    if (ch) {
      const dx = x - ch.x, dz = z - ch.z;
      if (dx * dx + dz * dz < 34 * 34) { ch.env ??= this.envTop(ch.x, ch.z); if (ch.env > 0 && Math.abs(r - ch.env) < 0.3) return 0; }
    }
    for (const p of this.proxies) {
      if (!p.mask || x < p.bx0 || x > p.bx1 || z < p.bz0 || z > p.bz1) continue;
      const i = Math.floor((x - p.x0) / p.step), j = Math.floor((z - p.z0) / p.step);
      if (i >= 0 && j >= 0 && i < p.nx && j < p.nz && p.cover[j * p.nx + i]) return 0;
      p.env ??= this.envTop(p.hx, p.hz);
      if (p.env > 0 && Math.abs(r - p.env) < 0.3) return 0;
    }
    return r;
  }
  /** (round 5) snap (x, z) onto the drawn roof grid's sample nearest it (a cell's centre: the drawn triangle's own height
   *  there), stepping 1 cell back along (-di, -dj) when that cell is no roof; out.x / out.z; false when no grid */
  roofCell(x, z, out, di = 0, dj = 0) {
    const t = this.tileAt(x, z), sf = t?.roofs?.surf;
    if (!sf) return false;
    for (let k = 0; k < 2; k++) {
      const i = Math.floor((x - sf.x0) / sf.step) - (k ? Math.sign(di) : 0), j = Math.floor((z - sf.z0) / sf.step) - (k ? Math.sign(dj) : 0);
      if (i < 0 || j < 0 || i >= sf.nx || j >= sf.nz || !sf.data[j * sf.nx + i]) continue;
      out.x = sf.x0 + (i + 0.5) * sf.step; out.z = sf.z0 + (j + 0.5) * sf.step;
      return true;
    }
    return false;
  }
  /** (round 5) in a building's footprint (the tile's drive colliders: UrbIS footprints, exact polygons)? the perches'
   *  check: a thin annex, a wall classed as a building, narrower than the roof grid's 1 m cells, is in no cell */
  inBuilding(x, z) {
    const L = (this._gl ??= []); L.length = 0;
    for (const t of this.city.tiles) {
      const col = t.drive?.col, b = t.bounds;
      if (!col || x < b.x0 - 30 || x > b.x1 + 30 || z < b.z0 - 30 || z > b.z1 + 30) continue;
      gather(col, x, z, 0.02, L);
    }
    return pointInBuilding(L, x, z);
  }
  /** the highest drawn roof sample in the 3 x 3 cells round (x, z) (a thin building's roof is in a neighbour cell) */
  roofNear(x, z) {
    const t = this.tileAt(x, z), sf = t?.roofs?.surf;
    if (!sf) return this.roof(x, z);
    const i = Math.floor((x - sf.x0) / sf.step), j = Math.floor((z - sf.z0) / sf.step);
    let h = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < sf.nx && b < sf.nz) h = Math.max(h, sf.data[b * sf.nx + a] / sf.q);
    }
    return h;
  }
  /** (round 5) the drawn roof grid's own sample nearest (x, z) (m TAW; 0 = none): the drawn triangle at its cell's centre */
  roofSample(x, z) {
    const t = this.tileAt(x, z), sf = t?.roofs?.surf;
    if (!sf) return this.roof(x, z);
    const i = Math.floor((x - sf.x0) / sf.step), j = Math.floor((z - sf.z0) / sf.step);
    return i >= 0 && j >= 0 && i < sf.nx && j < sf.nz ? sf.data[j * sf.nx + i] / sf.q : 0;
  }
  /** the replaced UrbIS solid's top: the roof grid at the model's highest point (null until its tile is in) */
  envTop(x, z) { const t = this.tileAt(x, z); return t ? rawRoof(t, x, z) : null; }
  churchFloor(x, z) {
    const ch = this.church; if (!ch) return -1e9;
    const dx = x - ch.x, dz = z - ch.z;
    if (dx * dx + dz * dz > 40 * 40) return -1e9;
    // into the church frame (rotation y about the placement)
    return ch.y0 + churchTop(dx * ch.c - dz * ch.s, dx * ch.s + dz * ch.c);
  }
  proxyAt(x, z) {
    let h = -1e9;
    for (const p of this.proxies) {
      if (x < p.bx0 || x > p.bx1 || z < p.bz0 || z > p.bz1) continue;
      const i = Math.floor((x - p.x0) / p.step), j = Math.floor((z - p.z0) / p.step);
      if (i >= 0 && j >= 0 && i < p.nx && j < p.nz) { const v = p.data[j * p.nx + i]; if (v > h) h = v; }
    }
    return h;
  }
  /** the highest solid here */
  floor(x, z) {
    const t = this.tileAt(x, z) || this.nearest(x, z);
    let h = t ? t.hm.ground(x, z) : 0;
    const r = this.roof(x, z); if (r > h) h = r;
    const c = this.churchFloor(x, z); if (c > h) h = c;
    if (this.proxies.length) { const p = this.proxyAt(x, z); if (p > h) h = p; }
    if (this.city.decks?.length) { const d = this.city.deckY(x, z); if (d != null && d > h) h = d; }
    return h;
  }

  /** the solid at height y: { floor (the highest surface under the bird), ceil (the lowest over it: an arch, a crown's
   *  underside; Infinity), brush (0..1: how deep in a crown's leaves), tree (the crown it stands on / in), open (under
   *  a bridge) }. outer: the crowns' whole volume is solid (the camera: never inside the leaves). One shared object. */
  column(x, z, y, outer = false) {
    const o = this._col;
    o.ceil = Infinity; o.brush = 0; o.tree = null; o.ceilTree = null; o.open = false; o.furn = -1;
    const t = this.tileAt(x, z) || this.nearest(x, z);
    let h = t ? this.drawnGround(x, z) : 0;
    const r = this.roof(x, z); if (r > h) h = r;
    const c = this.churchFloor(x, z); if (c > h) h = c;
    for (const p of this.proxies) {
      if (x < p.bx0 || x > p.bx1 || z < p.bz0 || z > p.bz1) continue;
      const i = Math.floor((x - p.x0) / p.step), j = Math.floor((z - p.z0) / p.step);
      if (i < 0 || j < 0 || i >= p.nx || j >= p.nz) continue;
      const k = j * p.nx + i, v = p.data[k];
      if (v < -1e8) continue;
      // a bridge's arch: its lowest surface well over the ground here, the bird under it
      if (p.low) { const u = p.low[k]; if (u > h + 2.5 && y < u) { if (u < o.ceil) { o.ceil = u; o.ceilTree = null; } o.open = true; continue; } }
      if (v > h) h = v;
    }
    if (this.city.decks?.length && !(o.open && y < o.ceil)) { const d = this.city.deckY(x, z); if (d != null && d > h) h = d; }
    // (round 5) the furniture: a box's drawn top is a floor under y (or the bird inside its height: its top, a wall), a box
    // over y a ceiling
    for (let f = 0, nf = PERCH_OLD ? 0 : this.furnList.length; f < nf; f++) {
      const F = this.furnList[f], G = F.grid;
      const ci = Math.floor((x - G.x0) / G.cell), cj = Math.floor((z - G.z0) / G.cell);
      if (ci < 0 || cj < 0 || ci >= G.nx || cj >= G.nz) continue;
      const q = cj * G.nx + ci, B = F.arr;
      for (let k = G.start[q], e = G.start[q + 1]; k < e; k++) {
        const b = G.idx[k] * FB, dx = x - B[b], dz = z - B[b + 1];
        const u = dx * B[b + 2] + dz * B[b + 3], v = -dx * B[b + 3] + dz * B[b + 2];
        if (u < -B[b + 4] || u > B[b + 4] || v < -B[b + 5] || v > B[b + 5]) continue;
        const top = B[b + 6] + (B[b + 7] - B[b + 6]) * (0.5 + 0.5 * u / Math.max(B[b + 4], 1e-4)), base = B[b + 8];
        if (base > y + 0.05) { if (base < o.ceil) o.ceil = base; continue; }
        if (top > h) { h = top; o.furn = G.idx[k]; o.furnSet = F; }
      }
    }
    // the trees' crowns and trunks
    const cf = outer ? 1 : 0.6, cv = outer ? 1 : 0.85;
    for (const td of this.treeList) {
      const ci = Math.floor((x - td.x0) / td.cell), cj = Math.floor((z - td.z0) / td.cell);
      if (ci < 0 || cj < 0 || ci >= td.nx || cj >= td.nz) continue;
      const q = cj * td.nx + ci, T = td.T;
      for (let k = td.start[q], e = td.start[q + 1]; k < e; k++) {
        const b = td.idx[k] * 8, cy = T[b + 2], Rh = T[b + 3], Rv = T[b + 4];
        const tx = x - T[b + 5], tz = z - T[b + 6], tr = T[b + 7];
        if (tx * tx + tz * tz < tr * tr && cy > h) { h = cy; o.tree = td.idx[k]; o.treeTile = td; }   // the trunk (up into the crown)
        const dx = x - T[b], dz = z - T[b + 1], d2 = dx * dx + dz * dz;
        if (d2 >= Rh * Rh) continue;
        const dy = (y - cy) / Rv, q2 = d2 / (Rh * Rh) + dy * dy;
        if (q2 < 1 && 1 - Math.sqrt(q2) > o.brush) o.brush = 1 - Math.sqrt(q2);
        const a = Rh * cf, s2 = d2 / (a * a);
        if (s2 >= 1) continue;
        const hv = Rv * cv * Math.sqrt(1 - s2), lo = cy - hv, hi = cy + hv;
        if (y >= lo) { if (hi > h) { h = hi; o.tree = td.idx[k]; o.treeTile = td; } }
        else if (lo < o.ceil) { o.ceil = lo; o.ceilTree = td.idx[k]; }
      }
    }
    o.floor = h;
    return o;
  }
  /** the floor under height y (column().floor) */
  floorAt(x, z, y) { return this.column(x, z, y).floor; }

  // ---------------------------------------------------------------------------------------------- the trees
  /** the loaded tiles' tree crowns: a worker job per new tile (call every second or so) */
  syncTrees() {
    const tiles = this.city.tiles;
    for (const [t] of this.trees) if (!tiles.includes(t)) this.trees.delete(t);
    const dims = this.treeDims?.();
    if (dims) for (const t of tiles) {
      if (this.trees.has(t) || !t.feats?.trees) continue;
      this.trees.set(t, null);
      const b = t.bounds, list = t.feats.trees.filter((q) => q.x >= b.x0 && q.x <= b.x1 && q.z >= b.z0 && q.z <= b.z1);
      const pts = new Float32Array(list.length * 4);
      list.forEach((q, i) => pts.set([q.x, q.z, q.y ?? t.hm.ground(q.x, q.z), q.height ?? 9], i * 4));
      const t0 = performance.now();
      work({ kind: "trees", pts, V: dims.V, nVar: dims.nVar, H: dims.H, x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 }, [pts.buffer]).then((r) => {
        if (!this.trees.has(t)) return;
        r.name = t.name; this.trees.set(t, r);
        this.treeList = [...this.trees.values()].filter(Boolean);
        this.treeStats = { tiles: this.treeList.length, trees: this.treeList.reduce((n, d) => n + d.n, 0), lastMs: performance.now() - t0 };
      }).catch((e) => this.log(`falcon flight: trees ${t.name}: ${e.message}`));
    }
    const list = [...this.trees.values()].filter(Boolean);
    if (list.length !== this.treeList.length) this.treeList = list;
  }
  /** the crowns' tops within R of (x, z) as perches ({ name: "tree", pos, yaw, tree }) (one shared array) */
  treePerches(x, z, R = 28) {
    const out = this._near; out.length = 0;
    for (const td of this.treeList) {
      const i0 = Math.max(0, Math.floor((x - R - td.x0) / td.cell)), i1 = Math.min(td.nx - 1, Math.floor((x + R - td.x0) / td.cell));
      const j0 = Math.max(0, Math.floor((z - R - td.z0) / td.cell)), j1 = Math.min(td.nz - 1, Math.floor((z + R - td.z0) / td.cell));
      if (i0 > i1 || j0 > j1) continue;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const q = j * td.nx + i;
        for (let k = td.start[q]; k < td.start[q + 1]; k++) {
          const n = td.idx[k], b = n * 8, cx = td.T[b], cz = td.T[b + 1];
          // a tree in several cells: only from the cell its crown centre is in
          if (Math.floor((cx - td.x0) / td.cell) !== i || Math.floor((cz - td.z0) / td.cell) !== j) continue;
          if ((cx - x) ** 2 + (cz - z) ** 2 > R * R) continue;
          td.perch ??= new Map();
          let p = td.perch.get(n);
          if (!p) td.perch.set(n, (p = { name: "tree", pos: new Vector3(cx, td.T[b + 2] + td.T[b + 4] * 0.85, cz), yaw: 0, tree: true }));
          out.push(p);
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------- the furniture (round 5)
  /** the loaded tiles' collision stand-ins (call every second or so): new ones are queued for furnStep */
  syncFurniture() {
    const tiles = this.city.tiles;
    for (const [t] of this.furn) if (!tiles.includes(t)) { this.furn.delete(t); this.furnList = this.furnList.filter((F) => F.tile !== t); }
    for (const t of tiles) {
      let F = this.furn.get(t);
      if (!F) this.furn.set(t, (F = { tile: t, boxes: [], n: 0, grid: null, arr: null, seen: new WeakSet(), queue: [], dirty: false }));
      for (const g of t.groups || []) g.traverse?.((m) => {
        if (!m.isInstancedMesh || F.seen.has(m) || !FURN_RE.test(m.name || "")) return;
        F.seen.add(m); F.queue.push({ m, i: 0 });
      });
    }
  }
  /** at most `work` instances a frame into their tile's boxes; a tile's grid rebuilt when its queue is done */
  furnStep(work = 300) {
    let n = 0;
    for (const F of this.furn.values()) {
      while (F.queue.length && n < work) {
        const J = F.queue[0], m = J.m;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (J.i === 0) m.updateWorldMatrix(true, false);
        for (; J.i < m.count && n < work; J.i++, n++) this.addBox(F, m, J.i, bb);
        if (J.i >= m.count) { F.queue.shift(); F.dirty = true; }
      }
      if (!F.queue.length && F.dirty) { this.furnGrid(F); F.dirty = false; n += 50; }
      if (n >= work) break;
    }
    this.furnStats.maxWork = Math.max(this.furnStats.maxWork, n);
    return n;
  }
  addBox(F, m, i, bb) {
    const M = this._M, W = this._W, v = this._fv;
    m.getMatrixAt(i, M); W.multiplyMatrices(m.matrixWorld, M);
    // the top's two ends (along the box's local x) and its bottom, in world space
    const cz = (bb.min.z + bb.max.z) / 2;
    v.set(bb.min.x, bb.max.y, cz).applyMatrix4(W); const ax = v.x, ay = v.y, az = v.z;
    v.set(bb.max.x, bb.max.y, cz).applyMatrix4(W); const bx = v.x, by = v.y, bz = v.z;
    v.set((bb.min.x + bb.max.x) / 2, bb.max.y, bb.min.z).applyMatrix4(W); const sx = v.x, sz = v.z;
    v.set((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2).applyMatrix4(W); const base = v.y;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    let ux = bx - ax, uz = bz - az; const L = Math.hypot(ux, uz);
    if (L < 1e-4) { ux = 1; uz = 0; } else { ux /= L; uz /= L; }
    const hw = Math.abs(-(sx - mx) * uz + (sz - mz) * ux);
    F.boxes.push(mx, mz, ux, uz, Math.max(L / 2, 0.02), Math.max(hw, 0.02), ay, by, base, FURN_KIND(m.name));
    F.n++;
  }
  furnGrid(F) {
    const b = F.tile.bounds, cell = 4, M = 40, x0 = b.x0 - M, z0 = b.z0 - M;
    const nx = Math.ceil((b.x1 - b.x0 + 2 * M) / cell), nz = Math.ceil((b.z1 - b.z0 + 2 * M) / cell);
    const A = F.arr = new Float32Array(F.boxes), cnt = new Uint32Array(nx * nz + 1);
    const cells = (k, fn) => {
      const o = k * FB, r = Math.hypot(A[o + 4], A[o + 5]);
      const i0 = Math.max(0, Math.floor((A[o] - r - x0) / cell)), i1 = Math.min(nx - 1, Math.floor((A[o] + r - x0) / cell));
      const j0 = Math.max(0, Math.floor((A[o + 1] - r - z0) / cell)), j1 = Math.min(nz - 1, Math.floor((A[o + 1] + r - z0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * nx + i);
    };
    for (let k = 0; k < F.n; k++) cells(k, (q) => cnt[q + 1]++);
    for (let q = 0; q < nx * nz; q++) cnt[q + 1] += cnt[q];
    const idx = new Uint32Array(cnt[nx * nz]), fill = cnt.slice(0, nx * nz);
    for (let k = 0; k < F.n; k++) cells(k, (q) => { idx[fill[q]++] = k; });
    F.grid = { x0, z0, cell, nx, nz, start: cnt, idx };
    if (!this.furnList.includes(F)) this.furnList.push(F);
    this.furnStats.boxes = this.furnList.reduce((s, q) => s + q.n, 0);
  }

  /** the Saint-Job church (viewer/stjobModel.js placement: position, rotationY) */
  setChurch(placement) {
    const p = placement.position, a = placement.rotationY;
    // world -> church frame: the inverse of a rotation by a about y
    this.church = { x: p.x, z: p.z, y0: p.y, c: Math.cos(a), s: Math.sin(a), rot: a, env: null };
  }

  /** a landmark's height proxy from its drawn mesh (root: an Object3D in the scene; mask: its footprint overrides the
   *  roof grid's envelope). Main thread: the world positions of its triangles (timed); the raster in the worker. */
  async addProxy(name, root, { mask = true, under = false } = {}) {
    const t0 = performance.now();
    root.updateMatrixWorld(true);
    const parts = [];
    let n = 0;
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const g = o.geometry, P = g.attributes.position, I = g.index;
      const tris = I ? I.count / 3 : P.count / 3;
      parts.push({ o, P, I, tris }); n += tris;
    });
    const pos = new Float32Array(n * 9);
    let k = 0;
    const e = [];
    for (const { o, P, I, tris } of parts) {
      const mats = o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => { const m = o.matrixWorld.clone(); const mi = m.clone(); o.getMatrixAt(i, mi); return m.multiply(mi); }) : [o.matrixWorld];
      for (const M of mats) {
        e.length = 0; for (let q = 0; q < 16; q++) e.push(M.elements[q]);
        for (let t = 0; t < tris; t++) for (let c = 0; c < 3; c++) {
          const v = I ? I.getX(t * 3 + c) : t * 3 + c, x = P.getX(v), y = P.getY(v), z = P.getZ(v);
          if (k + 3 > pos.length) break;
          pos[k++] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[k++] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[k++] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
      }
    }
    const mainMs = performance.now() - t0;
    const r = await work({ kind: "raster", pos: pos.subarray(0, k), step: 1, under }, [pos.buffer]);
    Object.assign(r, { name, mask, bx0: r.x0, bz0: r.z0, bx1: r.x0 + r.nx * r.step, bz1: r.z0 + r.nz * r.step, env: mask ? undefined : 0 });
    if (mask) r.env = undefined;
    this.proxies.push(r);
    this.log(`falcon flight: ${name} proxy ${r.nx} x ${r.nz} m, top ${r.top.toFixed(1)} m TAW, ${n | 0} triangles (main thread ${mainMs.toFixed(1)} ms)`);
    return r;
  }

  // ---------------------------------------------------------------------------------------------- the lift grid
  /** the loaded state the grid depends on */
  signature() { return this.city.tiles.map((t) => t.name).sort().join(",") + `|${this.proxies.length}|${this.church ? 1 : 0}|${this.city.decks?.length || 0}`; }
  /** call once a frame with the falcon's position; works at most `budget` ms; returns true when a new grid was swapped in */
  updateLift(fx, fz, air, budget = 1.5) {
    const t0 = performance.now();
    const S = LIFT;
    if (!this.job) {
      const g = this.liftGrid, sig = this.signature();
      const off = g ? Math.max(Math.abs(fx - g.cx), Math.abs(fz - g.cz)) : Infinity;
      if (!this.city.tiles.length || (g && off < S.rebuild && (g.sig === sig || performance.now() - g.at < 3000))) return false;
      const cx = Math.round(fx / S.step) * S.step, cz = Math.round(fz / S.step) * S.step, nx = Math.round(2 * S.half / S.step) + 1;
      // the arrays are recycled (the old grid's and the scratch), no garbage per build
      const take = () => { const q = this.pool.pop(); return q && q.length === nx * nx ? q : new Float32Array(nx * nx); };
      this.job = { cx, cz, x0: cx - S.half, z0: cz - S.half, nx, nz: nx, a: take(), b: take(), j: 0, pass: 0, sig, t0: performance.now(), slices: 0 };
    }
    const J = this.job, nx = J.nx, nz = J.nz, step = S.step;
    let swapped = false;
    J.slices++;
    while (performance.now() - t0 < budget) {
      if (J.j < nz) {
        // a row of samples: the max of a 2 x 2 m neighbourhood (the roof grid's cells), so narrow buildings count
        const z = J.z0 + J.j * step, row = J.j * nx;
        for (let i = 0; i < nx; i++) {
          const x = J.x0 + i * step;
          J.a[row + i] = Math.max(this.floor(x, z), this.floor(x + 1.5, z), this.floor(x, z + 1.5), this.floor(x + 1.5, z + 1.5));
        }
        J.j++;
      } else if (J.pass < 4) {
        boxBlur(J.a, J.b, nx, nz, S.rad, J.pass % 2 === 0);
        const s = J.a; J.a = J.b; J.b = s; J.pass++;
      } else {
        if (this.liftGrid) this.pool.push(this.liftGrid.data);
        this.pool.push(J.b);
        this.liftGrid = { data: J.a, nx, nz, x0: J.x0, z0: J.z0, step, cx: J.cx, cz: J.cz, sig: J.sig, at: performance.now() };
        if (air) air.grid = this.liftGrid;
        this.liftStats.builds++; this.liftStats.lastMs = performance.now() - J.t0; this.liftStats.slices = J.slices;
        this.job = null; swapped = true;
        break;
      }
    }
    const ms = performance.now() - t0;
    if (ms > this.liftStats.worstSlice) { this.liftStats.worstSlice = ms; this.liftStats.worstAt = Math.round(t0); this.liftStats.worstPhase = J.j < nz ? `row ${J.j}` : `blur ${J.pass}`; }
    this.cpu.lift = this.cpu.lift * 0.95 + ms * 0.05;
    return swapped;
  }

  // ---------------------------------------------------------------------------------------------- thermals
  sourcesOf(t) {
    let s = this._feat.get(t);
    if (s) return s;
    s = [];
    for (const a of t.feats?.areas || []) {
      const heat = HEAT[a.kind]; if (!heat || !a.rings?.[0]) continue;
      const r = a.rings[0];
      let A = 0, cx = 0, cz = 0;
      for (let i = 0; i < r.length; i++) { const [x1, z1] = r[i], [x2, z2] = r[(i + 1) % r.length], c = x1 * z2 - x2 * z1; A += c; cx += (x1 + x2) * c; cz += (z1 + z2) * c; }
      A /= 2; if (Math.abs(A) < 2500) continue;
      cx /= 6 * A; cz /= 6 * A;
      if (cx < t.bounds.x0 || cx >= t.bounds.x1 || cz < t.bounds.z0 || cz >= t.bounds.z1) continue;   // one tile owns it
      s.push({ key: `${t.name}:${a.id ?? s.length}`, x: cx, z: cz, heat: heat * Math.min(1, 0.6 + Math.abs(A) / 40000), radius: Math.min(35, 14 + Math.sqrt(Math.abs(A)) * 0.08), name: `${a.kind}${a.name ? " " + a.name : ""}`, ground: t.hm.ground(cx, cz) });
    }
    this._feat.set(t, s);
    return s;
  }
  /** fill / refresh the air's fixed thermal pool round the falcon (every ~1 s) */
  syncThermals(air, fx, fz) {
    const placeTile = this.tileAt(PLACE.x, PLACE.z);
    const cands = [];
    if (placeTile) cands.push({ key: "place", x: PLACE.x - 6, z: PLACE.z + 4, heat: 1.0, radius: 24, name: "Place de Saint-Job", ground: placeTile.hm.ground(PLACE.x, PLACE.z) });
    for (const t of this.city.tiles) for (const s of this.sourcesOf(t)) cands.push(s);
    for (const s of cands) s.d = Math.hypot(s.x - fx, s.z - fz);
    const want = cands.filter((s) => s.d < 1500).sort((a, b) => a.d - b.d).slice(0, SLOTS);
    const have = new Set(air.thermals.map((th) => th.key));
    const wanted = new Set(want.map((s) => s.key));
    const todo = want.filter((s) => !have.has(s.key));
    for (const th of air.thermals) {
      if (!todo.length) break;
      const free = !th.key || (!wanted.has(th.key) && Math.hypot(th.x - fx, th.z - fz) > 1000);
      if (!free) continue;
      const s = todo.shift();
      Object.assign(th, { key: s.key, x: s.x, z: s.z, heat: s.heat, R0: s.radius, name: s.name, ground: s.ground });
    }
    this.thermalSources = want;
  }

  // ---------------------------------------------------------------------------------------------- roosts
  /** the roof-ridge roosts round the Place (worker), then the church's and the setts once the Place's tile is in */
  /** (round 5) the roof ridges' points within R of (x, z) on their ridge LINES (lift 0: the falcon's perches), a worker job */
  async ridgesNear(x, z, R = 90) {
    const at = { x, z };
    const near = this.manifest.tiles.filter((t) => t.status === "built" && Math.max(t.bounds.x[0] - x, 0, x - t.bounds.x[1]) < R + 40 && Math.max(t.bounds.z[0] - z, 0, z - t.bounds.z[1]) < R + 40);
    const tiles = near.map((t) => ({ json: new URL(t.files.buildings, this.base).href, bin: new URL(t.files.buildingsBin, this.base).href, hide: this.hide }));
    return work({ kind: "ridges", tiles, place: at, R, lift: 0 });
  }
  async loadRoosts({ R = 170, at = PLACE } = {}) {
    const near = this.manifest.tiles.filter((t) => t.status === "built" && Math.max(t.bounds.x[0] - at.x, 0, at.x - t.bounds.x[1]) < R + 40 && Math.max(t.bounds.z[0] - at.z, 0, at.z - t.bounds.z[1]) < R + 40);
    const tiles = near.map((t) => ({ json: new URL(t.files.buildings, this.base).href, bin: new URL(t.files.buildingsBin, this.base).href, hide: this.hide }));
    const f = await work({ kind: "ridges", tiles, place: at, R });
    const out = [];
    for (let i = 0; i < f.length; i += 4) out.push({ x: f[i], y: f[i + 1], z: f[i + 2], yaw: f[i + 3], kind: "ridge" });
    if (at === PLACE) this.ridges = out;
    return out;
  }
  /** another square's roosts (needs its tile and trees): the ridges round it (worker), the tops of the trees' crowns
   *  within R (a point at the top of each, the crowns the falcon can perch on too), its paving / lawn (the city's
   *  walking surface, off the roofs and the crowns' footprints) */
  squareRoosts(sq, ridges, R = 120) {
    const out = [...ridges, ...this.lampRoosts(sq, R)];
    for (const q of this.treePerches(sq.x, sq.z, R)) for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + q.pos.x * 0.37;
      out.push({ x: q.pos.x + Math.cos(a) * 1.2, y: q.pos.y + 0.2, z: q.pos.z + Math.sin(a) * 1.2, yaw: a * 2.3, kind: "tree" });
    }
    for (let i = 0; i < 60; i++) {
      const a = (i * 2.399963) % (Math.PI * 2), r = 4 + Math.sqrt(i / 60) * (sq.r ?? 18);
      const x = sq.x + Math.cos(a) * r, z = sq.z + Math.sin(a) * r;
      if (this.roof(x, z) > 0 || this.column(x, z, 1e4, true).floor > this.ground(x, z) + 1.5) continue;
      const y = this.city.walkY ? this.city.walkY(x, z) : this.ground(x, z);
      out.push({ x, y: y + 0.01, z, yaw: a * 3.1, kind: "ground" });
    }
    out.push(...this.feedClusters(sq, sq.r ?? 18));
    return out;
  }
  /** the street lamps' lantern tops within R of `at` (the loaded tiles' drawn lamps; lampTop: the lantern cap in the lamp's
   *  frame, set by viewer/birds/cityBirds.js from the lamp model): one or two birds a lamp */
  lampRoosts(at, R) {
    const out = [], L = this.lampTop;
    if (!L) return out;
    for (const t of this.city.tiles) for (const s of t.drawn?.lamps || []) {
      if (Math.hypot(s.x - at.x, s.z - at.z) > R || s.y == null) continue;
      const c = Math.cos(s.yaw || 0), sn = Math.sin(s.yaw || 0);
      for (let k = 0; k < L.n; k++) {
        const lx = L.x + (k - (L.n - 1) / 2) * 0.09, lz = L.z;
        out.push({ x: s.x + lx * c + lz * sn, y: s.y + L.y, z: s.z - lx * sn + lz * c, yaw: (s.yaw || 0) + (k ? Math.PI : 0) + Math.PI / 2, kind: "lamp" });
      }
    }
    return out;
  }
  /** feeding groups on a square's paving (viewer/birds/cityBirds.js): pigeons feed in tight groups (bread, a bin, a
   *  bench), 4 spots of 16 points within ~2 m, ground kind; off the roofs, the church, the trees' trunks */
  feedClusters(at, R) {
    const out = [];
    for (let c = 0; c < 4; c++) {
      const a0 = c * 1.9 + at.x * 0.013, r0 = 5 + ((c * 0.618) % 1) * Math.max(2, R - 6);
      const cx = at.x + Math.cos(a0) * r0, cz = at.z + Math.sin(a0) * r0;
      for (let i = 0; i < 16; i++) {
        const a = i * 2.399963, r = 0.35 + Math.sqrt(i / 16) * 2.1;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (this.roof(x, z) > 0 || this.churchFloor(x, z) > -1e8 || this.column(x, z, 1e4, true).floor > this.ground(x, z) + 1.5) continue;
        const y = this.city.walkY ? this.city.walkY(x, z) : this.ground(x, z);
        out.push({ x, y: y + 0.01, z, yaw: a * 1.7 + c, kind: "ground" });
      }
    }
    return out;
  }
  /** all roosts (needs the church and the Place's tile): ridges + the church's wing ridges / drum cornice + the setts */
  buildRoosts() {
    const out = [...(this.ridges || []), ...this.lampRoosts(PLACE, 170)];
    const ch = this.church;
    if (ch) {
      const ends = [25.5, 19.0, 18.4, 19.1, 25.2, 15.6, 15.3, 14.5];   // stjob.json wing_ends_from_centre N NE E SE S SW W NW
      const toW = (x, y, z) => ({ x: ch.x + x * ch.c + z * ch.s, y: ch.y0 + y, z: ch.z - x * ch.s + z * ch.c });
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        for (let r = 12; r < ends[k] - 1.2; r += 0.6) out.push({ ...toW(Math.sin(a) * r, 14.72, -Math.cos(a) * r), yaw: -a + ch.rot + Math.PI / 2 + (out.length % 2 ? Math.PI : 0), kind: "church" });
      }
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2;
        out.push({ ...toW(Math.sin(a) * 10.15, 98.3 - 75.4 + 0.02, -Math.cos(a) * 10.15), yaw: -a + ch.rot, kind: "church" });
      }
    }
    // the Place's setts (feeding on the ground): on the city's walking surface (the paving, its kerbs)
    for (let i = 0; i < 60; i++) {
      const a = (i * 2.399963) % (Math.PI * 2), r = 4 + Math.sqrt(i / 60) * 18;
      const x = PLACE.x + Math.cos(a) * r, z = PLACE.z + Math.sin(a) * r;
      if (this.roof(x, z) > 0 || this.churchFloor(x, z) > -1e8) continue;
      const y = this.city.walkY ? this.city.walkY(x, z) : this.ground(x, z);
      out.push({ x, y: y + 0.01, z, yaw: a * 3.1, kind: "ground" });
    }
    out.push(...this.feedClusters(PLACE, 18));
    this.roosts = out;
    return out;
  }
}

/** (round 5) the furniture stand-ins the falcon stands on: their names (the kits' collision boxes, never drawn) */
export const FURN_RE = /^furniture-(gardenwall|gardenpillar|gardengate|gardenhedge|bench|shelter|adpanel|bikebox|bin|glassbank|fuel|terrace|villo|streetprop|twowheel)$/;
/** floats a furniture box: cx, cz, ux, uz (its length axis), half length, half width, top at -u, top at +u, base, kind */
export const FB = 10;
export const FURN_KINDS = ["wall", "pillar", "gate", "hedge", "furniture"];
const FURN_KIND = (n) => (/gardenwall/.test(n) ? 0 : /gardenpillar/.test(n) ? 1 : /gardengate/.test(n) ? 2 : /gardenhedge/.test(n) ? 3 : 4);

function rawRoof(t, x, z) {
  const rf = t.roofs, sf = rf?.surf;
  if (sf) {                    // the drawn roof surface (viewer/tileData.js roofSurface), 1 m: what the bird sees
    // (round 5) its samples are the drawn triangles AT the cells' centres: bilinear between the four round (x, z) when
    // they lie on one roof plane (within 0.9 m of each other), the nearest otherwise (an edge, a ridge, a stack)
    const fx = (x - sf.x0) / sf.step - 0.5, fz = (z - sf.z0) / sf.step - 0.5;
    const i = Math.floor(fx), j = Math.floor(fz), D = sf.data, nx = sf.nx;
    const ni = Math.floor((x - sf.x0) / sf.step), nj = Math.floor((z - sf.z0) / sf.step);
    const near = ni >= 0 && nj >= 0 && ni < sf.nx && nj < sf.nz ? D[nj * sf.nx + ni] : 0;
    if (near && i >= 0 && j >= 0 && i + 1 < nx && j + 1 < sf.nz) {
      // the samples round (x, z) on the same roof as the nearest one (within 0.6 m of it): 4 = bilinear, 3 = their
      // plane, 2 = along them, else the nearest (at a roof's edge the off-roof samples are 0: the slope there was lost)
      const u = fx - i, w = fz - j, lim = 0.6 * sf.q;
      const a = D[j * nx + i], b = D[j * nx + i + 1], c = D[(j + 1) * nx + i], d = D[(j + 1) * nx + i + 1];
      const ka = a && Math.abs(a - near) < lim, kb = b && Math.abs(b - near) < lim, kc = c && Math.abs(c - near) < lim, kd = d && Math.abs(d - near) < lim;
      const n = ka + kb + kc + kd;
      if (n === 4) return ((a * (1 - u) + b * u) * (1 - w) + (c * (1 - u) + d * u) * w) / sf.q;
      if (n === 3) {
        // the plane through the three: v = v0 + gu u + gw w (corners a (0,0), b (1,0), c (0,1), d (1,1))
        let v0, gu, gw;
        if (!kd) { v0 = a; gu = b - a; gw = c - a; }
        else if (!kc) { gu = b - a; gw = d - b; v0 = a; }
        else if (!kb) { gw = c - a; gu = d - c; v0 = a; }
        else { gu = d - c; gw = d - b; v0 = d - gu - gw; }
        return (v0 + gu * u + gw * w) / sf.q;
      }
      if (n === 2) {
        if (ka && kb) return (a + (b - a) * u) / sf.q;
        if (kc && kd) return (c + (d - c) * u) / sf.q;
        if (ka && kc) return (a + (c - a) * w) / sf.q;
        if (kb && kd) return (b + (d - b) * w) / sf.q;
      }
    }
    return near / sf.q;
  }
  if (!rf) return t.roofAt ? t.roofAt(x, z) : 0;
  const i = Math.floor((x - rf.x0) / rf.step), j = Math.floor((z - rf.z0) / rf.step);
  return i >= 0 && j >= 0 && i < rf.nx && j < rf.nz ? rf.data[j * rf.nx + i] : 0;
}

/** one pass of a box blur (running sum, O(n)), along x (horiz) or z, src -> dst */
function boxBlur(src, dst, nx, nz, rad, horiz) {
  const L = horiz ? nx : nz, M = horiz ? nz : nx;
  for (let m = 0; m < M; m++) {
    const at = (l) => (horiz ? m * nx + l : l * nx + m);
    let s = 0, n = 0;
    for (let l = 0; l <= Math.min(rad, L - 1); l++) { s += src[at(l)]; n++; }
    for (let l = 0; l < L; l++) {
      dst[at(l)] = s / n;
      const add = l + rad + 1, sub = l - rad;
      if (add < L) { s += src[at(add)]; n++; }
      if (sub >= 0) { s -= src[at(sub)]; n--; }
    }
  }
}
