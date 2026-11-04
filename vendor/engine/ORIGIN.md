# vendor/engine: origin

Copied unchanged from the owner's read-only engine **tibogot/game-engine-v1** (local checkout
`C:\Users\tibog\Downloads\game-engine-v1`; never edit it from here).

| File here | Source path | Last source commit touching it |
|---|---|---|
| `parallelPipelines.js` | `v3/render/parallelPipelines.js` | `606a4aa20b30cab34279d5681116a5b560feb614` |
| `pipelineWarmup.js` | `games/shared-rts/pipelineWarmup.js` | `606a4aa20b30cab34279d5681116a5b560feb614` |

Source HEAD when copied: `eeb5826bbccc42057946663ea5bc4c6e51ff1391` (2026-11-03). Copied on 2026-11-04.

Both rely on three r187 internals (`backend.createRenderPipeline(renderObject, promises)`,
`renderer._pipelines.isReady`); checked to exist in three@0.187.0. Re-check on a three upgrade.

## Rules

- Do not edit these files. Adaptation lives in `viewer/warmup.js`. To update, re-copy and update the hashes.
- The upstream repo has no LICENSE file; it belongs to the same owner as this repo.
