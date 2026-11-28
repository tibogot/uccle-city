// KERB FURNITURE SITES (claude/reality2, rule kerb-furniture, class C8 of docs/REALITY_ROUND_2026-11-26.md; no three.js:
// viewer/kerbBarriers.js + viewer/streetFit.js draw them, tools/audit/kerbFurnitureCheck.mjs checks them in node).
// Street View (look only): black steel hairpin barriers along the kerb in front of the schools (Dieweg, Edith Cavell,
// Saint-Job), brown timber bollards with a red reflective band along the green / station edges (Calevoet, the Saint-Job
// hill), the green cast-iron bollards on the town streets. Ours: no barriers, every bollard green cast iron.
export const LEG = 0.45;             // m from a hairpin's centre to each leg (along its local x)
export const BARRIER_STEP = 1.5;       // m between two hairpins along the kerb
export const BARRIER_BACK = 0.45;      // m behind the kerb line, on the sidewalk (the car's mirror clears it)
export const BARRIER_RUN = 16;         // m of kerb at most in front of one school front
export const BARRIER_GAP = 3.2;        // m left open at the school's door (its front's middle)
export const BARRIER_REACH = 20;       // m: the kerb in front of the front (a school yard may lie between), not another street's
export const TIMBER_GREEN = 15;        // m from public green (>= GREEN_MIN_M2: a park, a wood, the station green): a timber bollard ...
export const GREEN_MIN_M2 = 2500;      // a grass verge or a pocket square is not a green edge
export const TIMBER_SHOPS = 40;        // ... unless a shopfront is this close (the town street keeps its cast iron)

/** schools [{ x, z, nx, nz, w }] (the street-life school faces: centre on the wall, outward normal), nearKerb(x, z, r)
 *  (viewer/streets/fitCore.js: { x, z, tx, tz, lx, lz (into the raised side), d }), onSidewalk(x, z) (raised, not a
 *  driven lane), inB the tile's bounds -> [{ x, z, yaw (local +x along the kerb), school }] */
export function schoolBarriers(schools, nearKerb, onSidewalk = () => true, inB = () => true) {
  const out = [];
  if (!nearKerb) return out;
  (schools || []).forEach((f, si) => {
    if (!inB(f.x, f.z)) return;
    const tx = -f.nz, tz = f.nx, half = Math.min(BARRIER_RUN, Math.max(f.w, 12)) / 2;   // (the face is often the door bay: the barriers run on along the school's frontage)
    for (let u = -half; u <= half + 1e-6; u += BARRIER_STEP) {
      if (Math.abs(u) < BARRIER_GAP / 2) continue;
      const k = frontKerb(f, u, nearKerb);
      if (!k) continue;
      const x = k.x + k.lx * BARRIER_BACK, z = k.z + k.lz * BARRIER_BACK;
      if (!onSidewalk(x, z)) continue;
      if (out.some((b) => Math.hypot(b.x - x, b.z - z) < BARRIER_STEP * 0.7)) continue;
      out.push({ x, z, yaw: Math.atan2(-k.tz, k.tx), school: si });
    }
  });
  return out;
}

/** the kerb in front of a front at u m along it: probed 3 / 8 / 14 m out from the wall, the first kerb found whose
 *  raised side faces the wall (the sidewalk lies between: not a side street's kerb), within BARRIER_REACH; or null */
export function frontKerb(f, u, nearKerb) {
  const tx = -f.nz, tz = f.nx;
  for (const out of [3, 8, 14]) {
    const k = nearKerb(f.x + tx * u + f.nx * out, f.z + tz * u + f.nz * out, 6);
    if (!k || k.lx * f.nx + k.lz * f.nz > -0.5) continue;
    if (Math.hypot(k.x - f.x - tx * u, k.z - f.z - tz * u) > BARRIER_REACH) continue;
    return k;
  }
  return null;
}

/** xyz (the surveyed bollards), green(x, z) (in / near public green), fronts (shopfront faces) -> Uint8Array: 1 = timber */
export function bollardKinds(xyz, green, fronts = []) {
  const n = xyz.length / 3, out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = xyz[i * 3], z = xyz[i * 3 + 2];
    if (!green(x, z, TIMBER_GREEN)) continue;
    if (fronts.some((f) => Math.hypot(f.x - x, f.z - z) < TIMBER_SHOPS)) continue;
    out[i] = 1;
  }
  return out;
}

/** (x, z, r) -> within r m of an OSM public green area (park, wood, grass, meadow, scrub, heath, recreation ground,
 *  cemetery) of feats.areas: the outer ring's points and a point-in-polygon test, on a 4 m sample of the ring */
export function greenNear(feats) {
  const KINDS = new Set(["wood", "forest", "park", "grass", "meadow", "scrub", "heath", "recreation_ground", "cemetery", "village_green"]);
  const area = (r) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const rings = (feats?.areas || []).filter((a) => KINDS.has(a.kind)).map((a) => a.rings?.[0]).filter((r) => r && r.length > 2 && area(r) >= GREEN_MIN_M2);
  const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const box = rings.map((r) => { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const [x, z] of r) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } return [x0, z0, x1, z1]; });
  return (x, z, r) => rings.some((R, k) => {
    const b = box[k]; if (x < b[0] - r || x > b[2] + r || z < b[1] - r || z > b[3] + r) return false;
    if (pip(x, z, R)) return true;
    for (let i = 1; i < R.length; i++) if (segD(x, z, R[i - 1], R[i]) < r) return true;
    return false;
  });
}
