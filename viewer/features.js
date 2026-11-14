// THE URL SWITCHES: one table of every ?key= the viewer reads (found by grepping viewer/ for params.get / qs.get /
// qp.get / P.get / URLSearchParams(location.search).get and /[?&]key=/.test(location.search), 2026-11-14; see
// docs/DEVPANEL.md). The dev panel (viewer/devPanel.js) shows each one as a toggle / select / field in its section;
// it does NOT change what a switch does: the code that reads it stays where it is. When you add a ?switch, add a row.
//
// Row fields:
//   key     the URL parameter                     group  the dev panel section it shows in (SECTIONS below)
//   label   short name                            desc   what it does (the tooltip, and what the search finds)
//   type    "on"     default ON, `off` (default "0") turns it off        (a toggle, checked = on)
//           "opt"    default OFF, `on` (default "1") turns it on         (a toggle)
//           "old"    an A/B: `value` (default "old") = the version before (a toggle, checked = the old one)
//           "select" `options`: [[urlValue | null, label], ...], null = the default (key absent)
//           "number" `def`, `min`, `max`, `step`  (the key absent = def)
//           "text"   free text (`placeholder`)
//   live    the name of the panel control that changes it WITHOUT a reload (the panel mirrors it into the URL);
//           absent = the switch is read once at boot: the panel stages it and "Apply & reload" rewrites the URL.
//   ui      false: listed here, not shown as a switch (navigation keys the Go to section / the share link write)
//   sub     a sub-heading inside the section

const on = (key, group, label, desc, x = {}) => ({ key, group, label, desc, type: "on", off: "0", ...x });
const opt = (key, group, label, desc, x = {}) => ({ key, group, label, desc, type: "opt", on: "1", ...x });
const old = (key, group, label, desc, x = {}) => ({ key, group, label, desc, type: "old", value: "old", ...x });
const sel = (key, group, label, desc, options, x = {}) => ({ key, group, label, desc, type: "select", options, ...x });
const num = (key, group, label, desc, def, min, max, step, x = {}) => ({ key, group, label, desc, type: "number", def, min, max, step, ...x });
const txt = (key, group, label, desc, placeholder = "", x = {}) => ({ key, group, label, desc, type: "text", placeholder, ...x });

/** section ids (devPanel.js) -> what the switches there are about */
export const SECTIONS = {
  nav: "Go to & share", modes: "Modes & camera", time: "Time & sun", weather: "Weather", night: "Night", transit: "Traffic, trams & trains",
  lighting: "Lighting & post", world: "World layers", ab: "A/B: old versions", streaming: "Streaming & boot", perf: "Performance", debug: "Debug & audits",
};

export const FEATURES = [
  // ---------------------------------------------------------------- navigation (written by Go to / the share link)
  txt("tile", "nav", "start tile", "The tile the city boots on (I6 = Saint-Job). NB: ?tile=H6 at boot crashes (known bug, TODO.md).", "I6", { ui: false }),
  sel("view", "nav", "start view", "The first view / mode: overview, stjob (close-up / ?at / ?cam), walk, fly, drive, third.",
    [[null, "overview"], ["stjob", "close-up"], ["walk", "walk"], ["fly", "fly"], ["drive", "drive"], ["third", "third person"]], { ui: false }),
  txt("at", "nav", "at x,z", "Close-up target / walk / drive start, city metres (x east, z south).", "1153,540", { ui: false }),
  txt("cam", "nav", "camera x,z,h", "Close-up camera position: x, z and height above the ground (m).", "1223,650,45", { ui: false }),
  num("yaw", "nav", "walk facing (°)", "Walk mode's facing at the start: 0 = -z (north-ish), 90 = -x.", 0, 0, 360, 1, { ui: false }),
  txt("dev", "nav", "dev panel state", "A shared panel state (base64 JSON, 'copy link + panel settings'); dropped from the URL once applied.", "", { ui: false }),
  on("panel", "nav", "dev panel", "?panel=0: no dev panel, the old HUD only.", { ui: false }),

  // ---------------------------------------------------------------- modes & camera (live ones are the section's own controls)
  txt("car", "modes", "car (drive)", "The drive mode's car: scripted or faceted:<id>.", "faceted:hatch_c", { live: "car (drive)" }),
  txt("char", "modes", "character", "Third person character: hoodie, casual, capsule.", "hoodie", { live: "character (3rd person)" }),
  opt("drivedebug", "modes", "car colliders", "Draw the drive colliders (key G in drive mode).", { live: "car colliders (G)" }),
  opt("chardebug", "modes", "character colliders", "Draw the third-person collision world (key G).", { live: "character colliders (G)" }),
  opt("invert", "modes", "invert falcon pitch", "Falcon flight: inverted pitch on the mouse / keys.", { sub: "Falcon flight" }),
  opt("touch", "modes", "touch controls", "Falcon flight: the on-screen touch controls on a desktop too.", { sub: "Falcon flight" }),
  num("falconsize", "modes", "falcon size", "Falcon flight: the player's size factor.", 2.0, 0.5, 6, 0.1, { sub: "Falcon flight" }),
  num("pigeons", "modes", "pigeons (flocks)", "Falcon flight: number of flying pigeons.", 150, 0, 600, 10, { sub: "Falcon flight" }),
  num("pigeons2", "modes", "pigeons (roosts)", "Falcon flight: pigeons sitting on roosts (capped at 60 % of the roosts).", 75, 0, 300, 5, { sub: "Falcon flight" }),
  on("squares", "modes", "game squares", "Falcon flight: the game's target squares.", { sub: "Falcon flight" }),
  on("highfog", "modes", "high fog", "Falcon flight: fog density rising with altitude.", { sub: "Falcon flight" }),
  sel("flystart", "modes", "fly start", "Falcon flight start: from the nest (default) or the old spire start.", [[null, "nest"], ["spire", "spire (old)"]], { sub: "Falcon flight" }),
  txt("bird", "modes", "bird model URL", "A different bird glTF for the flyer (no config).", "models/bird/…glb", { sub: "Falcon flight" }),
  txt("birdfwd", "modes", "bird forward axis", "The bird model's forward axis (with ?bird=).", "-z", { sub: "Falcon flight" }),
  num("birdscale", "modes", "bird scale", "The flyer model's scale.", 0.42, 0.05, 3, 0.01, { sub: "Falcon flight" }),
  sel("birdskin", "modes", "bird skin", "The juvenile player skin (default) or the adult one.", [[null, "juvenile"], ["adult", "adult"]], { sub: "Falcon flight" }),
  opt("birdlayers", "modes", "bird rig layers", "Calibrate the bird rig's fold / brake layers (debug).", { sub: "Falcon flight" }),
  sel("maplang", "modes", "map language", "The minimap / full map's street names.", [[null, "French"], ["nl", "Dutch"]], { sub: "Map" }),

  // ---------------------------------------------------------------- time & sun
  sel("time", "time", "look preset", "Time-of-day look preset.", [[null, "golden"], ["midday", "midday"], ["overcast", "overcast"], ["twilight", "twilight"], ["night", "night"], ["misty", "misty"]], { live: "preset" }),
  num("hour", "time", "solar hour", "Solar time override (h).", 18, 0, 24, 0.01, { live: "solar time (h)" }),
  num("day", "time", "day of year", "Day of the year (200 = mid July); also the SNCB timetable day type.", 200, 1, 365, 1, { live: "day of year" }),

  // ---------------------------------------------------------------- weather
  opt("vfog", "weather", "volumetric fog", "Volumetric valley fog (opt-in).", { live: "volumetric valley fog" }),
  sel("wx", "weather", "weather", "The weather at start (viewer/weather/cityWeather.js): rain, snow, fog... (clear = the city as before); 'live' = Uccle now (Open-Meteo).",
    [[null, "clear"], ["overcast", "overcast"], ["drizzle", "drizzle"], ["rain", "rain"], ["storm", "storm"], ["snowfall", "snowfall"], ["snow_cover", "snow cover"], ["fog", "fog"], ["live", "live (Open-Meteo)"]], { live: "weather" }),
  old("weather", "weather", "no weather system", "?weather=old: the city before the weather hookup (no wet / snow layer in the materials, no rain, no overhead bake)."),
  num("wxmap", "weather", "weather window (m)", "Size of the overhead map + volumetric snow window round the camera (512 cells; 64 m = 12.5 cm cells).", 64, 32, 128, 16),
  txt("wind", "weather", "wind (flags / falcon)", "Flags: 'speed,deg' (default 5,70); the falcon flight reads the speed (default 4).", "5,70"),
  num("windfrom", "weather", "falcon wind from (°)", "Falcon flight: the wind's direction.", 240, 0, 360, 5),

  // ---------------------------------------------------------------- night (docs/NIGHT_HOOKUP.md)
  opt("night", "night", "night lights", "The clustered night lights: lamp pools, shadowed lamps, car lights, shop windows, glare (boot flag)."),
  on("nightpool", "night", "lamp light pool", "?night=1: the lamp pool lights."),
  on("nightglare", "night", "glare cards", "?night=1: the lamp glare cards."),
  sel("nightshadow", "night", "lamp shadows", "?night=1: lamp shadow maps re-rendered only when something moves (smart) or every frame (full, round 1).", [[null, "smart"], ["full", "full (round 1)"]]),
  num("nightev", "night", "night look EV", "The night look's exposure.", 0.6, 0, 3, 0.1),
  opt("nightdebug", "night", "night pop metrics", "?night=1: per lamp / per car weight jump metrics (CPU).", { sub: "Debug" }),

  // ---------------------------------------------------------------- traffic, trams & trains
  on("traffic", "transit", "moving traffic", "Cars driving on the lane graph."),
  sel("cars", "transit", "parked cars", "Parked cars: the faceted fleet (default) or the old boxes.", [[null, "faceted fleet"], ["box", "boxes (old)"]]),
  on("trams", "transit", "trams", "STIB line 92 on its timetable.", { sub: "Trams & trains" }),
  sel("tram", "transit", "tram model", "The tram look.", [[null, "T3000 v2"], ["v1", "T3000 v1"], ["box", "boxes"]], { sub: "Trams & trains" }),
  on("trackprofile", "transit", "track profile", "The tram tracks' smooth rail-top profile (rails, wire, deck, trams).", { sub: "Trams & trains" }),
  on("trains", "transit", "trains + railway", "SNCB trains, track, fences, bridges.", { sub: "Trams & trains" }),
  on("bridges2", "transit", "round-2 bridges", "The six round-2 hero railway bridges (docs/trains/BRIDGES_ROUND2.md).", { sub: "Trams & trains" }),
  on("tunnels", "transit", "road tunnels", "Road tunnels under the embankments (docs/trains/TUNNELS.md).", { sub: "Trams & trains" }),
  txt("clock", "transit", "timetable clock", "Trams / trains clock HH:MM (absent = now).", "08:30", { live: "timetable clock (h)" }),
  num("timescale", "transit", "timetable speed", "Trams / trains clock speed (x real).", 1, 0, 60, 0.5, { live: "timetable speed (x real)" }),
  opt("trafficdebug", "transit", "lane graph", "Draw the traffic lane graph.", { sub: "Debug" }),

  // ---------------------------------------------------------------- lighting & post
  on("fx", "lighting", "post effects", "AO + reflections + bloom + grade (off: plain render, slow machines)."),
  on("ao", "lighting", "AO pass", "Ambient occlusion in the post pipeline (A/B)."),
  on("ssr", "lighting", "SSR pass", "Screen-space reflections in the post pipeline (A/B)."),
  on("haze", "lighting", "sky haze + shafts", "Firmament haze and sun shafts.", { live: "sky haze + sun shafts" }),
  opt("sunlight", "lighting", "cascaded sun", "Cascaded sun light: acts with ?sky=old only (Firmament keeps one shadow map)."),
  on("lampmodel", "lighting", "Blender lamps", "The Blender lamp model (off: the old cylinders).", { sub: "Lamps" }),
  on("lamppools", "lighting", "lamp light pools", "The street lamps' light pools on the ground.", { sub: "Lamps" }),
  on("lamplights", "lighting", "near lamp lights", "The few real lights for the nearest lamps.", { sub: "Lamps" }),

  // ---------------------------------------------------------------- world layers: landmarks, city systems, trees
  on("stjob", "world", "Saint-Job church", "The scripted church (+ its colliders); off: the UrbIS block.", { sub: "Landmarks" }),
  on("townhall", "world", "town hall", "Maison communale (Place Jean Vander Elst).", { sub: "Landmarks" }),
  on("flags", "world", "town hall flags", "The flags on the town hall (needs the town hall).", { sub: "Landmarks" }),
  on("observatory", "world", "Observatory", "Observatoire royal.", { sub: "Landmarks" }),
  on("wolvendael", "world", "Wolvendael château", "Château + pond.", { sub: "Landmarks" }),
  on("police", "world", "police station", "Police station (+ yard).", { sub: "Landmarks" }),
  on("stpierre", "world", "Saint-Pierre church", "Église Saint-Pierre.", { sub: "Landmarks" }),
  on("russian", "world", "Russian church", "Église orthodoxe russe Saint-Job.", { sub: "Landmarks" }),
  on("rosaire", "world", "Notre-Dame du Rosaire", "Église Notre-Dame du Rosaire.", { sub: "Landmarks" }),
  on("augustin", "world", "Saint-Augustin", "Église Saint-Augustin.", { sub: "Landmarks" }),
  on("stalle", "world", "Stalle chapel", "Chapelle de Stalle (+ interior).", { sub: "Landmarks" }),
  on("vanbuuren", "world", "van Buuren house", "Musée van Buuren.", { sub: "Landmarks" }),
  on("calevoet", "world", "Calevoet station", "Uccle-Calevoet station.", { sub: "Landmarks" }),
  on("falcons", "world", "falcons", "The Saint-Job peregrine family (+ the flight start from the nest).", { sub: "Landmarks" }),
  sel("herostatue", "world", "Héros statue", "The statue slot: the dropped-in model (default) or our scripted bronze.", [[null, "slot model"], ["ours", "ours (scripted)"]], { sub: "Landmarks" }),
  sel("heroslawn", "world", "Héros lawn", "The square's lighter lawn (default) or the city's lawn.", [[null, "square lawn"], ["city", "city lawn"]], { sub: "Landmarks" }),
  sel("roads", "world", "road surfaces", "Measured UrbIS street surfaces (default) or the road engine's guessed carriageways.", [[null, "measured"], ["engine", "road engine"]], { sub: "City" }),
  on("kit", "world", "façade kit", "Instanced façade details (windows, doors...).", { sub: "City" }),
  on("streetlife", "world", "street life", "Shopfronts, names, house numbers.", { sub: "City" }),
  on("gardens", "world", "front gardens", "Front gardens' instance pools.", { sub: "City" }),
  on("gardenhedges", "world", "garden hedges", "Hedges behind garden railings.", { sub: "City" }),
  opt("grass", "world", "city grass", "The grass field (owner's look pending; ~0 ms measured).", { sub: "City" }),
  sel("grasspreset", "world", "grass preset", "Grass density preset (with ?grass=1).", [[null, "high"], ["medium", "medium"], ["low", "low"]], { sub: "City" }),
  opt("grasscov", "world", "grass coverage view", "Grass: the coverage debug colours.", { sub: "City" }),
  opt("grasslambert", "world", "grass Lambert", "Grass: the cheap Lambert shading (always on low / medium).", { sub: "City" }),
  on("pits", "world", "tree pits", "Tree pits in the sidewalks.", { sub: "City" }),
  opt("horizon", "world", "horizon ring", "The 32 km landscape round Uccle (+1.3 ms from 500 m).", { sub: "City" }),
  opt("interior", "world", "interior pilot", "The pilot interior cell (house cut).", { sub: "City" }),
  on("map", "world", "minimap", "The minimap + full map (M).", { sub: "City" }),
  sel("trees", "world", "trees", "Tree system: stylized (default), slop-newyork's, or the first leaf cards.", [[null, "stylized"], ["slop", "slop"], ["simple", "simple"]], { sub: "Trees" }),
  on("impostors", "world", "tree impostors", "Far tree impostors.", { sub: "Trees" }),
  on("impkit", "world", "impostor kit", "The impostor kit for far trees (off: the old impostors).", { sub: "Trees" }),
  num("treeshadow", "world", "tree shadow LODs", "Highest tree LOD that casts shadows (0 = LOD 0 only, 2 = all).", 1, 0, 2, 1, { sub: "Trees" }),
  opt("impshadow", "world", "impostor shadows", "Impostors cast shadows (beyond the trees' shadow range).", { sub: "Trees" }),
  opt("cardoct", "world", "octahedral cards", "Stylized trees: octahedral leaf cards.", { sub: "Trees" }),
  sel("detail", "world", "park rock detail", "Close-up rock detail: the CC0 scanned normal map or the procedural bump.", [[null, "scan"], ["noise", "noise"]], { sub: "Materials" }),
  txt("libmat", "world", "material library", "Material library consumers: 0 = off, list = only these, -x = all but x.", "1", { sub: "Materials" }),
  sel("scans", "world", "scan format", "Scanned material textures' format.", [[null, "ktx2"], ["webp", "webp"]], { sub: "Materials" }),
  on("groundtex", "world", "ground textures", "Textured ground (off: procedural).", { sub: "Materials" }),
  on("shopsktx", "world", "shop KTX2", "Shop window textures as KTX2 (off: the plain images).", { sub: "Materials" }),
  sel("setts", "world", "plaza setts", "Plaza setts: procedural (default) or the CC0 scan (A/B).", [[null, "procedural"], ["tex", "scan"]], { sub: "Materials" }),

  // ---------------------------------------------------------------- A/B: the versions before (each ?x=old / ?x=0 kept for comparisons)
  old("heros", "ab", "Square des Héros", "The square before: one raised setts plaza, no memorial.", { sub: "Places & assets" }),
  old("roofs", "ab", "roofs", "Roof tops before (docs/assets/ROOFS.md).", { sub: "Places & assets" }),
  old("streetkit", "ab", "street kit", "Road signs, plate posts, Villo before.", { sub: "Places & assets" }),
  old("stops", "ab", "STIB stops", "The stops kit before.", { sub: "Places & assets" }),
  old("furniture", "ab", "street furniture", "Furniture kit 2 off (the old bubbles).", { sub: "Places & assets" }),
  old("fuel", "ab", "petrol stations", "Petrol stations before.", { sub: "Places & assets" }),
  old("shops", "ab", "shopfronts", "Shopfronts before.", { sub: "Places & assets" }),
  old("paving", "ab", "paving", "Sidewalk paving before.", { sub: "Places & assets" }),
  old("groundfit", "ab", "ground fit", "Façades' ground-floor line before (docs/GROUND_FIT.md).", { sub: "Places & assets" }),
  old("sky", "ab", "old sky", "The sky before Firmament.", { sub: "Look" }),
  old("skyground", "ab", "sky ground albedo", "Firmament's ground albedo before.", { sub: "Look" }),
  old("vfix2", "ab", "visual fixes 2", "Façades / car packs / trains / ponds before visual fixes round 2.", { sub: "Look" }),
  sel("paint", "ab", "road markings", "Road markings: current or the road engine's own (v1 / v2).", [[null, "current"], ["v1", "v1"], ["v2", "v2"]], { sub: "Look" }),
  sel("relief", "ab", "façade relief", "Façade relief offset: 3 px (current) or 1 px (before).", [[null, "3 px"], ["1px", "1 px (old)"]], { sub: "Look" }),
  sel("bldside", "ab", "façade sides", "Façades one-sided (current) or double-sided.", [[null, "front"], ["double", "double"]], { sub: "Look" }),
  opt("aawire", "ab", "tram wire (old)", "The tram wire without its anti-aliasing (?aawire=0).", { on: "0", sub: "Look" }),
  opt("bandaa", "ab", "Saint-Job band (old)", "The church's stone band without the filtered pulse (?bandaa=0).", { on: "0", sub: "Look" }),
  old("falcon", "ab", "falcon flight", "The falcon flight before (old flyer).", { sub: "Modes" }),
  opt("colfix", "ab", "colliders before audit", "Colliders as before the collisions audit (?colfix=0).", { on: "0", sub: "Collisions & roads" }),
  sel("drivecol", "ab", "drive colliders", "Drive colliders: current or legacy (before the audit).", [[null, "current"], ["legacy", "legacy"]], { sub: "Collisions & roads" }),
  opt("railcar", "ab", "rail/car fix off", "The rail vs car fix off (?railcar=0).", { on: "0", sub: "Collisions & roads" }),
  opt("padroads", "ab", "road pads off", "Road pads off (?padroads=0).", { on: "0", sub: "Collisions & roads" }),
  opt("roughlanes", "ab", "rough junctions", "Rough junctions left up (?roughlanes=0, ROAD_FIX2).", { on: "0", sub: "Collisions & roads" }),
  opt("abutments", "ab", "deck abutments off", "OSM deck ends on the bare DTM (?abutments=0).", { on: "0", sub: "Collisions & roads" }),
  opt("underpasslevel", "ab", "underpass level off", "The street riding the underpass banks (?underpasslevel=0).", { on: "0", sub: "Collisions & roads" }),

  // ---------------------------------------------------------------- streaming & boot
  num("ring", "streaming", "full-detail ring", "Full tiles within this ring of the tile under the player (0-2).", 1, 0, 2, 1),
  num("far", "streaming", "far LOD ring", "Far-LOD tiles out to this ring (0 = none, max 6).", 3, 0, 6, 1),
  on("smooth", "streaming", "smooth LOD", "Every smooth-LOD change (fades, morphs, shadow fade); off = before.", { sub: "LOD" }),
  num("tilefade", "streaming", "tile cross-fade (s)", "Streamed tiles cross-fade time (0 = instant swaps).", 0.9, 0, 3, 0.05, { live: "tile cross-fade (s)" }),
  num("impstart", "streaming", "impostors start (m)", "LOD 2 -> impostors distance.", 400, 150, 900, 5, { live: "LOD 2 → impostors (m)" }),
  num("impband", "streaming", "impostor band (m)", "Impostor cross-fade band.", 50, 0, 150, 1, { live: "  cross-fade band (m)" }),
  num("impend", "streaming", "impostors end (m)", "Impostors end distance.", 1100, 800, 3000, 10, { live: "impostors end (m)" }),
  num("treeshadowend", "streaming", "tree shadows end (m)", "Tree shadows fade out by this distance.", 120, 40, 400, 5, { live: "tree shadows end (m)" }),
  on("implate", "streaming", "late impostors", "Impostors built late (after the tiles).", { sub: "LOD" }),
  on("prepass", "streaming", "tree depth pre-pass", "Stylized trees' depth pre-pass (A/B).", { sub: "LOD" }),
  on("impprepass", "streaming", "impostor pre-pass", "Impostors' depth pre-pass (A/B).", { sub: "LOD" }),
  on("worker", "streaming", "tile worker", "Tiles built in a worker (off: main thread).", { sub: "Boot & loading" }),
  num("workers", "streaming", "tile workers", "Worker pool size (capped at cores - 2).", 1, 1, 6, 1, { sub: "Boot & loading" }),
  on("liteworker", "streaming", "far tiles in worker", "Far tiles built in the worker.", { sub: "Boot & loading" }),
  opt("tilecache", "streaming", "tile cache", "Built tiles kept in IndexedDB (opt-in until measured).", { sub: "Boot & loading" }),
  on("warmup", "streaming", "boot warm-up", "Every pipeline compiled under the cover (off: old boot, A/B).", { sub: "Boot & loading" }),
  on("precompile", "streaming", "precompile", "Streamed objects' shaders compiled before they show (A/B).", { sub: "Boot & loading" }),
  on("early", "streaming", "early pipeline", "The render pipeline set up before the first tile.", { sub: "Boot & loading" }),
  old("bootorder", "streaming", "old boot order", "The boot order before (A/B).", { sub: "Boot & loading" }),
  on("bootlite", "streaming", "boot far ring", "The start tile's ring as far tiles under the cover (off: before).", { sub: "Boot & loading" }),
  opt("earlyshow", "streaming", "early show", "Far tiles after the cover lifts (sooner reveal, stutters; not kept).", { sub: "Boot & loading" }),
  sel("bootprefetch", "streaming", "boot prefetch", "Boot ring prefetch: default, 0 = off, 1 = the extra prefetch (no gain measured).", [[null, "default"], ["0", "off"], ["1", "extra"]], { sub: "Boot & loading" }),
  on("loader", "streaming", "loading scene", "The aerial loading flight (worker canvas).", { sub: "Boot & loading" }),
  num("loaderhold", "streaming", "loader hold (s)", "Keep the loading scene this much longer (hand-over checks).", 0, 0, 10, 0.5, { sub: "Boot & loading" }),

  // ---------------------------------------------------------------- performance
  on("gpu", "perf", "GPU timing", "GPU ms per frame (timestamp queries)."),
  on("shadowshare", "perf", "shared shadow shaders", "One shadow shader per vertex code (off: three's own)."),
  on("rdepth", "perf", "reversed depth", "Reversed depth buffer."),

  // ---------------------------------------------------------------- debug
  opt("log", "debug", "dev log open", "The HUD's log open at boot (?log=1); closed by default (?log=0 still closes it).", { live: "dev log" }),
  opt("falcondebug", "debug", "falcon debug", "Falcon flight debug lines (key G)."),
  opt("mapprof", "debug", "map profile", "Minimap draw timings in the console."),
];

/** the row for a key */
export const feature = (key) => FEATURES.find((f) => f.key === key);

/** the switch's state from a URLSearchParams: boolean (on / opt / old), the URL value or null (select / text), a number */
export function readSwitch(f, q) {
  const v = q.get(f.key);
  if (f.type === "on") return v !== (f.off ?? "0");
  if (f.type === "opt") return v === (f.on ?? "1");
  if (f.type === "old") return v === (f.value ?? "old");
  if (f.type === "number") return v == null || v === "" || Number.isNaN(+v) ? f.def : +v;
  return v;
}
/** write a state back (the default removes the key, so URLs stay short) */
export function writeSwitch(f, q, s) {
  const put = (v) => (v == null || v === "" ? q.delete(f.key) : q.set(f.key, v));
  if (f.type === "on") put(s ? null : f.off ?? "0");
  else if (f.type === "opt") put(s ? f.on ?? "1" : null);
  else if (f.type === "old") put(s ? f.value ?? "old" : null);
  else if (f.type === "number") put(+s === f.def ? null : String(s));
  else put(s);
}
/** is the key at a non-default value in q? */
export const isSet = (f, q) => q.has(f.key) && (() => { const t = new URLSearchParams(); writeSwitch(f, t, readSwitch(f, q)); return t.has(f.key); })();
