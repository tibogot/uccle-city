# falconfix: falcon collisions and friendly controls (2026-11-16)

The owner's playtest (docs/TODO.md "OWNER PLAYTEST 2026-11-16", item 10): "the falcon one has too many issues with
collision, it goes up after falling down, it's like it's very buggy; the falcon control is not easy, we should make it
way better, not more complicated but better, more UX friendly". The coordinator also saw free flight
(`?game=falcon&gmode=free`) start perched on the ground in a wood instead of on the eyrie.

Branch `claude/falconfix`. Offline checks: `node tools/falconAssistTest.mjs` (25 checks, all pass) and the older
`node tools/falconFlightTest.mjs` (the model's numbers, unchanged).

## 1. Why it "went up after falling down"

Four causes, all in `viewer/falconFlight/flightModel.js` or the controls on top of it:

1. **The stun pulled up.** After a hard hit the model held the pitch input at +0.15 for 0.9 s. At speed that asked up
   to +0.9 g over the path-holding load, so a bird that had just hit the ground or a wall climbed away from it.
2. **Contacts threw the bird upward.** A floor hit bounced with 30 % restitution, a hard wall hit added 1.5 m/s up, and
   on a slope (a pitched roof, a crown's shoulder) the whole tangential speed was turned upward. Offline: level into a
   pitched roof at 22 m/s, round 2 threw the bird up at 8.3 m/s and 6.2 m over the contact point (round 3: 2 m/s, 0 m).
3. **The hands-off trims zoomed.** Hands off, a fast bird with spread wings got +0.5 g "back toward trim" and the path
   relaxed toward the glide angle: let go after a dive and the bird pulled up and zoom-climbed (a phugoid).
4. **Pops.** A contact could set the bird on top of a solid it met from the side (a crown's rim, a dormer: the floor
   jumped by less than 1 m between two sweep points), and round 1's "moving out of a wall" fix set it on top of
   whatever it was beside.

Also buggy: a take-off from the ground or a flat roof started at the perch's own height and dropped forward, so it
touched down again at once; a bird that started a substep inside a solid (a roof tile streamed in under it) stayed held
there; a bird sliding along a bent façade could stay pinned.

## 2. Collisions round 3 (`collide3`, `?falconcol=old` = round 2)

- The same 0.4 m sweep through the solid **at the bird's height** (`cityStream.js column`: roofs, the church proxy, the
  landmarks, bridge arches, crowns and trunks), substeps of 8 ms (4 ms over 50 m/s): no tunnelling.
- A **top** only when it is at most 0.6 m above the last free point, else it is the side of the solid (a wall). The
  bird is never lifted more than 0.6 m by a contact.
- **No bounce off a top**, 0.15 off a wall plus a 0.6 m/s push-out, the tangential speed kept minus a Coulomb scrape
  (slides along façades and roofs). After any contact the vertical speed is **at most what it was** (+1 m/s up a top's
  slope): a contact never launches the bird.
- **Crash** (a top over 9 m/s, a wall over 7, a ceiling over 6): a 0.7 s tumble, wings open, no control, no pull (a
  short sink at 60 % of the path-holding lift), then the assist recovers. The frame reports its hardest contact.
- **Landing**: a top within 37° of level, under 6 m/s into it, slower than 9 m/s (12 flaring); none for 0.6 s after a
  take-off. The take-off now jumps up and forward (+0.6 m, 7 m/s, +17°) and the assist climbs 8 m before holding.
- **Out of solids**: inside the solid at the start of a substep (deep), or 0.3 s on walls without getting free: moved to
  the nearest free point (8 directions × 0.8 / 1.6 / 2.8 m, then up), the velocity turned that way.

## 3. The flight assist (`viewer/falconFlight/flightAssist.js`, `?falconctl=old` = the raw controls)

Research (friendly flight in games): Ubisoft's *Eagle Flight* steers by looking (the bird goes where you look, constant
speed, no separate pitch / roll); War Thunder's mouse aim and GTA's plane mouse steering (an aim point the aircraft
turns to by itself, the camera on the aim); Ace Combat's "Standard" controls (the stick turns, the plane banks by
itself and levels when let go); *Sky: Children of the Light* (point to fly, gliding by default, flapping costs energy);
Microsoft Flight Simulator's assists (auto-level, altitude hold, stall and ground protection). *Falcon Age* has the
falcon as a companion, not flown, so it gave the hunt's feel only. The common idea: the player says **where**, the
game flies the bird there, and doing nothing is safe.

| | what the player does | what the assist does |
|---|---|---|
| steer | mouse aim (click), or A / D, or the left stick | a coordinated turn (bank for the turn rate, at most 60°); let go: wings level |
| height | nothing | holds the height where you let go (with a little lead); rising air lifts the held height (circle in a thermal to climb) |
| down / up | W / S (stick y), or the aim's pitch past 4° | a 20° descent / climb |
| climb | Space | full beats, a 24° climb asked (what the beats can give) |
| speed | nothing | light wingbeats keep ~14 m/s (50 km/h); they cost little stamina (the drain grows with the square of the beat), none in a descent; tired: lighter beats, the stamina comes back |
| stoop | Shift (W steeper, S shallower) | tuck + a 63° dive; let go: wings open, pull to level, then hold that height (no zoom climb) |
| protection | (always) | under 9.5 m/s the nose goes down and the wings beat (no stall) |
| avoid | start-menu option, on by default (`?falconavoid=0`) | 3 probes along the path (0.6 / 1.2 / 2 s ahead) against the solid at the bird's height: a roof / crown / the ground in the way -> climb over it (2.5 m clear); too tall -> also turn to the freer side; a dive too low to pull out (pull radius V²/3g) -> the pull-out starts by itself (held while Shift is held) |
| strike | the hunt's aim assist (unchanged) | follows the path the aim assist gives instead of pulling back to the aim |

The chase camera in the assisted flight follows the **heading** (not the velocity), the climb / dive angle damped (a
stoop looks down the dive), softer and very slow during a tumble: no swing round after a bounce. With the mouse aim
it looks along the aim, as before. The HUD gauges add the climb rate (▲ / ▼ m/s) and what the assist is doing
("holding height", "avoiding an obstacle", "crashed: recovering", "pulling out", "too slow: flapping", "· tired").

## 4. Free flight on the eyrie (`?falconstart=old` = before)

The game's start ran the nest intro behind the play loader: the bird hopped, launched and then glided off hands-off
(with the old trims it sank at the glide angle) while the loader was still up, so the player found it down in a wood.
Now the intro waits in the scrape while the play loader is up (at most 90 s), and the falcon game checks the first frame
after the loader: a tiercel more than 80 m from the eyrie (and no intro running) starts again from the nest, or in the
air off the eyrie when the family is not loaded. And hands off, the assisted bird now holds its height anyway.

## 5. Offline results (`node tools/falconAssistTest.mjs`, still air, a test town)

| check | result |
|---|---|
| hands off, 60 s | height held 99.9-100.0 m, 14.4 m/s, stamina 1.00 (raw controls: down to 47.6 m) |
| A 3 s, let go | 173° turned, bank 0.0° at 8 s, height kept |
| mouse aim 90° left | reached in < 6 s, 0° overshoot |
| W 3 s, S 3 s, hands off | 84 -> 97 -> 100.4 m, no stall |
| stoop 6 s from 300 m, let go | released at 52.7 m/s, lowest 107.9 m, then 0.0 m of climb (no zoom) |
| stoop held from 150 m (avoid on) | pulled out by itself, lowest 31.6 m, no contact |
| level into an 18 m block / a crown (avoid on) | over them, no contact |
| head-on into the block at 20 m/s (avoid off) | wall crash, launch 0.0 m/s (round 2: 0.8), no pop |
| 15° scrape along a façade | slides, keeps 14.3 of 16 m/s, no crash |
| pitched roof at 22 m/s | launch 2.0 m/s, rose 0.0 m (round 2: 8.3 m/s, 6.2 m) |
| stalled drop onto the ground | rose 0.2 m (round 2: 1.4 m) |
| 40 m/s stoop into the ground | a crash (tumble), launch 0.0 m/s, no rise |
| started inside a solid | out on top of it |
| exhausted, hands off 30 s | height held, the stamina back over 0.1 |
| cost (assist + model + collisions) | ~0.01-0.02 ms a frame in node; ~20 column queries a frame at most; no allocation per frame (one reused contact record) |

## 6. Browser check

Pending (another agent was measuring performance in Chrome): take off from the eyrie, fly low through streets, scrape
a wall, hit a roof edge, land on a roof and on the ground, dive into a tree, a hunt run; before (`?falconctl=old&falconcol=old&falconstart=old`)
and after, screenshots here.

## Switches (viewer/features.js)

`?falconctl=old` (raw controls), `?falconcol=old` (round 2 contacts, round 1 take-off), `?falconavoid=0` (no avoid
assist), `?falconstart=old` (intro behind the loader). `?falconhit=old` (round 1 contacts) still works.
