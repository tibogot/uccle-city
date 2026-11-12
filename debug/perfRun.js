// The performance audit's measuring stick (docs/perf/AUDIT_PLAN.md section 0): fixed camera paths driven by the CLOCK
// (not by key presses, so a slow frame never changes the route), and per path one report: frame-time histogram
// (p50 / p95 / p99 / max, frames over 33 ms), long tasks, render pipelines created SYNCHRONOUSLY mid-frame (the
// 2026-11-13 freeze hook: GPUDevice.createRenderPipeline vs ...Async), GPU ms per pass (timestamp queries), draws,
// triangles, GPU memory objects, JS heap, tile loads. A run in a hidden / throttled tab is marked INVALID.
//
//   const P = await import("/debug/perfRun.js");
//   await P.run("flight")                     one path (names: P.PATHS)
//   await P.suite({ rounds: 2 })              every path, `rounds` times each, with the spread between rounds
//   P.last                                    the last report (also in localStorage "perfRun.last")
//
// Rules (owner): ONE Chrome tab, in FRONT (a background tab is throttled to ~1 fps), no agent running. Compare
// variants with A/B rounds (debug/gpuAB.js alternate) or alternate whole suites; a change under the spread = no change.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EYE = 1.6;

// Paths: points [x, z] in city metres (+x east, +z south), `speed` m/s along them; `y`: "street" (eye height on
// the walk surface), or a height above the ground. Street routes follow road nodes (data/tiles/*/roads.json).
export const PATHS = {
  // the 2026-11-13 freeze diagnosis flight: Saint-Job (I6) to the Alsemberg / Altitude Cent side (E4), 70 m up, 85 s
  flight: { pts: [[1100, 520], [-900, -150]], seconds: 85, y: 70, pitch: -0.32 },
  // street level through Saint-Job: Avenue Carsoel, round the Place, down the Montagne de Saint-Job (~850 m, 12 m/s)
  stjob: { pts: [[932, 531], [1086, 519], [1102, 542], [1124, 551], [1175, 540], [1218, 521], [1253, 563], [1256, 587], [1209, 604], [1175, 540], [1124, 551], [1122, 836]], speed: 12, y: "street" },
  // street level down the Chaussée d'Alsemberg, north to south across D/E tiles (~1.8 km, 15 m/s: tile streaming)
  alsemberg: { pts: [[-870, -1150], [-886, -1040], [-893, -929], [-901, -690], [-907, -498], [-913, -278], [-919, -142], [-920, -67], [-932, 106], [-949, 193], [-976, 281], [-1011, 360], [-1047, 461], [-1071, 520], [-1123, 650]], speed: 15, y: "street" },
  // a full turn on the spot on the Place de Saint-Job (everything around comes into view once)
  turn: { at: [1150, 548], seconds: 16, y: "street" },
  // a slow orbit over Saint-Job, 380 m out and 240 m up (the overview look)
  orbit: { at: [1153, 540], radius: 380, height: 240, seconds: 40 },
};

// ---- probes (installed once per page) ----
const S = (window.__perf ||= { pipes: [], long: [], hooked: false });
if (!S.hooked && window.GPUDevice) {
  S.hooked = true;
  const D = GPUDevice.prototype;
  for (const k of ["createRenderPipeline", "createRenderPipelineAsync", "createComputePipeline", "createComputePipelineAsync"]) {
    const f = D[k];
    D[k] = function (desc) { S.pipes.push([performance.now(), k, (desc?.label || "").slice(0, 60)]); return f.call(this, desc); };
  }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) S.long.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true }); } catch (e) {}
}

function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function along(pts, d) {   // point + heading at distance d along the polyline
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az);
    if (d <= L || i === pts.length - 1) { const t = Math.min(1, d / L); return [ax + (bx - ax) * t, az + (bz - az) * t]; }
    d -= L;
  }
  return pts[pts.length - 1];
}

/** the camera pose of path `p` at time t (s): [x, y, z, lookX, lookY, lookZ] */
function pose(p, t, dur) {
  const V = window.viewer, w = V.world;
  const ground = (x, z) => (p.y === "street" ? (w.walkY ? w.walkY(x, z) : w.surface(x, z)) + EYE : w.surface(x, z) + p.y);
  if (p.pts) {
    const L = pathLength(p.pts), d = Math.min(L, (t / dur) * L);
    const [x, z] = along(p.pts, d), [lx, lz] = along(p.pts, Math.min(L, d + 25));
    const hx = lx - x, hz = lz - z, hl = Math.hypot(hx, hz) || 1;
    const y = ground(x, z);
    const pitch = p.pitch ?? -0.05;
    return [x, y, z, x + hx / hl * 30, y + Math.tan(pitch) * 30, z + hz / hl * 30];
  }
  if (p.radius) {
    const a = (t / dur) * Math.PI * 2, [cx, cz] = p.at, gy = w.surface(cx, cz);
    return [cx + Math.sin(a) * p.radius, gy + p.height, cz + Math.cos(a) * p.radius, cx, gy, cz];
  }
  const a = (t / dur) * Math.PI * 2, [x, z] = p.at, y = ground(x, z);
  return [x, y, z, x + Math.sin(a) * 30, y - 1.5, z - Math.cos(a) * 30];
}

const q = (s, f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : null);

/** Run one path; returns its report. settle: seconds parked at the start first (tiles load, shaders warm). */
export async function run(name, { settle = 8 } = {}) {
  const V = window.viewer;
  if (!V) throw new Error("the city is not loaded yet (window.viewer)");
  const p = typeof name === "string" ? PATHS[name] : name;
  if (!p) throw new Error(`unknown path ${name}; one of ${Object.keys(PATHS).join(", ")}`);
  const dur = p.seconds ?? pathLength(p.pts) / p.speed;
  // orbit mode, our hand on the camera: the orbit controls' own update (clamps, damping) is held off for the run
  V.setView("overview");
  const c = V.controls, cam = V.camera, upd = c.update;
  c.update = () => false;
  const place = (t) => { const [x, y, z, lx, ly, lz] = pose(p, t, dur); cam.position.set(x, y, z); c.target.set(lx, ly, lz); cam.lookAt(lx, ly, lz); };
  try {
    place(0);
    // settle at the start: tiles under the start load, first-view shaders compile (not part of the measurement)
    const st0 = performance.now();
    while (performance.now() - st0 < settle * 1000) { place(0); await sleep(100); }
    const frames = [], passes = {}, draws = [], tris = [];
    let nPass = 0;
    const pipes0 = S.pipes.length, long0 = S.long.length, mem0 = performance.memory?.usedJSHeapSize;
    V.resetGpu();
    let hidden = document.visibilityState !== "visible";
    const onVis = () => { if (document.visibilityState !== "visible") hidden = true; };
    document.addEventListener("visibilitychange", onVis);
    const t0 = performance.now();
    let last = t0, gpuT = t0;
    await new Promise((done) => {
      const step = (now) => {
        const t = (now - t0) / 1000;
        frames.push(now - last); last = now;
        place(Math.min(t, dur));
        if (now - gpuT > 250) {
          gpuT = now;
          const ps = V.gpuPasses();
          // keys are r187's render-context uids ("r:<context>:<n>", stable within one page load, unnamed): rank and
          // compare within a session; naming them shadow / scene / post is audit step 1
          if (ps) { nPass++; for (const [k, ms] of ps) passes[k] = (passes[k] || 0) + ms; }
          const r = V.renderer.info.render; draws.push(r.drawCalls ?? r.calls); tris.push(r.triangles);
        }
        if (t >= dur) return done();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    document.removeEventListener("visibilitychange", onVis);
    frames.shift();
    const s = [...frames].sort((a, b) => a - b), g = V.gpuStats();
    const pipes = S.pipes.slice(pipes0).filter((x) => x[0] >= t0);
    const sync = pipes.filter((x) => x[1] === "createRenderPipeline" || x[1] === "createComputePipeline");
    const longs = S.long.slice(long0).filter((x) => x[0] >= t0).map((x) => [Math.round(x[0] - t0), Math.round(x[1])]);
    const med = q(s, 0.5);
    const mean = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
    const mi = V.renderer.info.memory || {};
    const rep = {
      path: typeof name === "string" ? name : "custom", seconds: +dur.toFixed(1), at: new Date().toISOString(),
      valid: !hidden && med < 40, why: hidden ? "tab hidden during the run" : med >= 40 ? `median frame ${med} ms: throttled tab or a stalled GPU` : "",
      frames: s.length, ms: { p50: med, p95: q(s, 0.95), p99: q(s, 0.99), max: q(s, 1) },
      histogram: { "<8": 0, "8-16.7": 0, "16.7-25": 0, "25-33": 0, "33-50": 0, ">50": 0 },
      over33: s.filter((x) => x > 33).length,
      worst: frames.map((d, i) => [Math.round(i), +d.toFixed(1)]).sort((a, b) => b[1] - a[1]).slice(0, 8),
      long: longs.sort((a, b) => b[1] - a[1]).slice(0, 10), nLong: longs.length,
      pipelines: { sync: sync.length, async: pipes.length - sync.length, syncLabels: sync.slice(0, 12).map((x) => [Math.round(x[0] - t0), x[2]]) },
      gpu: { p50: g.p50, p95: g.p95, max: g.max, n: g.n, passes: Object.entries(passes).map(([k, v]) => [k, +(v / Math.max(1, nPass)).toFixed(2)]).sort((a, b) => b[1] - a[1]).slice(0, 10) },
      draws: { mean: mean(draws), max: draws.length ? Math.max(...draws) : null },
      trisM: { mean: tris.length ? +(mean(tris) / 1e6).toFixed(2) : null, max: tris.length ? +(Math.max(...tris) / 1e6).toFixed(2) : null },
      memory: { geometries: mi.geometries, textures: mi.textures, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, heapGrowMB: mem0 ? Math.round((performance.memory.usedJSHeapSize - mem0) / 1e6) : null },
      tiles: V.world.tiles.length,
    };
    for (const d of frames) rep.histogram[d < 8 ? "<8" : d < 16.7 ? "8-16.7" : d < 25 ? "16.7-25" : d < 33 ? "25-33" : d < 50 ? "33-50" : ">50"]++;
    save(rep);
    return rep;
  } finally {
    c.update = upd;
  }
}

/** Every path (or `names`), `rounds` times; the per-path spread between rounds tells what a real change must beat. */
export async function suite({ names = Object.keys(PATHS), rounds = 1, settle = 8 } = {}) {
  const out = { at: new Date().toISOString(), ua: navigator.userAgent, size: [innerWidth, innerHeight, devicePixelRatio], url: location.search, runs: [] };
  for (let r = 0; r < rounds; r++) for (const n of names) out.runs.push({ round: r, ...(await run(n, { settle })) });
  out.summary = names.map((n) => {
    const rs = out.runs.filter((x) => x.path === n), v = (f) => rs.map(f);
    const span = (a) => (a.some((x) => x == null) ? null : +(Math.max(...a) - Math.min(...a)).toFixed(2));
    return { path: n, valid: rs.every((x) => x.valid), p50: v((x) => x.ms.p50), p99: v((x) => x.ms.p99), over33: v((x) => x.over33),
      syncPipes: v((x) => x.pipelines.sync), long: v((x) => x.nLong), gpuP50: v((x) => x.gpu.p50), gpuSpread: span(v((x) => x.gpu.p50)), draws: v((x) => x.draws.mean) };
  });
  save(out);
  return out;
}

export let last = null;
function save(r) { last = r; try { localStorage.setItem("perfRun.last", JSON.stringify(r)); } catch (e) {} }
