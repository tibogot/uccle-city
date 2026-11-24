// PARK FENCES: the line and the gates of the Parc de Wolvendael and the Parc de la Sauvagère, from data
// (claude/parkfence; docs/PARKFENCE.md, rule park-fence).
//
//   node --import ./tools/road_audit/register.mjs tools/parkfence/build.mjs      -> data/parkfence/parkfence.json
//
// Inputs:
//   - the OSM park polygons (data/raw/osm/area.json: Wolvendael way 14384466, the Sauvagère multipolygon 18270753)
//     and every OSM highway way that crosses them (an entrance: the fence opens there, data/raw/osm/area.json);
//   - the OSM barrier=gate nodes on the line (data/raw/osm/barriers.json);
//   - what we saw on Street View, written down per park in our own words (data/parkfence/<park>.obs.json): the
//     fence type per stretch, the entrances (double / single / open, open or closed, pier size);
//   - the city as drawn, per tile: building footprints (data/tiles/<T>/buildings.json) and the carriageway
//     (viewer/streets/carriageway.js as the city tests it): no panel stands on either (a gap, listed).
// Output (plan only, x / z in city metres; the heights come from the drawn ground at run time, viewer/parkFence.js +
// viewer/parkFenceLayout.js): per park the ring, the entrances, the runs' panels, posts, piers, gate leaves, the gaps.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
globalThis.location ??= { search: "" };
const QUIET = process.argv.includes("--quiet");
const say = (...a) => { if (!QUIET) console.log(...a); };

// pipeline/common.py wgs_to_local as the quadratic of tools/audit/census/gates.mjs (max error 0.7 mm over the city)
export const toLocal = (lon, lat) => { const u = lon - 4.36, v = lat - 50.795;
  return [739.99186 + 70503.28252 * u + 12.080496 * v + 0.0552472 * u * u - 1498.13872 * u * v - 0.0076268 * v * v,
    445.514106 + 7.6565977 * u - 111239.18349 * v - 474.759393 * u * u - 0.174368 * u * v - 14.558541 * v * v]; };

/** the fence types: module width, height, what a run is made of (viewer/parkFenceLayout.js draws them) */
export const TYPES = {
  mesh: { panel: "pf_mesh", h: 1.8, paint: 1, post: true },
  bars: { panel: "pf_bars", h: 1.6, paint: 0, post: true },
  grand: { panel: "pf_rail", h: 1.8, paint: 0, plinth: 0.8, pierEvery: 3, pier: [0.7, 3.0] },
  wall: { panel: null, h: 1.1, plinth: 1.1, pierEvery: 0 },
  // (claude/places2) an old garden wall in brick ~2.3 m (the Papenkasteel's on Rue Kinsendael: the plinth piece in the
  // brick tone, viewer/parkFence.js STONES[3]); none: a stretch the obs file says is closed by something else (a hedge
  // the garden kit draws, the castle's own range on the street, woods): no piece, a listed gap (reason "obs")
  // (claude/places3) its own piece: the scripted 2.3 m brick wall with a stepped coping (tools/blender/parkFenceKit.py
  // pf_brick), set level and stepped down the street (viewer/parkFenceLayout.js brickWall; ?parkpieces=old: the plinth)
  brickwall: { panel: null, h: 2.3, plinth: 2.3, pierEvery: 0, stone: 3, piece: "pf_brick" },
  none: { panel: null, h: 0, none: true },
};
export const MODULE = 2.5;                 // the kit's panel module (m)
const PIER_GAP = 0.02;                     // a leaf's hinge gap at the pier face
const INSET_MAX = 4;
const TREE_CLEAR = 0.45;                    // m: a panel keeps this far from a trunk's centre (at least its radius + 0.15)
/** a tree-field trunk's radius (viewer/drive/colliders.js: the car's circle) */
export const trunkR = (t) => Math.min(0.5, Math.max(0.22, 0.16 + 0.012 * (t.height || 10)));                       // m: how far a run may move into the park off a carriageway

/** a PUBLIC carriageway at (x, z): the drawn carriageway (viewer/streets/carriageway.js inside, 0.1 m in) within an OSM
 *  road's half width + 2 m of its centre line. A measured roadway patch away from every road is a park's own drive
 *  behind its gate (Avenue Wolvendael's main gate: UrbIS roadway 1-5 m inside the gate): an entrance stands on it. */
export function publicRoad(driven, x, z) {
  if (!driven.inside(x, z, 0.1)) return false;
  const n = driven.nearest(x, z);
  if (!n) return true;
  const half = Array.isArray(n.half) ? Math.max(...n.half) : n.half ?? 4;
  return n.d < half + 2;
}
const r2 = (v) => Math.round(v * 100) / 100;
const P2 = (p) => [r2(p[0]), r2(p[1])];

/** a closed ring's arc tools: len, at(s) -> [x, z], dir(s) -> unit along, project(p) -> s, sub(s0, s1) -> polyline */
export function arc(ring) {
  const R = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring.slice();
  const n = R.length, S = [0];
  for (let i = 0; i < n; i++) { const a = R[i], b = R[(i + 1) % n]; S.push(S[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = S[n];
  const wrap = (s) => ((s % L) + L) % L;
  const seg = (s) => { s = wrap(s); let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S[m] <= s) lo = m; else hi = m - 1; } return lo; };
  const at = (s) => { s = wrap(s); const i = seg(s), a = R[i], b = R[(i + 1) % n], t = (s - S[i]) / ((S[i + 1] - S[i]) || 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const dir = (s) => { const i = seg(s), a = R[i], b = R[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const project = (p) => {
    let best = Infinity, bs = 0;
    for (let i = 0; i < n; i++) {
      const a = R[i], b = R[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2));
      const d = Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
      if (d < best) { best = d; bs = S[i] + t * Math.sqrt(L2); }
    }
    return { s: bs, d: best };
  };
  /** the polyline from s0 to s1 (s1 > s0, may pass the start) */
  const sub = (s0, s1) => {
    const out = [at(s0)];
    for (let k = 0; k <= 2 * n; k++) {
      const sv = S[k % n] + Math.floor(k / n) * L;
      if (sv > s0 + 1e-6 && sv < s1 - 1e-6) out.push(R[k % n]);
    }
    out.push(at(s1));
    return out;
  };
  // orientation: + = counter-clockwise in (x, z); the outward normal of a direction (ux, uz)
  let A = 0; for (let i = 0; i < n; i++) { const a = R[i], b = R[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const outward = (u) => (A > 0 ? [u[1], -u[0]] : [-u[1], u[0]]);
  return { R, L, at, dir, project, sub, outward, wrap };
}
export const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

/** Douglas-Peucker on an open polyline (tol m) */
function simplify(P, tol) {
  if (P.length < 3) return P;
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const st = [[0, P.length - 1]];
  while (st.length) {
    const [i, j] = st.pop(); const a = P[i], b = P[j], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1e-9;
    let bd = -1, bk = -1;
    for (let k = i + 1; k < j; k++) { const d = Math.abs((P[k][0] - a[0]) * dz - (P[k][1] - a[1]) * dx) / L; if (d > bd) { bd = d; bk = k; } }
    if (bd > tol) { keep[bk] = 1; st.push([i, bk], [bk, j]); }
  }
  return P.filter((_, k) => keep[k]);
}

export async function build() {
  const area = J("data/raw/osm/area.json").elements;
  const N = new Map(), W = new Map(), Rl = new Map();
  for (const e of area) (e.type === "node" ? N : e.type === "way" ? W : Rl).set(e.id, e);
  const ll = (id) => { const q = N.get(id); return toLocal(q.lon, q.lat); };
  const rings = {};
  rings.wolvendael = W.get(14384466).nodes.map(ll);
  {
    const rel = Rl.get(18270753);
    const segs = rel.members.filter((m) => m.type === "way" && m.role === "outer").map((m) => W.get(m.ref).nodes.slice());
    let ring = segs.shift();
    while (segs.length) { const last = ring[ring.length - 1]; const i = segs.findIndex((s) => s[0] === last || s[s.length - 1] === last); if (i < 0) throw new Error("sauvagere: outer ring breaks"); let s = segs.splice(i, 1)[0]; if (s[0] !== last) s = s.reverse(); ring = ring.concat(s.slice(1)); }
    rings.sauvagere = ring.map(ll);
  }
  // (claude/places2) a private ground with no OSM polygon (the Papenkasteel's grounds): its line is written in its obs
  // file ("ring", city x / z: the street frontages a few metres in from the centre lines, closed through the grounds by
  // a "none" stretch), from the look-only Street View check
  for (const f of fs.readdirSync(path.join(ROOT, "data/parkfence")).filter((n) => n.endsWith(".obs.json")).sort()) {
    const o = J(`data/parkfence/${f}`);
    if (o.ring && !rings[o.park]) rings[o.park] = o.ring.map(P2);
  }
  // every OSM highway way crossing a ring: where, which way, its type
  const crossings = {};
  for (const [park, ring] of Object.entries(rings)) {
    const list = crossings[park] = [];
    const A = arc(ring);
    for (const w of W.values()) {
      const t = w.tags || {}; if (!t.highway) continue;
      const pts = w.nodes.map(ll);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (inRing(ring, ...a) === inRing(ring, ...b)) continue;
        // the crossing point: bisect the segment
        let lo = 0, hi = 1; const ina = inRing(ring, ...a);
        for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (inRing(ring, a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m) === ina) lo = m; else hi = m; }
        const p = [a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo];
        list.push({ way: w.id, highway: t.highway, name: t.name || "", at: p, s: A.project(p).s });
      }
    }
  }
  // OSM gate nodes on the rings (barriers.json)
  const barriers = J("data/raw/osm/barriers.json").elements;
  // the city: buildings + carriageway per tile
  const manifest = J("data/tiles/manifest.json");
  const { streetTile } = await imp("tools/audit/census/lib_street.mjs");
  const { footprintIndex } = await imp("tools/audit/census/lib_mesh.mjs");
  const tileOf = (x, z) => manifest.tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name || null;
  const city = new Map();
  const cityOf = async (T) => {
    if (!T) return null;
    if (city.has(T)) return city.get(T);
    const st = await streetTile(T);
    const bdoc = J(`data/tiles/${T}/buildings.json`);
    const hide = new Set(J("tools/boot3/entries.json").find((e) => !e.lite)?.entry?.hide || []);
    const bl = bdoc.buildings.filter((b) => b.footprint && !hide.has(b.attrs?.BU_ID) && !hide.has(b.id));
    const trees = (J(`data/tiles/${T}/features.json`).trees || []).map((t) => ({ x: t.x, z: t.z, r: trunkR(t), id: t.id, source: t.source }));
    const c = { driven: st.driven, fp: footprintIndex(bl), trees };
    city.set(T, c);
    return c;
  };

  const out = { _: "generated by tools/parkfence/build.mjs from OSM + data/parkfence/<park>.obs.json: do not edit (docs/PARKFENCE.md)", module: MODULE, types: TYPES, parks: {} };
  for (const park of Object.keys(rings)) {
    const obs = J(`data/parkfence/${park}.obs.json`);
    const A = arc(rings[park]);
    const stone = obs.stone ?? 0;
    // ---- the entrances: the observed list (OSM gate nodes), then every OSM crossing not near one (an open entrance)
    const ents = [];
    for (const e of obs.entrances) {
      const { s, d } = A.project(e.at);
      if (d > 3) throw new Error(`${park}: entrance ${e.osm} ${d.toFixed(1)} m off the line`);
      const node = barriers.find((b) => `node/${b.id}` === e.osm);
      ents.push({ ...e, s, w: e.width, from: node ? "osm gate + obs" : "obs", ways: [] });
    }
    for (const c of crossings[park]) {
      let e = ents.find((q) => Math.abs(((c.s - q.s + A.L / 2) % A.L + A.L) % A.L - A.L / 2) < Math.max(7, q.w / 2 + 3));
      if (!e) {
        // no gate here: an open entrance (piers, no leaf), the way's width
        const carriage = !["footway", "path", "cycleway", "steps", "pedestrian", "bridleway", "track", "service", "corridor"].includes(c.highway);
        e = { osm: `way/${c.way}`, at: c.at, s: c.s, kind: "open", state: "open", w: carriage ? 6.0 : c.highway === "service" ? 3.6 : 2.0, pier: [0.5, 2.0], from: "osm crossing", ways: [], note: `${c.highway} ${c.name}`.trim() };
        ents.push(e);
      }
      e.ways.push({ way: c.way, highway: c.highway, name: c.name, at: P2(c.at) });
    }
    ents.sort((a, b) => a.s - b.s);
    // ---- the reserved spans: the opening + a pier each side
    for (const e of ents) { e.half = e.w / 2 + e.pier[0]; }
    // ---- the type per arc position: the observed sections (projected), else the park's default
    const secs = (obs.sections || []).map((q) => {
      const a = A.project(q.from).s, b = A.project(q.to).s;
      let s0 = a, s1 = b; if (((b - a) % A.L + A.L) % A.L > A.L / 2) { s0 = b; s1 = a; }
      if (s1 < s0) s1 += A.L;
      return { type: q.type, s0, s1 };
    });
    const typeAt = (s) => { for (const q of secs) { const v = s < q.s0 ? s + A.L : s; if (v >= q.s0 && v <= q.s1) return q.type; } return obs.default; };
    const panels = [], posts = [], piers = [], leaves = [], gaps = [], plinths = [];
    let insetTotal = 0;
    const treeCuts = [];
    const tile = (p) => tileOf(p[0], p[1]);
    // the panel check against the drawn city: building footprint (0.3 m) or carriageway under it
    const blocked = async (a, b) => {
      for (let k = 0; k <= 8; k++) {
        const x = a[0] + (b[0] - a[0]) * k / 8, z = a[1] + (b[1] - a[1]) * k / 8;
        const c = await cityOf(tileOf(x, z)); if (!c) return "outside";
        if (c.fp.at(x, z, 0.3) >= 0) return "building";
        if (publicRoad(c.driven, x, z)) return "carriageway";
      }
      return null;
    };
    // ---- piers + leaves at each entrance
    for (const e of ents) {
      const c0 = A.at(e.s), u = A.dir(e.s), o = A.outward(u), inw = [-o[0], -o[1]];
      // an entrance on the drawn carriageway moves into the park like the runs (its piers and its centre clear)
      e.inset = 0;
      const at = (d, along = 0) => [c0[0] + inw[0] * d + u[0] * along, c0[1] + inw[1] * d + u[1] * along];
      const onRoad = async (d) => { for (const al of [-(e.w / 2 + e.pier[0] / 2), e.w / 2 + e.pier[0] / 2]) { const p = at(d, al), cc = await cityOf(tileOf(...p)); if (cc && publicRoad(cc.driven, p[0], p[1])) return true; } return false; };
      while (e.inset < INSET_MAX + 2 && (await onRoad(e.inset))) e.inset += 0.25;
      const c = at(e.inset);
      e.at = P2(c);
      const [pw, ph] = e.pier;
      for (const sg of [-1, 1]) {
        const d = e.w / 2 + pw / 2;
        const p = P2([c[0] + u[0] * d * sg, c[1] + u[1] * d * sg]);
        // (a pier still on the public carriageway after the inset: left out, its side opens on the street's edge)
        const cc = await cityOf(tileOf(...p));
        if (cc && publicRoad(cc.driven, p[0], p[1])) { e.pierSkipped = (e.pierSkipped || 0) + 1; continue; }
        piers.push({ at: P2(p), dir: P2(u), w: pw, h: ph, stone, t: tile(p), ent: e.osm });
      }
      if (e.kind === "open") continue;
      const open = e.state === "open";
      const paint = 0;
      if (e.kind === "double") {
        const lw = e.w / 2 - PIER_GAP;
        for (const sg of [-1, 1]) {
          const hinge = [c[0] + u[0] * (e.w / 2 - PIER_GAP) * sg, c[1] + u[1] * (e.w / 2 - PIER_GAP) * sg];
          leaves.push({ piece: "pf_gate2", hinge: P2(hinge), dir: P2([-u[0] * sg, -u[1] * sg]), in: P2(inw), w: r2(lw), h: r2(Math.min(2.6, ph - 0.5)), open: open ? 1.75 : 0, paint, t: tile(hinge), ent: e.osm });
        }
      } else {
        const hinge = [c[0] - u[0] * (e.w / 2 - PIER_GAP), c[1] - u[1] * (e.w / 2 - PIER_GAP)];
        leaves.push({ piece: "pf_gate1", hinge: P2(hinge), dir: P2(u), in: P2(inw), w: r2(e.w - 2 * PIER_GAP), h: r2(Math.min(1.9, ph - 0.3)), open: open ? 1.75 : 0, paint: typeAt(e.s) === "mesh" ? 1 : 0, t: tile(hinge), ent: e.osm });
      }
    }
    // ---- the runs between the entrances' reserved spans
    for (let i = 0; i < ents.length; i++) {
      const e0 = ents[i], e1 = ents[(i + 1) % ents.length];
      const s0 = e0.s + e0.half, s1 = (e1.s - e1.half) + (i === ents.length - 1 ? A.L : 0);
      if (s1 - s0 < 0.3) continue;
      // split the run where the type changes (sampled every 0.5 m)
      const cuts = [s0];
      let ty = typeAt(A.wrap(s0));
      for (let s = s0 + 0.5; s < s1; s += 0.5) { const t2 = typeAt(A.wrap(s)); if (t2 !== ty) { cuts.push(s); ty = t2; } }
      cuts.push(s1);
      for (let k = 0; k < cuts.length - 1; k++) {
        const a = cuts[k], b = cuts[k + 1], type = typeAt(A.wrap((a + b) / 2)), T = TYPES[type];
        if (T.none) {        // (claude/places2) closed by what the obs file says (a hedge, a building, woods): a listed gap
          const pl = simplify(A.sub(a, b), 0.3);
          for (let q = 0; q < pl.length - 1; q++) gaps.push({ a: P2(pl[q]), b: P2(pl[q + 1]), reason: "obs", t: tile(pl[q]) });
          continue;
        }
        const atEntrance0 = k === 0, atEntrance1 = k === cuts.length - 2;
        const atEntranceFix0 = atEntrance0, atEntranceFix1 = atEntrance1;
        const poly = simplify(A.sub(a, b), 0.3);
        // panel joints: each polyline edge cut into ~MODULE pieces
        const pts = [poly[0]];
        for (let q = 0; q < poly.length - 1; q++) {
          const p = poly[q], r = poly[q + 1], L = Math.hypot(r[0] - p[0], r[1] - p[1]); if (L < 0.05) continue;
          const n = Math.max(1, Math.round(L / MODULE));
          for (let m = 1; m <= n; m++) pts.push([p[0] + (r[0] - p[0]) * m / n, p[1] + (r[1] - p[1]) * m / n]);
        }
        // where the OSM line lies on the drawn carriageway (the polygon drawn to the kerb or over the road), the run
        // moves INTO the park (each joint along its inward normal, up to INSET_MAX in 0.25 m steps) until no panel is
        // on it; a joint moves with both its panels (the line stays one chain); a building is not moved round (a gap)
        const inw = pts.map((p, j) => {
          const a = pts[Math.max(0, j - 1)], b = pts[Math.min(pts.length - 1, j + 1)], u = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...u) || 1;
          const o = A.outward([u[0] / l, u[1] / l]); return [-o[0], -o[1]];
        });
        const ins = pts.map(() => 0);
        if (atEntrance0) ins[0] = e0.inset;
        if (atEntrance1) ins[pts.length - 1] = e1.inset;
        const P = (j) => [pts[j][0] + inw[j][0] * ins[j], pts[j][1] + inw[j][1] * ins[j]];
        for (let pass = 0; pass < INSET_MAX / 0.25; pass++) {
          let moved = false;
          for (let j = 0; j < pts.length - 1; j++) {
            if ((await blocked(P(j), P(j + 1))) !== "carriageway") continue;
            for (const q of [j, j + 1]) if (ins[q] < INSET_MAX && !((q === 0 && atEntranceFix0) || (q === pts.length - 1 && atEntranceFix1))) { ins[q] += 0.25; moved = true; }
          }
          if (!moved) break;
        }
        let count = 0, insetM = 0;
        const runPanels = [];
        for (let j = 0; j < pts.length - 1; j++) {
          const pa = P(j), pb = P(j + 1);
          const why = await blocked(pa, pb);
          if (why) { gaps.push({ a: P2(pa), b: P2(pb), reason: why, t: tile(pa) }); runPanels.push(null); continue; }
          const u = [(pb[0] - pa[0]), (pb[1] - pa[1])], l = Math.hypot(...u); u[0] /= l; u[1] /= l;
          const o = A.outward(u);
          const pn = { type, a: P2(pa), b: P2(pb), n: P2(o), t: tile([(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]) };
          if (ins[j] || ins[j + 1]) { pn.inset = r2(Math.max(ins[j], ins[j + 1])); insetM += l; }
          runPanels.push(pn);
          count++;
        }
        insetTotal += insetM;
        // (round 2) A TREE ON THE LINE: the tree field's trunks (data/tiles/<T>/features.json trees: the UrbIS canopy
        // model's measured crowns, a few OSM trees; a trunk was drawn through the mesh) are not moved: the run stops
        // short of the trunk on both sides (TREE_CLEAR from its centre, at least its radius + 0.15 m), the cut ends get a
        // post, as a real fence round an old tree; the trunk closes the gap (it is the car's collider already)
        for (let j = 0; j < runPanels.length; j++) {
          const pn = runPanels[j]; if (!pn) continue;
          const cuts = [];
          const L = Math.hypot(pn.b[0] - pn.a[0], pn.b[1] - pn.a[1]), ux = (pn.b[0] - pn.a[0]) / L, uz = (pn.b[1] - pn.a[1]) / L;
          for (const T2 of new Set([tile(pn.a), tile(pn.b)])) {
            const cc = await cityOf(T2); if (!cc) continue;
            for (const t of cc.trees) {
              const s = (t.x - pn.a[0]) * ux + (t.z - pn.a[1]) * uz, dperp = Math.abs(-(t.x - pn.a[0]) * uz + (t.z - pn.a[1]) * ux);
              const clear = Math.max(TREE_CLEAR, t.r + 0.15);
              if (dperp >= clear || s < -clear || s > L + clear) continue;
              const h = Math.sqrt(clear * clear - dperp * dperp);
              cuts.push([s - h, s + h, t]);
            }
          }
          if (!cuts.length) continue;
          cuts.sort((p, q) => p[0] - q[0]);
          const pieces = []; let from = 0;
          for (const [c0, c1, t] of cuts) {
            if (c0 > from + 0.3) pieces.push([from, c0]);
            from = Math.max(from, c1);
            treeCuts.push({ tree: t.id, at: P2([t.x, t.z]), r: r2(t.r) });
            gaps.push({ a: P2([pn.a[0] + ux * Math.max(0, c0), pn.a[1] + uz * Math.max(0, c0)]), b: P2([pn.a[0] + ux * Math.min(L, c1), pn.a[1] + uz * Math.min(L, c1)]), reason: "tree", t: pn.t });
          }
          if (L > from + 0.3) pieces.push([from, L]);
          const repl = [];
          pieces.forEach(([f0, f1], q) => {
            if (q > 0) repl.push(0);
            const a = P2([pn.a[0] + ux * f0, pn.a[1] + uz * f0]), b = P2([pn.a[0] + ux * f1, pn.a[1] + uz * f1]);
            repl.push({ ...pn, a, b, t: tile([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]) });
          });
          if (pieces.length && pieces[0][0] > 0) repl.unshift(0);
          if (pieces.length && pieces[pieces.length - 1][1] < L) repl.push(0);
          if (!pieces.length) repl.push(0);
          runPanels.splice(j, 1, ...repl);
          j += repl.length - 1;
        }
        // posts (mesh / bars: at every panel joint and the free ends; a run end at an entrance pier needs none),
        // piers (grand: every pierEvery panels and at the ends), plinths (grand / wall: under every panel)
        runPanels.forEach((pn, j) => {
          if (!pn) return;
          if (T.panel) panels.push(pn);
          if (T.plinth) plinths.push({ a: pn.a, b: pn.b, n: pn.n, h: T.plinth, stone: T.stone ?? (type === "wall" ? 1 : stone), t: pn.t, ...(T.piece ? { piece: T.piece } : {}) });
          const prev = runPanels[j - 1], next = runPanels[j + 1];
          if (T.post) {
            // the panel module carries its own post at x = 0 (its start): a post is added only at a run's free END
            if (!next && !(atEntrance1 && j === runPanels.length - 1)) posts.push({ at: pn.b, dir: pn.n, paint: T.paint, h: T.h, t: tile(pn.b) });
            if (j === 0 && atEntrance0) pn.noPost = true;        // the entrance pier stands there
            if (!prev && j > 0) { /* after a gap: the module's own post starts the run */ }
          }
          if (T.pierEvery) {
            const u = [pn.b[0] - pn.a[0], pn.b[1] - pn.a[1]], l = Math.hypot(...u) || 1;
            // (a tree gap is 0, a blocked one null: the plinth stops at a trunk with no pier, a real one after a gap gets one)
            if ((j % T.pierEvery === 0 && !(j === 0 && atEntrance0) && prev !== 0) || (prev === null && j > 0)) piers.push({ at: pn.a, dir: P2([u[0] / l, u[1] / l]), w: T.pier[0], h: T.pier[1], stone, t: tile(pn.a) });
            if (next !== 0 && !next && !(atEntrance1 && j === runPanels.length - 1)) piers.push({ at: pn.b, dir: P2([u[0] / l, u[1] / l]), w: T.pier[0], h: T.pier[1], stone, t: tile(pn.b) });
          }
          pn.paint = T.paint ?? 0; pn.h = T.h; pn.plinth = T.plinth || 0;
        });
        say(`${park}: run ${a.toFixed(0)}-${b.toFixed(0)} m ${type}: ${count} panels`);
      }
    }
    // ---- report
    const panelM = panels.reduce((s, p) => s + Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]), 0) + plinths.filter((q) => q.h > 1).reduce((s, p) => s + Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]), 0);
    say(`${park}: ring ${A.L.toFixed(0)} m, ${ents.length} entrances, ${panels.length} panels (${panelM.toFixed(0)} m), ${plinths.length} plinths, ${posts.length} posts, ${piers.length} piers, ${leaves.length} leaves, inset ${insetTotal.toFixed(0)} m, ${treeCuts.length} trees cut round, ${gaps.length} gaps (${gaps.map((g) => g.reason).join(",")})`);
    out.parks[park] = {
      ring: rings[park].map(P2), length: r2(A.L), stone, ...(obs.set ? { set: obs.set } : {}),
      entrances: ents.map((e) => ({ osm: e.osm, inset: e.inset, ...(e.pierSkipped ? { pierSkipped: e.pierSkipped } : {}), ...(e.opensOnto ? { opensOnto: e.opensOnto } : {}), name: e.name || "", at: e.at, s: r2(e.s), kind: e.kind, state: e.state, w: e.w, pier: e.pier, half: r2(e.half), from: e.from, ways: e.ways, note: e.note || "" })),
      panels, plinths, posts, piers, leaves, gaps, treeCuts,
    };
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const doc = await build();
  const f = path.join(ROOT, "data/parkfence/parkfence.json");
  fs.writeFileSync(f, JSON.stringify(doc));
  console.log(`wrote ${path.relative(ROOT, f)} (${(fs.statSync(f).size / 1024).toFixed(0)} KB)`);
}
