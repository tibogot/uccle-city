// browser gate row `underpass` (run on a browser turn; docs/WORKFLOW.md, docs/CALEVOET_UNDERPASS_PLAN.md, rules
// interior-stream-paced + ao-ktx2 + sign-uv-reads-right)
export default {
  name: "underpass",
  text: "UNDERPASS (claude/underpass1, Calevoet U1): on a GREEN preflight, in your own FRONT tab (sound off), 3 runs (reload between): ?quick=1&at=-1202,700,1.7&look=-1200,850,1.5&radius=250&dynres=0, wait for __quickReady + 5 s, (await import('/debug/underpassStream.js')).run(): pass = 0 frames over 34 ms and no long task in every run (the walk north to the east kiosk, the inside streams in, down the stair into the corridor); then (await import('/debug/underpassShots.js')).run('<run>', 'day_') and with &time=night 'night_': the signs read left to right, the frosted panes light by day from inside and glow at night, no black pane; ?underpass=old shows round 1, ?underpass=0 the UrbIS kiosks",
};
