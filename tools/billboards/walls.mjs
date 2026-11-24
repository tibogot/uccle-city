// THE WALLS AND ROOFS A BILLBOARD CAN STAND ON (claude/billboards, rule billboards), exactly as the city draws them:
// viewer/facadeGeom.js analyseBuildings groups the UrbIS wall triangles into faces (party walls, street faces, the
// face's own frame), a stub facade-kit collector records every face it sees (it draws nothing: k.on = false, the same
// trick as tools/gardens/faces.mjs). Read by tools/billboards/billboards.mjs (placement + the gate row `billboards`).
//
//   tileWalls(T) -> { faces, buildings, roofAt(bi, x, z), roofOf(x, z), openings(face) }
//     face: { bi, bu, solid, nx, nz, tx, tz, u0, width, base, top, partyH, street, plane, tris (u, y), wallTop(u) }
//     roofAt(bi, x, z): building bi's roof (its highest roof triangle) right over (x, z), -Infinity off it
//     roofOf(x, z): { bi, y } of the tallest building whose footprint holds (x, z), null on open ground
//     openings(face): the windows / doors the painted facade draws on it (viewer/interior/facadeWindows.js faceOpenings)
//     stacks: the roof kit's chimney stacks [{ x, z, tx, tz, w, d, y0, y1 }]; cols: its collision tops [x0, z0, x1, z1, top]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { analyseBuildings, hash01 } = await imp("viewer/facadeGeom.js");
const { faceOpenings } = await imp("viewer/interior/facadeWindows.js");
const { roofCollector } = await imp("viewer/roofs/roofPlace.js");

const pip = (x, z, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const solidId = (b) => String(b.id).split("/").pop();

const cache = new Map();
export function tileWalls(T) {
  if (cache.has(T)) return cache.get(T);
  const d = join(ROOT, "data/tiles", T);
  const doc = JSON.parse(readFileSync(join(d, "buildings.json"), "utf8"));
  const bin = readFileSync(join(d, "buildings.bin")), buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const roads = JSON.parse(readFileSync(join(d, "roads.json"), "utf8")), feats = JSON.parse(readFileSync(join(d, "features.json"), "utf8"));
  const dv = new DataView(buf), V = dv.getUint32(0, true), TN = dv.getUint32(4, true);
  const P = new Float32Array(buf, 8, V * 3), I = new Uint32Array(buf, 8 + V * 12, TN * 3);
  const bIndex = new Map(doc.buildings.map((b, i) => [b, i]));
  const faces = [];
  const kit = {
    finish() { return null; },
    face(f) {
      const b = f.building, bi = bIndex.get(b);
      let off = 0, n = 0;
      for (const { p } of f.tris) for (const q of p) { off += q[0] * f.nx + q[2] * f.nz; n++; }
      off /= n;
      const T2 = f.tris.map(({ p }) => p.map((q) => [q[0] * f.tx + q[2] * f.tz - f.u0, q[1]]));
      /** the wall's top at u (m along the face from its left end), -Infinity off the face */
      const wallTop = (u) => {
        let hi = -Infinity;
        for (const t of T2) for (let e = 0; e < 3; e++) {
          const A = t[e], B = t[(e + 1) % 3];
          if ((A[0] - u) * (B[0] - u) > 0) continue;
          const y = Math.abs(B[0] - A[0]) < 1e-6 ? Math.max(A[1], B[1]) : A[1] + (B[1] - A[1]) * (u - A[0]) / (B[0] - A[0]);
          if (y > hi) hi = y;
        }
        return hi;
      };
      /** the wall's foot at u (its lowest point), Infinity off the face */
      const wallFoot = (u) => {
        let lo = Infinity;
        for (const t of T2) for (let e = 0; e < 3; e++) {
          const A = t[e], B = t[(e + 1) % 3];
          if ((A[0] - u) * (B[0] - u) > 0) continue;
          const y = Math.abs(B[0] - A[0]) < 1e-6 ? Math.min(A[1], B[1]) : A[1] + (B[1] - A[1]) * (u - A[0]) / (B[0] - A[0]);
          if (y < lo) lo = y;
        }
        return lo;
      };
      faces.push({ bi, bu: String(b.attrs?.BU_ID || b.id), solid: solidId(b), key: f.key, nx: f.nx, nz: f.nz, tx: f.tx, tz: f.tz, u0: f.u0, width: f.width,
        base: f.base, top: f.top, eaves: f.eaves, partyH: f.partyH, street: f.street, landmark: !!f.landmark, wallStyle: f.wallStyle, type: f.type,
        garage: f.garage, shopW: f.shopW, shopU: f.shopU, rnd: f.rnd, plane: off, wallTop, wallFoot,
        /** world (x, z) of the point u m along the face, d m out of the wall */
        at: (u, dd = 0) => [f.tx * (f.u0 + u) + f.nx * (off + dd), f.tz * (f.u0 + u) + f.nz * (off + dd)] });
      return { on: false };
    },
  };
  // the roof kit as the city places it (viewer/tileData.js: roofCollector() unless ?roofs=old): its chimney stacks run
  // down a party wall to the lower roof in front of it, its flat-roof items stand on the roofs
  const roofsKit = roofCollector();
  analyseBuildings(doc, buf, roads, feats, { kit, roofs: roofsKit });
  const rk = roofsKit.finish(), stacks = [], cols = [];
  const S = rk.pieces.stack, ST = rk.stride;
  for (let o = 0; S && o < S.length; o += ST) {
    // a unit box (x, z +-0.5, y 0..1) under the matrix: X = t * w, Y = up * H, Z = n * d, origin = the foot's centre
    const w = Math.hypot(S[o], S[o + 2]), H = S[o + 5], d = Math.hypot(S[o + 8], S[o + 10]);
    stacks.push({ x: S[o + 12], z: S[o + 14], tx: S[o] / w, tz: S[o + 2] / w, w, d, y0: S[o + 13], y1: S[o + 13] + H + 0.35 });
  }
  for (let o = 0; o < rk.cols.length; o += 5) cols.push(Array.from(rk.cols.subarray(o, o + 5)));
  const roofAt = (bi, x, z) => {
    const b = doc.buildings[bi];
    let best = -Infinity;
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) {
      const a = I[t * 3] * 3, c = I[t * 3 + 1] * 3, e = I[t * 3 + 2] * 3;
      const ax = P[a], az = P[a + 2], bx = P[c], bz = P[c + 2], cx = P[e], cz = P[e + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      best = Math.max(best, l1 * P[a + 1] + l2 * P[c + 1] + l3 * P[e + 1]);
    }
    return best;
  };
  const roofOf = (x, z) => {
    let best = null;
    doc.buildings.forEach((b, bi) => {
      if (!pip(x, z, b.footprint[0])) return;
      let y = roofAt(bi, x, z);
      if (y === -Infinity) y = b.top;
      if (!best || y > best.y) best = { bi, y };
    });
    return best;
  };
  const openings = (f) => faceOpenings({ width: f.width, eaves: f.eaves, partyH: f.partyH, street: f.street, rnd: f.rnd, landmark: f.landmark,
    shop: f.shopW, shopU: f.shopU, type: f.type, garage: f.garage });
  const out = { T, faces, buildings: doc.buildings, roofAt, roofOf, openings, solidId, stacks, cols };
  cache.set(T, out);
  return out;
}
