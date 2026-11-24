---
class: E
title: Tram rails into the sidewalk / kerb
row: | E. Tram rails into the sidewalk / kerb | `tramRails.mjs` | 48 runs, 421 m of rail on a raised class + 152 m in the kerb line (of 47.4 km of rail); FIXED (claude/tramfit): 7 runs, 26 m + 1 m (arc-length sampler, before 41 / 310 m / 109 m) | yes (92, Ch. d'Alsemberg E2 -887.5, -1051.8: 37.5 m) | `viewer/tileData.js` (OSM tram lines -> `viewer/track.js smoothPolyline`) + `viewer/main.js featureObjects` (rail top = max(drawn surface, profile)) | The OSM track lines are never fitted to the measured tram road / kerbs, and smoothing moves them further. Over a raised class the rail climbs onto it. |
---

### Worst spots

**E:** H2 Av. Winston Churchill (853, -1379.6) 178 m, (701.3, -1378.7) 121 m, (992.3, -1391.7) 46.5 m; I2 Churchill
(1246.3, -1437) 96 m; G2 Churchill (220, -1464) 49 m (Churchill: the tracks run beside the central promenade's paving.
Check whether UrbIS maps the reservation as sidewalk); E3 Ch. d'Alsemberg (-908.1, -551.4) 74 m; E5 Alsemberg (-943.1,
178.7) 50.5 m; B4 Ch. de Ruisbroek (-2334.4, -58) 47.5 m; E2 Alsemberg (-887.5, -1051.8) 37.5 m (image 92) and
(-834.5, -1284.8) 37.5 m.

### Fixed

- **E (claude/tramfit, rule 32 provisional, gate rows `tramrails` + `tramsnap`).** Cause: the OSM tram ways were
  drawn as they are (`viewer/track.js smoothPolyline` only rounds them, per tile) and nothing held them to the measured
  UrbIS street; OSM is ~0.3-1.3 m off (Ch. d'Alsemberg E2: a track 0.3 m from the tram road's kerb; Av. Churchill: the
  two tracks 3.7 m apart on a 4.75 m UrbIS tram site between paved medians), and the rail top = max(drawn surface,
  profile) climbs onto the paving. Fix: `tools/tramfit/build_tramfit.mjs` -> `data/tramfit/<T>.json` (33 tiles, 400 KB):
  the OSM ways chained across tile seams (as the tram profile), smoothed once, sampled every 0.5 m; per sample the
  offsets where both rails are clear of the DRAWN street's raised classes (the runtime class raster of every tile) and
  >= 0.2 m from every drawn kerb; a lateral offset per sample by projection sweeps from 0 (the smallest smooth move):
  inside that interval, two parallel tracks >= min(OSM spacing, 2.75 m), |o'| <= 0.05, |o''| <= 1/300 m, switch ends
  tied to the track they branch off; a track that would have to cross a kerb running > 20 deg to it (a site entrance,
  the Stalle terminus) is left as OSM draws it. Cut back into tiles (224 seam ends, all matched to 1 cm). The worker
  (`viewer/tileData.js` -> `track.js tramTracks`) swaps them in when the fit was made from that tile's OSM ways (a
  signature), so rails, wire + poles, the bridge deck, tram 92's snap, the parking / prop keep-clear all follow;
  `?tramfit=old` = before. Moves: 2.4 km of track moved, p50 0.17 m, p90 0.9 m, max 2.47 m (Ch. de Ruisbroek B4: the
  stubs along the Brussels sidewalk moved into the unmeasured Drogenbos side). Census (arc-length sampler; the first
  per-segment sampler counted dense bends twice: 421 / 152 m, `--persegment`): before 41 runs, 310 m raised + 109 m
  kerb (`docs/census/tramRails_old.json`), after 7 runs, 26 m + 1 m (`tramRails_fit.json`): the Rue de Stalle terminus
  crossing (B5, 18.5 m, the tracks cross the sidewalk into the roundabout: legit, left alone), the Saint-Job tram
  bridge's west end (H6, 9.5 m on the sidewalk polygon at the abutment), F1 1.5 m, H6 1 m ramp. Av. Churchill: UrbIS
  has the tracks on a tram site ("C") between paved medians (no promenade over the rails): fitted (centres 2.55-3.4 m apart, median 2.76 m, OSM had 2.8-3.7) and
  clean. Tram 92 (`tools/tramfit/tramSnap.mjs`): unsnapped points 1,920 = before, sideways step p99.9 0.36 -> 0.12 m,
  yaw rate p99.9 5.28 -> 5.32 deg/m, sub-18 m radii 245 -> 242 (browser turn: each fitted way keeps its OSM direction;
  chaining had reversed some, and tramline.js prefers the track running the shape's way, so tram 92 jumped 1 m across
  the Vanderkindere crossover, 6 deg/m in the browser). Found, not fixed (pre-existing, another
  class): 713 m of rail lie under an OSM tram platform as `tram.js` draws it (a 2.6 m band centred on the OSM line,
  often the platform EDGE in OSM): 688 m after the fit. Round 2 fixed it: `viewer/streets/tramPlatforms.js`
  `fitPlatforms` (tile worker, after the tracks) keeps every tram platform's track-side edge 1.25 m from the track centre
  (T3000 / T4000 2.30 m wide + ~10 cm boarding gap: ~0.5 m from the rail) by the smallest move: a line platform's band
  (OSM `width`, else 2.6 m) slides across point by point, an island between two tracks takes the gap minus both
  clearances (>= 1.2 m), an area platform's outline vertices are pushed out of the clearance on its own side; 63 of
  100 platforms moved, max 1.28 m. tram.js (slab, edges, shelters at its middle), the drive surface
  (`colliders.js tramPlatformSurface`, the band's width) and tram 92's platform segments read the moved ones; the STIB
  poles data/stops puts on a platform follow it (`platformFollow`, main.js; an area platform's pole sat on its outline,
  half off the slab: now 0.4 m in). Rail under a platform (census, as drawn): 705 m (`--old`) -> 0; platform poles off
  every platform: 44 -> 16 (no OSM platform within 3 m of them in their tile: data/stops, pre-existing).

- claude/defects1 (2026-11-24): platform poles off every platform 16 -> 0: such a pole is no longer kept as a platform
  pole (viewer/streets/tramPlatforms.js `platformUnflag`, `?platpole=old` / `--platold` = 16); it goes behind the kerb and
  streetProps.mjs checks it is out of the lanes. Rails: 26 m raised + 1 m kerb in 7 runs, unchanged (the Rue de Stalle
  terminus B5, the Carsoel deck's west end H6 872 524, F1 Churchill 1.5 m); the owner's Ch. d'Alsemberg spot is clear.
