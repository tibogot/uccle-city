// THE STREET-LIFE WORKER: one tile's data/streetlife/<T>.json -> GPU-ready instance buffers + its labels as SDF bitmaps
// already packed into atlas pages, off the main thread (no bare imports: a module worker does not see the page's import
// map). The main thread only copies the pages into the shared atlas, renumbers the pages and wraps the buffers
// (city hookup 2026-11-13: the per-instance loops and the label packing moved here, main thread < 2 ms per tile).
// Reports its time per step.
import { layoutTile, BOX_STRIDE, WIN_STRIDE, GLASS_STRIDE, PROP_STRIDE } from "./layout.js";
import { measureLabel, labelSDF, ShelfPacker } from "./sdfText.js";

/** per-instance interleaved layout of the box mesh (streetlife.js boxMaterial): iRect, iBox, iBoard, iInk, iSize, iMisc,
 *  iCen (centre xyz + the distance it shrinks away at) */
export const BOX_IB = 28, WIN_IB = 8;
/** how far a box stays drawn (m): ~350 x its middle size (a 15 cm number 70 m, a 0.3 m plate 105 m, a 0.8 m fascia
 *  280 m, the fuel canopy 600 m); between 75 % and 100 % of it the box shrinks to its centre (sub-pixel by then: no pop) */
export const rangeOf = (sx, sy, sz) => { const s = [Math.abs(sx), Math.abs(sy), Math.abs(sz)].sort((a, b) => a - b); return Math.max(70, Math.min(600, 350 * s[1])); };

self.onmessage = async (e) => {
  const { id, url, tile, pageW, pageH } = e.data;
  const t0 = performance.now(), times = {};
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    const doc = await r.json();
    times.fetch = performance.now() - t0;
    let t = performance.now();
    const L = layoutTile(doc, measureLabel);
    times.layout = performance.now() - t; t = performance.now();
    // the labels' distance fields, packed into pages of pageW x pageH (local page numbers 0..n-1, tallest first)
    const sdf = L.labels.map((l) => labelSDF(l.lines, l.style, { w: l.w, h: l.h, px: measureLabel(l.lines, l.style).px }));
    times.sdf = performance.now() - t; t = performance.now();
    const order = sdf.map((s, i) => i).sort((i, j) => sdf[j].h - sdf[i].h || sdf[j].w - sdf[i].w);
    const packers = [], rects = new Array(sdf.length).fill(null);
    let dropped = 0;
    for (const i of order) {
      const s = sdf[i];
      let at = null, pg = -1;
      for (let k = 0; k < packers.length && !at; k++) { at = packers[k].add(s.w, s.h); pg = k; }
      if (!at) { packers.push(new ShelfPacker(pageW, pageH)); pg = packers.length - 1; at = packers[pg].add(s.w, s.h); }
      if (!at) { dropped++; continue; }
      rects[i] = { x: at.x, y: at.y, pg };
    }
    const pages = new Uint8Array(packers.length * pageW * pageH);
    for (let i = 0; i < sdf.length; i++) {
      const rc = rects[i]; if (!rc) continue;
      const s = sdf[i], base = rc.pg * pageW * pageH;
      for (let y = 0; y < s.h; y++) pages.set(s.data.subarray(y * s.w, (y + 1) * s.w), base + (rc.y + y) * pageW + rc.x);
    }
    times.pack = performance.now() - t; t = performance.now();
    // boxes: the matrices, one interleaved buffer of the rest (WebGPU allows 8 vertex buffers per pipeline)
    const nb = L.boxes.length, boxMtx = new Float32Array(nb * 16), boxIB = new Float32Array(nb * BOX_IB);
    for (let i = 0; i < nb; i++) {
      const b = L.boxes[i], o = i * BOX_IB;
      boxMtx.set(b.subarray(0, 16), i * 16);
      const li = b[16], rc = li >= 0 ? rects[li] : null;
      if (rc) { const s = sdf[li]; boxIB.set([(rc.x + 0.5) / pageW, (rc.y + 0.5) / pageH, (rc.x + s.w - 0.5) / pageW, (rc.y + s.h - 0.5) / pageH], o); }
      else boxIB.set([-1, -1, -1, -1], o);
      boxIB.set(b.subarray(17, 37), o + 4);
      boxIB[o + 4] = rc ? rc.pg : 0;                           // iBox.x = the LOCAL page (the main thread renumbers it)
      boxIB.set([b[12], b[13], b[14], rangeOf(b[29], b[30], b[31])], o + 24);
    }
    const nw = L.windows.length, winMtx = new Float32Array(nw * 16), winIB = new Float32Array(nw * WIN_IB);
    for (let i = 0; i < nw; i++) {
      const w = L.windows[i];
      winMtx.set(w.subarray(0, 16), i * 16);
      winIB.set(w.subarray(16, 20), i * WIN_IB);
      winIB.set([w[12], w[13], w[14], rangeOf(w[16], w[17], 0.1)], i * WIN_IB + 4);
    }
    const ng = L.glass.length, glassMtx = new Float32Array(ng * 16), glassCen = new Float32Array(ng * 4);
    for (let i = 0; i < ng; i++) { glassMtx.set(L.glass[i].subarray(0, 16), i * 16); glassCen.set([L.glass[i][12], L.glass[i][13], L.glass[i][14], 250], i * 4); }
    const props = {};
    for (const [k, v] of Object.entries(L.props)) if (v.length) props[k] = new Float32Array(v);
    const night = { shops: new Float32Array(L.night.shops), signs: new Float32Array(L.night.signs), spots: new Float32Array(L.night.spots) };
    times.buffers = performance.now() - t;
    times.total = performance.now() - t0;
    const out = { id, tile, nb, nw, ng, boxMtx, boxIB, winMtx, winIB, glassMtx, glassCen, props, pages, nPages: packers.length, labels: sdf.length, labelBytes: sdf.reduce((a, s) => a + s.w * s.h, 0), dropped,
      night, used: L.used, counts: doc.counts, sources: doc.sources, skipped: doc.skipped, times, strides: { box: BOX_STRIDE, win: WIN_STRIDE, glass: GLASS_STRIDE, prop: PROP_STRIDE } };
    self.postMessage(out, [boxMtx.buffer, boxIB.buffer, winMtx.buffer, winIB.buffer, glassMtx.buffer, glassCen.buffer, pages.buffer, night.shops.buffer, night.signs.buffer, night.spots.buffer, ...Object.values(props).map((a) => a.buffer)]);
  } catch (err) {
    self.postMessage({ id, tile, error: String(err?.stack || err) });
  }
};
