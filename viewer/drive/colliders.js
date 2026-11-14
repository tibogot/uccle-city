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
export const KIND = { building: 0, island: 1, tree: 2, lamp: 3, post: 4, wall: 5, car: 6, furniture: 7 };

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

/** A new set with more polygons and circles (the drawn street furniture and parked cars, added on the main thread). */
export function extendColliders(col, polys, circles) {
  const old = [];
  for (let p = 0; p < col.P; p++) {
    const rings = [];
    for (let r = col.polyRing[p]; r < col.polyRing[p + 1]; r++) {
      const ring = [];
      for (let i = col.ringStart[r]; i < col.ringStart[r + 1]; i++) ring.push([col.pts[i * 2], col.pts[i * 2 + 1]]);
      rings.push(ring);
    }
    old.push({ rings, kind: col.pkind[p], top: col.ptop[p], base: col.pbase[p] });
  }
  const oc = [];
  for (let c = 0; c < col.C; c++) oc.push({ x: col.circ[c * 3], z: col.circ[c * 3 + 1], r: col.circ[c * 3 + 2], kind: col.ckind[c] });
  return buildColliders(old.concat(polys), oc.concat(circles), col.bounds);
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

/** CAR_H: the car's height (m) for the vertical test below. */
export const CAR_H = 1.6;
/** Is polygon `id` of `col` clear of a car standing at height y (its wheels)? A wall with a known extent (a rail
 *  platform's top, a fence's, a bridge parapet's top and its slab's underside: `top` / `base` in buildColliders) does not
 *  stop a car on a deck over it, nor one on the street under it. Until 2026-11-13 every collider was an infinitely tall
 *  2D wall: the platforms of Moensberg and Linkebeek stations stopped cars on the road bridges over them (Rue du
 *  Bourdon, Avenue des Hospices: docs/collisions/DRIVE_FIX.md). Items with no extent (1e4 / -1e4) always collide. */
export function heightClear(col, id, y) {
  return id < col.P && col.pkind[id] === KIND.wall && Number.isFinite(y) && (y >= col.ptop[id] - 0.05 || y + CAR_H < col.pbase[id]);
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
export function buildDriveData({ bDoc, bBuf = null, net, feats, hm, parts, bounds, surf = null, legacy = false, walls = [] }) {
  const polys = [], circles = [];
  const ground = driveGround(hm, parts);
  let overhead = 0, islands = 0, islandsHidden = 0, medianIslands = 0, fromWalls = null;
  // the drawn walls at car height (buildingBlocks); the footprints for ?drivecol=legacy and ?colfix=0 (no bBuf)
  if (bBuf && !legacy) {
    fromWalls = buildingBlocks(bDoc, bBuf, (x, z) => driveHeight(hm, ground, x, z), bounds);
    polys.push(...fromWalls.polys);
  }
  if (!fromWalls) for (const bd of bDoc.buildings) {
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
  // other drawn walls at car height the worker knows (the rail platforms' edges: tileData.js)
  // (a wall is a ring, or { ring, top, base }: its vertical extent, heightClear)
  if (!legacy) for (const w of walls) {
    const ring = Array.isArray(w) ? w : w.ring;
    if (ring.length >= 3 && inTile(ring)) polys.push({ rings: [cleanRing(ring)], kind: KIND.wall, top: w.top, base: w.base });
  }
  // tree trunks: a bit wider for tall trees (the stylized trunks scale with the LiDAR height)
  for (const t of feats.trees || []) {
    if (t.x < bounds.x0 || t.x > bounds.x1 || t.z < bounds.z0 || t.z > bounds.z1) continue;
    circles.push({ x: t.x, z: t.z, r: Math.min(0.5, Math.max(0.22, 0.16 + 0.012 * (t.height || 10))), kind: KIND.tree });
  }
  const col = buildColliders(polys, circles, bounds);
  return { col, medians, ground, legacy, counts: { buildings: fromWalls ? fromWalls.polys.length : bDoc.buildings.length - overhead, overhead, buildingRegions: fromWalls?.regions, islands, islandsHidden, medianIslands, trees: circles.length } };
}

/**
 * BUILDING COLLIDERS FROM THE DRAWN WALLS (docs/collisions/README.md): the UrbIS 2D footprint and the 3D solid the city
 * draws differ (arcades and recessed ground floors under an upper storey, porches, bays, the 3D wall 0.3-1 m off the
 * footprint): the footprint blocked where nothing was drawn and let the car into drawn walls. Now: every wall triangle
 * of the drawn solids sampled every 12 cm, kept 0.30-1.30 m over the drive surface under it, on a 0.25 m grid over the
 * tile (+ a margin for the solids across its edge); what the outside cannot reach (a 4-connected flood from the border)
 * is filled; each 8-connected solid region is traced into rings (cell edges, Douglas-Peucker at 15 cm): one polygon per
 * region, its courtyards as holes (even-odd). A passage under a building has no wall at car height: open.
 * bDoc / bBuf: buildings.json + buildings.bin (V, T, positions, indices); height(x, z) = the drive surface.
 */
export function buildingBlocks(bDoc, bBuf, height, bounds, { margin = 30, cell = 0.25, step = 0.12, band = [0.3, 1.3], tol = 0.15 } = {}) {
  const dv = new DataView(bBuf), V = dv.getUint32(0, true), T = dv.getUint32(4, true);
  const P = new Float32Array(bBuf, 8, V * 3), I = new Uint32Array(bBuf, 8 + V * 12, T * 3);
  const x0 = bounds.x0 - margin, z0 = bounds.z0 - margin;
  const nx = Math.ceil((bounds.x1 + margin - x0) / cell), nz = Math.ceil((bounds.z1 + margin - z0) / cell);
  const g = new Uint8Array(nx * nz);
  // the drive surface on a 1 m lattice (the walls' band reference)
  const lx = Math.ceil(nx * cell) + 2, lz = Math.ceil(nz * cell) + 2, L = new Float32Array(lx * lz);
  for (let k = 0; k < lz; k++) for (let i = 0; i < lx; i++) L[k * lx + i] = height(x0 + i, z0 + k);
  // the LOWEST drive surface within 1 m: a wall stops a car from its lower side (a building on a slope, a terrace)
  const Lm = new Float32Array(lx * lz);
  for (let k = 0; k < lz; k++) for (let i = 0; i < lx; i++) {
    let v = Infinity;
    for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) { const ii = i + di, kk = k + dk; if (ii >= 0 && kk >= 0 && ii < lx && kk < lz) v = Math.min(v, L[kk * lx + ii]); }
    Lm[k * lx + i] = v;
  }
  const gAt = (x, z) => Lm[Math.min(lz - 1, Math.max(0, Math.round(z - z0))) * lx + Math.min(lx - 1, Math.max(0, Math.round(x - x0)))];
  let walls = 0;
  for (const b of bDoc.buildings) {
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) {
      const a = I[t * 3] * 3, c = I[t * 3 + 1] * 3, d = I[t * 3 + 2] * 3;
      const ax = P[a], ay = P[a + 1], az = P[a + 2], bx = P[c], by = P[c + 1], bz = P[c + 2], cx = P[d], cy = P[d + 1], cz = P[d + 2];
      if (Math.max(ax, bx, cx) < x0 || Math.min(ax, bx, cx) > x0 + nx * cell || Math.max(az, bz, cz) < z0 || Math.min(az, bz, cz) > z0 + nz * cell) continue;
      const gm = gAt((ax + bx + cx) / 3, (az + bz + cz) / 3);
      if (Math.min(ay, by, cy) > gm + band[1] + 2 || Math.max(ay, by, cy) < gm + band[0] - 2) continue;
      walls++;
      const n1 = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) / step)), n2 = Math.max(1, Math.ceil(Math.hypot(cx - ax, cy - ay, cz - az) / step));
      for (let i = 0; i <= n1; i++) for (let j = 0; j <= n2; j++) {
        let u = i / n1, w = j / n2;
        if (u + w > 1) { if (u + w > 1 + 1 / Math.max(n1, n2)) continue; const s = u + w; u /= s; w /= s; }
        const x = ax + (bx - ax) * u + (cx - ax) * w, y = ay + (by - ay) * u + (cy - ay) * w, z = az + (bz - az) * u + (cz - az) * w;
        const h = y - gAt(x, z);
        if (h < band[0] || h > band[1]) continue;
        const ci = Math.floor((x - x0) / cell), ck = Math.floor((z - z0) / cell);
        if (ci >= 0 && ck >= 0 && ci < nx && ck < nz) g[ck * nx + ci] = 1;
      }
    }
  }
  // fill: the cells the outside cannot reach (4-connected flood from the border over empty cells)
  const out = new Uint8Array(nx * nz), stack = [];
  const push = (q) => { if (!g[q] && !out[q]) { out[q] = 1; stack.push(q); } };
  for (let i = 0; i < nx; i++) { push(i); push((nz - 1) * nx + i); }
  for (let k = 0; k < nz; k++) { push(k * nx); push(k * nx + nx - 1); }
  while (stack.length) {
    const q = stack.pop(), i = q % nx, k = (q - i) / nx;
    if (i > 0) push(q - 1);
    if (i < nx - 1) push(q + 1);
    if (k > 0) push(q - nx);
    if (k < nz - 1) push(q + nx);
  }
  for (let q = 0; q < g.length; q++) if (!out[q]) g[q] = 1;
  // components (8-connected) of solid cells
  const comp = new Int32Array(nx * nz).fill(-1);
  let nc = 0;
  for (let s = 0; s < g.length; s++) {
    if (!g[s] || comp[s] >= 0) continue;
    comp[s] = nc; stack.push(s);
    while (stack.length) {
      const q = stack.pop(), i = q % nx, k = (q - i) / nx;
      for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, kk = k + dk;
        if (ii < 0 || kk < 0 || ii >= nx || kk >= nz) continue;
        const r = kk * nx + ii;
        if (g[r] && comp[r] < 0) { comp[r] = nc; stack.push(r); }
      }
    }
    nc++;
  }
  // boundary edges with the solid on one consistent side (corner lattice (nx+1) x (nz+1)), per region AND per 8 m
  // chunk (a city block traced whole is a 300-corner polygon: the car's contact test is quadratic in the corners),
  // linked into loops
  const CH = Math.max(1, Math.round(8 / cell));
  const label = (i, k) => (Math.floor(k / CH) * 4096 + Math.floor(i / CH)) * 65536 + comp[k * nx + i];
  const solid = (i, k) => i >= 0 && k >= 0 && i < nx && k < nz && g[k * nx + i] === 1;
  const edges = new Map();            // label -> Map(from corner -> [to corners])
  const W = nx + 1;
  const addE = (lab, a, b) => { let m = edges.get(lab); if (!m) edges.set(lab, (m = new Map())); let l = m.get(a); if (!l) m.set(a, (l = [])); l.push(b); };
  for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) {
    if (i < nx) {                         // horizontal edge (i,k)-(i+1,k): cell (i,k-1) above it, (i,k) below
      const up = solid(i, k - 1), dn = solid(i, k), lu = up ? label(i, k - 1) : -1, ld = dn ? label(i, k) : -1;
      if (lu !== ld) { if (dn) addE(ld, k * W + i + 1, k * W + i); if (up) addE(lu, k * W + i, k * W + i + 1); }
    }
    if (k < nz) {                         // vertical edge (i,k)-(i,k+1): cell (i-1,k) left of it, (i,k) right
      const lf = solid(i - 1, k), rt = solid(i, k), ll = lf ? label(i - 1, k) : -1, lr = rt ? label(i, k) : -1;
      if (ll !== lr) { if (rt) addE(lr, k * W + i, (k + 1) * W + i); if (lf) addE(ll, (k + 1) * W + i, k * W + i); }
    }
  }
  const rings = new Map();
  const px = (c) => x0 + (c % W) * cell, pz = (c) => z0 + Math.floor(c / W) * cell;
  for (const [lab, next] of edges) {
    for (const [start, l0] of next) {
      while (l0.length) {
        let a = start, b = l0.pop();
        const pts = [[px(a), pz(a)]];
        let guard = 0;
        while (b !== start && guard++ < 1e6) {
          pts.push([px(b), pz(b)]);
          const l = next.get(b);
          if (!l || !l.length) break;
          // at a saddle (two ways on) take the sharpest turn to the same side every time: keeps diagonal regions apart
          let pick = 0;
          if (l.length > 1) {
            const dxi = px(b) - px(a), dzi = pz(b) - pz(a);
            let best = -Infinity;
            l.forEach((n, j) => { const cr = dxi * (pz(n) - pz(b)) - dzi * (px(n) - px(b)); if (cr > best) { best = cr; pick = j; } });
          }
          a = b; b = l.splice(pick, 1)[0];
        }
        if (pts.length < 4) continue;
        const simp = simplifyRing(pts, tol);
        if (simp.length >= 3) { let r = rings.get(lab); if (!r) rings.set(lab, (r = [])); r.push(simp); }
      }
    }
  }
  const polys = [];
  for (const r of rings.values()) polys.push({ rings: r, kind: KIND.building });
  return { polys, walls, regions: nc };
}

/** Douglas-Peucker on a closed ring (split at the corner farthest from the first point). */
function simplifyRing(pts, tol) {
  const n = pts.length;
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const keep = new Uint8Array(n); keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, n]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, az] = pts[a], [bx, bz] = pts[b % n], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    let m = -1, md = tol * tol;
    for (let i = a + 1; i < b; i++) {
      const [qx, qz] = pts[i % n];
      const t = L2 ? Math.max(0, Math.min(1, ((qx - ax) * dx + (qz - az) * dz) / L2)) : 0;
      const d = (qx - ax - t * dx) ** 2 + (qz - az - t * dz) ** 2;
      if (d > md) { md = d; m = i; }
    }
    if (m >= 0) { keep[m % n] = 1; stack.push([a, m], [m, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * The drivable surface over the carved terrain: for every 1 m grid point under a road / sidewalk / island top
 * triangle, how far (cm) that surface is above hm.y, in TWO layers (Uint16, 65535 = none): `delta` the top surface,
 * `delta2` the highest one more than 1.5 m under it (the street under a road bridge / an overpass deck: until
 * 2026-11-13 one Uint8 layer clamped at 2.55 m sent cars under the Ring's decks 2.55 m into the air and onto the deck
 * from the street below; docs/collisions/README.md). Vertical faces (kerbs) have no area and are skipped.
 */
export function driveGround(hm, parts) {
  const { x0, z0, cols, rows, step } = hm.h, Y = hm.y;
  const top = new Float32Array(cols * rows).fill(-1e9), low = new Float32Array(cols * rows).fill(-1e9);
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
          const y = l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1], q = r * cols + k, tq = top[q];
          if (y > tq + 1.5) { low[q] = tq; top[q] = y; }
          else if (y > tq) top[q] = y;
          else if (y < tq - 1.5 && y > low[q]) low[q] = y;
        }
      }
    }
  }
  // CRACKS: a node no surface triangle covers, with surface on both sides of it (N and S, or E and W) and on at least 6
  // of its 8 neighbours, at one level (spread < 0.5 m), is a seam between two road pieces the 1 m grid fell into, not
  // a hole the car fits in: it takes their mean. Until 2026-11-13 the terrain under it (up to 3.3 m down under a raised
  // road: Rue de la Brasserie, C9; Avenue des Hospices, E10) made a pit in the drive surface the car dropped into and
  // could not climb out of (docs/collisions/DRIVE_FIX.md).
  const fill = [];
  for (let r = 1; r < rows - 1; r++) for (let k = 1; k < cols - 1; k++) {
    const q = r * cols + k;
    if (top[q] > -1e8) continue;
    const has = (o) => top[q + o] > -1e8;
    if (!((has(-1) && has(1)) || (has(-cols) && has(cols)))) continue;
    let n = 0, s = 0, lo = Infinity, hi = -Infinity;
    for (const o of [-cols - 1, -cols, -cols + 1, -1, 1, cols - 1, cols, cols + 1]) if (has(o)) { const y = top[q + o]; n++; s += y; lo = Math.min(lo, y); hi = Math.max(hi, y); }
    if (n >= 6 && hi - lo < 0.5) fill.push(q, s / n);
  }
  for (let i = 0; i < fill.length; i += 2) top[fill[i]] = fill[i + 1];
  const delta = new Uint16Array(cols * rows), delta2 = new Uint16Array(cols * rows).fill(65535);
  for (let q = 0; q < delta.length; q++) {
    if (top[q] > -1e8) delta[q] = Math.max(0, Math.min(65534, Math.round((top[q] - Y[q]) * 100)));
    if (low[q] > -1e8 && top[q] - low[q] > 1.5) delta2[q] = Math.max(0, Math.min(65534, Math.round((low[q] - Y[q]) * 100)));
  }
  return { delta, delta2 };
}

/** The tram platforms viewer/tram.js draws (OSM `platform` lines tagged tram=yes or railway=platform): a slab W wide,
 *  H over the road top (hm.surface + CARVE), per 2 m segment of the line. Shared here (pure data) so the tile worker can
 *  put them in the drive surface. */
export const TRAM_PLATFORM = { W: 2.6, H: 0.25, step: 2 };
// (road fix round 2: tram=yes only. OSM's railway=platform without it are the railway stations' platforms, which
// viewer/rail/ draws and collides from rail.json: Moensberg, Calevoet, Saint-Job, Uccle-Stalle, Linkebeek, Vivier d'Oie;
// tram.js laid a 25 cm slab band round their outlines too, 1.3 m out onto the track bed)
export const isTramPlatform = (l) => l.kind === "platform" && l.tags?.tram === "yes" && l.line?.length >= 2;
/** A platform mapped as an AREA (a closed way: 53 of Uccle's 100 OSM tram platforms, e.g. Churchill, G2) is its polygon;
 *  until road fix round 2 every platform was a W-wide band along its way, so an area's outline became a hollow ring band
 *  reaching W / 2 past the platform's edge into the lane (the car rode up its kerb or stopped at it, G2). -> the ring
 *  without its closing point, or null for a line platform. */
export function platformRing(l) {
  const L = l.line, a = L[0], b = L[L.length - 1];
  if (L.length < 4 || Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.01) return null;
  return L.slice(0, -1);
}
export const inRing2 = (ring, x, z) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
export function densifyLine(line, step) {
  const out = [];
  for (let k = 1; k < line.length; k++) {
    const [ax, az] = line[k - 1], [bx, bz] = line[k];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let s = k === 1 ? 0 : 1; s <= n; s++) out.push([ax + (bx - ax) * s / n, az + (bz - az) * s / n]);
  }
  return out;
}

/**
 * TRAM PLATFORMS IN THE DRIVE SURFACE (docs/collisions/DRIVE_FIX.md): the platforms are drawn 25 cm over the road
 * (several OSM platforms lie over the outer half of a lane: Lancaster on Avenue Carsoel, H5), but the drive grid did
 * not know them: the car sank 0.3-0.45 m into the slab. Now the platform's top is in the grid like a sidewalk's: the
 * car rides up its 25 cm kerb (MAX_STEP 0.5) as it rides up any kerb. Never lowers the grid. carve = CARVE.
 */
export function tramPlatformSurface(feats, hm, ground, bounds, carve) {
  const { x0, z0, cols, rows, step } = hm.h, Y = hm.y, D = ground.delta, { W, H } = TRAM_PLATFORM, hw = W / 2;
  let raised = 0;
  for (const l of feats.lines || []) {
    if (!isTramPlatform(l)) continue;
    const ring = platformRing(l);
    if (ring) {                                                         // an area platform: its polygon
      let bx0 = Infinity, bz0 = Infinity, bx1 = -Infinity, bz1 = -Infinity;
      for (const [x, z] of ring) { bx0 = Math.min(bx0, x); bz0 = Math.min(bz0, z); bx1 = Math.max(bx1, x); bz1 = Math.max(bz1, z); }
      if (bx1 < bounds.x0 - 3 || bx0 > bounds.x1 + 3 || bz1 < bounds.z0 - 3 || bz0 > bounds.z1 + 3) continue;
      const c0 = Math.max(0, Math.ceil((bx0 - x0) / step)), c1 = Math.min(cols - 1, Math.floor((bx1 - x0) / step));
      const r0 = Math.max(0, Math.ceil((bz0 - z0) / step)), r1 = Math.min(rows - 1, Math.floor((bz1 - z0) / step));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        if (!inRing2(ring, px, pz)) continue;
        const k = r * cols + c, cm = Math.round((hm.surface(px, pz) + carve + H - Y[k]) * 100);
        if (cm <= D[k] || cm > 400) continue;
        D[k] = cm; raised++;
      }
      continue;
    }
    const d = densifyLine(l.line, TRAM_PLATFORM.step);
    for (let i = 1; i < d.length; i++) {
      const [ax, az] = d[i - 1], [bx, bz] = d[i];
      if (Math.max(ax, bx) < bounds.x0 - 3 || Math.min(ax, bx) > bounds.x1 + 3 || Math.max(az, bz) < bounds.z0 - 3 || Math.min(az, bz) > bounds.z1 + 3) continue;
      const ya = hm.surface(ax, az) + carve + H, yb = hm.surface(bx, bz) + carve + H;
      const c0 = Math.max(0, Math.ceil((Math.min(ax, bx) - hw - x0) / step)), c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx) + hw - x0) / step));
      const r0 = Math.max(0, Math.ceil((Math.min(az, bz) - hw - z0) / step)), r1 = Math.min(rows - 1, Math.floor((Math.max(az, bz) + hw - z0) / step));
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        const u = ((px - ax) * dx + (pz - az) * dz) / L2;
        if (u < 0 || u > 1) continue;                                   // the drawn slab is one rectangle per segment
        if (Math.abs((px - ax) * dz - (pz - az) * dx) / Math.sqrt(L2) > hw) continue;
        const k = r * cols + c, cm = Math.round((ya + (yb - ya) * u - Y[k]) * 100);
        if (cm <= D[k] || cm > 400) continue;
        D[k] = cm; raised++;
      }
    }
  }
  return raised;
}

/** Height of the drivable surface at (x, z) (bilinear over the 1 m grid): hm = the tile's Heightmap, delta from
 *  driveGround (or the { delta, delta2 } object). near = the car's height: where the grid has two layers (a street under
 *  a deck) each corner takes the layer nearer to it. */
export function driveHeight(hm, delta, x, z, near = null) {
  const d2 = delta?.delta2, d1 = delta?.delta ?? delta;
  const h = hm.h, Y = hm.y;
  const c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1), r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1);
  const c0 = Math.min(Math.floor(c), h.cols - 2), r0 = Math.min(Math.floor(r), h.rows - 2);
  const fc = c - c0, fr = r - r0, i = r0 * h.cols + c0, j = i + h.cols;
  const v = (k) => {
    const a = Y[k] + d1[k] * 0.01;
    if (!d2 || near == null || d2[k] === 65535) return a;
    const b = Y[k] + d2[k] * 0.01;
    return Math.abs(b - near) < Math.abs(a - near) ? b : a;
  };
  return (v(i) * (1 - fc) + v(i + 1) * fc) * (1 - fr) + (v(j) * (1 - fc) + v(j + 1) * fc) * fr;
}
