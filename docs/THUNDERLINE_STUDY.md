# What Uccle can take from Thunderline (game-engine-v1)

This is a read-only study of the owner's engine at C:/Users/tibog/Downloads/game-engine-v1, done on 2026-11-19. Nothing there was changed, and nothing in that repo may ever be modified. Thunderline uses the same stack as Uccle (three ^0.187, WebGPURenderer + TSL), so most of it ports without rework.

## Ranked shortlist

| # | What | Thunderline files | Value | Effort |
|---|---|---|---|---|
| 1 | Engine model: RPM, 6 gears, 0.13 s shift with a throttle cut, launch wheelspin floor, limiter, load, air behaviour | games/thunderline/proto/kit/engineModel.js (pure JS) | high | 2-3 h |
| 2 | Recorded-loop engine (see below) | proto/kit/engineLoops.js, public/sounds/thunderline/engines/gen6/** | high | 1-2 days |
| 3 | Uccle's own engine renders (diesel van, city petrol, bus) with enginesound + an off-load .esc | games/thunderline/assets-src/engines/README.md, gen6*.esc | high | half a day per engine |
| 4 | Tyre marks (see below) | proto/kit/tyreMarks.js, modular-road-v3/modularRoadTireMarks.js (MARK_LOOK) | high | half a day to 1 day |
| 5 | Granular drift / brake squeal following the slide ANGLE; CC0 wind loops | proto/kit/sfxSamples.js grains(); public/sounds/thunderline/sfx-candidates/ (CC0 BigSoundBank) | high | half a day |
| 6 | Tyre smoke (see below) | proto/kit/tyreSmoke.js, public/textures/fx/firepro/fp_tyreSmoke_* | high | 1 day |
| 7 | Chase camera feel (see below) | modular-road-v3/chaseCamera.js, proto/kit/carTune.js | high | half a day |
| 8 | Arcade grip curve + carve + drift state + pedal "balance" | proto/kit/arcadeCar.js (ARCADE, _groundDrive) | medium-high | 1-2 days |

Runners-up:
- the procedural rain lens (modularRoadRainLens.js: screen-space TSL, no particles);
- ghost / replay as recorded poses (ghost.js);
- gamepad shaping (gamepadInput.js: deadzone rescale, steerGamma 1.5);
- eased slow motion on one world clock (modularRoadSlowMo.js);
- sparks (sparks.js);
- exhaust shift puffs (exhaustFx.js);
- drift score (driftScore.js);
- drive trails (driveTrails.js);
- the jolt recorder (joltRecorder.js);
- LED dot-matrix signs for bus / tram destinations (ledSigns.js).

## Shortlist details

**#2 Recorded-loop engine.**
- Loops: 9 RPM points × an on-throttle and an off-throttle set, 1 s loops of 18 × 96 KB WAV. They are rendered with the enginesound CLI (MIT), so the audio is our own.
- Crossfades: equal-power between RPM brackets and between on / off load.
- Pitch: playbackRate = rpm / loopRpm, so only a few percent of shift.
- Tone: a load-driven low-pass, plus a "grit" exciter (HP 700 → tanh shaper → HP 3 kHz) and a limiter chop.

**#4 Tyre marks.**
- One ring-buffer ribbon, laid along the contact normal.
- Slip is measured in the wheel's own frame.
- The front wheels mark only past the countersteer lock.
- Touchdown scuffs after a jump.
- A soft alpha mask on the texture.
- To add for Uccle: a fade by age, and the wet "cleared line" variant.

**#6 Tyre smoke.**
- One instanced draw; the motion is analytic in TSL.
- A six-way lit motion-vector flipbook.
- Soft fade into the road plane.
- Emission follows the wheel's path, so the trail doesn't break into blobs at speed.

**#7 Chase camera feel.**
- Speed FOV: +18°·(v/ref)².
- Impact shake moves the camera, not its rotation (0.13 m, 15-29 rad/s, 0.16 s decay, 0.045 s attack).
- A launch FOV kick.
- The boom follows the velocity, so a drift shows the car sideways.

## Notes for porting into Uccle
- Engine sound:
  - Route Thunderline's engine master into Uccle's emitter chain (viewer/audio/engine.js): it has Doppler, HRTF and occlusion, which Thunderline lacks.
  - For traffic, instantiate only the active RPM bracket, or use the AudioWorklet synth (engineWorklet.js) for far cars.
  - The slot is the drive mode's `engineVoice` (claude/sound, merged).
- Write audio params only when they change (setIf / rampIf with an epsilon), build voices lazily, and suspend the context while muted.
- Thunderline's tyre marks use DynamicDrawUsage. **Uccle forbids it** (r187 re-uploads such buffers whole every pass): use static buffers + needsUpdate + addUpdateRange.
- Knockables: Thunderline borrows bodies from a pool only near the car (modularRoadCityKnockables.js), the same idea as claude/props.
- Licences:
  - The engine loops: renders from an MIT tool, so ours.
  - The sfx samples: CC0.
  - public/textures/skid_mark01.png: origin unknown. Ask the owner, or make our own.
  - The smoke flipbooks were baked in-house with vendor/fire-pro: check that simulator's licence.
- keepPipelines.js touches three's internals; it is fragile across versions.

The full study report (constants, file and line references) is in the coordinator session of 2026-11-19. This page is the summary.
