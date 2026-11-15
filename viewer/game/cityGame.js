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
  const kit = new GameKit(host);
  window.__game = kit;
  kit.register(DEMO_GAME);
  for (const g of COMING) kit.register(g);
  // the police game (viewer/police/, docs/POLICE_GAME.md) replaces its "coming soon" entry (same id, registered after)
  try { const { POLICE_GAME } = await import("../police/policeGame.js"); kit.register(POLICE_GAME); } catch (e) { host.log(`police game: ${e.message}`); console.error(e); }
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
  // after the cover: compile the marker's pipelines, then the menu (or a ?game= start)
  for (let i = 0; i < 1200 && document.body.classList.contains("loading"); i++) await new Promise((r) => setTimeout(r, 100));
  await kit.waypoint.compile(host.camera);
  const p = host.params, g = p.get("game");
  if (g && g !== "1" && kit.games.has(g)) {
    for (let i = 0; i < 100 && !host.getMap(); i++) await new Promise((r) => setTimeout(r, 100));
    kit.startGame(g, p.get("gmode") || "missions");
  } else if (p.get("gamemenu") !== "0" && !p.get("view") && !p.get("dev")) kit.startMenu();
  host.log("game kit: ready (P = games menu; docs/GAMEKIT.md)");
  return kit;
}
