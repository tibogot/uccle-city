// SNCB TRAINS ON THE REAL TIMETABLE (data/transit/sncb-uccle.json from pipeline/build_trains.py: the SNCB GTFS feed, every
// train that calls at or passes through Uccle on three service days) along the routes of data/rail/rail.json (OSM
// tracks fitted to the LiDAR DTM: the right track per direction, heights and grades included).
//
// Each frame, for the clock time, every running trip is placed by interpolating between its timetable points (stations
// it calls at: standing still between arrival and departure; stations beyond the route's ends: the distance estimated
// in the pipeline): between two points the train accelerates at ACC, cruises, brakes at ACC (continuous speed; a hop
// too short for that profile is a smoothstep). A trip with units = 2 (IC) is two AM08 coupled cab to cab.
//
// LIVE FEED (later): the schedule is read through `source` = { delay(trip, T) -> seconds, cancelled(trip) -> bool }.
// The static source says 0 / false. A GTFS-Realtime TripUpdates adapter (SNCB publishes one on the same NAP) would map
// trip_id / trip_short_name -> delay at the next stop and plug in with setSource(); nothing else changes.
// Clock: Brussels local time now, ?clock=HH:MM, ?timescale=N (or the city's tram clock when given: one city clock).
import * as THREE from "three/webgpu";
import { loadTrainModel, createTrainFleet, trainPose } from "./trainModel.js";

const ACC = 0.75;                        // m/s2, AM08 service acceleration / braking (rated ~1.0)

function brusselsNow() {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { secs: +p.hour * 3600 + +p.minute * 60 + +p.second, dow: p.weekday };
}

/** distance covered after t seconds of a hop of D metres scheduled to take T seconds (accelerate, cruise, brake) */
export function travel(D, T, t) {
  if (D <= 0 || T <= 0) return 0;
  if (t <= 0) return 0;
  if (t >= T) return D;
  const disc = T * T - 4 * D / ACC;
  if (disc <= 0) { const f = t / T; return D * f * f * (3 - 2 * f); }
  const v = ACC * (T - Math.sqrt(disc)) / 2, ta = v / ACC;
  if (t < ta) return 0.5 * ACC * t * t;
  if (t < T - ta) return 0.5 * ACC * ta * ta + v * (t - ta);
  return D - 0.5 * ACC * (T - t) ** 2;
}

/** route polyline -> at(s): [x, y, z, heading] with interpolated tangents; straight extrapolation beyond the ends */
export function routeTrack(r) {
  const n = r.pts.length, P = new Float64Array(n * 3), cum = new Float64Array(n), tan = new Float64Array(n * 2);
  r.pts.forEach((p, i) => { P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; if (i) cum[i] = cum[i - 1] + Math.hypot(p[0] - r.pts[i - 1][0], p[2] - r.pts[i - 1][2]); });
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 3), b = Math.min(n - 1, i + 3);
    const dx = P[b * 3] - P[a * 3], dz = P[b * 3 + 2] - P[a * 3 + 2], L = Math.hypot(dx, dz) || 1;
    tan[i * 2] = dx / L; tan[i * 2 + 1] = dz / L;
  }
  const len = cum[n - 1];
  const at = (s) => {
    if (s <= 0) return [P[0] + tan[0] * s, P[1], P[2] + tan[1] * s, Math.atan2(-tan[1], tan[0])];
    if (s >= len) { const e = s - len, k = n - 1; return [P[k * 3] + tan[k * 2] * e, P[k * 3 + 1], P[k * 3 + 2] + tan[k * 2 + 1] * e, Math.atan2(-tan[k * 2 + 1], tan[k * 2])]; }
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    const tx = tan[lo * 2] * (1 - f) + tan[hi * 2] * f, tz = tan[lo * 2 + 1] * (1 - f) + tan[hi * 2 + 1] * f;
    return [P[lo * 3] + (P[hi * 3] - P[lo * 3]) * f, P[lo * 3 + 1] + (P[hi * 3 + 1] - P[lo * 3 + 1]) * f, P[lo * 3 + 2] + (P[hi * 3 + 2] - P[lo * 3 + 2]) * f, Math.atan2(-tz, tx)];
  };
  return { at, len, inTiles: r.inTiles };
}

export async function createTrains({ rail, url = new URL("../../data/transit/sncb-uccle.json", import.meta.url), parent, clock = null, maxUnits = 40 }) {
  const doc = await fetch(url).then((r) => { if (!r.ok) throw new Error(`sncb-uccle.json: HTTP ${r.status}`); return r.json(); });
  const model = await loadTrainModel();
  const routes = {};
  for (const [id, r] of Object.entries(rail.routes)) routes[id] = routeTrack(r);
  const group = new THREE.Group(); group.name = "trains";
  parent.add(group);
  const fleet = createTrainFleet(model, group, maxUnits);
  const params = new URLSearchParams(location.search);
  let scale = +(params.get("timescale") || 1), t0 = performance.now();
  const now0 = brusselsNow();
  const clockP = params.get("clock");
  let startSecs = clockP ? clockP.split(":").reduce((a, v, i) => a + +v * [3600, 60, 1][i], 0) : now0.secs;
  const dayType = { Sat: "saturday", Sun: "sunday" }[now0.dow] || "weekday";
  let ownClock = () => startSecs + ((performance.now() - t0) / 1000) * scale;
  const clockFn = () => (clock ? clock() : ownClock());
  const trips = doc.trips.filter((t) => t.days.includes(params.get("day") || dayType));
  let source = { delay: () => 0, cancelled: () => false };
  const L = model.layout.length;

  /** the nose's distance along its route at time T (seconds), or null when not running */
  const posOf = (t, T) => {
    const st = t.stops, first = st[0][2], last = st[st.length - 1][1];
    const dl = source.delay(t, T);
    let tt = T - dl;
    if (!(tt >= first && tt <= last)) { tt += 86400; if (!(tt >= first && tt <= last)) return null; }
    let d = st[0][0], v = 0;
    for (let i = 0; i < st.length - 1; i++) {
      const [d0, , dep0] = st[i], [d1, arr1] = st[i + 1];
      if (tt < st[i][1]) break;
      if (tt <= dep0) { d = d0; break; }
      if (tt <= arr1) { const T_ = Math.max(1, arr1 - dep0); d = d0 + travel(d1 - d0, T_, tt - dep0); v = (travel(d1 - d0, T_, tt - dep0 + 0.5) - travel(d1 - d0, T_, tt - dep0 - 0.5)); break; }
      d = d1;
    }
    return { d, v, tt };
  };
  const pose = [], pose2 = [], pool = [], pool2 = [];
  const stats = { running: 0, drawn: 0, appearInView: 0, vanishInView: 0 };
  let prevInView = new Set();
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere();
  const update = (camPos, camera = null) => {
    const T = clockFn() % 86400;
    fleet.begin(camera, camPos);
    stats.running = 0; stats.drawn = 0;
    if (camera) { pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); }
    const inView = new Set();
    for (const t of trips) {
      if (source.cancelled(t)) continue;
      const p = posOf(t, T);
      if (!p) continue;
      const R = routes[t.route];
      const len = L * (t.units || 1);
      if (p.d - len > R.len + 50 || p.d < -50) continue;       // wholly beyond the route's ends (outside the tiles)
      stats.running++;
      trainPose(model.layout, R.at, p.d, pose, { pool });
      fleet.add(pose);
      if ((t.units || 1) > 1) { trainPose(model.layout, R.at, p.d - L, pose2, { reversed: true, leadFront: false, pool: pool2 }); fleet.add(pose2); }
      // pop bookkeeping: is the train's middle in view, near enough to matter?
      if (camera) {
        const m = R.at(p.d - len / 2);
        sph.center.set(m[0], m[1] + 2, m[2]); sph.radius = len / 2;
        if (frustum.intersectsSphere(sph) && camPos.distanceTo(sph.center) < 2000) inView.add(t.id);
      }
    }
    fleet.end();
    // a train in view now that was not running at all a frame ago (or the reverse) = an appear / vanish in view
    if (camera) {
      for (const id of inView) if (!prevInView.has(id) && !wasRunning.has(id)) stats.appearInView++;
      for (const id of prevInView) if (!inView.has(id) && !isRunning(id, T)) stats.vanishInView++;
      prevInView = inView;
    }
    wasRunning = new Set(trips.filter((t) => posOf(t, T)).map((t) => t.id));
    stats.drawn = fleet.stats.units;
  };
  let wasRunning = new Set();
  const isRunning = (id, T) => { const t = trips.find((q) => q.id === id); return !!(t && posOf(t, T)); };
  const hhmm = (s) => `${String(Math.floor(s / 3600) % 24).padStart(2, "0")}:${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}`;
  const info = () => {
    const T = clockFn() % 86400;
    return `SNCB: ${stats.running} trains running at ${hhmm(T)} (${params.get("day") || dayType} timetable, ${trips.length} trips), ${fleet.stats.units} units drawn (cars LOD0 ${fleet.stats.perLod[0]} · LOD1 ${fleet.stats.perLod[1]} · LOD2 ${fleet.stats.perLod[2]}); in-view pops ${stats.appearInView}/${stats.vanishInView}`;
  };
  /** the running trains: [{ id, line, head, route, d, v, x, z, heading }] (checks; obstacles for traffic later) */
  const positions = () => {
    const T = clockFn() % 86400, out = [];
    for (const t of trips) { const p = posOf(t, T); if (!p) continue; const a = routes[t.route].at(p.d); out.push({ id: t.id, line: t.line, head: t.head, route: t.route, d: p.d, v: p.v, x: a[0], y: a[1], z: a[2], heading: a[3], units: t.units || 1, stops: t.stops }); }
    return out;
  };
  const setClock = (secs = null) => { startSecs = secs ?? brusselsNow().secs; t0 = performance.now(); };
  const setTimescale = (k) => { startSecs = ownClock(); t0 = performance.now(); scale = k; };
  const setSource = (s) => { source = s; };
  return { update, info, positions, setClock, setTimescale, setSource, fleet, model, group, stats, trips, routes, doc,
    get clockSecs() { return clockFn() % 86400; }, get timescale() { return scale; } };
}
