// WHY A TRAFFIC LANE / TURN POINT IS FLAGGED (claude/lanes5, docs/STREET_MODEL_PLAN.md job 4b, rule street-lanes): the
// evidence at a flagged point of the driven graph (viewer/traffic/tileTraffic.js) and the cause it gives, in three
// classes:
//   a  the source data: a UrbIS footprint over the measured carriageway, an OSM centre line far off the measured
//      carriageway (X), a street UrbIS maps without its carriageway (no roadway polygon, the drawn band from OSM)
//   b  the measure itself: the carriageway there is only estimated (the model's driving ends O / G, not M / D), so
//      "off the carriageway" is judged against a guess
//   c  our builder: an old-fit lane (the model does not build it), a lane end / cap, a junction turn, a stage after
//      the model (joins, kink rounding, the turn repair), the lane fit on a measured street
// Used by tools/audit/census/streetLanes.mjs (findings) and tools/audit/census/roads.mjs (places).
import { imp, SC } from "./lib_street.mjs";

const CARR = new Set([SC.roadway, SC.tramRoad, SC.parking]);
const { CONF, CONF_NAME } = await imp("viewer/street/model.js");
const { inJunction } = await imp("viewer/street/lanes.js");
const { roofAt } = await imp("viewer/traffic/tileTraffic.js");

/** each classifier outcome: [class, gaps.mjs cause] (a source data, b the measure, c our builder) */
export const KLASS = {
  "footprint-over-street": ["a", "source-data"],
  "no-room-between-footprints": ["a", "source-data"],
  "osm-through-buildings": ["a", "osm-contradiction"],  // no UrbIS street there and the OSM centre line itself runs through drawn buildings   // the footprints across the street leave no car's width (1.8 m) anywhere within +-6 m, and UrbIS maps no roadway      // a UrbIS footprint over the MEASURED roadway (an overhang, a passage)
  "no-roadway-polygon": ["a", "source-data"],         // UrbIS maps the street's surface (sidewalk / square / tram site) but no roadway
  "sliver": ["a", "source-data"],                     // the measured "carriageway" is a strip narrower than a car (a UrbIS sliver at the region edge)
  "estimated-carriageway": ["b", "carriageway-estimated"],  // the driving ends there are D / O / G: the check is judged against a guess
  "osm-band": ["b", "carriageway-estimated"],         // no UrbIS at all: the carriageway is the OSM band (a guess)
  "estimated-junction": ["b", "junction-unmodelled"], // a junction with no measured arm mouth: its polygon is the floor disc (a guess)
  "old-fit": ["c", "lane-old-fit"],                   // a lane / turn the model does not build (the old fit)
  "lane-dragged": ["c", "lane-dragged"],              // at a measured station, outside the model's room: a need from elsewhere ramped in
  "after-model": ["c", "after-model"],                // moved after the model stage (joins, kink rounding, the turn repair)
  "lane-end": ["c", "lane-end"],                      // within 4 m of a lane's end (the cap at a mouth / a corner)
  "turn-corner": ["c", "turn-corner"],                // a junction turn
  "lane-fit": ["c", "stack-lag"],                     // inside the model's room on a measured street: the smoothed lane vs the kerb lines
};

/**
 * The evidence context of a built tile. S: streetTile(T), g: the graph, trace: its trace (src, afterModel), model: the
 * tile's street model. -> { at(x, z, path, nx, nz) -> evidence, classify(inv, evidence[]) -> { why, klass, cause } }
 */
export function laneCtx(S, g, trace, model) {
  const { classAt, bounds } = S;
  const segOf = new Map();
  for (const E of model?.segments || []) E.sources.roads.forEach((id) => segOf.set(id, E));
  const J = model?.junctions || [];
  const after = new Map((trace.afterModel || []).map((p) => [p.id, p.pts]));
  const pathLen = (i) => g.cum[g.off[i + 1] - 1];
  const nearest = (E, x, z) => { let bi = 0, bd = Infinity; for (let i = 0; i < E.n; i++) { const d = (E.ax[i] - x) ** 2 + (E.az[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } return { i: bi, d: Math.sqrt(bd), t: (x - E.ax[bi]) * E.nx[bi] + (z - E.az[bi]) * E.nz[bi] }; };
  const polyD = (P, x, z) => { let m = Infinity; for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-12, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); m = Math.min(m, Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u)); } return m; };
  const junctionOf = (x, z, tol) => { for (const j of J) if (Math.abs(j.x - x) < 60 && Math.abs(j.z - z) < 60 && inJunction(j, x, z, tol)) return j; return null; };

  /** the evidence at point (x, z) of path p (arc length sd along it) */
  function at(x, z, p, sd = null, nx = null, nz = null) {
    const src = trace.src?.[p], E = src?.roadId ? segOf.get(src.roadId) : null;
    const e = { mdl: g.model[p], kind: g.kind[p], turn: g.turn[p], cls: classAt(x, z) };
    e.carr = CARR.has(e.cls);
    if (sd != null) { const L = pathLen(p); e.endD = Math.min(sd, L - sd); e.len = L; }
    const A = src && after.get(src.id);
    e.moved = A ? polyD(A, x, z) : null;
    const j = junctionOf(x, z, 3); e.jn = j ? j.id : null; e.jconf = j ? CONF_NAME[j.conf] : null;
    // (the widest gap between drawn buildings across the point, within +-6 m: room for a car body or not)
    if (nx != null && S.tile?.roofs) { let run = 0, best = 0; for (let t = -6; t <= 6; t += 0.25) { if (roofAt(S.tile.roofs, x + nx * t, z + nz * t)) run = 0; else { run += 0.25; best = Math.max(best, run); } } e.gap = best; }
    // (measured carriageway across the point within 4 m either side: where the street is)
    e.across = null;
    for (let d = 0.5; d <= 4 && e.across == null && nx != null; d += 0.5) if (CARR.has(classAt(x + nx * d, z + nz * d)) || CARR.has(classAt(x - nx * d, z - nz * d))) e.across = d;
    e.seam = x - bounds.x0 < 6 || bounds.x1 - x < 6 || z - bounds.z0 < 6 || bounds.z1 - z < 6;
    if (E) {
      const q = nearest(E, x, z), i = q.i;
      e.seg = E.id; e.i = i;
      e.confL = CONF_NAME[E.drive.confL[i]]; e.confR = CONF_NAME[E.drive.confR[i]]; e.ax = CONF_NAME[E.axConf[i]];
      e.meas = E.drive.confL[i] <= CONF.D && E.drive.confR[i] <= CONF.D;
      e.measM = E.drive.confL[i] === CONF.M && E.drive.confR[i] === CONF.M;
      e.inDrive = q.t >= E.drive.offR[i] - 0.3 && q.t <= E.drive.offL[i] + 0.3;
      e.inKerb = q.t >= E.kerbR.off[i] - 0.3 && q.t <= E.kerbL.off[i] + 0.3;
      e.osmOff = Math.abs(E.axOff[i]);
      e.W = E.drive.offL[i] - E.drive.offR[i];
      e.bare = E.axConf[i] === CONF.E;
      e.X = E.axConf[i] === CONF.X || E.lanes.conf[i] === CONF.X;
      // (outside the room the model gives a lane at a measured station: KERB_CLEAR inside the driving ends, or within
      // 0.5 m of the middle of a carriageway narrower than two clearances + 0.5)
      const lo = E.drive.offR[i], hi = E.drive.offL[i], mid = (lo + hi) / 2;
      e.outRoom = e.meas && (hi - lo < 2.5 ? Math.abs(q.t - mid) > 0.5 : q.t < lo + 0.8 || q.t > hi - 0.8);
      e.t = Math.round(q.t * 100) / 100; e.axOffS = E.axOff[i];
      // (the OSM centre line itself at that station, a car body across it, in a drawn building)
      if (S.tile?.roofs) { const ox = E.ax[i] - E.nx[i] * E.axOff[i], oz = E.az[i] - E.nz[i] * E.axOff[i]; e.osmIn = [0, 0.9, -0.9].some((w) => roofAt(S.tile.roofs, ox + E.nx[i] * w, oz + E.nz[i] * w)); }
    }
    return e;
  }

  /** the cause of a finding / place from its points' evidence (shares over the points; the first rule that holds) */
  function classify(inv, ev) {
    const n = ev.length || 1, most = (f) => ev.filter(f).length / n > 0.5;
    const turn = most((e) => e.kind === 1);
    let why;
    if (inv === "building" && most((e) => e.gap != null && e.gap < 2 && !e.carr)) why = "no-room-between-footprints";
    else if (inv === "building" && most((e) => e.osmIn && !e.meas && !e.carr && Math.abs(e.t + e.axOffS) < 3)) why = "osm-through-buildings";
    else if (most((e) => e.mdl === 0)) why = "old-fit";
    else if (inv === "building" && ev.filter((e) => e.carr).length / n >= 0.5) why = "footprint-over-street";
    else if (most((e) => e.moved != null && e.moved > 0.3)) why = "after-model";
    else if (turn) why = inv === "turn" && most((e) => e.jconf === "O") ? "estimated-junction" : "turn-corner";
    else if (most((e) => e.outRoom)) why = "lane-dragged";
    else if (most((e) => e.meas && e.W < 2.3 && e.X)) why = "sliver";
    else if (inv !== "kerb" && most((e) => e.bare && e.cls >= 0 && !e.carr)) why = "no-roadway-polygon";
    else if (most((e) => e.endD != null && e.endD < 4)) why = "lane-end";
    else if (most((e) => e.bare && e.cls < 0)) why = "osm-band";
    else if (most((e) => !e.measM)) why = "estimated-carriageway";
    else why = "lane-fit";
    const [klass, cause] = KLASS[why];
    return { why, klass, cause };
  }
  return { at, classify };
}
