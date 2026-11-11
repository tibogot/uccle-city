# vendor/slop-sound: changes from upstream

1. 2026-11-11, `audio-synthesis.js`: `export` added to `randomSequence`, `normalizeLoop`, `combustionBuffers`
   (were module-private) so `viewer/audio/` can reuse them. No behaviour change.
2. 2026-11-11, `audio-events.js`: `export` added to `randomSource`, `makeBuffer`, `speechFragment`, `horn`,
   `gustBuffer`. No behaviour change.
