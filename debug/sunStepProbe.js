// SUN SHADOW STEP PROBE (claude/sunstep, rule docs/rules/sun-shadow-step.md, browser row `sunshadowstep`).
// Hold C:/Users/tibog/Downloads/uccle-jobs/browser.lock; measure timings only on a GREEN / YELLOW preflight, page in front.
//   const P = await import("/debug/sunStepProbe.js");
//   await P.run({ speed: 60, seconds: 20 })
//       the sun moved like the dev panel's "sun speed (x real)" (lighting.hourOverride each frame); over `seconds`:
//       the sun cache's full redraws / frames and their causes (window.__sunCache.stats), the CPU ms of the sun shadow
//       pass (renderShadow) on full-redraw and lay-back frames, the frame's GPU ms (viewer.gpuStats, trimmed mean);
//       the hour is put back after. speed 0 = the fixed-sun reference.
//   await P.strip({ speed: 60, frames: 180, rect: [x, y, w, h] })
//       the loop paused and stepped at 1/60 s, the sun moved per step; per frame the share of pixels of `rect` (canvas
//       px; default the lower middle) that changed by > 20 (of 255) from the frame before, and the frames the cache was
//       redrawn; a sheet of 6 crops (data URL). Compare speed 0 (the TAA noise floor) with speed 60, and ?sunstep=old.
//   P.render({ scale: 0.75 }): the render scale pinned (dynres off) like debug/xmasPerf.js; returns the restore function
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function pinScale(s = 0.75) {
  const U = window.__pipe?.upscale;
  if (!U?.setScale) return () => {};
  const was = { s: U.scale, dyn: U.dynres };
  U.setScale(s, { dynres: false });
  return () => U.setScale(was.s, { dynres: was.dyn });
}
const p = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(3); };
const mean = (a) => (a.length ? +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(3) : null);

export async function run({ speed = 60, seconds = 20, warm = 2, restore = true } = {}) {
  const V = window.viewer, Lg = V.lighting, sn = Lg.shadowNode, L = await import("/viewer/lighting.js");
  if (!sn?.cache) return { error: "no sun shadow cache (?sunshadowcache=old or the cascaded sun)" };
  const h0 = Lg.hourOverride, hour0 = Lg.hour;
  const orig = sn.renderShadow, full = [], back = [];
  sn.renderShadow = function (f) {
    const n = L.sunCache.stats.full, t = performance.now();
    const r = orig.call(this, f);
    (L.sunCache.stats.full !== n ? full : back).push(performance.now() - t);
    return r;
  };
  let on = true, last = 0, raf = 0;
  const tick = (now) => {
    if (!on) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; raf++;
    if (speed) Lg.hourOverride = (Lg.hour + speed * dt / 3600) % 24;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    await sleep(warm * 1000);
    const s0 = { ...L.sunCache.stats }, r0 = raf, t0 = performance.now();
    full.length = 0; back.length = 0; V.resetGpu?.();
    await sleep(seconds * 1000);
    const s1 = { ...L.sunCache.stats }, el = (performance.now() - t0) / 1000, g = V.gpuStats?.() ?? {};
    const d = {}; for (const k of Object.keys(s1)) d[k] = (s1[k] || 0) - (s0[k] || 0);
    const why = Object.fromEntries(["dirty", "key", "sun", "step", "shift", "fade", "refresh"].filter((k) => d[k]).map((k) => [k, d[k]]));
    const all = [...full, ...back];
    return {
      speed, seconds: +el.toFixed(1), rafFps: +(( raf - r0) / el).toFixed(1), sunStep: L.SUN_STEP, sunFar: L.SUN_FAR,
      frames: d.frames, full: d.full, share: +(d.full / Math.max(1, d.frames)).toFixed(3), why, steps: d.sun ?? 0,
      shadowCpu: { p50: p(all, 0.5), mean: mean(all), fullP50: p(full, 0.5), fullMean: mean(full), backP50: p(back, 0.5) },
      gpu: { tmean: g.tmean ?? g.avg ?? null, p50: g.p50 ?? null },
      far: Lg.sun.shadow.camera.far, box: Lg.sun.shadow.camera.right, bias: +Lg.sun.shadow.bias.toExponential(3),
      elev: +(Math.asin(Lg.sunDir.y) * 180 / Math.PI).toFixed(2),
      verdict: `${speed}x: full redraws ${d.full} / ${d.frames} frames = ${(100 * d.full / Math.max(1, d.frames)).toFixed(1)} % (${JSON.stringify(why)}); shadow pass CPU p50 ${p(all, 0.5)} ms`,
    };
  } finally {
    on = false; sn.renderShadow = orig;
    if (restore) { Lg.hourOverride = h0; if (h0 == null && Lg.hour !== hour0) Lg.hourOverride = null; }
  }
}

/** per-frame change of a canvas rect while the loop is stepped (see the header) */
export async function strip({ speed = 60, frames = 180, rect = null, every = 30, settle = 30, hour = null } = {}) {
  const V = window.viewer, Lg = V.lighting, L = await import("/viewer/lighting.js"), cv = V.renderer.domElement;
  const [x, y, w, h] = rect ?? [Math.round(cv.width * 0.2), Math.round(cv.height * 0.55), Math.round(cv.width * 0.6), Math.round(cv.height * 0.4)];
  const h0 = Lg.hourOverride;
  if (hour != null) Lg.hourOverride = hour;
  V.pause(true);
  const c2 = new OffscreenCanvas(w, h), g = c2.getContext("2d", { willReadFrequently: true });
  const cols = Math.ceil(frames / every), cw = 320, ch = Math.round(cw * h / w);
  const sheet = new OffscreenCanvas(cols * (cw + 4), ch + 24), sg = sheet.getContext("2d");
  sg.fillStyle = "#16181c"; sg.fillRect(0, 0, sheet.width, sheet.height);
  let prev = null; const diff = [], redraw = [];
  try {
    for (let i = 0; i < settle; i++) { V.step(1 / 60); await sleep(0); }
    for (let f = 0; f < frames; f++) {
      if (speed) Lg.hourOverride = (Lg.hour + speed / 60 / 3600) % 24;
      const n = L.sunCache.stats.full;
      V.step(1 / 60);
      if (L.sunCache.stats.full !== n) redraw.push(f);
      g.drawImage(cv, x, y, w, h, 0, 0, w, h);
      const px = g.getImageData(0, 0, w, h).data;
      if (prev) { let c = 0; for (let k = 0; k < px.length; k += 4) if (Math.abs(px[k] - prev[k]) > 20 || Math.abs(px[k + 1] - prev[k + 1]) > 20 || Math.abs(px[k + 2] - prev[k + 2]) > 20) c++; diff.push(c / (w * h)); }
      prev = px;
      if (f % every === 0) { const k = f / every; sg.drawImage(c2, 0, 0, w, h, k * (cw + 4), 0, cw, ch); sg.fillStyle = "#ddd"; sg.font = "12px monospace"; sg.fillText(`f${f} ${speed}x${L.SUN_STEP ? "" : " old"}`, k * (cw + 4) + 4, ch + 16); }
      if (f % 4 === 0) await sleep(0);
    }
  } finally { V.pause(false); Lg.hourOverride = h0; }
  const b = await sheet.convertToBlob({ type: "image/png" });
  const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  const pct = diff.map((v) => +(100 * v).toFixed(3));
  return { speed, frames, rect: [x, y, w, h], redraws: redraw.length, redrawFrames: redraw.slice(0, 40), diffP50: p(pct, 0.5), diffP95: p(pct, 0.95), diffMax: Math.max(...pct),
    atRedraw: mean(redraw.filter((f) => f > 0).map((f) => pct[f - 1])), between: mean(pct.filter((_, i) => !redraw.includes(i + 1))), sheet: url };
}
