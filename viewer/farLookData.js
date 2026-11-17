// THE FAR CITY'S BUILDINGS, worker side (docs/FARCITY.md; ?farlook=old = the flat-coloured solids of before). Pure JS,
// no three.js: runs in the tile worker (tileData.js buildLiteData) and in node.
//
// The far tiles drew the UrbIS LoD2 solids flat-coloured per building (one RGB per vertex, no windows, no base
// darkening): from the falcon's height and the overview they read as plain boxes next to the near city's façades. Now
// every wall triangle carries the SAME wall-local coordinates the near façade shader reads (facadeGeom.js
// analyseBuildings, simplified): the triangles of a building grouped into planar faces, u along the face from its left
// end (seen from outside), the face's width, the height over the building's base and the face's own eaves line
// (sampled like the near one, docs/STOREYS.md); plus the building's wall style / type (buildingTypes.js classify, the
// same draw as the full tile) and its hash. viewer/farLook.js then paints the type's window grid, colour, plinth and
// base darkening with a few box-filtered pulses. Roof triangles carry their real (orthophoto) colour and a flat flag.
//
// Per vertex (non-indexed triangles, flat normals):
//   aFA  walls: (u, face width, h over base, face eaves over base)      roofs: (r, g, b, flat 0 / 1)
//   aFB  walls: (style, party height over base (0 none, 999 a separate neighbour), type + 8 gable, rnd)
//        roofs: (style, -1, 0, rnd)
// Left out against the near analysis (cheap at 150 m and more): the ground fit (the base is UrbIS's), the street /
// door / shop flags, the façade kit, cornice and detail geometry.
import { hash01, wallStyle } from "./facadeGeom.js";
import { classify, TYPE, typedStyle } from "./buildingTypes.js";

const PROBE = 0.35;

function pip(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** doc: buildings.json (after hideBuildings), P / I: buildings.bin; opts.styles === false: the generic façade (no types);
 *  opts.looks: the curated looks (data/overrides.json buildingLooks, as the full tile: style, type, roof colour) */
export function farBuildings(doc, P, I, opts = {}) {
  const B = doc.buildings;
  const cls = opts.styles !== false ? classify(doc, P, I, (b, key) => wallStyle(hash01(key + "s"), b.height)) : null;
  // footprints for the party probes (25 m cells)
  const cell = 25, grid = new Map();
  const box = B.map((b) => {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of b.footprint[0]) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    return [x0, z0, x1, z1];
  });
  box.forEach(([x0, z0, x1, z1], bi) => {
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) {
      const k = i * 100003 + j; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(bi);
    }
  });
  const otherAt = (x, z, bi) => {
    let best = -1;
    for (const o of grid.get(Math.floor(x / cell) * 100003 + Math.floor(z / cell)) || []) {
      if (o === bi) continue;
      const [x0, z0, x1, z1] = box[o];
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && pip(x, z, B[o].footprint[0]) && (best < 0 || B[o].top > B[best].top)) best = o;
    }
    return best;
  };
  let n = 0;
  for (const b of B) n += b.walls.count + b.roof.count;
  const pos = new Float32Array(n * 9), nrm = new Float32Array(n * 9), fa = new Float32Array(n * 12), fb = new Float32Array(n * 12);
  let q = 0;
  const emit = (p, nn, A, Bv) => {
    for (let k = 0; k < 3; k++) {
      pos.set(p[k], q * 3); nrm.set(nn, q * 3);
      fa.set(A(p[k]), q * 4); fb.set(Bv, q * 4);
      q++;
    }
  };
  const tri = (t) => {
    const p = [0, 1, 2].map((k) => { const i = I[t * 3 + k] * 3; return [P[i], P[i + 1], P[i + 2]]; });
    const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2], wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, L = Math.hypot(nx, ny, nz) || 1;
    return { p, n: [nx / L, ny / L, nz / L] };
  };
  const stats = { faces: 0, party: 0, walls: 0, roofs: 0, types: [0, 0, 0, 0, 0, 0, 0, 0] };
  B.forEach((b, bi) => {
    const key = String(b.attrs?.BU_ID ?? b.id), landmark = !!b.attrs?._landmark;
    const base = b.base, eaves = (b.eaves ?? b.top) - base;
    const rnd = hash01(key);
    let ext = 0;
    if (landmark) {
      const xs = b.footprint[0].map((v) => v[0]), zs = b.footprint[0].map((v) => v[1]);
      ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    }
    // (cortenbosch2) the curated looks as the full tile (facadeGeom.js): far, the Cortenbosch houses kept their generated look
    const look = opts.looks?.[b.id.split("/").pop()];
    const btype = look?.type != null && cls ? look.type : cls && !landmark ? cls.type[bi] : TYPE.GENERIC;
    const style = (cls && typedStyle(btype, look, key)) ?? (look?.style != null ? look.style : landmark ? (ext < 11 && b.height > 16 ? 6.25 : 6) : cls ? cls.style[bi] : wallStyle(hash01(key + "s"), b.height));
    stats.types[btype]++;
    // ---- walls: planar faces (as facadeGeom.js: ~3 degrees, 25 cm, then merged along one plane)
    const faces = new Map();
    for (let t = b.walls.first; t < b.walls.first + b.walls.count; t++) {
      const tr = tri(t), [nx, , nz] = tr.n, h = Math.hypot(nx, nz);
      if (h < 1e-6) continue;
      const d = (tr.p[0][0] * nx + tr.p[0][2] * nz) / h;
      const k = `${Math.round(Math.atan2(nz, nx) * 20)}|${Math.round(d * 4)}`;
      let f = faces.get(k); if (!f) faces.set(k, (f = { tris: [], nx: nx / h, nz: nz / h }));
      f.tris.push(tr);
    }
    const fl = [...faces.values()];
    for (const f of fl) {
      const tx = -f.nz, tz = f.nx;
      let u0 = Infinity, u1 = -Infinity, dd = 0, k = 0;
      for (const { p } of f.tris) for (const v of p) { const uu = v[0] * tx + v[2] * tz; u0 = Math.min(u0, uu); u1 = Math.max(u1, uu); dd += v[0] * f.nx + v[2] * f.nz; k++; }
      f.u0 = u0; f.u1 = u1; f.d = dd / k;
    }
    for (let i = 0; i < fl.length; i++) {
      const a = fl[i]; if (a.dead) continue;
      for (let j = i + 1; j < fl.length; j++) {
        const c = fl[j]; if (c.dead) continue;
        if (a.nx * c.nx + a.nz * c.nz < 0.9985 || Math.abs(a.d - c.d) > 0.3) continue;
        if (c.u0 > a.u1 + 0.15 || a.u0 > c.u1 + 0.15) continue;
        a.tris.push(...c.tris); a.u0 = Math.min(a.u0, c.u0); a.u1 = Math.max(a.u1, c.u1); c.dead = true; j = i;
      }
    }
    const ring = b.footprint[0];
    for (const f of fl) {
      if (f.dead) continue;
      let mx = 0, mz = 0, k = 0;
      for (const { p } of f.tris) for (const v of p) { mx += v[0]; mz += v[2]; k++; }
      mx /= k; mz /= k;
      if (pip(mx + f.nx * 0.5, mz + f.nz * 0.5, ring) && !pip(mx - f.nx * 0.5, mz - f.nz * 0.5, ring)) { f.nx = -f.nx; f.nz = -f.nz; }
      const tx = -f.nz, tz = f.nx;                  // left to right seen from outside
      let u0 = Infinity, u1 = -Infinity, top = -Infinity;
      for (const { p } of f.tris) for (const v of p) { const uu = v[0] * tx + v[2] * tz; u0 = Math.min(u0, uu); u1 = Math.max(u1, uu); top = Math.max(top, v[1]); }
      const width = u1 - u0;
      // the face's own eaves (docs/STOREYS.md): the lowest point of its top edge, only where it rises over the building's
      let topMin = Infinity;
      if (!landmark && top > (b.eaves ?? b.top) + 0.05 && opts.storeys !== false) {
        const T2 = f.tris.map(({ p }) => p.map((v) => [v[0] * tx + v[2] * tz, v[1]]));
        for (let uu = u0 + 0.2; uu <= u1 - 0.2 + 1e-6; uu += 0.4) {
          let hi = -Infinity;
          for (const t of T2) for (let e = 0; e < 3; e++) {
            const A = t[e], C = t[(e + 1) % 3];
            if ((A[0] - uu) * (C[0] - uu) > 0) continue;
            const y = Math.abs(C[0] - A[0]) < 1e-6 ? Math.max(A[1], C[1]) : A[1] + (C[1] - A[1]) * (uu - A[0]) / (C[0] - A[0]);
            if (y > hi) hi = y;
          }
          if (hi > -Infinity && hi < topMin) topMin = hi;
        }
      }
      const faceEaves = landmark ? top - base : Number.isFinite(topMin) ? Math.max(eaves, topMin - base) : eaves;
      // party wall: another building 0.35 m outside: a separate house = blind (999), a part of the same building = blind
      // up to its top
      const ob = width > 0.3 ? otherAt(mx + f.nx * PROBE, mz + f.nz * PROBE, bi) : -1;
      const same = ob >= 0 && b.attrs?.BU_ID && B[ob].attrs?.BU_ID === b.attrs.BU_ID;
      const partyH = ob < 0 ? 0 : (same || landmark) ? Math.max(0.01, B[ob].top - base) : 999;
      stats.faces++; if (partyH) stats.party++;
      const gable = top - base > faceEaves + 0.3 ? 1 : 0;      // the face rises over its eaves line (a gable): no eaves band
      const fbv = [style, partyH, btype + 8 * gable, rnd];
      for (const { p, n: nn } of f.tris) emit(p, nn, (v) => [v[0] * tx + v[2] * tz - u0, width, v[1] - base, faceEaves], fbv);
      stats.walls += f.tris.length;
    }
    // ---- roofs: the real colour (as the near roofs: build_roofcolors.py, else the hash's guess) and the flat flag
    const rc = look?.roofColor || b.roofColor || (hash01(key + "r") < 0.4 ? [0.27, 0.085, 0.05] : [0.06, 0.065, 0.075]);
    const rb = [style, -1, 0, rnd];
    for (let t = b.roof.first; t < b.roof.first + b.roof.count; t++) {
      const tr = tri(t), flat = Math.abs(tr.n[1]) > 0.97 ? 1 : 0;
      emit(tr.p, tr.n,() => [rc[0], rc[1], rc[2], flat], rb);
      stats.roofs++;
    }
  });
  const cut = (a, w) => (q * w === a.length ? a : a.slice(0, q * w));
  return { position: cut(pos, 3), normal: cut(nrm, 3), aFA: cut(fa, 4), aFB: cut(fb, 4), stats };
}
