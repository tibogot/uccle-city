// Keyboard for driving: W / ↑ throttle, S / ↓ brake then reverse, A D / ← → steer, Space handbrake,
// plus one-shot keys (R reset, C camera, G collider debug, Esc exit) passed to onKey.
export class DriveKeys {
  constructor({ active = () => true, onKey = null } = {}) {
    this.down = new Set(); this.onKey = onKey;
    this.input = { throttle: 0, steer: 0, handbrake: false };
    this.moto = { throttle: 0, brake: 0, rear: false, steer: 0, boost: false };
    addEventListener("keydown", (e) => {
      if (!active() || e.target?.closest?.("input,select,textarea")) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (!e.repeat && this.onKey && ["KeyR", "KeyC", "KeyG", "KeyQ", "KeyE", "Escape"].includes(e.code)) this.onKey(e.code);
      this.down.add(e.code);
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => this.down.clear());
    // a gamepad (car control round, docs/CARCTL.md): left stick steer, RT throttle, LT brake / reverse, A or B handbrake;
    // analog input skips the keyboard ramps (carCtl.js shapeInput). Polled only once one is connected.
    this.pads = 0;
    addEventListener("gamepadconnected", () => this.pads++);
    addEventListener("gamepaddisconnected", () => (this.pads = Math.max(0, this.pads - 1)));
  }
  /** the first gamepad's car input into i (true when it is being used) */
  readPad(i) {
    const list = navigator.getGamepads?.();
    if (!list) return false;
    for (const p of list) {
      if (!p || !p.connected) continue;
      const ax = p.axes[0] || 0, dz = 0.12;
      const st = Math.abs(ax) < dz ? 0 : (ax - Math.sign(ax) * dz) / (1 - dz);
      const rt = p.buttons[7]?.value || 0, lt = p.buttons[6]?.value || 0;
      const hb = !!(p.buttons[0]?.pressed || p.buttons[1]?.pressed);
      if (!st && rt < 0.05 && lt < 0.05 && !hb) return false;
      // (a little expo on the stick: fine control round the centre)
      i.steer = -Math.sign(st) * (0.4 * Math.abs(st) + 0.6 * st * st);
      i.throttle = rt - lt; i.handbrake = hb; i.analog = true;
      return true;
    }
    return false;
  }
  read() {
    const k = this.down, i = this.input;
    const fwd = k.has("KeyW") || k.has("ArrowUp"), back = k.has("KeyS") || k.has("ArrowDown");
    i.throttle = (fwd ? 1 : 0) - (back ? 1 : 0);
    i.steer = (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) - (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0);
    i.handbrake = k.has("Space");
    i.analog = false;
    if (this.pads && !i.throttle && !i.steer && !i.handbrake) this.readPad(i);
    return i;
  }
  /** the motorbike's controls (viewer/moto/motoPhysics.js): W throttle, S front brake (paddle back when stopped),
   *  Space rear brake, A / D lean, Shift full gas (wheelie) */
  readMoto() {
    const k = this.down, i = this.moto;
    i.throttle = k.has("KeyW") || k.has("ArrowUp") ? 1 : 0;
    i.brake = k.has("KeyS") || k.has("ArrowDown") ? 1 : 0;
    i.rear = k.has("Space");
    i.steer = (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) - (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0);
    i.boost = k.has("ShiftLeft") || k.has("ShiftRight");
    return i;
  }
}
