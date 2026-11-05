// Keyboard + mouse for the third-person character: WASD / arrows move (camera-relative), Shift runs (or toggles
// with CapsLock-style `runToggle`), Space jumps, mouse drag (or pointer lock: click the canvas) orbits the camera,
// the wheel zooms. Only listens while active().
export class CharacterInput {
  constructor(dom, { active = () => true, pointerLock = false, sensitivity = 0.0042 } = {}) {
    Object.assign(this, { dom, active, pointerLock, sensitivity });
    this.keys = new Set();
    this.mdx = 0; this.mdy = 0; this.wheel = 0; this.jumpQueued = false;
    let drag = null;
    this._kd = (e) => {
      if (!this.active()) return;
      if (e.target?.closest?.("input,select,textarea")) return;
      this.keys.add(e.code);
      if (e.code === "Space") { if (!e.repeat) this.jumpQueued = true; e.preventDefault(); }
      this.onKey?.(e.code, e);
    };
    this._ku = (e) => this.keys.delete(e.code);
    this._blur = () => this.keys.clear();
    this._pd = (e) => {
      if (!this.active() || e.button !== 0) return;
      if (this.pointerLock && document.pointerLockElement !== dom) { dom.requestPointerLock?.(); return; }
      drag = [e.clientX, e.clientY];
    };
    this._pu = () => { drag = null; };
    this._pm = (e) => {
      if (!this.active()) return;
      if (document.pointerLockElement === dom) { this.mdx += e.movementX; this.mdy += e.movementY; return; }
      if (!drag) return;
      this.mdx += e.clientX - drag[0]; this.mdy += e.clientY - drag[1];
      drag[0] = e.clientX; drag[1] = e.clientY;
    };
    this._wh = (e) => { if (this.active()) { this.wheel += Math.sign(e.deltaY); e.preventDefault(); } };
    addEventListener("keydown", this._kd); addEventListener("keyup", this._ku); addEventListener("blur", this._blur);
    dom.addEventListener("pointerdown", this._pd); addEventListener("pointerup", this._pu); addEventListener("pointermove", this._pm);
    dom.addEventListener("wheel", this._wh, { passive: false });
  }
  dispose() {
    removeEventListener("keydown", this._kd); removeEventListener("keyup", this._ku); removeEventListener("blur", this._blur);
    this.dom.removeEventListener("pointerdown", this._pd); removeEventListener("pointerup", this._pu); removeEventListener("pointermove", this._pm);
    this.dom.removeEventListener("wheel", this._wh);
  }
  has(c) { return this.keys.has(c); }
  /** Apply this frame's input: orbit / zoom the camera, write the wanted motion into the controller's input. */
  apply(cam, ctl) {
    if (this.mdx || this.mdy) { cam.addYaw(-this.mdx * this.sensitivity); cam.addPitch(-this.mdy * this.sensitivity); this.mdx = this.mdy = 0; }
    if (this.wheel) { cam.zoomBy(Math.pow(1.1, this.wheel)); this.wheel = 0; }
    let f = 0, s = 0;
    if (this.has("KeyW") || this.has("ArrowUp")) f += 1;
    if (this.has("KeyS") || this.has("ArrowDown")) f -= 1;
    if (this.has("KeyD") || this.has("ArrowRight")) s += 1;
    if (this.has("KeyA") || this.has("ArrowLeft")) s -= 1;
    const fx = cam.fwdX, fz = cam.fwdZ;               // right = (-fz, fx)
    let x = fx * f - fz * s, z = fz * f + fx * s;
    const l = Math.hypot(x, z);
    if (l > 1) { x /= l; z /= l; }
    const inp = ctl.input;
    inp.x = x; inp.z = z;
    inp.run = this.has("ShiftLeft") || this.has("ShiftRight");
    if (this.jumpQueued) { inp.jump = true; this.jumpQueued = false; }
  }
}
