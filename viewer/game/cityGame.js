// THE GAME KIT'S CITY HOOKUP (docs/GAMEKIT.md): main.js calls startGameKit(host) after the minimap is set up
// (?game=0: never). It makes the kit, registers the games, fills the place catalogue (map + baked shops), compiles the
// waypoint's 2 pipelines, adds the "Play" button and opens the start menu once the boot cover has lifted.
//   ?game=0           pure free roam (no kit, no menu: the city as before)
//   ?game=<id>        start that game right after the boot (?gmode=missions | free, default missions)
//   ?gamemenu=0       no start menu at boot (the Play button / P still open it); a boot link with ?view= skips it too
// Games plug in by kit.register(def) (see demo.js); a game's own file can live anywhere (viewer/police/, viewer/falconFlight/).
import { GameKit } from "./kit.js";
import { DEMO_GAME, COMING } from "./demo.js";

export async function startGameKit(host) {
  const mk = (k) => (globalThis.__gameTimes ||= []).push([k, Math.round(performance.now() - (window.__coverAt || 0))]);   // (perfgame timing)
  mk("kit in");
  const kit = new GameKit(host);
  mk("kit made");
  window.__game = kit;
  kit.register(DEMO_GAME);
  for (const g of COMING) kit.register(g);
  // the police game (viewer/police/, docs/POLICE_GAME.md) and the falcon game (viewer/falconGame/, docs/FALCON_GAME.md)
  // replace their "coming soon" entries (same id, registered after). perfgame round 7 (?gamelazy=old: one after the
  // other, both before the start): both load at once and a ?game= start only waits for its own game (the falcon game's
  // code took 1.6 s of a police start); the start menu still waits for both
  const reg = (imp, key, name) => imp().then((m) => { kit.register(m[key]); mk(`${name} def`); }).catch((e) => { host.log(`${name} game: ${e.message}`); console.error(e); });
  const want = host.params.get("game");
  if (host.params.get("gamelazy") !== "old") {
    const pol = reg(() => import("../police/policeGame.js"), "POLICE_GAME", "police");
    const fal = reg(() => import("../falconGame/falconGameDef.js"), "FALCON_GAME", "falcon");
    await (want === "police" ? pol : want === "falcon" ? fal : Promise.all([pol, fal]));
  } else {
    await reg(() => import("../police/policeGame.js"), "POLICE_GAME", "police");
    await reg(() => import("../falconGame/falconGameDef.js"), "FALCON_GAME", "falcon");
  }
  // places: the baked shops now, the map's landmarks / parks / tram stops when its worker is ready
  kit.places.loadShops().then((n) => host.log(`game kit: ${n} places`)).catch(() => {});
  (async () => {
    for (let i = 0; i < 300 && !host.getMap(); i++) await new Promise((r) => setTimeout(r, 200));
    const map = host.getMap();
    if (!map) return;
    const info = await map.client.ready;
    kit.places.addMap({ ...info, landmarks: map.client.landmarks, stops: map.client.stops });
    kit.markers.attach(map);
  })();
  // the Play button (bottom right): the start menu in free roam
  const btn = document.createElement("button");
  btn.className = "gplay"; btn.textContent = "▶ Play"; btn.title = "Games (P)";
  btn.onclick = () => kit.startMenu();
  document.body.append(btn);
  (globalThis.__gameTimes ||= []).push(["kit setup done", Math.round(performance.now() - (window.__coverAt || 0))]);
  // after the cover: compile the marker's pipelines, then the menu (or a ?game= start)
  for (let i = 0; i < 1200 && document.body.classList.contains("loading"); i++) await new Promise((r) => setTimeout(r, 100));
  const T = (globalThis.__gameTimes ||= []), t0 = performance.now();
  T.push(["cover->kit", Math.round(t0 - (window.__coverAt || t0))]);
  await kit.waypoint.compile(host.camera);
  T.push(["waypoint", Math.round(performance.now() - t0)]);
  const p = host.params, g = p.get("game");
  if (g && g !== "1" && kit.games.has(g)) {
    const tm = performance.now();
    for (let i = 0; i < 100 && !host.getMap(); i++) await new Promise((r) => setTimeout(r, 100));
    T.push(["map wait", Math.round(performance.now() - tm)]);
    kit.startGame(g, p.get("gmode") || "missions");
  } else if (p.get("gamemenu") !== "0" && !p.get("view") && !p.get("dev")) kit.startMenu();
  host.log("game kit: ready (P = games menu; docs/GAMEKIT.md)");
  return kit;
}
