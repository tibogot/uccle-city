# Visual regression tour (run before every merge)

WHY: a merge hollowed out whole rows of buildings across the city (the wall repair's walls wound inward, culled:
`claude/holes`, docs/HOLES.md) and nobody saw it, because the merge checks looked at one spot. The tour boots ~20 fixed
viewpoints spread over Uccle, captures each one with deterministic settings, and compares them with a baseline taken
on `claude/foundation`. Anything that changes the picture shows up as a flagged view with a diff image.

Files (in git): `tools/tour/views.json` (the views + thresholds), `debug/tour.html` + `debug/tour.js` (the page that
runs the tour in ONE page load), `tools/tour/serve.mjs` (static server + saves the images), `tools/tour/compare.mjs`
(+ `png.mjs`). Images go to `.tour/<run>/` (git-ignored), never into git.

## The views (`tools/tour/views.json`)

Each view is a quick boot (docs/QUICKTEST.md: `?quick=1&place=..` or `&at=x,z,h&look=x,z,h&radius=..`) with the common
switches `quality=native&rscale=1&dynres=0` (full resolution, no dynamic resolution), `still=1` (below), `time=golden`
unless the view says otherwise, no traffic / birds / weather / trams (quick mode's defaults) unless the view needs them.

| id | covers |
|---|---|
| stjob-shops | Place Saint-Job shop fronts, the corner block (557601, hollow in the bug) |
| stjob-60m | Saint-Job from 60 m: roofs, church, square, gardens |
| ham-terrace | Rue du Ham, ordinary terraced street |
| vanderkindere-terrace | Rue Vanderkindere, 1920s-30s red-brick fronts, oriels, shops (midday) |
| brugmann-maisons | Avenue Brugmann townhouses |
| coghen-blocks | Avenue Coghen red-brick blocks with long balconies |
| churchill-blocks | Avenue Churchill apartment blocks (midday) |
| f3-loggia-blocks | F3 block 538418 from 25 m (loggia fronts: the hollow-front case) |
| orange-villas | Avenue du Prince d'Orange villas, hedges, gardens, piers (midday) |
| defre-villas | Avenue De Fré villas behind garden walls / piers |
| waterloo-fortjaco | Chaussée de Waterloo shops at Fort-Jaco |
| vivier-bridge | Chaussée de Waterloo over the railway at Vivier d'Oie, from 30 m |
| stjob-station | Saint-Job station: the road deck over the platforms, tram stop |
| stjob-railbridge | the Saint-Job hero rail bridge, from 28 m |
| stpierre-parvis | Parvis Saint-Pierre setts + the church (landmark, cobbles) |
| cortenbosch-lane | Cortenbosch herringbone lane, 1990s houses, painted words |
| lycee-front | Lycée Français front (curtain wall, railings) |
| police-station | the police station from 30 m (the `police` place puts the camera inside a house) |
| wolvendael-park | Parc de Wolvendael from 70 m |
| far-300m | from 300 m: far ring tiles (`far=2`), impostors |
| night-vanderkindere | Rue Vanderkindere shops at night (`time=night`) |
| traffic-alsemberg | Chaussée d'Alsemberg with traffic + parked cars (looser thresholds: moving cars) |

Add a view: one entry `{ id, what, q: { ...URL switches }, tol? }`. Take a new baseline afterwards (below).

## Determinism

- `?still=1` (viewer/lighting.js): the clouds, cirrus and volumetric fog do not drift (Firmament's wind 0 from the
  first frame). Without it the cloud field and its shadows depend on how long the boot took.
- The tour holds three's TSL clock (`renderer._nodes.nodeFrame.time`) at a fixed value before settling: tree wind,
  water, flags give the same frame whatever the boot length.
- Settle: at least `minFrames` frames and `minMs`, until the eye adaptation is converged (exposure within 0.4 % of its
  target for 10 frames), at most `maxMs`. Then `renderFrame()` + `drawImage` in one task (as debug/quick.js `shot()`),
  scaled to views.json `size` (1280 x 720) whatever the devicePixelRatio.
- Fixed CSS size of the city frame (an iframe of 1280 x 720, scaled to fit the window), one Chrome tab, same machine.
  compare.mjs warns when the two runs' devicePixelRatio or GPU differ.

## Running it (coordinator, before a merge)

Browser rules: ONE Chrome tab (reuse it), nothing else heavy on the GPU. Server port 8837.

1. **Baseline** (once per foundation commit; reuse it while foundation does not move):
   ```
   node tools/tour/serve.mjs --root C:/Users/tibog/Downloads/uccle-city      (foundation checked out there)
   ```
   open `http://localhost:8837/debug/tour.html?run=foundation` and poll `window.__tour` every 10 s
   (`{ state, i, n, current, results }`; `state` becomes `done` / `done-with-failures`). The server prints every image.
2. **The branch**: run the tour on the MERGE RESULT (foundation + the branch, e.g. a temp worktree where the branch was
   merged without committing, or the branch after merging foundation into it): it must contain the tour (`still=1`)
   or its clouds drift. Stop the server, restart it with `--root <that checkout>`, open
   `.../debug/tour.html?run=<branch>`.
3. **Compare**: `node tools/tour/compare.mjs foundation <branch>` prints the table and exits 1 when a view is flagged.
   Open `.tour/<branch>/_vs_foundation/report.html` and LOOK at every flagged view (baseline | run | diff: changed
   pixels in red, the grid cells over the cell threshold boxed in yellow). A flagged view the branch did not mean to
   change = do not merge. Console errors in a view are flagged too.
4. Only some views: `...tour.html?run=x&only=stjob-shops,far-300m` (`&skip=` too); compare reports the missing ones as
   flagged.

`node tools/audit/mergeGate.mjs` lists this as its manual browser step.

## Thresholds (views.json "thresholds", a view's "tol" overrides)

| metric | what | flag when |
|---|---|---|
| pixel | per-pixel change counts when its largest channel difference is over this (0-255) | (24) |
| pixels | % of the image's pixels changed | > 1.0 % |
| cell | worst cell of a 16 x 9 grid (80 x 80 px): % of its pixels changed: catches LOCAL changes (one hollow front) | > 8 % |
| ssim | mean SSIM of luma over 8 x 8 blocks | < 0.985 |

traffic-alsemberg: pixels 6 %, cell 40 %, ssim 0.93 (cars move). Noise floor measured (two foundation runs): see below.

## Updating the baseline after an intended change

After the merge of a branch whose flagged views were checked and meant: take a new baseline on the new foundation
(step 1, `run=foundation`, overwrites the folder), or keep dated ones (`run=foundation-<commit>`) and compare against
the right one. Never "fix" a flagged view by loosening a threshold without saying why in the merge message.

## Measured

(filled in after the determinism runs)
