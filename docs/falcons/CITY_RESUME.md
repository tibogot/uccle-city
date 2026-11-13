# Falcon flight in the city: resume note (2026-11-12)

Branch `claude/falcon-city` (worktree `.claude/worktrees/falcon-city`), not pushed, not merged. Full write-up:
`docs/FALCON_FLIGHT.md` "In the city". Strips: `docs/falcons/city/`.

## State

- The city's fly mode IS the new flight (`viewer/falconFlight/cityFlyer.js`), `?falcon=old` = the old arcade flight.
- Streaming world adapter `viewer/falconFlight/cityStream.js` (floor / lift grid window / thermal pool / roosts from
  `world.tiles`), worker `viewer/falconFlight/falconWorker.js` (ridge roosts, landmark rasters).
- Verified (stepped, background tab): intro hand-over, stoop 79 m/s, thermal +0.8 m/s, roof-skim, strike (41 m/s),
  perch on the cross, ridge landing, 3.3 km streaming flight, landmark walls, mode exits. 0 sync pipelines,
  0 under-floor frames, the flight's CPU <= 3.3 ms a frame.

## How to re-run

```
python C:/Users/tibog/AppData/Local/Temp/uccle_nocache_server.py 8844 <worktree>
http://localhost:8844/viewer/index.html?log=0&time=midday
// in the page (wait for the cover, __flyer.pigeons, __falcons):
const F = await import("/debug/falconCityFlight.js?v=1");
const r = await F.run("stoop", { grabs: 8 });   // intro | stoop | thermal | skim | strike | church | ridge | far
F.sheet(r);                                       // then screenshot; F.hide()
```
Long runs (far: ~70-270 s wall) time out the DevTools call: start them without awaiting (store the result on
`window`) and poll.

## Main-file touch points (for a merge)

`viewer/main.js`: the import, `roofs: rf` in loadTile's return, the flyer construction (`OLD_FLIGHT`), the old bird
loader behind `if (OLD_FLIGHT)`, `fly()` waiting for `flyer.ready`, `updaters.push(flyer.tick)`, `stepLoop` +
`viewer.step`. `viewer/falconFlight/falconInput.js`: `enabled`, `skip`, `setEnabled` (the lab is unchanged in
behaviour). `viewer/falconFlight/cityWorld.js`: the church proxy moved to `church.js` (re-exported).

## Next

1. A real-time foreground run on a quiet GPU (frame histogram from rAF, a performance trace over the streaming long
   tasks to show they are the city's tile builds).
2. Trees as obstacles (the tiles' tree placements: trunk + crown cylinders in `floor`, or the impostor field's
   positions) - the falcon flies through crowns today.
3. Pigeons on more squares (the worker's `ridges` job round another point + a second `Pigeons`).
4. Bridge arches: a "ceiling" (two-level floor) so the falcon can fly under them.
5. The weather's wind (`air.setWeatherWind(weather.uWind)`) once the weather is in the city.
6. Docs/TODO.md line "Falcon flight game in the city's fly mode" -> done when merged.

## Round 2 (branch `claude/falcon2`, worktree `.claude/worktrees/falcon2`, server :8847): PAUSED 2026-11-13 (memory)

Stopped mid item 1/3 (WIP commit). Shared files touched so far: none outside `viewer/falconFlight/` and
`debug/falconCityFlight.js` (no main.js / tileData.js change).

Done (code, partly verified):
- **Trees as obstacles**: `falconWorker.js` job `trees` (per tile: each drawn tree's crown ellipsoid from the drawn
  variant's leaf cards, `treesStylized.js` variant / turn / scale, an 8 m bucket grid); `cityStream.js`
  `column(x, z, y)` = floor under y + ceiling over it + leaf brush; `syncTrees()` (every 2 s from `tick`),
  `treePerches()`; `flightModel.js collide` uses `world.column` when present (ceiling hits, `brushDrag` 2.5 /s in the
  shell, contact.tree); `falconGame.js`: "hit a tree", "through the leaves" (`falconAudio.leaves()`), tree perches in
  `perchInReach`, touch-down on a crown = perch "tree"; agl from `floorAt`. Column query 0.45 us.
  Verified (stepped): treeHit "hit a tree at 10 m/s: stunned"; treeBrush 38-44 frames brush, no contact; treeUnder
  1.4 m under a crown, no contact, clearance 4.8 m; treePerch "landing on a tree's crown", perched "tree". 0 sync
  pipelines, flight CPU p50 0.3 ms. Sheets: `docs/falcons/city2/tree_hit.jpeg` (ok), `tree_under.jpeg` (taken, not
  yet looked at).
- **Bridge arches (code only)**: raster job `under: true` keeps the lowest surface per cell (`p.low`); `column()` opens
  a bridge cell when low > ground + 2.5 m and the bird is under it (decks too). Not flown yet: the stjob proxy showed
  the arch (low 65-67, top 69-70 m TAW) but its tile was not loaded; driver scenario `bridge` (arg: stjob / calevoet /
  verrewinkel) is written.
- **Camera (code, needs a re-run)**: `falconCamera.js` `solid()` (floor + ceiling via `o.col`), `keepClear()` (min
  distance 0.62 span + 0.45, line of sight to the bird and its wingtips over the dense solid: pull in, else over the
  bird if free), the fix eased as an offset + a hard radial min distance (added last, NOT yet re-run: the treeHit run
  before it showed the camera 0.18 m from the bird after the hit). Driver records `cam` (minD, occluded, pulled, over).

Driver additions (`debug/falconCityFlight.js`): scenarios treeHit, treeBrush, treeUnder, treePerch, bridge, spire,
street; `run(name, { arg })`; results carry `cam`, `brush`, `pick`; under-floor check uses `floorAt`.

Next (in order): reload, re-run treeHit (camera min distance), street (camera beside façades), sheets; fly `bridge`
under stjob / calevoet / verrewinkel (start near them so the tiles load); weather wind (no Weather instance in the city
yet: hook `wx.uWind` from `viewer/weather/weatherState.js` + `window.__weather`'s cloud when present); pigeons at
Place Jean Vander Elst (-1125, -505), Parvis Saint-Pierre (-701, -498), Parc de Wolvendael (OSM park, ~-450, -95),
the 2 nearest flocks within 700 m, game.pigeons = the nearest; `spire` run; ridge points 1.5 m off ridge ends (the
chimneys sit there); fog density raised with height while flying (lighting.uFogDensity, far-ring edge); docs, final
CPU numbers, `node tools/build_worker.mjs`, `?falcon=old` check.
