# Data sources and licences (checked 2026-11-13, before going public)

On screen: `viewer/index.html` #credits (bottom centre) and the full map's credit line (viewer/map/fullMap.js).

| Source | What we use | Licence / condition | Status |
|---|---|---|---|
| OpenStreetMap | roads, paths, shops / POIs, trees, land cover | ODbL: show "© OpenStreetMap contributors" with a link to openstreetmap.org/copyright; share-alike applies to a derived DATABASE we publish (the tile JSONs) | credit on screen (2026-11-13). The street-life extract came from a mirror: re-fetch from overpass-api.de before shipping. |
| UrbIS (paradigm.brussels / CIRB-BRIC) | buildings, terrain (DTM), surfaces, addresses, network | "Open Data licence, free and unrestricted use" (be.brussels: les données UrbIS); credit "UrbIS © CIRB/BRIC" | OK; the addresses dataset's own record still to read (listed CC0 by the agent, not confirmed). |
| Brussels Mobility (data.mobility.brussels, WFS) | stops, Villo, bpost (street life), markings legend | portal: open, "no limitations to public access"; several layers explicitly CC0 (taxi stops, bike network, worksites) | the exact layers we use (stops / Villo / bpost) not confirmed one by one: read each layer's catalogue record. |
| STIB-MIVB GTFS | tram 92 timetable | CC BY 4.0 (credit) | credit on screen. |
| SNCB/NMBS GTFS | trains on L124 / L26 | re-use agreement needed (a free form to gtfs@sncb.be) | **owner to send the form before the public site ships `data/transit/sncb-uccle.json`.** |
| Flanders DTM (DHMV II, 1 m) | NOT used yet: needed past the Brussels region border (D10 / E10: the terrain falls 5-10 m flat, roads float) | open data under the Flemish free open licence (Modellicentie Gratis Hergebruik, to confirm on the dataset record); download via Datavindplaats / WCS | next: fetch the strip along the border, resample to our 1 m grid, blend at the border. |
| Texture scans | Poly Haven, ambientCG (CC0); Megascans / Fab later | CC0 needs no credit (we list them anyway in docs/materials); Fab: check the licence allows a public web app | Fab licence check open (owner). |
| alezen9/revo-realms (later, grass) | ideas / code for our grass | MIT: keep the copyright notice if code is copied | — |

Sources: vlaanderen.be Datavindplaats "Digitaal Hoogtemodel Vlaanderen II, DTM, raster, 1 m"; metadata.vlaanderen.be DTM record;
be.brussels "Les données UrbIS"; data-mobility.irisnet.be layer records; geobru-geonetwork.irisnet.be catalogue.
