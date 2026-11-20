---
number: 47
status: provisional
check: `engine`: tools/sound/engineTest.mjs (loops present, seams, bracket-crossfade sweeps through an emitter, a scripted 0-120 km/h drive, render through the chain, cost, garbage at idle and per write, muted by default, ?engine=old) + browser listening (mergeGate BROWSER "ENGINE")
---
**Rule.** A vehicle's engine is heard from a model of the engine, never from the speed alone: RPM from the wheels through a gearbox (shifts with a drive cut, a launch floor, the limiter, load from the pedal) playing recorded steady loops at fixed RPMs, the two around the RPM crossfaded at equal power and pitched only the few percent between them, the throttle and coasting sets crossfaded by load; a loop's seam and every crossfade are click-free (an isolated sample-level spike no sharper than the loops' own); the voice is a source of the city sound engine (its Doppler, panning, muffling, buses and the one speaker button), its AudioParams written per frame only when they moved, nothing fetched or built while the sound is off, nothing made by a frame (only the doubles boxed into the Web Audio calls), the main-thread cost < 0.05 ms a frame.

**Why.** the player car drove silent but for its tyres (2026-11-19): the drive mode's engineVoice slot was empty; porting Thunderline's engine showed its setIf helper and the model's arguments boxed ~20 doubles a frame, and its lift-off pops (annoying, owner) are left out. Found on the way: the city sound's listener facing was inside a comment (citySound.js hookCitySound): the listener never turned with the camera
