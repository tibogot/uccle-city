# vendor/firmament: origin

The engine's global sky, **Firmament**, copied unchanged from the owner's read-only engine
**tibogot/game-engine-v1** (`v3/render/firmament/`, last commit touching it
`cda72d0bc8941cdbf4adf0528570de57bf57e3f9`; the folder matched HEAD when copied on 2026-11-04).

Firmament is a fork (2026-11-01) of the engine's Sky Pro, itself built on **Tidewater** — MIT License,
Copyright (c) 2026 DRG Software Solutions LLC: see `LICENSE-tidewater` (copied from
`v3/skypro-real/tidewater/LICENSE`).

The cloud noise volumes it fetches at start, `/clouds/baseShape64.bin` and `/clouds/blueNoise.bin`
(from the engine's `public/clouds/`, Sky Pro's procedural noise, same licence), live in the repo
root's `clouds/` folder because `firmamentClouds.js` loads them from the site root
(`import.meta.env.BASE_URL || "/"`).

## Rules

- Do not edit these files (log any unavoidable change in a `CHANGES.md` here). Uccle's adaptation
  lives in `viewer/lighting.js`.
- To update: re-copy the folder from the engine and update the commit above.
