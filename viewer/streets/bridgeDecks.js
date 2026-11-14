// ROAD BRIDGES FROM OSM (owner, 2026-11-13: "the car falls in the bridge at the Saint-Job station" — it ended up in the
// railway cutting under Avenue Carsoel). The terrain is the LiDAR DTM, BARE EARTH: under a road bridge it has the
// cutting / the brook, not the deck. Only the scripted hero bridges (viewer/rail/railData.js roadDeckGround) gave the
// road a deck height; every other road tagged bridge=yes followed the ground down (Carsoel: 79.5 m -> 71 m -> 77.6 m,
// under the tram deck), and so did the car and the walker.
//
// Here: per road tagged bridge (not "no"), a straight deck between the ground a few metres BEYOND each end (past the
// abutments, where the DTM is the street again), never below the ground (the approaches stay on the terrain). Used as
// the road stage's ground in the tile worker (drawn road, sidewalks, the car's drive surface; the terrain weld skips it
// by itself: viewer/roadBuild.js weldSkip), and on the main thread as a world deck (walk / third person / car):
// viewer/main.js world.decks. Uccle's 13 OSM road bridges cross the railway or a brook: nothing drives under them.
//
//   const B = bridgeDecks(roadsDoc, hm.ground)   ->  { decks: [descriptor...], wrap(ground) -> ground' }
//   deckHeight(descriptor, ground)               ->  (x, z) -> m TAW on the deck, or null off it

const EXT = 6;        // m beyond each end where the deck's height is taken (past the abutment)
const HALF = 6;       // m either side of the centre line when the road has no lane widths
const SLAB = { depth: 0.9, parapetW: 0.3, parapetH: 1.0, sink: 0.03, step: 2 };
const COL = { asphalt: [0.115, 0.118, 0.125], sidewalk: [0.36, 0.35, 0.33], concrete: [0.42, 0.41, 0.38], soffit: [0.25, 0.245, 0.23] };

/** the road's half width on its wider side, and its carriageway's (driving / parking / tram lanes; sidewalks outside) */
function widths(r) {
  const side = (a) => (a || []).reduce((s, l) => s + (+l.width || 0), 0);
  const road = (a) => (a || []).filter((l) => l.type !== "sidewalk").reduce((s, l) => s + (+l.width || 0), 0);
  const half = Math.max(side(r.lanes?.left), side(r.lanes?.right));
  const carr = Math.max(road(r.lanes?.left), road(r.lanes?.right));
  return half > 1 ? { half: Math.min(14, half + SLAB.parapetW), carr: Math.min(half, carr || half) } : { half: HALF, carr: HALF - 2 };
}

/** the road's centre line as [[x, z], ...] from roads.json (node a, control points, node b) */
function centreLine(r, nodes) {
  const a = nodes.get(r.a), b = nodes.get(r.b);
  if (!a || !b) return null;
  const pts = [[a.x, a.z], ...(r.pts || []).map((p) => [p.x, p.z]), [b.x, b.z]];
  return pts.length >= 2 ? pts : null;
}

/** descriptors of the bridge decks in a roads.json document (plain data: goes from the worker to the page) */
export function bridgeDescriptors(roadsDoc, ground) {
  const nodes = new Map((roadsDoc.nodes || []).map((n) => [n.id, n]));
  const out = [];
  for (const r of roadsDoc.roads || []) {
    const br = r.meta?.bridge;
    if (!br || br === "no") continue;
    const line = centreLine(r, nodes);
    if (!line) continue;
    // extend both ends along their own direction
    const ext = (p, q) => { const dx = p[0] - q[0], dz = p[1] - q[1], L = Math.hypot(dx, dz) || 1; return [p[0] + dx / L * EXT, p[1] + dz / L * EXT]; };
    const pts = [ext(line[0], line[1]), ...line, ext(line[line.length - 1], line[line.length - 2])];
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const h0 = ground(pts[0][0], pts[0][1]), h1 = ground(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    const { half, carr } = widths(r);
    const d = { id: r.id, name: r.meta?.name || "", tram: !!r.meta?.tram, pts, cum, h0, h1, half, carr, span: [EXT, cum[cum.length - 1] - EXT],
      box: [x0 - half, z0 - half, x1 + half, z1 + half] };
    // the deck's profile, every PROF m: the straight line between the grounds past the ends, but never under the ground
    // on the bridge's centre line (a hump the DTM keeps, e.g. Avenue des Hospices, E10: the straight deck ran up to
    // 0.6 m UNDER the drawn road there, its parapets 0.35 m proud of the street, still 1 m walls for the car)
    const L = cum[cum.length - 1] || 1, n = Math.max(1, Math.ceil(L / PROF));
    d.prof = [];
    for (let k = 0; k <= n; k++) {
      const sk = (L * k) / n, line = h0 + (h1 - h0) * (sk / L);
      if (sk < d.span[0] || sk > d.span[1]) { d.prof.push(line); continue; }
      const q = at(d, sk);
      d.prof.push(Math.max(line, ground(q.x, q.z)));
    }
    out.push(d);
  }
  return out;
}

/** (x, z) -> the deck's height there, or null off the deck or where the ground is at or over it (there the road
 *  stage's ground IS the ground: wrap() falls back to it). drawn = true (the page's world decks, viewer/main.js): only
 *  over the DRAWN slab (deckMesh: the bridge's own ends, not the EXT m past them), so beyond it the car and the walker
 *  stand on the drawn road. Until 2026-11-13 the page's deck also covered the extensions and returned the bare DTM
 *  where it was over the deck line: a car on a street passing the end of the Chaussée de Waterloo bridge (J5) was held
 *  4 m up in the air, and at Avenue des Hospices (E10) 0.4 m under the drawn road (docs/collisions/DRIVE_FIX.md). */
export function deckHeight(d, ground, { drawn = false } = {}) {
  const L = d.cum[d.cum.length - 1] || 1;
  return (x, z) => {
    if (x < d.box[0] || z < d.box[1] || x > d.box[2] || z > d.box[3]) return null;
    let best = Infinity, s = 0;
    for (let i = 1; i < d.pts.length; i++) {
      const [ax, az] = d.pts[i - 1], [bx, bz] = d.pts[i];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const dist = Math.hypot(ax + dx * t - x, az + dz * t - z);
      if (dist < best) { best = dist; s = d.cum[i - 1] + t * Math.sqrt(l2); }
    }
    if (best > d.half || (drawn && (s < d.span[0] || s > d.span[1]))) return null;
    const deck = profY(d, s);
    return deck > ground(x, z) ? deck : null;
  };
}

const PROF = 1;       // m between the samples of a deck's profile
/** the deck's height at distance s along its line (d.prof; a descriptor without one: the straight line) */
function profY(d, s) {
  const L = d.cum[d.cum.length - 1] || 1;
  if (!d.prof) return d.h0 + (d.h1 - d.h0) * (s / L);
  const n = d.prof.length - 1, f = Math.max(0, Math.min(n, (s / L) * n)), i = Math.min(n - 1, Math.floor(f));
  return n < 1 ? d.prof[0] : d.prof[i] + (d.prof[i + 1] - d.prof[i]) * (f - i);
}

/** the deck at distance s along the descriptor's line: point, unit tangent, deck height */
function at(d, s) {
  const L = d.cum[d.cum.length - 1] || 1;
  let i = 1;
  while (i < d.pts.length - 1 && d.cum[i] < s) i++;
  const [ax, az] = d.pts[i - 1], [bx, bz] = d.pts[i], seg = d.cum[i] - d.cum[i - 1] || 1, t = Math.max(0, Math.min(1, (s - d.cum[i - 1]) / seg));
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, tx: (bx - ax) / seg, tz: (bz - az) / seg, y: profY(d, s) };
}

/** The deck as a drawable: a slab between the bridge's own ends (not the extensions), carriageway and sidewalk bands on
 *  top (SLAB.sink under the deck height, so the street's own surface wins where both are drawn), parapets on both
 *  edges, closed ends and soffit. Plain arrays: { position, normal, color } (non-indexed triangles). */
export function deckMesh(d) {
  const P = [], N = [], C = [];
  const push = (n, c, ...pts) => { for (const p of pts) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); C.push(c[0], c[1], c[2]); } };
  // each quad wound so its geometric normal agrees with n (until 2026-11-13 the deck top faced DOWN and the soffit UP:
  // drawn double-sided it looked right, but anything reading the winding, the collision test's drawn-surface raster,
  // took the soffit 0.93 m under the deck for the road: docs/collisions/DRIVE_FIX.md)
  const quad = (n, c, a, b, cc, dd) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = cc[0] - a[0], wy = cc[1] - a[1], wz = cc[2] - a[2];
    const gx = uy * wz - uz * wy, gy = uz * wx - ux * wz, gz = ux * wy - uy * wx;
    if (gx * n[0] + gy * n[1] + gz * n[2] < 0) push(n, c, a, cc, b, a, dd, cc);
    else push(n, c, a, b, cc, a, cc, dd);
  };
  const [s0, s1] = d.span, steps = Math.max(1, Math.ceil((s1 - s0) / SLAB.step));
  const S = [];
  for (let k = 0; k <= steps; k++) S.push(at(d, s0 + (s1 - s0) * k / steps));
  const off = (q, o, y) => [q.x + q.tz * o, y, q.z - q.tx * o];          // o > 0: the side of n = (tz, -tx)
  const H = d.half, Wp = SLAB.parapetW, Cw = d.carr, D = SLAB.depth, Ph = SLAB.parapetH;
  const bands = [[-H, -Cw, COL.sidewalk], [-Cw, Cw, COL.asphalt], [Cw, H, COL.sidewalk]];
  for (let k = 0; k < steps; k++) {
    const a = S[k], b = S[k + 1], ya = a.y - SLAB.sink, yb = b.y - SLAB.sink;
    for (const [o0, o1, c] of bands) quad([0, 1, 0], c, off(a, o0, ya), off(a, o1, ya), off(b, o1, yb), off(b, o0, yb));
    quad([0, -1, 0], COL.soffit, off(a, -H, ya - D), off(b, -H, yb - D), off(b, H, yb - D), off(a, H, ya - D));
    for (const sg of [-1, 1]) {
      const n = [a.tz * sg, 0, -a.tx * sg], ni = [-n[0], 0, -n[2]];
      quad(n, COL.concrete, off(a, sg * H, ya - D), off(b, sg * H, yb - D), off(b, sg * H, yb + Ph), off(a, sg * H, ya + Ph));          // outer face
      quad(ni, COL.concrete, off(a, sg * (H - Wp), ya), off(b, sg * (H - Wp), yb), off(b, sg * (H - Wp), yb + Ph), off(a, sg * (H - Wp), ya + Ph));   // inner face
      quad([0, 1, 0], COL.concrete, off(a, sg * (H - Wp), ya + Ph), off(b, sg * (H - Wp), yb + Ph), off(b, sg * H, yb + Ph), off(a, sg * H, ya + Ph));  // coping
    }
  }
  for (const [q, dir] of [[S[0], -1], [S[S.length - 1], 1]]) {             // the ends: slab + parapet caps
    const n = [q.tx * dir, 0, q.tz * dir], y = q.y - SLAB.sink;
    quad(n, COL.concrete, off(q, -H, y - D), off(q, H, y - D), off(q, H, y), off(q, -H, y));
    for (const sg of [-1, 1]) quad(n, COL.concrete, off(q, sg * (H - Wp), y), off(q, sg * H, y), off(q, sg * H, y + Ph), off(q, sg * (H - Wp), y + Ph));
  }
  return { position: new Float32Array(P), normal: new Float32Array(N), color: new Float32Array(C) };
}

/** the parapets as thin walls for the car (viewer/drive/colliders.js walls): one { ring: [[x, z], ...], top, base } per
 *  SLAB.step piece and side, top = the coping, base = the slab's underside (colliders.js heightClear: a car on the
 *  street under the bridge passes under them) */
export function parapetRings(d) {
  const [s0, s1] = d.span, steps = Math.max(1, Math.ceil((s1 - s0) / SLAB.step));
  const S = [];
  for (let k = 0; k <= steps; k++) S.push(at(d, s0 + (s1 - s0) * k / steps));
  const off = (q, o) => [q.x + q.tz * o, q.z - q.tx * o];
  const out = [];
  for (const sg of [1, -1]) for (let k = 0; k < steps; k++) {
    const a = S[k], b = S[k + 1], o = sg * d.half, i = sg * (d.half - SLAB.parapetW);
    out.push({ ring: [off(a, o), off(b, o), off(b, i), off(a, i)], top: Math.max(a.y, b.y) - SLAB.sink + SLAB.parapetH, base: Math.min(a.y, b.y) - SLAB.sink - SLAB.depth });
  }
  return out;
}

/** ABUTMENTS (road fix round 2, docs/collisions/ROAD_FIX2.md): the bare-earth DTM has the cutting's slope right up to
 *  a deck's drawn end, so the slab end stood over a dip the street and the sidewalk dropped into (Rue du Bourdon, D9:
 *  the deck 1.4 m over the ground between its end and the next junction; Chaussée de Waterloo, J5: the end node 3 m over
 *  the DTM, the slab end 0.41 m over the sidewalk). Tapering the deck's ends (round 1) moved the step onto the slab;
 *  here the GROUND comes up instead: over the EXT m past each drawn end (the approach, where the deck line runs from the
 *  real ground out to the slab) and the deck's width, the grids are raised to the deck line (SLAB.sink under it: the
 *  street is drawn on it), with a 1:1 bank beside it; only raised, never lowered, and only where the dip is an
 *  abutment's (at most FILL_MAX under the deck line: a street passing under a deck end is not buried). In place on
 *  every grid of `grids` (the drawn terrain and the road stage's ground), before the roads sample them. Returns cells. */
const FILL_MAX = 4.0, BANK = FILL_MAX, UNDER = 1.5;     // UNDER: m of the fill under the slab's end (the abutment), 10 cm under its top:
// the 1 m grid cannot hold a cliff AT the slab's end line, an oblique end cut its cells in two (Bourdon: the car between
// two rows, one filled, one the cutting's slope 1.5 m down)
export function deckAbutments(decks, grids, hdr) {
  const { x0, z0, cols, rows, step } = hdr, G0 = grids[0];
  let moved = 0;
  for (const d of decks || []) {
    const L = d.cum[d.cum.length - 1] || 1, W = d.half + BANK;
    for (const [sa, sb, ua, ub, first] of [[0, d.span[0] + UNDER, d.span[0], d.span[0] + UNDER, true], [d.span[1] - UNDER, L, d.span[1] - UNDER, d.span[1], false]]) {
      // (+ BANK m along the span beside the slab: the abutment's wing banks fall 1:1 there too, no cliff beside the deck)
      const A = at(d, first ? sa : sa - BANK), B = at(d, first ? sb + BANK : sb);
      const c0 = Math.max(0, Math.floor((Math.min(A.x, B.x) - W - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(A.x, B.x) + W - x0) / step));
      const r0 = Math.max(0, Math.floor((Math.min(A.z, B.z) - W - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(A.z, B.z) + W - z0) / step));
      const nc = c1 - c0 + 1, nr = r1 - r0 + 1;
      if (nc <= 0 || nr <= 0) continue;                                          // (off this tile's grid)
      const want = new Float64Array(nc * nr).fill(NaN);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        // nearest point of the deck's line (the whole line: a cell beside the span belongs to the span, not the approach)
        let best = Infinity, s = 0, past = false;
        for (let i = 1; i < d.pts.length; i++) {
          const [ax, az] = d.pts[i - 1], [bx, bz] = d.pts[i];
          const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
          const t0 = ((px - ax) * dx + (pz - az) * dz) / l2, t = Math.max(0, Math.min(1, t0));
          const dist = Math.hypot(ax + dx * t - px, az + dz * t - pz);
          // (beyond the line's outer ends: not the approach, the ground there is the street's own)
          if (dist < best) { best = dist; s = d.cum[i - 1] + t * Math.sqrt(l2); past = (i === 1 && t0 < 0) || (i === d.pts.length - 1 && t0 > 1); }
        }
        const into = first ? s - sb : sa - s;                                    // m into the span past the abutment
        if (past || best > W || (first ? s < sa : s > sb) || into > BANK || (into > 0 && best < d.half)) continue;
        const top = profY(d, Math.min(Math.max(s, sa), sb)) - SLAB.sink - (s > ua && s < ub ? 0.1 : 0) - Math.max(0, best - d.half) - Math.max(0, into);
        const k = r * cols + c;
        if (G0[k] < top && top - G0[k] <= FILL_MAX) want[(r - r0) * nc + (c - c0)] = top;
        else if (G0[k] >= top) want[(r - r0) * nc + (c - c0)] = -Infinity;          // already up there: counts as fill
      }
      // no lone cells: a cell is raised only when most of its neighbours are up too (a deep cutting reaching into the
      // approach, J5's railway under the bridge's oblique end, would otherwise get 3-4 m spikes where it is shallow)
      // ... and no lone pits either (a cell left out among raised ones: a walker fell into a 4 m hole at Avenue des
      // Tilleuls' east end, E9): an opening (cells with >= 6 of 8 wanted neighbours) then a closing (wanted cells with
      // >= 4 of 8 kept neighbours)
      const nb = (arr, i, j, test) => { let n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nc && jj < nr && test(arr[jj * nc + ii])) n++; } return n; };
      const keep = new Uint8Array(nc * nr);
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) if (want[j * nc + i] > -Infinity && nb(want, i, j, (v) => !Number.isNaN(v)) >= 6) keep[j * nc + i] = 1;
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) if (!keep[j * nc + i] && want[j * nc + i] > -Infinity && nb(keep, i, j, (v) => v === 1) >= 4) keep[j * nc + i] = 2;
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) {
        if (!keep[j * nc + i]) continue;
        const v = want[j * nc + i], k = (r0 + j) * cols + c0 + i;
        grids.forEach((G) => { if (G[k] < v) { G[k] = v; moved++; } });
      }
    }
  }
  return moved;
}

/** the bridge decks of a roads.json document, and the road stage's ground with them */
export function bridgeDecks(roadsDoc, ground, keep = () => true) {
  const decks = bridgeDescriptors(roadsDoc, ground).filter(keep);
  const fns = decks.map((d) => deckHeight(d, ground));
  const wrap = (g) => (fns.length ? (x, z) => { for (const f of fns) { const y = f(x, z); if (y != null) return y; } return g(x, z); } : g);
  return { decks, wrap };
}
