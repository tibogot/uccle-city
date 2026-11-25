---
status: provisional
added: 2026-11-24
check: `falconfun` (tools/falconFunTest.mjs; round 3: every bird lockable + the old-mux self-test, the crossing lock, the slow motion, the strike camera, the smooth auto-dive, the miss, the feather pool, the grip on the real rig; a headless simple player over a test Place under the eyrie, the game's own flight model, flight assist, game logic and pigeons; the stoop speeds and pull-outs; the wind / FOV values; the `?falconfun=old` self-test)
---
**Rule.** A catch must be achievable by a first-time player within ~30 s of the game's start. The player picks the prey; the game does the hard part. Look at a pigeon and it is locked (a soft ring). Hold the strike button and the falcon dives onto it by itself. Anything that comes within the catch zone (5.5 m) is grabbed. Speed, angle and style only add bonus points; they never decide a miss. The stoop must feel fast over the city's roofs: 50 m of drop gives ~150 km/h and 150 m gives ~250 km/h, and the pull-out never hits the ground. Each of these is checked headless by a scripted simple player, and the old game must fail the same check.

**Why.** Owner playtest, 2026-11-24: "why I can't catch pigeons, it seems too hard and not funny enough... it shouldn't be so hard" and "is the falcon not supposed to go way faster? I was only doing like 70 km/h max". The old catch was a real peregrine's strike:

- the talons within ~2 m (0.8 + 0.6 x the drawn span)
- a closing speed over 8 m/s and an approach within 35 deg of the path
- F pressed inside a 0.45 s window
- a pigeon that flushed 32-75 m away and jinked unannounced at 7 m
- with prey in the talons, no hunting at all until it was delivered to the eyrie

The stoop was physically real: 40 m/s only after ~200 m of drop. Over Uccle's 10-20 m roofs the player never got fast enough to close on a 21 m/s pigeon. Nothing measured whether a player *could* catch one. The game-kit autopilot that validated round 1 flew scripted perfect strikes.

**What changed** (`viewer/falconFlight/falconFun.js`, `?falconfun=old` = the game before):

- **Lock-on and auto-dive.**
  - The lock picks the pigeon nearest the view centre: a 0.5 rad cone, 230 m, the tame first pigeon first, birds well above the falcon last.
  - Holding F (gamepad X, touch STRIKE), or Shift while a bird is locked, starts the auto-dive. It ramps in over ~0.35 s, and A / D and W / S still nudge it.
  - It steers for the lead point. It tucks only when the bird is ahead and below. It turns first when the bird is behind and climbs out after a low pass.
  - It stays 3 m over the highest solid on the line to the bird.
  - The ground guard pulls out so the dive bottoms *at* the prey (a swoop), never under the solid + 2 m.
  - In the last 14 m a homing turns the path onto a point 2 m over the bird, unless a solid is in the way.
  - Bank goes up to 75 deg for the chase, but only 35 deg in a pull-out, so the lift goes into the pull.
  - A pursuit push (at most 4.5 m/s², none in a climb) means a level chase always gains ~9 m/s on the bird.
  - Held for 6 s without getting closer: the bird is let go (skipped for 8 s).
  - Out of breath (stamina < 12 %): no dive up at a bird.
- **The catch.**
  - The grab is automatic within 5.5 m (swept between frames). Over a bird sitting on a roof or the setts, the height counts 0.6 (the talons reach down), and touching down within reach of the locked bird catches it (the pounce): in the browser the roofs round the tame pigeon kept the swoop ~8 m over it, and a slow dive perched beside it. A short slow motion (x0.35, at most 0.45 s) plays in the last 0.3 s before contact, then the hit-stop.
  - Points: 10 + km/h / 6, then the bonuses:
    - PERFECT STOOP x2 (>= 30 m/s, diving > 17 deg)
    - HEAD-ON +5 (within 15 deg)
    - RACER x2
    - COMBO x1.5-x3 (catches within 30 s)
    - the run goal "catch 5 in 2:00": +100
  - After a catch: 2.5 s before the next lock, the neighbours flush, and stamina +25 %.
  - Prey in the talons no longer stops the hunt. A delivery to the eyrie is a bonus, never required to score.
- **Speed.**
  - `flightModel.js` arcade: a tucked bird going down gets 2.2 g x sin(dive) along its path, and 60 % of its drag is taken off.
  - The pull-out is 9 g. The guard's arc uses the g the wings really give at that speed (capped at 6).
  - The stoop's probes look 0.25-0.8 s ahead, not 0.6-2 s: at 60 m/s, 2 s ahead was 120 m, and every stoop was levelled off early.
  - A probe that finds the ground under a stoop now latches the pull-out. Before, the wings re-tucked and the bird crept down onto the ground.
  - A Space tap (< 0.22 s; gamepad RB; a FLAP tap) is a sprint: 0.65 g for 1.1 s, 16 % stamina.
  - The FOV (to 88 deg over 14-70 m/s), the air streaks (22-60 m/s), the vignette and the wind's gain all come in earlier.
- **Pigeons** (`pigeons.js`).
  - Easy birds feed on the setts and roofs. They flush at 13 m (x1.4 when the falcon is fast), take ~1 s to get off the ground, and flee at most 14.5 m/s, low (at most 2.5 m/s up).
  - Every 8th bird is a pale racer: 26 m/s, a 7.5 m/s dodge.
  - A dodge is warned 0.3 s before it comes: hard wingbeats, and the ring turns orange "DODGE!".
  - After two escapes a bird is tired: 11 m/s and no dodge.
- **Goals** (`hunt.js` HUD):
  - an arrow to the nearest pigeons (or the nearest square with a flock)
  - the run card with the combo
  - the bonus line on the CAUGHT banner
  - the first catch: a tame pigeon placed on a roof straight ahead under the eyrie's launch (30-90 m out, 6-35 m down), with the hint "hold Shift (or F) to dive onto it"

**Numbers** (tools/falconFunTest.mjs, 6 seeds; the simple player looks at the lock, or follows the arrow, and holds the button):

| | default | `?falconfun=old` |
|---|---|---|
| first catch after the launch | 2.4 s, the tame pigeon on every seed | none in 2 min |
| the falcon out of frame (the chase camera simulated) | 0 % of frames, hunts and 150 m stoops | |
| catches in 2 min | 15-17 (median 16) | 0 |
| first 5 easy pigeons dived at | 5 / 5 on every seed | n/a (no lock) |
| auto-dive bumps into a roof | 0 in 95 catches | n/a |
| stoop 50 m / 150 m / 300 m | 150 / 258 / 367 km/h | 88 / 142 / - km/h |
| lowest point of the 150 m pull-out | 32.7 m (flat), >= 10 m over the town | 46.6 m |
| wind gain at 150 km/h (values only) | 0.352, hiss 0.075 | 0.274, hiss 0.004 |
| FOV at 150 km/h | 73 deg | 64 deg |

The bot is a perfect aimer. A first-time player will catch fewer, but the first catch needs only Shift held over the roof below the eyrie.

## Round 3 (2026-11-25): the catch you can see, every bird catchable, the smooth chase

**Rule.** You must see the catch. At the strike the game slows to x0.22 for ~0.5 s of real time. The camera swings in beside the falcon, framing the talons and the pigeon. Feathers burst, the banner says "CAUGHT!" with the score, and the strike sound plays. After that, the pigeon is held IN the talons. It stays on the foot bones, belly against the closed toes and head forward, with no gap and nothing poking through the falcon. It blends into the grip over 0.1 s of game time and never snaps. Every bird the player can see in the sky can be caught: every drawn pigeon flock and every sky flock, gulls and sky pigeons included. A bird crossing close by takes the lock too. The auto-dive turns smoothly, with no frame-by-frame judder. A miss is said ("DODGED!" / "MISSED"). Each of these is checked headless by the `falconfun` row, and its self-test shows the old mux failing the "every bird" check.

**Why** (owner, 2026-11-25): "it's really confusing, we don't see well the pigeon getting caught ... the chasing of pigeons should be smooth ... sometimes I cross some birds in the sky and those were not targetable, that's nonsense". Then: "the prey should look really inside the hands of the falcon". The causes:

- **Birds that could not be targeted.** There were three of them:
  - `cityFlyer.js` draws the 2 square flocks nearest the CAMERA, but the hunt's `PreyMux` held only the ONE nearest the falcon. The other drawn flock's pigeons flew past and could never be locked. The node check shows it: the old mux locks 0 of the 57 flying birds of flock B.
  - `gpuPrey.js` made only starlings, jackdaws and parakeets prey. The GULLS were never prey. The sky PIGEONS (cityBirds.js birds2) are switched off in prey mode, but a party already in the air when the flight starts "leaves" for up to 40 s, drawn and not catchable.
  - The lock looked only in a 0.5 rad cone round the view centre, so a pigeon flying past the falcon's shoulder could not be locked.
- **A catch you could not see.** The catch was a 0.35 s hit-stop with the camera 3-4 m behind. The pigeon vanished from the flock and a carried mesh appeared at a fixed offset under the falcon's body. That mesh followed no bone, was held tail-first (the old half turn), and the talons stayed open. A 5.5 m automatic grab means the pigeon is metres away at contact, so it seemed to teleport.
- **The judder.** The homing (the last 14 m) divided the ground velocity by the AIRSPEED, which is taken at the start of the last substep. On every other frame |u| > 1, the cosine clamped to 1, the angle read 0, and the homing skipped that frame. The heading's rate alternated 0.8 / 0.02 rad/s (node check). The homing also turned at the full 2.4 rad/s until it was aligned and then stopped dead, giving spikes of 130-220 rad/s^2. A lock switch or a swinging lead point also went straight into the assist's turn rate.

**What changed** (`?falconfun=old` = the game before):

- `hunt.js` PreyMux: one slot per drawn flock (NS = 2; a flock keeps its slot while it is drawn), and the sky birds from index 512. The lock picks the bird nearest the view centre over every flock and the sky flocks, with one score. `gpuPrey.js` byAngle scoring.
- `gpuPrey.js` PREY_KEYS: every sky slot is prey (gulls and sky pigeons added).
- `falconGame.js` strikeFun: the near zone (`FUN.near`). With nothing in the 0.5 rad cone, a bird within 60 m and 1.15 rad takes the lock.
- `falconFun.js` FUN.strike and strikeScale; `hunt.js` caught():
  - a 0.08 s punch, then x0.22 held to 0.38 s, eased back by 0.73 s (0.52 s under x0.5)
  - the banner "CAUGHT!" placed under the falcon
  - the feather puff
  - the strike sound (`falconAudio.js` rustle: a smack and a plumage rustle, silent until the player turns sound on)
- `falconCamera.js` strike():
  - beside the falcon (1.5 spans, the side in free air with a clear line, else over and behind), looking at the talons, zoomed 6 deg, the roll levelled
  - eased in over 0.22 s, held to 0.65 s, out by 1.15 s (real time)
- `featherPuff.js`: 48 pooled feather cards, one instanced draw only while some fly. Static buffer with an update range, InstancePrev motion vectors (a MOVER in motionAudit.mjs), no light. Burst at the talons, a little toward the pigeon.
- `falconBird.js` holdPrey():
  - Every frame after the pose, the pigeon is placed at the grip point. That point is between the two feet, 35 % along the toe bones.
  - The pigeon is rolled belly-up against the toes and sunk 12 % of its depth into its plumage, head forward (prey_carry's head is its -z end), a little nose-down.
  - New rig layers gripL / gripR close the toes round it.
  - At the strike it blends in from where it was, in the falcon's frame, at most 1.6 x scale from the talons (the 5.5 m grab made it slide in like a magnet), over FUN.strike.grip = 0.1 s of game time (~0.45 s in the slow motion).
  - Perched, it lies on the ledge at the feet.
  - The feet stay half down (talons 0.45) while carrying.
- `falconGame.js` funHome():
  - the homing runs just before the flight step, normalised by |vel|
  - its weight is eased (0.1 s), so a flickering guard / avoid no longer switches it on and off
  - its turn RATE is eased (0.06 s) toward a first-order pull (0.08 s) that comes in over its first 4 m
- `falconFun.js` dive(): the aim (heading, path angle) is eased (0.16 s) and rate-limited (2.6 rad/s). The safety terms (over the solids, the climb-out) are not eased.
- Misses: a pass within 12 m of the locked bird, then 6 m away without the catch, shows "DODGED!" (it jinked) or "MISSED" in an orange banner.

**Numbers** (tools/falconFunTest.mjs, 6 seeds; the browser check at ?game=falcon, 60 fps, screenshots in C:\Users\tibog\Downloads\uccle-falcon3\):

| | round 3 | before |
|---|---|---|
| flying birds lockable, each alone, looked at from 40 m | flock A 70/70, flock B 57/57, every sky slot 8/8 | flock B 0/57, gulls 0/8, sky pigeons 0/8 |
| a pigeon crossing 30 m off at 60 deg | locked | not (0.5 rad cone) |
| slow motion at a catch (real s under x0.5) | 0.52 | ~0.35 hit-stop |
| strike camera | 1.58 spans from the falcon, in the central 30 % of the frame, max step 0.88 m a frame | 3-4 m behind |
| heading rate change in an auto-dive, 99 % / max (rad/s^2) | 6.8-9.8 / 32-69 | 36-61 / 160-220 |
| held pigeon: belly to the grip (7 s scripted carry, real rig) | <= 2.4 cm, 0 falcon body vertices inside it | a fixed offset, no bone |
| catches in 2 min (the simple bot) | 10-16, median 15 | 15-17, median 16 |
| first catch | 2.4 s, the tame pigeon, every seed | same |

Left for later (round 3 part B and the parked list): the first, tame pigeon sits among street-tree crowns. In the browser the avoid kept the falcon 8-20 m from it for ~12 s before the catch (the bot's test Place has no trees). The controls, the take-off and the speed / height are the next job.
