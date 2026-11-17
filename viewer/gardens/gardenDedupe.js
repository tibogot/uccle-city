// (holes 2026-11-17, owner: z-fighting garden entrance piers) ONE PIER PER SPOT. tools/gardens/build_gardens.py puts a
// pillar at each run's end unless a straight neighbour does: two runs meeting at an angle (two gardens' fronts, a front
// and its side) both put one, at the same point (to the cm) with yaws a few degrees apart: two identical brick piers
// and caps, every face doubled = z-fighting (tools/audit/gardenZfight.mjs: 2,275 cap pairs + 415 pier pairs on
// 2026-11-17). Here, pure (no three.js): pillars whose caps overlap (centres under MERGE m apart, bases within 0.3 m)
// collapse to the tallest one. Used by viewer/gardens/gardenKit.js gardenInstances() (drawn + collision stand-ins) and
// the audit. ?gardenpier=old: off (gardenKit.js).
export const MERGE = 0.46;   // (the pier caps are 46 cm: two piers closer than that have their caps overlapping)
/** pillars [[x, y, z, yaw, h, style], ...] -> the same list without the doubles (order kept, the tallest wins) */
export function dedupePillars(pillars) {
  const keep = [], cell = new Map(), C = 1, key = (i, j) => `${i},${j}`;
  for (const p of pillars) {
    const i = Math.floor(p[0] / C), j = Math.floor(p[2] / C);
    let hit = -1;
    for (let a = i - 1; a <= i + 1 && hit < 0; a++) for (let b = j - 1; b <= j + 1 && hit < 0; b++)
      for (const k of cell.get(key(a, b)) || []) { const q = keep[k]; if (Math.hypot(q[0] - p[0], q[2] - p[2]) < MERGE && Math.abs(q[1] - p[1]) < 0.3) { hit = k; break; } }
    if (hit >= 0) { if (p[4] > keep[hit][4]) keep[hit] = p; continue; }
    const k = keep.length; keep.push(p);
    if (!cell.has(key(i, j))) cell.set(key(i, j), []);
    cell.get(key(i, j)).push(k);
  }
  return keep;
}

/** (holes) segments [x0, y0, z0, x1, y1, z1, style, wallH] of one run that DOUBLE BACK over the previous one (a turn
 *  over REVERSE_DEG at a shared end: build_gardens.py's spurs, 597 wall + coping pairs drawn twice in one place) lose the
 *  shorter of the two (it lies inside the other's wall). Order kept. */
const REVERSE_COS = Math.cos((150 * Math.PI) / 180);
export function cleanSegs(segs) {
  const out = [];
  for (const g of segs) {
    const p = out[out.length - 1];
    if (p && p[6] === g[6] && Math.hypot(p[3] - g[0], p[5] - g[2]) <= 0.02) {
      const ax = p[3] - p[0], az = p[5] - p[2], bx = g[3] - g[0], bz = g[5] - g[2], la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
      if (la > 1e-3 && lb > 1e-3 && (ax * bx + az * bz) / (la * lb) < REVERSE_COS) {
        if (lb <= la) continue;                       // the spur back: dropped
        out[out.length - 1] = g;                      // the run goes on back over a shorter stub: the stub dropped
        continue;
      }
    }
    out.push(g);
  }
  return out;
}

/** the copings' mitre extensions (m) at each segment's start / end: consecutive segments of one run that share an end
 *  (to 2 cm) and turn < 70 deg overlap by w/2 tan(a/2) (= gardenKit.js before; moved here for the audit) and the
 *  coping's LIFT: two copings overlapping at a mitred corner have their flat tops in one plane (z-fight: 1,253 pairs);
 *  every other coping along a mitred chain sits LIFT higher (6 mm: a joint between two stones; under the 3.5 cm
 *  overhang the slit over the wall is never seen). The WALLS' extension: none under WALL_MIN_TURN (2 deg: their side faces
 *  in one plane overlapping over 2e: 589 pairs; the wedge left open at the outer corner is under 2 mm, under the
 *  coping). Returns { ext, extW: Float32Array(2 n), lift: Float32Array(n) } */
export const LIFT = 0.006, WALL_MIN_TURN = 0.035;
export function capJoins(segs, capW, lift = true) {
  const ext = new Float32Array(segs.length * 2), extW = new Float32Array(segs.length * 2), up = new Float32Array(segs.length);
  let chain = 0;
  for (let i = 0; i + 1 < segs.length; i++) {
    const a = segs[i], b = segs[i + 1];
    if (a[6] !== b[6] || Math.hypot(a[3] - b[0], a[5] - b[2]) > 0.02) continue;
    const ax = a[3] - a[0], az = a[5] - a[2], bx = b[3] - b[0], bz = b[5] - b[2];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 1e-3 || lb < 1e-3) continue;
    const c = Math.max(-1, Math.min(1, (ax * bx + az * bz) / (la * lb))), ang = Math.acos(c);
    if (ang < 0.005 || ang > 1.22) continue;
    const e = (capW / 2) * Math.tan(ang / 2);
    ext[i * 2 + 1] = e; ext[(i + 1) * 2] = e;
    if (!lift || ang >= WALL_MIN_TURN) { extW[i * 2 + 1] = e; extW[(i + 1) * 2] = e; }
  }
  if (lift) for (let i = 0; i < segs.length; i++) { chain = ext[i * 2] > 0 ? chain + 1 : 0; up[i] = (chain % 2) * LIFT; }
  return { ext, extW, lift: up };
}
