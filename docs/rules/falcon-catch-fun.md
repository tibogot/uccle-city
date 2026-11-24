---
status: provisional
added: 2026-11-24
check: `falconfun` (tools/falconFunTest.mjs: a headless simple player over a test Place under the eyrie, the game's own flight model, flight assist, game logic and pigeons; the stoop speeds and pull-outs; the wind / FOV values; the `?falconfun=old` self-test)
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
  - The grab is automatic within 5.5 m (swept between frames). A short slow motion (x0.35, at most 0.45 s) plays in the last 0.3 s before contact, then the hit-stop.
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
| first catch after the launch | 7.6 s (the tame pigeon) | none in 2 min |
| catches in 2 min | 14-17 (median 15) | 0 |
| first 5 easy pigeons dived at | 5 / 5 on every seed | n/a (no lock) |
| auto-dive bumps into a roof | 1 in 91 catches | n/a |
| stoop 50 m / 150 m / 300 m | 150 / 258 / 367 km/h | 88 / 142 / - km/h |
| lowest point of the 150 m pull-out | 32.7 m (flat), >= 10 m over the town | 46.6 m |
| wind gain at 150 km/h (values only) | 0.352, hiss 0.075 | 0.274, hiss 0.004 |
| FOV at 150 km/h | 73 deg | 64 deg |

The bot is a perfect aimer. A first-time player will catch fewer, but the first catch needs only Shift held over the roof below the eyrie.
