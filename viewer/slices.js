// SLICED WORK (docs/QUALITY_RULES.md rule 22): a builder written as a generator (a `yield` every few pieces) runs either
// at once (drain: tools, node checks, ?x=old paths) or in slices of <= ms of main thread, a new task between them
// (sliced: while the player plays). One code path for both, so the sliced result is the plain one.
/** run a generator to its end at once; its return value */
export const drain = (g) => { let r; while (!(r = g.next()).done); return r.value; };
/** run a generator in slices of <= ms (checked at its yields), a macrotask between slices; resolves its return value.
 *  stats (optional) gets { slices, longest } (ms) */
export async function sliced(g, ms = 3, stats = null) {
  let t = performance.now(), r, longest = 0, slices = 1;
  while (!(r = g.next()).done) {
    const d = performance.now() - t;
    if (d > ms) { if (d > longest) longest = d; slices++; await new Promise((ok) => setTimeout(ok, 0)); t = performance.now(); }
  }
  const d = performance.now() - t; if (d > longest) longest = d;
  if (stats) { stats.slices = slices; stats.longest = longest; }
  return r.value;
}
