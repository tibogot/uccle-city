# What the city uses, and what is built but not in it (inventory, 2026-11-14)

Read from the code (viewer/main.js imports and lazy imports, each system's default switch, who imports each folder),
the 43 labs (labs/*.html) and the branches not merged into claude/foundation. Re-check before relying on it.

## In the city by default

Terrain (Brussels + Flemish border fill), roads (measured surfaces, paint, kerbs, OSM road-bridge decks), buildings
(one-sided façades, façade kit, roofs), street life (shopfronts, names, house numbers), STIB stops kit, street furniture
kit 2 (benches, hoops, bike boxes, bins, glass banks), lamps (Blender lamp + the lamp light pool), traffic, parked cars,
trams, trains + railway (fences, bridges: Saint-Job, Calevoet, Verrewinkel, the six round-2 bridges), heroes (Saint-Job,
Stalle, town hall, van Buuren, Wolvendael, police station, Calevoet station, Saint-Pierre, Observatory, Russian church,
Rosaire, Saint-Augustin), flags, falcons + the falcon flight, the city map, the interior pilot (house cut), trees
(stylized LODs + the impostor kit for far trees, ON since 2026-11-13, `?impkit=0` = old), ground textures, the material
library, drive / walk / third person with their colliders.

## Built, OFF by default (a switch turns it on)

| switch | what | waiting for |
|---|---|---|
| `?grass=1` | city grass (+ Grass Field Lab) | the owner's look; cost measured ~0 ms |
| `?gardens=1` | front gardens | the sidewalk-to-wall lawn strip (a drawing issue), look check, mesh audit, GPU measure |
| `?horizon=1` | 32 km landscape ring | cheaper (+1.3 ms from 500 m) |
| `?tilecache=1` | built tiles cached in IndexedDB | a measured win on a quiet machine |
| `?workers=3`, `?earlyshow=1`, `?bootprefetch=1` | loading experiments | tried, not kept |
| `?gardenhedges=1` | hedges behind garden railings | cells + LODs (cost) |

## Built in a lab, NOT hooked into the city

| system | code | lab | note |
|---|---|---|---|
| night lights (glare, light cones, ground light, night street) | viewer/nightLights/ | night-lab | the city only has the lamp light pool |
| sound (ambience, vehicles, renders) | viewer/audio/ | sound-lab, sound-render | owner to listen to the renders first |
| pedestrians (crowd, bodies, LODs) | viewer/pedestrians/ | pedestrian-lab | |
| weather (rain, snow, snow layer, fog, live weather) | viewer/weather/ | weather-lab | only the falcon reads the weather state |
| foliage (hedges, ivy, plants, window boxes, seasons) | viewer/foliage/ | foliage-lab | only the gardens reuse hedges, the grass reuses the wind |
| park kit (park furniture, plants) | viewer/parkKit.js, parkPlants.js | park-kit-lab | |
| car impostors (far cars) | viewer/impostorKit/ (fleetCars) | impostor-lab | |
| tree species (London plane, beech forest / open) + textures | Tree Lab code | tree-lab, tree-textures-lab | the city still uses the generic stylized trees; better textures needed first |

## Branches not merged

`claude/character2` (17 commits, the owner's other chat: Mixamo locomotion), `claude/character-audit` (13: skeleton /
retarget pipeline), `claude/police-car` (6: police car round 2), `claude/furniture` (3, 2026-11-04: superseded by
furniture kit 2, can be deleted on the owner's word).
