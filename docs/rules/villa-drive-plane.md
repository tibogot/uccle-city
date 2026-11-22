---
status: provisional
added: 2026-11-22
check: `villa` (tools/audit/villaCheck.mjs: the drive + garage floor vertices = the designed plane, the terrain never over it, slope <= 12 %)
---
**Rule.** A driven paved surface a scripted model adds (the villa's drive and garage floor) is a DESIGNED surface: one
plane or one ramp then flat (models/villa/villa.json drive_plane), above the city's terrain everywhere it covers, and the
movers use it (a deck in world.decks for the car, a TriBVH with the terrain switched off for the walker, the parked cars
on it). A paving draped on a raw DTM is for footpaths and forecourts only, never for a car's floor.

**Why.** The first round draped the drive and the garage floor on the DTM, which there is the old house's basement ramp:
the paving rolled up at the garage's mouth and the floor followed the ramp's bumps (after_day_garage.jpg, the
coordinator's review 2026-11-22); smoothing the drape only moved the bumps.
