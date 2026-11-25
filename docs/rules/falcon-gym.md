---
status: provisional
added: 2026-11-25
check: `falcongym` (tools/falconGymTest.mjs: the gym controller headless in the gym's greybox: cruise, chase and stoop speeds, the pull-out, the alley take-off, the passage hop-out, the 15 deg wall graze, the landing flare and the edge launch, the ceiling, the bank into the turn for both controllers and every input path; the lab's files; the v2 model's triangles and clips once built, and its poses: tools/falconV2pose.mjs) + browser row `falcongym` (the lab loads with no console error)
---
**Rule.** The falcon flies at a real peregrine's speeds and takes off like one, and small mistakes never stun it. Measured headless in the Falcon Gym (`labs/falcon-gym.html`, `viewer/falconGym/gymFlight.js`):

- **Speeds.** Hands-off level cruise is 65-90 km/h. Space held level (the chase) is ~110 km/h. A stoop from 300 m reaches >= 300 km/h and pulls out with no ground contact. A stoop from 1000 m stays <= 389 km/h (the record is the ceiling).
- **Height.** Space held climbs to several hundred metres, with a ceiling near 1200 m.
- **Take-off.**
  - With room above the wings (even the 4 m alley), it is a jump and hard wingbeats, nearly vertical (<= 2.5 m/s horizontal below the roofs), out over the roofs.
  - With a free drop ahead (a ledge), it launches off the edge.
  - With no room (the covered passage), it walks or hops to the nearest launch spot, then launches.
- **Walls.** A 15 deg graze at 30 m/s slides along the wall: no tumble, with or without the look-ahead. A tumble needs a head-on hit over 13 m/s into a big solid. Thin things (sills, railings, low walls) only deflect.
- **Landing.** E with a ledge ahead gives a flare onto it.

**Why.** Owner, 2026-11-25, about the falcon game:

> confusing; controls sometimes fine, sometimes hard; stuck between buildings looks buggy

He asked for it to be realistic:

- enough space: take off from the ground (a jump and hard wingbeats, nearly vertical, slow)
- not enough: walk or hop to a ledge, then launch
- real falcon speeds: level ~65-90, chase ~110, stoop 300+ km/h from height, the record 389
- able to fly high (hundreds of metres)

The city game's controller has grown by layers:

- a physical flight model
- an assist that flies from the player's intent
- an arcade stoop
- a fun layer with an auto-dive
- a collision response with tumbles

Nothing checked the whole against the owner's numbers. The take-off was a drop forward from the perch's own height: from the ground between buildings it touched down again at once.

**Scope.** The gym controller is a proposal next to the city's (the panel switches them). The rule binds the gym now and the city once it adopts the controller.

## The v2 model (V2 POLISH, 2026-11-25)

**Rule.** The falcon v2 (`models/bird/v2/falcon_v2.glb`, built by `tools/blender/falconV2.py`) poses like a real peregrine, checked on the shipped glb by `tools/falconV2pose.mjs` (the skin evaluated in Node):

- **Perched (the Perch clip).** The body upright, 35-65 deg (built at 45). The feet on the ground under the hip joints (< 7 cm off), nothing below the ground. Short legs: the hip joints < 16 cm up and < 6 cm of leg showing below the belly. The folded wings' tips on the tail (< 6 cm from its feathers), behind the hips.
- **Folded wings slide, they never crumple.** Every wing feather card (a loose part of the download) is rigid on ONE bone, weight 1. No card edge stretches in Perch or Stoop (< 2 %). The covert sheets carry no feather-bone weight.
- **Toes.** Closed in flight (Glide) and on the perch: the claw >= 45 deg toward the sole. Open in Talons: <= 25 deg, never bent back past -35.
- **Plumage.** The player is a juvenile. `falcon_v2_juvenile.ktx2` sits beside the glb and is named in its `asset.extras.variants`. The adult texture stays in the glb, for the church family.

**Why.** The coordinator's review of v2's first build (screenshots `uccle-falcon-gym/2-*`, `6-*`): it stood with its wings spread flat on long stick legs, and its folded poses crumpled the wing feathers. Its talons hung open, and it wore the adult plumage. The causes, found on the way:

- **The fit stretched the Mesh2Motion wing along X.** Mesh2Motion's arm is shorter than the download's, so its elbow and wrist landed mid-forearm and mid-hand, and the fold bent cards in the middle.
- **The weights came from a nearest-surface transfer.** One card's vertices got different bones (a fold tore it), and the covert sheets got feather-bone weights.
- **The download's bind is an attack pose.** Its legs hang, its head is ~15 cm higher than the rig's (the skull took the neck's weights), its beak is open and its toes splay. Its legs were made rigid on the thighs, so they could only swing as sticks.
- **Mesh2Motion's own fold fans this mesh's feathers out.** Its feather bones turn the sheets about the wrong pivots.

The fixes (all in the script):

- the wing, leg, neck and head bones moved onto the download's own joints (its bones, or where its weights blend)
- the legs on the download's own leg weights
- per-card rigid binding by the download's feather groups
- our own folded-wing frames
- the Perch clip by IK from the feet up, with the root's translation
- the beak closed, the toes squared to the tarsus and half curled in the bind
- the juvenile painted on v2's own UVs from the adult's lightness, with the bars swapped for vertical streaks

**Check.** Gate row `falcongym` (`tools/falconGymTest.mjs` runs `tools/falconV2pose.mjs`). The first build fails 6 of these checks.

## The v2 fixes (V2 FIX, 2026-11-25)

### The tail closes when folded

**Rule.** The tail is a closed stack of feathers when the falcon is folded: perched, walking, hopping, in the stoop and in Talons, < 10 cm across its outer 40 %. It is half spread in the glide and the flap (wider than folded by > 3 cm), and a full fan in the flare and the landing (>= 25 cm, the widest). The gym's flare / brake layer opens it on top (`gymBird.js`). Built by `tools/blender/falconV2.py` ("the tail closes"): each fanned feather position has its own bone (`tail_fan_<i>_<L|R>`, children of `tail_2`, heads at the cards' roots), and every clip keys their fold (`TAILFOLD`). The outer feathers fold under the central pair.

**Why.** Coordinator's review of the V2 POLISH: "the tail stays fanned in folded poses". The download's bind spreads the tail as a full fan (96 deg, 35 cm). The Mesh2Motion rig has one tail chain (`tail_1..tail_tip`), so all 22 tail cards were rigid on `tail_2` and no clip could close them. Nothing measured the tail's width.

**Check.** Gate row `falcongym` (`tools/falconV2pose.mjs` `tailTipWidth`): the feather bones exist, the folded width, and the glide / flare spread. The first build fails 3 of these (folded 25.6 cm everywhere).

## Bank into the turn (2026-11-25)

**Rule.** One bank convention everywhere: `phi > 0` = the RIGHT wing down, a right turn (`flightModel.js`'s). Every controller writes it that way. The bird reads it through `birdRoll` / `rigBank` (`gymFlight.js`, used by `gymBird.js`), and the camera reads it as `falconCamera.js` does. A right turn (D, the right arrow, or the mouse moved right) drops the right wingtip below the left in world space. The heading turns clockwise seen from above, and the chase camera rolls the same way. A left turn is the mirror. The lab's input mapping is `fillGymControls`, one function shared by the lab and the test.

**Why.** Owner, 2026-11-25: "when I go right or left it's tilting the wrong side". The cause was the gym controller's bank. It was computed as `atan2(aLat, aUp)`, with `aLat` positive to the LEFT (heading + = left), so its `phi` was positive in a LEFT turn. The bird (`root.rotation.z = -phi`, the rig's bank `-phi`) and the chase camera (`rotateZ(-roll)`) were written for `flightModel.js`'s convention (+ = right wing down). So in the gym controller the bird and the camera rolled against the turn, for every input: keys, arrows and mouse all go through the same `phi`. The city's ("current") controller was right all along. Nothing checked the sign: the speed and stoop checks only read the path.

**Check.** Gate row `falcongym` (`tools/falconGymTest.mjs` 8b). Both controllers, with D / A, the arrows and the mouse aim, are fed through the real `FalconInput` key and mouse handlers. For each, the right turn and the left turn check:

- the wingtips in world space (three's Euler YXZ with `birdRoll`)
- the rig's bank layer
- the heading's sense from above (the ground track's cross product)
- the chase camera's roll

The old sign fails 12 of these checks.

## The orbit view (2026-11-25)

**Rule.** The gym has an inspect mode (O, or the panel's "Orbit / inspect"). It pauses the flight without stepping it, so leaving it returns the exact flight state; the camera and the bird's clip weights and layers are saved and put back. It uses three's `OrbitControls` round the hips bone: drag rotates, the wheel zooms 0.3-8 m, right-drag or Shift-drag pans. It has a clip picker that plays in place, a time scale, a pause (P), a turntable (T) and preset views. Its studio fill makes no light: it turns up the intensity of the city Lighting's own hemisphere light (made at startup, kept at 0 under the firmament sky) and puts it back, so the light count never changes. Our own panel, no lil-gui.

**Why.** Owner, 2026-11-25: "I need an orbit camera to see the look of the falcon in the lab".
