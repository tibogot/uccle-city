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
      if (!e.repeat && this.onKey && ["KeyR", "KeyC", "KeyG", "KeyN", "Escape"].includes(e.code)) this.onKey(e.code);
      this.down.add(e.code);
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => this.down.clear());
  }
  read() {
    const k = this.down, i = this.input;
    const fwd = k.has("KeyW") || k.has("ArrowUp"), back = k.has("KeyS") || k.has("ArrowDown");
    i.throttle = (fwd ? 1 : 0) - (back ? 1 : 0);
    i.steer = (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) - (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0);
    i.handbrake = k.has("Space");
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
