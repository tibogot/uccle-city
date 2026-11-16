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
export function bridgeDescriptors(roadsDoc, ground, plans = null) {
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
    // a measured PLAN (data/overrides.json bridgePlans, keyed by the OSM way): the deck's real outline instead of the
    // road's band (citydefects 2026-11-16: the new Carsoel deck over Saint-Job station is ~45 x 35 m with the tram stop,
    // sidewalks and squares on it; the road band left the platforms and shelters hanging over the cutting)
    const plan = plans?.[String(r.meta?.osm)];
    if (plan?.ring?.length >= 3) {
      d.plan = { ring: plan.ring, free: plan.free || [], walls: plan.walls || [], under: plan.under || null };
      for (const [x, z] of plan.ring) { d.box[0] = Math.min(d.box[0], x); d.box[1] = Math.min(d.box[1], z); d.box[2] = Math.max(d.box[2], x); d.box[3] = Math.max(d.box[3], z); }
    }
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
  if (d.plan) return (x, z) => {
    if (x < d.box[0] || z < d.box[1] || x > d.box[2] || z > d.box[3] || !inRing(d.plan.ring, x, z)) return null;
    const deck = planTop(d, x, z);
    return deck > ground(x, z) ? deck : null;
  };
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


/** point in polygon ([[x, z], ...], even-odd) */
export function inRing(ring, x, z) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/** distance along the descriptor's line of the nearest point to (x, z) (clamped to the line) */
function alongLine(d, x, z) {
  let best = Infinity, s = 0;
  for (let i = 1; i < d.pts.length; i++) {
    const [ax, az] = d.pts[i - 1], [bx, bz] = d.pts[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const dist = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (dist < best) { best = dist; s = d.cum[i - 1] + t * Math.sqrt(l2); }
  }
  return s;
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
export function deckMesh(d, ground = null, covered = null) {
  if (d.plan) return planDeckMesh(d, ground ?? (() => -Infinity), covered ?? (() => false));
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

// ---------------------------------------------------------------------------------------------------------------- PLAN DECKS
// A deck with a measured outline (data/overrides.json bridgePlans): the slab over the whole ring, its top following the
// road's profile (profY of the nearest point of the road line), a fascia round it, a railing (concrete upstand + steel
// posts and rails) wherever the drop beside an edge is over RAIL_DROP, the abutment walls down to the ground on the
// edges that are not free (plan.free: indices of the ring's edges that span the cutting: no wall, the tracks pass under),
// and the cutting walls under the deck (plan.walls: lines in x, z; from the soffit down to plan.under.level - 0.4).
const PLAN = { depth: 1.1, cell: 2, upstand: 0.25, upW: 0.3, railH: 1.1, post: 1.5, sink: 0.03 };
const RAIL_DROP = 0.8;
const COLP = { asphalt: [0.115, 0.118, 0.125], kerb: [0.5, 0.49, 0.46], top: [0.4, 0.39, 0.37], fascia: [0.55, 0.54, 0.51], wall: [0.47, 0.46, 0.43], soffit: [0.3, 0.295, 0.28], steel: [0.09, 0.1, 0.105] };

/** Sutherland-Hodgman: the (possibly concave) ring clipped to an axis-aligned box */
function clipBox(ring, x0, z0, x1, z1) {
  let out = ring;
  const edges = [[(p) => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= z0, (a, b) => [a[0] + (b[0] - a[0]) * (z0 - a[1]) / (b[1] - a[1]), z0]],
    [(p) => p[1] <= z1, (a, b) => [a[0] + (b[0] - a[0]) * (z1 - a[1]) / (b[1] - a[1]), z1]]];
  for (const [inside, cut] of edges) {
    const src = out; out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[(i + src.length - 1) % src.length], b = src[i];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); }
      else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

const KERB = 0.1, UNDER_STREET = 0.1;           // m: the plan deck's sidewalks / squares over its carriageway
/** the road line's frame (first to last point; the plan decks' roads are straight) and the carriageway half width */
function bandOf(d) {
  const [ax, az] = d.pts[0], [bx, bz] = d.pts[d.pts.length - 1], L = Math.hypot(bx - ax, bz - az) || 1;
  const nx = -(bz - az) / L, nz = (bx - ax) / L;
  return { nx, nz, c: nx * ax + nz * az, half: d.carr };
}
/** off the carriageway band of a plan deck: its sidewalks and squares stand KERB m higher */
const offBand = (B, x, z) => Math.abs(B.nx * x + B.nz * z - B.c) > B.half;
/** a plan deck's drawn / walked top at (x, z): the road profile, + KERB off the carriageway */
function planTop(d, x, z) {
  d._band ??= bandOf(d);
  return profY(d, alongLine(d, x, z)) + (offBand(d._band, x, z) ? KERB : 0);
}
/** Sutherland-Hodgman against one half plane: keep n . p <= c */
function clipHalf(poly, nx, nz, c) {
  const out = [], f = (p) => nx * p[0] + nz * p[1] - c;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], fa = f(a), fb = f(b);
    if (fb <= 0) { if (fa > 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } out.push(b); }
    else if (fa <= 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}

const ringSign = (ring) => {
  let a2 = 0;
  for (let i = 0; i < ring.length; i++) { const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length]; a2 += ax * bz - bx * az; }
  return a2 > 0 ? 1 : -1;                   // outward normal of edge a -> b = (dz, -dx) * sign / L
};

/** the plan's slab, fascia, railings, abutment and cutting walls (plain arrays, as deckMesh) */
function planDeckMesh(d, ground, covered) {
  const P = [], N = [], C = [], S = [];        // S: the material slot per triangle (PLAN_SLOTS)
  const tri = (n, c, a, b, cc) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = cc[0] - a[0], wy = cc[1] - a[1], wz = cc[2] - a[2];
    const gx = uy * wz - uz * wy, gy = uz * wx - ux * wz, gz = ux * wy - uy * wx;
    const pts = gx * n[0] + gy * n[1] + gz * n[2] < 0 ? [a, cc, b] : [a, b, cc];
    for (const p of pts) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); C.push(c[0], c[1], c[2]); }
    S.push(SLOT_OF.get(c) ?? 3);
  };
  const quad = (n, c, a, b, cc, dd) => { tri(n, c, a, b, cc); tri(n, c, a, cc, dd); };
  const ring = d.plan.ring, top = (x, z) => planTop(d, x, z) - PLAN.sink, base = (x, z) => profY(d, alongLine(d, x, z)) - PLAN.sink;
  const outSign = ringSign(ring), B = (d._band ??= bandOf(d));
  // top and soffit: the ring clipped to a PLAN.cell grid, each piece fanned (a piece is convex except at the ring's few
  // concave corners, where the fan still covers it: the deck is flat there)
  let bx0 = Infinity, bz0 = Infinity, bx1 = -Infinity, bz1 = -Infinity;
  for (const [x, z] of ring) { bx0 = Math.min(bx0, x); bz0 = Math.min(bz0, z); bx1 = Math.max(bx1, x); bz1 = Math.max(bz1, z); }
  const g = PLAN.cell;
  for (let x = Math.floor(bx0 / g) * g; x < bx1; x += g) for (let z = Math.floor(bz0 / g) * g; z < bz1; z += g) {
    const pc = clipBox(ring, x, z, x + g, z + g);
    if (pc.length < 3) continue;
    // the carriageway band (asphalt) and the two sides (paving, KERB higher)
    const pieces = [[clipHalf(clipHalf(pc, B.nx, B.nz, B.c + B.half), -B.nx, -B.nz, -(B.c - B.half)), COLP.asphalt, 0],
      [clipHalf(pc, -B.nx, -B.nz, -(B.c + B.half)), COLP.top, KERB], [clipHalf(pc, B.nx, B.nz, B.c - B.half), COLP.top, KERB]];
    for (const [q, col, lift] of pieces) {
      if (q.length < 3) continue;
      // (where the measured street is drawn the deck's top tucks UNDER_STREET under it: the ring overlaps the UrbIS
      // polygons by a metre or so at the ends, no terrain seen in between, no z-fight with the street's own surface)
      const v = q.map(([px, pz]) => [px, base(px, pz) + (covered(px, pz) ? -UNDER_STREET : lift), pz]);
      for (let k = 1; k + 1 < v.length; k++) tri([0, 1, 0], col, v[0], v[k], v[k + 1]);
    }
    const v = pc.map(([px, pz]) => [px, base(px, pz) - PLAN.depth, pz]);
    for (let k = 1; k + 1 < v.length; k++) tri([0, -1, 0], COLP.soffit, v[0], v[k], v[k + 1]);
  }
  // the kerbs: the band's two edges, 1 m pieces inside the ring, a vertical face KERB high toward the road
  {
    const [ax, az] = d.pts[0], [bx, bz] = d.pts[d.pts.length - 1], L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
    for (const sg of [1, -1]) for (let k = 0; k < Math.ceil(L); k++) {
      const s0 = k, s1 = Math.min(L, k + 1), o = sg * B.half;
      const p0 = [ax + tx * s0 + B.nx * o, az + tz * s0 + B.nz * o], p1 = [ax + tx * s1 + B.nx * o, az + tz * s1 + B.nz * o];
      if (!inRing(ring, p0[0], p0[1]) || !inRing(ring, p1[0], p1[1]) || covered(p0[0], p0[1]) || covered(p1[0], p1[1])) continue;
      const y0 = base(p0[0], p0[1]), y1 = base(p1[0], p1[1]);
      quad([-B.nx * sg, 0, -B.nz * sg], COLP.kerb, [p0[0], y0, p0[1]], [p1[0], y1, p1[1]], [p1[0], y1 + KERB, p1[1]], [p0[0], y0 + KERB, p0[1]]);
    }
  }
  // edges: fascia (free edges), abutment wall into the ground (the others), railing where the drop beside is real
  const free = new Set(d.plan.free);
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], L = Math.hypot(bx - ax, bz - az);
    if (L < 0.01) continue;
    const tx = (bx - ax) / L, tz = (bz - az) / L, nx = tz * outSign, nz = -tx * outSign, n = [nx, 0, nz];
    const steps = Math.max(1, Math.ceil(L)), S = [];
    for (let k = 0; k <= steps; k++) {
      const x = ax + (bx - ax) * k / steps, z = az + (bz - az) * k / steps, y = top(x, z);
      const gOut = ground(x + nx * 0.5, z + nz * 0.5);                       // the ground half a metre out
      S.push({ x, z, y, yb: base(x, z), drop: y - gOut, gr: Math.min(ground(x, z), gOut) });
    }
    const ix = -nx * PLAN.upW, iz = -nz * PLAN.upW, U = PLAN.upstand, mx = ix * 0.5, mz = iz * 0.5;
    for (let k = 0; k < steps; k++) {
      const a = S[k], b = S[k + 1];
      if (a.drop < -0.05 && b.drop < -0.05) continue;                         // buried: the bank is over the deck here
      const fr = free.has(i);
      const ya = fr ? a.yb - PLAN.depth : Math.min(a.yb - PLAN.depth, a.gr - 0.4), yb = fr ? b.yb - PLAN.depth : Math.min(b.yb - PLAN.depth, b.gr - 0.4);
      quad(n, fr ? COLP.fascia : COLP.wall, [a.x, ya, a.z], [b.x, yb, b.z], [b.x, b.y, b.z], [a.x, a.y, a.z]);
      if (Math.max(a.drop, b.drop) < RAIL_DROP) continue;
      // a concrete upstand on the slab's edge (outer face, inner face, top), then the steel rails at 1.1 / 0.75 / 0.45 m
      quad(n, COLP.fascia, [a.x, a.y, a.z], [b.x, b.y, b.z], [b.x, b.y + U, b.z], [a.x, a.y + U, a.z]);
      quad([-nx, 0, -nz], COLP.fascia, [a.x + ix, a.y, a.z + iz], [b.x + ix, b.y, b.z + iz], [b.x + ix, b.y + U, b.z + iz], [a.x + ix, a.y + U, a.z + iz]);
      quad([0, 1, 0], COLP.fascia, [a.x, a.y + U, a.z], [b.x, b.y + U, b.z], [b.x + ix, b.y + U, b.z + iz], [a.x + ix, a.y + U, a.z + iz]);
      for (const [h, t] of [[PLAN.railH, 0.06], [0.75, 0.035], [0.45, 0.035]]) {
        const ya0 = a.y + h - t, yb0 = b.y + h - t, w = 0.03;
        const A = [a.x + mx, a.z + mz], B = [b.x + mx, b.z + mz], Ai = [A[0] - nx * w, A[1] - nz * w], Bi = [B[0] - nx * w, B[1] - nz * w];
        quad(n, COLP.steel, [A[0], ya0, A[1]], [B[0], yb0, B[1]], [B[0], yb0 + t, B[1]], [A[0], ya0 + t, A[1]]);
        quad([-nx, 0, -nz], COLP.steel, [Ai[0], ya0, Ai[1]], [Bi[0], yb0, Bi[1]], [Bi[0], yb0 + t, Bi[1]], [Ai[0], ya0 + t, Ai[1]]);
        quad([0, 1, 0], COLP.steel, [A[0], ya0 + t, A[1]], [B[0], yb0 + t, B[1]], [Bi[0], yb0 + t, Bi[1]], [Ai[0], ya0 + t, Ai[1]]);
        quad([0, -1, 0], COLP.steel, [A[0], ya0, A[1]], [B[0], yb0, B[1]], [Bi[0], yb0, Bi[1]], [Ai[0], ya0, Ai[1]]);
      }
    }
    // posts every PLAN.post m along the railed stretches (6 cm square)
    for (let sAl = PLAN.post / 2; sAl < L; sAl += PLAN.post) {
      const x = ax + tx * sAl + mx, z = az + tz * sAl + mz, y = top(x, z);
      if (y - ground(x + nx * 0.65, z + nz * 0.65) < RAIL_DROP) continue;
      const h = 0.03, y0 = y + PLAN.upstand, y1 = y + PLAN.railH;
      const c = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([p, q]) => [x + tx * p + nx * q, z + tz * p + nz * q]);
      for (let k = 0; k < 4; k++) {
        const [px, pz] = c[k], [qx, qz] = c[(k + 1) % 4], cxm = (px + qx) / 2 - x, czm = (pz + qz) / 2 - z, cl = Math.hypot(cxm, czm) || 1;
        quad([cxm / cl, 0, czm / cl], COLP.steel, [px, y0, pz], [qx, y0, qz], [qx, y1, qz], [px, y1, pz]);
      }
    }
  }
  // the cutting walls under the deck (both faces: seen from the platforms and past the free edges)
  const lvl = d.plan.under?.level ?? Infinity;
  for (const w of d.plan.walls) for (let i = 1; i < w.length; i++) {
    const [ax, az] = w[i - 1], [bx, bz] = w[i], L = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(L / 2));
    const nx = (bz - az) / L, nz = -(bx - ax) / L;
    for (let k = 0; k < steps; k++) {
      const x0 = ax + (bx - ax) * k / steps, z0 = az + (bz - az) * k / steps, x1 = ax + (bx - ax) * (k + 1) / steps, z1 = az + (bz - az) * (k + 1) / steps;
      const y0 = base(x0, z0) - PLAN.depth + 0.01, y1 = base(x1, z1) - PLAN.depth + 0.01, b0 = Math.min(lvl, ground(x0, z0)) - 0.4, b1 = Math.min(lvl, ground(x1, z1)) - 0.4;
      for (const sg of [1, -1]) {
        const o = 0.2 * sg;
        quad([nx * sg, 0, nz * sg], COLP.wall, [x0 + nx * o, b0, z0 + nz * o], [x1 + nx * o, b1, z1 + nz * o], [x1 + nx * o, y1, z1 + nz * o], [x0 + nx * o, y0, z0 + nz * o]);
      }
      for (const [xx, zz, bb, yy] of k === 0 ? [[x0, z0, b0, y0]] : []) quad([-(bx - ax) / L, 0, -(bz - az) / L], COLP.wall, [xx + nx * 0.2, bb, zz + nz * 0.2], [xx - nx * 0.2, bb, zz - nz * 0.2], [xx - nx * 0.2, yy, zz - nz * 0.2], [xx + nx * 0.2, yy, zz + nz * 0.2]);
      if (k === steps - 1) quad([(bx - ax) / L, 0, (bz - az) / L], COLP.wall, [x1 + nx * 0.2, b1, z1 + nz * 0.2], [x1 - nx * 0.2, b1, z1 - nz * 0.2], [x1 - nx * 0.2, y1, z1 - nz * 0.2], [x1 + nx * 0.2, y1, z1 + nz * 0.2]);
    }
  }
  return slotted(P, N, C, S, d._band ?? bandOf(d), d.pts[0]);
}

// the look pass (citydefects 2026-11-16): the plan deck drawn with the STREET's own materials (viewer/roadPaint.js: the
// asphalt of the measured streets, the sidewalk slabs and kerb stones) and the material library's cast concrete for the
// fascia, walls, upstands and soffit (main.js bridgeDeckMesh); the vertex colours stay for ?decklook=old
export const PLAN_SLOTS = ["asphalt", "paving", "kerb", "concrete", "steel"];
const SLOT_OF = new Map([[COLP.asphalt, 0], [COLP.top, 1], [COLP.kerb, 2], [COLP.fascia, 3], [COLP.wall, 3], [COLP.soffit, 3], [COLP.steel, 4]]);
/** the triangles sorted by slot, with groups [{ start, count, slot }] (vertex indices) and a road-frame uv (s along the
 *  road line, t across it: the asphalt shader's coordinates) */
function slotted(P, N, C, S, B, p0) {
  const T = S.length, order = [...Array(T).keys()].sort((a, b) => S[a] - S[b]);
  const pos = new Float32Array(T * 9), nrm = new Float32Array(T * 9), col = new Float32Array(T * 9), uv = new Float32Array(T * 6), groups = [];
  const tx = B.nz, tz = -B.nx;                                    // along the line (n = (-tz, tx) rotated back)
  order.forEach((t, k) => {
    pos.set(P.slice(t * 9, t * 9 + 9), k * 9); nrm.set(N.slice(t * 9, t * 9 + 9), k * 9); col.set(C.slice(t * 9, t * 9 + 9), k * 9);
    for (let v = 0; v < 3; v++) {
      const x = P[t * 9 + v * 3], z = P[t * 9 + v * 3 + 2];
      uv[k * 6 + v * 2] = (x - p0[0]) * tx + (z - p0[1]) * tz;
      uv[k * 6 + v * 2 + 1] = B.nx * x + B.nz * z - B.c;
    }
    const g = groups[groups.length - 1];
    if (g && g.slot === S[t]) g.count += 3; else groups.push({ start: k * 3, count: 3, slot: S[t] });
  });
  return { position: pos, normal: nrm, color: col, uv, groups };
}

/** the plan deck's car walls: the railed edges as thin rings (as parapetRings) */
function planParapetRings(d, ground) {
  const ring = d.plan.ring, out = [], top = (x, z) => planTop(d, x, z) - PLAN.sink, outSign = ringSign(ring);
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], L = Math.hypot(bx - ax, bz - az);
    if (L < 0.01) continue;
    const nx = (bz - az) / L * outSign, nz = -(bx - ax) / L * outSign, steps = Math.max(1, Math.ceil(L / SLAB.step));
    for (let k = 0; k < steps; k++) {
      const x0 = ax + (bx - ax) * k / steps, z0 = az + (bz - az) * k / steps, x1 = ax + (bx - ax) * (k + 1) / steps, z1 = az + (bz - az) * (k + 1) / steps;
      const ya = top(x0, z0), yb = top(x1, z1);
      if (ground && Math.max(ya - ground(x0 + nx * 0.5, z0 + nz * 0.5), yb - ground(x1 + nx * 0.5, z1 + nz * 0.5)) < RAIL_DROP) continue;
      out.push({ ring: [[x0, z0], [x1, z1], [x1 - nx * PLAN.upW, z1 - nz * PLAN.upW], [x0 - nx * PLAN.upW, z0 - nz * PLAN.upW]], top: Math.max(ya, yb) + PLAN.railH, base: Math.min(ya, yb) - PLAN.depth });
    }
  }
  return out;
}

/** UNDER a plan deck: the cutting's floor between its walls (plan.under: { c: [x, z], u: [ux, uz] along the line,
 *  half: m either side, level }): the DTM's slopes under the slab cut down to the station level (the platforms stand
 *  on it), in place on every grid of `grids`, only lowered. Returns the cells moved. */
const TAPER = 6;      // m (grid cells at 1 m) over which the station floor under a plan deck rises back to the DTM
export function deckUnderCut(decks, grids, hdr) {
  const { x0, z0, cols, rows, step } = hdr;
  let moved = 0;
  for (const d of decks || []) {
    if (!d.plan) continue;
    // (browser check 2026-11-16: at the ring's ends the bank's DTM stood up to 10 cm OVER the deck top tucked under the
    // street: green terrain strips through the asphalt) the ground inside the ring kept under the deck's top
    {
      const c0 = Math.max(0, Math.floor((d.box[0] - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((d.box[2] - x0) / step));
      const r0 = Math.max(0, Math.floor((d.box[1] - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((d.box[3] - z0) / step));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const x = x0 + c * step, z = z0 + r * step;
        if (!inRing(d.plan.ring, x, z)) continue;
        const top = profY(d, alongLine(d, x, z)) - PLAN.sink - UNDER_STREET - 0.12, k = r * cols + c;
        for (const G of grids) if (G[k] > top) { G[k] = top; moved++; }
      }
    }
    const U = d.plan?.under;
    if (!U) continue;
    const [cx, cz] = U.c, [ux, uz] = U.u, vx = -uz, vz = ux;
    const c0 = Math.max(0, Math.floor((d.box[0] - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((d.box[2] - x0) / step));
    const r0 = Math.max(0, Math.floor((d.box[1] - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((d.box[3] - z0) / step));
    // tapered: past the walls' line and out from under the slab the floor rises back to the DTM at 1:1 (a cut edge on
    // the 1 m grid was a stair-stepped cliff along the deck's oblique free edges)
    const T = TAPER, ring = d.plan.ring;
    const outDist = (x, z) => {
      if (inRing(ring, x, z)) return 0;
      let best = Infinity;
      for (let i = 0; i < ring.length; i++) {
        const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
      }
      return best;
    };
    for (let r = Math.max(0, r0 - T); r <= Math.min(rows - 1, r1 + T); r++) for (let c = Math.max(0, c0 - T); c <= Math.min(cols - 1, c1 + T); c++) {
      const x = x0 + c * step, z = z0 + r * step;
      const over = Math.max(0, Math.abs((x - cx) * vx + (z - cz) * vz) - U.half), out = outDist(x, z);
      if (over > T || out > T) continue;
      const target = U.level + over * 1.0 + out * 1.0;
      const k = r * cols + c;
      for (const G of grids) if (G[k] > target) { G[k] = target; moved++; }
    }
  }
  return moved;
}

/** the parapets as thin walls for the car (viewer/drive/colliders.js walls): one { ring: [[x, z], ...], top, base } per
 *  SLAB.step piece and side, top = the coping, base = the slab's underside (colliders.js heightClear: a car on the
 *  street under the bridge passes under them) */
export function parapetRings(d, ground = null) {
  if (d.plan) return planParapetRings(d, ground);
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
const FILL_MAX = 5.0, BANK = FILL_MAX, UNDER = 1.5;     // UNDER: m of the fill under the slab's end (the abutment), 10 cm under its top:
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
export function bridgeDecks(roadsDoc, ground, keep = () => true, plans = null) {
  const decks = bridgeDescriptors(roadsDoc, ground, plans).filter(keep);
  const fns = decks.map((d) => deckHeight(d, ground));
  const wrap = (g) => (fns.length ? (x, z) => { for (const f of fns) { const y = f(x, z); if (y != null) return y; } return g(x, z); } : g);
  return { decks, wrap };
}
