# The dev panel (branch claude/devpanel, 2026-11-14)

The owner's and the coordinator's panel (not a player UI): `viewer/devPanel.js` on our own UI kit `viewer/panelUI.js`
(never lil-gui). Docked top right, 340 px; the HUD top left (`viewer/devHud.js`). Images: `docs/devpanel/`
(`before_*` = the panel before this branch).

## What is where

| Section | Live controls | URL switches (features.js group) |
|---|---|---|
| Go to & share | named places (`viewer/places.js`), "here" (tile, x, z), go to x, z; copy link to this view, copy link + panel settings | – (writes `tile`, `view`, `at`, `cam`, `dev`) |
| Modes & camera | overview / close-up / walk / fly / drive / third person, car, character, colliders, foot IK, field of view, photo mode | `modes` (falcon flight, map language) |
| Time & sun | preset, solar time, day, sun speed | `time` (all live) |
| Sky & clouds | Firmament | – |
| Weather | volumetric fog | `weather` |
| Night | – | `night` (?night=1 and its options) |
| Traffic, trams & trains | timetable clock / speed | `transit` |
| Lighting & post | lamp pools, haze, AO, SSR, bloom, sun shadows | `lighting` |
| World layers | layers, contours, parked cars | `world` (landmarks, city systems, trees, materials) |
| A/B: old versions | – | `ab` (every ?x=old / ?x=0 "before") |
| Streaming & boot | tiles now | `streaming` (rings, LOD, workers, boot) |
| Smoothness (LOD tunables) | `viewer/smoothPanel.js` | – |
| Performance | fps, frame ms p50/p95, GPU ms p50/p95, draws, triangles, GPU memory, geometries / textures, shaders, JS heap, frame-time graph, tiles, character / car CPU; benchmark; GPU passes → log | `perf` |
| Debug & audits | wireframe, dev log, HUD; collider audit, URL switches → log | `debug` |

Header: mode · fps badge, theme (auto / light / dark, shared with the HUD), key help, close every section, collapse,
hide. Under it: the SEARCH box (every control by label, tooltip, URL key, section; accents ignored) and the chips of the
switches set in the URL now (click: search it, ×: back to the default, staged). Sections' open state, the collapsed
panel and the theme are remembered (localStorage, try/catch); the hidden panel is not (it would look lost).

Keys: **H** photo mode (all UI hidden, the data credits stay), **`** the panel, **/** search, **?** key help. The
existing keys (M map, G colliders, Esc, WASD...) are unchanged; fields in the panel stop the keys from reaching the city.

## URL switches: viewer/features.js

152 keys, found by grepping `viewer/` (no bundle) for `params.get` / `qs.get` / `qp.get` / `P.get` /
`URLSearchParams(location.search).get` / `.has` and `/[?&]key=/.test(location.search)` (plus `maplang`, `mapprof`).
Check that the table is complete after adding switches (node, from the repo root):

```
node -e "const fs=require('fs'),p=require('path');const k=new Set();const w=d=>{for(const f of fs.readdirSync(d)){const q=p.join(d,f);if(fs.statSync(q).isDirectory())w(q);else if(q.endsWith('.js')&&!q.includes('bundle'))for(const m of fs.readFileSync(q,'utf8').matchAll(/(?:\.(?:get|has)\(['\"]|\[\?&\])([a-z0-9_]+)/g))k.add(m[1]);}};w('viewer');import('./viewer/features.js').then(F=>{const r=new Set(F.FEATURES.map(f=>f.key));console.log('not in features.js:',[...k].filter(x=>!r.has(x)))})"
```
(it also lists a few Map keys that are not URL switches: check by eye.)

A row: `{ key, group, label, desc, type, ... }` with the helpers `on` (default on, `?key=0` off), `opt` (default off,
`?key=1` on), `old` (`?key=old` = the version before), `sel` (options), `num`, `txt`. `live: "<control label>"` = a
panel control changes it at once (the switch row is not drawn; the control gets the key chip and the search finds it);
`ui: false` = not shown (navigation keys); `sub` = a sub-heading. Everything else is read at boot: the panel STAGES the
change (amber row, count on the section, footer "n switches staged · Revert · Apply & reload"); Apply rewrites the URL
(the defaults removed, so URLs stay short) and reloads ON THE SAME VIEW (tile, mode, target and camera put into
`?tile ?view ?at ?cam`). The panel never changes what a switch does.

**Add a feature switch**: read it where it acts as before (`params.get("x")`), then add one row to `FEATURES` with the
section's group. Nothing else.

## Add a control

In `createDevPanel` (devPanel.js), in the section's block:
```js
fL.add(S, "exposure", -3, 3, 0.1).name("exposure").onChange((v) => { ... });          // slider
fL.add(obj, "flag").name("thing on").onChange(...);                                    // toggle
fL.add(obj, "mode", ["a", "b"]);  fL.text(obj, "xz", "x, z");  fL.buttons([["Go", fn, "tooltip"]], 2);
ctrl.hint("tooltip").keywords("words the search finds").listen();                     // listen: 10 Hz, only shown
setParam("key", value, defaultValue);                                                  // mirror a live setting into the URL
```

## Add a section (e.g. the Weather section of claude/weather-city)

```js
const fX = section("weather", "Weather");        // id (remembered state), title; section(id, title, true) = open by default
fX.add(...);                                     // its controls
switches(fX, "weather");                         // the features.js rows with that group (put new ?wx= keys there)
```
The Weather block already exists (`const fW = section("weather", "Weather")` with the fog controls, then
`switches(fW, "weather")`): the weather branch's `fW.add(...)` lines go between the fog lines and `switches(...)`;
a new URL key (e.g. `?wx=rain`) gets a row in features.js with `group: "weather"` (`live:` its control's label if the
section changes it live). Read-outs that change: `.listen()` (no own timers / rAF).

## Add a place (Go to)

One line in `viewer/places.js`: `{ id, name, group, tile, p: [x, h, z], t: [x, h, z], fov? }`, city metres, h = height
over the drawn ground (camera p, target t). Going there uses the map's teleport (main.js, now outside the `?map` block,
with `exact: true` to face the place): the tile streams in, the mode is kept (orbit: camera at p looking at t; walk /
drive / fly / third person: started at p facing t). The places came from the landmarks' placements, map.json (streets,
areas) and the docs' views (debug/herosViews.js, GRASS.md, landmark boot links).

## HUD top left (viewer/devHud.js, index.html)

Title + boot tile, the stats, the log. ▾ folds it to the title row (remembered). The log is CLOSED by default now
(`?log=1` opens it, `?log=0` still closes it), scrollable (max 260 px), with a line count, a filter box and a copy
button; `log()` appends to one text node (it used to re-join every line per message). `#log` keeps every line as plain
text (debug/libAB.js, tools/facadekit/bench.js read it). The stats are written only while the HUD is unfolded and shown.

## Cost (measured 2026-11-14, Place Saint-Job, 1400 x 850, 4 s windows; DOM mutations / s, rAF callbacks / s)

| State | before (old panel) | now |
|---|---|---|
| panel shown, default | 674 mutations, 946 rAF | 7.8 (3 panel + 4.8 HUD stats), 48 rAF (the main loop) |
| Performance section open | – | 23 (17.5 panel), 113 rAF (+1 sampler rAF per frame) |
| panel collapsed | – | 0 panel, 55 rAF |
| panel hidden (`) | – | 0 panel, 42 rAF |
| photo mode (H) | 706 mutations, 992 rAF | 0 mutations, 50 rAF |

The old panel ran one rAF per listened control forever (≈15) and wrote the DOM every frame even hidden. Now: one 4 Hz
timer (returns at once when hidden), a 10 Hz listen timer (open sections only, writes only on change), the frame
sampler only while Performance is open, the Smoothness read-outs (a walk over the trees) only while that section is open.
GPU numbers not compared (the machine was shared with another agent's city tab).

## Weak spots

- Go to: the teleport waits for the target tile only; the neighbours stream in after (a void around it for a few
  seconds, as with the map teleport). Aerial camera spots are mine (not checked against photos); street-level ones: Place
  Saint-Job, Héros steps, Calevoet, Fort-Jaco, Chaussée d'Alsemberg, the two grass views.
- A copied link's orbit target height is not in the URL (`?cam` + `?at` boot rule: 12 m up); "+ panel settings" (?dev=)
  restores the exact camera. `?tile=H6` at boot is a known crash: the link logs a warning.
- `?wind` is read as "speed,deg" by the flags and as a number by the falcon (`+"5,70"` = NaN): left as is, documented.
- The search hides headings while searching; sections show as matches with their chevron still "closed".
- The HUD's tile selector shows the boot tile, not the tile you are on (the panel's "here" does).
