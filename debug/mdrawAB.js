// MULTI-DRAW A/B (claude/mdraw, docs/AGARGARO.md jobs 1-2): measure the multi-draw culls in the running city.
//   const M = await import("/debug/mdrawAB.js")
//   await M.cull({ seconds: 5 })        CPU of every MultiDrawSet.cull per frame (us), sets / chunks held, records and
//                                       instances drawn per pass kind (view camera / other cameras), per frame
//   await M.sortAB({ rounds: 6 })       live A/B of job 1 (setMultiDrawSort true / false), alternating, GPU p50 per round
// Job 2 (?mdchunk=160) cannot switch live (the buffers are sized by it): alternate page loads and call cull() + gpuAB.
import { MultiDrawSet, setMultiDrawSort } from "/viewer/multiDraw.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function cull({ seconds = 5 } = {}) {
  const P = MultiDrawSet.prototype, orig = P.cull, cam = window.viewer.camera;
  const sets = new Set();
  let ms = 0, calls = 0, viewRec = 0, otherRec = 0, viewInst = 0, otherInst = 0;
  P.cull = function (camera, frame, v) {
    const t = performance.now();
    const list = orig.call(this, camera, frame, v);
    ms += performance.now() - t; calls++; sets.add(this);
    let inst = 0;
    for (let i = 0; i < list.length; i++) { const r = list[i] / 20, k = Math.floor(r / this.chMax), c = r % this.chMax; inst += this.parts[k].ch[c * 2 + 1]; }
    if (camera === cam) { viewRec += list.length; viewInst += inst; } else { otherRec += list.length; otherInst += inst; }
    return list;
  };
  let frames = 0, run = true;
  const tick = () => { if (run) { frames++; requestAnimationFrame(tick); } };
  requestAnimationFrame(tick);
  await sleep(seconds * 1000);
  run = false; P.cull = orig;
  // the CPU: performance.now() is coarse in a page (100 us steps), so one frame's calls are captured and replayed
  // 200 times back to back (fresh frame ids: every cull recomputed, as each real frame does)
  const one = [];
  P.cull = function (camera, frame, v) { if (one.length < 2000) one.push([this, camera, v]); return orig.call(this, camera, frame, v); };
  await sleep(100);
  P.cull = orig;
  const ids = new Map(), uid = (o) => { if (!ids.has(o)) ids.set(o, ids.size); return ids.get(o); };
  const seen = new Set(), calls1 = one.filter(([s, c, v]) => { const k = `${uid(s)}|${uid(c)}|${uid(v)}`; if (seen.has(k)) return false; seen.add(k); return true; });
  let id = -1e9;
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) { id--; for (const [s, c, v] of calls1) orig.call(s, c, id, v); }
  const replayUs = ((performance.now() - t0) * 1000) / 200;
  let chunks = 0, parts = 0;
  for (const s of sets) for (const p of s.parts) { chunks += p.nch; parts++; }
  const f = Math.max(1, frames), r = (x) => +(x / f).toFixed(1);
  return { frames, cullUsPerFrame: +replayUs.toFixed(1), coarseUsPerFrame: +((ms * 1000) / f).toFixed(1), replayCalls: calls1.length, callsPerFrame: r(calls), sets: sets.size, parts, chunksHeld: chunks,
    view: { records: r(viewRec), instances: r(viewInst) }, other: { records: r(otherRec), instances: r(otherInst) } };
}

export async function sortAB({ rounds = 6, settle = 1.5, seconds = 3 } = {}) {
  const A = [], B = [];
  for (let i = 0; i < rounds; i++) {
    for (const [on, out] of [[true, A], [false, B]]) {
      setMultiDrawSort(on); await sleep(settle * 1000); window.viewer.resetGpu(); await sleep(seconds * 1000);
      out.push(window.viewer.gpuStats().p50);
    }
  }
  setMultiDrawSort(true);
  const mean = (x) => +(x.reduce((s, v) => s + v, 0) / x.length).toFixed(3);
  const d = A.map((v, i) => v - B[i]);
  return { sorted: A, old: B, meanSorted: mean(A), meanOld: mean(B), diff: mean(d), diffMin: +Math.min(...d).toFixed(2), diffMax: +Math.max(...d).toFixed(2) };
}
