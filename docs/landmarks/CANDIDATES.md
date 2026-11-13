# Next landmarks: churches and castles (shortlist, 2026-11-13 evening)

Owner: "work on the Saint-Augustin church at Altitude Cent and other Uccle churches and castles". From OSM
(data/raw/osm/area.json: amenity=place_of_worship, historic=castle / manor), kept when the way's centre lies inside
Uccle's boundary (data/raw/osm/uccle_boundary.geojson). Footprint areas from the OSM outline. Already heroes:
Saint-Job, Saint-Pierre, Chapelle de Stalle, Wolvendael, the town hall, the Observatory, villa van Buuren, Calevoet
station, the police station.

## Churches (no model yet)

| name | footprint | note |
|---|---|---|
| Saint-Augustin, Altitude Cent (FOREST, just over the border) | ~1,470 m² | **built** (branch claude/augustin): docs/landmarks/AUGUSTIN.md, `?augustin=0` = without |
| Notre-Dame du Rosaire (Q3580420) | ~1,410 m² | DONE 2026-11-13 (branch claude/churches2, `?rosaire=0`; docs/landmarks/CHURCHES2.md) |
| Sacré-Cœur (Q62570896) | ~1,140 m² | |
| Saint-Paul (Q3583482) | ~765 m² | |
| Saint-Marc (Q62570700) | ~745 m² | |
| Saint-Joseph | ~455 m² | |
| Russian Orthodox church of Saint-Job (Q4505050) | ~200 m² | DONE 2026-11-13 (branch claude/churches2, `?russian=0`; docs/landmarks/CHURCHES2.md) |
| Chapelle Hauwaert | ~15 m² | wayside chapel (street-furniture scale) |

## Castles and manors (no model yet)

| name | footprint | note |
|---|---|---|
| Château Latour de Frein (Q127161341) | ~1,430 m² | the largest |
| Château Zeecrabbe | ~605 m² | |
| Château de La Fougeraie (Q2969549) | ~590 m² | |
| Château Fond'Roy (Q2967876) | ~410 m² | |
| Château du Groeselenberg | ~480 m² | listed heritage |
| Château de Pape / Papenkasteel (Q2970725) | ~300 m² | |
| Château de Beco, Viola Cornuta, Château Rouge, an unnamed château (school) | 330-500 m² | |

## Suggested order

1. Saint-Augustin (owner's pick, skyline), 2. Notre-Dame du Rosaire, 3. the Russian church (small, quick, iconic),
4. Sacré-Cœur, 5. Latour de Frein; then the rest by how much of each is visible from public streets (many castles
stand in private parks: check with Street View, looking only, before spending a model on one that nobody sees).
Hero-buildings method applies (photo comparison, named material slots, max 2 agents, mesh audit + joins + colliders).
