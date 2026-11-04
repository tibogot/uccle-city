# vendor/stylized-trees: origin

From the owner's read-only engine **tibogot/game-engine-v1** (local checkout
`C:\Users\tibog\Downloads\game-engine-v1`; never edit it from here). Copied 2026-11-04.

| File here | Source path | Source state |
|---|---|---|
| `stylizedTrees.js` | `v3/fog-lab/stylizedTrees.js` | last commit `2cd67b6ccd27db5165d9993443a1e568c7f66a71` **plus the owner's uncommitted working-tree changes of 2026-11-04** (wind sway, fill light, custom crown `shape`, trunk colour), then the local changes in `CHANGES.md` |
| `branchTree.js` | `games/offroad/branchTree.js` | **untracked in the engine** (never committed) as of 2026-11-04, sha256 `177a42f760b3e15b…`; unchanged |
| `alphaCutout.js` | `v3/render/materials/alphaCutout.js` | commit `3d6493423807428b905eded87c233c01b0527715`, unchanged |

Engine HEAD when copied: `eeb5826bbccc42057946663ea5bc4c6e51ff1391` (2026-11-03).

The leaf mask the engine uses (`public/textures/leaves/Leaf-Billboard-Texture-1.png`, arborist preset
tree110) is **not** copied: its licence is not recorded in the engine. Uccle passes its own mask
generated in code (`viewer/treesStylized.js`, `params.leafMask`).

## Rules

- Edit only with an entry in `CHANGES.md`. Adaptation to Uccle lives in `viewer/treesStylized.js`.
- To update: re-copy from the engine, re-apply `CHANGES.md`, update this table.
- The upstream repo has no LICENSE file; it belongs to the same owner as this repo.
