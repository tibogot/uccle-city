---
status: provisional
added: 2026-11-20
check: `trafmix`: tools/audit/trafmixGate.mjs (heavy.glb budgets + kinds + wheels on the ground, the mix tables, the realised shares at 8 / 13 / 18 h, patrols x5 round Rue Rouge, buses on their lines + door-to-pole, emergency yield, stuck, cost; `--old` fails)
---
**Rule.** The traffic is the city's real mix, by hour, day and place, never one fixed list: every vehicle class that drives in Uccle has a share per hour band from data or a stated estimate (trafMix.js `shares`: cars with ~30 % SUVs, vans ~12 % by day / ~4 % at night, taxis, the zone's police patrols - more round the station -, rare ambulances, very rare fire engines near the fire station, weekday-morning bin lorries) and the buses run as BUSES: on their real lines (OSM route relations), at their headway for the hour, stopping with the front door at their stops' poles; an emergency vehicle on a run (beacons: emissive, never a light; the siren through the sound gate) makes the traffic yield exactly as the police game's car does; a service vehicle never gets stuck (a planned stop is not a standstill), a wide body keeps off the parked cars, and the whole costs <= 10 % more per car and step.

**Why.** owner playtest 2026-11-19: "I don't see much police patrol, why?" - the patrol car was filtered OUT of the traffic's type list (`carFleet.js`: the police estate was "the yard / game's"): 0 patrols, no ambulance, no bus, one weight for every type at every hour
