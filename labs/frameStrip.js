// FRAME STRIPS + POSE CHECKS (Character Lab): look at the character MOVE, frame by frame, not at averages.
//
//   s = stripSession(lab, { scen: "stairs up 15 walk", from: 1.0, frames: 36, fps: 60, cams: ["feet side", "body side"] })
//     -> a PNG data URL: a contact sheet, one row per camera... per frame a cell (camera views side by side), the
//        frame's time, the graph's mode, each foot planted (▼) or swinging (△) by the clip, its IK offset (cm), the knee
//        angles, and a RED border + the reason when a pose check fails in that frame.
//   fps: the simulated frame rate (60 = normal speed; 240 = slow motion: four times the frames per step cycle).
//
// POSE CHECKS (per frame, per leg; labs/footProbe.js measures the rest):
//   knee backwards    the knee on the wrong side of the hip -> ankle line (against the foot's heading), > 1 cm
//   knee locked       thigh-shin angle > 179 deg (hyperextended / snapped straight)
//   planted gap       a foot the CLIP has down: its sole (lower of heel / toe) more than 3 cm above or into the ground
//   jump              an ankle's or the pelvis' second difference (a pop between two frames): > 2.5 cm (ankle) / 1.2 cm
//                     (pelvis) at 60 fps, scaled by (dt * 60)^2 for other rates
import * as THREE from "three/webgpu";

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _p = new THREE.Vector3(), _f = new THREE.Vector3();

/** Per-frame pose checks over a run of frames (call frame() after each tp.update). */
export class PoseCheck {
  constructor(tp, probe) { this.tp = tp; this.probe = probe; this.reset(); }
  reset() { this.hist = []; this.counts = { kneeBack: 0, kneeLocked: 0, gap: 0, ankleJump: 0, pelvisJump: 0 }; this.frames = 0; this.worst = { gap: 0, ankleJump: 0, pelvisJump: 0, kneeMin: 180, kneeMax: 0 }; }
  /** Returns { flags: [strings], legs: [{ knee, planted, gap, off }], pelvisY }. */
  frame(dt) {
    const tp = this.tp, body = tp.body, IK = body.legIK || body.footIK, probe = this.probe;
    if (!IK || !probe.feet) return null;
    body.root.updateMatrixWorld(true);
    const out = { flags: [], legs: [] }, s60 = (dt * 60) ** 2;
    const hist = this.hist;
    const cur = { ank: [], pel: 0 };
    for (let i = 0; i < 2; i++) {
      const L = IK.legs[i], f = probe.feet[i];
      L.upper.getWorldPosition(_a); L.lower.getWorldPosition(_b); L.end.getWorldPosition(_c);
      const knee = _p.subVectors(_a, _b).angleTo(_f.subVectors(_c, _b)) * 180 / Math.PI;
      // the knee's side: its offset from the hip -> ankle line, along the foot's heading
      f.hw.copy(f.heel).applyMatrix4(L.foot.matrixWorld); f.tw.copy(f.toe).applyMatrix4(f.toeBone.matrixWorld);
      // (against the BODY's facing: a foot pointing down / back in a run's back-kick has no usable heading)
      const ry = tp.body.root.rotation.y, hx = Math.sin(ry), hz = Math.cos(ry), hl = 1;
      _p.subVectors(_c, _a); const l2 = _p.lengthSq() || 1;
      const u = _f.subVectors(_b, _a).dot(_p) / l2;
      const ox = _b.x - (_a.x + _p.x * u), oz = _b.z - (_a.z + _p.z * u);
      const side = (ox * hx + oz * hz) / hl;
      const planted = (L.contact ?? 0) > 0.6;
      const gh = probe.ground(f.hw.x, f.hw.y, f.hw.z), gt = probe.ground(f.tw.x, f.tw.y, f.tw.z);
      const gap = Math.min(gh === null ? 9 : f.hw.y - gh, gt === null ? 9 : f.tw.y - gt);
      if (side < -0.01 && knee < 175) { out.flags.push(`${i ? "R" : "L"} knee backwards ${(side * 100).toFixed(0)} cm`); this.counts.kneeBack++; }
      if (knee > 179) { out.flags.push(`${i ? "R" : "L"} knee locked ${knee.toFixed(1)}°`); this.counts.kneeLocked++; }
      if (planted && tp.ctl.grounded && Math.abs(gap) > 0.03) { out.flags.push(`${i ? "R" : "L"} planted gap ${(gap * 100).toFixed(1)} cm`); this.counts.gap++; }
      if (planted && tp.ctl.grounded) this.worst.gap = Math.max(this.worst.gap, Math.abs(gap));
      this.worst.kneeMin = Math.min(this.worst.kneeMin, knee); this.worst.kneeMax = Math.max(this.worst.kneeMax, knee);
      cur.ank.push(_c.clone());
      out.legs.push({ knee, planted, gap, off: L.off ?? 0, side });
    }
    const hips = probe.hipsBone;
    if (hips) { hips.getWorldPosition(_p); cur.pel = _p.y; }
    hist.push(cur); if (hist.length > 3) hist.shift();
    if (hist.length === 3) {
      const [a, b, c] = hist;
      for (let i = 0; i < 2; i++) {
        const d = Math.hypot(c.ank[i].x - 2 * b.ank[i].x + a.ank[i].x, c.ank[i].y - 2 * b.ank[i].y + a.ank[i].y, c.ank[i].z - 2 * b.ank[i].z + a.ank[i].z) / s60;
        this.worst.ankleJump = Math.max(this.worst.ankleJump, d);
        if (d > 0.025) { out.flags.push(`${i ? "R" : "L"} ankle jump ${(d * 100).toFixed(1)} cm`); this.counts.ankleJump++; }
      }
      const dp = Math.abs(c.pel - 2 * b.pel + a.pel) / s60;
      this.worst.pelvisJump = Math.max(this.worst.pelvisJump, dp);
      if (dp > 0.012) { out.flags.push(`pelvis jump ${(dp * 100).toFixed(1)} cm`); this.counts.pelvisJump++; }
    }
    out.pelvisY = cur.pel;
    this.frames++;
    return out;
  }
}

/**
 * A frame-strip SESSION, stepped from outside: a WebGPU canvas can't be copied reliably from inside the page, so each
 * view is a real screenshot of the presented frame (the driver, tools/characters/strip.mjs). The calls:
 *   s = stripSession(lab, o); while (s.next()) for each camera ci { s.view(ci); <screenshot s.region()>; await s.add(ci, url) }
 *   s.finish() -> { url, flagged, counts, worst, frames }
 * o: { scen, fps (60 = normal speed, 240 = 4x slow motion), from (s), frames, every, cams, w, h, cols, note }.
 * The lab's own loop is paused meanwhile (lab.pause).
 */
export function stripSession(lab, o) {
  const { tp, probe, camera } = lab;
  const sc = typeof o.scen === "string" ? lab.SCEN[o.scen] : o.scen;
  const fps = o.fps || 60, dt = 1 / fps, frames = o.frames || 32, every = o.every || 1;
  const cams = o.cams || ["feet side"], W = o.w || 220, H = o.h || 260, cols = o.cols || Math.max(1, Math.floor(16 / cams.length));
  const from = o.from ?? 0;
  if (!probe.feet) probe.setup();
  const check = new PoseCheck(tp, probe);
  const cell = { w: W * cams.length, h: H + 46 }, rows = Math.ceil(frames / cols);
  const sheet = document.createElement("canvas");
  sheet.width = cell.w * cols; sheet.height = cell.h * rows + 28;
  const g = sheet.getContext("2d");
  g.fillStyle = "#15181d"; g.fillRect(0, 0, sheet.width, sheet.height);
  g.fillStyle = "#e6e9ee"; g.font = "bold 15px monospace";
  g.fillText(`${o.scen} · ${fps} fps simulated (${(60 / fps).toFixed(2)}x speed) · from ${from}s · every ${every} frame(s) · ${cams.join(" | ")} · ${o.note || ""}`, 8, 19);
  lab.pause = true;
  // (the page's overlays hidden: the views are screenshots)
  const hidden = [...document.querySelectorAll("#info, #help, #title, #notes, .tag, #strip, body > div")].filter((e) => e.style.display !== "none");
  for (const e of hidden) { e.dataset.vis = e.style.visibility; e.style.visibility = "hidden"; }
  let t = -(sc.pre ?? 0.6), jumped = false, shot = 0;
  tp.start(sc.start[0], sc.start[1], sc.start[2], sc.start[3] ?? 0);
  tp.autopilot = (inp) => {
    if (t < 0 || t > sc.secs) { inp.x = inp.z = 0; inp.run = false; return; }
    if (typeof sc.dir === "function") { const r = sc.dir(t); inp.x = r[0]; inp.z = r[1]; inp.run = r[2] ?? !!sc.run; if (r[3]) inp.jump = true; }
    else { inp.x = sc.dir[0]; inp.z = sc.dir[1]; inp.run = !!sc.run; }
    if (sc.jumpAt !== undefined && !jumped && t >= sc.jumpAt) { inp.jump = true; jumped = true; }
  };
  for (; t < from; t += dt) { tp.update(dt); check.frame(dt); }
  const flagged = [];
  let pc = null;
  return {
    W, H, cams, frames,
    /** Advance to the next recorded frame; false when done. */
    next() {
      if (shot >= frames) return false;
      for (let k = 0; k < every; k++) { tp.update(dt); t += dt; pc = check.frame(dt); }
      return true;
    },
    /** Render camera ci. */
    view(ci) {
      probe.camMode = cams[ci]; probe.camYaw = tp.S[3];
      probe.camera(camera, 1);
      lab.render();
    },
    /** The centre W:H region of the canvas, in CSS pixels: what to capture. */
    region() {
      const r = lab.renderer.domElement.getBoundingClientRect(), sw = Math.min(r.width, r.height * W / H), sh = sw * H / W;
      return { x: r.left + (r.width - sw) / 2, y: r.top + (r.height - sh) / 2, width: sw, height: sh };
    },
    /** Camera ci's image (a URL) into this frame's cell; after the last camera, the caption, then the next cell. */
    async add(ci, url) {
      const x0 = (shot % cols) * cell.w, y0 = 28 + Math.floor(shot / cols) * cell.h;
      const img = new Image(); img.src = url; await img.decode();
      g.drawImage(img, x0 + ci * W, y0, W, H);
      if (ci < cams.length - 1) return;
      const lo = tp.body.loco, bad = pc && pc.flags.length;
      g.fillStyle = bad ? "#5a1717" : "#20252c"; g.fillRect(x0, y0 + H, cell.w, 46);
      if (bad) { g.strokeStyle = "#ff3b3b"; g.lineWidth = 3; g.strokeRect(x0 + 1.5, y0 + 1.5, cell.w - 3, cell.h - 3); flagged.push(`#${shot} t=${t.toFixed(3)}: ${pc.flags.join("; ")}`); }
      g.fillStyle = "#e6e9ee"; g.font = "11px monospace";
      const lg = pc ? pc.legs : [];
      const ft = (i) => (lg[i] ? `${i ? "R" : "L"}${lg[i].planted ? "▼" : "△"}${(lg[i].off * 100).toFixed(0)} k${lg[i].knee.toFixed(0)}` : "");
      g.fillText(`#${shot} t ${t.toFixed(3)} ${lo ? lo.mode : tp.body.state || ""}${tp.ctl.grounded ? "" : " AIR"}`, x0 + 4, y0 + H + 13);
      g.fillText(`${ft(0)}  ${ft(1)}  pel ${(((tp.body.legIK || tp.body.footIK)?.pelvis || 0) * 100).toFixed(0)}`, x0 + 4, y0 + H + 27);
      if (bad) { g.fillStyle = "#ffb3b3"; g.fillText(pc.flags[0].slice(0, Math.floor(cell.w / 6.6)), x0 + 4, y0 + H + 41); }
      else g.fillText(`v ${Math.hypot(tp.ctl.vel[0], tp.ctl.vel[2]).toFixed(2)} m/s  y ${(tp.ctl.pos[1] - (lab.Y0 || 0)).toFixed(2)}`, x0 + 4, y0 + H + 41);
      shot++;
    },
    finish() {
      tp.autopilot = null; probe.camMode = lab.S?.cam || "follow"; lab.pause = false;
      for (const e of hidden) e.style.visibility = e.dataset.vis || "";
      return { url: sheet.toDataURL("image/jpeg", 0.86), flagged, counts: check.counts, worst: check.worst, frames: check.frames };
    },
  };
}

/** Foot trajectory traces: the heel and the toe of each foot over the last seconds, green planted, orange swinging. */
export class FootTraces {
  constructor(scene, n = 360) {
    this.n = n; this.on = false;
    this.lines = [0, 1, 2, 3].map(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setDrawRange(0, 0);
      const l = new THREE.Line(g, new THREE.LineBasicNodeMaterial({ vertexColors: true, depthTest: false, transparent: true }));
      l.frustumCulled = false; l.renderOrder = 10; l.visible = false; scene.add(l);
      return { l, g, k: 0, m: 0 };
    });
  }
  set visible(v) { this.on = v; for (const t of this.lines) t.l.visible = v; if (!v) this.clear(); }
  get visible() { return this.on; }
  clear() { for (const t of this.lines) { t.k = 0; t.m = 0; t.g.setDrawRange(0, 0); } }
  /** After tp.update: probe.feet (heel / toe points), IK legs (contact). */
  update(probe, IK) {
    if (!this.on || !probe.feet || !IK) return;
    for (let i = 0; i < 2; i++) {
      const f = probe.feet[i], L = IK.legs[i], planted = (L.contact ?? 0) > 0.6;
      f.hw.copy(f.heel).applyMatrix4(L.foot.matrixWorld); f.tw.copy(f.toe).applyMatrix4(f.toeBone.matrixWorld);
      for (let j = 0; j < 2; j++) {
        const t = this.lines[i * 2 + j], p = j ? f.tw : f.hw, P = t.g.attributes.position, C = t.g.attributes.color;
        // a line strip that scrolls: shift when full (360 points: 6 s at 60 fps)
        if (t.m === this.n) { P.array.copyWithin(0, 3); C.array.copyWithin(0, 3); t.m--; }
        P.setXYZ(t.m, p.x, p.y + 0.003, p.z);
        if (planted) C.setXYZ(t.m, 0.2, 0.95, 0.35); else C.setXYZ(t.m, j ? 1 : 1, j ? 0.55 : 0.75, j ? 0.1 : 0.2);
        t.m++;
        P.needsUpdate = true; C.needsUpdate = true; t.g.setDrawRange(0, t.m);
      }
    }
  }
}

/** The pose checks over a whole scripted walk, every frame, nothing rendered: { counts, worst, frames, flagged (first 12) }. */
export function poseRun(lab, scen, fps = 60) {
  const { tp, probe } = lab, sc = typeof scen === "string" ? lab.SCEN[scen] : scen, dt = 1 / fps;
  if (!probe.feet) probe.setup();
  const check = new PoseCheck(tp, probe), flagged = [];
  let t = -(sc.pre ?? 0.6), jumped = false;
  const wasPause = lab.pause; lab.pause = true;
  tp.start(sc.start[0], sc.start[1], sc.start[2], sc.start[3] ?? 0);
  tp.autopilot = (inp) => {
    if (t < 0 || t > sc.secs) { inp.x = inp.z = 0; inp.run = false; return; }
    if (typeof sc.dir === "function") { const r = sc.dir(t); inp.x = r[0]; inp.z = r[1]; inp.run = r[2] ?? !!sc.run; if (r[3]) inp.jump = true; }
    else { inp.x = sc.dir[0]; inp.z = sc.dir[1]; inp.run = !!sc.run; }
    if (sc.jumpAt !== undefined && !jumped && t >= sc.jumpAt) { inp.jump = true; jumped = true; }
  };
  const t0 = performance.now();
  let n = 0;
  try {
    for (; t < sc.secs + 0.8; t += dt) {
      tp.update(dt); n++;
      const pc = check.frame(dt);
      if (pc && pc.flags.length && flagged.length < (lab.maxFlags || 12) && t > 0) flagged.push(`t=${t.toFixed(3)} ${tp.body.loco?.mode || ""}: ${pc.flags.join("; ")}`);
    }
  } finally { tp.autopilot = null; lab.pause = wasPause; }
  return { counts: check.counts, worst: check.worst, frames: check.frames, flagged, msPerFrame: (performance.now() - t0) / n };
}
