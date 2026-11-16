// THE HUNT LAYER of the falcon game (docs/FALCON_GAME.md "The catch"), on top of the city's falcon flight
// (viewer/falconFlight/cityFlyer.js + falconGame.js, which keep the flight model, the strike window and the catch):
//   prey      PreyMux: ONE prey source for the strike: the perched / flying pigeons of the nearest square flock
//             (pigeons.js, CPU) and the GPU sky flocks (gpuPrey.js: starlings, the murmuration, parakeets, jackdaws),
//             indices 0..255 the pigeons, 256.. the sky birds; take() says what was caught (lastTaken)
//   assist    a gentle aim assist inside the window: the falcon's path turned toward the LEAD point (the prey's
//             position + its velocity x time to intercept), at most ~0.45 rad/s, only inside 70 m and 45 deg (real
//             peregrines steer by proportional navigation, Brighton, Thomas & Taylor 2017, PNAS 114: 13495)
//   feel      the catch: a white hit flash, a short slow motion (the flight's hit-stop, then time eased back to 1 over
//             0.9 s), an FOV kick, the kek-kek call if sound is on, a banner "CAUGHT  287 km/h"; the G feel: the
//             edges darken with the load factor (pull-outs > 4 g)
//   marker    the prey indicator: four corner ticks round the target, closing in with the time to intercept, green
//             inside the window, "F" when the talons must come out (per frame, one transform write)
//   gauges    speed (km/h), height, g, stamina, the carry chip; the eyases' hunger (3 bars) when a mission feeds them
// Cost: nothing while no falcon game runs (no updater). In the game: per frame the indicator (1 style write) and the
// assist (a few flops); the mux copies 3.7 KB of states; gauges at 4 Hz, diffed DOM writes; no allocation per frame.
import { PIGEON } from "../falconFlight/pigeons.js";

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const NP = 256;

const CSS = `
body.fg-on .fhud, body.fg-on .fring.tgt { display: none !important; }
body.fg-on .ghud .g-stats span:nth-child(n+2) { display: none; }
body.fg-on .fmsg { top: auto; bottom: 64px; font-size: 14px; opacity: .92; }
.fg { position: fixed; inset: 0; pointer-events: none; z-index: 4; display: none; font: 14px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f1f4f8; }
body.fg-on .fg { display: block; } body.photo .fg { visibility: hidden; }
.fg .fg-card { background: rgba(14,18,24,.78); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,.4); }
.fg .fg-gauge { position: absolute; right: 16px; bottom: 16px; padding: 10px 14px; min-width: 150px; text-align: right; font-variant-numeric: tabular-nums; }
.fg .fg-gauge b { display: block; font: 800 36px/1 ui-monospace, "SF Mono", Consolas, monospace; }
.fg .fg-gauge small { color: #a9b4c0; font-size: 12px; font-weight: 600; }
.fg .fg-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; margin-top: 5px; color: #cfd6de; }
.fg .fg-row i { font-style: normal; color: #a9b4c0; }
.fg .fg-sta { height: 5px; border-radius: 3px; background: rgba(255,255,255,.14); margin-top: 7px; overflow: hidden; }
.fg .fg-sta u { display: block; height: 100%; background: #7fd18b; width: 100%; transition: width .25s linear; }
.fg .fg-sta.low u { background: #e0705a; }
.fg .fg-chip { display: none; margin-top: 7px; font-size: 11px; font-weight: 800; letter-spacing: .08em; color: #1a1406; background: #ffcc33; border-radius: 6px; padding: 3px 7px; text-align: center; }
.fg .fg-assist { font-size: 11.5px; margin-top: 4px; color: #a9b4c0; } .fg .fg-assist.warn { color: #ffcc33; font-weight: 700; }
.fg .fg-chip.on { display: block; } .fg .fg-chip.stoop { background: #79b4ff; } .fg .fg-chip.carry { background: #ffcc33; } .fg .fg-chip.perch { background: #6fdc8c; }
.fg .fg-hunger { position: absolute; left: 16px; top: 168px; width: min(260px, calc(100vw - 32px)); padding: 10px 12px; display: none; }
.fg .fg-hunger.on { display: block; }
.fg .fg-hunger h4 { margin: 0 0 6px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #ffcc33; }
.fg .fg-eyas { display: grid; grid-template-columns: 52px 1fr; gap: 8px; align-items: center; font-size: 12px; color: #a9b4c0; margin: 4px 0; }
.fg .fg-eyas div { height: 7px; border-radius: 4px; background: rgba(255,255,255,.14); overflow: hidden; }
.fg .fg-eyas div u { display: block; height: 100%; width: 100%; background: #6fdc8c; transition: width .25s linear, background .3s; }
.fg .fg-eyas.mid div u { background: #ffcc33; } .fg .fg-eyas.low div u { background: #ff6b5e; }
.fg .fg-tgt { position: absolute; left: 0; top: 0; width: 60px; height: 60px; display: none; will-change: transform; }
.fg .fg-tgt.on { display: block; }
.fg .fg-tgt i { position: absolute; width: 10px; height: 10px; border: 0 solid rgba(255,255,255,.8); }
.fg .fg-tgt i:nth-child(1) { left: 0; top: 0; border-left-width: 2px; border-top-width: 2px; }
.fg .fg-tgt i:nth-child(2) { right: 0; top: 0; border-right-width: 2px; border-top-width: 2px; }
.fg .fg-tgt i:nth-child(3) { left: 0; bottom: 0; border-left-width: 2px; border-bottom-width: 2px; }
.fg .fg-tgt i:nth-child(4) { right: 0; bottom: 0; border-right-width: 2px; border-bottom-width: 2px; }
.fg .fg-tgt.ok i { border-color: #6fe08a; } .fg .fg-tgt.far i { border-color: rgba(255,255,255,.45); }
.fg .fg-tgt span { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); margin-top: 4px; font-size: 11px; font-weight: 700; white-space: nowrap; color: rgba(255,255,255,.85); text-shadow: 0 1px 3px rgba(0,0,0,.8); }
.fg .fg-tgt b { position: absolute; left: 50%; top: -24px; transform: translateX(-50%); display: none; min-width: 20px; height: 20px; border-radius: 5px; background: #6fe08a; color: #0b1a0f; font: 800 12px/20px system-ui; text-align: center; }
.fg .fg-tgt.strike b { display: block; }
.fg .fg-flash { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 18%, rgba(255,255,255,.55) 55%, rgba(255,255,255,.2) 80%, rgba(255,255,255,0) 100%); opacity: 0; }
.fg .fg-flash.go { animation: fgflash .45s ease-out; }
@keyframes fgflash { 0% { opacity: 1; } 100% { opacity: 0; } }
.fg .fg-g { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(10,0,0,.85) 100%); opacity: 0; }
.fg .fg-banner { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); text-align: center; display: none; padding: 12px 26px 13px; border-radius: 14px;
  background: rgba(10,13,18,.72); border: 1px solid rgba(255,204,51,.45); box-shadow: 0 8px 30px rgba(0,0,0,.45); }
.fg .fg-banner.on { display: block; animation: fgban 1.8s ease-out forwards; }
.fg .fg-banner h2 { margin: 0; font: 900 34px/1 system-ui, sans-serif; letter-spacing: .08em; color: #fff; }
.fg .fg-banner p { margin: 6px 0 0; font-size: 16px; font-weight: 700; color: #ffcc33; }
@keyframes fgban { 0% { opacity: 0; transform: translateX(-50%) scale(1.25); } 12% { opacity: 1; transform: translateX(-50%) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; } }
/* the kit's light theme (viewer/game/hud.js): the OS's, or the dev panel's */
:root[data-ui-theme=light] .fg .fg-card { background: rgba(250,249,246,.9); border-color: rgba(0,0,0,.1); color: #161a20; box-shadow: 0 6px 22px rgba(0,0,0,.18); }
:root[data-ui-theme=light] .fg .fg-row, :root[data-ui-theme=light] .fg .fg-eyas { color: #4f5966; }
:root[data-ui-theme=light] .fg .fg-gauge small, :root[data-ui-theme=light] .fg .fg-row i { color: #4f5966; }
:root[data-ui-theme=light] .fg .fg-sta, :root[data-ui-theme=light] .fg .fg-eyas div { background: rgba(0,0,0,.1); }
:root[data-ui-theme=light] .fg .fg-hunger h4 { color: #b07f00; }
@media (prefers-color-scheme: light) {
  :root:not([data-ui-theme=dark]) .fg .fg-card { background: rgba(250,249,246,.9); border-color: rgba(0,0,0,.1); color: #161a20; box-shadow: 0 6px 22px rgba(0,0,0,.18); }
  :root:not([data-ui-theme=dark]) .fg .fg-row, :root:not([data-ui-theme=dark]) .fg .fg-eyas, :root:not([data-ui-theme=dark]) .fg .fg-gauge small, :root:not([data-ui-theme=dark]) .fg .fg-row i { color: #4f5966; }
  :root:not([data-ui-theme=dark]) .fg .fg-sta, :root:not([data-ui-theme=dark]) .fg .fg-eyas div { background: rgba(0,0,0,.1); }
  :root:not([data-ui-theme=dark]) .fg .fg-hunger h4 { color: #b07f00; }
}
@media (max-width: 640px) { .fg .fg-hunger { top: auto; bottom: 140px; } .fg .fg-gauge b { font-size: 26px; } }
`;

/** one prey interface over the square's pigeons (CPU) and the sky flocks (GPU read-back) */
export class PreyMux {
  constructor(gpu) {
    this.gpu = gpu; this.flock = null;
    this.state = new Uint8Array(NP + (gpu ? gpu.state.length : 0)).fill(PIGEON.GONE);
    this.lastTaken = null;
    this.allowPerched = true;
  }
  sync(flock, game) {
    if (flock !== this.flock) { this.flock = flock; if (game) { game.target = -1; game.window = null; } }
    const S = this.state, F = flock;
    // (a perched bird reads as gone: the strike drops a target that lands; see target())
    if (F) for (let i = 0; i < NP; i++) S[i] = i < F.max && F.state[i] !== PIGEON.PERCH ? F.state[i] : PIGEON.GONE;
    else S.fill(PIGEON.GONE, 0, NP);
    if (this.gpu) S.set(this.gpu.state, NP);
  }
  target(fx, fy, fz, dx, dy, dz, maxD = 160, cone = 0.5) {
    let a = -1, sa = Infinity;
    if (this.off) return -1;                     // (prey in the talons: no new hunt)
    const F = this.flock;
    if (F) {
      // flying birds only: a peregrine takes its prey in the air (a perched pigeon flushes as the falcon comes: then
      // it is a target); a stoop at a bird on a ridge or the setts ends in the roof
      const L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L, cc = Math.cos(cone);
      for (let i = 0; i < F.max; i++) {
        const s = F.state[i];
        if (s !== PIGEON.FLY && s !== PIGEON.LAND) continue;
        const o = i * 3, ex = F.p[o] - fx, ey = F.p[o + 1] - fy, ez = F.p[o + 2] - fz, d = Math.hypot(ex, ey, ez);
        if (d > maxD || d < 0.01) continue;
        const c = (ex * ux + ey * uy + ez * uz) / d;
        if (c < cc) continue;
        const sc = d * (2 - c);
        if (sc < sa) { sa = sc; a = i; }
      }
    }
    const b = this.gpu ? this.gpu.target(fx, fy, fz, dx, dy, dz, maxD, cone) : -1;
    if (b >= 0 && this.gpu.bestScore < sa) return NP + b;
    return a;
  }
  pos(i, out) { return i < NP ? this.flock.pos(i, out) : this.gpu.pos(i - NP, out); }
  vel(i, out) { return i < NP ? this.flock.vel(i, out) : this.gpu.vel(i - NP, out); }
  kind(i) { return i < NP ? (this.flock?.jackdaw?.[i] ? "jackdaw" : "feral pigeon") : this.gpu.kind(i - NP); }
  take(i) {
    const kind = this.kind(i), slot = i < NP ? "pigeons" : this.gpu.slotKey(i - NP);
    const r = i < NP ? this.flock.take(i) : this.gpu.take(i - NP);
    this.state[i] = PIGEON.GONE;
    this.lastTaken = { kind, slot, t: performance.now(), square: i < NP ? this.flock.square?.name : null };
    this.onTake?.(this.lastTaken);
    return r;
  }
}

export class FalconHunt {
  constructor({ flyer, camera, gpu }) {
    this.flyer = flyer; this.camera = camera;
    this.mux = new PreyMux(gpu);
    this.gpu = gpu;
    this.assist = 1;                       // 0 off .. 1 the default strength
    this.slowT = 0;
    this.hunger = null;                    // [3] 0..1 when a mission feeds the eyases
    this._v = { x: 0, y: 0, z: 0 }; this._w = { x: 0, y: 0, z: 0 }; this._p = { x: 0, y: 0, z: 0 };
    this.last = { catches: 0, delivered: 0 };
    this.onCatch = null; this.onDeliver = null;
    this.gLevel = 0; this.cache = new Map();
    this.build();
  }

  build() {
    if (!document.getElementById("falcongame-css")) { const st = document.createElement("style"); st.id = "falcongame-css"; st.textContent = CSS; document.head.append(st); }
    const el = this.el = document.createElement("div");
    el.className = "fg";
    el.innerHTML = `<div class="fg-g"></div><div class="fg-flash"></div>
      <div class="fg-tgt"><i></i><i></i><i></i><i></i><span></span><b>F</b></div>
      <div class="fg-banner"><h2>CAUGHT</h2><p></p></div>
      <div class="fg-card fg-hunger"><h4>The eyases</h4>${[0, 1, 2].map((i) => `<div class="fg-eyas" data-e="${i}"><span>eyas ${i + 1}</span><div><u></u></div></div>`).join("")}</div>
      <div class="fg-card fg-gauge"><b>0</b><small>km/h</small><div class="fg-row"><i>height</i><span class="fg-alt">0 m</span></div><div class="fg-row"><i>climb</i><span class="fg-vy">0.0 m/s</span></div><div class="fg-row"><i>load</i><span class="fg-n">1.0 g</span></div>
        <div class="fg-sta"><u></u></div><div class="fg-assist"></div><div class="fg-chip"></div></div>`;
    document.body.append(el);
    const q = (s) => el.querySelector(s);
    this.e = { g: q(".fg-g"), flash: q(".fg-flash"), tgt: q(".fg-tgt"), tgtL: q(".fg-tgt span"), banner: q(".fg-banner"), bannerP: q(".fg-banner p"),
      hunger: q(".fg-hunger"), eyas: [...el.querySelectorAll(".fg-eyas")], eyasU: [...el.querySelectorAll(".fg-eyas u")],
      speed: q(".fg-gauge b"), alt: q(".fg-alt"), vy: q(".fg-vy"), assist: q(".fg-assist"), n: q(".fg-n"), sta: q(".fg-sta"), staU: q(".fg-sta u"), chip: q(".fg-chip") };
  }
  show(on) { document.body.classList.toggle("fg-on", on); if (!on) this.e.tgt.classList.remove("on"); }
  set(k, el, v, prop = "textContent") { if (this.cache.get(k) === v) return; this.cache.set(k, v); if (prop === "width") el.style.width = v; else el[prop] = v; }
  cls(k, el, name, on) { const key = `${k}.${name}`; if (this.cache.get(key) === on) return; this.cache.set(key, on); el.classList.toggle(name, on); }

  /** the flock the strike hunts: the nearest drawn square flock to the falcon (cityFlyer builds them) */
  nearestFlock(f) {
    let best = null, bd = Infinity;
    for (const P of this.flyer.flocks) {
      if (!P.mesh.visible) continue;
      const d = Math.hypot(f.pos.x - P.square.x, f.pos.z - P.square.z);
      if (d < bd) { bd = d; best = P; }
    }
    return best;
  }

  /** per frame (the game's updater), real dt */
  frame(dt) {
    const fl = this.flyer, g = fl.game;
    if (!fl.on || !g) { this.e.tgt.classList.remove("on"); return; }
    const f = g.f, flying = g.mode === "fly" && !fl.intro;
    // prey source
    if (g.pigeons !== this.mux) { g.pigeons = this.mux; g.target = -1; }
    this.gpu?.update(performance.now(), f.pos.x, f.pos.y, f.pos.z);
    this.mux.off = !!fl.bird.prey;
    this.mux.sync(this.nearestFlock(f), g);
    if (this.mux.off && g.target >= 0) { g.target = -1; g.window = null; }
    // the catch / the delivery (falconGame.js counts them)
    const sc = g.score;
    if (sc.catches > this.last.catches) { this.last.catches = sc.catches; this.caught(g); }
    if (sc.delivered > this.last.delivered) { this.last.delivered = sc.delivered; this.onDeliver?.(this.mux.carried, g); this.mux.carried = null; }
    // the slow motion after the hit-stop: time eased back to 1
    if (this.slowT > 0) {
      this.slowT = Math.max(0, this.slowT - dt);
      if (g.hitStop <= 0) g.timeScale = 1 - 0.7 * smooth(this.slowT, 0, 0.9);
      if (this.slowT === 0) g.timeScale = 1;
    }
    if (flying) this.steer(g, dt);
    // with the assist, the talons come out by themselves in the last half second of a good strike (F still works)
    const w = g.window;
    if (flying && this.assist && w && w.ok && w.tti < 0.5) g.talonsT = Math.max(g.talonsT, 0.3);
    this.marker(g, flying);
    // the G feel: the edges darken above ~3.5 g
    const gl = flying ? smooth(f.n, 3.2, 6.5) * 0.75 : 0;
    this.gLevel += (gl - this.gLevel) * (1 - Math.exp(-6 * dt));
    const gv = this.gLevel.toFixed(2);
    if (this.cache.get("g") !== gv) { this.cache.set("g", gv); this.e.g.style.opacity = gv; }
  }

  /** the aim assist: the path turned toward the lead point, inside the window */
  steer(g, dt) {
    const w = g.window, f = g.f;
    if (!this.assist || !w || w.i < 0 || w.d > 70 || w.angle > 0.8 || w.closing < 4 || g.hitStop > 0) return;
    // (falconfix) not while the flight assist steers clear of a roof / crown: the lead point does not pull the bird
    // into the trees (browser check: a low street pass was turned into the crowns by a pigeon 55 m off)
    if (g.assist && g.assist.avoiding > 0.3) return;
    const T = this.mux.pos(w.i, this._p), U = this.mux.vel(w.i, this._w);
    const tti = clamp(w.d / Math.max(w.closing, 1), 0, 2);
    let ax = T.x + U.x * tti - f.pos.x, ay = T.y + U.y * tti - f.pos.y, az = T.z + U.z * tti - f.pos.z;
    const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
    const V = Math.hypot(f.vel.x, f.vel.y, f.vel.z) || 1;
    const vx = f.vel.x / V, vy = f.vel.y / V, vz = f.vel.z / V;
    const c = clamp(vx * ax + vy * ay + vz * az, -1, 1), ang = Math.acos(c);
    if (ang < 1e-4) return;
    g.steerT = g.t;                         // (the flight assist follows this path, falconGame.js)
    const k = this.assist * smooth(70 - w.d, 0, 45) * (1 - smooth(w.angle, 0.55, 0.8));
    const turn = Math.min(ang, 0.45 * k * dt);
    // slerp the direction by `turn` toward the lead, keep the speed
    const s = Math.sin(ang), a = Math.sin(ang - turn) / s, b = Math.sin(turn) / s;
    f.vel.x = (vx * a + ax * b) * V; f.vel.y = (vy * a + ay * b) * V; f.vel.z = (vz * a + az * b) * V;
  }

  marker(g, flying) {
    const w = g.window, E = this.e;
    if (!flying || !w || w.i < 0 || w.d > 160) { if (this.cache.get("tgt.on") !== false) { this.cache.set("tgt.on", false); E.tgt.classList.remove("on"); } return; }
    const p = this.mux.pos(w.i, this._p);
    const v = (this._pv ??= this.camera.position.clone()).set(p.x, p.y, p.z).project(this.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { if (this.cache.get("tgt.on") !== false) { this.cache.set("tgt.on", false); E.tgt.classList.remove("on"); } return; }
    if (this.cache.get("tgt.on") !== true) { this.cache.set("tgt.on", true); E.tgt.classList.add("on"); }
    // the ticks close in with the time to intercept (2 s -> 0)
    const size = 22 + 50 * smooth(w.tti, 0, 2.5);
    const x = (v.x * 0.5 + 0.5) * innerWidth - size / 2, y = (-v.y * 0.5 + 0.5) * innerHeight - size / 2;
    E.tgt.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const sz = size.toFixed(0);
    if (this.cache.get("tgt.sz") !== sz) { this.cache.set("tgt.sz", sz); E.tgt.style.width = E.tgt.style.height = `${sz}px`; }
    this.cls("tgt", E.tgt, "ok", w.ok);
    this.cls("tgt", E.tgt, "far", w.d > 60 && !w.ok);
    this.cls("tgt", E.tgt, "strike", w.ok && w.tti < 0.9 && !g.talonsOut);
    const lab = `${this.mux.kind(w.i)} · ${Math.round(w.d / 5) * 5} m`;
    if (this.cache.get("tgt.l") !== lab) { this.cache.set("tgt.l", lab); E.tgtL.textContent = lab; }
  }

  /** a catch: the feel (flash, slow motion, FOV kick, banner, the call) */
  caught(g) {
    const t = this.mux.lastTaken, f = g.f, kmh = Math.round((g.lastCatch?.V ?? f.V) * 3.6);
    this.mux.carried = t;
    const E = this.e;
    E.flash.classList.remove("go"); void E.flash.offsetWidth; E.flash.classList.add("go");
    E.banner.classList.remove("on"); void E.banner.offsetWidth;
    E.bannerP.textContent = `${t?.kind ?? "prey"} · ${kmh} km/h`;
    E.banner.classList.add("on");
    g.hitStop = Math.max(g.hitStop, 0.3); g.timeScale = 0.3; this.slowT = 1.1;
    const fc = this.flyer.fcam; if (fc) fc.fov += 9;
    this.onCatch?.(t, kmh, g);
  }

  /** the 4 Hz gauges */
  hud(alt) {
    const fl = this.flyer, g = fl.game, E = this.e;
    if (!g) return;
    const f = g.f, V = g.mode === "fly" && !fl.intro ? f.V : 0;
    this.set("spd", E.speed, String(Math.round(V * 3.6)));
    this.set("alt", E.alt, `${Math.round(alt ?? g.agl ?? 0)} m`);
    this.set("n", E.n, `${Math.max(0, g.mode === "fly" ? f.n : 1).toFixed(1)} g`);
    // (falconfix) the climb rate (arrows) and what the flight assist is doing
    const vy = g.mode === "fly" && !fl.intro ? f.vel.y : 0;
    this.set("vy", E.vy, `${vy > 0.4 ? "▲ " : vy < -0.4 ? "▼ " : ""}${Math.abs(vy).toFixed(1)} m/s`);
    const A = g.assist, am = A && g.mode === "fly" && !fl.intro ? A.mode : "";
    const AT = { hold: "holding height", turn: "turning", climb: "climbing", descend: "descending", stoop: "stooping", pullout: "pulling out", avoid: "avoiding an obstacle", slow: "too slow: flapping", tumble: "crashed: recovering", strike: "strike assist", level: "level" };
    this.set("as", E.assist, am ? `${AT[am] ?? am}${f.stamina < 0.15 ? " · tired" : ""}` : "");
    this.cls("as", E.assist, "warn", am === "avoid" || am === "tumble" || am === "slow" || am === "pullout");
    this.set("sta", E.staU, `${(clamp(f.stamina, 0, 1) * 100).toFixed(0)}%`, "width");
    this.cls("sta", E.sta, "low", f.stamina < 0.15);
    const chip = fl.intro ? "" : g.mode === "perch" ? "PERCHED · E / Space take off" : g.mode === "land" ? "LANDING" : fl.bird.prey ? "PREY IN THE TALONS" : f.fold > 0.7 && f.V > 30 ? "STOOP" : "";
    this.set("chip", E.chip, chip);
    this.cls("chip", E.chip, "on", !!chip);
    this.cls("chip", E.chip, "stoop", chip === "STOOP");
    this.cls("chip", E.chip, "perch", g.mode === "perch");
    this.cls("hunger", E.hunger, "on", !!this.hunger);
    if (this.hunger) for (let i = 0; i < 3; i++) {
      const h = this.hunger[i];
      this.set(`h${i}`, E.eyasU[i], `${(h * 100).toFixed(0)}%`, "width");
      this.cls(`h${i}`, E.eyas[i], "low", h < 0.25); this.cls(`h${i}`, E.eyas[i], "mid", h >= 0.25 && h < 0.5);
    }
  }
}
