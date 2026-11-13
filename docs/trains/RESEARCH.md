# The railway in Uccle: research (2026-11-06)

Everything here is from data we have or fetched today; nothing is invented. Where a number is an estimate it says so.

## Sources and licences

| Source | What it gave | Licence / terms |
|---|---|---|
| OSM extract `data/raw/osm/area.json` (fetched 2026-11-04) | 569 `railway=rail` ways (one per track, `ref` L124 / L26 / L26/5 / L161 ..., `bridge`, `tunnel`, `layer`, `railway:preferred_direction=forward` on every main track), stop positions (`railway=stop`, one per track and station), halts, 16 platforms (`railway=platform` areas, `height=0.76`, `ref` = platform number), 59 roads mapped over the line | ODbL, (c) OpenStreetMap contributors |
| UrbIS Land cover 2026 (`data/raw/urbis/landcover`, layers `Bridges`, `Tunnels`) | 23 bridges in our tiles (12 rail bridges `RAB`, road bridges over the rail `ROB`, footbridges `PB`) as polygons with their level; the L26 tunnel under the Sonian forest (`RAT`, 57 150 m²) | CC0 (urban.brussels) |
| UrbIS Transport networks `Railways` layer | 2D centrelines (cross-check only; OSM has the per-track detail and the directions) | CC0 |
| UrbIS DTM 2021 0.5 m, via the tiles' 1 m `terrain.u16` | track heights, embankments and cuttings, road levels under the bridges | CC0 |
| NMBS/SNCB GTFS static feed (feed_version 2026-11-05, valid 2026-02-06 .. 2027-12-11) `data/raw/gtfs/sncb.zip`, 43 MB | every train calling at or passing through Uccle | Published free on the Belgian National Access Point (transportdata.be dataset "SNCB GFTS - scheduled timetable and real-time data", download `https://api-management-discovery-production.azure-api.net/api/gtfs/feed/nmbssncb/static`). SNCB states the data is free subject to its standard licence agreement for timetable re-use (belgiantrain.be "Public data", returned HTTP 403 to our fetcher; the agreement is a form sent to gtfs@sncb.be). **To do before the public site ships `data/transit/sncb-uccle.json`: accept / sign that agreement.** |
| Wikimedia Commons photos (18, `data/raw/refs/trains/`, list + authors in `SOURCES.json`) | the bridges' shapes, counts, stone vocabulary; the AM08 nose, livery, doors; stations | CC BY-SA 4.0 / CC BY 4.0 (Stratoswift, Sjenghai, Japplemedia). Reference only, never shipped; the comparison sheets in `docs/trains/compare/` credit them (docs/ is not deployed) |
| loco-info.com (AM08 data) | length over couplers 79.91 m, B-B + 2-2 + B-B, 3 kV DC / 25 kV AC, 160 km/h, 305 units (Siemens / Bombardier) | facts |

Round 2 (2026-11-13, docs/trains/BRIDGES_ROUND2.md): **Google Street View LOOKED AT only** (the owner's rule since: look, never trace, store or ship) for the types of bridges 686, 688, 691, 694, 695, 706 (panoramas 2013-2024; no screenshot kept in the repo, nothing measured from them beyond proportions); the UrbIS 2024 orthophoto (25 cm, `data/raw/ortho`) for the decks from above. Round 1: not used: **Google Maps / Street View** (their terms forbid deriving models or data from the imagery; the owner suggested it: that is why the photos are Commons ones); Mapillary (no token configured on this machine); the Brussels heritage inventory (monument.heritage.brussels) was not reachable from the fetcher in this session: Uccle-Stalle station is listed (protected 1994, built 1873, per the Commons description), the bridges' status is unchecked (to do).

## The lines

| Line | Through Uccle | Stations in our tiles (tile) | Trains (SNCB GTFS, Tuesday 2026-11-10) |
|---|---|---|---|
| **L124** Brussels-Midi - Charleroi | north-south on the west side: Forest-Est (outside) - **Uccle-Stalle** (C4) - **Uccle-Calevoet** (D6) - Linkebeek (E10, the tile is ours) - Holleken | Stalle: 2 platforms (OSM 185317560/61), Calevoet: 2 (185317084/85, shelters) | **S1** Antwerp - Brussels - Nivelles: 64 trains (some skip Stalle); **IC** Brussels-Midi - Braine-l'Alleud / Charleroi: 75 trains pass WITHOUT stopping; P: 4 |
| **L26** Schaerbeek - Halle | east-west across the south: Boondael (outside) - **Vivier d'Oie** (J5) - the Sonian forest tunnel (K5/L5) - **Saint-Job** (H6) - **Moensberg** (D9) - Beersel | Vivier d'Oie 2, Saint-Job 2 (rebuilt 2024-25 with the new Carsoel bridge), Moensberg 2 (OSM 1276257396/97) | **S5** Mechelen - Halle (Enghien): 65; **S7** Mechelen - Halle: 60 |
| **L26/5** chord Linkebeek (L124) - L26 near Rue Engeland | E8/E9/D9/E10 | - | **S9** Leuven - Braine-l'Alleud: 32; **S19** Brussels-Airport - Charleroi: 34 (both: Rhode-St-Genèse - Linkebeek - Saint-Job - Vivier d'Oie, not Moensberg) |

334 trains on a weekday (Tue 2026-11-10), 198 on Saturday (S1, S5, S19, IC), 173 on Sunday. The task brief's line list was right; the S9 / S19 route over the L26/5 chord and the non-stopping ICs on L124 were found in the feed. GTFS calls only: an IC's Uccle passage is interpolated between Bruxelles-Midi and Braine-l'Alleud along the track (the route's ends are extrapolated with 1.08 x the straight line: an estimate, see `pipeline/build_trains.py`).

**Rolling stock**: every photo of an S train at Uccle-Calevoet and Saint-Job from 2017 to 2025 on Commons shows an **AM08 Desiro ML** (08049, 08558, 08573 on S1; 08579, 08572 on S19; 08176 + 08206 as an IC pair at Saint-Job). An AM86 ("duikbril") was photographed on L26 in June 2025 (Rue de Linkebeek). The ICs Brussels - Charleroi also use M6/M7 double-deck sets with HLE18 locomotives (not in our photos of Uccle; to verify and model next). The GTFS has no rolling stock: we draw S trains as one AM08 and ICs as two coupled AM08 (seen at Saint-Job), and say so.

## Every place the railway meets a road (our tiles)

From the OSM ways intersected with the line (`pipeline` one-off, reproduced in `pipeline/build_rail.py`'s bridge list) and the UrbIS polygons. **No level crossing** with a road on L124 / L26 inside Uccle (the OSM `railway=railway_crossing` nodes are footpaths in yards outside). Rail OVER road:

| UrbIS | Line | Road under | Tile | Rail top above the road | Modelled |
|---|---|---|---|---|---|
| bridge/692 | L26 | **Chaussée de Saint-Job** (+ footway) | G6 | 9.96 m | **hero** (Blender) |
| bridge/687 | L124 | **Chaussée de Saint-Job, Rue du Château d'Or, the "Engeland" stop** (OSM `bridge:name` "Viaduc de Calevoet") | D7 | 14.95 m | **hero** (Blender) |
| bridge/686 | L124 | Rue de Stalle (primary) | D5 | ~17.7 m (DTM) | to do (big) |
| bridge/691 | L26 | Kauwberg | G6 | 5.8 m | to do |
| bridge/688 | L124 | Rue des Bigarreaux | D8 | 1.4 m (a culvert-like underpass) | to do |
| bridge/693 | L26 | Chemin du Puits | F8 | small | to do |
| bridge/694, 695 | L26, L26/5 | Rue Engeland | E8 | 0.3-0.7 m (DTM; the road is in a cutting) | to do |
| bridge/706 | L26 | Rue de Linkebeek | D9 | 5.8 m (Commons photo with an AM86) | to do |
| bridge/770, 771, 772 | L26 / L124 / L26/5 | the lines over each other near Moensberg | D9/E9 | - | to do |

Road OVER rail (UrbIS ROB / PB): Avenue Jean et Pierre Carsoel at Saint-Job station (849, new 2024 bridge), Chaussée de Waterloo at Vivier d'Oie (590), Avenue de la Chênaie (899), Rue de Verrewinkel (879), Rue du Merlo (833), Avenue des Tilleuls (864, 939), Rue du Bourdon (820), Avenue des Hospices (923), two footbridges at Vivier d'Oie (751, 752). Drawn as simple decks (`railway.js`), see "weak".

Tunnels: L26 under the Sonian forest (K5/L5, x 1833 .. 2994, UrbIS tunnel/177); pedestrian underpasses at Calevoet and Stalle.

**"Rue des Roses"** (owner's brief: "the bridge near Uccle-Calevoet / rue des Roses next to the station"): there is no Rue des Roses near Calevoet in OSM (the only "Roses" is the Chemin des Roses footpath at x -870, z 70). The bridge next to Calevoet station is the Viaduc de Calevoet (bridge/687, 330 m south of the platforms, three arches, OSM name). Built that one. Note: OSM also puts `bridge:name` "Viaduc de Calevoet" on the L26 bridge over Chaussée de Saint-Job (G6), almost certainly a copy error.

## The two heroes, measured and counted

**Saint-Job bridge (L26, bridge/692)** - UrbIS polygon 63.65 x 8.70 m, axis 151.6 deg; road level 59.80 m TAW (DTM), rail top 69.76 m (rail.json); Chaussée de Saint-Job crosses at **35 deg to the line** (OSM axis 6.6 deg): a strongly skewed arch, the vault 15.2 m long along the road, its two faces offset 12.4 m along the bridge; clear width 11.5 m across the road (UrbIS roadway 9 m + sidewalks) = 20.0 m along the face. From the photos (Stratoswift 2021, 2023): red brick with blue-stone (petit granit) dressings; ONE wide segmental arch (span 20 m on the face, rise ~5.3 m, springing ~2.3 m) between two quoined pilasters with capped tops above the parapet; a smaller round arch each side; the arch ring brick with ~11 stone voussoirs; a stone hood moulding that runs down the pilasters and ends in a **scroll with a ball** at ~2 m (photo "détail"); a **corbel table** of small round arches on stone consoles under a stone cornice (counted 17-19 bays between the pilasters); a brick parapet with a stone coping.

**Viaduc de Calevoet (L124, bridge/687)** - 47.4 x 9.5 m, axis 81.2 deg, road 39.64 m, rail 54.59 m (15 m high); the roads cross nearly square. Photo (Stratoswift 2017): three round arches (span ~10.6 m, piers ~2.4 m) with stone archivolts and a stepped brick edge, stone imposts, end quoins, a plain parapet with a painted steel railing; catenary masts on the deck.

## The AM08 (what we used)

Measured: 79.91 m over couplers, 3 cars, B-B + 2-2 + B-B (loco-info). Estimated from photos: car lengths 27.30 / 25.31 / 27.30 m, width 2.86 m, roof 4.15 m, door sill 0.96 m (platforms 0.76 m: OSM), 2 double plug doors per car side, window pattern, nose shape, bogie centres, wheel 0.85 m, wheelbase 2.60 m. Livery (photos 2019-2025): white body, SNCB yellow cab wrapping back to the first window, red doors, navy skirt band, light-grey lower nose, black windscreen surround with the LED destination display, light-grey roof with equipment fairings.
