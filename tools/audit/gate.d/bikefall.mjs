// gate row `bikefall` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "bikefall",
  script: "tools/bike/forgivingTest.mjs",
  args: ["--quiet"],
  guards: "the kid's BMX falls only on a hard hit (docs/BIKE.md 'Forgiving falls', rule bike-falls-on-hard-hits): the casual rider (W held, stepped steering, no lean, late / no hop, 24 seeds) on every lab spot - kerbs up / down square, 25 and 45 deg, cobbles, bumps, roots, the pump rollers, sand, slopes, the kicker / table, the bowl, small drops - ~0 crashes a minute and no soft crash (landing / wash-out / endo / loop-out); still a crash for a wall / car / post head-on at 6 m/s, a landing nose down 70 deg / sideways 55 deg / 2 m onto the front wheel / 5.5 m flat, Z held off a ledge, off a 2 m ledge into a wall, a 30 cm face at 22 km/h; a glance / 4 m/s / a 2 m level drop / a walking-pace kerb never; skill kept (a hop keeps more speed than a roll-up, a crouched kicker landing beats hands off) (claude/kid)",
};
