---
status: provisional
added: 2026-11-26
check: `bldclass` (tools/audit/bldclassCheck.mjs: A evidence files and sources; B the census; F Montjoie + 5 Street View true balcony blocks)
---
**Rule.** A building's type comes from evidence before any period draw. `data/bldclass/<T>.json`
(tools/bldclass/build_evidence.py, from the Brussels heritage inventory's facts and OSM) gives a solid its era
(pre-1919 / 1919-45 / post-war, from a build year or a dating style), an institution (school, church, hospital, convent,
civic: an OSM building tag, an OSM school / hospital / worship site, the inventory's "etablissement scolaire") and a
street prior (its dated neighbours within 40 m); viewer/buildingTypes.js classify reads it (doc._bldclass,
applyBuildingEvidence in viewer/tileData.js, near and far). A balcony block (TYPE.BLOCK) needs post-war evidence or the
form's draw: never an institution, never anything dated before 1946, never a row front or small block (< 350 m2) under a
steep pitched roof (>= 70 % of the roof at >= 35 deg). A house's record (maison bourgeoise, villa...) or a record that
says nothing about what it is never dates a tall (> 17 m) or deep (> 450 m2) solid. `?bldclass=old`: the form-only draw.

**Why.** Reality round 2026-11-26 class C1 (owner: "the Montjoie school buildings are not at all like this"): the
classifier saw only form, so 1,856 solids wore post-war balcony slabs, 191 of them (per BU group) under steep pitched
roofs, Institut Montjoie among them. The Street View spot-check of the first rule set found three wrong changes, each now
a clause: Av. Churchill 123 (a 9-storey post-war block took the Eclectic house beside it: house records never date a tall
block), Av. Churchill 242 (a 2010s balcony block over a bare 1913 record: records must say what they are), Av. du
Chateau de Walzin 13 (a 1970s-80s residence with balconies under a steep tiled roof: the steep-roof clause is for row
fronts and small blocks only). Census after: balcony blocks 1,539, steep-roofed ones 17 (2 dated post-war, 15 big
free-standing blocks left to the draw), 577 buildings changed type or wall.

**Round 3 (the wall).** The evidence also dates the wall: an inventory style of the eclectic / Beaux-Arts / Flemish
neo-Renaissance / regionalist families draws red brick with white stone bands (15 % the dark klinker), a neoclassical
one pale stone (cream); a dated pre-1946 or old-street maison de maitre with no style word leans brick (60 % red, 15 %
klinker, 25 % render). Street View (look only): Av. Churchill 4, Rue Alphonse Renard, Rue Edith Cavell 143 are the
check's wall fixtures; Avenue Brugmann 291's turret house now brick; Avenue Brugmann 304 (1938 modernist, beige tile)
still draws red (a modernist style dates no material: render or yellow brick).
