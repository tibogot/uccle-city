// THIN BARS, A/B in the browser (claude/jitter, docs/JITTER.md §5). The crop of a fence / gate / balcony railing /
// door grille, the camera still and then dollying sideways at `speed` m/s (viewer.step at 1/60 s: the same frames every
// run), measured like debug/zfightCheck.js:
//   shimmer  median |high-pass(Y_t) - high-pass(Y_t-1)| on the crop (x / 255)
//   hot      median % of crop pixels whose high-pass changed > 8 / 255 in a frame
// ?jitter=old is a module constant: A/B = alternate page loads (same view, same frames).
//   ?quick=1&at=617.9,784.8&dynres=0   (Saint-Job gate, H6)   ?quick=1&at=-505.5,-375.5&dynres=0 (Wolvendael railing, E4)
//   ?quick=1&at=-744,-501.7&dynres=0   (Maison Dandoy's Juliet railing + a door grille, E3)
//   const J = await import("/debug/jitterCheck.js"); await J.run({ views: ["gate8", "gate20"] })
//   await J.go("gate3")   (a look / screenshot)     await J.strip({ view: "gate20" })  8 crops + differences, a sheet url
import { luma, highPass } from "./sharpCheck.js";
const V = () => window.viewer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tdiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const med = (a) => (a.length ? +[...a].sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(3) : null);

// faces: a point on the fence / wall line (y = its foot), the normal toward the street (where the camera stands)
const GATE = { x: 617.88, y: 61.6, z: 784.84, nx: -0.391, nz: -0.92 };       // H6 driveway gate (data/gardens/H6.json), 3.51 m, closed
const WOLV = { x: -505.5, y: 46.9, z: -375.5, nx: 0.82, nz: -0.574 };        // E4 railing on a wall, Wolvendael's edge
const DANDOY = { x: -743.95, y: 49.84, z: -501.72, nx: 0.7505, nz: 0.6609 }; // Maison Dandoy (debug/zfightCheck.js)
const DOORA = { x: -713.6, y: 51.29, z: -564.92, nx: 0.53, nz: 0.85 };       // E3 doorA (fanlight grille)
const along = (f, u) => [f.x + f.nz * u, f.z - f.nx * u];
const view = (f, u, y, hw, hh, d, h = 1.7) => ({ f, u, y, hw, hh, d, h });
export const VIEWS = {
  gate3: view(GATE, 1.75, 0.7, 1.9, 0.75, 3), gate8: view(GATE, 1.75, 0.7, 1.9, 0.75, 8), gate20: view(GATE, 1.75, 0.7, 1.9, 0.75, 20), gate40: view(GATE, 1.75, 0.7, 1.9, 0.75, 40),
  wolv3: view(WOLV, 0, 0.9, 2.5, 0.6, 3), wolv8: view(WOLV, 0, 0.9, 2.5, 0.6, 8), wolv20: view(WOLV, 0, 0.9, 2.5, 0.6, 20), wolv40: view(WOLV, 0, 0.9, 2.5, 0.6, 40),
  dandoy8: view(DANDOY, 0.7, 4.7, 0.6, 0.55, 8), dandoy20: view(DANDOY, 0.7, 4.7, 0.6, 0.55, 20), dandoy40: view(DANDOY, 0.7, 4.7, 0.6, 0.55, 40),   // the Juliet railing (kit balcony at -743.11, 54.04, -502.67)
  door8: view(DOORA, 0, 1.6, 0.7, 1.0, 8), door20: view(DOORA, 0, 1.6, 0.7, 1.0, 20),
};
const ground = (x, z) => V().hm.surface(x, z);
function place(p, s) {
  const v = V(), c = v.camera, f = p.f;
  const [cx, cz] = along(f, p.u + s), ex = cx + f.nx * p.d, ez = cz + f.nz * p.d;
  c.position.set(ex, Math.max(ground(ex, ez) + p.h, f.y + p.y - p.d * 0.35), ez);
  v.controls.target.set(cx, f.y + p.y, cz);
  c.lookAt(v.controls.target); v.controls.update?.();
}
function cropBox(p, W, H) {
  const v = V(), f = p.f, P = v.camera.position.constructor;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const su of [-1, 1]) for (const sy of [-1, 1]) {
    const [x, z] = along(f, p.u + su * p.hw);
    const q = new P(x + f.nx * 0.1, f.y + p.y + sy * p.hh, z + f.nz * 0.1).project(v.camera);
    const sx = (q.x * 0.5 + 0.5) * W, syy = (-q.y * 0.5 + 0.5) * H;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, syy); y1 = Math.max(y1, syy);
  }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
  return x1 - x0 >= 12 && y1 - y0 >= 12 ? [x0, y0, x1 - x0, y1 - y0] : null;
}
/** settle still, `still` frames still, then `frames` frames dollying sideways at `speed` m/s */
export async function measure({ view = "gate8", speed = 1.5, frames = 48, still = 16, settle = 40, keep = 0 } = {}) {
  const p = VIEWS[view], v = V(), canvas = v.renderer.domElement, W = canvas.width, H = canvas.height;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  const s0 = -speed * frames / 120, kept = [];
  // real frames first at the start spot: the kit's re-bucket and the garden pools stream on a per-frame time budget
  // (a paused step jump left them on the last view's buckets: the card / bars of a near LOD not drawn yet)
  for (let t = 0; t < 30; t++) { place(p, s0); await sleep(50); }
  v.pause(true);
  try {
    for (let f = 0; f < settle; f++) { place(p, s0); v.step(1 / 60); if (f % 4 === 0) await sleep(0); }
    const box = cropBox(p, W, H);
    if (!box) return { view, error: "off screen" };
    const run = async (n, move) => {
      const a = { sh: [], hot: [], y: [] }; let prev = null;
      for (let f = 0; f < n; f++) {
        place(p, move ? s0 + speed * f / 60 : s0); v.step(1 / 60); g.drawImage(canvas, 0, 0);
        const img = g.getImageData(...box), Y = luma(img), hp = highPass(Y, box[2], box[3]);
        let ys = 0; for (let i = 0; i < Y.length; i++) ys += Y[i]; a.y.push(ys / Y.length);
        if (prev) { a.sh.push(tdiff(hp, prev)); let c = 0; for (let i = 0; i < hp.length; i++) if (Math.abs(hp[i] - prev[i]) > 8) c++; a.hot.push(100 * c / hp.length); }
        prev = hp;
        if (move && f >= n - keep) { const c = new OffscreenCanvas(box[2], box[3]); c.getContext("2d").putImageData(img, 0, 0); kept.push(c); }
        if (f % 4 === 0) await sleep(0);
      }
      return { shimmer: med(a.sh), hot: med(a.hot), meanY: med(a.y) };
    };
    const still_ = await run(still, false), moving = await run(frames, true);
    return { view, speed, still: still_, moving, box, crops: keep ? kept : undefined };
  } finally { v.pause(false); }
}
/** every view x speeds: rows { view, speed, still, stillHot, moving, movingHot } */
export async function run({ views = Object.keys(VIEWS), speeds = [1.5, 8], ...o } = {}) {
  const rows = [];
  for (const view of views) for (const speed of speeds) {
    const r = await measure({ ...o, view, speed });
    rows.push({ view, speed, still: r.still?.shimmer, stillHot: r.still?.hot, moving: r.moving?.shimmer, movingHot: r.moving?.hot, yStill: r.still?.meanY, yMoving: r.moving?.meanY, err: r.error });
  }
  return { mode: /jitter=old/.test(location.search) ? "old" : "new", rows };
}
export async function go(view, settle = 2000) {
  for (const el of document.querySelectorAll("#hud, #umap-mini, #umap-toggle, #sound-toggle, #gplay, .play-btn")) el.style.display = "none";
  place(VIEWS[view], 0); await sleep(settle);
  return VIEWS[view];
}
/** 8 consecutive crops (dollying) + their differences x4: a sheet data url */
export async function strip({ view = "gate20", n = 8, zoom = 3, ...o } = {}) {
  const crops = (await measure({ ...o, view, keep: n })).crops;
  if (!crops?.length) throw new Error(`no crop at ${view}`);
  const cw = crops[0].width, ch = crops[0].height, rowH = ch * zoom;
  const S = new OffscreenCanvas(n * cw * zoom + (n - 1) * 4, 2 * rowH + 34), x = S.getContext("2d");
  x.imageSmoothingEnabled = false; x.fillStyle = "#16181c"; x.fillRect(0, 0, S.width, S.height); x.font = "13px monospace";
  x.fillStyle = "#ddd"; x.fillText(`${view} ${location.search}  (top: frames, bottom: |frame - previous| x4)`, 4, 16);
  crops.forEach((c, i) => {
    x.drawImage(c, 0, 0, cw, ch, i * (cw * zoom + 4), 22, cw * zoom, rowH);
    if (!i) return;
    const a = c.getContext("2d").getImageData(0, 0, cw, ch), b = crops[i - 1].getContext("2d").getImageData(0, 0, cw, ch), d = new ImageData(cw, ch);
    for (let q = 0; q < a.data.length; q += 4) { for (let k = 0; k < 3; k++) d.data[q + k] = Math.min(255, 4 * Math.abs(a.data[q + k] - b.data[q + k])); d.data[q + 3] = 255; }
    const t = new OffscreenCanvas(cw, ch); t.getContext("2d").putImageData(d, 0, 0);
    x.drawImage(t, 0, 0, cw, ch, i * (cw * zoom + 4), 22 + rowH, cw * zoom, rowH);
  });
  const blob = await S.convertToBlob({ type: "image/png" });
  return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
}
