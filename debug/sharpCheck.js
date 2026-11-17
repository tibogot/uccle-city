// SHARPNESS + STABILITY CHECKS (claude/sharp, 2026-11-17; docs/UPSCALE.md "Sharp while moving"). Browser gates listed
// by tools/audit/mergeGate.mjs. The main loop is paused and stepped at 1/60 s (viewer.step): the same frames whatever
// the GPU. Needs the drive mode for drive() (?quick=1&place=...&view=drive, or the police game).
//   const S = await import("/debug/sharpCheck.js");
//   await S.motionCoverage()        -> { pass, fail: [names], ... } every mesh that moved over 30 frames has a motion source
//   await S.drive({ speed: 14 })    -> parked vs driving: sharpness (Laplacian variance) of the street, the followed car's
//                                     frame-to-frame noise (shimmer), the upper image's noise (foliage sparkle) + a sheet
//   S.show(url) / S.hide()          a sheet full-window over the canvas (for a screenshot to docs/sharp/)
const V = () => window.viewer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** every mesh that moves (its matrix, its instance matrices, its skeleton) must reach the TAAU's motion MRT */
export async function motionCoverage({ frames = 30 } = {}) {
  const v = V(), snap = new Map();
  v.scene.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) snap.set(o, { m: o.matrixWorld.clone(), iv: o.instanceMatrix?.version ?? -1, vis: 0 }); });
  for (let f = 0; f < frames; f++) { await new Promise((r) => requestAnimationFrame(r)); for (const [o, s] of snap) if (o.visible) s.vis++; }
  const inst = !!window.instMotion?.on, out = { rigid: 0, instanced: [], skinned: [], fail: [], deformers: [] };
  for (const [o, s] of snap) {
    if (!s.vis) continue;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const hasDelta = mats.some((m) => m?.motionDeltaNode);
    const name = `${o.parent?.name || ""}/${o.name || o.type}`;
    if (o.isInstancedMesh && o.instanceMatrix.version !== s.iv) {
      if (hasDelta || o.userData.ipBase !== undefined) out.instanced.push(name); else out.fail.push(`${name} (instance matrices re-written, no motion delta)`);
    } else if (o.isSkinnedMesh) {
      (inst ? out.skinned : out.fail).push(name);
    } else if (!o.matrixWorld.equals(s.m)) out.rigid++;
    if (mats.some((m) => m?.positionNode) && !hasDelta && !o.isSkinnedMesh) out.deformers.push(name);
  }
  out.deformers = [...new Set(out.deformers)].slice(0, 40);
  out.pass = out.fail.length === 0;
  return out;
}

// ---- image metrics on canvas crops
export function luma(img) {
  const d = img.data, Y = new Float32Array(img.width * img.height);
  for (let i = 0; i < Y.length; i++) Y[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  return Y;
}
/** variance of the 4-neighbour Laplacian: higher = sharper (a blur lowers it, a hard alias raises it a bit too) */
export function lapVar(Y, w, h) {
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, l = 4 * Y[i] - Y[i - 1] - Y[i + 1] - Y[i - w] - Y[i + w];
    s += l; s2 += l * l; n++;
  }
  const m = s / n; return s2 / n - m * m;
}
/** the high-pass of a crop (Y - its 3 x 3 box blur): shimmer lives there; a shadow sweeping over the car does not */
export function highPass(Y, w, h) {
  const o = new Float32Array(Y.length);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += Y[i + dy * w + dx];
    o[i] = Y[i] - s / 9;
  }
  return o;
}
/** mean |Y_t - Y_t-1| */
export const tdiff = (A, B) => { let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]); return s / A.length; };

/**
 * Parked then driving straight at `speed` m/s (the drive mode's own car, autoInput): per phase the median over
 * `frames` frames of: street sharpness (Laplacian variance of the lower half, the car masked out), the followed car's
 * shimmer (frame-to-frame luma change in a box round it: it stays put on screen), the upper image's noise (foliage /
 * sky; parked only: driving moves it). A sheet: the car crop parked / driving, the street crop parked / driving.
 */
export async function drive({ speed = 14, frames = 60, settle = 90, label = location.search, rear = [0.43, 0.62, 0.14, 0.15] } = {}) {
  const v = V(), d = window.__driver;
  if (!d?.on || !d.car) throw new Error("drive mode off (open with &view=drive or start the police game)");
  const canvas = v.renderer.domElement, W = canvas.width, H = canvas.height;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  v.pause(true);
  const res = {}, crops = {};
  try {
    for (const phase of ["parked", "driving"]) {
      const target = phase === "parked" ? 0 : speed;
      // settle: reach the speed (bang-bang throttle), the history converges
      for (let f = 0; f < settle + (target ? 200 : 0); f++) {
        const sp = d.state.speed ?? Math.hypot(d.state.vx || 0, d.state.vz || 0);
        d.autoInput = { throttle: target ? (sp < target ? 1 : 0) : (sp > 0.2 ? -1 : 0), steer: 0, handbrake: !target && sp < 0.5 };
        v.step(1 / 60);
        if (target && f > settle && Math.abs(sp - target) < 0.6) break;
        if (f % 4 === 0) await sleep(0);
      }
      const lv = [], cn = [], un = [], rn = [];
      let prevCar = null, prevUp = null, prevRear = null;
      const RX = Math.round(rear[0] * W), RY = Math.round(rear[1] * H), RW = Math.round(rear[2] * W), RH = Math.round(rear[3] * H);
      for (let f = 0; f < frames; f++) {
        const sp = d.state.speed ?? 0;
        d.autoInput = { throttle: target ? (sp < target ? 1 : 0) : 0, steer: 0, handbrake: !target };
        v.step(1 / 60);
        g.drawImage(canvas, 0, 0);
        // the car's box on screen (its root projected + its size)
        const p = d.car.root.getWorldPosition(new (d.car.root.position.constructor)()).project(v.camera);
        const cx = Math.round((p.x * 0.5 + 0.5) * W), cy = Math.round((-p.y * 0.5 + 0.5) * H);
        const bw = Math.round(W * 0.26), bh = Math.round(H * 0.24), bx = Math.max(0, cx - bw / 2), by = Math.max(0, Math.min(H - bh, cy - bh * 0.75));
        const car = luma(g.getImageData(bx, by, bw, bh));
        if (prevCar) cn.push(tdiff(car, prevCar));
        prevCar = car;
        // the car's rear (plate, lamps, panel lines) only: a fixed screen box (the chase camera holds the car still)
        const rr = highPass(luma(g.getImageData(RX, RY, RW, RH)), RW, RH);
        if (prevRear) rn.push(tdiff(rr, prevRear));
        prevRear = rr;
        // the street: lower half, left + right of the car box
        const sy = Math.round(H * 0.5), sh = Math.round(H * 0.45), sw = Math.round(W * 0.3);
        lv.push((lapVar(luma(g.getImageData(0, sy, sw, sh)), sw, sh) + lapVar(luma(g.getImageData(W - sw, sy, sw, sh)), sw, sh)) / 2);
        const up = luma(g.getImageData(0, 0, W, Math.round(H * 0.4)));
        if (prevUp && !target) un.push(tdiff(up, prevUp));
        prevUp = up;
        if (f === frames - 1) {
          const c = new OffscreenCanvas(bw, bh); c.getContext("2d").drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh); crops[`car_${phase}`] = c;
          const s = new OffscreenCanvas(sw, sh); s.getContext("2d").drawImage(canvas, W - sw, sy, sw, sh, 0, 0, sw, sh); crops[`street_${phase}`] = s;
        }
        if (f % 4 === 0) await sleep(0);
      }
      const med = (a) => (a.length ? +[...a].sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(2) : null);
      res[phase] = { speed: +(d.state.speed ?? 0).toFixed(1), sharp: med(lv), carShimmer: med(cn), rearShimmer: med(rn), upperNoise: med(un) };
    }
  } finally { d.autoInput = null; v.pause(false); }
  res.drivingVsParked = +(res.driving.sharp / res.parked.sharp).toFixed(3);
  res.scale = window.cityQuality?.stats?.().scale;
  // the sheet: car parked | car driving / street parked | street driving
  const cw = crops.car_parked.width, ch = crops.car_parked.height, sw = crops.street_parked.width, sh = crops.street_parked.height;
  const S = new OffscreenCanvas(Math.max(2 * cw, 2 * sw) + 12, 30 + ch + sh + 40);
  const x = S.getContext("2d");
  x.fillStyle = "#16181c"; x.fillRect(0, 0, S.width, S.height);
  x.fillStyle = "#ddd"; x.font = "13px monospace";
  x.fillText(`${label}  scale ${res.scale}  sharp parked ${res.parked.sharp} driving ${res.driving.sharp} (x${res.drivingVsParked})  rear shimmer ${res.parked.rearShimmer} / ${res.driving.rearShimmer}`, 4, 18);
  x.drawImage(crops.car_parked, 0, 26); x.drawImage(crops.car_driving, cw + 8, 26);
  x.drawImage(crops.street_parked, 0, 34 + ch); x.drawImage(crops.street_driving, sw + 8, 34 + ch);
  const b = await S.convertToBlob({ type: "image/jpeg", quality: 0.92 });
  res.url = URL.createObjectURL(b);
  return res;
}

/** a sheet full-window (for the DevTools screenshot), hide() removes it */
export function show(url) {
  hide();
  const im = document.createElement("img");
  im.id = "__sharpSheet"; im.src = url;
  Object.assign(im.style, { position: "fixed", left: "0", top: "0", zIndex: 99999, background: "#16181c", maxWidth: "100vw", maxHeight: "100vh", imageRendering: "pixelated" });
  document.body.appendChild(im);
}
export function hide() { document.getElementById("__sharpSheet")?.remove(); }

/**
 * Temporal stability while PARKED (nothing moves but the jitter, the wind, the dither phases): per screen box (x, y, w,
 * h as fractions) the median over `frames` of the mean |high-pass(Y_t) - high-pass(Y_t-1)| (sparkle, shimmer) and
 * of |Y_t - Y_t-1| (flicker). boxes: { name: [x, y, w, h] }.
 */
export async function stability({ frames = 40, warm = 30, boxes = { foliage: [0.27, 0.22, 0.2, 0.2], facade: [0.62, 0.15, 0.3, 0.3], road: [0.3, 0.75, 0.4, 0.2] } } = {}) {
  const v = V(), d = window.__driver, canvas = v.renderer.domElement, W = canvas.width, H = canvas.height;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  v.pause(true);
  const prev = {}, hp = {}, fl = {};
  try {
    for (let f = 0; f < warm + frames; f++) {
      if (d?.on) d.autoInput = { throttle: 0, steer: 0, handbrake: true };
      v.step(1 / 60);
      if (f < warm) { if (f % 4 === 0) await sleep(0); continue; }
      g.drawImage(canvas, 0, 0);
      for (const [k, [x, y, w, h]] of Object.entries(boxes)) {
        const X = Math.round(x * W), Y = Math.round(y * H), BW = Math.round(w * W), BH = Math.round(h * H);
        const Yl = luma(g.getImageData(X, Y, BW, BH)), Hp = highPass(Yl, BW, BH);
        if (prev[k]) { (hp[k] ||= []).push(tdiff(Hp, prev[k].hp)); (fl[k] ||= []).push(tdiff(Yl, prev[k].y)); }
        prev[k] = { hp: Hp, y: Yl };
      }
      if (f % 4 === 0) await sleep(0);
    }
  } finally { if (d) d.autoInput = null; v.pause(false); }
  const med = (a) => +[...a].sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(3);
  return Object.fromEntries(Object.keys(boxes).map((k) => [k, { sparkle: med(hp[k]), flicker: med(fl[k]) }]));
}
