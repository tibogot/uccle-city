// SLICED WORK (docs/QUALITY_RULES.md rule 22): a builder written as a generator (a `yield` every few pieces) runs either
// at once (drain: tools, node checks, ?x=old paths) or in slices of <= ms of main thread, a new task between them
// (sliced: while the player plays). One code path for both, so the sliced result is the plain one.
/** run a generator to its end at once; its return value */
export const drain = (g) => { let r; while (!(r = g.next()).done); return r.value; };
/** a yield to the event loop without setTimeout's clamp (nested timers wait >= 4 ms each and queue behind every other
 *  task: a tile's gardens took 4-7 s of wall time at boot in 3 ms slices, browser turn 2026-11-18): scheduler.yield()
 *  (input and frames first, then this continuation), else a MessageChannel task */
export const yieldTask = (() => {
  const S = globalThis.scheduler;
  if (S && typeof S.yield === "function") return () => S.yield();
  if (typeof MessageChannel === "undefined") return () => new Promise((ok) => setTimeout(ok, 0));
  const ch = new MessageChannel(), q = [];
  ch.port1.onmessage = () => q.shift()?.();
  return () => new Promise((ok) => { q.push(ok); ch.port2.postMessage(0); });
})();
/** run a generator in slices of <= ms (checked at its yields), a task boundary between slices; resolves its return value.
 *  stats (optional) gets { slices, longest } (ms) */
export async function sliced(g, ms = 3, stats = null) {
  let t = performance.now(), r, longest = 0, slices = 1;
  while (!(r = g.next()).done) {
    const d = performance.now() - t;
    if (d > ms) { if (d > longest) longest = d; slices++; await yieldTask(); t = performance.now(); }
  }
  const d = performance.now() - t; if (d > longest) longest = d;
  if (stats) { stats.slices = slices; stats.longest = longest; }
  return r.value;
}
