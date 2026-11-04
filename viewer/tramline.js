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
// ?tram=model: the scripted STIB T3000 (tools/blender/tram.py, viewer/tramModel.js: 5 sections + bellows, bogies,
// pantograph, LODs, the trip's headsign on the LED displays) instead of the boxes; the boxes stay the default until the
// owner approves the model in the Tram Lab (labs/tram-lab.html).
//
// Clock: Brussels local time now, or ?clock=HH:MM; ?timescale=N runs it N times faster. The day type
// (weekday / Saturday / Sunday) comes from the date; the timetable is that of the feed's sample day.
import * as THREE from "three/webgpu";
import { attribute, mix, float, vec3, color, uniform } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { env } from "./lighting.js";
import { loadTramModel, createTramFleet, tramPose } from "./tramModel.js";

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
  // shapes densified to 2 m, with cumulative distance; snapped per loaded tile
  const shapes = {};
  for (const [id, line] of Object.entries(doc.shapes)) {
    const pts = [];
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    const cum = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    shapes[id] = { orig: pts.map((p) => p.slice()), pts, cum };
  }
  const snapped = new Set();
  /** Snap shape points inside a tile onto that tile's OSM tram tracks (within 3 m). */
  const snapTile = (name, feats, b) => {
    if (snapped.has(name)) return;
    snapped.add(name);
    const tracks = (feats.lines || []).filter((l) => l.kind === "tram").map((l) => l.line);
    if (!tracks.length) return;
    for (const s of Object.values(shapes)) s.orig.forEach(([x, z], i) => {
      if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return;
      let best = 9, bx = x, bz = z;
      for (const l of tracks) for (let k = 1; k < l.length; k++) {
        const [ax, az] = l[k - 1], [cx, cz] = l[k], dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t;
        const d = (px - x) ** 2 + (pz - z) ** 2;
        if (d < best) { best = d; bx = px; bz = pz; }
      }
      s.pts[i] = [bx, bz];
    });
  };
  const at = (s, d) => {            // point + heading at distance d along a shape
    const { pts, cum } = s, n = pts.length;
    d = Math.max(0, Math.min(cum[n - 1], d));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = pts[lo], b = pts[hi];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(-(b[1] - a[1]), b[0] - a[0])];
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
  const model = params.get("tram") === "model" ? await loadTramModel().catch((e) => { console.warn("tram model:", e.message); return null; }) : null;
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
  const scale = +(params.get("timescale") || 1);
  const clockP = params.get("clock");
  const t0 = performance.now(), now0 = brusselsNow();
  const startSecs = clockP ? clockP.split(":").reduce((a, v, i) => a + +v * [3600, 60, 1][i], 0) : now0.secs;
  const dayType = { Sat: "saturday", Sun: "sunday" }[now0.dow] || "weekday";
  const trips = doc.trips.filter((t) => t.days.includes(dayType));
  const clock = () => startSecs + ((performance.now() - t0) / 1000) * scale;
  const ease = (f) => f * f * (3 - 2 * f);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
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
      let d = st[0][0];
      for (let i = 0; i < st.length - 1; i++) {
        const [d0, , dep0] = st[i], [d1, arr1] = st[i + 1];
        if (tt < st[i][1]) break;
        if (tt <= dep0) { d = d0; break; }                              // standing at stop i
        if (tt <= arr1) { d = d0 + (d1 - d0) * ease((tt - dep0) / Math.max(1, arr1 - dep0)); break; }
        d = d1;
      }
      const [x, z] = at(shapes[t.shape], d);
      running++;
      if ((x - near.x) ** 2 + (z - near.z) ** 2 > near.r * near.r || s.cab >= MAX_TRAMS * 2) continue;
      if (fleet) {
        const shape = shapes[t.shape];
        tramPose(model.layout, (q) => at(shape, q), d, pose);
        fleet.add(pose, railTop, { sign: model.sign.index[t.head] ?? 0 });
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
  return { update, snapTile, info, doc, fleet, model };
}
