// THE FALCON FLIGHT IN THE CITY, verified (docs/FALCON_FLIGHT.md "In the city"): scripted flights through the real
// FalconGame / FalconInput (the lab's autopilots, the same FlightControls a player fills), stepped frame by frame with
// viewer.step(dt) (the whole city loop: lighting, the flight, the fades, every updater, the render) so a throttled
// background tab still runs at a fixed 60 Hz of game time; per frame: the wall time of the frame INCLUDING the GPU
// (onSubmittedWorkDone), the flight's own CPU parts, synchronous render pipelines (the device hook of the 2026-11-13
// freeze diagnosis: GPUDevice.prototype.createRenderPipeline vs ...Async), long tasks (PerformanceObserver), and the
// collision check (the bird never under the floor = max(ground, roofs, church, landmark proxies, bridges)).
//   const F = await import("/debug/falconCityFlight.js"); const r = await F.run("stoop", { grabs: 8 });
//   F.sheet(r) shows the frames as one contact sheet over the page (a screenshot), F.hide() removes it.
const G = 9.81;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const sstep = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------------------------------- the device hook
const hook = (window.__pipeHook ??= (() => {
  const H = { sync: 0, async: 0, syncLabels: [] };
  const P = globalThis.GPUDevice?.prototype;
  if (P && !P.__hooked) {
    const s = P.createRenderPipeline, a = P.createRenderPipelineAsync;
    P.createRenderPipeline = function (d) { H.sync++; if (H.syncLabels.length < 40) H.syncLabels.push(d?.label || d?.vertex?.entryPoint || "?"); return s.call(this, d); };
    P.createRenderPipelineAsync = function (d) { H.async++; return a.call(this, d); };
    P.__hooked = true;
  }
  return H;
})());

const steer = (f, hT, gT, bankMax = 1) => ({ roll: clamp(-wrap(hT - f.heading) * 2.2, -bankMax, bankMax), pitch: clamp((gT - f.gamma) * 3.5, -1, 1) });
function steerAccel(f, ax, ay, az) {
  const V = Math.max(f.V, 1), ex = f.va.x / V, ey = f.va.y / V, ez = f.va.z / V;
  let lx = ax, ly = ay + G, lz = az;
  const k = lx * ex + ly * ey + lz * ez; lx -= k * ex; ly -= k * ey; lz -= k * ez;
  const hx = -Math.sin(f.heading), hz = -Math.cos(f.heading), rx = -hz, rz = hx;
  const ux = -rz * ey, uy = rz * ex - rx * ez, uz = rx * ey, ul = Math.hypot(ux, uy, uz) || 1;
  const phi = Math.atan2(lx * rx + lz * rz, (lx * ux + ly * uy + lz * uz) / ul);
  const n = Math.hypot(lx, ly, lz) / G;
  const hold = Math.cos(f.gamma) / Math.max(Math.cos(f.phi), 0.25);
  const pullG = 3.6 + (7 - 1 - 3.6) * sstep(f.V, 25, 60);
  return { roll: clamp(phi / (80 * Math.PI / 180), -1, 1), pitch: clamp(n > hold ? (n - hold) / pullG : (n - hold) / 2, -1, 1) };
}

/** the scenarios: set the scene up, return { script(f, t), seconds, note, done?(t) } */
function scenarios(F) {
  const fl = F.flyer, g = fl.game, w = fl.w, air = fl.air, inp = fl.input, P = w.PLACE;
  const groundP = () => w.ground(P.x, P.z);
  const S1 = {
    intro() {
      const fam = window.__falcons, L = fam.perch.ledge, sp = fam.spots.hop;
      const scrape = fam.toWorld(fam.nestPoint(sp.pos.x, sp.pos.y, sp.pos.z)), ledge = fam.toWorld(L.pos.clone());
      const out = L.facing.clone().applyAxisAngle(new scrape.constructor(0, 1, 0), fam.group.rotation.y);
      fam.makeRoom();
      fl.startFromNest({ scrape, ledge, out });
      return { seconds: 9, note: "the nest start: scrape, hop, ledge, launch, hand-over to the flight model", script: (f) => ({ pitch: clamp(-f.gamma * 3.5, -1, 1), roll: 0, flap: f.V < 11 ? 1 : 0, fold: 0 }) };
    },
    stoop() {
      air.setWind(3, 240);
      const y0 = groundP() + 650;
      fl.start(P.x + 120, P.z + 95, Math.atan2(120, 95), y0, 15, -0.2);
      let pulling = false, out = false;
      return { seconds: 22, note: "the stoop: 650 m, tucked, at the Place, pull-out", script: (f) => {
        const dx = P.x - f.pos.x, dz = P.z - f.pos.z, dy = groundP() + 40 - f.pos.y, dh = Math.hypot(dx, dz);
        const agl = f.pos.y - w.floor(f.pos.x, f.pos.z);
        if (!pulling && agl < f.V * f.V / (5.5 * G) + 35) pulling = true;
        if (pulling && f.gamma > 0.35) out = true;
        if (out) return { pitch: f.gamma > 0.1 ? -0.4 : 0, roll: 0, fold: 0, flap: 0 };
        if (pulling) return { pitch: 1, roll: 0, fold: 0.5, flap: 0 };
        return { ...steer(f, Math.atan2(-dx, -dz), Math.atan2(dy, dh) - 0.08), fold: 1, flap: 0 };
      } };
    },
    thermal() {
      air.params.cloud = 0.1; air.setWind(2.5, 240);
      w.syncThermals(air, P.x, P.z);
      const th = air.thermals.find((t) => t.key === "place"); th.forced = true;
      air.update(g.t);
      const C = air.thermalCentre(th, th.ground + 60);
      fl.start(C.x + 16, C.z, 0, th.ground + 55);
      return { seconds: 60, note: "the Place's thermal (held on): circling in the core", after: () => { th.forced = false; }, script: (f) => {
        const c = air.thermalCentre(th, f.pos.y), dx = c.x - f.pos.x, dz = c.z - f.pos.z, d = Math.hypot(dx, dz), rx = dx / d, rz = dz / d;
        const R0 = Math.max(c.R * 0.62, 17), k = clamp((d - R0) / R0 * 1.6, -1.2, 1.2), tx = -rz + rx * k, tz = rx + rz * k;
        return { ...steer(f, Math.atan2(-tx, -tz), clamp((f.V - 12.5) * 0.06, -0.15, 0), 0.56), fold: 0, flap: 0, brake: 0 };
      } };
    },
    skim() {
      // roof-skimming: low and fast over the rows east of the Place, holding ~4 m over the highest roof ahead
      air.setWind(4, 240);
      const x0 = P.x - 250, z0 = P.z + 60;
      fl.start(x0, z0, -Math.PI / 2 - 0.15, w.floor(x0, z0) + 12, 20);
      return { seconds: 25, note: "roof-skim: ~4 m over the roofs ahead, 18-22 m/s, flapping when slow", script: (f) => {
        let ahead = 0; const hx = -Math.sin(f.heading), hz = -Math.cos(f.heading);
        for (let d = 0; d <= 30; d += 3) ahead = Math.max(ahead, w.floor(f.pos.x + hx * d, f.pos.z + hz * d));
        const err = ahead + 4 - f.pos.y;
        return { roll: clamp(-wrap(-Math.PI / 2 - 0.15 - f.heading) * 2, -0.5, 0.5), pitch: clamp(err * 0.12 - f.gamma * 1.5, -1, 1), flap: f.V < 18 || err > 3 ? 1 : 0, fold: f.V > 24 ? 0.4 : 0 };
      } };
    },
    strike() {
      air.setWind(3, 240);
      const p = { x: 0, y: 0, z: 0 }, v = { x: 0, y: 0, z: 0 }, pg = fl.pigeons;
      for (let i = 0; i < pg.max; i++) if (pg.state[i] === 0 && Math.random() < 0.6) pg.takeoff(i, P.x, 0, P.z);
      for (let i = 0; i < 240; i++) pg.update(1 / 60, i / 60, null);
      let tgt = -1, bd = Infinity;
      for (let i = 0; i < pg.max; i++) { if (!pg.flying(i)) continue; pg.pos(i, p); const h = p.y - w.floor(p.x, p.z), d = Math.hypot(p.x - P.x, p.z - P.z); if (h > 25 && h < 80 && d < bd) { bd = d; tgt = i; } }
      pg.pos(Math.max(tgt, 0), p); pg.vel(Math.max(tgt, 0), v);
      const vl = Math.hypot(v.x, v.z) || 1;
      fl.start(p.x - v.x / vl * 130, p.z - v.z / vl * 130, Math.atan2(v.x / vl, v.z / vl) + Math.PI, p.y + 80, 24, -0.5);
      let after = 0;
      return { seconds: 14, note: "a strike: stoop on a pigeon of the flock, proportional navigation", script: (f) => {
        if (g.score.catches) { after += 1 / 60; return { pitch: after < 1.5 && f.gamma < 0.3 ? 0.25 : f.gamma > 0.35 ? -0.3 : 0, roll: 0, fold: 0, flap: after > 0.5 && after < 4 ? 1 : 0 }; }
        if (tgt < 0 || pg.state[tgt] === 3) tgt = pg.target(f.pos.x, f.pos.y, f.pos.z, f.vel.x, f.vel.y, f.vel.z, 400, 1.2);
        g.target = tgt; g.lockTarget = true;
        if (tgt < 0) return { pitch: -0.3, fold: 0.5 };
        pg.pos(tgt, p); pg.vel(tgt, v);
        const d = Math.hypot(p.x - f.pos.x, p.y - f.pos.y, p.z - f.pos.z), tgo = d / Math.max(f.V, 10);
        let flr = 0; for (let q = 0; q <= 1.5; q += 0.25) flr = Math.max(flr, w.floor(f.pos.x + f.vel.x * q, f.pos.z + f.vel.z * q));
        const agl = f.pos.y - flr;
        inp.talons = tgo < 0.6;
        const Rx = p.x - f.pos.x, Ry = p.y - f.pos.y, Rz = p.z - f.pos.z, R2 = Rx * Rx + Ry * Ry + Rz * Rz;
        const Vx = v.x - f.vel.x, Vy = v.y - f.vel.y, Vz = v.z - f.vel.z;
        const Ox = (Ry * Vz - Rz * Vy) / R2, Oy = (Rz * Vx - Rx * Vz) / R2, Oz = (Rx * Vy - Ry * Vx) / R2, N = 3.5;
        let ax = N * (Oy * f.vel.z - Oz * f.vel.y), ay = N * (Oz * f.vel.x - Ox * f.vel.z), az = N * (Ox * f.vel.y - Oy * f.vel.x);
        if (d > 60) { const e = Math.sqrt(R2), k = 1.5 * f.V; ax += (Rx / e - f.va.x / f.V) * k; ay += (Ry / e - f.va.y / f.V) * k; az += (Rz / e - f.va.z / f.V) * k; }
        const st = steerAccel(f, ax, ay, az);
        if (f.vel.y < 0 && agl < f.V * f.V / (6 * G) * (-f.vel.y / f.V) + 10) { st.pitch = 1; st.roll *= 0.3; }
        return { ...st, fold: d > 70 ? 1 : 0.55, flap: 0 };
      } };
    },
    church() { return landOn((q) => q.name === "cross", "perch on the spire's cross"); },
    ridge() { return landOn((q) => q.ridge && Math.hypot(q.pos.x - P.x, q.pos.z - P.z) > 60 && Math.hypot(q.pos.x - P.x, q.pos.z - P.z) < 120 && clearApproach(q), "land on a roof ridge", 12); },
    far() {
      // a long flight west to east and back south: tiles stream in and out under the falcon (25-30 m/s, ~70 m up)
      air.setWind(3, 240);
      const legs = [[P.x - 200, P.z], [P.x + 1600, P.z + 300], [P.x + 1700, P.z + 1500]];
      fl.start(legs[0][0], legs[0][1], -Math.PI / 2, w.floor(legs[0][0], legs[0][1]) + 70, 26);
      let leg = 1;
      return { seconds: 120, note: "fly far: 3.3 km across the streaming tiles", script: (f) => {
        if (leg < legs.length - 1 && Math.hypot(legs[leg][0] - f.pos.x, legs[leg][1] - f.pos.z) < 60) leg++;
        const [tx, tz] = legs[leg];
        let ahead = 0; const hx = -Math.sin(f.heading), hz = -Math.cos(f.heading);
        for (let d = 0; d <= 120; d += 10) ahead = Math.max(ahead, w.floor(f.pos.x + hx * d, f.pos.z + hz * d));
        const err = ahead + 60 - f.pos.y;
        const st = steer(f, Math.atan2(-(tx - f.pos.x), -(tz - f.pos.z)), clamp(err * 0.01, -0.25, 0.2), 0.6);
        return { ...st, flap: f.V < 22 || err > 10 ? 1 : 0, fold: f.V > 30 ? 0.5 : 0 };
      } };
    },
  };
  // ------------------------------------------------------------------ round 2: trees, bridges, the spire, the camera
  // a straight line at a held height y through (px, pz) along (ux, uz), from `back` m before it to `ahead` m after
  function line(px, pz, ux, uz, y, { back = 55, ahead = 60, speed = 13, seconds = 9, note }) {
    air.setWind(1.5, 240);
    const sx = px - ux * back, sz = pz - uz * back;
    fl.start(sx, sz, Math.atan2(-ux, -uz), y, speed, 0);
    return { seconds, note, script: (f) => {
      // heading: along the line, back onto it (n = its right-hand normal, cross = the signed distance off it)
      const cross = (f.pos.x - sx) * uz - (f.pos.z - sz) * ux, k = clamp(cross * 0.08, -0.5, 0.5);
      const st = steer(f, Math.atan2(-(ux - uz * k), -(uz + ux * k)), 0, 0.6);
      return { roll: st.roll, pitch: clamp((y - f.pos.y) * 0.15 - f.gamma * 1.5, -1, 1), flap: f.V < speed - 1 ? 1 : 0, fold: 0, brake: 0 };
    } };
  }
  // the loaded trees: { cx, cz, cy, Rh, Rv, tx, tz, g (ground), n, td }
  function trees(maxD = 450) {
    const out = [];
    for (const td of w.treeList) for (let n = 0; n < td.n; n++) {
      const b = n * 8, T = td.T, d = Math.hypot(T[b] - P.x, T[b + 1] - P.z);
      if (d > maxD) continue;
      out.push({ cx: T[b], cz: T[b + 1], cy: T[b + 2], Rh: T[b + 3], Rv: T[b + 4], tx: T[b + 5], tz: T[b + 6], g: w.ground(T[b + 5], T[b + 6]), n, td, d });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  // a line at height y through (px, pz) along (ux, uz) clear of everything but `t` (floor 3 m under, no crown) for L m each way
  function clearLine(t, px, pz, ux, uz, y, L = 60) {
    for (let d = -L; d <= L; d += 2) {
      const x = px + ux * d, z = pz + uz * d;
      if (w.floor(x, z) > y - 4) return false;
      const c = w.column(x, z, y), mine = Math.hypot(x - t.cx, z - t.cz) < t.Rh + 1;
      if (!mine && (c.brush > 0 || c.floor > y - 4 || c.ceil < y + 3)) return false;
    }
    return true;
  }
  function treeLine(kind) {
    const dirs = Array.from({ length: 16 }, (_, k) => [Math.sin(k * Math.PI / 8), Math.cos(k * Math.PI / 8)]);
    for (const t of trees()) {
      if (t.Rh < 4) continue;
      // a perch test: no other perch (ridges, the church) within 40 m of its top
      if (kind === "perch" && g.perches.some((q) => Math.hypot(q.pos.x - t.cx, q.pos.z - t.cz) < 40)) continue;
      for (const [ux, uz] of dirs) {
        let y, px, pz;
        if (kind === "hit" || kind === "perch") { y = t.cy; px = t.cx; pz = t.cz; }
        else if (kind === "brush") { y = t.cy; px = t.cx - uz * t.Rh * 0.8; pz = t.cz + ux * t.Rh * 0.8; }
        else { y = t.cy - t.Rv - 1.4; if (y - t.g < 3.2) break; px = t.tx - uz * 3; pz = t.tz + ux * 3; }
        // the line itself: for "under", nothing over it but this crown (and it must pass under its core / shell)
        if (!clearLine(t, px, pz, ux, uz, y)) continue;
        return { t, y, px, pz, ux, uz };
      }
    }
    throw new Error(`no tree for ${kind}`);
  }
  // the bridge proxies' open cells (under the arch): their centroid and main axis
  function arch(name) {
    const p = w.proxies.find((q) => q.low && q.name === `bridge ${name}`);
    if (!p) throw new Error(`no proxy for bridge ${name} (its tile not loaded?)`);
    const cells = [];
    for (let j = 0; j < p.nz; j++) for (let i = 0; i < p.nx; i++) {
      const k = j * p.nx + i; if (p.data[k] < -1e8) continue;
      const x = p.x0 + (i + 0.5) * p.step, z = p.z0 + (j + 0.5) * p.step, g = Math.max(w.ground(x, z), w.roof(x, z));
      if (p.low[k] > g + 2.5) cells.push([x, z, g, p.low[k]]);
    }
    if (!cells.length) throw new Error(`bridge ${name}: no open cell`);
    // the highest opening's cells (the main arch): within 1.5 m of the best clearance
    const best = Math.max(...cells.map((c) => c[3] - c[2]));
    const main = cells.filter((c) => c[3] - c[2] > best - 1.5);
    const mx = main.reduce((a, c) => a + c[0], 0) / main.length, mz = main.reduce((a, c) => a + c[1], 0) / main.length;
    return { p, cells: cells.length, main, mx, mz, g: w.ground(mx, mz), low: Math.min(...main.map((c) => c[3])), best };
  }
  Object.assign(F, { trees, arch });
  const S2 = {
    treeHit() { const L = treeLine("hit"); F.pick = L; return { ...line(L.px, L.pz, L.ux, L.uz, L.y, { note: `level into a tree's crown (core ${(L.t.Rh * 0.6).toFixed(1)} m, ${(L.t.cy - L.t.g).toFixed(0)} m up)` }), seconds: 7 }; },
    treeBrush() { const L = treeLine("brush"); F.pick = L; return line(L.px, L.pz, L.ux, L.uz, L.y, { note: `through a crown's edge (0.8 of its ${L.t.Rh.toFixed(1)} m radius): the leaves brush` }); },
    treeUnder() { const L = treeLine("under"); F.pick = L; return line(L.px, L.pz, L.ux, L.uz, L.y, { note: `under a crown (${(L.t.cy - L.t.Rv - L.y).toFixed(1)} m under its leaves, 3 m beside the trunk)` }); },
    treePerch() {
      air.setWind(1.5, 240);
      const L = treeLine("perch"), t = L.t, top = { x: t.cx, y: t.cy + t.Rv * 0.85, z: t.cz };
      F.pick = L;
      const s0 = { x: top.x - L.ux * 45, z: top.z - L.uz * 45 };
      fl.start(s0.x, s0.z, Math.atan2(-L.ux, -L.uz), top.y + 6, 13, -0.05);
      let asked = false;
      return { seconds: 9, note: "land on a tree's crown (E: the perch in reach)", script: (f) => {
        const dx = top.x - f.pos.x, dy = top.y + 1 - f.pos.y, dz = top.z - f.pos.z, d = Math.hypot(dx, dz);
        if (!asked && d < 24) { inp.actions.add("land"); asked = true; }
        return { ...steer(f, Math.atan2(-dx, -dz), Math.atan2(dy, d)), brake: d < 35 ? 0.6 : 0, fold: 0, flap: 0 };
      } };
    },
    bridge(name = "stjob") {
      const A = arch(name); F.pick = A;
      // along the road under it: the main opening's long axis
      let cxx = 0, czz = 0, cxz = 0; for (const [x, z] of A.main) { cxx += (x - A.mx) ** 2; czz += (z - A.mz) ** 2; cxz += (x - A.mx) * (z - A.mz); }
      const a = 0.5 * Math.atan2(2 * cxz, cxx - czz), ux = Math.cos(a), uz = Math.sin(a);
      const y = A.g + (A.low - A.g) * 0.5;
      return { ...line(A.mx, A.mz, ux, uz, y, { back: 70, ahead: 60, speed: 12, note: `under the ${name} bridge's arch (${(A.low - A.g).toFixed(1)} m clear, at ${(y - A.g).toFixed(1)} m)` }), seconds: 11 };
    },
    spire() {
      const p = w.proxies.find((q) => q.name === "stpierre");
      if (!p) throw new Error("no Saint-Pierre proxy");
      const y = p.top - 6;
      // the spire's cells at that height: their centre
      let sx = 0, sz = 0, n = 0;
      for (let j = 0; j < p.nz; j++) for (let i = 0; i < p.nx; i++) if (p.data[j * p.nx + i] > y) { sx += p.x0 + (i + 0.5) * p.step; sz += p.z0 + (j + 0.5) * p.step; n++; }
      const cx = sx / n, cz = sz / n;
      F.pick = { cx, cz, y, cells: n, top: p.top };
      return { ...line(cx, cz, 0.6, 0.8, y, { back: 70, speed: 16, note: `level into Saint-Pierre's spire, 6 m under its top (${n} m2 of it at that height)` }), seconds: 8 };
    },
    street() {
      // low along a street between the rows (under the roofs), turning with it: the chase camera beside the façades
      air.setWind(2, 240);
      const tile = w.tileAt(P.x, P.z), roads = (tile.roads?.roads || []).filter((r) => r.pts?.length >= 3);
      let best = null;
      for (const r of roads) {
        const pts = r.pts.map((q) => [q.x, q.z]); let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (L < 160 || Math.hypot(pts[0][0] - P.x, pts[0][1] - P.z) > 400) continue;
        // lined with buildings: roofs within 14 m of the axis on many samples
        let lined = 0, n = 0; for (let i = 0; i < pts.length; i++) { const [x, z] = pts[i]; n++; for (const [ox, oz] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) if (w.roof(x + ox, z + oz) > w.ground(x, z) + 6) { lined++; break; } }
        const score = lined / n * Math.min(L, 400);
        if (!best || score > best.score) best = { r, pts, L, score };
      }
      if (!best) throw new Error("no street");
      const pts = best.pts, y0 = (x, z) => w.ground(x, z) + 7;
      const h0 = Math.atan2(-(pts[1][0] - pts[0][0]), -(pts[1][1] - pts[0][1]));
      fl.start(pts[0][0], pts[0][1], h0, y0(pts[0][0], pts[0][1]), 13, 0);
      let k = 1;
      F.pick = { name: best.r.meta?.name, L: best.L, n: pts.length };
      return { seconds: Math.min(25, best.L / 13), note: `low along ${best.r.meta?.name || "a street"} (7 m up, under the roofs): the chase camera beside the façades`, script: (f) => {
        while (k < pts.length - 1 && Math.hypot(pts[k][0] - f.pos.x, pts[k][1] - f.pos.z) < 12) k++;
        const [tx, tz] = pts[k];
        const st = steer(f, Math.atan2(-(tx - f.pos.x), -(tz - f.pos.z)), 0, 0.9);
        return { ...st, pitch: clamp((y0(f.pos.x, f.pos.z) - f.pos.y) * 0.15 - f.gamma * 1.5, -1, 1), flap: f.V < 12 ? 1 : 0, fold: 0 };
      } };
    },
  };
  return { ...S1, ...S2 };
  // a ridge perch whose approach (45 m out along its facing, descending from 12 m over it) clears every roof by 3 m
  function clearApproach(q) {
    const ox = -Math.sin(q.yaw), oz = -Math.cos(q.yaw);
    for (let d = 2; d <= 45; d += 1.5) { const y = q.pos.y + 12 * d / 45 + 1; if (w.floor(q.pos.x + ox * d, q.pos.z + oz * d) > y - 3) return false; }
    return true;
  }
  function landOn(pick, note, up = 6) {
    air.setWind(2, 240);
    const q = g.perches.find(pick);
    if (!q) throw new Error(`no perch for ${note}`);
    const out = { x: -Math.sin(q.yaw), z: -Math.cos(q.yaw) };
    const s = { x: q.pos.x + out.x * 45, y: q.pos.y + up, z: q.pos.z + out.z * 45 };
    fl.start(s.x, s.z, Math.atan2(out.x, out.z), s.y, 13, -0.05);
    let asked = false;
    return { seconds: 9, note, perch: q, script: (f) => {
      const dx = q.pos.x - f.pos.x, dy = q.pos.y + 1 - f.pos.y, dz = q.pos.z - f.pos.z, d = Math.hypot(dx, dz);
      if (!asked && d < 24) { inp.actions.add("land"); asked = true; }
      return { ...steer(f, Math.atan2(-dx, -dz), Math.atan2(dy, d)), brake: d < 35 ? 0.6 : 0, fold: 0, flap: 0 };
    } };
  }
}

const shown = [];
/** run a scenario: stepped at 1/60 s; grabs = frames on the sheet; returns the measurements */
export async function run(name, { grabs = 8, seconds = null, cellW = 400, arg } = {}) {
  const v = window.viewer, fl = window.__flyer;
  await fl.ready;
  const F = { flyer: fl };
  fl.stop(); v.controls.enabled = false;
  const said = [];
  { const g = fl.game; g.say = function (m) { said.push({ t: +g.t.toFixed(2), s: m, x: +g.f.pos.x.toFixed(1), y: +g.f.pos.y.toFixed(1), z: +g.f.pos.z.toFixed(1), floor: +fl.w.floor(g.f.pos.x, g.f.pos.z).toFixed(1), V: +g.f.V.toFixed(1) }); this.messages.push({ t: this.t, s: m }); if (this.messages.length > 6) this.messages.shift(); }; }
  { const g = fl.game; g.messages.length = 0; for (const k in g.score) g.score[k] = 0; g.f.extraMass = 0; fl.bird.drop(); g.trace.length = 0; fl.handover = null; }
  const S = scenarios(F)[name](arg);
  const dur = seconds ?? S.seconds, n = Math.round(dur * 60);
  fl.input.script = name === "intro" ? null : S.script;
  if (name === "intro") fl._introScript = S.script;
  const long = [];
  let obs = null;
  try { obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push([Math.round(e.startTime), Math.round(e.duration)]); }); obs.observe({ type: "longtask" }); } catch { /* none */ }
  v.pause(true);
  const sync0 = hook.sync, async0 = hook.async, labels0 = hook.syncLabels.length;
  const frames = [], cpu = [], trace = [], shots = [], tiles = [];
  let minClear = Infinity, minAt = null, under = 0, contacts = 0;
  const cam = { minD: Infinity, occluded: 0, pulled: 0, over: 0, frames: 0 }, brush = { frames: 0, max: 0 }, hits = [];
  const every = Math.max(1, Math.floor(n / grabs)), t0 = performance.now();
  const dev = v.renderer.backend.device;
  let lastTiles = v.world.tiles.map((t) => t.name).sort().join(" ");
  for (let i = 0; i < n; i++) {
    if (name === "intro" && !fl.intro && fl.input.script == null) fl.input.script = S.script;
    const a = performance.now();
    v.step(1 / 60);
    const b = performance.now();
    await dev.queue.onSubmittedWorkDone();
    const c = performance.now();
    frames.push(c - a); cpu.push(b - a);
    const g = fl.game, f = g.f;
    if (!fl.intro) {
      const fl0 = fl.w.floorAt(f.pos.x, f.pos.z, f.pos.y), clear = f.pos.y - fl0;
      if (g.mode === "fly" && clear < minClear) { minClear = clear; minAt = { t: +(i / 60).toFixed(2), x: +f.pos.x.toFixed(1), y: +f.pos.y.toFixed(1), z: +f.pos.z.toFixed(1), floor: +fl0.toFixed(1) }; }
      if (g.mode === "fly" && clear < 0.3) under++;
      if (f.contact) { contacts++; hits.push({ t: +(i / 60).toFixed(2), wall: f.contact.wall, under: f.contact.under, tree: f.contact.tree != null, land: f.contact.land, hard: f.contact.hard, vn: +f.contact.vn.toFixed(1), y: +f.contact.y.toFixed(1) }); }
      if (f.brush > 0) { brush.frames++; brush.max = Math.max(brush.max, +f.brush.toFixed(2)); }
      // the chase camera: its distance to the bird, the line of sight to the bird and its wingtips over the solid
      if (fl.fcam.mode === "chase" && g.mode === "fly") {
        const C = v.camera.position, B = f.pos, span = g.span, rx = -Math.cos(f.heading) * span * 0.5, rz = Math.sin(f.heading) * span * 0.5;
        cam.frames++; cam.minD = Math.min(cam.minD, Math.hypot(C.x - B.x, C.y - B.y, C.z - B.z));
        let occ = false;
        for (let k = -1; k <= 1 && !occ; k++) for (let s2 = 0.15; s2 <= 1; s2 += 0.05) {
          const x = B.x + rx * k + (C.x - B.x - rx * k) * s2, y = B.y + (C.y - B.y) * s2, z = B.z + rz * k + (C.z - B.z - rz * k) * s2;
          if (y < fl.w.column(x, z, B.y).floor) { occ = true; break; }
        }
        if (occ) cam.occluded++;
        if (fl.fcam.clear?.pulled > 0) cam.pulled++; if (fl.fcam.clear?.over) cam.over++;
      }
      if (i % 6 === 0) trace.push([+(i / 60).toFixed(1), +f.V.toFixed(1), +(f.pos.y - fl0).toFixed(1), +f.pos.y.toFixed(1), g.mode, +f.lift.toFixed(2)]);
    }
    const tn = v.world.tiles.map((t) => t.name).sort().join(" ");
    if (tn !== lastTiles) { tiles.push([+(i / 60).toFixed(1), tn]); lastTiles = tn; }
    if (i % every === 0 || i === n - 1) {
      v.renderFrame();                                   // the grab: this frame drawn again, read right after
      const g2 = fl.game, f2 = g2.f;
      shots.push({ url: v.renderer.domElement.toDataURL("image/jpeg", 0.8), label: `${(i / 60).toFixed(1)} s  ${fl.intro ? "intro" : `${g2.mode} ${f2.V.toFixed(0)} m/s  ${(f2.pos.y - fl.w.floor(f2.pos.x, f2.pos.z)).toFixed(0)} m up`}` });
    }
    if (S.done?.(i / 60)) break;
    await new Promise((r) => setTimeout(r, 0));
  }
  S.after?.();
  fl.input.script = null; fl.input.talons = false;
  v.pause(false);
  obs?.disconnect();
  const s = [...frames].sort((x, y) => x - y), q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
  const hist = {}; for (const ms of frames) { const k = ms < 8 ? "<8" : ms < 16.7 ? "8-16.7" : ms < 25 ? "16.7-25" : ms < 33 ? "25-33" : ms < 50 ? "33-50" : ">50"; hist[k] = (hist[k] || 0) + 1; }
  const g = fl.game;
  return {
    name, note: S.note, seconds: +(frames.length / 60).toFixed(1), wallS: +((performance.now() - t0) / 1000).toFixed(1),
    frameMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) }, hist,
    cpuMs: (() => { const c2 = [...cpu].sort((x, y) => x - y); return { p50: +c2[c2.length >> 1].toFixed(2), p99: +c2[Math.floor(c2.length * 0.99)].toFixed(2), max: +c2[c2.length - 1].toFixed(2) }; })(),
    flightCpu: fl.cpuStats(), syncPipelines: hook.sync - sync0, asyncPipelines: hook.async - async0, syncLabels: hook.syncLabels.slice(labels0),
    cam: { ...cam, minD: +cam.minD.toFixed(2) }, brush, hits, pick: F.pick ? JSON.parse(JSON.stringify(F.pick, (k, x) => (k === "td" || k === "p" || k === "main" ? undefined : typeof x === "number" ? +x.toFixed(2) : x))) : null,
    longTasks: long.filter(([t]) => t >= t0), minClearance: +minClear.toFixed(2), minAt, framesUnder: under, contacts,
    score: { ...g.score }, said, mode: g.mode, perch: g.perch?.name ?? null, messages: g.messages.map((m) => m.s), tiles, trace, shots,
    handover: fl.handover ?? null, maxV: Math.max(...trace.map((r) => r[1])),
  };
}

/** a contact sheet of a run's grabs over the page (for a screenshot) */
export function sheet(r, { cols = 4, title = null } = {}) {
  hide();
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;inset:0;z-index:50;background:#16181c;color:#eee;font:13px monospace;padding:6px;overflow:hidden;display:grid;gap:4px;align-content:start";
  d.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  const h = document.createElement("div"); h.style.gridColumn = `1 / span ${cols}`; h.textContent = title ?? `${r.name}: ${r.note}`; d.append(h);
  for (const s of r.shots) { const c = document.createElement("div"); c.innerHTML = `<img src="${s.url}" style="width:100%;display:block"><div>${s.label}</div>`; d.append(c); }
  document.body.append(d); shown.push(d);
}
export function hide() { for (const d of shown.splice(0)) d.remove(); }
