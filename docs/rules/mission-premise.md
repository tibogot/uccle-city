---
status: provisional
added: 2026-11-24
check: `missions` (tools/audit/missionAudit.mjs: tram 92's real timetable over 400 seeds, every junction's crash on the OSM road snap, the stolen car and the speeder in the real TrafficSim; `--old` fails)
---
**Rule.** A game job's premise is true in the world where it plays, from the moment the radio states it: every job type
declares what it says is happening (viewer/police/missionPremise.js `PREMISES`), the dispatch offers it only where that
can be made true by the world's own systems (a blocked tram only at a stop where the tram sim's timetable brings the next
tram to the car no later than the player can arrive, and the tram sim holds it there; an accident only where the road
snap puts both damaged cars on the carriageway; a stolen car only when one is driving in range, taken at the call; a
speeder only a car on its way past the sign), the scene is built AT THE CALL (not at the accept), and the game watches
the premise until it has done its job: when it breaks (the trams switched off, the clock moved, the car gone) the call is
cancelled or re-made without a penalty, never left playing on an untrue premise and never failed on the player. The
headless audit runs the same code on the real data: every generated job's premise holds at spawn and for the first 180 s.

**Why.** The owner's playtest note (2026-11-23): the "move a car so the tram can pass" job fired with no tram anywhere
near, so it made no sense. The job picked a stop by distance alone and set the block at the accept; a tram reached the
car only if the timetable happened to bring one (the audit, ?missions=old: a tram behind the car by the player's quickest
arrival in 81 of 387 jobs, 47 jobs in the night hours with no service), and a held trip vanished `delay` s before its
terminus, or crept through the car after a long frame. The other jobs had the same blind spot: the crash's cars stood at
the raw junction point when no road snap came back, the stolen car was looked for only after the accept (none: the job
failed and cost reputation), the radar's speeder was any car "heading this way", often on a parallel street. A job that
states something the world does not show breaks the game's promise that the city is real.
