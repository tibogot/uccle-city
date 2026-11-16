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

## B. Street furniture on the carriageway — CODE WRITTEN, NOT YET TESTED IN THE BROWSER
- `viewer/streets/carriageway.js`: `carriageway(roads, {classAt, onDeck}).inside(x, z, margin)` (UrbIS class where
  measured, else the OSM carriageway band from the lanes). Per tile in `window.__carriage` ({test, bounds}).
- Signals (`viewer/furniture.js`, `?signals=old`): one post per OSM signal point on the right kerb of the approach toward
  the nearest junction (133/206 points lie 3-25 m before one), 0.5 m behind the measured kerb, head facing the coming
  traffic (yaw = atan2(tx, tz)); mid-block points: one post per kerb. Never left inside a carriageway (pushed out).
- Tram poles (`viewer/tram.js`, `?trampoles=old`): a pole that would stand in a carriageway moves to the nearest kerb on
  either side, its cantilever scaled to reach the track (new InstancedMesh "tram-pole-arms"); none within 9 m: no pole.
NEXT: load I6 / H6 / E4 with `&tilecache=0`, check signals and poles (images 56-58 spots), then write
`debug/furnitureAudit.js`: for every instance of furniture-signal, tram-poles, street-lamps, furniture-stopPole,
streetkit poles, test `window.__carriage` (tile whose bounds hold it) `.test.inside(x, z, 0.2)`; report counts per tile.

## C, D, E, F — NOT STARTED
- C: lane markings off the curves / into walls (image 56); road widths vs OSM width/lanes + aerial on a street sample.
- D: traffic through parked cars, cars sunk on slopes (image 54: wheels below the road; check the parked/traffic car Y
  vs the drawn surface + pitch), parked cars where no parking.
- E: window / door surround z-fight (51, 55, 56), gate pier with no cap (52-53: the cap is only on two sides),
  banded flat roofs (59). Hero "library has no X: temporary material": cause found — `viewer/materials/shipped.js`
  returns null on purpose for names without a SHIPPED baked set (only 12: brick x3, stone x2, slate, cobbles, asphalt,
  paving, copper_patina, render_white, roof_tiles_red); zinc_roof, glass_window, cast_iron_green, painted_metal_white,
  wood_frame_white, gravel_path, lawn_edge have CC0 candidates in viewer/materials/candidates.json (zinc 2, painted
  metal 3, cast iron 2, wood 2) but none promoted (tools/texturefactory/promote.py / tools/textures/*). Fix = promote
  sets for those names (fetch + process + encode KTX2), or at least make the warning say "own look" (it is the
  documented choice, docs/TEXTURE_FACTORY.md "City switch").
- F: the white night shop on Place Saint-Job.

## Commits
See `git log claude/citydefects`. Server: `python tools/serve_nocache.py 8812`; reload with a changing `&r=N` (a same-URL
navigate did not reload the page).
