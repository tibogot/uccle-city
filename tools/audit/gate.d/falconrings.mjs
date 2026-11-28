// gate row `falconrings` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "falconrings",
  script: "tools/falconRingsTest.mjs",
  node: ["--preserve-symlinks", "--import", "./tools/road_audit/register.mjs", "--import", "./tools/characters/threeHook.mjs"],
  args: ["--quiet"],
  guards: "the falcon's ring courses (rule falcon-rings; owner, docs/TODO.md 4b3: 'go through rings ... the goal: the game not boring'): the tiles each course crosses built by the worker's own code (the tile cache) with the hero models' UrbIS solids KEPT (their envelopes, bigger than the models), the city's falcon world over them (the drawn ground and roofs, the street trees' crowns x1.3); data/falcon/rings.json matches a build over today's tiles (re-bake: --bake); every ring of the three courses (the spires Saint-Job -> Saint-Pierre, the avenue down Avenue Brugmann, the stoop off the Observatory) in free air (centre + 12 rim points, 0.4 m), the avenue's tops under the tram wires (5.5 m), >= 6 rings each; a scripted flight completes every course, every ring in order, with the gym controller inside the bronze time and with the current one inside 3 x the bronze; the best run's ghost recorded at 10 Hz and replayed on its path; the view's budget (the rings ONE instanced mesh + ONE material, a static instance buffer not re-written per frame, one ghost mesh, no light); self-test: every ring sunk into the floor under it is caught",
  meta: {
    clean: ["viewer/falconGame/ringCourses.js", "viewer/falconGame/ringsView.js", "viewer/falconGame/ringsGame.js"],
  },
};
