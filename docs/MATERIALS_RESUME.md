> **2026-11-13: resumed and finished** (KTX2 all encoded, costs.json, Megascans list, docs/MATERIALS.md round 3, CREDITS, TODO). Kept for the history; the current state is docs/MATERIALS.md "Round 3".

# Materials round 3: RESUME NOTE (stopped 2026-11-12, the owner shut the computer down)

Branch `claude/materials` (worktree `.claude/worktrees/agent-a6a4e87d025603104`, lab on port 8809:
http://localhost:8809/labs/material-lab.html; the first lab at `?old=1`). `claude/foundation` merged in first (dc85521).

## Done (committed)

- **New review lab** `labs/material-review.js` (loaded by `labs/material-lab.html`; old lab `?old=1`): material list
  with badges (P / S n scans / M Megascans / M? on the shopping list / ms cost / verdict), 2-4 versions side by side
  on the same wall / roof slope / floor, same light (sun / shade / overcast / night), distance rows 1 / 10 / 50 / 200 m
  (toggle, up to 3 rows = near + far), STRAFE, SHIMMER meter per tile, cost bench button, "choose this" per tile,
  needs-work + note, localStorage + download verdicts.json; "town hall" view (A temp materials vs B library picks,
  loads viewer/townhallModel.js read-only) and "street" view (material-lab-city.js: city shaders today vs library).
  Renders only when something changed. Checked in Chrome (screenshots looked at: wall, town hall, street).
- **Shimmer fix** in `viewer/materials/patterns.js` + `library.js`: sin-free Hoskins hash on wrapped lattice ids (the
  old `fract(sin(dot(p,k))*43758)` of world coords x60 made the DIAGONAL streaks), every fine noise fades by its own
  frequency (`fadeF`), joints box-filtered over >= 1.5 px + softened, ANALYTIC relief (`pillow`, `lap`, `seams`,
  cobble domes -> `grad` -> world surface gradient) instead of screen-space derivative outlines.
  **Measured** (shimmer meter, strafe ~1.4 px/frame, threshold 0.04, brick_red_brussels, sun, ?before=1):
  10 m: before **69 926 ppm** -> after **64 ppm** (shipped scan 64); 50 m: 0 / 0 / 0; 1 m: 19 952 / 22 140 / scan
  3 060 (at 1 m the meter also counts thin real detail sliding by: read >= 10 m). Sub-pixel strafe (0.0006) gives 0
  everywhere (too gentle to discriminate).
- **Anti-tiling** `viewer/materials/antitile.js`: Mikkelsen 2022 hex-tiling (3 taps / map, explicit gradients,
  luminance-sharpened weights, per-tile tone); structured scans: no rotation, vertical offsets snapped to pairs of
  courses (lattice measured by candidates.py), isotropic: free offset + rotation. "hybrid" now = the anti-tiled scan;
  the scan fades to its mean only when a whole repeat is < ~8 px. Layers on scans: finish() weathering + per-tile tone;
  `asphaltLayers` (patches, cracks, `wet` low spots) on the asphalt scan; `seamLayer` on zinc / lead / copper scans.
- **New library materials**: roof_tiles_flat_dark, concrete_white, rockwork_concrete, lead_roof (existing slot names
  untouched). `weatherOpts(name)` for claude/weather's `weatherize()`.
- **Candidates pipeline** `tools/textures/candidates.py` (fetch / process / megascans) + `encode_ktx2.mjs --cand`;
  69 CC0 candidates for 23 materials fetched (data/raw, git-ignored) and processed (1K WebP in
  viewer/materials/textures/cand/, git-ignored) -> `viewer/materials/candidates.json` (committed: source, licence, size
  per repeat (bricks scaled to a 7.5 cm course), lattice, mean colour, bytes).
- `labs/flickerTest.js` copied from claude/stalle (eebd3d6) with a note + `pose` / `regions` / `noHeat` options.

## Half done (exact state)

- KTX2 for the candidates: **36 of 138 maps** encoded (viewer/materials/textures/cand/*.ktx2); the rest load as WebP
  (the lab falls back automatically, console warns 404). Resume: `cd tools/textures && node encode_ktx2.mjs --cand`
  (fast UASTC level 1 without RDO now, ~2.5 s per map; skips finished ones; writes the sizes into candidates.json).
- `viewer/materials/_before/` (NOT committed, local only): copy of the pre-fix library (0dd5655) for `?before=1`.
- Megascans: I had just started browsing fab.com (search works: `https://www.fab.com/search?q=quixel%20brick%20wall`
  lists "Brick Wall Worn", "Brick Wall", "Black Brick", ... with /listings/<uuid> links). **No shopping list written
  yet**; `tools/textures/megascans.json` (folder -> material, read by candidates.py megascans + the lab's M? badges)
  does not exist yet.
- Costs: no `viewer/materials/costs.json` yet (the lab's "cost ⟳" button measures one material; `lab.benchAll()` all).

## Next, in order

1. Finish KTX2 (command above), then in the lab run `await lab.benchAll()` (GPU noisy: alternate rounds), save the
   JSON as `viewer/materials/costs.json`, commit.
2. Megascans: browse fab.com (one short tab, screenshots only to the scratchpad `megascans_previews/`), write
   `docs/materials/MEGASCANS_LIST.md` (asset, Fab URL, material, why, priority must/nice; + a section for decals,
   foliage / weather / street-life surfaces, Sauvagère rocks, props) and `tools/textures/megascans.json`.
3. docs/MATERIALS.md: the new lab, layering strategy (scan base + procedural layers), anti-tiling, candidates,
   licence note (Megascans = Fab Standard License, files downloadable by web visitors: CC0 stays the public default
   until the owner checks), shimmer numbers, cost table. CREDITS.md: the 69 CC0 candidates (from candidates.json).
4. docs/TODO.md: review entry for the new lab + resume pointer.
5. Remove `viewer/materials/_before/` when the before/after is no longer needed.
6. Other heroes in the building view (Calevoet, Van Buuren, Stalle, police) read-only from their branches: not started.

## Open questions for the owner

- Scan tint: the lab tints scans 35 % toward the library colour by default (slider "scans: tint to library colour");
  raw scans (0) or tinted for the review?
- Brick scans are rescaled to a 7.5 cm course (Uccle brick + joint): OK, or keep each scan's own size?
- Megascans licence: may Fab-licensed textures ship in a public web build (files downloadable)? Until answered: CC0 only.
