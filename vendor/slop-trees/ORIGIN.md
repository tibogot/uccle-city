# vendor/slop-trees: origin

The tree system is taken from **mrdoob/slop-newyork** (MIT, © Mr.doob; see `LICENSE` in this folder).

| | |
|---|---|
| Source repo | https://github.com/mrdoob/slop-newyork |
| Source commit | `737b7691e273c9b736dfe27d10c391db783041c9` |
| `trees.js` | `js/trees.js`. Only change: its material import now points at `./tree-material.js` |
| `building-collision.js` | `js/building-collision.js`, copied unchanged (`trees.js` imports it) |
| `tree-material.js` | Extracted from `js/tsl-materials.js` lines 1357–1484, copied unchanged between the markers. Outside the markers: imports, `hash2D`/`noise2D` (copied unchanged), and `canyonSkyAONode`, which is replaced by a constant 1 (the original models Manhattan street canyons) |

## Rules

- Do not edit these files without logging it in `CHANGES.md` (one change so far: shared assets). Adaptation lives in `viewer/treesSlop.js`, which maps our LiDAR trees
  (`trees` field, CONTRACT 0.7) onto slop-newyork's species and sizes.
- To update, re-copy from a newer upstream commit and update the hash above.
