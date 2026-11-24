// gate row `falconfun` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "falconfun",
  script: "tools/falconFunTest.mjs",
  node: ["--preserve-symlinks", "--import", "./tools/characters/threeHook.mjs"],
  args: ["--quiet", "--seeds", "6"],
  guards: "falcon catch fun (rule falcon-catch-fun, claude/falconfun): headless, the game's own flight model + assist + game logic + pigeons over a test Place under the eyrie, a simple player (look at the lock / follow the arrow, hold the strike button): the first catch <= 30 s after the launch on every seed, >= 4 catches in 2 min, >= 80 % of the first 5 easy pigeons dived at caught, auto-dives near the roofs <= 1 bump per 25 catches, a 150 m stoop into an auto-dive with no crash; a 150 m stoop >= 230 km/h and a 50 m one >= 130 km/h with no ground contact, 8 stoops over the town with no hard contact; the wind's gain and the FOV rise earlier (values only, nothing audible); ?falconfun=old FAILS the catch check (self-test)",
  meta: {
    features: [{ key: "falconfun", type: "old", group: "ab" }],
    clean: ["viewer/falconFlight/falconFun.js", "viewer/falconFlight/falconGame.js", "viewer/falconFlight/pigeons.js", "viewer/falconGame/hunt.js"],
  },
};
