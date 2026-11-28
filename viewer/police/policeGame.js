// THE POLICE GAME, round 1 (docs/POLICE_GAME.md): an unmarked police car out of the real Uccle police station (Rue Rouge
// 17). Registered on the game kit (viewer/game/, docs/GAMEKIT.md) with id "police" (it replaces the kit's "coming soon"
// entry). Two modes:
//   missions      the shift: radio dispatch sends you jobs one after another (policeMissions.js: car on the tram line,
//                 speed check, accident, stolen car), from real places round you
//   free patrol   drive with lights / siren; dispatch calls now and then if the start menu's "calls" option is on
// The shift starts in the station's yard, the HQ is a marker on the map; back at HQ (no job running) E ends the shift:
// a summary (jobs, score, money, reputation, distance, time).
// Keys (none of the kit's: P, Esc, Y / X, E-on-prompt, `, M): L blue lights, J siren (with the lights). In this game
// B / K / V (motorbike / scooter / Villo) are held back: the shift is in the car.
// Traffic: with lights AND siren the cars ahead pull right and stop, oncoming cars slow, crossing cars wait at their
// line (trafficSim.js emerg); without them nothing changes.
import { PoliceCar, POLICE_CAR, MARKED, HAS_MARKED } from "./policeCar.js";
import { YARD_OLD, FRM, toCity, START, yardCars, canGetOut, carInReach, exitSpot, parkedBodies, noseHeading, boxDist } from "./yardCars.js";
import { POLICE_CAR_PLACES } from "../policeCars.js";
import { Props, hazard } from "./props.js";
import { JOBS } from "./policeMissions.js";
import { MISSIONS_OLD } from "./missionPremise.js";
import { warm } from "./warm.js";
const POLICE_WARM_OLD = /[?&]policewarm=old(&|$)/.test(location.search);

// the station's site frame (models/police_rouge/site.json: origin, rotation; yardCars.js FRM): the yard, the gate, the HQ marker
const YARD = { ...START };
void FRM;
const GATE = (() => { const [x, z] = toCity(30, 12.3); return { x, z }; })();
const HQ_R = 30;
const ORDER = ["tram", "speed", "accident", "stolen"];
const HELD_KEYS = new Set(["KeyB", "KeyK", "KeyV"]);
// (claude/policeyard) the two patrol cars: on with the cars2 family (it has the marked estate), not with ?policeyard=old
const TWO_CARS = !YARD_OLD && HAS_MARKED;

const css = `
.pol-chip{position:fixed;right:18px;bottom:96px;z-index:30;display:none;gap:6px;font:600 12px/1 system-ui,sans-serif;letter-spacing:.04em}
body.game-on .pol-chip.on{display:flex}
.pol-chip span{padding:6px 9px;border-radius:7px;background:rgba(16,20,26,.72);color:#8b96a3;border:1px solid rgba(255,255,255,.08)}
.pol-chip span.lit{color:#fff;background:#1b4dff;border-color:#6f8dff;box-shadow:0 0 14px rgba(40,90,255,.6)}
.pol-chip span.lit.siren{background:#c62828;border-color:#ff8a80;box-shadow:0 0 14px rgba(255,60,60,.5)}
body.game-photo .pol-chip{display:none!important}
body.game-photo .pol-swap{display:none!important}`;

function makeChip() {
  const st = document.createElement("style"); st.textContent = css; document.head.append(st);
  const el = document.createElement("div"); el.className = "pol-chip";
  el.innerHTML = `<span data-k="l" title="L">● BLUE LIGHTS</span><span data-k="s" title="J">♪ SIREN</span>`;
  document.body.append(el);
  return { el, l: el.querySelector('[data-k="l"]'), s: el.querySelector('[data-k="s"]'), last: "" };
}

const G = {
  kit: null, car: null, props: null, spots: null, chip: null, done: {}, rams: 0, hazard: false,
  // (claude/missions, rule mission-premise) the ONE job premise live in the world (a call on the card / queued, or the
  // running job's): its scene stands from the call on; watched at 1 Hz (watchPremise); stats for the browser checks
  live: null, liveT: 0, premiseStats: { made: 0, cancelled: 0, why: {} },
  shift: null, next: 0, keyFn: null, frameFn: null, lastT: 0, rng: Math.random,
  // (claude/policeyard) the patrol cars standing (not driven): [{ kind, x, y, z, heading }]; their boxes (rail movers:
  // solid for the car, the two-wheelers and the character); the swap prompt; the cars taken (browser checks)
  parked: [], moverSrc: null, swapEl: null, swap: null, busy: false, taken: [],
  traffic: () => G.kit?.host.getTraffic() ?? null,          // (cityTraffic: .sim, .types, .T.alpha)
  tram: () => window.viewer?.tram?.() ?? null,
  /** the latest impact (> 2 m/s) of the player's car: a new object per impact (carPhysics.js lastHit) */
  hits: () => G.kit?.host.driver?.state?.lastHit ?? null,
};

async function loadSpots() {
  if (G.spots) return G.spots;
  G.spots = await fetch(new URL("../../data/game/police_spots.json", import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null) || { speed: [], junction: [] };
  return G.spots;
}

/** a job call: the next type in the shift's order (missions) or a random one (calls), skipping types with no place.
 *  New (rule mission-premise): only types whose premise can be made true here; it is made true NOW (the scene stands
 *  while the call is on the card), one premise at a time; an ignored / expired call takes its scene away. */
function makeCall(kit, rng, type = null) {
  if (!MISSIONS_OLD && G.live) return null;
  const types = type ? [type, ...ORDER.filter((t) => t !== type)] : [...ORDER].sort(() => rng() - 0.5);
  for (const t of types) {
    const c = JOBS[t](G, kit, rng);
    if (!c) continue;
    c.mission.policeType = t; c.expires = 35;
    if (c.premise && !MISSIONS_OLD) {
      const p = c.premise;
      p.setup(); G.live = p; G.liveT = kit.time + 1; G.premiseStats.made++;
      c.onIgnore = () => releasePremise(p);
    }
    return c;
  }
  return null;
}
function releasePremise(p = G.live) {
  if (!p) return;
  try { p.release(); } catch (e) { console.warn(e); }
  if (G.live === p) G.live = null;
}
/** (1 Hz) the live premise still true? Else the call is cancelled, no penalty: the running job stops, or the card /
 *  queued call goes; the next call comes soon */
function watchPremise(kit) {
  const p = G.live;
  if (MISSIONS_OLD || !p || kit.time < G.liveT) return;
  G.liveT = kit.time + 1;
  let r;
  try { r = p.check(kit); } catch (e) { r = { ok: false, why: e.message }; }
  if (r.ok) return;
  const why = r.why || "the situation changed", S = G.premiseStats;
  S.cancelled++; S.why[`${p.type}: ${why}`] = (S.why[`${p.type}: ${why}`] || 0) + 1;
  const m = kit.mission, d = kit.dispatch;
  if (m && m.def.premise === p) {
    m.abort(); kit.mission = null; kit.setWaypoint(null);
    kit.radio("Dispatch", `Cancel that call: ${why}. Stand by.`, { icon: "radio" });
    kit.hud.toast({ title: "Call cancelled", text: why[0].toUpperCase() + why.slice(1) }, 3500);
    G.props.clear(); G.hazard = false;
  } else {
    if (d.current?.mission?.premise === p) { d.current = null; kit.hud.call(null); }
    for (let i = d.queue.length - 1; i >= 0; i--) if (d.queue[i].mission?.premise === p) d.queue.splice(i, 1);
  }
  releasePremise(p);
  if (kit.current?.mode === "missions") offerNext(kit, 6);
}
function offerNext(kit, delay = 0) { G.next = kit.time + delay; }

// ---------------------------------------------------------------- the two patrol cars (claude/policeyard)
const boxOf = (model) => { const [w, h, l] = model?.size || [1.85, 1.5, 4.75]; return { hw: w / 2, hl: l / 2, ht: h }; };
/** a parked pose on the drive ground: the 4 wheel spots' heights give its pitch / roll (the wheels on the ground) */
function groundPose(driver, x, z, heading, model) {
  const { hw, hl } = boxOf(model), s = Math.sin(heading), k = Math.cos(heading), L = hl * 0.62, W = hw * 0.85;
  const g = (a, b) => driver.ground(x + a * s + b * k, z + a * k - b * s);
  const fl = g(L, W), fr = g(L, -W), rl = g(-L, W), rr = g(-L, -W);
  const ok = [fl, fr, rl, rr].every(Number.isFinite);
  const y = ok ? (fl + fr + rl + rr) / 4 : driver.ground(x, z);
  return { x, z, y, heading, slopePitch: ok ? Math.atan(((fl + fr) - (rl + rr)) / 2 / (2 * L)) : 0, slopeRoll: ok ? Math.atan(((fl + rl) - (fr + rr)) / 2 / (2 * W)) : 0 };
}
// the yard's 5 standing cars (viewer/policeCars.js) as plan boxes: the exit spot keeps out of them
const YARD_BOXES = POLICE_CAR_PLACES.map((p) => { const [x, z] = toCity(p.u, p.w); return { x, z, heading: noseHeading(p.nose), hw: 1.0, hl: 2.5 }; });
function exitBlocked(x, z) {
  for (const b of YARD_BOXES) if (boxDist(x, z, b, b.hw, b.hl) < 0.35) return true;
  for (const b of G.parked) if (boxDist(x, z, b, b.hw, b.hl) < 0.35) return true;
  return false;
}
function parkCar(kind, pose) {
  const R = G.car.park(kind, pose);
  if (!R) return;
  G.parked = G.parked.filter((p) => p.kind !== kind);
  G.parked.push({ kind, x: pose.x, y: pose.y, z: pose.z, heading: pose.heading, ...boxOf(R.model) });
}
/** stopped in the yard: out on the driver's side (third person), the car stays where it stopped */
async function getOut(kit) {
  const host = kit.host, d = host.driver, c = d.state, kind = G.car.kind;
  if (G.busy || !c) return;
  G.busy = true;
  try {
    G.car.setLights(false);
    const model = d.model, { hw } = boxOf(model);
    const pose = { x: c.x, y: c.y, z: c.z, heading: c.heading, slopePitch: c.slopePitch || 0, slopeRoll: c.slopeRoll || 0, heave: 0, pitch: 0, roll: 0, wheelSpin: c.wheelSpin || 0, steerAngle: 0, wy: null };
    const { hl } = boxOf(model);
    const at = exitSpot(c, hw, (x, z) => exitBlocked(x, z), undefined, hl);
    await host.thirdPerson({ x: at.x, z: at.z, bearing: at.bearing, name: "Police station yard" });
    parkCar(kind, pose);                                  // (after the driver stopped: driver.stop hid its car)
    kit.markDriveHud();
    G.taken.push({ out: kind, t: +kit.time.toFixed(1) });
  } catch (e) { host.log(`police: get out: ${e.message}`); } finally { G.busy = false; }
}
/** on foot, next to a patrol car: in, it is the patrol car from now on */
async function getIn(kit, p) {
  const host = kit.host, d = host.driver;
  if (G.busy) return;
  G.busy = true;
  try {
    G.parked = G.parked.filter((q) => q !== p);
    await G.car.install(p.kind);
    host.getThird()?.stop(); if (host.walker) host.walker.on = false; host.controls.enabled = false;
    await d.start(p.x, p.z, p.heading, "car");
    kit.markDriveHud();
    G.taken.push({ in: p.kind, t: +kit.time.toFixed(1) });
    kit.hud.toast({ title: p.kind === "marked" ? "Marked patrol car" : "Unmarked patrol car", text: "Your car for this shift. L blue lights, J siren." }, 2500);
  } catch (e) { host.log(`police: get in: ${e.message}`); } finally { G.busy = false; }
}
/** what E does now (null: nothing of ours): { act: "out" } | { act: "in", car } */
function swapState(kit) {
  if (!TWO_CARS || G.busy || kit.hud.menuOpen || kit.paused) return null;
  const d = kit.host.driver, th = kit.host.getThird();
  if (d.on && d.vehicle === "car" && G.car.installed && d.state) return canGetOut(d.state.x, d.state.z, d.state.speed) ? { act: "out" } : null;
  if (th?.on && G.parked.length) {
    const p = carInReach(th.tp.x, th.tp.z, G.parked);
    return p ? { act: "in", car: p } : null;
  }
  return null;
}
function swapPrompt(kit) {
  const el = G.swapEl; if (!el) return;
  const s = (G.swap = kit.promptOn ? null : swapState(kit));
  const text = !s ? "" : s.act === "out" ? "Get out" : `Get in · ${s.car.kind} patrol car`;
  el.classList.toggle("on", !!text);
  if (text && el.lastChild.textContent !== text) el.lastChild.textContent = text;
}

function newShift(kit) {
  const r = kit.record;
  G.shift = { left: false, t0: kit.time, done: 0, failed: 0, score: r.score, money: r.money, rep: r.rep, km: 0, n: 0 };
}
function endShift(kit) {
  const S = G.shift, r = kit.record, mins = Math.max(1, Math.round((kit.time - S.t0) / 60));
  kit.dispatch.clear(); releasePremise();
  kit.hud.toast({ kind: "ok", title: "End of shift", text: `${S.done} job${S.done === 1 ? "" : "s"} done, ${S.failed} failed · ${(S.km / 1000).toFixed(1)} km driven · ${mins} min`,
    reward: `+${r.score - S.score} score   ${r.money - S.money >= 0 ? "+" : ""}€${r.money - S.money}   ${r.rep - S.rep >= 0 ? "+" : ""}${r.rep - S.rep} rep`,
    actions: [["New shift", "newshift", true], ["Quit to free roam", "quit"]] }, 0);
  kit.audio.success();
  kit.save.touch();
  newShift(kit);
  if (kit.current?.mode === "missions") offerNext(kit, 20);
}

export const POLICE_GAME = {
  id: "police", title: "Police", icon: "police",
  tagline: (TWO_CARS ? "The unmarked or the marked patrol car" : "An unmarked car") + " out of the Rue Rouge station. Radio dispatch: cars on the tram line, speed checks, accidents, stolen cars.",
  modes: [{ id: "missions", label: "Shift", desc: "dispatch sends you jobs", primary: true }, { id: "free", label: "Free patrol", desc: "lights + siren, no job" }],
  options: [{ id: "calls", label: "Dispatch calls in free patrol", default: true }],   // (the siren sound follows the speaker button: no second switch)
  idleText: { missions: "Patrol. Dispatch will call you.", free: "Free patrol. L blue lights, J siren." },
  keys: { default: "<kbd>W A S D</kbd> drive · <kbd>L</kbd> blue lights · <kbd>J</kbd> siren · <kbd>Y</kbd>/<kbd>X</kbd> calls · <kbd>E</kbd> act · <kbd>Esc</kbd> pause · <kbd>M</kbd> map" },

  async start(kit, { mode, options }) {
    G.kit = kit; G.done = {};
    const host = kit.host, driver = host.driver;
    if (!G.car) G.car = new PoliceCar({ driver, kit });
    if (!G.props) G.props = new Props({ scene: host.scene, driver, getTraffic: () => G.traffic(), renderer: host.renderer, camera: host.camera });
    if (!G.chip) G.chip = makeChip();
    if (TWO_CARS && !G.swapEl) {
      G.swapEl = document.createElement("div"); G.swapEl.className = "gcard g-prompt pol-swap";
      G.swapEl.innerHTML = "<b>E</b><span></span>";
      kit.hud.el.append(G.swapEl);
    }
    if (TWO_CARS && !G.moverSrc) {
      // the parked cars solid (viewer/drive/movers.js: a rail source; the car's, two-wheelers' and character's colliders read it)
      G.moverSrc = { bodies: (x, z, r, out, off) => (G.kit?.current?.def.id === "police" && G.parked.length ? parkedBodies(G.parked, x, z, r, out, off) : 0) };
      driver.railSources?.push(() => G.moverSrc);
    }
    G.parked = []; G.taken = [];
    G.car.setSound(true);                                       // (heard only while the speaker button is on)
    const T = (globalThis.__gameTimes ||= []); let tt = performance.now();
    const mark = (k) => { const n = performance.now(); T.push([`police ${k}`, Math.round(n - tt)]); tt = n; };
    await loadSpots(); mark("spots");
    // the car first (the drive mode then starts with it), its pipelines and the props' under the spawn card
    const cars = TWO_CARS ? yardCars(MARKED ? "marked" : "unmarked") : null;
    await G.car.install(cars?.[0].kind); mark("car install");
    // (claude/policeyard) the other patrol car: its rig made now, its pipelines warmed with the props (it shares the kit's
    // materials with the driven car; its body material is the one it is driven with later: no first-switch build)
    const other = cars ? (await G.car.rig(cars[1].kind)).car : null;
    // (parked first at a dummy pose: its merged still body is what the warm-up draws; placed on the yard after the spawn)
    if (other) { G.car.park(cars[1].kind, { x: 0, y: 0, z: 0, heading: 0 }); other.root.visible = false; }
    kit.hud.toast({ title: "Police station, Rue Rouge", text: "Getting the car ready…" }, 0);
    // perf9 (?policewarm=old = the props' + car's warm-up frames first, then the spawn, as before: 1.8-11.6 s in front of the
    // spawn's area wait, its 8 frames slow with the boot's work): the props' warm-up runs BESIDE the spawn (teleport + area
    // wait, under the play loader). The car is left out of it: the spawn starts the drive mode with it in front of the
    // camera, so its pipelines are built by the hold's own frames (the area wait counts their async pipelines), and the
    // warm-up's moving of its root would fight the drive mode's placing of it.
    const propsWarm = async (roots) => {
      try {
        await G.props.ready();
        const tmp = G.props.warmSet();
        const cw = TWO_CARS ? G.car.warmSet() : null;            // (claude/policeyard: both cars, parked and driven looks)
        await warm([...roots(), ...(cw?.roots ?? [])], host.camera, 8);
        cw?.restore();
        G.props.unwarm(tmp);
      } catch (e) { host.log(`police compile: ${e.message}`); }
    };
    if (TWO_CARS) {
      // (claude/policeyard) ONE hold, in THIRD PERSON: the kit's spawn in mode "third" boots the character (getting out to
      // take the other car) under the play loader and waits for its colliders: its first boot (model, collision world,
      // pipelines) stalled the frames for seconds at the first E (2.5 s frames measured). The warm-up runs beside it with
      // BOTH cars (the drive mode is off during the hold: the driven car's root can be moved; each car's parked and
      // driven looks, warmSet), then the player is seated in the car at the yard spot: no second teleport / hold.
      const t1 = performance.now();
      const pw = propsWarm(() => [G.props.group, driver.car.root]).then(() => T.push(["police props + cars warm (beside the spawn)", Math.round(performance.now() - t1)]));
      try { await kit.spawnPlayer({ at: [YARD.x, YARD.z, "Police station, Rue Rouge"], mode: "third", road: false }); } catch (e) { host.log(`police: spawn: ${e.message}`); }
      mark("spawn (teleport + area, third person)");
      await pw;
      mark("warm left after the spawn");
      host.getThird()?.stop(); if (host.walker) host.walker.on = false; if (host.controls) host.controls.enabled = false;
      await driver.start(YARD.x, YARD.z, YARD.heading, "car");
      kit.markDriveHud();
      mark("seated in the car");
    } else if (POLICE_WARM_OLD) {
      await propsWarm(() => [driver.car.root, G.props.group]);
      mark("props + warm");
      await kit.spawnPlayer({ at: [YARD.x, YARD.z, "Police station, Rue Rouge"], mode: "drive", road: false });
      mark("spawn (teleport + area)");
    } else {
      const t1 = performance.now();
      const pw = propsWarm(() => [G.props.group]).then(() => T.push(["police props warm (beside the spawn)", Math.round(performance.now() - t1)]));
      await kit.spawnPlayer({ at: [YARD.x, YARD.z, "Police station, Rue Rouge"], mode: "drive", road: false });
      mark("spawn (teleport + area)");
      await pw;
      mark("props warm left after the spawn");
    }
    if (driver.on && driver.vehicle === "car") { driver.startPose = { ...YARD }; driver.reset(); }
    if (cars) { const c = cars[1]; parkCar(c.kind, groundPose(driver, c.x, c.z, c.heading, G.car.rigs[c.kind].model)); mark("second car parked"); }
    // keys
    G.keyFn = (e) => {
      if (!kit.current || kit.current.def.id !== "police" || kit.hud.menuOpen || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target?.closest?.("input,select,textarea")) return;
      // (claude/policeyard: on foot in the yard too, the shift is in a patrol car)
      if (HELD_KEYS.has(e.code) && (driver.on || G.parked.length)) { e.stopImmediatePropagation(); return; }
      if (e.code === "KeyE" && !kit.promptOn) {
        const s = swapState(kit);
        if (s) { e.stopImmediatePropagation(); e.preventDefault(); if (s.act === "out") getOut(kit); else getIn(kit, s.car); return; }
      }
      if (e.code === "KeyL") { e.stopImmediatePropagation(); G.car.setLights(); }
      else if (e.code === "KeyJ") { e.stopImmediatePropagation(); G.car.setSiren(); }
    };
    addEventListener("keydown", G.keyFn, true);
    // every frame: the car's lights, the traffic's emergency car, the hazards
    G.lastT = performance.now();
    G.frameFn = () => {
      const now = performance.now(), dt = Math.min(0.1, (now - G.lastT) / 1000); G.lastT = now;
      if (kit.paused) return;
      G.car.update(dt);
      if (G.parked.length) G.car.parkedLod(host.camera.position);
      const sim = G.traffic()?.sim, c = driver.state;
      if (sim) {
        const E = sim.emerg;
        E.on = !!(driver.on && c && G.car.lightsOn && G.car.sirenOn);
        if (E.on) { E.x = c.x; E.z = c.z; E.h = c.heading; E.v = c.speed; }
      }
      hazard.value = G.hazard ? ((now / 1000) % 0.8 < 0.42 ? 1 : 0) : 0;
    };
    host.updaters.push(G.frameFn);
    kit.markers.set("hq", { x: GATE.x, z: GATE.z, color: "#5c8dff", kind: "poi", label: "HQ" });
    newShift(kit);
    if (mode === "missions") {
      kit.radio("Dispatch", TWO_CARS ? "Good morning. Car 7 on patrol from Rue Rouge: the unmarked or the marked car, both are in the yard (E to get out / in). Stand by for calls. (L blue lights, J siren)"
        : "Good morning. Unmarked car 7 on patrol from Rue Rouge. Stand by for calls. (L blue lights, J siren)", { icon: "radio" });
      offerNext(kit, 8);
    } else {
      kit.radio("Dispatch", options.calls ? "Free patrol. Calls will come in now and then: Y to take one, X to let it go." : "Free patrol, radio quiet. L blue lights, J siren.", { icon: "radio" });
      if (options.calls) kit.dispatch.setGenerator({ first: [25, 40], every: [60, 110], make: (k, rng) => makeCall(k, rng) });
    }
  },
  stop(kit) {
    if (G.keyFn) removeEventListener("keydown", G.keyFn, true); G.keyFn = null;
    const i = kit.host.updaters.indexOf(G.frameFn); if (i >= 0) kit.host.updaters.splice(i, 1); G.frameFn = null;
    const sim = G.traffic()?.sim; if (sim) { sim.emerg.on = false; sim.extraObs.length = 0; }
    releasePremise();
    G.tram()?.setBlock(null);
    G.props?.clear(); G.hazard = false;
    kit.markers.set("hq", null);
    G.chip?.el.classList.remove("on");
    G.parked = []; G.swap = null; G.swapEl?.classList.remove("on");
    G.car?.uninstall();
  },
  tick(kit, dt) {
    const S = G.shift;
    if (S) S.km += kit.inVehicle ? kit.player.speed * dt : 0;
    G.props.update(kit.player.x, kit.player.z);
    // the light / siren chip (4 Hz-ish: only when it changes)
    const st = `${G.car.lightsOn ? 1 : 0}${G.car.sirenOn ? 1 : 0}${kit.host.driver.on ? 1 : 0}`;
    if (st !== G.chip.last) {
      G.chip.last = st;
      G.chip.el.classList.toggle("on", kit.host.driver.on);
      G.chip.l.classList.toggle("lit", G.car.lightsOn); G.chip.s.classList.toggle("lit", G.car.sirenOn); G.chip.s.classList.toggle("siren", G.car.sirenOn);
    }
    // the shift: the next job when idle (a call on the card; ignored = another one later)
    if (kit.current.mode === "missions" && !kit.mission && !kit.dispatch.current && !kit.dispatch.queue.length && G.next && kit.time >= G.next) {
      const t = ORDER[S.n % ORDER.length];
      const call = makeCall(kit, G.rng, t);
      if (call) {
        S.n++;
        const ig = call.onIgnore;
        call.onIgnore = (k, to) => { ig?.(k, to); offerNext(kit, 25); };
        kit.dispatch.push(call);
        G.next = 0;
      } else offerNext(kit, 15);
    }
    watchPremise(kit);
    if (TWO_CARS) swapPrompt(kit);
    // the end of the shift at HQ: the idle objective's E
    if (G.atHQ && !kit.mission && kit.consumeUse()) endShift(kit);
  },
  /** no job running: back at HQ -> "E: end the shift" */
  idleObjective(kit) {
    const P = kit.player, d = Math.hypot(P.x - GATE.x, P.z - GATE.z);
    if (d > 120 && G.shift) G.shift.left = true;                     // (the prompt only once the car has been out)
    G.atHQ = d < HQ_R && !!G.shift?.left && P.speed < 1.5 && kit.inVehicle;   // (claude/policeyard: on foot, E is the cars')
    if (!G.atHQ) return null;
    return { title: "Back at the station", text: "Rue Rouge: end your shift here, or drive on.", line: "", prompt: "End the shift", steps: 1, step: 1, timeLeft: null };
  },
  onMissionEnd(kit, r) {
    const S = G.shift, t = r.def.policeType;
    if (r.result.ok) { S.done++; if (t) G.done[t] = (G.done[t] || 0) + 1; } else S.failed++;
    if (!MISSIONS_OLD && r.def.premise && r.def.premise === G.live) releasePremise();
    G.props.clear(); G.hazard = false;
    G.tram()?.setBlock(null);
    if (kit.current.mode === "missions") offerNext(kit, r.result.ok ? 14 : 20);
  },
  onAction(kit, a) {
    if (a === "newshift") kit.hud.toast(null);
    else if (a === "quit") { kit.hud.toast(null); kit.quitGame(); }
  },
};
export { G as POLICE_STATE, YARD, GATE, POLICE_CAR, TWO_CARS };
// (browser checks, claude/missions) window.__policePremise(): the live premise and the made / cancelled counts
// (claude/policeyard) window.__policeYard(): the cars (driven / parked), what E does now, the cars taken
if (typeof window !== "undefined") window.__policeYard = () => ({ two: TWO_CARS, driving: G.kit?.host.driver.on ? G.car?.kind : null, parked: G.parked.map((p) => ({ kind: p.kind, x: +p.x.toFixed(2), z: +p.z.toFixed(2) })),
  swap: G.swap ? { act: G.swap.act, kind: G.swap.car?.kind } : null, taken: G.taken, rigs: Object.keys(G.car?.rigs || {}), getOut: () => G.kit && getOut(G.kit), getIn: (k) => { const p = G.parked.find((q) => q.kind === k); return p && G.kit && getIn(G.kit, p); } });
if (typeof window !== "undefined") window.__policePremise = () => ({ live: G.live ? { type: G.live.type, check: G.live.check(G.kit), spot: G.live.spot ? { name: G.live.spot.name, eta: G.live.spot.eta, D: G.live.spot.D } : null } : null, ...G.premiseStats });
