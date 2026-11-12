# Sound (branch claude/sound): procedural city sound, lab only

Everything you hear is generated in code with the Web Audio API: no audio files (the WAVs in
`docs/sound/renders/` are our own offline renders, for listening only). Nothing is in the city yet: the
**Sound Lab** (`labs/sound-lab.html`) is a small walkable scene with every sound, a panel per sound
(our `viewer/panelUI.js`), a mixer and the costs. `labs/sound-render.html` renders each test scene offline.

```
python3 -m http.server 8765      # from the repo root
open http://localhost:8765/labs/sound-lab.html        # click once (browsers need a gesture for audio)
open http://localhost:8765/labs/sound-render.html     # offline renders, listen in the page
```
Lab keys: WASD walk, Shift run, drag to look, M map view, B car horn, T tram bell, N mute. Listener
"go:" buttons jump to the street (setts), the side-street corner (muffling), the tram stop, the inside of the
R 18 m curve, the park (gravel / boardwalk / leaves), the playground, the rail line, under the tower.

## Files

| | |
|---|---|
| `viewer/audio/engine.js` | `SoundEngine`: category buses (traffic, transit, nature, people, bells) -> mix -> compressor -> master; one shared `ConvolverNode` with generated impulse responses (street canyon / park / open); spatial emitters; ranked voice allocation; control-rate updates; offline clock |
| `viewer/audio/util.js` | DSP kit for baking: `bake()` (DC removal, end fades, normalise), one-pole, RBJ biquad, modal resonator `Mode`, pink noise, Poisson times, `smoothParam` |
| `viewer/audio/footsteps.js` | footsteps by surface (6) and gait (walk / run), 8 baked variants each |
| `viewer/audio/vehicles.js` | car voice (engine by RPM + load, tyres by speed + surface, brake squeal), doors, horn |
| `viewer/audio/transit.js` | tram 92 voice (rumble, curve squeal, motor whine, auxiliaries), bell, doors, stop chime; AM08 train voice, joint clacks, two-tone horn |
| `viewer/audio/ambience.js` | wind / city hum / rain beds, six bird species + activity by hour and month (+ sunrise at Uccle), church bells, dog, playground |
| `viewer/audio/sims.js` | small simulations turning a car / tram / train / birds / bells / dog into sources and events (shared by the lab and the renders) |
| `viewer/audio/renders.js` | the offline test scenes (27) + 16-bit WAV encoding |
| `viewer/audio/bakeWorker.js`, `bake.js` | bakes all banks in a Web Worker (same synth code with a stand-in context), transfers the arrays back |
| `labs/sound-lab.html/.js`, `labs/sound-render.html` | the lab and the render page |
| `tools/sound/` | `save_server.py` (dev: POST target for renders), `pack_renders.py` (mono / trims into docs), `analyze_renders.py` (spectrogram sheets + numbers), `check_occlusion.mjs` |
| `vendor/slop-sound/` | Mr.doob's audio code, copied (MIT), see `ORIGIN.md` / `CHANGES.md` |

## What we took from Mr.doob (slop-newyork 536a907, MIT)

Copied into `vendor/slop-sound/` unchanged except `export` added to 8 module-private functions (logged in
`CHANGES.md`). **Used directly**: `combustionBuffers` (the car engine: twenty four-stroke cycles of
per-cylinder exhaust pulses with a pipe resonance, two RPM banks), `horn` (two-reed car horn),
`speechFragment` (glottal pulses through three formant resonators; we feed it child speakers for the
playground), `gustBuffer` (the gust control loop), `setControlRate`, `randomSource`. **Re-written after his
design** (cited in the code): the spatial emitter (low-pass muffling + direct gain + a reverb send), the
obstruction trace (three parallel rays through building boxes) and the 8-probe street-canyon "enclosure", the
10 Hz control rate with k-rate params, the gearbox logic of his sedan voice, the idea of one shared short
convolution. **Ours**: HRTF only for the nearest voices with equal-power beyond (cross-faded), Doppler from
the real propagation delay, ranked allocation with priorities over continuous sources AND one-shots, category
buses, generated IRs per environment, the offline clock, worker baking, sliced updates, lazy layers, and all
the sounds below except the engine and horn.

## Each sound: method

**Footsteps** (`footsteps.js`). A ground-reaction-force envelope (Farnell, *Designing Sound*; Turchet,
Nordahl et al., DAFx 2010: foot = exciter, ground = resonator): heel strike, roll, toe push-off for a walk;
one harder, shorter forefoot strike for a run. Surfaces: *pavement* = band-split noise heel/sole/scuff (his
footstep as the base); *setts* = a hard click through four granite modes (1.5-4 kHz, 20-35 ms), a second
click in 45 % of steps (a sett rocking), sand grit on the scuff; *gravel* = PhISEM-style grains (Cook): Poisson
micro-impacts whose rate follows the force, each a band-passed 1.3-7 kHz burst, plus a low crunch; *grass* =
a damped low thud and a flickering 2.6-9 kHz blade swish, no click; *wood* = a hollow deck (six board modes
150-2150 Hz) hit by heel and toe, one step in six creaks (stick-slip pulse train); *leaves* = a dense heavy-
tailed broadband crackle (sub-ms grains), a rustle band, a soft thud. Variation: 8 variants per surface/gait,
never the same twice in a row, +-4 % rate, +-2 dB, left foot softer. Driven by a step event (the lab fires
one every 0.74 m walking / 1.15 m running).

**Cars** (`vehicles.js`). Engine = Mr.doob's combustion loops played at rpm / 1200 (petrol 4-cyl or diesel
4-cyl), low-passed by RPM + load (650 + 0.24 rpm + 1800 load Hz), level by load, plus the valve/injector
clatter loop; RPM from speed x gear ratio (5 gears) with shift points 2.0-3.6 k rpm by throttle (city
driving), torque-converter slip at low speed, engine braking when coasting; or a manual RPM (panel). The
test car loops idle (3 s) -> pull away through the gears -> cruise 50 km/h (5 s) -> brake -> stop. Tyres:
one broad band around 0.9 kHz (the CPX tyre/road spectrum), level ~ v^1.5 (~30 log v); on setts +8 dB and an
impact train at v / sett pitch (9-16 cm setts: ~85 Hz at 10 m/s) through tyre / body modes (95, 230, 820 Hz),
baked at 4 and 12 m/s and cross-faded (built only once the car is on setts). Brake squeal: a baked
one-shot (3.1-3.8 kHz with vibrato) when braking under 4 m/s, on some cars. Doors: latch clicks (2.9 / 4.7 kHz
modes) + panel thump (68 / 142 / 310 Hz modes) + trim rattle (close); latch + seal pop (open). Horn: his two
reeds (~370-410 + 465-520 Hz with harmonics). Doppler pass-by: the emitter's delay line = distance / 343 m/s
(measured: a 1 kHz tone passing at 20 m/s reads 1058 Hz approaching / 942 Hz leaving; exact Doppler 1062 / 945 - a
delay line driven by the current distance gives 1 + v/c instead of 1 / (1 - v/c), ~0.4 % low at 72 km/h, 1 % at 120).

**Tram 92** (`transit.js`). Rolling = pink noise low-passed at 380 Hz (embedded grooved rail = a rumble)
+ a 1.15 kHz rail "ring" band, level ~ v^1.5; the Silence-project measurements on a Brussels Flexity say
track noise dominates on straight track, so this is the base layer. Curve squeal = two wheel-mode tones
(panel: 1250 Hz with its 2nd harmonic, and 3240 Hz) gated by a random stick-slip process (bursts 0.2-1.8 s,
~50 % duty) when curvature > 1/60 m and speed > 1.5 m/s, scaled by both, plus a 5 kHz+ flanging hiss
(literature: squeal is tonal at a wheel mode, < 1 kHz to ~5 kHz; flanging noise broadband 5-10 kHz). Motor
whine = an inverter carrier (~1.4 kHz triangle) frequency-modulated by 2x the motor's electrical frequency
(sidebands that move with speed) + a gear-mesh whine at ~78 Hz per m/s, both scaled by |tractive effort|
(accelerating or regenerative braking), silent when coasting. Auxiliaries (HVAC fan band + 100 Hz hum)
always on (what you hear at a stop). Bell: two strikes of a small cup bell (partials 1, 2.32, 4.25, 6.63,
9.38; panel: 1046 / 784 Hz), rung before the curve and when leaving the stop. Doors: five 2.4 kHz warning
beeps, the leaf motor, the close thump. Stop chime: two soft mallet notes (1318 -> 1046 Hz). The tram is two
sources 28 m apart (front with traction, rear). *The T3000's real bell, beeps and chime are not documented
anywhere we found: the panel exposes the pitches; the owner should compare with the real tram.*

**Trains, SNCB AM08 on L124 / L26** (`transit.js`, `sims.js TrainSim`). Three 27 m cars, one rolling
source each (pink noise: low rumble < 250 Hz + a wheel/rail roughness band 0.8-1.1 kHz rising with speed,
level ~ v^1.5; aerodynamic hiss ~ v^3), traction whine on the two motored end cars. Wheel clacks: rail joints
/ switches are fixed points; every bogie crossing one fires a two-axle clack (rail + wheel modes 180 Hz-4.9 kHz)
AT the joint, 2.6 m / v apart, so the "ta-dum ... ta-dum" rhythm follows the real axle layout (bogie
centres 4 and 23 m into each car). Horn: a pneumatic two-tone (asymmetric reed pulse through a flare
resonance near 1.8 kHz, onset pitch rise), UIC 644 nominal tones 660 Hz then 370 Hz (*the AM08's actual horn is
not documented; UIC 644 / EN 15153-2 values*). It rides with the train, so it is Doppler-shifted (measured
715 / 404 Hz approaching at 120 km/h; exact Doppler ~730 / 409, the delay-line model ~724 / 406).

**Ambience** (`ambience.js`).
*Wind*: a stereo bed (two channels at different gust rates). Open = a broad low "whoosh" (pink noise
band-passed 260-710 Hz by wind speed, darkened at 1.1 kHz) whose level follows Mr.doob's gust loop cubed
(gusts swell ~ +-12 dB). In trees = leaf rustle: high-passed noise 2.2-9 kHz amplitude-modulated by a fast
random "flicker" loop (many leaves) and by the gusts; the mix follows the listener's distance to trees;
walls shelter it (enclosure). *City hum*: pink noise low-passed at 300 Hz + a weak 700 Hz band (an urban
background falls ~5 dB/oct above ~250 Hz), slow minute-scale swells, quieter at night. *Rain*: drops after van
den Doel (2005): a bubble of radius r rings at ~3/r kHz with a rising chirp and damping 0.13 f + 0.0072 f^1.5;
most impacts make only a broadband tick; ground = ticks + puddle bubbles; roofs = ticks ringing one of four
tile banks (no single tonal ring); under trees = few large drips (1-2 kHz bubbles) + leaf patter; light vs
heavy = drop rate x4 + a hiss wash; the mix follows the listener (trees, enclosure = roofs). Layers exist
only while it rains. *Birds*: six species synthesised from field-guide song shapes and published sonograms
(sines with pitch contours, harmonics, AM / noise where the bird is harsh): blackbird (fluted 1.5-3.5 kHz
notes, then a squeaky 5-8 kHz twitter), robin (thin quick warble 2.5-8 kHz with trills), great tit ("tea-cher":
~5 kHz then ~3.7 kHz, every 0.45 s), wood pigeon (five soft hoots ~330 Hz "coo-COOO-coo, coo-coo"), magpie
(harsh chatter ~12 pulses/s), carrion crow (3-4 harsh "kraa" ~0.35 s, f0 ~550 Hz through formants). Activity
per species by hour and month: a dawn peak around sunrise (computed for Uccle with the NOAA solar equations,
CET/CEST), a dusk peak, daytime level, seasons (blackbird Feb-Jul, robin all year except the Jul-Aug moult,
great tit Jan-Jun, wood pigeon Mar-Oct, corvids all year) - approximate, from Belgian / UK bird guides.
Birds sit on the trees and sing as one-shots; the dawn chorus emerges. *Church bells*: modal synthesis
of a tuned bell: partials at 0.5 (hum), 1 (prime), 1.183 (tierce), 1.506 (quint), 2 (nominal), 2.514, 2.662,
3.011, 4.166, 5.433, 6.796 x the prime (measured-bell ratios, Hibbert / "Strike tone"), each a slightly split
doublet (the warble), hum and prime ringing longest, the quint short, the nominal a bright burst, plus the
clapper clank; the hour = n strikes 2.6 s apart (Saint-Job tower in the lab; Saint-Pierre 1.5 km away, later
and darker). *The real bells of Saint-Job and Saint-Pierre are not documented online: the primes (262 / 233 Hz)
are guesses on the panel.* *Dog*: 1-3 barks, a voiced burst with f0 falling 550 -> 330 Hz, jittery pulses +
noise through formants ~0.9 and 2.3 kHz, from a garden (muffled by the houses). *Playground*: Mr.doob's speech
fragments with child speakers (f0 255-330 Hz, formants x1.24-1.35), overlapping, plus shouts, shrieks and
laughter, as two 8 s loops at the playground, daytime only.

## Spatialisation, mixer

- **Distance**: `PannerNode` inverse law from each source's reference distance; a range fade; air absorption
  as a low-pass `max(1.2 kHz, 19 kHz x exp(-d / 260 m))`.
- **HRTF near, equal-power far**: the 8 nearest voices within 60 m get HRTF, the rest equal-power (hysteresis:
  +20 % radius, +2 ranks; swaps are 0.25 s cross-fades between two panners, because the two models differ in
  timbre at the far ear). One-shots close to the listener (footsteps) get HRTF.
- **Doppler**: a `DelayNode` per moving source with delay = distance / 343, linear ramps between control steps
  with the position extrapolated one step ahead. Horns and bells ride with their vehicle.
- **Muffling behind buildings**: three parallel rays listener -> source (0.9 m apart) through the building
  boxes (slab test incl. height), 3-4 Hz per voice; obstruction 0..1 -> direct gain x(1 - 0.8 o) and low-pass
  x0.07^o; the reverb send is untouched (sound comes round corners). In the city the boxes would be the drive
  colliders' 48 m cells (as Mr.doob uses his collision grid).
- **One shared reverb**: one `ConvolverNode`, impulse responses generated per environment: *canyon* (flutter
  between two facades every 2w/c, then a tail RT60 1.3 s that darkens over time), *park* (diffuse, 0.7 s,
  dark), *open* (a few far reflections, 0.45 s); unit-energy IRs so the send sets the level; per-voice send
  ~ sqrt(ref / d) (the direct/reverb ratio is the distance cue). Auto: 8 rising probes measure the street
  enclosure (> 0.35 = canyon), park when in the park, else open; a swap dips the return for 90 ms.
- **Voice limit with priorities**: every control step the sources are ranked by priority x gain x ref / d
  (a held voice ranks 30 % higher so the cut-off doesn't churn); the top (limit - active one-shots) get voices,
  the rest are released (graph torn down). A new one-shot steals the lowest-ranked voice only if it ranks
  higher (horns, bells, the train horn have priority 3; footsteps 2.5; birds ~1). Default limit 40.
- **Mixer**: master, 5 categories with gain + mute (the category's reverb send is muted too), a compressor
  before the master. Performance folder: audio main-thread ms per second, control-step ms, voices (HRTF /
  equal-power), events / beds, stolen / dropped, environment, latencies, an offline benchmark.

## Cost (measured 2026-11-11, Chrome, this laptop; another agent's Pedestrian Lab tab was open, my tab stayed in the background)

- **Main thread**, lab stress scene (~46 cars + tram + train + birds + dog + playground; 40 voices held):
  3.8-7.8 ms per second of wall time = **0.06-0.13 ms per 60-fps frame** (this includes the lab's 46 car
  simulations); normal lab scene (~15 voices) 2.7-3.0 ms/s = 0.05 ms/frame. A performance trace (5.4 s, the tab
  at 57 fps, stress, walking): the engine's own work (`sound.frame` user timing) 46 ms total, **0.15 ms per
  frame average, median 0.11, p95 0.55, max 1.2 ms**; with the lab sims and under tracing 15 ms/s (0.25 ms/frame).
  The control-step frame itself: median 0.2 ms, p90 0.8, max 1.3 ms (voice graphs being built); the
  per-voice parameter writes are sliced over the frames between control steps, voice creation is capped at 4
  per step, writes below audibility are skipped, voices beyond 80 m update at 5 Hz.
- **One-offs**: all banks bake in a worker (1.8-2.3 s off-thread), unpacking into AudioBuffers 16-19 ms on
  the main thread; the very first control step ~10-13 ms (HRTF database + first graphs).
- **Audio thread**: Chrome has no `renderCapacity` here and the trace has no audio-thread events, so the
  proxy is offline rendering at 48 kHz: stress scene (32-34 voices + 3 beds + reverb) **31 % of one core with
  8 HRTF voices, 22 % without** (an over-estimate: offline we never disconnect, so swapped panners and released
  graphs keep running); empty engine (beds + reverb + compressor) 4.7 %. Per voice: car 0.3 % (asphalt) / 0.4 %
  (setts), tram 0.3 % coasting / 0.8 % in a curve under traction, HRTF panner 0.2 % vs equal-power 0.03 %,
  the 1.3 s stereo convolver 1.8 %. Lessons applied: FM'd oscillators are the expensive part (60 = 8 %), so
  squeal / traction / setts / rain layers are lazy (built when needed, torn down after 3 s of silence).
- **Latency**: `baseLatency` 10 ms, `outputLatency` 56-72 ms (interactive hint).
- No glitches can be heard by us; no underrun API was available. The owner should listen to the lab's stress
  mode (Performance > stress) for crackles.

## Verification (we can't listen)

Every test scene renders offline (`sound-render.html`, 24 kHz) and was checked as spectrogram + spectrum +
numbers (`tools/sound/analyze_renders.py`; sheets: `docs/sound/spectrograms_*.png`). Compared against
published descriptions / measurements: footsteps (contact 0.1-0.4 s, gravel grains 1-6 kHz, setts clicks,
wood modes 150-2000 Hz, leaves 2-10 kHz crackle); car (engine energy < 250 Hz, 95 %; gear shifts visible as
harmonic drops; horn fundamental 370-410 Hz with harmonics like real disc horns; Doppler measured on a
pure tone); tram (squeal = narrow tonal lines in bursts only in the curve, inverter sidebands fanning with
speed, rumble < 500 Hz); train (horn 660/370 Hz shifted to 715/404 Hz approaching, clack pairs at the joint
timed by the bogies); bells (the partial stack and the hum outlasting the strike; the far tower darker and
later); birds (each species in its band: blackbird 1.5-3 kHz + 5-8 kHz twitter, robin 3-8 kHz, great tit two
alternating notes ~5 / ~3.7 kHz, wood pigeon 330 Hz harmonics, magpie broadband pulses, crow harmonic stacks
~550 Hz); rain (ticks broadband, bubbles 1-3 kHz, roof without one dominant ring); muffling (engine band +5 dB
and the 1-3 kHz band rising as the car comes into view; `tools/sound/check_occlusion.mjs` prints the
obstruction along the walk: 1.0 behind the block, 0.0 in view). Bugs found this way and fixed: positions /
Doppler / gains snapping back each control step in offline renders (`cancelAndHoldAtTime` now), the IR's
energy (reverb was ~15 dB too loud), a NaN that stopped the muffling / reverb / Doppler writes.

### WAV renders (`docs/sound/renders/`, 16-bit 24 kHz, each peak-normalised to -3 dBFS, 15 MB)

| file | what to listen for |
|---|---|
| `footsteps_pavement/setts/gravel/grass/wood/leaves.wav` | 4 walking then 5 running steps. Do the surfaces sound different and like the real thing? Setts: the stone click (and sometimes a double click). Gravel: crunch, not hiss. Grass: soft, almost no attack. Wood: hollow, a creak now and then. Leaves: crisp crackle. Any machine-gun repetition? |
| `car_engine_cycle.wav` | petrol idle, pull away, gear changes, cruise, brake to a stop. Is it a car or a motorbike? Does the RPM rise and fall believably at each shift? |
| `car_engine_diesel_idle_rev.wav` | diesel idle clatter and two throttle blips. |
| `car_passby_asphalt.wav`, `car_passby_setts.wav` (stereo) | 50 km/h passing 4 m away, left to right: the Doppler drop, the swell. Setts must be clearly louder and rougher ("rumble") than asphalt. |
| `car_doors_horn.wav` | a door opening, two closing (a solid thunk + latch), a short and a long horn. |
| `tram_curve_squeal.wav` (stereo) | the bell before the curve, rumble, then squeal bursts in the curve. Compare with the Saint-Job curve: is the squeal pitch right? (panel: squeal mode A / B Hz) |
| `tram_stop.wav` | braking with the regenerative whine falling, doors with beeps, the stop chime, doors closing, the bell, pulling away with the whine rising. Are the beeps / chime / bell like the T3000? |
| `tram_bell.wav` | the two-tone bell alone: pitches and interval are guesses. |
| `train_passby.wav` (stereo) | AM08 at 120 km/h, 15 m: horn on approach (high-low), rising rumble, the clacks over the joint as it passes. |
| `wind_open.wav`, `wind_trees.wav` | gusty wind in the open vs leaf rustle under trees. |
| `city_hum.wav` | distant traffic bed (should be felt more than heard). |
| `rain_light_ground.wav`, `rain_heavy_roof.wav`, `rain_under_trees.wav` | light rain on pavement, heavy rain on roofs, drips under trees. |
| `birds_species.wav` | blackbird, robin, great tit, wood pigeon, magpie, crow, in that order. Recognisable? |
| `birds_dawn_may.wav` (stereo) | a May dawn chorus. |
| `bells_saintjob_3pm.wav` (stereo) | three strikes near, then a far church answering. Is it a church bell (not a gong / glass)? |
| `dog_bark.wav`, `playground.wav` | a dog in a garden; children in a playground (the weakest: listen for "robot" voices). |
| `occlusion_walk.wav` (stereo) | walking along a street; a car idling round the corner gets clearer at ~8.5 s when it comes into view. |

## Weak points (honest)

- Synthesised **voices** (playground, the dog) are the least convincing; speech-like babble from formant
  synthesis tends to sound robotic close up. Keep them distant, or replace with a better model later.
- **Unverified real-world references**: T3000 bell / beeps / chime, AM08 horn, the two churches' bells, the
  exact Saint-Job curve squeal pitch: all parameters on the panel; the owner should compare with the real thing.
- **Muffling** is moderate (direct -14 dB + low-pass; reverb untouched): an engine's low end behind a block
  changes by only ~5 dB in the render. Probably right for "round the corner", too weak for "behind a whole block".
- **Audio-thread cost** is the bigger budget (20-30 % of a core for 40 voices at 48 kHz offline). Fine on a
  desktop; on a weak laptop lower the voice limit (panel) to ~24 and HRTF voices to 4.
- The **gearbox** is simple (no clutch slip sound, no turbo); diesel and petrol share the 4-cylinder loop
  generator. Brake squeal and tyre squeal on cornering are minimal.
- Birds are plausible shapes, not species-perfect songs (no learned repertoires, no call vs song distinction
  apart from corvids); no night species (tawny owl!) yet.
- Rain is a bed, not positional drips on nearby surfaces; no gutters / downpipes.
- The 15 MB of WAVs: fine for a review branch, delete before merging if the repo size matters.

## Next (into the city): see docs/TODO.md section 6

Wire the engine to the city: listener = camera; occluders = the drive colliders' cells; sources = parked /
moving cars (carFleet), the tram 92 (`tramline.js` positions + the real curve geometry from the track),
pedestrians' steps when they exist, the falcons (their calls!), Saint-Job's tower for the bells, street trees for
birds (species by land cover), the city's clock and weather for birds / rain / wind; surface for footsteps from
`surfaces.js` (setts vs asphalt vs paving).
