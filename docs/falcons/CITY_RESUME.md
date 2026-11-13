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

## Round 2 (branch `claude/falcon2`, worktree `.claude/worktrees/falcon2`, server :8847): done 2026-11-13

Write-up: `docs/FALCON_FLIGHT.md` "Round 2". Sheets: `docs/falcons/city2/` (.jpeg).

- Trees are obstacles (worker crown grids per tile, `column(x, z, y)`: floor + ceiling + leaf brush; hits, brushing,
  flying under crowns, perching on crowns).
- Under the bridges' arches (Saint-Job, Calevoet, Verrewinkel: proxies keep their underside).
- Chase camera: min distance to the bird, line of sight to the bird and its wingtips, ceilings, never in the leaves.
- Weather wind / cloud hook (`wx.uWind` when `window.__weather` / `opts.weather` is a running Weather).
- Pigeons at Place Jean Vander Elst, Parvis Saint-Pierre, Parc de Wolvendael (75 each, the 2 nearest flocks drawn).
- Saint-Pierre tower hit; ridge perches 1.5 m off ridge ends (chimneys); haze while high (fog uniform).
- Files: only `viewer/falconFlight/*` and `debug/falconCityFlight.js` (+ docs). No main.js / tileData.js change.

Re-run: `const F = await import("/debug/falconCityFlight.js"); await F.goto(x, z); const r = await F.run("bridge", { arg:
"calevoet" }); F.sheet(r)` (runs: treeHit, treeBrush, treeUnder, treePerch, bridge, spire, street, strike(square)).

## Next

1. The sky's lower half beyond the last far tile at 500-650 m up: `viewer/lighting.js` (sky under the horizon in the
   fog colour) or a wider far ring while flying high (main.js streaming).
2. A foreground real-time run on a quiet GPU (frame histogram, a trace over the streaming long tasks).
3. Trees in the lift grid (updrafts off rows of crowns); a Weather instance in the city (the hook is ready).
