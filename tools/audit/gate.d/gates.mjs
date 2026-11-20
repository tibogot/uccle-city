// gate row `gates` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "gates",
  script: "tools/audit/census/gates.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--jobs","4","--worst","0","--max","openByMistake=302,houseOpenPm=38,pathUngated=1192,pathGatedPm>=862,driveGatedPm>=471,gateAcrossDriven=0,gatesTileMax=460,piersTileMax=1430"],
  guards: "census class G, all 120 tiles, every house frontage as the city draws it (rule house-front-garden-closed, owner 2026-11-19 'most people have gates; you miss many', docs/GATES.md): villa / terraced garden fronts open with no forecourt / shop to explain it <= 302 (879 with ?gates=old), door paths meeting the line at a gate >= 86.2 % (50.4 % old), driveways with a driveway gate >= 47.1 % (38.0 % old), no closed driveway gate across a carriageway or a way a car uses (14 old), the per-tile budget (gate leaves <= 460, piers <= 1,430 a tile: instances, no draw call); gardenVoid 0 / gateNoSteps 0 in the ground row, gardenInLane 0 in gardenlanes",
};
