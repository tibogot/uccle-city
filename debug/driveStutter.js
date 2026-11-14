// DRIVE-STUTTER HARNESS (docs/perf/AUDIT.md, step "instance pools"): the camera driven along a fixed street path at
// car speed (14 m/s ~ 50 km/h) at eye height, timed by requestAnimationFrame (the CLOCK moves the camera, never a slow
// frame), out and back, after a warm-up pass (tiles loaded, shaders compiled). Per measured leg: frame times p50 / p95 /
// p99 / max, frames > 33 ms, long tasks, and what the city-wide instance pools cost on the main thread (each pool's
// per-frame update timed: max / p99 / ms per second, frames where it took > 0.5 ms).
//
//   const D = await import("/debug/driveStutter.js");
//   await D.run()                                   default path, warm-up + 3 measured out-and-back repeats
//   await D.run({ repeats: 2, path: "boulenger" })  (names: D.PATHS) or { pts: [[x, z], ...], speed }
//   await D.run({ pops: true })                     + a pop check of the streamed pools (its own legs, untimed)
//   D.start(opts) / D.status()                      the same without holding the DevTools call (long runs)
//   D.last                                          the last report (also localStorage "driveStutter.last")
//
// Rules: ONE Chrome tab, in FRONT (chrome-devtools select_page with bringToFront: a background tab's rAF is throttled
// and the run is marked INVALID), nothing else heavy on the machine; compare variants on the same page load order
// (A/B by reloading with the other URL) and quote the spread between repeats.

const EYE = 1.6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const PATHS = {
  // the coordinator's 2026-11-14 measurement: Avenue Alphonse XIII / Boulenger (I6), front gardens on both sides
  boulenger: { pts: [[1470, 900], [1434, 640]], speed: 14 },
  // a longer street run through Saint-Job (perfRun.js "stjob" route) at car speed
  stjob: { pts: [[932, 531], [1086, 519], [1102, 542], [1124, 551], [1175, 540], [1218, 521], [1253, 563], [1256, 587], [1209, 604], [1175, 540], [1124, 551], [1122, 836]], speed: 14 },
};

const pathLength = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
function along(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az);
    if (d <= L || i === pts.length - 1) { const t = Math.max(0, Math.min(1, d / L)); return [ax + (bx - ax) * t, az + (bz - az) * t]; }
    d -= L;
  }
  return pts[pts.length - 1];
}
const q = (s, f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : null);

// ---- the pools' per-frame cost: each pool's update wrapped once (method lookups at call time: the updaters call
// this.update / this.field.update / this.layer.update)
const POOLS = {
  gardens: () => window.__gardens,
  stops: () => window.__stops,
  furniture2: () => window.__furniture2,
  streetlife: () => window.__streetlife?.layer,
  facadeKit: () => window.__kit,
};
const S = (window.__driveStutter ||= { cost: {}, wrapped: new Set(), long: [], loaf: [] });
function hookPools() {
  for (const [k, get] of Object.entries(POOLS)) {
    const o = get();
    if (!o || S.wrapped.has(k) || typeof o.update !== "function") continue;
    const f = o.update;
    S.cost[k] = [];
    o.update = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { S.cost[k].push(performance.now() - t0); } };
    S.wrapped.add(k);
  }
  if (!S.obs) {
    S.obs = true;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) S.long.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: false }); } catch (e) {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) S.loaf.push([e.startTime, e.duration, [...(e.scripts || [])].sort((a, b) => b.duration - a.duration).slice(0, 2).map((s) => `${(s.sourceFunctionName || s.invoker || "").slice(0, 40)}@${(s.sourceURL || "").split("/").pop()}:${Math.round(s.duration)}`).join(" | ")]);
      }).observe({ type: "long-animation-frame", buffered: false });
    } catch (e) {}
  }
}

/** POP CHECK (the streamed pools, viewer/instanceStream.js): every instance a mesh's shader may draw from the camera
 *  now (its live band, the tile not hidden) must be in that mesh's pool, i.e. within the band + margin of the pool's
 *  last gather centre; else it would appear / vanish in one frame. Tiles that landed after the pool's last commit count
 *  as `late` (they fade in from 0). Costly: run in its own leg, not while timing. */
export function popCheck(cam, acc, only = null) {
  for (const s of globalThis.__streamers || []) {
    if (only && s.name !== only) continue;
    const a = (acc[s.name] ||= { checked: 0, missing: 0, late: 0, worst: [] });
    for (const p of s.pools) for (const t of s.tiles.values()) {
      const src = t.srcs[p.key]; if (!src || !src.n || t.fade === 0) continue;
      const C = src.cen, late = !(t.addedT < (p.commitT ?? -1));
      for (const m of p.meshes) for (let i = 0; i < src.n; i++) {
        const o = i * 4, h = C[o + 3];
        const d = Math.hypot(C[o] - cam.x, C[o + 1] - cam.y, C[o + 2] - cam.z);
        if (d + h < m.l0 || d - h > m.l1) continue;
        a.checked++;
        const g = Math.hypot(C[o] - p.at.x, C[o + 1] - p.at.y, C[o + 2] - p.at.z);
        if (g + h >= m.d0 && g - h <= m.d1) continue;
        if (late) { a.late++; continue; }
        a.missing++;
        if (a.worst.length < 8) a.worst.push([p.key, m.mesh.name, +C[o].toFixed(1), +C[o + 2].toFixed(1), +d.toFixed(1), +g.toFixed(1)]);
      }
    }
  }
}

/** one leg: the camera from pts[0] to pts[end] at `speed`, rAF-timed; returns the frame times + pool costs */
async function leg(pts, speed, place, pops = null) {
  const L = pathLength(pts), dur = L / speed;
  const frames = [], cost0 = Object.fromEntries(Object.entries(S.cost).map(([k, a]) => [k, a.length]));
  const long0 = S.long.length, loaf0 = S.loaf.length;
  let hidden = document.visibilityState !== "visible";
  const onVis = () => { if (document.visibilityState !== "visible") hidden = true; };
  document.addEventListener("visibilitychange", onVis);
  const V = window.viewer;
  V.resetGpu?.();
  const t0 = performance.now();
  let last = t0;
  await new Promise((done) => {
    const step = (now) => {
      frames.push(now - last); last = now;
      if (pops) popCheck(V.camera.position, pops);
      const t = (now - t0) / 1000;
      place(pts, Math.min(L, t * speed), L);
      if (t >= dur) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  document.removeEventListener("visibilitychange", onVis);
  frames.shift();
  const s = [...frames].sort((a, b) => a - b), med = q(s, 0.5);
  const pools = {};
  for (const [k, a] of Object.entries(S.cost)) {
    const c = a.slice(cost0[k] ?? 0), cs = [...c].sort((x, y) => x - y), sum = c.reduce((x, y) => x + y, 0);
    pools[k] = { max: q(cs, 1), p99: q(cs, 0.99), msPerS: +(sum / dur).toFixed(2), over05: c.filter((x) => x > 0.5).length };
  }
  const longs = S.long.slice(long0).filter((x) => x[0] >= t0);
  const g = V.gpuStats?.() || {};
  return {
    gpu: { p50: g.p50 != null ? +(+g.p50).toFixed(2) : null, p95: g.p95 != null ? +(+g.p95).toFixed(2) : null, max: g.max != null ? +(+g.max).toFixed(2) : null },
    valid: !hidden && med < 40, seconds: +dur.toFixed(1), frames: s.length,
    ms: { p50: med, p95: q(s, 0.95), p99: q(s, 0.99), max: q(s, 1) },
    over33: s.filter((x) => x > 33).length, over25: s.filter((x) => x > 25).length,
    long: longs.length, longMs: Math.round(longs.reduce((x, y) => x + y[1], 0)),
    loaf: S.loaf.slice(loaf0).filter((x) => x[0] >= t0).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => [Math.round(x[0] - t0), Math.round(x[1]), x[2]]),
    pools,
  };
}

/** warm-up out and back, then `repeats` measured out-and-back runs; returns the report (per leg + the summary) */
export async function run({ path = "boulenger", repeats = 3, settle = 6, warmup = true, speed, pops = false } = {}) {
  const V = window.viewer;
  if (!V) throw new Error("the city is not loaded yet (window.viewer)");
  const p = typeof path === "string" ? PATHS[path] : path;
  if (!p) throw new Error(`unknown path ${path}; one of ${Object.keys(PATHS).join(", ")}`);
  const sp = speed ?? p.speed ?? 14;
  hookPools();
  V.setView("overview");
  const c = V.controls, cam = V.camera, upd = c.update, w = V.world;
  c.update = () => false;                          // our hand on the camera (no orbit clamps / damping)
  const ground = (x, z) => (w.walkY ? w.walkY(x, z) : w.surface(x, z)) + EYE;
  const place = (pts, d, L) => {
    const [x, z] = along(pts, d), [lx, lz] = along(pts, Math.min(L, d + 25)), [bx, bz] = along(pts, Math.max(0, d - 1));
    let hx = lx - x, hz = lz - z; if (Math.hypot(hx, hz) < 0.5) { hx = x - bx; hz = z - bz; }
    const hl = Math.hypot(hx, hz) || 1, y = ground(x, z);
    cam.position.set(x, y, z); c.target.set(x + hx / hl * 30, y - 1.5, z + hz / hl * 30); cam.lookAt(c.target);
  };
  const back = [...p.pts].reverse();
  const out = { path: typeof path === "string" ? path : "custom", speed: sp, url: location.search, at: new Date().toISOString(), size: [innerWidth, innerHeight, devicePixelRatio], legs: [] };
  try {
    const L = pathLength(p.pts);
    const t0 = performance.now();
    while (performance.now() - t0 < settle * 1000) { place(p.pts, 0, L); await sleep(100); }
    if (warmup) { await leg(p.pts, sp, place); await leg(back, sp, place); await sleep(1500); }
    for (let r = 0; r < repeats; r++) {
      out.legs.push({ r, dir: "out", ...(await leg(p.pts, sp, place)) });
      out.legs.push({ r, dir: "back", ...(await leg(back, sp, place)) });
    }
    // the pop check: its own out-and-back legs (the check costs frames; the camera is driven by the clock, so slow
    // frames make bigger steps: a stricter test)
    if (pops) { out.pops = {}; await leg(p.pts, sp, place, out.pops); await leg(back, sp, place, out.pops); }
  } finally { c.update = upd; }
  const legs = out.legs, sum = (f) => legs.reduce((a, l) => a + f(l), 0), arr = (f) => legs.map(f);
  out.summary = {
    valid: legs.every((l) => l.valid), legs: legs.length,
    over33: sum((l) => l.over33), over33PerLeg: arr((l) => l.over33),
    p50: arr((l) => l.ms.p50), p95: arr((l) => l.ms.p95), p99: arr((l) => l.ms.p99), max: arr((l) => l.ms.max),
    long: sum((l) => l.long), gpuP50: arr((l) => l.gpu.p50), gpuP95: arr((l) => l.gpu.p95),
    pools: Object.fromEntries(Object.keys(S.cost).map((k) => [k, {
      max: Math.max(...legs.map((l) => l.pools[k]?.max ?? 0)), msPerS: +(sum((l) => l.pools[k]?.msPerS ?? 0) / legs.length).toFixed(2), over05: sum((l) => l.pools[k]?.over05 ?? 0),
    }])),
  };
  out.streams = (globalThis.__streamers || []).map((x) => ({ name: x.name, ...x.stats, ms: +x.stats.ms.toFixed(1), maxSliceMs: +x.stats.maxSliceMs.toFixed(2) }));
  last = out;
  try { localStorage.setItem("driveStutter.last", JSON.stringify(out)); } catch (e) {}
  return out;
}

export let last = null;

/** the same run without holding the DevTools protocol: D.start(opts) returns at once, D.status() polls
 *  ({ busy, summary }) */
export function start(opts) {
  if (S.busy) return { busy: true };
  S.busy = true; S.error = null;
  run(opts).catch((e) => { S.error = String(e?.stack || e); }).finally(() => { S.busy = false; });
  return { started: true };
}
export function status() { return { busy: !!S.busy, error: S.error, url: last?.url, summary: last?.summary, pops: last?.pops, streams: last?.streams }; }
