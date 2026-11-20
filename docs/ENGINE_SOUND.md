# Engine sound (claude/engine, rule 47)

The player car (our hatchback, the police estate) has an engine you hear. Fast-lane scope from 2026-11-20: the player car only, with Thunderline's own loops. Traffic engines, our own renders, the granular squeal and the two-wheelers come later (see "Next").

## How it works
- **Model:** `viewer/audio/engineModel.js` is Thunderline's engineModel.js ported (the owner's game-engine-v1, read-only source).
  - It turns the car's speed and pedal into RPM, gear and load.
  - 6 gears. Each upshift cuts the drive for 0.13 s (the clutch is out, the load drops).
  - There is a launch floor in 1st, free revving in the air, a landing dip and the rev limiter.
  - Ours adds a throttle-dependent upshift point: 2,600 rpm with a light foot, 6,300 rpm flat out.
  - The constants are for a city car (`ENGINE_CAR`): idle 850, redline 6,600, gear tops 52 / 88 / 124 / 160 / 196 / 232 km/h, wheel radius 0.317 m (carCtl). At our top speed (144 km/h) the car is in 5th at about 4,800 rpm.
- **Loops:** `viewer/audio/engineLoops.js` is Thunderline's engineLoops.js ported.
  - It plays 9 RPM points (1000-8200 rpm), with an on-throttle set and a coasting set.
  - The two loops around the current RPM are crossfaded at equal power, and pitched by playbackRate = rpm / loopRpm.
  - Load crossfades the throttle and coasting sets (equal power). It also opens the low-pass (3.5 kHz coasting, up to about 16 kHz flat out at high RPM), behind a +4 dB presence shelf.
  - The grit exciter (HP 700 Hz, drive, tanh, HP 3 kHz) makes the top end the loops lack.
  - On the limiter the level is chopped about 18 times a second.
  - **The lift-off pops are not ported** (the owner found them annoying in Thunderline).
  - Each AudioParam is written only when its value moved (gain 1e-3, rate 0.1 %, tone 0.4 %). The last written values live in a Float64Array, and every write is inline.
- **Player hookup:** `viewer/audio/engineSound.js` is the drive mode's `engineVoice` slot. `hookCitySound` (citySound.js) sets it unless `?engine=old`.
  - The voice is ONE source of the city sound engine (viewer/audio/engine.js), so it gets:
    - Doppler from the delay line;
    - HRTF or equal-power panning, and the reverb send;
    - the traffic bus and the compressor;
    - the speaker button.
  - It is never routed straight to the destination.
  - RPM and load are written every frame, because a 0.13 s cut needs more than the engine's 10 Hz control rate.
  - Nothing happens while the sound is off. The loops (1.65 MB) are fetched on the first frame driven with the sound on, after the city sound has started. The graph (18 sources + 9 nodes) is built when the source gets its voice.
  - Two-wheelers and the Villo: the source goes inactive. They keep `viewer/moto/motoAudio.js` for now.
- **Switch:** `?engine=old` gives no engine tone, as before. It has a row in features.js (A/B, Sound).

## Fixed on the way
- The city sound's listener never turned with the camera. The `L.fx / fy / fz` assignments in `hookCitySound`'s `listener()` sat inside a `//` comment. They are now real code.

## Checks
- **Gate row `engine`:** `node --expose-gc tools/sound/engineTest.mjs`, rule 47. It runs headless, with tools/sound/miniWebAudio.mjs. It checks:
  - the loops are present;
  - no click at any seam;
  - the bracket crossfades, by sweeps at load 1 / 0.5 / 0 through an emitter: the most isolated spike was 1.99 against the loops' own 1.81;
  - a scripted 0-120 km/h drive: 4 upshifts, every cut takes the load under 0.3, RPM within 4 % of the wheels in gear, coasting load 0.02 at 0.3 s after the lift, back to idle;
  - a render through the emitter chain;
  - cost: 0.0006-0.004 ms a frame, against a budget of 0.05;
  - garbage: 0 B a frame parked at idle; driving, only the doubles boxed into the Web Audio calls (about 50 B a write, 5 writes a frame);
  - muted by default, with nothing fetched;
  - `?engine=old`.
- `--demo file.wav` renders a 32 s city drive. The owner's clip: `C:/Users/tibog/Downloads/uccle-sound-clips/engine_player.wav`.
- The shift cuts' fast load swing makes a sharper-than-usual transient in the render (an isolated spike of about 5-6). It is reported as information, not gated. Constant-load sweeps through every bracket stay at the loops' own level.
- **Browser:** the mergeGate BROWSER line "ENGINE".

## Credits
- **Loops:** `sounds/engines/gen6/**`. They are Thunderline's renders, made with enginesound 1.5.0 (MIT, github.com/DasEtwas/enginesound) from its example6.esc plus an off-load variant (gen6.esc / gen6_off.esc, copied next to them). They are our own output. The recipe is in game-engine-v1 `games/thunderline/assets-src/engines/README.md`.
- **Code:** ported from the owner's Thunderline (`games/thunderline/proto/kit/engineModel.js`, `engineLoops.js`).
- See CREDITS.md, "Sounds".

## Next (not in this round)
1. Traffic engines for the nearest few cars (only the active bracket: 2 points x on / off), RPM from the sim's speed and acceleration.
2. Our own loop sets: petrol hatch, diesel van, bus, motorbike, scooter.
   - The enginesound CLI is downloaded outside the repo: `C:/Users/tibog/Downloads/tools-dl/enginesound/enginesound-cli.exe`, with its examples in `tools-dl/enginesound/src/`.
   - A Python environment with soundfile (FLAC) is in `C:/Users/tibog/Downloads/tools-dl/pyaudio-venv`.
   - The crossfade for slow engines: at most 8 whole cycles, capped near 1 s (the 8-cycle recipe breaks below about 990 rpm).
3. The granular tyre squeal: Thunderline sfxSamples.js grains(), squeal_core_a = BigSoundBank #2371, CC0. It should follow the slide angle and the brake lock, and replace the motorbike's noise screech.
4. The two-wheelers on their own loop sets, from motoPhysics' rpm.
