// THE FALCON MISSIONS (docs/FALCON_GAME.md "Missions"): data missions for the game kit (viewer/game/missions.js), mostly
// `custom` steps that read the falcon flight (viewer/falconFlight/falconGame.js: catches, deliveries, the strike window)
// through the game state S (falconGameDef.js). Setup that must be undone whatever the end (dusk, the crows, the hunger)
// is a mission ENTITY with a release() (the kit releases a mission's entities when it ends: success, fail, abandon).
//   first     First hunt: climb high, find the pigeons of the Place de Saint-Job, stoop and catch one, bring it home
//   hungry    Hungry eyases: three chicks' hunger drains; bring three prey before one of them runs empty
//   murmur    Starling murmuration: at dusk, into the murmuration over the nearest roost (Parc Fond'Roy from Saint-Job);
//             catch a starling (the flock scatters from a stooping falcon: harder), bring it home
//   defend    Defend the eyrie: carrion crows mob the ledge: fly at them until they leave; then a herring gull chases
//             you for the pigeon in your talons: get it home
import { PLACE } from "../falconFlight/church.js";

const km = (v) => Math.round(v * 3.6);
const metres = (d) => (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d / 5) * 5} m`);
const FALCON = { name: "The falcon", icon: "falcon" };
const NARR = { from: "Saint-Job", icon: "falcon" };

/** the eyrie as a waypoint target (the belfry ledge) */
const eyrieTarget = (S) => (kit) => ({ x: S.eyrie.x, z: S.eyrie.z, name: "the eyrie (Saint-Job belfry)" });
/** a deliver-to-the-eyrie step */
const deliverStep = (S, { time = 240, text = "Bring it to the eyrie: land on the ledge (E near it, slow)" } = {}) => ({
  type: "custom", text, target: eyrieTarget(S), radius: 25, route: false, time,
  onStart: (c) => { c.vars.d0 = S.game().score.delivered; },
  check: (c) => {
    if (S.game().score.delivered > c.vars.d0) return true;
    if (!S.flyer().bird.prey) return "fail: the prey was lost";
    return false;
  },
  status: (c) => {
    const f = S.game().f, d = Math.hypot(f.pos.x - S.eyrie.x, f.pos.z - S.eyrie.z);
    return { line: d < 40 ? (f.V > 24 ? `slow down to land (${km(f.V)} km/h)` : "E: land on the ledge") : `the eyrie: ${metres(d)}` };
  },
});

export function makeMissions(S) {
  const first = {
    id: "falcon-first-hunt", title: "First hunt", giver: FALCON,
    brief: "The eyases are calling. Climb high over the Place de Saint-Job: the pigeons feed on the setts below.",
    steps: [
      { type: "custom", text: "Gain height: 70 m over the Place, or perch on the spire's cross (Space: wingbeats)", marker: false, time: 180,
        check: () => S.height() >= 70 || (S.game().mode === "perch" && S.game().perch?.name === "cross"),
        status: () => ({ line: `${Math.round(S.height())} m / 70 m${S.game().f.stamina < 0.15 ? " · tired: glide to rest your wings" : ""}`, progress: Math.min(1, Math.max(0, S.height()) / 70) }) },
      { type: "custom", text: "Find the pigeons of the Place de Saint-Job", target: [PLACE.x, PLACE.z, "Place de Saint-Job"], radius: 60, route: false, time: 150,
        radio: { ...NARR, text: "Good height. The pigeons are on the Place and the roofs round it: look for them below." },
        check: () => { const f = S.game().f, w = S.game().window; return Math.hypot(f.pos.x - PLACE.x, f.pos.z - PLACE.z) < 110 || (!!w && w.d < 150); },
        status: () => { const f = S.game().f; return { line: `the Place: ${metres(Math.hypot(f.pos.x - PLACE.x, f.pos.z - PLACE.z))}` }; } },
      { type: "custom", text: "Stoop and catch one: Shift to tuck, F talons", marker: false, time: 240,
        radio: { ...NARR, text: "Drop on them: they burst up when you come. Take one in the air, fast and straight: a slow attack misses, the pigeon out-turns you." },
        onStart: (c) => { c.vars.c0 = S.game().score.catches; },
        check: (c) => S.game().score.catches > c.vars.c0,
        status: () => { const g = S.game(), w = g.window; return { line: w ? `${Math.round(w.d)} m · ${km(g.f.V)} km/h${w.ok ? " · IN THE WINDOW" : w.closing <= 8 ? " · too slow: dive" : " · line up"}` : `${km(g.f.V)} km/h · no prey ahead` }; } },
      deliverStep(S),
    ],
    reward: { score: 200 }, timeBonus: { under: 170, score: 100 },
  };

  const hungry = {
    id: "falcon-hungry", title: "Hungry eyases", giver: FALCON,
    brief: "Three eyases and they are always hungry. Bring three prey to the eyrie before one of them goes without for too long.",
    steps: [
      { type: "custom", text: "Feed the eyases: three prey to the eyrie", target: eyrieTarget(S), radius: 25, route: false,
        entity: { id: "hunger", make: () => S.hungerEntity([0.92, 0.84, 0.88]) },
        onStart: (c) => { c.vars.d0 = S.game().score.delivered; c.vars.warn = false; },
        check: (c, dt) => {
          const H = S.hunt.hunger, fed = S.game().score.delivered - c.vars.d0;
          if (!H) return false;
          for (let i = 0; i < 3; i++) H[i] = Math.max(0, H[i] - S.drain[i] * dt);
          const low = Math.min(...H);
          if (low <= 0) return "fail: an eyas went hungry too long (the falcon had to hunt for it herself)";
          if (low < 0.25 && !c.vars.warn) { c.vars.warn = true; c.say("The falcon", "The eyases are screaming for food. Hurry!", { icon: "falcon", urgent: true }); }
          if (low > 0.4) c.vars.warn = false;
          return fed >= 3;
        },
        status: (c) => { const H = S.hunt.hunger, fed = S.game().score.delivered - c.vars.d0; return { line: `fed ${fed} / 3 · hungriest ${H ? Math.round(Math.min(...H) * 100) : 0} %${S.flyer().bird.prey ? " · prey in the talons: home!" : ""}`, progress: fed / 3 }; } },
    ],
    reward: { score: 300 },
  };

  const murmur = {
    id: "falcon-murmuration", title: "Starling murmuration", giver: FALCON,
    brief: "Dusk. Thousands of starlings gather over their roost before they drop into the trees. A starling is hard to take from that flock: pick one at the edge.",
    steps: [
      { type: "custom", text: "Fly to the murmuration", route: false, radius: 80, time: 300,
        entity: { id: "dusk", make: () => S.duskEntity() },
        target: () => { const r = S.murmuration(); return r ? { x: r.x, z: r.z, name: r.name } : { x: 1107, z: 1240, name: "Parc Fond'Roy" }; },
        check: () => { const r = S.murmuration(); if (!r) return false; const f = S.game().f; return Math.hypot(f.pos.x - r.fx, f.pos.y - r.fy, f.pos.z - r.fz) < 130; },
        status: () => { const r = S.murmuration(), f = S.game().f; return { line: r ? `the flock: ${metres(Math.hypot(f.pos.x - r.fx, f.pos.z - r.fz))} (${r.name})` : "the starlings are gathering…" }; } },
      { type: "custom", text: "Catch a starling from the murmuration", marker: false, time: 240,
        radio: { ...NARR, text: "The flock tightens and swirls when it sees you. Climb above it, then stoop on a straggler." },
        onStart: (c) => { c.vars.t0 = performance.now(); },
        check: (c) => { const t = S.hunt.mux.lastTaken; return !!t && t.slot === "murmuration" && t.t > c.vars.t0 && !!S.flyer().bird.prey; },
        failIf: () => (S.murmuration() ? false : "the starlings have gone down to roost"),
        status: () => { const g = S.game(), w = g.window; return { line: w ? `${S.hunt.mux.kind(w.i)} · ${Math.round(w.d)} m · ${km(g.f.V)} km/h${w.ok ? " · IN THE WINDOW" : ""}` : `${km(g.f.V)} km/h` }; } },
      deliverStep(S, { time: 300 }),
    ],
    reward: { score: 350 },
  };

  const defend = {
    id: "falcon-defend", title: "Defend the eyrie", giver: FALCON,
    brief: "Crows on the tower! They are after the eyases. Drive them off: fly straight at them, fast.",
    steps: [
      { type: "custom", text: "Chase the crows off the eyrie: fly at them", target: eyrieTarget(S), radius: 30, route: false, time: 240,
        entity: { id: "mob", make: () => S.mobEntity(5) },
        onStart: (c) => { c.vars.h = 0; },
        check: (c, dt) => {
          const M = S.mobbers;
          c.vars.h += M.stats.harass * dt * 0.005;
          if (c.vars.h >= 1) return "fail: the crows took the ledge";
          return M.crowsLeft() === 0 && M.stats.chased > 0;
        },
        status: (c) => { const M = S.mobbers; return { line: `crows left ${M.crowsLeft()} · the eyrie harassed ${Math.round(c.vars.h * 100)} %`, progress: M.stats.chased / 5 }; } },
      { type: "custom", text: "Now hunt: catch something for the eyases", marker: false, time: 240,
        radio: { from: "The falcon", icon: "falcon", text: "Well done, they are gone. The young are hungry: bring them something." },
        onStart: (c) => { c.vars.c0 = S.game().score.catches; },
        check: (c) => S.game().score.catches > c.vars.c0 && !!S.flyer().bird.prey,
        status: () => { const g = S.game(), w = g.window; return { line: w ? `${S.hunt.mux.kind(w.i)} · ${Math.round(w.d)} m${w.ok ? " · IN THE WINDOW" : ""}` : `${km(g.f.V)} km/h · the pigeons are on the Place` }; } },
      { ...deliverStep(S, { time: 240, text: "Bring it home: don't let the gull rob you" }),
        radio: { from: "The falcon", icon: "falcon", urgent: true, text: "A herring gull has seen your prey! It will take it off you: get home fast, or turn on it." },
        onStart: (c) => { c.vars.d0 = S.game().score.delivered; S.mobbers.startGull(S.game().f); },
        failIf: () => (S.mobbers.stats.stolen > 0 ? "the gull robbed you of the prey" : false) },
    ],
    reward: { score: 300 },
  };
  return { first, hungry, murmur, defend, order: [first, hungry, murmur, defend] };
}
