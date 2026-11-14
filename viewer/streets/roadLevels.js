// ROAD LEVELS (roads round 5): the engine's roads back onto the measured ground where its grade rule lifted them.
//
// The vendored engine (read-only) fits each junction to a plane through the DTM, then relaxNodeHeights moves junction
// heights until every road between two junctions can climb within its road type's grade limit (local street 12 %,
// avenue 8 %, rural road 8 %...). Uccle's real streets are steeper than that in places, so a junction at the foot or
// the top of a steep street was moved up or down by up to 2.7 m, and the roads on it with it: D10 Rue de la Brasserie /
// Vieux Chemin floated 1.1-1.4 m over the terrain with an open edge (collisions audit, docs/collisions/road_ledges.txt).
// The DTM includes the street surface, so the real street is at the DTM: here every junction the relaxation moved by
// more than MOVE_TOL goes back to its fitted height (its plane's slope is kept), and every road on such a junction gets
// its terrain profile again, its grade limit raised to what the measured climb between its two junctions needs.
// Left alone: roads with a bridge or a tunnel (engine structures) or an authored profile, junctions with an authored
// height, junctions whose ground has no DTM data (outside the region, off the tile's grid), is no plane (RMS > RMS_MAX:
// a cutting, a wall) or that moved more than MOVE_MAX. Runs between buildRoadNetwork and the meshes (the meshes read node.y / rr.prof).
import { buildProfile, profileAt } from "../../vendor/roads/roadProfile.js";
import { planeY, pinnedProfile, blendProfileEnds } from "../../vendor/roads/roadSurface.js";
import { evalAlignment } from "../../vendor/roads/roadAlignment.js";

const MOVE_TOL = 0.2;            // m: a junction the relaxation moved by more than this goes back to the ground
const RMS_MAX = 0.5;             // m: ... unless the ground round it strays further than this from its plane
const MOVE_MAX = 3.0;            // m: ... or the move is bigger (E10: a 3.5 m move made new steps; left as the engine made it)

/** The height fitNodePlane gives a node: the mean of the DTM over its centre and three rings (0.35, 0.7, 1 x reach),
 *  and how far the ground strays from the node's plane there (RMS): null where the DTM has no data. */
function fittedY(node, ground, noData) {
  const R = node.reach || 6, pts = [[0, 0]];
  for (const [f, cnt] of [[0.35, 8], [0.7, 12], [1, 16]]) for (let k = 0; k < cnt; k++) {
    const a = (k / cnt) * Math.PI * 2;
    pts.push([Math.cos(a) * R * f, Math.sin(a) * R * f]);
  }
  let s = 0;
  const ys = pts.map(([dx, dz]) => ground(node.x + dx, node.z + dz));
  if (noData && pts.some(([dx, dz]) => noData(node.x + dx, node.z + dz))) return null;
  for (const y of ys) s += y;
  const y0 = s / ys.length, gx = node.plane?.gx ?? 0, gz = node.plane?.gz ?? 0;
  let e = 0;
  pts.forEach(([dx, dz], k) => { e += (ys[k] - (y0 + gx * dx + gz * dz)) ** 2; });
  return { y: y0, rms: Math.sqrt(e / ys.length) };
}

// `noData` (optional, (x, z) -> bool): the DTM has no value there (outside the Brussels region the tile's grid holds
// its lowest value): the engine sees a "bridge" over that fake pit, which is not a structure to keep.
export function relevelRoads(net, ground, noData = null) {
  const st = { nodes: 0, maxMove: 0, roads: 0, skippedStructure: 0 };
  if (!net?.nodes) return st;
  const realSpan = (rr, sp) => {
    if (!noData) return true;
    for (let s = sp.s0; s <= sp.s1; s += 2) { const e = evalAlignment(rr.al, s); if (!noData(e.x, e.z)) return true; }
    return false;
  };
  // HORIZON / region border (docs/HORIZON.md): only a structure OSM tags (bridge / tunnel / layer) is kept. The engine
  // also marks a "bridge" wherever its grade limit holds a profile > 3 m over the DTM (a steep street, a sunken lane in
  // Linkebeek): that is the lift this pass undoes, not a structure (D10 Rue de la Brasserie went 1.5-2.6 m up once the
  // Flemish DTM gave its lower end real ground).
  const osmStructure = (rr) => { const m = rr.src?.meta; return !!(m && (m.bridge || m.tunnel || m.layer)); };
  const fixedRoad = (rr) => (osmStructure(rr) && ((rr.bridges || []).some((sp) => realSpan(rr, sp)) || (rr.tunnels || []).some((sp) => realSpan(rr, sp)))) ||
    (rr.prof?.mode && rr.prof.mode !== "terrain");
  const moved = new Set();
  for (const node of net.nodes) {
    if (node.src?.y != null || !node.arms?.length) continue;
    const fit = fittedY(node, ground, noData);
    if (fit == null) { st.skippedNoData = (st.skippedNoData || 0) + 1; continue; }     // no DTM under it: nothing to go back to
    // the ground round it is no plane (a cutting, a wall, a bridge's deck over a cutting): its mean is no street level
    if (fit.rms > RMS_MAX) { st.skippedRough = (st.skippedRough || 0) + 1; continue; }
    const y0 = fit.y, d = node.y - y0;
    if (Math.abs(d) <= MOVE_TOL) continue;
    if (Math.abs(d) > MOVE_MAX) { st.skippedBig = (st.skippedBig || 0) + 1; continue; }
    if (node.arms.some((a) => fixedRoad(a.road))) { st.skippedStructure++; continue; }
    node.y = y0;
    moved.add(node);
    st.nodes++;
    if (Math.abs(d) > st.maxMove) { st.maxMove = Math.abs(d); st.maxAt = [Math.round(node.x), Math.round(node.z)]; }
  }
  for (const rr of net.roads) {
    if (!moved.has(rr.A) && !moved.has(rr.B)) continue;
    const { armA: aA, armB: aB, al, L, type } = rr;
    const ya = planeY(rr.A, aA.ox, aA.oz), yb = planeY(rr.B, aB.ox, aB.oz);
    const free = Math.max(1, L - (rr.surf?.A.pin ?? 0) - (rr.surf?.B.pin ?? 0));
    const need = Math.abs(yb - ya) / free / (0.92 * 0.9);
    const grade = Math.max(type.maxGrade, need);
    const groundAt = (s) => { const e = evalAlignment(al, s); return ground(e.x, e.z); };
    rr.prof = buildProfile(rr.src, L, { ya, yb, fixed: pinnedProfile(rr) }, groundAt, grade);
    blendProfileEnds(rr);
    st.roads++;
  }
  st.maxMove = Math.round(st.maxMove * 100) / 100;
  dropLifts(net, ground, noData, fixedRoad, st);
  return st;
}

// LIFTS (drive fix, docs/collisions/DRIVE_FIX.md): between two junctions the engine's grade limit (local street 12 %)
// still holds a 'terrain' road up wherever the measured ground falls faster: the Linkebeek sunken lanes (holle wegen:
// 2-4 m deep trenches, 15-30 % climbs, E10 / F10) and Rue de la Brasserie (C9 / D9) were drawn 3-8 m over the DTM, a
// causeway the car fell off and drove into the walls of. Here every terrain road (not an OSM bridge / tunnel, not an
// authored profile) whose profile stands more than LIFT_TOL over the DTM gets its profile again with the steep grade
// limit STEEP_GRADE, its ground the LOWER of the DTM and its current profile (so it only comes down: a road the grade
// limit keeps UNDER a hump, e.g. through a cutting under a railway, stays where it is). Its end stretches stay on their
// junction planes (pinnedProfile). Not where the DTM has no data (a fake pit, off the tile's grid).
const LIFT_TOL = 1.0;            // m over the DTM
const STEEP_GRADE = 0.32;        // the steepest measured lanes (Kleindalstraat, the Linkebeek trenches) climb ~30 %
function dropLifts(net, ground, noData, fixedRoad, st) {
  st.lifted = 0; st.maxLift = 0;
  for (const rr of net.roads || []) {
    const P = rr.prof;
    if (!P || P.mode !== "terrain" || fixedRoad(rr) || !rr.al || !rr.surf) continue;
    let lift = 0;
    for (let i = 0; i < P.s.length; i++) {
      const d = P.y[i] - P.ground[i];
      if (d <= LIFT_TOL) continue;
      if (noData) { const e = evalAlignment(rr.al, P.s[i]); if (noData(e.x, e.z)) continue; }
      lift = Math.max(lift, d);
    }
    if (lift <= LIFT_TOL) continue;
    const { armA: aA, armB: aB, L, type } = rr;
    const ya = planeY(rr.A, aA.ox, aA.oz), yb = planeY(rr.B, aB.ox, aB.oz);
    // (where the DTM has no data, off the tile's grid: the current profile, nothing to come down to)
    const groundAt = (s) => { const e = evalAlignment(rr.al, s), y = profileAt(P, s).y; return noData && noData(e.x, e.z) ? y : Math.min(y, ground(e.x, e.z)); };
    const np = buildProfile(rr.src, L, { ya, yb, fixed: pinnedProfile(rr) }, groundAt, Math.max(type.maxGrade, STEEP_GRADE));
    for (let i = 0; i < np.s.length; i++) { const e = evalAlignment(rr.al, np.s[i]); np.ground[i] = ground(e.x, e.z); }   // the real DTM
    rr.prof = np;
    st.lifted++;
    if (lift > st.maxLift) { st.maxLift = Math.round(lift * 100) / 100; st.maxLiftAt = (() => { const e = evalAlignment(rr.al, L / 2); return [Math.round(e.x), Math.round(e.z)]; })(); }
  }
}
