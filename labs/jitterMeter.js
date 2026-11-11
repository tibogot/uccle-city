// THE JITTER METER (Impostor Lab): how much the far trees' pixels shimmer while the camera MOVES on a fixed path.
// Built on labs/flickerTest.js (claude/stalle, copied as-is): its flip rule (a pixel's luminance jumps up then down,
// or down then up, by more than `threshold`, at least `minFlips` times) and its heat map. Additions
// (docs/IMPOSTORS_RESEARCH.md section 4):
//  - MASKS per distance band: each frame is rendered once whole, then once per band with that band's trees hidden;
//    the pixels the band changes (|on - off| > 2/255 in any channel, grown by 1 px: crown edges + the haze behind)
//    are the band's pixels. Mode-independent: the same rule for the mesh LODs, today's impostors and the kit.
//  - SECOND TEMPORAL DIFFERENCE over the mask: mean |L(t+1) - 2 L(t) + L(t-1)|. Smooth motion gives ~0 (a pixel
//    changes at a steady rate), flicker a large value; it works while the camera moves.
//  - FLICKER SHARE: the share of the mask's pixels that blink (flickerTest's rule).
//  The lab runs the same path for each mode and prints jitter excess = impostor / mesh.
//
//   const r = await jitterRun({ frames, pose: (f) => ..., render: () => ..., canvas, bands: [{ name, hide, show }] });
//   r.bands[name] = { maskPx, share, d2 }, r.all = the union of the bands, r.heatURL (PNG)
const lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
const tick = () => new Promise((r) => setTimeout(r, 0));

export async function jitterRun({ frames = 24, pose, render, canvas, bands, settle = 3, threshold = 0.06, minFlips = 2, onFrame = null, keepFrames = 0, crop = null }) {
  const W = canvas.width, H = canvas.height, P = W * H;
  const c2 = new OffscreenCanvas(W, H), x2 = c2.getContext("2d", { willReadFrequently: true });
  const grab = () => { x2.drawImage(canvas, 0, 0); return x2.getImageData(0, 0, W, H).data; };
  const NB = bands.length;
  const masks = bands.map(() => new Uint8Array(P));        // union over the run (grown)
  const flips = new Uint16Array(P);
  let L0 = null, L1 = null, D1 = null;
  const d2sum = new Float64Array(NB), d2n = new Float64Array(NB);
  const d2px = new Float32Array(P);                         // per pixel sum of |d2| (heat)
  const kept = [];
  let last = null;
  const curMask = bands.map(() => new Uint8Array(P));
  for (let f = -settle; f < frames; f++) {
    pose(Math.max(0, f));
    render();
    const on = grab();
    if (f < 0) { await tick(); continue; }
    // masks of this frame
    for (let b = 0; b < NB; b++) {
      bands[b].hide(); render(); const off = grab(); bands[b].show();
      const m = curMask[b]; m.fill(0);
      for (let j = 0, i = 0; j < P; j++, i += 4) {
        if (Math.abs(on[i] - off[i]) > 2 || Math.abs(on[i + 1] - off[i + 1]) > 2 || Math.abs(on[i + 2] - off[i + 2]) > 2) m[j] = 1;
      }
      grow(m, W, H);
      const u = masks[b];
      for (let j = 0; j < P; j++) if (m[j]) u[j] = 1;
    }
    render();                                               // (leave the canvas showing the whole frame)
    const L = new Float32Array(P);
    for (let j = 0, i = 0; j < P; j++, i += 4) L[j] = lum(on, i);
    if (L1) {
      const D = new Float32Array(P);
      for (let j = 0; j < P; j++) {
        const dd = L[j] - L1[j]; D[j] = dd;
        if (D1 && Math.abs(dd) > threshold && Math.abs(D1[j]) > threshold && Math.sign(dd) !== Math.sign(D1[j])) flips[j]++;
      }
      if (L0) {
        for (let j = 0; j < P; j++) {
          const v = Math.abs(L[j] - 2 * L1[j] + L0[j]);
          d2px[j] += v;
          for (let b = 0; b < NB; b++) if (curMask[b][j]) { d2sum[b] += v; d2n[b]++; }
        }
      }
      D1 = D;
    }
    L0 = L1; L1 = L; last = on;
    if (keepFrames && f < keepFrames) kept.push(cropOf(on, W, H, crop));
    onFrame?.(f);
    await tick();
  }
  const res = { frames, W, H, bands: {}, kept };
  const all = new Uint8Array(P);
  let allD2 = 0, allN = 0;
  for (let b = 0; b < NB; b++) {
    const m = masks[b];
    let n = 0, blink = 0;
    for (let j = 0; j < P; j++) if (m[j]) { n++; all[j] = 1; if (flips[j] >= minFlips) blink++; }
    res.bands[bands[b].name] = { maskPx: n, share: n ? blink / n : 0, d2: d2n[b] ? d2sum[b] / d2n[b] : 0 };
    allD2 += d2sum[b]; allN += d2n[b];
  }
  let n = 0, blink = 0;
  for (let j = 0; j < P; j++) if (all[j]) { n++; if (flips[j] >= minFlips) blink++; }
  res.all = { maskPx: n, share: n ? blink / n : 0, d2: allN ? allD2 / allN : 0 };
  // heat map: the last frame dimmed, the mask outlined in blue, |d2| in red, blinking pixels yellow
  const img = x2.createImageData(W, H);
  const norm = 1 / Math.max(1, frames - 2);
  for (let j = 0, i = 0; j < P; j++, i += 4) {
    const g = lum(last, i) * 0.4 * 255, h = Math.min(1, d2px[j] * norm * 6);
    let r = g + h * 255, gg = g, bb = g + (all[j] ? 40 : 0);
    if (flips[j] >= minFlips) { r = 255; gg = 230; bb = 0; }
    img.data[i] = Math.min(255, r); img.data[i + 1] = Math.min(255, gg); img.data[i + 2] = Math.min(255, bb); img.data[i + 3] = 255;
  }
  x2.putImageData(img, 0, 0);
  res.heatURL = URL.createObjectURL(await c2.convertToBlob({ type: "image/png" }));
  return res;
}

function grow(m, W, H) {
  const t = m.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x;
    if (!t[j]) continue;
    if (x > 0) m[j - 1] = 1; if (x < W - 1) m[j + 1] = 1; if (y > 0) m[j - W] = 1; if (y < H - 1) m[j + W] = 1;
  }
}

function cropOf(d, W, H, c) {
  const [x0, y0, w, h] = c ?? [0, 0, W, H];
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) out.set(d.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4), y * w * 4);
  return { w, h, data: out };
}

/** A strip of kept crops, each scaled `k` x (nearest), side by side; returns a PNG object URL. */
export async function stripURL(kept, k = 3, label = "") {
  if (!kept.length) return null;
  const { w, h } = kept[0], cols = Math.min(kept.length, 6), rows = Math.ceil(kept.length / cols);
  const c = new OffscreenCanvas(cols * w * k + (cols - 1) * 4, rows * h * k + (rows - 1) * 4 + 22), x = c.getContext("2d");
  x.fillStyle = "#111"; x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingEnabled = false;
  const tmp = new OffscreenCanvas(w, h), tx = tmp.getContext("2d");
  kept.forEach((fr, i) => {
    tx.putImageData(new ImageData(fr.data, w, h), 0, 0);
    x.drawImage(tmp, (i % cols) * (w * k + 4), Math.floor(i / cols) * (h * k + 4), w * k, h * k);
  });
  x.fillStyle = "#fff"; x.font = "14px monospace"; x.fillText(label, 6, c.height - 6);
  return URL.createObjectURL(await c.convertToBlob({ type: "image/png" }));
}
