// THE INSPECTION CAMERA (the default orbit view; docs/ORBITCAM.md; ?orbitcam=old = three's OrbitControls as before).
// An editor / globe camera for a whole city, after the Unity Scene view, Blender, Google Earth / Cesium and yomotsu's
// camera-controls (MIT; its ideas, none of its code):
//   left-drag            orbit around the point UNDER THE CURSOR (picked on press; never a point in the sky)
//   Alt + left-drag      orbit around the view centre
//   right / middle-drag  pan along the ground at the picked depth (the grabbed point stays under the cursor);
//   Shift/Ctrl + left    the same (trackpads)
//   wheel / pinch        zoom toward the cursor, by a share of the distance (fast high up, fine at a doorway)
//   double-click, F      frame the point under the cursor (a smooth flight to it)
//   RMB held + WASD/QE   fly (Unity): the mouse looks around, Shift x3, the wheel sets the speed
//   touch                one finger orbits, two fingers pan + pinch-zoom + twist, double tap frames
// The camera never goes under the terrain or into a building (the tile's terrain + roof grids, the landmarks' own
// triangles: viewer/heroBVH.js); the pitch stays in -89..+30 deg (no flip). Picking is a march along the cursor ray
// through the same height fields (+ the landmark BVHs): one per press / wheel step / pinch start, never per frame.
//
// API kept from OrbitControls (main.js, devPanel.js, the character hook use it): .target (the point looked at; the
// streaming and the sun shadows follow it), .enabled, .update(), .enableDamping, .maxPolarAngle (ignored), .dispose().
// A caller may set camera.position + .target and call update(): the camera jumps there (or, with .glide = true while
// the orbit was already on, flies there smoothly). Three-free (plain math), so tools/orbitCamTest.mjs runs it in node.

const DEG = Math.PI / 180;
const PITCH_MIN = -89 * DEG, PITCH_MAX = 30 * DEG;
const CLEAR = 1.2;          // m over the terrain / a deck
const ROOF_CLEAR = 0.8;     // m over a roof, and the camera's radius against walls
const HERO_CLEAR = 0.6;     // m before a landmark's triangle
const MIN_DIST = 1.0;       // m: the closest a zoom gets to the point under the cursor
const MAX_Y = 3200;         // m TAW
const ROT = 1.4 * Math.PI;  // rad of orbit per screen height dragged

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });
const cp = (o, a) => { o.x = a.x; o.y = a.y; o.z = a.z; return o; };
const len = (a) => Math.hypot(a.x, a.y, a.z);
/** v rotated about the unit axis k by angle a (Rodrigues), in place */
function rot(v, kx, ky, kz, a) {
  const c = Math.cos(a), s = Math.sin(a), d = (kx * v.x + ky * v.y + kz * v.z) * (1 - c);
  const x = v.x * c + (ky * v.z - kz * v.y) * s + kx * d, y = v.y * c + (kz * v.x - kx * v.z) * s + ky * d, z = v.z * c + (kx * v.y - ky * v.x) * s + kz * d;
  v.x = x; v.y = y; v.z = z; return v;
}
const ease = (s) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);

/**
 * The city's solid as height fields: terrain(x, z) (ground + road decks) and roof(x, z) (the drawn roof surface at
 * 1 m, else the 2 m roof grid; 0 = no building). `world` = main.js's world (tiles with hm / roofs / roofAt).
 */
export function cityField(world) {
  return {
    ready: () => world.tiles.length > 0,
    terrain(x, z) {
      const g = world.surface(x, z);
      if (world.decks?.length) { const d = world.deckY(x, z); if (d != null && d > g) return d; }
      return g;
    },
    roof(x, z) {
      const t = world.at(x, z), rf = t?.roofs;
      if (!rf) return t?.roofAt ? t.roofAt(x, z) : 0;
      const sf = rf.surf;
      if (sf) {
        const i = Math.floor((x - sf.x0) / sf.step), j = Math.floor((z - sf.z0) / sf.step);
        return i >= 0 && j >= 0 && i < sf.nx && j < sf.nz ? sf.data[j * sf.nx + i] / sf.q : 0;
      }
      const i = Math.floor((x - rf.x0) / rf.step), j = Math.floor((z - rf.z0) / rf.step);
      return i >= 0 && j >= 0 && i < rf.nx && j < rf.nz ? rf.data[j * rf.nx + i] : 0;
    },
  };
}

export class InspectControls {
  /**
   * camera: a PerspectiveCamera (position, rotation, fov, aspect); dom: the canvas;
   * field: { ready(), terrain(x, z), roof(x, z) } (cityField); heroes: () => iterable of TriBVH (raycast(R, H));
   * target: a Vector3 (THREE's in the viewer).
   */
  constructor(camera, dom, { field, heroes = () => [], target = V(), keys = globalThis, blocked = () => false } = {}) {
    this.object = camera; this.domElement = dom;
    this.field = field; this.heroes = heroes; this.blocked = blocked;   // blocked(): a menu / the full map is open: keys off
    this.target = target;
    this.enableDamping = true;
    this.maxPolarAngle = Math.PI;           // (OrbitControls' field; this camera has its own pitch limits)
    this.glide = false;                     // true: an outside jump (camera + target set, update()) is flown, not cut
    this.flySpeed = 1;                      // the wheel scales it while flying
    this._on = true;
    this.pos = V(); this.yaw = 0; this.pitch = -0.5;
    this.focusDist = 100;
    this._valid = false; this._resync = true;
    this._lastPos = V(NaN, NaN, NaN); this._lastTarget = V(NaN, NaN, NaN);
    // pending (damped) motions
    this._orb = { a: 0, b: 0, p: V() };
    this._pan = V();
    this._dolly = { k: 0, p: V() };
    this._vel = V();
    this._anim = null;
    // input
    this._drag = null;                      // { kind: orbit | pan | look, x, y, plane, pivot }
    this._ptrs = new Map();
    this._two = null;
    this._keys = new Set();
    this._mouse = { x: 0, y: 0, in: false };
    this._fly = false;
    this._lastWheel = { t: 0, x: -1e9, y: -1e9, hit: null };
    this._refocusAt = 0;
    this._tap = { t: 0, x: 0, y: 0 };
    this._t = 0;
    this.stats = { picks: 0, lastPickMs: 0 };
    this._listen(dom, keys);
  }

  get enabled() { return this._on; }
  set enabled(v) {
    v = !!v;
    if (v === this._on) return;
    this._on = v;
    this._drag = null; this._two = null; this._ptrs.clear(); this._fly = false; this._keys.clear();
    if (v) this._resync = true;
  }

  // ------------------------------------------------------------------ geometry
  /** the unit ray through NDC (nx, ny) of a camera with this yaw / pitch */
  rayDir(nx, ny, yaw = this.yaw, pitch = this.pitch, o = V()) {
    const cam = this.object, ty = Math.tan((cam.fov * DEG) / 2) / (cam.zoom || 1), tx = ty * cam.aspect;
    let x = nx * tx, y = ny * ty, z = -1;
    const cb = Math.cos(pitch), sb = Math.sin(pitch);
    const y1 = y * cb - z * sb, z1 = y * sb + z * cb;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    o.x = x * cy + z1 * sy; o.y = y1; o.z = -x * sy + z1 * cy;
    const l = len(o); o.x /= l; o.y /= l; o.z /= l;
    return o;
  }
  fwd(o = V()) { const cb = Math.cos(this.pitch); o.x = -cb * Math.sin(this.yaw); o.y = Math.sin(this.pitch); o.z = -cb * Math.cos(this.yaw); return o; }
  ndc(clientX, clientY) {
    const r = this.domElement.getBoundingClientRect?.() ?? { left: 0, top: 0, width: this.domElement.clientWidth, height: this.domElement.clientHeight };
    return [((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1];
  }
  top(x, z) { const f = this.field; return Math.max(f.terrain(x, z), f.roof(x, z)); }

  /** The first solid along the ray (origin O, unit dir D): { x, y, z, t } or null. Height-field march + bisection,
   *  then the landmarks' BVHs. */
  raycast(O, D, tMax = 8000) {
    if (!this.field?.ready()) return null;
    const t0 = performance.now();
    this.stats.picks++;
    const at = (t) => O.y + D.y * t - this.top(O.x + D.x * t, O.z + D.z * t);   // < 0: inside
    let t = 0.4, prev = t, hit = -1;
    let inside = at(t) <= 0;
    // (starting in a conservative roof cell next to a wall: walk out of it first, up to 30 m)
    while (inside && t < 30) { t += 0.5; inside = at(t) <= 0; }
    prev = t;
    while (t < tMax) {
      const y = O.y + D.y * t;
      if (D.y >= 0 && y > 600) break;                     // climbing above everything
      if (y < -200) break;
      const s = clamp(0.004 * t + 0.4, 0.4, 12);
      prev = t; t += s;
      if (at(t) <= 0) { hit = t; break; }
    }
    let best = Infinity;
    if (hit > 0) {
      let lo = prev, hi = hit;
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (at(m) <= 0) hi = m; else lo = m; }
      best = hi;
    }
    const R = this._R ??= new Float64Array(6), H = this._H ??= new Float64Array(5);
    R[0] = O.x; R[1] = O.y; R[2] = O.z; R[3] = D.x; R[4] = D.y; R[5] = D.z;
    for (const b of this.heroes()) { H[0] = Math.min(best, tMax); b.raycast(R, H); if (H[0] < best) best = H[0]; }
    this.stats.lastPickMs = performance.now() - t0;
    if (!(best < tMax)) return null;
    return { x: O.x + D.x * best, y: O.y + D.y * best, z: O.z + D.z * best, t: best };
  }
  /** the point under a screen position (client px): { x, y, z, t } or null */
  pick(clientX, clientY) { const [nx, ny] = this.ndc(clientX, clientY); return this.raycast(this.pos, this.rayDir(nx, ny)); }

  /** a pivot that is never in the sky: the solid under the cursor, else the ray's crossing of the focus height,
   *  else the focus point */
  _pivot(nx, ny, o = V()) {
    const D = this.rayDir(nx, ny), h = this.raycast(this.pos, D);
    if (h) return cp(o, h);
    const fy = this.target.y;
    if (D.y < -0.02) { const t = (fy - this.pos.y) / D.y; if (t > 0 && t < 20000) return cp(o, { x: this.pos.x + D.x * t, y: fy, z: this.pos.z + D.z * t }); }
    return cp(o, this.target);
  }

  // ------------------------------------------------------------------ collisions
  _roofNear(x, z) {
    const f = this.field, r = ROOF_CLEAR;
    return Math.max(f.roof(x, z), f.roof(x + r, z), f.roof(x - r, z), f.roof(x, z + r), f.roof(x, z - r));
  }
  /** move prev -> next (in place) without entering the ground, a building or a landmark; returns true if blocked */
  resolve(prev, next) {
    const f = this.field;
    if (!f?.ready()) return false;
    let blocked = false;
    const rN = this._roofNear(next.x, next.z);
    if (rN > 0 && next.y < rN + ROOF_CLEAR) {
      const rP = this._roofNear(prev.x, prev.z);
      const prevInside = rP > 0 && prev.y < rP + ROOF_CLEAR - 0.05;
      if (!prevInside) {
        if (prev.y >= rN + ROOF_CLEAR - 0.05) next.y = rN + ROOF_CLEAR;                    // from above: onto the roof
        else {                                                                             // into a wall: slide along it
          blocked = true;
          const a = this._roofNear(next.x, prev.z), b = this._roofNear(prev.x, next.z);
          if (!(a > 0 && next.y < a + ROOF_CLEAR) && Math.abs(next.x - prev.x) > 1e-6) next.z = prev.z;
          else if (!(b > 0 && next.y < b + ROOF_CLEAR) && Math.abs(next.z - prev.z) > 1e-6) next.x = prev.x;
          else { next.x = prev.x; next.z = prev.z; }
        }
      }
    }
    const g = f.terrain(next.x, next.z);
    if (next.y < g + CLEAR) next.y = g + CLEAR;
    if (next.y > MAX_Y) next.y = MAX_Y;
    // the landmarks: the segment against their triangles
    const dx = next.x - prev.x, dy = next.y - prev.y, dz = next.z - prev.z, L = Math.hypot(dx, dy, dz);
    if (L > 1e-5) {
      const R = this._Rc ??= new Float64Array(6), H = this._Hc ??= new Float64Array(5);
      R[0] = prev.x; R[1] = prev.y; R[2] = prev.z; R[3] = dx / L; R[4] = dy / L; R[5] = dz / L;
      let best = L + HERO_CLEAR;
      for (const b of this.heroes()) { H[0] = best; b.raycast(R, H); if (H[0] < best) best = H[0]; }
      if (best < L + HERO_CLEAR) {
        const k = Math.max(0, best - HERO_CLEAR);
        next.x = prev.x + R[3] * k; next.y = prev.y + R[4] * k; next.z = prev.z + R[5] * k;
        blocked = true;
      }
    }
    return blocked;
  }

  // ------------------------------------------------------------------ actions
  /** smooth flight to a camera position looking at a target (seconds) */
  flyTo(pos, target, duration) {
    const d = Math.hypot(pos.x - this.pos.x, pos.y - this.pos.y, pos.z - this.pos.z);
    const from = cp(V(), this.pos), fT = this.fwd(); const fd = Math.min(this.focusDist, Math.max(d, 30));
    this._anim = {
      t: 0, dur: duration ?? clamp(0.6 + d / 1800, 0.6, 2.2), from, fromT: V(from.x + fT.x * fd, from.y + fT.y * fd, from.z + fT.z * fd),
      to: cp(V(), pos), toT: cp(V(), target), lift: Math.min(d * 0.18, 350),
    };
    this._clearPending();
  }
  /** frame the point under a screen position: fly closer to it, looking at it */
  frame(clientX, clientY) {
    const [nx, ny] = clientX == null ? [0, 0] : this.ndc(clientX, clientY);
    const h = this.raycast(this.pos, this.rayDir(nx, ny));
    if (!h) return false;
    const P = h, dist = Math.hypot(P.x - this.pos.x, P.y - this.pos.y, P.z - this.pos.z);
    const D = clamp(dist * 0.35, 6, 250);
    let yaw = Math.atan2(-(P.x - this.pos.x), -(P.z - this.pos.z));
    let pitch = clamp(Math.asin(clamp((P.y - this.pos.y) / Math.max(dist, 1e-6), -1, 1)), -80 * DEG, -12 * DEG);
    const cb = Math.cos(pitch), dir = V(-cb * Math.sin(yaw), Math.sin(pitch), -cb * Math.cos(yaw));
    const to = V(P.x - dir.x * D, P.y - dir.y * D, P.z - dir.z * D);
    const g = this.field.terrain(to.x, to.z), r = this._roofNear(to.x, to.z);
    to.y = Math.max(to.y, g + CLEAR + 1, r > 0 ? r + ROOF_CLEAR : -1e9);
    this.flyTo(to, P);
    return true;
  }
  _clearPending() { this._orb.a = this._orb.b = 0; this._pan.x = this._pan.y = this._pan.z = 0; this._dolly.k = 0; this._vel.x = this._vel.y = this._vel.z = 0; }
  _touched() { this._anim = null; this._refocusAt = performance.now() + 150; }

  // ------------------------------------------------------------------ input
  _listen(dom, keys) {
    if (dom.style) dom.style.touchAction = "none";
    const on = (el, ev, fn, o) => { el.addEventListener?.(ev, fn, o); (this._off ??= []).push(() => el.removeEventListener?.(ev, fn, o)); };
    on(dom, "contextmenu", (e) => { if (this._on) e.preventDefault(); });
    on(dom, "pointerdown", (e) => this._down(e));
    on(dom, "pointermove", (e) => this._move(e));
    on(dom, "pointerup", (e) => this._up(e));
    on(dom, "pointercancel", (e) => this._up(e));
    on(dom, "pointerleave", () => { this._mouse.in = false; });
    on(dom, "wheel", (e) => this._wheel(e), { passive: false });
    on(dom, "dblclick", (e) => { if (this._on && e.button === 0) this.frame(e.clientX, e.clientY); });
    const typing = (e) => e.target?.closest?.("input,select,textarea");
    const FLY = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"]);
    on(keys, "keydown", (e) => {
      if (!this._on || typing(e) || e.ctrlKey || e.metaKey || e.altKey || this.blocked()) return;
      if (this._drag?.rmb && FLY.has(e.code)) {
        // RMB held: these keys fly (and no other mode / the bike prompt sees them)
        this._keys.add(e.code);
        if (e.code !== "ShiftLeft" && e.code !== "ShiftRight" && !this._fly) { this._fly = true; this._drag.kind = "look"; this._pan.x = this._pan.y = this._pan.z = 0; this._touched(); }
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      if (e.code === "KeyF" && !e.repeat) {
        if (this._mouse.in) this.frame(this._mouse.x, this._mouse.y); else this.frame();
      }
    }, true);
    on(keys, "keyup", (e) => { this._keys.delete(e.code); });
    on(keys, "blur", () => { this._keys.clear(); this._fly = false; this._drag = null; });
  }
  _down(e) {
    if (!this._on) return;
    this._touched();
    try { this.domElement.setPointerCapture?.(e.pointerId); } catch {}
    if (e.pointerType === "touch") return this._touchDown(e);
    if (this._drag) return;
    const [nx, ny] = this.ndc(e.clientX, e.clientY);
    const rmb = e.button === 2, pan = rmb || e.button === 1 || (e.button === 0 && (e.shiftKey || e.ctrlKey || e.metaKey));
    if (pan) {
      const p = this._pivot(nx, ny);
      this._drag = { kind: "pan", rmb, x: e.clientX, y: e.clientY, plane: p.y, id: e.pointerId };
    } else if (e.button === 0) {
      const p = e.altKey ? cp(V(), this.target) : this._pivot(nx, ny);
      this._drag = { kind: "orbit", x: e.clientX, y: e.clientY, pivot: p, id: e.pointerId };
    }
  }
  _move(e) {
    this._mouse.x = e.clientX; this._mouse.y = e.clientY; this._mouse.in = true;
    if (!this._on) return;
    if (e.pointerType === "touch") return this._touchMove(e);
    const d = this._drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y, h = this.domElement.clientHeight || 1;
    if (d.kind === "orbit") this._orbit(-ROT * dx / h, -ROT * dy / h, d.pivot);
    else if (d.kind === "pan") this._panBy(d.x, d.y, e.clientX, e.clientY, d.plane);
    else if (d.kind === "look") { this.yaw -= dx * 0.0035; this.pitch = clamp(this.pitch - dy * 0.0035, PITCH_MIN, PITCH_MAX); }
    d.x = e.clientX; d.y = e.clientY;
    this._touched();
  }
  _up(e) {
    try { this.domElement.releasePointerCapture?.(e.pointerId); } catch {}
    if (e.pointerType === "touch") return this._touchUp(e);
    if (this._drag?.id === e.pointerId) {
      if (this._drag.rmb) { this._fly = false; this._keys.clear(); }
      this._drag = null;
      this._refocusAt = performance.now() + 150;
    }
  }
  _orbit(a, b, pivot) {
    // (pending: applied with damping in update(); a pivot change takes the rest of the last one along)
    const o = this._orb;
    if (o.p.x !== pivot.x || o.p.y !== pivot.y || o.p.z !== pivot.z) { if (Math.abs(o.a) + Math.abs(o.b) > 1e-4) this._applyOrbit(1); cp(o.p, pivot); }
    o.a += a; o.b = clamp(o.b + b, PITCH_MIN - this.pitch, PITCH_MAX - this.pitch);   // (no pending tilt past the limits)
  }
  /** the ground-plane pan: the point under (x0, y0) at the plane's height moves under (x1, y1) */
  _panBy(x0, y0, x1, y1, planeY) {
    const O = V(this.pos.x + this._pan.x, this.pos.y + this._pan.y, this.pos.z + this._pan.z);
    const [ax, ay] = this.ndc(x0, y0), [bx, by] = this.ndc(x1, y1);
    const A = this.rayDir(ax, ay), B = this.rayDir(bx, by);
    const ref = Math.max(5, Math.abs(O.y - planeY));
    const hitA = this._plane(O, A, planeY), hitB = this._plane(O, B, planeY);
    let sx, sz, sy = 0;
    const lim = Math.max(ref * 12, 300);
    if (hitA && hitB && hitA.t < lim && hitB.t < lim) { sx = hitA.x - hitB.x; sz = hitA.z - hitB.z; }
    else {
      // near / above the horizon: a screen-space pan at the focus distance
      const h = this.domElement.clientHeight || 1, s = (2 * Math.tan((this.object.fov * DEG) / 2) * Math.max(this.focusDist, 10)) / h;
      const cy = Math.cos(this.yaw), sy0 = Math.sin(this.yaw);
      const mx = -(x1 - x0) * s, my = (y1 - y0) * s;
      sx = mx * cy + my * -sy0; sz = mx * -sy0 + my * -cy;
    }
    const m = Math.hypot(sx, sz), cap = Math.max(20, 2 * ref);
    if (m > cap) { sx *= cap / m; sz *= cap / m; }
    this._pan.x += sx; this._pan.y += sy; this._pan.z += sz;
  }
  _plane(O, D, y) { if (Math.abs(D.y) < 1e-4) return null; const t = (y - O.y) / D.y; return t > 0 ? { x: O.x + D.x * t, z: O.z + D.z * t, t } : null; }
  _wheel(e) {
    if (!this._on) return;
    e.preventDefault();
    let dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
    if (e.ctrlKey) dy *= 4;                                   // a trackpad pinch
    dy = clamp(dy, -300, 300);
    if (this._fly) { this.flySpeed = clamp(this.flySpeed * Math.exp(-dy * 0.002), 0.1, 10); return; }
    this._touched();
    const now = performance.now(), W = this._lastWheel;
    let p = W.hit;
    if (!p || now - W.t > 90 || Math.hypot(e.clientX - W.x, e.clientY - W.y) > 4) {
      const [nx, ny] = this.ndc(e.clientX, e.clientY);
      p = this._pivot(nx, ny);
      W.hit = p; W.x = e.clientX; W.y = e.clientY;
    }
    W.t = now;
    this._dollyBy(dy * 0.0025, p);
  }
  _dollyBy(k, p) {
    const d = this._dolly;
    if (d.p.x !== p.x || d.p.y !== p.y || d.p.z !== p.z) { if (Math.abs(d.k) > 1e-4) this._applyDolly(1); cp(d.p, p); }
    d.k += k;
  }
  // touch: one finger orbits, two pan / pinch / twist
  _touchDown(e) {
    this._ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
    this._touchStart();
  }
  _touchStart() {
    const P = [...this._ptrs.values()];
    if (P.length === 1) {
      const [nx, ny] = this.ndc(P[0].x, P[0].y);
      this._two = null;
      this._drag = { kind: "orbit", touch: true, x: P[0].x, y: P[0].y, pivot: this._pivot(nx, ny) };
    } else if (P.length >= 2) {
      const [a, b] = P, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const [nx, ny] = this.ndc(mx, my), p = this._pivot(nx, ny);
      this._drag = null;
      this._two = { mx, my, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), p, plane: p.y };
    }
  }
  _touchMove(e) {
    const q = this._ptrs.get(e.pointerId);
    if (!q) return;
    q.x = e.clientX; q.y = e.clientY;
    const h = this.domElement.clientHeight || 1;
    if (this._two && this._ptrs.size >= 2) {
      const [a, b] = this._ptrs.values(), T = this._two;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), ang = Math.atan2(b.y - a.y, b.x - a.x);
      this._panBy(T.mx, T.my, mx, my, T.plane);
      this._dollyBy(-Math.log(d / T.d), T.p);
      let da = ang - T.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      this._orbit(da, 0, T.p);
      T.mx = mx; T.my = my; T.d = d; T.ang = ang;
    } else if (this._drag?.touch) {
      const dx = q.x - this._drag.x, dy = q.y - this._drag.y;
      this._orbit(-ROT * dx / h, -ROT * dy / h, this._drag.pivot);
      this._drag.x = q.x; this._drag.y = q.y;
    }
    this._touched();
  }
  _touchUp(e) {
    const q = this._ptrs.get(e.pointerId);
    this._ptrs.delete(e.pointerId);
    if (q && this._ptrs.size === 0 && !this._two) {
      const now = performance.now(), still = Math.hypot(q.x - q.x0, q.y - q.y0) < 10 && now - q.t0 < 300;
      if (still && now - this._tap.t < 350 && Math.hypot(q.x - this._tap.x, q.y - this._tap.y) < 40) { this._tap.t = 0; this.frame(q.x, q.y); }
      else if (still) { this._tap.t = now; this._tap.x = q.x; this._tap.y = q.y; }
    }
    if (this._ptrs.size === 0) { this._drag = null; this._two = null; this._refocusAt = performance.now() + 150; }
    else this._touchStart();
  }

  // ------------------------------------------------------------------ the frame
  _applyOrbit(f) {
    const o = this._orb;
    let a = o.a * f, b = o.b * f;
    o.a -= a; o.b -= b;
    b = clamp(this.pitch + b, PITCH_MIN, PITCH_MAX) - this.pitch;
    if (Math.abs(a) + Math.abs(b) < 1e-7) return;
    const prev = cp(this._tmpA ??= V(), this.pos), next = this._tmpB ??= V();
    const turn = (aa, bb) => {
      const v = V(prev.x - o.p.x, prev.y - o.p.y, prev.z - o.p.z);
      rot(v, 0, 1, 0, aa);
      const yaw = this.yaw + aa;
      rot(v, Math.cos(yaw), 0, -Math.sin(yaw), bb);
      next.x = o.p.x + v.x; next.y = o.p.y + v.y; next.z = o.p.z + v.z;
      return yaw;
    };
    let yaw = turn(a, b);
    const want = cp(V(), next);
    this.resolve(prev, next);
    if (Math.abs(next.x - want.x) + Math.abs(next.y - want.y) + Math.abs(next.z - want.z) > 1e-3 && b !== 0) {
      // the tilt would take the camera into the ground / a building: keep the turn, tilt as far as it goes freely
      // (halving), drop the rest
      o.b = 0;
      let ok = 0, lo = 0, hi = b;
      for (let i = 0; i < 6; i++) {
        const m = (lo + hi) / 2;
        turn(a, m); cp(want, next); this.resolve(prev, next);
        if (Math.abs(next.x - want.x) + Math.abs(next.y - want.y) + Math.abs(next.z - want.z) <= 1e-3) { ok = m; lo = m; } else hi = m;
      }
      b = ok;
      yaw = turn(a, b);
      this.resolve(prev, next);
    }
    cp(this.pos, next); this.yaw = yaw; this.pitch += b;
  }
  _applyDolly(f) {
    const d = this._dolly, k = d.k * f;
    d.k -= k;
    const v = V(this.pos.x - d.p.x, this.pos.y - d.p.y, this.pos.z - d.p.z), l = len(v);
    if (l < 1e-6) return;
    let nl = Math.min(l * Math.exp(k), Math.max(l, 6000));     // (out to the whole commune, not past it)
    if (k < 0 && nl < MIN_DIST) { nl = Math.min(l, MIN_DIST); d.k = 0; }
    const u = V(v.x / l, v.y / l, v.z / l);
    let tilt = 0;
    if (k > 0) {
      // zooming OUT also tilts the view down round the point (Google Earth): from a street-level view, backing out
      // ends over the city looking down at it (50 m: >= 10 deg over the point, 2 km: >= 60 deg), the point stays put
      const el = Math.asin(clamp(u.y, -1, 1));
      const want = (10 + 50 * clamp(Math.log(nl / 50) / Math.log(40), 0, 1)) * DEG;
      if (el < want) {
        tilt = Math.min(want - el, Math.max(0.002, k * 0.9));
        tilt = Math.min(tilt, this.pitch - PITCH_MIN);
        rot(u, Math.cos(this.yaw), 0, -Math.sin(this.yaw), -tilt);
      }
    }
    // (the ceiling: shorten the step to reach it exactly, then stop; no sliding along it)
    if (u.y > 1e-3 && d.p.y + u.y * nl > MAX_Y) {
      if (tilt) { u.x = v.x / l; u.y = v.y / l; u.z = v.z / l; tilt = 0; }
      nl = u.y > 1e-3 ? Math.max(l, (MAX_Y - d.p.y) / u.y) : l; d.k = 0;
    }
    const next = V(d.p.x + u.x * nl, d.p.y + u.y * nl, d.p.z + u.z * nl);
    if (this.resolve(this.pos, next)) d.k = 0;
    cp(this.pos, next);
    this.pitch -= tilt;
  }
  _applyPan(f) {
    const p = this._pan, next = V(this.pos.x + p.x * f, this.pos.y + p.y * f, this.pos.z + p.z * f);
    p.x -= p.x * f; p.y -= p.y * f; p.z -= p.z * f;
    const want = cp(V(), next);
    this.resolve(this.pos, next);
    // the terrain lifted us: keep the height (a pan along a slope follows it)
    if (next.y !== want.y) { /* (kept) */ }
    cp(this.pos, next);
  }
  _applyFly(dt) {
    const K = this._keys, ax = (K.has("KeyD") ? 1 : 0) - (K.has("KeyA") ? 1 : 0), az = (K.has("KeyW") ? 1 : 0) - (K.has("KeyS") ? 1 : 0), ay = (K.has("KeyE") ? 1 : 0) - (K.has("KeyQ") ? 1 : 0);
    const agl = this.pos.y - this.field.terrain(this.pos.x, this.pos.z);
    const speed = clamp(agl * 1.0, 10, 320) * this.flySpeed * (K.has("ShiftLeft") || K.has("ShiftRight") ? 3 : 1);
    const F = this.fwd(), cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const w = V(F.x * az + cy * ax, F.y * az + ay, F.z * az - sy * ax), wl = len(w);
    if (wl > 1e-6) { w.x *= speed / wl; w.y *= speed / wl; w.z *= speed / wl; }
    const f = 1 - Math.exp(-dt * 8), v = this._vel;
    v.x += (w.x - v.x) * f; v.y += (w.y - v.y) * f; v.z += (w.z - v.z) * f;
    if (len(v) < 0.01) return;
    const next = V(this.pos.x + v.x * dt, this.pos.y + v.y * dt, this.pos.z + v.z * dt);
    this.resolve(this.pos, next);
    cp(this.pos, next);
    this._refocusAt = performance.now() + 150;
  }
  _adopt() {
    const cam = this.object, T = this.target, P = cam.position;
    const dx = T.x - P.x, dy = T.y - P.y, dz = T.z - P.z, l = Math.hypot(dx, dy, dz);
    // the flight under way already goes there (a caller placing the same view twice): keep flying
    const A = this._anim;
    if (A && !this._resync && Math.hypot(A.to.x - P.x, A.to.y - P.y, A.to.z - P.z) < 1e-3 && Math.hypot(A.toT.x - T.x, A.toT.y - T.y, A.toT.z - T.z) < 1e-3) return;
    if (this.glide && this._valid && !this._resync && Math.hypot(P.x - this.pos.x, P.z - this.pos.z) < 6000) { this.flyTo(cp(V(), P), cp(V(), T)); return; }
    cp(this.pos, P);
    if (l > 1e-6) { this.yaw = Math.atan2(-dx, -dz); this.pitch = clamp(Math.asin(clamp(dy / l, -1, 1)), PITCH_MIN, PITCH_MAX); }
    this.focusDist = Math.max(l, 1);
    this._anim = null; this._clearPending();
    this._valid = true; this._resync = false;
  }
  _refocus() {
    // the view centre's solid (one pick when the camera comes to rest), capped so a horizon view keeps the streaming
    // and the shadows near the camera
    const agl = this.pos.y - this.field.terrain(this.pos.x, this.pos.z);
    const cap = Math.max(120, 2.5 * agl + 60);
    const h = this.raycast(this.pos, this.fwd(), cap);
    this.focusDist = h ? Math.max(h.t, 1) : cap;
  }

  update(dt) {
    const now = performance.now();
    if (dt == null) { dt = this._t ? (now - this._t) / 1000 : 1 / 60; this._t = now; }
    dt = clamp(dt, 0, 0.1);
    const cam = this.object, T = this.target, P = cam.position, LP = this._lastPos, LT = this._lastTarget;
    const moved = !(Math.abs(P.x - LP.x) < 1e-6 && Math.abs(P.y - LP.y) < 1e-6 && Math.abs(P.z - LP.z) < 1e-6)
      || !(Math.abs(T.x - LT.x) < 1e-6 && Math.abs(T.y - LT.y) < 1e-6 && Math.abs(T.z - LT.z) < 1e-6);
    if (!this._valid || this._resync || moved) this._adopt();
    if (this._anim) {
      const A = this._anim;
      A.t += dt;
      const s = Math.min(1, A.t / A.dur), e = ease(s);
      const x = A.from.x + (A.to.x - A.from.x) * e, z = A.from.z + (A.to.z - A.from.z) * e;
      let y = A.from.y + (A.to.y - A.from.y) * e + A.lift * Math.sin(Math.PI * s);
      y = Math.min(y, Math.max(MAX_Y, A.from.y, A.to.y));
      if (this.field?.ready()) y = Math.max(y, this.field.terrain(x, z) + CLEAR);
      this.pos.x = x; this.pos.y = y; this.pos.z = z;
      const tx = A.fromT.x + (A.toT.x - A.fromT.x) * e, ty = A.fromT.y + (A.toT.y - A.fromT.y) * e, tz = A.fromT.z + (A.toT.z - A.fromT.z) * e;
      const dx = tx - x, dy = ty - y, dz = tz - z, l = Math.hypot(dx, dy, dz);
      if (l > 1e-4) { this.yaw = Math.atan2(-dx, -dz); this.pitch = clamp(Math.asin(clamp(dy / l, -1, 1)), PITCH_MIN, PITCH_MAX); }
      this.focusDist = Math.max(l, 1);
      if (s >= 1) { this._anim = null; this.focusDist = Math.max(Math.hypot(A.toT.x - A.to.x, A.toT.y - A.to.y, A.toT.z - A.to.z), 1); }
    } else {
      const damp = (k) => (this.enableDamping ? 1 - Math.exp(-dt * k) : 1);
      if (Math.abs(this._orb.a) + Math.abs(this._orb.b) > 1e-6) this._applyOrbit(damp(16));
      if (Math.abs(this._pan.x) + Math.abs(this._pan.y) + Math.abs(this._pan.z) > 1e-5) this._applyPan(damp(16));
      if (Math.abs(this._dolly.k) > 1e-5) this._applyDolly(damp(11));
      if (this._fly) this._applyFly(dt);
      else if (len(this._vel) > 0.01) { this._vel.x = this._vel.y = this._vel.z = 0; }
      if (this._refocusAt && now >= this._refocusAt && !this._drag && !this._two && !this._fly
        && Math.abs(this._orb.a) + Math.abs(this._orb.b) < 1e-3 && Math.abs(this._dolly.k) < 1e-3 && len(this._pan) < 0.05) {
        this._refocusAt = 0;
        this._refocus();
      }
    }
    // write the camera and the target (the point looked at)
    P.x = this.pos.x; P.y = this.pos.y; P.z = this.pos.z;
    cam.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    const F = this.fwd(), fd = this.focusDist;
    T.x = this.pos.x + F.x * fd; T.y = this.pos.y + F.y * fd; T.z = this.pos.z + F.z * fd;
    cp(LP, P); cp(LT, T);
    return true;
  }

  /** what the camera is doing (debug / tests) */
  info() {
    return { pos: [this.pos.x, this.pos.y, this.pos.z].map((v) => +v.toFixed(2)), yaw: +(this.yaw / DEG).toFixed(1), pitch: +(this.pitch / DEG).toFixed(1),
      focus: +this.focusDist.toFixed(1), fly: this._fly, anim: !!this._anim, picks: this.stats.picks, lastPickMs: +this.stats.lastPickMs.toFixed(3) };
  }
  dispose() { for (const f of this._off ?? []) f(); this._off = []; }
}
