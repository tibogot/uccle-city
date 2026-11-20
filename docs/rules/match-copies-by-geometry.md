---
number: 20
check: `twinlink`: tools/audit/twinLink.mjs (>= 99 % linked, 0 wrong, <= 5 ms per pair)
---
**Rule.** A thing that is built twice (once per tile, a buffer copy and the owner's) is matched by what it IS (its geometry: the same lane within 4 m, same kind and direction, the copy's start on it; a connector by both ends and shape), never by an incidental property of how it was cut (where it starts, how long it is); the hand-over between the two copies is continuous (enter where the copy is, no jump), and the match rate is measured over all tile pairs.

**Why.** the twin link matched "start within 3 m, similar length", but each tile cuts the same lane at its own nodes and only the owner fits it to the street: 20 % of the copies with a twin got none and 1 in 5 links was the wrong lane (cars 0.5-3 m off the real lane, through the neighbour's parked cars, 2.5 m jumps at the border); nobody counted it
