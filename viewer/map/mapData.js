// The baked map (tools/build_map.py -> data/map/map.json + geo.bin) decoded into drawable layers (vendor TiledLayer
// of Path2D), the road graph with bilingual names, street-label anchors, a spatial grid for "which street am I on",
// the walk to the next junction, and the search index. Runs in viewer/map/mapWorker.js (and in the lab's main thread
// with { paths: false } for the fake player's routes). Format: docs/MAP.md.
import { TiledLayer, addLine, addRing, roadLabelAnchors, boundsOf } from '../../vendor/slop-map/mapCore.js';

export const LANGS = ['fr', 'nl'];
const CELL = 40;
// abbreviations people type: st job -> saint job / sint job, av -> avenue, ch -> chaussee
const SYN = { st: ['saint', 'sint', 'st'], ste: ['sainte', 'ste'], av: ['avenue', 'av'], ch: ['chaussee', 'ch'], bd: ['boulevard', 'bd'], pl: ['place', 'plein', 'pl'] };                 // spatial grid cell (m) for the road segments

function distToLine(p, pts) {
  let best = Infinity;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L2));
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t));
  }
  return best;
}
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`\-–.,()]/g, ' ').replace(/\s+/g, ' ').trim();

export async function loadMap(base, { paths = true } = {}) {
  const t0 = performance.now();
  const [doc, bin] = await Promise.all([
    fetch(new URL('map.json', base)).then((r) => { if (!r.ok) throw new Error(`map.json: HTTP ${r.status}`); return r.json(); }),
    fetch(new URL('geo.bin', base)).then((r) => { if (!r.ok) throw new Error(`geo.bin: HTTP ${r.status}`); return r.arrayBuffer(); }),
  ]);
  const tFetch = performance.now() - t0;
  const M = new MapData(doc, bin, paths);
  M.ms = { fetch: +tFetch.toFixed(1), decode: +(performance.now() - t0 - tFetch).toFixed(1) };
  return M;
}

export class MapData {
  constructor(doc, bin, paths) {
    this.doc = doc;
    this.extent = doc.extent;
    this.q = doc.q;
    this.names = doc.names;                       // [[fr, nl], ...]
    this.landmarks = doc.landmarks;
    this.areas = doc.areas;
    this.stops = doc.tram.stops.map(([name, x, z]) => ({ name, x, z }));
    this.boundary = doc.boundary;
    this.decodeRoads();
    this.buildGraph();
    if (paths) { this.decodeGeo(bin); this.buildPaths(); }
    this.labelsByLang = {};
    this.buildSearch();
  }

  // ---------------------------------------------------------------- geometry
  decodeGeo(bin) {
    const dv = new DataView(bin), q = this.q;
    const geo = {};
    for (const k of this.doc.layers) geo[k] = new TiledLayer(500);
    this.counts = {};
    for (const t of this.doc.tiles) {
      let o = t.off;
      const end = t.off + t.len;
      while (o < end) {
        const lid = dv.getUint8(o), n = dv.getUint32(o + 1, true);
        o += 5;
        const name = this.doc.layers[lid], layer = geo[name];
        const line = name === 'paths' || name === 'steps' || name === 'rail' || name === 'tram';
        this.counts[name] = (this.counts[name] || 0) + n;
        for (let i = 0; i < n; i++) {
          const nr = dv.getUint8(o); o += 1;
          const rings = [];
          for (let r = 0; r < nr; r++) {
            const nv = dv.getUint16(o, true); o += 2;
            const f = new Float32Array(nv * 2);
            for (let k = 0; k < nv; k++) {
              f[2 * k] = t.x0 + dv.getInt16(o, true) / q;
              f[2 * k + 1] = t.z0 + dv.getInt16(o + 2, true) / q;
              o += 4;
            }
            rings.push(f);
          }
          if (line) layer.line(rings[0]);
          else layer.ring(rings[0], rings.slice(1));
        }
      }
    }
    this.geo = geo;
  }

  decodeRoads() {
    const q = this.q;
    this.roads = this.doc.roads.map(([nid, cls, w, a, b, oneway, d], i) => {
      const pts = [];
      let x = 0, z = 0;
      for (let k = 0; k < d.length; k += 2) { x += d[k]; z += d[k + 1]; pts.push({ x: x / q, z: z / q }); }
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
      return { i, nid, cls, w, a, b, oneway, pts, len, ...boundsOf(pts) };
    });
  }

  buildPaths() {
    // roads by class and width (2 m buckets): one stroke width per bucket
    const buckets = new Map();
    for (const r of this.roads) {
      const wb = Math.max(2, Math.round(r.w / 2) * 2);
      const key = `${r.cls}|${wb}`;
      if (!buckets.has(key)) buckets.set(key, { cls: r.cls, w: wb, layer: new TiledLayer(500) });
      buckets.get(key).layer.line(r.pts);
    }
    this.roadBuckets = [...buckets.values()].sort((a, b) => b.cls - a.cls || a.w - b.w);   // service first, primary last
    this.tramPath = new Path2D();
    for (const s of this.doc.tram.shapes) addLine(this.tramPath, s.map(([x, z]) => ({ x, z })));
    this.boundaryPath = new Path2D();
    addRing(this.boundaryPath, this.boundary.map(([x, z]) => ({ x, z })));
    const [x0, z0, x1, z1] = this.extent, pad = 20000;
    this.outsidePath = new Path2D();
    this.outsidePath.rect(x0 - pad, z0 - pad, x1 - x0 + 2 * pad, z1 - z0 + 2 * pad);
    addRing(this.outsidePath, this.boundary.map(([x, z]) => ({ x, z })));
  }

  // ---------------------------------------------------------------- graph + spatial grid
  buildGraph() {
    this.nodeRoads = new Map();
    for (const r of this.roads) for (const n of [r.a, r.b]) {
      if (!this.nodeRoads.has(n)) this.nodeRoads.set(n, []);
      this.nodeRoads.get(n).push(r.i);
    }
    // the grid: every segment (consecutive point pair) in each cell its bounding box touches
    this.grid = new Map();
    for (const r of this.roads) {
      for (let k = 1; k < r.pts.length; k++) {
        const p = r.pts[k - 1], q = r.pts[k];
        const i0 = Math.floor(Math.min(p.x, q.x) / CELL), i1 = Math.floor(Math.max(p.x, q.x) / CELL);
        const j0 = Math.floor(Math.min(p.z, q.z) / CELL), j1 = Math.floor(Math.max(p.z, q.z) / CELL);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          const key = i * 100000 + j;
          let c = this.grid.get(key);
          if (!c) this.grid.set(key, (c = []));
          c.push(r.i, k);
        }
      }
    }
  }

  /** Road names in a language: 'fr' | 'nl' */
  nameOf(nid, lang) { return nid < 0 ? null : this.names[nid][lang === 'nl' ? 1 : 0]; }
  /** Same street identity across the FR/NL spelling variants of one street (e.g. three tags of Chaussée d'Alsemberg) */
  keyOf(nid) { return nid < 0 ? null : norm(this.names[nid][0]); }

  /** Nearest road segments to (x, z) within `maxD`: [{ r, k, d, t, px, pz, dir }] sorted by distance (one per road). */
  near(x, z, maxD = 30) {
    const out = new Map();
    const i0 = Math.floor((x - maxD) / CELL), i1 = Math.floor((x + maxD) / CELL), j0 = Math.floor((z - maxD) / CELL), j1 = Math.floor((z + maxD) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const c = this.grid.get(i * 100000 + j);
      if (!c) continue;
      for (let n = 0; n < c.length; n += 2) {
        const r = this.roads[c[n]], k = c[n + 1], p = r.pts[k - 1], q = r.pts[k];
        const dx = q.x - p.x, dz = q.z - p.z, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / L2));
        const px = p.x + dx * t, pz = p.z + dz * t, d = Math.hypot(x - px, z - pz);
        if (d > maxD) continue;
        const prev = out.get(r.i);
        if (!prev || d < prev.d) out.set(r.i, { r, k, d, t, px, pz, dir: Math.atan2(dz, dx) });
      }
    }
    return [...out.values()].sort((a, b) => a.d - b.d);
  }

  /**
   * Where am I: the street under (x, z) (travel bearing `bear`, radians clockwise from north, or null), with
   * hysteresis on `prevKey`, and the next cross street ahead along the graph.
   * -> { cur: { nid, key, d } | null, next: { nids: [...], dist } | null }
   */
  where(x, z, bear, prevKey = null, ahead = 600) {
    const cands = this.near(x, z, 40);
    if (!cands.length) return { cur: null, next: null };
    const fx = bear == null ? 0 : Math.sin(bear), fz = bear == null ? 0 : -Math.cos(bear);
    const cost = (c) => {
      let k = c.d + (c.r.nid < 0 ? 10 : 0) + (c.r.cls === 5 ? 4 : 0);
      if (bear != null) k += (1 - Math.abs(Math.cos(c.dir) * fx + Math.sin(c.dir) * fz)) * 6;
      return k;
    };
    let best = cands[0], bc = cost(best);
    for (const c of cands) { const k = cost(c); if (k < bc) { best = c; bc = k; } }
    if (prevKey) {   // keep the street we were on while it is about as close (no flicker at junctions)
      const same = cands.find((c) => this.keyOf(c.r.nid) === prevKey);
      if (same && cost(same) < bc + 5 && same.d < 28) { best = same; bc = cost(same); }
    }
    if (best.d > 30 || best.r.nid < 0) {
      const named = cands.find((c) => c.r.nid >= 0 && c.d < 30);
      if (!named) return { cur: null, next: null };
      best = named;
    }
    const cur = { nid: best.r.nid, key: this.keyOf(best.r.nid), d: best.d, road: best.r.i };
    if (bear == null) return { cur, next: null };
    // travel direction along the segment: towards node b if it agrees with the bearing
    const forward = Math.cos(best.dir) * fx + Math.sin(best.dir) * fz >= 0;
    return { cur, next: this.nextJunction(best, forward, cur.key, ahead) };
  }

  /** Walk the graph from segment hit `h` (towards b if `forward`) to the first node where another named street meets. */
  nextJunction(h, forward, key, ahead) {
    let r = h.r, dist = 0;
    // distance to the end of this road from the projected point
    const segLen = (k) => Math.hypot(r.pts[k].x - r.pts[k - 1].x, r.pts[k].z - r.pts[k - 1].z);
    if (forward) { dist += segLen(h.k) * (1 - h.t); for (let k = h.k + 1; k < r.pts.length; k++) dist += segLen(k); }
    else { dist += segLen(h.k) * h.t; for (let k = 1; k < h.k; k++) dist += segLen(k); }
    let node = forward ? r.b : r.a;
    const seen = new Set([r.i]);
    for (let hop = 0; hop < 40 && dist < ahead; hop++) {
      const others = (this.nodeRoads.get(node) || []).filter((i) => i !== r.i);
      if (!others.length) return null;      // dead end
      const cross = others.filter((i) => this.roads[i].nid >= 0 && this.keyOf(this.roads[i].nid) !== key && this.roads[i].cls < 5);
      if (cross.length) {
        const keys = new Map();
        for (const i of cross) { const k = this.keyOf(this.roads[i].nid); if (!keys.has(k)) keys.set(k, this.roads[i].nid); }
        return { nids: [...keys.values()].slice(0, 2), dist, node };
      }
      // continue along the same street (else the straightest road on)
      const dirOut = (i) => { const o = this.roads[i], p = o.a === node ? [o.pts[0], o.pts[1]] : [o.pts[o.pts.length - 1], o.pts[o.pts.length - 2]]; return Math.atan2(p[1].z - p[0].z, p[1].x - p[0].x); };
      const pin = forward ? [r.pts[r.pts.length - 2], r.pts[r.pts.length - 1]] : [r.pts[1], r.pts[0]];
      const din = Math.atan2(pin[1].z - pin[0].z, pin[1].x - pin[0].x);
      const turn = (i) => { let d = Math.abs(dirOut(i) - din); if (d > Math.PI) d = 2 * Math.PI - d; return d; };
      const same = others.filter((i) => this.keyOf(this.roads[i].nid) === key && !seen.has(i));
      const pick = (same.length ? same : others.filter((i) => !seen.has(i))).sort((a, b) => turn(a) - turn(b))[0];
      if (pick == null) return null;
      r = this.roads[pick]; seen.add(pick);
      forward = r.a === node;
      dist += r.len;
      node = forward ? r.b : r.a;
    }
    return null;
  }

  // ---------------------------------------------------------------- labels (vendor anchors on chained streets)
  /** Street labels for a language: the same-name road segments chained through the nodes where only they meet. */
  labels(lang) {
    if (this.labelsByLang[lang]) return this.labelsByLang[lang];
    if (!this.chains) this.buildChains();
    const out = this.chains.map((c) => {
      const text = this.nameOf(c.nid, lang);
      return { id: c.id, text, key: c.key, lower: norm(text), raw: c.key, major: c.cls <= 2, highway: c.cls === 0, anchors: c.anchors, pts: c.pts, cum: c.cum, len: c.len,
        minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.maxZ };
    });
    this.labelsByLang[lang] = out;
    return out;
  }

  /**
   * Street polylines for labels: same-name segments chained through every node, taking the straightest same-name road
   * on (a dual carriageway or a junction with a side branch of the same name no longer cuts the chain), then chains
   * running beside a longer chain of the same name (the other carriageway, ≤ 35 m away over ≥ 70 % of their length)
   * dropped, so the street is named once along its middle-most long chain.
   */
  buildChains() {
    const byKey = new Map();
    for (const r of this.roads) {
      if (r.nid < 0 || r.cls === 5 && r.len < 60) continue;
      const k = this.keyOf(r.nid);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }
    const chains = [];
    const dirAt = (r, node) => { const p = r.a === node ? [r.pts[0], r.pts[1]] : [r.pts[r.pts.length - 1], r.pts[r.pts.length - 2]]; return Math.atan2(p[1].z - p[0].z, p[1].x - p[0].x); };
    for (const [key, list] of byKey) {
      const at = new Map();
      for (const r of list) for (const n of [r.a, r.b]) { if (!at.has(n)) at.set(n, []); at.get(n).push(r); }
      const used = new Set();
      const mine = [];
      for (const r0 of [...list].sort((x, y) => y.len - x.len)) {
        if (used.has(r0.i)) continue;
        used.add(r0.i);
        let pts = r0.pts.slice();
        const grow = (endNode, atEnd) => {
          let node = endNode;
          for (let hop = 0; hop < 500; hop++) {
            const end = atEnd ? [pts[pts.length - 2], pts[pts.length - 1]] : [pts[1], pts[0]];
            const din = Math.atan2(end[1].z - end[0].z, end[1].x - end[0].x);
            let best = null, bt = 0.8;           // at most ~45° off straight on
            for (const r of at.get(node) || []) {
              if (used.has(r.i)) continue;
              const t = Math.abs(Math.atan2(Math.sin(dirAt(r, node) - din), Math.cos(dirAt(r, node) - din)));
              if (t < bt) { bt = t; best = r; }
            }
            if (!best) return;
            used.add(best.i);
            const seg = best.a === node ? best.pts : best.pts.slice().reverse();
            if (atEnd) pts = pts.concat(seg.slice(1)); else pts = seg.slice(0, -1).concat(pts);
            node = best.a === node ? best.b : best.a;
          }
        };
        grow(r0.b, true);
        grow(r0.a, false);
        const cum = [0];
        for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z));
        mine.push({ key, nid: r0.nid, cls: Math.min(...list.map((r) => r.cls)), pts, cum, len: cum[cum.length - 1], ...boundsOf(pts) });
      }
      // drop a chain that runs beside a longer one of the same street (the other carriageway)
      mine.sort((x, y) => y.len - x.len);
      const kept = [];
      for (const c of mine) {
        let near = 0, n = 0;
        for (let d = 0; d <= c.len; d += 15) {
          const p = this.pointAt(c, d);
          n++;
          if (kept.some((k) => p.x >= k.minX - 35 && p.x <= k.maxX + 35 && p.z >= k.minZ - 35 && p.z <= k.maxZ + 35 && distToLine(p, k.pts) < 35)) near++;
        }
        if (n && near / n >= 0.7) continue;
        kept.push(c);
      }
      for (const c of kept) { c.id = chains.length; c.anchors = roadLabelAnchors(c.pts, 200); chains.push(c); }
    }
    this.chains = chains;
  }

  /** The point and the direction (radians, smoothed over ±3 m) at arc length d along a chain. */
  pointAt(c, d) {
    const cum = c.cum, pts = c.pts;
    d = Math.max(0, Math.min(c.len, d));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
    const L = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / L;
    return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * t, z: pts[lo].z + (pts[hi].z - pts[lo].z) * t };
  }
  dirAt(c, d) {
    const a = this.pointAt(c, d - 3), b = this.pointAt(c, d + 3);
    return Math.atan2(b.z - a.z, b.x - a.x);
  }

  // ---------------------------------------------------------------- search (bilingual, accent-free)
  buildSearch() {
    const items = [];
    const streets = new Map();
    for (const r of this.roads) {
      if (r.nid < 0) continue;
      const k = this.keyOf(r.nid);
      let s = streets.get(k);
      if (!s) streets.set(k, (s = { type: 'street', nid: r.nid, key: k, len: 0, minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, roads: [] }));
      s.len += r.len; s.roads.push(r.i);
      s.minX = Math.min(s.minX, r.minX); s.maxX = Math.max(s.maxX, r.maxX); s.minZ = Math.min(s.minZ, r.minZ); s.maxZ = Math.max(s.maxZ, r.maxZ);
    }
    for (const s of streets.values()) {
      const [fr, nl] = this.names[s.nid];
      items.push({ ...s, fr, nl, terms: norm(`${fr} ${nl}`), x: (s.minX + s.maxX) / 2, z: (s.minZ + s.maxZ) / 2, w: 1 + Math.min(s.len, 3000) / 3000 });
    }
    for (const l of this.landmarks) items.push({ type: 'landmark', kind: l.kind, fr: l.fr, nl: l.nl, x: l.x, z: l.z, terms: norm(`${l.fr} ${l.nl}`), w: l.kind === 'hero' ? 3 : 1.5 });
    for (const s of this.stops) items.push({ type: 'stop', fr: `${s.name} (tram 92)`, nl: `${s.name} (tram 92)`, x: s.x, z: s.z, terms: norm(`${s.name} tram 92 arret halte`), w: 1.4 });
    for (const a of this.areas) items.push({ type: 'area', kind: a.kind, fr: a.fr, nl: a.nl, x: a.x, z: a.z, terms: norm(`${a.fr} ${a.nl}`), w: 1.6 });
    this.searchItems = items;
  }

  search(text, max = 8) {
    const q = norm(text);
    if (!q) return [];
    const toks = q.split(' ');
    const res = [];
    for (const it of this.searchItems) {
      let score = 0;
      for (const tk of toks) {
        let best = -1;
        for (const alt of SYN[tk] || [tk]) {
          const i = it.terms.indexOf(alt);
          if (i >= 0) best = Math.max(best, i === 0 ? 3 : it.terms[i - 1] === ' ' ? 2 : 0.6);
        }
        if (best < 0) { score = 0; break; }
        score += best;
      }
      if (score > 0) res.push({ it, score: score * it.w });
    }
    res.sort((a, b) => b.score - a.score);
    return res.slice(0, max).map((r) => r.it);
  }
}
