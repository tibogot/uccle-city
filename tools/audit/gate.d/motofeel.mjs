// gate row `motofeel` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "motofeel",
  script: "tools/moto/feelTest.mjs",
  args: ["--quiet"],
  guards: "two-wheeler feel (rule 40, docs/MOTO_FEEL.md): the motorbike / scooter / Villo ridden headless by a keyboard, an analog and a late-braking rider on 56 synthetic routes (flat 50-90 km/h slalom / brake / gas in a lean, 15-45 % climbs and descents, kerbs up / down square and at 30 deg 20-80 km/h, a 30 cm edge, tram rails at 15-45 deg, cobbles, kickers / a bank / a drop / a table-top, a 57 % stairs bank, grass, wall / parked-car scrapes) and the real city (Av. De Fre, Rue Rouge, Square De Fre, Ch. de Saint-Job, Kauwberg + its park paths, Montagne de Saint-Job, Av. Churchill, both ways, 198 rides): 0 crashes on every ride; a crash on every real one (head-on wall 60 km/h, parked car 50, Villo wall 30, a 12 m cliff); motorbike 120 km/h within 600 m, 30 % climb >= 40 km/h, the 30 cm edge and the stairs bank climbed; scooter top 85-95 km/h, the Villo pushes on 12 %; no NaN; no allocation per step; ?moto=old fails the same table (claude/moto)",
};
