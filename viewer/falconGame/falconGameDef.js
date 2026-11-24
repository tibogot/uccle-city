// THE FALCON GAME, round 1 (docs/FALCON_GAME.md): the life of the real Saint-Job peregrines (the pair nests in the belfry
// of Saint-Job church, Uccle). The player is the TIERCEL (the male: during the nestling weeks he does most of the
// hunting, the female broods and feeds the young; she takes his prey at the eyrie and feeds the three eyases).
// Registered on the game kit (viewer/game/, docs/GAMEKIT.md) with id "falcon": it replaces the kit's "coming soon" card.
//   missions     a short campaign (falconMissions.js): First hunt, Hungry eyases, Starling murmuration, Defend the eyrie;
//                each passed one offers the next on the radio card (Y)
//   free         free flight over Uccle: hunt whenever you like (pigeons on the squares, starling parties, parakeets and
//                jackdaws by day), every catch and delivery scores; no objective
// On top of the city's falcon flight (viewer/falconFlight/cityFlyer.js, started with kit.host.fly(): the nest intro):
// hunt.js (one prey source over the pigeons and the GPU flocks, the aim assist, the catch feel, the prey marker, the
// gauges), gpuPrey.js (the sky flocks read back, the dead flag), mobbers.js (crows, the gull).
// Keys: the flight's own (W/S A/D, Space, Shift, C, Q, F, E, V, click = mouse aim); the kit's P / Esc pause, Y / X calls.
// Sound: the flight's wind / calls only with the start menu's "sound" option (off by default).
import { GpuPrey } from "./gpuPrey.js";
import { FalconHunt } from "./hunt.js";
import { Mobbers } from "./mobbers.js";
import { makeMissions } from "./falconMissions.js";
import { warm } from "../police/warm.js";
import { PLACE } from "../falconFlight/church.js";
import { CTL_OLD } from "../falconFlight/falconInput.js";
import { FUN_OLD, placeStarter } from "../falconFlight/falconFun.js";

const DEG = Math.PI / 180;
const S = {
  kit: null, hunt: null, mobbers: null, eyrie: { x: 1213, y: 105, z: 556 }, frameFn: null, lastT: 0, M: null, prev: null,
  flyer: () => S.kit.host.flyer,
  game: () => S.kit.host.flyer.game,
  fam: () => window.__falcons ?? null,
  agl: () => S.game()?.agl ?? 0,
  /** height over the Place de Saint-Job's setts (m) */
  height: () => { const fl = S.flyer(); S.gr ??= fl.w.ground(PLACE.x, PLACE.z); return fl.game.f.pos.y - S.gr; },
  /** the eyases' hunger as a mission entity (drains in tick(), refilled on delivery); released = off */
  hungerEntity(h0) {
    S.hunt.hunger = h0.slice();
    S.drain = [1 / 270, 1 / 300, 1 / 250];              // (full to empty in 4-5 min: a delivery every ~80 s keeps them going)
    return { alive: true, x: S.eyrie.x, z: S.eyrie.z, y: 0, label: "the eyases", update() {}, release() { S.hunt.hunger = null; this.alive = false; } };
  },
  /** dusk + the murmuration forced on, restored at the end */
  duskEntity() {
    const L = window.viewer?.lighting, B = window.__birds;
    const was = { hour: L?.hourOverride ?? null, force: B?.force?.murmuration ?? false };
    if (L) L.hourOverride = duskHour(L, 2.5);
    if (B?.force) B.force.murmuration = true;
    return { alive: true, x: 0, z: 0, y: 0, label: "dusk", update() {},
      release() { if (L) L.hourOverride = was.hour; if (B?.force) B.force.murmuration = was.force; this.alive = false; } };
  },
  /** the murmuration now: { name, x, z (the roost), fx, fy, fz (the flock's leader point) } | null */
  murmuration() {
    const B = window.__birds, F = B?.flocks?.find((q) => q.key === "murmuration");
    if (!F || F.state !== "on") return null;
    const r = B.sky.row(F.k, 0);
    return { name: F.home?.name ?? "the roost", x: F.home?.x ?? r.x, z: F.home?.z ?? r.z, fx: r.x, fy: r.y, fz: r.z };
  },
  mobEntity(n) {
    S.mobbers.startCrows(S.eyrie, n, S.out);
    return { alive: true, x: S.eyrie.x, z: S.eyrie.z, y: 0, label: "the crows", update() {}, release() { S.mobbers.stop(); this.alive = false; } };
  },
  /** a pigeon in the talons (the defend mission's second half) */
  givePrey() {
    const fl = S.flyer(), g = fl.game, fam = S.fam();
    if (fl.bird.prey || !fam?.preyMesh) return;
    fl.bird.carry(fam.preyMesh, fam.nestMat);
    g.f.extraMass = 0.33; g.score.carriedSince = g.t; g.score.lastStrike = 20;
    S.hunt.mux.carried = { kind: "feral pigeon", slot: "pigeons" };
  },
};

/** the solar hour of this day when the sun stands `elev` degrees over the western horizon (bisection on the firmament) */
function duskHour(L, elev) {
  const keep = L.hourOverride;
  let a = 13, b = 22.5;
  for (let k = 0; k < 24; k++) {
    const m = (a + b) / 2; L.hourOverride = m;
    const e = Math.asin(Math.max(-1, Math.min(1, L.firmSunDir().y))) / DEG;
    if (e > elev) a = m; else b = m;
  }
  L.hourOverride = keep;
  return (a + b) / 2;
}

/** a catch / a delivery: score (the game record), a radio line now and then */
function onCatch(t, kmh, g) {
  const kit = S.kit, rec = kit.record;
  // (falcon fun: the game's bonus score: PERFECT STOOP x2, HEAD-ON, RACER, COMBO, the run's +100; falconFun.js score)
  const pts = g?.fun && g.lastCatch?.pts != null ? g.lastCatch.pts : Math.round(10 + kmh / 6);
  rec.score += pts; kit.save.touch();
  const fl = S.flyer();
  if (fl.bird.prey && t && t.kind !== "feral pigeon" && t.kind !== "jackdaw") fl.bird.prey.scale.multiplyScalar(t.kind === "starling" ? 0.55 : 0.75);
  if (kit.current?.mode === "free" && (S.freeCatches = (S.freeCatches || 0) + 1) === 1)
    kit.radio("The falcon", g?.fun ? `A ${t?.kind ?? "catch"} at ${kmh} km/h! Hunt on (the arrow shows the next pigeons): bringing prey to the eyrie's ledge is a bonus.` : `A ${t?.kind ?? "catch"} at ${kmh} km/h! Bring it to the eyrie: land on the ledge.`, { icon: "falcon" });
}
function onDeliver(t) {
  const kit = S.kit, H = S.hunt.hunger;
  kit.record.score += 40; kit.save.touch();
  if (H) {
    const k = t?.kind === "feral pigeon" || t?.kind === "jackdaw" ? 0.5 : t?.kind === "ring-necked parakeet" ? 0.38 : 0.28;
    for (let i = 0; i < 3; i++) H[i] = Math.min(1, H[i] + k * (0.8 + 0.4 * (1 - H[i])));
  }
  kit.radio("The falcon", H ? "She takes it in to the young: they are tearing at it already." : "The female takes it in and feeds the eyases.", { icon: "falcon", beep: false });
}

function nextMission(kit) {
  const rec = kit.record, order = S.M.order;
  return order.find((m) => !(rec.missions[m.id]?.done > 0)) || null;
}
function offer(kit, def, text) {
  kit.dispatch.push({ priority: 1, from: "The falcon", icon: "falcon", text, mission: def, expires: 40,
    onIgnore: () => { S.offerAt = kit.time + 30; S.offerDef = def; } });
}

export const FALCON_GAME = {
  id: "falcon", title: "Falcon", icon: "falcon",
  tagline: "The Saint-Job peregrines: you are the tiercel. Stoop on pigeons and starlings, feed the three eyases, drive the crows off the eyrie.",
  modes: [{ id: "missions", label: "Missions", desc: "hunt, feed the eyases, defend the eyrie", primary: true }, { id: "free", label: "Free flight", desc: "fly over Uccle, hunt when you like" }],
  options: [{ id: "assist", label: "Aim assist in the strike", default: true }, { id: "avoid", label: "Flight assist: steer clear of roofs, trees and the ground", default: true }],   // (no sound tick: the speaker button is the one switch, docs/SOUND_CITY.md)
  idleText: { missions: "Rest on a perch or circle the tower: the falcon will call.", free: "Free flight. Hunt anytime: pigeons on the squares, starlings and parakeets over the parks." },
  keys: { default: CTL_OLD ? "<kbd>W S A D</kbd> fly · <kbd>Space</kbd> flap · <kbd>Shift</kbd> stoop · <kbd>F</kbd> talons · <kbd>E</kbd> land · <kbd>V</kbd> camera · click: mouse aim · <kbd>Esc</kbd> pause"
    : FUN_OLD ? "click + mouse or <kbd>A D</kbd> steer · <kbd>W S</kbd> down / up · <kbd>Space</kbd> climb · <kbd>Shift</kbd> stoop · <kbd>E</kbd> land · <kbd>F</kbd> talons · <kbd>V</kbd> camera · <kbd>Esc</kbd> pause"
    : "click + mouse or <kbd>A D</kbd> steer · look at a pigeon, hold <kbd>F</kbd> (or <kbd>Shift</kbd>) = dive onto it · <kbd>Space</kbd> climb, tap = sprint · <kbd>Shift</kbd> stoop · <kbd>E</kbd> land · <kbd>V</kbd> camera · <kbd>Esc</kbd> pause" },

  async start(kit, { mode, options }) {
    S.kit = kit;
    const host = kit.host, fl = host.flyer;
    if (!fl?.ready) { kit.hud.toast({ kind: "bad", title: "No falcon flight", text: "This page runs the old flight (?falcon=old)." }, 6000); return; }
    kit.hud.toast({ title: "Saint-Job church", text: "The tiercel wakes in the belfry…" }, 0);
    try {
      await fl.ready;
      if (!S.hunt) {
        const B = window.__birds;
        S.hunt = new FalconHunt({ flyer: fl, camera: host.camera, gpu: B?.sky ? new GpuPrey(B) : null });
        S.hunt.onCatch = onCatch; S.hunt.onDeliver = onDeliver;
        S.mobbers = new Mobbers(host.scene);
        B?.sky?.kill(-1);                                   // (the dead-flag pipeline, built now, not on the first catch)
        try { await warm([S.mobbers.mesh], host.camera, 6); } catch (e) { host.log(`falcon game warm: ${e.message}`); }
        S.M = makeMissions(S);
      }
      const fam = S.fam();
      if (fam) {
        const w = fam.toWorld(fam.perch.ledge.pos.clone()), o = fam.perch.ledge.facing, a = fam.group.rotation.y;
        S.eyrie = { x: w.x, y: w.y, z: w.z };
        S.out = { x: o.x * Math.cos(a) + o.z * Math.sin(a), z: -o.x * Math.sin(a) + o.z * Math.cos(a) };
      }
      S.hunt.assist = options.assist ? 1 : 0;
      if (fl.game.assist) fl.game.assist.avoid = options.avoid !== false && !/[?&]falconavoid=0(&|$)/.test(location.search);
      S.startCheck = !/[?&]falconstart=old(&|$)/.test(location.search);
      S.hunt.last = { catches: fl.game.score.catches, delivered: fl.game.score.delivered };
      S.freeCatches = 0; S.offerAt = 0;
      fl.preySource = S.hunt.mux;
      // with prey in the talons, E near the eyrie lands on its ledge (not the nearest louvre / ridge): within 40 m, any
      // side but behind, under 26 m/s
      const G0 = fl.game;
      S.perch0 ??= G0.perchInReach;
      G0.perchInReach = function () {
        const ledge = fl.bird.prey && this.perches.find((q) => q.eyrie);
        if (ledge) {
          const f = this.f, dx = ledge.pos.x - f.pos.x, dy = ledge.pos.y - f.pos.y, dz = ledge.pos.z - f.pos.z, d = Math.hypot(dx, dy, dz);
          const ahead = (dx * -Math.sin(f.heading) + dz * -Math.cos(f.heading)) / Math.max(Math.hypot(dx, dz), 0.1);
          if (d < 40 && d > 1.5 && f.V < 26 && ahead > -0.2 && dy < 12 && dy > -25) return ledge;
        }
        return S.perch0.call(this);
      };
      S.hunt.show(true);
      // the per-frame part: the hunt layer + the mobbers
      S.lastT = performance.now();
      S.frameFn = () => {
        const now = performance.now(), dt = Math.min(0.1, (now - S.lastT) / 1000); S.lastT = now;
        if (kit.paused || !fl.on) return;
        // (falconfix) the first frame after the play loader: the tiercel must be at the eyrie (the intro playing, or on
        // its ledge). A start that lost it (the family not loaded in time: the old fly start; a glide behind the loader)
        // starts again from the nest, or in the air off the eyrie
        if (S.startCheck && !window.__playLoader?.active) {
          S.startCheck = false;
          const f = fl.game.f, d = Math.hypot(f.pos.x - S.eyrie.x, f.pos.z - S.eyrie.z);
          if (!fl.intro && d > 80) {
            host.log(`falcon game: the tiercel was ${d.toFixed(0)} m from the eyrie at the start: back to the nest`);
            if (fl.nest) fl.startFromNest(fl.nest);
            else { const o = S.out || { x: 0, z: -1 }; fl.start(S.eyrie.x + o.x * 6, S.eyrie.z + o.z * 6, Math.atan2(-o.x, -o.z), S.eyrie.y + 2, 13, 0); }
          }
        }
        S.hunt.frame(dt);
        const g = fl.game;
        // (falcon fun, round 2) the two nearest squares with pigeons on the minimap / the full map (the flock glyph)
        if (g.fun && (S.flockT = (S.flockT || 0) + dt) >= 1) { S.flockT = 0; flockMarkers(kit, fl); }
        if ((S.hudT = (S.hudT || 0) + dt) >= 0.25) { S.hudT = 0; S.hunt.hud(); }
        if (S.mobbers.active) {
          S.mobbers.update(dt * g.timeScale, g.f, !!fl.bird.prey, (x, z) => fl.w.floor(x, z));
          for (const e of S.mobbers.events.splice(0)) {
            if (e.kind === "stolen") { fl.bird.drop(); g.f.extraMass = 0; S.hunt.mux.carried = null; kit.radio("The falcon", "The gull has it! Gone.", { icon: "falcon", urgent: true }); }
            else if (e.kind === "chased") { kit.record.score += 15; if (S.mobbers.crowsLeft() > 0) kit.hud.radio("Saint-Job", `A crow bolts! ${S.mobbers.crowsLeft()} left.`, { icon: "falcon" }); }
            else if (e.kind === "veer") kit.hud.radio("Saint-Job", "The gull veers off. It will be back.", { icon: "falcon" });
          }
        }
      };
      host.updaters.push(S.frameFn);
      // perfgame (docs/PERF_GAME.md): the area round the eyrie built BEFORE the intro starts (the play loader holds;
      // the bird would otherwise fly its intro behind the screen and the area would move with it)
      if (S.eyrie && host.areaReady && window.__playLoader?.active) await host.areaReady({ x: S.eyrie.x, z: S.eyrie.z, label: "Falcon", near: 550 });
      // the nest start (the intro: the scrape, the hop to the ledge, the launch; Space skips)
      await host.fly();
      // (falcon fun) the first catch near-free: a tame pigeon on a roof right under the launch from the eyrie
      if (fl.game.fun && fl.pigeons && S.out) {
        const st = placeStarter(fl.pigeons, S.eyrie, S.out);
        fl.game.fun.starter = st ? { i: st.i, flock: fl.pigeons } : null;
        host.log(st ? `falcon fun: the first pigeon on a roof ${Math.hypot(st.x - S.eyrie.x, st.z - S.eyrie.z).toFixed(0)} m out, ${(S.eyrie.y - st.y).toFixed(0)} m under the eyrie` : "falcon fun: no roof under the launch for the first pigeon");
      }
      S.prev = { P: fl.game.f.P };
      // the tiercel: a fit adult (the flight lab's numbers are a juvenile's): wingbeats last ~22 s, rest back in ~20 s
      const P0 = fl.game.f.P;
      fl.game.f.P = { ...P0, stamina: { ...P0.stamina, drain: 0.045, regen: 0.05 } };
      if (fl.audio) fl.audio.on = true;                          // (the falcon's sound follows the speaker button)
      tiercel(fl, true);
    } finally { kit.hud.toast(null); }
    if (mode === "missions") {
      const m = nextMission(kit) || S.M.first;
      kit.radio("The falcon", "The eyases are awake and hungry. Off you go, tiercel.", { icon: "falcon" });
      setTimeout(() => { if (kit.current?.def.id === "falcon" && !kit.mission) kit.startMission(m); }, 4500);
    } else {
      kit.radio("Saint-Job", "Free flight. Pigeons on the squares, starlings and parakeets over the parks: hunt when you like, bring prey to the eyrie.", { icon: "falcon" });
    }
  },
  stop(kit) {
    const fl = kit.host.flyer;
    kit.markers?.set("flock0", null); kit.markers?.set("flock1", null); S.flockKey = "";
    const i = kit.host.updaters.indexOf(S.frameFn); if (i >= 0) kit.host.updaters.splice(i, 1); S.frameFn = null;
    S.mobbers?.stop();
    if (S.hunt) { S.hunt.show(false); S.hunt.hunger = null; }
    if (fl?.game) {
      fl.preySource = null;
      fl.game.pigeons = fl.pigeons ?? null; fl.game.target = -1; fl.game.timeScale = 1;
      if (S.prev?.P) fl.game.f.P = S.prev.P;
      if (Object.prototype.hasOwnProperty.call(fl.game, "perchInReach")) delete fl.game.perchInReach;
      tiercel(fl, false);
    }
  },
  tick(kit) {
    if (kit.current.mode !== "missions" || kit.mission || kit.dispatch.current || kit.dispatch.queue.length) return;
    if (S.offerAt && kit.time >= S.offerAt && S.offerDef) { S.offerAt = 0; offer(kit, S.offerDef, `Ready for "${S.offerDef.title}"? Y to start.`); }
  },
  onMissionEnd(kit, r) {
    if (kit.current.mode !== "missions") return;
    if (!r.result.ok) { S.offerAt = kit.time + 25; S.offerDef = r.def; return; }
    const n = nextMission(kit);
    const order = S.M.order, def = n || order[(order.indexOf(order.find((m) => m.id === r.def.id)) + 1) % order.length];
    const lines = {
      "falcon-hungry": "Good. Now the young will need more than one pigeon: keep them fed.",
      "falcon-murmuration": "The sun is going down. The starlings are gathering over Fond'Roy: try for one?",
      "falcon-defend": "Crows on the tower! Quick, back to the eyrie.",
      "falcon-first-hunt": "Another hunt? The pigeons are back on the Place.",
    };
    setTimeout(() => { if (kit.current?.def.id === "falcon" && !kit.mission) offer(kit, def, `${lines[def.id] || "Next:"} (Y: "${def.title}")`); }, 6500);
  },
};

/** (falcon fun) the nearest two squares with a flock (the Place de Saint-Job + cityFlyer's squares not known empty) as
 *  map markers; set only when the pair changes (a redraw), the city map's own overlay (viewer/game/mapMarkers.js) */
function flockMarkers(kit, fl) {
  const f = fl.game.f, L = (S._sq ??= []);
  L.length = 0;
  L.push({ name: "Place de Saint-Job", x: PLACE.x, z: PLACE.z });
  for (const q of fl.squares || []) if (q.state !== "none") L.push(q);
  L.sort((a, b) => Math.hypot(a.x - f.pos.x, a.z - f.pos.z) - Math.hypot(b.x - f.pos.x, b.z - f.pos.z));
  const key = `${L[0]?.name}|${L[1]?.name}`;
  if (key === S.flockKey && kit.markers?.list.some((m) => m.id === "flock0")) return;    // (a mission's end clears the markers)
  S.flockKey = key;
  for (let k = 0; k < 2; k++) kit.markers?.set(`flock${k}`, L[k] ? { x: L[k].x, z: L[k].z, color: k ? "#d9e6f2" : "#ffffff", kind: "flock", label: L[k].name } : null);
}

/** the player as the tiercel: the adult plumage on the player's bird, the family's own male out of the way */
function tiercel(fl, on) {
  const fam = window.__falcons;
  const mat = fl.bird?.mesh?.material;
  let n = mat?.colorNode;
  for (let k = 0; k < 4 && n && !n.isTextureNode; k++) n = n.node;
  if (n?.isTextureNode && fam?.assets?.adultMap) {
    S.juvTex ??= n.value;
    n.value = on ? fam.assets.adultMap : S.juvTex;
  }
  if (fam?.male) {
    if (on) { fam.male.state = "test"; fam.male.pos.set(0, -800, 0); fam.male.speed = 0; }
    else if (fam.male.state === "test") fam.perchAt(fam.male, "cross");
  }
}
export { S as FALCON_STATE };
