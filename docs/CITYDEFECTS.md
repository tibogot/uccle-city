# City defects (owner playtest 2026-11-16, TODO items 3-8) — branch claude/citydefects

PAUSED 2026-11-16 for a laptop restart (out of RAM). Work below is committed as WIP; nothing merged or pushed.

## Reference used (look only)
- OSM 2025 (data/raw/osm/area.json): the NEW Carsoel deck over Saint-Job station: road way 1342926162 (bridge=yes,
  embedded tram rails, no lane markings), tram tracks 1411905486/88 on it, tram stop "Gare de Saint-Job" platforms
  1411869726/27 (tram=yes, bridge=yes, layer 1), bus platforms 1411869757/58, sidewalks 1411916284/87, stairs
  1412205415/17 down to the train platforms.
- Press: L'Avenir 2024-07-15 (new deck ~45 m wide along the line, 29 precast 15 m beams, road diagonal across it, tram
  stop on the deck, widened sidewalks with small green beds); L'Avenir 2025-01-11 (1928 S-curve bridge demolished);
  Bx1 2025-06 (deck open to tram 92 on 2 June 2025).
- UrbIS orthophoto (construction slab visible), UrbIS street surfaces (they already have the new layout at both ends of
  the deck, none on it), DTM 2021 (the open cutting). Google Maps could not render in the automated Chrome (black canvas),
  so no Street View comparison was possible yet: TO DO when a browser works.

## A. Saint-Job station bridge — DONE (needs a final look pass)
Causes found:
1. `pipeline/build_rail.py` took every `railway=platform` near a station: the two TRAM platforms on the deck (and the two
   Calevoet bus/tram platforms) became train platforms at rail level = the block across the tracks. Now skipped
   (tram/bus/highway=platform/bridge/layer>0 without train=yes). rail.json rebuilt (16 -> 12 platforms).
2. The demolished 1928 bridge (UrbIS ROB 849) was still drawn as a slab: `GONE_BRIDGES` in build_rail.py.
3. The OSM deck was a 13 m road band; platforms, shelters, sidewalks hung over the cutting. Now a measured PLAN deck:
   `data/overrides.json bridgePlans["1342926162"]` (ring, free edges, cutting walls, station floor) and
   `viewer/streets/bridgeDecks.js` plan decks (slab clipped on a 2 m grid, asphalt band + 10 cm kerbs + paving,
   fascia, railing = concrete upstand + steel posts/rails where the drop > 0.8 m, abutment walls, soffit, cutting walls
   under the deck, `deckUnderCut`: the station floor between the walls, tapered 1:1 back to the DTM; the deck top tucks
   10 cm under the UrbIS street where the ring overlaps it at both ends). `?bridgeplan=old` = before.
4. The parapet car walls of ALL OSM decks had slipped into a comment in tileData.js (`walls:`): restored.
5. Tram platforms / shelters (tram.js) and the STIB stops (data/stops baked y = cutting) now stand on the deck height
   (main.js `deckAt`, cityStops `extra.deckAt`).
6. Garden fence across the road: gardens built from pre-2025 UrbIS; `cityGardens.addTile(..., blocked)` drops pieces on
   a carriageway / deck (`viewer/streets/carriageway.js`; `?gardenroad=old`).
7. Rail platform outer edges were stair-stepped (DTM has the platform surface at its top height): `carveGrid` lowers 1.6 m
   round each platform (`?platformedge=old`). City-wide (all stations).
8. Grass blades through the deck: bridge deck meshes are now grass solids.
Images: docs/citydefects/A_bridge_east_before.jpg (owner's view, fence across) / A_bridge_east_after.jpg,
A_deck_top_after.jpg, A_station_under_after.jpg, A_under_deck_after.jpg.
Left on A: walls / fascia are flat vertex colour (no concrete texture); no green beds / bike racks on the deck yet;
check the deck/UrbIS joint heights at both ends at eye level; the tram rail profile (data/transit/tram_profile.json)
vs the deck top was not measured (looked right from the road).

## B. Street furniture on the carriageway — DONE in code and audited in node, NOT YET SEEN IN THE BROWSER
- `viewer/streets/carriageway.js`: `carriageway(roads, {classAt, onDeck}).inside(x, z, margin)` (UrbIS class where
  measured, else the OSM carriageway band from the lanes). Per tile in `window.__carriage` ({test, bounds}).
- Signals (`viewer/furniture.js`, `?signals=old`): one post per OSM signal point on the right kerb of the approach toward
  the nearest junction (133/206 points lie 3-25 m before one), 0.5 m behind the measured kerb, head facing the coming
  traffic (yaw = atan2(tx, tz)); mid-block points: one post per kerb. Never left inside a carriageway (pushed out).
- Tram poles (`viewer/tram.js`, `?trampoles=old`): a pole that would stand in a carriageway moves to the nearest kerb on
  either side, its cantilever scaled to reach the track (new InstancedMesh "tram-pole-arms"); none within 9 m: no pole.
Placement code is now three-free (viewer/streets/signalPlace.js, tramPoles.js, lampPlace.js, parkPlace.js, fitCore.js),
so the audit runs it in node.

## AUDITS without the browser (2026-11-16, after the restart)
- `node --import ./tools/road_audit/register.mjs tools/audit/streetAudit.mjs [--out FILE] T... | --all`: the road
  stage per tile, then the city's own placement, "before" (old placement) and "after" (default now). A post is "in a
  lane" when its centre is in a DRIVEN lane (UrbIS roadway / tram road; else the OSM carriageway band); "deep" = >= 0.6 m
  in. Results: docs/citydefects/street_audit.json (all 120 tiles, final run after every fix below):
  | kind | before: in a lane (deep) / n | after: in a lane (deep) / n |
  |---|---|---|
  | signal posts | 122 (88) / 410 | 5 (1) / 249 |
  | signal heads facing the wrong way (> 45 deg off the coming traffic) | 410 / 410 | 0 / 249 |
  | tram poles | 437 (270) / 790 | 49 (0) / 787 |
  | lamps | 0 / 6624 | 0 |
  | signs (data/streetkit) | 258 (181) / 1792 | 104 (93) |
  | plate posts (data/streetkit) | 361 (307) / 748 | 124 (115) |
  | STIB stop poles / shelters (data/stops) | 64 (44) / 278, 9 / 85 | 20 (18), 5 |
  | bike boxes / bins / hoops / benches / glass banks (data/furniture) | 51 / 18 / 15 / 18 / 4 | 0 / 14 / 2 / 18 / 2 |
  | parked cars | 16,545 slots: 10,973 within 1.95 m of a traffic lane, 4,162 leaving < 3 m, 0 on an OSM no-parking side | 5,468 kept |
  The data layers' leftovers have no measured kerb within 6 m (roads without UrbIS surfaces, or a square): next step is
  the snap in their builders with the OSM band. Benches unchanged: they are in parks / squares classed as roadway?
  to look at in the browser.
- `debug/furnitureAudit.js` (city page): every drawn pole-like instance vs `window.__carriage`. Needs the browser turn.
- `tools/audit/road_widths.py` (venv python): OSM width tags vs the measured UrbIS carriageway, 53 ways:
  median measured - tag = +0.7 m (measured WIDER), 29 within 1 m, 21 wider by > 1 m, 3 narrower by > 1 m.
  docs/citydefects/road_widths.json.

## C. Road widths, lane markings
- Widths: NOT a systematic narrowing in the source. The drawn carriageway IS the UrbIS polygon, and UrbIS is not
  narrower than OSM. What makes streets look and drive narrow: parked cars. Their slots come from the lanes BEFORE the
  width fit (type-default "guess" parking on both kerbs), while the traffic drives the fitted lanes. Sample of 5 tiles:
  558 / 877 parked cars stood within 1.95 m of a traffic lane's centre line (traffic through them), 176 left < 3 m of
  street. Fixed under D.
- Lane markings: the road checker (tools/road_audit, C8 "road leaves the measured street" = OSM chords on bends, C4
  lane / centre / edge paint off the carriageway) on I6 / E4 / J5: 57 C8 drifts, 36 C4. Tried: re-centring every OSM
  centre line on the measured carriageway before the engine (viewer/streets/recentre.js): drifts 57 -> 48, C4 36 -> 29,
  but folds 14 -> 23 and coplanar overlaps 134 -> 225. Left OPT-IN (`?recentre=1`). Next: only re-centre roads the
  checker flags as drifting, keep the junction arms fixed longer, re-check C9.
  Image 56's spot was not located yet (needs the browser or the owner's position).

## D. Cars
- FIRST TRY (superseded): dropping every slot on a traffic lane or leaving < 3 m kept 5,468 of 16,545 cars: an empty,
  fake city (coordinator's call). The parkingClear filter stays in parkPlace.js for the audit only.
- NOW (`viewer/streets/parkPlace.js widthParking`, built in the TILE WORKER, `?parkclear=old` = the old slots): per OSM way,
  every 5.6 m, the measured kerb-to-kerb width (UrbIS roadway / tram road / parking; the OSM line or up to 4 m beside it
  on a chord) decides: >= 8.0 m both kerbs, 5.6-8.0 m ONE kerb (the OSM parking side when the tags give one, else the side
  with fewer driveways / crossings / stops along the whole way, one choice per way), < 5.6 m none. No car on a driveway
  (UrbIS ramp behind the kerb under the car; the slot slides up to 1.4 m first), within 12 m of a road end (junction
  corners), 5 m of a crossing, 10 m of a signal, 15 m of a bus stop, 2.6 m of a tram track; a side the OSM tags leave
  without parking gets none (a custom lane stack without parking on a side whose type parks by default). Occupancy 80 %.
  Each car against the measured kerb (fitCore placeCar), then off the furniture kits' pieces (main.js).
- Traffic around them (`viewer/traffic/trafficGraph.js`): the lane fit (fitToSurface) now also keeps every lane point
  1.95 m from a parked car's body (search up to 4 m sideways inside the carriageway; failing that, the road-only fit).
  Where a street's two directions then come closer than 2.3 m (past 6 m from the junction mouths, runs >= 4 m), a NARROW
  STRETCH (nOff / nS0 / nS1 / nOpp / nO0 / nO1, CSR per path). `trafficSim.js accel`: a car stops before its stretch
  while a car is in the opposing stretch, or is about to enter it (within 6 m, moving, lower index = the turn); counted
  in sim.stats.narrowWaits; `?narrow=0` off. E4: 16 stretches with parking, 8 without (genuinely narrow streets).
  UNTESTED in the running sim (no browser): watch for standoffs at a narrow stretch and for cars brushing parked cars.
- Sunk on slopes (`viewer/cars.js wheelFit`, `?carfit=old`): parked cars pitched / rolled onto their four wheels'
  ground and lifted until no wheel is below it (was: level at the centre's height). Moving traffic already pitched.
- Counts: see "Parking (width rule)" in the audit section.

## E. Defects
- Gate pier with no cap / L-shaped cap (52-53): FIXED. `viewer/gardens/gardenGeom.js`: the pier cap's top (margin
  ring + pyramid) was wound facing DOWN (FrontSide material: culled from above, the hollow pier seen through), and every
  wall coping (extrudeX) was wound INWARD. A node winding check of all boxy garden pieces: 0 faces inward now (was:
  every coping face, the pier cap tops).

- Hero "library has no X: temporary material" warnings: now ONE info line per hero listing its own-look slots
  (`viewer/materials/shipped.js ownLook`). Promoting the CC0 candidates (zinc 2, painted metal 3, cast iron 2, white wood
  2 in candidates.json) needs their source maps, which are not in either checkout (viewer/materials/textures/cand/ is
  git-ignored and absent): `tools/textures/fetch_textures.py` + `process_textures.py` + `encode_ktx2.mjs`, then a look in
  the Material Lab (browser) before `tools/texturefactory/promote.py`. Not done.

## E (rest), F — need the browser
- F: the white night shop on Place Saint-Job: no OSM / streetlife point for it (OSM shops round the Place: Barat,
  Deneubourg, Le Bouquet Varié, Uccle Flore, Alain Dantine, Le P'tit Rêve, Maison Dandoy, Botanea, St-Job butcher,
  Espace photo; nothing tagged convenience / night shop there). Placing it needs its building (owner, or a Street View look
  in the browser turn); then a streetlife POI (cat convenience) + the shop kit's white front. No invented position.
- E: window / door surround z-fight (51, 55, 56) and banded flat roofs (59): need the spots seen moving (the kit's
  frames / surrounds vs the wall's cut openings; the flat roof bands look like a roof material's tiling or the roof
  grid's shading). To check in the browser turn.

## Commits
See `git log claude/citydefects`. Server: `python tools/serve_nocache.py 8812`; reload with a changing `&r=N` (a same-URL
navigate did not reload the page).
