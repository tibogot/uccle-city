# vendor/roads — origin

Copied unchanged from the read-only reference repo **tibogot/game-engine-v1**.

| | |
|---|---|
| Source repo | https://github.com/tibogot/game-engine-v1 |
| Source commit (HEAD when copied) | `60e7f4378ae929e3867f152ff50ea0c791ad02c4` (2026-10-29) |
| Last commit touching `v3/roads/` | `94c15e338d3f47d27322ecf3cf19f1437f65b9d2` |
| Copied paths | `v3/roads/**` → `vendor/roads/**`, `v3/road-lab.html` → `vendor/roads/road-lab.html` |
| Copied on | 2026-11-02 |

`diff -r` against the source showed no changes. The only difference is the added
`road-lab.html` (and this file).

## Rules

- **Do not edit files here.** To update, re-copy from a newer upstream commit
  and update the hashes above. Any adaptation lives in our own code (e.g.
  `src/roads/`), which imports from here.
- The upstream repo has no LICENSE file. It belongs to the same owner as this
  repo (tibogot). Get the owner's go-ahead before publishing it anywhere else.

## Known path quirk

`road-lab.html` imports `./roads/lab/roadLabApp.js`, because upstream it sits
one level above `roads/`. Copied as-is it does not resolve from inside
`vendor/roads/`. To run the lab, serve a folder that has `road-lab.html` next to
a `roads/` link pointing at `vendor/roads`, or open it through the small wrapper
a later session adds. Don't change the copied file.

`mesh/triangulate.js` imports `three/src/extras/lib/earcut.js`, so the 3D
viewer needs `three` resolvable (import map or bundler). Everything else here
is plain ES modules with no dependencies. Upstream says these modules also run
in Node (`roadMath.js` header). That claim has not been checked in this repo yet.
