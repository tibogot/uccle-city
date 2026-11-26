---
status: provisional
added: 2026-11-26
check: `pedsgraph` (W3 crossings linked, W4 signalled crossings carry their phase) + `pedssim` (S2: sampled people never on a carriageway cell off a crossing)
---
**Rule.** People leave the sidewalk only on a DRAWN crossing (the road inventory's measured / OSM crossings the city paints), kerb to kerb, or a refuge island between two halves of one. A crossing within 35 m of a signal node of the phase table (viewer/traffic/signals.js signalPhases) is signalled: it keeps the phase of the road it crosses, and the people walk on `walkState(phase, signalClock.now())`, which is the cycle the drawn heads and the traffic use. The others are zebras: a glance left and right, then the people go once every approaching car can still stop. The traffic sees the people on a crossing, and the ones waiting at a zebra, as obstacles it brakes for (cityTraffic.addObstacleSource). A rare red-light runner (2 %) goes only with no car within 45 m. No informal crossing, no diagonal over a junction.

**Why.** The owner asked for "people never on the carriageway except at crossings" and for traffic that stops for them. A crossing that is not linked strands its people at the kerb. Two causes were found and fixed: a crossing over the tile edge (its far end is in the next tile: now a border stub joined on the main thread) and the two-stage crossings of a roundabout's splitter islands (now island nodes joined over the median). 85-100 % of the drawn crossings per tile are linked; H5's last one ends on a splitter island with no second half.
