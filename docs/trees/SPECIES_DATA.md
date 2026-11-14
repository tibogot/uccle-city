# Which trees Uccle really has (data, 2026-11-14)

## Street trees on the regional roads (Bruxelles Mobilité, CC0)

WFS `bm_public_space:trees` (https://data-mobility.irisnet.be/geoserver/ows), filter `commune='UCCLE'`, saved raw to
`data/raw/trees/bm_trees_uccle.json` (git-ignored, 1.2 MB; EPSG:31370). Fields per tree: `essence` (species),
`hauteur` (m), `crown_diam` (m), `circumference` (cm), `structure_couronne`, `distribution` (alignment...), `voirie`,
`status`. 2,107 records, 1,597 alive ("en vie"). Regional roads only: communal streets, parks and gardens are not in it.

| species | share of the 1,597 |
|---|---|
| copper beech, Fagus sylvatica 'Atropunicea' | **32.6 %** (520) |
| horse chestnut, Aesculus hippocastanum | 17.3 % (276) |
| Crimean lime, Tilia x euchlora | 12.6 % (202) |
| hornbeam, Carpinus betulus | 8.3 % (133) |
| London plane, Platanus x acerifolia | 6.6 % (106) |
| ginkgo | 3.7 % · robinia 3.1 % · small-leaved lime 1.6 % · beech 1.6 % · Persian ironwood 1.2 % · swamp cypress 1.0 % · ash 1.0 % · birch 0.9 % · fastigiate beech 0.9 % · Callery pear 0.9 % · wild cherry 0.8 % · ... |

By genus: Fagus 35 %, Aesculus 17.5 %, Tilia 14.5 %, Carpinus 8.3 %, Platanus 6.6 %, Ginkgo 3.7 %, Robinia 3.1 %.
Conifers on these streets: almost none (ginkgo 59, swamp cypress 16, dawn redwood 4, one cedar).

**For the Tree Lab:** the COPPER BEECH is Uccle's street tree (missing from the lab: it has the green beech and the
plane); then horse chestnut, lime, hornbeam. Placement: these 1,597 positions + species directly on the regional roads.

## Conifers (gardens, parks, park edges)

Not in the street data. OSM (data/raw/osm/area.json): 63 tree nodes `leaf_type=needleleaved`, 17 needle-leaved tree
rows, 620 broadleaved nodes, 2,590 trees with a genus / species (Tilia 197, Platanus 124, Acer 24, Prunus 20, Ulmus 9,
Fagus 7, Cedrus 2...); 4 + 5 woods / forests tagged mixed. The tile data keeps only 83 labelled OSM trees (none of them a
conifer matched to a LiDAR crown), so the "pointed crown = conifer" LiDAR test needs: the 63 + 17 needle-leaved OSM
features projected to the local frame, and the crown PROFILE from the UrbIS DSM 2021 (data/raw/urbis/dsm) around each
canopy peak (apex sharpness, height / radius, rotational symmetry), compared with broadleaved controls (the street-tree
inventory gives 1,597 broadleaved truths). The 210,556 LiDAR canopy peaks in the tiles carry height + crown radius only.
Known broadleaved h / r (19 matched OSM trees): median 4.5 (p10 3.9, p90 6.1).
