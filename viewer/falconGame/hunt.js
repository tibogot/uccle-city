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
// FALCON FUN (claude/falconfun, viewer/falconFlight/falconFun.js; ?falconfun=old = the above): perched pigeons are
// prey too (the lock-on picks the one nearest the view centre), the marker is a soft ring (HOLD F, a flash when the bird
// is about to dodge, its kind: easy / RACER x2 / tired), an arrow to the nearest pigeons when nothing is locked, the run
// goal and the combo (a card at the top), the bonus line on the catch banner, the first-catch hint; hunting goes on
// with prey in the talons (the eyrie is a bonus); the game steers its own dive (no lead-point assist here).
// Cost: nothing while no falcon game runs (no updater). In the game: per frame the indicator (1 style write) and the
// assist (a few flops); the mux copies 3.7 KB of states; gauges at 4 Hz, diffed DOM writes; no allocation per frame.
import { PIGEON } from "../falconFlight/pigeons.js";
import { FUN, strikeScale } from "../falconFlight/falconFun.js";

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const NP = 256, NS = 2, G = NS * NP;      // (NS = cityFlyer.js PIGEON_FLOCKS: the square flocks drawn at once)

const CSS = `
.fg .fg-tgt.lock { border-radius: 50%; border: 2px solid rgba(255,255,255,.75); box-shadow: 0 0 14px rgba(255,255,255,.35), inset 0 0 10px rgba(255,255,255,.18); }
.fg .fg-tgt.lock i { display: none; }
.fg .fg-tgt.lock.ok { border-color: #8ef0a6; box-shadow: 0 0 16px rgba(120,240,150,.5), inset 0 0 10px rgba(120,240,150,.25); }
.fg .fg-tgt.lock.tele { border-color: #ffb347; box-shadow: 0 0 22px rgba(255,170,60,.85); }
.fg .fg-tgt.lock.racer span { color: #ffd36a; }
.fg .fg-tgt.lock.diving { border-width: 3px; }
.fg .fg-tgt.lock b { display: block; min-width: 54px; padding: 0 6px; background: rgba(14,18,24,.8); color: #fff; border: 1px solid rgba(255,255,255,.3); font-size: 11px; }
.fg .fg-tgt.lock.diving b, .fg .fg-tgt.lock.tele b { background: #ffb347; color: #1a1406; border-color: transparent; }
.fg .fg-arrow { position: absolute; left: 0; top: 0; width: 46px; height: 46px; margin: -23px; display: none; will-change: transform; }
.fg .fg-arrow.on { display: block; }
.fg .fg-arrow i { position: absolute; left: 11px; top: 4px; width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-bottom: 22px solid #ffcc33; filter: drop-shadow(0 1px 3px rgba(0,0,0,.7)); }
.fg .fg-arrow span { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 700; color: #ffe08a; text-shadow: 0 1px 3px rgba(0,0,0,.85); }
.fg .fg-goal { position: absolute; left: 50%; top: 62px; transform: translateX(-50%); padding: 6px 14px; display: none; text-align: center; font-size: 13px; font-weight: 700; white-space: nowrap; }
.fg .fg-goal.on { display: block; } .fg .fg-goal em { font-style: normal; color: #ffcc33; margin-left: 10px; }
.fg .fg-hint { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); padding: 8px 16px; display: none; font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap; }
.fg .fg-hint.on { display: block; } .fg .fg-hint kbd { font: 800 12px/1 ui-monospace, monospace; padding: 2px 6px; border-radius: 4px; background: #ffcc33; color: #1a1406; }
.fg .fg-banner.fun { top: auto; bottom: 20%; }   /* (round 3: under the strike camera's falcon, not over it) */
.fg .fg-banner.miss { border-color: rgba(255,150,60,.6); } .fg .fg-banner.miss h2 { color: #ffb347; font-size: 28px; } .fg .fg-banner.miss p { color: #ffd9a8; }
.fg .fg-tgt.lock::after { content: ""; position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px; border-radius: 50%; background: rgba(255,255,255,.9); box-shadow: 0 0 6px rgba(0,0,0,.6); }
.fg .fg-tgt.lock.ok::after { background: #8ef0a6; }
.fg .fg-banner small { display: block; margin-top: 4px; font-size: 13px; font-weight: 800; letter-spacing: .06em; color: #8ef0a6; }
@media (max-width: 640px) { .fg .fg-goal { top: 6px; font-size: 11.5px; } .fg .fg-hint { font-size: 13px; bottom: 150px; white-space: normal; width: calc(100vw - 32px); text-align: center; } }
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

/** one prey interface over the square's pigeons (CPU) and the sky flocks (GPU read-back).
 *  (falcon fun round 3) EVERY drawn square flock is prey: cityFlyer draws the NS nearest to the camera; the old mux held
 *  only the one nearest the falcon, so the other drawn flock's pigeons flew past untargetable (the owner: "I cross some
 *  birds in the sky and those were not targetable"). Indices: slot s's pigeons s x NP .. s x NP + 255 (a flock keeps
 *  its slot while it is drawn), the sky birds from G = NS x NP. ?falconfun=old: one slot, the flock nearest the falcon. */
export class PreyMux {
  constructor(gpu) {
    this.gpu = gpu; this.flock = null;
    this.flocks = new Array(NS).fill(null);
    this.state = new Uint8Array(G + (gpu ? gpu.state.length : 0)).fill(PIGEON.GONE);
    this.lastTaken = null;
    this.allowPerched = true;
    this._one = [null];
  }
  /** list: the drawn square flocks, the nearest to the falcon first (fun: all of them; old: the first), or one flock */
  sync(list, game) {
    const fun = !!game?.fun, Fs = this.flocks, one = this._one;
    if (!Array.isArray(list)) { one[0] = list; one.length = list ? 1 : 0; list = one; }
    else if (!fun && list.length > 1) { one.length = 1; one[0] = list[0]; list = one; }
    for (let s = 0; s < NS; s++) if (Fs[s] && !list.includes(Fs[s])) {
      Fs[s] = null;
      if (game && game.target >= s * NP && game.target < (s + 1) * NP) { game.target = -1; game.window = null; }
    }
    for (let k = 0; k < list.length; k++) if (!Fs.includes(list[k])) { const s = Fs.indexOf(null); if (s >= 0) Fs[s] = list[k]; }
    this.flock = list.length ? list[0] : null;
    const S = this.state;
    // (a perched bird reads as gone: the strike drops a target that lands; see target(). Falcon fun: perched birds are
    // prey too, the easy ones feeding on the setts and the roofs)
    for (let s = 0; s < NS; s++) {
      const F = Fs[s], o = s * NP;
      if (F) for (let i = 0; i < NP; i++) S[o + i] = i < F.max && (fun || F.state[i] !== PIGEON.PERCH) ? F.state[i] : PIGEON.GONE;
      else S.fill(PIGEON.GONE, o, o + NP);
    }
    if (this.gpu) S.set(this.gpu.state, G);
  }
  /** the square flock of prey index i (null: a sky bird), its own index there, the mux index of a flock's bird */
  at(i) { return i >= 0 && i < G ? this.flocks[(i / NP) | 0] : null; }
  local(i) { return i < G ? i % NP : i - G; }
  index(F, j) { const s = this.flocks.indexOf(F); return s < 0 || j < 0 ? -1 : s * NP + j; }
  target(fx, fy, fz, dx, dy, dz, maxD = 160, cone = 0.5, byAngle = false) {
    let a = -1, sa = Infinity;
    if (this.off) return -1;                     // (prey in the talons: no new hunt)
    // (falcon fun, the lock-on: the bird nearest the view centre over EVERY drawn flock and the sky flocks, one score;
    // round 2 took the nearest flock's bird whenever it had one, a sky bird only when it had none)
    if (byAngle) {
      for (let s = 0; s < NS; s++) {
        const F = this.flocks[s]; if (!F) continue;
        const k = F.target(fx, fy, fz, dx, dy, dz, maxD, cone, true);
        if (k >= 0 && k < NP && F.bestScore < sa) { sa = F.bestScore; a = s * NP + k; }
      }
      const b = this.gpu ? this.gpu.target(fx, fy, fz, dx, dy, dz, maxD, cone, true) : -1;
      return b >= 0 && this.gpu.bestScore < sa ? G + b : a;
    }
    const F = this.flock, s0 = F ? this.flocks.indexOf(F) * NP : 0;
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
        if (sc < sa) { sa = sc; a = s0 + i; }
      }
    }
    const b = this.gpu ? this.gpu.target(fx, fy, fz, dx, dy, dz, maxD, cone) : -1;
    if (b >= 0 && this.gpu.bestScore < sa) return G + b;
    return a;
  }
  pos(i, out) { return i < G ? this.flocks[(i / NP) | 0].pos(i % NP, out) : this.gpu.pos(i - G, out); }
  vel(i, out) { return i < G ? this.flocks[(i / NP) | 0].vel(i % NP, out) : this.gpu.vel(i - G, out); }
  kind(i) { return i < G ? (this.at(i)?.jackdaw?.[i % NP] ? "jackdaw" : "feral pigeon") : this.gpu.kind(i - G); }
  /** (round 3 part B) how prey i is drawn (its flock's heldLook): the held bird is that bird */
  heldLook(i, out = {}) { return i < G ? this.at(i).heldLook(i % NP, out) : this.gpu.heldLook(i - G, out); }
  take(i) {
    const kind = this.kind(i), slot = i < G ? "pigeons" : this.gpu.slotKey(i - G), F = this.at(i);
    const r = i < G ? F.take(i % NP) : this.gpu.take(i - G);
    this.state[i] = PIGEON.GONE;
    this.lastTaken = { kind, slot, t: performance.now(), square: F ? F.square?.name : null };
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
    this.slowT = 0; this.strikeAge = -1;
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
      <div class="fg-banner"><h2>CAUGHT</h2><p></p><small></small></div>
      <div class="fg-arrow"><i></i><span></span></div>
      <div class="fg-card fg-goal"><span></span><em></em></div>
      <div class="fg-card fg-hint"></div>
      <div class="fg-card fg-hunger"><h4>The eyases</h4>${[0, 1, 2].map((i) => `<div class="fg-eyas" data-e="${i}"><span>eyas ${i + 1}</span><div><u></u></div></div>`).join("")}</div>
      <div class="fg-card fg-gauge"><b>0</b><small>km/h</small><div class="fg-row"><i>height</i><span class="fg-alt">0 m</span></div><div class="fg-row"><i>climb</i><span class="fg-vy">0.0 m/s</span></div><div class="fg-row"><i>load</i><span class="fg-n">1.0 g</span></div>
        <div class="fg-sta"><u></u></div><div class="fg-assist"></div><div class="fg-chip"></div></div>`;
    document.body.append(el);
    const q = (s) => el.querySelector(s);
    this.e = { g: q(".fg-g"), flash: q(".fg-flash"), tgt: q(".fg-tgt"), tgtL: q(".fg-tgt span"), tgtB: q(".fg-tgt b"), banner: q(".fg-banner"), bannerP: q(".fg-banner p"), bannerS: q(".fg-banner small"),
      arrow: q(".fg-arrow"), arrowI: q(".fg-arrow i"), arrowL: q(".fg-arrow span"), goal: q(".fg-goal"), goalL: q(".fg-goal span"), goalC: q(".fg-goal em"), hint: q(".fg-hint"),
      hunger: q(".fg-hunger"), eyas: [...el.querySelectorAll(".fg-eyas")], eyasU: [...el.querySelectorAll(".fg-eyas u")],
      speed: q(".fg-gauge b"), alt: q(".fg-alt"), vy: q(".fg-vy"), assist: q(".fg-assist"), n: q(".fg-n"), sta: q(".fg-sta"), staU: q(".fg-sta u"), chip: q(".fg-chip") };
  }
  show(on) { document.body.classList.toggle("fg-on", on); if (!on) { this.e.tgt.classList.remove("on"); this.e.arrow.classList.remove("on"); this.cache.delete("arrow.on"); } }
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
  /** (falcon fun round 3) every drawn square flock, the nearest to the falcon first (one reused array, no sort alloc) */
  drawnFlocks(f) {
    const L = (this._fl ??= []);
    L.length = 0;
    for (const P of this.flyer.flocks) {
      if (!P.mesh.visible) continue;
      P.falconD = Math.hypot(f.pos.x - P.square.x, f.pos.z - P.square.z);
      let k = L.length; L.push(P);
      while (k > 0 && L[k - 1].falconD > P.falconD) { L[k] = L[k - 1]; L[k - 1] = P; k--; }
    }
    return L;
  }

  /** per frame (the game's updater), real dt */
  frame(dt) {
    const fl = this.flyer, g = fl.game;
    if (!fl.on || !g) { this.e.tgt.classList.remove("on"); return; }
    const f = g.f, flying = g.mode === "fly" && !fl.intro;
    // prey source
    if (g.pigeons !== this.mux) { g.pigeons = this.mux; g.target = -1; }
    this.gpu?.update(performance.now(), f.pos.x, f.pos.y, f.pos.z);
    this.mux.off = !!fl.bird.prey && !g.fun;
    this.mux.sync(g.fun ? this.drawnFlocks(f) : this.nearestFlock(f), g);
    if (this.mux.off && g.target >= 0) { g.target = -1; g.window = null; }
    // the catch / the delivery (falconGame.js counts them)
    const sc = g.score;
    if (sc.catches > this.last.catches) { this.last.catches = sc.catches; this.caught(g); }
    if (g.fun && g.fun.misses > (this.last.misses ?? 0)) { this.last.misses = g.fun.misses; this.missed(g); }
    if (sc.delivered > this.last.delivered) { this.last.delivered = sc.delivered; this.onDeliver?.(this.mux.carried, g); this.mux.carried = null; }
    // the slow motion after the hit-stop: time eased back to 1
    if (this.strikeAge >= 0) {
      // (round 3, falcon fun) the catch's slow motion: FUN.strike.slow held, then eased back (real time)
      this.strikeAge += dt;
      g.timeScale = strikeScale(this.strikeAge);
      if (g.timeScale >= 1) { g.timeScale = 1; this.strikeAge = -1; }
    } else if (this.slowT > 0) {
      this.slowT = Math.max(0, this.slowT - dt);
      if (g.hitStop <= 0) g.timeScale = 1 - 0.7 * smooth(this.slowT, 0, 0.9);
      if (this.slowT === 0) g.timeScale = 1;
    }
    if (flying && !g.fun) this.steer(g, dt);
    // with the assist, the talons come out by themselves in the last half second of a good strike (F still works)
    const w = g.window;
    if (flying && !g.fun && this.assist && w && w.ok && w.tti < 0.5) g.talonsT = Math.max(g.talonsT, 0.3);
    this.marker(g, flying);
    if (g.fun) this.arrow(g, flying);
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
    if (!flying || !w || w.i < 0 || w.d > (g.fun ? 240 : 160)) { if (this.cache.get("tgt.on") !== false) { this.cache.set("tgt.on", false); E.tgt.classList.remove("on"); } return; }
    const p = this.mux.pos(w.i, this._p);
    const v = (this._pv ??= this.camera.position.clone()).set(p.x, p.y, p.z).project(this.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { if (this.cache.get("tgt.on") !== false) { this.cache.set("tgt.on", false); E.tgt.classList.remove("on"); } return; }
    if (this.cache.get("tgt.on") !== true) { this.cache.set("tgt.on", true); E.tgt.classList.add("on"); }
    // the ticks close in with the time to intercept (2 s -> 0)
    // (round 3, falcon fun: never under 34 px, a dot at its centre: the lock is always obvious)
    const size = (g.fun ? 34 : 22) + 50 * smooth(w.tti, 0, 2.5);
    const x = (v.x * 0.5 + 0.5) * innerWidth - size / 2, y = (-v.y * 0.5 + 0.5) * innerHeight - size / 2;
    E.tgt.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const sz = size.toFixed(0);
    if (this.cache.get("tgt.sz") !== sz) { this.cache.set("tgt.sz", sz); E.tgt.style.width = E.tgt.style.height = `${sz}px`; }
    const fun = !!g.fun;
    this.cls("tgt", E.tgt, "lock", fun);
    if (fun) {
      // (falcon fun) the soft ring: green in reach soon, orange when the bird is about to dodge; HOLD F / DIVING
      this.cls("tgt", E.tgt, "ok", w.tti < 1.2 || w.d < 15);
      this.cls("tgt", E.tgt, "tele", !!w.tele);
      this.cls("tgt", E.tgt, "diving", !!g.fun.diving);
      this.cls("tgt", E.tgt, "racer", w.kind === "racer");
      this.cls("tgt", E.tgt, "far", false); this.cls("tgt", E.tgt, "strike", false);
      const pill = w.tele ? "DODGE!" : g.fun.diving ? "DIVING" : this.touchy() ? "hold STRIKE" : "hold F";
      if (this.cache.get("tgt.b") !== pill) { this.cache.set("tgt.b", pill); E.tgtB.textContent = pill; }
    } else {
      this.cls("tgt", E.tgt, "ok", w.ok);
      this.cls("tgt", E.tgt, "far", w.d > 60 && !w.ok);
      this.cls("tgt", E.tgt, "strike", w.ok && w.tti < 0.9 && !g.talonsOut);
      if (this.cache.get("tgt.b") !== "F") { this.cache.set("tgt.b", "F"); E.tgtB.textContent = "F"; }
    }
    const kn = fun && w.kind ? (w.kind === "racer" ? "RACER x2" : w.kind) : "";
    const lab = `${this.mux.kind(w.i)}${kn ? ` · ${kn}` : ""} · ${Math.round(w.d / 5) * 5} m`;
    if (this.cache.get("tgt.l") !== lab) { this.cache.set("tgt.l", lab); E.tgtL.textContent = lab; }
  }

  touchy() { return this.flyer.input?.device === "touch" || this.flyer.input?.device === "gamepad"; }

  /** (falcon fun) the arrow: nothing locked, the nearest pigeons (game.fun.arrow) shown at the screen's edge or over
   *  them, with the distance; when no flock is near, the nearest square with a flock (cityFlyer's flocks) */
  arrow(g, flying) {
    const E = this.e, A = g.fun.arrow, off = () => { if (this.cache.get("arrow.on") !== false) { this.cache.set("arrow.on", false); E.arrow.classList.remove("on"); } };
    let tx, ty, tz, d, what = "pigeons";
    const f = g.f;
    if (!flying || g.window || g.fun.cool > 0) return off();
    if (A.on) { tx = A.x; ty = A.y; tz = A.z; d = A.d; }
    else {
      let bd = Infinity, best = null;
      for (const P of this.flyer.flocks) { const dd = Math.hypot(P.square.x - f.pos.x, P.square.z - f.pos.z); if (dd < bd) { bd = dd; best = P; } }
      if (!best) return off();
      tx = best.square.x; tz = best.square.z; ty = f.pos.y - 20; d = bd; what = best.square.name;
    }
    const v = (this._av ??= this.camera.position.clone()).set(tx, ty, tz).project(this.camera);
    // on screen: over the birds; else at the edge, pointing (behind the camera: the projection flips)
    let x = v.x, y = v.y;
    const behind = v.z > 1;
    if (behind) { x = -x; y = -y; }
    const inside = !behind && Math.abs(x) < 0.85 && Math.abs(y) < 0.8;
    if (!inside) { const m = Math.max(Math.abs(x) / 0.85, Math.abs(y) / 0.8, 1e-3); x /= m; y /= m; }
    const px = (x * 0.5 + 0.5) * innerWidth, py = (-y * 0.5 + 0.5) * innerHeight;
    const ang = inside ? Math.PI : Math.atan2(x * innerWidth, y * innerHeight);
    if (this.cache.get("arrow.on") !== true) { this.cache.set("arrow.on", true); E.arrow.classList.add("on"); }
    // (the triangle turns, the label stays upright)
    E.arrow.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    E.arrowI.style.transform = `rotate(${ang.toFixed(3)}rad)`;
    const lab = `${what} · ${Math.round(d / 10) * 10} m`;
    if (this.cache.get("arrow.l") !== lab) { this.cache.set("arrow.l", lab); E.arrowL.textContent = lab; }
  }

  /** a catch: the feel (flash, slow motion, FOV kick, banner, the call) */
  caught(g) {
    const t = this.mux.lastTaken, f = g.f, kmh = Math.round((g.lastCatch?.V ?? f.V) * 3.6);
    this.mux.carried = t;
    const E = this.e;
    E.flash.classList.remove("go"); void E.flash.offsetWidth; E.flash.classList.add("go");
    E.banner.classList.remove("on"); void E.banner.offsetWidth;
    const L = g.fun?.last;
    E.bannerP.textContent = `${t?.kind ?? "prey"} · ${kmh} km/h${L ? ` · +${L.pts}` : ""}`;
    E.bannerS.textContent = L?.labels?.length ? L.labels.join(" · ") : "";
    E.banner.querySelector("h2").textContent = g.fun ? "CAUGHT!" : "CAUGHT";
    this.cls("ban", E.banner, "fun", !!g.fun);
    this.cls("ban", E.banner, "miss", false);
    E.banner.classList.add("on");
    const fc = this.flyer.fcam;
    if (g.fun) {
      // (round 3) THE CLEAR CATCH: the punch (falconGame.js), then the slow motion held ~0.5 s, the strike camera beside
      // the falcon (the talons, the pigeon), the feather puff where the pigeon was hit
      g.timeScale = FUN.strike.slow; this.strikeAge = 0; this.slowT = 0;
      fc?.strike();
      // (the feathers burst at the talons, a little toward where the pigeon was, carried a little along the falcon's
      // path: the falcon flies on through them)
      const L = g.lastCatch, P = L?.prey;
      if (P && this.flyer.puff) this.flyer.puff.burst(L.x + (P.x - L.x) * 0.15, L.y + (P.y - L.y) * 0.15 - 0.3, L.z + (P.z - L.z) * 0.15, f.vel.x * 0.6, f.vel.y * 0.6, f.vel.z * 0.6, FUN.strike.feathers, 1.4);
    } else {
      g.hitStop = Math.max(g.hitStop, 0.3); g.timeScale = 0.3; this.slowT = 1.1;
      if (fc) fc.fov += 9;
    }
    this.onCatch?.(t, kmh, g);
  }
  /** (round 3) a miss reads: the banner in orange, "DODGED!" or "MISSED" */
  missed(g) {
    const E = this.e, M = g.fun.lastMiss;
    E.banner.classList.remove("on"); void E.banner.offsetWidth;
    E.banner.querySelector("h2").textContent = M?.dodged ? "DODGED!" : "MISSED";
    this.cls("ban", E.banner, "fun", true);
    E.bannerP.textContent = M?.dodged ? "it jinked away · it tires after two escapes" : "it slipped past · come round again";
    E.bannerS.textContent = "";
    this.cls("ban", E.banner, "miss", true);
    E.banner.classList.add("on");
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
    const chip = fl.intro ? "" : g.mode === "perch" ? "PERCHED · E / Space take off" : g.mode === "land" ? "LANDING" : g.fun?.diving ? (f.V > 30 ? "STOOP" : "DIVE") : f.sprint > 0 ? "SPRINT" : fl.bird.prey && !g.fun ? "PREY IN THE TALONS" : f.fold > 0.7 && f.V > 30 ? "STOOP" : fl.bird.prey ? "PREY · the eyrie: +bonus" : "";
    this.set("chip", E.chip, chip);
    this.cls("chip", E.chip, "on", !!chip);
    this.cls("chip", E.chip, "stoop", chip === "STOOP" || chip === "DIVE" || chip === "SPRINT");
    this.cls("chip", E.chip, "perch", g.mode === "perch");
    // (falcon fun) the run goal and the combo; the first catch's hint
    const F = g.fun, flyingNow = g.mode === "fly" && !fl.intro;
    this.cls("goal", E.goal, "on", !!F && !fl.intro);
    if (F) {
      this.set("goalL", E.goalL, F.runLine(g.t));
      const combo = F.combo >= 2 && g.t - F.lastCatchT < 30 ? `COMBO ${F.combo} · ${Math.ceil(30 - (g.t - F.lastCatchT))} s` : "";
      this.set("goalC", E.goalC, combo);
      const touch = this.touchy();
      // (round 3 part B) one message at a time (falconGame.js funHud): no hint under a banner or a line; "Got it!" after
      // the first catch's banner has faded (round 3 showed it with the banner, keyed on 6 s of game time)
      const HK = g.funHud().hint;
      const hint = HK === "starter" && flyingNow ? (touch ? "A pigeon on the roof below: hold STRIKE (or DIVE) to dive onto it" : "A pigeon on the roof below: hold <kbd>Shift</kbd> (or <kbd>F</kbd>) to dive onto it")
        : HK === "gotit" && !fl.intro ? (touch ? "Got it! The arrow shows the next pigeons" : "Got it! Follow the arrow · tap <kbd>Space</kbd> to sprint") : "";
      this.set("hint", E.hint, hint, "innerHTML");
      this.cls("hint", E.hint, "on", !!hint);
    } else this.cls("hint", E.hint, "on", false);
    this.cls("hunger", E.hunger, "on", !!this.hunger);
    if (this.hunger) for (let i = 0; i < 3; i++) {
      const h = this.hunger[i];
      this.set(`h${i}`, E.eyasU[i], `${(h * 100).toFixed(0)}%`, "width");
      this.cls(`h${i}`, E.eyas[i], "low", h < 0.25); this.cls(`h${i}`, E.eyas[i], "mid", h >= 0.25 && h < 0.5);
    }
  }
}
