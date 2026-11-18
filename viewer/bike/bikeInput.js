// Keyboard + gamepad for the kid's BMX (bikePhysics input). Keys never need another key held (rule 14), and the lab
// shows them on screen.
//   W / Up-free   pedal           Shift   stand up and sprint
//   S             rear brake (ramps in: a tap brakes, held = a skid)        Q   front brake
//   A / D         steer (ramped: a tap is a small lean, held = full)
//   Space         hold = crouch / preload / absorb, release = hop (or a pump on a back slope)
//   C             pump (extend the legs)        F   trick (held in the air; let go before landing!)
//   Up / Down     lean forward / back (I / K too): manual, nose dive, air pitch
// Gamepad (standard mapping): left stick steer + lean, RT pedal, LT rear brake, LB front brake, A hop, B pump, X trick,
// RB sprint; Y = camera, Back = reset (onKey).
export class BikeKeys {
  constructor({ active = () => true, onKey = null } = {}) {
    this.down = new Set(); this.onKey = onKey;
    this.input = { pedal: 0, sprint: false, brakeF: 0, brakeR: 0, steer: 0, lean: 0, hop: false, pump: 0, trick: false };
    this.steerK = 0; this.rearK = 0; this.pad = false; this.prevBtn = [];
    addEventListener("keydown", (e) => {
      if (!active() || e.target?.closest?.("input,select,textarea")) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (!e.repeat && this.onKey) this.onKey(e.code);
      this.down.add(e.code);
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => this.down.clear());
  }
  /** the input for this frame (dt: frame seconds, for the keyboard ramps) */
  read(dt) {
    const k = this.down, i = this.input;
    const steerT = (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) - (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0);
    // (keyboard ramps: a key is 0 / 1, the bike wants a lean; in 0.3 s to full, back to centre faster)
    const rate = steerT === 0 || Math.sign(steerT) !== Math.sign(this.steerK) ? 7 : 3.4;
    this.steerK += Math.max(-rate * dt, Math.min(rate * dt, steerT - this.steerK));
    const rearT = k.has("KeyS") ? 1 : 0;
    this.rearK = rearT ? Math.min(1, Math.max(0.55, this.rearK + dt * 1.6)) : 0;
    i.pedal = k.has("KeyW") ? 1 : 0;
    i.sprint = k.has("ShiftLeft") || k.has("ShiftRight");
    i.brakeR = this.rearK; i.brakeF = k.has("KeyQ") ? 1 : 0;
    i.steer = this.steerK;
    i.lean = (k.has("ArrowDown") || k.has("KeyK") ? 1 : 0) - (k.has("ArrowUp") || k.has("KeyI") ? 1 : 0);
    i.hop = k.has("Space"); i.pump = k.has("KeyC") ? 1 : 0; i.trick = k.has("KeyF");
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
