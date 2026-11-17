// THE POLICE CAR'S REAR WHILE DRIVING (claude/policerear, TODO 8c, docs/POLICEREAR.md): a scripted, repeatable drive in
// the default chase view; the car's REAR is cropped (its body's rear face projected to the screen) and measured frame to
// frame. The main loop is paused and stepped at 1/60 s (viewer.step, as debug/sharpCheck.js): the same frames whatever
// the GPU; each run starts from the same pose with the same inputs, so two runs differ only by the knob switched.
//   ?quick=1&place=stjob-street&view=drive&dynres=0&rscale=0.8     (or the police game: ?game=police, car on the street)
//   const R = await import("/debug/rearCheck.js");
//   await R.police()                      quick drive mode: the game's police car (material, kit, plate) on the driver
//   await R.measure({ label })            -> { parked, straight, turn }: per phase the medians over the frames of
//        shimmer  mean |high-pass(Y_t) - high-pass(Y_t-1)| on the rear crop (x / 255): lines blinking / crawling
//        hot      % of crop pixels whose high-pass changed > 8 / 255 in a frame (localised line flicker)
//        flicker  mean |Y_t - Y_t-1| (x / 255)       sharp  Laplacian variance of the crop (a fix that only blurs shows here)
//   await R.ab({ rounds: 2 })             every knob state (KNOBS: old = every fix off, new = all on, each fix alone on top
//                                         of old, the isolation states), alternated per round; a table + the sheets
//   await R.strip({ knob: "old" })        8 consecutive rear crops (x3) + their differences (x4): a sheet url
//   R.show(url) / R.hide()                (debug/sharpCheck.js: a sheet full-window, for the DevTools screenshot)
import { luma, highPass, lapVar, tdiff, show, hide } from "./sharpCheck.js";
export { show, hide };
const V = () => window.viewer;
const D = () => window.__driver;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** quick drive mode (no game kit): put the police game's car (its material, kit and plate) on the drive mode's car */
export async function police() {
  const d = D();
  if (!d?.on) throw new Error("drive mode off (?quick=1&place=...&view=drive)");
  if (d.spec?.startsWith("police:")) return d.spec;          // (the police game's car already)
  const { PoliceCar } = await import("/viewer/police/policeCar.js");
  const pc = new PoliceCar({ driver: d, kit: { audio: { ready: () => null } } });
  await pc.install();
  window.__rearPolice = pc;
  for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r));   // pipelines
  return d.spec;
}

// ---- the knobs (live: uniforms / visibility, no rebuild; the plate's own mesh, the player material's playerLook)
let PL = null, PK = null;
const look = async () => { if (!PL) ({ playerLook: PL, packLook: PK } = await import("/viewer/drive/carPacks.js")); return PL; };
const plateMesh = () => { let m = null; D()?.car?.root.traverse((o) => { if (o.name === "player-plate") m = o; }); return m; };
const carMeshes = () => { const a = []; D()?.car?.root.traverse((o) => { if (o.isMesh) a.push(o); }); return a; };
const FIX = {
  plate: (on) => { const m = plateMesh(); if (m) m.visible = on; return !!m; },
  spec: (on) => { PL.specAA.value = on ? 1 : 0; return true; },
  ssr: (on) => { PL.noSsr.value = on ? 1 : 0; return true; },
  seam: (on) => { PL.seam.value = on ? 1 : 0; return true; },
};
// isolation states (on top of "new"): what else could make the lines
const ISO = {
  "ssr-all-off": { set: () => { const u = window.cityQuality?._pipe?.uniforms?.ssr; const v = u?.value; if (u) u.value = 0; return () => { if (u) u.value = v; }; } },
  "clearcoat-off": { set: () => { const v = PK.clearcoat.value; PK.clearcoat.value = 0; return () => { PK.clearcoat.value = v; }; } },
  "no-self-shadow": { set: () => { const ms = carMeshes(), r = ms.map((m) => m.receiveShadow); ms.forEach((m) => { m.receiveShadow = false; }); return () => ms.forEach((m, i) => { m.receiveShadow = r[i]; }); } },
  "instmotion-off": { set: () => { const im = window.instMotion; const was = im?.on; im?.set?.(false); return () => im?.set?.(was ?? true); } },
};
export const KNOBS = ["old", "new", "old+plate", "old+spec", "old+ssr", "old+seam", "new+ssr-all-off", "new+clearcoat-off", "new+no-self-shadow"];
/** set a knob state; returns the undo */
async function setKnob(k) {
  await look();
  const [base, extra] = k.split("+");
  const on = base === "new";
  for (const f of Object.values(FIX)) f(on);
  let undo = () => {};
  if (extra && FIX[extra]) FIX[extra](true);
  else if (extra && ISO[extra]) undo = ISO[extra].set();
  return () => { undo(); for (const f of Object.values(FIX)) f(true); };
}

/** the car's rear on screen: the body's box rear face (x within 85 %, 0.25 m .. 90 % of its height), inset 8 % */
function rearBox(W, H) {
  const d = D(), v = V(), car = d.car;
  const body = car.chassis.children.find((o) => o.isMesh && o.geometry) || car.chassis.children[0];
  const g = body.geometry; if (!g.boundingBox) g.computeBoundingBox();
  const b = g.boundingBox, P = body.position.constructor;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const x of [b.min.x * 0.85, b.max.x * 0.85]) for (const y of [b.min.y + 0.25, b.min.y + (b.max.y - b.min.y) * 0.9]) for (const z of [b.min.z, b.min.z + 0.35]) {
    const p = body.localToWorld(new P(x, y, z)).project(v.camera);
    const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const iw = (x1 - x0) * 0.08, ih = (y1 - y0) * 0.08;
  x0 = Math.max(0, Math.round(x0 + iw)); y0 = Math.max(0, Math.round(y0 + ih)); x1 = Math.min(W, Math.round(x1 - iw)); y1 = Math.min(H, Math.round(y1 - ih));
  return [x0, y0, Math.max(8, x1 - x0), Math.max(8, y1 - y0)];
}

const med = (a) => (a.length ? +[...a].sort((x, y) => x - y)[Math.floor(a.length / 2)].toFixed(3) : null);
let POSE = null;

/**
 * One scripted run from `pose` (default: where the car stood at the first call, kept for every later run): parked
 * (handbrake, `frames` frames), then accelerate to `speed` and drive straight (`frames`), then steer `steer` for
 * `turnFrames`. Per phase the medians (see the header). keep: the crops of the straight phase (for strip()).
 */
export async function measure({ label = "", speed = 14, steer = 0.3, frames = 60, turnFrames = 45, settle = 40, keep = 0, pose = null } = {}) {
  const v = V(), d = D();
  if (!d?.on || !d.car) throw new Error("drive mode off");
  POSE = pose || POSE || { x: d.state.x, z: d.state.z, heading: d.state.heading };
  const canvas = v.renderer.domElement, W = canvas.width, H = canvas.height;
  const g = new OffscreenCanvas(W, H).getContext("2d", { willReadFrequently: true });
  v.pause(true);
  const res = { label, scale: window.cityQuality?.stats?.().scale, size: [W, H] }, kept = [];
  const save = d.startPose;
  try {
    d.startPose = { ...POSE }; d.reset(); d.startPose = save;
    const sp = () => d.state.speed ?? Math.hypot(d.state.vx || 0, d.state.vz || 0);
    const run = async (name, n, input) => {
      let box = null, prev = null;
      const sh = [], hot = [], fl = [], lv = [];
      for (let f = 0; f < n; f++) {
        d.autoInput = input(f);
        v.step(1 / 60);
        if (!box) box = rearBox(W, H);
        g.drawImage(canvas, 0, 0);
        const [bx, by, bw, bh] = box, img = g.getImageData(bx, by, bw, bh), Y = luma(img), hp = highPass(Y, bw, bh);
        lv.push(lapVar(Y, bw, bh));
        if (prev) {
          sh.push(tdiff(hp, prev.hp)); fl.push(tdiff(Y, prev.Y));
          let c = 0; for (let i = 0; i < hp.length; i++) if (Math.abs(hp[i] - prev.hp[i]) > 8) c++;
          hot.push(100 * c / hp.length);
        }
        prev = { hp, Y };
        if (name === "straight" && f >= n - keep) { const c = new OffscreenCanvas(bw, bh); c.getContext("2d").putImageData(img, 0, 0); kept.push(c); }
        if (f % 4 === 0) await sleep(0);
      }
      res[name] = { shimmer: med(sh), hot: med(hot), flicker: med(fl), sharp: +(med(lv) ?? 0).toFixed(1), kmh: Math.round(sp() * 3.6), box };
    };
    for (let f = 0; f < settle; f++) { d.autoInput = { throttle: 0, steer: 0, handbrake: true }; v.step(1 / 60); if (f % 4 === 0) await sleep(0); }
    await run("parked", Math.min(frames, 40), () => ({ throttle: 0, steer: 0, handbrake: true }));
    // accelerate (bang-bang to the speed), then the straight
    for (let f = 0; f < 400; f++) {
      const s = sp();
      d.autoInput = { throttle: s < speed ? 1 : 0, steer: 0, handbrake: false };
      v.step(1 / 60);
      if (Math.abs(s - speed) < 0.6 && f > 60) break;
      if (f % 4 === 0) await sleep(0);
    }
    const hold = (st) => () => { const s = sp(); return { throttle: s < speed ? 1 : 0, steer: st, handbrake: false }; };
    await run("straight", frames, hold(0));
    if (turnFrames) await run("turn", turnFrames, hold(steer));
  } finally { d.autoInput = null; v.pause(false); }
  if (keep) res.crops = kept;
  return res;
}

/** every knob state, alternated per round; medians over the rounds; -> { table, rows } */
export async function ab({ knobs = KNOBS, rounds = 2, ...o } = {}) {
  const out = {};
  for (let r = 0; r < rounds; r++) {
    const order = r % 2 ? [...knobs].reverse() : knobs;
    for (const k of order) {
      const undo = await setKnob(k);                          // (each run resets the car: a camera cut, a fresh history)
      try { (out[k] ||= []).push(await measure({ ...o, label: k })); } finally { undo(); }
    }
  }
  const rows = Object.entries(out).map(([k, runs]) => {
    const m = (ph, key) => med(runs.map((x) => x[ph]?.[key]).filter((x) => x != null));
    return { knob: k, parked: m("parked", "shimmer"), straight: m("straight", "shimmer"), straightHot: m("straight", "hot"), turn: m("turn", "shimmer"), turnHot: m("turn", "hot"), sharpStraight: m("straight", "sharp"), kmh: m("straight", "kmh") };
  });
  console.table(rows);
  return { rows, runs: out };
}

/** a sheet: 8 consecutive rear crops of the straight (x3, nearest) for each knob, their frame differences (x4) under */
export async function strip({ knobs = ["old", "new"], n = 8, zoom = 3, ...o } = {}) {
  const sets = [];
  for (const k of knobs) {
    const undo = await setKnob(k);
    try { sets.push([k, (await measure({ ...o, keep: n, turnFrames: 0 })).crops]); } finally { undo(); }
  }
  const cw = sets[0][1][0].width, ch = sets[0][1][0].height, Wd = n * cw * zoom + (n - 1) * 4, rowH = ch * zoom;
  const S = new OffscreenCanvas(Wd, sets.length * (2 * rowH + 30) + 8);
  const x = S.getContext("2d");
  x.imageSmoothingEnabled = false;
  x.fillStyle = "#16181c"; x.fillRect(0, 0, S.width, S.height);
  x.font = "13px monospace";
  sets.forEach(([k, crops], si) => {
    const y0 = si * (2 * rowH + 30);
    x.fillStyle = "#ddd"; x.fillText(`${k}  ${location.search.slice(0, 90)}  (top: frames, bottom: |frame - previous| x4)`, 4, y0 + 16);
    crops.forEach((c, i) => {
      x.drawImage(c, 0, 0, cw, ch, i * (cw * zoom + 4), y0 + 22, cw * zoom, rowH);
      if (i) {
        const a = c.getContext("2d").getImageData(0, 0, cw, ch), b = crops[i - 1].getContext("2d").getImageData(0, 0, cw, ch), dimg = new ImageData(cw, ch);
        for (let p = 0; p < a.data.length; p += 4) { for (let q = 0; q < 3; q++) dimg.data[p + q] = Math.min(255, 4 * Math.abs(a.data[p + q] - b.data[p + q])); dimg.data[p + 3] = 255; }
        const t = new OffscreenCanvas(cw, ch); t.getContext("2d").putImageData(dimg, 0, 0);
        x.drawImage(t, 0, 0, cw, ch, i * (cw * zoom + 4), y0 + 22 + rowH, cw * zoom, rowH);
      }
    });
  });
  const blob = await S.convertToBlob({ type: "image/png" });
  return URL.createObjectURL(blob);
}
