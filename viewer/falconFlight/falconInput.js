// INPUT for the falcon (Falcon Flight Lab): keyboard, mouse (aim steering with pointer lock), gamepad (Gamepad API,
// polled per frame), touch (a thumb stick + buttons), all into one FlightControls + a few actions.
//
//   keyboard  W / S (or arrows) nose down / up · A / D bank · Space flap · Shift tuck (stoop) · C half fold (fast glide)
//             Q flare (brake) · F talons (strike) · E land on the perch in reach / take off · V chase / head camera
//             M mouse aim on / off · R reset · H help
//   mouse     click the view: pointer lock, the mouse moves the AIM (a ring); the falcon banks and pitches toward it
//             (Eagle Flight's look steering). Left button flap, right button tuck, wheel: camera distance.
//   gamepad   left stick fly (forward = nose down; ?invert=1 flips), RT flap (analog), LT fold (analog: half way =
//             the diamond, full = the tuck), A land / take off, X talons, B flare, Y camera, right stick look.
//   touch     left half: a thumb stick (bank / pitch); right: FLAP (hold), DIVE (hold = tuck), TALONS, LAND, CAM.
import { FlightControls } from "./flightModel.js";

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class FalconInput {
  /** enabled: false = no key / mouse is read (the city: only while flying); skip: key codes left to the page (the city:
   *  M = its map, H = its photo mode) */
  constructor(dom, { invert = false, enabled = true, skip = [] } = {}) {
    this.dom = dom; this.invert = invert; this.enabled = enabled; this.skip = new Set(skip);
    this.C = new FlightControls();
    this.keys = new Set();
    this.mouseAim = true; this.aim = { yaw: 0, pitch: 0, set: false };
    this.mouse = { flap: false, tuck: false, locked: false };
    this.look = { yaw: 0, pitch: 0 }; this.zoom = 1;
    this.actions = new Set();            // one-shot: "land", "strike", "camera", "reset", "help", "aim"
    this.talons = false; this.device = "keyboard";
    this.pad = null; this.touch = null; this.script = null;   // script: a function (t) -> controls (the verification runs)
    addEventListener("keydown", (e) => {
      if (!this.enabled || this.skip.has(e.code) || e.target?.closest?.(".upanel") || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || "")) return;
      this.keys.add(e.code); this.device = "keyboard";
      const once = { KeyE: "land", KeyF: "strike", KeyV: "camera", KeyR: "reset", KeyH: "help", KeyM: "aim" }[e.code];
      if (once && !e.repeat) this.actions.add(once);
      if (e.code === "KeyM" && !e.repeat) this.mouseAim = !this.mouseAim;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    addEventListener("blur", () => this.keys.clear());
    dom.addEventListener("click", () => { if (this.enabled && this.mouseAim && !this.touch?.on && dom.requestPointerLock) dom.requestPointerLock(); });
    document.addEventListener("pointerlockchange", () => { this.mouse.locked = document.pointerLockElement === dom; });
    addEventListener("mousemove", (e) => {
      if (!this.enabled || !this.mouse.locked) return;
      this.device = "mouse";
      this.aim.yaw -= e.movementX * 0.0022; this.aim.pitch = clamp(this.aim.pitch - e.movementY * 0.0022, -1.5, 1.2);
    });
    dom.addEventListener("mousedown", (e) => { if (!this.mouse.locked) return; if (e.button === 0) this.mouse.flap = true; if (e.button === 2) this.mouse.tuck = true; });
    addEventListener("mouseup", (e) => { if (e.button === 0) this.mouse.flap = false; if (e.button === 2) this.mouse.tuck = false; });
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener("wheel", (e) => { if (!this.enabled) return; this.zoom = clamp(this.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.5, 3); e.preventDefault(); }, { passive: false });
    addEventListener("gamepadconnected", () => { this.device = "gamepad"; });
    if (matchMedia("(pointer: coarse)").matches || /[?&]touch=1/.test(location.search)) { this.buildTouch(); if (!enabled) this.touch.el.style.display = "none"; }
    addEventListener("pointerdown", (e) => { if (this.enabled && e.pointerType === "touch" && !this.touch) this.buildTouch(); });
  }

  /** on / off (the city's fly mode): off lets go of every key, the pointer lock and the touch controls */
  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this.keys.clear(); this.actions.clear(); this.mouse.flap = this.mouse.tuck = false;
      if (document.pointerLockElement === this.dom) document.exitPointerLock?.();
    }
    if (this.touch) this.touch.el.style.display = v ? "" : "none";
  }

  /** the falcon's state to steer the mouse aim against: { heading, gamma } */
  syncAim(heading, gamma) { this.aim.yaw = heading; this.aim.pitch = gamma; this.aim.set = true; }

  update(dt, bird) {
    const C = this.C, k = this.keys, has = (...c) => c.some((x) => k.has(x));
    if (this.script) { Object.assign(C, this.script(bird)); return C; }
    let pitch = (has("KeyS", "ArrowDown") ? 1 : 0) - (has("KeyW", "ArrowUp") ? 1 : 0);
    let roll = (has("KeyD", "ArrowRight") ? 1 : 0) - (has("KeyA", "ArrowLeft") ? 1 : 0);
    let flap = has("Space") || this.mouse.flap ? 1 : 0;
    let fold = has("ShiftLeft", "ShiftRight") || this.mouse.tuck ? 1 : has("KeyC") ? 0.5 : 0;
    let brake = has("KeyQ") ? 1 : 0;
    this.talons = has("KeyF");
    // the mouse aim: bank and pitch toward the aim (keys still override)
    if (this.mouseAim && this.mouse.locked && bird && !pitch && !roll) {
      const dh = wrap(this.aim.yaw - bird.heading), dg = this.aim.pitch - bird.gamma;
      roll = clamp(-dh * 2.4, -1, 1);
      pitch = clamp(dg * 3.2 + Math.abs(dh) * 0.4, -1, 1);
      this.aim.yaw = bird.heading + clamp(dh, -1.3, 1.3);          // the aim stays within reach
    }
    // gamepad
    const pads = navigator.getGamepads?.() || [];
    const gp = [...pads].find((p) => p && p.connected);
    if (gp) {
      const ax = (i) => { const v = gp.axes[i] ?? 0; return Math.abs(v) < 0.12 ? 0 : (v - Math.sign(v) * 0.12) / 0.88; };
      const bt = (i) => gp.buttons[i]?.value ?? 0, pressed = (i) => !!gp.buttons[i]?.pressed;
      const lx = ax(0), ly = ax(1);
      if (lx || ly || bt(6) > 0.05 || bt(7) > 0.05) this.device = "gamepad";
      if (lx) roll = lx;
      if (ly) pitch = this.invert ? -ly : ly;
      flap = Math.max(flap, bt(7)); fold = Math.max(fold, bt(6)); brake = Math.max(brake, bt(1));
      this.look.yaw = -ax(2) * 1.4; this.look.pitch = -ax(3) * 0.7;
      this.talons ||= pressed(2);
      const prev = this.pad || [];
      const edge = (i, a) => { if (pressed(i) && !prev[i]) this.actions.add(a); };
      edge(0, "land"); edge(2, "strike"); edge(3, "camera");
      this.pad = gp.buttons.map((b) => b.pressed);
    } else if (!this.touch?.on && this.device !== "gamepad") { this.look.yaw *= 0.9; this.look.pitch *= 0.9; }
    // touch
    const T = this.touch;
    if (T?.on) {
      if (T.stick.active) { roll = T.stick.x; pitch = this.invert ? -T.stick.y : T.stick.y; }
      flap = Math.max(flap, T.flap ? 1 : 0); fold = Math.max(fold, T.dive ? 1 : 0);
      this.talons ||= T.talons;
    }
    C.pitch = pitch; C.roll = roll; C.flap = flap; C.fold = fold; C.brake = brake;
    return C;
  }

  take(a) { const h = this.actions.has(a); this.actions.delete(a); return h; }

  buildTouch() {
    if (this.touch) return;
    const css = `.ftouch{position:fixed;inset:0;pointer-events:none;z-index:4;touch-action:none}
.ftouch .stick{position:absolute;left:0;top:30%;width:50%;bottom:0;pointer-events:auto}
.ftouch .knob{position:absolute;width:120px;height:120px;margin:-60px;border-radius:50%;border:2px solid rgba(255,255,255,.5);display:none}
.ftouch .knob i{position:absolute;left:40px;top:40px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.55)}
.ftouch .btns{position:absolute;right:16px;bottom:16px;display:grid;grid-template-columns:repeat(2,84px);gap:10px;pointer-events:auto}
.ftouch button{height:64px;border-radius:14px;border:0;background:rgba(20,24,30,.55);color:#fff;font:600 14px system-ui;touch-action:none}
.ftouch button.on{background:rgba(111,168,255,.75)}`;
    const st = document.createElement("style"); st.textContent = css; document.head.append(st);
    const el = document.createElement("div"); el.className = "ftouch";
    el.innerHTML = `<div class="stick"><div class="knob"><i></i></div></div><div class="btns"><button data-k="talons">TALONS</button><button data-k="land">LAND</button><button data-k="dive">DIVE</button><button data-k="flap">FLAP</button><button data-k="cam">CAM</button></div>`;
    document.body.append(el);
    const T = this.touch = { on: true, el, stick: { active: false, x: 0, y: 0 }, flap: false, dive: false, talons: false };
    const zone = el.querySelector(".stick"), knob = el.querySelector(".knob"), dot = knob.firstChild;
    let id = null, ox = 0, oy = 0;
    zone.addEventListener("pointerdown", (e) => { id = e.pointerId; ox = e.clientX; oy = e.clientY; knob.style.display = "block"; knob.style.left = ox + "px"; knob.style.top = oy + "px"; T.stick.active = true; zone.setPointerCapture(id); this.device = "touch"; });
    zone.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      const dx = clamp((e.clientX - ox) / 55, -1, 1), dy = clamp((e.clientY - oy) / 55, -1, 1);
      // drag the thumb DOWN = pull (nose up), UP = push (nose down), as a stick
      T.stick.x = dx; T.stick.y = dy; dot.style.transform = `translate(${dx * 40}px,${dy * 40}px)`;
    });
    const end = (e) => { if (e.pointerId !== id) return; id = null; T.stick.active = false; T.stick.x = T.stick.y = 0; knob.style.display = "none"; };
    zone.addEventListener("pointerup", end); zone.addEventListener("pointercancel", end);
    for (const b of el.querySelectorAll("button")) {
      const k = b.dataset.k;
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault(); b.classList.add("on");
        if (k === "flap") T.flap = true; else if (k === "dive") T.dive = true; else if (k === "talons") { T.talons = true; this.actions.add("strike"); }
        else if (k === "land") this.actions.add("land"); else if (k === "cam") this.actions.add("camera");
      });
      const up = () => { b.classList.remove("on"); if (k === "flap") T.flap = false; if (k === "dive") T.dive = false; if (k === "talons") T.talons = false; };
      b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("pointerleave", up);
    }
    this.mouseAim = false;
  }
}
