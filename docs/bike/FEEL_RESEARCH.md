# Bike feel research: what the best bike / skate games do (2026-11-18)

Research only (web, no code). It feeds the next round of docs/BIKE.md (branch `claude/bike`: arcade lean target in plan
view, a one-body side view on two spring contacts, fixed 120 Hz step). Where a point comes from a developer it says so;
where it is common practice without a primary source it is marked *(practice)*. Developers rarely publish exact numbers,
so the numbers below are starting values for the lab, not quotes.

## What the developers actually say (short)
- **Feel came first and took the most time.** Megagon spent most of the first year of Lonely Mountains: Downhill (LMD)
  tuning only the bike's controls and physics; the stock two-wheel-collider bike "was tipping over all the time", so they
  wrote their own, aiming for "simple, fun and, although not necessarily physically correct, feel 'real'". RageSquid
  spent the first months of Descenders on physics before anything else, and names the skate series as its main model.
- **skate. (EA Black Box, Scott Blackwood):** the pop "is not animation-driven, it's real forces on that board"; mocap
  exists but "animation is a target" (joints blend from fully posed to limp). Input read at 120 Hz because 60 Hz "did not
  give us enough information"; physics at 60 Hz, render pushed to 60 fps in skate 2 at a visual cost. "Invest in your
  special sauce": build the feel parts yourself, borrow the rest.
- **Trials (RedLynx):** throttle, brake, rider lean: three inputs, everything else is physics; rider position = spring
  lengths. Descenders: no preset button combos, tricks come from combining inputs.
- **OlliOlli (Roll7):** strict landing timing made players feel they lacked skill ("the thumb didn't know what it should
  be doing"); they replaced the bail by a score penalty, kept the strict mode as an option. OlliOlli World made the
  timing optional for staying on the board.
- **Celeste (Maddy Thorson):** coyote time, jump buffering, corner correction (bumping a corner nudges you round it, a
  dash that clips a ledge pops you up onto it): invisible help that makes players "feel kind" of the game.
- **Tony Hawk's Pro Skater:** rails are linked node paths (not geometry), each node carries a terrain type (sound,
  sparks); the skater locks on by proximity, can follow a corner up to 45 deg, leaves at sharper ones. Skater XL added
  "automatic detection for any objects that have shapes that look like they should have roll-in grind ability".
  Session went the other way (no snapping, grinds fully physical, slip-offs) and players asked BMX Streets for a grind
  assist slider: the sim end exists, but it is a niche.

## 1. Top 15 techniques, ranked by impact on feel

| # | technique | source | onto our model | cost |
|---|---|---|---|---|
| 1 | **Zero-lag input path.** Input sampled inside each 120 Hz step (not once per render frame); a pop / brake / lean change acts in the step it is seen; velocity applied before position; render interpolation kept to one step. | skate. (120 Hz input), Mick West "Programming Responsiveness" (3 frames best case; 30 fps doubles it; impulse on the first anim frame) | `bikeInput.js` queues timestamped events; the step consumes events up to its time. Check with a lab probe: key-down to first visible body motion <= 2 render frames. | low |
| 2 | **Forgiveness windows everywhere.** Coyote hop (have 0.08 s), *hop buffer* (release up to ~0.12 s early still pops at the best moment if a kerb face is coming), ledge-pop correction (a wheel that misses a kerb top by <= 4-5 cm is lifted onto it), wide snap capture on grinds. | Celeste, OlliOlli playtests | step check in `bikePhysics.js`: if a face is within `v * 0.15 s` ahead and the release happens, delay the pop to the ideal lift point; a front wheel just short of the lip gets a small up-correction instead of a block. | low |
| 3 | **Graded landings, not pass / fail.** Three bands: clean (keep speed, small compression), sketchy (wobble, speed loss, a rider "save" animation, a sound), bail. Bail only far out of tolerance. Landing on the down slope keeps speed (we have it). | OlliOlli redesign; Descenders / Trials air control | split each tolerance (`noseTol`, `yawTol`, `leanTol`, `hardLand`) into a sketchy and a bail threshold (e.g. sketchy at 60 % of today's value, bail at 140 %); sketchy = 0.4 s of reduced grip + steer wobble. Kids keep riding. | low |
| 4 | **Physics first, animation as a target.** The rider pose is computed from the body state each step (pitch, compression rate, lean, crouch, input), never a canned clip that moves the bike. | skate. ("animation is a target"); Just Cause 2 GDC 2010 (motorbike blend inputs = suspension length rate, speed, orientation, pad input) | the two-contact body already makes hop / manual / endo emerge; drive the rider IK blend weights from the same continuous values (see 3.). | medium |
| 5 | **Ride-on-everything edge layer.** Offline extraction of kerbs, ledges, benches, rails, coping as tagged polylines; runtime snap with a capture window (section 2). | THPS nodes, Skater XL auto-detect | a new `bikeEdges` data file per tile + a 120 Hz query; grind = a third contact state of the body. | medium-high |
| 6 | **Few inputs, depth from physics.** Keep the control set tiny; tricks are stick + modifier combinations whose result comes from the body (spin rate, pitch), not a move list. | Trials (3 inputs), LMD, Descenders | our table is already 12 actions; merge where possible (pump = Space on a back slope, drop C), tricks = F + stick direction + held time. | design |
| 7 | **Kerbs and steps as real faces, with wheel geometry.** A wheel is a circle, not a point: sample the ground at 3-5 points along the wheel's front arc so a 5-7 cm step is *rolled* with a small pitch kick and a thud, a 15 cm kerb blocks. | *(practice: raycast-wheel -> sphere / arc cast)*; BIKE.md known limit | replace the single contact point by an arc test (max height under the front 60 deg of the wheel); keeps the spring model, removes the "teleport up a step" look. Needs the kerb lines (road engine) as faces. | medium |
| 8 | **Feedback before failure.** Grip loss, a too-steep manual, a bad landing angle all show *before* the crash: tyre squeal / scrub sound rising with slip, bar wobble, rider weight shift, rumble. | skate. (wheel hardness: hard slides long, soft grips but catches); *(practice)* | slip ratio from the friction circle drives a scrub sound + IK wobble; manual angle past `manualAngle` drives a rear-tyre scuff + arm extension. | low |
| 9 | **Rider secondary motion layer.** Pelvis on a spring to a target height; shoulders / hands as Verlet points pulled to rest poses (lag and overshoot = weight); FABRIK legs to pedals, arms to grips, knee / elbow pole targets. | GRAIL skateboarder devlog; procedural-on-top-of-keyframe practice | runs at render rate from the 120 Hz state; costs ~nothing on CPU; sells landings and pumps more than any physics tweak. | medium |
| 10 | **Camera that follows intent, not the bike.** Spring-damped follow, look-ahead along velocity (not heading), low-ish height, small speed FOV, never fight the player. | John Nesky GDC 2014 "50 Camera Mistakes"; LMD presskit (crest problem) | section 3; `bikeCamera.js`. | low-medium |
| 11 | **Wheel and surface sound.** A rolling loop per surface (pitch + gain from wheel speed), the BMX freewheel tick when coasting (rate = wheel rpm), chain / pedal noise with cadence, one-shots scaled by impact speed, grind / slide loops per edge material. | THPS per-node terrain type; rolling-loop practice (ADX2, I Am Fish) | BIKE.md says "Sounds: none": the single biggest missing feel item. Use the city's fixed audio pools (docs/SOUND.md). | medium |
| 12 | **The world sells speed.** Near clutter (posts, kerbs, hedges, parked cars) and coarse ground detail at bike height; a few slow far objects for contrast. | Shawn Hargreaves (MotoGP) "whooshyness = height above the ground" | Uccle streets already have it; check the ground textures are not a fine repeat at 1 m eye height; tree shadows across the road help. | low |
| 13 | **Pump and flow you earn.** Speed gained by timing absorb / extend on transitions, lost by coasting; flow lines that reward rhythm. | LMD flow focus; BIKE.md pumpGain | keep `pumpGain` but also show it: compression sound, rider extension, a tiny camera dip. | low |
| 14 | **Crashes are cheap and fast.** Crashing is part of the fun (LMD, Descenders); a short readable tumble, then instant control. | LMD, Descenders | cut `respawn` 2.2 s to ~1.2 s, allow a skip (any button) after 0.4 s; keep the last safe pose. | low |
| 15 | **A feel lab with replays and A/B.** Deterministic replays of the same input on two parameter sets, side by side, plus the node checks. | LMD / Descenders tuning months; skate. text prototype | we already have determinism: add record / replay of input tracks in the lab, and "A/B this slider" playback. | low |

## 2. "Ride on everything" in a city not built for it

**Principle:** keep physics for rolling and the body, but use an *edge layer* for grinds, stalls and ledge pops, as THPS
did (nodes) and Skater XL automated (shape detection). Do not grind against raw collision meshes at runtime.

**Offline extraction (per tile, a build step, audited):**
1. Sources: the city colliders (viewer/drive/colliders.js sets), the road engine's kerb lines, the street furniture kit
   (benches, planters, low walls, railings, bollard rows), stair features, bridge / deck rails (docs/DECKRAIL.md).
2. Candidate edges: top edges of collider boxes / meshes where the top face is near-flat (< 10 deg), the side face is
   steep (> 60 deg dihedral), height above the ground 0.12-1.2 m, length > 0.8 m; thin round tops (railings, < 8 cm
   wide) become `rail`, wide flat tops become `ledge`, kerb lines `kerb`, park / skate coping `coping`.
3. Merge colinear pieces, split at corners > 45 deg (THPS rule), bevel softer corners into extra points, drop pieces
   blocked above (a roof, a tree trunk within 1.6 m) or inside private plots.
4. Store as polylines, per-point `type` + `material` (stone, steel, wood, painted) for sound / sparks / friction, in a
   spatial grid like the colliders. A lab overlay draws them; a mesh-audit row checks counts and that every edge sits on
   its collider (joins rule: no floating edge).
5. **Stairs:** detect runs of 3+ parallel risers (0.12-0.20 m) and add an invisible ramp proxy for the wheels with a
   per-step bump (sound + small spring impulse + camera shake), so riding down is smooth and readable; riding up = blocked
   unless a hop lands on a step. Handrails along them become `rail`.
6. **Banks / walls:** slopes up to ~45 deg ridden by the normal ground; 60-90 deg wall faces next to a ground transition
   tagged `wallride` (short, speed-gated).

**Runtime snap (120 Hz step):**
- Query edges within ~0.5 m of the bike's mid point. Snap allowed when: a wheel (or the pegs: 50-50 = both wheels on the
  edge, feeble / smith = rear peg) is within a vertical window (0.25 m above to 0.05 m below the top) **and descending or
  at the top of a hop** (no snapping while rising fast: the Unreal-forum speed gate), the horizontal angle between velocity
  and the edge < 35-45 deg, speed > ~2 m/s.
- Direction = sign(dot(v, tangent)); keep the speed projected on the tangent minus a small loss (friction per material).
- Align over 60-100 ms (blend position / yaw), never a one-step teleport; the body's springs keep working so the landing on
  the edge still compresses.
- Balance: lean input keeps the grind (an assisted balance, the strength a slider; kid default high). Exit at the end,
  at a corner > 45 deg, by a hop (lateral push toward the stick), or by losing balance (falls to the low side, not a crash
  unless speed is high).
- Ledge pops / kerb ups without grinding: the same edge data drive the hop buffer and ledge-pop correction (1. #2).

## 3. Camera and animation tricks that sell speed and weight

**Camera** (`bikeCamera.js`):
- Follow a point ahead along the *velocity* (0.3-0.6 s look-ahead), spring-damped position (critically damped,
  ~0.15-0.3 s), yaw lagging the bike a little more than position: turns read without swinging.
- Height low (1.4-2.0 m) and distance short at speed; FOV +4..+8 deg from 15 to 45 km/h, eased; no motion blur needed
  (Holm et al. 2017: blur *lowers* perceived speed, height at high speed raises it).
- Never roll the camera with the bike's lean (or at most 15-25 % of it); keep the horizon.
- Landings and impacts: a short vertical dip (spring kick proportional to impact speed, 3-8 cm, recovers in 0.2 s) plus
  rumble; no screen shake on rolling.
- Air: widen and lift a little, keep the landing zone in view; over a crest (LMD's problem) raise and pitch down early
  from the velocity, not after the drop.
- Honor intent (Nesky): manual orbit wins, auto-return after ~1.5 s idle; never cut through walls (minClear exists).

**Animation (rider on the 120 Hz body):**
- Blend weights from continuous values (Just Cause 2): crouch from leg compression, forward / back weight from pitch rate
  and input, lean from the roll, pedal phase from crank angle (the rollout gives it), standing from sprint.
- Anticipation: hop preload visibly compresses the kid (knees, elbows), the pop extends then tucks; landing compresses
  ~30-60 ms after contact (lag = weight), then the spring pelvis overshoots once.
- Secondary: Verlet shoulders / hands / head lag (GRAIL), shirt and hair if any; feet off pedals on bad landings (a
  "save"), a foot dab at stops.
- Bike: real fork turn (bar angle from yaw rate), wheels spin from ground speed, tyres squash a few mm under load.

## 4. Pitfalls that make it feel cheap
1. Canned animations that move the bike (pops, landings), or a pose snapping between states.
2. Input lag from sampling once per render frame, or events consumed a step late; 30 fps playtests hide nothing (lag doubles).
3. Binary landings and strict timing windows: kids read failure as "the game is unfair" (OlliOlli).
4. Invisible walls / stuck wheels on kerbs, steps and collider seams; a wheel teleporting up a step; tunnelling.
5. Grind snaps that teleport, snap from too far, or snap while rising (the bike "sucked" onto a bench).
6. A floaty air: gravity under 9.81 or too much air control / auto-level ("the bike steers itself").
7. A camera glued to the bike (every bump shakes the view), rolling with lean, or swinging on turns.
8. Silence or one looped rolling sound for all surfaces and speeds; no freewheel tick; no impact sounds.
9. Long crash / respawn sequences; punishments that take control away for seconds.
10. Too many buttons (a move list) instead of a few inputs with physical depth.
11. Grip that drops with no warning (wash-outs without scrub sound or wobble).
12. Fine repeating ground textures at bike height (no "whoosh"); empty wide streets with no near clutter.
13. Perf hitches: a frame spike is a missed hop; keep the fixed light count and no per-step allocations.

## 5. Sources
- Descenders: https://en.wikipedia.org/wiki/Descenders ; https://www.redbull.com/us-en/descenders-interview ;
  https://comicbook.com/gaming/news/interview-descenders-steam-early-access-xbox-ps4-switch ;
  https://www.pinkbike.com/news/how-descenders-a-small-independent-mountain-biking-game-became-one-of-the-most-popular-on-xbox.html
- Lonely Mountains: Downhill: https://en.wikipedia.org/wiki/Lonely_Mountains:_Downhill ;
  https://80.lv/articles/lonely-mountains-low-poly-bike-madness ; https://80.lv/articles/level-game-production-lonely-mountains-downhill ;
  https://lonelymountains.com/presskit ; https://thespelunkyshowlike.libsyn.com/63-finding-your-own-path-with-daniel-helbig ;
  https://www.codecks.io/blog/2020/game-production-podcast-1-megagon-industries/
- skate. (EA): https://www.gamedeveloper.com/design/new-tricks-scott-blackwood-talks-i-skate-i-and-i-skate-2-i- ;
  https://www.gamedeveloper.com/game-platforms/ea-s-blackwood-text-based-prototype-perfected-i-skate-i-s-control-scheme ;
  https://www.engadget.com/2007-06-13-joystiq-interview-skates-ea-blackbox-new-screenshots.html ; https://www.ea.com/news/skate-comes-full-circle
- Session / Skater XL / BMX Streets: https://techraptor.net/gaming/opinions/how-session-redefines-skateboarding-games ;
  https://www.thegamer.com/session-skate-sim-review/ ; https://stevivor.com/news/skater-xl-new-beta-update-0-2-0-0b-february-2020 ;
  https://www.pcgamer.com/how-modders-made-skater-xl-their-dream-skate-game ;
  https://steamcommunity.com/app/871540/discussions/0/4354492419466092560 ;
  https://www.operationsports.com/bmx-streets-launches-on-ps5-bringing-physics-driven-freestyle-riding-to-consoles/
- Trials: https://www.engadget.com/2014-04-16-trials-fusion-review-lean-to-live.html ; https://gamesbeat.com/trials-evolution-interview/
- OlliOlli: https://mcvuk.com/?p=23924 ; https://wireframe.raspberrypi.com/articles/olliolli-world-roll7-on-making-a-bigger-better-skateboarding-game
- Riders Republic: https://www.redbull.com/au-en/riders-republic-content-plans-revealed-ubisoft-interview ; https://www.pcgamer.com/riders-republic-review
- Tony Hawk / rails: https://mail.thpsgoat.com/mods/docs/nxt-rails.php ; https://www.theringer.com/2019/8/30/20838769/oral-history-tony-hawk-pro-skater-soundtrack-les-claypool-neversoft-activision ;
  https://corecursive.com/game-programming-with-mick-west/ ; https://en.wikipedia.org/wiki/Mat_Hoffman%27s_Pro_BMX
- Grind maths / forums: https://alexdiru.substack.com/p/mathematics-of-grinding-part-1 ;
  https://forums.unrealengine.com/t/halfpipe-snapping-in-skate-games/2660711
- Responsiveness / forgiveness: https://cowboyprogramming.com/2008/05/27/programming-responsiveness/ ;
  https://www.gamedeveloper.com/design/measuring-responsiveness-in-video-games ;
  https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html
- Camera / speed: https://gdcvault.com/play/1020460/50-Camera ; https://www.shawnhargreaves.com/blog/vrrroom-whoosh.html ;
  https://eudl.eu/doi/10.1007/978-3-319-55834-9_14
- Animation: https://gdcvault.com/play/1012739/Physics-Meets-Animation-Character-Stunts ;
  https://upakai.itch.io/grail/devlog/734501/how-the-procedural-animation-of-the-skateboarder-works
- Sound: https://blog.criware.com/index.php/2019/12/17/creating-dynamic-scrape-sounds-in-unity-using-adx2/ ;
  https://audiokinetic.com/en/blog/behind-the-sound-of-i-am-fish
- Arcade vehicles: Toyful Games, Very Very Valet raycast car (video, via https://maydave.github.io/posts/CusomCarController)

Not found online (no primary source): BMX Streets / Pipe physics or grind devlogs, Mat Hoffman's Pro BMX developer
interviews, Neversoft's grind code, Descenders' physics internals, LMD's camera write-up (the Making Games 2020
interview is cited by Wikipedia but its text isn't online). The numbers in sections 2-3 are starting values for the lab.
