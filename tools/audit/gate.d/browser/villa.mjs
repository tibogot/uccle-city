// browser gate row `villa` (run on a browser turn; docs/WORKFLOW.md, docs/VILLA.md)
export default {
  name: "villa",
  text: "VILLA (claude/villa1, rules villa-budgets + interior-stream-paced): on a GREEN preflight, in your own FRONT tab, 3 runs (reload between): ?quick=1&at=990,1960,30&look=890,2050,10&radius=220&dynres=0, wait for __quickReady + 5 s, (await import('/debug/villaStream.js')).run(): pass = 0 frames over 34 ms (two vsyncs + jitter) and no long task in every run; then the gate opens for the car (drive in from u 1.5, w 20.2: it stops in the garage's right bay), the walker climbs the entrance flight, enters, climbs the stair to 122.4 m; ?villa=0 shows the UrbIS house",
};
