// THE GAME KIT (docs/GAMEKIT.md): games on top of the city, separate from it. One GameKit per page (viewer/game/cityGame.js
// makes it from main.js's host functions). It owns:
//   registry      register(gameDef); the start menu lists them; startGame(id, mode: "missions" | "free", options) / quitGame()
//   pause         Esc / P in a game: the render loop stops (host.pause), the pause menu shows; resume / restart / quit
//   missions      startMission(def) plays a data mission (missions.js MissionRunner); results saved, rewards added
//   dispatch      the radio calls queue (dispatch.js), accept Y / ignore X, random calls from the game's templates
//   waypoints     setWaypoint(): the 3D beam + ring (waypoint.js), the map markers + GPS route (mapMarkers.js)
//   entities      spawnEntity({ kind: "trafficCar" }) (entities.js)
//   player        spawnPlayer({ at, mode, face }) (teleport + mode), this.player (x, z, speed m/s, heading, mode) at 10 Hz
//   save          localStorage, versioned (save.js); audio cues (audio.js); the HUD + menus (hud.js)
// Cost: nothing per frame while no game runs (no updater registered; the start menu is plain DOM). In a game: one
// updater (marker follow, ~0.01 ms), logic at 10 Hz, HUD writes at 4 Hz (diffed), no allocation per frame.
import { GameSave } from "./save.js";
import { GameAudio } from "./audio.js";
import { GameHud, clock } from "./hud.js";
import { GamePlaces } from "./gamePlaces.js";
import { MapMarkers } from "./mapMarkers.js";
import { Waypoint } from "./waypoint.js";
import { Dispatch } from "./dispatch.js";
import { MissionRunner } from "./missions.js";
import { takeTrafficCar } from "./entities.js";
import { PLAY_LOADER } from "../loader/playLoader.js";

const RIDE = new Set(["drive", "moto", "scooter", "villo"]);
const ROAD = new Set(["drive", "moto", "scooter"]);
/** graphics presets -> the city's own URL switches (viewer/features.js); "high" = the defaults */
export const QUALITY = {
  high: {},
  medium: { grasspreset: "medium", ssr: "0" },
  low: { grasspreset: "low", ssr: "0", ao: "0", plants: "0", ivy: "0", far: "2" },
};
const QKEYS = ["grasspreset", "ssr", "ao", "plants", "ivy", "far"];

export class GameKit {
  constructor(host) {
    this.host = host;
    this.games = new Map();
    this.save = new GameSave();
    this.audio = new GameAudio(this.save.settings.volume);
    this.hud = new GameHud();
    this.places = new GamePlaces(host.manifest);
    this.markers = new MapMarkers();
    this.waypoint = new Waypoint(host.scene);
    this.dispatch = new Dispatch(this);
    this.current = null;            // { def, mode, options }
    this.mission = null;            // the MissionRunner playing
    this.lastMission = null;        // (restart)
    this.paused = false;
    this.time = 0;                  // game seconds (stops while paused)
    this.player = { x: 0, z: 0, y: 0, speed: 0, heading: 0, bear: 0, mode: "orbit" };
    this.listeners = {};
    this.wp = null;                 // the waypoint target { x, z, y, radius, entity? }
    this.routeInfo = null;          // { pts, len, at, car }
    this.useFlag = false; this.promptOn = false;
    this._pose = { x: 0, y: 0, z: 0 };
    this.acc = { logic: 0, hud: 0, route: 0, mapEnt: 0 };
    this.last = 0;
    this.frame = (camPos) => this.onFrame(camPos);
    this.stats = { logicMs: 0, hudMs: 0, frameMs: 0 };
    this.hud.onAction = (a) => this.action(a);
    this.keys();
  }

  // ---------------------------------------------------------------- events
  on(ev, fn) { (this.listeners[ev] ??= []).push(fn); return () => this.listeners[ev].splice(this.listeners[ev].indexOf(fn), 1); }
  emit(ev, arg) { for (const f of this.listeners[ev] || []) try { f(arg, this); } catch (e) { this.host.log(`game ${ev}: ${e.message}`); } }

  // ---------------------------------------------------------------- registry, start / quit
  /** def: { id, title, tagline, icon, comingSoon, modes: [{ id, label, desc, primary }], options: [{ id, label, default }],
   *        start(kit, { mode, options }), stop(kit), tick(kit, dt), onMissionEnd(kit, runner), keys, idleText } */
  register(def) { this.games.set(def.id, def); return def; }
  get record() { return this.current ? this.save.game(this.current.def.id) : null; }

  async startGame(id, mode = "missions", options = {}) {
    const def = this.games.get(id);
    if (!def || def.comingSoon) return false;
    if (this.current) this.quitGame();
    const opts = {};
    for (const o of def.options || []) opts[o.id] = options[o.id] ?? o.default ?? false;
    this.current = { def, mode, options: opts };
    this.hud.closeMenu();
    this.hud.show(true);
    this.hud.idleText = def.idleText?.[mode] || "";
    this.markDriveHud();
    this.time = 0; this.last = performance.now();
    if (!this.host.updaters.includes(this.frame)) this.host.updaters.push(this.frame);
    this.dispatch.enabled = opts.calls ?? true;
    this.dispatch.stats = { offered: 0, accepted: 0, ignored: 0 };
    this.save.game(id).played++; this.save.touch();
    this.hud.keys(def.keys?.[mode] || def.keys?.default || "<kbd>Esc</kbd> pause · <kbd>M</kbd> map");
    this.emit("game:start", this.current);
    // perfgame (docs/PERF_GAME.md): the play loader covers the whole start (the car / bird, its shaders, the spawn's
    // tiles and landmarks) and fades out once the area is built (main.js areaReady): the player never sees it fill in.
    // A ?game= boot already shows it (handed over from the boot cover). ?playloader=old: as before
    const PLo = PLAY_LOADER ? window.__playLoader : null;
    if (PLo) {
      if (window.__playLoaderBoot) window.__playLoaderBoot = false;
      else PLo.open({ title: def.title, kicker: "Starting the game" });
      PLo.progress(0.03, "Getting ready…", def.modes?.find((m) => m.id === mode)?.label || "");
      PLo.tip(def.tagline || "");
    }
    try {
      const tS = performance.now();
      try { await def.start?.(this, { mode, options: opts }); } catch (e) { this.host.log(`game ${id}: ${e.message}`); console.error(e); }
      (globalThis.__gameTimes ||= []).push(["start", Math.round(performance.now() - tS)]);
      if (PLo && this.host.areaReady) { const P = this.readPlayer(0); await this.host.areaReady({ x: P.x, z: P.z, label: def.title, near: P.mode === "fly" ? 550 : 300 }); }
    } finally { if (PLo) await PLo.close(); }
    this.last = performance.now();
    return true;
  }
  quitGame() {
    if (!this.current) return;
    if (this.paused) this.resume();
    this.mission?.abort(); this.mission = null;
    this.dispatch.clear(); this.dispatch.setGenerator(null);
    try { this.current.def.stop?.(this); } catch (e) { this.host.log(`game stop: ${e.message}`); }
    this.setWaypoint(null);
    this.markers.clear();
    this.hud.show(false);
    this.hud.closeMenu();
    document.body.classList.remove("game-dev");
    const i = this.host.updaters.indexOf(this.frame);
    if (i >= 0) this.host.updaters.splice(i, 1);
    this.emit("game:quit", this.current);
    this.current = null;
    this.save.flush();
  }

  // ---------------------------------------------------------------- pause
  pause() {
    if (!this.current || this.paused) return;
    this.paused = true;
    this.host.pause(true);
    this.pauseMenu();
  }
  pauseMenu() {
    const c = this.current;
    this.hud.pauseMenu({ title: c.def.title, sub: this.mission ? this.mission.def.title : c.def.modes?.find((m) => m.id === c.mode)?.label, mission: !!this.mission }, (a) => {
      if (a === "resume") this.resume();
      else if (a === "restart") { this.resume(); this.restartMission(); }
      else if (a === "abandon") { this.resume(); this.abandonMission(); }
      else if (a === "settings") this.settings(() => this.pauseMenu());
      else if (a === "quit") this.quitGame();
    });
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.hud.closeMenu();
    this.last = performance.now();
    this.host.pause(false);
  }

  // ---------------------------------------------------------------- menus
  startMenu() {
    const games = [...this.games.values()].filter((g) => !g.hidden).map((g) => {
      const r = this.save.data.games[g.id];
      const done = r ? Object.values(r.missions).reduce((a, m) => a + m.done, 0) : 0;
      return { ...g, options: (g.options || []).map((o) => ({ ...o, value: this.optionValue(g.id, o) })),
        progress: r && !g.comingSoon ? `score ${r.score} · €${r.money} · ${done} mission${done === 1 ? "" : "s"} done` : "" };
    });
    this.hud.startMenu(games, (a, b) => {
      if (a === "roam") { this.hud.closeMenu(); if (this.current) this.quitGame(); }
      else if (a === "settings") this.settings(() => this.startMenu());
      else if (a === "play") {
        const id = b.dataset.g, opts = {};
        for (const el of this.hud.menu.querySelectorAll(`input[data-g="${id}"]`)) opts[el.dataset.opt] = el.checked;
        this.save.game(id).options = opts; this.save.touch();
        this.startGame(id, b.dataset.mode, opts);
      }
    });
  }
  optionValue(gameId, o) { return this.save.data.games[gameId]?.options?.[o.id] ?? o.default ?? false; }
  settings(back) {
    const S = this.save.settings;
    if (S.quality == null) S.quality = this.currentQuality();
    this.hud.settingsMenu(S, (a, b) => {
      if (a === "back") back();
      else if (a === "quality") {
        const q = b.dataset.q;
        if (q === this.currentQuality()) return;
        S.quality = q; this.save.flush();
        const u = new URL(location.href);
        for (const k of QKEYS) u.searchParams.delete(k);
        for (const [k, v] of Object.entries(QUALITY[q])) u.searchParams.set(k, v);
        location.assign(u.toString());
      }
    }, (el) => {
      if (el.dataset.in === "volume") { S.volume = +el.value; this.audio.setVolume(S.volume); this.audio.click(); }
      else if (el.dataset.in === "route") { S.route = el.checked; this.markers.setRoute(S.route ? this.routeInfo?.pts ?? null : null); }
      this.save.touch();
    });
  }
  currentQuality() {
    const p = new URLSearchParams(location.search);
    for (const q of ["low", "medium"]) if (Object.entries(QUALITY[q]).every(([k, v]) => p.get(k) === v)) return q;
    return "high";
  }

  // ---------------------------------------------------------------- keys
  keys() {
    const typing = (e) => e.target?.closest?.("input,select,textarea") && e.target.type !== "range" && e.target.type !== "checkbox";
    addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
      if (this.host.getMap()?.full?.open) return;                 // the full map handles its own keys
      const stop = () => { e.stopImmediatePropagation(); e.preventDefault(); };
      const menu = this.hud.menuOpen;
      if (menu) {
        if (e.code === "KeyH") return;                            // photo mode still works
        if (!e.repeat && (e.code === "Escape" || e.code === "KeyP")) {
          if (menu === "pause") this.resume();
          else if (menu === "start") { this.hud.closeMenu(); }
          else if (menu === "settings") this.hud.menuAct?.("back");
        }
        stop(); return;                                           // nothing reaches the modes under a menu
      }
      if (e.repeat) return;
      if (e.code === "KeyP") { stop(); if (this.current) this.pause(); else this.startMenu(); return; }
      if (!this.current) return;
      if (e.code === "Escape") { stop(); this.pause(); return; }   // (in a game Esc pauses: it does not leave the mode)
      if (e.code === "Backquote") {                               // the dev tools, back on top of the game (and off again)
        stop();
        const on = document.body.classList.toggle("game-dev");
        if (on) window.__devPanel?.gui?.setVisible(true);
        return;
      }
      if (e.code === "KeyY" && this.dispatch.current) { stop(); this.dispatch.accept(); return; }
      if (e.code === "KeyX" && this.dispatch.current) { stop(); this.dispatch.ignore(); return; }
      if (e.code === "KeyE" && this.promptOn) { stop(); this.useFlag = true; return; }
    }, true);
    // the falcon's mouse aim locks the pointer: Esc then only unlocks it (the browser eats the key): pause on unlock
    document.addEventListener("pointerlockchange", () => { if (!document.pointerLockElement && this.current && this.host.flyer?.on && !this.paused) this.pause(); });
  }
  /** an interact objective asks: was E pressed (since the last ask)? */
  consumeUse() { const u = this.useFlag; this.useFlag = false; return u; }
  action(a) {
    if (a === "accept") this.dispatch.accept();
    else if (a === "ignore") this.dispatch.ignore();
    else if (a === "retry") { this.hud.toast(null); this.restartMission(); }
    else if (a === "continue") this.hud.toast(null);
    else this.current?.def.onAction?.(this, a);
  }
  /** the drive mode's own speed line (bottom centre) hides in a game: the HUD shows the speed */
  markDriveHud() { this.host.driver?.hud?.classList.add("g-drivehud"); }

  // ---------------------------------------------------------------- the player
  /** where: { at: place spec, mode: "drive" | "walk" | "third" | "fly" | "moto" | "scooter" | "villo", face: place spec | [x, z] } */
  async spawnPlayer({ at, mode = null, face = null, road = true }) {
    const p = this.places.resolve(at, this);
    if (!p) throw new Error(`spawn: unknown place ${at}`);
    let x = p.x, z = p.z, yaw = 0;
    const map = this.host.getMap();
    if (road && map) {
      const r = await map.client.request({ type: "snap", x, z, maxD: 150 });
      if (!r.none) { x = r.x; z = r.z; yaw = r.yaw; }
    }
    // face along the road, towards `face`: the way the GPS route to it leaves (else the straight line to it)
    const f = face ? this.places.resolve(face, this) : null;
    if (f) {
      let dx = f.x - x, dz = f.z - z;
      if (map) {
        const r = await map.client.request({ type: "route", x0: x, z0: z, x1: f.x, z1: f.z, car: ROAD.has(mode) });
        const p = r.pts;
        if (p) for (let i = 2; i < p.length; i += 2) if (Math.hypot(p[i] - p[0], p[i + 1] - p[1]) > 8) { dx = p[i] - p[0]; dz = p[i + 1] - p[1]; break; }
      }
      if (Math.cos(yaw) * dx + Math.sin(yaw) * dz < 0) yaw += Math.PI;
    }
    if (mode === "third" && !this.host.getThird()) await this.host.thirdPerson();
    this.hud.toast({ title: "On your way", text: `Going to ${p.name}…` }, 0);
    try { await this.host.teleport({ x, z, yaw, exact: true, mode }); } finally { this.hud.toast(null); }
    this.markDriveHud();
    this.last = performance.now();
  }
  readPlayer(dt) {
    const g = this.host.getPlayer(), P = this.player, d = this.host.driver;
    const moved = Math.hypot(g.x - P.x, g.z - P.z);
    const v = RIDE.has(g.mode) && d?.state ? Math.abs(d.state.speed) : dt > 0 && moved < 200 ? moved / dt : 0;
    P.speed = P.mode === g.mode ? P.speed + (v - P.speed) * Math.min(1, dt * 6) : v;
    P.x = g.x; P.z = g.z; P.heading = g.heading; P.bear = g.bear; P.mode = g.mode; P.alt = g.alt;
    return P;
  }
  get inVehicle() { return RIDE.has(this.player.mode); }

  // ---------------------------------------------------------------- entities
  spawnEntity(spec) {
    if (spec.kind === "trafficCar") return takeTrafficCar(this.host.getTraffic(), { x: this.player.x, z: this.player.z, heading: this.player.heading, min: spec.min ?? 25, max: spec.max ?? 180 });
    if (typeof spec.make === "function") return spec.make(this);
    return null;
  }

  // ---------------------------------------------------------------- missions
  async startMission(def) {
    if (!this.current) return null;
    if (this.mission) this.mission.abort();
    this.hud.toast(null);
    this.lastMission = def;
    const r = new MissionRunner(this, def, { gameId: this.current.def.id });
    this.mission = r;
    try { await r.start(); } catch (e) { this.host.log(`mission ${def.id}: ${e.message}`); r.finish(false, e.message); }
    return r;
  }
  restartMission() { if (this.lastMission) this.startMission(this.lastMission); }
  abandonMission() {
    if (!this.mission) return;
    this.mission.abort(); this.mission = null;
    this.setWaypoint(null);
    this.hud.toast({ kind: "bad", title: "Mission abandoned" }, 2500);
  }
  /** the runner reports here: save, rewards, the result card */
  missionDone(r) {
    if (this.mission !== r) return;
    this.mission = null;
    this.setWaypoint(null);
    const res = r.result, gid = this.current.def.id, rec = this.save.game(gid), mrec = this.save.mission(gid, r.def.id);
    if (res.ok) {
      mrec.done++; if (mrec.best == null || res.time < mrec.best) mrec.best = +res.time.toFixed(1);
      rec.score += res.score; rec.money += res.money; rec.rep += res.rep;
      this.audio.success();
      const rw = [res.score && `+${res.score} score`, res.money && `+€${res.money}`, res.rep && `+${res.rep} rep`].filter(Boolean).join("   ");
      this.hud.toast({ kind: "ok", title: "Mission passed", text: `${r.def.title} · ${clock(res.time)}${res.bonus ? " · time bonus!" : ""}`, reward: rw, actions: [["Continue", "continue", true]] }, 6000);
    } else {
      mrec.fails++; rec.rep += res.rep;
      this.audio.fail();
      this.hud.toast({ kind: "bad", title: "Mission failed", text: res.why ? res.why[0].toUpperCase() + res.why.slice(1) : "", actions: [["Retry", "retry", true], ["Continue", "continue"]] }, 9000);
    }
    this.save.touch();
    this.emit(res.ok ? "mission:success" : "mission:fail", r);
    try { this.current.def.onMissionEnd?.(this, r); } catch (e) { this.host.log(`onMissionEnd: ${e.message}`); }
  }
  /** a radio message on the card (from, text, { icon, urgent, beep }) */
  radio(from, text, o = {}) { if (o.beep !== false) this.audio.radio(!!o.urgent); this.hud.radio(from, text, o); }

  // ---------------------------------------------------------------- waypoints
  /** t: null | { x, z, name, radius } | { entity, radius }; { route: GPS line, snap: put a place target on the nearest road (vehicles) } */
  async setWaypoint(t, { route = true, snap = true, color = null } = {}) {
    this.wp = t;
    this.routeInfo = null;
    this.markers.setRoute(null);
    if (!t) { this.waypoint.set(null); this.markers.set("wp", null); return; }
    const ent = t.entity || null;
    const col = color || (ent ? "#ff5a4f" : "#ffcc33");
    this.waypoint.setColor(col);
    if (ent) {
      this.waypoint.set({ x: ent.x, z: ent.z, y: ent.y, radius: 3.2 });   // (a small ring under the car: the beam marks it)
      this.markers.set("wp", { x: ent.x, z: ent.z, color: col, kind: "target" });
      return;
    }
    const map = this.host.getMap();
    if (snap && map && ROAD.has(this.player.mode)) {                // a car cannot reach a shop's façade or a park's middle
      const r = await map.client.request({ type: "snap", x: t.x, z: t.z, maxD: 90 });
      if (this.wp !== t) return;
      if (!r.none && r.d > (t.radius ?? 20) * 0.6) { t.x = r.x; t.z = r.z; }
    }
    t.y = this.groundY(t.x, t.z);
    this.waypoint.set({ x: t.x, z: t.z, y: t.y, radius: t.radius ?? 20 });
    this.markers.set("wp", { x: t.x, z: t.z, color: col, kind: "goal" });
    if (route) this.requestRoute();
  }
  groundY(x, z) { try { const y = this.host.world.surface(x, z); return Number.isFinite(y) ? y : 0; } catch { return 0; } }
  async requestRoute() {
    const t = this.wp, map = this.host.getMap();
    if (!t || t.entity || !map) return;
    const car = ROAD.has(this.player.mode), P = this.player;
    this.routeInfo = { pts: null, at: this.time, pending: true };
    const r = await map.client.request({ type: "route", x0: P.x, z0: P.z, x1: t.x, z1: t.z, car });
    if (this.wp !== t) return;
    this.routeInfo = { pts: r.pts, len: r.len, at: this.time, car, ms: r.ms };
    if (this.save.settings.route) this.markers.setRoute(r.pts);
  }
  /** off the route by > 35 m (a wrong turn): a new one, at most every 3 s */
  checkRoute() {
    const R = this.routeInfo, P = this.player;
    if (!R || R.pending || !R.pts || this.time - R.at < 3) return;
    const p = R.pts;
    let best = Infinity;
    for (let i = 2; i < p.length; i += 2) {
      const ax = p[i - 2], az = p[i - 1], dx = p[i] - ax, dz = p[i + 1] - az, L = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((P.x - ax) * dx + (P.z - az) * dz) / L));
      const d = Math.hypot(P.x - ax - dx * t, P.z - az - dz * t);
      if (d < best) best = d;
      if (best < 35) return;
    }
    if (ROAD.has(P.mode) !== R.car || best >= 35) this.requestRoute();
  }

  // ---------------------------------------------------------------- the loop
  onFrame(camPos) {
    if (!this.current || this.paused) return;
    const t0 = performance.now();
    const dt = Math.min(0.1, (t0 - this.last) / 1000);
    this.last = t0;
    this.time += dt;
    const wp = this.wp;
    if (wp?.entity) {
      if (wp.entity.alive) { const q = wp.entity.pose(this._pose); this.waypoint.update(camPos, q.x, q.y, q.z); } else this.waypoint.set(null);
    } else if (wp) this.waypoint.update(camPos);
    const A = this.acc;
    A.logic += dt; A.hud += dt;
    if (A.logic >= 0.1) { const l0 = performance.now(); this.logic(A.logic); A.logic = 0; this.stats.logicMs = performance.now() - l0; }
    if (A.hud >= 0.25) { const h0 = performance.now(); this.hudTick(); A.hud = 0; this.stats.hudMs = performance.now() - h0; }
    this.stats.frameMs = performance.now() - t0;
  }
  logic(dt) {
    this.readPlayer(dt);
    this.markers.attach(this.host.getMap());
    this.mission?.tick(dt);
    this.dispatch.tick();
    this.current?.def.tick?.(this, dt);
    const wp = this.wp;
    if (wp?.entity && wp.entity.alive) {
      this.markers.move("wp", wp.entity.x, wp.entity.z);
      if ((this.acc.mapEnt += dt) > 0.12) { this.acc.mapEnt = 0; this.markers.redraw(); }
    } else if (wp && !wp.entity) {
      if ((this.acc.route += dt) > 1) { this.acc.route = 0; this.checkRoute(); const y = this.groundY(wp.x, wp.z); if (Math.abs(y - (wp.y ?? 0)) > 0.3) { wp.y = y; this.waypoint.group.position.y = y + 0.15; } }
    }
  }
  hudTick() {
    // (no mission: the game may show its own idle objective with a prompt, e.g. the police shift's "E: end the shift" at HQ)
    const H = this.hud, c = this.current, o = this.mission?.objective() ?? c.def.idleObjective?.(this) ?? null;
    H.objective(o, c.def.title, c.def.modes?.find((m) => m.id === c.mode)?.label);
    H.timer(o?.timeLeft ?? null);
    if (o?.timeLeft != null && o.timeLeft <= 5 && Math.ceil(o.timeLeft) !== this._tickS) { this._tickS = Math.ceil(o.timeLeft); this.audio.tick(); }
    const rec = this.record;
    H.stats(rec);
    H.speed(this.inVehicle ? this.player.speed * 3.6 : null);
    this.promptOn = !!o?.prompt;
    H.prompt(o?.prompt || null);
    H.tick();
  }
  /** a summary for tests / the dev panel */
  info() {
    return { game: this.current?.def.id ?? null, mode: this.current?.mode ?? null, paused: this.paused, time: +this.time.toFixed(1), mission: this.mission?.def.id ?? null,
      step: this.mission?.i ?? null, objective: this.mission?.objective() ?? null, player: { ...this.player }, waypoint: this.wp ? { x: this.wp.x, z: this.wp.z, entity: !!this.wp.entity } : null,
      route: this.routeInfo ? { len: this.routeInfo.len, pts: this.routeInfo.pts ? this.routeInfo.pts.length / 2 : 0, ms: this.routeInfo.ms } : null,
      dispatch: { queue: this.dispatch.queue.length, current: this.dispatch.current?.text ?? null, ...this.dispatch.stats }, places: this.places.all.length, cost: { ...this.stats }, save: this.save.ok };
  }
}
