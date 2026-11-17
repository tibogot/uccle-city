// FALCON STUTTER HARNESS (docs/perf/FALCON_STUTTER.md): a scripted, repeatable falcon flight over the city at game
// speed and height, with every frame's time AND what happened in that frame, so each long frame can be attributed.
//
// The flight: ?game=falcon running (after the play loader). The flight model's step is replaced for the run by a
// KINEMATIC one (debug/gamePerf.js does the same for the police car): the bird moves along a fixed smoothed route at a
// fixed height (m TAW) and a fixed speed (the route's length / seconds), so streaming, LOD, shadows, pigeons, the far
// ring and the camera see the same flight every run; the rest of the game (bird pose, chase camera, pigeons, HUD, sky
// flocks, hunt) runs as when playing. Default route: Place Saint-Job -> Parc de Wolvendael -> Chaussee d'Alsemberg
// (2.3 km, 60 s = ~38 m/s, a fast falcon), 165 m TAW (~65-95 m over the ground).
//
//   const F = await import("/debug/falconStutter.js");
//   const r = await F.run({ seconds: 60 })          one flight; r.summary, r.long (the frames > 33 ms, each with its events)
//   F.table(r)                                      the long frames as text rows (time, ms, cause, events)
//   const ab = await F.ab({ legs: 4 })              same-page A/B: out-and-back legs, a live switch alternated ABBA
//                                                   (default: A = the finer compile slices on, B = off: window.__fineCompile.on)
//   F.last()                                        the last report (also localStorage "falconStutter.last")
//
// Per frame (rAF interval): ms, the main loop's CPU (three's animation loop), render() CPU, the most expensive updater,
// tiles added / removed (full + far), console.log lines (the viewer's log: "+ tile", landmark / proxy / pigeon lines),
// pipelines created (sync / async), node builds (count, ms), render objects created / disposed, GPU calls (buffers
// created / destroyed + MB, writeBuffer MB, texture MB, bind groups, submits), JS heap drops (GC, MB), fades running,
// sun shadow cache full redraws, compile jobs left; long animation frames with their script attribution are
// matched to the frames afterwards. Rules: ONE tab in FRONT (rAF throttled = invalid), preflight GREEN or quote it.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const q = (s, f) => (s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : null);

export const ROUTES = {
  // Place Saint-Job -> Parc de Wolvendael -> Chaussee d'Alsemberg (viewer/places.js stjob, wolvendael-park, alsemberg)
  default: [[1153, 540], [-402, -91], [-909, -438]],
};

// ---------------------------------------------------------------- probes (installed once per page)
const C0 = () => ({ pipeSync: 0, pipeAsync: 0, shader: 0, nb: 0, nbMs: 0, roNew: 0, roDisp: 0, bufNew: 0, bufNewB: 0, bufDel: 0, bufDelB: 0, wb: 0, wbB: 0, texB: 0, tex: 0, bg: 0, submit: 0, img: 0 });
const P = (window.__fsProbe ||= { c: C0(), on: false, hooked: false, loaf: [], logs: [] });
function hook() {
  if (P.hooked) return;
  P.hooked = true;
  const c = () => P.c;
  const D = globalThis.GPUDevice?.prototype, Q = globalThis.GPUQueue?.prototype, B = globalThis.GPUBuffer?.prototype;
  const wrapP = (proto, k, f) => { if (!proto || typeof proto[k] !== "function") return; const o = proto[k]; proto[k] = function (...a) { if (P.on) f(a, this); return o.apply(this, a); }; };
  wrapP(D, "createRenderPipeline", () => c().pipeSync++);
  wrapP(D, "createRenderPipelineAsync", () => c().pipeAsync++);
  wrapP(D, "createShaderModule", () => c().shader++);
  wrapP(D, "createBuffer", ([d]) => { c().bufNew++; c().bufNewB += d?.size || 0; });
  wrapP(D, "createBindGroup", () => c().bg++);
  wrapP(D, "createTexture", () => c().tex++);
  wrapP(B, "destroy", (a, buf) => { c().bufDel++; c().bufDelB += buf?.size || 0; });
  wrapP(Q, "writeBuffer", ([, , data, dataOffset = 0, size]) => { const el = data?.BYTES_PER_ELEMENT || 1; c().wb++; c().wbB += size != null ? size * el : (data?.byteLength || 0) - dataOffset * el; });
  wrapP(Q, "writeTexture", ([, data, layout, size]) => { const h = size?.height ?? size?.[1] ?? 1, d = size?.depthOrArrayLayers ?? size?.[2] ?? 1, rows = layout?.rowsPerImage ?? h; c().texB += layout?.bytesPerRow ? layout.bytesPerRow * (d > 1 ? rows * (d - 1) + h : h) : data?.byteLength || 0; });   // (the bytes copied, not the source buffer: an atlas layer update passes the whole array)
  wrapP(Q, "copyExternalImageToTexture", () => c().img++);
  wrapP(Q, "submit", () => c().submit++);
  try {
    new PerformanceObserver((l) => {
      if (!P.on) return;
      for (const e of l.getEntries()) P.loaf.push({ t: e.startTime, dur: e.duration, block: e.blockingDuration || 0,
        scripts: (e.scripts || []).filter((s) => s.duration > 3).map((s) => ({ d: Math.round(s.duration), fn: s.sourceFunctionName || "", src: (s.sourceURL || "").split("/").slice(-2).join("/") + ":" + (s.sourceCharPosition ?? ""), inv: (s.invoker || "").slice(0, 50) })) });
    }).observe({ type: "long-animation-frame", buffered: false });
  } catch { /* no LoAF */ }
}
/** the renderer-side probes (node builds, render objects): installed per run, removed after */
function rendererProbes(R) {
  const undo = [];
  const dbg = R.debug, prev = dbg.onNodeBuilderCreated;
  dbg.onNodeBuilderCreated = (nb, ro) => {
    prev?.(nb, ro);
    if (!P.on) return;
    P.c.nb++;
    const own = ro?.object?.material, m = ro?.material;
    const who = `${(Array.isArray(own) ? "multi" : own?.name) || m?.name || m?.type || "?"}${own && m !== own && !Array.isArray(own) ? " [" + (m?.type || "override") + "]" : ""} @${(ro?.object?.name || ro?.object?.type || "?").slice(0, 30)}`;
    const note = (ms, kind) => { if (ms > 3) { const l = (P.c.nbList ||= []); if (l.length < 6) l.push(`${kind} ${ms.toFixed(0)}ms ${who}`); } };
    const b = nb.build, ba = nb.buildAsync;
    nb.build = function () { const t0 = performance.now(); try { return b.call(this); } finally { const d = performance.now() - t0; P.c.nbMs += d; note(d, "sync"); } };
    if (ba) nb.buildAsync = async function (y) { let t0 = performance.now(), tot = 0; const yy = y ? async () => { const d = performance.now() - t0; P.c.nbMs += d; tot += d; await y(); t0 = performance.now(); } : y; try { return await ba.call(this, yy); } finally { const d = performance.now() - t0; P.c.nbMs += d; note(tot + d, "async"); } };
  };
  undo.push(() => { dbg.onNodeBuilderCreated = prev; });
  const RO = R._objects;
  if (RO && typeof RO.createRenderObject === "function") {
    const own = Object.prototype.hasOwnProperty.call(RO, "createRenderObject"), f = RO.createRenderObject;
    RO.createRenderObject = function (...a) {
      const ro = f.apply(this, a);
      if (P.on) { P.c.roNew++; const d = ro.dispose; ro.dispose = function () { if (P.on) P.c.roDisp++; return d.apply(this, arguments); }; }
      return ro;
    };
    undo.push(() => { if (own) RO.createRenderObject = f; else delete RO.createRenderObject; });
  }
  return () => { for (const u of undo.reverse()) u(); };
}
/** per-frame cost of the loop, render(), each updater and the big calls (as debug/gamePerf.js instrument) */
function timers(V) {
  const t = { loop: 0, render: 0, top: null, topMs: 0, sys: new Map() }, undo = [];
  const add = (k, ms) => { if (ms > t.topMs) { t.topMs = ms; t.top = k; } const s = t.sys.get(k); if (s) { s.n++; s.ms += ms; if (ms > s.max) s.max = ms; } else t.sys.set(k, { n: 1, ms, max: ms }); };
  const name = (fn, i) => fn.__gpName || `${i}:${(fn.name || String(fn).replace(/\s+/g, " ").slice(0, 60))}`;
  const ups = V.updaters;
  for (let i = 0; i < ups.length; i++) {
    const f = ups[i]; if (f.__fsOrig) continue;
    const k = name(f, i);
    const w = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { add(k, performance.now() - t0); } };
    w.__fsOrig = f; ups[i] = w;
  }
  undo.push(() => { for (let i = 0; i < ups.length; i++) if (ups[i].__fsOrig) ups[i] = ups[i].__fsOrig; });
  const wrapM = (obj, m, k) => { if (!obj || typeof obj[m] !== "function") return; const f = obj[m]; obj[m] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { add(k, performance.now() - t0); } }; undo.push(() => { obj[m] = f; }); };
  wrapM(window.__flyer, "update", "flyer.update");
  wrapM(V.fader, "update", "fader.update");
  wrapM(V.lighting, "update", "lighting.update");
  wrapM(window.__map, "update", "minimap.update");
  const r = V.renderer, rr = r.render;
  r.render = function (...a) { const t0 = performance.now(); try { return rr.apply(this, a); } finally { t.render += performance.now() - t0; } };
  undo.push(() => { r.render = rr; });
  const anim = r._animation;
  if (anim && typeof anim._animationLoop === "function") {
    const f = anim._animationLoop;
    anim._animationLoop = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { t.loop += performance.now() - t0; } };
    undo.push(() => { anim._animationLoop = f; });
  }
  t.reset = () => { t.loop = 0; t.render = 0; t.top = null; t.topMs = 0; };
  t.undo = () => { for (const u of undo.reverse()) u(); };
  return t;
}

// ---------------------------------------------------------------- the route
/** Chaikin-smoothed polyline (ends kept) with cumulative length */
function smoothRoute(pts, iters = 5) {
  let p = pts.map(([x, z]) => [x, z]);
  for (let k = 0; k < iters; k++) {
    const o = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1];
      o.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    o.push(p[p.length - 1]); p = o;
  }
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  let j = 0;
  const at = (s) => {
    s = clamp(s, 0, cum[cum.length - 1]);
    if (s < cum[j]) j = 0;
    while (j < p.length - 2 && cum[j + 1] < s) j++;
    const L = cum[j + 1] - cum[j] || 1, t = (s - cum[j]) / L;
    return [p[j][0] + (p[j + 1][0] - p[j][0]) * t, p[j][1] + (p[j + 1][1] - p[j][1]) * t];
  };
  return { at, length: cum[cum.length - 1] };
}

/** the kinematic flight: the flight model's step replaced; returns { stop() } */
function kinematic(fl, route, { y, speed, reverse = false }) {
  const f = fl.game.f, step0 = f.step, L = route.length;
  let s = 0, prevH = null;
  const pose = (dt) => {
    const sp = reverse ? L - s : s, ahead = reverse ? L - (s + 40) : s + 40;
    const [x, z] = route.at(sp), [ax, az] = route.at(ahead);
    const h = Math.atan2(-(ax - x), -(az - z));
    const dh = prevH == null || dt <= 0 ? 0 : wrap(h - prevH) / dt; prevH = h;
    f.pos.x = x; f.pos.y = y; f.pos.z = z;
    const vx = -Math.sin(h) * speed, vz = -Math.cos(h) * speed;
    f.vel.x = vx; f.vel.y = 0; f.vel.z = vz; f.va.x = vx; f.va.y = 0; f.va.z = vz;
    f.V = speed; f.heading = h; f.gamma = 0; f.alpha = 0.06; f.n = 1; f.lift = 0; f.stall = 0; f.stun = 0;
    f.phi = clamp(Math.atan(speed * dh / 9.81), -0.9, 0.9); f.fold = 0.35; f.flapLevel = 0; f.brake = 0; f.brush = 0;
    f.stamina = 1; f.contact = null;
  };
  f.step = function (dt) { s = Math.min(L, s + speed * dt); pose(dt); };
  fl.start(...route.at(reverse ? L : 0), 0, y, speed, 0);
  pose(0);
  return { done: () => s >= L - 1, get s() { return s; }, stop: () => { f.step = step0; fl.game.start(f.pos.x, f.pos.y, f.pos.z, f.heading, speed, 0); } };
}

// ---------------------------------------------------------------- one flight
/** wait for the falcon game to be playable (the play loader gone, the flight ready) */
export async function ready({ maxMs = 180000 } = {}) {
  const t0 = performance.now();
  while (performance.now() - t0 < maxMs) {
    const fl = window.__flyer;
    if (globalThis.__playAt && fl?.game && window.viewer && !document.body.classList.contains("loading")) return Math.round(performance.now() - t0);
    await sleep(500);
  }
  throw new Error("falcon game not ready (start ?game=falcon)");
}

/** one scripted flight. route: a ROUTES key or [[x, z], ...]; y: m TAW; seconds: the flight's length (speed = route
 *  length / seconds unless `speed`); skip: seconds left out of the summary at the start (the teleport); label. */
export async function run({ route = "default", y = 165, seconds = 60, speed = null, reverse = false, skip = 1, label = "", settle = 1500 } = {}) {
  hook();
  await ready();
  const V = window.viewer, fl = window.__flyer, R = V.renderer;
  const rt = smoothRoute(Array.isArray(route) ? route : ROUTES[route]);
  const v = speed ?? rt.length / seconds;
  if (fl.intro) fl.intro = null;
  const K = kinematic(fl, rt, { y, speed: v, reverse });
  if (settle) await sleep(settle);                 // (the teleport's first frames, not measured)
  const T = timers(V), unprobe = rendererProbes(R);
  const log0 = console.log;
  const logs = [];
  console.log = function (...a) { if (P.on && typeof a[0] === "string") logs.push([performance.now(), a[0].slice(0, 160)]); return log0.apply(this, a); };
  let hidden = document.visibilityState !== "visible";
  const onVis = () => { if (document.visibilityState !== "visible") hidden = true; };
  document.addEventListener("visibilitychange", onVis);
  V.resetGpu?.();
  const tilesOf = () => V.world.tiles.map((t) => t.name);
  let tiles = new Set(tilesOf()), lites = new Set(V.lite.keys());
  let sunPrev = globalThis.__sunCache?.stats?.full ?? 0;
  const frames = [];
  P.loaf.length = 0; P.c = C0(); P.on = true;
  const t0 = performance.now();
  let last = t0, heap = performance.memory?.usedJSHeapSize ?? 0;
  T.reset();
  await new Promise((done) => {
    const tick = (now) => {
      const c = P.c; P.c = C0();
      const fr = { t: +((now - t0) / 1000).toFixed(3), ms: +(now - last).toFixed(1), cpu: +T.loop.toFixed(2), render: +T.render.toFixed(2), top: T.top, topMs: +T.topMs.toFixed(2), c, s: Math.round(K.s) };
      last = now; T.reset();
      const h = performance.memory?.usedJSHeapSize ?? 0;
      if (h < heap - 3e6) fr.gcMB = +((heap - h) / 1e6).toFixed(1);
      heap = h;
      const tn = tilesOf();
      if (tn.length !== tiles.size || tn.some((n) => !tiles.has(n))) { const nt = new Set(tn); fr.tiles = [...tn.filter((n) => !tiles.has(n)).map((n) => "+" + n), ...[...tiles].filter((n) => !nt.has(n)).map((n) => "-" + n)]; tiles = nt; }
      if (V.lite.size !== lites.size || [...V.lite.keys()].some((n) => !lites.has(n))) { const nl = new Set(V.lite.keys()); fr.lite = [...[...nl].filter((n) => !lites.has(n)).map((n) => "+" + n), ...[...lites].filter((n) => !nl.has(n)).map((n) => "-" + n)]; lites = nl; }
      fr.fades = V.fader?.list?.length ?? 0;
      const sc = globalThis.__sunCache?.stats; if (sc) { if (sc.full !== sunPrev) fr.sunFull = sc.full - sunPrev; sunPrev = sc.full; }
      fr.jobs = V.jobsLeft?.() ?? null;
      frames.push(fr);
      if (now - t0 >= seconds * 1000 && K.done()) return done();
      if (now - t0 >= seconds * 1000 + 15000) return done();       // (a stalled run: cut)
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  P.on = false;
  console.log = log0;
  document.removeEventListener("visibilitychange", onVis);
  T.undo(); unprobe(); K.stop();
  // attach the log lines and the long animation frames to the frames they fell in
  let k = 0;
  for (const fr of frames) {
    const end = t0 + fr.t * 1000, start = end - fr.ms;
    while (k < logs.length && logs[k][0] <= end) { if (logs[k][0] > start - 1) (fr.log ||= []).push(logs[k][1]); k++; }
  }
  for (const L of P.loaf) {
    const a = L.t, b = L.t + L.dur;
    for (const fr of frames) { const end = t0 + fr.t * 1000, start = end - fr.ms; if (end > a && start < b && fr.ms > 33) { (fr.loaf ||= []).push({ dur: Math.round(L.dur), block: Math.round(L.block), scripts: L.scripts.slice(0, 4) }); } }
  }
  const rep = report(frames, { label, seconds, skip, speed: +v.toFixed(1), length: Math.round(rt.length), y, reverse, valid: !hidden, sys: T.sys, gpu: V.gpuStats?.(),
    switches: { compileslice: window.__fineCompile?.on ?? null } });
  try { localStorage.setItem("falconStutter.last", JSON.stringify({ ...rep, frames: undefined })); } catch { /* full */ }
  return (window.__falconStutterLast = rep);
}
export const last = () => window.__falconStutterLast;

/** what a frame did, as short tags (most likely cause first) */
export function causes(fr, prev = null) {
  const c = fr.c, out = [];
  if (c.pipeSync) out.push(`sync pipeline x${c.pipeSync}`);
  if (c.nbMs > 6) out.push(`node builds ${c.nb} (${c.nbMs.toFixed(0)} ms)${c.nbList ? ": " + c.nbList.slice(0, 2).join("; ") : ""}`);
  if (c.roNew >= 40) out.push(`render objects +${c.roNew}`);
  if (c.roDisp >= 40 || c.bufDel >= 40) out.push(`disposes: ${c.roDisp} render objects, ${c.bufDel} buffers (${(c.bufDelB / 1e6).toFixed(1)} MB)`);
  if (fr.gcMB >= 8) out.push(`GC ${fr.gcMB} MB`);
  if (c.wbB > 4e6 || c.bufNewB > 8e6 || c.texB > 2e6) out.push(`uploads: write ${(c.wbB / 1e6).toFixed(1)} MB, new buffers ${(c.bufNewB / 1e6).toFixed(1)} MB, textures ${(c.texB / 1e6).toFixed(1)} MB`);
  if (fr.topMs > 12) out.push(`updater ${fr.top} ${fr.topMs.toFixed(0)} ms`);
  if (fr.tiles) out.push(`tiles ${fr.tiles.join(" ")}`);
  if (fr.lite) out.push(`far tiles ${fr.lite.join(" ")}`);
  for (const L of fr.loaf || []) for (const s of L.scripts) if (s.d > 15) out.push(`script ${s.d} ms ${s.fn || s.inv} ${s.src}`);
  if (fr.log) out.push(...fr.log.slice(0, 3).map((l) => `log: ${l.slice(0, 90)}`));
  if (!out.length && fr.cpu > 25) out.push(`main loop CPU ${fr.cpu.toFixed(0)} ms`);
  if (!out.length && prev) { const p = causes(prev); if (p.length && !/GPU \/ compositor/.test(p[0])) out.push(`(previous frame: ${p[0]})`); }
  if (!out.length) out.push(`no script (GPU / compositor): cpu ${fr.cpu.toFixed(0)} ms`);
  return out;
}

function report(frames, meta) {
  const use = frames.filter((f) => f.t >= meta.skip);
  const ms = use.map((f) => f.ms).sort((a, b) => a - b), cpu = use.map((f) => f.cpu).sort((a, b) => a - b);
  const sum = (k) => use.reduce((a, f) => a + (f.c[k] || 0), 0);
  const long = [];
  for (let i = 0; i < frames.length; i++) { const f = frames[i]; if (f.t >= meta.skip && f.ms > 33.4) long.push({ ...f, why: causes(f, frames[i - 1]) }); }
  const sys = [...meta.sys.entries()].map(([k, s]) => ({ sys: k, avg: +(s.ms / Math.max(1, use.length)).toFixed(3), max: +s.max.toFixed(2) })).sort((a, b) => b.max - a.max).slice(0, 12);
  const tally = {};
  for (const f of long) { const k = f.why[0].replace(/[\d.]+/g, "#").slice(0, 40); tally[k] = (tally[k] || 0) + 1; }
  return {
    label: meta.label, valid: meta.valid, seconds: meta.seconds, speed: meta.speed, length: meta.length, y: meta.y, reverse: meta.reverse, switches: meta.switches,
    summary: { frames: use.length, p50: q(ms, 0.5), p95: q(ms, 0.95), p99: q(ms, 0.99), max: q(ms, 1), over20: ms.filter((x) => x > 20).length, over25: ms.filter((x) => x > 25).length, over33: ms.filter((x) => x > 33.4).length, over50: ms.filter((x) => x > 50).length, over100: ms.filter((x) => x > 100).length,
      cpuP50: q(cpu, 0.5), cpuP99: q(cpu, 0.99), cpuMax: q(cpu, 1), gpu: meta.gpu, heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6), gc: use.filter((f) => f.gcMB).length, sunFull: use.reduce((a, f) => a + (f.sunFull || 0), 0) },
    totals: { pipeSync: sum("pipeSync"), pipeAsync: sum("pipeAsync"), nodeBuilds: sum("nb"), nodeMs: Math.round(sum("nbMs")), roNew: sum("roNew"), roDisp: sum("roDisp"), bufNewMB: +(sum("bufNewB") / 1e6).toFixed(1), bufDelMB: +(sum("bufDelB") / 1e6).toFixed(1), writeMB: +(sum("wbB") / 1e6).toFixed(1), texMB: +(sum("texB") / 1e6).toFixed(1), bindGroups: sum("bg"),
      tileEvents: frames.filter((f) => f.tiles).length, farEvents: frames.filter((f) => f.lite).length },
    causes: tally, systems: sys,
    long: long.slice(0, 80).map((f) => ({ t: f.t, ms: f.ms, cpu: f.cpu, render: f.render, s: f.s, why: f.why, c: f.c, top: f.top, topMs: f.topMs, gcMB: f.gcMB, tiles: f.tiles, lite: f.lite, log: f.log, fades: f.fades, jobs: f.jobs, loaf: f.loaf })),
    frames,
  };
}

/** the long frames as text rows */
export function table(r = last(), n = 40) {
  return r.long.slice(0, n).map((f) => `${f.t.toFixed(1).padStart(5)} s  ${String(Math.round(f.ms)).padStart(4)} ms  cpu ${String(Math.round(f.cpu)).padStart(3)}  ro+${f.c.roNew} nb ${f.c.nb}/${Math.round(f.c.nbMs)}ms bufs +${f.c.bufNew}/-${f.c.bufDel} fades ${f.fades} jobs ${f.jobs}  ${f.why.join(" | ")}`).join("\n");
}
/** a compact line of a report */
export function brief(r = last()) {
  const s = r.summary;
  return { label: r.label, valid: r.valid, rev: r.reverse, sw: r.switches, p50: s.p50, p99: s.p99, max: s.max, o20: s.over20, o33: s.over33, o50: s.over50, o100: s.over100, cpu50: s.cpuP50, cpu99: s.cpuP99, gpu: s.gpu?.p50, sun: s.sunFull, ro: r.totals.roNew, nb: r.totals.nodeBuilds, sync: r.totals.pipeSync, causes: r.causes };
}

/** same-page A/B: `legs` flights out and back (leg i reverses when i is odd), the variants alternated A B B A A B ...;
 *  A = `a` live switches, B = `b`. Returns { legs: [brief], A, B } (A / B = the legs' summaries merged). */
// (live switches: compileslice = window.__fineCompile.on (viewer/asyncPipes.js fineCompile))
const LIVE = { compileslice: (v) => { if (window.__fineCompile) window.__fineCompile.on = v; } };
export async function ab({ legs = 4, seconds = 60, a = { compileslice: true }, b = { compileslice: false }, ...o } = {}) {
  const set = (v) => { for (const [k, on] of Object.entries(v)) LIVE[k]?.(!!on); };
  const pattern = (i) => (["A", "B", "B", "A"][i % 4]);
  const out = [], full = { A: [], B: [] };
  const was = { compileslice: window.__fineCompile?.on ?? true };
  try {
    for (let i = 0; i < legs; i++) {
      const v = pattern(i);
      set(v === "A" ? a : b);
      await sleep(3000);                             // (what the previous leg left fading / disposing settles)
      const r = await run({ ...o, seconds, reverse: i % 2 === 1, label: `${v} leg ${i + 1}` });
      out.push(brief(r)); full[v].push(r);
    }
  } finally { set(was); }
  const merge = (rs) => { const ms = rs.flatMap((r) => r.frames.filter((f) => f.t >= 1).map((f) => f.ms)).sort((x, y) => x - y);
    return { legs: rs.length, frames: ms.length, p50: q(ms, 0.5), p99: q(ms, 0.99), max: q(ms, 1), over20: ms.filter((x) => x > 20).length, over33: ms.filter((x) => x > 33.4).length, over50: ms.filter((x) => x > 50).length, over100: ms.filter((x) => x > 100).length }; };
  const res = { legs: out, A: merge(full.A), B: merge(full.B) };
  window.__falconStutterAB = { ...res, full };
  return res;
}
