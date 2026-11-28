// THE FALCON'S RING COURSES (rule falcon-rings, docs/rules/falcon-rings.md; owner 2026-11-26, docs/TODO.md 4b3: "go through
// rings: not realistic but it's about controlling the falcon well; the goal: the game not boring"). Pure JS (node
// checks it: tools/falconRingsTest.mjs): the courses over the real city, their rings placed in FREE AIR by the city's
// own falcon world (cityStream.js column: the drawn ground, roofs, landmarks, crowns, furniture), the run (the rings
// passed in order, the time, the medals) and the ghost (the best run, recorded at 10 Hz, replayed).
//   spires   from the Saint-Job church's tower to Saint-Pierre's: a slalom over the roofs, 30-60 m up
//   avenue   down Avenue Brugmann under the tram wires (the 92): the rings' tops 5.4 m over the street (under the wires'
//            5.5 m), their bottoms 0.8-1.4 m over it
//   stoop    a line of rings dropping steeply off the Observatory's dome (50 deg: the steepest both controllers hold
//            with the stoop tucked; a vertical line was missed after its first ring, node check), then the pull-out gate
//            and the finish
// A ring: { x, y, z (its centre), nx, ny, nz (the way through it), r (m) }. Passing = the falcon's path between two frames
// crosses its plane inside r (the next ring only: in order).

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
/** the courses (city metres: x east, z south; y = m TAW). Control points from the city's data: models/stjob/stjob.json
 *  (the church, 1216 / 561), models/stpierre/stpierre.json (-709 / -492.5), models/observatory/observatory.json (654 / 60),
 *  Avenue Brugmann's centreline (data/tiles/E4 roads.json, the 92 tram's way) */
// (the medals: from the node check's simple pilot with the gym controller (tools/falconRingsTest.mjs, 2026-11-26:
// spires 91 s, avenue 30.5 s, stoop 4.4 s): gold ~ its time + 10 %, silver + 30 %, bronze + 60 %; the current controller: 157, 43, 4.0 s)
export const COURSES = {
  spires: {
    id: "spires", name: "The spires", desc: "Saint-Job's tower to Saint-Pierre's, a slalom over the roofs",
    kind: "air", r0: 9, r1: 7,
    from: [1196, 552], to: [-690, -480], n: 16, sway: 70, agl: [42, 58], end: { agl: 34 },
    medals: { gold: 100, silver: 118, bronze: 145 },
  },
  avenue: {
    id: "avenue", name: "The avenue", desc: "down Avenue Brugmann under the tram wires",
    kind: "street", r0: 2.2, r1: 2.0, wireTop: 5.5, spacing: 34,
    path: [[-919, -142], [-871, -162], [-848, -184], [-806, -213], [-787, -226], [-702, -281], [-666, -303], [-641, -313], [-630, -336], [-594, -421], [-590, -435], [-579, -461], [-555, -520], [-551, -537], [-529, -587], [-517, -617]],
    medals: { gold: 34, silver: 40, bronze: 50 },
  },
  stoop: {
    id: "stoop", name: "The stoop", desc: "a dive through the rings off the Observatory's dome, the pull-out gate",
    kind: "stoop", r0: 8, r1: 6,
    at: [654, 60], off: [30, -10], top: 95, step: 15, dive: 50, n: 6, pull: { d: 60, agl: 20 }, end: { d: 120, agl: 24 },
    medals: { gold: 5, silver: 6.5, bronze: 9 },
  },
};
export const COURSE_IDS = Object.keys(COURSES);

/** is the ring in free air: its centre and 12 points round its rim (r x 1.06 + 0.3 m: the tube and a margin, in its own plane) over the floor there
 *  and under the ceiling (the world's column: roofs, crowns, landmarks, furniture) by `m` */
export function ringClear(world, q, m = 0.4) {
  const ux = -q.nz, uz = q.nx, ul = Math.hypot(ux, uz) || 1;
  // the plane's two axes: a = horizontal across the way, b = (n x a)
  let ax = ux / ul, ay = 0, az = uz / ul;
  if (Math.hypot(q.nx, q.nz) < 0.2) { ax = 1; ay = 0; az = 0; }
  const bx = q.ny * az - q.nz * ay, by = q.nz * ax - q.nx * az, bz = q.nx * ay - q.ny * ax;
  const R = q.r * 1.06 + 0.3;
  for (let k = -1; k < 12; k++) {
    const t = k * Math.PI / 6, s = k < 0 ? 0 : 1;
    const x = q.x + s * R * (Math.cos(t) * ax + Math.sin(t) * bx), y = q.y + s * R * (Math.cos(t) * ay + Math.sin(t) * by), z = q.z + s * R * (Math.cos(t) * az + Math.sin(t) * bz);
    const c = world.column(x, z, y);
    if (c.floor > y - m || (c.ceil ?? Infinity) < y + m) return false;
  }
  return true;
}

/** the course's rings over the world (call once its tiles are in): placed, then checked and moved into free air (up
 *  5 m at a time for the air rings, sideways / down for the street's, dropped when there is none); also the start
 *  { x, y, z, heading, V } */
export function buildCourse(def, world) {
  const out = [], G = (x, z) => (world.drawnGround ? world.drawnGround(x, z) : world.ground(x, z));
  const push = (x, y, z, r) => out.push({ x, y, z, nx: 0, ny: 0, nz: -1, r, moved: 0 });
  if (def.kind === "air") {
    const [x0, z0] = def.from, [x1, z1] = def.to, L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L;
    for (let i = 0; i < def.n; i++) {
      const s = (i + 0.5) / def.n, side = Math.sin(i * 1.3) * def.sway * (i === 0 || i === def.n - 1 ? 0.2 : 1);
      const x = x0 + dx * L * s - dz * side, z = z0 + dz * L * s + dx * side;
      const agl = def.agl[i % 2] + ((i * 7) % 3) * 3;
      push(x, Math.max(G(x, z) + agl, world.floor(x, z) + 18), z, i < 3 ? def.r0 : def.r1);
    }
    push(x1, Math.max(G(x1, z1) + def.end.agl, world.floor(x1, z1) + 14), z1, def.r0);
  } else if (def.kind === "street") {
    // along the path, every `spacing` m: the top 0.1 m under the tram wires over the street's drawn surface
    const P = def.path;
    let carry = def.spacing * 0.5;
    for (let i = 0; i + 1 < P.length; i++) {
      const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let s = carry; s < L; s += def.spacing) {
        const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L, r = out.length < 3 ? def.r0 : def.r1;
        push(x, G(x, z) + def.wireTop - 0.1 - r, z, r);
      }
      carry = (carry - L) % def.spacing; if (carry < 0) carry += def.spacing;
    }
  } else {
    // the stoop: a steep line out from beside the dome (def.dive deg down, def.step m apart along it), the pull-out
    // gate past its foot, the finish
    const [cx, cz] = def.at, x = cx + def.off[0], z = cz + def.off[1], g = G(x, z);
    const L = Math.hypot(def.off[0], def.off[1]), fx = def.off[0] / L, fz = def.off[1] / L, a = def.dive * Math.PI / 180;
    const sh = def.step * Math.cos(a), sv = def.step * Math.sin(a);
    for (let i = 0; i < def.n; i++) push(x + fx * sh * i, g + def.top - sv * i, z + fz * sh * i, i === 0 ? def.r0 : def.r1);
    const fx0 = x + fx * sh * (def.n - 1), fz0 = z + fz * sh * (def.n - 1);
    const px = fx0 + fx * def.pull.d, pz = fz0 + fz * def.pull.d, ex = fx0 + fx * def.end.d, ez = fz0 + fz * def.end.d;
    push(px, Math.max(G(px, pz) + def.pull.agl, world.floor(px, pz) + 10), pz, def.r0);
    push(ex, Math.max(G(ex, ez) + def.end.agl, world.floor(ex, ez) + 12), ez, def.r0);
  }
  // the way through each ring: the bisector of the way in (from the previous) and the way out (to the next), so a
  // ring at a bend faces the turn (the first: toward the next, the last: from the previous); the stoop's line: its slope
  for (let i = 0; i < out.length; i++) {
    const a = out[i], b = out[Math.min(i + 1, out.length - 1)], p = out[Math.max(i - 1, 0)];
    const ix = a.x - p.x, iy = a.y - p.y, iz = a.z - p.z, il = Math.hypot(ix, iy, iz), ox = b.x - a.x, oy = b.y - a.y, oz = b.z - a.z, ol = Math.hypot(ox, oy, oz);
    let vx = (il ? ix / il : 0) + (ol ? ox / ol : 0), vy = (il ? iy / il : 0) + (ol ? oy / ol : 0), vz = (il ? iz / il : 0) + (ol ? oz / ol : 0);
    if (def.kind === "stoop" && i < def.n) { const L = Math.hypot(def.off[0], def.off[1]), a = def.dive * Math.PI / 180; vx = def.off[0] / L * Math.cos(a); vy = -Math.sin(a); vz = def.off[1] / L * Math.cos(a); }
    if (def.kind === "street") vy = 0;                          // (upright gates down the street)
    const l = Math.hypot(vx, vy, vz) || 1; a.nx = vx / l; a.ny = vy / l; a.nz = vz / l;
  }
  // into free air (the stoop's line as one: raised 5 m at a time until all of it is clear)
  if (def.kind === "stoop") for (let k = 0; k < 8 && out.slice(0, def.n).some((q) => !ringClear(world, q)); k++) for (let i = 0; i < def.n; i++) { out[i].y += 5; out[i].moved += 5; }
  const rings = [];
  for (const q of out) {
    let ok = ringClear(world, q);
    if (!ok && (def.kind === "air" || def.kind === "stoop")) for (let k = 0; k < 10 && !ok; k++) { q.y += def.kind === "air" ? 5 : 3; q.moved += 5; ok = ringClear(world, q); }
    if (!ok && def.kind === "street") {
      const x0 = q.x, z0 = q.z, y0 = q.y, sx = -q.nz, sz = q.nx;
      for (const [d, dy] of [[1.2, 0], [-1.2, 0], [2.4, 0], [-2.4, 0], [0, -0.5], [1.2, -0.5], [-1.2, -0.5], [3.6, 0], [-3.6, 0]]) {
        q.x = x0 + sx * d; q.z = z0 + sz * d; q.y = y0 + dy; q.moved = Math.hypot(d, dy);
        if ((ok = ringClear(world, q))) break;
      }
    }
    if (ok && def.kind === "street" && q.y + q.r > G(q.x, q.z) + def.wireTop) ok = false;
    if (ok) rings.push(q);
  }
  if (!rings.length) return { def, rings, start: null, dropped: out.length, moved: 0 };
  const a = rings[0], b = rings[1] || rings[0];
  // the start: 40 m before the first ring (the street: 45), 1.5 m over its centre (the city's wind drifted a hands-off start ~9 m in
  // 55 m: browser check) (the stoop: 10 m over it, 60 m back: the line in the chase camera's view, which looks level), flying at it
  const hd = Math.atan2(-(b.x - a.x) || -a.nx, -(b.z - a.z) || -a.nz), back = def.kind === "street" ? 45 : 40;
  const start = def.kind === "stoop"
    ? { x: a.x - a.nx / Math.hypot(a.nx, a.nz) * 60, y: a.y + 10, z: a.z - a.nz / Math.hypot(a.nx, a.nz) * 60, heading: 0, V: 16 }
    : { x: a.x + Math.sin(Math.atan2(-a.nx, -a.nz)) * back, y: a.y + (def.kind === "street" ? 0.5 : 1.5), z: a.z + Math.cos(Math.atan2(-a.nx, -a.nz)) * back, heading: Math.atan2(-a.nx, -a.nz), V: def.kind === "street" ? 15 : 18 };
  if (def.kind === "stoop") start.heading = Math.atan2(-(a.x - start.x), -(a.z - start.z));
  return { def, rings, start, dropped: out.length - rings.length, moved: rings.filter((q) => q.moved).length, hd };
}

/** the start's path angle: toward the first ring (nose down for the stoop: its rings are under the camera's view
 *  otherwise; browser check), at most 35 deg down, never up */
export function startGamma(course) {
  const s = course.start, q = course.rings[0];
  return Math.max(-0.6, Math.min(0, Math.atan2(q.y - s.y, Math.hypot(q.x - s.x, q.z - s.z))));
}

/** the time (s) -> the medal */
export function medalOf(def, t) { const M = def.medals; return t <= M.gold ? "gold" : t <= M.silver ? "silver" : t <= M.bronze ? "bronze" : ""; }

const GHOST_HZ = 10, GHOST_MAX = 3600;            // 6 min at 10 Hz
/** one run of a course: the next ring, the time, the ghost being recorded (fixed buffers) */
export class RingRun {
  constructor(course) {
    this.course = course; this.rings = course.rings;
    this.rec = new Float32Array(GHOST_MAX * 7); this.recN = 0; this.recT = 0;
    this.reset();
  }
  reset() { this.next = 0; this.t = 0; this.on = false; this.done = false; this.recN = 0; this.recT = 0; this.last = null; this.missed = 0; this._p = this._p ?? { x: 0, y: 0, z: 0, has: false }; this._p.has = false; }
  /** a frame (game s): pos the falcon's, heading / gamma / phi for the ghost; returns "pass" | "finish" | "" */
  update(dt, pos, heading = 0, gamma = 0, phi = 0) {
    if (this.done) return "";
    const P = this._p;
    let ev = "";
    if (this.on) this.t += dt;
    if (P.has) {
      const q = this.rings[this.next];
      if (q && crosses(q, P, pos)) {
        if (!this.on) { this.on = true; this.t = 0; }
        this.next++; ev = "pass";
        if (this.next >= this.rings.length) { this.done = true; ev = "finish"; }
      }
    }
    P.x = pos.x; P.y = pos.y; P.z = pos.z; P.has = true;
    // the ghost: from the first ring on, 10 Hz
    if (this.on && (this.recT -= dt) <= 0 && this.recN < GHOST_MAX) {
      this.recT += 1 / GHOST_HZ;
      const o = this.recN * 7, R = this.rec;
      R[o] = this.t; R[o + 1] = pos.x; R[o + 2] = pos.y; R[o + 3] = pos.z; R[o + 4] = heading; R[o + 5] = gamma; R[o + 6] = phi;
      this.recN++;
    }
    return ev;
  }
  /** the recorded run, trimmed (a copy: the best run kept) */
  ghost() { return { t: this.t, data: this.rec.slice(0, this.recN * 7) }; }
}
/** the segment a -> b crosses q's plane inside its radius */
export function crosses(q, a, b) {
  const da = (a.x - q.x) * q.nx + (a.y - q.y) * q.ny + (a.z - q.z) * q.nz, db = (b.x - q.x) * q.nx + (b.y - q.y) * q.ny + (b.z - q.z) * q.nz;
  if (da > 0 || db < 0) return false;                       // (from before it to after it, the way through)
  const s = da === db ? 0 : da / (da - db), x = a.x + (b.x - a.x) * s - q.x, y = a.y + (b.y - a.y) * s - q.y, z = a.z + (b.z - a.z) * s - q.z;
  return x * x + y * y + z * z <= q.r * q.r;
}
/** the ghost's pose at time t (s) of a recorded run: out { x, y, z, heading, gamma, phi, on } (interpolated) */
export function ghostAt(G, t, out) {
  const D = G.data, n = D.length / 7;
  out.on = n > 1 && t >= D[0] && t <= D[(n - 1) * 7];
  if (!out.on) return out;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (D[m * 7] <= t) lo = m; else hi = m; }
  const a = lo * 7, b = hi * 7, k = clamp((t - D[a]) / Math.max(D[b] - D[a], 1e-6), 0, 1);
  out.x = D[a + 1] + (D[b + 1] - D[a + 1]) * k; out.y = D[a + 2] + (D[b + 2] - D[a + 2]) * k; out.z = D[a + 3] + (D[b + 3] - D[a + 3]) * k;
  const dh = Math.atan2(Math.sin(D[b + 4] - D[a + 4]), Math.cos(D[b + 4] - D[a + 4]));
  out.heading = D[a + 4] + dh * k; out.gamma = D[a + 5] + (D[b + 5] - D[a + 5]) * k; out.phi = D[a + 6] + (D[b + 6] - D[a + 6]) * k;
  return out;
}
