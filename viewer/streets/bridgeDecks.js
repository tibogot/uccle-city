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
      d.plan = { ring: plan.ring, free: plan.free || [], walls: plan.walls || [], under: plan.under || null, ...(plan.urbis ? { urbis: plan.urbis } : {}) };
      for (const [x, z] of plan.ring) { d.box[0] = Math.min(d.box[0], x); d.box[1] = Math.min(d.box[1], z); d.box[2] = Math.max(d.box[2], x); d.box[3] = Math.max(d.box[3], z); }
      // (vivier 2026-11-17) a plan made from the UrbIS bridge polygon (ringPlans): its top is the PLANE through the
      // streets round its abutment edges, not the bridge road's profile (Vivier d'Oie: the deck's west corner carries
      // the Avenue Laterale junction 0.8 m over the Chaussee's profile there)
      if (plan.fit) d.plan.plane = fitPlane(plan.ring, d.plan.free, ground);
    }
    // the deck's profile, every PROF m: the straight line between the grounds past the ends, but never under the ground
    // on the bridge's centre line (a hump the DTM keeps, e.g. Avenue des Hospices, E10: the straight deck ran up to
    // 0.6 m UNDER the drawn road there, its parapets 0.35 m proud of the street, still 1 m walls for the car)
    const L = cum[cum.length - 1] || 1, n = Math.max(1, Math.ceil(L / PROF));
    d.prof = [];
    for (let k = 0; k <= n; k++) {
      const sk = (L * k) / n, line = h0 + (h1 - h0) * (sk / L);
      if (d.plan?.plane) { const q = at(d, sk); d.prof.push(planeY(d.plan.plane, q.x, q.z)); continue; }
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
    const deck = d.plan.tops ? gridTop(d.plan.tops, x, z) ?? planTop(d, x, z) : planTop(d, x, z);
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


/** (vivier) the DRAWN top of a plan deck: { x0, z0, nx, nz, v: [...] } on a 1 m grid (NaN: none), bilinear where all
 *  four cells hold a value, else the nearest that does, else null. The road stage's measured streets on the deck sit up
 *  to 0.25 m under its fitted top (their 6 m height field): the walker / the car stood on the fitted top, in the air. */
function gridTop(G, x, z) {
  const fx = x - G.x0, fz = z - G.z0, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const at = (a, b) => (a >= 0 && b >= 0 && a < G.nx && b < G.nz ? G.v[b * G.nx + a] : NaN);
  const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), e = at(i + 1, j + 1);
  if (a === a && b === b && c === c && e === e) return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz;
  const near = [[a, tx * tx + tz * tz], [b, (1 - tx) ** 2 + tz * tz], [c, tx * tx + (1 - tz) ** 2], [e, (1 - tx) ** 2 + (1 - tz) ** 2]].filter(([v]) => v === v).sort((p, q) => p[1] - q[1]);
  return near.length ? near[0][0] : null;
}
/** the plan deck's drawn top on a 1 m grid (tileData.js, after the road stage): the street drawn there (streetY) where
 *  the measured street covers the deck, else the paving's top as planDeckMesh draws it */
export function deckTopGrid(d, covered, streetY) {
  if (!d.plan) return null;
  const x0 = Math.floor(d.box[0]), z0 = Math.floor(d.box[1]), nx = Math.ceil(d.box[2]) - x0 + 1, nz = Math.ceil(d.box[3]) - z0 + 1, v = new Array(nx * nz).fill(NaN);
  let n = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i, z = z0 + j;
    if (!inRing(d.plan.ring, x, z)) continue;
    const t = pavingTop(d, x, z, covered, streetY);
    if (t != null) { v[j * nx + i] = +t.toFixed(3); n++; }
  }
  return n ? { x0, z0, nx, nz, v } : null;
}
/** the walked top the mesh draws at (x, z): the street over a covered point (null when none is found), the paving else */
function pavingTop(d, x, z, covered, streetY) {
  const b = planBase(d, x, z) - PLAN.sink, B = (d._band ??= bandOf(d)), lift = offBand(B, x, z) ? KERB : 0;
  const sy = streetY ? streetY(x, z) : null;
  if (covered(x, z)) return sy != null && Math.abs(sy - b) < 0.6 ? sy : null;
  return sy != null && Math.abs(sy - PLAN.sink - b) < 0.6 ? sy - PLAN.sink + lift : b + lift;
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

// ------------------------------------------------------------------------------------------ RAILS ON JOINED EDGES (deckrail)
// The collisions browser turn (2026-11-17): at Kasteelstraat (E10) the Avenue des Hospices deck and the service road's
// deck leave one junction side by side, their concrete parapets drawn across the junction and across each other's
// carriageway, and along the Hospices deck's east side for 38 m where the street beside it is at grade; on the Carsoel
// deck (H6) a railing + upstand stood across the tram road at both ends of the slab, the rails passing under it. The
// car stopped at all of them. Cause: a band deck drew its parapets on both sides over its whole span whatever was
// beside it, and a plan deck measured "the drop" against the BARE TERRAIN half a metre out (the DTM of the bank under
// the street that continues there), never against what is drawn there. Rule: an edge where the traffic surface goes on
// at the deck's level (a drawn street, another deck, a tram track) carries no parapet / railing and no collider; a
// drop keeps its railing. ?deckrail=old (entry.deckRail === false): no d.railCut, the railings as before.
export const CONT = { near: 1.0, far: 2.0, tolNear: 0.3, tolFar: 0.6, tram: 1.5, lane: 1.6, laneTol: 0.6 };
/** (x, z, y, tol, deckOnly) -> true when a traffic surface is drawn at (x, z) within tol of y: the drive raster's top
 *  surface (streets, sidewalks, tram platforms: { hm, raster }), any deck's walked top, a tram track on ground there.
 *  .crosses(x, z, nx, nz): a driven lane / junction turn (paths: [[x, z, x, z, ...] flat], the tile's traffic graph) or
 *  a tram track passes the edge point within CONT.lane m, ACROSS the edge (not along it) */
export function deckContinuation({ hm, raster, decks, lines = [], paths = [] }) {
  const H = hm.h, Y = hm.y, D = raster.delta;
  const tops = decks.map((d) => deckHeight(d, () => -Infinity, { drawn: true }));
  const trams = lines.filter((l) => l.kind === "tram" && l.line?.length >= 2).map((l) => l.line);
  const nearTram = (x, z) => trams.some((L) => { for (let i = 1; i < L.length; i++) {
    const [ax, az] = L[i - 1], [bx, bz] = L[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    if (Math.hypot(ax + dx * t - x, az + dz * t - z) < CONT.tram) return true; } return false; });
  const street = (x, z) => {
    const c = Math.round((x - H.x0) / H.step), r = Math.round((z - H.z0) / H.step);
    if (c < 0 || r < 0 || c >= H.cols || r >= H.rows) return null;
    const k = r * H.cols + c, v = D[k];
    return v > 0 && v !== 65535 ? Y[k] + v / 100 : null;
  };
  const cont = (x, z, y, tol, deckOnly = false) => {
    for (const f of tops) { const v = f(x, z); if (v != null && Math.abs(v - y) <= tol) return true; }
    if (deckOnly) return false;
    const s = street(x, z);
    if (s != null && Math.abs(s - y) <= tol) return true;
    return nearTram(x, z) && Math.abs(hm.ground(x, z) - y) <= tol;
  };
  cont.street = street;
  // the lanes' and tram tracks' segments near a deck (boxes + 4 m)
  const segs = [], near = (x, z) => decks.some((d) => x > d.box[0] - 4 && z > d.box[1] - 4 && x < d.box[2] + 4 && z < d.box[3] + 4);
  for (const P of [...paths, ...trams.map((L) => L.flat())]) for (let i = 2; i + 1 < P.length; i += 2) {
    const ax = P[i - 2], az = P[i - 1], bx = P[i], bz = P[i + 1];
    if (near(ax, az) || near(bx, bz) || near((ax + bx) / 2, (az + bz) / 2)) segs.push(ax, az, bx, bz);
  }
  cont.crosses = (x, z, nx, nz) => {
    for (let i = 0; i < segs.length; i += 4) {
      const ax = segs[i], az = segs[i + 1], dx = segs[i + 2] - ax, dz = segs[i + 3] - az, l2 = dx * dx + dz * dz;
      if (l2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      if (Math.hypot(ax + dx * t - x, az + dz * t - z) < CONT.lane && Math.abs(dx * nx + dz * nz) / Math.sqrt(l2) > 0.5) return true;
    }
    return false;
  };
  return cont;
}
/** the level traffic meets at a deck edge: the street drawn on the deck just inside it (the measured streets lie on a
 *  plan deck's slab, its top tucked under them: Carsoel's west end, the street 0.3-0.5 m under the fitted top), else the
 *  deck's own top y */
const edgeLevel = (cont, x, z, nx, nz, y) => { const s = cont.street?.(x - nx * 0.5, z - nz * 0.5); return s != null && Math.abs(s - y) < 0.6 ? s : y; };
/** the surface goes on past an edge point (x, z) at the deck top y, out along (nx, nz): drawn at level 1 m AND 2 m out
 *  (a 1 m lip of street hanging past the slab, or a street falling away down the bank, is not a continuation) */
// or a lane / tram track crosses the edge there and the surface 1 m out is within CONT.laneTol of it (the drawn street
// beyond can sag into the bank: Carsoel's eastbound lane and tram track at the west end; never a road far under a deck)
const goesOn = (cont, x, z, nx, nz, y0, deckOnly) => {
  const y = edgeLevel(cont, x, z, nx, nz, y0);
  if (cont(x + nx * CONT.near, z + nz * CONT.near, y, CONT.tolNear, deckOnly) && cont(x + nx * CONT.far, z + nz * CONT.far, y, CONT.tolFar, deckOnly)) return true;
  return !deckOnly && !!cont.crosses?.(x, z, nx, nz) && cont(x + nx * CONT.near, z + nz * CONT.near, y, CONT.laneTol);
};
/** decide, once per deck, which parapet / railing pieces stand on a joined edge (d.railCut; deckMesh and parapetRings
 *  read the same decision, so what is drawn is what the car meets): a piece goes when 2 of its 3 samples (ends, middle)
 *  go on. Band decks: [side +1, side -1] x SLAB.step pieces; plan decks: per ring edge x 1 m pieces (a FREE edge, over
 *  the tracks, only where another deck goes on). Returns the pieces cut. */
export function markRailCuts(decks, cont) {
  let cut = 0;
  for (const d of decks) {
    if (d.plan) {
      const ring = d.plan.ring, sgn = ringSign(ring), free = new Set(d.plan.free), top = (x, z) => planTop(d, x, z) - PLAN.sink, edges = [];
      for (let i = 0; i < ring.length; i++) {
        const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], L = Math.hypot(bx - ax, bz - az);
        const steps = Math.max(1, Math.ceil(L)), m = new Uint8Array(steps);
        if (L >= 0.01) {
          const nx = (bz - az) / L * sgn, nz = -(bx - ax) / L * sgn;
          const on = (f) => { const x = ax + (bx - ax) * f, z = az + (bz - az) * f; return goesOn(cont, x, z, nx, nz, top(x, z), free.has(i)) ? 1 : 0; };
          for (let k = 0; k < steps; k++) if (on(k / steps) + on((k + 0.5) / steps) + on((k + 1) / steps) >= 2) { m[k] = 1; cut++; }
        }
        edges.push(m);
      }
      d.railCut = { plan: edges };
      continue;
    }
    const [s0, s1] = d.span, steps = Math.max(1, Math.ceil((s1 - s0) / SLAB.step)), sides = [];
    for (const sg of [1, -1]) {
      const m = new Uint8Array(steps);
      const on = (s) => { const q = at(d, s), nx = q.tz * sg, nz = -q.tx * sg; return goesOn(cont, q.x + nx * d.half, q.z + nz * d.half, nx, nz, q.y - SLAB.sink, false) ? 1 : 0; };
      for (let k = 0; k < steps; k++) { const a = s0 + (s1 - s0) * k / steps, b = s0 + (s1 - s0) * (k + 1) / steps; if (on(a) + on((a + b) / 2) + on(b) >= 2) { m[k] = 1; cut++; } }
      sides.push(m);
    }
    d.railCut = { band: sides };
  }
  return cut;
}

/** The deck as a drawable: a slab between the bridge's own ends (not the extensions), carriageway and sidewalk bands on
 *  top (SLAB.sink under the deck height, so the street's own surface wins where both are drawn), parapets on both
 *  edges, closed ends and soffit. Plain arrays: { position, normal, color } (non-indexed triangles). */
export function deckMesh(d, ground = null, covered = null, streetY = null) {
  if (d.plan) return planDeckMesh(d, ground ?? (() => -Infinity), covered ?? (() => false), streetY);
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
      // (deckrail) a joined piece: the slab's edge face only, no parapet; where a parapet run starts / stops, its end cap
      const cutOf = (j) => !!d.railCut?.band[sg > 0 ? 0 : 1][j];
      if (cutOf(k)) { quad(n, COL.concrete, off(a, sg * H, ya - D), off(b, sg * H, yb - D), off(b, sg * H, yb), off(a, sg * H, ya)); continue; }
      for (const [q, y, dir, j] of [[a, ya, -1, k - 1], [b, yb, 1, k + 1]]) if (j >= 0 && j < steps && cutOf(j)) quad([q.tx * dir, 0, q.tz * dir], COL.concrete, off(q, sg * (H - Wp), y), off(q, sg * H, y), off(q, sg * H, y + Ph), off(q, sg * (H - Wp), y + Ph));
      quad(n, COL.concrete, off(a, sg * H, ya - D), off(b, sg * H, yb - D), off(b, sg * H, yb + Ph), off(a, sg * H, ya + Ph));          // outer face
      quad(ni, COL.concrete, off(a, sg * (H - Wp), ya), off(b, sg * (H - Wp), yb), off(b, sg * (H - Wp), yb + Ph), off(a, sg * (H - Wp), ya + Ph));   // inner face
      quad([0, 1, 0], COL.concrete, off(a, sg * (H - Wp), ya + Ph), off(b, sg * (H - Wp), yb + Ph), off(b, sg * H, yb + Ph), off(a, sg * H, ya + Ph));  // coping
    }
  }
  for (const [q, dir] of [[S[0], -1], [S[S.length - 1], 1]]) {             // the ends: slab + parapet caps
    const n = [q.tx * dir, 0, q.tz * dir], y = q.y - SLAB.sink;
    quad(n, COL.concrete, off(q, -H, y - D), off(q, H, y - D), off(q, H, y), off(q, -H, y));
    for (const sg of [-1, 1]) {
      if (d.railCut?.band[sg > 0 ? 0 : 1][dir < 0 ? 0 : steps - 1]) continue;      // (deckrail: no parapet at that end)
      quad(n, COL.concrete, off(q, sg * (H - Wp), y), off(q, sg * H, y), off(q, sg * H, y + Ph), off(q, sg * (H - Wp), y + Ph));
    }
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
// (vivier) a FREE edge (over the tracks) carries its railing wherever it is over anything lower than a kerb: a bridge's
// parapet runs on to the bank (Vivier d'Oie's corners: 0.6-0.7 m drops beside the fascia had none, deckJoins.mjs)
const FREE_DROP = 0.15;
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
  return planBase(d, x, z) + (offBand(d._band, x, z) ? KERB : 0);
}
/** a plan deck's carriageway level at (x, z): its fitted plane (UrbIS plans), else the road's profile */
const planBase = (d, x, z) => (d.plan.plane ? planeY(d.plan.plane, x, z) : profY(d, alongLine(d, x, z)));
/** the fitted top: the plane + the residuals of the streets round the edges, inverse-distance weighted (the deck meets
 *  each street at its own height: the plane alone left 0.25-0.36 m ledges at Vivier d'Oie's corners, deckJoins.mjs) */
const planeY = (P, x, z) => {
  const y = P.a + P.b * (x - P.x) + P.c * (z - P.z), R = P.res;
  if (!R?.length) return y;
  let sw = 0, sr = 0;
  for (let i = 0; i < R.length; i += 3) {
    const d2 = (R[i] - x) ** 2 + (R[i + 1] - z) ** 2;
    if (d2 < 1e-4) return y + R[i + 2];
    const w = 1 / (d2 * d2);                      // power 4: the nearest edge dominates, the middle stays near the plane
    sw += w; sr += w * R[i + 2];
  }
  return y + sr / sw;
};
/** the plane through the ground just outside a ring's abutment edges (not the free ones: they span the cutting), the
 *  samples under it (a cutting slope, a bank falling away) dropped round by round: the streets the deck joins */
const RES_LOW = -0.6;
function fitPlane(ring, free, ground) {
  const F = new Set(free), sgn = ringSign(ring), S = [];
  for (let i = 0; i < ring.length; i++) {
    if (F.has(i)) continue;
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], L = Math.hypot(bx - ax, bz - az);
    if (L < 0.5) continue;
    const nx = (bz - az) / L * sgn, nz = -(bx - ax) / L * sgn;
    for (let s = 0.5; s < L; s += 1) {
      const ex = ax + (bx - ax) * s / L, ez = az + (bz - az) * s / L, y = ground(ex + nx * 1.0, ez + nz * 1.0);
      if (Number.isFinite(y)) S.push([ex + nx * 1.0, ez + nz * 1.0, y, ex, ez]);
    }
  }
  if (S.length < 6) return null;
  let keep = S, P = null;
  for (let it = 0; it < 6; it++) {
    const n = keep.length, mx = keep.reduce((a, p) => a + p[0], 0) / n, mz = keep.reduce((a, p) => a + p[1], 0) / n, my = keep.reduce((a, p) => a + p[2], 0) / n;
    let sxx = 0, sxz = 0, szz = 0, sxy = 0, szy = 0;
    for (const [x, z, y] of keep) { const u = x - mx, v = z - mz, w = y - my; sxx += u * u; sxz += u * v; szz += v * v; sxy += u * w; szy += v * w; }
    const det = sxx * szz - sxz * sxz;
    const b = Math.abs(det) > 1e-9 ? (sxy * szz - szy * sxz) / det : 0, c = Math.abs(det) > 1e-9 ? (szy * sxx - sxy * sxz) / det : 0;
    P = { x: +mx.toFixed(3), z: +mz.toFixed(3), a: +my.toFixed(3), b: +b.toFixed(5), c: +c.toFixed(5) };
    const next = S.filter(([x, z, y]) => y - planeY(P, x, z) > -0.35);
    if (next.length === keep.length || next.length < 6) break;
    keep = next;
  }
  const r = keep.map(([x, z, y]) => y - planeY(P, x, z));
  P.rms = +Math.sqrt(r.reduce((a, v) => a + v * v, 0) / r.length).toFixed(3); P.n = keep.length; P.of = S.length;
  // the residuals of the street samples (not the cutting slopes: more than RES_LOW under the plane), for planeY's
  // correction; taken at the edge itself (the sample 1 m out moved back onto the ring)
  const res = [];
  for (const [x, z, y, ex, ez] of S) { const v = y - planeY(P, x, z); if (v > RES_LOW) res.push(+ex.toFixed(2), +ez.toFixed(2), +v.toFixed(3)); }
  P.res = res;
  return P;
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
function planDeckMesh(d, ground, covered, streetY = null) {
  const P = [], N = [], C = [], S = [];        // S: the material slot per triangle (PLAN_SLOTS)
  const tri = (n, c, a, b, cc) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = cc[0] - a[0], wy = cc[1] - a[1], wz = cc[2] - a[2];
    const gx = uy * wz - uz * wy, gy = uz * wx - ux * wz, gz = ux * wy - uy * wx;
    const pts = gx * n[0] + gy * n[1] + gz * n[2] < 0 ? [a, cc, b] : [a, b, cc];
    for (const p of pts) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); C.push(c[0], c[1], c[2]); }
    S.push(SLOT_OF.get(c) ?? 3);
  };
  const quad = (n, c, a, b, cc, dd) => { tri(n, c, a, b, cc); tri(n, c, a, cc, dd); };
  const ring = d.plan.ring, top = (x, z) => planTop(d, x, z) - PLAN.sink, base = (x, z) => planBase(d, x, z) - PLAN.sink;
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
      // (vivier) off the measured streets, a kerb over the drawn street beside it (its height field is up to 0.35 m off
      // the deck's plane: a raised / sunk block of paving between two streets otherwise), only near the deck's level
      const v = q.map(([px, pz]) => {
        const b = base(px, pz);
        if (covered(px, pz)) return [px, b - UNDER_STREET, pz];
        const sy = streetY ? streetY(px, pz) : null;
        return [px, sy != null && Math.abs(sy - PLAN.sink - b) < 0.6 ? sy - PLAN.sink + lift : b + lift, pz];
      });
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
    const ix = -nx * PLAN.upW, iz = -nz * PLAN.upW, U = PLAN.upstand, mx = ix * 0.5, mz = iz * 0.5, cutE = d.railCut?.plan[i];
    for (let k = 0; k < steps; k++) {
      const a = S[k], b = S[k + 1];
      if (a.drop < -0.05 && b.drop < -0.05) continue;                         // buried: the bank is over the deck here
      const fr = free.has(i);
      const ya = fr ? a.yb - PLAN.depth : Math.min(a.yb - PLAN.depth, a.gr - 0.4), yb = fr ? b.yb - PLAN.depth : Math.min(b.yb - PLAN.depth, b.gr - 0.4);
      quad(n, fr ? COLP.fascia : COLP.wall, [a.x, ya, a.z], [b.x, yb, b.z], [b.x, b.y, b.z], [a.x, a.y, a.z]);
      if (cutE?.[k]) continue;                                                   // (deckrail: the street goes on here)
      if (Math.max(a.drop, b.drop) < (fr ? FREE_DROP : RAIL_DROP)) continue;
      // a concrete upstand on the slab's edge (outer face, inner face, top), then the steel rails at 1.1 / 0.75 / 0.45 m
      quad(n, COLP.fascia, [a.x, a.y, a.z], [b.x, b.y, b.z], [b.x, b.y + U, b.z], [a.x, a.y + U, a.z]);
      quad([-nx, 0, -nz], COLP.fascia, [a.x + ix, a.y, a.z + iz], [b.x + ix, b.y, b.z + iz], [b.x + ix, b.y + U, b.z + iz], [a.x + ix, a.y + U, a.z + iz]);
      quad([0, 1, 0], COLP.fascia, [a.x, a.y + U, a.z], [b.x, b.y + U, b.z], [b.x + ix, b.y + U, b.z + iz], [a.x + ix, a.y + U, a.z + iz]);
      for (const [q, dir, j] of [[a, -1, k - 1], [b, 1, k + 1]]) if (cutE?.[j]) quad([tx * dir, 0, tz * dir], COLP.fascia, [q.x, q.y, q.z], [q.x + ix, q.y, q.z + iz], [q.x + ix, q.y + U, q.z + iz], [q.x, q.y + U, q.z]);   // (deckrail: the upstand's end)
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
      if (cutE?.[Math.min(steps - 1, Math.floor(sAl / L * steps))]) continue;
      if (y - ground(x + nx * 0.65, z + nz * 0.65) < (free.has(i) ? FREE_DROP : RAIL_DROP)) continue;
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
  const ring = d.plan.ring, out = [], top = (x, z) => planTop(d, x, z) - PLAN.sink, outSign = ringSign(ring), free = new Set(d.plan.free);
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], L = Math.hypot(bx - ax, bz - az);
    if (L < 0.01) continue;
    // (deckrail: the drawn railing's own 1 m pieces, so the cut pieces and the drop test match the mesh one for one)
    const cutE = d.railCut?.plan[i], nx = (bz - az) / L * outSign, nz = -(bx - ax) / L * outSign, steps = Math.max(1, Math.ceil(cutE ? L : L / SLAB.step));
    for (let k = 0; k < steps; k++) {
      if (cutE?.[k]) continue;
      const x0 = ax + (bx - ax) * k / steps, z0 = az + (bz - az) * k / steps, x1 = ax + (bx - ax) * (k + 1) / steps, z1 = az + (bz - az) * (k + 1) / steps;
      const ya = top(x0, z0), yb = top(x1, z1);
      if (ground && Math.max(ya - ground(x0 + nx * 0.5, z0 + nz * 0.5), yb - ground(x1 + nx * 0.5, z1 + nz * 0.5)) < (free.has(i) ? FREE_DROP : RAIL_DROP)) continue;
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
        const top = planBase(d, x, z) - PLAN.sink - UNDER_STREET - 0.12, k = r * cols + c;
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
      // (vivier) walled: the floor only between the walls and under the slab, no 1:1 taper (the taper of a station floor
      // lowered the Avenue Laterale beside the Vivier d'Oie deck 1.8 m: a walled cutting's banks are the streets)
      if (U.walled && (over > 1.5 || out > 0)) continue;     // (1.5: the grid row behind the wall too: its 1 m terrain triangles rose in spikes in front of the wall foot)
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
    if (d.railCut?.band[sg > 0 ? 0 : 1][k]) continue;                        // (deckrail: a joined edge, no wall)
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

// ---------------------------------------------------------------------------------------------- PLANS FROM UrbIS (vivier)
// Owner playtest 2026-11-17: "there is a bridge at Vivier d'Oie, Chaussee de Waterloo, that is missing". The OSM deck
// was the Chaussee's 18.7 m band; the real bridge (UrbIS Land cover ROB 590, 740 m2) is a skewed slab twice that wide
// (the Avenue Laterale junction and the east footway on it): half of it hung over the open cutting, and the UrbIS slab
// railData.js drew for it stood at the DTM of its centroid, the cutting floor (1.6 m over the rails). Rule: a road
// bridge over the railway is drawn as ITS MEASURED POLYGON. For every OSM bridge road crossing a UrbIS road bridge
// (ROB) over a track, without a hand-measured plan, a plan is made from the polygon:
//   ring   the UrbIS outline; free: the edges that cross a track or pass within FREE_NEAR m of one (fascia + railing,
//          the trains pass under); the others are abutments (wall into the ground) or carry the railing over the slopes
//   fit    the top is the plane through the streets just outside the abutment edges (fitPlane)
//   walls  the cutting walls under the slab, parallel to the tracks, where the DTM beside the deck leaves the floor
//          (WALL_MIN..WALL_MAX m out from the outer tracks); under: the floor between them at the ballast's foot
// Only for a real over-the-cutting bridge: the streets at least OVER_MIN m over the rail top.
const FREE_NEAR = 3.5, FREE_PAD = 1.2, PAD_MAX = 4, ARM = 15, WALL_MIN = 3.2, WALL_MAX = 8.5, OVER_MIN = 4.0, BAND_OK = 0.85, SPREAD_MAX = 12;
/** the share of a ring (1 m samples) within `half` m of the road line (the band deck's 2D footprint) */
function bandCover(line, half, ring) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity, n = 0, k = 0;
  for (const [x, z] of ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  for (let x = Math.floor(x0) + 0.5; x < x1; x++) for (let z = Math.floor(z0) + 0.5; z < z1; z++) {
    if (!inRing(ring, x, z)) continue;
    n++;
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = ((x - ax) * dx + (z - az) * dz) / l2;
      if (t >= 0 && t <= 1 && Math.hypot(ax + dx * t - x, az + dz * t - z) <= half) { k++; break; }
    }
  }
  return n ? k / n : 1;
}
const segHit = (a, b, c, d) => {
  const r0 = b[0] - a[0], r1 = b[1] - a[1], s0 = d[0] - c[0], s1 = d[1] - c[1], den = r0 * s1 - r1 * s0;
  if (Math.abs(den) < 1e-9) return false;
  const t = ((c[0] - a[0]) * s1 - (c[1] - a[1]) * s0) / den, u = ((c[0] - a[0]) * r1 - (c[1] - a[1]) * r0) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};
/** the bridge plans for a tile: the hand-measured ones (data/overrides.json bridgePlans) + one per OSM bridge road of
 *  roadsDoc over a UrbIS ROB (railDoc: data/rail/rail.json prepared, its .decks / .tracks); ground: the DTM sampler */
export function ringPlans(hand, roadsDoc, railDoc, ground, surf = null) {
  const out = { ...(hand || {}) };
  if (!railDoc?.decks || !roadsDoc?.roads) return out;
  const nodes = new Map((roadsDoc.nodes || []).map((n) => [n.id, n]));
  const robs = railDoc.decks.filter((b) => b.type === "ROB");
  for (const r of roadsDoc.roads) {
    const br = r.meta?.bridge, osm = String(r.meta?.osm ?? "");
    if (!br || br === "no" || !osm || out[osm]) continue;
    const line = centreLine(r, nodes);
    if (!line) continue;
    // the UrbIS polygon holding most of the road's line (1 m samples)
    let best = null, bestN = 0;
    for (const b of robs) {
      let n = 0;
      for (let i = 1; i < line.length; i++) {
        const [ax, az] = line[i - 1], [bx, bz] = line[i], L = Math.hypot(bx - ax, bz - az);
        for (let s = 0; s <= L; s += 1) if (inRing(b.ring, ax + (bx - ax) * s / (L || 1), az + (bz - az) * s / (L || 1))) n++;
      }
      if (n > bestN) { bestN = n; best = b; }
    }
    if (!best || bestN < 3) continue;
    // only where the road's band misses the bridge: under BAND_OK of the polygon (1 m samples) inside it (the band decks
    // that cover their bridge, Merlo / Chenaie / Bourdon, stay as they were)
    if (bandCover(line, widths(r).half, best.ring) >= BAND_OK) continue;
    // (+ the road's own lane band's outline, extended EXT m past its ends: the road engine draws its sidewalks to there)
    const H = widths(r).half - SLAB.parapetW, band = [];
    const ext = (p, q) => { const dx = p[0] - q[0], dz = p[1] - q[1], L = Math.hypot(dx, dz) || 1; return [p[0] + dx / L * EXT, p[1] + dz / L * EXT]; };
    const bl = [ext(line[0], line[1]), ...line, ext(line[line.length - 1], line[line.length - 2])];
    for (let i = 1; i < bl.length; i++) {
      const [ax, az] = bl[i - 1], [bx, bz] = bl[i], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let t = 0; t <= L; t += 1) for (const sg of [-1, 1]) band.push([ax + (bx - ax) * t / L + nx * H * sg, az + (bz - az) * t / L + nz * H * sg]);
    }
    // (+ the first ARM m of the roads meeting it at its ends: their sidewalks' junction corners, Avenue Laterale / the
    // Chaussee's south arm, reached 1.4 m past the padded east edge over the tracks)
    for (const o of roadsDoc.roads) {
      if (o === r || ![o.a, o.b].some((id) => id === r.a || id === r.b)) continue;
      let ol = centreLine(o, nodes);
      if (!ol) continue;
      if (o.b === r.a || o.b === r.b) ol = ol.slice().reverse();
      const oh = widths(o).half - SLAB.parapetW;
      let run = 0;
      for (let i = 1; i < ol.length && run < ARM; i++) {
        const [ax, az] = ol[i - 1], [bx, bz] = ol[i], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L;
        for (let t = 0; t <= L && run + t < ARM; t += 1) for (const sg of [-1, 1]) band.push([ax + (bx - ax) * t / L + nx * oh * sg, az + (bz - az) * t / L + nz * oh * sg]);
        run += L;
      }
    }
    const plan = urbisPlan(best, railDoc, ground, { surfaces: [...(surf?.surfaces || []), { rings: [band] }] });
    if (plan) out[osm] = plan;
  }
  return out;
}
/** one UrbIS ROB polygon -> a plan (null when it is not over a cutting) */
export function urbisPlan(b, railDoc, ground, surf = null) {
  const ring = b.ring.slice();
  if (ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  // the track points under the slab, and the track segments round it
  const under = [], segs = [];
  for (const t of railDoc.tracks) {
    if (t.tunnel || t.box.x1 < x0 - 10 || t.box.x0 > x1 + 10 || t.box.z1 < z0 - 10 || t.box.z0 > z1 + 10) continue;
    for (let i = 0; i < t.pts.length; i++) {
      const p = t.pts[i];
      if (i) segs.push([[t.pts[i - 1][0], t.pts[i - 1][2]], [p[0], p[2]]]);
      if (inRing(ring, p[0], p[2])) under.push({ p, q: t.pts[Math.min(i + 1, t.pts.length - 1)], o: t.pts[Math.max(i - 1, 0)] });
    }
  }
  if (under.length < 2) return null;
  // frame: c the mean track point, u the mean direction (sign-aligned), v across
  let ux = 0, uz = 0, cx = 0, cz = 0, ry = Infinity;
  for (const { p, q, o } of under) {
    let dx = q[0] - o[0], dz = q[2] - o[2]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (ux * dx + uz * dz < 0) { dx = -dx; dz = -dz; }
    ux += dx; uz += dz; cx += p[0]; cz += p[2]; ry = Math.min(ry, p[1]);
  }
  const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; cx /= under.length; cz /= under.length;
  const vx = -uz, vz = ux, lat = (x, z) => (x - cx) * vx + (z - cz) * vz, lon = (x, z) => (x - cx) * ux + (z - cz) * uz;
  let lo = Infinity, hi = -Infinity, rmax = -Infinity;
  for (const { p } of under) { const o = lat(p[0], p[2]); lo = Math.min(lo, o); hi = Math.max(hi, o); rmax = Math.max(rmax, p[1]); }
  // one bundle of tracks at one level (a long deck over diverging lines at several levels, Avenue des Tilleuls over
  // L26 / L26/5, is not this simple case: left to a hand-measured plan)
  if (hi - lo > SPREAD_MAX || rmax - ry > 1.5) return null;
  // over a cutting: the streets round it (the ring's vertices' ground, upper quarter) OVER_MIN m over the rails
  const gv = ring.map(([x, z]) => ground(x, z)).filter(Number.isFinite).sort((a, c) => a - c);
  if (!gv.length || gv[Math.floor(gv.length * 0.75)] - ry < OVER_MIN) return null;
  // free edges: crossing a track, or within FREE_NEAR m of one
  const near = (x, z) => segs.some(([a, c]) => { const dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < FREE_NEAR; });
  const free = [];
  for (let i = 0; i < ring.length; i++) {
    const A = ring[i], B = ring[(i + 1) % ring.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    let f = segs.some(([a, c]) => segHit(A, B, a, c));
    for (let s = 0; !f && s <= L; s += 1) f = near(A[0] + (B[0] - A[0]) * s / (L || 1), A[1] + (B[1] - A[1]) * s / (L || 1));
    if (f) free.push(i);
  }
  // the free edges (and those over a drop) pushed FREE_PAD m out: UrbIS's street surfaces reach ~1 m past its bridge polygon there (the
  // sidewalks drawn at the deck's level hung over the tracks past the fascia, deckJoins.mjs); the parapet stands at
  // the streets' edge
  // (+ the edges over a drop: the east footway's sidewalk reached past the NE edge over the north bank, 3-4 m up)
  const sg0 = ringSign(ring), lvl = gv[Math.floor(gv.length * 0.75)], pad = new Set(free);
  for (let i = 0; i < ring.length; i++) {
    const A = ring[i], B = ring[(i + 1) % ring.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (L < 0.5 || pad.has(i)) continue;
    const nx = (B[1] - A[1]) / L * sg0, nz = -(B[0] - A[0]) / L * sg0;
    let n = 0, low = 0;
    for (let s = 0.5; s < L; s += 1) { const g = ground(A[0] + (B[0] - A[0]) * s / L + nx * 1.5, A[1] + (B[1] - A[1]) * s / L + nz * 1.5); if (Number.isFinite(g)) { n++; if (g < lvl - 1.0) low++; } }
    if (n && low / n >= 0.5) pad.add(i);
  }
  // how far: FREE_PAD, or out to the measured street surfaces' farthest vertex over the drop beyond that edge (+ 0.3 m,
  // at most PAD_MAX): Vivier d'Oie's east sidewalk reached 2.4 m past the UrbIS bridge polygon over the tracks
  const padOf = new Map();
  if (pad.size) for (const i of pad) {
    const A = ring[i], B = ring[(i + 1) % ring.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, tx = (B[0] - A[0]) / L, tz = (B[1] - A[1]) / L, nx = tz * sg0, nz = -tx * sg0;
    let o = FREE_PAD;
    for (const q of surf?.surfaces || []) for (const r of q.rings) for (const [x, z] of r) {
      const u = (x - A[0]) * tx + (z - A[1]) * tz, v = (x - A[0]) * nx + (z - A[1]) * nz;
      if (u < -0.5 || u > L + 0.5 || v <= 0 || v > PAD_MAX - 0.3) continue;
      const g = ground(x, z);
      if (Number.isFinite(g) && g < lvl - 1.0) o = Math.max(o, v + 0.3);
    }
    padOf.set(i, +o.toFixed(2));
  }
  if (pad.size) {
    const F = pad, n = ring.length, sg = sg0;
    const line = (i) => { const A = ring[i], B = ring[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = (B[1] - A[1]) / L * sg, nz = -(B[0] - A[0]) / L * sg, o = F.has(i) ? padOf.get(i) : 0;
      return { p: [A[0] + nx * o, A[1] + nz * o], d: [(B[0] - A[0]) / L, (B[1] - A[1]) / L], nx, nz, o }; };
    const moved = ring.map((P, i) => {
      const a = line((i + n - 1) % n), b = line(i);
      if (!a.o && !b.o) return P;
      const den = a.d[0] * b.d[1] - a.d[1] * b.d[0];
      if (Math.abs(den) < 0.05) return [+(P[0] + (a.nx * a.o + b.nx * b.o) / (a.o && b.o ? 2 : 1)).toFixed(2), +(P[1] + (a.nz * a.o + b.nz * b.o) / (a.o && b.o ? 2 : 1)).toFixed(2)];
      const t = ((b.p[0] - a.p[0]) * b.d[1] - (b.p[1] - a.p[1]) * b.d[0]) / den;
      return [+(a.p[0] + a.d[0] * t).toFixed(2), +(a.p[1] + a.d[1] * t).toFixed(2)];
    });
    for (let i = 0; i < n; i++) ring[i] = moved[i];
  }
  // the slab's extent along the tracks, and the cutting's floor edges from the DTM just beyond it (both ends)
  let s0 = Infinity, s1 = -Infinity;
  for (const [x, z] of ring) { const s = lon(x, z); s0 = Math.min(s0, s); s1 = Math.max(s1, s); }
  const edgeOut = (side) => {
    const found = [];
    for (const s of [s0 - 3, s0 - 6, s1 + 3, s1 + 6]) {
      for (let o = WALL_MIN; o <= WALL_MAX + 0.01; o += 0.5) {
        const off = side > 0 ? hi + o : lo - o, g = ground(cx + ux * s + vx * off, cz + uz * s + vz * off);
        if (Number.isFinite(g) && g > ry + 1.2) { found.push(o); break; }
      }
    }
    found.sort((a, c) => a - c);
    return found.length ? Math.max(WALL_MIN, found[Math.floor(found.length / 2)] - 0.5) : WALL_MIN + 1;
  };
  const wHi = hi + edgeOut(1), wLo = lo - edgeOut(-1);
  // each wall: the stretch of its line under the slab (+ 0.3 m into the bank past the free edges)
  const wallAt = (off) => {
    let a = Infinity, e = -Infinity;
    for (let s = s0 - 1; s <= s1 + 1; s += 0.25) { if (inRing(ring, cx + ux * s + vx * off, cz + uz * s + vz * off)) { a = Math.min(a, s); e = Math.max(e, s); } }
    if (!(e > a)) return null;
    const p = (s) => [+(cx + ux * s + vx * off).toFixed(2), +(cz + uz * s + vz * off).toFixed(2)];
    return [p(a - 0.3), p(e + 0.3)];
  };
  const walls = [wallAt(wLo), wallAt(wHi)].filter(Boolean);
  const mid = (wLo + wHi) / 2;
  return { urbis: b.id, fit: true, ring, free, walls,
    under: { c: [+(cx + vx * mid).toFixed(2), +(cz + vz * mid).toFixed(2)], u: [+ux.toFixed(4), +uz.toFixed(4)], half: +((wHi - wLo) / 2).toFixed(2), level: +(ry - 0.45).toFixed(2), walled: true } };
}

/** (x, z) -> the highest the catenary may run at (Infinity away from the decks): 0.3 m under a deck's soffit, sloping
 *  back up at 1:12 away from its edges (as railData.js wireCap under the hero arches; the contact wire runs 0.3 m under
 *  that). Plain-data descriptors. */
export function deckSoffitCap(decks) {
  const list = decks || [];
  return (x, z) => {
    let cap = Infinity;
    for (const d of list) {
      if (x < d.box[0] - 25 || z < d.box[1] - 25 || x > d.box[2] + 25 || z > d.box[3] + 25) continue;
      let out, soffit;
      if (d.plan) {
        out = 0;
        if (!inRing(d.plan.ring, x, z)) {
          out = Infinity;
          const ring = d.plan.ring;
          for (let i = 0; i < ring.length; i++) {
            const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
            out = Math.min(out, Math.hypot(ax + dx * t - x, az + dz * t - z));
          }
        }
        soffit = planBase(d, x, z) - PLAN.sink - PLAN.depth;
      } else {
        let best = Infinity, s = 0;
        for (let i = 1; i < d.pts.length; i++) {
          const [ax, az] = d.pts[i - 1], [bx, bz] = d.pts[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), dist = Math.hypot(ax + dx * t - x, az + dz * t - z);
          if (dist < best) { best = dist; s = d.cum[i - 1] + t * Math.sqrt(l2); }
        }
        out = Math.hypot(Math.max(0, best - d.half), Math.max(0, d.span[0] - s, s - d.span[1]));
        soffit = profY(d, Math.min(Math.max(s, d.span[0]), d.span[1])) - SLAB.sink - SLAB.depth;
      }
      if (out > 25) continue;
      cap = Math.min(cap, soffit - 0.3 + out / 12);
    }
    return cap;
  };
}

/** (x, z) -> true on a deck's drawn slab in 2D (the band between its own ends, or the plan's ring), whatever the ground */
export function deckFootprint(d) {
  if (d.plan) return (x, z) => x >= d.box[0] && z >= d.box[1] && x <= d.box[2] && z <= d.box[3] && inRing(d.plan.ring, x, z);
  return (x, z) => {
    if (x < d.box[0] || z < d.box[1] || x > d.box[2] || z > d.box[3]) return false;
    let best = Infinity, s = 0;
    for (let i = 1; i < d.pts.length; i++) {
      const [ax, az] = d.pts[i - 1], [bx, bz] = d.pts[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), dist = Math.hypot(ax + dx * t - x, az + dz * t - z);
      if (dist < best) { best = dist; s = d.cum[i - 1] + t * Math.sqrt(l2); }
    }
    return best <= d.half && s >= d.span[0] - 0.01 && s <= d.span[1] + 0.01;
  };
}

/** (x, z) on the plan deck's own carriageway band (where the road engine draws the bridge road itself) */
export function onCarriageway(d, x, z) { d._band ??= bandOf(d); return !offBand(d._band, x, z); }
