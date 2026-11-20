// gate row `gates` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "gates",
  script: "tools/audit/census/gates.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--jobs","4","--worst","0","--max","openByMistake=320,houseOpenPm=40,pathUngated=1519,pathGatedPm>=824,villaDriveGatedPm>=331,rowDriveGatedPm=100,gateAcrossDriven=0,gatesTileMax=460,piersTileMax=1430"],
  guards: "census class G, all 120 tiles, every house frontage as the city draws it (rule house-front-garden-closed, owner 2026-11-19 'most people have gates; you miss many', docs/GATES.md): villa / terraced garden fronts open with no forecourt / shop to explain it <= 320 (879 with ?gates=old), door paths meeting the line at a gate >= 82.4 % (50.4 % old), villa driveways gated >= 33.1 % (23.3 % old), row / semi garage drives gated <= 10 % (28.1 % old; Street View: 6 of 6 open), no closed driveway gate across a carriageway or a way a car uses (14 old), the per-tile budget (gate leaves <= 460, piers <= 1,430 a tile: instances, no draw call); gardenVoid 0 / gateNoSteps 0 in the ground row, gardenInLane 0 in gardenlanes",
};
