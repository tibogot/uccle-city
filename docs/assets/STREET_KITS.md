# Street furniture and city asset kits: what exists, what to build (plan, 2026-11-13 evening)

Owner: "later we will need to place all the billboards and everything... make better bus stops and others; always with
the best optimisation". This is the inventory and the order of work. Placement always from real data where it
exists (OSM, UrbIS, STIB), by documented rules where it does not (e.g. the ad panel in every STIB shelter).

## What we have today

| where | what | quality |
|---|---|---|
| `viewer/furniture.js` MODELS | stop pole, bus shelter, traffic signal (cycling lenses), bike rack, bench | boxes + cylinders: placeholder |
| `viewer/streetlife/kits.js` + `streetlife.js` | petrol pump, advertising column, terrace tables / chairs, pharmacy cross, bpost postbox, glass recycling bubble, chute, poles, Villo dock, lit boxes, SDF text (shop names, house numbers, stop flags) | decent, named slots |
| `models/furniture/brussels_furniture.glb` | Blender furniture set (check its contents before reusing) | Blender |
| `models/lamp` | the Brussels street lamp (Blender) | premium |
| bollards, parked cars, trams, trains, police cars | own systems | premium / good |

## How many of each exist in Uccle (OSM, data/raw/osm/area.json)

bicycle parking 828 · benches 766 · traffic signals 553 · give-way 436 · gates 335 · bus stops 332 (193 with a
shelter) · tram stops / platforms 304 · street lamps (mapped) 243 · bollards 148 · lift gates 137 · traffic signs
(mapped) 71 · playgrounds 62 · parking entrances 56 · cycle barriers 55 · fountains 13. Advertising: 1 (OSM barely
maps it: ad panels are placed by rule). Waste baskets / recycling: almost unmapped (rule-based too).
For the landmark list: 34 places of worship, 15 historic castles, 6 manors.

## The kits to build, in order (premium Blender, named material slots, LOD0-2, one draw per slot, instanced)

1. **STIB stops** (DONE on claude/stops: `docs/assets/STOPS.md`, with the free ad panel of kit 2): the current Brussels bus / tram shelter (glass, the integrated lit ad panel = the "billboard" of
   most streets, bench, the STIB totem with line numbers and stop name as SDF text from GTFS), the stop pole for
   unsheltered stops, tram platform furniture. 332 + 304 placements from OSM / GTFS stops. Night: the ad panel and
   totem glow through the existing emissive slots (no lights: fixed light count).
2. **Advertising**: the free-standing lit panel (2 m², double-sided) at rule-based spots (main roads, near squares),
   the Morris column (exists: upgrade), the rare big 8 m² wall billboards. Posters: an atlas of plain generic poster
   designs we make ourselves (no real brands, no copied adverts).
3. **Seating and bikes** (DONE on claude/furniture2 except the Villo upgrade: `docs/assets/FURNITURE2.md`): the Brussels standard bench (wood slats, cast feet) + 1-2 variants (766), the "arceau" bike
   hoop and the covered bike box (828), Villo station (exists: upgrade).
4. **Signals and signs**: Belgian traffic-signal heads on the white-banded post + pedestrian heads + push buttons
   (553); the Belgian sign set (give-way 436, stop, no entry, one-way, zone 30, parking...) as one atlas on one post
   mesh; the iconic Brussels bilingual street-name plates on the corner walls (from OSM street names at junctions).
5. **Cleanliness** (DONE on claude/furniture2 except the underground columns and textile containers: `docs/assets/FURNITURE2.md`): Bruxelles-Propreté street bins, glass / textile bubbles (exists: upgrade), the underground
   recycling columns. Rule-based placement (stops, squares, every N metres on main streets).
6. **Edges and gates**: bollard family (exists: check), lift gates (137), cycle barriers (55), park gates (335 gates:
   many are private garden gates, see the front-garden kit).
7. **Front gardens** (from the buildings proposal): low brick walls, railings, gates, pillars with caps, hedges behind
   railings, garage ramps; placed from the footprint-to-sidewalk gap per house. **Built 2026-11-13 (branch claude/gardens): `docs/assets/GARDENS.md`.**
8. **Small items**: parking meters ("horodateurs"), EV chargers, Cambio car-sharing marks, fire hydrant plates,
   drinking fountains (13), post boxes (exists), phone boxes (none left), playground sets (62; the park kit exists).

## Performance rules for all of them

Instanced per kind per tile, static buffers (never DynamicDrawUsage), count-0 meshes hidden, LODs with the smooth
dithered hand-over, no shadow casting below ~1 m tall far away, one shared material per slot set (no per-tile shader
variants), atlases for text / posters, cull by cells, measure each kit's draws and GPU ms in its lab and in the city.
