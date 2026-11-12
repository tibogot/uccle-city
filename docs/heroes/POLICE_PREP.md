# Uccle police station: preparation (2026-11-12, research only, nothing modelled)

The owner wants the police station near the Château de Wolvendael as a hero building, "especially if we do a police game".

## Which building

- **Today: Commissariat Central "Marlow" à Uccle, Rue Rouge 17, 1180 Uccle** (police zone 5342 Uccle / Watermael-Boitsfort / Auderghem; access from Rue Rouge for security reasons; phone +32 2 563 96 39 for both commissariats). Source: [police.be, quartier Wolvendael](https://www.police.be/5342/fr/node/567). It is the Wolvendael neighbourhood's station.
  - Geocoded (Nominatim / OSM, one lookup): 50.80213 N, 4.34223 E -> city (-512.7, -348.3), tile **E4**: about 45 m west of the Château de Wolvendael (-469, -366), on the park's edge.
  - UrbIS solid nearest the address point: **528055** (352 m², base 47.51, eaves 58.69, top 58.85 m TAW: about 11 m tall with a nearly flat roof), 7.4 m from the point; neighbours 531654 (59 m²), 528056 (45 m²), 528772 (20 m²) are small annexes / garages to check. The exact footprint of the station (and its yard / garages for vehicles) must be confirmed on the orthophoto and photos.
- **Planned move:** the zone announced (La Libre, 8 Sept 2025) it would leave Rue Rouge, "obsolete", for the former Red Cross building at **Rue de Stalle 96** (council minute). Geocoded -> city (-1256.8, 215.0), tile **D5**, UrbIS solid **549112** (489 m², base 33.87, eaves 57.91, top 60.77 m TAW). A March 2026 council minute says the merger of the six Brussels police zones changed the context substantially, so the move may not be final. Sources: [La Libre 2025-09-08](https://www.lalibre.be/regions/bruxelles/2025/09/08/nouveau-commissariat-pour-la-police-duccle-lancien-est-devenu-obsolete-SUAEKZ2VYNANRIVQBMFJWPCGQY/), [police council minute 2026-03-02](https://www.police.be/5342/sites/5342/files/media/file/2026-05/PV%20Conseil%20-%20Politieraad%202026-03-02.pdf), [Uccle council 2021 on a new commissariat](https://www.uccle.be/sites/default/files/filemanager/Legal/CC-GR/CC-2021-01-28-Interpellation.Question%20orale.DE_BOCK.HAYETTE.Nouveau_commissariat_de_police_U1180_fr.pdf).
- The zone's headquarters are at Square Georges Marlow (the name of the zone), a different place: also a candidate for a "police game" hub.

## Owner decision needed

1. Which one: **Rue Rouge 17** (today, next to Wolvendael: what the owner described) or **Rue de Stalle 96** (the future station, if the move happens), or both (the game could use today's and show the move later).
2. For a police game: the yard / garage and the vehicles (Belgian police livery: blue and white with yellow-fluorescent "battenburg"? check current livery), an interior (front desk, offices, cells?) only from public material.

## Next steps (when the owner says go)

1. References: Wikimedia Commons / Mapillary / Street View (look-only) of Rue Rouge 17; the heritage inventory if listed; the orthophoto for the footprint, the yard, the gates.
2. Measurements with `tools/hero_prep_measure.py --name police_rouge --tile E4 --sheet 148165 --solids 528055,...` (sheet to confirm), photo poses, façade-by-façade counts, then the hero method like the town hall / Van Buuren / Wolvendael.
3. For the game: police cars in the car kit (livery as material slots), a vehicle impostor via the impostor kit for far patrols.
