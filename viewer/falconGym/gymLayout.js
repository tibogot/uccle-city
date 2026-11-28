// THE FALCON GYM'S PLAYGROUND (labs/falcon-gym.html, docs/FALCON_GYM.md): a greybox of boxes and tree crowns, pure JS
// (no three: node tests it, tools/falconGymTest.mjs). Everything the two flight controllers ask of a world:
//   floor(x, z)            the highest solid top (ground, roofs) - the current controller, the pigeons, the air
//   ground(x, z) / roof    the terrain / the highest roof
//   column(x, z, y)        { floor, ceil } at a height: the covered passage has a ceiling (flightModel.js uses it)
//   sphereHit(p, r, out)   the deepest contact of a sphere with the boxes (+ the soft tree crowns): the gym controller
//   ray(o, d, maxD)        the first box along a ray (the wall look-ahead)
//   clearUp(x, y, z, r, h) is there room for the wings above (a vertical take-off)
//   ledges                 points on box tops near an edge with a free drop in front (perches, hop targets)
//   roosts, liftGrid, thermalSources: the pigeons' roosts and the air field's inputs (viewer/falconFlight/air.js)
// Layout (x east, z south, y up, the ground at Y0 = 70 m TAW so the city's haze sits as at Place de Saint-Job):
//   the open field (start, thermals, pigeons feeding) round the origin
//   block A (14 m, window sills on 3 floors) | the 4 m ALLEY | block B (22 m, roof parapet = a railing to perch on)
//   block C (10 m) with a covered PASSAGE through it (3.2 m high, 4 m wide): no room above for the wings
//   the courtyard D: four 16 m wings round a 10 x 10 m yard (open to the sky)
//   the TOWER: 8 x 8 m to 62 m (a balcony ledge round its top), a spire to 86 m
//   low walls, a bench row, six trees (trunk + crown)
export const Y0 = 70;

const B = [];          // boxes { x0, y0, z0, x1, y1, z1, kind }
const box = (x0, y0, z0, x1, y1, z1, kind = "block") => { const b = { x0, y0: Y0 + y0, z0, x1, y1: Y0 + y1, z1, kind }; B.push(b); return b; };

// block A, the alley, block B
box(30, 0, -24, 60, 14, 6, "blockA");
for (const y of [4, 7.5, 11]) for (let z = -20; z <= 2; z += 5.5) box(60, y, z, 60.35, y + 0.18, z + 1.4, "sill");   // sills into the alley
for (const y of [4, 7.5, 11]) for (let z = -20; z <= 2; z += 5.5) box(29.65, y, z, 30, y + 0.18, z + 1.4, "sill");   // and on the field side
box(64, 0, -24, 92, 22, 6, "blockB");
box(64, 22, -24, 92, 23, -23.8, "parapet"); box(64, 22, 5.8, 92, 23, 6, "parapet");
box(64, 22, -24, 64.2, 23, 6, "parapet"); box(91.8, 22, -24, 92, 23, 6, "parapet");
// block C with the covered passage (x -10..-6 open below 3.2 m)
box(-34, 0, 30, -10, 10, 46, "blockC"); box(-6, 0, 30, 18, 10, 46, "blockC");
box(-10, 3.2, 30, -6, 10, 46, "passageRoof");
// the courtyard D (wings 6 m deep, the yard x -64..-54, z -64..-54)
box(-70, 0, -70, -48, 16, -64, "courtyard"); box(-70, 0, -54, -48, 16, -48, "courtyard");
box(-70, 0, -64, -64, 16, -54, "courtyard"); box(-54, 0, -64, -48, 16, -54, "courtyard");
// the tower and the spire (a stack of tapering boxes)
box(-6, 0, -86, 2, 62, -78, "tower");
box(-7, 60.6, -87, 3, 61, -77, "balcony");                                         // a 1 m ledge round the top
box(-4.5, 62, -84.5, 0.5, 70, -79.5, "spire"); box(-3.5, 70, -83.5, -0.5, 78, -80.5, "spire");
box(-2.6, 78, -82.6, -1.4, 85, -81.4, "spire"); box(-2.15, 85, -82.15, -1.85, 86, -81.85, "spire");
// low walls and benches on the field
box(-28, 0, 8, -12, 1.2, 8.4, "wall"); box(10, 0, -40, 10.4, 1.0, -28, "wall");
for (let i = 0; i < 4; i++) box(-20 + i * 6, 0, -14, -18.2 + i * 6, 0.45, -13.4, "bench");

/** tree crowns: soft spheres (brushing through slows, no stun) on a solid trunk box */
const TREES = [];
for (const [x, z, h, r] of [[-30, -20, 11, 4.2], [-38, -6, 13, 5.0], [16, 22, 9, 3.6], [24, 30, 12, 4.6], [-18, -40, 10, 4.0], [40, 30, 14, 5.2]]) {
  box(x - 0.25, 0, z - 0.25, x + 0.25, h - r * 0.6, z + 0.25, "trunk");
  TREES.push({ x, y: Y0 + h - r * 0.9, z, r });
}
export const BOXES = B, TREE_CROWNS = TREES;
export const FIELD = { x: 0, z: 0 };
export const SIZE = 700;            // the ground plane (m); the haze hides its edge

// ------------------------------------------------------------------------------------------------ queries
const inXZ = (b, x, z, e = 0) => x >= b.x0 - e && x <= b.x1 + e && z >= b.z0 - e && z <= b.z1 + e;
export function ground() { return Y0; }
export function roof(x, z) { let h = 0; for (const b of B) if (inXZ(b, x, z) && b.y1 > h) h = b.y1; return h; }
export function floor(x, z) { let h = Y0; for (const b of B) if (inXZ(b, x, z) && b.y1 > h) h = b.y1; return h; }
/** the floor under height y (a solid whose top is within 0.5 m above y counts: standing on it) and the ceiling over it */
export function column(x, z, y, out = { floor: 0, ceil: 0 }) {
  let f = Y0, c = Infinity;
  for (const b of B) {
    if (!inXZ(b, x, z)) continue;
    if (b.y1 <= y + 0.5) { if (b.y1 > f) f = b.y1; } else if (b.y0 > y) { if (b.y0 < c) c = b.y0; } else if (b.y1 > f) f = b.y1;   // inside: its top
  }
  out.floor = f; out.ceil = c; return out;
}

/**
 * The deepest contact of a sphere (centre p, radius r) with the boxes and the ground: out = { hit, nx, ny, nz, depth,
 * kind, soft } (soft: a tree crown, brushed through). Boxes only within the sphere's reach are tested (the gym has ~70).
 */
export function sphereHit(px, py, pz, r, out = {}) {
  out.hit = false; out.depth = 0; out.soft = 0;
  if (py - r < Y0) { out.hit = true; out.nx = 0; out.ny = 1; out.nz = 0; out.depth = Y0 - (py - r); out.kind = "ground"; }
  for (const b of B) {
    if (px < b.x0 - r || px > b.x1 + r || pz < b.z0 - r || pz > b.z1 + r || py < b.y0 - r || py > b.y1 + r) continue;
    const cx = Math.max(b.x0, Math.min(px, b.x1)), cy = Math.max(b.y0, Math.min(py, b.y1)), cz = Math.max(b.z0, Math.min(pz, b.z1));
    let dx = px - cx, dy = py - cy, dz = pz - cz, d = Math.hypot(dx, dy, dz), depth;
    if (d > 1e-6) { if (d >= r) continue; depth = r - d; dx /= d; dy /= d; dz /= d; }
    else {
      // the centre inside the box: out along the axis of least penetration
      const c = [[px - b.x0, -1, 0, 0], [b.x1 - px, 1, 0, 0], [py - b.y0, 0, -1, 0], [b.y1 - py, 0, 1, 0], [pz - b.z0, 0, 0, -1], [b.z1 - pz, 0, 0, 1]];
      let m = c[0]; for (const k of c) if (k[0] < m[0]) m = k;
      depth = m[0] + r; dx = m[1]; dy = m[2]; dz = m[3];
    }
    if (depth > out.depth) { out.hit = true; out.depth = depth; out.nx = dx; out.ny = dy; out.nz = dz; out.kind = b.kind; }
  }
  for (const t of TREES) {
    const d = Math.hypot(px - t.x, py - t.y, pz - t.z);
    if (d < t.r + r) out.soft = Math.max(out.soft, 1 - d / (t.r + r));
  }
  return out;
}

/** the first box along the ray o + d s (d unit), s <= maxD; Infinity when free. out.n = the face normal [x, y, z] */
export function ray(ox, oy, oz, dx, dy, dz, maxD, out = null) {
  let best = maxD, n = null;
  if (dy < 0) { const s = (Y0 - oy) / dy; if (s >= 0 && s < best) { best = s; n = [0, 1, 0]; } }
  const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
  for (const b of B) {
    let t0 = (b.x0 - ox) * ix, t1 = (b.x1 - ox) * ix; if (t0 > t1) [t0, t1] = [t1, t0];
    let u0 = (b.y0 - oy) * iy, u1 = (b.y1 - oy) * iy; if (u0 > u1) [u0, u1] = [u1, u0];
    let w0 = (b.z0 - oz) * iz, w1 = (b.z1 - oz) * iz; if (w0 > w1) [w0, w1] = [w1, w0];
    const tn = Math.max(t0, u0, w0), tf = Math.min(t1, u1, w1);
    if (tn > tf || tf < 0 || tn >= best) continue;
    if (tn < 0) continue;                                     // starting inside: ignored (sphereHit handles it)
    best = tn;
    n = tn === t0 ? [dx > 0 ? -1 : 1, 0, 0] : tn === u0 ? [0, dy > 0 ? -1 : 1, 0] : [0, 0, dz > 0 ? -1 : 1];
  }
  if (out) out.n = n;
  return best < maxD ? best : Infinity;
}

/** room for the wings above (x, y, z): a column of radius r free for h metres (five vertical rays) */
export function clearUp(x, y, z, r = 0.7, h = 8) {
  for (const [a, b] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (ray(x + a, y, z + b, 0, 1, 0, h) < h) return false;
  // and nothing beside the wings (the span is ~1 m at life size): the four sides at shoulder height
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (ray(x, y + 0.4, z, a, 0, b, r) < r) return false;
  return true;
}

// ------------------------------------------------------------------------------------------------ ledges, roosts
/** points along every box top's edges (every ~1.5 m, 0.25 m in from the edge) facing out, with the drop below the edge */
function buildLedges() {
  const out = [];
  for (const b of B) {
    if (b.kind === "trunk" || b.kind === "bench") continue;
    const top = b.y1, edges = [
      [b.x0, b.z0, b.x1, b.z0, 0, -1], [b.x1, b.z1, b.x0, b.z1, 0, 1],
      [b.x1, b.z0, b.x1, b.z1, 1, 0], [b.x0, b.z1, b.x0, b.z0, -1, 0],
    ];
    for (const [ax, az, cx, cz, nx, nz] of edges) {
      const L = Math.hypot(cx - ax, cz - az); if (L < 0.3) continue;
      const n = Math.max(1, Math.round(L / 1.5));
      for (let k = 0; k < n; k++) {
        const s = (k + 0.5) / n;
        const inset = Math.min(0.25, (Math.min(b.x1 - b.x0, b.z1 - b.z0)) / 2);
        const x = ax + (cx - ax) * s - nx * inset, z = az + (cz - az) * s - nz * inset;
        if (floor(x, z) > top + 0.05) continue;                   // covered by a higher solid
        const ox = x + nx * (inset + 0.6), oz = z + nz * (inset + 0.6), drop = top - floor(ox, oz);
        if (drop < 1.5) continue;                                  // not a ledge: the next roof goes on
        if (!clearUp(x, top + 0.3, z, 0.3, 3)) continue;
        out.push({ x, y: top, z, yaw: Math.atan2(-nx, -nz), drop, kind: b.kind });
      }
    }
  }
  return out;
}
export const LEDGES = buildLedges();

export function roosts() {
  const out = [];
  for (const l of LEDGES) if (l.kind !== "spire" && l.y < Y0 + 30) out.push({ x: l.x, y: l.y + 0.02, z: l.z, yaw: l.yaw + Math.PI / 2, kind: "ridge" });
  for (let i = 0; i < 50; i++) {
    const a = i * 2.399963, r = 4 + Math.sqrt(i / 50) * 16;
    out.push({ x: FIELD.x + Math.cos(a) * r, y: Y0 + 0.02, z: FIELD.z + Math.sin(a) * r, yaw: a * 3.1, kind: "ground" });
  }
  return out;
}

/** the air field's obstacle grid (air.js ridge lift): floor on a 4 m grid, box-blurred (as cityWorld.js liftGrid) */
export function liftGrid(step = 4, half = 200, rad = 3) {
  const n = Math.round(2 * half / step) + 1, x0 = -half, z0 = -half;
  let a = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) a[j * n + i] = floor(x0 + i * step, z0 + j * step);
  const blur = (src, h) => { const o = new Float32Array(src.length); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -rad; k <= rad; k++) { const ii = h ? i + k : i, jj = h ? j : j + k; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue; s += src[jj * n + ii]; c++; } o[j * n + i] = s / c; } return o; };
  for (let p = 0; p < 2; p++) a = blur(blur(a, true), false);
  return { data: a, nx: n, nz: n, x0, z0, step };
}
/** two thermal sources: the open field (strong) and the courtyard's sunny yard (weaker) */
export function thermalSources() {
  return [{ x: FIELD.x + 6, z: FIELD.z - 4, heat: 1.0, radius: 26, name: "the field", ground: Y0 }, { x: -59, z: -59, heat: 0.6, radius: 14, name: "the courtyard", ground: Y0 }];
}

/** the world object both controllers, the pigeons and the air get */
export function makeGymWorld() {
  return {
    PLACE: FIELD, Y0, boxes: B, trees: TREES, ledges: LEDGES,
    ground, roof, floor, column, sphereHit, ray, clearUp,
    roosts: roosts(), liftGrid: liftGrid(), thermalSources: thermalSources(),
    bounds: { x0: -SIZE / 2, x1: SIZE / 2, z0: -SIZE / 2, z1: SIZE / 2 },
    update() {},
  };
}
