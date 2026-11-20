// THE HERO ROAD BRIDGES' DECK + PARAPET RINGS from their notes (models/rail/<name>.json, kind "road_over_rail"), no THREE:
// the page (viewer/rail/bridgeModel.js re-exports them) and the node checks (tools/audit/driveCheck.mjs) share them.
// ------------------------------------------------------------------------------------------------ road bridges: deck + colliders
/** A road bridge's frame helpers from its notes (models/rail/<name>.json, kind "road_over_rail"). */
export function roadFrame(info) {
  const th = -info.placement.rotation_y_rad, c = Math.cos(th), s = Math.sin(th);
  const [px, py, pz] = info.placement.city_local_position;
  const toLocal = (x, z) => { const dx = x - px, dz = z - pz; return [dx * c + dz * s, -(-dx * s + dz * c)]; };
  const toWorld = (X, Y) => [px + X * c + Y * s, pz + X * s - Y * c];
  const d = info.deck, [r0, r1] = d.road_ends;
  const road = (X) => r0 + (Math.max(d.x0, Math.min(d.x1, X)) - d.x0) * (r1 - r0) / (d.x1 - d.x0);
  const faceY = (X, base) => base + d.flare * Math.max(0, (Math.abs(X) - d.fold) / (d.x1 - d.fold));
  return { toLocal, toWorld, road, faceY, d, floor: py };
}

/** (x, z) -> the walking / driving surface on a road bridge's deck (m TAW), or null off it: the roadway, the NE
 *  sidewalk (+0.13), the SW strip, and the footbridge's deck. Used by walk / drive / third-person heights: the terrain
 *  under the bridge is the cutting. */
export function deckHeightFn(info) {
  if (info.kind !== "road_over_rail") return () => null;
  const F = roadFrame(info), d = F.d, f = info.foot;
  return (x, z) => {
    const [X, Y] = F.toLocal(x, z);
    if (X < d.x0 - 0.6 || X > d.x1 + 0.6) return null;
    const yi = F.faceY(X, d.parapet_inner);
    if (Math.abs(Y) <= yi) {
      const r = F.road(X);
      if (Y >= d.kerb_ne) return r + d.sidewalk_ne;
      if (Y <= d.kerb_sw) return r + d.strip_sw[1] + (d.strip_sw[0] - d.strip_sw[1]) * (d.kerb_sw - Y) / (d.kerb_sw + yi);
      return r;
    }
    if (f && X >= f.x0 && X <= f.x1) {
      const w = X >= f.x_flare ? f.w : f.w + (f.w_nw - f.w) * (f.x_flare - X) / (f.x_flare - f.x0);
      if (Y <= f.y_inner && Y >= f.y_inner - w) return F.road(X) - f.top_under_road + (X - Math.max(d.x0, Math.min(d.x1, X))) * d.grade;
    }
    return null;
  };
}

/** Drive colliders (driveMode addStatic): the two parapets and the footbridge's outer parapet, as plan rings. */
export function roadBridgeColliders(info) {
  if (info.kind !== "road_over_rail") return [];
  const F = roadFrame(info), d = F.d, f = info.foot, rings = [];
  const wall = (sg) => {
    const xs = [d.x0, -d.fold, d.fold, d.x1], inner = xs.map((X) => F.toWorld(X, sg * F.faceY(X, d.parapet_inner)));
    const outer = xs.map((X) => F.toWorld(X, sg * F.faceY(X, d.parapet_inner + 0.42))).reverse();
    return inner.concat(outer);
  };
  rings.push(wall(1), wall(-1));
  if (f) {
    const xs = [f.x0, f.x_flare, f.x1], W = (X) => (X >= f.x_flare ? f.w : f.w_nw);
    rings.push(xs.map((X) => F.toWorld(X, f.y_inner - W(X))).concat(xs.slice().reverse().map((X) => F.toWorld(X, f.y_inner - W(X) - 0.3))));
  }
  return [{ rings, kind: 5 }];
}

/**
 * (claude/drivecheck round 2; entry.deckLanes === false / ?decklanes=old: as before) The traffic lanes over a hero road
 * deck held inside its roadway: the lanes come from the OSM band (Rue de Verrewinkel: two 3 m lanes, +-1.5 m), the
 * deck between its parapets is 4.2 m, so a car body (0.9 m half width) on either lane stood 0.3-0.5 m in a parapet.
 * Every traffic point over the deck's span (+3 m past its ends) is pulled to at most parapet_inner - 1.0 m off the axis
 * (+0.15 m per m past an end: a taper back to the street's lanes). traffic = the tile's graph ({ xy }), changed in place;
 * returns the points moved.
 */
export function squeezeDeckLanes(traffic, heroes) {
  if (!traffic?.xy) return 0;
  let n = 0;
  for (const h of heroes || []) {
    if (h.kind !== "road_over_rail") continue;
    const F = roadFrame(h), d = F.d, xy = traffic.xy;
    for (let i = 0; i < xy.length; i += 2) {
      const [X, Y] = F.toLocal(xy[i], xy[i + 1]);
      if (X < d.x0 - 3 || X > d.x1 + 3) continue;
      const face = F.faceY(X, d.parapet_inner);
      if (Math.abs(Y) >= face + 0.5) continue;
      const lim = d.parapet_inner - 1.0 + 0.15 * Math.max(0, Math.abs(X) - d.x1);
      if (Math.abs(Y) <= lim) continue;
      const [x, z] = F.toWorld(X, Math.sign(Y) * lim);
      xy[i] = x; xy[i + 1] = z; n++;
    }
  }
  return n;
}
