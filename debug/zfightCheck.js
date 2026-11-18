// THE SHAKING WINDOWS, A/B (census class G, claude/zfight, docs/CENSUS.md G; owner images 87 Maison Dandoy, 93 the
// window right of Calzedonia). The census found no coplanar static geometry at either window; this isolates the layer
// that shimmers, live, on the window's own crop, with the camera still and then dollying sideways (viewer.step at
// 1/60 s: the same frames every run). Each knob switches ONE layer off through its uniform / visibility (no reload, no
// light added); the knob whose crop shimmer drops to the floor is the cause.
//   ?quick=1&at=-744,-501.7&dynres=0    (Maison Dandoy, E3)      ?quick=1&at=-914.5,-476&dynres=0  (Calzedonia, E4)
//   const Z = await import("/debug/zfightCheck.js");
//   await Z.go("dandoyShop")                   camera on a view (VIEWS) for a look / screenshot
//   await Z.ab({ views: ["dandoyShop", "dandoyFrench", "calzeWin"] })   knobs x views, alternated: a table of
//        shimmer  mean |high-pass(Y_t) - high-pass(Y_t-1)| on the window crop (x / 255)
//        hot      % of crop pixels whose high-pass changed > 8 / 255 in a frame (dollying), still: the same, camera still
//   await Z.strip({ view: "calzeWin", knob: "base" })   8 consecutive crops + their differences: a sheet url; Z.show(url)
// Knobs: base | ivy (the ivy hidden) | kit (the façade kit off: the painted windows only, KIT.far = 0) | room (the kit
// glass's painted room / curtains off: plain dark glass) | wet (the weather's wet film 0: no beads on the panes) | wind
// (the wind frozen: no leaf / ivy flutter, no moving leaf shadows) | lodband (the kit's LOD0/LOD1 dither band moved
// out of the way). Also by URL (reload): ?zfight=old (before this branch), ?upscale=0 (no TAAU: is it the history?).
import { luma, highPass, show, hide } from "./sharpCheck.js";
export { show, hide };
const V = () => window.viewer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tdiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const med = (a) => (a.length ? +[...a].sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(3) : null);

// the windows: centre on the wall (x, y over the sidewalk, z), the wall's outward normal, the crop's half width / height
const DANDOY = { x: -743.95, y: 49.84, z: -501.72, nx: 0.7505, nz: 0.6609 };          // data/streetlife/E3.json face
const CALZE = { x: -914.56, y: 48.83, z: -470.02, nx: 0.9996, nz: 0.0289 };           // data/streetlife/E4.json face
const along = (f, u) => [f.x + f.nz * u, f.z - f.nx * u];                             // right along the wall seen from the street
export const VIEWS = {
  // image 87: the shop's right window (right of the door), and the first-floor French window over it
  dandoyShop: { f: DANDOY, u: 1.2, y: 1.5, hw: 1.6, hh: 1.0, d: 7, h: 1.7 },
  dandoyFrench: { f: DANDOY, u: 1.6, y: 4.9, hw: 0.8, hh: 1.2, d: 9, h: 1.7 },
  // the grey house right of it: its ground-floor kit window showed the same gold blotches as image 93 (browser turn)
  dandoyNext: { f: DANDOY, u: 5.3, y: 2.7, hw: 0.5, hh: 0.9, d: 8, h: 1.7 },
  // image 93: the first-floor window of the yellow-brick house right of Calzedonia (seen from the street)
  calzeWin: { f: CALZE, u: 6.5, y: 5.2, hw: 1.3, hh: 0.9, d: 10, h: 1.7 },
};
const ground = (x, z) => V().hm.surface(x, z);
function place(view, s) {
  const v = V(), c = v.camera, p = VIEWS[view], f = p.f;
  const [cx, cz] = along(f, p.u + s), ex = cx + f.nx * p.d, ez = cz + f.nz * p.d;
  c.position.set(ex, ground(ex, ez) + p.h, ez);
  v.controls.target.set(cx, f.y + p.y, cz);
  c.lookAt(v.controls.target); v.controls.update?.();
}
function cropBox(view, W, H) {
  const v = V(), p = VIEWS[view], f = p.f, P = v.camera.position.constructor;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const su of [-1, 1]) for (const sy of [-1, 1]) {
    const [x, z] = along(f, p.u + su * p.hw);
    const q = new P(x + f.nx * 0.1, f.y + p.y + sy * p.hh, z + f.nz * 0.1).project(v.camera);
    const sx = (q.x * 0.5 + 0.5) * W, syy = (-q.y * 0.5 + 0.5) * H;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, syy); y1 = Math.max(y1, syy);
  }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
  return x1 - x0 >= 16 && y1 - y0 >= 16 ? [x0, y0, x1 - x0, y1 - y0] : null;
}

// ---- the knobs: on() switches the layer off, returns undo()
let M = null;
async function mods() {
  return (M ||= {
    kitFade: await import("/viewer/facadeKit/kitFade.js"),
    kitMat: await import("/viewer/facadeKit/kitMaterials.js"),
    wx: await import("/viewer/weather/weatherState.js"),
    wind: await import("/viewer/foliage/wind.js"),
  });
}
const setU = (u, val) => { const was = u.value; u.value = val; return () => { u.value = was; }; };
export const KNOBS = {
  base: async () => () => {},
  ivy: async () => { const g = V().scene.getObjectByName("ivy"); if (!g) return () => {}; const was = g.visible; g.visible = false; return () => { g.visible = was; }; },
  kit: async () => setU((await mods()).kitFade.KIT.far, 0),
  room: async () => setU((await mods()).kitMat.kitLook.roomGlass, 0),
  wet: async () => { const { wx } = (await mods()).wx; const u = [setU(wx.uWet, 0), setU(wx.uRain, 0)]; return () => u.forEach((f) => f()); },
  wind: async () => { const { wind } = (await mods()).wind; const was = wind.frozen; wind.frozen = true; return () => { wind.frozen = was; }; },
  lodband: async () => setU((await mods()).kitFade.KIT.lod1, 500),
};

/** settle still, measure `still` frames with the camera still, then dolly sideways at `speed` m/s for `frames` frames */
export async function measure({ view = "dandoyShop", speed = 1.0, frames = 48, still = 24, settle = 30, keep = 0 } = {}) {
  const v = V(), canvas = v.renderer.domElement, W = canvas.width, H = canvas.height;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  const s0 = -speed * frames / 120, res = { view }, kept = [];
  v.pause(true);
  try {
    for (let f = 0; f < settle; f++) { place(view, s0); v.step(1 / 60); if (f % 4 === 0) await sleep(0); }
    const box = cropBox(view, W, H);
    if (!box) return { view, error: "window off screen" };
    const run = async (n, move) => {
      const a = { sh: [], hot: [] }; let prev = null;
      for (let f = 0; f < n; f++) {
        place(view, move ? s0 + speed * f / 60 : s0); v.step(1 / 60); g.drawImage(canvas, 0, 0);
        const img = g.getImageData(...box), Y = luma(img), hp = highPass(Y, box[2], box[3]);
        if (prev) { a.sh.push(tdiff(hp, prev)); let c = 0; for (let i = 0; i < hp.length; i++) if (Math.abs(hp[i] - prev[i]) > 8) c++; a.hot.push(100 * c / hp.length); }
        prev = hp;
        if (move && f >= n - keep) { const c = new OffscreenCanvas(box[2], box[3]); c.getContext("2d").putImageData(img, 0, 0); kept.push(c); }
        if (f % 4 === 0) await sleep(0);
      }
      return { shimmer: med(a.sh), hot: med(a.hot) };
    };
    res.still = await run(still, false);
    res.moving = await run(frames, true);
    res.box = box;
  } finally { v.pause(false); }
  if (keep) res.crops = kept;
  return res;
}
export async function go(view, settle = 2500) {
  if (!VIEWS[view]) throw new Error(`no view ${view}: ${Object.keys(VIEWS).join(", ")}`);
  for (const el of document.querySelectorAll("#hud, #umap-mini, #umap-toggle, #sound-toggle, #gplay, .play-btn")) el.style.display = "none";
  place(view, 0); await sleep(settle);
  return VIEWS[view];
}
/** knobs x views, alternated per round -> console.table + rows */
export async function ab({ views = Object.keys(VIEWS), knobs = Object.keys(KNOBS), rounds = 2, ...o } = {}) {
  const out = {};
  for (let r = 0; r < rounds; r++) for (const k of r % 2 ? [...knobs].reverse() : knobs) {
    const undo = await KNOBS[k]();
    await sleep(800);
    try { for (const view of views) (out[`${view} ${k}`] ||= []).push(await measure({ ...o, view })); } finally { undo(); }
  }
  const rows = Object.entries(out).map(([key, runs]) => ({ run: key, still: med(runs.map((x) => x.still?.shimmer).filter((x) => x != null)), stillHot: med(runs.map((x) => x.still?.hot).filter((x) => x != null)),
    moving: med(runs.map((x) => x.moving?.shimmer).filter((x) => x != null)), movingHot: med(runs.map((x) => x.moving?.hot).filter((x) => x != null)) }));
  console.table(rows);
  return { rows, runs: out, url: location.search };
}
/** 8 consecutive crops (dollying) + their differences x4, one knob: a sheet url */
export async function strip({ view = "calzeWin", knob = "base", n = 8, zoom = 3, ...o } = {}) {
  const undo = await KNOBS[knob](); await sleep(800);
  let crops;
  try { crops = (await measure({ ...o, view, keep: n })).crops; } finally { undo(); }
  if (!crops?.length) throw new Error(`no crop at ${view}`);
  const cw = crops[0].width, ch = crops[0].height, rowH = ch * zoom;
  const S = new OffscreenCanvas(n * cw * zoom + (n - 1) * 4, 2 * rowH + 34), x = S.getContext("2d");
  x.imageSmoothingEnabled = false; x.fillStyle = "#16181c"; x.fillRect(0, 0, S.width, S.height); x.font = "13px monospace";
  x.fillStyle = "#ddd"; x.fillText(`${view} knob ${knob} ${location.search}  (top: frames, bottom: |frame - previous| x4)`, 4, 16);
  crops.forEach((c, i) => {
    x.drawImage(c, 0, 0, cw, ch, i * (cw * zoom + 4), 22, cw * zoom, rowH);
    if (!i) return;
    const a = c.getContext("2d").getImageData(0, 0, cw, ch), b = crops[i - 1].getContext("2d").getImageData(0, 0, cw, ch), d = new ImageData(cw, ch);
    for (let p = 0; p < a.data.length; p += 4) { for (let q = 0; q < 3; q++) d.data[p + q] = Math.min(255, 4 * Math.abs(a.data[p + q] - b.data[p + q])); d.data[p + 3] = 255; }
    const t = new OffscreenCanvas(cw, ch); t.getContext("2d").putImageData(d, 0, 0);
    x.drawImage(t, 0, 0, cw, ch, i * (cw * zoom + 4), 22 + rowH, cw * zoom, rowH);
  });
  return URL.createObjectURL(await S.convertToBlob({ type: "image/png" }));
}
