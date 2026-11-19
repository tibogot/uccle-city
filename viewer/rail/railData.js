// THE RAILWAY'S CPU SIDE, pure JS (no three.js): runs in the tile worker (viewer/tileData.js, bundled into
// tileWorker.bundle.js) and, for the Train Lab, on the main thread. viewer/rail/railway.js turns its typed arrays
// into meshes (materials, shared geometries) - the only main-thread work left per tile is creating the buffers.
//
//   prepRail(doc)                        rail.json -> arc lengths, boxes, decks (once)
//   carveGrid(doc, Y, hdr, bounds, heroes) the tile's 1 m terrain grid (Y = heights, row-major cols x rows) pushed under
//                                        the ballast and the platforms, raised to a 1:1.5 fill where a track runs above
//                                        the ground off a bridge, opened under the hero bridges' arches
//   railTileData(doc, bounds, heroes)    ballast / rails / wires geometry, sleeper / mast / shelter instance matrices,
//                                        platform and deck geometry, as transferable typed arrays (a hero ROAD bridge
//                                        replaces the UrbIS deck slab; the catenary dips under its arches, no mast in it)
//   railKeepClear(doc, bounds, heroes)   (x, z) -> true where no tree may stand (rail bridge decks, platforms, the ballast)
// heroes = the hero bridges' Blender notes (models/rail/<name>.json: placement, deck, openings, skew): their footprint
// replaces the UrbIS polygon (the Calevoet viaduct runs on beyond it), their openings are carved to the arch floors.
// Road bridges over the line (info.kind "road_over_rail", tools/blender/roadBridge.py) give their own footprint polygon
// (the 2022 footbridge beside Verrewinkel's) and the arches' springing / rise, for the wires.
import earcut from "three/src/extras/lib/earcut.js";

/** The hero railway / road bridges (models/rail/<name>.json + .glb): round 1, and round 2 (docs/trains/BRIDGES_ROUND2.md),
 *  the latter switched off with ?bridges2=0 (the track crosses those gaps on its ballast alone, as before). */
export const HERO_BRIDGES = ["stjob", "calevoet", "verrewinkel"];
export const HERO_BRIDGES2 = ["ruestalle", "engeland", "engeland_chord", "bigarreaux", "kauwberg", "linkebeek"];
export const heroBridgeNames = (round2 = true) => (round2 ? HERO_BRIDGES.concat(HERO_BRIDGES2) : HERO_BRIDGES.slice());

export const GAUGE = 1.435, RAIL_C = GAUGE / 2 + 0.036;      // rail centre lines (head 72 mm)
export const CREST = -0.19, BED = -0.55;                      // ballast crest / shoulder foot below the rail top (m)
export const CREST_HW = 1.65, FOOT_HW = 2.25, CORRIDOR = 2.5;
export const SLEEPER_STEP = 0.6, SLEEPER_FAR = 140;
export const WIRE_H = 5.5, MESSENGER_H = 6.9, MAST_STEP = 60, MAST_OFF = 2.6;

export function prepRail(doc) {
  if (doc.prepared) return doc;
  for (const t of doc.tracks) {
    const n = t.pts.length, S = new Float32Array(n);
    for (let i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][2] - t.pts[i - 1][2]);
    t.S = S; t.len = S[n - 1];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of t.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
    t.box = { x0, x1, z0, z1 };
    t.hash = (parseInt(t.id.slice(1), 10) % 7) * 0.0012;      // ribbons of tracks meeting at a switch: a few mm apart, no z-fight
  }
  doc.decks = doc.bridges.filter((b) => b.type !== "RAB" && b.lines.length);
  doc.prepared = true;
  return doc;
}

export const tracksIn = (doc, b, m = 0) => doc.tracks.filter((t) => t.box.x1 >= b.x0 - m && t.box.x0 <= b.x1 + m && t.box.z1 >= b.z0 - m && t.box.z0 <= b.z1 + m);
const inside = (b, x, z) => x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], zi = r[i][1], xj = r[j][0], zj = r[j][1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const ringBox = (ring) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of ring) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { ring, x0, x1, z0, z1 }; };

/** a hero bridge's frame: world (x, z) <-> bridge (X along the track, Y left), its footprint ring (world) */
export function heroFrame(h) {
  const th = -h.placement.rotation_y_rad, c = Math.cos(th), s = Math.sin(th);
  const [px, py, pz] = h.placement.city_local_position;
  const toLocal = (x, z) => { const dx = x - px, dz = z - pz; const mx = dx * c + dz * s, mz = -dx * s + dz * c; return [mx, -mz]; };
  const toWorld = (X, Y) => { const mz = -Y; return [px + X * c - mz * s, pz + X * s + mz * c]; };
  const L = h.deck.length / 2 + 0.5, W = h.deck.width / 2 + 0.5;
  const ring = (h.footprint || [[-L, -W], [L, -W], [L, W], [-L, W]]).map(([X, Y]) => toWorld(X, Y));
  return { ...h, toLocal, toWorld, ring, road: py };
}

/** The road's ground with the hero ROAD bridges' decks in it: (x, z) -> the deck's road level on a deck, else ground(x, z).
 *  The DTM under a road bridge is the railway cutting (its deck is not in the LiDAR ground); the road engine sampled it and
 *  pulled the street ends down into a 0.4-0.6 m dip at Verrewinkel's SE end. Feeding it the deck keeps the street level
 *  with the bridge's road (the hero's deck ends were taken from this ground at the polygon ends). */
/** THE STREET THROUGH AN UNDERPASS IS LEVEL ACROSS (road fix round 2, docs/collisions/ROAD_FIX2.md): the measured
 *  street (UrbIS: Kauwberg's polygon is 9.5-11 m wide there, the arch's opening 8.6 m) reaches past the cut's floor onto
 *  its banks and onto the approach cutting's sides beyond the bridge, and its height field followed them: the cobbles
 *  rode up the banks in a saw-tooth (docs/trains/compare/r2_kauwberg_city_after.jpg). For the road stage only (the drawn
 *  terrain keeps its banks; the street's carve and weld meet them at the street's edge): within UP_EXT m before / after
 *  each hero underpass and hw + UP_SIDE m of its axis, the ground is at most the street's level on the axis (the cut's
 *  line between the ends, the DTM on the axis beyond them). Only lowers, by at most UP_DROP (a wall, a building: left). */
const UP_EXT = 25, UP_SIDE = 4, UP_DROP = 4;
export function underpassGround(heroes, ground) {
  const ups = (heroes || []).filter((h) => h.underpass).map((h) => {
    const [ax, az, ay] = h.underpass.a, [bx, bz, by] = h.underpass.b, L = Math.hypot(bx - ax, bz - az) || 1;
    return { ax, az, ay, by, L, tx: (bx - ax) / L, tz: (bz - az) / L, w: h.underpass.hw + UP_SIDE };
  });
  if (!ups.length) return ground;
  return (x, z) => {
    const g = ground(x, z);
    for (const u of ups) {
      const dx = x - u.ax, dz = z - u.az, s = dx * u.tx + dz * u.tz;
      if (s < -UP_EXT || s > u.L + UP_EXT || Math.abs(dx * u.tz - dz * u.tx) > u.w) continue;
      const lvl = s >= 0 && s <= u.L ? u.ay + (u.by - u.ay) * (s / u.L) : ground(u.ax + u.tx * s, u.az + u.tz * s);
      return g > lvl && g - lvl <= UP_DROP ? lvl : g;
    }
    return g;
  };
}

export function roadDeckGround(heroes, ground) {
  const decks = (heroes || []).filter((h) => h.kind === "road_over_rail").map((h) => {
    const f = heroFrame(h), d = h.deck;
    return { f, d, road: (X) => d.road_ends[0] + (X - d.x0) * (d.road_ends[1] - d.road_ends[0]) / (d.x1 - d.x0) };
  });
  if (!decks.length) return ground;
  return (x, z) => {
    for (const { f, d, road } of decks) {
      const [X, Y] = f.toLocal(x, z);
      if (X < d.x0 || X > d.x1) continue;
      if (Math.abs(Y) > d.parapet_inner + 0.45 + d.flare * Math.max(0, (Math.abs(X) - d.fold) / (d.x1 - d.fold))) continue;
      return road(X);
    }
    return ground(x, z);
  };
}

/**
 * Roads round 5: the street's carriageway at a hero road bridge's ends, ON the deck's level. The measured street's
 * height field (viewer/surfaces.js, least-squares planes over 6 m cells) cannot follow the deck end exactly: at
 * Verrewinkel's SE end the street sat 0.1-0.2 m under the deck on its SW half (a step at the joint). Returns null (no
 * hero road bridge) or (x, z) -> [y, w]: the deck's road level carried on with its grade past the end, and the weight
 * (1 at the end, 0 END_PIN m past it and 1 m outside the kerb lines) to blend the street's height toward it.
 */
export function roadDeckPins(heroes) {
  const decks = (heroes || []).filter((h) => h.kind === "road_over_rail").map((h) => ({ f: heroFrame(h), d: h.deck }));
  if (!decks.length) return null;
  const END_PIN = 6, smooth = (t) => t * t * (3 - 2 * t);
  return (x, z) => {
    for (const { f, d } of decks) {
      const [X, Y] = f.toLocal(x, z);
      if (X >= d.x0 && X <= d.x1) continue;
      const past = X > d.x1 ? X - d.x1 : d.x0 - X;
      if (past >= END_PIN) continue;
      const out = Math.max(0, d.kerb_sw - Y, Y - d.kerb_ne);
      if (out >= 1) continue;
      const g = (d.road_ends[1] - d.road_ends[0]) / (d.x1 - d.x0);
      const y = X > d.x1 ? d.road_ends[1] + g * past : d.road_ends[0] - g * past;
      return [y, smooth(1 - past / END_PIN) * (1 - out)];
    }
    return null;
  };
}

/** the rail bridge footprints: the hero models' (they may run beyond UrbIS), else the UrbIS RAB polygons */
/** CLASS T (rule 39, docs/RAIL_T.md): only the RAIL bridges' footprints (a track standing on a structure: the hero
 *  railway bridges + the UrbIS RAB). A hero ROAD bridge over the line is not one: under its deck the cutting's floor is
 *  the track bed (bridgeRings() counts every hero, which left the drive surface 0.6 m under the rails at Verrewinkel). */
export function railBridgeRings(doc, heroes) { return bridgeRings(doc, (heroes || []).filter((h) => h.kind !== "road_over_rail")); }
function bridgeRings(doc, heroes) {
  const hs = (heroes || []).map(heroFrame);
  const rings = hs.map((h) => h.ring);
  for (const b of doc.bridges) {
    if (b.type !== "RAB") continue;
    const [cx, cz] = b.centre;
    if (hs.some((h) => inRing(h.ring, cx, cz))) continue;     // replaced by a hero's footprint
    rings.push(b.ring);
  }
  return rings.map(ringBox);
}

// ------------------------------------------------------------------------------------------------ terrain
/**
 * ABUTMENT FILL (the JOINS rule, docs/collisions/README.md): a hero ROAD bridge meets the city's ground at its ends. The
 * DTM there is the top of the cutting's slope (the LiDAR ground falls away beside the abutments), so the street the road
 * engine draws on it dropped 0.4-0.7 m right past the deck's end, and the deck's tongue (under the street) and the
 * footbridge's landings stood over a void. The ground is raised (never lowered), BEFORE the roads are built (they sample
 * it), on every grid given (the tile worker passes the drawn grid first, then the road engine's original grid):
 *   - under the deck's tongues past each end and the footbridge's landings: 6 cm under their tops (their concrete skirts /
 *     landing seats, tools/blender/roadBridge.py, go 1.2-1.7 m down: the earth meets a wall, never a gap);
 *   - the street's approach: the bridge's road level carried 2 m past each end on the deck's grade, then easing back to
 *     the DTM at 8 % over at most 12 m, across the street (deck width + 3 m);
 *   - around these: a 1:1.5 earth slope.
 */
export function abutmentFill(heroes, grids, hdr) {
  const { x0, z0, cols, rows, step } = hdr;
  let moved = 0;
  for (const h of (heroes || []).filter((q) => q.kind === "road_over_rail").map(heroFrame)) {
    const d = h.deck, f = h.foot, apron = d.apron_se ?? 0;
    const r = (X) => { const xc = Math.max(d.x0, Math.min(d.x1, X)); return d.road_ends[0] + (xc - d.x0) * (d.road_ends[1] - d.road_ends[0]) / (d.x1 - d.x0) + (X - xc) * d.grade; };
    const wHalf = (X) => Math.min(d.parapet_inner + 0.9, d.parapet_inner + d.flare * Math.max(0, (Math.abs(X) - d.fold) / (d.x1 - d.fold)));   // roadBridge.py tw()
    const zones = [];                                          // { xa, xb, ya(X), yb(X), top(X) }: ground = top - 0.06 inside
    const xe1 = d.x1 + (apron ? 2.5 : 0.6), xe0 = d.x0 - 0.6;
    const tongue = (X) => r(X) - 0.03 - (X > d.x1 ? apron * (X - d.x1) / 2.5 : 0);
    zones.push({ xa: d.x1, xb: xe1, ya: (X) => -wHalf(X), yb: wHalf, top: tongue }, { xa: xe0, xb: d.x0, ya: (X) => -wHalf(X), yb: wHalf, top: tongue });
    if (f) {
      const fw = (X) => (X >= f.x_flare ? f.w : f.w + (f.w_nw - f.w) * (f.x_flare - X) / (f.x_flare - f.x0));
      const ftop = (X) => r(X) - f.top_under_road;
      zones.push({ xa: d.x1, xb: f.x1, ya: (X) => f.y_inner - fw(X), yb: () => f.y_inner, top: ftop }, { xa: f.x0, xb: d.x0, ya: (X) => f.y_inner - fw(X), yb: () => f.y_inner, top: ftop });
    }
    // the street's approach (raised only where the DTM is lower: the fill takes the max)
    const APP = 12, EASE = 0.08, AW = d.width / 2 + 3;
    const appr = (X) => r(X) + 0.06 - EASE * Math.max(0, Math.abs(X) - Math.abs(X > 0 ? d.x1 : d.x0) - 2);
    zones.push({ xa: d.x1, xb: d.x1 + APP, ya: () => -AW, yb: () => AW, top: appr }, { xa: d.x0 - APP, xb: d.x0, ya: () => -AW, yb: () => AW, top: appr });
    const R = APP + 8;
    const bx = ringBox(h.ring);
    const c0 = Math.max(0, Math.floor((bx.x0 - R - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((bx.x1 + R - x0) / step));
    const r0 = Math.max(0, Math.floor((bx.z0 - R - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((bx.z1 + R - z0) / step));
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
      const [X, Yb] = h.toLocal(x0 + c * step, z0 + rr * step);
      if (X > d.x0 && X < d.x1) continue;                     // the cutting under the deck stays as it is
      let inside = -Infinity, around = -Infinity;
      for (const zn of zones) {
        const xc = Math.max(zn.xa, Math.min(zn.xb, X)), ya = zn.ya(xc), yb = zn.yb(xc), yc = Math.max(ya, Math.min(yb, Yb));
        const out = Math.hypot(X - xc, Yb - yc), t = zn.top(xc) - 0.06;
        if (out < 1e-6) inside = Math.max(inside, t);
        else around = Math.max(around, t - out / 1.5);
      }
      // under a tongue / landing the ground stays under its top (the lowest zone there wins); the approach only raises
      const under = zones.slice(0, f ? 4 : 2).some((zn) => { const xc = Math.max(zn.xa, Math.min(zn.xb, X)); return xc === X && Yb >= zn.ya(X) && Yb <= zn.yb(X); });
      let fill = Math.max(inside, around);
      if (under && grids.length) fill = Math.min(fill, ...zones.slice(0, f ? 4 : 2).filter((zn) => X >= zn.xa && X <= zn.xb && Yb >= zn.ya(X) && Yb <= zn.yb(X)).map((zn) => zn.top(X) - 0.06));
      const k = rr * cols + c;
      // grids[0] = the drawn terrain: kept under the tongues / landings; the others (the road engine's ground): the
      // street's level (the street is drawn over the tongue, which sits 3 cm under it)
      grids.forEach((G, gi) => { const v = gi === 0 ? fill : Math.max(inside, around); if (G[k] < v) { G[k] = v; moved++; } });
    }
  }
  return moved;
}

/**
 * UNDERPASS CUT (round 2 street bridges, tools/blender/railBridge.py "underpass"): the LiDAR DTM interpolates the ground
 * THROUGH a narrow rail underpass (its deck and the embankment hide the street), so the road engine drew Rue Engeland,
 * Rue des Bigarreaux... climbing 5 m over the embankment. Between two measured road points a, b beyond the hump ([x, z,
 * y]), the ground is LOWERED (never raised) to the road's level, linear from a to b, over a corridor of half width hw,
 * then a 1:1 bank up to the ground (at most 7 m out). Runs BEFORE the roads are built (they sample it), on every grid
 * given (the drawn terrain and the road engine's original). Returns the number of cells moved.
 */
export function underpassCut(heroes, grids, hdr) {
  const { x0, z0, cols, rows, step } = hdr, BANK = 7;
  // the banks stop at the bridges' footprints: inside the masonry (beside the opening, under the deck) the ground stays
  // the embankment's (the drive surface under the deck; nothing hollow behind the face walls)
  const rings = (heroes || []).filter((h) => h.underpass || h.style).map((h) => ringBox(heroFrame(h).ring));
  const inBridge = (x, z) => rings.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z));
  let moved = 0;
  for (const h of heroes || []) {
    const u = h.underpass;
    if (!u) continue;
    const [ax, az, ay] = u.a, [bx, bz, by] = u.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - u.hw - BANK - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(ax, bx) + u.hw + BANK - x0) / step));
    const r0 = Math.max(0, Math.floor((Math.min(az, bz) - u.hw - BANK - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(az, bz) + u.hw + BANK - z0) / step));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const px = x0 + c * step, pz = z0 + r * step;
      const t = ((px - ax) * dx + (pz - az) * dz) / L2;
      if (t < 0 || t > 1) continue;                                   // the ends: the DTM is the road there already
      const d = Math.hypot(px - ax - dx * t, pz - az - dz * t) - u.hw;
      if (d > BANK || (d > 0 && inBridge(px, pz))) continue;
      const target = ay + (by - ay) * t - 0.02 + Math.max(0, d);       // 2 cm under the road's level (the road is drawn on it)
      const k = r * cols + c;
      for (const G of grids) if (G[k] > target) { G[k] = target; moved++; }
    }
  }
  return moved;
}

/** In place on Y (cols x rows heights). Returns { moved, dirty: Int32Array of changed cells }. */
export function carveGrid(doc, Y, hdr, bounds, heroes = [], opts = {}) {
  const { x0, z0, cols, rows, step } = hdr;
  let moved = 0;
  const mask = new Uint8Array(cols * rows), dirty = [];
  const set = (k, v) => { Y[k] = v; moved++; if (!mask[k]) { mask[k] = 1; dirty.push(k); } };
  const gx1 = x0 + (cols - 1) * step, gz1 = z0 + (rows - 1) * step;
  // 1. under the ballast (and a 30 cm cess beyond its foot)
  for (const t of tracksIn(doc, bounds, CORRIDOR + 1)) {
    const P = t.pts;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if ((a[0] < x0 - CORRIDOR && b[0] < x0 - CORRIDOR) || (a[0] > gx1 + CORRIDOR && b[0] > gx1 + CORRIDOR) || (a[2] < z0 - CORRIDOR && b[2] < z0 - CORRIDOR) || (a[2] > gz1 + CORRIDOR && b[2] > gz1 + CORRIDOR)) continue;
      const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - CORRIDOR - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(a[0], b[0]) + CORRIDOR - x0) / step));
      const r0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - CORRIDOR - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(a[2], b[2]) + CORRIDOR - z0) / step));
      const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1e-9;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        const u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[2]) * dz) / L2));
        const ex = px - a[0] - dx * u, ez = pz - a[2] - dz * u, d2 = ex * ex + ez * ez;
        if (d2 > CORRIDOR * CORRIDOR) continue;
        const d = Math.sqrt(d2), rt = a[1] + (b[1] - a[1]) * u;
        const surf = d < CREST_HW ? rt + CREST : d < FOOT_HW ? rt + CREST + (BED - CREST) * (d - CREST_HW) / (FOOT_HW - CREST_HW) : rt + BED;
        const k = r * cols + c;
        if (Y[k] > surf - 0.06) set(k, surf - 0.06);
      }
    }
  }
  // 2. platforms: the ground inside them under their top (scanline over the grid rows)
  for (const pf of doc.platforms) {
    const bx = ringBox(pf.ring);
    if (bx.x1 < x0 || bx.x0 > gx1 || bx.z1 < z0 || bx.z0 > gz1) continue;
    const c0 = Math.max(0, Math.floor((bx.x0 - 1 - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((bx.x1 + 1 - x0) / step));
    const r0 = Math.max(0, Math.floor((bx.z0 - 1 - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((bx.z1 + 1 - z0) / step));
    const r = pf.ring;
    for (let rr = r0; rr <= r1; rr++) {
      const pz = z0 + rr * step, xs = [];
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > pz) !== (zj > pz)) xs.push((xj - xi) * (pz - zi) / (zj - zi) + xi); }
      xs.sort((p, q) => p - q);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const ca = Math.max(c0, Math.ceil((xs[q] - x0) / step)), cb = Math.min(c1, Math.floor((xs[q + 1] - x0) / step));
        for (let c = ca; c <= cb; c++) { const k = rr * cols + c; if (Y[k] > pf.top - 0.1) set(k, pf.top - 0.1); }
      }
    }
    // citydefects 2026-11-16 (?platformedge=old: none): the cells just OUTSIDE the ring too, rising back at 1:1 from
    // 0.5 m out. The LiDAR DTM has the platform surface in it (Saint-Job: 72.1 m beside a 72.03 m top), so the terrain's
    // 1 m triangles crossed the platform's plane along its outer edge: a stair-stepped, flickering paving outline
    if (opts.platformEdge === false) continue;
    const R = 1.6;
    for (let rr = Math.max(0, r0 - 2); rr <= Math.min(rows - 1, r1 + 2); rr++) for (let c = Math.max(0, c0 - 2); c <= Math.min(cols - 1, c1 + 2); c++) {
      const px = x0 + c * step, pz = z0 + rr * step;
      let inside = false, best = Infinity;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, zi] = r[i], [xj, zj] = r[j];
        if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
        const dx = xi - xj, dz = zi - zj, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - xj) * dx + (pz - zj) * dz) / l2));
        best = Math.min(best, Math.hypot(xj + dx * t - px, zj + dz * t - pz));
      }
      if (inside || best > R) continue;
      const target = pf.top - 0.1 + Math.max(0, best - 0.5), k = rr * cols + c;
      if (Y[k] > target) set(k, target);
    }
  }
  // 3. the hero bridges' openings: the ground inside each arch at its floor (the 1 m DTM interpolates a slope under the
  //    masonry it cannot see, which half-buried the Saint-Job side arches), ramping back up over 5 m outside the faces
  for (const h of (heroes || []).map(heroFrame)) {
    const bx = ringBox(h.ring);
    if (bx.x1 < x0 - 8 || bx.x0 > gx1 + 8 || bx.z1 < z0 - 8 || bx.z0 > gz1 + 8) continue;
    const c0 = Math.max(0, Math.floor((bx.x0 - 8 - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((bx.x1 + 8 - x0) / step));
    const r0 = Math.max(0, Math.floor((bx.z0 - 8 - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((bx.z1 + 8 - z0) / step));
    const Wh = h.deck.width / 2;
    // a road bridge: the ground under its deck kept 0.12 m below the road (as the city's roads: no terrain poking
    // through the asphalt where the cutting's slopes reach the deck at the ends)
    const dk = h.kind === "road_over_rail" ? h.deck : null;
    const dRoad = dk && ((X) => { const xc = Math.max(dk.x0, Math.min(dk.x1, X)); return dk.road_ends[0] + (xc - dk.x0) * (dk.road_ends[1] - dk.road_ends[0]) / (dk.x1 - dk.x0); });
    const dHalf = dk && ((X) => dk.parapet_inner + 0.45 + dk.flare * Math.max(0, (Math.abs(X) - dk.fold) / (dk.x1 - dk.fold)));
    for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
      const [X, Yb] = h.toLocal(x0 + c * step, z0 + rr * step);
      if (dk && X >= dk.x0 && X <= dk.x1 && Math.abs(Yb) <= dHalf(X)) {
        const k = rr * cols + c, t = dRoad(X) - 0.12;
        if (Y[k] > t) set(k, t);
      }
      const out = Math.max(0, Math.abs(Yb) - Wh);               // metres outside the faces
      if (out > 5) continue;
      for (const o of h.openings) {
        if (o.floor == null) continue;
        const xs = X - h.skew_dx_per_dy * Yb;                    // the opening's axis frame: X at Y = 0
        const half = (o.x1 - o.x0) / 2 - 0.25, mid = (o.x0 + o.x1) / 2;
        if (Math.abs(xs - mid) > half) continue;
        const floor = h.road + o.floor - 0.05 + out * 0.6;
        const k = rr * cols + c;
        if (Y[k] > floor) set(k, floor);
      }
    }
  }
  // 4. embankment fill: a track above the ground off a bridge (the end of a viaduct) gets a 1:1.5 fill, at most FILL_MAX out
  const FILL_MAX = 18;
  const rings = bridgeRings(doc, heroes).filter((b) => b.x1 > x0 - FILL_MAX && b.x0 < gx1 + FILL_MAX && b.z1 > z0 - FILL_MAX && b.z0 < gz1 + FILL_MAX);
  let near = rings;
  const onBridge = (x, z) => { for (const b of near) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z)) return true; return false; };
  const gridY = (x, z) => { const c = Math.round((x - x0) / step), r = Math.round((z - z0) / step); return c >= 0 && r >= 0 && c < cols && r < rows ? Y[r * cols + c] : null; };
  for (const t of tracksIn(doc, bounds, FILL_MAX + 1)) {
    const P = t.pts;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2, g = gridY(mx, mz);
      if (g == null) continue;
      near = rings;
      if (a[1] + BED - g < 0.4 || onBridge(mx, mz)) continue;
      const W = Math.min(FILL_MAX, FOOT_HW + 1.5 * (a[1] + BED - g) + 1);
      near = rings.filter((q) => q.x1 > mx - W - 2 && q.x0 < mx + W + 2 && q.z1 > mz - W - 2 && q.z0 < mz + W + 2);
      const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - W - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(a[0], b[0]) + W - x0) / step));
      const r0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - W - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(a[2], b[2]) + W - z0) / step));
      const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1e-9;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        const u = ((px - a[0]) * dx + (pz - a[2]) * dz) / L2;
        if (u < -0.01 || u > 1.01) continue;
        const d = Math.hypot(px - a[0] - dx * u, pz - a[2] - dz * u);
        if (d > W || onBridge(px, pz)) continue;
        const target = a[1] + (b[1] - a[1]) * u + BED - 0.07 - Math.max(0, d - FOOT_HW) / 1.5;
        const k = r * cols + c;
        if (Y[k] < target) set(k, target);
      }
    }
  }
  return { moved, dirty: Int32Array.from(dirty) };
}

// ------------------------------------------------------------------------------------------------ keep clear (trees)
/** (x, z) -> true on a rail bridge deck (the LiDAR "trees" there are the bridge: canopy = DSM - DTM, and the DTM has no
 *  deck), on a platform, or within 3.2 m of a track. Embankment slopes keep their trees. */
export function railKeepClear(doc, bounds, heroes = []) {
  const m = 6;
  const near = (b) => b.x1 > bounds.x0 - m && b.x0 < bounds.x1 + m && b.z1 > bounds.z0 - m && b.z0 < bounds.z1 + m;
  const rings = bridgeRings(doc, heroes).concat(doc.platforms.map((p) => ringBox(p.ring))).filter(near);
  const cell = new Map(), key = (i, j) => i * 100003 + j;
  for (const t of tracksIn(doc, bounds, m)) {
    for (let i = 1; i < t.pts.length; i++) {
      const s = [t.pts[i - 1][0], t.pts[i - 1][2], t.pts[i][0], t.pts[i][2]];
      for (let a = Math.floor((Math.min(s[0], s[2]) - 4) / 8); a <= Math.floor((Math.max(s[0], s[2]) + 4) / 8); a++)
        for (let b = Math.floor((Math.min(s[1], s[3]) - 4) / 8); b <= Math.floor((Math.max(s[1], s[3]) + 4) / 8); b++) {
          const k = key(a, b); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(s);
        }
    }
  }
  // the street under a round-2 underpass (its cut corridor + 2 m): the LiDAR "trees" there are the embankment's edge
  // over the old hump, standing in the street now
  const cuts = (heroes || []).filter((h) => h.underpass).map((h) => h.underpass);
  return (x, z) => {
    for (const b of rings) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z)) return true;
    for (const { a: [ax, az], b: [bx, bz], hw } of cuts) {
      const dx = bx - ax, dz = bz - az, t = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz);
      if (t >= 0 && t <= 1 && Math.hypot(x - ax - dx * t, z - az - dz * t) < hw + 2) return true;
    }
    for (const [ax, az, bx, bz] of cell.get(key(Math.floor(x / 8), Math.floor(z / 8))) || []) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      if ((x - ax - dx * u) ** 2 + (z - az - dz * u) ** 2 < 3.2 * 3.2) return true;
    }
    return false;
  };
}

// ------------------------------------------------------------------------------------------------ the track bed (props)
/** CLASS T (rule 39): nothing the data layers place stands on a track bed. A prop's centre within BED_CLEAR of a track on
 *  the ground (the fence line + the prop) at the rail's level is on the railway's land; a ROAD deck over the line (a
 *  UrbIS ROB / PB polygon, a hero road bridge) is not the bed. Inside a hero ROAD bridge's footprint the hero draws the
 *  deck's own furniture (tools/blender/roadBridge.py: Verrewinkel's two OSM benches on the footbridge): a data-layer
 *  point there is dropped (the builders seated it on the DTM = the cutting floor: on the rails). */
export const BED_CLEAR = 3.6;
export function railBed(doc, bounds, heroes = [], m = 20) {
  const hs = (heroes || []).filter((h) => h.kind === "road_over_rail").map(heroFrame).map((h) => ringBox(h.ring));
  const decks = doc.decks.map((b) => ringBox(b.ring)).concat(hs).filter((b) => b.x1 > bounds.x0 - m && b.x0 < bounds.x1 + m && b.z1 > bounds.z0 - m && b.z0 < bounds.z1 + m);
  const inB = (list, x, z) => list.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z));
  const rails = railBridgeRings(doc, heroes).filter((b) => b.x1 > bounds.x0 - m && b.x0 < bounds.x1 + m && b.z1 > bounds.z0 - m && b.z0 < bounds.z1 + m);
  const segs = [];
  for (const t of tracksIn(doc, bounds, m)) if (!t.bridge && !t.tunnel) for (let i = 1; i < t.pts.length; i++) segs.push([t.pts[i - 1][0], t.pts[i - 1][2], t.pts[i][0], t.pts[i][2], t.pts[i - 1][1], t.pts[i][1]]);
  const near = segGrid(segs);
  /** the nearest bed track within BED_CLEAR: { d, y (its rail top) } or null */
  const at = (x, z) => {
    let best = null;
    for (const s of near(x, z, BED_CLEAR)) { const d = segDist(x, z, s); if (d < BED_CLEAR && (!best || d < best.d)) { const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2)); best = { d, y: s[4] + (s[5] - s[4]) * u }; } }
    return best;
  };
  return {
    size: segs.length,
    /** (x, z[, y]) -> true on a track bed (y: the point's own height; a point 2.5 m over / under the rail is elsewhere) */
    on(x, z, y = null) {
      if (!segs.length) return false;
      const b = at(x, z);
      if (!b || inB(decks, x, z) || inB(rails, x, z)) return false;
      return y == null || !Number.isFinite(y) || Math.abs(y - b.y) < 2.5;
    },
    /** inside a hero road bridge's footprint (its model draws what stands on it) */
    inHero: (x, z) => inB(hs, x, z),
  };
}

// ------------------------------------------------------------------------------------------------ the car on the line
// (owner, 2026-11-13: "see car going inside ground in the train rail"). carveGrid leaves the terrain 6 cm under the
// ballast crest and the rail heads stand 19 cm over it, so a car on the line sat ~25 cm low with the rails through its
// wheels. Two fixes, both for drive mode (viewer/drive/): the line's own surface in the drive grid, and fences.

const ON_RAIL = 0.02;          // m under the rail top: the car rides on the rails between the crests (a 1 m grid)
/** Raise the drive grid (colliders.js driveGround: cm over the carved terrain) to the line's surface where a track is
 *  on the ground (not on a bridge: the road under it keeps its own ground): rail top over the crest, the ballast
 *  shoulder down to the bed. Never lowers (a level crossing's road stays). Returns the number of cells raised. */
export function railDriveSurface(doc, hm, ground, bounds, heroes = [], { old = false } = {}) {
  const { x0, z0, cols, rows, step } = hm.h, Y = hm.y, D = ground.delta;
  // (rule 39; old = ?rail=old: every hero's footprint, the road bridges' too: the car sank 0.6 m into the ballast
  // under the Verrewinkel deck, the drive grid there the carved terrain)
  const rings = old ? bridgeRings(doc, heroes) : railBridgeRings(doc, heroes);
  const onBridge = (x, z) => { for (const b of rings) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z)) return true; return false; };
  let raised = 0;
  for (const t of tracksIn(doc, bounds, FOOT_HW + 1)) {
    if (t.bridge) continue;
    const P = t.pts;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - FOOT_HW - x0) / step)), c1 = Math.min(cols - 1, Math.ceil((Math.max(a[0], b[0]) + FOOT_HW - x0) / step));
      const r0 = Math.max(0, Math.floor((Math.min(a[2], b[2]) - FOOT_HW - z0) / step)), r1 = Math.min(rows - 1, Math.ceil((Math.max(a[2], b[2]) + FOOT_HW - z0) / step));
      if (c0 > c1 || r0 > r1) continue;
      const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1e-9;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const px = x0 + c * step, pz = z0 + r * step;
        const u = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[2]) * dz) / L2));
        const d = Math.hypot(px - a[0] - dx * u, pz - a[2] - dz * u);
        if (d > FOOT_HW) continue;
        const rt = a[1] + (b[1] - a[1]) * u;
        const target = d < CREST_HW ? rt - ON_RAIL : rt - ON_RAIL + (rt + BED - (rt - ON_RAIL)) * (d - CREST_HW) / (FOOT_HW - CREST_HW);
        const k = r * cols + c, cm = Math.round((target - Y[k]) * 100);
        if (cm > 400 || onBridge(px, pz)) continue;                       // > 4 m over the grid: not this line's ground
        // (rule 39) a road drawn > 1.5 m over the bed here (a deck's street over the cutting): the bed is the LOW layer
        if (!old && D[k] !== 65535 && D[k] - cm > 150 && ground.delta2) { if (ground.delta2[k] === 65535 || ground.delta2[k] < cm) { ground.delta2[k] = cm; raised++; } continue; }
        if (cm <= D[k]) continue;                                        // never lower (a level crossing's road stays)
        D[k] = cm; raised++;
      }
    }
  }
  return raised;
}

const FENCE = 3.2, FENCE_STEP = 2, FENCE_W = 0.12;
/** The line's fences for the car: thin wall rings [[x, z], ...] FENCE m either side of each track where it runs on the
 *  ground or in a cutting; none on bridges (roads pass under), none where the real ground is over 3 m above the rail top
 *  (a tunnel or a covered box: the streets above), none within 3 m of another track (between the tracks of a pair),
 *  inside a platform, or near a road crossing the line (a level crossing or a road bridge over it).
 *  orig(x, z) = the uncarved DTM; roadsDoc = roads.json. */
export function railFences(doc, bounds, heroes, roadsDoc, orig) {
  const rings = bridgeRings(doc, heroes).concat(doc.platforms.map((p) => ringBox(p.ring)));
  const inAny = (x, z) => { for (const b of rings) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z)) return true; return false; };
  const tracks = tracksIn(doc, bounds, FENCE + 4);
  // road centre lines near the line (every highway: a car may come from any of them), with a half width
  const nodes = new Map((roadsDoc?.nodes || []).map((n) => [n.id, n]));
  const segs = [];
  for (const r of roadsDoc?.roads || []) {
    const hw = r.meta?.highway;
    if (hw === "footway" || hw === "path" || hw === "steps" || hw === "cycleway" || hw === "pedestrian" || hw === "bridleway") continue;
    const side = (a) => (a || []).reduce((s, l) => s + (+l.width || 0), 0);
    const half = Math.max(3, side(r.lanes?.left), side(r.lanes?.right)) + 2;
    const pts = [nodes.get(r.a), ...(r.pts || []), nodes.get(r.b)].filter(Boolean);
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1].x, pts[i - 1].z, pts[i].x, pts[i].z, half]);
  }
  const segD = (x, z, s) => { const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2)); return Math.hypot(x - s[0] - dx * u, z - s[1] - dz * u); };
  const nearRoad = (x, z) => { for (const s of segs) if (segD(x, z, s) < s[4]) return true; return false; };
  const nearOther = (x, z, t) => {
    for (const o of tracks) {
      if (o === t || x < o.box.x0 - 4 || x > o.box.x1 + 4 || z < o.box.z0 - 4 || z > o.box.z1 + 4) continue;
      for (let i = 1; i < o.pts.length; i++) if (segD(x, z, [o.pts[i - 1][0], o.pts[i - 1][2], o.pts[i][0], o.pts[i][2]]) < 3) return true;
    }
    return false;
  };
  const m = 4, inTile = (x, z) => x >= bounds.x0 - m && x <= bounds.x1 + m && z >= bounds.z0 - m && z <= bounds.z1 + m;
  const out = [], lines = [];
  let posts = 0;
  for (const t of tracks) {
    if (t.bridge) continue;
    const F = frames(t);
    for (const sd of [-1, 1]) {
      let run = [];
      const flush = () => {
        if (run.length >= 2) {
          const a = run.map((q) => [q[0] + q[2] * FENCE_W / 2, q[1] + q[3] * FENCE_W / 2]);
          const b = run.map((q) => [q[0] - q[2] * FENCE_W / 2, q[1] - q[3] * FENCE_W / 2]).reverse();
          out.push([...a, ...b]);
          lines.push(run);
        }
        run = [];
      };
      for (let s = 0; s <= t.len + 1e-6; s += FENCE_STEP) {
        const f = sample(F, Math.min(s, t.len));
        const x = f.x + f.nx * sd * FENCE, z = f.z + f.nz * sd * FENCE;
        const ok = inTile(x, z) && !inAny(x, z) && !inAny(f.x, f.z) && orig(x, z) - f.y < 3 && !nearOther(x, z, t) && !nearRoad(x, z);
        if (ok) { run.push([x, z, f.nx * sd, f.nz * sd]); posts++; } else flush();
      }
      flush();
    }
  }
  return { rings: out, lines, posts };
}

export const FENCE_H = 1.8;
/** The fences as one drawable strip per tile (the welded-mesh panels and posts are the shader's: viewer/rail/railway.js
 *  fence material): a vertical quad strip per run from 0.1 m under `surface` (the carved ground) to FENCE_H over it.
 *  aS = metres along the run (posts every 2.5 m), aH = metres over the ground. Non-indexed triangles. */
export function fenceMesh(lines, surface) {
  const P = [], N = [], S = [], H = [];
  for (const run of lines) {
    let s = 0;
    for (let i = 1; i < run.length; i++) {
      const [ax, az, nx, nz] = run[i - 1], [bx, bz, mx, mz] = run[i];
      const L = Math.hypot(bx - ax, bz - az), ya = surface(ax, az), yb = surface(bx, bz);
      const n = [(nx + mx) / 2, 0, (nz + mz) / 2], nl = Math.hypot(n[0], n[2]) || 1;
      const v = [[ax, ya - 0.1, az, s, -0.1], [bx, yb - 0.1, bz, s + L, -0.1], [bx, yb + FENCE_H, bz, s + L, FENCE_H], [ax, ya + FENCE_H, az, s, FENCE_H]];
      for (const k of [0, 1, 2, 0, 2, 3]) { const q = v[k]; P.push(q[0], q[1], q[2]); N.push(n[0] / nl, 0, n[2] / nl); S.push(q[3]); H.push(q[4]); }
      s += L;
    }
  }
  return P.length ? { position: Float32Array.from(P), normal: Float32Array.from(N), aS: Float32Array.from(S), aH: Float32Array.from(H) } : null;
}

// ------------------------------------------------------------------------------------------------ CLASS T fences
// RULE 39 (docs/QUALITY_RULES.md, docs/RAIL_T.md; ?rail=old: railFences / fenceMesh above, as before). The line is
// closed for the car where the real one is: the fence runs on both sides wherever a track is on the ground, and breaks
// only where something real breaks it: a LEVEL crossing (a road crossing the line at its level, bridgeAudit.mjs's test),
// a platform, a rail bridge's footprint, a tunnel / covered box, a second track beside it, a street's carriageway it would
// stand in. Before, ANY road centre line within max(3, lanes) + 2 m of a fence post broke it (the roads passing over or
// under the line and the streets running beside it too): the car drove down the Verrewinkel cutting's bank beside the
// road bridge and up the Stalle embankment onto the viaduct.
// The panels: posts every POST_STEP m along the fence line, seated on the drawn ground; each bay a straight panel from
// post to post (its rails parallel to the slope between the two posts, the same post height for both bays at a post: no
// step), its foot following the ground under it (0.1 m into it). Before, the strip's top followed the ground at every
// 2 m vertex while the posts stood every 2.5 m: the rails kinked mid-panel and stepped on every bump of the 1 m grid.
// The car's walls are the drawn panels, a chunk of CHUNK_BAYS bays each, from the drawn foot to the drawn top (before:
// one ring per run, from -10 km to the HIGHEST post of the run + 1.8 m: a wall far over the fence where a run climbs).
// One wall per bay: its top is the higher post's + FENCE_H (a 2.5 m bay on a 1:5 grade: 0.5 m over the lower end).
export const POST_STEP = 2.5, FENCE_FOOT = 0.1;
const RUN_STEP = 1, CHUNK_BAYS = 1, NOT_CAR = new Set(["footway", "path", "steps", "cycleway", "pedestrian", "bridleway", "corridor", "platform", "track"]);

/** A uniform grid of segments [ax, az, bx, bz, ...]: near(x, z, r) -> the segments within r of (x, z) (cell C m). */
function segGrid(segs, C = 16) {
  const g = new Map(), key = (i, j) => i * 100003 + j;
  segs.forEach((s, id) => {
    for (let i = Math.floor((Math.min(s[0], s[2]) - 2) / C); i <= Math.floor((Math.max(s[0], s[2]) + 2) / C); i++)
      for (let j = Math.floor((Math.min(s[1], s[3]) - 2) / C); j <= Math.floor((Math.max(s[1], s[3]) + 2) / C); j++) { const k = key(i, j); if (!g.has(k)) g.set(k, []); g.get(k).push(id); }
  });
  const out = [], seen = new Uint32Array(segs.length); let stamp = 0;
  return (x, z, r) => {
    out.length = 0; stamp++;
    for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++) for (let j = Math.floor((z - r) / C); j <= Math.floor((z + r) / C); j++)
      for (const id of g.get(key(i, j)) || []) if (seen[id] !== stamp) { seen[id] = stamp; out.push(segs[id]); }
    return out;
  };
}
const segDist = (x, z, s) => { const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2)); return Math.hypot(x - s[0] - dx * u, z - s[1] - dz * u); };
const segCross = (a, b, c, d) => {
  const r0 = b[0] - a[0], r1 = b[1] - a[1], s0 = d[0] - c[0], s1 = d[1] - c[1], den = r0 * s1 - r1 * s0;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s1 - (c[1] - a[1]) * s0) / den, u = ((c[0] - a[0]) * r1 - (c[1] - a[1]) * r0) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r0 * t, a[1] + r1 * t, u] : null;
};
/** A road's carriageway half width on its wider side (OSM lanes; 3 m if none). */
const carriage = (r) => { const side = (a) => (a || []).reduce((s, l) => s + (l.type === "sidewalk" ? 0 : +l.width || 0), 0); return Math.max(3, side(r.lanes?.left), side(r.lanes?.right)) + (r.lanes?.center?.width || 0) / 2; };

/**
 * The road-rail crossings near the tile, classified as tools/audit/bridgeAudit.mjs does: the road's ground 12-30 m
 * either side of the crossing (the highest sample: a cutting's slope reads low) vs the rail top: over (> rail + 3 m both
 * sides), under (< rail - 3 m both sides), else LEVEL. Roads tagged bridge / tunnel are over / under. Only the car's
 * roads (footways, paths, steps: not). Returns [{ x, z, kind, half, segs: [[ax, az, bx, bz]] (the road's segments
 * within 25 m), name }].
 */
export function railCrossings(doc, bounds, roadsDoc, orig, m = 40) {
  const tracks = tracksIn(doc, bounds, m).filter((t) => !t.tunnel);
  const N = new Map((roadsDoc?.nodes || []).map((n) => [n.id, n]));
  const out = [];
  for (const r of roadsDoc?.roads || []) {
    if (NOT_CAR.has(r.meta?.highway)) continue;
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean).map((p) => [p.x, p.z]);
    const br = r.meta?.bridge && r.meta.bridge !== "no", tun = r.meta?.tunnel && r.meta.tunnel !== "no";
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (Math.max(a[0], b[0]) < bounds.x0 - m || Math.min(a[0], b[0]) > bounds.x1 + m || Math.max(a[1], b[1]) < bounds.z0 - m || Math.min(a[1], b[1]) > bounds.z1 + m) continue;
      for (const t of tracks) {
        if (Math.max(a[0], b[0]) < t.box.x0 || Math.min(a[0], b[0]) > t.box.x1 || Math.max(a[1], b[1]) < t.box.z0 || Math.min(a[1], b[1]) > t.box.z1) continue;
        for (let k = 1; k < t.pts.length; k++) {
          const p = segCross(a, b, [t.pts[k - 1][0], t.pts[k - 1][2]], [t.pts[k][0], t.pts[k][2]]);
          if (!p) continue;
          const ry = t.pts[k - 1][1] + (t.pts[k][1] - t.pts[k - 1][1]) * p[2];
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
          const side = (sg) => { let mx = -Infinity; for (let q = 12; q <= 30; q += 3) { const g = orig(p[0] + sg * ux * q, p[1] + sg * uz * q); if (g > mx) mx = g; } return mx; };
          const g1 = side(-1), g2 = side(1);
          const kind = br || t.bridge ? (br ? "over" : "under") : tun ? "under" : g1 > ry + 3 && g2 > ry + 3 ? "over" : g1 < ry - 3 && g2 < ry - 3 ? "under" : "level";
          const segs = [];
          for (let j = 1; j < pts.length; j++) if (segDist(p[0], p[1], [pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1]]) < 25) segs.push([pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1]]);
          out.push({ x: p[0], z: p[1], kind, half: carriage(r) + 2, segs, name: r.meta?.name || r.name || r.id, road: r.id, rail: ry, track: t.id });
        }
      }
    }
  }
  return out;
}

/**
 * The fence lines (rule 39): runs [[x, z, nx, nz], ...] FENCE m either side of each track on the ground, sampled every
 * RUN_STEP m along it, broken as the header says. opts.skip(x, z) -> true: no fence there (a tunnel bore's lid).
 * Returns { lines, posts, crossings, breaks: { level, platform, bridge, covered, track, road, tile } (samples) }.
 */
export function railFences2(doc, bounds, heroes, roadsDoc, orig, opts = {}) {
  // (the RAIL bridges' footprints only: under a road bridge the fence runs on to the abutments, as the real one does;
  // ending it at the road bridge's footprint left a gap to the abutment walls: the car went down the Verrewinkel bank)
  const rings = railBridgeRings(doc, heroes).concat(doc.platforms.map((p) => ringBox(p.ring)));
  const pr = new Set(doc.platforms.map((p) => p.ring));
  const inAny = (x, z) => { for (const b of rings) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z)) return pr.has(b.ring) ? "platform" : "bridge"; return null; };
  const tracks = tracksIn(doc, bounds, FENCE + 4);
  const crossings = railCrossings(doc, bounds, roadsDoc, orig);
  const level = crossings.filter((c) => c.kind === "level");
  const levelSegs = segGrid(level.flatMap((c) => c.segs.map((s) => [...s, c.half])));
  // the car's roads not on a structure: a fence never stands in their carriageway (a street beside the line); a road that
  // crosses the line over or under it (on a bridge, through an arch: its plan band reaches over the cutting) is not one
  const N = new Map((roadsDoc?.nodes || []).map((n) => [n.id, n]));
  const across = new Set(crossings.filter((c) => c.kind !== "level").map((c) => c.road));
  const rs = [];
  for (const r of roadsDoc?.roads || []) {
    if (NOT_CAR.has(r.meta?.highway) || (r.meta?.bridge && r.meta.bridge !== "no") || (r.meta?.tunnel && r.meta.tunnel !== "no") || across.has(r.id)) continue;
    const half = carriage(r) + 0.3, pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    for (let i = 1; i < pts.length; i++) rs.push([pts[i - 1].x, pts[i - 1].z, pts[i].x, pts[i].z, half]);
  }
  const roadSegs = segGrid(rs);
  const trackSegs = segGrid(tracks.flatMap((t) => t.pts.slice(1).map((p, i) => [t.pts[i][0], t.pts[i][2], p[0], p[2], t, (t.pts[i][1] + p[1]) / 2])));
  const inLevel = (x, z) => levelSegs(x, z, 16).some((s) => segDist(x, z, s) < s[4]);
  const inRoad = (x, z, y) => roadSegs(x, z, 12).some((s) => segDist(x, z, s) < s[4] && Math.abs(orig(x, z) - y) < 3);
  // (a second track at the same level: a flyover's track over the line is not "between the tracks")
  const nearOther = (x, z, t, y) => trackSegs(x, z, 4).some((s) => s[4] !== t && Math.abs(s[5] - y) < 2.5 && segDist(x, z, s) < 3);
  const m = 4, inTile = (x, z) => x >= bounds.x0 - m && x <= bounds.x1 + m && z >= bounds.z0 - m && z <= bounds.z1 + m;
  const lines = [], breaks = { level: 0, platform: 0, bridge: 0, covered: 0, track: 0, road: 0, skip: 0 };
  let posts = 0;
  for (const t of tracks) {
    // (an OSM bridge way is not always over a void: Moensberg's are short spans on the embankment; the structure test
    // below decides per sample, as for the footprints)
    const F = frames(t);
    for (const sd of [-1, 1]) {
      let run = [];
      const flush = () => { if (run.length >= 2) lines.push(run); run = []; };
      for (let s = 0; s <= t.len + 1e-6; s += RUN_STEP) {
        const f = sample(F, Math.min(s, t.len));
        const x = f.x + f.nx * sd * FENCE, z = f.z + f.nz * sd * FENCE;
        if (!inTile(x, z)) { flush(); continue; }
        // (a rail bridge breaks it where the TRACK is on it, or where the fence would stand over the drop beside its deck;
        // a fence post inside the footprint's flare beside the embankment stays: the car climbed the bank round the end)
        // (the footprint alone is not enough: a hero's footprint reaches past its OSM bridge way and over the tracks beside
        // it; on a structure = in a rail bridge's footprint with the drawn ground > 2.5 m under the rail top)
        const sf = opts.surface || orig, onPlat = inAny(x, z), onT = inAny(f.x, f.z);
        const struct = ((onT === "bridge" || t.bridge) && sf(f.x, f.z) < f.y - 2.5) || ((onPlat === "bridge" || t.bridge) && sf(x, z) < f.y - 2.5);
        const why = (onPlat === "platform" || onT === "platform" ? "platform" : null) || (struct ? "bridge" : null) || (orig(x, z) - f.y >= 3 ? "covered" : null) || (nearOther(x, z, t, f.y) ? "track" : null)
          || (inLevel(x, z) || inLevel(f.x, f.z) ? "level" : null) || (inRoad(x, z, f.y) ? "road" : null) || (opts.skip?.(x, z) ? "skip" : null);
        if (why) { breaks[why]++; flush(); continue; }
        run.push([x, z, f.nx * sd, f.nz * sd]);
      }
      flush();
    }
  }
  for (const r of lines) posts += Math.ceil(lineLen(r) / POST_STEP) + 1;
  return { lines, posts, crossings, breaks };
}
const lineLen = (run) => { let L = 0; for (let i = 1; i < run.length; i++) L += Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]); return L; };

/**
 * The fence bays (rule 39): per run, the points along it with their arc length s, the posts every POST_STEP m (and at the
 * run's end), each point's panel line L (the straight line between its bay's two post tops - FENCE_H) and foot
 * (min(L, ground) - FENCE_FOOT). surface(x, z) = the drawn ground. Returns [{ pts: [{ x, z, nx, nz, s, L, foot, post }] }].
 */
export function fenceBays(lines, surface) {
  const out = [];
  for (const run of lines) {
    const L = lineLen(run);
    if (L < 0.5) continue;
    const nPost = Math.max(1, Math.round(L / POST_STEP)), step = L / nPost;       // (the run's bays all equal, ~2.5 m)
    // the points: every run vertex + every post, by arc length
    const pts = [];
    let s = 0, k = 1, next = 0, pi = 0;
    const at = (i, f) => { const a = run[i - 1], b = run[i]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]; };
    pts.push({ x: run[0][0], z: run[0][1], nx: run[0][2], nz: run[0][3], s: 0, post: 0 }); pi = 1; next = step;
    for (k = 1; k < run.length; k++) {
      const seg = Math.hypot(run[k][0] - run[k - 1][0], run[k][1] - run[k - 1][1]);
      while (pi <= nPost && next <= s + seg + 1e-6) {
        const f = seg > 1e-9 ? Math.min(1, (next - s) / seg) : 1, q = at(k, f);
        pts.push({ x: q[0], z: q[1], nx: q[2], nz: q[3], s: next, post: pi }); pi++; next = pi * step;
      }
      s += seg;
      if (k < run.length - 1 && pts.at(-1).s < s - 0.05 && next > s + 0.05) pts.push({ x: run[k][0], z: run[k][1], nx: run[k][2], nz: run[k][3], s, post: -1 });
    }
    // post heights, then each point's panel line and foot
    const postY = new Float64Array(nPost + 1);
    for (const p of pts) if (p.post >= 0) postY[p.post] = surface(p.x, p.z);
    for (const p of pts) {
      const b = Math.min(nPost - 1, Math.floor(p.s / step + 1e-9)), f = Math.max(0, Math.min(1, (p.s - b * step) / step));
      p.L = postY[b] + (postY[b + 1] - postY[b]) * f;
      p.g = surface(p.x, p.z);
      p.foot = Math.min(p.L, p.g) - FENCE_FOOT;
      p.bay = b;
    }
    out.push({ pts, step, posts: nPost + 1 });
  }
  return out;
}

/** The drawn fence of fenceBays (railway.js fence material: aS = metres along the run, posts where aS is a multiple of
 *  POST_STEP; aH = -FENCE_FOOT at the foot, FENCE_H at the top: the mesh from 5 cm over the ground to 1.72, the top rail
 *  to FENCE_H, straight between the posts). Non-indexed triangles,
 *  one quad per point pair (foot a, foot b, top b / foot a, top b, top a). */
export function fenceMesh2(bays) {
  const P = [], N = [], S = [], H = [];
  for (const { pts, step } of bays) {
    const k = POST_STEP / step;                                       // aS scaled: the posts land on multiples of POST_STEP
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const n = [(a.nx + b.nx) / 2, 0, (a.nz + b.nz) / 2], nl = Math.hypot(n[0], n[2]) || 1;
      // (the foot's aH is -FENCE_FOOT wherever it is: where the ground dips under the bay's line the mesh reaches down to
      // it, a few cm taller, instead of floating over it; the top rail stays the straight line between the posts)
      const v = [[a.x, a.foot, a.z, a.s * k, -FENCE_FOOT], [b.x, b.foot, b.z, b.s * k, -FENCE_FOOT], [b.x, b.L + FENCE_H, b.z, b.s * k, FENCE_H], [a.x, a.L + FENCE_H, a.z, a.s * k, FENCE_H]];
      for (const q of [0, 1, 2, 0, 2, 3]) { const p = v[q]; P.push(p[0], p[1], p[2]); N.push(n[0] / nl, 0, n[2] / nl); S.push(p[3]); H.push(p[4]); }
    }
  }
  return P.length ? { position: Float32Array.from(P), normal: Float32Array.from(N), aS: Float32Array.from(S), aH: Float32Array.from(H) } : null;
}

/** The car's walls of fenceBays: a thin ring per CHUNK_BAYS bays, from the drawn foot to the drawn top (rule 25: the
 *  collider is the panel as drawn). */
export function fenceWalls(bays) {
  const W = FENCE_W / 2, out = [];
  for (const { pts } of bays) {
    for (let i0 = 0; i0 < pts.length - 1;) {
      let i1 = i0 + 1;
      while (i1 < pts.length - 1 && !(pts[i1].post >= 0 && pts[i1].post % CHUNK_BAYS === 0)) i1++;
      // (a steep bay, > 0.4 m between its posts: a wall per point pair, so no wall stands 0.5 m over the panel's low end)
      if (Math.abs(pts[i1].L - pts[i0].L) > 0.4) i1 = i0 + 1;
      const c = pts.slice(i0, i1 + 1);
      const ring = [...c.map((p) => [p.x + p.nx * W, p.z + p.nz * W]), ...c.map((p) => [p.x - p.nx * W, p.z - p.nz * W]).reverse()];
      let top = -Infinity, base = Infinity;
      for (const p of c) { top = Math.max(top, p.L + FENCE_H); base = Math.min(base, p.foot); }
      out.push({ ring, top, base });
      i0 = i1;
    }
  }
  return out;
}

/** The verges of the line (cuttings and embankments): polylines of the drawn tracks inside the tile, for the land cover
 *  (painted as undergrowth instead of grass / bare earth) */
export function railVerges(doc, bounds) {
  const out = [];
  for (const t of tracksIn(doc, bounds, 20)) out.push(t.pts.filter((p, i) => i % 2 === 0 || i === t.pts.length - 1).map((p) => [p[0], p[2]]));
  return out;
}

// ------------------------------------------------------------------------------------------------ per-tile geometry
const PROFILE = [[-FOOT_HW, BED], [-CREST_HW, CREST], [-0.8, CREST + 0.01], [0, CREST + 0.012], [0.8, CREST + 0.01], [CREST_HW, CREST], [FOOT_HW, BED]];
const RAILP = [[-0.075, -0.165], [-0.036, -0.05], [-0.036, -0.008], [-0.03, 0], [0.03, 0], [0.036, -0.008], [0.036, -0.05], [0.075, -0.165]];

function frames(t) {
  const n = t.pts.length, F = [];
  for (let i = 0; i < n; i++) {
    const a = t.pts[Math.max(0, i - 1)], b = t.pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[2] - a[2]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    F.push({ x: t.pts[i][0], y: t.pts[i][1], z: t.pts[i][2], tx, tz, nx: -tz, nz: tx, s: t.S[i] });
  }
  return F;
}
function sample(F, s) {
  let lo = 0, hi = F.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F[m].s <= s) lo = m; else hi = m; }
  const a = F[lo], b = F[hi], f = Math.max(0, Math.min(1, (s - a.s) / ((b.s - a.s) || 1)));
  const tx = a.tx + (b.tx - a.tx) * f, tz = a.tz + (b.tz - a.tz) * f, L = Math.hypot(tx, tz) || 1;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, tx: tx / L, tz: tz / L, nx: -tz / L, nz: tx / L, s };
}
/** +1 (left) or -1: the side of the track with the nearest other track farther (the masts stand outside a pair) */
function outerSide(near, t, f) {
  const d = (side) => {
    const px = f.x + f.nx * side * 4, pz = f.z + f.nz * side * 4;
    let dmin = Infinity;
    for (const o of near) {
      if (o === t || px < o.box.x0 - 8 || px > o.box.x1 + 8 || pz < o.box.z0 - 8 || pz > o.box.z1 + 8) continue;
      for (let i = 0; i < o.pts.length; i += 2) { const p = o.pts[i]; const q = (p[0] - px) ** 2 + (p[2] - pz) ** 2; if (q < dmin) dmin = q; }
    }
    return dmin;
  };
  return d(1) >= d(-1) ? 1 : -1;
}
/** column-major 4x4: yaw about +y (three's convention: local +x -> (cos, -sin) in x, z), scale z, translation */
function yawMatrix(out, o, yaw, x, y, z, sz = 1) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  out.set([c, 0, -s, 0, 0, 1, 0, 0, s * sz, 0, c * sz, 0, x, y, z, 1], o * 16);
}
/** smooth vertex normals of an indexed triangle list */
function normals(P, I) {
  const N = new Float32Array(P.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }
  }
  for (let k = 0; k < N.length; k += 3) { const L = Math.hypot(N[k], N[k + 1], N[k + 2]) || 1; N[k] /= L; N[k + 1] /= L; N[k + 2] /= L; }
  return N;
}
const idxArray = (I, nV) => (nV > 65535 ? Uint32Array.from(I) : Uint16Array.from(I));
function ringArea(r) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }

/** Everything drawn for one tile, as typed arrays (transferable). */
export function railTileData(doc, bounds, heroes = [], { deckCap = null, skipDeck = null } = {}) {
  const ts = tracksIn(doc, bounds, 1);
  const hs = (heroes || []).map(heroFrame);
  const roadHeroes = hs.filter((h) => h.kind === "road_over_rail");
  const inHero = (x, z, m = 0) => hs.some((h) => { const [X, Y] = h.toLocal(x, z); const hb = ringBox(h.ring); return x > hb.x0 - m && x < hb.x1 + m && z > hb.z0 - m && z < hb.z1 + m && inRing(h.ring, x, z); });
  /** the highest the catenary may run at (x, z): under a road bridge's arch, 0.3 m under its intrados, sloping back up
   *  at 1:12 away from the faces (Infinity elsewhere) */
  // (vivier 2026-11-17) + the OSM road decks' soffits (viewer/streets/bridgeDecks.js deckSoffitCap: the deck drawn by
  // the streets, not a hero model): the wires ran through the Chaussee de Waterloo's slab at Vivier d'Oie
  const wireCap = (x, z) => {
    let cap = deckCap ? deckCap(x, z) : Infinity;
    for (const h of roadHeroes) {
      const [X, Y] = h.toLocal(x, z);
      const out = Math.max(0, Math.abs(Y) - h.deck.width / 2);
      if (out > 25) continue;
      for (const o of h.openings) {
        const a = (o.x1 - o.x0) / 2, cx = (o.x0 + o.x1) / 2, u = (X - cx) / a;
        if (Math.abs(u) >= 1) continue;
        const intra = h.road + o.spring + o.rise * Math.sqrt(1 - u * u);
        cap = Math.min(cap, intra - 0.3 + out / 12);
      }
    }
    return cap;
  };
  const nearTracks = tracksIn(doc, bounds, 30);
  const bal = { p: [], u: [], s: [], i: [] }, rl = { p: [], i: [] };
  const sleepers = [], masts = [], wires = { p: [], t: [], side: [], r: [], i: [] };
  let km = 0;
  const pRings = doc.platforms.map((p) => ringBox(p.ring)).filter((b) => b.x1 > bounds.x0 - 20 && b.x0 < bounds.x1 + 20 && b.z1 > bounds.z0 - 20 && b.z0 < bounds.z1 + 20);
  const onPlatform = (x, z) => pRings.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && inRing(b.ring, x, z));
  const addWire = (pts, r) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2], L = Math.hypot(tx, ty, tz) || 1;
      const v0 = wires.p.length / 3;
      for (const p of [a, b]) for (const sd of [-1, 1]) { wires.p.push(p[0], p[1], p[2]); wires.t.push(tx / L, ty / L, tz / L); wires.side.push(sd); wires.r.push(r); }
      wires.i.push(v0, v0 + 2, v0 + 1, v0 + 1, v0 + 2, v0 + 3);
    }
  };
  const addRun = (t, F) => {
    if (F.length < 2) return;
    km += F[F.length - 1].s - F[0].s;
    let v0 = bal.p.length / 3;
    for (const f of F) for (const [d, h] of PROFILE) { bal.p.push(f.x + f.nx * d, f.y + h + t.hash, f.z + f.nz * d); bal.u.push(d); bal.s.push(f.s); }
    const K = PROFILE.length;
    for (let i = 0; i < F.length - 1; i++) for (let k = 0; k < K - 1; k++) { const a = v0 + i * K + k, b = a + 1, c = a + K, d = c + 1; bal.i.push(a, b, c, b, d, c); }
    for (const side of [-1, 1]) {
      v0 = rl.p.length / 3;
      for (const f of F) for (const [d, h] of RAILP) { const o = side * RAIL_C + d; rl.p.push(f.x + f.nx * o, f.y + h, f.z + f.nz * o); }
      const R = RAILP.length;
      for (let i = 0; i < F.length - 1; i++) for (let k = 0; k < R - 1; k++) { const a = v0 + i * R + k, b = a + 1, c = a + R, d = c + 1; rl.i.push(a, b, c, b, d, c); }
    }
    const sA = F[0].s, sB = F[F.length - 1].s;
    for (let s = Math.ceil(sA / SLEEPER_STEP) * SLEEPER_STEP; s < sB; s += SLEEPER_STEP) sleepers.push(sample(F, s));
    if (t.electrified) {
      for (let s0 = Math.ceil(sA / MAST_STEP) * MAST_STEP; s0 < sB; s0 += MAST_STEP) {
        let s = s0;
        // no mast under / in a hero bridge, nor under an OSM road deck (its soffit within 8 m of the rail)
        const blocked = (q) => inHero(q.x, q.z, 3) || (deckCap && deckCap(q.x, q.z) < q.y + 8);
        for (let k = 0; k < 8 && blocked(sample(F, s)); k++) s += 4;
        if (s >= sB) continue;
        const f = sample(F, s), side = outerSide(nearTracks, t, f);
        let off = MAST_OFF;
        while (off < 9 && onPlatform(f.x + f.nx * off * side, f.z + f.nz * off * side)) off += 0.5;
        if (off > MAST_OFF) off += 0.4;
        masts.push({ ...f, side, off });
      }
      const contact = [], mess = [];
      for (let s = sA; s <= sB + 0.01; s += 3) {
        const f = sample(F, Math.min(s, sB));
        const ph = (f.s / MAST_STEP) % 2, zig = (ph < 1 ? ph : 2 - ph) * 0.4 - 0.2;
        const m = (f.s / MAST_STEP) % 1, sag = 4 * m * (1 - m) * 0.75;
        const cap = roadHeroes.length || deckCap ? wireCap(f.x, f.z) : Infinity;
        const yc = Math.min(f.y + WIRE_H, cap - 0.3), ym = Math.max(yc + 0.15, Math.min(f.y + MESSENGER_H - sag, cap));
        contact.push([f.x + f.nx * zig, yc, f.z + f.nz * zig]);
        mess.push([f.x, ym, f.z]);
        if (Math.round(f.s) % 6 === 0) addWire([[f.x + f.nx * zig, yc, f.z + f.nz * zig], [f.x, ym, f.z]], 0.004);
      }
      addWire(contact, 0.0065);
      addWire(mess, 0.0055);
    }
  };
  for (const t of ts) {
    const F = frames(t);
    let i0 = -1, i1 = -1;
    for (let i = 0; i < F.length - 1; i++) {
      if (inside(bounds, (F[i].x + F[i + 1].x) / 2, (F[i].z + F[i + 1].z) / 2)) { if (i0 < 0) i0 = i; i1 = i + 1; }
      else if (i0 >= 0) { addRun(t, F.slice(i0, i1 + 1)); i0 = -1; }
    }
    if (i0 >= 0) addRun(t, F.slice(i0, i1 + 1));
  }
  const out = { stats: { km: +(km / 1000).toFixed(2), sleepers: sleepers.length, masts: masts.length, tris: 0 } };
  if (bal.p.length) {
    const P = Float32Array.from(bal.p), RP = Float32Array.from(rl.p);
    out.ballast = { position: P, normal: normals(P, bal.i), aU: Float32Array.from(bal.u), aS: Float32Array.from(bal.s), index: idxArray(bal.i, P.length / 3) };
    out.rails = { position: RP, normal: normals(RP, rl.i), index: idxArray(rl.i, RP.length / 3) };
    out.stats.tris += (bal.i.length + rl.i.length) / 3;
  }
  if (sleepers.length) {
    const M = new Float32Array(sleepers.length * 16);
    sleepers.forEach((f, k) => yawMatrix(M, k, Math.atan2(-f.tz, f.tx), f.x, f.y, f.z));
    out.sleepers = M;
  }
  if (masts.length) {
    const M = new Float32Array(masts.length * 16);
    masts.forEach((f, k) => yawMatrix(M, k, Math.atan2(-f.tz, f.tx), f.x + f.nx * f.off * f.side, f.y - 0.6, f.z + f.nz * f.off * f.side, f.side * f.off / MAST_OFF));
    out.masts = M;
  }
  if (wires.p.length) {
    const nV = wires.p.length / 3;
    out.wires = { position: Float32Array.from(wires.p), aTan: Float32Array.from(wires.t), aSide: Float32Array.from(wires.side), aR: Float32Array.from(wires.r), index: Uint32Array.from(wires.i) };
    out.stats.tris += wires.i.length / 3; void nV;
  }
  // platforms (flat-shaded: non-indexed with face normals) + shelters
  const plat = doc.platforms.filter((p) => { let cx = 0, cz = 0; for (const q of p.ring) { cx += q[0] / p.ring.length; cz += q[1] / p.ring.length; } return inside(bounds, cx, cz); });
  if (plat.length) {
    const P = [], E = [], shelters = [];
    const tri = (a, b, c) => { P.push(...a.p, ...b.p, ...c.p); E.push(a.e, b.e, c.e); };
    for (const pf of plat) {
      let ring = pf.ring.slice(0, pf.ring[0][0] === pf.ring.at(-1)[0] && pf.ring[0][1] === pf.ring.at(-1)[1] ? -1 : undefined);
      if (ringArea(ring) < 0) ring = ring.reverse();
      const edgeD = (x, z) => {
        let best = Infinity;
        for (const t of nearTracks) {
          if (x < t.box.x0 - 6 || x > t.box.x1 + 6 || z < t.box.z0 - 6 || z > t.box.z1 + 6) continue;
          for (const p of t.pts) { const d = Math.hypot(p[0] - x, p[2] - z); if (d < best) best = d; }
        }
        return Math.max(0, best - 1.65);
      };
      const top = pf.top;
      const V = ring.map(([x, z]) => ({ p: [x, top, z], e: edgeD(x, z) }));
      const T = earcut(ring.flat(), null, 2);
      for (let k = 0; k < T.length; k += 3) tri(V[T[k]], V[T[k + 2]], V[T[k + 1]]);
      for (let k = 0; k < ring.length; k++) {
        const [ax, az] = ring[k], [bx, bz] = ring[(k + 1) % ring.length];
        const A = { p: [ax, top, az], e: 9 }, B = { p: [bx, top, bz], e: 9 }, A2 = { p: [ax, top - 1.3, az], e: 9 }, B2 = { p: [bx, top - 1.3, bz], e: 9 };
        tri(A, B, A2); tri(B, B2, A2);
      }
      if (pf.shelter) {
        let cx = 0, cz = 0; for (const [x, z] of ring) { cx += x / ring.length; cz += z / ring.length; }
        let best = 0, ang = 0;
        for (let k = 0; k < ring.length; k++) { const a = ring[k], b = ring[(k + 1) % ring.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
        shelters.push([cx, top, cz, -ang]);
      }
    }
    const pos = Float32Array.from(P), nrm = new Float32Array(pos.length);
    for (let k = 0; k < pos.length; k += 9) {
      const ux = pos[k + 3] - pos[k], uy = pos[k + 4] - pos[k + 1], uz = pos[k + 5] - pos[k + 2], vx = pos[k + 6] - pos[k], vy = pos[k + 7] - pos[k + 1], vz = pos[k + 8] - pos[k + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
      for (let j = 0; j < 3; j++) nrm.set([nx, ny, nz], k + j * 3);
    }
    out.platforms = { position: pos, normal: nrm, aEdge: Float32Array.from(E), count: plat.length };
    out.stats.platforms = plat.length; out.stats.tris += pos.length / 9;
    if (shelters.length) { const M = new Float32Array(shelters.length * 16); shelters.forEach(([x, y, z, a], k) => yawMatrix(M, k, a, x, y, z)); out.shelters = M; }
  }
  // decks over the line: the UrbIS polygon extruded 0.9 m down from the DTM (flat-shaded)
  // (vivier 2026-11-17) not where the streets draw the deck (skipDeck: an OSM road deck over it, bridgeDecks.js), and
  // never IN the cutting: the 2021 DTM is bare earth, its value at a deck's centroid is the cutting under it (all nine
  // UrbIS slabs stood between 2.3 m under and 0.7 m over the rails: Vivier d'Oie's crossed the trains' path)
  const decks = doc.decks.filter((b) => inside(bounds, b.centre[0], b.centre[1]) && !inHero(b.centre[0], b.centre[1])
    && !(skipDeck && skipDeck(b)) && !(skipDeck && b.railTop != null && b.ground - 0.92 - b.railTop < 4.8));
  if (decks.length) {
    const P = [];
    for (const b of decks) {
      let ring = b.ring.slice(0, -1);
      if (ringArea(ring) < 0) ring = ring.reverse();
      const top = b.ground - 0.02, bot = top - 0.9;
      const T = earcut(ring.flat(), null, 2);
      for (let k = 0; k < T.length; k += 3) for (const j of [0, 2, 1]) { const [x, z] = ring[T[k + j]]; P.push(x, top, z); }
      for (let k = 0; k < T.length; k += 3) for (const j of [0, 1, 2]) { const [x, z] = ring[T[k + j]]; P.push(x, bot, z); }
      for (let k = 0; k < ring.length; k++) {
        const [ax, az] = ring[k], [bx, bz] = ring[(k + 1) % ring.length];
        P.push(ax, top, az, bx, top, bz, ax, bot, az, bx, top, bz, bx, bot, bz, ax, bot, az);
      }
    }
    const pos = Float32Array.from(P), nrm = new Float32Array(pos.length);
    for (let k = 0; k < pos.length; k += 9) {
      const ux = pos[k + 3] - pos[k], uy = pos[k + 4] - pos[k + 1], uz = pos[k + 5] - pos[k + 2], vx = pos[k + 6] - pos[k], vy = pos[k + 7] - pos[k + 1], vz = pos[k + 8] - pos[k + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
      for (let j = 0; j < 3; j++) nrm.set([nx, ny, nz], k + j * 3);
    }
    out.decks = { position: pos, normal: nrm, count: decks.length };
    out.stats.decks = decks.length; out.stats.tris += pos.length / 9;
  }
  out.stats.tris = Math.round(out.stats.tris);
  return out;
}
