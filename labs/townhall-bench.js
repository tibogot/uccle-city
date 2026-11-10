// Town Hall Lab benchmark (run from DevTools or a test driver, on the lab page):
//   const { benchViews, abViews } = await import("/labs/townhall-bench.js"); await benchViews(lab, 6)
// benchViews: for each of the NOTES views, INTERLEAVED windows (off, LOD0, LOD1, LOD2, off, ...) `cycles` times, 1.2 s
// each after a 0.4 s settle, so GPU clock drift and other tabs hit every mode alike; the median GPU ms per frame of each
// mode over all its windows. Returns { view: { off, L0, L1, L2, dL0, dL1, dL2, n } } (d = the building's cost).
// abViews: the same interleaving for named variants of the scene (setup functions), e.g. the LOD fade's discard on every
// material all the time (the old way) against the opaque materials.
export const VIEWS = ["portico and perron", "east facade (Commons 3557)", "south-east corner (inventory)", "far (900 m)"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
async function windows(lab, variants, cycles) {
  const acc = Object.fromEntries(Object.keys(variants).map((k) => [k, []]));
  for (let c = 0; c < cycles; c++) {
    for (const [k, setup] of Object.entries(variants)) {
      setup();
      await wait(400);
      lab.gpu.samples.length = 0;
      await wait(1200);
      acc[k].push(...lab.gpu.samples);
    }
  }
  return acc;
}
export async function benchViews(lab, cycles = 6, views = VIEWS, modes = ["off", 0, 1, 2]) {
  const out = {};
  for (const v of views) {
    lab.goView(v);
    await wait(1500);
    const acc = await windows(lab, Object.fromEntries(modes.map((m) => [m, () => lab.force(m)])), cycles);
    lab.force(null);
    const r = {};
    for (const m of modes) r[m === "off" ? "off" : `L${m}`] = +mean(acc[m]).toFixed(3);
    for (const m of modes) if (m !== "off") r[`dL${m}`] = +(r[`L${m}`] - r.off).toFixed(2);
    r.median = Object.fromEntries(modes.map((m) => [m, +med(acc[m]).toFixed(3)]));
    r.n = acc[modes[0]].length;
    out[v] = r;
  }
  return out;
}
export async function abViews(lab, variants, cycles = 6, views = VIEWS, lod = 0) {
  const out = {};
  for (const v of views) {
    lab.goView(v);
    lab.force(lod);
    await wait(1500);
    const acc = await windows(lab, variants, cycles);
    out[v] = Object.fromEntries(Object.keys(variants).map((k) => [k, +mean(acc[k]).toFixed(3)]));
  }
  lab.force(null);
  for (const k of Object.keys(variants)) { variants[k].reset?.(); }
  return out;
}
