// browser gate row `villa` (run on a browser turn; docs/WORKFLOW.md, docs/VILLA.md)
export default {
  name: "villa",
  text: "VILLA (claude/villa1, rule villa-budgets): ?quick=1&at=990,1960,30&look=890,2050,10&radius=220, wait for __quickReady, then move the camera from frame u -60 to u 4 (w 5, 125 m TAW) in 41 steps of 200 ms and record requestAnimationFrame deltas + longtask entries for 8 s more (docs/VILLA.md §Perf): the interior fetches, compiles and shows with NO frame over 33 ms and no long task; then the gate opens for the car (drive in from u 1.5, w 20.2: it stops in the garage's right bay, not before), the walker climbs the entrance flight, enters, climbs the stair to 122.4 m; ?villa=0 shows the UrbIS house",
};
