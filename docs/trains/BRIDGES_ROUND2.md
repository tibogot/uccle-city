# Rail bridges, round 2: the ten structures without a model (research, 2026-11-13)

Source: `data/rail/rail.json` bridges of type RAB (rail above), crossed with every tile's `roads.json` and
`features.json` lines (what passes under each deck polygon). Saint-Job (692) and Calevoet (687) already have hero
models (`models/rail/stjob.*`, `calevoet.*`); Verrewinkel (`verrewinkel.*`) is the road bridge over the line (879).
Until these exist the track crosses each gap on its ballast alone. Positions: local metres (x east, z south).

| id | line | where (centre) | crosses | longest extent | deck area |
|---|---|---|---|---|---|
| 686 | L124 | -1489, 276 | Rue de Stalle (primary road) | ~69 m | 658 m² |
| 694 | L26 + L26/5 | -691, 1795 | Rue Engeland (residential) | ~63 m | 838 m² |
| 695 | L26/5 | -701, 1787 | Rue Engeland, the chord's own deck beside 694 | ~62 m | 371 m² |
| 688 | L124 | -1106, 1636 | Rue des Bigarreaux (residential) | ~20 m | 160 m² |
| 691 | L26 | 273, 869 | Kauwberg (residential street) | ~20 m | 145 m² |
| 706 | L26 | -1328, 2304 | Rue de Linkebeek (residential) | ~17 m | 123 m² |
| 693 | L26 | -456, 1511 | Chemin du Puits / Borreweg (footpath, in a wood) | ~15 m | 98 m² |
| 770 | L26/5 over L26 | -951, 2051 | rail flyover (Moensberg junction) | ~36 m | 460 m² |
| 771 | L26/5 over L124 | -1042, 2384 | rail flyover | ~76 m | 658 m² |
| 772 | L124 over L26 | -1117, 2165 | Moensberg station, over platforms 5 / 6 and a footway | ~31 m | 327 m² |

Suggested order: 686 Rue de Stalle (the most seen: a primary road), 694 + 695 Engeland (one model, two decks), then
the three small street bridges (688, 691, 706: likely one family of short spans with variants), 693 (footpath
underpass), the Moensberg group last (770, 771, 772: flyovers seen mainly from trains and the falcon).

Method (HANDOFF, hero-buildings method): Street View / Google Maps imagery LOOKED AT only (never traced, stored or
shipped) for type (masonry arch, steel deck, concrete), parapets, abutments, clearance; Blender 5.0 headless scripts
like `tools/blender/railBridge.py`; named material slots; the JOINS rule (abutments welded to the city ground, no
floating edge: the contact check); collisions (car under the deck: clearance; the road stays open); the deck carries
the existing ballast / rails; LODs without popping; mesh audit clean; a switch to turn each off.
