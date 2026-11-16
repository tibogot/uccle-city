// GAME PERF HARNESS (docs/PERF_GAME.md): the police drive / chase and the falcon flight, measured the way a player plays
// them. An AUTOPILOT drives the police car through the drive mode's own input (driver.keys.read replaced: pure pursuit
// along the map worker's GPS route, speed from the curvature ahead, reverse when stuck), so the car goes through the real
// physics, collisions, traffic, streaming, HUD and game kit. Per run: frame times (avg, p50, p95, p99, 1 % low, worst,
// frames > 25 / 33 / 50 ms), the main loop's CPU ms, the GPU ms (timestamp queries), draws / triangles, pipelines
// created during the run (sync vs async), long animation frames WITH their script attribution (which function), JS heap
// drops (GC), tile loads, and the cost of each updater / system (wrapped one by one: ms per frame avg / p99 / max).
//
//   const G = await import("/debug/gamePerf.js");
//   await G.police({ seconds: 45 })                 the station -> a far point, lights + siren on (?game=police running)
//   await G.police({ seconds: 45, chase: true })    + a stolen-car job: the autopilot chases the fleeing car
//   await G.falcon({ seconds: 40 })                 ?game=falcon: debug/falconGameAuto.js flies a fixed tour
//   await G.idle({ seconds: 20 })                   the same probes with the camera where it is (default viewer views)
//   G.last                                          the last report (also localStorage "gamePerf.last")
// Rules: ONE tab in FRONT, preflight GREEN (or quote the noise), compare A/B by alternating page loads.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const q = (s, f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : null);
const avg = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null);

// ---------------------------------------------------------------- probes (once per page)
const S = (window.__gamePerf ||= { pipes: [], hooked: false, loaf: [], long: [] });
if (!S.hooked) {
  S.hooked = true;
  if (window.GPUDevice) {
    const D = GPUDevice.prototype;
    for (const k of ["createRenderPipeline", "createRenderPipelineAsync", "createComputePipeline", "createComputePipelineAsync", "createShaderModule"]) {
      const f = D[k];
      D[k] = function (desc) {
        const e = [performance.now(), k, (desc?.label || "").slice(0, 60)];
        // a SYNC render pipeline mid-play: keep who asked (the stack's non-three frames)
        if (k === "createRenderPipeline") e.push((new Error().stack || "").split(String.fromCharCode(10)).filter((l) => !/three\.(webgpu|core|tsl)|gamePerf/.test(l)).slice(1, 7).map((l) => l.trim().replace(/^at /, "").replace(/https?:\/\/[^/]+\//, "")).join(" < "));
        S.pipes.push(e);
        return f.call(this, desc);
      };
    }
  }
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        S.loaf.push({ t: Math.round(e.startTime), dur: Math.round(e.duration), block: Math.round(e.blockingDuration || 0), render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
          scripts: (e.scripts || []).filter((s) => s.duration > 4).map((s) => ({ d: Math.round(s.duration), inv: (s.invoker || "").slice(0, 60), fn: s.sourceFunctionName || "", src: (s.sourceURL || "").split("/").slice(-2).join("/") + ":" + (s.sourceCharPosition ?? ""), type: s.invokerType })) });
        if (S.loaf.length > 3000) S.loaf.splice(0, 1500);
      }
    }).observe({ type: "long-animation-frame", buffered: false });
  } catch { /* no LoAF */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) S.long.push([e.startTime, e.duration]); }).observe({ type: "longtask" }); } catch { /* none */ }
}

// ---------------------------------------------------------------- per-system cost: wrap the updaters + the big calls
function nameOf(fn, i) {
  if (fn.__gpName) return fn.__gpName;
  const src = String(fn).replace(/\s+/g, " ");
  return `${i}:${fn.name || src.slice(0, 70)}`;
}
function instrument() {
  const V = window.viewer, cost = new Map(), undo = [];
  const add = (k, ms) => { let c = cost.get(k); if (!c) cost.set(k, (c = { a: [] })); c.a.push(ms); };
  const ups = V.updaters;
  // the updaters array is spliced by systems (game kit start / quit): wrap through a Proxy-free approach: wrap the
  // current entries and remember the originals by position; restored at the end by identity
  const orig = ups.slice();
  for (let i = 0; i < ups.length; i++) {
    const f = ups[i], k = nameOf(f, i);
    const w = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { add(k, performance.now() - t0); } };
    w.__orig = f; ups[i] = w;
  }
  undo.push(() => { for (let i = 0; i < ups.length; i++) if (ups[i].__orig) ups[i] = ups[i].__orig; });
  const wrapM = (obj, m, k) => {
    if (!obj || typeof obj[m] !== "function") return;
    const f = obj[m];
    obj[m] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { add(k, performance.now() - t0); } };
    undo.push(() => { obj[m] = f; });
  };
  const d = window.__game?.host?.driver;
  wrapM(d, "update", "driver.update (physics + chase cam)");
  wrapM(window.__map, "update", "minimap.update");
  wrapM(V.lighting, "update", "lighting.update (shadows box)");
  wrapM(V.fader, "update", "fader.update");
  wrapM(window.__flyer, "update", "flyer.update");
  // renderer.render: every pass (shadow cascades, scene MRT, post quads) = the render submission cost
  const r = V.renderer, rr = r.render;
  let renderN = 0;
  r.render = function (...a) { const t0 = performance.now(); renderN++; try { return rr.apply(this, a); } finally { add("renderer.render (all passes, CPU)", performance.now() - t0); } };
  undo.push(() => { r.render = rr; });
  // the whole loop
  const anim = r._animation;
  let loopMs = [];
  if (anim && typeof anim._animationLoop === "function") {
    const f = anim._animationLoop;
    anim._animationLoop = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { loopMs.push(performance.now() - t0); } };
    undo.push(() => { anim._animationLoop = f; });
  }
  return { cost, loopMs, renderN: () => renderN, undo: () => { for (const u of undo.reverse()) u(); }, orig };
}

// ---------------------------------------------------------------- the measurement window
async function measure(seconds, onFrame = null, label = "") {
  const V = window.viewer;
  const I = instrument();
  V.resetGpu();
  const frames = [], draws = [], tris = [], heap = [], gcs = [], tileEv = [], spikes = [];
  const pipes0 = S.pipes.length, loaf0 = S.loaf.length, long0 = S.long.length;
  let hidden = document.visibilityState !== "visible";
  const onVis = () => { if (document.visibilityState !== "visible") hidden = true; };
  document.addEventListener("visibilitychange", onVis);
  const tiles0 = V.world.tiles.map((t) => t.name).join(), lite0 = V.lite.size;
  let lastTiles = tiles0;
  const gpuAll = [];
  let gpuSeen = 0;
  const t0 = performance.now();
  let last = t0, lastHeap = performance.memory?.usedJSHeapSize ?? 0;
  await new Promise((done) => {
    const step = (now) => {
      const dt = now - last; last = now;
      frames.push(dt);
      const r = V.renderer.info.render; draws.push(r.drawCalls ?? r.calls); tris.push(r.triangles);
      const h = performance.memory?.usedJSHeapSize ?? 0;
      if (h < lastHeap - 1.5e6) gcs.push([Math.round(now - t0), +((lastHeap - h) / 1e6).toFixed(1), +dt.toFixed(1)]);
      lastHeap = h; heap.push(h);
      const tn = V.world.tiles.map((t) => t.name).join();
      if (tn !== lastTiles) { tileEv.push([Math.round(now - t0), tn.split(",").length]); lastTiles = tn; }
      if (dt > 70) spikes.push([Math.round(now - t0 - dt), Math.round(dt)]);
      try { onFrame?.(now - t0, dt); } catch (e) { console.warn(e); }
      if (now - t0 >= seconds * 1000) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  document.removeEventListener("visibilitychange", onVis);
  I.undo();
  const g = V.gpuStats();
  const fs = frames.slice(1).sort((a, b) => a - b), n = fs.length;
  const worst1 = fs.slice(Math.floor(n * 0.99));
  const loop = I.loopMs.slice().sort((a, b) => a - b);
  const systems = [...I.cost.entries()].map(([k, c]) => { const s = c.a.slice().sort((a, b) => a - b); return { sys: k, n: s.length, avg: +(s.reduce((a, b) => a + b, 0) / Math.max(1, n)).toFixed(3), p99: q(s, 0.99), max: q(s, 1), over2: s.filter((x) => x > 2).length }; })
    .sort((a, b) => b.avg - a.avg);
  const pipes = S.pipes.slice(pipes0).map(([t, k, l, st]) => [Math.round(t - t0), k.replace("create", ""), l, ...(st ? [st] : [])]);
  const loafs = S.loaf.slice(loaf0).filter((e) => e.t >= t0 - 50 && e.dur > 50);
  const report = {
    label, seconds, valid: !hidden, frames: n,
    fps: +(1000 / (fs.reduce((a, b) => a + b, 0) / n)).toFixed(1),
    frameMs: { avg: avg(fs), p50: q(fs, 0.5), p95: q(fs, 0.95), p99: q(fs, 0.99), worst: q(fs, 1), low1pct: +(1000 / avg(worst1)).toFixed(1), over25: fs.filter((x) => x > 25).length, over33: fs.filter((x) => x > 33.4).length, over50: fs.filter((x) => x > 50).length, over100: fs.filter((x) => x > 100).length },
    cpuLoopMs: { avg: avg(loop), p95: q(loop, 0.95), p99: q(loop, 0.99), max: q(loop, 1) },
    gpuMs: g,
    draws: { avg: Math.round(avg(draws)), max: Math.max(...draws) }, trisK: { avg: Math.round(avg(tris) / 1000), max: Math.round(Math.max(...tris) / 1000) },
    rendersPerFrame: +(I.renderN() / n).toFixed(1),
    systems,
    pipelines: { n: pipes.length, sync: pipes.filter((p) => !/Async|Shader/.test(p[1])).length, list: pipes.slice(0, 40) },
    longFrames: loafs.slice(0, 30),
    longTasks: S.long.slice(long0).filter(([t]) => t >= t0).map(([t, d]) => [Math.round(t - t0), Math.round(d)]),
    gc: { n: gcs.length, list: gcs.slice(0, 30), heapMB: +((heap[heap.length - 1] ?? 0) / 1e6).toFixed(0) },
    spikes, t0: Math.round(t0),
    tiles: { start: tiles0, end: lastTiles, events: tileEv, lite: [lite0, V.lite.size] },
  };
  try { localStorage.setItem("gamePerf.last", JSON.stringify(report)); } catch { /* full */ }
  return (window.__gamePerfLast = report);
}
export const last = () => window.__gamePerfLast;

// ---------------------------------------------------------------- autopilot
function autopilot(driver) {
  const AP = { pts: null, i: 0, vmax: 16, stuck: 0, rev: 0, off: 1.2, tOff: 0, wide: 3, on: true, dist: 0, lx: null, lz: null, info: { stuck: 0, resets: 0 } };
  const keys = driver.keys, read0 = keys.read;
  const inp = { throttle: 0, steer: 0, handbrake: false };
  keys.read = function () {
    const c = driver.state;
    if (!AP.on || !AP.pts || !c) return read0.call(keys);
    if (AP.kin) return kinStep(c);
    const p = AP.pts, N = p.length / 2;
    // the nearest route point ahead (monotonic search window)
    let best = Infinity, bi = AP.i;
    for (let k = AP.i; k < Math.min(N, AP.i + 40); k++) { const d = Math.hypot(p[2 * k] - c.x, p[2 * k + 1] - c.z); if (d < best) { best = d; bi = k; } }
    AP.i = bi;
    const v = c.speed;
    const look = 7 + Math.abs(v) * 0.7;
    let k = bi, acc = 0;
    while (k < N - 1 && acc < look) { acc += Math.hypot(p[2 * k + 2] - p[2 * k], p[2 * k + 3] - p[2 * k + 1]); k++; }
    // a lateral offset to the LEFT of the route (overtake cars pulled over on the right); after a stuck: wider, alternating
    let ox = 0, oz = 0;
    if (k > 0) { const dx = p[2 * k] - p[2 * k - 2], dz = p[2 * k + 1] - p[2 * k - 1], L = Math.hypot(dx, dz) || 1; const o = AP.tOff > 0 ? AP.wide : AP.off; ox = (dz / L) * o; oz = (-dx / L) * o; }
    if (AP.tOff > 0) AP.tOff -= 1 / 60;
    const tx = p[2 * k] + ox, tz = p[2 * k + 1] + oz;
    const want = Math.atan2(tx - c.x, tz - c.z), err = wrapA(want - c.heading);
    // the curvature ahead (heading change over the next ~35 m): the target speed
    let k2 = bi, a2 = 0;
    while (k2 < N - 1 && a2 < 35) { a2 += Math.hypot(p[2 * k2 + 2] - p[2 * k2], p[2 * k2 + 3] - p[2 * k2 + 1]); k2++; }
    const far = Math.atan2(p[2 * k2] - c.x, p[2 * k2 + 1] - c.z), turn = Math.abs(wrapA(far - c.heading));
    const vt = Math.max(5, AP.vmax * (1 - Math.min(0.75, turn * 0.9)));
    if (AP.rev > 0) { AP.rev -= 1 / 60; inp.throttle = -1; inp.steer = -Math.sign(err); inp.handbrake = false; return inp; }
    if (Math.abs(v) < 0.8) AP.stuck += 1 / 60; else AP.stuck = 0;
    if (AP.stuck > 1.5) { AP.stuck = 0; AP.rev = 1.2; AP.info.stuck++; AP.tOff = 4; AP.wide = (AP.info.stuck % 2 ? 1 : -1) * 3; }
    inp.steer = Math.max(-1, Math.min(1, err * 2.2));
    inp.throttle = v < vt ? 1 : v > vt + 2.5 ? -1 : 0;
    inp.handbrake = false;
    return inp;
  };
  // KINEMATIC mode (default for measurements): the car is put on the route each frame at a speed profile (vmax, slower
  // in curves), the physics then steps from there (collisions, ground, chase camera as usual): a repeatable drive that
  // traffic, parked cars or a bollard cannot stop. The workload (streaming, traffic, render) is the player's.
  AP.kin = true; AP.d = 0; AP.v = 0; AP.t = performance.now();
  const kinStep = (c) => {
    const now = performance.now(), dt = Math.min(0.1, (now - AP.t) / 1000); AP.t = now;
    const p = AP.pts, N = p.length / 2;
    if (!AP.cum || AP.cumFor !== p) { AP.cum = new Float64Array(N); for (let k = 1; k < N; k++) AP.cum[k] = AP.cum[k - 1] + Math.hypot(p[2 * k] - p[2 * k - 2], p[2 * k + 1] - p[2 * k - 1]); AP.cumFor = p; AP.d = 0; AP.i = 0; }
    const at = (d) => { let k = AP.i; while (k < N - 2 && AP.cum[k + 1] < d) k++; AP.i = k; const L = AP.cum[k + 1] - AP.cum[k] || 1, t = Math.min(1, Math.max(0, (d - AP.cum[k]) / L)); return [p[2 * k] + (p[2 * k + 2] - p[2 * k]) * t, p[2 * k + 1] + (p[2 * k + 3] - p[2 * k + 1]) * t, k]; };
    const [x0, z0] = at(AP.d), save = AP.i, [x1, z1] = at(AP.d + 4), [x2, z2] = at(AP.d + 30); AP.i = save;
    const h = Math.atan2(x1 - x0, z1 - z0), h2 = Math.atan2(x2 - x1, z2 - z1), turn = Math.abs(wrapA(h2 - h));
    const vt = Math.max(5, AP.vmax * (1 - Math.min(0.7, turn * 0.8)));
    AP.v += Math.max(-6 * dt, Math.min(3.5 * dt, vt - AP.v));
    AP.d = Math.min(AP.cum[N - 1], AP.d + AP.v * dt);
    c.x = x0; c.z = z0; c.vx = Math.sin(h) * AP.v; c.vz = Math.cos(h) * AP.v; c.speed = AP.v;
    c.heading = c.heading + wrapA(h - c.heading) * Math.min(1, dt * 8); c.angularVel = 0;
    inp.throttle = 0; inp.steer = 0; inp.handbrake = false;
    return inp;
  };
  AP.restore = () => { keys.read = read0; AP.on = false; };
  AP.done = () => AP.pts && (AP.kin ? AP.cum && AP.cumFor === AP.pts && AP.d >= AP.cum[AP.cum.length - 1] - 1 : AP.i >= AP.pts.length / 2 - 3);
  return AP;
}

async function route(map, x0, z0, x1, z1) {
  const r = await map.client.request({ type: "route", x0, z0, x1, z1, car: true });
  return r.pts && r.pts.length >= 4 ? r.pts : null;
}

/** the police drive. Needs ?game=police started (the car in the yard). to: [x, z] (default: Saint-Job via Rue Rouge /
 *  Alsemberg: a long, varied town route); chase: a stolen-car job, the autopilot follows the fleeing car */
export async function police({ seconds = 45, to = [1150, 560], vmax = 16, chase = false, siren = false, warm = 3, kin = true } = {}) {
  const kit = window.__game, d = kit?.host.driver, map = kit?.host.getMap();
  if (!kit?.current || kit.current.def.id !== "police" || !d?.on) throw new Error("start ?game=police first (car in the yard)");
  const PG = await import("/viewer/police/policeGame.js");
  const G = PG.POLICE_STATE;
  if (siren) { if (!G.car.lightsOn) G.car.setLights(); if (!G.car.sirenOn) G.car.setSiren(); }
  const AP = autopilot(d);
  AP.vmax = vmax; AP.kin = kin;
  let target = null;
  if (chase) {
    const { JOBS } = await import("/viewer/police/policeMissions.js");
    const call = JOBS.stolen(G, kit, Math.random);
    if (call) { kit.startMission(call.mission); }
  }
  // the yard's exit is blocked by its bollards for an autopilot: the car starts on the street, where the route starts
  let c = d.state;
  const r0 = await route(map, c.x, c.z, to[0], to[1]);
  if (!r0) throw new Error("no route");
  const save = d.startPose;
  d.startPose = { x: r0[0], z: r0[1], heading: Math.atan2(r0[4] - r0[0], r0[5] - r0[1]) };
  d.reset(); d.startPose = save; c = d.state;
  AP.pts = r0;
  let reroute = 0, busyR = false;
  await sleep(warm * 1000);
  const rep = await measure(seconds, (t) => {
    const ent = kit.wp?.entity;
    if (chase && ent?.alive && !busyR && t - reroute > 1500) {
      reroute = t; busyR = true;
      route(map, c.x, c.z, ent.x, ent.z).then((p) => { if (p) { AP.pts = p; AP.i = 0; } }).finally(() => { busyR = false; });
    } else if (AP.done() && !busyR) {
      // at the end of the route: on to a new far point (the car keeps driving)
      busyR = true;
      const a = Math.random() * Math.PI * 2;
      route(map, c.x, c.z, c.x + Math.cos(a) * 900, c.z + Math.sin(a) * 900).then((p) => { if (p) { AP.pts = p; AP.i = 0; } }).finally(() => { busyR = false; });
    }
  }, chase ? "police chase" : "police drive");
  AP.restore();
  rep.autopilot = { ...AP.info, endAt: [Math.round(c.x), Math.round(c.z)], kmh: Math.round(c.speed * 3.6), mission: kit.mission?.def.id ?? null };
  window.__gamePerfLast = rep;
  return rep;
}

/** the falcon flight: ?game=falcon running; debug/falconGameAuto.js flies a tour round Saint-Job at alt m */
export async function falcon({ seconds = 40, alt = 70, tour = [[1400, 300], [1500, 900], [900, 1000], [700, 400]] } = {}) {
  const A = await import("/debug/falconGameAuto.js");
  let leg = 0;
  A.go({ climb: alt });
  await sleep(2000);
  const rep = await measure(seconds, () => {
    const s = A.state?.();
    if (s && !s.job) { A.go({ to: tour[leg++ % tour.length], alt }); }
  }, "falcon flight");
  rep.auto = A.state?.();
  A.stop?.();
  return rep;
}

/** the same probes with the camera left where it is */
export async function idle({ seconds = 20 } = {}) { return measure(seconds, null, "idle"); }

/** a compact table of a report (for the doc) */
export function brief(r = window.__gamePerfLast) {
  return { label: r.label, fps: r.fps, avg: r.frameMs.avg, p99: r.frameMs.p99, low1: r.frameMs.low1pct, worst: r.frameMs.worst, o33: r.frameMs.over33, o50: r.frameMs.over50, cpu: r.cpuLoopMs.avg, cpu99: r.cpuLoopMs.p99, gpu: r.gpuMs.avg, gpu95: r.gpuMs.p95, draws: r.draws.avg, tris: r.trisK.avg, pipes: r.pipelines.n, gc: r.gc.n, tiles: r.tiles.events.length };
}
