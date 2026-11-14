// THE ROAD TUNNELS UNDER THE LINKEBEEK RAILWAY EMBANKMENTS (docs/trains/TUNNELS.md): Kleindalstraat under the L124 (E10)
// and Rue de la Brasserie / Brouwerijstraat under the L26 (D9), OSM tunnel=yes under 16-21 m of embankment.
// The models (tools/blender/railTunnel.py -> models/rail/tunnel_<name>.glb / .json / _ao.png) are the portals, wing walls
// and the brick barrel; THIS module is what the tile worker does to the city's ground so the road can go through:
//
//   the terrain is a height field: it cannot hold a tunnel. Each grid cell is classed (tunnel frame: X along the road,
//   Y to its left, from the json):
//     ROAD  the clear approach between the wing walls, in front of the portal faces: ground at the road level (- 2 cm)
//     LID   the barrel's corridor (|X| <= L/2, |Y| <= r + 0.3): the walk / drive / road-engine ground at the road level,
//           but the DRAWN terrain is the earth over the barrel (the DTM, at least the vault's top + 0.9 m, the headwalls'
//           tops near the portals, under the ballast): the "lid" (the tunnel is under the drawn ground)
//     KEPT  the earth the walls retain: at the wall's top (under its coping) within the wall's thickness, then the DTM,
//           clamped to slopes of 1:1.5 down / 2:1 up from there (no earth over a coping, no hole behind it)
//   a 1:1 bank (lower only) round the approaches past the wing tips.
//   The DRAWN terrain cannot step from the road to a wall's top within one 1 m cell either: every terrain triangle with a
//   ROAD corner and a LID / KEPT corner is CLIPPED at the wall's face (the road part keeps the road heights) and at the
//   wall's back (the earth part keeps its heights); the band between is inside the masonry (wall + coping) and dropped.
//   (the JOINS rule: the ground meets the wall at its face, the earth meets it under its coping, no floating edge.)
//
// Worker:  loadTunnels(base) -> [json]; tunnelRoads(roads, tunnels) (the lanes through the bores); tunnelCut(tunnels,
//          hm, hdr) -> cut (before the road stage); tunnelGround(cut, ground) (the road stage's ground);
//          tunnelTrees(tunnels, trees) (no LiDAR tree in the streets, none over a bore); tunnelTerrain(cut, terrain, hm, railDoc)
//          (the drawn lid + clipping, before the terrain's simplification).
// Page:    viewer/rail/tunnelModel.js (the models, LODs, lamps, colliders). Switch: ?tunnels=0 (none of this).
import { tracksIn, CREST, BED, CREST_HW, FOOT_HW, CORRIDOR } from "./railData.js";

export const TUNNELS = ["kleindal", "brasserie"];
export const TUNNEL_ROOTS = TUNNELS.map((n) => `tunnel-${n}`);
export const tunnelsOn = () => typeof location === "undefined" || new URLSearchParams(location.search).get("tunnels") !== "0";

const ROAD = 1, LID = 2, KEPT = 3;
const UNDER = 0.02;           // m: the cut ground under the road's level (the road engine draws the road on it)
const COVER = 0.9;            // m: the least earth over the vault's crown (the drawn lid)
const BANK = 6;               // m: the bank round the approaches past the wing tips (1:1, lower only)
const ZONE = 12;              // m: how far behind a wall its retained earth is shaped

let docsP = null;
/** the tunnels' notes (models/rail/tunnel_<name>.json), fetched once per worker; [] when missing */
export const loadTunnels = (base) => (docsP ??= Promise.all(TUNNELS.map((n) => fetch(new URL(`../../models/rail/tunnel_${n}.json`, base))
  .then((r) => (r.ok ? r.json() : null)).catch(() => null))).then((a) => a.filter(Boolean).map(frame)));

/** the tunnel's frame: world (x, z) <-> local (X along the road, Y left); road(X) = the road level (m TAW) */
export function frame(t) {
  const th = -t.placement.rotation_y_rad, ux = Math.cos(th), uz = Math.sin(th), vx = Math.sin(th), vz = -Math.cos(th);
  const [px, py, pz] = t.placement.city_local_position;
  const L = t.barrel.length;
  const toLocal = (x, z) => { const dx = x - px, dz = z - pz; return [dx * ux + dz * uz, dx * vx + dz * vz]; };
  const toWorld = (X, Y) => [px + ux * X + vx * Y, pz + uz * X + vz * Y];
  const road = (X) => py + t.grade * X;
  // the walls, in local metres: the two portal faces (the lid / headwall behind them) and the four wings
  const walls = [];
  for (const p of t.portals) {
    const s = p.sign, W = p.width / 2;
    // face line from (X0, -W) to (X0, W); "back" = towards the barrel (-sign along X)
    walls.push({ kind: "face", portal: p, a: [p.X, -W], b: [p.X, W], n: [-s, 0], thick: p.thick, top: () => p.wallTop - 0.1 });
  }
  for (const w of t.wings) {
    walls.push({ kind: "wing", wing: w, a: w.p0, b: w.p1, n: w.back, thick: w.thick, top: (u) => w.top0 + (w.top1 - w.top0) * Math.max(0, Math.min(1, u)) - 0.1 });
  }
  for (const w of walls) { const dx = w.b[0] - w.a[0], dy = w.b[1] - w.a[1]; w.len = Math.hypot(dx, dy); w.d = [dx / w.len, dy / w.len]; }
  // the clear approach polygons (local), one per portal: face corners -> wing tips
  const approach = t.portals.map((p, i) => {
    const wl = t.wings.filter((w) => w.portal === i), L1 = wl.find((w) => w.side === 1), R1 = wl.find((w) => w.side === -1);
    return [L1.p0, L1.p1, R1.p1, R1.p0];
  });
  const r = t.barrel.r, Wmax = Math.max(...t.portals.map((p) => p.width / 2));
  // world box of everything touched
  const pts = [...t.wings.flatMap((w) => [w.p0, w.p1]), [-L / 2, -Wmax], [L / 2, Wmax], [-L / 2, Wmax], [L / 2, -Wmax]];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [X, Y] of pts) for (const [dX, dY] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const [x, z] = toWorld(X + dX * (ZONE + BANK), Y + dY * (ZONE + BANK));
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  return { ...t, toLocal, toWorld, road, walls, approach, L, r, Wmax, box: { x0, x1, z0, z1 } };
}

const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
function distPoly(P, x, y) {
  let d = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    d = Math.min(d, Math.hypot(x - ax - dx * u, y - ay - dy * u));
  }
  return d;
}

/** wall-relative coordinates of a local point: u in [0, 1] along it, dd = metres behind its face (+) */
const wallUV = (w, X, Y) => {
  const rx = X - w.a[0], ry = Y - w.a[1];
  return [(rx * w.d[0] + ry * w.d[1]) / w.len, rx * w.n[0] + ry * w.n[1]];
};

/** Class a local point of one tunnel: { cls, wall, lo, hi } (the earth's bounds behind the walls that reach it) */
function classify(t, X, Y) {
  const L2 = t.L / 2;
  // the barrel's corridor: under the lid
  if (Math.abs(X) <= L2 && Math.abs(Y) <= t.r + 0.3) return { cls: LID, wall: Math.abs(X - t.portals[0].X) < Math.abs(X - t.portals[1].X) ? 0 : 1 };
  // the approaches (in front of a face, between the wings)
  for (let i = 0; i < t.approach.length; i++) {
    const p = t.portals[i];
    if ((X - p.X) * p.sign > 0 && inPoly(t.approach[i], X, Y)) return { cls: ROAD, portal: i };
  }
  // behind the walls (their retained earth): the bounds of every wall reaching the point
  let lo = -Infinity, hi = Infinity, wall = -1, best = Infinity, under = null;
  t.walls.forEach((w, k) => {
    const [u, dd] = wallUV(w, X, Y);
    // a headwall's earth also reaches 6 m past its ends (falling 1:2 sideways: the bank beside it, over a wing's root)
    const ext = w.kind === "face" ? 6 / w.len : 0.6 / w.len;
    if (u < -ext || u > 1 + ext || dd < 0 || dd > ZONE) return;
    if (w.kind === "face" && Math.abs(X) > L2) return;               // a face's earth is behind it, inside the portal
    const past = w.kind === "face" ? Math.max(0, -u, u - 1) * w.len : 0;
    const top = w.top(u) - 0.5 * past;
    if (dd <= w.thick) { lo = Math.max(lo, top); hi = Math.min(hi, top); }
    else { lo = Math.max(lo, top - (dd - w.thick) / 1.5); hi = Math.min(hi, top + 2 * (dd - w.thick)); }
    if (dd < best) { best = dd; wall = k; }
    if (w.kind === "wing" && dd <= w.thick && u >= 0 && u <= 1) under = top;   // under a wing's coping: the wing's top wins
  });
  if (under != null) { lo = under; hi = under; }
  if (wall >= 0) return { cls: KEPT, wall, lo, hi };
  // beside the barrel, beyond the headwalls' reach: the embankment as the DTM has it (kept: the road stage's carve may
  // not dig its shoulder cells next to the bore's road into it)
  if (Math.abs(X) <= L2 && Math.abs(Y) <= t.r + 3) return { cls: KEPT, wall: Math.abs(X - t.portals[0].X) < Math.abs(X - t.portals[1].X) ? 0 : 1, lo: -Infinity, hi: Infinity };
  return null;
}

/**
 * THE CUT, before the road stage (it samples the ground): hm.y (drawn + walk + drive) and hm.orig (the road engine's
 * ground) in place. Returns the state the later steps need (null when no tunnel touches the tile).
 */
export function tunnelCut(tunnels, hm, hdr) {
  const { x0, z0, cols, rows, step } = hdr;
  const gx1 = x0 + (cols - 1) * step, gz1 = z0 + (rows - 1) * step;
  const near = (tunnels || []).filter((t) => t.box.x1 >= x0 && t.box.x0 <= gx1 && t.box.z1 >= z0 && t.box.z0 <= gz1);
  if (!near.length) return null;
  const cls = new Uint8Array(cols * rows), owner = new Int8Array(cols * rows).fill(-1), wallOf = new Int8Array(cols * rows).fill(-1);
  const lid = new Map();                    // cell -> the drawn lid's height (before the ballast)
  const level = new Map();                  // ROAD / LID cell -> the street's ground (re-applied after the rail's carve)
  const kept = new Map();                   // cell -> the retained earth's height (the road stage's carve may lower its
                                            // shoulder cells next to the bore: the DRAWN earth keeps this)
  const dtm = new Map();                    // cell -> the ground before the cut
  let moved = 0;
  near.forEach((t) => {
    const ti = tunnels.indexOf(t);
    const c0 = Math.max(0, Math.floor((t.box.x0 - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((t.box.x1 - x0) / step));
    const r0 = Math.max(0, Math.floor((t.box.z0 - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((t.box.z1 - z0) / step));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const k = r * cols + c, x = x0 + c * step, z = z0 + r * step;
      const [X, Y] = t.toLocal(x, z);
      const q = classify(t, X, Y);
      const g = hm.orig[k];
      if (!q) {
        // the bank round the approaches past the wing tips (lower only)
        let d = Infinity;
        t.approach.forEach((P, i) => { if ((X - t.portals[i].X) * t.portals[i].sign > 0) d = Math.min(d, distPoly(P, X, Y)); });
        if (d > BANK) continue;
        const target = t.road(X) - UNDER + d;
        if (g > target) { dtm.set(k, g); for (const G of [hm.y, hm.orig]) if (G[k] > target) G[k] = target; moved++; }
        continue;
      }
      dtm.set(k, g);
      cls[k] = q.cls; owner[k] = ti;
      const zr = t.road(X) - UNDER;
      if (q.cls === ROAD || q.cls === LID) {
        wallOf[k] = q.cls === LID ? q.wall : -1;
        hm.y[k] = zr; hm.orig[k] = zr; level.set(k, zr); moved++;
        if (q.cls === LID) {
          // the earth over the barrel: the DTM, at least COVER over the crown, at the headwall's top within its thickness,
          // no higher than the 1:1 slope rising from it (the portal's earth line)
          let lo = t.road(X) + t.barrel.crown + COVER, hi = Infinity;
          for (const p of t.portals) {
            const dd = (p.X - X) * p.sign;                          // metres behind this face
            const top = t.road(X) + p.wallTop - 0.1;
            if (dd <= p.thick) { lo = Math.max(lo, top); hi = Math.min(hi, top); }
            else { hi = Math.min(hi, top + 2 * (dd - p.thick)); }
          }
          lid.set(k, Math.min(Math.max(g, lo), Math.max(hi, lo)));
        }
      } else {
        wallOf[k] = q.wall;
        const zb = t.road(X);
        const lo = zb + q.lo, hi = zb + q.hi;
        const v = Math.min(Math.max(g, lo), Math.max(hi, lo));
        hm.y[k] = v; hm.orig[k] = v; kept.set(k, v); moved++;
      }
    }
  });
  return { tunnels, near, hdr, cls, owner, wallOf, lid, kept, level, dtm, moved };
}

/** After the rail's carve (railData.js carveGrid): its embankment fill (a track over the ground off a bridge gets a 1:1.5
 *  fill) filled the bores again under the line: the street's ground back where it was raised. Returns cells reset. */
export function tunnelRecut(cut, hm) {
  if (!cut) return 0;
  let n = 0;
  for (const [k, v] of cut.level) if (hm.y[k] > v) { hm.y[k] = v; n++; }
  return n;
}

/** The road stage's ground: the road level through the barrels and the approaches (any tile's grid: the neighbours'
 *  padded ground included), else ground(x, z). */
export function tunnelGround(tunnels, ground) {
  if (!tunnels?.length) return ground;
  return (x, z) => {
    for (const t of tunnels) {
      if (x < t.box.x0 || x > t.box.x1 || z < t.box.z0 || z > t.box.z1) continue;
      const [X, Y] = t.toLocal(x, z);
      const q = classify(t, X, Y);
      if (q && (q.cls === ROAD || q.cls === LID)) return t.road(X) - UNDER;
    }
    return ground(x, z);
  };
}

/** The LiDAR trees round the tunnels: none in the streets through the approaches (1 m round them); the ones over a bore
 *  (they would stand on the street's ground, inside it) moved sideways off the barrel's corridor, onto the earth beside it
 *  (no bare stripe along the embankment where the bore runs). Returns the new list. */
export function tunnelTrees(tunnels, trees) {
  const out = [];
  for (const tr of trees || []) {
    let keep = tr;
    for (const t of tunnels || []) {
      if (tr.x < t.box.x0 || tr.x > t.box.x1 || tr.z < t.box.z0 || tr.z > t.box.z1) continue;
      const [X, Y] = t.toLocal(tr.x, tr.z);
      const road = t.approach.some((P, i) => (X - t.portals[i].X) * t.portals[i].sign > -1 && (inPoly(P, X, Y) || distPoly(P, X, Y) < 1));
      if (road) { keep = null; break; }
      const half = t.r + 1.3;
      if (Math.abs(X) <= t.L / 2 + 0.5 && Math.abs(Y) <= half) {
        if (Math.abs(X) > t.L / 2 - 2.5) { keep = null; break; }       // behind a headwall's top: none
        const [x, z] = t.toWorld(X, (Y >= 0 ? 1 : -1) * (half + 0.3));
        keep = { ...tr, x, z };
      }
    }
    if (keep) out.push(keep);
  }
  return out;
}

/** The lanes through the bores (the json's lanes on its OSM ways: the engine's type defaults are 12-16 m wide) */
export function tunnelRoads(roadsDoc, tunnels) {
  let n = 0;
  for (const t of tunnels || []) for (const r of roadsDoc.roads || []) {
    if (!t.roads.includes(r.meta?.osm)) continue;
    r.lanes = JSON.parse(JSON.stringify(t.lanes)); n++;
  }
  return n;
}

/**
 * THE DRAWN TERRAIN (terrain = { pos, nrm, idx } of tileData.js terrainArrays, BEFORE the simplification): the lid's
 * heights (with the ballast's carve), normals again round the tunnels, and the triangles from the road to a wall's
 * earth clipped at the wall's face and back (the band between, inside the masonry, dropped). Returns counts.
 */
export function tunnelTerrain(cut, terrain, hm, railDoc = null, bounds = null) {
  if (!cut) return null;
  const { cls, owner, wallOf, lid, kept, tunnels } = cut;
  const { x0, z0, cols, rows, step } = cut.hdr;
  const H = new Float32Array(cols * rows);
  for (let k = 0; k < H.length; k++) H[k] = terrain.pos[k * 3 + 1];
  // the lid: under the ballast as carveGrid leaves the line's ground (6 cm under its surface)
  const tracks = railDoc && bounds ? tracksIn(railDoc, bounds, CORRIDOR + 1) : [];
  const platforms = (railDoc?.platforms || []).filter((pf) => pf.ring.some(([x, z]) => cut.near.some((t) => x >= t.box.x0 - 50 && x <= t.box.x1 + 50 && z >= t.box.z0 - 50 && z <= t.box.z1 + 50)));
  for (const [k, v0] of [...lid, ...kept]) {
    let v = v0;
    const px = x0 + (k % cols) * step, pz = z0 + Math.floor(k / cols) * step;
    for (const t of tracks) {
      const P = t.pts;
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i], dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1e-9;
        const u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[2]) * dz) / L2));
        const d = Math.hypot(px - a[0] - dx * u, pz - a[2] - dz * u);
        if (d > CORRIDOR) continue;
        const rt = a[1] + (b[1] - a[1]) * u;
        const surf = d < CREST_HW ? rt + CREST : d < FOOT_HW ? rt + CREST + (BED - CREST) * (d - CREST_HW) / (FOOT_HW - CREST_HW) : rt + BED;
        v = Math.min(v, surf - 0.06);
      }
    }
    for (const pf of platforms) if (inPoly(pf.ring, px, pz)) v = Math.min(v, pf.top - 0.1);   // under a platform's slab (Linkebeek station)
    H[k] = v; terrain.pos[k * 3 + 1] = v;
  }
  // normals from the drawn heights round the tunnels
  const touched = new Set([...cut.dtm.keys()]);
  for (const k of touched) {
    const r = Math.floor(k / cols), c = k % cols;
    const cl = Math.max(c - 1, 0), cr = Math.min(c + 1, cols - 1), ru = Math.max(r - 1, 0), rd = Math.min(r + 1, rows - 1);
    const hx = (H[r * cols + cr] - H[r * cols + cl]) / ((cr - cl) * step), hz = (H[rd * cols + c] - H[ru * cols + c]) / ((rd - ru) * step);
    const L = Math.hypot(hx, 1, hz);
    terrain.nrm[k * 3] = -hx / L; terrain.nrm[k * 3 + 1] = 1 / L; terrain.nrm[k * 3 + 2] = -hz / L;
  }
  // clip the triangles from the road to a wall's earth
  const idx = terrain.idx, out = [], newPos = [], newNrm = [];
  let nv = terrain.pos.length / 3, clipped = 0, dropped = 0;
  const vmap = new Map();
  const addV = (key, x, y, z, nk) => {
    let v = vmap.get(key);
    if (v !== undefined) return v;
    v = nv++; vmap.set(key, v);
    newPos.push(x, y, z); newNrm.push(terrain.nrm[nk * 3], terrain.nrm[nk * 3 + 1], terrain.nrm[nk * 3 + 2]);
    return v;
  };
  for (let t3 = 0; t3 < idx.length; t3 += 3) {
    const v = [idx[t3], idx[t3 + 1], idx[t3 + 2]];
    const c = v.map((k) => cls[k]);
    const hasRoad = c.includes(ROAD), earth = v.filter((k, i) => c[i] === LID || c[i] === KEPT);
    if (!hasRoad || !earth.length || v.some((k, i) => cls[k] && owner[k] !== owner[v.find((q) => cls[q])])) { out.push(...v); continue; }
    const tn = tunnels[owner[earth[0]]];
    // the wall: the earth corner's (the nearest to the road corners when they differ)
    // the wall the triangle's road corners face: the nearest face line in front of which they stand, within its length
    // (beside a headwall's end the earth is the headwall's, but the road meets the wing there)
    let wk = -1, bestF = -Infinity;
    const roadK = v.filter((k) => cls[k] === ROAD);
    tn.walls.forEach((w2, i) => {
      let fmin = Infinity, ok = true;
      for (const k of roadK) {
        const [X, Y] = tn.toLocal(terrain.pos[k * 3], terrain.pos[k * 3 + 2]);
        const [u, f] = wallUV(w2, X, Y);
        if (u < -0.15 || u > 1.15 || f > 0.05 || f < -1.6) { ok = false; break; }
        fmin = Math.min(fmin, f);
      }
      if (ok && fmin > bestF) { bestF = fmin; wk = i; }
    });
    if (wk < 0) wk = wallOf[earth[0]];
    if (wk < 0) { out.push(...v); continue; }
    const w = tn.walls[wk];
    const f = v.map((k) => { const [X, Y] = tn.toLocal(terrain.pos[k * 3], terrain.pos[k * 3 + 2]); return wallUV(w, X, Y)[1]; });      // metres behind the face
    const back = w.thick - 0.05;
    clipped++;
    // the road part (f <= 0): the road corners' heights; points on the face: the road corner's height
    const clipPart = (keep, edgeHeight, tag) => {
      const poly = [];
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3, a = v[i], b = v[j], fa = f[i], fb = f[j];
        if (keep(fa)) poly.push(a);
        if (keep(fa) !== keep(fb)) {
          const lim = tag === 0 ? 0 : back, s = (lim - fa) / (fb - fa);
          const x = terrain.pos[a * 3] + (terrain.pos[b * 3] - terrain.pos[a * 3]) * s, z = terrain.pos[a * 3 + 2] + (terrain.pos[b * 3 + 2] - terrain.pos[a * 3 + 2]) * s;
          const [hy, nk] = edgeHeight(a, b, s);
          poly.push(addV(`${Math.min(a, b)}_${Math.max(a, b)}_${tag}`, x, hy, z, nk));
        }
      }
      for (let i = 1; i + 1 < poly.length; i++) out.push(poly[0], poly[i], poly[i + 1]);
      return poly.length;
    };
    const roadH = (a, b, s) => (cls[a] === ROAD ? [H[a], a] : cls[b] === ROAD ? [H[b], b] : [H[a] + (H[b] - H[a]) * s, a]);
    const earthH = (a, b, s) => (cls[a] !== ROAD && cls[b] !== ROAD ? [H[a] + (H[b] - H[a]) * s, a] : cls[a] !== ROAD ? [H[a], a] : [H[b], b]);
    const n1 = clipPart((fv) => fv <= 0, roadH, 0), n2 = clipPart((fv) => fv >= back, earthH, 1);
    if (n1 < 3 && n2 < 3) dropped++;
  }
  if (newPos.length) {
    const P = new Float32Array(terrain.pos.length + newPos.length); P.set(terrain.pos); P.set(newPos, terrain.pos.length);
    const N = new Float32Array(terrain.nrm.length + newNrm.length); N.set(terrain.nrm); N.set(newNrm, terrain.nrm.length);
    terrain.pos = P; terrain.nrm = N;
  }
  terrain.idx = Uint32Array.from(out);
  return { lid: lid.size, clipped, dropped, added: newPos.length / 3 };
}

/** The ground the line's fences stand on (railData.js fenceMesh): over a bore, the drawn earth (the lid), not the
 *  street's ground under it */
export function tunnelSurface(cut, surface) {
  if (!cut) return surface;
  const { x0, z0, cols, rows, step } = cut.hdr;
  return (x, z) => {
    const c = Math.round((x - x0) / step), r = Math.round((z - z0) / step);
    if (c >= 0 && r >= 0 && c < cols && r < rows) { const v = cut.lid.get(r * cols + c); if (v !== undefined) return v; }
    return surface(x, z);
  };
}

/** The fences' car colliders (railData.js railFences rings) broken over the bores: a wall ring has no bottom, the car
 *  in the bore under the line was stopped by the fence 20 m over it (the drawn fence stays, on the lid) */
export function tunnelFenceRings(tunnels, fences) {
  const W = 0.12 / 2;                                    // railData.js FENCE_W / 2
  const over = (x, z) => (tunnels || []).some((t) => { const [X, Y] = t.toLocal(x, z); return Math.abs(X) <= t.L / 2 + 0.5 && Math.abs(Y) <= t.r + 1.0; });
  const rings = [];
  for (const run of fences.lines) {
    let cur = [];
    const flush = () => {
      if (cur.length >= 2) rings.push([...cur.map((q) => [q[0] + q[2] * W, q[1] + q[3] * W]), ...cur.map((q) => [q[0] - q[2] * W, q[1] - q[3] * W]).reverse()]);
      cur = [];
    };
    for (const q of run) { if (over(q[0], q[1])) flush(); else cur.push(q); }
    flush();
  }
  return rings;
}
