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
// Where no full tile is loaded (the falcon outran the streaming) the nearest tile's edge stands in (clamped).
import { Vector3 } from "three/webgpu";
import { PLACE, churchTop } from "./church.js";

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
  /** the roof grid's cell (m TAW, 0 = none), the hero models' envelopes left out */
  roof(x, z) {
    const t = this.tileAt(x, z); if (!t) return 0;
    let r = rawRoof(t, x, z);
    if (r <= 0) return 0;
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
    o.ceil = Infinity; o.brush = 0; o.tree = null; o.open = false;
    const t = this.tileAt(x, z) || this.nearest(x, z);
    let h = t ? t.hm.ground(x, z) : 0;
    const r = this.roof(x, z); if (r > h) h = r;
    const c = this.churchFloor(x, z); if (c > h) h = c;
    for (const p of this.proxies) {
      if (x < p.bx0 || x > p.bx1 || z < p.bz0 || z > p.bz1) continue;
      const i = Math.floor((x - p.x0) / p.step), j = Math.floor((z - p.z0) / p.step);
      if (i < 0 || j < 0 || i >= p.nx || j >= p.nz) continue;
      const k = j * p.nx + i, v = p.data[k];
      if (v < -1e8) continue;
      // a bridge's arch: its lowest surface well over the ground here, the bird under it
      if (p.low) { const u = p.low[k]; if (u > h + 2.5 && y < u) { if (u < o.ceil) o.ceil = u; o.open = true; continue; } }
      if (v > h) h = v;
    }
    if (this.city.decks?.length && !(o.open && y < o.ceil)) { const d = this.city.deckY(x, z); if (d != null && d > h) h = d; }
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
        else if (lo < o.ceil) o.ceil = lo;
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
  async loadRoosts({ R = 170 } = {}) {
    const near = this.manifest.tiles.filter((t) => t.status === "built" && Math.max(t.bounds.x[0] - PLACE.x, 0, PLACE.x - t.bounds.x[1]) < R + 40 && Math.max(t.bounds.z[0] - PLACE.z, 0, PLACE.z - t.bounds.z[1]) < R + 40);
    const tiles = near.map((t) => ({ json: new URL(t.files.buildings, this.base).href, bin: new URL(t.files.buildingsBin, this.base).href, hide: this.hide }));
    const f = await work({ kind: "ridges", tiles, place: PLACE, R });
    const out = [];
    for (let i = 0; i < f.length; i += 4) out.push({ x: f[i], y: f[i + 1], z: f[i + 2], yaw: f[i + 3], kind: "ridge" });
    this.ridges = out;
    return out;
  }
  /** all roosts (needs the church and the Place's tile): ridges + the church's wing ridges / drum cornice + the setts */
  buildRoosts() {
    const out = [...(this.ridges || [])];
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
    this.roosts = out;
    return out;
  }
}

function rawRoof(t, x, z) {
  const rf = t.roofs;
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
