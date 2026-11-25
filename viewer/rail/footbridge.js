// STATION FOOTBRIDGES OVER THE RAILWAY (claude/footbridge, rule footbridge-built, docs/rules/footbridge-built.md; gate
// row `footbridge`). Owner defect list 2026-11-17: "Vivier d'Oie station footbridges (UrbIS 751 / 752)": the station's
// two footbridges were not drawn at all. railData.js drew every UrbIS bridge polygon over the line (ROB / PB) as a flat
// slab at the DTM of its centroid (bare earth: the cutting floor), vivier (2026-11-17) removed the slabs left in the
// cutting, and nothing replaced the two foot bridges: their OSM footways (bridge=yes) and steps were only painted as
// gravel stripes on the ground, down one bank, across the ballast and up the other.
//
// Here (no THREE: the tile worker builds, the page wraps, the node checks read the same functions): each footbridge of
// data/rail/footbridges.json is a list of straight PARTS, each a centre line a -> b of clear width w with its walking
// levels ya / yb (a number, or "ground": the tile's drawn ground there, so the part welds onto the street / path):
//   deck     the span over the tracks: a dark red resin walking surface between two galvanised plate girders (1.3 m
//            over the walk, 0.75 m under it), skirted by concrete walls down into the bank wherever its underside is
//            within SKIRT m of the ground (no gap under a deck end), concrete piers where it crosses a platform
//   stair    concrete treads (rise ~0.17, going from the run), landings, side walls down into the ground (closed, no
//            floating edge), galvanised railings on both sides; optional canopy over its head (grey mono-pitch roof)
//   landing  a flat / gently sloped pad, side walls into the ground, railings where it stands over a drop
// Everything is one triangle soup per tile (groups by material slot: viewer/streets/bridgeDecks.js PLAN_SLOTS + resin,
// galvanised steel), drawn with the road decks' materials, walked via world.decks (footTop) and the third person's BVH
// (the tile's road meshes: the treads are real steps), the catenary capped under the decks (footSoffitCap).

export const FB = { depth: 0.75, girderH: 1.3, girderT: 0.12, rise: 0.17, landing: 1.4, wall: 0.2, railH: 1.0, post: 1.5, skirt: 2.0, sink: 0.3, canopyH: 2.7 };
const PAD = 1.0;
export const FOOT_SLOT = { paving: 1, kerb: 2, concrete: 3, resin: 7, galv: 8 };

const inBox = (b, x, z, m = 0) => x >= b[0] - m && z >= b[1] - m && x <= b[2] + m && z <= b[3] + m;
const ptIn = (ring, x, z) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};

/** a part's frame: unit along (tx, tz), lateral (nx, nz), length L; local (u, v) of a point */
function frame(p) {
  const [ax, az] = p.a, [bx, bz] = p.b, L = Math.hypot(bx - ax, bz - az) || 1, tx = (bx - ax) / L, tz = (bz - az) / L;
  return { ax, az, L, tx, tz, nx: -tz, nz: tx, at: (u, v) => [ax + tx * u - tz * v, az + tz * u + tx * v], loc: (x, z) => [(x - ax) * tx + (z - az) * tz, -(x - ax) * tz + (z - az) * tx] };
}

/** a stair's profile: knots [[u, y], ...] of its walk line (nosing line, flat landings) and its treads [{ u0, u1, y }] */
function stairLayout(p) {
  const F = frame(p), top = Math.max(p.ya, p.yb), bot = Math.min(p.ya, p.yb), H = top - bot, rev = p.yb > p.ya;
  const k = Math.max(0, p.landings ?? 0), n = Math.max(1, Math.round(H / FB.rise)), rise = H / n;
  // (a flat pad at the head and the foot, PAD m: the 1 m terrain grid cannot follow a stair right to its end, the pad
  // meets the street / path there level: carveUnder leaves it, footbridgeAudit F2 / F4)
  const pad = F.L - k * FB.landing - 2 * PAD >= n * 0.24 ? PAD : 0;
  const run = Math.max(0.5, F.L - k * FB.landing - 2 * pad), going = Math.min(0.4, Math.max(0.2, run / n));
  const per = [], base = Math.floor(n / (k + 1));
  for (let f = 0; f <= k; f++) per.push(base + (f < n - base * (k + 1) ? 1 : 0));
  const knots = [[0, top]], treads = [];
  let u = 0, y = top;
  if (pad) { treads.push({ u0: 0, u1: pad, y: top, pad: true }); u = pad; knots.push([u, top]); }
  for (let f = 0; f <= k; f++) {
    for (let j = 0; j < per[f]; j++) { y -= rise; treads.push({ u0: u, u1: u + going, y }); u += going; }
    knots.push([u, y]);
    if (f < k) { treads[treads.length - 1].u1 = u + FB.landing; u += FB.landing; knots.push([u, y]); }
  }
  if (u < F.L) { treads[treads.length - 1].u1 = F.L; knots.push([F.L, bot]); }
  // (a stair whose b is its top: the same layout mirrored along u)
  if (rev) return { rise, going, pad, knots: knots.map(([q, yy]) => [F.L - q, yy]).reverse(), treads: treads.map((t) => ({ u0: F.L - t.u1, u1: F.L - t.u0, y: t.y, pad: t.pad })).reverse(), rev };
  return { rise, going, pad, knots, treads, rev };
}
const along = (knots, u) => {
  if (u <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) if (u <= knots[i][0]) { const [u0, y0] = knots[i - 1], [u1, y1] = knots[i]; return u1 - u0 < 1e-6 ? y1 : y0 + (y1 - y0) * (u - u0) / (u1 - u0); }
  return knots[knots.length - 1][1];
};

/** Resolve a spec's levels ("ground" -> the drawn ground at the end) and lay the parts out: plain data for the page and
 *  the checks. groundAt: the drawn walking ground (street / path) at (x, z). */
export function resolveFootbridge(spec, groundAt) {
  const parts = spec.parts.map((p) => {
    const lv = (v, q) => (typeof v === "number" ? v : +groundAt(q[0], q[1]).toFixed(3));
    const r = { kind: p.kind, a: p.a, b: p.b, w: p.w, ya: lv(p.ya, p.a), yb: lv(p.yb, p.b), ga: p.ya === "ground", gb: p.yb === "ground", landings: p.landings ?? 0, canopy: p.canopy ?? 0, piers: !!p.piers };
    r.knots = r.kind === "stair" ? stairLayout(r).knots : [[0, r.ya], [frame(r).L, r.yb]];
    return r;
  });
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of parts) for (const [x, z] of [p.a, p.b]) { const m = p.w / 2 + 1; x0 = Math.min(x0, x - m); z0 = Math.min(z0, z - m); x1 = Math.max(x1, x + m); z1 = Math.max(z1, z + m); }
  return { id: spec.id, name: spec.name, urbis: spec.urbis, osm: spec.osm || [], parts, box: [x0, z0, x1, z1] };
}

/** (x, z) -> the walking level on the footbridge (its deck, stairs, landings), or null off it (the walker, the third
 *  person's height, the mover ground: world.decks) */
export function footTop(fb) {
  const P = fb.parts.map((p) => ({ p, F: frame(p) }));
  return (x, z) => {
    if (!inBox(fb.box, x, z)) return null;
    let best = null;
    for (const { p, F } of P) {
      const [u, v] = F.loc(x, z);
      if (u < -0.05 || u > F.L + 0.05 || Math.abs(v) > p.w / 2 + 0.02) continue;
      const y = along(p.knots, u);
      if (best == null || y > best) best = y;
    }
    return best;
  };
}

/** (x, z) -> true inside a footbridge's parts in plan (the walls / girders included) */
export function footFootprint(fb) {
  const P = fb.parts.map((p) => ({ p, F: frame(p), m: p.kind === "deck" ? FB.girderT : FB.wall }));
  return (x, z) => inBox(fb.box, x, z) && P.some(({ p, F, m }) => { const [u, v] = F.loc(x, z); return u >= -0.05 && u <= F.L + 0.05 && Math.abs(v) <= p.w / 2 + m; });
}

/** the highest the catenary may run at (x, z): 0.3 m under a footbridge deck's underside, sloping back up 1:12 off it */
export function footSoffitCap(fbs) {
  const D = [];
  for (const fb of fbs || []) for (const p of fb.parts) if (p.kind === "deck") D.push({ p, F: frame(p), box: fb.box });
  return (x, z) => {
    let cap = Infinity;
    for (const { p, F, box } of D) {
      if (!inBox(box, x, z, 25)) continue;
      const [u, v] = F.loc(x, z), uc = Math.max(0, Math.min(F.L, u));
      const out = Math.hypot(Math.max(0, Math.abs(v) - p.w / 2 - FB.girderT), u - uc);
      if (out > 25) continue;
      cap = Math.min(cap, along(p.knots, uc) - FB.depth - 0.3 + out / 12);
    }
    return cap;
  };
}

/** Drive colliders (driveMode addStatic): the stair walls and the girders where they come down to the ground (a car on
 *  the forecourt meets them), as thin plan rings */
export function footColliders(fb, surface) {
  const rings = [];
  for (const p of fb.parts) {
    const F = frame(p), t = p.kind === "deck" ? FB.girderT : FB.wall, steps = Math.max(1, Math.ceil(F.L));
    for (const sg of [-1, 1]) for (let k = 0; k < steps; k++) {
      const u0 = (F.L * k) / steps, u1 = (F.L * (k + 1)) / steps, um = (u0 + u1) / 2, [mx, mz] = F.at(um, sg * (p.w / 2 + t / 2));
      const low = along(p.knots, um) - (p.kind === "deck" ? FB.depth : 0) - surface(mx, mz);
      if (low > 1.2) continue;                                   // (high over the ground: nothing a car meets)
      const v0 = sg * p.w / 2, v1 = sg * (p.w / 2 + t);
      rings.push([F.at(u0, v0), F.at(u1, v0), F.at(u1, v1), F.at(u0, v1)]);
    }
  }
  return rings.length ? [{ rings, kind: 5 }] : [];
}

// ------------------------------------------------------------------------------------------------ the mesh
const COL = { 1: [0.4, 0.39, 0.37], 2: [0.5, 0.49, 0.46], 3: [0.47, 0.46, 0.43], 7: [0.3, 0.12, 0.1], 8: [0.42, 0.44, 0.45] };
/** The footbridge as a triangle soup (non-indexed): { position, normal, color, uv, groups: [{ start, count, slot }] }.
 *  surface: the drawn terrain (walls / piers down into it); platforms: [{ ring, top }] (piers stand on them). */
export function footbridgeMesh(fb, surface, platforms = []) {
  const P = [], N = [], S = [];
  const tri = (n, slot, a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    const gx = uy * wz - uz * wy, gy = uz * wx - ux * wz, gz = ux * wy - uy * wx;
    const pts = gx * n[0] + gy * n[1] + gz * n[2] < 0 ? [a, c, b] : [a, b, c];
    for (const q of pts) { P.push(q[0], q[1], q[2]); N.push(n[0], n[1], n[2]); }
    S.push(slot);
  };
  const quad = (n, slot, a, b, c, d) => { tri(n, slot, a, b, c); tri(n, slot, a, c, d); };
  /** a box between two plan points along a part (a straight bar of half thickness h across), y0..y1 at each end */
  const bar = (F, u0, u1, v, h, y0a, y1a, y0b, y1b, slot, caps = true) => {
    const A0 = F.at(u0, v - h), A1 = F.at(u0, v + h), B0 = F.at(u1, v - h), B1 = F.at(u1, v + h), n = [F.nx, 0, F.nz], m = [-F.nx, 0, -F.nz];
    quad(n, slot, [A1[0], y0a, A1[1]], [B1[0], y0b, B1[1]], [B1[0], y1b, B1[1]], [A1[0], y1a, A1[1]]);
    quad(m, slot, [A0[0], y0a, A0[1]], [B0[0], y0b, B0[1]], [B0[0], y1b, B0[1]], [A0[0], y1a, A0[1]]);
    const dy = y1b - y1a, du = u1 - u0, l = Math.hypot(du, dy) || 1;
    quad([-F.tx * dy / l, du / l, -F.tz * dy / l], slot, [A0[0], y1a, A0[1]], [B0[0], y1b, B0[1]], [B1[0], y1b, B1[1]], [A1[0], y1a, A1[1]]);
    quad([0, -1, 0], slot, [A0[0], y0a, A0[1]], [B0[0], y0b, B0[1]], [B1[0], y0b, B1[1]], [A1[0], y0a, A1[1]]);
    if (caps) {
      quad([-F.tx, 0, -F.tz], slot, [A0[0], y0a, A0[1]], [A1[0], y0a, A1[1]], [A1[0], y1a, A1[1]], [A0[0], y1a, A0[1]]);
      quad([F.tx, 0, F.tz], slot, [B0[0], y0b, B0[1]], [B1[0], y0b, B1[1]], [B1[0], y1b, B1[1]], [B0[0], y1b, B0[1]]);
    }
  };
  /** a vertical post (square, half size h) at plan (x, z) from y0 to y1 */
  const post = (F, x, z, h, y0, y1, slot) => {
    const c = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([p, q]) => [x + F.tx * p + F.nx * q, z + F.tz * p + F.nz * q]);
    for (let k = 0; k < 4; k++) {
      const [px, pz] = c[k], [qx, qz] = c[(k + 1) % 4], ex = (px + qx) / 2 - x, ez = (pz + qz) / 2 - z, l = Math.hypot(ex, ez) || 1;
      quad([ex / l, 0, ez / l], slot, [px, y0, pz], [qx, y0, qz], [qx, y1, qz], [px, y1, pz]);
    }
    quad([0, 1, 0], slot, [c[0][0], y1, c[0][1]], [c[1][0], y1, c[1][1]], [c[2][0], y1, c[2][1]], [c[3][0], y1, c[3][1]]);
  };
  /** railing along a part's side sg from u0 to u1, standing on the walk line + base */
  const railing = (F, p, sg, u0, u1, base) => {
    const v = sg * (p.w / 2 + FB.wall / 2), y = (u) => along(p.knots, u) + base;
    const n = Math.max(1, Math.ceil((u1 - u0) / FB.post));
    for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n, [x, z] = F.at(u, v); post(F, x, z, 0.025, y(u), along(p.knots, u) + FB.railH, FOOT_SLOT.galv); }
    // the handrail and a mid rail, piecewise along the knots (a flight's slope, a landing's flat)
    const us = [u0, ...p.knots.map((k) => k[0]).filter((u) => u > u0 + 0.05 && u < u1 - 0.05), u1];
    for (let i = 1; i < us.length; i++) for (const [h, t] of [[FB.railH, 0.05], [0.55, 0.03]]) {
      const a = us[i - 1], b = us[i], ya = along(p.knots, a) + h, yb = along(p.knots, b) + h;
      bar(F, a, b, v, 0.025, ya - t, ya, yb - t, yb, FOOT_SLOT.galv, false);
    }
  };
  for (const p of fb.parts) {
    const F = frame(p), steps = Math.max(1, Math.ceil(F.L)), g = (u, v) => { const [x, z] = F.at(u, v); return surface(x, z); };
    const y = (u) => along(p.knots, u);
    if (p.kind === "deck") {
      const hw = p.w / 2, T = FB.girderT;
      for (let k = 0; k < steps; k++) {
        const u0 = F.L * k / steps, u1 = F.L * (k + 1) / steps, ya = y(u0), yb = y(u1);
        const A0 = F.at(u0, -hw), A1 = F.at(u0, hw), B0 = F.at(u1, -hw), B1 = F.at(u1, hw);
        quad([0, 1, 0], FOOT_SLOT.resin, [A0[0], ya, A0[1]], [B0[0], yb, B0[1]], [B1[0], yb, B1[1]], [A1[0], ya, A1[1]]);
        // the soffit (the girders' bottom flange level across the whole width)
        const C0 = F.at(u0, -hw - T), C1 = F.at(u0, hw + T), D0 = F.at(u1, -hw - T), D1 = F.at(u1, hw + T);
        quad([0, -1, 0], FOOT_SLOT.galv, [C0[0], ya - FB.depth, C0[1]], [D0[0], yb - FB.depth, D0[1]], [D1[0], yb - FB.depth, D1[1]], [C1[0], ya - FB.depth, C1[1]]);
        // the two plate girders (no end caps between pieces), a handrail on their top, a vertical stiffener rib on the
        // outer face every metre (the trough's rhythm seen from the platforms)
        for (const sg of [-1, 1]) {
          bar(F, u0, u1, sg * (hw + T / 2), T / 2, ya - FB.depth, ya + FB.girderH, yb - FB.depth, yb + FB.girderH, FOOT_SLOT.galv, false);
          bar(F, u0, u1, sg * (hw + T / 2), 0.04, ya + FB.girderH, ya + FB.girderH + 0.06, yb + FB.girderH, yb + FB.girderH + 0.06, FOOT_SLOT.galv, false);
          const [rx, rz] = F.at(u0, sg * (hw + T + 0.03));
          if (k > 0) post(F, rx, rz, 0.03, ya - FB.depth + 0.05, ya + FB.girderH - 0.05, FOOT_SLOT.galv);
        }
        // skirts: where the underside is near the bank, concrete walls down into it under each girder (no gap)
        for (const sg of [-1, 1]) {
          const ga = g(u0, sg * (hw + T)), gb = g(u1, sg * (hw + T));
          if (Math.min(ya - FB.depth - ga, yb - FB.depth - gb) > FB.skirt) continue;
          bar(F, u0, u1, sg * (hw + T / 2), T / 2 + 0.02, Math.min(ga, ya - FB.depth) - FB.sink, ya - FB.depth, Math.min(gb, yb - FB.depth) - FB.sink, yb - FB.depth, FOOT_SLOT.concrete, false);
        }
      }
      // the girders' ends and the deck's end walls down into the ground (the abutments)
      for (const [u, dir] of [[0, -1], [F.L, 1]]) {
        const yy = y(u), lo = Math.min(...[-1, 0, 1].map((s) => g(u, s * (hw + T)))) - FB.sink;
        const E0 = F.at(u, -hw - T), E1 = F.at(u, hw + T), n = [F.tx * dir, 0, F.tz * dir];
        if (yy - FB.depth - lo < FB.skirt + FB.sink + 4) quad(n, FOOT_SLOT.concrete, [E0[0], Math.min(lo, yy - FB.depth), E0[1]], [E1[0], Math.min(lo, yy - FB.depth), E1[1]], [E1[0], yy - 0.02, E1[1]], [E0[0], yy - 0.02, E0[1]]);
        for (const sg of [-1, 1]) { const A = F.at(u, sg * hw), B = F.at(u, sg * (hw + T)); quad(n, FOOT_SLOT.galv, [A[0], yy - FB.depth, A[1]], [B[0], yy - FB.depth, B[1]], [B[0], yy + FB.girderH, B[1]], [A[0], yy + FB.girderH, A[1]]); }
      }
      // piers: where the deck passes over a platform, a pair of concrete columns under the girders mid-crossing
      if (p.piers) {
        let inside = false, s0 = 0;
        const runs = [];
        for (let u = 0; u <= F.L; u += 0.25) {
          const [x, z] = F.at(u, 0), pl = platforms.find((q) => ptIn(q.ring, x, z));
          if (pl && !inside) { inside = true; s0 = u; }
          if (!pl && inside) { inside = false; runs.push([s0, u]); }
        }
        for (const [a, b] of runs) {
          if (b - a < 1.5) continue;
          const u = (a + b) / 2, [cx, cz] = F.at(u, 0), pl = platforms.find((q) => ptIn(q.ring, cx, cz));
          for (const sg of [-1, 1]) { const [x, z] = F.at(u, sg * (hw - 0.1)); post(F, x, z, 0.22, (pl?.top ?? surface(x, z)) - 0.05, y(u) - FB.depth, FOOT_SLOT.concrete); }
        }
      }
      continue;
    }
    // stairs and landings: treads / pad, side walls into the ground, railings
    const hw = p.w / 2, Wt = FB.wall;
    if (p.kind === "stair") {
      const L = stairLayout(p);
      for (const t of L.treads) {
        const A0 = F.at(t.u0, -hw), A1 = F.at(t.u0, hw), B0 = F.at(t.u1, -hw), B1 = F.at(t.u1, hw);
        quad([0, 1, 0], FOOT_SLOT.paving, [A0[0], t.y, A0[1]], [B0[0], t.y, B0[1]], [B1[0], t.y, B1[1]], [A1[0], t.y, A1[1]]);
        // the riser on the tread's upper side (a stair descending a -> b: at u0, up to the tread above; mirrored: at u1),
        // facing down the stair (the climber's side)
        if (t.pad) continue;
        const ur = L.rev ? t.u1 : t.u0, R0 = F.at(ur, -hw), R1 = F.at(ur, hw), dir = L.rev ? -1 : 1;
        quad([F.tx * dir, 0, F.tz * dir], FOOT_SLOT.concrete, [R0[0], t.y, R0[1]], [R1[0], t.y, R1[1]], [R1[0], t.y + L.rise, R1[1]], [R0[0], t.y + L.rise, R0[1]]);
      }
    } else {
      for (let k = 0; k < steps; k++) {
        const u0 = F.L * k / steps, u1 = F.L * (k + 1) / steps, A0 = F.at(u0, -hw), A1 = F.at(u0, hw), B0 = F.at(u1, -hw), B1 = F.at(u1, hw);
        quad([0, 1, 0], FOOT_SLOT.resin, [A0[0], y(u0), A0[1]], [B0[0], y(u1), B0[1]], [B1[0], y(u1), B1[1]], [A1[0], y(u0), A1[1]]);
      }
    }
    // the side walls: a concrete coping 0.12 m over the walk line, down into the drawn ground (closed: no floating edge);
    // where the part cuts into the bank, a retaining wall up to the bank beside it (p.outer: the uncarved ground just
    // outside, carveUnder lowered the terrain under the part and CARVE_M round it)
    const us = [...new Set([...Array(steps + 1).keys()].map((k) => F.L * k / steps).concat(p.knots.map((k) => k[0])))].sort((a, b) => a - b);
    const outer = p.outer || (() => -Infinity);
    for (const sg of [-1, 1]) {
      const vc = sg * (hw + Wt / 2), top = (u) => Math.max(y(u) + 0.12, outer(u, sg) + 0.05);
      for (let i = 1; i < us.length; i++) {
        const a = us[i - 1], b = us[i];
        if (b - a < 1e-3) continue;
        bar(F, a, b, vc, Wt / 2, Math.min(g(a, vc), y(a)) - FB.sink, top(a), Math.min(g(b, vc), y(b)) - FB.sink, top(b), FOOT_SLOT.kerb, i === 1 || i === us.length - 1);
      }
      // the railing where the walk stands over the ground outside (a stair always: its handrail), on the coping; none
      // along a retaining wall already hand-rail high
      const drop = Math.max(...us.map((u) => y(u) - Math.max(g(u, sg * (hw + Wt + 0.5)), outer(u, sg))));
      const low = us.some((u) => top(u) - y(u) < FB.railH - 0.15);
      if ((p.kind === "stair" || drop > 0.5) && low) railing(F, p, sg, 0.15, F.L - 0.15, 0.12);
    }
    // the underside where the stair / pad stands over the ground between its walls: a soffit along the walk line
    for (let i = 1; i < us.length; i++) {
      const a = us[i - 1], b = us[i];
      if (b - a < 1e-3 || Math.min(y(a) - g(a, 0), y(b) - g(b, 0)) < 0.6) continue;
      const A0 = F.at(a, -hw), A1 = F.at(a, hw), B0 = F.at(b, -hw), B1 = F.at(b, hw), ya = y(a) - 0.35 - (p.kind === "stair" ? 0.17 : 0), yb = y(b) - 0.35 - (p.kind === "stair" ? 0.17 : 0);
      quad([0, -1, 0], FOOT_SLOT.concrete, [A0[0], ya, A0[1]], [B0[0], yb, B0[1]], [B1[0], yb, B1[1]], [A1[0], ya, A1[1]]);
    }
    // the canopy over the stair's head: a grey mono-pitch roof on four posts (Vivier d'Oie east: both stair heads)
    if (p.kind === "stair" && p.canopy > 0) {
      const top = Math.max(p.ya, p.yb), headU = p.ya >= p.yb ? 0 : F.L, uE = p.ya >= p.yb ? Math.min(F.L, p.canopy) : Math.max(0, F.L - p.canopy);
      const u0 = Math.min(headU, uE) - 0.4, u1 = Math.max(headU, uE) + 0.4, hv = hw + Wt + 0.4, yr = top + FB.canopyH;
      const C = [F.at(u0, -hv), F.at(u1, -hv), F.at(u1, hv), F.at(u0, hv)], y0 = yr + 0.35, y1 = yr;         // (pitched across: high side -v)
      quad([0, 1, 0], FOOT_SLOT.galv, [C[0][0], y0, C[0][1]], [C[1][0], y0, C[1][1]], [C[2][0], y1, C[2][1]], [C[3][0], y1, C[3][1]]);
      quad([0, -1, 0], FOOT_SLOT.galv, [C[0][0], y0 - 0.08, C[0][1]], [C[1][0], y0 - 0.08, C[1][1]], [C[2][0], y1 - 0.08, C[2][1]], [C[3][0], y1 - 0.08, C[3][1]]);
      for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
        const yi = i < 2 ? y0 : y1, yj = j < 2 ? y0 : y1, ex = (C[i][0] + C[j][0]) / 2 - (C[0][0] + C[2][0]) / 2, ez = (C[i][1] + C[j][1]) / 2 - (C[0][1] + C[2][1]) / 2, l = Math.hypot(ex, ez) || 1;
        quad([ex / l, 0, ez / l], FOOT_SLOT.galv, [C[i][0], yi - 0.08, C[i][1]], [C[j][0], yj - 0.08, C[j][1]], [C[j][0], yj, C[j][1]], [C[i][0], yi, C[i][1]]);
      }
      for (const [u, sg] of [[u0 + 0.2, -1], [u0 + 0.2, 1], [u1 - 0.2, -1], [u1 - 0.2, 1]]) {
        const v = sg * (hw + Wt / 2), [x, z] = F.at(u, v), uu = Math.max(0, Math.min(F.L, u));
        post(F, x, z, 0.05, y(uu) + 0.12, sg < 0 ? y0 - 0.08 : y1 - 0.08, FOOT_SLOT.galv);
      }
    }
  }
  // groups by slot
  const T = S.length, order = [...Array(T).keys()].sort((a, b) => S[a] - S[b]);
  const pos = new Float32Array(T * 9), nrm = new Float32Array(T * 9), col = new Float32Array(T * 9), uv = new Float32Array(T * 6), groups = [];
  order.forEach((t, k) => {
    for (let v = 0; v < 3; v++) {
      const o = t * 9 + v * 3;
      pos.set([P[o], P[o + 1], P[o + 2]], k * 9 + v * 3); nrm.set([N[o], N[o + 1], N[o + 2]], k * 9 + v * 3); col.set(COL[S[t]] || COL[3], k * 9 + v * 3);
      // (metres: a horizontal face its plan x / z, a vertical one along its plan and up)
      if (Math.abs(N[t * 9 + 1]) > 0.7) { uv[k * 6 + v * 2] = P[o]; uv[k * 6 + v * 2 + 1] = P[o + 2]; }
      else { uv[k * 6 + v * 2] = P[o] * Math.abs(N[t * 9 + 2]) + P[o + 2] * Math.abs(N[t * 9]); uv[k * 6 + v * 2 + 1] = P[o + 1]; }
    }
    const g = groups[groups.length - 1];
    if (g && g.slot === S[t]) g.count += 3; else groups.push({ start: k * 3, count: 3, slot: S[t] });
  });
  return { position: pos, normal: nrm, color: col, uv, groups };
}

/** Lower the terrain grid (Y, header H: { x0, z0, cols, rows, step }) under every part and CARVE_M round it, to
 *  under its walk line (a stair / landing: 0.3 m, a deck: its underside + 0.1): the bank no longer covers the treads
 *  or pokes through a deck end. Before it, each stair / landing part keeps the bank's level just outside its walls
 *  (p.outerS: the retaining walls rise to it). Returns the cells moved. */
const CARVE_M = 0.8, END_KEEP = 1.4;
export function carveUnder(fbs, Y, H, surface) {
  let moved = 0;
  for (const fb of fbs) for (const p of fb.parts) {
    const F = frame(p), hw = p.w / 2 + (p.kind === "deck" ? FB.girderT : FB.wall), deep = p.kind === "deck" ? FB.depth + 0.1 : 0.3;
    if (p.kind !== "deck") {
      const n = Math.max(1, Math.ceil(F.L / 0.5)), side = { "-1": [], "1": [] };
      for (const sg of [-1, 1]) for (let k = 0; k <= n; k++) {
        const u = F.L * k / n;
        let m = -Infinity;
        for (const o of [0.3, 0.8, 1.2]) { const [x, z] = F.at(u, sg * (hw + o)); m = Math.max(m, surface(x, z)); }
        side[sg].push(+m.toFixed(3));
      }
      p.outerS = side; p.outerN = n;
    }
    const [x0, z0, x1, z1] = fb.box;
    for (let r = Math.max(0, Math.floor((z0 - 2 - H.z0) / H.step)); r <= Math.min(H.rows - 1, Math.ceil((z1 + 2 - H.z0) / H.step)); r++)
      for (let c = Math.max(0, Math.floor((x0 - 2 - H.x0) / H.step)); c <= Math.min(H.cols - 1, Math.ceil((x1 + 2 - H.x0) / H.step)); c++) {
        const x = H.x0 + c * H.step, z = H.z0 + r * H.step, [u, v] = F.loc(x, z);
        if (u < 0 || u > F.L || Math.abs(v) > hw + CARVE_M) continue;
        // (a welded end: the street / path it meets stays at its level, only what stands over the walk comes down to it)
        const keep = (p.ga && u < END_KEEP) || (p.gb && u > F.L - END_KEEP);
        const lim = along(p.knots, u) - (keep ? 0.06 : deep), k = r * H.cols + c;
        if (Y[k] > lim) { Y[k] = lim; moved++; }
      }
  }
  return moved;
}
/** p.outer(u, sg): the bank level outside a stair / landing wall (carveUnder's samples) */
function outerFn(p) {
  if (!p.outerS) return null;
  const L = frame(p).L, n = p.outerN;
  return (u, sg) => { const f = Math.max(0, Math.min(n, (u / L) * n)), i = Math.min(n - 1, Math.floor(f)), a = p.outerS[sg][i], b = p.outerS[sg][i + 1]; return a + (b - a) * (f - i); };
}

/** the footbridges a tile builds (the tile holding the bridge's box centre), resolved and meshed. groundAt: the drawn
 *  walking ground (the street / path a part's "ground" end welds onto); surface: the drawn terrain */
export function tileFootbridges(doc, bounds, groundAt) {
  const out = [];
  for (const spec of doc?.bridges || []) {
    const fb0 = resolveFootbridge(spec, groundAt), cx = (fb0.box[0] + fb0.box[2]) / 2, cz = (fb0.box[1] + fb0.box[3]) / 2;
    if (cx >= bounds.x0 && cx < bounds.x1 && cz >= bounds.z0 && cz < bounds.z1) out.push(fb0);
  }
  return out;
}
/** mesh the resolved footbridges (after carveUnder); surface: the drawn (carved) terrain, platforms: [{ ring, top }] */
export function meshFootbridges(fbs, surface, platforms = []) {
  return fbs.map((fb) => {
    for (const p of fb.parts) p.outer = outerFn(p);
    const mesh = footbridgeMesh(fb, surface, platforms);
    for (const p of fb.parts) { delete p.outer; delete p.outerS; delete p.outerN; }      // (plain data to the page)
    return { ...fb, mesh, tris: mesh.position.length / 9 };
  });
}

/** (x, z) -> the drawn walking ground at the footbridges' "ground" ends: the highest road-stage triangle (streets,
 *  sidewalks: parts { position, index }) over the point within 0.6 m of the terrain there, else the terrain. One pass
 *  over the triangles for all the ends (a sidewalk stands ~0.1-0.2 m over the terrain under it: a stair top welded
 *  to the terrain left a step down from the sidewalk) */
export function endGround(doc, bounds, parts, surface) {
  const pts = [];
  for (const spec of doc?.bridges || []) for (const p of spec.parts) for (const [v, q] of [[p.ya, p.a], [p.yb, p.b]]) if (v === "ground" && q[0] >= bounds.x0 - 30 && q[0] < bounds.x1 + 30 && q[1] >= bounds.z0 - 30 && q[1] < bounds.z1 + 30) pts.push({ x: q[0], z: q[1], g: surface(q[0], q[1]), y: null });
  if (pts.length) for (const part of Object.values(parts || {})) {
    if (!part?.index) continue;
    const P = part.position, I = part.index;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2], cx = P[c], cz = P[c + 2];
      for (const q of pts) {
        if (q.x < Math.min(ax, bx, cx) || q.x > Math.max(ax, bx, cx) || q.z < Math.min(az, bz, cz) || q.z > Math.max(az, bz, cz)) continue;
        const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        if (Math.abs(det) < 1e-9) continue;
        const l1 = ((bz - cz) * (q.x - cx) + (cx - bx) * (q.z - cz)) / det, l2 = ((cz - az) * (q.x - cx) + (ax - cx) * (q.z - cz)) / det, l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
        const y = l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1];
        if (Math.abs(y - q.g) < 0.6 && (q.y == null || y > q.y)) q.y = y;
      }
    }
  }
  return (x, z) => { const q = pts.find((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6); return q?.y ?? surface(x, z); };
}
