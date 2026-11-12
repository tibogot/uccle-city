// THE STREET-LIFE WORKER: one tile's data/streetlife/<T>.json -> instance arrays + its labels as SDF bitmaps, off the
// main thread (no bare imports: a module worker does not see the page's import map). Reports its time per step.
import { layoutTile, BOX_STRIDE, WIN_STRIDE, GLASS_STRIDE, PROP_STRIDE } from "./layout.js";
import { measureLabel, labelSDF } from "./sdfText.js";

const cat = (list, stride) => { const a = new Float32Array(list.length * stride); list.forEach((b, i) => a.set(b, i * stride)); return a; };

self.onmessage = async (e) => {
  const { id, url, tile } = e.data;
  const t0 = performance.now(), times = {};
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    const doc = await r.json();
    times.fetch = performance.now() - t0;
    let t = performance.now();
    const L = layoutTile(doc, measureLabel);
    times.layout = performance.now() - t; t = performance.now();
    // the labels' distance fields, one buffer
    let bytes = 0;
    for (const l of L.labels) bytes += l.w * l.h;
    const data = new Uint8Array(bytes);
    let off = 0;
    const labels = L.labels.map((l) => {
      const s = labelSDF(l.lines, l.style, { w: l.w, h: l.h, px: measureLabel(l.lines, l.style).px });
      data.set(s.data, off);
      const o = { key: l.key, lines: l.lines, style: l.style, w: s.w, h: s.h, off };
      off += s.w * s.h;
      return o;
    });
    times.sdf = performance.now() - t;
    const boxes = cat(L.boxes, BOX_STRIDE), windows = cat(L.windows, WIN_STRIDE), glass = cat(L.glass, GLASS_STRIDE);
    const props = {};
    for (const [k, v] of Object.entries(L.props)) if (v.length) props[k] = new Float32Array(v);
    const night = { shops: new Float32Array(L.night.shops), signs: new Float32Array(L.night.signs) };
    times.total = performance.now() - t0;
    const out = { id, tile, boxes, windows, glass, props, labels, labelData: data, night, used: L.used, counts: doc.counts, sources: doc.sources, skipped: doc.skipped, times,
      strides: { box: BOX_STRIDE, win: WIN_STRIDE, glass: GLASS_STRIDE, prop: PROP_STRIDE } };
    self.postMessage(out, [boxes.buffer, windows.buffer, glass.buffer, data.buffer, night.shops.buffer, night.signs.buffer, ...Object.values(props).map((a) => a.buffer)]);
  } catch (err) {
    self.postMessage({ id, tile, error: String(err?.stack || err) });
  }
};
