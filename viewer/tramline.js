// Real trams of a STIB line, running to the real timetable.
//
// data/transit/stib-<line>.json (pipeline/build_transit.py) holds every trip of the line for a weekday,
// a Saturday and a Sunday from STIB's GTFS feed (CC BY 4.0, "Source: STIB-MIVB – Open Data"): the route
// shape, and per stop the distance along it and the arrival / departure times. Each frame, for the
// clock time, every running trip is placed by interpolating between its stops (eased: accelerate,
// cruise, brake; standing still between arrival and departure), then drawn as a 5-module articulated
// tram whose modules follow the curve independently. The shapes are densified to 2 m and snapped onto
// the OSM tram tracks of every loaded tile (GTFS shapes run ~0.6 m off them).
//
// The trams are the scripted STIB T3000, second pass (tools/blender/tram2.py, viewer/tram2Model.js: 5 sections + bent
// bellows, bogies, pantograph on the wire, interior, doors that open, LODs, the trip's headsign on the LED displays;
// Tram Lab, labs/tram-lab.html). ?tram=v1: the first model (tools/blender/tram.py, viewer/tramModel.js); ?tram=box:
// the old box trams (also the fallback when a model fails to load).
//
// Stops: the GTFS feed gives arrival = departure at every stop, so each hop starts with a dwell taken from its own
// time (a quarter of it, 6-18 s): the tram stands, opens the doors on the platform side (nearest OSM platform of a
// loaded tile; right-hand side when none), closes them, then accelerates; its tail lights brighten while it brakes.
//
// Clock: Brussels local time now, or ?clock=HH:MM; ?timescale=N runs it N times faster. The day type
// (weekday / Saturday / Sunday) comes from the date; the timetable is that of the feed's sample day.
import * as THREE from "three/webgpu";
import { attribute, mix, float, vec3, color, uniform } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { env } from "./lighting.js";
import * as tramV1 from "./tramModel.js";
import * as tramV2 from "./tram2Model.js";

const MOD_L = 6.4, GAP = 0.25, MODS = 5, WIDTH = 2.3, FLOOR = 0.35, H = 3.25, MAX_TRAMS = 40;

function brusselsNow() {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { secs: +p.hour * 3600 + +p.minute * 60 + +p.second, dow: p.weekday };
}

function part(g, col, kind) {
  g = g.toNonIndexed(); g.deleteAttribute("uv");
  const n = g.attributes.position.count, c = new Float32Array(n * 3), k = new Float32Array(n);
  for (let i = 0; i < n; i++) { c.set(col, i * 3); k[i] = kind; }
  g.setAttribute("aCol", new THREE.BufferAttribute(c, 3));
  g.setAttribute("aKind", new THREE.BufferAttribute(k, 1));    // 0 paint, 1 glass, 2 lit sign, 3 red line colour
  return g;
}
/** One module, local +x forward, origin at floor centre. `cab`: driver's end with sloped nose and the line number. */
function moduleGeometry(cab, lineCol) {
  const body = [0.86, 0.87, 0.88], dark = [0.08, 0.09, 0.1], glass = [0.04, 0.05, 0.06];
  const g = [];
  const box = (l, h, w, x, y, z, col, kind = 0) => g.push(part(new THREE.BoxGeometry(l, h, w).translate(x, y, z), col, kind));
  const L = MOD_L;
  box(L, 0.75, WIDTH, 0, FLOOR + 0.375, 0, body);                                     // skirt / lower body
  box(L * 0.96, 1.25, WIDTH - 0.02, 0, FLOOR + 0.75 + 0.625, 0, glass, 1);            // window band
  for (const x of [-L * 0.32, 0, L * 0.32]) box(0.12, 1.25, WIDTH + 0.01, x, FLOOR + 1.375, 0, dark);   // window pillars
  box(L, 0.55, WIDTH, 0, FLOOR + 2.0 + 0.275, 0, body);                               // upper body
  box(L * 0.98, 0.1, WIDTH * 0.92, 0, FLOOR + 2.6, 0, [0.7, 0.71, 0.72]);              // roof
  box(L, 0.12, WIDTH + 0.02, 0, FLOOR + 0.78, 0, lineCol, 3);                          // red belt line (line colour)
  box(L * 0.4, 0.35, 1.4, -L * 0.15, FLOOR + 2.83, 0, [0.5, 0.51, 0.52]);             // roof equipment
  for (const z of [-0.65, 0.65]) box(1.3, 1.9, 0.02, L * 0.15, FLOOR + 1.0, (WIDTH / 2 + 0.006) * Math.sign(z), [0.22, 0.24, 0.26]);   // doors
  if (cab) {
    const nose = new THREE.BoxGeometry(0.9, 2.35, WIDTH - 0.1, 1, 1, 1), p = nose.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getX(i) > 0 && p.getY(i) > 0) p.setX(i, p.getX(i) - 0.35);   // raked windscreen
    nose.computeVertexNormals();
    g.push(part(nose.translate(L / 2 + 0.4, FLOOR + 1.3, 0), glass, 1));
    box(0.06, 0.32, 1.2, L / 2 + 0.6, FLOOR + 2.35, 0, [1.0, 0.6, 0.15], 2);            // destination display
    box(0.06, 0.32, 0.38, L / 2 + 0.62, FLOOR + 2.35, 0.72, lineCol, 3);                // line number box
    for (const z of [-0.8, 0.8]) box(0.05, 0.12, 0.22, L / 2 + 0.85, FLOOR + 0.55, z, [1, 0.97, 0.9], 2);   // headlights
    // pantograph on the first module
    g.push(part(new THREE.BoxGeometry(1.6, 0.05, 0.06).rotateZ(0.5).translate(-0.5, FLOOR + 3.25, 0), dark, 0));
    g.push(part(new THREE.BoxGeometry(0.06, 0.05, 1.5).translate(-1.15, FLOOR + 3.6, 0), dark, 0));
  }
  return mergeGeometries(g);
}

export async function createTramLine(url, scene, ground) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const doc = await r.json();
  const lineCol = new THREE.Color(doc.color);
  const lc = [lineCol.r, lineCol.g, lineCol.b].map((v) => Math.pow(v, 2.2));
  // shapes densified to 1 m, snapped per loaded tile onto the tile's smoothed OSM tracks (viewer/track.js), with
  // the arc length and a tangent per point, so position AND heading are interpolated along the track (a polyline's
  // heading jumps at every vertex: the jerky trams of 2026-11-04)
  const shapes = {};
  const finish = (s) => {
    const { pts } = s, n = pts.length;
    s.cum = new Float64Array(n);
    for (let i = 1; i < n; i++) s.cum[i] = s.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    s.tan = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 2)], b = pts[Math.min(n - 1, i + 2)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      s.tan[i * 2] = dx / L; s.tan[i * 2 + 1] = dz / L;
    }
  };
  for (const [id, line] of Object.entries(doc.shapes)) {
    const pts = [];
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    shapes[id] = { orig: pts.map((p) => p.slice()), snap: pts.map((p) => p.slice()), pts };
    finish(shapes[id]);
  }
  const snapped = new Set();
  // the tracks of every loaded tile in ONE 4 m grid of segments (global line ids), so a shape is snapped across tile
  // seams in one pass, with its track continuity carried over the seam (no kink where two tiles meet)
  const grid = new Map(), gk = (i, j) => i * 100003 + j, boxes = [];
  let lineCount = 0;
  /** Snap the shape points inside every loaded tile onto the tram tracks (within 3 m). Re-snaps the whole line
   *  (~30-45 ms when a tile with tracks streams in): done in slices of <= 3 ms between frames, one tile at a time;
   *  each shape's points are swapped in whole, so the trams never read a half-snapped line. */
  let snapQueue = Promise.resolve();
  const snapTile = (name, feats, b) => {
    if (snapped.has(name)) return snapQueue;
    snapped.add(name);
    snapQueue = snapQueue.then(() => snapTileNow(feats, b)).catch((e) => console.warn("tram snap:", e));
    return snapQueue;
  };
  let sliceT = 0;
  const slice = async () => {       // yield to the next frame once 3 ms of this task are used
    if (performance.now() - sliceT < 3) return;
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    sliceT = performance.now();
  };
  const snapTileNow = async (feats, b) => {
    sliceT = performance.now();
    for (const l of feats.lines || []) if (l.kind === "platform") for (let k = 1; k < l.line.length; k++) platSegs.push([...l.line[k - 1], ...l.line[k]]);
    const tracks = (feats.lines || []).filter((l) => l.kind === "tram").map((l) => l.line);
    boxes.push(b);
    tracks.forEach((l) => { const li = lineCount++; for (let k = 1; k < l.length; k++) {
      const [ax, az] = l[k - 1], [cx, cz] = l[k];
      for (let i = Math.floor((Math.min(ax, cx) - 3) / 4); i <= Math.floor((Math.max(ax, cx) + 3) / 4); i++)
        for (let j = Math.floor((Math.min(az, cz) - 3) / 4); j <= Math.floor((Math.max(az, cz) + 3) / 4); j++) {
          const key = gk(i, j);
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push([ax, az, cx, cz, li]);
        }
    } });
    if (!tracks.length) return;
    const loaded = (x, z) => boxes.some((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
    // A GTFS shape runs between the two tracks of a street (~0.6-1.5 m off), so "nearest segment" flips from one
    // track to the other and the tram wiggles across the street. Stay on the track of the previous point until it
    // leaves its 3 m reach (a junction), and prefer a track running the shape's way.
    for (const s of Object.values(shapes)) {
      let prevLine = -1, prevPt = null;
      const snap = s.snap.slice();
      for (let i = 0; i < s.orig.length; i++) {
        if ((i & 255) === 0) await slice();
        const [x, z] = s.orig[i];
        if (!loaded(x, z)) { prevLine = -1; prevPt = null; continue; }
        const o = s.orig, a0 = o[Math.max(0, i - 1)], a1 = o[Math.min(o.length - 1, i + 1)];
        const sx = a1[0] - a0[0], sz = a1[1] - a0[1], sl = Math.hypot(sx, sz) || 1;
        let best = Infinity, bx = x, bz = z, bl = -1;
        for (const [ax, az, cx, cz, li] of grid.get(gk(Math.floor(x / 4), Math.floor(z / 4))) || []) {
          const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz || 1e-9;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t;
          const d2 = (px - x) ** 2 + (pz - z) ** 2;
          if (d2 > 9) continue;
          const back = (dx * sx + dz * sz) / (Math.sqrt(L2) * sl) < 0 ? 1 : 0;
          // same line, or the next tile's piece of it (its point is within 1.5 m of the previous snapped point)
          const cont = li === prevLine || (prevPt && (px - prevPt[0]) ** 2 + (pz - prevPt[1]) ** 2 < 2.25 && Math.abs(Math.hypot(px - prevPt[0], pz - prevPt[1]) - Math.hypot(x - o[Math.max(0, i - 1)][0], z - o[Math.max(0, i - 1)][1])) < 0.5);
          const cost = d2 + (prevLine >= 0 && !cont ? 100 : 0) + back;     // switch only when the track left the 3 m reach
          if (cost < best) { best = cost; bx = px; bz = pz; bl = li; }
        }
        snap[i] = [bx, bz];
        prevLine = bl; prevPt = [bx, bz];
      }
      s.snapNext = snap;
    }
    // two passes of a [1 2 1]/4 filter along the snapped points: no kink where two tiles' tracks meet (on a 25 m
    // curve it moves the line by under 1 cm)
    for (const s of Object.values(shapes)) {
      await slice();
      let p = s.snapNext;
      for (let pass = 0; pass < 2; pass++) {
        const q = p.map((v) => v.slice());
        for (let i = 1; i + 1 < p.length; i++) { q[i][0] = (p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4; q[i][1] = (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4; }
        p = q;
      }
      // swapped in together (pts, its arc length and tangents), in one task
      const t = { pts: p };
      finish(t);
      s.snap = s.snapNext; delete s.snapNext;
      s.pts = t.pts; s.cum = t.cum; s.tan = t.tan;
    }
  };
  const at = (s, d) => {            // point + heading at distance d along a shape (heading from the interpolated tangent)
    const { pts, cum, tan } = s, n = pts.length;
    d = Math.max(0, Math.min(cum[n - 1], d));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = pts[lo], b = pts[hi];
    const tx = tan[lo * 2] * (1 - f) + tan[hi * 2] * f, tz = tan[lo * 2 + 1] * (1 - f) + tan[hi * 2 + 1] * f;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(-tz, tx)];
  };

  // meshes: cab modules (front and back of each tram) and middle modules
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.35, metalness: 0.25 });
  const kind = attribute("aKind", "float"), col = attribute("aCol", "vec3");
  mat.colorNode = col;
  const isGlass = kind.equal(1).select(float(1), float(0)), lit = kind.equal(2).select(float(1), float(0));
  mat.roughnessNode = mix(float(0.4), float(0.05), isGlass);
  mat.metalnessNode = mix(float(0.3), float(0.6), isGlass);
  mat.emissiveNode = col.mul(lit).mul(mix(float(0.6), float(2.5), env.uNight))
    .add(color(0xffe2b0).mul(isGlass).mul(env.uNight).mul(0.18));                   // lit saloon at night
  const params = new URLSearchParams(location.search);
  const TM = params.get("tram") === "v1" ? tramV1 : tramV2;
  const { createTramFleet, tramPose } = TM;
  const model = params.get("tram") !== "box" ? await TM.loadTramModel().catch((e) => { console.warn("tram model:", e.message); return null; }) : null;
  let fleet = null, cabs = null, mids = null;
  if (model) {
    model.sign.setRows([...new Set(doc.trips.map((t) => t.head))], doc.line);
    fleet = createTramFleet(model, scene, MAX_TRAMS);
  } else {
    cabs = new THREE.InstancedMesh(moduleGeometry(true, lc), mat, MAX_TRAMS * 2);
    mids = new THREE.InstancedMesh(moduleGeometry(false, lc), mat, MAX_TRAMS * (MODS - 2));
    for (const m of [cabs, mids]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); }
  }
  const pose = [], railTop = (x, z) => ground(x, z) + 0.02;
  let scale = +(params.get("timescale") || 1);
  const clockP = params.get("clock");
  let t0 = performance.now();
  const now0 = brusselsNow();
  let startSecs = clockP ? clockP.split(":").reduce((a, v, i) => a + +v * [3600, 60, 1][i], 0) : now0.secs;
  const dayType = { Sat: "saturday", Sun: "sunday" }[now0.dow] || "weekday";
  const trips = doc.trips.filter((t) => t.days.includes(dayType));
  const clock = () => startSecs + ((performance.now() - t0) / 1000) * scale;
  // between two stops: accelerate at ACC, cruise, brake at ACC (a T3000 does ~1.1 m/s²), so the speed never jumps;
  // a hop too short for that profile falls back to a smoothstep (also continuous speed)
  const ACC = 1.0;
  const mo = { brake: 0 };                                          // travel()'s side result: braking now (0 / 1)
  const travel = (D, T, t) => {
    mo.brake = 0;
    const disc = T * T - 4 * D / ACC;
    if (D <= 0 || T <= 0) return 0;
    if (disc <= 0) { const f = Math.min(1, Math.max(0, t / T)); mo.brake = f > 0.5 && f < 1 ? 1 : 0; return D * f * f * (3 - 2 * f); }
    const v = ACC * (T - Math.sqrt(disc)) / 2, ta = v / ACC;
    if (t <= 0) return 0;
    if (t < ta) return 0.5 * ACC * t * t;
    if (t < T - ta) return 0.5 * ACC * ta * ta + v * (t - ta);
    if (t < T) { mo.brake = 1; return D - 0.5 * ACC * (T - t) ** 2; }
    return D;
  };
  // the dwell at the start of each hop (s) and the doors' opening over it (0..1: open 1-3.5 s in, closed 0.5 s before)
  const dwellOf = (hop) => Math.max(6, Math.min(18, hop * 0.25));
  const doorAt = (t, dw) => Math.max(0, Math.min(1, (t - 1) / 2.5, (dw - 0.5 - t) / 2.5));
  /** trip state at clock time tt: { d, doors (0..1), stop (index or -1), brake } */
  const st8 = { d: 0, doors: 0, stop: -1, brake: 0 };
  const tripState = (t, tt) => {
    const st = t.stops;
    st8.d = st[0][0]; st8.doors = 0; st8.stop = -1; st8.brake = 0;
    for (let i = 0; i < st.length - 1; i++) {
      const [d0, , dep0] = st[i], [d1, arr1] = st[i + 1];
      if (tt < st[i][1]) break;
      if (tt <= dep0) { st8.d = d0; break; }                         // standing at stop i (GTFS: never, arr = dep)
      if (tt <= arr1) {
        // the dwell never squeezes the run below what ACC allows (2 * sqrt(D / ACC)): no smoothstep fallback, no > ACC
        const hop = Math.max(1, arr1 - dep0), dw = Math.max(0, Math.min(dwellOf(hop), hop - 2 * Math.sqrt(Math.max(0, d1 - d0) / ACC) - 2)), te = tt - dep0;
        if (te < dw) { st8.d = d0; st8.doors = dw >= 6 ? doorAt(te, dw) : 0; st8.stop = i; }
        else { st8.d = d0 + travel(d1 - d0, hop - dw, te - dw); st8.brake = mo.brake; }
        break;
      }
      st8.d = d1;
    }
    return st8;
  };
  // platform side per (shape, stop): the nearest OSM platform segment of a loaded tile beside the stopped tram;
  // +1 = right of the direction of travel, -1 = left; unknown until a tile with platforms there is loaded (right)
  const platSegs = [], sideCache = new Map();
  const platformSide = (t, i) => {
    const key = t.shape + ":" + i;
    let v = sideCache.get(key);
    if (v !== undefined) return v;
    const s = shapes[t.shape], d = t.stops[i][0] - 16;              // the middle of the stopped tram
    const [x, z, h] = at(s, d), tx = Math.cos(h), tz = -Math.sin(h);
    let best = 49, side = 0;
    for (const [ax, az, bx, bz] of platSegs) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * u, pz = az + dz * u;
      const d2 = (px - x) ** 2 + (pz - z) ** 2;
      if (d2 < best) { best = d2; side = (-tz) * (px - x) + tx * (pz - z) > 0 ? 1 : -1; }
    }
    if (side) sideCache.set(key, side);
    return side || 1;
  };
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const doorsLR = [0, 0];
  const near = { x: 0, z: 0, r: 1800 };
  let running = 0;

  const placeTrip = (t, s, d, flipCab) => {
    const shape = shapes[t.shape];
    for (let k = 0; k < MODS; k++) {
      const dm = d - (MOD_L / 2) - k * (MOD_L + GAP);                // module centre distance (front first)
      const [x, z] = at(shape, dm), [xa, za] = at(shape, dm + MOD_L / 2), [xb, zb] = at(shape, dm - MOD_L / 2);
      const yaw = Math.atan2(-(za - zb), xa - xb);
      const isCab = k === 0 || k === MODS - 1;
      q.setFromAxisAngle(up, yaw + (k === MODS - 1 ? Math.PI : 0));     // rear cab faces backwards
      M.compose(v.set(x, ground(x, z) + 0.08, z), q, one);
      if (isCab) cabs.setMatrixAt(s.cab++, M); else mids.setMatrixAt(s.mid++, M);
    }
  };
  const update = (camPos, camera = null) => {
    const T = clock() % 86400, Tn = T + 86400;                          // trips can run past midnight
    near.x = camPos.x; near.z = camPos.z;
    const s = { cab: 0, mid: 0 };
    fleet?.begin(camera, camPos);
    running = 0;
    for (const t of trips) {
      const st = t.stops, first = st[0][2], last = st[st.length - 1][1];
      const tt = T >= first && T <= last ? T : Tn >= first && Tn <= last ? Tn : -1;
      if (tt < 0) continue;
      const { d, doors: dOpen, stop, brake } = tripState(t, tt);
      const [x, z] = at(shapes[t.shape], d);
      running++;
      if ((x - near.x) ** 2 + (z - near.z) ** 2 > near.r * near.r || s.cab >= MAX_TRAMS * 2) continue;
      if (fleet) {
        const shape = shapes[t.shape];
        tramPose(model.layout, (q) => at(shape, q), d, pose);
        doorsLR[0] = doorsLR[1] = 0;
        if (dOpen > 0) doorsLR[platformSide(t, stop) > 0 ? 0 : 1] = dOpen;
        fleet.add(pose, railTop, { sign: model.sign.index[t.head] ?? 0, doors: doorsLR, brake });
        s.cab += 2;
      } else placeTrip(t, s, d);
    }
    if (fleet) { fleet.end(); return; }
    cabs.count = s.cab; mids.count = s.mid;
    cabs.instanceMatrix.needsUpdate = mids.instanceMatrix.needsUpdate = true;
  };
  const info = () => {
    const T = clock() % 86400;
    return `tram ${doc.line} (${doc.route}): ${running} running at ${String(Math.floor(T / 3600)).padStart(2, "0")}:${String(Math.floor(T % 3600 / 60)).padStart(2, "0")} (${dayType} timetable). ${doc.source}`;
  };
  /** the running trams near the last camera: [{ trip, d, x, z, yaw }] (for checks: a camera can follow one) */
  const positions = () => {
    const T = clock() % 86400, Tn = T + 86400, out = [];
    for (const t of trips) {
      const st = t.stops, first = st[0][2], last = st[st.length - 1][1];
      const tt = T >= first && T <= last ? T : Tn >= first && Tn <= last ? Tn : -1;
      if (tt < 0) continue;
      const { d, doors, brake } = tripState(t, tt);
      const [x, z, yaw] = at(shapes[t.shape], d);
      out.push({ trip: t.id ?? t.head, d, x, z, yaw, T: tt, doors, brake });
    }
    return out;
  };
  /** [x, z, heading] at distance d along the shape of trip `id` (checks) */
  const trackAt = (id, d) => { const t = trips.find((q) => (q.id ?? q.head) === id); return t ? at(shapes[t.shape], d) : null; };
  // live clock (the dev panel): set the time of day (seconds) or the speed; both re-anchor, so nothing jumps but the set
  const setClock = (secs = null) => { startSecs = secs ?? brusselsNow().secs; t0 = performance.now(); };   // null: Brussels now
  const setTimescale = (k) => { startSecs = clock(); t0 = performance.now(); scale = k; };
  return { update, snapTile, info, doc, fleet, model, positions, trackAt, setClock, setTimescale, get clockSecs() { return clock() % 86400; }, get timescale() { return scale; } };
}
