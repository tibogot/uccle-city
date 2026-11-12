// DRIVE COLLIDERS: what a car bumps into, per tile, as plain typed arrays (built in the tile worker, no three.js).
//
//   polygons  building footprints (UrbIS, courtyards = holes) and raised kerb islands from the road engine
//             (roundabout centres, splitter islands, raised medians: the network's node.islands / road.center.poly)
//   circles   tree trunks (features.json trees) and lamp posts (viewer/lamps.js lampSites, added on the main thread)
//   cells     every item hashed into 48 m cells over the tile, so a query only looks at the few cells round the car
//   ground    the drivable surface: the carved terrain (hm.y) + how far the road / kerb / island meshes sit above it,
//             in centimetres per 1 m cell (Uint8): the road deck is CARVE above the carved terrain, sidewalks 15 cm more
//
// The approach is mrdoob's slop-newyork (MIT, (c) 2026 Mr.doob: js/building-collision.js, js/controllers.js
// nearColliders): the car is an oriented rectangle, footprints are exact polygons, the escape is the smallest push
// over the edge normals, the box axes and the corner pairs (no seams between neighbouring triangles, concave corners
// resolve). Written again here on flat arrays (no per-vertex objects to post from the worker).
//
// Sidewalk kerbs are NOT walls: the road engine says "kerbs to sidewalks are climbed"; they are in the ground grid.

export const CELL = 48;
export const KIND = { building: 0, island: 1, tree: 2, lamp: 3, post: 4, wall: 5 };

/**
 * Build a collider set from plain lists.
 * polys: [{ rings: [[[x, z], ...], ...holes], kind, top? }], circles: [{ x, z, r, kind }], bounds: { x0, x1, z0, z1 }
 */
export function buildColliders(polys, circles, bounds) {
  let nv = 0, nr = 0;
  for (const p of polys) for (const r of p.rings) { nv += r.length; nr++; }
  const pts = new Float32Array(nv * 2), ringStart = new Uint32Array(nr + 1), polyRing = new Uint32Array(polys.length + 1);
  const pbox = new Float32Array(polys.length * 4), pkind = new Uint8Array(polys.length), ptop = new Float32Array(polys.length), pbase = new Float32Array(polys.length);
  let v = 0, r = 0;
  polys.forEach((p, i) => {
    polyRing[i] = r;
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const ring of p.rings) {
      ringStart[r++] = v;
      for (const [x, z] of ring) { pts[v * 2] = x; pts[v * 2 + 1] = z; v++; if (x < a) a = x; if (x > c) c = x; if (z < b) b = z; if (z > d) d = z; }
    }
    pbox[i * 4] = a; pbox[i * 4 + 1] = b; pbox[i * 4 + 2] = c; pbox[i * 4 + 3] = d;
    pkind[i] = p.kind ?? KIND.building; ptop[i] = p.top ?? 1e4; pbase[i] = p.base ?? -1e4;
  });
  ringStart[nr] = v; polyRing[polys.length] = r;
  const circ = new Float32Array(circles.length * 3), ckind = new Uint8Array(circles.length);
  circles.forEach((q, i) => { circ[i * 3] = q.x; circ[i * 3 + 1] = q.z; circ[i * 3 + 2] = q.r; ckind[i] = q.kind ?? KIND.post; });
  const col = { cell: CELL, bounds, pts, ringStart, polyRing, pbox, pkind, ptop, pbase, circ, ckind };
  indexCells(col);
  return col;
}

/** (Re)build the 48 m cell index of a set (after adding circles). Items outside the tile's cells are clamped in. */
export function indexCells(col) {
  const { bounds: b, pbox, circ } = col;
  const nx = Math.max(1, Math.ceil((b.x1 - b.x0) / CELL)), nz = Math.max(1, Math.ceil((b.z1 - b.z0) / CELL));
  const P = pbox.length / 4, C = circ.length / 3;
  const ci = (x) => Math.min(nx - 1, Math.max(0, Math.floor((x - b.x0) / CELL)));
  const cj = (z) => Math.min(nz - 1, Math.max(0, Math.floor((z - b.z0) / CELL)));
  const span = (k) => k < P ? [pbox[k * 4], pbox[k * 4 + 1], pbox[k * 4 + 2], pbox[k * 4 + 3]]
    : [circ[(k - P) * 3] - circ[(k - P) * 3 + 2], circ[(k - P) * 3 + 1] - circ[(k - P) * 3 + 2], circ[(k - P) * 3] + circ[(k - P) * 3 + 2], circ[(k - P) * 3 + 1] + circ[(k - P) * 3 + 2]];
  const count = new Uint32Array(nx * nz + 1);
  const keep = (s) => s[2] >= b.x0 - CELL && s[0] <= b.x1 + CELL && s[3] >= b.z0 - CELL && s[1] <= b.z1 + CELL;
  for (let k = 0; k < P + C; k++) {
    const s = span(k);
    if (!keep(s)) continue;
    for (let j = cj(s[1]); j <= cj(s[3]); j++) for (let i = ci(s[0]); i <= ci(s[2]); i++) count[j * nx + i + 1]++;
  }
  for (let k = 1; k < count.length; k++) count[k] += count[k - 1];
  const items = new Uint32Array(count[count.length - 1]), fill = count.slice(0, -1);
  for (let k = 0; k < P + C; k++) {
    const s = span(k);
    if (!keep(s)) continue;
    for (let j = cj(s[1]); j <= cj(s[3]); j++) for (let i = ci(s[0]); i <= ci(s[2]); i++) items[fill[j * nx + i]++] = k;
  }
  Object.assign(col, { nx, nz, cellStart: count, cellItems: items, P, C });
  col.seen = new Uint32Array(P + C); col.stamp = 0;
  return col;
}

/** Add circles (lamp posts, computed on the main thread) to a set and re-index it. */
export function addCircles(col, circles) {
  if (!circles.length) return col;
  const n0 = col.circ.length / 3, circ = new Float32Array((n0 + circles.length) * 3), ckind = new Uint8Array(n0 + circles.length);
  circ.set(col.circ); ckind.set(col.ckind);
  circles.forEach((q, i) => { circ[(n0 + i) * 3] = q.x; circ[(n0 + i) * 3 + 1] = q.z; circ[(n0 + i) * 3 + 2] = q.r; ckind[n0 + i] = q.kind ?? KIND.post; });
  col.circ = circ; col.ckind = ckind;
  return indexCells(col);
}

/** Items (ids: < col.P a polygon, else a circle) of every cell within r of (x, z), each once, into out. */
export function gather(col, x, z, r, out) {
  const b = col.bounds, nx = col.nx, nz = col.nz;
  const i0 = Math.max(0, Math.floor((x - r - b.x0) / CELL)), i1 = Math.min(nx - 1, Math.floor((x + r - b.x0) / CELL));
  const j0 = Math.max(0, Math.floor((z - r - b.z0) / CELL)), j1 = Math.min(nz - 1, Math.floor((z + r - b.z0) / CELL));
  if (i0 > i1 || j0 > j1) return out;
  const stamp = ++col.stamp;
  if (stamp > 4e9) { col.seen.fill(0); col.stamp = 1; }
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const c = j * nx + i;
    for (let k = col.cellStart[c]; k < col.cellStart[c + 1]; k++) {
      const id = col.cellItems[k];
      if (col.seen[id] === col.stamp) continue;
      col.seen[id] = col.stamp;
      // cheap bounds test against the query square
      if (id < col.P) {
        const q = id * 4;
        if (col.pbox[q] > x + r || col.pbox[q + 2] < x - r || col.pbox[q + 1] > z + r || col.pbox[q + 3] < z - r) continue;
      } else {
        const q = (id - col.P) * 3, rr = col.circ[q + 2] + r;
        if (Math.abs(col.circ[q] - x) > rr || Math.abs(col.circ[q + 1] - z) > rr) continue;
      }
      out.push(col, id);
    }
  }
  return out;
}

// ---------------------------------------------------------------- polygon tests (flat rings)

function polyContains(col, p, x, z) {
  const { pts, ringStart, polyRing } = col;
  let inside = false;
  for (let r = polyRing[p]; r < polyRing[p + 1]; r++) {
    const s = ringStart[r], e = ringStart[r + 1];
    for (let i = s, j = e - 1; i < e; j = i++) {
      const ax = pts[i * 2], az = pts[i * 2 + 1], bx = pts[j * 2], bz = pts[j * 2 + 1];
      if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
    }
  }
  return inside;
}

/** Does the oriented box (centre x, z; half sizes hx across, hz along; heading cos / sin) overlap polygon p? */
function polyBoxOverlaps(col, p, x, z, hx, hz, cs, sn) {
  if (polyContains(col, p, x, z)) return true;
  const { pts, ringStart, polyRing } = col;
  for (let r = polyRing[p]; r < polyRing[p + 1]; r++) {
    const s = ringStart[r], e = ringStart[r + 1];
    for (let i = s, j = e - 1; i < e; j = i++) {
      const Ax = pts[j * 2], Az = pts[j * 2 + 1], Bx = pts[i * 2], Bz = pts[i * 2 + 1];
      // the edge in the box's frame (u across, v along), clipped against the box (Liang-Barsky)
      const ax = (Ax - x) * cs - (Az - z) * sn, az = (Ax - x) * sn + (Az - z) * cs;
      const dx = (Bx - Ax) * cs - (Bz - Az) * sn, dz = (Bx - Ax) * sn + (Bz - Az) * cs;
      let lo = 0, hi = 1;
      if (Math.abs(dx) < 1e-10) { if (Math.abs(ax) >= hx) continue; }
      else { const t0 = (-hx - ax) / dx, t1 = (hx - ax) / dx; lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); }
      if (Math.abs(dz) < 1e-10) { if (Math.abs(az) >= hz) continue; }
      else { const t0 = (-hz - az) / dz, t1 = (hz - az) / dz; lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1)); }
      if (hi - lo > 1e-10) return true;
    }
  }
  return false;
}

/**
 * Box against polygon p: false if apart, else true with contact = { nx, nz, depth } (push the box by n * depth).
 * Candidates: every edge normal (both box faces), the box axes, the corner pairs of consecutive edges, the
 * direction to each vertex; the shortest one that leaves the box clear of the whole outline wins.
 */
function polyBoxContact(col, p, x, z, body, contact) {
  const { hx, hz, cos: cs, sin: sn } = body;
  if (!polyBoxOverlaps(col, p, x, z, hx, hz, cs, sn)) return false;
  const { pts, ringStart, polyRing } = col;
  let best = Infinity, onx = 0, onz = 0;
  const tryDir = (ux, uz, dist) => {
    if (!(dist >= 0) || dist >= best || !Number.isFinite(ux + uz)) return;
    const step = dist + 1e-6;
    if (polyBoxOverlaps(col, p, x + ux * step, z + uz * step, hx, hz, cs, sn)) return;
    best = dist; onx = ux; onz = uz;
  };
  const pushSigned = (ux, uz, s) => { if (s >= -1e-9) tryDir(ux, uz, Math.max(0, s)); if (s <= 1e-9) tryDir(-ux, -uz, Math.max(0, -s)); };
  const tryVec = (dx, dz) => { const L = Math.hypot(dx, dz); if (L > 0) tryDir(dx / L, dz / L, L); };
  // box axes in world space: across = (cos, -sin), along = (sin, cos)  [heading h: forward = (sin h, cos h)]
  const supportOf = (nx, nz) => Math.abs(nx * cs - nz * sn) * hx + Math.abs(nx * sn + nz * cs) * hz;
  for (let r = polyRing[p]; r < polyRing[p + 1]; r++) {
    const s = ringStart[r], e = ringStart[r + 1], n = e - s;
    if (n < 2) continue;
    let pnx = 0, pnz = 0, psup = 0, hasPrev = false;
    {
      const ax = pts[(e - 1) * 2], az = pts[(e - 1) * 2 + 1], bx = pts[s * 2], bz = pts[s * 2 + 1];
      const L = Math.hypot(bx - ax, bz - az);
      if (L > 0) { pnx = -(bz - az) / L; pnz = (bx - ax) / L; psup = supportOf(pnx, pnz); hasPrev = true; }
    }
    for (let i = s, j = e - 1; i < e; j = i++) {
      const Ax = pts[j * 2], Az = pts[j * 2 + 1], Bx = pts[i * 2], Bz = pts[i * 2 + 1];
      const dx = Ax - x, dz = Az - z, ex = Bx - Ax, ez = Bz - Az, L = Math.hypot(ex, ez);
      if (L > 0) {
        const nx = -ez / L, nz = ex / L, d = dx * nx + dz * nz, sup = supportOf(nx, nz);
        pushSigned(nx, nz, d + sup); pushSigned(nx, nz, d - sup);
        if (hasPrev) {
          const det = pnx * nz - pnz * nx;
          if (Math.abs(det) > 1e-6) {
            const d0 = dx * pnx + dz * pnz;
            for (const s0 of [-psup, psup]) for (const s1 of [-sup, sup]) {
              const c0 = d0 + s0, c1 = d + s1;
              tryVec((c0 * nz - c1 * pnz) / det, (pnx * c1 - nx * c0) / det);
            }
          }
        }
        pnx = nx; pnz = nz; psup = sup; hasPrev = true;
      }
      const u = dx * cs - dz * sn, v = dx * sn + dz * cs;
      pushSigned(cs, -sn, u + hx); pushSigned(cs, -sn, u - hx);
      pushSigned(sn, cs, v + hz); pushSigned(sn, cs, v - hz);
      for (const su of [-hx, hx]) for (const sv of [-hz, hz]) { const du = u + su, dv = v + sv; tryVec(du * cs + dv * sn, -du * sn + dv * cs); }
      const D = Math.hypot(dx, dz);
      if (D > 0) { const sup2 = (Math.abs(u) * hx + Math.abs(v) * hz) / D; pushSigned(dx / D, dz / D, D + sup2); pushSigned(dx / D, dz / D, D - sup2); }
    }
  }
  if (!Number.isFinite(best)) {      // fall back to the bounding box's sides
    const q = p * 4, extX = Math.abs(cs) * hx + Math.abs(sn) * hz, extZ = Math.abs(sn) * hx + Math.abs(cs) * hz;
    pushSigned(1, 0, col.pbox[q + 2] + extX - x); pushSigned(1, 0, col.pbox[q] - extX - x);
    pushSigned(0, 1, col.pbox[q + 3] + extZ - z); pushSigned(0, 1, col.pbox[q + 1] - extZ - z);
  }
  if (!Number.isFinite(best)) return false;
  contact.nx = onx; contact.nz = onz; contact.depth = best + 1e-6;
  return true;
}

/** Box against circle c (a trunk, a post). */
function circleBoxContact(col, c, x, z, body, contact) {
  const q = c * 3, cx = col.circ[q], cz = col.circ[q + 1], r = col.circ[q + 2];
  const { hx, hz, cos: cs, sin: sn } = body;
  // circle centre in the box frame
  const dx = cx - x, dz = cz - z, u = dx * cs - dz * sn, v = dx * sn + dz * cs;
  const qu = Math.max(-hx, Math.min(hx, u)), qv = Math.max(-hz, Math.min(hz, v));
  const du = u - qu, dv = v - qv, d = Math.hypot(du, dv);
  if (d >= r) return false;
  let nu, nv, depth;
  if (d > 1e-9) { nu = -du / d; nv = -dv / d; depth = r - d; }          // push the box away from the centre
  else if (hx - Math.abs(u) < hz - Math.abs(v)) { nu = u > 0 ? -1 : 1; nv = 0; depth = hx - Math.abs(u) + r; }
  else { nu = 0; nv = v > 0 ? -1 : 1; depth = hz - Math.abs(v) + r; }
  // back to world: u axis = (cos, -sin), v axis = (sin, cos)
  contact.nx = nu * cs + nv * sn; contact.nz = -nu * sn + nv * cs; contact.depth = depth + 1e-6;
  return true;
}

/** Contact of the car body with item `id` of `col`. body = { hx, hz, cos, sin }. */
export function itemContact(col, id, x, z, body, contact) {
  contact.kind = id < col.P ? col.pkind[id] : col.ckind[id - col.P];
  return id < col.P ? polyBoxContact(col, id, x, z, body, contact) : circleBoxContact(col, id - col.P, x, z, body, contact);
}

/** Is (x, z) inside any building of the gathered list (the chase camera keeps out of walls)? */
export function pointInBuilding(list, x, z) {
  for (let k = 0; k < list.length; k += 2) {
    const col = list[k], id = list[k + 1];
    if (id >= col.P || col.pkind[id] !== KIND.building) continue;
    const q = id * 4;
    if (x < col.pbox[q] || x > col.pbox[q + 2] || z < col.pbox[q + 1] || z > col.pbox[q + 3]) continue;
    if (polyContains(col, id, x, z)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- what is drawn there (also colliderAudit.js)

export const CAR_CLEAR = 2.2;      // m: a solid whose base is this far over the ground everywhere under it is overhead
export const RAISED = 20;          // cm above the carved terrain: a sidewalk / median deck (the road deck is CARVE = 12 cm)
export function inRings(rings, x, z) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[j];
    if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
  }
  return inside;
}
/** Points on a `step` grid inside the rings (at least the vertices' centroid). */
export function samplesIn(rings, step = 1) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of rings[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const s = Math.max(step, Math.sqrt(((x1 - x0) * (z1 - z0)) / 400));      // at most ~400 samples
  const out = [];
  for (let x = x0 + s / 2; x < x1; x += s) for (let z = z0 + s / 2; z < z1; z += s) if (inRings(rings, x, z)) out.push([x, z]);
  if (!out.length) { let cx = 0, cz = 0; for (const [x, z] of rings[0]) { cx += x; cz += z; } out.push([cx / rings[0].length, cz / rings[0].length]); }
  return out;
}

/** The drawn deck height over the carved terrain (cm) at (x, z): the drive ground grid (colliders.js driveGround). */
export function deckAt(hm, delta, x, z) {
  const h = hm.h, c = Math.round((x - h.x0) / h.step), r = Math.round((z - h.z0) / h.step);
  return c >= 0 && r >= 0 && c < h.cols && r < h.rows ? delta[r * h.cols + c] : 0;
}
/** Is the drawn surface inside these rings raised (kerbed)? share of samples >= RAISED cm */
export function raisedShare(hm, delta, rings) {
  const s = samplesIn(rings);
  let n = 0;
  for (const [x, z] of s) if (deckAt(hm, delta, x, z) >= RAISED) n++;
  return n / s.length;
}
/** The clearance under a building solid: its base minus the highest ground under its footprint (vertices + inside). */
export function clearanceUnder(hm, rings, base) {
  let g = -Infinity;
  for (const [x, z] of rings[0]) g = Math.max(g, hm.ground(x, z));
  for (const [x, z] of samplesIn(rings, 2)) g = Math.max(g, hm.ground(x, z));
  return base - g;
}


// ---------------------------------------------------------------- the city: per tile, in the worker

/** Ring list of a footprint polygon, closing duplicate dropped. */
function cleanRing(ring) {
  const out = [];
  for (const p of ring) { const q = out[out.length - 1]; if (!q || Math.abs(q[0] - p[0]) > 1e-3 || Math.abs(q[1] - p[1]) > 1e-3) out.push([p[0], p[1]]); }
  if (out.length > 2) { const a = out[0], b = out[out.length - 1]; if (Math.abs(a[0] - b[0]) < 1e-3 && Math.abs(a[1] - b[1]) < 1e-3) out.pop(); }
  return out;
}

/**
 * The drive data of one tile (tileData.js calls this): colliders + the drivable-surface grid.
 * bDoc: buildings.json; net: the road network (buildRoadNetwork); feats: features.json; hm: the Heightmap AFTER the
 * road carve; parts: the DRAWN road mesh parts { asphalt, concrete, grass, ... } with { position, index } (clipped to
 * the tile); surf: surfaces.json (the measured street) or null.
 * Every collider stands for something drawn (docs/CITY_TREES.md §3, colliderAudit.js checks it):
 *  - buildings: the footprints, except solids whose base is over CAR_CLEAR above the ground everywhere under them
 *    (an upper-floor overhang, a passage, a bridge: nothing at car height);
 *  - islands: the engine's raised islands / medians ONLY where the drawn surface there is raised (with measured
 *    surfaces the engine's islands are mostly not drawn: they were invisible walls), plus the measured medians
 *    (class 6, drawn raised and kerbed);
 *  - trees: features.json trees in the tile (the list the tree fields draw; trees on the carriageway are moved or
 *    dropped in the pipeline, pipeline/filter_road_trees.py);
 *  - lamps and bollards: added on the main thread from the drawn lists (driveMode.js tileDrive).
 * legacy = true: the old sets (every engine island, every footprint) for the audit's "before".
 */
export function buildDriveData({ bDoc, net, feats, hm, parts, bounds, surf = null, legacy = false }) {
  const polys = [], circles = [];
  const ground = driveGround(hm, parts);
  let overhead = 0, islands = 0, islandsHidden = 0, medianIslands = 0;
  for (const bd of bDoc.buildings) {
    const rings = (bd.footprint || []).map(cleanRing).filter((r) => r.length >= 3);
    if (!rings.length) continue;
    const base = bd.base != null ? +bd.base : -1e4;
    if (!legacy && base > -1e3 && clearanceUnder(hm, rings, base) > CAR_CLEAR) { overhead++; continue; }
    polys.push({ rings, kind: KIND.building, top: +bd.top || 1e4, base });
  }
  // raised kerb islands (the road engine builds a 0.5 m collision wall round them: MESH_DEFAULTS.islandWall)
  const inTile = (ring) => ring.some(([x, z]) => x >= bounds.x0 - 5 && x <= bounds.x1 + 5 && z >= bounds.z0 - 5 && z <= bounds.z1 + 5);
  const island = (r) => {
    if (r.length < 3 || !inTile(r)) return;
    if (!legacy && raisedShare(hm, ground.delta, [r]) < 0.5) { islandsHidden++; return; }
    polys.push({ rings: [r], kind: KIND.island }); islands++;
  };
  for (const node of net.nodes || []) for (const isl of node.islands || []) {
    if (isl.kind !== "raised" && isl.kind !== "grass") continue;
    island(cleanRing(isl.poly || []));
  }
  for (const rr of net.roads || []) {
    const ck = rr.stack?.center?.kind;
    if (!rr.center?.poly || (ck !== "raised" && ck !== "barrier")) continue;
    island(cleanRing(rr.center.poly));
  }
  // the measured medians (surfaces.json class 6: drawn raised and kerbed by viewer/surfaces.js)
  const medians = [];
  for (const s of surf?.surfaces || []) if (s.c === 6 && s.rings?.[0]?.length >= 3 && inTile(s.rings[0])) medians.push(s.rings.map(cleanRing).filter((r) => r.length >= 3));
  if (!legacy) for (const m of medians) if (raisedShare(hm, ground.delta, m) >= 0.5) { polys.push({ rings: m, kind: KIND.island }); medianIslands++; }
  // tree trunks: a bit wider for tall trees (the stylized trunks scale with the LiDAR height)
  for (const t of feats.trees || []) {
    if (t.x < bounds.x0 || t.x > bounds.x1 || t.z < bounds.z0 || t.z > bounds.z1) continue;
    circles.push({ x: t.x, z: t.z, r: Math.min(0.5, Math.max(0.22, 0.16 + 0.012 * (t.height || 10))), kind: KIND.tree });
  }
  const col = buildColliders(polys, circles, bounds);
  return { col, medians, ground, legacy, counts: { buildings: bDoc.buildings.length - overhead, overhead, islands, islandsHidden, medianIslands, trees: circles.length } };
}

/**
 * The drivable surface over the carved terrain: for every 1 m grid point under a road / sidewalk / island top
 * triangle, how far (cm, 0..255) that surface is above hm.y. Vertical faces (kerbs) have no area and are skipped.
 */
export function driveGround(hm, parts) {
  const { x0, z0, cols, rows, step } = hm.h, Y = hm.y;
  const top = new Float32Array(cols * rows).fill(-1e9);
  for (const part of Object.values(parts)) {
    if (!part?.index) continue;
    const P = part.position, I = part.index;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2], cx = P[c], cz = P[c + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-6) continue;
      const c0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - x0) / step)), c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx, cx) - x0) / step));
      const r0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - z0) / step)), r1 = Math.min(rows - 1, Math.floor((Math.max(az, bz, cz) - z0) / step));
      for (let r = r0; r <= r1; r++) {
        const pz = z0 + r * step;
        for (let k = c0; k <= c1; k++) {
          const px = x0 + k * step;
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
          const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
          const l3 = 1 - l1 - l2;
          if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
          const y = l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1], q = r * cols + k;
          if (y > top[q]) top[q] = y;
        }
      }
    }
  }
  const delta = new Uint8Array(cols * rows);
  for (let q = 0; q < delta.length; q++) if (top[q] > -1e8) delta[q] = Math.max(0, Math.min(255, Math.round((top[q] - Y[q]) * 100)));
  return { delta };
}

/** Height of the drivable surface at (x, z) (bilinear over the 1 m grid): hm = the tile's Heightmap, delta from driveGround. */
export function driveHeight(hm, delta, x, z) {
  const h = hm.h, Y = hm.y;
  const c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1), r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1);
  const c0 = Math.min(Math.floor(c), h.cols - 2), r0 = Math.min(Math.floor(r), h.rows - 2);
  const fc = c - c0, fr = r - r0, i = r0 * h.cols + c0, j = i + h.cols;
  const v = (k) => Y[k] + delta[k] * 0.01;
  return (v(i) * (1 - fc) + v(i + 1) * fc) * (1 - fr) + (v(j) * (1 - fc) + v(j + 1) * fc) * fr;
}
