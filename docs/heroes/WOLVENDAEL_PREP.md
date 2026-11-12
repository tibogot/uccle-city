# Wolvendael: preparation for two hero models (2026-11-10, nothing modelled yet)

Parc de Wolvendael, Uccle (tiles E4 / F4). Two buildings worth a hero model, plus the park's pond (the setting of
the best photos):
1. **Château de Wolvendael** (18th century, built for the Vanderborght family, later the Mosselman du Chenoy;
   today the École d'art d'Uccle). White rendered house, mansard roof.
2. **Pavillon Louis XV** (18th century, from Amsterdam: dismantled and rebuilt stone by stone in the park in 1909
   by the owner Léon Janssen; today a café). Carved blue stone, lead dome. A small, very rich Rococo jewel.
(Facts: fr.wikipedia "Parc de Wolvendael", read 2026-11-10; to confirm with the heritage inventory.)

## 1. Sources

- Photos: `data/raw/refs/wolvendael/` (git-ignored; list + licences in `SOURCES.md`), Wikimedia Commons:
  - château: `w00` (Edison McCullen 2026, CC BY 4.0, snow), `w01`–`w04` (Donarreiskoffer 2019, CC BY-SA 4.0: the
    pond-side façade from several angles, very good), `w15` (postcard, public domain, older state);
  - pavilion: `w13` (Jean-Pol Grandmont 2012, CC BY-SA 3.0: frontal, full size 3648 px), `w14` (Michel wal 2011,
    CC BY-SA 3.0);
  - park only (lawns, paths, trees): `w05`–`w12`: useful for the park, not the buildings;
  - NOT Uccle: `w16` (postcard "Brusseghem. Château de Wolvendael": the Wolvendael in Brussegem, a different
    house): excluded.
- Measured: `tools/hero_prep_measure.py` (UrbIS 3D solids + DSM / DTM 2021, CC0):
  `--name wolvendael_chateau --tile F4 --sheet 148165 --solids 537523,538880` and
  `--name wolvendael_pavilion --tile E4 --sheet 148165 --solids 537211` -> `models/<name>/site.json`.
- Located from OSM: the château is way 226143353 (building=castle, ref:UrbIS 5015047, wikidata Q118235454); the
  pavilion from the Commons photo's camera position (17 m from solid 537211).
- To find: the heritage inventory sheets (both are listed), Mapillary on the park paths, Street View for colours.

## 2. Measured

| | Château (solid 537523 + annex 538880) | Pavilion (solid 537211) |
|---|---|---|
| footprint | 358 m² (+ 27 m² annex) | 157 m² |
| base / eaves / top (m TAW) | 46.93 / 57.91 / 63.90 | 61.02 / 64.32 / 69.93 |
| DSM inside (p50 / p90 / max) | 61.25 / 62.83 / 64.19 | 65.93 / 68.40 / 72.57 (trees over it: read the dome from the photo) |
| ground around | 46.8–50.0 (3 m slope: the pond side is lower) | 60.9–64.5 (steps up to it) |
| plan orientation | −33.6° | +26.8° |

So: château eaves ~11 m above the lowest ground (two full storeys + a raised ground floor), mansard to ~17 m;
pavilion ~3.3 m to the cornice and ~9 m to the top of the dome lantern.

## 3. Façade by façade (first read; counts to verify on the full-size files)

**Château, pond side (w01–w04):** white render with stone quoins / pilaster strips and a string course; a main block
plus a wing to the right (its own hipped roof, slightly set back). Main block: a central projection of three bays
with three round-arched French windows on the ground floor (steps up to them) and straight windows above; the
other bays: tall windows with grey louvred shutters on the ground floor, smaller windows on the first floor; the
lettering "École d'Art d'Uccle" between the floors. Mansard in grey-blue slate with a dormer over each bay (about
5 on the main block, more on the wing), two tall rendered chimneys with clay pots. Roughly 13 bays in all: count on
the full-size photo. The other façades: only the snow view `w00` (a corner) and the postcard: the entrance side will
be partly ESTIMATED (Street View / Mapillary first).

**Pavilion, front (w13, w14):** carved blue stone (petit granit). The front is concave between two angle piers: a
central round-arched double door (dark green-blue joinery) with a carved, pierced rocaille overdoor; two tall arched
windows each side (four, the outer ones in the slightly forward wings); rocaille cartouches, garlands and shells over
every opening and in the frieze; a moulded cornice with stone urns on the corners; a lead (grey) dome with ribs,
an ogee profile and a lantern carrying a small figure. Steps across the front, two stone vases on pedestals. The
sides and back: not in the photos (Mapillary).

## 4. Parts and slots

Château: render walls, stone quoins / strings / sills / surrounds (`stone_white`), shutters (`wood_painted_grey`),
windows (`wood_frame_white`, `glass_window`), mansard slate (`slate`, the chapel's roof generator), zinc rolls and
dormer cheeks (`zinc_roof`), chimneys (render + clay pots), steps (`stone_blue`). New library names to propose:
`render_white_lime` (if `render_white` is not close), `wood_painted_grey`.
Pavilion: `stone_blue` everywhere (carved), `lead_roof` (new name), `wood_painted_green` (joinery), `glass_window`.
The rocaille carving is the hard part (see 5).

## 5. Difficult bits / risks

1. **The pavilion's rocaille carving.** It is sculpture, like the Stalle statue (still not good enough after three
   rounds). Options for the owner: (a) scripted relief (curves swept along cartouche outlines, shells as fans of
   ribs, garlands as chains of leaves) plus a baked normal map for the finest detail; (b) a CC0 / CC BY photogrammetry
   scan if one exists (no scan of this pavilion is known); (c) simplified ornament with strong normal maps. My
   recommendation: (a) with the detail in normal maps, judged in the lab on the full-size photo.
2. The château's render and its weathering must not look like a flat white box: the town hall's anti-sparkle
   region-width filter for quoins and strings; dirt / rain streaks under sills.
3. The pond: reflections like the photos need the pond-water work from the slop-newyork audit (planar reflection
   or SSR on calm water); worth doing together with the château, it is half of the picture.
4. Trees right over the pavilion (the DSM max is the trees): the LiDAR tree placement must not put a trunk through it.
5. Mesh checker clean, the owner's no-bad-shading rule, named slots, photo poses before modelling.

## 6. Next steps (when the owner says go)

1. Full-size originals of w01–w04, w13, w14; heritage inventory; Mapillary for the other sides.
2. Camera poses (w02, w13) and overlays in a lab; window / bay counts on the full-size photos; roof parts from the
   DSM dump (`--dump`).
3. Château first (simpler, big presence, the pond), then the pavilion (the carving needs an owner decision on 5.1).
