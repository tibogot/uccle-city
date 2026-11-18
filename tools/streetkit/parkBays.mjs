// PARKING BAYS for the Villo stations (claude/streetprops round 3, rule 30). Real Villo stations on the Chaussée
// d'Alsemberg stand in the parking lane. "A parking bay" = where the city parks cars: the slots of
// viewer/streets/parkPlace.js widthParking (the same data the tile worker gives main.js's parked cars), a spot within a
// slot's car box (1.85 x 4.73 m, plus 1.6 m along: the empty slots between occupied ones), never on the tram road
// (class 1) nor within TRAM_CLEAR of a track. Shared by tools/streetkit/snapProps.mjs (where a lane station may stand)
// and tools/audit/census/streetProps.mjs (the gate: such a station is on paving, and no parked car left overlaps it).
export const BOX_HW = 0.925, BOX_HL = 2.365;

/** car c's local frame (bonnet = +x along (cos yaw, -sin yaw)): { along, across } of (x, z) */
const local = (c, x, z) => { const ax = Math.cos(c.yaw), az = -Math.sin(c.yaw), dx = x - c.x, dz = z - c.z; return { along: dx * ax + dz * az, across: dx * az - dz * ax }; };

/** sites: widthParking(...).sites; cls(x, z): the measured class; tramDist(x, z): m to a track centre; clear: TRAM_CLEAR */
export function parkBays(sites, cls, tramDist, clear) {
  const G = new Map(), C = 8, key = (i, j) => `${i},${j}`;
  sites.forEach((c) => { const k = key(Math.floor(c.x / C), Math.floor(c.z / C)); if (!G.has(k)) G.set(k, []); G.get(k).push(c); });
  const near = (x, z) => { const out = [], i0 = Math.floor(x / C), j0 = Math.floor(z / C); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) out.push(...(G.get(key(i, j)) || [])); return out; };
  /** in a parking bay */
  const bay = (x, z) => {
    if (cls(x, z) === 1 || tramDist(x, z) < clear) return false;
    return near(x, z).some((c) => { const l = local(c, x, z); return Math.abs(l.along) <= BOX_HL + 1.6 && Math.abs(l.across) <= BOX_HW + 0.15; });
  };
  return { bay, near };
}

/** (x, z) inside parked car c's box (+ pad m) */
export const inCar = (c, x, z, pad = 0) => { const l = local(c, x, z); return Math.abs(l.along) <= BOX_HL + pad && Math.abs(l.across) <= BOX_HW + pad; };

/** viewer/streetkit/cityStreetKit.js keepCarsClear, as a filter over the sites (the same test main.js applies) */
export function carsKept(sites, villo) {
  const areas = (villo || []).filter((v) => v.mode === "lane" && v.area).map((v) => v.area);
  return sites.filter((p) => !areas.some((a) => {
    const dx = p.x - a.x, dz = p.z - a.z, cs = Math.cos(a.yaw), sn = Math.sin(a.yaw);
    const along = dx * sn + dz * cs, across = dx * cs - dz * sn;
    return Math.abs(along) < a.hx + 2.3 && Math.abs(across) < a.hz + 0.9;
  }));
}
