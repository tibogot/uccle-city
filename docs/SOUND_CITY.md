# The city's sound (branch claude/sound, 2026-11-19, rule 42)

The sound engine of the Sound Lab (`viewer/audio/engine.js`, docs/SOUND.md) now plays the live city. Every emitter
comes from what the city simulates (no recordings, no files: everything procedural, baked once in a worker).
The speaker button (top centre, right of Play) is the ONE switch for every sound in every mode. OFF by default,
remembered per browser (`localStorage "uccle-sound"`), `?sound=1` starts on. `?citysound=old` = the city as before
(silent: only the vehicles' / games' own sounds).

## What plays where

| category | source (live) | what you hear |
|---|---|---|
| traffic | the nearest 14 cars of `cityTraffic` (sim arrays: position, speed, heading, acceleration, type) within 150 m | tyre / road noise by speed (CPX band ~0.9 kHz, ~v^1.5), body rumble, **setts** where the tile's OSM road is `sett` / `cobblestone` / `paving_stones` (+8 dB and the sett impact train: Ch. de Saint-Job, Place Saint-Job), **wet road** spray hiss when the weather has wetted the streets, brake squeal on some cars; vans louder, two-wheelers quieter. **No engine tone** (see below) |
| traffic | the player's car (drive mode, the car only) | its own tyres, same model |
| transit | the trams 92 near the camera (`tramline.soundFeed`: front / rear bogie, curvature over the front 12 m, doors) | rumble + rail ring, curve squeal in curves (Saint-Job's), traction whine accelerating / braking, auxiliaries at a stop; **the stop chime** as the doors open, **the door cycle** (beeps, motor, thump) as they close, **the bell** pulling away from a stop and when someone (the player, the listener on foot, a traffic car) is on the track 3-22 m ahead |
| transit | the SNCB trains (`trains.soundFeed`: speed, length, route) | rolling per car (3 sources), traction whine on the motored cars, **bogie clacks** at the switches / joints (one every 140 m of route: the lines are welded between them) |
| nature | the 10 nearest trees of the tile (OSM / UrbIS trees, >= 8 m apart, refreshed every 25 m walked) | birds by species (blackbird, robin, great tit, wood pigeon, magpie, crow), by hour and month (dawn chorus, seasons), more and more varied in parks / woods (OSM park / wood / grass areas), quieter in rain |
| nature | the sky flocks (birds2: `cityBirds.flocks`) within 250 m | calls at the flock (starlings, jackdaws, gulls, parakeets, pigeons: pitched versions of the six songs, see weak points) |
| nature | the weather (`wx.uWind`, `wx.uRain`, `wx.uWet`) | wind bed (gusts; leaf rustle by the trees round the listener; sheltered in a street canyon), rain bed (ground / roofs (canyon) / trees by where the listener stands, light .. heavy) |
| traffic | bed | the distant city hum, quieter at night, by the traffic near |
| people | Place de Saint-Job (the market 8-14 h: louder), the Parvis Saint-Pierre, every cluster of 2+ OSM shops (3 x 3 cells of 16 m) within 170 m | the murmur of a busy square / street by day (8-21 h ramps), quieter in rain |
| bells | Saint-Job (belfry 1197, 548, prime 262 Hz) and Saint-Pierre (-709, -492, 233 Hz, 3.5 s later) | the hour struck (n strikes 2.6 s apart) on the city clock (tram 92's), 7-22 h |
| crash | the player's vehicle | **impact** on `carHit` (traffic / parked / bodies) by closing speed: tap < 2 m/s, knock 2-6, crash > 6 (body thump + sheet-metal crunch + plastic crack), **glass** on most crashes over ~25 km/h; **wall hits** (buildings, kerbs, trees: masonry thud + grit; lamps / posts / furniture: metal) from the car's `lastHit`; **scrape** (metal grinding, stick-slip chatter, a singing panel) while the vehicle slides along something |

Environment: the street-canyon probes (8 rays 60 m out rising 30 m) march the tiles' 2 m roof grid: > 0.35 covered =
canyon reverb, in an OSM park / wood = park, else open. Muffling behind buildings: two rays 0.9 m apart from the
listener to each voice over the same roof grid (4 Hz a voice). The listener is the camera (every mode).

## ONE button

`viewer/audio/soundGate.js` wraps `window.AudioContext` before any module can make one (main.js imports it right after
quick.js). Every module that makes a context imports it and makes its context only while the sound is on (on the first
key / click, or the moment the button turns it on; that click is the gesture browsers need):

- the city sound (`viewer/audio/citySound.js`): context + banks only on the first unmute
- the motorbike / scooter / Villo (`viewer/moto/motoAudio.js`): **N removed**, `?motosound=1` removed, the dev panel's
  "two-wheeler sound" toggle removed (`driver.setSound()` stays for code)
- the falcon (`viewer/falconFlight/falconAudio.js`, the lab too): **the falcon game's "Sound" menu tick removed**
- the games' cues (`viewer/game/audio.js`) and the police siren through them: **the police game's "Siren sound" option
  removed**; a siren already on starts the moment the button turns on
- labs: the falcon flight lab and the moto lab mount the same button (the moto lab's N removed)

Muting suspends every context (nothing runs on the audio thread), unmuting resumes them all.

## The engine sound slot

`driver.engineVoice` (viewer/drive/driveMode.js) is empty: `{ update(state, dt, driver), stop() }`, called every frame
while driving any vehicle, stopped when the drive mode ends. The owner brings the car / motorbike engine model from
another repo; nothing else of an engine is in the city sound (the traffic has tyres only, the player's car its tyres).

## Cost

Measured headless (`node --expose-gc tools/sound/citySoundTest.mjs`, the real modules on a scripted city, the Web Audio
API stood in by `tools/sound/miniWebAudio.mjs`; the browser's own AudioParam calls cost more than the stand-in's, so
the browser turn reads `__citySound.stats` with `?soundstats=1`):

- **main thread**, live frames at 60 fps with 16-22 voices: **0.014-0.027 ms a frame** mean (budget 0.1), p99 ~0.25 ms
  (the control step frame), feeds ~0.03-0.07 ms per 10 Hz step; the per-voice writes are sliced over the frames
- **allocation**: no object / array / closure / string per update (fixed pools, one source shape, typed-array state);
  what is left is V8 boxing doubles for calls it does not inline (the AudioParam setters): 7-15 KB a control step,
  ~50-90 KB/s young-generation garbage; no audio node or heap growth over 1 200 steps
- **nothing while off**: no context, no banks, no feeds (the updater returns at once)
- **one-offs at the first unmute**: the banks + impulse responses bake in a worker (~3-5 s off-thread at 48 kHz,
  estimated from the lab's 1.8-2.3 s plus rain / murmur / crash / IRs); unpacking them into AudioBuffers is one
  main-thread task (~30-40 ms estimated, the lab's was 16-19 ms) at that click
- **audio thread** (from the Sound Lab's offline measurements, docs/SOUND.md): a tyre voice is cheaper than the lab's car
  (no engine loops), ~0.2-0.3 % of a core each; voice limit 32, HRTF for the nearest 6 within 60 m; with beds + reverb
  expect ~12-20 % of one core at 48 kHz in a busy street

## Files

| file | what |
|---|---|
| `viewer/audio/citySound.js` | NEW: the city's feeds (traffic, trams, trains, player, birds, flocks, people, bells, beds), the tiles' sound map (trees, green, setts, shops per 16 m cell), roof-grid muffling + canyon probes, `createCitySound(host)` + `hookCitySound(...)` |
| `viewer/audio/crash.js` | NEW: impact / wall / glass / scrape banks, `playImpact`, `createScrapeVoice` |
| `viewer/audio/engine.js` | host hooks (`obstructionFn`, `enclosureFn`, `beforeControl`, baked `irs`, `timing`), `IRBank` (worker), allocation-free control step (count-based arrays, insertion sorts, inline distance / score, fixed-shape one-shot sources), the swapped-path leak fixed |
| `viewer/audio/vehicles.js` | `createTyreVoice` (tyres without an engine), the squeal one-shot |
| `viewer/audio/ambience.js` | `murmurBuffer` (adult babble), the rain bed without per-update strings |
| `viewer/audio/transit.js`, `util.js` | typed-array state in the tram voice and `smoothParam` |
| `viewer/audio/bakeWorker.js` | the crash and IR banks |
| `viewer/tramline.js`, `viewer/rail/trains.js` | `soundFeed(...)`: allocation-free feeds (+ `atInto`) |
| `viewer/main.js` | the hookup after the weather (dynamic import, `?citysound=old` skips it) |
| `viewer/drive/driveMode.js`, `input.js` | `engineVoice` slot; N removed |
| `viewer/moto/motoAudio.js`, `viewer/falconFlight/falconAudio.js`, `viewer/game/audio.js`, `viewer/police/policeCar.js` | follow the gate (context only while on) |
| `viewer/falconGame/falconGameDef.js`, `viewer/police/policeGame.js`, `viewer/devPanel.js`, `viewer/features.js` | the second switches removed; features row `citysound` (A/B) instead of `motosound` |
| `labs/falcon-flight-lab.js`, `labs/moto-lab.js` | the speaker button |
| `tools/sound/miniWebAudio.mjs` | NEW: a pure-JS OfflineAudioContext (block renderer, exact param automation at block starts, FFT convolver, equal-power panning for both models) + a clock context for the cost tests |
| `tools/sound/citySoundTest.mjs` | NEW: the gate row `citysound` |
| `docs/QUALITY_RULES.md` | rule 42 |

## The browser turn: listen for

1. **Ch. de Saint-Job by day** (`?at=1100,540&view=walk`, then the button): tyres on the setts louder and rougher than on
   asphalt further on, the murmur on the square (the market before 14 h), birds in the street trees, the canyon reverb
   between the façades; cars behind a block muffled.
2. **A tram passing** (stand by the Saint-Job stop): rumble rising and falling with Doppler, the chime as the doors open,
   the beeps / doors closing, the bell pulling away, squeal in the curve; step onto the track ahead of a tram: the bell.
3. **A park** (`?at=-402,-91&view=walk`, Wolvendael; or Kauwberg): more birds, wind in the trees, the drier park reverb,
   no murmur; at dawn (`?clock=6:30`) the chorus, at night (`?clock=23:00`) almost none.
4. **A car crash** (drive, hit a traffic car slowly then at 40 km/h, then a wall, then slide along a wall): tap / knock /
   crash + glass, masonry thud, the scrape while sliding; nothing doubled (a car hit plays once).
5. **The bells on the hour** (`?clock=11:59:40`): Saint-Job's 12 strikes, Saint-Pierre's 3.5 s later, lower and
   darker (1.9 km away from Saint-Job: faint, muffled by the air).
6. **Rain** (`?wx=rain`, dev panel weather): the rain bed on the ground / roofs / under trees, wet tyre hiss, fewer birds.
7. **The button in each mode**: off at start in every mode; on: the city + the motorbike / scooter / Villo (no N), the
   falcon flight and the falcon game (no menu tick), the police siren (J, no option), the game cues; off again: all
   silent at once; reload: the choice kept.
8. **A/B `?citysound=old`**: the city silent again, the vehicles' / games' own sounds unchanged.
9. **Cost**: `?soundstats=1` then `__citySound.stats` (feedMs, frameMs, voices) and `__citySound.engine.stats`; one
   Chrome tab, preflight GREEN (memory: perf preflight).

## Weak points (honest)

- The traffic has **no engine sound** (by the owner's choice): idling cars at a light are silent but for their tyres.
- **Flock calls** are pitched versions of the six songs (starling chatter = a robin's warble x1.15, parakeets = magpie
  pulses x1.7): plausible at a distance, not species-true.
- The **murmur** is formant babble: kept as a bed at 9+ m reference, it sounds robotic up close (docs/SOUND.md).
- **Bell pitches** (262 / 233 Hz) and the hour rule (7-22 h) are guesses; the real churches' bells are not documented.
- **Setts** come from the OSM road surface tags (+ data/overrides.json): a street drawn with setts but tagged otherwise
  sounds like asphalt.
- The **unpack** of the baked banks is one main-thread task at the first unmute (~30-40 ms estimated): a hitch once, on
  the click; slicing it is a follow-up if the browser turn measures it.
- **Headless audio** is our stand-in renderer: HRTF is rendered as equal-power there; the WAV level checks are relative.
