// THE KIT DEMO (docs/GAMEKIT.md "Demo"): proves the kit end to end; the police / falcon games replace it.
//   Missions   1 "Rush to Place Saint-Job": from the Observatory, drive to the square within 90 s (reach + time + route)
//              2 "Tail that car": follow a car of the traffic for 600 m without losing it (follow + a traffic entity)
//              then random calls from the templates below
//   Free play  the car at Place Saint-Job, no mission; radio calls optional (the start menu's toggle)
// Random calls (TEMPLATES): built from real places round the player: named shops (OSM), landmarks, parks, tram stops.
export const DEMO_MISSIONS = {
  rush: {
    id: "demo-rush", title: "Rush to Place Saint-Job", giver: { name: "Dispatch", icon: "radio" },
    brief: "Urgent: we need a car at Place Saint-Job. You have 90 seconds. Follow the yellow line.",
    start: { at: "observatory", mode: "drive", face: "stjob" },
    steps: [{ type: "reach", target: "stjob", radius: 30, time: 90, text: "Drive to {target}" }],
    reward: { score: 100, money: 40, rep: 1 }, timeBonus: { under: 60, score: 50 },
  },
  tail: {
    id: "demo-tail", title: "Tail that car", giver: { name: "Dispatch", icon: "radio" },
    brief: "A car near you matches a description. Tail it for 600 m. Don't lose it, don't get too close.",
    steps: [{ type: "follow", target: "@suspect", entity: { id: "suspect", kind: "trafficCar", min: 20, max: 220, missing: "no car in sight: try again on a busier street" },
      near: 70, lose: 150, loseTime: 10, distance: 600, tooClose: 6, text: "Follow the {entity}" }],
    reward: { score: 150, money: 60, rep: 2 },
  },
};

const metresBetween = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** random call templates: (kit, rng) -> call | null (null: no fitting place round here) */
export const TEMPLATES = [
  // a delivery between two real shops
  (kit, rng) => {
    const P = kit.player, a = kit.places.pick({ kinds: ["shop"], near: P, min: 150, max: 700, rng });
    const b = a && kit.places.pick({ kinds: ["shop"], near: a, min: 400, max: 1200, exclude: [a.id], rng });
    if (!a || !b) return null;
    const t = Math.round(metresBetween(a, b) * 1.5 / 8 + 40);
    return { priority: 2, from: "Courier desk", icon: "car", text: `Pick up a parcel at ${a.name} (${a.what}) and bring it to ${b.name}.`,
      mission: { id: "demo-delivery", title: `Parcel: ${a.name} to ${b.name}`, giver: { name: "Courier desk", icon: "car" },
        steps: [
          { type: "stay", target: a.id, radius: 18, seconds: 2, maxSpeed: 8, text: `Stop at ${a.name}` },
          { type: "reach", target: b.id, radius: 18, maxSpeed: 15, time: t, text: `Deliver to ${b.name}`, radio: { text: `Got it. ${t} s to ${b.name}.` } },
        ], reward: { score: 80, money: 35, rep: 1 } } };
  },
  // check on a landmark / park: stay there a moment
  (kit, rng) => {
    const p = kit.places.pick({ kinds: ["landmark", "area", "place"], near: kit.player, min: 250, max: 1500, filter: (q) => q.kind !== "wood" || (q.area || 0) < 400000, rng });
    if (!p) return null;
    return { priority: 3, from: "Dispatch", text: `Someone reported a problem near ${p.name}. Go and have a look.`,
      mission: { id: "demo-check", title: `Check on ${p.name}`, steps: [
        { type: "reach", target: p.id, radius: 35, text: "Go to {target}" },
        { type: "stay", target: p.id, radius: 40, seconds: 6, maxSpeed: 10, text: "Look around {target}" },
      ], reward: { score: 50, money: 15, rep: 1 } } };
  },
  // meet a contact at a tram stop: E to talk
  (kit, rng) => {
    const s = kit.places.pick({ kinds: ["stop"], near: kit.player, min: 200, max: 1800, rng });
    if (!s) return null;
    return { priority: 2, from: "Dispatch", text: `A witness waits at ${s.name}. Go and talk to them.`,
      mission: { id: "demo-witness", title: `Witness at ${s.name}`, steps: [
        { type: "interact", target: s.id, radius: 14, prompt: "Talk to the witness", text: "Meet the witness at {target}", time: 240 },
        { type: "wait", seconds: 3, text: "Taking the statement…", radio: { from: "Witness", icon: "person", text: "It went towards the church, fast. A dark car, I think." } },
      ], reward: { score: 60, money: 20, rep: 1 } } };
  },
  // tail a car / stop a car (traffic entities)
  (kit, rng) => rng() < 0.5
    ? { priority: 1, from: "Dispatch", text: "A car near you matches a stolen vehicle. Tail it.", mission: { ...DEMO_MISSIONS.tail, brief: null } }
    : { priority: 1, from: "Dispatch", text: "Stop the car ahead: get right behind it and stay there for 2 seconds.",
      mission: { id: "demo-stop", title: "Pull it over", steps: [{ type: "catch", target: "@car", entity: { id: "car", kind: "trafficCar", min: 15, max: 160 }, radius: 9, hold: 2, lose: 260, time: 120, text: "Catch the {entity}" }],
        reward: { score: 120, money: 50, rep: 2 } } },
];

export const DEMO_GAME = {
  id: "demo", title: "Kit demo", icon: "demo",
  tagline: "Two short jobs and random radio calls in the real streets, to try the game kit before the police and falcon games.",
  modes: [{ id: "missions", label: "Missions", desc: "a timed drive, a tail, then calls", primary: true }, { id: "free", label: "Free play", desc: "just drive, no mission" }],
  options: [{ id: "calls", label: "Radio calls in free play", default: true }],
  idleText: { missions: "Wait for the radio.", free: "Free play. Drive anywhere; accept a radio call when you feel like it." },
  keys: { default: "<kbd>W A S D</kbd> drive · <kbd>Y</kbd> / <kbd>X</kbd> accept / ignore a call · <kbd>Esc</kbd> pause · <kbd>M</kbd> map · <kbd>`</kbd> dev tools" },
  async start(kit, { mode, options }) {
    if (mode === "missions") {
      kit.startMission(DEMO_MISSIONS.rush);
    } else {
      await kit.spawnPlayer({ at: "stjob-street", mode: "drive", face: "stjob" });
      kit.radio("Dispatch", options.calls ? "Free play. Calls will come in now and then: Y to take one, X to let it go." : "Free play, radio quiet. Enjoy the drive.");
      if (options.calls) kit.dispatch.setGenerator({ first: [12, 20], every: [40, 80], make: (k, rng) => pickTemplate(k, rng) });
    }
  },
  onMissionEnd(kit, r) {
    if (kit.current.mode !== "missions") return;
    if (r.def.id === "demo-rush" && r.result.ok) kit.dispatch.push({ priority: 1, from: "Dispatch", text: "Good work. Now a car near you matches a stolen one: tail it.", mission: { ...DEMO_MISSIONS.tail, brief: null }, expires: 30 });
    else if (!kit.dispatch.gen) kit.dispatch.setGenerator({ first: [8, 12], every: [35, 70], make: (k, rng) => pickTemplate(k, rng) });
  },
};
function pickTemplate(kit, rng) {
  for (let k = 0; k < 4; k++) { const c = TEMPLATES[Math.floor(rng() * TEMPLATES.length)](kit, rng); if (c) return c; }
  return null;
}

/** the next games: listed in the start menu, their jobs replace these entries (register the same id) */
export const COMING = [
  { id: "police", title: "Police", icon: "police", comingSoon: true,
    tagline: "Unmarked car out of the Rue Rouge station. Radio dispatch: cars on the tram line, speed checks, accidents, chases.",
    modes: [{ id: "missions", label: "Missions", desc: "the dispatch's jobs", primary: true }, { id: "free", label: "Free patrol", desc: "lights + siren, no mission" }],
    options: [{ id: "calls", label: "Dispatch calls in free patrol", default: true }] },
  { id: "falcon", title: "Falcon", icon: "falcon", comingSoon: true,
    tagline: "The Saint-Job peregrines: stoop on pigeons, feed the eyases before they starve.",
    modes: [{ id: "missions", label: "Missions", desc: "hunting, feeding", primary: true }, { id: "free", label: "Free flight", desc: "fly over Uccle" }] },
];
