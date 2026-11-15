// WHERE THE POLICE KIT GOES ON A CAR: found on the car's own body mesh (any faceted type, or any pack car with the
// same _KIND contract), by casting rays at its triangles, once per car type (a few ms). Car frame: +y up, +z forward,
// +x = the car's LEFT (the driver's side in Belgium; viewer/drive/carPhysics.js: left = (cos h, -sin h) = local +x).
//   beacon  on the roof, above the driver, ~30 % back from the roof's front edge, its foot on the highest point under
//           it, tilted to the roof's slope
//   cable   from the back of the housing across the roof to the roof edge, over the door frame, into the top of the
//           driver's window (the door-glass top found by walking down the outer skin until it turns to glass)
//   grille  two LED heads just inboard of the head lamps, on the front skin
//   visor   a bar behind the top of the windscreen (inside), facing forward
const KIND = { paint: 1, head: 2, tail: 3, glass: 4, interior: 8 };

export function fitPoliceKit(model) {
  const L = model.lods[0];
  const g = L.body[0].geo;
  const P = g.attributes.position.array, K = g.attributes._kind?.array, I = g.index.array;
  const kindAt = (v) => (K ? Math.round(K[v]) : KIND.paint);
  // the triangles (flat arrays) + their kind, skip the interior (seats show through the glass, not hit by rays)
  const tris = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2], k = kindAt(a);
    if (k === KIND.interior) continue;
    tris.push(a, b, c, k);
  }
  // Möller-Trumbore along an axis (ray origin o, direction d): nearest hit -> { t, k, n } or null
  const hit = (ox, oy, oz, dx, dy, dz, skip = null) => {
    let best = Infinity, bk = -1, bn = null;
    for (let i = 0; i < tris.length; i += 4) {
      const k = tris[i + 3]; if (skip && skip(k)) continue;
      const a = tris[i] * 3, b = tris[i + 1] * 3, c = tris[i + 2] * 3;
      const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
      const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det, tx = ox - P[a], ty = oy - P[a + 1], tz = oz - P[a + 2];
      const u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      const v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt > 1e-5 && tt < best) {
        best = tt; bk = k;
        let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        if (nx * dx + ny * dy + nz * dz > 0) { nx = -nx; ny = -ny; nz = -nz; }   // facing the ray
        bn = [nx, ny, nz];
      }
    }
    return best < Infinity ? { t: best, k: bk, n: bn } : null;
  };
  const TOP = 5;
  const down = (x, z, skip) => { const h = hit(x, TOP, z, 0, -1, 0, skip); return h ? { y: TOP - h.t, k: h.k, n: h.n } : null; };
  const fromLeft = (y, z) => { const h = hit(4, y, z, -1, 0, 0); return h ? { x: 4 - h.t, k: h.k, n: h.n } : null; };
  const fromFront = (x, y) => { const h = hit(x, y, 8, 0, 0, -1); return h ? { z: 8 - h.t, k: h.k, n: h.n } : null; };

  // ---- the roof: the highest skin along the centre line, then its extent where it stays within 4 cm of that
  const [W, H, Lc] = model.size;
  let roofY = -Infinity, roofZ = 0;
  for (let z = -Lc / 2; z <= Lc / 2; z += 0.04) { const d = down(0.1, z); if (d && d.y > roofY) { roofY = d.y; roofZ = z; } }
  let zf = roofZ, zb = roofZ;
  while (zf < Lc / 2) { const d = down(0.1, zf + 0.02); if (!d || d.y < roofY - 0.04 || d.k === KIND.glass) break; zf += 0.02; }
  while (zb > -Lc / 2) { const d = down(0.1, zb - 0.02); if (!d || d.y < roofY - 0.04 || d.k === KIND.glass) break; zb -= 0.02; }
  const roofLen = zf - zb;
  // the beacon: above the driver's head (~30 % back from the roof's front edge, at least 28 cm), 27 cm left of centre
  // (at most to 17 cm inside the roof edge: the magnet must sit fully on the flat panel)
  const bz = zf - Math.max(0.28, roofLen * 0.3);
  let edge = 0.1;
  while (edge < W / 2) { const d = down(edge + 0.01, bz); if (!d || d.y < roofY - 0.05 || d.k === KIND.glass) break; edge += 0.01; }
  const bx = Math.min(0.27, edge - 0.17);
  // foot on the highest skin under the 67 mm magnet, tilted to the roof (slope from four samples 6 cm apart)
  let foot = -Infinity;
  for (let a = 0; a < 12; a++) { const d = down(bx + Math.cos(a / 12 * Math.PI * 2) * 0.064, bz + Math.sin(a / 12 * Math.PI * 2) * 0.064); if (d) foot = Math.max(foot, d.y); }
  const c0 = down(bx, bz); if (c0) foot = Math.max(foot, c0.y);
  const yF = down(bx, bz + 0.06)?.y ?? foot, yB = down(bx, bz - 0.06)?.y ?? foot, yL = down(bx + 0.06, bz)?.y ?? foot, yR = down(bx - 0.06, bz)?.y ?? foot;
  const pitch = -Math.atan2(yF - yB, 0.12);          // rotation.x: nose up when the roof rises toward the front
  const roll = Math.atan2(yL - yR, 0.12);            // rotation.z: + raises... (left higher -> roll positive about +z)
  const beacon = { pos: [bx, foot - 0.0015, bz], pitch, roll };   // the rubber foot squeezes 1.5 mm

  // ---- the cable: out of the back of the housing (toward -z, a bit left), over the roof to its edge, down the side
  const cable = [];
  const sx = bx + 0.03, sz = bz - 0.066;
  cable.push([bx + 0.02, foot + 0.02, bz - 0.06]);
  cable.push([sx + 0.01, foot + 0.006, sz - 0.03]);
  // it runs back-left at an angle, as a cable thrown out of a window; where the side under the roof edge has no door
  // glass (the panel van's box), toward the nearest z that has (the cab), along the roof
  const hasGlass = (z) => { for (let yy = roofY - 0.02; yy > roofY - 1.3; yy -= 0.05) { const s = fromLeft(yy, z); if (s && s.k === KIND.glass) return true; } return false; };
  let cz = sz - 0.10;
  if (!hasGlass(cz)) for (let dz = 0.1; dz < Lc; dz += 0.1) { if (hasGlass(cz + dz)) { cz += dz; break; } if (hasGlass(cz - dz)) { cz -= dz; break; } }
  for (let k = 1; k <= 6; k++) {
    const x = sx + (edge - sx) * (k / 6), z = sz - 0.03 + (cz - sz + 0.03) * (k / 6);
    const d = down(x, z); cable.push([x, (d ? d.y : roofY) + 0.0025, z]);
  }
  // over the edge: follow the outer skin down to the door glass's top edge (where the skin turns to glass)
  const lastRoof = cable[cable.length - 1];
  let y = lastRoof[1] - 0.008, gx = edge, gy = null;
  for (; y > roofY - 1.3; y -= 0.008) {          // (the panel van: its cab window is ~1 m under the box roof)
    const s = fromLeft(y, cz); if (!s || s.x < lastRoof[0] - 0.06) continue;
    cable.push([s.x + 0.0025, y, cz]);
    if (s.k === KIND.glass) { gx = s.x; gy = y; break; }
  }
  // cable.length was pushed every 8 mm: thin it to every ~3 cm (smooth spline) and tuck it in behind the glass edge
  const thin = cable.filter((p, i) => i < 8 || i % 4 === 0);
  if (gy != null) { thin.push([gx - 0.004, gy - 0.006, cz]); thin.push([gx - 0.03, gy - 0.012, cz]); }

  // ---- grille flashers: inboard of each head-lamp cluster (_KIND 2), on the front skin
  let hx0 = Infinity, hx1 = -Infinity, hy = 0, hn = 0, hz = -Infinity;
  for (let v = 0; v < P.length / 3; v++) {
    if (kindAt(v) !== KIND.head || P[v * 3 + 2] < 0) continue;
    const x = P[v * 3];
    if (x > 0) { hx0 = Math.min(hx0, x); } hx1 = Math.max(hx1, x);
    hy += P[v * 3 + 1]; hn++; hz = Math.max(hz, P[v * 3 + 2]);
  }
  hy = hn ? hy / hn : 0.65;
  if (!isFinite(hx0)) hx0 = W * 0.3;
  const gxs = Math.max(0.16, hx0 - 0.075);
  const grille = [1, -1].map((s) => {
    const x = s * gxs, yy = hy - 0.03, f = fromFront(x, yy);
    const n = f?.n || [0, 0, 1];
    return { pos: [x, yy, (f ? f.z : hz) + 0.003], yaw: Math.atan2(n[0], n[2]), side: s > 0 ? "L" : "R" };
  });

  // ---- visor bar: the top of the windscreen on the centre line (the highest height where the front skin is glass)
  let vy = null, vz = null;
  for (let yy = roofY - 0.005; yy > roofY - 0.5; yy -= 0.006) {
    const f = fromFront(0.0, yy);
    if (f && f.k === KIND.glass) { vy = yy; vz = f.z; break; }
  }
  // inside: 4 cm under the glass top, 9 cm behind the glass skin at that height (+ the glass slope)
  const visor = vy != null ? { pos: [0.0, vy - 0.045, vz - 0.11], width: Math.min(0.46, W * 0.26) } : null;

  return { beacon, cable: thin, grille, visor, roof: { y: roofY, front: zf, back: zb, edge }, ms: 0 };
}
