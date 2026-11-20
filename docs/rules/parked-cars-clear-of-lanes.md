---
number: 16
check: `trafpark`, `trafparksim`, `trafparkborder` + browser debug/trafparkWatch.js
---
**Rule.** No parked car's footprint within 0.98 m (+0.3 m on junction turns) of any driven path; each tile is checked against its loaded neighbours, never alone; at run time a moved or under-lane parked car is an obstacle.

**Why.** lanes rounded after the fit, turns / ends / body never checked, tiles treated as closed worlds, the old audit measured centres and was not a gate: 5,281 parked cars under traffic
