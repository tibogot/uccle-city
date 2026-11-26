---
status: provisional
added: 2026-11-26
check: `garagedrive` (tools/audit/garageDriveCheck.mjs: G every garage door served, S square to its door, E flush with the sidewalk, K over a dropped kerb, R no garden piece in it, V the viewer draws them); the ground rows on the rebuilt data
---
**Rule.** A garage door the facade draws opens onto a drive, never onto lawn or a hedge. tools/gardens/build_gardens.py
asks tools/gardens/faces.mjs `garageAt` where each house's painted garage doors are, opens the front-garden boundary in
front of each one (door width + 0.2 m) and writes a paved drive ring from the door to the street line (data/gardens/<T>.json
`drives`, 0.25 m short of the line so the sidewalk kerb stays whole), drawn by viewer/grounds.js through main.js. A door
whose house stands on the sidewalk line has no garden run: the sidewalk is its drive (`garageDoors[].noRun`).
The drive is a rectangle square to the facade, the door's width + 0.3 m a side, from the door straight out to where each
side's ray enters the drawn street surfaces (flush with the sidewalk's back edge, no lawn between, no overlap with the
paving; on an oblique edge the end follows it); a driveway opening already there is widened to the drive's span so its
jamb piers stand clear. Where it crosses the sidewalk the kerb is dropped: tools/gardens/driveRamps.py cuts a ramp
(the pipeline's dropped kerb: 1 m deep, the drive's width + 0.3 m a side) out of the sidewalk where UrbIS surveyed no
driveway (then build_gardens.py runs again: the ramps are a street surface its rays read). `?garagedrive=old`: no drives drawn; `build_gardens.py --garage old`: the boundary closed in front of doors (the data before).

**Why.** Reality round 2026-11-26 class C5: Street View (look only) on Avenue De Fre and the bel-etage streets showed a
paved or gravel drive from every garage door to the street, the gate opening wide; the kit drew the boundary and lawn
straight across the door, so the cars the city parks there and the player could not get in.

Round 4 first cut (owner / coordinator review 2026-11-26, shot c5_garage_drive_new): the ring's line end took the garden
line's own points (a line running the other way twisted it into a bow tie, a skewed one gave a trapezoid) and stopped
0.25 m short of the line: a ragged blob with lawn before the sidewalk, and a full kerb at the street. The S / E / K tests
came with the fix.
