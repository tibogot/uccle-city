// Keyboard + gamepad for the kid's BMX (bikePhysics input). Keys never need another key held (rule 14), and the lab
// shows them on screen. The ARROWS do exactly what W / A / S / D do (both sets always work; the owner rides with the
// arrows); the rider's lean is on Z / X (I / K too). KEYS below is the one table (the lab's card and the tests read it).
//   W / Up        pedal           Shift   stand up and sprint
//   S / Down      rear brake (ramps in: a tap brakes, held = a skid)        Q   front brake
//   S at a stop   held = walk back (claude/bikeback: the feet on the ground, A / D steer the reversing way; let go or
//                 W = stop / pedal on). No new key: below 0.3 m/s for 0.25 s S stops being a brake (bikePhysics backMode)
//   A D / Left Right   steer (ramped: a tap is a small lean, held = full)
//   Space         hold = crouch / preload / absorb, release = hop (a tap on a back slope = a pump; round 3, feel new: a charged release pops there too)
//   C             pump (extend the legs)        F   trick (held in the air; let go before landing!)
//   Z / X         lean forward / back (I / K too): manual, nose dive, air pitch
//   (one-shot, the lab: R reset, G get up, V camera, P pause, 1-9 spots, 0 / N / B the park's spots, ? the card, E get on / off: claude/kid)
// Gamepad (standard mapping): left stick steer + lean, RT pedal, LT rear brake (held at a stop: walk back), LB front brake, A hop, B pump, X trick,
// RB sprint; Y = camera, Back = reset (onKey).
// FEEL ROUND 1: no frame-latched input. Key events are queued with their timestamps; the frame driver
// (bikePhysics advanceBike) asks sample(t, DT) once per fixed 120 Hz step, so each step sees exactly the keys down
// at ITS time (a release lands in the step it happened in, at 30 fps too) and the keyboard ramps advance per step.
// A key pressed and released between two steps still counts for one step (a fast tap is never lost).
export const KEYS = {
  pedal: ["KeyW", "ArrowUp"], brakeR: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  brakeF: ["KeyQ"], sprint: ["ShiftLeft", "ShiftRight"], hop: ["Space"], pump: ["KeyC"], trick: ["KeyF"],
  leanFwd: ["KeyZ", "KeyI"], leanBack: ["KeyX", "KeyK"],
};
/** the lab's one-shot keys (onKey) */
// (the BMX park, 2026-11-25: 0 = the park, N / B = the next / previous park spot)
export const ONE_SHOT = ["KeyR", "KeyG", "KeyV", "KeyP", "Slash", "F1", ...Array.from({ length: 9 }, (_, i) => `Digit${i + 1}`), "KeyE", "Digit0", "KeyN", "KeyB", "KeyO", "Escape"];
export class BikeKeys {
  constructor({ active = () => true, onKey = null } = {}) {
    this.down = new Set(); this.onKey = onKey;
    this.queue = []; this.fresh = new Set(); this.lateUp = new Set();
    this.input = { pedal: 0, sprint: false, brakeF: 0, brakeR: 0, steer: 0, lean: 0, hop: false, pump: 0, trick: false };
    this.steerK = 0; this.rearK = 0; this.pad = false; this.prevBtn = [];
    addEventListener("keydown", (e) => {
      if (!active() || e.target?.closest?.("input,select,textarea")) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyF"].includes(e.code) || e.code === "Slash") e.preventDefault();
      if (!e.repeat && this.onKey) this.onKey(e.code);
      if (!e.repeat) this.press(e.code, e.timeStamp);
    });
    addEventListener("keyup", (e) => this.release(e.code, e.timeStamp));
    addEventListener("blur", () => { this.queue.length = 0; this.down.clear(); this.fresh.clear(); this.lateUp.clear(); });
  }
  /** queue a key event at time t (ms, the performance.now() clock: an event's timeStamp) */
  press(code, t = performance.now()) { this.queue.push({ t, code, on: true }); }
  release(code, t = performance.now()) { this.queue.push({ t, code, on: false }); }
  /** apply the queued events up to time t (ms) to the keys held */
  apply(t) {
    const q = this.queue;
    let k = 0;
    for (; k < q.length && q[k].t <= t; k++) {
      const e = q[k];
      if (e.on) { this.down.add(e.code); this.fresh.add(e.code); }
      else if (this.fresh.has(e.code)) this.lateUp.add(e.code);     // pressed since the last step: held for one step
      else this.down.delete(e.code);
    }
    if (k) q.splice(0, k);
  }
  /** ONE fixed step's input: the events up to t (ms) applied, the ramps advanced by dt (s) */
  sample(t, dt) {
    this.apply(t);
    const i = this.compute(dt);
    for (const c of this.lateUp) this.down.delete(c);
    this.lateUp.clear(); this.fresh.clear();
    return i;
  }
  /** every queued event applied, then the input (the old per-frame read; tools and tests) */
  read(dt) { return this.sample(Infinity, dt); }
  /** the input from the keys held now (dt: seconds, for the keyboard ramps) */
  compute(dt) {
    const k = this.down, i = this.input;
    const on = (name) => KEYS[name].some((c) => k.has(c));
    const steerT = (on("left") ? 1 : 0) - (on("right") ? 1 : 0);
    // (keyboard ramps: a key is 0 / 1, the bike wants a lean; in 0.3 s to full, back to centre faster)
    const rate = steerT === 0 || Math.sign(steerT) !== Math.sign(this.steerK) ? 7 : 3.4;
    this.steerK += Math.max(-rate * dt, Math.min(rate * dt, steerT - this.steerK));
    const rearT = on("brakeR") ? 1 : 0;
    this.rearK = rearT ? Math.min(1, Math.max(0.55, this.rearK + dt * 1.6)) : 0;
    i.pedal = on("pedal") ? 1 : 0;
    i.sprint = on("sprint");
    i.brakeR = this.rearK; i.brakeF = on("brakeF") ? 1 : 0;
    i.steer = this.steerK;
    i.lean = (on("leanBack") ? 1 : 0) - (on("leanFwd") ? 1 : 0);
    i.hop = on("hop"); i.pump = on("pump") ? 1 : 0; i.trick = on("trick");
    this.pad = this.readPad(i);
    return i;
  }
  readPad(i) {
    const list = navigator.getGamepads?.();
    if (!list) return false;
    for (const p of list) {
      if (!p || !p.connected) continue;
      const dz = (v, d = 0.12) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));
      const ax = dz(p.axes[0] || 0), ay = dz(p.axes[1] || 0, 0.2);
      const b = (n) => p.buttons[n]?.value || (p.buttons[n]?.pressed ? 1 : 0);
      const any = ax || ay || [0, 1, 2, 4, 5, 6, 7].some((n) => b(n) > 0.05);
      // one-shot buttons: Y camera, Back reset
      for (const [n, code] of [[3, "PadY"], [8, "PadBack"]]) { const on = b(n) > 0.5; if (on && !this.prevBtn[n]) this.onKey?.(code); this.prevBtn[n] = on; }
      if (!any) return false;
      i.steer = -Math.sign(ax) * (0.35 * Math.abs(ax) + 0.65 * ax * ax);
      i.lean = ay;                       // stick down = lean back (manual), up = forward
      i.pedal = Math.max(i.pedal, b(7)); i.brakeR = Math.max(i.brakeR, b(6)); i.brakeF = Math.max(i.brakeF, b(4));
      i.hop = i.hop || b(0) > 0.5; i.pump = Math.max(i.pump, b(1)); i.trick = i.trick || b(2) > 0.5; i.sprint = i.sprint || b(5) > 0.5;
      return true;
    }
    return false;
  }
}
