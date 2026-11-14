# Storeys: empty upper floors on house façades (owner 2026-11-14)

Branch `claude/storeys`, 2026-11-15. Owner: "a lot of houses only have windows and interior at the floor level, and some
are very empty at the first or second floor level". Switch: **`?storeys=old`** = everything as before (dev panel, A/B:
old versions, "fitted storeys"). Default: on.

## 1. The scan (city-wide, measured)

`tools/storeys/scan.mjs` builds all 120 tiles in node exactly as the tile worker does (`tools/roadfix/tile.mjs`) and
reads every wall face `viewer/facadeGeom.js analyseBuildings` lays out (a spy façade kit sees every face). Faces that can
carry windows: not a landmark, not a whole party wall, >= 1.6 m wide, eaves >= 2.8 m. Window rows counted with
`viewer/interior/facadeWindows.js faceOpenings` (= the shader's grid):

```
node --import ./tools/road_audit/register.mjs tools/storeys/scan.mjs [TILES...] [--out file.json]
```

| | what |
|---|---|
| rowsRaw | rows under the BUILDING's eaves, fixed storeys, raw base (lowest DTM point): before the ground fit |
| rowsFix | the same over the ground-fit line: **today** (`?storeys=old`) |
| rowsFace | fixed storeys under the FACE's own eaves |
| rowsFit | fitted storeys under the face's own eaves: **this branch** |
| n | the storeys that fit the face's real height (`storeyFit(faceEaves).n`) |

## 2. Causes (all 120 tiles; 46,224 street faces, 161,202 window faces in all)

| street faces | count |
|---|---|
| fewer window rows than storeys that fit the wall (today) | **30,589 (66 %)** |
| ground floor only (or nothing) although 2+ storeys fit | **20,429** |
| ... the same before the ground fit | 18,936 |
| rows lost to the **building-wide eaves** (cause 1) | **27,161** |
| rows lost to the **fixed storey heights** (cause 2) | 6,909 |
| rows lost to the **ground fit** (cause 3) | 4,677 |
| window rows drawn: before ground fit / today / fixed storeys on the face's eaves / fitted | 65,679 / 61,114 / 111,191 / **117,771** |
| storeys that fit (sum of n) | 117,775 |

1. **The building-wide eaves (the main cause).** `pipeline/build_buildings.py` sets `b.eaves` = the LOWEST roof vertex of
   the whole building. A rear annex, a porch roof, a bay's roof or a dormer's foot puts it at 3-5 m, and every face of
   the house used it: a 7 m front with a 4.5 m annex at the back showed its ground floor only, the wall above blank
   ("above the eaves = blank by design"). Rue du Ham: the west terrace's eaves 4.35-5.85 m while the fronts reach
   6.5-8 m. 9,211 street faces had NO window at all (building eaves < 2.8 m).
2. **Fixed storeys.** Ground floor 3.4 m, then 3.0 m, and a storey drawn only if its whole window fits 0.35 m under the
   eaves: a storey whose window missed by a few cm was dropped. A 6.0 m house (the most common two-storey front) got
   one row: the first-floor window needed 6.12 m.
3. **The ground fit** (docs/GROUND_FIT.md, merged 2026-11-14): the ground-floor line moved up to the pavement at the
   front door (up to ~3 m on slopes) while the eaves stayed: 4,677 street faces lost a row (65,679 -> 61,114 rows). Real
   (the house's own height above its door is smaller), but it pushed many faces under the fixed-storey threshold.

## 3. Fix

All behind `?storeys=old` (`viewer/main.js` entry flag `storeys` -> the worker; the shader reads the URL).

1. **The face's own eaves** (`facadeGeom.js`, first pass): the lowest point of the face's top edge, sampled every
   0.4 m across the face (0.2 m in from its ends) — a front under a pitched roof = its top, a gable = its corners, a
   wall rising above a lower annex roof = its own top. `faceEaves = max(building eaves, that)` (never lower than
   before). Sampled only where the face rises over the building's eaves. Goes to the shader (`aWall.w`) and the kit
   (`f.eaves`; `f.eavesBld` = the old value, for the scan).
2. **Fitted storeys** (`facadeWindows.js storeyFit`, `facades.js storeyK`, KEEP IN SYNC): span = eaves - 0.3 m (the
   top storey's ceiling under the eaves line), n = round(span / 3.25), n - 1 if that makes the storeys lower than the
   minimum; all storeys scaled by one k (ground storey stays 3.4 / 3.0 = 1.13 x the upper ones), k clamped to
   0.87-1.2 (upper storeys 2.6-3.6 m, ground 2.96-4.08 m), quantised to 1/128 (exact in float32: shader, JS and the kit
   agree to the bit). The window proportions (sill 0.27/0.29, head 0.77/0.79 of the storey), the door (0.72 of the
   ground storey), French windows (storey floor + FRENCH_SILL) and the "whole window under the eaves" rule are unchanged
   — the latter never drops a storey now (fitBelowN: 4 of 46,224 street faces, clamped tiny faces).
   In the shader k is computed per VERTEX (one varying: the face's eaves is a per-face constant); the fragment cost
   change is two multiplies (G, S = k x constants instead of constants).
3. **The façade kit uses the same storey lines** (`placement.js`): `faceOpenings` gets `fit`, the French window starts
   at the fitted first-floor line, the string course (`BAND_Y`) sits at 3.4 k; the kit glass (which repaints the
   painted window's room / curtains through the pane) gets k packed in `aKitF.y` = width + 256 x (128 k - 100)
   (`kitMaterials.js` decodes it). Kit houses and painted houses agree (docs/storeys/kit_close_after.jpg).

Worker: `node tools/build_worker.mjs` rebuilt. Façade analysis cost (node, I6 / E4, 3 runs each, busy machine): within
the run-to-run noise (I6 617-739 ms old vs 709-896 ms new; E4 806-880 old vs 640-713 new).

## 4. Proof images (docs/storeys/, `*_today` = `?storeys=old`, `*_after` = default, same camera)

| shot | camera | today | after |
|---|---|---|---|
| stjob | Place Saint-Job, `?at=1175,540&cam=1102,542,1.7` | corner brick block: ground floor only, blank above | 4 window rows |
| ham | Rue du Ham, `?at=1219,700&cam=1213,640,1.7` | west terrace and east houses: ground floor only | 2-3 rows on both sides |
| montagne | Montagne de Saint-Job (slope), `?at=1124,722&cam=1149,668,1.7` | red house: 2 rows, top storey blank | 3 rows |
| defre | Avenue De Fré, `?tile=E4&at=-445,-469&cam=-392,-478,1.7` | villa on the left: blank | ground + first floor, door |
| alsemberg | Chaussée d'Alsemberg, `?tile=E4&at=-909,-438&cam=-912,-300,1.7` | shops, blank walls above | 2-3 rows over the shops |
| aerial | Rue du Ham from above, `?at=1195,600&cam=1260,660,22` | terrace: ground floor only | full fronts |
| rear_after | backs of Rue du Ham, `?at=1205,680&cam=1165,700,14` | | windows on the walls over the annex roofs, on the storey grid |

Defect eye (all shots): no new z-fighting, shimmer, black faces or stretched textures; the new rows use the same
box-filtered grid (no new edges); the kit's pieces sit on the painted cut on fitted storeys.

## 5. Street View (looked at only, nothing stored or traced)

| street | real | today | after |
|---|---|---|---|
| Place Saint-Job (no. 3, looking east) | the corner block ground + 4 floors, the brick house ground + 1 + dormer | ground floor only | 4 rows on the corner block |
| Rue du Ham (no. 6, looking south) | east: brick villas ground + 1 + attic; west: 3-4 storey blocks | ground floor only | 2 rows east, 3 west |
| Montagne de Saint-Job (no. 20) | brick house ground + 2 floors | 2 rows | 3 rows |
| Avenue De Fré (no. 12) | 4-5 storey blocks (right), villas behind trees (left) | blocks right, villa blank | blocks right, villa ground + 1 |
| Chaussée d'Alsemberg (no. 819) | shops + 2-3 floors of windows everywhere | shops, blank walls | shops + 2-3 rows |

## 6. Leftovers

- **Downhill plinths**: the ground fit leaves the wall below the ground-floor line as blue stone where the ground falls
  away: 2,174 street faces > 1.2 m, 464 > 2.2 m. A basement storey there needs the local ground per pixel (the shader
  only knows the face): not done. Candidates: a per-face "garden level" code packed in a free bit, or the kit's
  soupiraux on painted faces too.
- **Interior pilot** (`?interior=1`, maison1, I6): its model was built with the fixed storeys (2 rows); its face now
  fits 3 storeys (eaves 8.58 m): rebuild `models/interior/maison1` (`tools/interior/houseSpec.mjs`) or keep the pilot
  on `?storeys=old`.
- Tall single faces built from several parts of different heights (merged coplanar) keep the lowest part's eaves.
- n uses one step (3.25 m) for every house: a 7.9-8.2 m front reads as 2 tall storeys (k = 1.2), 8.5 m as 3 low ones.
- GPU ms not measured: preflight RED the whole session (another agent's Blender at ~100 % CPU, Figma on the GPU).
