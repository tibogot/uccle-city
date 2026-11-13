// ORIENT THE UrbIS BUILDINGS OUTWARD (2026-11-13; owner question "are all the buildings double-sided?").
// pipeline/build_buildings.py turns each wall to face "away from the building's centre" and each roof to face up: wrong
// on every concave house (an L's inner-corner walls face TOWARDS the centre) and on real downward faces (overhang
// soffits). 85.6k of 788k wall triangles and 4.9k of 441k roof triangles came out wound inward, so the wall / roof
// materials had to be DoubleSide (viewer/facades.js), which doubled their raster and shadow cost.
//
// Here, per building, per triangle: rays from its centre along its normal (and two jittered copies) against the
// building's own triangles; an odd number of crossings = the normal points into the solid -> swap two indices.
// Same triangles, same counts and order (buildings.json's first / count stay valid); idempotent (a second run flips 0).
// Run after build_buildings.py, then pipeline/build_manifest.py (new ?v= stamp, so no cached bin is served).
//
//   node tools/orient_buildings.mjs [--dry] [TILE ...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TILES = path.join(ROOT, "data", "tiles");
const args = process.argv.slice(2), dry = args.includes("--dry"), only = args.filter((a) => !a.startsWith("--"));

/** ray (o, d) crosses triangle p (either side) at a distance > 1e-4? (Moller-Trumbore) */
function hit(o, d, p) {
  const e1x = p[3] - p[0], e1y = p[4] - p[1], e1z = p[5] - p[2], e2x = p[6] - p[0], e2y = p[7] - p[1], e2z = p[8] - p[2];
  const hx = d[1] * e2z - d[2] * e2y, hy = d[2] * e2x - d[0] * e2z, hz = d[0] * e2y - d[1] * e2x;
  const a = e1x * hx + e1y * hy + e1z * hz;
  if (Math.abs(a) < 1e-10) return false;
  const f = 1 / a, sx = o[0] - p[0], sy = o[1] - p[1], sz = o[2] - p[2], u = f * (sx * hx + sy * hy + sz * hz);
  if (u < 0 || u > 1) return false;
  const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = f * (d[0] * qx + d[1] * qy + d[2] * qz);
  if (v < 0 || u + v > 1) return false;
  return f * (e2x * qx + e2y * qy + e2z * qz) > 1e-4;
}

/** point in polygon ([[x, z], ...]) */
function pip(x, z, r) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

const total = { tiles: 0, walls: 0, wallsFlipped: 0, roofs: 0, roofsFlipped: 0, ambiguous: 0 };
const tiles = (only.length ? only : fs.readdirSync(TILES)).filter((t) => fs.existsSync(path.join(TILES, t, "buildings.bin")));
for (const T of tiles) {
  const binPath = path.join(TILES, T, "buildings.bin");
  const doc = JSON.parse(fs.readFileSync(path.join(TILES, T, "buildings.json"), "utf8"));
  const raw = fs.readFileSync(binPath);
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const dv = new DataView(buf), V = dv.getUint32(0, true), N = dv.getUint32(4, true);
  const P = new Float32Array(buf, 8, V * 3), I = new Uint32Array(buf, 8 + V * 12, N * 3);
  let flipped = 0;
  for (const b of doc.buildings) {
    const tris = [];
    for (const [part, wall] of [[b.walls, true], [b.roof, false]]) {
      if (!part) continue;
      for (let t = part.first; t < part.first + part.count; t++) {
        const p = new Float64Array(9);
        for (let k = 0; k < 3; k++) { const i = I[t * 3 + k]; p[k * 3] = P[i * 3]; p[k * 3 + 1] = P[i * 3 + 1]; p[k * 3 + 2] = P[i * 3 + 2]; }
        const ux = p[3] - p[0], uy = p[4] - p[1], uz = p[5] - p[2], wx = p[6] - p[0], wy = p[7] - p[1], wz = p[8] - p[2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, L = Math.hypot(nx, ny, nz);
        if (L < 1e-9) continue;
        tris.push({ t, p, n: [nx / L, ny / L, nz / L], wall });
      }
    }
    const ring = b.footprint?.[0] || [];
    for (const o of tris) {
      const c = [(o.p[0] + o.p[3] + o.p[6]) / 3, (o.p[1] + o.p[4] + o.p[7]) / 3, (o.p[2] + o.p[5] + o.p[8]) / 3];
      // a vote per line (the normal and two jittered copies): crossings ahead odd and behind even = the normal points in;
      // the reverse = out; anything else (an open spot in the solid) does not vote. The same lines whichever way the
      // triangle is wound, so the result does not depend on the input winding (a second run flips nothing).
      const s = Math.sign(o.n[0] || o.n[1] || o.n[2]) || 1;      // jitter in a winding-independent frame
      let vin = 0, vout = 0;
      for (const [jx, jy, jz] of [[0, 0, 0], [0.031, 0.017, -0.023], [-0.027, 0.041, 0.013]]) {
        const d = [o.n[0] * s + jx, o.n[1] * s + jy, o.n[2] * s + jz], L = Math.hypot(...d);
        d[0] /= L; d[1] /= L; d[2] /= L;
        const par = (dir) => {
          const org = [c[0] + dir[0] * 0.002, c[1] + dir[1] * 0.002, c[2] + dir[2] * 0.002];
          let k = 0;
          for (const q of tris) if (q !== o && hit(org, dir, q.p)) k++;
          return k & 1;
        };
        const fwd = par(d), back = par([-d[0], -d[1], -d[2]]);
        if (fwd === back) continue;
        const inward = (fwd === 1) === (s > 0);             // odd along +n (s > 0) or odd along -n (s < 0)... seen from n
        if (inward) vin++; else vout++;
      }
      let flip = vin > vout;
      if (vin === vout) {                                    // undecided: walls by the footprint (a point 0.5 m out must
        total.ambiguous++; if (o.wall) total.ambiguousWalls = (total.ambiguousWalls || 0) + 1;   // be outside it, 0.5 m in inside), roofs keep their winding
        if (o.wall && ring.length) {
          const h = Math.hypot(o.n[0], o.n[2]) || 1, nx = o.n[0] / h, nz = o.n[2] / h;
          flip = pip(c[0] + nx * 0.5, c[2] + nz * 0.5, ring) && !pip(c[0] - nx * 0.5, c[2] - nz * 0.5, ring);
        }
      }
      if (o.wall) total.walls++; else total.roofs++;
      if (flip) {                                           // inward -> reverse the winding
        const a = o.t * 3 + 1, tmp = I[a]; I[a] = I[a + 1]; I[a + 1] = tmp;
        flipped++;
        if (o.wall) total.wallsFlipped++; else total.roofsFlipped++;
      }
    }
  }
  total.tiles++;
  if (flipped && !dry) fs.writeFileSync(binPath, Buffer.from(buf));
}
console.log(JSON.stringify({ dry, ...total }));
