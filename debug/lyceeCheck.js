// THE LYCÉE FRANÇAIS FENCE WHILE MOVING (claude/lycee, docs/LYCEE.md, tools/audit/lyceeCheck.mjs): the railing left of the
// vehicle gate (as seen from the avenue) and the gate itself, at 3 / 8 / 20 m, the camera dollying sideways (a walker /
// a car passing), measured frame to frame on the fence's crop. The main loop is paused and stepped at 1/60 s
// (viewer.step, as debug/rearCheck.js): the same frames whatever the GPU; the modes are switched live
// (lyceeFront.setMode: the railing / gate meshes rebuilt in place), so every mode sees the same camera path.
//   ?quick=1&at=-307.3,1146.2&look=-304.3,1150.3,1.2&dynres=0&rscale=0.8
//   const L = await import("/debug/lyceeCheck.js");
//   await L.go("rail8")                    the camera at a spot (VIEWS), for a look / a screenshot
//   await L.measure({ view: "rail8" })     -> { fence, gate }: per crop the medians over the frames of
//        shimmer  mean |high-pass(Y_t) - high-pass(Y_t-1)| on the crop (x / 255): bars blinking / crawling
//        hot      % of crop pixels whose high-pass changed > 8 / 255 in a frame       flicker  mean |Y_t - Y_t-1|
//        sharp    Laplacian variance of the crop (a fix that only blurs shows here)
//   await L.ab({ rounds: 2 })              modes old / new / blend x views, alternated per round: a table
//   await L.strip({ view: "rail8" })       8 consecutive fence crops per mode (x3) + their differences (x4): a sheet url
//   L.show(url) / L.hide()
import { luma, highPass, lapVar, show, hide } from "./sharpCheck.js";
export { show, hide };
const V = () => window.viewer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tdiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

// the railing's first run (from the gatehouse along the roundabout: lyceeFront.js RAIL[0] -> RAIL[1]) and the gate
const A = [-309.9, 1154.5], B = [-293.8, 1142.6], GATE = [-315.95, 1153.65];
const UR = [(B[0] - A[0]) / Math.hypot(B[0] - A[0], B[1] - A[1]), (B[1] - A[1]) / Math.hypot(B[0] - A[0], B[1] - A[1])];
const NR = [UR[1], -UR[0]];                       // the avenue side of the run (x east, z south)
const NG = [0.707, -0.707];                       // the avenue side of the gate
const RT = [A[0] + (B[0] - A[0]) * 0.35, A[1] + (B[1] - A[1]) * 0.35];
/** name -> { eye [x, z], at [x, z], along [ux, uz] (the dolly), h (eye over the ground) } */
export const VIEWS = {};
for (const d of [3, 8, 20]) {
  VIEWS[`rail${d}`] = { eye: [RT[0] + NR[0] * d, RT[1] + NR[1] * d], at: RT, along: UR, h: 1.7 };
  VIEWS[`gate${d}`] = { eye: [GATE[0] + NG[0] * d, GATE[1] + NG[1] * d], at: GATE, along: [NG[1], -NG[0]], h: 1.7 };
}

let LF = null;
const front = async () => (LF ||= (await import("/viewer/lyceeFront.js")).lyceeFront);
const ground = (x, z) => V().hm.surface(x, z);
function place(view, s) {
  const v = V(), c = v.camera, p = VIEWS[view];
  const ex = p.eye[0] + p.along[0] * s, ez = p.eye[1] + p.along[1] * s, tx = p.at[0] + p.along[0] * s, tz = p.at[1] + p.along[1] * s;
  c.position.set(ex, ground(ex, ez) + p.h, ez);
  v.controls.target.set(tx, ground(tx, tz) + 1.2, tz);
  c.lookAt(v.controls.target); v.controls.update?.();
}
export async function go(view, settle = 2500) {
  if (!VIEWS[view]) throw new Error(`no view ${view}: ${Object.keys(VIEWS).join(", ")}`);
  for (const el of document.querySelectorAll("#hud, #umap-mini, #umap-toggle, #sound-toggle, #gplay, .play-btn")) el.style.display = "none";
  place(view, 0);
  await sleep(settle);
  return { view, ...VIEWS[view], mode: (await front()).mode };
}

/** screen box [x, y, w, h] of world points (only those on screen), padded; null when < 16 px */
function boxOf(pts, W, H) {
  const v = V(), P = v.camera.position.constructor;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
  for (const [x, y, z] of pts) {
    const p = new P(x, y, z).project(v.camera);
    if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) continue;
    const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); n++;
  }
  if (n < 2) return null;
  x0 = Math.max(0, Math.floor(x0 - 4)); y0 = Math.max(0, Math.floor(y0 - 4)); x1 = Math.min(W, Math.ceil(x1 + 4)); y1 = Math.min(H, Math.ceil(y1 + 4));
  return x1 - x0 >= 16 && y1 - y0 >= 16 ? [x0, y0, x1 - x0, y1 - y0] : null;
}
/** the fence (railing, first two runs) and the gate as world sample points (bottom rail .. bar tops) */
function fencePts() {
  const R = [[-309.9, 1154.5], [-293.8, 1142.6], [-285.1, 1136.2]], out = [];
  for (let i = 0; i < R.length - 1; i++) for (let f = 0; f <= 1; f += 0.05) { const x = R[i][0] + (R[i + 1][0] - R[i][0]) * f, z = R[i][1] + (R[i + 1][1] - R[i][1]) * f, y = ground(x, z); out.push([x, y + 0.45, z], [x, y + 2.25, z]); }
  return out;
}
function gatePts() {
  const out = [];
  for (let f = -0.5; f <= 0.5; f += 0.1) { const x = GATE[0] - 0.707 * 5.6 * f, z = GATE[1] - 0.707 * 5.6 * f, y = ground(x, z); out.push([x, y + 0.1, z], [x, y + 2.0, z]); }
  return out;
}
const med = (a) => (a.length ? +[...a].sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(3) : null);

/**
 * One scripted pass at `view`: settle (still), then dolly sideways at `speed` m/s for `frames` frames (start -speed *
 * frames / 120 so the pass is centred). Per crop (fence, gate) the medians. keep: the fence crops of the last frames.
 */
export async function measure({ view = "rail8", speed = 1.5, frames = 60, settle = 30, keep = 0 } = {}) {
  const v = V(), canvas = v.renderer.domElement, W = canvas.width, H = canvas.height;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  const s0 = -speed * frames / 120;
  v.pause(true);
  const res = { view, mode: (await front()).mode, speed, scale: window.cityQuality?.stats?.().scale, size: [W, H] }, kept = [];
  try {
    for (let f = 0; f < settle; f++) { place(view, s0); v.step(1 / 60); if (f % 4 === 0) await sleep(0); }
    const boxes = { fence: boxOf(fencePts(), W, H), gate: boxOf(gatePts(), W, H) };
    const acc = {}, prev = {};
    for (let f = 0; f < frames; f++) {
      place(view, s0 + speed * f / 60);
      v.step(1 / 60);
      g.drawImage(canvas, 0, 0);
      for (const [k, b] of Object.entries(boxes)) {
        if (!b) continue;
        const img = g.getImageData(...b), Y = luma(img), hp = highPass(Y, b[2], b[3]), a = (acc[k] ||= { sh: [], hot: [], fl: [], lv: [] });
        a.lv.push(lapVar(Y, b[2], b[3]));
        if (prev[k]) {
          a.sh.push(tdiff(hp, prev[k].hp)); a.fl.push(tdiff(Y, prev[k].Y));
          let c = 0; for (let i = 0; i < hp.length; i++) if (Math.abs(hp[i] - prev[k].hp[i]) > 8) c++;
          a.hot.push(100 * c / hp.length);
        }
        prev[k] = { hp, Y };
        if (k === "fence" && f >= frames - keep) { const c = new OffscreenCanvas(b[2], b[3]); c.getContext("2d").putImageData(img, 0, 0); kept.push(c); }
      }
      if (f % 4 === 0) await sleep(0);
    }
    for (const [k, b] of Object.entries(boxes)) res[k] = b ? { shimmer: med(acc[k].sh), hot: med(acc[k].hot), flicker: med(acc[k].fl), sharp: +(med(acc[k].lv) ?? 0).toFixed(1), box: b } : null;
  } finally { v.pause(false); }
  if (keep) res.crops = kept;
  return res;
}

/** switch the mode and let its pipelines compile (unpaused) */
async function setMode(m) { const lf = await front(); if (lf.mode !== m) { lf.setMode(m); await sleep(2500); } }

/** modes x views, alternated per round; medians over the rounds -> { rows, runs } */
export async function ab({ modes = ["old", "new", "blend"], views = ["rail3", "rail8", "rail20", "gate3", "gate8", "gate20"], rounds = 2, ...o } = {}) {
  const was = (await front()).mode, out = {};
  try {
    for (let r = 0; r < rounds; r++) {
      const order = r % 2 ? [...modes].reverse() : modes;
      for (const m of order) {
        await setMode(m);
        for (const view of views) (out[`${m} ${view}`] ||= []).push(await measure({ ...o, view }));
      }
    }
  } finally { await setMode(was); }
  const rows = Object.entries(out).map(([k, runs]) => {
    const m = (crop, key) => med(runs.map((x) => x[crop]?.[key]).filter((x) => x != null));
    return { run: k, fence: m("fence", "shimmer"), fenceHot: m("fence", "hot"), fenceSharp: m("fence", "sharp"), gate: m("gate", "shimmer"), gateHot: m("gate", "hot"), gateSharp: m("gate", "sharp") };
  });
  console.table(rows);
  return { rows, runs: out };
}

/** a sheet: n consecutive fence crops (x zoom, nearest) per mode + their frame differences (x4) under */
export async function strip({ view = "rail8", modes = ["old", "new"], n = 8, zoom = 3, ...o } = {}) {
  const was = (await front()).mode, sets = [];
  try { for (const m of modes) { await setMode(m); sets.push([m, (await measure({ ...o, view, keep: n })).crops]); } } finally { await setMode(was); }
  if (!sets[0][1]?.length) throw new Error(`no fence crop at ${view}`);
  const cw = sets[0][1][0].width, ch = sets[0][1][0].height, rowH = ch * zoom;
  const S = new OffscreenCanvas(n * cw * zoom + (n - 1) * 4, sets.length * (2 * rowH + 30) + 8), x = S.getContext("2d");
  x.imageSmoothingEnabled = false; x.fillStyle = "#16181c"; x.fillRect(0, 0, S.width, S.height); x.font = "13px monospace";
  sets.forEach(([m, crops], si) => {
    const y0 = si * (2 * rowH + 30);
    x.fillStyle = "#ddd"; x.fillText(`${m} ${view}  (top: frames, bottom: |frame - previous| x4)`, 4, y0 + 16);
    crops.forEach((c, i) => {
      x.drawImage(c, 0, 0, cw, ch, i * (cw * zoom + 4), y0 + 22, cw * zoom, rowH);
      if (!i) return;
      const a = c.getContext("2d").getImageData(0, 0, cw, ch), b = crops[i - 1].getContext("2d").getImageData(0, 0, cw, ch), d = new ImageData(cw, ch);
      for (let p = 0; p < a.data.length; p += 4) { for (let q = 0; q < 3; q++) d.data[p + q] = Math.min(255, 4 * Math.abs(a.data[p + q] - b.data[p + q])); d.data[p + 3] = 255; }
      const t = new OffscreenCanvas(cw, ch); t.getContext("2d").putImageData(d, 0, 0);
      x.drawImage(t, 0, 0, cw, ch, i * (cw * zoom + 4), y0 + 22 + rowH, cw * zoom, rowH);
    });
  });
  return URL.createObjectURL(await S.convertToBlob({ type: "image/png" }));
}
