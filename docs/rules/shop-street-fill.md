---
status: provisional
added: 2026-11-26
check: `shopfill` (tools/audit/shopFillCheck.mjs: F the fill fronts, D the density, C the curated fronts)
---
**Rule.** On a shop street every ground floor is a shop. tools/streetlife/build_streetlife.py, after the real (OSM / extra)
shops are placed, gives a generic front to each street face of a building standing on the sidewalk (<= 5 m to the kerb)
on a stretch with >= 3 real shops of the same street within 45 m, with no shop of its own (85 % of them: some doors lead
to the flats above): a trade word on the fascia in our own lettering (BOUTIQUE, COIFFURE, À LOUER, IMMOBILIER...), never an
invented brand. A known shop wears its real name, its real colours and its real sign type from a look-only Street View
check (data/shops/terraces.json: board / ink / lit box / blade / awning / letters on the facade), no copied logo; a big
chain (Kruidvat, TUI, Pearle and every future one) keeps its REAL name and its real colours in our own lettering, never its logo: owner decision 2026-11-26, settled, later rounds do not ask again. `--fill old`:
no fill.

**Why.** Reality round 2026-11-26 classes C2 and C3: on Rue Xavier De Bue, the Chaussée d'Alsemberg, the Chaussée de
Waterloo at Vivier d'Oie and Fort-Jaco and the Parvis Saint-Pierre every ground floor is a shop, the city drew only the
OSM ones (about a third), and those with a generic dress (TUI in red, Kruidvat's red unreadable, "Bleu d'encre" as OSM
spells it). 290 fill fronts city-wide; Rue Xavier De Bue 9.6 -> 12.1 fronts per 100 m.

**Downstream (merge 2026-11-26).** Every street-life rebuild that adds or moves fronts must refresh what is fitted to
the fronts: the ivy's no-grow rects (`node tools/plants/build_ivy.mjs --all --shops`, row zfight ivyShop) and the
Christmas site (`python tools/christmas/build_site.py`: the swags on the drawn fronts, the wreaths >= 3 m from every
shop front, row xmas). The first fill merge skipped both: ivy over 3,140 fill-front cells, 73 fronts the site did not
know, wreaths on fill fronts.

