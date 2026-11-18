// THE TRAM PLATFORMS BESIDE THEIR TRACKS (claude/tramfit round 2, rule 32). Pure JS (tile worker, node audits).
//
// Why: tram.js draws an OSM tram platform where OSM puts it: an AREA (a closed way) as its polygon, a LINE as a 2.6 m
// band centred on it. OSM draws many platform lines along the platform's EDGE (or a sloppy area over the track bed),
// and nothing held them off the tracks: 713 m of rail ran under a 25 cm platform slab (688 m after the tracks were
// fitted to the street), the drive surface raised there too.
// What: every tram platform is kept at the real Brussels gap from the track it serves: its track-side edge EDGE m from
// the track centre (a T3000 / T4000 is 2.30 m wide: 1.15 m half width + ~10 cm boarding gap, so the edge is ~0.5 m
// from the rail), never over a rail. The smallest move does it:
//   - a LINE platform (a band, OSM `width` if tagged, else W): each point that brings the band within EDGE of a track
//     slides across, along that track's normal, to touching; a band between two tracks (an island) narrower than the
//     gap allows becomes the gap minus the two clearances, centred (never under MIN_W: then it is left as it was);
//   - an AREA platform: its outline (densified) has every vertex nearer than EDGE to a track (or on the wrong side of
//     it) pushed out to EDGE on the platform's side;
// each point keeps its index (l.osmLine is the outline before, point for point), so what stands on a platform (a STIB
// pole, data/stops `platform: true`) follows it: platformFollow().
const EDGE = 1.25, W = 2.6, MIN_W = 1.2, REACH = 6, STEP = 1;

function densify(line, step) {
  const out = [];
  for (let k = 1; k < line.length; k++) {
    const [ax, az] = line[k - 1], [bx, bz] = line[k];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let s = k === 1 ? 0 : 1; s <= n; s++) out.push([ax + (bx - ax) * s / n, az + (bz - az) * s / n]);
  }
  return out;
}
const isPlat = (l) => l.kind === "platform" && l.tags?.tram === "yes" && l.line?.length >= 2;
const isRing = (L) => L.length >= 4 && Math.hypot(L[0][0] - L[L.length - 1][0], L[0][1] - L[L.length - 1][1]) <= 0.01;
/** a line platform's band width as drawn: the fit's (l.platW), else W (tram.js before) */
export const platformWidth = (l) => l.platW ?? W;
const osmWidth = (l) => { const w = parseFloat(l.tags?.width); return w >= 1.2 && w <= 6 ? w : W; };

/** a grid of the tracks' segments -> near(x, z, r): every track within r as { d (signed, + = left of the track's
 *  direction), nx, nz (its left normal), qx, qz (the nearest point), li } (the nearest point per track) */
function trackIndex(tracks) {
  const grid = new Map(), key = (i, j) => i * 100003 + j, C = 8;
  tracks.forEach((l, li) => { for (let k = 1; k < l.length; k++) {
    const s = [l[k - 1][0], l[k - 1][1], l[k][0], l[k][1], li];
    for (let i = Math.floor((Math.min(s[0], s[2]) - REACH) / C); i <= Math.floor((Math.max(s[0], s[2]) + REACH) / C); i++)
      for (let j = Math.floor((Math.min(s[1], s[3]) - REACH) / C); j <= Math.floor((Math.max(s[1], s[3]) + REACH) / C); j++) { const q = key(i, j); if (!grid.has(q)) grid.set(q, []); grid.get(q).push(s); }
  } });
  return (x, z, r = REACH) => {
    const best = new Map();
    for (const [ax, az, bx, bz, li] of grid.get(key(Math.floor(x / C), Math.floor(z / C))) || []) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; if (L2 < 1e-9) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), qx = ax + dx * t, qz = az + dz * t, dist = Math.hypot(x - qx, z - qz);
      if (dist > r) continue;
      // past a track's end (t clamped) the normal distance is not the distance: such a point is beside nothing
      if ((t === 0 || t === 1) && Math.abs(((x - ax) * dx + (z - az) * dz) / Math.sqrt(L2) - t * Math.sqrt(L2)) > 0.3) continue;
      const L = Math.sqrt(L2), nx = -dz / L, nz = dx / L, d = (x - qx) * nx + (z - qz) * nz;
      const o = best.get(li);
      if (!o || dist < o.dist) best.set(li, { d, dist, nx, nz, qx, qz, li });
    }
    return [...best.values()];
  };
}

/**
 * feats.lines' tram platforms moved beside feats.lines' tram tracks (in place). Returns { platforms, moved, maxMove }.
 */
export function fitPlatforms(feats) {
  const lines = feats.lines || [];
  const tracks = lines.filter((l) => l.kind === "tram" && l.line?.length >= 2).map((l) => l.line);
  const out = { platforms: 0, moved: 0, maxMove: 0 };
  if (!tracks.length) { for (const l of lines) if (isPlat(l)) l.fitted = true; return out; }
  const near = trackIndex(tracks);
  for (const l of lines) {
    if (!isPlat(l)) continue;
    out.platforms++; l.fitted = true;
    const ring = isRing(l.line);
    const P = densify(l.line, STEP), Q = P.map((p) => p.slice());
    let cx = 0, cz = 0; for (const [x, z] of P) { cx += x / P.length; cz += z / P.length; }
    if (ring) {
      // the platform's side of each track = the side its centroid (else the bulk of its outline) lies on
      const side = new Map();
      for (const [x, z] of P) for (const t of near(x, z)) side.set(t.li, (side.get(t.li) || 0) + Math.sign(t.d));
      for (const t of near(cx, cz, REACH * 2)) if (Math.abs(t.d) > 0.3) side.set(t.li, Math.sign(t.d) * 1e6);
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < Q.length; i++) {
        for (const t of near(Q[i][0], Q[i][1])) {
          const s = Math.sign(side.get(t.li) || 1);
          if (t.d * s >= EDGE) continue;
          const m = s * EDGE - t.d;
          Q[i][0] += t.nx * m; Q[i][1] += t.nz * m;
        }
      }
    } else {
      let w = osmWidth(l);
      // which side of each track the platform is on: its points' majority (a point ON a track decides nothing)
      const side = new Map();
      for (const [x, z] of P) for (const t of near(x, z)) if (Math.abs(t.d) > 0.3) side.set(t.li, (side.get(t.li) || 0) + Math.sign(t.d));
      for (let i = 0; i < Q.length; i++) {
        const [x, z] = Q[i], ts = near(x, z);
        if (!ts.length) continue;
        // in the frame of the nearest track's normal n: each track's position along n (pos < 0: on the -n side)
        const t0 = ts.reduce((a, b) => (b.dist < a.dist ? b : a)), nx = t0.nx, nz = t0.nz;
        const pos = ts.map((t) => {
          let v = (t.qx - x) * nx + (t.qz - z) * nz;
          if (Math.abs(v) < 0.3) v = -Math.sign(side.get(t.li) || 1) * Math.sign(t.nx * nx + t.nz * nz || 1) * 0.3;
          return { v, par: Math.abs(t.nx * nx + t.nz * nz) };
        });
        let a = null, b = null;
        for (const q of pos) { if (q.v < 0) { if (!a || q.v > a.v) a = q; } else if (!b || q.v < b.v) b = q; }
        if (a && b && a.par > 0.9 && b.par > 0.9 && b.v - a.v < 2 * EDGE + w) {
          // an island between two tracks: the gap minus the two clearances, centred
          const wi = b.v - a.v - 2 * EDGE;
          if (wi < MIN_W) continue;
          w = Math.min(w, wi);
          const m = (a.v + b.v) / 2;
          Q[i][0] += nx * m; Q[i][1] += nz * m;
          continue;
        }
        const c = EDGE + w / 2;
        let m = 0;
        if (b && b.v < c) m = b.v - c;            // a track on the +n side too close: away from it (-n)
        if (a && -a.v < c) m = a.v + c;           // on the -n side: away (+n)
        Q[i][0] += nx * m; Q[i][1] += nz * m;
      }
      l.platW = w;
    }
    let mv = 0; for (let i = 0; i < P.length; i++) mv = Math.max(mv, Math.hypot(Q[i][0] - P[i][0], Q[i][1] - P[i][1]));
    if (mv > 0.01) {
      out.moved++; out.maxMove = Math.max(out.maxMove, mv);
      l.osmLine = P; l.line = Q;
      if (ring) { l.line[l.line.length - 1] = l.line[0].slice(); }
    }
  }
  out.maxMove = +out.maxMove.toFixed(2);
  return out;
}

/** (x, z) on platform l as drawn (tram.js: an area = its polygon, a line = a platformWidth band)? */
export function onPlatform(l, x, z) {
  const L = l.line;
  if (isRing(L)) {
    let c = false;
    for (let i = 0, j = L.length - 2; i < L.length - 1; j = i++) { const [xi, zi] = L[i], [xj, zj] = L[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; }
    return c;
  }
  const hw = platformWidth(l) / 2;
  for (let k = 1; k < L.length; k++) {
    const [ax, az] = L[k - 1], [bx, bz] = L[k], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-12, t = ((x - ax) * dx + (z - az) * dz) / L2;
    if (t < 0 || t > 1) continue;
    if (Math.abs((x - ax) * dz - (z - az) * dx) / Math.sqrt(L2) <= hw) return true;
  }
  return false;
}

/**
 * A data layer's points that stood on a tram platform (data/stops poles `platform: true`) moved with it: the
 * displacement of the platform's nearest outline point (within 3 m), then onto the slab if that left it off (a line:
 * its centre line; an area: 0.4-1 m in from its outline, where data/stops put it). In place; -> moved count.
 */
export function platformFollow(points, feats) {
  const plats = (feats.lines || []).filter(isPlat);
  let moved = 0;
  if (!plats.some((l) => l.fitted)) return moved;                  // (?tramfit=old: the platforms as OSM, poles as built)
  for (const p of points) {
    if (!p || typeof p.x !== "number") continue;
    let best = null, bd = 3 * 3;
    for (const l of plats) for (let i = 0; i < (l.osmLine || l.line).length; i++) {
      const o = (l.osmLine || l.line)[i], d2 = (o[0] - p.x) ** 2 + (o[1] - p.z) ** 2;
      if (d2 < bd) { bd = d2; best = [l, i]; }
    }
    if (!best) continue;
    const [l, i] = best, O = l.osmLine || l.line, dx = l.line[i][0] - O[i][0], dz = l.line[i][1] - O[i][1];
    const x0 = p.x, z0 = p.z;
    p.x += dx; p.z += dz;
    if (!onPlatform(l, p.x, p.z)) {
      if (!isRing(l.line)) { p.x = l.line[i][0]; p.z = l.line[i][1]; }
      else {
        // (data/stops puts the pole on an area platform's OUTLINE, its "centre line": half off the slab) 0.4 m inside
        let cx = 0, cz = 0; const R = l.line.slice(0, -1); for (const [x, z] of R) { cx += x / R.length; cz += z / R.length; }
        const vx = cx - l.line[i][0], vz = cz - l.line[i][1], L = Math.hypot(vx, vz) || 1;
        for (const k of [0.4, 0.7, 1.0]) { const x = l.line[i][0] + vx / L * k, z = l.line[i][1] + vz / L * k; if (onPlatform(l, x, z)) { p.x = x; p.z = z; break; } }
      }
    }
    if (Math.hypot(p.x - x0, p.z - z0) > 0.01) moved++;
  }
  return moved;
}
