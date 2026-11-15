// THE PLAYER HUD + MENUS (docs/GAMEKIT.md "HUD"): our own DOM UI (never lil-gui), separate from the dev panel / dev HUD.
//   top left      objective card: game chip, mission title, objective, a live line (distance, "hold 3 s"), progress bar
//   top right     timer (red under 10 s), score / money / reputation
//   right         radio card: portrait icon, who, the message; a dispatch call adds Accept (Y) / Ignore (X) + a time bar
//   bottom centre prompt ("E  Talk to the owner")         bottom right   speed (km/h) in a vehicle
//   centre        toasts (mission passed / failed, with the rewards) and the menus: start, pause, settings
// Cost: the kit calls the setters at 4 Hz; each writes the DOM only when its value changed (no per-frame DOM work, no
// layout reads). Hidden (no game) = display: none. Photo mode (H) hides it (body.photo). Dark by default, a light
// variant with the OS / the dev panel's theme (:root[data-ui-theme]).
const CSS = `
.ghud, .gmenu { --g-bg: rgba(14,18,24,.82); --g-bg2: rgba(28,34,43,.92); --g-fg: #f1f4f8; --g-muted: #a9b4c0; --g-line: rgba(255,255,255,.12);
  --g-acc: #ffcc33; --g-acc-fg: #1a1406; --g-bad: #ff6b5e; --g-ok: #6fdc8c; --g-blue: #79b4ff; --g-shadow: 0 6px 24px rgba(0,0,0,.45);
  font: 14px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--g-fg); }
:root[data-ui-theme=light] .ghud, :root[data-ui-theme=light] .gmenu { --g-bg: rgba(250,249,246,.9); --g-bg2: rgba(255,255,255,.96); --g-fg: #161a20;
  --g-muted: #4f5966; --g-line: rgba(0,0,0,.1); --g-acc: #f2b500; --g-shadow: 0 6px 22px rgba(0,0,0,.18); --g-blue: #1f62c4; --g-ok: #1f8f3e; --g-bad: #c8352a; }
@media (prefers-color-scheme: light) { :root:not([data-ui-theme=dark]) .ghud, :root:not([data-ui-theme=dark]) .gmenu { --g-bg: rgba(250,249,246,.9);
  --g-bg2: rgba(255,255,255,.96); --g-fg: #161a20; --g-muted: #4f5966; --g-line: rgba(0,0,0,.1); --g-acc: #f2b500; --g-shadow: 0 6px 22px rgba(0,0,0,.18);
  --g-blue: #1f62c4; --g-ok: #1f8f3e; --g-bad: #c8352a; } }
.ghud { position: fixed; inset: 0; pointer-events: none; z-index: 4; display: none; user-select: none; }
body.game-on .ghud { display: block; }
body.photo .ghud, body.photo .gmenu, body.photo .gplay { visibility: hidden !important; }
body.game-on:not(.game-dev) #hud, body.game-on:not(.game-dev) .upanel { display: none !important; }
body.game-on .g-drivehud { display: none !important; }
.ghud .gcard { background: var(--g-bg); border: 1px solid var(--g-line); border-radius: 12px; box-shadow: var(--g-shadow); }
.ghud .g-obj { position: absolute; left: 16px; top: 16px; width: min(360px, calc(100vw - 32px)); padding: 12px 14px 12px; display: none; }
.ghud .g-obj.on { display: block; }
.ghud .g-chip { display: inline-flex; gap: 6px; align-items: center; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--g-acc); }
.ghud .g-chip small { color: var(--g-muted); font-weight: 600; letter-spacing: .04em; }
.ghud .g-title { font-size: 16px; font-weight: 700; margin: 3px 0 2px; }
.ghud .g-text { font-size: 15px; }
.ghud .g-line { font-size: 13px; color: var(--g-muted); margin-top: 3px; min-height: 1em; font-variant-numeric: tabular-nums; }
.ghud .g-line.warn { color: var(--g-bad); font-weight: 600; }
.ghud .g-bar { height: 5px; border-radius: 3px; background: var(--g-line); margin-top: 8px; overflow: hidden; display: none; }
.ghud .g-bar.on { display: block; }
.ghud .g-bar i { display: block; height: 100%; width: 0; background: var(--g-acc); border-radius: 3px; transition: width .25s linear; }
.ghud .g-tr { position: absolute; right: 16px; top: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.ghud .g-timer { font: 700 30px/1 ui-monospace, "SF Mono", Consolas, monospace; padding: 9px 14px; display: none; font-variant-numeric: tabular-nums; }
.ghud .g-timer.on { display: block; } .ghud .g-timer.warn { color: var(--g-bad); }
.ghud .g-stats { display: flex; gap: 14px; padding: 8px 14px; font-weight: 650; font-variant-numeric: tabular-nums; }
.ghud .g-stats span { display: inline-flex; gap: 5px; align-items: baseline; } .ghud .g-stats small { color: var(--g-muted); font-weight: 500; font-size: 12px; }
.ghud .g-radio { position: absolute; right: 16px; top: 132px; width: min(340px, calc(100vw - 32px)); padding: 12px; display: none; gap: 12px; pointer-events: auto; }
.ghud .g-radio.on { display: flex; animation: gin .25s ease-out; }
@keyframes gin { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
.ghud .g-face { flex: none; width: 46px; height: 46px; border-radius: 10px; display: grid; place-items: center; background: var(--g-bg2); color: var(--g-acc); border: 1px solid var(--g-line); }
.ghud .g-face svg { width: 28px; height: 28px; }
.ghud .g-radio.urgent .g-face { color: var(--g-bad); }
.ghud .g-msg { flex: 1; min-width: 0; }
.ghud .g-from { font-size: 12px; font-weight: 700; color: var(--g-muted); text-transform: uppercase; letter-spacing: .06em; }
.ghud .g-say { font-size: 14.5px; margin-top: 2px; }
.ghud .g-acts { display: none; gap: 8px; margin-top: 9px; } .ghud .g-radio.call .g-acts { display: flex; }
.ghud .g-acts button, .gmenu button { font: inherit; font-weight: 650; border-radius: 9px; border: 1px solid var(--g-line); background: var(--g-bg2); color: var(--g-fg); padding: 7px 12px; cursor: pointer; }
.ghud .g-acts button:hover, .gmenu button:hover { border-color: var(--g-acc); }
.ghud .g-acts button.pri, .gmenu button.pri { background: var(--g-acc); color: var(--g-acc-fg); border-color: transparent; }
.ghud kbd, .gmenu kbd { font: 700 11px/1 ui-monospace, Consolas, monospace; padding: 3px 5px; border-radius: 4px; background: rgba(127,127,127,.25); margin-left: 6px; }
.ghud .g-ctime { height: 3px; border-radius: 2px; background: var(--g-line); margin-top: 9px; overflow: hidden; display: none; } .ghud .g-radio.call .g-ctime { display: block; }
.ghud .g-ctime i { display: block; height: 100%; background: var(--g-blue); width: 100%; transition: width .25s linear; }
.ghud .g-prompt { position: absolute; left: 50%; bottom: 110px; transform: translateX(-50%); padding: 10px 16px; font-size: 16px; font-weight: 600; display: none; white-space: nowrap; }
.ghud .g-prompt.on { display: block; }
.ghud .g-prompt b { display: inline-grid; place-items: center; min-width: 26px; height: 26px; border-radius: 7px; background: var(--g-acc); color: var(--g-acc-fg); margin-right: 10px; font-weight: 800; }
.ghud .g-speed { position: absolute; right: 16px; bottom: 16px; padding: 8px 16px 10px; text-align: right; display: none; min-width: 92px; }
.ghud .g-speed.on { display: block; }
.ghud .g-speed b { font: 800 38px/1 ui-monospace, "SF Mono", Consolas, monospace; font-variant-numeric: tabular-nums; } .ghud .g-speed small { display: block; color: var(--g-muted); font-size: 12px; font-weight: 600; }
.ghud .g-toast { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; padding: 18px 28px; display: none; pointer-events: auto; min-width: 280px; }
.ghud .g-toast.on { display: block; animation: gpop .3s ease-out; }
@keyframes gpop { from { transform: translate(-50%, -50%) scale(.9); opacity: 0; } }
.ghud .g-toast h2 { margin: 0; font-size: 28px; letter-spacing: .04em; text-transform: uppercase; } .ghud .g-toast.ok h2 { color: var(--g-ok); } .ghud .g-toast.bad h2 { color: var(--g-bad); }
.ghud .g-toast p { margin: 6px 0 0; color: var(--g-muted); } .ghud .g-toast .g-rw { margin-top: 8px; font-weight: 700; font-size: 16px; }
.ghud .g-toast .g-acts { display: flex; justify-content: center; margin-top: 12px; }
.ghud .g-keys { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); color: var(--g-muted); font-size: 12px; background: var(--g-bg); padding: 5px 10px; border-radius: 8px; border: 1px solid var(--g-line); white-space: nowrap; }
body.umap-on.game-on .ghud .g-keys { left: calc(50% + 60px); }
.gplay { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); z-index: 3; font: 700 13px/1 system-ui, sans-serif; padding: 9px 13px; border-radius: 10px; cursor: pointer;
  background: rgba(14,18,24,.85); color: #ffcc33; border: 1px solid rgba(255,255,255,.14); box-shadow: 0 4px 16px rgba(0,0,0,.4); }
body.game-on .gplay, body.loading .gplay, .gmenu.on ~ .gplay { display: none; }
.gmenu { position: fixed; inset: 0; z-index: 8; display: none; place-items: center; background: rgba(6,9,13,.55); }
.gmenu.on { display: grid; }
.gmenu .gm-card { width: min(980px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; background: var(--g-bg2); border: 1px solid var(--g-line); border-radius: 16px; box-shadow: var(--g-shadow); padding: 22px 24px; }
.gmenu.small .gm-card { width: min(380px, calc(100vw - 32px)); }
.gmenu h1 { margin: 0; font-size: 26px; letter-spacing: .02em; } .gmenu h1 small { font-size: 13px; color: var(--g-muted); font-weight: 500; margin-left: 8px; }
.gmenu .gm-sub { color: var(--g-muted); margin: 4px 0 16px; }
.gmenu .gm-games { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.gmenu .gm-game { border: 1px solid var(--g-line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; background: rgba(127,127,127,.06); }
.gmenu .gm-game.soon { opacity: .62; }
.gmenu .gm-game .gm-ico { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: rgba(127,127,127,.14); color: var(--g-acc); }
.gmenu .gm-game .gm-ico svg { width: 26px; height: 26px; }
.gmenu .gm-game h3 { margin: 0; font-size: 17px; } .gmenu .gm-game p { margin: 0; color: var(--g-muted); font-size: 13px; flex: 1; }
.gmenu .gm-game .gm-modes { display: flex; flex-direction: column; gap: 6px; }
.gmenu .gm-game .gm-modes button { text-align: left; }
.gmenu .gm-game .gm-modes button small { display: block; font-weight: 500; font-size: 12px; opacity: .8; }
.gmenu .gm-badge { display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--g-muted); border: 1px solid var(--g-line); border-radius: 6px; padding: 2px 6px; }
.gmenu .gm-opt { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--g-muted); cursor: pointer; }
.gmenu .gm-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.gmenu .gm-list button { width: 100%; padding: 10px 14px; text-align: left; }
.gmenu .gm-row { display: grid; grid-template-columns: 130px 1fr; gap: 10px; align-items: center; margin: 10px 0; }
.gmenu .gm-row label { color: var(--g-muted); } .gmenu input[type=range] { width: 100%; accent-color: var(--g-acc); }
.gmenu .gm-seg { display: flex; gap: 6px; flex-wrap: wrap; } .gmenu .gm-seg button.on { border-color: var(--g-acc); color: var(--g-acc); }
.gmenu .gm-foot { margin-top: 16px; color: var(--g-muted); font-size: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.gmenu .gm-stat { color: var(--g-muted); font-size: 12px; }
@media (max-width: 640px) { .ghud .g-radio { top: auto; bottom: 96px; } .ghud .g-timer { font-size: 22px; } .ghud .g-keys { display: none; } }
`;
export const ICONS = {
  radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="7" width="12" height="15" rx="2"/><path d="M9 7V2M10 11h4M10 14h4M10 17h4"/></svg>',
  police: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m12 7 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="currentColor" stroke="none"/></svg>',
  falcon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 9c4-1 7 0 9 2l1-3c1-2 3-3 5-3l3 1-2 1c1 1 1 3 0 4-1 2-3 3-5 3l3 6-3-1-2-4c-2 1-5 1-9-6 0 0 0 0 0 0z"/></svg>',
  roam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  demo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16v-4l2-5h14l2 5v4z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="6" r="3"/><path d="M5 21c1-5 3.5-7 7-7s6 2 7 7"/></svg>',
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clock = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export class GameHud {
  constructor() {
    if (!document.getElementById("gamekit-css")) { const st = document.createElement("style"); st.id = "gamekit-css"; st.textContent = CSS; document.head.append(st); }
    const el = (this.el = document.createElement("div"));
    el.className = "ghud";
    el.innerHTML = `
      <div class="gcard g-obj"><div class="g-chip"><span class="g-game"></span><small class="g-step"></small></div><div class="g-title"></div><div class="g-text"></div><div class="g-line"></div><div class="g-bar"><i></i></div></div>
      <div class="g-tr"><div class="gcard g-timer"></div><div class="gcard g-stats"><span><small>score</small><b class="g-score">0</b></span><span><small>€</small><b class="g-money">0</b></span><span><small>rep</small><b class="g-rep">0</b></span></div></div>
      <div class="gcard g-radio"><div class="g-face"></div><div class="g-msg"><div class="g-from"></div><div class="g-say"></div>
        <div class="g-acts"><button class="pri" data-a="accept">Accept<kbd>Y</kbd></button><button data-a="ignore">Ignore<kbd>X</kbd></button></div><div class="g-ctime"><i></i></div></div></div>
      <div class="gcard g-prompt"><b>E</b><span></span></div>
      <div class="gcard g-speed"><b>0</b><small>km/h</small></div>
      <div class="gcard g-toast"></div>
      <div class="g-keys"></div>`;
    document.body.append(el);
    const q = (s) => el.querySelector(s);
    this.e = { obj: q(".g-obj"), game: q(".g-game"), step: q(".g-step"), title: q(".g-title"), text: q(".g-text"), line: q(".g-line"), bar: q(".g-bar"), barI: q(".g-bar i"),
      timer: q(".g-timer"), score: q(".g-score"), money: q(".g-money"), rep: q(".g-rep"), radio: q(".g-radio"), face: q(".g-face"), from: q(".g-from"), say: q(".g-say"),
      ctime: q(".g-ctime i"), prompt: q(".g-prompt"), promptT: q(".g-prompt span"), speed: q(".g-speed"), speedB: q(".g-speed b"), toast: q(".g-toast"), keys: q(".g-keys") };
    this.cache = new Map();
    this.onAction = null;              // (action) => void: accept / ignore / toast buttons
    el.addEventListener("click", (ev) => { const a = ev.target.closest("button")?.dataset.a; if (a) this.onAction?.(a); });
    this.menu = document.createElement("div");
    this.menu.className = "gmenu";
    document.body.append(this.menu);
    this.menu.addEventListener("click", (ev) => {
      if (ev.target === this.menu && this.menuDismiss) { this.menuDismiss(); return; }
      const b = ev.target.closest("[data-m]");
      if (b && !b.disabled) this.menuAct?.(b.dataset.m, b);
    });
    this.menu.addEventListener("input", (ev) => this.menuInput?.(ev.target));
    this.radioT = 0; this.radioQ = []; this.toastT = 0;
  }
  // ---- diffed writes (4 Hz callers): the DOM is touched only when a value changes
  set(key, el, v, prop = "textContent") { if (this.cache.get(key) === v) return; this.cache.set(key, v); el[prop] = v; }
  cls(key, el, name, on) { const k = `${key}.${name}`; if (this.cache.get(k) === on) return; this.cache.set(k, on); el.classList.toggle(name, on); }
  show(on) { document.body.classList.toggle("game-on", on); if (!on) { this.prompt(null); this.toast(null); this.radioQ.length = 0; this.cls("radio", this.e.radio, "on", false); this.calling = null; } }
  keys(text) { this.set("keys", this.e.keys, text, "innerHTML"); }
  objective(o, gameTitle, modeLabel) {
    const E = this.e;
    this.cls("obj", E.obj, "on", !!o || !!gameTitle);
    this.set("game", E.game, gameTitle || "");
    if (!o) {
      this.set("step", E.step, modeLabel || ""); this.set("title", E.title, modeLabel === "Free play" ? "Free play" : "");
      this.set("text", E.text, this.idleText || ""); this.set("line", E.line, ""); this.cls("bar", E.bar, "on", false); return;
    }
    this.set("step", E.step, o.steps > 1 ? `step ${o.step} / ${o.steps}` : "");
    this.set("title", E.title, o.title);
    this.set("text", E.text, o.text);
    this.set("line", E.line, o.line || "");
    this.cls("line", E.line, "warn", !!o.warn);
    this.cls("bar", E.bar, "on", o.progress != null);
    if (o.progress != null) this.set("barw", E.barI.style, `${(o.progress * 100).toFixed(0)}%`, "width");
  }
  timer(sec) {
    this.cls("timer", this.e.timer, "on", sec != null);
    if (sec == null) return;
    this.set("timerT", this.e.timer, clock(sec));
    this.cls("timer", this.e.timer, "warn", sec <= 10);
  }
  stats(s) { this.set("score", this.e.score, String(s.score)); this.set("money", this.e.money, String(s.money)); this.set("rep", this.e.rep, String(s.rep)); }
  speed(kmh) { this.cls("speed", this.e.speed, "on", kmh != null); if (kmh != null) this.set("speedV", this.e.speedB, String(Math.round(kmh))); }
  prompt(text) { this.cls("prompt", this.e.prompt, "on", !!text); if (text) this.set("promptT", this.e.promptT, text); }
  /** a radio message (queued; each stays ~5-9 s) */
  radio(from, text, { icon = "radio", urgent = false } = {}, now = performance.now()) {
    this.radioQ.push({ from, text, icon, urgent, dur: Math.min(9, 4 + text.length / 22) * 1000 });
    if (!this.calling && now > this.radioT) this.nextRadio(now);
  }
  nextRadio(now) {
    const m = this.radioQ.shift();
    if (!m) { this.cls("radio", this.e.radio, "on", false); return; }
    this.paintRadio(m.from, m.text, m.icon, m.urgent, false);
    this.radioT = now + m.dur;
  }
  paintRadio(from, text, icon, urgent, call) {
    const E = this.e;
    this.cache.delete("radio.on");
    E.radio.classList.remove("on"); void E.radio.offsetWidth;      // (restart the slide-in: once per message, not per frame)
    E.face.innerHTML = ICONS[icon] || ICONS.radio;
    E.from.textContent = from; E.say.textContent = text;
    E.radio.classList.toggle("urgent", !!urgent); E.radio.classList.toggle("call", !!call);
    this.cls("radio", E.radio, "on", true);
  }
  /** the 4 Hz housekeeping: radio queue */
  tick(now = performance.now()) { if (!this.calling && this.radioT && now > this.radioT) { this.radioT = 0; this.nextRadio(now); } }
  /** a dispatch call on the card (null: take it down) */
  call(c, busy = false) {
    this.calling = c;
    if (!c) { this.cls("radio", this.e.radio, "on", false); this.radioT = 1; return; }
    this.paintRadio(c.from, busy ? `${c.text} (accepting drops your current job)` : c.text, c.icon, c.priority === 1, true);
  }
  callTime(f) { this.set("ctime", this.e.ctime.style, `${Math.max(0, f * 100).toFixed(0)}%`, "width"); }
  /** a big centre card: { kind: 'ok' | 'bad', title, text, reward, actions: [[label, action, primary]] }, auto-hide after ms */
  toast(t, ms = 6000) {
    const E = this.e;
    clearTimeout(this.toastT);
    if (!t) { E.toast.classList.remove("on"); return; }
    E.toast.className = `gcard g-toast on ${t.kind || ""}`;
    E.toast.innerHTML = `<h2>${esc(t.title)}</h2>${t.text ? `<p>${esc(t.text)}</p>` : ""}${t.reward ? `<div class="g-rw">${esc(t.reward)}</div>` : ""}` +
      (t.actions?.length ? `<div class="g-acts">${t.actions.map(([l, a, p]) => `<button data-a="${a}" class="${p ? "pri" : ""}">${esc(l)}</button>`).join("")}</div>` : "");
    if (ms) this.toastT = setTimeout(() => E.toast.classList.remove("on"), ms);
  }

  // ---------------------------------------------------------------- menus
  closeMenu() { this.menu.classList.remove("on", "small"); this.menu.innerHTML = ""; this.menuAct = this.menuInput = this.menuDismiss = null; this.menuOpen = null; }
  openMenu(name, html, { small = false, act, input, dismiss } = {}) {
    this.menu.innerHTML = `<div class="gm-card">${html}</div>`;
    this.menu.classList.add("on"); this.menu.classList.toggle("small", small);
    this.menuAct = act; this.menuInput = input; this.menuDismiss = dismiss; this.menuOpen = name;
  }
  /** start menu: games = [{ id, title, tagline, icon, comingSoon, modes: [{ id, label, desc }], options: [{ id, label, value, modes }] , progress }] */
  startMenu(games, act) {
    const card = (g) => `<div class="gm-game ${g.comingSoon ? "soon" : ""}"><div class="gm-ico">${ICONS[g.icon] || ICONS.demo}</div>
      <h3>${esc(g.title)} ${g.comingSoon ? '<span class="gm-badge">coming soon</span>' : ""}</h3><p>${esc(g.tagline)}</p>
      ${g.progress ? `<div class="gm-stat">${esc(g.progress)}</div>` : ""}
      <div class="gm-modes">${(g.modes || []).map((m) => `<button data-m="play" data-g="${g.id}" data-mode="${m.id}" ${g.comingSoon ? "disabled" : ""} class="${m.primary ? "pri" : ""}">${esc(m.label)}<small>${esc(m.desc || "")}</small></button>`).join("")}</div>
      ${(g.options || []).map((o) => `<label class="gm-opt"><input type="checkbox" data-g="${g.id}" data-opt="${o.id}" ${o.value ? "checked" : ""} ${g.comingSoon ? "disabled" : ""}> ${esc(o.label)}</label>`).join("")}</div>`;
    this.openMenu("start", `<h1>Uccle 3D <small>real Uccle, Brussels</small></h1><div class="gm-sub">Pick a game, or just roam the city.</div>
      <div class="gm-games"><div class="gm-game"><div class="gm-ico">${ICONS.roam}</div><h3>Free roam</h3><p>The whole city, every mode: walk, drive, ride, fly. The dev tools stay at hand.</p>
      <div class="gm-modes"><button data-m="roam" class="pri">Explore<small>close this menu</small></button></div></div>${games.map(card).join("")}</div>
      <div class="gm-foot"><span><kbd>P</kbd> this menu · <kbd>Esc</kbd> pause in a game · <kbd>M</kbd> map · <kbd>H</kbd> photo mode</span><button data-m="settings">Settings</button></div>`,
    { act, dismiss: () => act("roam") });
  }
  pauseMenu({ title, sub, mission }, act) {
    this.openMenu("pause", `<h1>Paused</h1><div class="gm-sub">${esc(title)}${sub ? ` · ${esc(sub)}` : ""}</div><div class="gm-list">
      <button data-m="resume" class="pri">Resume<kbd>Esc</kbd></button>
      ${mission ? '<button data-m="restart">Restart mission</button><button data-m="abandon">Abandon mission</button>' : ""}
      <button data-m="settings">Settings</button><button data-m="quit">Quit to free roam</button></div>`, { small: true, act });
  }
  settingsMenu(s, act, input) {
    const q = s.quality || "high";
    this.openMenu("settings", `<h1>Settings</h1><div class="gm-sub">Saved in this browser.</div>
      <div class="gm-row"><label>Sound volume</label><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-in="volume"></div>
      <div class="gm-row"><label>GPS route</label><label class="gm-opt"><input type="checkbox" data-in="route" ${s.route ? "checked" : ""}> the route line on the maps</label></div>
      <div class="gm-row"><label>Graphics</label><div class="gm-seg">${["high", "medium", "low"].map((k) => `<button data-m="quality" data-q="${k}" class="${k === q ? "on" : ""}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div></div>
      <div class="gm-stat">Graphics presets map to the city's own switches (grass density, reflections, AO, plants) and reload the page.</div>
      <div class="gm-foot"><span></span><button data-m="back" class="pri">Back</button></div>`, { small: true, act, input });
  }
}
export { clock };
