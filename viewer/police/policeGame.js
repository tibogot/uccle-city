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
import { PoliceCar, POLICE_CAR } from "./policeCar.js";
import { Props, hazard } from "./props.js";
import { JOBS } from "./policeMissions.js";
import { warm } from "./warm.js";

// the station's site frame (models/police_rouge/site.json: origin, rotation): the yard, the gate, the HQ marker
const FRM = { o: [-514.182, -340.015], r: -0.586023 };
const toCity = (u, w) => [FRM.o[0] + u * Math.cos(FRM.r) - w * Math.sin(FRM.r), FRM.o[1] + u * Math.sin(FRM.r) + w * Math.cos(FRM.r)];
const YARD = (() => { const [x, z] = toCity(18, -6); return { x, z, heading: Math.atan2(-Math.sin(FRM.r), Math.cos(FRM.r)) }; })();
const GATE = (() => { const [x, z] = toCity(30, 12.3); return { x, z }; })();
const HQ_R = 30;
const ORDER = ["tram", "speed", "accident", "stolen"];
const HELD_KEYS = new Set(["KeyB", "KeyK", "KeyV"]);

const css = `
.pol-chip{position:fixed;right:18px;bottom:96px;z-index:30;display:none;gap:6px;font:600 12px/1 system-ui,sans-serif;letter-spacing:.04em}
body.game-on .pol-chip.on{display:flex}
.pol-chip span{padding:6px 9px;border-radius:7px;background:rgba(16,20,26,.72);color:#8b96a3;border:1px solid rgba(255,255,255,.08)}
.pol-chip span.lit{color:#fff;background:#1b4dff;border-color:#6f8dff;box-shadow:0 0 14px rgba(40,90,255,.6)}
.pol-chip span.lit.siren{background:#c62828;border-color:#ff8a80;box-shadow:0 0 14px rgba(255,60,60,.5)}
body.game-photo .pol-chip{display:none!important}`;

function makeChip() {
  const st = document.createElement("style"); st.textContent = css; document.head.append(st);
  const el = document.createElement("div"); el.className = "pol-chip";
  el.innerHTML = `<span data-k="l" title="L">● BLUE LIGHTS</span><span data-k="s" title="J">♪ SIREN</span>`;
  document.body.append(el);
  return { el, l: el.querySelector('[data-k="l"]'), s: el.querySelector('[data-k="s"]'), last: "" };
}

const G = {
  kit: null, car: null, props: null, spots: null, chip: null, done: {}, rams: 0, hazard: false,
  shift: null, next: 0, keyFn: null, frameFn: null, lastT: 0, rng: Math.random,
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

/** a job call: the next type in the shift's order (missions) or a random one (calls), skipping types with no place */
function makeCall(kit, rng, type = null) {
  const types = type ? [type, ...ORDER.filter((t) => t !== type)] : [...ORDER].sort(() => rng() - 0.5);
  for (const t of types) { const c = JOBS[t](G, kit, rng); if (c) { c.mission.policeType = t; c.expires = 35; return c; } }
  return null;
}
function offerNext(kit, delay = 0) { G.next = kit.time + delay; }

function newShift(kit) {
  const r = kit.record;
  G.shift = { left: false, t0: kit.time, done: 0, failed: 0, score: r.score, money: r.money, rep: r.rep, km: 0, n: 0 };
}
function endShift(kit) {
  const S = G.shift, r = kit.record, mins = Math.max(1, Math.round((kit.time - S.t0) / 60));
  kit.dispatch.clear();
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
  tagline: "An unmarked car out of the Rue Rouge station. Radio dispatch: cars on the tram line, speed checks, accidents, stolen cars.",
  modes: [{ id: "missions", label: "Shift", desc: "dispatch sends you jobs", primary: true }, { id: "free", label: "Free patrol", desc: "lights + siren, no job" }],
  options: [{ id: "calls", label: "Dispatch calls in free patrol", default: true }, { id: "siren", label: "Siren sound (off = silent siren)", default: false }],
  idleText: { missions: "Patrol. Dispatch will call you.", free: "Free patrol. L blue lights, J siren." },
  keys: { default: "<kbd>W A S D</kbd> drive · <kbd>L</kbd> blue lights · <kbd>J</kbd> siren · <kbd>Y</kbd>/<kbd>X</kbd> calls · <kbd>E</kbd> act · <kbd>Esc</kbd> pause · <kbd>M</kbd> map" },

  async start(kit, { mode, options }) {
    G.kit = kit; G.done = {};
    const host = kit.host, driver = host.driver;
    if (!G.car) G.car = new PoliceCar({ driver, kit });
    if (!G.props) G.props = new Props({ scene: host.scene, driver, getTraffic: () => G.traffic(), renderer: host.renderer, camera: host.camera });
    if (!G.chip) G.chip = makeChip();
    G.car.setSound(!!options.siren);
    await loadSpots();
    // the car first (the drive mode then starts with it), its pipelines and the props' under the spawn card
    await G.car.install();
    kit.hud.toast({ title: "Police station, Rue Rouge", text: "Getting the car ready…" }, 0);
    try {
      await G.props.ready();
      const tmp = G.props.warmSet();
      await warm([driver.car.root, G.props.group], host.camera, 8);
      G.props.unwarm(tmp);
    } catch (e) { host.log(`police compile: ${e.message}`); }
    await kit.spawnPlayer({ at: [YARD.x, YARD.z, "Police station, Rue Rouge"], mode: "drive", road: false });
    if (driver.on && driver.vehicle === "car") { driver.startPose = { ...YARD }; driver.reset(); }
    // keys
    G.keyFn = (e) => {
      if (!kit.current || kit.current.def.id !== "police" || kit.hud.menuOpen || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.target?.closest?.("input,select,textarea")) return;
      if (HELD_KEYS.has(e.code) && driver.on) { e.stopImmediatePropagation(); return; }
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
      kit.radio("Dispatch", "Good morning. Unmarked car 7 on patrol from Rue Rouge. Stand by for calls. (L blue lights, J siren)", { icon: "radio" });
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
    G.tram()?.setBlock(null);
    G.props?.clear(); G.hazard = false;
    kit.markers.set("hq", null);
    G.chip?.el.classList.remove("on");
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
        call.onIgnore = () => offerNext(kit, 25);
        kit.dispatch.push(call);
        G.next = 0;
      } else offerNext(kit, 15);
    }
    // the end of the shift at HQ: the idle objective's E
    if (G.atHQ && !kit.mission && kit.consumeUse()) endShift(kit);
  },
  /** no job running: back at HQ -> "E: end the shift" */
  idleObjective(kit) {
    const P = kit.player, d = Math.hypot(P.x - GATE.x, P.z - GATE.z);
    if (d > 120 && G.shift) G.shift.left = true;                     // (the prompt only once the car has been out)
    G.atHQ = d < HQ_R && !!G.shift?.left && P.speed < 1.5;
    if (!G.atHQ) return null;
    return { title: "Back at the station", text: "Rue Rouge: end your shift here, or drive on.", line: "", prompt: "End the shift", steps: 1, step: 1, timeLeft: null };
  },
  onMissionEnd(kit, r) {
    const S = G.shift, t = r.def.policeType;
    if (r.result.ok) { S.done++; if (t) G.done[t] = (G.done[t] || 0) + 1; } else S.failed++;
    G.props.clear(); G.hazard = false;
    G.tram()?.setBlock(null);
    if (kit.current.mode === "missions") offerNext(kit, r.result.ok ? 14 : 20);
  },
  onAction(kit, a) {
    if (a === "newshift") kit.hud.toast(null);
    else if (a === "quit") { kit.hud.toast(null); kit.quitGame(); }
  },
};
export { G as POLICE_STATE, YARD, GATE, POLICE_CAR };
