# falconfix: falcon collisions and friendly controls (2026-11-16)

The owner's playtest (docs/TODO.md "OWNER PLAYTEST 2026-11-16", item 10): "the falcon one has too many issues with
collision, it goes up after falling down, it's like it's very buggy; the falcon control is not easy, we should make it
way better, not more complicated but better, more UX friendly". The coordinator also saw free flight
(`?game=falcon&gmode=free`) start perched on the ground in a wood instead of on the eyrie.

Branch `claude/falconfix`. Offline checks: `node tools/falconAssistTest.mjs` (26 checks, all pass) and the older
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

## 6. Browser check (2026-11-16 evening, `?game=falcon&gmode=free`, port 8814, one tab)

No console errors (new and old). Inputs were driven through the flight's own input (keys / actions / the mouse aim's
yaw-pitch set from script); numbers from the game's own state.

| test | old (`?falconctl=old&falconcol=old&falconstart=old`) | new |
|---|---|---|
| free-flight start | the intro started under the loader; hands off it touched down on a roof 6 s after the launch (`before_old_handsoff_touched_down.jpg`) | the intro waits for the loader, the bird leaves the eyrie in view and holds its height. FIRST version: held 96 m TAW into the wooded hill NW of Saint-Job and ended in the trees (`before_tuning_handsoff_into_wood.jpg`) -> **fixed: the hold follows rising ground** (30 s hands off, 0 contacts, climbed 93 -> 115 m TAW with the hill: `after_handsoff_hill.jpg`) |
| A 3 s / let go / W 4 s | - | 55° bank, ~1 rad/s, wings level at once on release, height held; W a 20° descent then hold |
| low pass down Avenue du Prince de Ligne at 6 m | - | holds 6-7 m over the street. FIRST version: the strike's aim assist turned it toward a pigeon 55 m off into the street trees' crowns (`after_street_pass_into_crowns_before_hunt_fix.jpg`) -> **fixed: the aim assist pauses while the avoid acts; the avoid stays under crowns' undersides and levels off instead of climbing into them** |
| 12° scrape along a façade (avoid off) | - | one wall contact, slid along it (heading -68 -> -101°), 11.5 -> 9.9 m/s, no tumble, no rise |
| level into a roof edge at 18 m/s (avoid off) | stunned, vy +0.8 m/s after it, then a ground hit with a bounce (+1.2) | tumble, vy -1 (no rise); in that 8 m street it then reached the opposite façade low and landed on the street |
| stoop into the roofs of a row of houses (avoid off, 3 runs) | max upward speed after the first hit **5.7**, 1.5, -0.6 m/s | **1.2**, 0, 0 m/s; tumbles end in a touch-down |
| E landing | - | on a roof ridge near the Place (perch), on a street tree's crown, and with no perch in reach **on the street** (new: E lands on the level roof / ground 8-20 m ahead: `after_E_ground_landing.jpg`); Space takes off cleanly from each (no re-touch-down) |
| dive at a street tree (avoid on / off) | - | on: pulled out over the street, 0 contacts; off: ground contact, tumble, touch-down, no rise |
| hunt at the Place | - | FIRST version: stoops went into façades (the avoid asked for a climb the TUCKED wing cannot give) -> **fixed: the avoid opens the wings**; chasing at the 14 m/s cruise never closed on a pigeon -> **pursuit speed 21 m/s with a prey in the window**. Then: a catch at 94 km/h, 0 contacts (`after_hunt_catch.jpg`) |
| cost | - | game part (flight + collisions + assist) p50 0.1 ms, p99 0.3 ms, max 0.8; the whole flyer p50 0.4 ms (pigeons, air, camera included) |

### The eyrie's z-fighting (owner, while watching)

On the walk from the scrape to the ledge, the sill of the falcons' arch flickered: every arch's reveal FLOOR (brick)
and its stone sill LEDGE both covered depth 0 .. `proud` (5 cm) at exactly the sill height (`tools/blender/stjob.py`,
`Arch.build`). Fixed at the source: the reveal floor starts at the wall plane where a ledge is built (`strip2d(...,
floor=)`); the church rebuilt (same triangle count), the AO re-baked and its KTX2 rewritten. Two frames 1 s apart at the
same pose: 4031 changed pixels on the sill before, 1 after (`eyrie_sill_before*.jpg`, `eyrie_sill_after*.jpg`, the
diff mask `eyrie_sill_before_framediff.png`). This fixes it on every ledged arch of the church, not only the eyrie's.

### Left

- Tuning by a human at the keys (the browser runs were scripted): cruise 14 / pursuit 21 m/s, turn rate 1 rad/s,
  avoid clearance 2.5 m, camera stiffness.
- Low over a canopy the chase camera can sit in the leaves (it was so before: the camera's own clearance).
- Hunting needs height and a stoop (as in round 1); the assist makes it reachable but a level chase rarely catches.
- Mobile / gamepad not tested in the browser (the intent mapping is tested in node).

## 7. "When it lands everything is shaking" (owner, 2026-11-17)

Found in code: on a perch the flight model does not run, so its live state stayed frozen at its last values. After a
crash that ended in a touch-down, the stun (> 0) never ran out, and the camera's shake read it (0.02 rad x stun) plus the
rough-air term (the last air lift): the view shook for as long as the bird sat. In the assisted camera a frozen stun
also kept the 0.5/s "tumble" stiffness, so the view crept for seconds. And the camera's exponential eases never reach
their target exactly.

Fix: `perchOn` (and the start of an E landing) clears the stun, the air lift and the load factor; the camera has no
shake on a perch, settles firmly (5/s) and then snaps to rest under 2 mm / 0.1 deg (position, view direction, the
clearance offset, roll, FOV). No collision runs while perched (unchanged: `FalconFlight.step` is not called).

`node tools/falconCameraTest.mjs` (the real falconCamera.js on three r187 from tools/worker/node_modules): perched for
5 s after flying in, with a stun left over and lift 2.5 m/s, both camera modes. Spread over the last 3 s, before ->
after: steady camera 7.8 mm / 0.40 deg (stun left: 189 mm / 7.9 deg) -> 0 / 0; old camera 1.2 mm / 0.21 deg (stun left:
1.2 mm / 1.34 deg) -> 0 / 0. Browser check pending.

## Switches (viewer/features.js)

`?falconctl=old` (raw controls), `?falconcol=old` (round 2 contacts, round 1 take-off), `?falconavoid=0` (no avoid
assist), `?falconstart=old` (intro behind the loader). `?falconhit=old` (round 1 contacts) still works.
