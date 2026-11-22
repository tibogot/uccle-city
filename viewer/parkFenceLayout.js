// PARK FENCES, PLACED ON THE DRAWN GROUND (claude/parkfence; docs/PARKFENCE.md, rule park-fence). Pure JS (no three):
// shared by the city (viewer/parkFence.js) and the gate (tools/audit/parkFenceCheck.mjs).
//
// data/parkfence/parkfence.json (tools/parkfence/build.mjs) holds the PLAN of each park's line: panels (a -> b), posts,
// piers, plinths, gate leaves, per tile. Here a tile's share becomes instance matrices on the ground the city draws
// there (main.js gardenGround: the carved terrain, raised to the drive surface where a sidewalk / drive is drawn):
//   - a PANEL follows the slope: its matrix is SHEARED (x along a -> b including the rise, y straight up): the bars stay
//     vertical, the rails and the plinth's coping run with the ground. A panel whose ground bulges or dips more than
//     FIT_TOL off its chord is split in two (to MAX_SPLIT levels): every panel's foot stays within the contact
//     tolerances (CONTACT: floating <= 0.15 m, buried <= 0.10 m; the posts and plinths go 0.4 / 0.6 m into the ground,
//     the skirt, so they never float);
//   - a PIER stands on the lowest ground under its footprint (its base 0.5 m deep: the skirt on the high side);
//   - a LEAF hangs from its hinge, open (swung into the park) or closed as observed.
// The colliders are boxes from the same placement (one source: the drawn line and the colliders cannot differ).
export const MODULE = 2.5;
export const NOMINAL = { pf_rail: [2.5, 1.8], pf_bars: [2.5, 1.6], pf_mesh: [2.5, 1.8], pf_post: [0.06, 1.86], pf_gate2: [2.0, 2.4], pf_gate1: [1.1, 1.8], pf_pier: [0.7, 3.0], pf_plinth: [2.5, 0.8] };
export const IRON = ["pf_rail", "pf_bars", "pf_mesh", "pf_post", "pf_gate2", "pf_gate1"];
export const STONE = ["pf_pier", "pf_plinth"];
export const PIECES = [...IRON, ...STONE];
export const FIT_TOL = 0.1, MAX_SPLIT = 2, MIN_SPLIT = 2.4;
/** the ground the line is fitted to: the drawn ground averaged over a 0.35 m cross (a line on a bank's edge or a
 *  sidewalk's back edge reads the two sides in turn: fitted to every sample, a plinth zig-zagged 0.5 m by 0.5 m) */
export const smoothGround = (g) => (x, z) => (g(x, z) * 2 + g(x + 0.35, z) + g(x - 0.35, z) + g(x, z + 0.35) + g(x, z - 0.35)) / 6;
/** contact tolerances (m) of a panel's foot line against the drawn ground (the gate's contact row) */
export const CONTACT = { float: 0.15, bury: 0.10 };
const FOOT = 0.02;               // the foot line this far under the ground at the ends (no hairline gap on a dip)

const hash = (x, z) => { let h = Math.imul(Math.round(x * 100) | 0, 73856093) ^ Math.imul(Math.round(z * 100) | 0, 19349663); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** a column-major 4x4: x axis (with the shear), y axis, z axis, translation */
function mat(X, Yv, Zc, T) { return [X[0], X[1], X[2], 0, Yv[0], Yv[1], Yv[2], 0, Zc[0], Zc[1], Zc[2], 0, T[0], T[1], T[2], 1]; }

/** the foot line of a panel a -> b on ground g: split while the ground leaves the chord by > FIT_TOL */
export function fitPanel(a, b, g, depth = 0) {
  const ya = g(a[0], a[1]) - FOOT, yb = g(b[0], b[1]) - FOOT;
  let dev = 0;
  for (const f of [0.2, 0.4, 0.5, 0.6, 0.8]) {
    const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
    dev = Math.max(dev, Math.abs(g(x, z) - FOOT - (ya + (yb - ya) * f)));
  }
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (dev > FIT_TOL && depth < MAX_SPLIT && L >= MIN_SPLIT) {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return [...fitPanel(a, m, g, depth + 1), ...fitPanel(m, b, g, depth + 1)];
  }
  return [{ a: [a[0], ya, a[1]], b: [b[0], yb, b[1]] }];
}

/** a BARE panel (mesh / bars: its own post at its start hides a step at the joint): its foot line fitted to the drawn
 *  ground under it (least squares over 0.25 m samples, then shifted into the contact window: buried <= CONTACT.bury,
 *  floating <= CONTACT.float), split in two while the ground under it spans more than the window (to ~0.3 m) */
export function fitBare(a, b, g, depth = 0) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.25));
  const F = [], Y = [];
  for (let k = 0; k <= n; k++) { const f = k / n; F.push(f); Y.push(g(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)); }
  const m = F.length, sf = F.reduce((s, v) => s + v, 0), sy = Y.reduce((s, v) => s + v, 0), sff = F.reduce((s, v) => s + v * v, 0), sfy = F.reduce((s, v, i) => s + v * Y[i], 0);
  const c1 = (m * sfy - sf * sy) / (m * sff - sf * sf || 1e-9), c0 = (sy - c1 * sf) / m;
  let rMax = -Infinity, rMin = Infinity;
  for (let k = 0; k < m; k++) { const r = Y[k] - (c0 + c1 * F[k]); rMax = Math.max(rMax, r); rMin = Math.min(rMin, r); }
  if (rMax - rMin > CONTACT.bury + CONTACT.float - 0.02 && depth < MAX_SPLIT + 1 && L >= 0.6) {
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return [...fitBare(a, mid, g, depth + 1), ...fitBare(mid, b, g, depth + 1)];
  }
  const s = Math.min(Math.max((rMax + rMin) / 2 + 0.02, rMax - CONTACT.bury + 0.005), rMin + CONTACT.float - 0.005);
  return [{ a: [a[0], c0 + s, a[1]], b: [b[0], c0 + c1 + s, b[1]] }];
}

/** the foot-line contact of a fitted panel: max gap (line over the ground) and max burial (ground over the line) */
export function panelContact(p, g, step = 0.25) {
  const L = Math.hypot(p.b[0] - p.a[0], p.b[2] - p.a[2]), n = Math.max(2, Math.ceil(L / step));
  let float = 0, bury = 0;
  for (let k = 0; k <= n; k++) {
    const f = k / n, x = p.a[0] + (p.b[0] - p.a[0]) * f, z = p.a[2] + (p.b[2] - p.a[2]) * f, y = p.a[1] + (p.b[1] - p.a[1]) * f, gy = g(x, z);
    float = Math.max(float, y - gy); bury = Math.max(bury, gy - y);
  }
  return { float, bury };
}

/**
 * A park's items in tile T on ground g(x, z) -> {
 *   inst: { <piece>: [{ m: number[16], v: [paint, stone, rnd, 0], c: [x, y, z], r }] },
 *   boxes: [{ a: [x, y, z], b: [x, y, z], t (thickness), h (height over the foot line at each end: [ha, hb]) }]  (colliders),
 *   fitted: [{ a, b, kind, h }]  (the panels' and plinths' foot lines, the contact check), counts }
 */
export function tileItems(park, T, g) {
  const inst = Object.fromEntries(PIECES.map((p) => [p, []]));
  const boxes = [], fitted = [];
  const push = (piece, m, v, c, r) => inst[piece].push({ m, v, c, r });
  // ---- panels + plinths (the plinth under a grand panel: the same split, so the rail sits on its coping)
  const plinthOf = new Map((park.plinths || []).map((q) => [`${q.a}|${q.b}`, q]));
  const runs = [];
  for (const p of park.panels || []) if (p.t === T) runs.push({ p, plinth: plinthOf.get(`${p.a}|${p.b}`) || null });
  for (const q of park.plinths || []) if (q.t === T && !(park.panels || []).some((p) => `${p.a}|${p.b}` === `${q.a}|${q.b}`)) runs.push({ p: null, plinth: q });   // a wall run: plinths alone
  const gs = smoothGround(g);
  for (const { p, plinth } of runs) {
    const a = (p || plinth).a, b = (p || plinth).b;
    // (a plinth run is not split, fitted to the smoothed ground end to end: its skirt and its 0.8 m body take the
    // ground's bumps; a bare panel is fitted to the ground under it, fitBare)
    for (const f of plinth ? fitPanel(a, b, gs, MAX_SPLIT) : fitBare(a, b, g)) {
      const dx = f.b[0] - f.a[0], dy = f.b[1] - f.a[1], dz = f.b[2] - f.a[2], L = Math.hypot(dx, dz);
      const Zc = [-dz / L, 0, dx / L];
      const c = [(f.a[0] + f.b[0]) / 2, (f.a[1] + f.b[1]) / 2, (f.a[2] + f.b[2]) / 2];
      const rnd = hash(c[0], c[2]);
      let top = 0;
      if (plinth) {
        const hs = plinth.h / NOMINAL.pf_plinth[1];
        push("pf_plinth", mat([dx / MODULE, dy / MODULE, dz / MODULE], [0, hs, 0], Zc, f.a), [0, plinth.stone ?? 0, rnd, 0], c, L / 2 + 0.5);
        top = plinth.h;
        fitted.push({ a: f.a, b: f.b, kind: "plinth", h: plinth.h });
      }
      if (p) {
        const piece = p.type === "grand" ? "pf_rail" : p.type === "bars" ? "pf_bars" : "pf_mesh";
        const hs = p.h / NOMINAL[piece][1];
        push(piece, mat([dx / MODULE, dy / MODULE, dz / MODULE], [0, hs, 0], Zc, [f.a[0], f.a[1] + top, f.a[2]]), [p.paint ?? 0, 0, rnd, 0], [c[0], c[1] + top + p.h / 2, c[2]], L / 2 + 1.2);
        if (!plinth) fitted.push({ a: f.a, b: f.b, kind: piece, h: p.h });
        top += p.h;
      }
      boxes.push({ a: f.a, b: f.b, t: plinth ? 0.4 : 0.08, h: top + (plinth ? 0 : 0.02) });
    }
  }
  // ---- posts (a run's free end)
  for (const q of park.posts || []) {
    if (q.t !== T) continue;
    const y = g(q.at[0], q.at[1]), u = [q.dir[1], -q.dir[0]];         // (dir = the panel's normal: the post's x along the run)
    push("pf_post", mat([u[0], 0, u[1]], [0, q.h / 1.8, 0], [-u[1], 0, u[0]], [q.at[0], y, q.at[1]]), [q.paint ?? 0, 0, hash(...q.at), 0], [q.at[0], y + 1, q.at[1]], 1.2);
    boxes.push({ a: [q.at[0] - u[0] * 0.04, y, q.at[1] - u[1] * 0.04], b: [q.at[0] + u[0] * 0.04, y, q.at[1] + u[1] * 0.04], t: 0.08, h: q.h });
  }
  // ---- piers: on the lowest ground under the footprint
  for (const q of park.piers || []) {
    if (q.t !== T) continue;
    const [ux, uz] = q.dir, hw = q.w / 2;
    let y = Infinity;
    let hi = -Infinity;
    for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const gy = g(q.at[0] + (ux * s - uz * t) * hw, q.at[1] + (uz * s + ux * t) * hw); y = Math.min(y, gy); hi = Math.max(hi, gy); }
    y = Math.max(y, hi - 0.4);          // (on a steep slope: the base block <= 0.4 m into the high side, the footing skirt on the low)
    const sw = q.w / NOMINAL.pf_pier[0], sh = q.h / NOMINAL.pf_pier[1];
    push("pf_pier", mat([ux * sw, 0, uz * sw], [0, sh, 0], [-uz * sw, 0, ux * sw], [q.at[0], y, q.at[1]]), [0, q.stone ?? 0, hash(...q.at), 0], [q.at[0], y + q.h / 2, q.at[1]], q.h / 2 + q.w);
    boxes.push({ a: [q.at[0] - ux * hw, y, q.at[1] - uz * hw], b: [q.at[0] + ux * hw, y, q.at[1] + uz * hw], t: q.w, h: q.h });
  }
  // ---- gate leaves: from the hinge along dir (closed), swung `open` rad into the park (toward `in`)
  for (const q of park.leaves || []) {
    if (q.t !== T) continue;
    let [dx, dz] = q.dir;
    if (q.open) {
      const rot = (a) => [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)];
      const r1 = rot(q.open), r2 = rot(-q.open);
      [dx, dz] = r1[0] * q.in[0] + r1[1] * q.in[1] >= r2[0] * q.in[0] + r2[1] * q.in[1] ? r1 : r2;
    }
    const tip = [q.hinge[0] + dx * q.w, q.hinge[1] + dz * q.w];
    const y = Math.max(g(q.hinge[0], q.hinge[1]), g((q.hinge[0] + tip[0]) / 2, (q.hinge[1] + tip[1]) / 2), g(tip[0], tip[1])) - 0.03;
    const nom = NOMINAL[q.piece], sw = q.w / nom[0], sh = q.h / nom[1];
    push(q.piece, mat([dx * sw, 0, dz * sw], [0, sh, 0], [-dz, 0, dx], [q.hinge[0], y, q.hinge[1]]), [q.paint ?? 0, 0, hash(...q.hinge), 0], [(q.hinge[0] + tip[0]) / 2, y + q.h / 2, (q.hinge[1] + tip[1]) / 2], q.w / 2 + q.h / 2);
    boxes.push({ a: [q.hinge[0], y, q.hinge[1]], b: [tip[0], y, tip[1]], t: 0.06, h: q.h, leaf: true });
  }
  const counts = Object.fromEntries(Object.entries(inst).map(([k, v]) => [k, v.length]));
  return { inst, boxes, fitted, counts };
}

/** the colliders' triangle soup (9 floats a triangle): every box as 5 faces (no bottom), its foot 0.1 m in the ground */
export function boxSoup(boxes) {
  const out = [];
  const tri = (p, q, r) => out.push(...p, ...q, ...r);
  for (const bx of boxes) {
    const dx = bx.b[0] - bx.a[0], dz = bx.b[2] - bx.a[2], L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * bx.t / 2, nz = (dx / L) * bx.t / 2;
    // (a zero-length box, a post: its own width along)
    const y0a = bx.a[1] - 0.1, y0b = bx.b[1] - 0.1, y1a = bx.a[1] + bx.h, y1b = bx.b[1] + bx.h;
    const P = [[bx.a[0] - nx, y0a, bx.a[2] - nz], [bx.b[0] - nx, y0b, bx.b[2] - nz], [bx.b[0] + nx, y0b, bx.b[2] + nz], [bx.a[0] + nx, y0a, bx.a[2] + nz],
      [bx.a[0] - nx, y1a, bx.a[2] - nz], [bx.b[0] - nx, y1b, bx.b[2] - nz], [bx.b[0] + nx, y1b, bx.b[2] + nz], [bx.a[0] + nx, y1a, bx.a[2] + nz]];
    const quad = (a, b, c, d) => { tri(P[a], P[b], P[c]); tri(P[a], P[c], P[d]); };
    quad(4, 7, 6, 5); quad(0, 1, 5, 4); quad(2, 3, 7, 6); quad(3, 0, 4, 7); quad(1, 2, 6, 5);
  }
  return new Float32Array(out);
}

/** the tiles a doc's items stand in, per park */
export function docTiles(doc) {
  const out = {};
  for (const [name, park] of Object.entries(doc.parks)) {
    const s = new Set();
    for (const k of ["panels", "plinths", "posts", "piers", "leaves"]) for (const q of park[k] || []) if (q.t) s.add(q.t);
    out[name] = [...s].sort();
  }
  return out;
}
