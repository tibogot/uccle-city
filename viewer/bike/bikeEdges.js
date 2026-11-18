// THE EDGE LAYER ("ride on everything", feel round 2; docs/BIKE.md "Feel round 2", docs/bike/FEEL_RESEARCH.md section 2):
// the city's kerbs, ledges, benches, low walls, rails and stairs as TAGGED POLYLINES the bike can query at 120 Hz.
// Pure JS (no three): the same functions run in the tile build / the lab / node tests.
//
// SOURCES (the city's own data, nothing hand-placed):
//   kerbs      data/tiles/<T>/surfaces.json kerbs[] (UrbIS street surfaces: the sidewalk kerb lines, cut at dropped kerbs)
//   benches    data/furniture/<T>.json benches[] (piece, x y z, yaw): the seat's front edge
//   walls/rails data/gardens/<T>.json segs[] + styles[] (front-garden walls with their coping, railings on a low wall)
//   stairs     data/tiles/<T>/features.json lines[] kind "steps" (OSM highway=steps): a smoothed RAMP for the wheels
//   (the lab builds its own bench / ledge / handrail / stairs as the same kinds of docs: viewer/bike/bikeGround.js)
// Each polyline: { type, pts: [[x, yTop, z], ...] (the TOP of the edge, absolute), height (top over the ground), width
// (of the top), grind (pegs can ride it), mat }. A segment chain keeps its neighbours (a grind follows a bend <= 45 deg
// and leaves at a sharper corner).
//
// STORAGE: flat typed arrays (seg xyz pairs, per-segment line id / prev / next, per-line type / height / width / grind)
// and a uniform grid (CELL m) of segment ids, each segment listed in every cell its box + REACH touches: a query is one
// cell's list. bytes(layer) = its memory.

export const EDGE = { kerb: 0, ledge: 1, bench: 2, wall: 3, rail: 4, stair: 5 };
export const EDGE_NAMES = ["kerb", "ledge", "bench", "wall", "rail", "stair"];
/** pegs ride an edge whose top stands at least this far over the ground (lower: the wheels would hit the ground) */
export const GRIND_MIN_H = 0.28;
/** the most a grindable edge may stand over the ground (higher: out of a kid's reach, not a grind: a building's wall) */
export const GRIND_MAX_H = 1.3;
const CELL = 8, REACH = 1.0;

// ------------------------------------------------------------------------------------------------ extraction
/** the kerbs (surfaces.json kerbs[]): kerb lines, the top on the sidewalk side = ground + kerbH. Too low for pegs:
 *  not grindable (they are the hop buffer's / kerb catch's faces, and a ride-along edge later) */
export function kerbEdges(surf, H, { kerbH = 0.13, maxSeg = 4 } = {}) {
  const out = [];
  for (const line of surf.kerbs || []) {
    const pts = densify(line, maxSeg).map(([x, z]) => [x, H(x, z) + kerbH, z]);
    if (pts.length >= 2) out.push({ type: EDGE.kerb, pts, height: kerbH, width: 0.15, grind: false, mat: "stone" });
  }
  return out;
}

/** the street furniture's benches (data/furniture benches[]): the seat's front edge, along the piece's x axis
 *  (world x axis = (cos yaw, -sin yaw)), at the seat's height; dims from viewer/furniture2/cityFurniture.js KEEP */
// (front: the seat's front LIP from the piece's centre, toward +z / the road; the edge a peg grind rides)
export const BENCH = {
  bench_street: { hx: 0.9, hz: 0.3, seat: 0.46, front: 0.27 },
  bench_park: { hx: 0.95, hz: 0.36, seat: 0.46, front: 0.33 },
  bench_backless: { hx: 0.9, hz: 0.23, seat: 0.45, front: 0.21 },
};
/** a bench's collider pieces: the SEAT (to its height: a hop over it, the pegs onto its edge) and, when it has one, the
 *  BACKREST (a strip at its back, to 0.85 m); the first one carries the bench for drawing (what: "bench") */
export function benchPieces(b) {
  const d = BENCH[b.piece] || BENCH.bench_street, c = Math.cos(b.yaw || 0), s = Math.sin(b.yaw || 0), y = b.y || 0;
  const ring = (v0, v1) => [[-d.hx, v0], [d.hx, v0], [d.hx, v1], [-d.hx, v1]].map(([u, v]) => [b.x + u * c + v * s, b.z - u * s + v * c]);
  const out = [{ rings: [ring(-d.hz, d.hz)], base: y - 1, top: y + d.seat, what: "bench", bench: b }];
  if (b.piece !== "bench_backless") out.push({ rings: [ring(-d.hz, -d.hz + 0.08)], base: y - 1, top: y + 0.85, what: "bench back" });
  return out;
}
export function benchEdges(furn) {
  const out = [];
  for (const b of furn.benches || []) {
    const d = BENCH[b.piece] || BENCH.bench_street, c = Math.cos(b.yaw || 0), s = Math.sin(b.yaw || 0);
    // (piece +z = toward the road: world (sin yaw, cos yaw))
    const cx = b.x + s * d.front, cz = b.z + c * d.front, y = (b.y || 0) + d.seat;
    // (width 0: the line IS the lip, the bike grinds beside it, not over the seat)
    out.push({ type: EDGE.bench, pts: [[cx - c * d.hx, y, cz + s * d.hx], [cx + c * d.hx, y, cz - s * d.hx]], height: d.seat, width: 0, grind: true, mat: "wood" });
  }
  return out;
}

/** the front-garden walls and railings (data/gardens segs [x0 y0 z0 x1 y1 z1 style h]): consecutive segments of one
 *  style chained into polylines; a wall's top = its coping (h + CAP), a railing's top = the rail */
export function gardenEdges(doc, { CAP_T = 0.08 } = {}) {
  const out = [], styles = doc.styles || [];
  let cur = null, curStyle = -1;
  const flush = () => { if (cur && cur.pts.length >= 2) out.push(cur); cur = null; };
  for (const g of doc.segs || []) {
    const st = styles[g[6]] || {};
    if (st.kind !== "wall" && st.kind !== "rail") { flush(); continue; }
    const h = g[7], top = h > 0.01 ? h + CAP_T : 0, rail = st.kind === "rail" && st.rail >= 0, H = top + (rail ? st.railH || 0 : 0);
    if (H <= 0.05 || Math.hypot(g[3] - g[0], g[5] - g[2]) < 0.05) { flush(); continue; }
    const a = [g[0], g[1] + H, g[2]], b = [g[3], g[4] + H, g[5]];
    if (cur && curStyle === g[6] && Math.hypot(cur.pts.at(-1)[0] - a[0], cur.pts.at(-1)[2] - a[2]) < 0.02) cur.pts.push(b);
    else {
      flush();
      curStyle = g[6];
      cur = { type: rail ? EDGE.rail : EDGE.wall, pts: [a, b], height: H, width: rail ? 0.04 : 0.3, grind: H >= GRIND_MIN_H && H <= GRIND_MAX_H, mat: rail ? "steel" : "stone" };
    }
  }
  flush();
  return out;
}

/** the stairs (features.json lines kind "steps", OSM highway=steps): the line along the flight, its ground heights at
 *  the vertices (bottom / top); width from the tags or 2 m. Not grindable: a ramp for the wheels (stairRamps) */
export function stairEdges(feats, H, { width = 2.0 } = {}) {
  const out = [];
  for (const l of feats.lines || []) {
    if (l.kind !== "steps" || l.tags?.tunnel) continue;
    const w = parseFloat(l.tags?.width) || width, P = l.line, n = P.length;
    const pts = P.map(([x, z]) => [x, H(x, z), z]);
    // the ENDS: the ground just beyond the flight (the bottom street / the top landing), not the first / last riser
    const beyond = (a, b) => { const dx = a[0] - b[0], dz = a[1] - b[1], L = Math.hypot(dx, dz) || 1; return H(a[0] + dx / L * 0.4, a[1] + dz / L * 0.4); };
    pts[0][1] = beyond(P[0], P[1]); pts[n - 1][1] = beyond(P[n - 1], P[n - 2]);
    out.push({ type: EDGE.stair, pts, height: 0, width: w, grind: false, mat: l.tags?.surface || "stone" });
  }
  return out;
}

/** the lab's / a tile's handrails along stairs (no city data has them yet: OSM handrail tags are absent in Uccle) */
export function handrailEdges(stairs, { side = 1, height = 0.9, inset = 0.15 } = {}) {
  const out = [];
  for (const st of stairs) {
    const P = st.pts, off = st.width / 2 - inset;
    const pts = P.map((p, i) => {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
      return [p[0] - dz / L * off * side, p[1] + height, p[2] + dx / L * off * side];
    });
    out.push({ type: EDGE.rail, pts, height, width: 0.04, grind: true, mat: "steel" });
  }
  return out;
}

function densify(line, maxSeg) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [x0, z0] = line[i - 1], [x1, z1] = line[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / maxSeg));
    for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n]);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the layer
/** lines -> the layer (typed arrays + the grid) over bounds { x0, x1, z0, z1 } */
export function buildEdgeLayer(lines, bounds) {
  let n = 0;
  for (const l of lines) n += l.pts.length - 1;
  const seg = new Float32Array(n * 6), segLine = new Uint32Array(n), segPrev = new Int32Array(n), segNext = new Int32Array(n);
  const L = lines.length, lineType = new Uint8Array(L), lineH = new Float32Array(L), lineW = new Float32Array(L), lineGrind = new Uint8Array(L);
  let k = 0;
  lines.forEach((l, li) => {
    lineType[li] = l.type; lineH[li] = l.height; lineW[li] = l.width; lineGrind[li] = l.grind ? 1 : 0;
    const first = k;
    for (let i = 1; i < l.pts.length; i++, k++) {
      const a = l.pts[i - 1], b = l.pts[i];
      seg.set([a[0], a[1], a[2], b[0], b[1], b[2]], k * 6);
      segLine[k] = li; segPrev[k] = k > first ? k - 1 : -1; segNext[k] = i < l.pts.length - 1 ? k + 1 : -1;
    }
    // a closed line (first point = last): the ends are neighbours
    const p0 = l.pts[0], p1 = l.pts.at(-1);
    if (k - first > 2 && Math.hypot(p0[0] - p1[0], p0[2] - p1[2]) < 0.02) { segPrev[first] = k - 1; segNext[k - 1] = first; }
  });
  const nx = Math.max(1, Math.ceil((bounds.x1 - bounds.x0) / CELL)), nz = Math.max(1, Math.ceil((bounds.z1 - bounds.z0) / CELL));
  const ci = (x) => Math.min(nx - 1, Math.max(0, Math.floor((x - bounds.x0) / CELL))), cj = (z) => Math.min(nz - 1, Math.max(0, Math.floor((z - bounds.z0) / CELL)));
  const count = new Uint32Array(nx * nz + 1);
  const each = (s, f) => {
    const a = Math.min(seg[s * 6], seg[s * 6 + 3]) - REACH, b = Math.max(seg[s * 6], seg[s * 6 + 3]) + REACH;
    const c = Math.min(seg[s * 6 + 2], seg[s * 6 + 5]) - REACH, d = Math.max(seg[s * 6 + 2], seg[s * 6 + 5]) + REACH;
    for (let j = cj(c); j <= cj(d); j++) for (let i = ci(a); i <= ci(b); i++) f(j * nx + i);
  };
  for (let s = 0; s < n; s++) each(s, (c) => count[c + 1]++);
  for (let c = 0; c < nx * nz; c++) count[c + 1] += count[c];
  const items = new Uint32Array(count[nx * nz]), fill = count.slice(0, nx * nz);
  for (let s = 0; s < n; s++) each(s, (c) => { items[fill[c]++] = s; });
  return { n, lines: L, seg, segLine, segPrev, segNext, lineType, lineH, lineW, lineGrind, bounds, cell: CELL, nx, nz, cellStart: count, cellItems: items };
}

/** the layer's memory (bytes) */
export function edgeBytes(E) {
  return E.seg.byteLength + E.segLine.byteLength + E.segPrev.byteLength + E.segNext.byteLength + E.lineType.byteLength + E.lineH.byteLength
    + E.lineW.byteLength + E.lineGrind.byteLength + E.cellStart.byteLength + E.cellItems.byteLength;
}

/** the segments that may lie within REACH (1 m) of (x, z): the cell's list. Returns [start, end) into E.cellItems,
 *  or null outside the layer */
const RANGE = [0, 0];
export function edgeCell(E, x, z) {
  const i = Math.floor((x - E.bounds.x0) / E.cell), j = Math.floor((z - E.bounds.z0) / E.cell);
  if (i < 0 || j < 0 || i >= E.nx || j >= E.nz) return null;
  const c = j * E.nx + i;
  RANGE[0] = E.cellStart[c]; RANGE[1] = E.cellStart[c + 1];
  return RANGE;
}

/** the point of segment s nearest to (x, z) in plan: fills out { u (0..len along it), len, d (signed: + = left of the
 *  segment's direction), tx, tz (unit direction), y (the top there) }; returns the plan distance */
export function segNearest(E, s, x, z, out) {
  const o = s * 6, x0 = E.seg[o], z0 = E.seg[o + 2], dx = E.seg[o + 3] - x0, dz = E.seg[o + 5] - z0;
  const len = Math.hypot(dx, dz) || 1e-6, tx = dx / len, tz = dz / len;
  const px = x - x0, pz = z - z0, u = px * tx + pz * tz, uc = u < 0 ? 0 : u > len ? len : u;
  out.u = u; out.len = len; out.tx = tx; out.tz = tz; out.d = tx * pz - tz * px;
  out.y = E.seg[o + 1] + (E.seg[o + 4] - E.seg[o + 1]) * uc / len;
  return Math.hypot(px - tx * uc, pz - tz * uc);
}

// ------------------------------------------------------------------------------------------------ stairs as ramps
/** a height function with every stair of the layer replaced by a smooth ramp between its ends' heights (the wheels
 *  ride a slope; a riser is never a face): inside the flight's width the ramp, blended to the ground over `blend` m at
 *  the sides and the ends. stairAt(x, z) tells the bike it is on a stair (for the step buzz). */
export function withStairRamps(height, E, { blend = 0.35, round = 0.6 } = {}) {
  const q = { u: 0, len: 0, d: 0, tx: 0, tz: 0, y: 0 };
  const stairs = [];
  for (let s = 0; s < E.n; s++) if (E.lineType[E.segLine[s]] === EDGE.stair) stairs.push(s);
  if (!stairs.length) return height;
  // (its own index: only the cells a stair touches hold a list; every other ground sample is one array read)
  const cells = new Array(E.nx * E.nz).fill(null);
  for (let c = 0; c < E.nx * E.nz; c++) for (let k = E.cellStart[c]; k < E.cellStart[c + 1]; k++) if (E.lineType[E.segLine[E.cellItems[k]]] === EDGE.stair) (cells[c] ||= []).push(E.cellItems[k]);
  const listAt = (x, z) => {
    const i = Math.floor((x - E.bounds.x0) / E.cell), j = Math.floor((z - E.bounds.z0) / E.cell);
    return i < 0 || j < 0 || i >= E.nx || j >= E.nz ? null : cells[j * E.nx + i];
  };
  const h = (x, z) => {
    const base = height(x, z);
    const list = listAt(x, z);
    if (!list) return base;
    let best = base, wBest = 0;
    for (const s of list) {
      const half = E.lineW[E.segLine[s]] / 2;
      segNearest(E, s, x, z, q);
      const ad = Math.abs(q.d);
      if (ad > half + blend) continue;
      // the profile along the flight: straight, its two ends ROUNDED over +-round m (C1: no corner at the bottom or the
      // top for the springs to bottom out on); a segment's inner ends are shared with its neighbour (no rounding there)
      const o = s * 6, y0 = E.seg[o + 1], G = (E.seg[o + 4] - y0) / q.len;
      const rA = E.segPrev[s] < 0 ? round : 0, rB = E.segNext[s] < 0 ? round : 0;
      const ramp = y0 + G * (fil(q.u, rA) - fil(q.u - q.len, rB));
      // along: past the rounded ends the ground takes over; across: the flight's sides blend into the ground
      const fadeA = E.segPrev[s] < 0 ? smooth01((q.u + rA + blend) / blend) : q.u >= 0 ? 1 : 0;
      const fadeB = E.segNext[s] < 0 ? smooth01((q.len - q.u + rB + blend) / blend) : q.u <= q.len ? 1 : 0;
      const w = Math.min(fadeA, fadeB) * smooth01((half + blend - ad) / blend);
      if (w > wBest) { wBest = w; best = base + (ramp - base) * w; }
    }
    return best;
  };
  h.stairAt = (x, z) => {
    const list = listAt(x, z);
    if (list) for (const s of list) if (segNearest(E, s, x, z, q) < E.lineW[E.segLine[s]] / 2 && q.u > 0 && q.u < q.len) return true;
    return false;
  };
  return h;
}
/** u filleted at 0 over +-r: 0 below -r, u above r, (u + r)^2 / 4r between (C1) */
const fil = (u, r) => (r <= 0 ? Math.max(0, u) : u <= -r ? 0 : u >= r ? u : (u + r) * (u + r) / (4 * r));
const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** counts per type (+ grindable metres) for audits */
export function edgeCounts(lines) {
  const c = {};
  for (const l of lines) {
    const k = EDGE_NAMES[l.type], m = l.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - l.pts[i - 1][0], p[2] - l.pts[i - 1][2]) : 0), 0);
    c[k] ||= { lines: 0, m: 0, grindM: 0 };
    c[k].lines++; c[k].m += m; if (l.grind) c[k].grindM += m;
  }
  for (const k in c) { c[k].m = Math.round(c[k].m); c[k].grindM = Math.round(c[k].grindM); }
  return c;
}
