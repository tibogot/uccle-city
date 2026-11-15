// MOVING-OBJECT CHECKS for the TAAU's per-instance motion (docs/UPSCALE.md "Moving objects", docs/upscale/motion/).
// The main loop is paused and stepped at a fixed 1/60 s (viewer.step), so a run is a run of real frames whatever the GPU.
//   const M = await import("/debug/motionShots.js");
//   await M.carPass({ ab: true })   -> { url (sheet: crops x zoom, instmotion off row / on row), labels }
//   await M.chase({ ab: true })     -> the camera follows a car (a driving view), crops of the cars round it
//   await M.birds({ ab: true })     -> a flock in view
// ab: the same run twice, window.instMotion.set(false) then (true) (same shaders: a uniform multiplies the motion).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const V = () => window.viewer;

/** a moving traffic car: [index, speed] (fast, a car type, on a straight-ish stretch if possible) */
function pickCar(minV = 8, exclude = new Set(), near = null) {
  const s = window.__traffic.sim, types = window.__traffic.types;
  let best = -1, bd = 1e9;
  for (let i = 0; i < s.cap; i++) {
    if (!s.alive[i] || s.v[i] < minV || exclude.has(i) || types[s.type[i]]?.two) continue;
    const d = near ? Math.hypot(s.x[i] - near[0], s.z[i] - near[1]) : Math.random() * 100;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function project(p, cam, canvas) {
  const v = p.clone().project(cam);
  return [(v.x * 0.5 + 0.5) * canvas.width, (-v.y * 0.5 + 0.5) * canvas.height, v.z];
}

/** one run: before() places the camera each frame, target() -> world point to crop round; grabs at frame numbers */
async function run({ frames, grab, before, target, crop, zoom, row, g, cellW, label, xs = null, dir = 1 }) {
  let nx = 0;
  const v = V(), canvas = v.renderer.domElement, cam = v.camera;
  const out = [], held = v.controls.update;
  v.controls.update = () => {};                         // (the orbit controls would move the camera back)
  for (let f = 0; f < frames; f++) {
    before(f);
    v.step(1 / 60);
    let k = grab.indexOf(f);
    const p = target(f);
    const [sx, sy, sz] = project(p, cam, canvas);
    // grab: at frame numbers, or (xs: screen fractions) when the target crosses those x fractions
    if (xs) { k = -1; const fx = sx / canvas.width; if (sz < 1 && nx < xs.length && (dir > 0 ? fx >= xs[nx] : fx <= 1 - xs[nx])) k = nx++; }
    if (k >= 0) {
      const w = crop, h = Math.round(crop * 0.62);
      g.imageSmoothingEnabled = false;
      g.drawImage(canvas, sx - w / 2, sy - h / 2, w, h, k * (cellW + 4), 30 + row * (cellW * 0.62 + 22), cellW, cellW * 0.62);
      g.fillStyle = "#ddd"; g.font = "13px monospace";
      g.fillText(`${label} f${f}`, k * (cellW + 4) + 4, 30 + row * (cellW * 0.62 + 22) + cellW * 0.62 + 15);
      out.push([f, Math.round(sx), Math.round(sy)]);
      if (xs && nx >= xs.length) break;
    }
    if (f % 3 === 0) await sleep(0);
  }
  v.controls.update = held;
  return out;
}

function sheet(cols, rows, cellW, title) {
  const c = new OffscreenCanvas(cols * (cellW + 4), 30 + rows * (cellW * 0.62 + 22));
  const g = c.getContext("2d");
  g.fillStyle = "#16181c"; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#eee"; g.font = "15px monospace"; g.fillText(title, 6, 19);
  return { c, g };
}
async function finish(c) { const b = await c.convertToBlob({ type: "image/jpeg", quality: 0.92 }); return URL.createObjectURL(b); }
async function toDataURL(url) { const b = await (await fetch(url)).blob(); return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }

/**
 * A traffic car passes a fixed camera `side` m off its lane, `height` m up (a pedestrian / parked-car view).
 * Crops of `crop` px of the canvas round the car, drawn x zoom (nearest), at `grab` frames.
 */
export async function carPass({ ab = true, side = 10, height = 1.5, ahead = 14, frames = 400, xs = [0.3, 0.42, 0.54, 0.66], crop = 260, zoom = 2, minV = 7.3, title = "", variants = null } = {}) {
  const grab = xs;
  const v = V(), s = window.__traffic.sim, THREE = v.camera.position.constructor;
  const cellW = Math.round(crop * zoom), modes = variants ?? (ab ? [false, true] : [true]);
  const { c, g } = sheet(grab.length, modes.length, cellW, title || `traffic car passing a fixed camera ${side} m to the side (crops x${zoom}, internal scale ${window.cityQuality.stats().scale})`);
  v.pause(true);
  const used = new Set(), res = [];
  try {
    for (let r = 0; r < modes.length; r++) {
      const M_ = modes[r];
      if (typeof M_ === "object") { window.instMotion.set(true); M_.set(); } else window.instMotion.set(M_);
      const i = pickCar(minV, used);
      if (i < 0) throw new Error("no moving car");
      used.add(i);
      const fx = Math.sin(s.yaw[i]), fz = Math.cos(s.yaw[i]);
      const px = s.x[i] + fx * ahead - fz * side, pz = s.z[i] + fz * ahead + fx * side;
      const look = new THREE(s.x[i] + fx * ahead, s.y[i] + 0.8, s.z[i] + fz * ahead);
      const camY = s.y[i] + height;
      // warm up at the spot (tiles, LODs, the history)
      const place = () => { v.camera.position.set(px, camY, pz); v.camera.lookAt(look); v.camera.updateMatrixWorld(true); v.controls.target?.copy(look); };
      const tgt = new THREE();
      const out = await run({
        frames, grab: [], xs, dir: side < 0 ? -1 : 1, before: place, crop, zoom, row: r, g, cellW, label: typeof modes[r] === "object" ? modes[r].label : modes[r] ? "instmotion ON " : "instmotion OFF",
        target: () => tgt.set(s.x[i], s.y[i] + 0.75, s.z[i]),
      });
      res.push({ car: i, v: +s.v[i].toFixed(1), at: out });
    }
  } finally { window.instMotion.set(true); v.pause(false); }
  return { url: await finish(c), res };
}

/** the camera follows a car (a chase view, as when driving in traffic): crops round the followed car and its neighbours */
export async function chase({ ab = true, back = 7, up = 2.4, frames = 120, grab = [40, 60, 80, 100], crop = 320, zoom = 2, minV = 7.3, follow = null, title = "", variants = null } = {}) {
  const v = V(), s = window.__traffic.sim, THREE = v.camera.position.constructor;
  const cellW = Math.round(crop * zoom), modes = variants ?? (ab ? [false, true] : [true]);
  const { c, g } = sheet(grab.length, modes.length, cellW, title || `chase camera behind a traffic car (crops x${zoom} round the screen point ahead, scale ${window.cityQuality.stats().scale})`);
  v.pause(true);
  const used = new Set(), res = [];
  try {
    for (let r = 0; r < modes.length; r++) {
      const M_ = modes[r];
      if (typeof M_ === "object") { window.instMotion.set(true); M_.set(); } else window.instMotion.set(M_);
      const i = follow ?? pickCar(minV, used);
      used.add(i);
      const tgt = new THREE(), look = new THREE();
      const place = () => {
        const fx = Math.sin(s.yaw[i]), fz = Math.cos(s.yaw[i]);
        v.camera.position.set(s.x[i] - fx * back, s.y[i] + up, s.z[i] - fz * back);
        look.set(s.x[i] + fx * 8, s.y[i] + 0.8, s.z[i] + fz * 8);
        v.camera.lookAt(look); v.camera.updateMatrixWorld(true);
      };
      const out = await run({ frames, grab, before: place, crop, zoom, row: r, g, cellW, label: typeof modes[r] === "object" ? modes[r].label : modes[r] ? "instmotion ON " : "instmotion OFF", target: () => tgt.set(s.x[i], s.y[i] + 0.9, s.z[i]) });
      res.push({ car: i, at: out });
    }
  } finally { window.instMotion.set(true); v.pause(false); }
  return { url: await finish(c), res };
}

/** a full-canvas grab (debug) */
export async function grab() {
  const cv = V().renderer.domElement, o = new OffscreenCanvas(cv.width, cv.height);
  V().renderFrame(); o.getContext("2d").drawImage(cv, 0, 0);
  return await finish(o);
}
export { toDataURL };

/** grab 3 crops `every` frames apart once the target is well inside the screen (x in 20-80 %) */
async function passRun({ frames, before, target, crop, zoom, row, g, cellW, label, every = 14, n = 3 }) {
  const v = V(), canvas = v.renderer.domElement, cam = v.camera;
  const held = v.controls.update; v.controls.update = () => {};
  const out = []; let first = -1;
  try {
    for (let f = 0; f < frames && out.length < n; f++) {
      before(f);
      v.step(1 / 60);
      const p = target(f);
      if (!p) continue;
      const [sx, sy, sz] = project(p, cam, canvas);
      const inside = sz < 1 && sx > canvas.width * 0.2 && sx < canvas.width * 0.8 && sy > 0 && sy < canvas.height;
      if (first < 0 && inside) first = f;
      if (first >= 0 && (f - first) % every === 0 && inside) {
        const k = out.length, w = crop, h = Math.round(crop * 0.62), y0 = 30 + row * (cellW * 0.62 + 22);
        g.imageSmoothingEnabled = false;
        g.drawImage(canvas, sx - w / 2, sy - h / 2, w, h, k * (cellW + 4), y0, cellW, cellW * 0.62);
        g.fillStyle = "#ddd"; g.font = "13px monospace"; g.fillText(`${label} f${f}`, k * (cellW + 4) + 4, y0 + cellW * 0.62 + 15);
        out.push([f, Math.round(sx), Math.round(sy)]);
      }
      if (f % 3 === 0) await sleep(0);
    }
  } finally { v.controls.update = held; }
  return out;
}

/** a tram passes a fixed camera `side` m off the track (A/B instmotion off / on, a tram each) */
export async function tramPass({ rewind = 0, ab = true, side = 12, height = 2, ahead = 30, frames = 900, crop = 420, zoom = 1.4, every = 14, title = "" } = {}) {
  const v = V(), T = v.tram(), THREE = v.camera.position.constructor;
  const cellW = Math.round(crop * zoom), modes = ab ? [false, true] : [true];
  const { c, g } = sheet(3, modes.length, cellW, title || `tram passing a fixed camera ${side} m off the track (crops x${zoom}, scale ${window.cityQuality.stats().scale})`);
  v.pause(true);
  const res = [], used = new Set(), c0 = T.clockSecs - rewind;
  try {
    for (let r = 0; r < modes.length; r++) {
      window.instMotion.set(modes[r]);
      T.setClock(c0); used.clear();                       // (the same tram, the same pass, for each mode)
      const cp = v.camera.position;
      // the nearest moving tram to the camera
      const a = T.positions(); v.step(1 / 60); await sleep(50); v.step(1 / 60);
      const b = new Map(T.positions().map((p) => [p.trip, p]));
      let best = null, bd = 1e9;
      for (const p of a) { const q = b.get(p.trip); if (!q || used.has(p.trip) || Math.abs(q.d - p.d) < 0.05) continue; const d = Math.hypot(p.x - cp.x, p.z - cp.z); if (d < bd) { bd = d; best = q; } }
      if (!best) throw new Error("no moving tram");
      used.add(best.trip);
      const dx = Math.cos(best.yaw), dz = -Math.sin(best.yaw);
      const P = new THREE(best.x + dx * ahead, T.railTop(best.x + dx * ahead, best.z + dz * ahead) + 1.6, best.z + dz * ahead);
      const C = new THREE(P.x + dz * side, P.y + height, P.z - dx * side);
      const tgt = new THREE();
      const out = await passRun({
        frames, crop, zoom, row: r, g, cellW, every, label: modes[r] ? "instmotion ON " : "instmotion OFF",
        before: () => { v.camera.position.copy(C); v.camera.lookAt(P); v.camera.updateMatrixWorld(true); },
        target: () => { const q = T.positions().find((p) => p.trip === best.trip); if (!q) return null; const qx = Math.cos(q.yaw), qz = -Math.sin(q.yaw); return tgt.set(q.x - qx * 6, P.y, q.z - qz * 6); },
      });
      res.push({ trip: best.trip, at: out });
    }
  } finally { window.instMotion.set(true); v.pause(false); }
  return { url: await finish(c), res };
}

/** a bird of the sky flocks passing a fixed camera `dist` m away (A/B instmotion off / on, the flock read back each run;
 *  the crop follows the bird's read-back position + velocity x time) */
export async function birdPass({ ab = true, dist = 22, frames = 40, grab = [16, 24, 32], crop = 160, zoom = 3, title = "" } = {}) {
  const v = V(), S = window.__birds.sky, THREE = v.camera.position.constructor;
  const cellW = Math.round(crop * zoom), modes = ab ? [false, true] : [true];
  const { c, g } = sheet(grab.length, modes.length, cellW, title || `a bird of the sky flocks passing ${dist} m from a fixed camera (crops x${zoom}, scale ${window.cityQuality.stats().scale})`);
  v.pause(true);
  const res = [];
  try {
    for (let r = 0; r < modes.length; r++) {
      window.instMotion.set(modes[r]);
      v.step(1 / 60);
      const a = await S.readBirds(), cp = v.camera.position;
      let i = -1, bd = 1e9;
      for (let k = 0; k < a.length / 12; k++) { const y = a[k * 12 + 1]; if (y < -1000) continue; const d = Math.hypot(a[k * 12] - cp.x, y - cp.y, a[k * 12 + 2] - cp.z); if (d < bd) { bd = d; i = k; } }
      const p0 = new THREE(a[i * 12], a[i * 12 + 1], a[i * 12 + 2]), vel = new THREE(a[i * 12 + 4], a[i * 12 + 5], a[i * 12 + 6]);
      const mid = p0.clone().addScaledVector(vel, 24 / 60);
      const side = new THREE(vel.z, 0, -vel.x).normalize();
      const C = mid.clone().addScaledVector(side, dist).add(new THREE(0, -3, 0));
      const tgt = new THREE();
      const out = await run({
        frames, grab, before: () => { v.camera.position.copy(C); v.camera.lookAt(mid); v.camera.updateMatrixWorld(true); },
        target: (f) => tgt.copy(p0).addScaledVector(vel, (f + 1) / 60), crop, zoom, row: r, g, cellW,
        label: modes[r] ? "instmotion ON " : "instmotion OFF",
      });
      res.push({ bird: i, speed: +vel.length().toFixed(1), at: out });
    }
  } finally { window.instMotion.set(true); v.pause(false); }
  return { url: await finish(c), res };
}
