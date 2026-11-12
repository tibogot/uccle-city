# Moulin du Nekkersgat (Nekkersgatmolen): reference check -> NOT modelled (2026-11-12)

Rue Keyenbempt 66, on the Geleytsbeek (OSM names the stream Geleytsbeek, not Ukkelbeek). OSM way 36347372
(man_made=watermill) = UrbIS solids **518200** (the L of the long range + the north-east range, base 31.07, eaves 35.86,
top 43.4) and **516481** (a small outbuilding north of it, base 33.54, top 39.5). Measured with
`tools/hero_prep_measure.py --name nekkersgat --tile C6 --sheet 146164 --solids 518200,516481` -> `site.json`
(frame origin city (-1836.53, 815.79), rotation 25.62 deg). NB the brief's (-1655, 648) is Avenue Nekkersgat, ~250 m
south-east; the mill itself is at city ~(-1838, 820), the commune's info panel (EXIF GPS of Nekkersgatmolen 01) at
(-1851, 836).

## Why it was dropped (the brief's stop rule)
- Free photos: ONE usable (n03, 2018: the south front of the long range + the cross-wing's gable). The 1975 photo is dark,
  through trees, pre-restoration brick. The two 2023 files are the info panel.
- Never seen in any source reachable here: the north-east range's two long sides (half of the building), the courtyard
  faces, the north side, and the WATER WHEEL reconstructed in 2013 (position, diameter, buckets, race) - the defining
  element of a watermill. Street View (look-only) covers only the lane by the gable; it does not enter the courtyard.
- Proportions alone would be reliable (UrbIS + DSM 0.5 m), but well over half the faces and the wheel would be invented.
- Next candidate (2) Église du Précieux-Sang: ONE Commons photo (2018, portrait) -> thinner still. Switched to (3) the
  Uccle-Calevoet station building (40 Commons files, 2007-2025, several sides): see models/calevoet_station/.

## If someone resumes the mill
Needed: photos of the courtyard side, the north-east range and the wheel (e.g. ask the "Le Moulin du Nekkersgat" asbl,
or the regional heritage file once the Uccle inventory is online). The site plot (ortho / nDSM / DTM with the stream) is
quick to redo with the measure tool; the stream runs open south of the long range and under its east corner (culvert).
