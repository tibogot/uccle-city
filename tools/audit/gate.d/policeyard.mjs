// gate row `policeyard` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "policeyard",
  script: "tools/audit/policeYard.mjs",
  node: ["--import", "./tools/christmas/hook.mjs"],
  args: ["--quiet"],
  guards: "the police shift's car choice (rule police-car-choice, claude/policeyard, owner 2026-11-28, docs/POLICE_GAME.md \"Choosing the car\"): both patrol cars in the Rue Rouge yard (the unmarked dark estate seated at the old start, the marked cars2 police estate in a painted north-row bay; ?policecar=marked the other way round), every box corner in the drawn yard, clear of the walls and the 5 yard cars, each car's way out to the gate clear of the other; both enterable (yardCars.js: E out only stopped in the yard, a free exit spot - the driver's side, else the right / back / front -, E next to either car gets in that car); the marked livery present (cars2 police: own paint, Battenburg blue + yellow); no runtime light (one pool slot, the parked car's lamps + beacon dark through a per-object uniform on the SAME materials), the wiring (rail-mover boxes, both looks warmed, ?policeyard=old one car)",
  deps: ["viewer/police/yardCars.js", "viewer/police/policeGame.js", "viewer/police/policeCar.js", "viewer/police/kitMerge.js", "viewer/policeCar/beaconModel.js", "viewer/policeCars.js", "viewer/policeYard.js", "models/police_rouge/site.json", "models/cars/cars2.glb", "viewer/drive/carLod.js", "tools/audit/policeYard.mjs"],
  meta: {
    features: [{ key: "policeyard", type: "old" }],
    clean: ["viewer/police/yardCars.js", "viewer/police/policeGame.js", "viewer/police/policeCar.js", "viewer/police/kitMerge.js", "viewer/policeCar/beaconModel.js"],
  },
};
