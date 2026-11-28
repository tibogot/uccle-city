---
status: provisional
added: 2026-11-28
check: `policeyard` (tools/audit/policeYard.mjs: both cars in the drawn yard clear of the walls, the yard cars and each other's way out, both enterable by the game's own yardCars.js functions, the marked livery in cars2.glb, one pool slot and every kit emission through the per-object kitGain)
---
**Rule.** A vehicle the owner wants the player to be able to TAKE in a game is a car standing in the world at the game's
start, entered with the game's E key, never only a URL switch: the police shift starts with both patrol cars in the Rue
Rouge yard (the unmarked dark estate seated at the shift's start, the marked Belgian police estate in a painted bay of the
north row); stopped in the yard E gets the player out on a free side (third person), E next to either car gets in, and
that car is the patrol car (beacon, siren, wig-wag, the beacon's one pool light, colliders, the dent). The standing car
costs few draws (its body + wheels merged, its kit's inner parts hidden: 5 meshes, 3 shadow casters), shares every
material with the driven one (its lamps and beacon dark through a per-object uniform: no material per car, no light
added or removed), and both cars' parked AND driven looks are warmed under the play loader (no first-switch hitch). The
switch that used to choose the car (?policecar=marked) stays a dev shortcut for which one the shift starts in.

**Why.** The owner's decision (2026-11-28): the marked police estate (white, blue + yellow Battenburg, POLICE) existed
only behind ?policecar=marked, so no player ever saw it; the game had no car choice. The first browser try showed what
the check now holds: getting out of the car parked in its bay put the character inside the neighbour bay's car (the bays
are 2.5 m wide), the first get-out booted the character mid-game (2.5 s frames), and the first get-in built the other
car's pipelines on the spot (300 ms frames).
