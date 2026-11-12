# Merge plan (prepared 2026-11-12; nothing merged)

How the branches waiting for the owner's review go into `claude/foundation` once approved. Each merge happens only
after the owner's "OK" on that page. Checked with `git merge-tree` against foundation (`5a2f…` era, 2026-11-12) and
by comparing which files each branch changes.

## 1. Status of every waiting branch

**Already merged / nothing new** (0 commits ahead; can be deleted later): capsule, car-faceted, cars, church, drive,
falcons, interior, interior-fix, perf-panel, roads-surface, smooth-lod, townhall, townhall2, tram.

**Merge cleanly today** (no conflict): flags, foliage, hero-prep, impostors, materials, minimap, pedestrians, police,
roads2, sauvagere, smallfixes, sound, stalle, streetlife, tree-lab, tree-textures, vanbuuren, weather, wolvendael.

**Conflicts, all in shared bookkeeping files** (easy, by hand, keep both sides):
| branch | conflicting files | nature |
|---|---|---|
| traffic | viewer/main.js | both add a `?flag` hook near the same lines |
| facade-kit | viewer/main.js, .gitignore | hook + ignore lines |
| observatory | viewer/main.js, labs/index.html, .gitignore | hook + lab card + ignore |
| saint-pierre | viewer/main.js, labs/index.html, .gitignore | hook + lab card + ignore |
| furniture | viewer/main.js, labs/index.html, HANDOFF.md, docs/TODO.md | old branch (153 behind) |
| trains, tram2, verrewinkel | labs/index.html | lab cards |
| nightlights | docs/TODO.md | notes |
| character-audit, character2 | .gitignore (+ the other chat owns them) | leave to the character chat |

No conflict touches real rendering code except the `main.js` hooks (each branch adds its own `?flag=1` block).

## 2. Branches that build on each other (merge the base first)

- `police` contains `hero-prep` + `wolvendael` -> merge **hero-prep, wolvendael** first (or police brings them).
- `vanbuuren` contains `hero-prep`.
- `nightlights` contains `smallfixes` (the night fix) -> **smallfixes first**.
- `verrewinkel` contains `trains` -> **trains first** (then verrewinkel is small on top).
- `stalle`, `vanbuuren`, `wolvendael`, `police` each carry a copy of `tools/mesh_audit/` + `labs/flickerTest.js` +
  `labs/frameStrip.js`: identical or near-identical; merge **stalle first** (the source), then the others merge the same
  files cleanly or with trivial differences.

## 3. Real code overlaps to watch (same source files changed by two branches)

| pair | shared code | what to do |
|---|---|---|
| roads2 x traffic | viewer/main.js, viewer/tileData.js, worker bundle | merge roads2 first, then traffic adapts to `buildRoadData` (noted by the roads agent: traffic takes `rd.net`); rebuild the worker bundle |
| roads2 x trains | viewer/main.js, viewer/tileData.js, worker bundle | the deck-as-ground change on verrewinkel touches road data too: after roads2, re-run the road checker at the bridges; rebuild the bundle |
| smallfixes x nightlights | viewer/lamps.js, lighting.js, treesStylized.js | nightlights already contains smallfixes: no conflict if smallfixes goes first |
| tree-lab x tree-textures | docs/TREES.md and images (same base) | tree-textures was built on tree-lab's base: merge tree-lab, then tree-textures |
| facade-kit x (clean-buildings pass) | viewer/facadeGeom.js | do the clean-buildings fix AFTER the facade-kit merge |
| tree branches x impostors | none today | the trees switch to the impostor kit (`?impkit=1`) after both merges |
| materials x heroes | none today | after the materials merge, flip each hero's one-line `SOURCE` switch to the library |

## 4. Suggested merge order (as approvals come)

1. **Low-risk, standalone:** smallfixes (night fix), sound, flags, minimap, impostors (lab), pedestrians (lab), weather
   (lab), foliage (lab), streetlife (lab), hero-prep.
2. **Materials** (then flip the heroes' material source one by one).
3. **Heroes:** stalle (brings the mesh checker) -> vanbuuren -> wolvendael -> police -> saint-pierre -> observatory.
4. **Facade kit** -> then the **clean-buildings pass** (crack, black line, flicker).
5. **Roads v2** -> **traffic** (adapt to the new road data) -> **trains** -> **verrewinkel** -> tram2; rebuild the worker
   bundle and re-run the road checker after each; then the **bridges / underpasses** job.
6. **Trees:** tree-lab -> tree-textures -> switch to the impostor kit.
7. nightlights (after smallfixes; wiring into the city is a later step).
8. furniture (old branch: rebase or re-check first).

After each merge: syntax check, the tile worker bundle rebuilt when worker code changed, a city load at a few tiles,
a moving check (no new pops / flicker), and the owner's flag (`?xyz=1`) still opt-in until he says default.
Nothing is pushed to Vercel without the owner's word.
