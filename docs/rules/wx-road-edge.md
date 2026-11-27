---
status: provisional
added: 2026-11-27
check: `wxroadedge` (tools/audit/wxRoadEdgeCheck.mjs)
---
**Rule.** A road weather effect that belongs to the kerb side (the slush and snow the salting leaves, the puddles)
reads the CARRIAGEWAY's cross coordinate, the drain aPiece.y (-1..1 across the carriageway, 0 at the crown), never a
lane's own coordinate aLateral (-1..1 across each lane strip, 0 on the junction pads). `?wxedge=old` = before.

**Why.** On the Christmas snow days (15-26 Dec, rule snow-schedule) Place Saint-Job showed pale snow wedges with hard
straight edges in the middle of the Chaussée where the cars drive (2026-11-27, xmascheck). The asphalt shader's edge
was `smoothstep(0.7, 1, |aLateral|)`: |aLateral| is 1 at BOTH sides of every lane, so each lane line in the middle of a
two-lane street kept 85 % of the cover (the salt spares the edge), the band stopped dead where the lane strips meet a
junction pad (aLateral 0 there) and fanned into wedges where the lanes diverge round the square. The same edge put the
rain's gutter puddles on the lane lines. On I6 7633 of the lane-line vertices in the middle of a carriageway were in
the band.
