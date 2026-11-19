# Engine sound (WIP, claude/engine, paused 2026-11-19)

Status: research done, no code yet. This page holds the plan so the job can resume.

## Found
- enginesound CLI 1.5.0 (MIT, DasEtwas) downloaded OUTSIDE the repo: C:/Users/tibog/Downloads/tools-dl/enginesound/enginesound-cli.exe
  (sha256 b5a3e699...7384). The tool's example*.esc, LICENSE, main.rs, gen.rs sit in tools-dl/enginesound/src/. example6.esc == Thunderline gen6.esc.
- Python venv with soundfile 0.14 (libsndfile 1.2.2, FLAC encoder) and numpy: C:/Users/tibog/Downloads/tools-dl/pyaudio-venv.
- CLI crossfade: fade_len = cf/2 samples, output = len - cf/2; use fade_len = k engine cycles (k = min(8, floor(0.97 / (120/rpm)))) so the join is in phase (Thunderline's 8-cycle recipe breaks below ~990 rpm: the bus).
- Bug seen in viewer/audio/citySound.js hookCitySound listener(): the `L.fx = ...` assignments sit inside a `//` comment, so the listener forward never updates. Fix in this job.
- Rule number: 47 is the next free (43-46 claimed on gates / props / trafmix / ground).
- miniWebAudio has no decodeAudioData: the gate needs a small JS FLAC decoder (fixed + LPC + rice/escape).

## Plan
1. viewer/audio/engineModel.js: Thunderline engineModel port, per-vehicle configs (hatch 5 gears 800-6200, van diesel 780-4400, bus 6-cyl 580-2300, moto 1350-11800 from motoPhysics, scooter CVT), throttle-dependent upshift, no allocation.
2. tools/sound/engines/render_engines.py: .esc generator (gen6 template, pipe-length scale, diesel = higher ignition_factor / shorter ignition_time / more vibration), off-load .esc, render 9 RPM x on/off, normalise per set (on 0.12 RMS, off -6 dB), pack each engine as ONE FLAC bank + JSON manifest in sounds/engines/ (tools/asset_hashes.mjs: add "sounds" dir + flac).
3. viewer/audio/engineLoops.js: one buffer per engine, loopStart / loopEnd per loop; player = all 18 sources (Thunderline), traffic = active bracket only (2 points x on/off, hysteresis); load low-pass, grit exciter, limiter chop, pops not ported; setIf via Float64Array.
4. Player: driver.engineVoice from hookCitySound, a pool source in the city engine (Doppler / HRTF / occlusion / traffic bus), per-frame drive; moto / scooter use c.rpm, MotoAudio engine + noise screech scaled to 0.
5. Traffic: engine part inside the tyre voice for the 4 nearest cars; van_c / van_p -> van, moto / scooter own sets, others hatch.
6. Granular squeal (Thunderline grains(), squeal_core_a, BigSoundBank #2371 CC0) by slide angle + brake lock / handbrake.
7. ?engine=old features row; tools/sound/engineTest.mjs gate row `engine` (seams, bracket clicks, scripted 0-120 drive, voices, cost < 0.05 ms, zero allocation, muted default).
8. Demo clips to C:/Users/tibog/Downloads/uccle-sound-clips/engine_*.wav.
