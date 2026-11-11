# vendor/slop-sound: origin

The procedural sound code of **mrdoob/slop-newyork** (MIT, (c) Mr.doob; see `LICENSE` in this folder).
Copied as data from a shallow clone; his code was never run in place (no npm install).

| | |
|---|---|
| Source repo | https://github.com/mrdoob/slop-newyork |
| Source commit | `536a907c605964421563f12f15c5e00d735fc94f` (2026-11-06) |
| `audio-synthesis.js` | `js/audio-synthesis.js`: shared noise + impulse, combustion engine loops by cylinder count, rotor, turbine, bicycle, siren, `createMotorVoice`, `setControlRate` |
| `audio-events.js` | `js/audio-events.js`: footstep, speech fragments (glottal pulse + 3 formant resonators), horn (two reeds), crash layers, gust control loop, pedestrian-signal ticks, wind voice |
| `audio-system.js` | `js/audio-system.js`: `SpatialEmitter` (HRTF panner + muffling low-pass + shared reflection send), voice pools with limits, 10 Hz update |
| `audio-sources.js` | `js/audio-sources.js`: nearest-sources ranking (bounded insertion) |
| `audio-acoustics.js` | `js/audio-acoustics.js`: obstruction by tracing building boxes (3 rays), enclosure by 8 rising probes |
| `building-collision.js` | `js/building-collision.js`, unchanged (`audio-acoustics.js` imports it) |

What we use (imported by `viewer/audio/`): `setControlRate`, `combustionBuffers` (car engine loops),
`horn` (car horn), `speechFragment` (playground children with child speaker settings), `gustBuffer` (wind
gusts), `randomSource`/`randomSequence`, `makeBuffer`, `normalizeLoop`. The spatial emitter, the ranking, the
obstruction trace and the 10 Hz control-rate design are re-written in `viewer/audio/engine.js` after his
(cited there), because ours adds HRTF/equal-power switching, Doppler by propagation delay, categories and
priorities. `audio-system.js`, `audio-sources.js`, `audio-acoustics.js` are kept for reference only.

## Rules

- Do not edit these files without logging it in `CHANGES.md`.
- To update, re-copy from a newer upstream commit and update the hash above.
