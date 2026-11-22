// POINT-IN-RING TESTS WITHOUT GARBAGE (perf job B, docs/rules/alloc-rate.md; ?ringtest=old = the old destructuring
// loops at the call sites). `const [xi, zi] = r[i]` in a polygon loop goes through the array iterator protocol: unless
// TurboFan's escape analysis takes the loop (tile-time code rarely runs hot enough for it), each vertex allocates an
// iterator and its result objects. The allocation sampler (tools/perf/allocSample.mjs) charged ~170 KB a frame of the
// falcon flight and ~210 KB of the police drive to main.js's garden clear-ring test alone (a garden piece tested against
// every ring, every vertex destructured). Here: index reads, and a set of rings keeps each ring's bounding box so a
// point outside it costs four compares.
export const RING_TEST = new URLSearchParams(globalThis.location?.search || "").get("ringtest") !== "old";

/** even-odd test of (x, z) against ring r = [[x, z], ...] (closed or not) */
export function inRing(r, x, z) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i], b = r[j], ai = a[0], zi = a[1], xj = b[0], zj = b[1];
    if ((zi > z) !== (zj > z) && x < ((xj - ai) * (z - zi)) / (zj - zi) + ai) c = !c;
  }
  return c;
}

/** rings -> { has(x, z): in any ring } with a bounding box per ring (empty / degenerate rings dropped) */
export function ringSet(rings) {
  const list = [], box = [];
  for (const r of rings || []) {
    if (!r || r.length < 3) continue;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < r.length; i++) { const p = r[i]; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
    list.push(r); box.push(x0, z0, x1, z1);
  }
  const n = list.length;
  return {
    size: n,
    has(x, z) {
      for (let k = 0; k < n; k++) {
        const o = k * 4;
        if (x < box[o] || z < box[o + 1] || x > box[o + 2] || z > box[o + 3]) continue;
        if (inRing(list[k], x, z)) return true;
      }
      return false;
    },
  };
}
