# Quick test mode for agents (`?quick=1`)

Every check in the full city loads all of it: the boot cover (20-30 s), 2-3 GB of browser memory, the play loader,
landmarks km away, traffic, birds, weather, the start menu. Quick mode boots a small piece of the city round ONE spot,
places the camera exactly there and says when the view is built. It is for checks (does my change look right here, no
console errors); it is NOT for perf numbers of the real city (those: `docs/perf/PREFLIGHT.md`, `debug/perfRun.js`).

Without `?quick=1` nothing changes: everything is behind the flag (`viewer/quick.js` exports `QUICK = null`).

## The URL

| switch | what |
|---|---|
| `quick=1` | the mode |
| `place=<id>` | a named place of `viewer/places.js` (the dev panel's Go to list): the camera at its `p`, looking at its `t`, its `fov` |
| `at=x,z[,h]` | or: the camera at x, z (city metres: x east, z south), h m over the drawn ground (default 1.7, eye level) |
| `look=x,z[,h]` | ... looking at x, z, h over the ground (default 1.5 at street level, else 0); absent: 30 m north |
| `radius=<m>` | default 250: the tiles within that distance of the camera or the look point load in full (2-4 tiles); the landmarks, hero bridges and tunnels within it (+100 m) |
| `far=2` | a far ring round them after all (default: none) |
| `with=a,b` | optional systems kept: `traffic`, `birds`, `weather`, `night`, `trams`, `trains`, `falcons`, `map`, `panel`, `game` (all OFF otherwise) |
| `view=walk\|third\|drive\|fly` | start that mode at the camera spot instead of the orbit camera |
| `fov=<deg>`, `ready=<ms>` | the field of view; the ready check's time limit (default 90000) |

Any other switch works as usual and wins over quick mode's choices (`&traffic=1` keeps the traffic, `&police=0` leaves
the police station out even inside the radius). `wx=` implies `with=weather`; `time=night|twilight` or `hour=` imply
`with=night`.

What quick mode does (it rewrites the URL before any module reads it: the expanded switches are in the address bar):
`tile=` the spot's tile, `view=stjob&cam=..&at=..`, `ring=1&far=0` + the radius filter in the streaming (main.js
`stream`, `bootPrefetch`), `boothold=old` (no play loader), `game=0` (no game kit, no start menu), `loader` plain
(no stills), `traffic=0 birds=0 weather=old night=0 trams=0 falcons=0 map=0 panel=0`, no SNCB trains, every landmark
outside the radius off (`<name>=0`: its UrbIS solid; `heros=old`, `art=old` when no public-art piece is near),
`flags=0` without the town hall; hero bridges / tunnels outside the radius never load (`bootGate.js whenNeeded`).
The boot cover and its shader warm-up stay (they now cover 1 tile instead of the ring of 9 + the far ring).

## Ready signal

`window.__quickReady` appears when: every tile within the radius is in, no tile is fading, no compile job is left, no
pipeline is compiling async, every landmark / bridge expected inside the radius is in the scene, and 10 frames in a row
were so. Then the camera is put at the spot once more (its tiles' ground is in now).

```js
{ ms, ok, coverMs, waitMs, tiles: ["H5", "I5", "H6", "I6"], heapMB, landmarks: ["stjob"], bridges: [...], with: [], place,
  radius, frames, errors, stuck? }          // ms: since the navigation; ok false = the time limit (stuck: what was left)
```

`window.__quickErrors`: every `console.error`, uncaught exception and unhandled rejection since the boot.

## debug/quick.js (the page-side helper)

```js
const Q = await import("/debug/quick.js");
Q.url("observatory", { with: "traffic" });   // the URL
Q.go("police-yard");                          // navigate there (a fresh small boot); then:
await Q.waitReady();                          // polls every 5 s: { why: "ready" | "error" | "frozen" | "limit", ready, ... }
await Q.beat();                               // one heartbeat: frames since the last beat, fps, newErrors, frozen, heapMB
await Q.shot("snow2-stjob-street-after");     // HUD hidden, 30 settled frames: { name, file: "docs/snow2/shots/..png" }
Q.view({ at: [1102, 1.7, 542], look: [1175, 3, 540] });   // move the camera inside the loaded spot ([x, h, z])
```

Polling rule (memory "poll, don't wait blind"): from the agent side, call `Q.beat()` every 5-10 s; stop at once when
`newErrors` is not empty or `frozen` is true; give up at a hard limit. `Q.waitReady()` does exactly that inside the page
(if your evaluate call has a short timeout, use `beat()` from your own loop instead).

Shot names: `<topic>-<place>-<what>[-before|-after]`, lower case; files go to `docs/<topic>/shots/<name>.png`
(pass `file` to take_screenshot's filePath).

## URLs for common checks (server on 8829 as an example)

| check | URL |
|---|---|
| a street at Saint-Job | `http://localhost:8829/viewer/index.html?quick=1&place=stjob-street` |
| Saint-Job from above | `...?quick=1&place=stjob` |
| a landmark (the Observatory) | `...?quick=1&place=observatory` |
| the police yard | `...?quick=1&place=police-yard` |
| the falcon nest | `...?quick=1&place=stjob-nest&with=falcons` |
| night | `...?quick=1&place=stjob&time=night` (night lights on by `time=night`) |
| snow cover | `...?quick=1&place=stjob-street&wx=snow_cover` (snowfall: `wx=snowfall`) |
| traffic on a street | `...?quick=1&place=alsemberg&with=traffic` |
| third person on foot | `...?quick=1&place=stjob-street&view=third` |
| any spot | `...?quick=1&at=1102,542&look=1175,540&radius=300` |

Places: `viewer/places.js` (stjob, stjob-church, stjob-street, stjob-nest, heros, heros-steps, wolvendael, observatory,
townhall, stpierre, russian, police, police-yard, stalle, calevoet, papenkasteel, vanbuuren, rosaire, augustin, sacrecoeur,
saintmarc, latourdefrein, monolithes, evades, gobert, km5, fortjaco, alsemberg, wolvendael-park, grass-g7, grass-g9, ...).

## Limits

- Past the radius there is nothing (no far ring unless `&far=2`): look at the spot, not at the skyline.
- A landmark outside the radius (+100 m) shows as its UrbIS solid if its tile is loaded; moving the camera far
  streams tiles by the radius but no new landmarks: `Q.go()` (a new boot) for another place.
- Night (`night=0`) and weather (`weather=old`) off change the shaders' lighting model a little: for a night or
  weather check, ask for them (`time=night`, `wx=`).
- Not for perf or memory numbers of the real city.

## Measured

See the table at the end (filled in by the browser check).
