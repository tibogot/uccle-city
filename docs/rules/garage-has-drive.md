---
status: provisional
added: 2026-11-26
check: `garagedrive` (tools/audit/garageDriveCheck.mjs: G every garage door served, R every drive a clean quad with no garden piece in it, V the viewer draws them); the ground rows on the rebuilt data
---
**Rule.** A garage door the facade draws opens onto a drive, never onto lawn or a hedge. tools/gardens/build_gardens.py
asks tools/gardens/faces.mjs `garageAt` where each house's painted garage doors are, opens the front-garden boundary in
front of each one (door width + 0.2 m) and writes a paved drive ring from the door to the street line (data/gardens/<T>.json
`drives`, 0.25 m short of the line so the sidewalk kerb stays whole), drawn by viewer/grounds.js through main.js. A door
whose house stands on the sidewalk line has no garden run: the sidewalk is its drive (`garageDoors[].noRun`).
`?garagedrive=old`: no drives drawn; `build_gardens.py --garage old`: the boundary closed in front of doors (the data before).

**Why.** Reality round 2026-11-26 class C5: Street View (look only) on Avenue De Fre and the bel-etage streets showed a
paved or gravel drive from every garage door to the street, the gate opening wide; the kit drew the boundary and lawn
straight across the door, so the cars the city parks there and the player could not get in.
