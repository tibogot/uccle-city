---
status: provisional
added: 2026-11-21
check: `trafmix` (tools/audit/trafmixGate.mjs: "junction entry room", wait-for loops broken <= 3; "service vehicles never stuck")
---
**Rule.** A traffic car starts a junction turn only when its exit has free room for its own length plus 2 m after the turn. That room is the exit's free length up to its last standing car, continued along the route past an exit lane too short to hold the car. It is counted against every car already in a turn heading to the same exit: a reservation, released when that car leaves its turn. Otherwise the car waits at its own line. A car held 20 s for an exit claims it, and the others wait behind the claim, so a bus is not starved by cars taking every 6 m gap. A run (an ambulance or fire engine) is not held by the rule and passes cars that pulled over for it. Safety net: a car waiting 10 s whose wait-for chain loops back to it lets the car of the loop with the oldest wait, inside a turn where one is, creep on for 3 s; every such break is counted (`stats.cycleBreaks`), and the trafmix gate keeps the count at 3 or fewer (claude/street4, viewer/traffic/trafficSim.js decide / breakCycles).

**Why.** Cars entered a junction turn when only the exit's last car was judged, from several approaches at once. They stopped inside their turns and blocked the crossing traffic, and close junctions locked each other: the Ch. d'Alsemberg D6 / D7 gridlock where trafmix removed buses and ambulances as stuck. The don't-block-the-box rule applies when entering the turn, not only at the stop line.
