// CHRISTMAS PERF PROBE (plan job 3, docs/CHRISTMAS.md "Boot with the layer on", browser row `xmasperf`): the GPU cost
// of the Christmas layer, live A/B in ONE page (debug/gpuAB.js alternate: off / on interleaved, so both halves see the
// same background load). Measure ONLY on GREEN (tools/perf/preflight.ps1 + debug/preflight.js), one Chrome tab.
// Open the city at night with the layer forced on, at Place Saint-Job:
//   /viewer/index.html?quick=1&place=stjob-street&xmas=1&time=night      (wait for window.__quickReady and window.xmas)
//   const X = await import("/debug/xmasPerf.js"); await X.run()           -> { rows: [...], pass, verdict }
// Rows (budgets: plan section 3, docs/CHRISTMAS.md section 6):
//   layer-street   the whole layer at street level (eye height, 30 m east of the fir, the market and the
//                  square's garland in view):                                                   < 0.30 ms
//   fir-8m         the fir alone, 8 m from its trunk at eye height, filling the screen:           < 0.10 ms
//   extra-<name>   each extra the layer registers in window.xmas.extras ({ name: (on) => ... }: poles, window
//                  lights; none yet), at the layer-street spot:                                 < 0.05 ms each
// A part is switched off by its meshes' camera layers (mask 0: no colour, no shadow pass draws it; the field's own
// visible / count bookkeeping is left alone), back on by the saved masks. The camera is put back where it was.
// Nothing here changes the city when not called.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const BUDGET = { layer: 0.3, fir8m: 0.1, extra: 0.05 };

/** a switch for every mesh under `root` that `pick` accepts: off = camera layers mask 0, on = the saved mask */
function layerSwitch(root, pick = () => true) {
  const list = [];
  root.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && pick(o)) list.push([o, o.layers.mask]); });
  return { n: list.length, set: (on) => { for (const [o, m] of list) o.layers.mask = on ? m : 0; } };
}

/** the orbit camera at (x, h over the ground, z) looking at (tx, th, tz) */
function view(at, look) {
  const { camera, controls, world } = window.viewer;
  const g = (x, z) => world.ground?.(x, z) ?? world.surface(x, z);
  camera.position.set(at[0], g(at[0], at[2]) + at[1], at[2]);
  controls.target.set(look[0], g(look[0], look[2]) + look[1], look[2]);
  controls.update?.();
}

export async function run({ rounds = 6, settle = 1.2, seconds = 2.5 } = {}) {
  for (let i = 0; i < 120 && !(window.viewer && window.xmas); i++) await sleep(500);
  if (!window.xmas) return { pass: false, verdict: "window.xmas missing: open the page with ?xmas=1 (and wait for the layer)" };
  const { alternate } = await import("/debug/gpuAB.js");
  const { camera, controls } = window.viewer;
  const back = { p: camera.position.clone(), t: controls.target.clone() };
  const X = window.xmas, rows = [];
  const fir = X.site.trees.find((t) => t.id === "stjob");
  const fx = fir.x, fz = fir.z;
  const measure = async (name, budget, sw, at, look) => {
    view(at, look); await sleep(1500);
    const r = await alternate(() => sw.set(false), () => sw.set(true), { rounds, settle, seconds });
    sw.set(true);
    rows.push({ name, meshes: sw.n, budget, offMs: r.meanA, onMs: r.meanB, costMs: r.diff, min: r.diffMin, max: r.diffMax, pass: r.diff < budget });
  };
  const street = [[fx + 31, 1.7, fz + 11], [fx, 5, fz + 2]];
  await measure("layer-street", BUDGET.layer, layerSwitch(X.group), ...street);
  await measure("fir-8m", BUDGET.fir8m, layerSwitch(X.group, (o) => /^xmas tree /.test(o.name)), [fx + 8, 1.7, fz], [fx, 4, fz]);
  for (const [name, fn] of Object.entries(X.extras ?? {})) await measure(`extra-${name}`, BUDGET.extra, { n: 1, set: fn }, ...street);
  camera.position.copy(back.p); controls.target.copy(back.t); controls.update?.();
  const pass = rows.every((r) => r.pass);
  return { rows, pass, extras: Object.keys(X.extras ?? {}), verdict: `${pass ? "PASS" : "FAIL"}: ${rows.map((r) => `${r.name} ${r.costMs} ms (< ${r.budget})`).join(", ")}${Object.keys(X.extras ?? {}).length ? "" : " (no extras registered yet)"}` };
}
