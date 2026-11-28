// CHRISTMAS PERF PROBE (plan job 3, docs/CHRISTMAS.md "Boot with the layer on" + 7.3 "The layer's GPU cost", browser
// row `xmasperf`): the GPU cost of the Christmas layer, live A/B in ONE page (off / on interleaved, so both halves see the
// same background load). Measure ONLY on GREEN / YELLOW (tools/perf/preflight.ps1 + debug/preflight.js), one Chrome tab.
// Open the city at night with the layer forced on, at Place Saint-Job:
//   /viewer/index.html?quick=1&place=stjob-street&xmas=1&time=night      (wait for window.__quickReady and window.xmas)
//   const X = await import("/debug/xmasPerf.js"); await X.run()           -> { rows: [...], pass, verdict }
//   await X.run({ split: true })   + the fir at 8 m split into its parts (cards, shadow copies, the rest)
// Rows (budgets: plan section 3, docs/CHRISTMAS.md section 6):
//   layer-street   the whole layer at street level (eye height, 31 m east of the fir, the market and the
//                  square's garland in view):                                                   < 0.30 ms
//   fir-8m         the fir alone, 8 m from its trunk at eye height, filling the screen:           < 0.10 ms
//   extra-<name>   each extra the layer registers in window.xmas.extras ({ name: (on) => ... }: poles, window
//                  lights: claude/xmas4), at the layer-street spot:                             < 0.05 ms each
// A part is switched off by its meshes' camera layers (mask 0: no colour, no shadow pass draws it; the field's own
// visible / count bookkeeping is left alone), back on by the saved masks. The camera is put back where it was.
// (claude/xmas3) Two causes of noise in the first numbers (claude/xmas2: +-0.3 ms), fixed here:
//   - the render scale was AUTOMATIC (upscale.js dynres): it steps when frames miss, and a step moves the whole frame's
//     GPU time by more than the budgets; it is pinned at its current value for the run (dynres restored after);
//   - one round's p50 of a 2.5 s window, 6 rounds; now 10 rounds, the order flipped every round, and each half's value
//     is the TRIMMED MEAN of its frames (viewer gpuStats().tmean: the 10-90 % band; the shadow-cache redraw frames,
//     ~1 in 30, drop out), the p50 difference reported beside it, and the standard error of the difference (se).
// Nothing here changes the city when not called.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const BUDGET = { layer: 0.3, fir8m: 0.1, extra: 0.05 };

/** a switch for every mesh under `root` that `pick` accepts: off = camera layers mask 0, on = the saved mask */
export function layerSwitch(root, pick = () => true) {
  const list = [];
  root.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && pick(o)) list.push([o, o.layers.mask]); });
  return { n: list.length, set: (on) => { for (const [o, m] of list) o.layers.mask = on ? m : 0; } };
}

/** the orbit camera at (x, h over the ground, z) looking at (tx, th, tz) */
export function view(at, look) {
  const { camera, controls, world } = window.viewer;
  const g = (x, z) => world.ground?.(x, z) ?? world.surface(x, z);
  camera.position.set(at[0], g(at[0], at[2]) + at[1], at[2]);
  controls.target.set(look[0], g(look[0], look[2]) + look[1], look[2]);
  controls.update?.();
}

/** alternate a() / b() `rounds` times (the order flipped every round); per half the trimmed mean of its frames */
export async function alternate(a, b, { rounds = 10, settle = 1.2, seconds = 2.5 } = {}) {
  const V = window.viewer, A = [], B = [], A50 = [], B50 = [];
  for (let i = 0; i < rounds; i++) {
    const order = i % 2 ? [[b, B, B50], [a, A, A50]] : [[a, A, A50], [b, B, B50]];
    for (const [f, out, out50] of order) {
      f(); await sleep(settle * 1000);
      V.resetGpu(); await sleep(seconds * 1000);
      const s = V.gpuStats();
      out.push(s.tmean ?? s.avg); out50.push(s.p50);
    }
  }
  b();
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  const d = B.map((v, i) => v - A[i]), d50 = B50.map((v, i) => v - A50[i]), md = mean(d);
  const se = Math.sqrt(mean(d.map((v) => (v - md) ** 2)) / Math.max(1, d.length - 1));
  return { A, B, meanA: +mean(A).toFixed(3), meanB: +mean(B).toFixed(3), diff: +md.toFixed(3), se: +se.toFixed(3),
    diffMin: +Math.min(...d).toFixed(2), diffMax: +Math.max(...d).toFixed(2), diffP50: +mean(d50).toFixed(3) };
}

/** pin the render scale for the run (dynres off; 0.75: the scale of the first runs on GREEN, the same pixels every run);
 *  returns the restore function */
export const PIN_SCALE = 0.75;
export function pinScale(s = PIN_SCALE) {
  const U = window.__pipe?.upscale;
  if (!U?.setScale) return () => {};
  const was = { s: U.scale, dyn: U.dynres };
  U.setScale(s, { dynres: false });
  return () => U.setScale(was.s, { dynres: was.dyn });
}

/** (claude/xmas3) old vs new of a cut that swaps materials live (window.xmas.setLight: xmasKit.js XMAS_LIGHT):
 *  A = `old` ({ cards: false }: the path as before), B = the URL's; rows at the street spot and the fir at 8 m;
 *  costMs = new - old (negative: the saving) */
export async function lightAB({ old = { cards: false }, rounds = 10, settle = 1.2, seconds = 2.5, spots = ["layer-street", "fir-8m"] } = {}) {
  for (let i = 0; i < 120 && !(window.viewer && window.xmas); i++) await sleep(500);
  const X = window.xmas, { camera, controls } = window.viewer;
  if (!X?.setLight) return { verdict: "window.xmas.setLight missing" };
  const back = { p: camera.position.clone(), t: controls.target.clone() };
  const unpin = pinScale(), rows = [];
  const fir = X.site.trees.find((t) => t.id === "stjob"), fx = fir.x, fz = fir.z;
  const at = { "layer-street": [[fx + 31, 1.7, fz + 11], [fx, 5, fz + 2]], "fir-8m": [[fx + 8, 1.7, fz], [fx, 4, fz]] };
  try {
    // (both material sets compiled before the timing: one frame each, then a settle)
    X.setLight(old); await sleep(1500); X.setLight(null); await sleep(1500);
    for (const name of spots) {
      view(...at[name]); await sleep(1500);
      const r = await alternate(() => X.setLight(old), () => X.setLight(null), { rounds, settle, seconds });
      rows.push({ name, oldMs: r.meanA, newMs: r.meanB, costMs: r.diff, se: r.se, p50Ms: r.diffP50, min: r.diffMin, max: r.diffMax });
    }
  } finally {
    X.setLight(null); unpin();
    camera.position.copy(back.p); controls.target.copy(back.t); controls.update?.();
  }
  return { old, rows, verdict: rows.map((r) => `${r.name} new - old ${r.costMs} +- ${r.se} ms`).join(", ") };
}

/** (claude/xmasperf4, rule xmas-pass-budget) THE LAYER'S PASSES, COUNTED: structure, not timing (the same on a hot or a
 *  cool GPU). At each probe spot, for `seconds`, every renderer.renderObject call of a layer mesh is counted by the pass
 *  its camera belongs to (main = the colour pass + the cards' depth twin; sun = the sun / moon map; lamp = the two
 *  shadowed lamps' maps; other = anything else), per frame: draws, triangles (index / 3 x instances), materials, meshes.
 *  Steady state (camera still, the night warm-up done): the sun map redraws ~1 frame in 30 (its cache), the lamp maps
 *  never (their cache; the move refresh right after the camera jumps falls in the settle). 2026-11-28 foundation:
 *  street main 82 draws / 607 k triangles, sun 0.46, lamp 0; fir-8m main 65 / 619 k, sun 0.2, lamp 0 (24 Nov code:
 *  74 / 513 k and 60 / 537 k). Ceilings XMAS_PASS_BUDGET; the node row `xmasload` guards the content behind them. */
export const XMAS_PASS_BUDGET = {
  "layer-street": { main: { draws: 86, trisK: 640 }, sun: { draws: 1 }, lamp: { draws: 0.1 }, other: { draws: 0 } },
  "fir-8m": { main: { draws: 68, trisK: 650 }, sun: { draws: 1 }, lamp: { draws: 0.1 }, other: { draws: 0 } },
};
export async function passes({ seconds = 3, settle = 2.5 } = {}) {
  for (let i = 0; i < 120 && !(window.viewer && window.xmas); i++) await sleep(500);
  for (let i = 0; i < 60 && (window.__night?.nightWarm?.().pending ?? 0) > 0; i++) await sleep(500);
  const V = window.viewer, R = V.renderer, X = window.xmas, N = window.__night, sun = V.lighting?.sun ?? null;
  const mine = new Set();
  X.group.traverse((o) => { if (o.isMesh || o.isInstancedMesh) mine.add(o); });
  const kind = (cam) => (cam === V.camera ? "main" : sun && cam === sun.shadow?.camera ? "sun" : N?.shadowLights?.some((L) => L.shadow?.camera === cam) ? "lamp" : "other");
  const fir = X.site.trees.find((t) => t.id === "stjob"), fx = fir.x, fz = fir.z;
  const spots = { "layer-street": [[fx + 31, 1.7, fz + 11], [fx, 5, fz + 2]], "fir-8m": [[fx + 8, 1.7, fz], [fx, 4, fz]] };
  const { camera, controls } = V, back = { p: camera.position.clone(), t: controls.target.clone() };
  const unpin = pinScale(), orig = R.renderObject, out = {}, fails = [];
  try {
    for (const [name, at] of Object.entries(spots)) {
      view(...at); await sleep(settle * 1000);
      const acc = {}; let frames = 0, live = true;
      R.renderObject = function (object, scene, cam, geometry, material, ...rest) {
        if (mine.has(object)) {
          const a = (acc[kind(cam)] ??= { draws: 0, tris: 0, mats: new Set(), meshes: new Set() });
          const g = geometry ?? object.geometry, n = g.index ? g.index.count : g.attributes.position.count;
          a.draws++; a.tris += (n / 3) * (object.isInstancedMesh ? object.count : 1); a.mats.add(material ?? object.material); a.meshes.add(object);
        }
        return orig.call(this, object, scene, cam, geometry, material, ...rest);
      };
      const tick = () => { if (live) { frames++; requestAnimationFrame(tick); } };
      requestAnimationFrame(tick);
      await sleep(seconds * 1000);
      live = false; R.renderObject = orig;
      const row = { frames };
      for (const k of ["main", "sun", "lamp", "other"]) {
        const a = acc[k];
        row[k] = a ? { draws: +(a.draws / frames).toFixed(2), trisK: +(a.tris / frames / 1000).toFixed(1), materials: a.mats.size, meshes: a.meshes.size } : { draws: 0, trisK: 0, materials: 0, meshes: 0 };
        const b = XMAS_PASS_BUDGET[name][k];
        if (b?.draws != null && row[k].draws > b.draws) fails.push(`${name} ${k} ${row[k].draws} draws / frame > ${b.draws}`);
        if (b?.trisK != null && row[k].trisK > b.trisK) fails.push(`${name} ${k} ${row[k].trisK} k triangles / frame > ${b.trisK} k`);
      }
      out[name] = row;
    }
  } finally {
    R.renderObject = orig; unpin();
    camera.position.copy(back.p); controls.target.copy(back.t); controls.update?.();
  }
  return { spots: out, pass: !fails.length, verdict: fails.length ? `FAIL: ${fails.join("; ")}`
    : `PASS: ${Object.entries(out).map(([n, r]) => `${n} main ${r.main.draws} draws ${r.main.trisK} k tris, sun ${r.sun.draws}, lamp ${r.lamp.draws}, other ${r.other.draws}`).join("; ")}` };
}

// (claude/xmasperf4, rule timing-gpu-state) the ms budgets below hold on a COOL / WARM GPU only (tools/perf/gpuWatch.mjs
// around the run). On 2026-11-28 the laptop ran HOT (median 82 C, ~50 % of the busy seconds power / thermal capped) and
// the 24 Nov code itself read layer-street 0.19-0.43 ms, fir-8m 0.11-0.37 ms (its 24 Nov numbers: 0.121 / 0.086): run()
// on a HOT GPU is an upper bound, and a regression is shown only by old and new code timed alternately in one session.
// Each row also gives its share of the frame (costPct = cost / the frame without it), steadier across clocks than ms.
export async function run({ rounds = 10, settle = 1.2, seconds = 2.5, split = false, only = null } = {}) {
  for (let i = 0; i < 120 && !(window.viewer && window.xmas); i++) await sleep(500);
  if (!window.xmas) return { pass: false, verdict: "window.xmas missing: open the page with ?xmas=1 (and wait for the layer)" };
  const { camera, controls } = window.viewer;
  const back = { p: camera.position.clone(), t: controls.target.clone() };
  const unpin = pinScale();
  const X = window.xmas, rows = [];
  const fir = X.site.trees.find((t) => t.id === "stjob");
  const fx = fir.x, fz = fir.z;
  const measure = async (name, budget, sw, at, look) => {
    if (only && !only.includes(name)) return;
    view(at, look); await sleep(1500);
    const r = await alternate(() => sw.set(false), () => sw.set(true), { rounds, settle, seconds });
    sw.set(true);
    rows.push({ name, meshes: sw.n, budget, offMs: r.meanA, onMs: r.meanB, costMs: r.diff, costPct: +((100 * r.diff) / r.meanA).toFixed(2), se: r.se, p50Ms: r.diffP50, min: r.diffMin, max: r.diffMax, pass: budget == null ? null : r.diff < budget });
  };
  const scale = window.__pipe?.upscale?.scale ?? 1;          // (the pinned scale)
  try {
    const street = [[fx + 31, 1.7, fz + 11], [fx, 5, fz + 2]];
    const near = [[fx + 8, 1.7, fz], [fx, 4, fz]];
    const tree = (o) => /^xmas tree /.test(o.name);
    // (claude/xmas4) the whole layer = its group + every extra not in the group (the December windows: a uniform)
    const grp = layerSwitch(X.group), whole = { n: grp.n, set: (on) => { grp.set(on); X.extras?.windows?.(on); } };
    await measure("layer-street", BUDGET.layer, whole, ...street);
    await measure("fir-8m", BUDGET.fir8m, layerSwitch(X.group, tree), ...near);
    if (split) {
      await measure("fir-8m cards", null, layerSwitch(X.group, (o) => tree(o) && o.userData.slot === "fir_cards" && !o.userData.shadowOnly), ...near);
      await measure("fir-8m shadow copies", null, layerSwitch(X.group, (o) => tree(o) && o.userData.shadowOnly), ...near);
      await measure("fir-8m rest", null, layerSwitch(X.group, (o) => tree(o) && o.userData.slot !== "fir_cards" && !o.userData.shadowOnly), ...near);
    }
    for (const [name, fn] of Object.entries(X.extras ?? {})) await measure(`extra-${name}`, BUDGET.extra, { n: 1, set: fn }, ...street);
  } finally {
    unpin();
    camera.position.copy(back.p); controls.target.copy(back.t); controls.update?.();
  }
  const judged = rows.filter((r) => r.pass != null), pass = judged.every((r) => r.pass);
  return { rows, pass, scale, extras: Object.keys(X.extras ?? {}), verdict: `${pass ? "PASS" : "FAIL"}: ${judged.map((r) => `${r.name} ${r.costMs} +- ${r.se} ms (< ${r.budget}; ${r.costPct} % of the frame)`).join(", ")} at render scale ${scale}${Object.keys(X.extras ?? {}).length ? "" : " (no extras registered yet)"}` };
}
