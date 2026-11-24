---
status: provisional
added: 2026-11-25
check: `falcongym` (tools/falconGymTest.mjs: the gym controller headless in the gym's greybox: cruise, chase and stoop speeds, the pull-out, the alley take-off, the passage hop-out, the 15 deg wall graze, the landing flare and the edge launch, the ceiling; the lab's files; the v2 model's triangles and clips once built) + browser row `falcongym` (the lab loads with no console error)
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
